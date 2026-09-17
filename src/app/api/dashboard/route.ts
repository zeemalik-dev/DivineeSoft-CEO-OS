import { requireUser } from "@/lib/auth/session";
import { visibleEmployeeIds } from "@/lib/auth/rbac";
import { companyOverview, teamActivity, projectHealth, recentActivity, openRisks } from "@/server/dashboard";
import { ceoBriefingData, heuristicFocus } from "@/server/reports";
import { handler, ok } from "@/lib/api";
import { prisma } from "@/lib/db";



export const GET = handler(async () => {
  const user = await requireUser();
  const scope = await visibleEmployeeIds(user);

  const [overview, team, projects, activity, risks, suggested] = await Promise.all([
    companyOverview(),
    teamActivity(scope === "ALL" ? undefined : scope),
    projectHealth(),
    recentActivity(20),
    openRisks(),
    // Pending approvals — only meaningful for CEO but harmless for others (will be empty)
    prisma.task.findMany({
      where: { approvalState: "PENDING_APPROVAL" },
      include: { assignee: { select: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  // CEO heuristic focus (computed server-side, returned as strings)
  const briefing = await ceoBriefingData({ overview, team, projects });
  const focus = heuristicFocus(briefing);

  return ok({
    overview,
    team,
    projects,
    risks: {
      blockedTasks: risks.blockedTasks.map((t) => ({
        id: t.id,
        title: t.title,
        blockerNote: t.blockerNote,
        assignee: t.assignee ? { user: { name: t.assignee.user.name } } : null,
      })),
      dueSoon: risks.dueSoon.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate?.toISOString() ?? null,
        assignee: t.assignee ? { user: { name: t.assignee.user.name } } : null,
      })),
      openProblems: risks.openProblems.map((p) => ({
        id: p.id,
        title: p.title,
        severity: p.severity,
      })),
    },
    activity: activity.map((a) => ({ ...a, id: a.id.toString() })),
    suggested: suggested.map((task) => ({
      id: task.id,
      title: task.title,
      rationale: task.aiRationale,
      assignee: task.assignee?.user.name ?? null,
    })),
    focus,
  });
});
