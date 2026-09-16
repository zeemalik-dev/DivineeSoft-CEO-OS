import { prisma } from "@/lib/db";
import { localDayBounds, addDays } from "@/lib/dates";
import { companyOverview, teamActivity, projectHealth, type CompanyOverview, type TeamRow, type ProjectRow } from "@/server/dashboard";
import type { TaskLine } from "@/lib/email/templates";

const asLine = (t: {
  title: string;
  project?: { name: string } | null;
  dueDate: Date | null;
  status: string;
  priority: string;
  assignee?: { user: { name: string } } | null;
}): TaskLine => ({
  title: t.title,
  project: t.project?.name ?? null,
  dueDate: t.dueDate,
  status: t.status,
  priority: t.priority,
  assignee: t.assignee?.user.name ?? null,
});

export async function employeeDailyPayload(employeeId: string) {
  const { end } = localDayBounds();
  const base = { assigneeId: employeeId, approvalState: "APPROVED" as const, status: { not: "COMPLETED" as const } };

  const [today, overdue, blocked, upcoming] = await Promise.all([
    prisma.task.findMany({
      where: { ...base, OR: [{ scheduledFor: { lte: end } }, { dueDate: { lte: end } }] },
      include: { project: { select: { name: true } } },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    }),
    prisma.task.findMany({
      where: { ...base, dueDate: { lt: new Date() } },
      include: { project: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.task.findMany({
      where: { assigneeId: employeeId, status: "BLOCKED" },
      include: { project: { select: { name: true } } },
    }),
    prisma.task.findMany({
      where: { ...base, dueDate: { gt: end, lte: addDays(new Date(), 7) } },
      include: { project: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
  ]);

  const overdueIds = new Set(overdue.map((t) => t.id));
  return {
    today: today.filter((t) => !overdueIds.has(t.id)).map(asLine),
    overdue: overdue.map(asLine),
    blocked: blocked.map(asLine),
    upcoming: upcoming.map(asLine),
    workload: today.length + overdue.length,
  };
}

/** Everything the CEO briefing needs, computed from the database alone. */
export async function ceoBriefingData(preloaded?: {
  overview?: CompanyOverview;
  team?: TeamRow[];
  projects?: ProjectRow[];
}) {
  const { start, end } = localDayBounds();
  const [overview, team, projects, ideas, problems, completed, pending] = await Promise.all([
    preloaded?.overview ?? companyOverview(),
    preloaded?.team ?? teamActivity(),
    preloaded?.projects ?? projectHealth(),
    prisma.idea.findMany({ where: { createdAt: { gte: addDays(new Date(), -1) } }, take: 10 }),
    prisma.problem.findMany({
      where: { status: { not: "RESOLVED" } },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: 10,
    }),
    prisma.task.findMany({
      where: { status: "COMPLETED", completedAt: { gte: addDays(start, -1), lte: end } },
      include: { assignee: { select: { user: { select: { name: true } } } } },
      take: 20,
    }),
    prisma.task.findMany({ where: { approvalState: "PENDING_APPROVAL" }, take: 10 }),
  ]);

  const delayedProjects = projects.filter((p) => p.health === "DELAYED" || p.health === "BLOCKED" || p.health === "AT_RISK");

  const risks = [
    ...team.filter((t) => t.blocker).map((t) => `${t.name} is blocked: ${t.blocker}`),
    ...projects.filter((p) => p.health === "DELAYED").map((p) => `${p.name} has ${p.overdueTasks} overdue tasks`),
    ...(overview.awaitingReview ? [`${overview.awaitingReview} task(s) waiting on your review`] : []),
    ...(overview.pendingApproval ? [`${overview.pendingApproval} suggested task(s) awaiting your approval`] : []),
  ];

  const newActivity = [
    ...ideas.map((i) => `Idea: ${i.title}`),
    ...problems.slice(0, 5).map((p) => `Problem (${p.severity.toLowerCase()}): ${p.title}`),
    ...completed.slice(0, 8).map((t) => `Done: ${t.title} — ${t.assignee?.user.name ?? "unassigned"}`),
  ];

  return { overview, team, projects, delayedProjects, risks, newActivity, problems, ideas, pending };
}

/** Deterministic fallback focus list, used when the AI is unavailable. */
export function heuristicFocus(data: Awaited<ReturnType<typeof ceoBriefingData>>): string[] {
  const focus: string[] = [];
  const blockedPeople = data.team.filter((t) => t.blocker);
  if (blockedPeople.length) {
    focus.push(`Unblock ${blockedPeople.map((t) => t.name).join(", ")} before anything else — they cannot move today.`);
  }
  const worst = [...data.projects].sort((a, b) => b.overdueTasks - a.overdueTasks)[0];
  if (worst && worst.overdueTasks > 0) {
    focus.push(`${worst.name} is carrying ${worst.overdueTasks} overdue tasks. Re-plan the dates or cut scope.`);
  }
  if (data.overview.awaitingReview) {
    focus.push(`Clear the ${data.overview.awaitingReview} item(s) waiting on your review — the team is idle on them.`);
  }
  const idle = data.team.filter((t) => t.openTasks === 0);
  if (idle.length) focus.push(`No open work for ${idle.map((t) => t.name).join(", ")}. Assign or reprioritise.`);
  const critical = data.problems.filter((p) => p.severity === "CRITICAL" || p.severity === "HIGH");
  if (critical.length) focus.push(`Open ${critical[0].severity.toLowerCase()} problem: ${critical[0].title}.`);
  if (!focus.length) focus.push("Nothing is on fire. Spend the day on strategy rather than triage.");
  return focus.slice(0, 5);
}
