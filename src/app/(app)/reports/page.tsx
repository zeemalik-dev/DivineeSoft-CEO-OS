import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { ceoBriefingData } from "@/server/reports";
import { Panel, Status } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await requireUser();
  if (user.role !== "CEO") redirect("/my-tasks");
  const data = await ceoBriefingData();
  const completed = data.overview.completedToday;
  return (
    <div className="space-y-6">
      <header><p className="eyebrow">Decision support</p><h1 className="page-title">Executive reports</h1><p className="mt-1 text-sm text-muted">A live operating read built from tasks, updates, projects, ideas, and problems.</p></header>
      <div className="grid gap-4 sm:grid-cols-4"><div className="metric-card"><span>Completed today</span><strong>{completed}</strong></div><div className="metric-card"><span>Open risks</span><strong className="text-risk">{data.risks.length}</strong></div><div className="metric-card"><span>Active people</span><strong>{data.overview.activeEmployees}</strong></div><div className="metric-card"><span>Awaiting approval</span><strong className="text-risk">{data.overview.pendingApproval}</strong></div></div>
      <div className="grid gap-6 lg:grid-cols-2"><Panel title="Critical read"><ul className="divide-y divide-rule">{data.risks.slice(0, 10).map((risk) => <li key={risk} className="px-[18px] py-3 text-sm">{risk}</li>)}{data.risks.length === 0 && <li className="px-[18px] py-5 text-sm text-muted">No critical risks surfaced.</li>}</ul></Panel><Panel title="Recent company movement"><ul className="divide-y divide-rule">{data.newActivity.slice(0, 10).map((item) => <li key={item} className="px-[18px] py-3 text-sm">{item}</li>)}{data.newActivity.length === 0 && <li className="px-[18px] py-5 text-sm text-muted">No new activity.</li>}</ul></Panel></div>
      <Panel title="Projects requiring attention"><div className="divide-y divide-rule">{data.delayedProjects.map((project) => <div key={project.id} className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-3"><div><p className="font-medium">{project.name}</p><p className="text-xs text-muted">{project.overdueTasks} overdue · {project.blockedTasks} blocked · {project.progress}% complete</p></div><Status value={project.health} /></div>)}{data.delayedProjects.length === 0 && <p className="px-[18px] py-5 text-sm text-muted">All tracked projects are currently on track.</p>}</div></Panel>
    </div>
  );
}
