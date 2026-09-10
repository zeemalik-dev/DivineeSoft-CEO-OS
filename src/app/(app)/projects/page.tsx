import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { projectHealth } from "@/server/dashboard";
import { Panel, Progress, Status } from "@/components/ui";
import { fmt } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  await requireUser();
  const projects = await projectHealth();
  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Portfolio</p>
        <h1 className="page-title">Project command center</h1>
        <p className="mt-1 text-sm text-muted">Health is calculated from actual task progress, blockers, and deadlines.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-3"><div className="metric-card"><span>Tracked</span><strong>{projects.length}</strong></div><div className="metric-card"><span>At risk or delayed</span><strong className="text-risk">{projects.filter((p) => ["AT_RISK", "DELAYED"].includes(p.health)).length}</strong></div><div className="metric-card"><span>Blocked</span><strong className="text-blocked">{projects.filter((p) => p.health === "BLOCKED").length}</strong></div></div>
      <Panel title="Portfolio health">
        <div className="divide-y divide-rule">
          {projects.map((project) => <Link href={`/tasks?projectId=${project.id}`} key={project.id} className="grid gap-3 px-[18px] py-4 transition-colors hover:bg-sunk md:grid-cols-[1fr_130px_180px_100px_110px]"><div><p className="font-medium">{project.name}</p><p className="mt-1 text-xs text-muted">Lead: {project.lead ?? "Unassigned"}</p></div><div><Status value={project.health} /></div><div><div className="mb-1 text-xs text-muted">{project.progress}% complete</div><Progress value={project.progress} tone={project.health === "ON_TRACK" || project.health === "DONE" ? "ontrack" : project.health === "BLOCKED" ? "blocked" : "risk"} /></div><div className="text-sm">{project.openTasks} open</div><div className={`text-sm ${project.overdueTasks ? "text-blocked" : "text-muted"}`}>{project.overdueTasks} overdue{project.dueDate ? ` · ${fmt(project.dueDate, "d MMM")}` : ""}</div></Link>)}
        </div>
      </Panel>
    </div>
  );
}
