import { requireUser } from "@/lib/auth/session";
import { visibleEmployeeIds } from "@/lib/auth/rbac";
import { companyOverview, teamActivity, projectHealth, recentActivity, openRisks } from "@/server/dashboard";
import { handler, ok } from "@/lib/api";



export const GET = handler(async () => {
  const user = await requireUser();
  const scope = await visibleEmployeeIds(user);
  const [overview, team, projects, activity, risks] = await Promise.all([
    companyOverview(),
    teamActivity(scope === "ALL" ? undefined : scope),
    projectHealth(),
    recentActivity(20),
    openRisks(),
  ]);
  return ok({
    overview,
    team,
    projects,
    risks,
    activity: activity.map((a) => ({ ...a, id: a.id.toString() })),
  });
});
