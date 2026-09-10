import { requireUser } from "@/lib/auth/session";
import { visibleEmployeeIds } from "@/lib/auth/rbac";
import { teamActivity } from "@/server/dashboard";
import { prisma } from "@/lib/db";
import { TeamRoster } from "@/components/TeamRoster";
import { Panel } from "@/components/ui";
import { fmt } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const user = await requireUser();
  const scope = await visibleEmployeeIds(user);
  const ids = scope === "ALL" ? undefined : scope;

  const [rows, updates] = await Promise.all([
    teamActivity(ids),
    prisma.dailyUpdate.findMany({
      where: ids ? { employeeId: { in: ids } } : undefined,
      include: { employee: { include: { user: { select: { name: true } } } } },
      orderBy: { forDate: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">Team</h1>
        <p className="mt-1 text-sm text-muted">
          {scope === "ALL" ? "Everyone at the company." : "You and the people who report to you."}
        </p>
      </header>

      <Panel title="Current work">
        <TeamRoster rows={rows} />
      </Panel>

      <Panel title="Recent daily updates">
        <ul className="divide-y divide-rule">
          {updates.length === 0 && <li className="px-[18px] py-5 text-sm text-muted">No updates posted yet.</li>}
          {updates.map((update) => (
            <li key={update.id} className="px-[18px] py-3 text-sm">
              <p className="font-medium">
                {update.employee.user.name}
                <span className="ml-2 text-xs font-normal text-muted">{fmt(update.forDate, "d MMM")}</span>
              </p>
              <p className="mt-1 leading-relaxed">{update.didToday}</p>
              {update.planNext && <p className="mt-1 text-muted">Next: {update.planNext}</p>}
              {update.blockers && <p className="mt-1 text-blocked">Blocked: {update.blockers}</p>}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
