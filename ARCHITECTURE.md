# DivineeSoft CEO OS — architecture

## 1. Shape of the system

One Next.js application, one Postgres database, three background jobs.

```
Browser ──► Next.js (App Router)
              ├─ Server components read the DB directly (dashboards, boards)
              ├─ Route handlers under /api for every mutation
              ├─ /api/stream — Server-Sent Events, tails the ActivityEvent table
              └─ /api/cron/* — invoked by the scheduler, guarded by CRON_SECRET
                     │
                     ├─► Postgres (Prisma)
                     ├─► Resend (email)
                     └─► Anthropic API (assistant + briefing focus)
```

There is no separate backend service. Read paths run inside server components so the
dashboard has no client-side loading spinner; write paths go through `/api` routes that
validate input with Zod, check permissions, write an `AuditLog` row and append an
`ActivityEvent`.

Two rules the whole design follows:

1. **The model never touches the database.** It calls named functions in
   `src/lib/ai/tools.ts`; each one re-checks the caller's role and logs itself.
2. **"Currently working on" means task activity.** It is derived from task status,
   progress updates and daily posts. Nothing about anyone's machine is observed.

## 2. Data model

Twenty-two models in `prisma/schema.prisma`. The spine:

- **User** — authentication and identity. `systemRole` is `CEO | MANAGER | EMPLOYEE`.
- **Employee** — the org-chart half of a person: title, department, responsibilities, and
  `reportsToId` pointing at another Employee. Split from User so a login and an org
  position can change independently.
- **Project / ProjectMember** — a project has a lead and an optional manager (the
  Hassaan → Arslan → Zeeshan line in the brief), plus a membership join table.
- **Task** — the centre of gravity. Carries status, priority, progress, due date,
  scheduled date, estimate, blocker note, recurrence, and three fields that make AI
  creation safe: `source` (HUMAN / AI_ASSISTANT / AUTOMATION), `approvalState`
  (APPROVED / PENDING_APPROVAL / REJECTED) and `aiRationale`. `kind` separates team work
  from the CEO's private list.
- **TaskUpdate** — the append-only history: comments, status changes, progress, blockers.
- **DailyUpdate** — one row per employee per day, unique on `(employeeId, forDate)`.

Around it: `Idea`, `Problem`, `Solution`, `CalendarEvent`, `Reminder`, `Notification`,
`AutomationRule`, `JobRun`, `EmailLog`, `AiConversation`, `AiMessage`, `AiAction`,
`AuditLog`, `ActivityEvent`.

Two of those are infrastructure rather than domain data:

- **JobRun** has a unique `(jobKey, runKey)`. A cron job inserts its row first; a
  duplicate delivery hits the constraint and returns instead of emailing everyone twice.
- **ActivityEvent** is an autoincrementing feed. The SSE endpoint tails it by id, which
  works across serverless instances — an in-process EventEmitter would not.

## 3. Folder structure

```
prisma/schema.prisma          data model
prisma/seed.ts                the real team, the 14 projects, automation rules
src/middleware.ts             cookie gate; real checks happen deeper
src/lib/
  env.ts                      all configuration, nothing hardcoded
  db.ts                       Prisma singleton
  auth/{password,session,rbac}.ts
  email/{client,templates}.ts
  ai/{tools,agent,focus}.ts
  {api,validation,dates,audit,ratelimit}.ts
src/server/
  tasks.ts                    status transitions + history writing
  dashboard.ts                overview, team activity, project health, risks
  reports.ts                  briefing payloads and the heuristic focus list
  jobs/{runner,dailyBriefing,reminders}.ts
src/app/
  login/                      unauthenticated
  (app)/{dashboard,my-tasks,team,workspace,assistant}/
  api/…                       auth, tasks, dashboard, ideas, problems, capture,
                              stream, ai, cron
src/components/               roster, task board, assistant, capture box, …
```

## 4. Authentication and permissions

Sessions are signed JWTs (`jose`, HS256) in an httpOnly, SameSite=Lax cookie, 12 hours by
default. Passwords are bcrypt at cost 12. `middleware.ts` only checks that a cookie
exists — cheap, runs on the edge. Every server component and route handler then calls
`requireUser()`, which re-reads the User row, so deactivating an account takes effect on
the next request rather than at session expiry.

Visibility is computed in `rbac.ts`:

| Role | Sees |
| --- | --- |
| CEO | everything, including suggested tasks and the personal workspace |
| MANAGER | themselves plus their whole reporting subtree, walked recursively |
| EMPLOYEE | themselves |

A task is editable by its assignee, its creator, anyone above the assignee, and the CEO.
CEO-personal tasks are invisible to everyone else — the loader returns 404, not 403, so
their existence is not leaked. Login is rate-limited per IP; the assistant is rate-limited
per user.

## 5. AI tool calling

`runAssistant()` in `src/lib/ai/agent.ts` runs the standard loop: send messages plus the
tool definitions the caller's role permits, execute any `tool_use` blocks, feed the
results back, repeat up to six turns. Every message is persisted to `AiMessage` so a
conversation survives a page reload.

`executeTool()` is the single choke point, and it does four things in order:

1. Look the tool up. Unknown name → logged failure, error returned to the model.
2. Check `tool.roles` against the caller's role. Denied → `AiAction` row with status
   `DENIED`.
3. If the tool mutates data and the call is not pre-confirmed, write an `AiAction` with
   status `AWAITING_CONFIRMATION` and return that to the model instead of running it. The
   UI renders Confirm / Cancel buttons; `POST /api/ai/actions/[id]` runs or rejects it.
4. Otherwise parse the input with the tool's Zod schema, run it, and log the output.

Sixteen tools are registered, including the thirteen the brief names. Read tools
(`get_dashboard_summary`, `get_employee_status`, `get_employee_tasks`,
`get_project_status`, `generate_daily_report`, `generate_weekly_report`, `draft_email`)
run immediately. Write tools (`create_task`, `update_task`, `assign_task`,
`schedule_task`, `create_reminder`, `add_idea`, `add_problem`,
`approve_suggested_task`) go through confirmation.

The safety rule from the brief is enforced in two places, not one. The system prompt tells
the model not to invent development work; independently, `create_task` sets
`approvalState: PENDING_APPROVAL` on anything the assistant creates unless the
`ai_task_autoassign` automation rule has `autoAssign = true`. Prompt instructions can be
argued with. The database default cannot.

## 6. Scheduling

Three endpoints under `/api/cron/`, each requiring `Authorization: Bearer $CRON_SECRET`.
`vercel.json` calls them; any external scheduler (GitHub Actions, EasyCron, a cron line on
your own box) works identically because they are plain HTTP.

| Job | Schedule (UTC) | Local | Does |
| --- | --- | --- | --- |
| `daily-briefing` | `0 4 * * *` | 09:00 PKT | spawns recurring tasks, emails every employee their board, emails the CEO the briefing |
| `reminders` | hourly | — | sends due reminders and 24-hour deadline warnings |
| `overdue-sweep` | `0 11 * * *` | 16:00 PKT | one overdue digest per person per day |

Nothing runs on `setInterval` inside the app process, so a suspended or recycled instance
cannot silently stop the 9am email. `runOnce(jobKey, runKey, fn)` makes retries safe.
Because the schedule is expressed in UTC, change the hour when Pakistan's offset changes —
the value in `vercel.json` is the only place to edit.

The briefing's "where to spend your day" section calls the model, and falls back to
`heuristicFocus()` — a deterministic rules list — if the key is missing or the call fails.
The morning email never depends on the model being up.

## 7. Real-time

`GET /api/stream` opens an SSE connection and polls `ActivityEvent` every four seconds
from the client's last-seen id. The dashboard prepends new rows and calls
`router.refresh()`, so the counters at the top and the feed at the bottom never disagree.
Polling a table beats a socket here: it survives instance restarts, needs no sticky
sessions, and four seconds is well inside "immediately" for this use.

If you later outgrow it, the swap is contained: replace the interval in
`src/app/api/stream/route.ts` with Postgres `LISTEN/NOTIFY` on a long-lived connection.
Nothing else changes.

## 8. Development phases

Phase 1 — schema, auth, employees, projects. `prisma/schema.prisma`, `seed.ts`,
`lib/auth/*`, `/api/employees`, `/api/projects`.
Phase 2 — tasks and both dashboards. `server/tasks.ts`, `server/dashboard.ts`,
`/api/tasks`, `/dashboard`, `/my-tasks`.
Phase 3 — daily updates, live activity, scheduling fields. `/api/daily-updates`,
`/api/stream`, `ActivityStream`.
Phase 4 — email. `lib/email/*`, `server/jobs/*`, `/api/cron/*`.
Phase 5 — the assistant. `lib/ai/*`, `/api/ai/*`, `/assistant`.
Phase 6 — the CEO workspace: ideas, problems, solutions, capture box, reporting tools.

All six are implemented in this codebase. What is deliberately left for you is covered in
the README's "before you go live" list.
