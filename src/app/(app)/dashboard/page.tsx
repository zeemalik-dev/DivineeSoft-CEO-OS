import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { companyOverview, teamActivity, projectHealth, recentActivity, openRisks } from "@/server/dashboard";
import { ceoBriefingData, heuristicFocus } from "@/server/reports";
import { SignalStrip } from "@/components/SignalStrip";
import { TeamRoster } from "@/components/TeamRoster";
import { ProjectTable } from "@/components/ProjectTable";
import { ActivityStream } from "@/components/ActivityStream";
import { PendingApprovals } from "@/components/PendingApprovals";
import { Panel } from "@/components/ui";
import { fmt } from "@/lib/dates";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  if (user.role !== "CEO") redirect("/my-tasks");

  const [overview, team, projects, activity, risks, suggested] = await Promise.all([
    companyOverview(),
    teamActivity(),
    projectHealth(),
    recentActivity(20),
    openRisks(),
    prisma.task.findMany({
      where: { approvalState: "PENDING_APPROVAL" },
      include: { assignee: { select: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const briefing = await ceoBriefingData({ overview, team, projects });
  const focus = heuristicFocus(briefing);
  const hour = Number(fmt(new Date(), "H"));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">CEO command center</p>
        <h1 className="page-title">
          {greeting}, {user.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {overview.blocked > 0
            ? `${overview.blocked} task${overview.blocked === 1 ? " is" : "s are"} blocked. Start there.`
            : overview.overdue > 0
              ? `${overview.overdue} task${overview.overdue === 1 ? "" : "s"} slipped past their date.`
              : "Nothing is blocked or overdue right now."}
        </p>
      </header>

      <SignalStrip overview={overview} />

      <Panel title="Executive brief" aside={<Link className="text-xs text-accent underline underline-offset-2" href="/reports">Open full report</Link>}>
        <div className="grid gap-4 px-[18px] py-4 md:grid-cols-[1fr_260px]">
          <p className="text-[15px] leading-relaxed">
            {overview.blocked > 0
              ? `${overview.blocked} blocked task${overview.blocked === 1 ? " is" : "s are"} holding work back. Resolve the highest-impact blocker before adding new work.`
              : overview.projectsAtRisk > 0
                ? `${overview.projectsAtRisk} project${overview.projectsAtRisk === 1 ? " is" : "s are"} carrying delivery risk. Review overdue work and reset the next milestone.`
                : `${overview.activeEmployees} people are active across ${overview.activeProjects} projects. Keep momentum by clearing approvals and checking the next deadlines.`}
          </p>
          <div className="border-l border-rule pl-4 text-sm">
            <p className="text-xs uppercase tracking-[0.08em] text-muted">Recommended now</p>
            <p className="mt-2 font-medium">{focus[0] ?? "Review the company health signals and choose the highest-value action."}</p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Panel title="Where the team is right now">
            <TeamRoster rows={team} />
          </Panel>

          <Panel
            title="Projects"
            aside={<span className="text-xs text-muted">{projects.length} tracked</span>}
          >
            <ProjectTable rows={projects} />
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="CEO next action">
            <ol className="divide-y divide-rule">
              {focus.map((item, index) => (
                <li key={index} className="px-[18px] py-3 text-sm leading-relaxed">
                  {item}
                </li>
              ))}
            </ol>
            <p className="border-t border-rule px-[18px] py-2 text-xs text-muted">Built from current tasks, project health, blockers, approvals, and open problems.</p>
          </Panel>

          <Panel
            title="Suggested tasks awaiting approval"
            aside={<span className="text-xs text-muted">{suggested.length}</span>}
          >
            <PendingApprovals
              tasks={suggested.map((task) => ({
                id: task.id,
                title: task.title,
                rationale: task.aiRationale,
                assignee: task.assignee?.user.name ?? null,
              }))}
            />
          </Panel>

          <Panel title="Risks">
            <ul className="divide-y divide-rule text-sm">
              {risks.blockedTasks.map((task) => (
                <li key={task.id} className="px-[18px] py-2.5">
                  <span className="text-blocked">Blocked</span> — {task.title}
                  <span className="block text-xs text-muted">
                    {task.assignee?.user.name ?? "Unassigned"} · {task.blockerNote ?? "no detail given"}
                  </span>
                </li>
              ))}
              {risks.dueSoon.map((task) => (
                <li key={task.id} className="px-[18px] py-2.5">
                  Due {fmt(task.dueDate, "d MMM")} — {task.title}
                  <span className="block text-xs text-muted">{task.assignee?.user.name ?? "Unassigned"}</span>
                </li>
              ))}
              {risks.openProblems.map((problem) => (
                <li key={problem.id} className="px-[18px] py-2.5">
                  Problem ({problem.severity.toLowerCase()}) — {problem.title}
                </li>
              ))}
              {risks.blockedTasks.length + risks.dueSoon.length + risks.openProblems.length === 0 && (
                <li className="px-[18px] py-5 text-muted">No blockers, nothing due in three days, no open problems.</li>
              )}
            </ul>
          </Panel>

          <Panel
            title="Live activity"
            aside={
              <Link className="text-xs text-accent underline underline-offset-2" href="/assistant">
                Ask the assistant
              </Link>
            }
          >
            <ActivityStream
              initial={activity.map((event) => ({
                id: event.id.toString(),
                type: event.type,
                summary: event.summary,
                createdAt: event.createdAt.toISOString(),
              }))}
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}
