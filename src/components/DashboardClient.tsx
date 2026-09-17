"use client";

import { useGetDashboardQuery } from "@/redux/api/dashboardApi";
import type { CompanyOverview, TeamRow, ProjectRow, RiskData, SuggestedTask, ActivityEvent } from "@/redux/api/dashboardApi";
import { SignalStrip } from "@/components/SignalStrip";
import { TeamRoster } from "@/components/TeamRoster";
import { ProjectTable } from "@/components/ProjectTable";
import { ActivityStream } from "@/components/ActivityStream";
import { PendingApprovals } from "@/components/PendingApprovals";
import { Panel } from "@/components/ui";
import Link from "next/link";

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-rule ${className ?? "h-4 w-full"}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="panel grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-4 py-3">
            <SkeletonBlock className="h-7 w-12" />
            <SkeletonBlock className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="panel h-28" />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="panel h-48" />
          <div className="panel h-36" />
        </div>
        <div className="space-y-6">
          <div className="panel h-40" />
          <div className="panel h-32" />
        </div>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  userName: string;
  greeting: string;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function DashboardClient({ userName, greeting }: Props) {
  const { data, isLoading, isError, error } = useGetDashboardQuery();

  if (isLoading) return <DashboardSkeleton />;

  if (isError || !data) {
    return (
      <div className="panel px-[18px] py-8 text-center text-sm text-blocked">
        Could not load dashboard data.{" "}
        {(error as any)?.data?.error ?? "Please refresh the page."}
      </div>
    );
  }

  const { overview, team, projects, risks, activity, suggested, focus } = data;

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">CEO command center</p>
        <h1 className="page-title">
          {greeting}, {userName.split(" ")[0]}
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

      <Panel
        title="Executive brief"
        aside={
          <Link className="text-xs text-accent underline underline-offset-2" href="/reports">
            Open full report
          </Link>
        }
      >
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
            <p className="mt-2 font-medium">
              {focus[0] ?? "Review the company health signals and choose the highest-value action."}
            </p>
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
            <p className="border-t border-rule px-[18px] py-2 text-xs text-muted">
              Built from current tasks, project health, blockers, approvals, and open problems.
            </p>
          </Panel>

          <Panel
            title="Suggested tasks awaiting approval"
            aside={<span className="text-xs text-muted">{suggested.length}</span>}
          >
            <PendingApprovals tasks={suggested} />
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
                  Due {task.dueDate ? new Date(task.dueDate).toLocaleDateString([], { day: "numeric", month: "short" }) : "—"} — {task.title}
                  <span className="block text-xs text-muted">
                    {task.assignee?.user.name ?? "Unassigned"}
                  </span>
                </li>
              ))}
              {risks.openProblems.map((problem) => (
                <li key={problem.id} className="px-[18px] py-2.5">
                  Problem ({problem.severity.toLowerCase()}) — {problem.title}
                </li>
              ))}
              {risks.blockedTasks.length + risks.dueSoon.length + risks.openProblems.length === 0 && (
                <li className="px-[18px] py-5 text-muted">
                  No blockers, nothing due in three days, no open problems.
                </li>
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
            <ActivityStream initial={activity} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
