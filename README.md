# DivineeSoft CEO OS

Company operations on one screen: who is working on what, which projects are slipping,
what needs your attention today, and an assistant that reads the same data you do.

Built with Next.js 15 (App Router), TypeScript, Postgres, Prisma, Resend and the
Anthropic API. `ARCHITECTURE.md` explains how the pieces fit; this file gets it running.

## Run it

You need Node 20+ and a Postgres database.

```bash
npm install
cp .env.example .env          # then edit it — see below
npx prisma migrate dev --name init
npm run db:seed
npm run dev                   # http://localhost:3000
```

Sign in as `zeeshan.malik@divineesoft.com` with whatever you set in
`SEED_DEFAULT_PASSWORD`. Every seeded account shares that password — change them before
you invite anyone.

### Environment

| Variable | Needed | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string |
| `AUTH_SECRET` | yes | `openssl rand -base64 48` |
| `CRON_SECRET` | yes | the scheduler sends this as a bearer token |
| `COMPANY_TIMEZONE` | yes | `Asia/Karachi`; every "today" in the app is computed in it |
| `SEED_DEFAULT_PASSWORD` | seeding only | starter password for seeded accounts |
| `RESEND_API_KEY` | no | without it, emails are written to the `EmailLog` table instead of sent |
| `EMAIL_FROM` | with Resend | must be a verified sender |
| `EMAIL_REDIRECT_ALL_TO` | staging | routes every outbound mail to one address |
| `ANTHROPIC_API_KEY` | no | without it the assistant is off and the briefing uses its rules-based focus list |
| `ANTHROPIC_MODEL` | no | defaults to `claude-sonnet-5` |

Nothing secret is ever read from anywhere but `process.env` (`src/lib/env.ts`).

## What is in it

**Command centre** (`/dashboard`, CEO only) — eight counters, the team roster with each
person's current task, status, progress, last update and blocker, project health sorted
worst-first, today's focus list, suggested tasks awaiting approval, the risk list, and a
live activity feed.

**Your board** (`/my-tasks`) — start, pause, set progress, send for review, flag a
blocker with a note, comment, complete. Plus the daily update box.

**Team** (`/team`) — the roster and recent daily updates, scoped to what your role allows.

**My workspace** (`/workspace`, CEO only) — personal tasks, schedule (events, reminders
and upcoming deadlines in one list), ideas, problems with solutions, and a capture box:
type a sentence and it is filed as an idea, task, reminder, problem or goal.

**Assistant** (`/assistant`) — natural language over live data, with an audit trail of
every tool call underneath it.

**Automation** — 09:00 employee task emails and the CEO briefing, hourly reminders and
deadline warnings, a daily overdue digest, recurring task spawning.

## Testing it

```bash
npm run typecheck
```

Sign in as the CEO, then in another browser as `falaqxhk@gmail.com`. Start a task as
Falaq; the CEO's dashboard updates within a few seconds without a reload. Flag a blocker;
it appears in the roster and the risk list in red.

Trigger the morning run by hand:

```bash
npm run cron:daily
# or against a running server:
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily-briefing
```

With no `RESEND_API_KEY` set, read what would have been sent:

```sql
select "to", subject, template, status, "createdAt" from "EmailLog" order by "createdAt" desc limit 20;
```

Ask the assistant to create something — "create a task for Hassaan to fix the CosmoLink
website footer tomorrow". It comes back as a queued action with Confirm and Cancel. Confirm
it, and it lands in **Suggested tasks awaiting approval** on the dashboard rather than in
Hassaan's board. That double gate is deliberate; see `ARCHITECTURE.md` §5. To let the
assistant assign directly, set `autoAssign = true` on the `ai_task_autoassign` row in
`AutomationRule`.

## Deploying

Vercel plus any managed Postgres (Neon, Supabase, RDS) is the shortest path.

```bash
npx prisma migrate deploy   # in your release step
```

Set every environment variable in the project settings, including `CRON_SECRET` — Vercel
sends it automatically as the bearer token for the schedules in `vercel.json`. If you host
elsewhere, point any scheduler at the same three URLs with the same header.

## Before you go live

- **The CEO's email address is a placeholder.** `zeeshan.malik@divineesoft.com` is in
  `prisma/seed.ts` because the brief did not give one. Change it, then re-seed or update
  the row.
- **Rotate every seeded password.** They all share one value.
- **Add a password-change screen.** `hashPassword` and `passwordProblem` are in
  `src/lib/auth/password.ts`; there is no UI on top of them yet, so today the CEO creates
  accounts through `POST /api/employees`.
- **Verify your sending domain in Resend** before the first 9am run, or the briefing will
  land in spam.
- **Check the cron hour after any timezone change.** The schedules in `vercel.json` are
  UTC and assume UTC+5.
- **The rate limiter is per-process** (`src/lib/ratelimit.ts`). On a single region that is
  fine; if you scale to several, move it to Redis.
- **Add a backup** of the Postgres database before this becomes the place decisions are
  recorded.
# DivineeSoft-CEO-OS
# DivineeSoft-CEO-OS
