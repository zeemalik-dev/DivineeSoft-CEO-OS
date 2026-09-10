import { env } from "@/lib/env";
import { fmt } from "@/lib/dates";

const INK = "#1b2432";
const MUTED = "#6b7280";
const RULE = "#e2e2dc";

function shell(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f6f3;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${INK}">
  <table role="presentation" width="100%" style="max-width:620px;margin:0 auto;background:#fff;border:1px solid ${RULE};border-radius:6px">
    <tr><td style="padding:24px 28px 8px">
      <div style="font-size:12px;letter-spacing:.04em;color:${MUTED}">${env.companyName}</div>
      <h1 style="margin:6px 0 0;font-size:20px;font-weight:600;line-height:1.3">${title}</h1>
    </td></tr>
    <tr><td style="padding:8px 28px 24px;font-size:14px;line-height:1.6">${body}</td></tr>
    <tr><td style="padding:16px 28px 22px;border-top:1px solid ${RULE};font-size:12px;color:${MUTED}">
      <a href="${env.appUrl}" style="color:${INK}">Open the dashboard</a> · sent automatically by the CEO OS
    </td></tr>
  </table></body></html>`;
}

function section(heading: string, rows: string[]) {
  if (!rows.length) return "";
  return `<h2 style="font-size:13px;font-weight:600;margin:22px 0 8px;padding-bottom:6px;border-bottom:1px solid ${RULE}">${heading}</h2>
  <ul style="margin:0;padding-left:18px">${rows.map((r) => `<li style="margin:4px 0">${r}</li>`).join("")}</ul>`;
}

export type TaskLine = {
  title: string;
  project?: string | null;
  dueDate?: Date | null;
  status?: string;
  priority?: string;
  assignee?: string | null;
};

const line = (t: TaskLine) =>
  `<strong>${escape(t.title)}</strong>${t.project ? ` — ${escape(t.project)}` : ""}` +
  `${t.assignee ? ` · ${escape(t.assignee)}` : ""}` +
  `${t.dueDate ? ` · due ${fmt(t.dueDate, "d MMM")}` : ""}` +
  `${t.priority && t.priority !== "MEDIUM" ? ` · ${t.priority.toLowerCase()} priority` : ""}`;

export function escape(value: string) {
  return value.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!);
}

export function employeeDailyEmail(input: {
  name: string;
  today: TaskLine[];
  overdue: TaskLine[];
  blocked: TaskLine[];
  upcoming: TaskLine[];
}) {
  const body =
    `<p>Morning ${escape(input.name)} — here is your board for today.</p>` +
    section("Scheduled for today", input.today.map(line)) +
    section("Overdue", input.overdue.map(line)) +
    section("Blocked, needs a nudge", input.blocked.map(line)) +
    section("Coming up this week", input.upcoming.map(line)) +
    (input.today.length + input.overdue.length + input.blocked.length === 0
      ? "<p>Nothing is scheduled. Pick up something from your backlog or tell your lead you have capacity.</p>"
      : "<p>Update progress as you go so the dashboard stays honest.</p>");
  return { subject: `Your tasks — ${fmt(new Date(), "EEE d MMM")}`, html: shell("Today's tasks", body) };
}

export function ceoDailyEmail(input: {
  overview: Record<string, number>;
  team: { name: string; currentTask: string | null; openTasks: number; overdueTasks: number; blocker: string | null }[];
  delayedProjects: { name: string; overdueTasks: number; blockedTasks: number; progress: number }[];
  risks: string[];
  focus: string[];
  newActivity: string[];
}) {
  const o = input.overview;
  const stat = (label: string, value: number) =>
    `<td style="padding:8px 12px;border:1px solid ${RULE}"><div style="font-size:22px;font-weight:600">${value}</div><div style="font-size:11px;color:${MUTED}">${label}</div></td>`;

  const body =
    `<table role="presentation" style="border-collapse:collapse;margin:8px 0 4px"><tr>
      ${stat("in progress", o.tasksInProgress)}${stat("overdue", o.overdue)}${stat("blocked", o.blocked)}${stat("done today", o.completedToday)}
    </tr></table>` +
    section(
      "Team",
      input.team.map(
        (t) =>
          `<strong>${escape(t.name)}</strong> — ${t.currentTask ? escape(t.currentTask) : "nothing active"}` +
          ` · ${t.openTasks} open${t.overdueTasks ? `, ${t.overdueTasks} overdue` : ""}` +
          `${t.blocker ? ` · <span style="color:#b4331f">blocked: ${escape(t.blocker)}</span>` : ""}`,
      ),
    ) +
    section(
      "Projects needing attention",
      input.delayedProjects.map(
        (p) => `<strong>${escape(p.name)}</strong> — ${p.progress}% · ${p.overdueTasks} overdue · ${p.blockedTasks} blocked`,
      ),
    ) +
    section("Risks", input.risks.map(escape)) +
    section("Where to spend your day", input.focus.map(escape)) +
    section("New since yesterday", input.newActivity.map(escape));

  return {
    subject: `Company briefing — ${fmt(new Date(), "EEE d MMM")}`,
    html: shell("Your morning briefing", body),
  };
}

export function taskAssignedEmail(input: { name: string; task: TaskLine; assignedBy: string }) {
  return {
    subject: `New task: ${input.task.title}`,
    html: shell(
      "A task was assigned to you",
      `<p>${escape(input.assignedBy)} assigned you a task.</p><p>${line(input.task)}</p>`,
    ),
  };
}

export function reminderEmail(input: { message: string; when: Date }) {
  return {
    subject: `Reminder: ${input.message.slice(0, 60)}`,
    html: shell("Reminder", `<p>${escape(input.message)}</p><p style="color:${MUTED}">Set for ${fmt(input.when)}</p>`),
  };
}

export function overdueEmail(input: { name: string; tasks: TaskLine[] }) {
  return {
    subject: `${input.tasks.length} task${input.tasks.length === 1 ? "" : "s"} past due`,
    html: shell(
      "Past due",
      `<p>${escape(input.name)}, these have slipped past their date.</p>` + section("Overdue", input.tasks.map(line)),
    ),
  };
}
