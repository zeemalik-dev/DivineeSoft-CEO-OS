import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { canManageProject, canDeleteProject } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { addDays, fmt } from "@/lib/dates";
import { Progress, Status } from "@/components/ui";
import { ProjectDetailActions } from "@/components/ProjectDetailActions";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export default async function ProjectDetailPage({ params }: Ctx) {
  const user = await requireUser();
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      lead: { select: { id: true, title: true, user: { select: { id: true, name: true, email: true } } } },
      manager: { select: { id: true, title: true, user: { select: { id: true, name: true, email: true } } } },
      members: {
        include: {
          employee: {
            select: { id: true, title: true, user: { select: { id: true, name: true, email: true } } },
          },
        },
        orderBy: { addedAt: "asc" },
      },
      tasks: {
        where: { approvalState: "APPROVED" },
        include: {
          assignee: { select: { id: true, title: true, user: { select: { id: true, name: true } } } },
        },
        orderBy: [{ status: "asc" }, { priority: "desc" }, { dueDate: "asc" }],
      },
    },
  });

  if (!project) {
    notFound();
  }

  const canManage = canManageProject(user);
  const canDelete = canDeleteProject(user);

  const tasks = project.tasks;
  const openTasks = tasks.filter((t) => t.status !== "COMPLETED");
  const overdueTasks = openTasks.filter((t) => t.dueDate && t.dueDate < new Date()).length;
  const blockedTasks = openTasks.filter((t) => t.status === "BLOCKED").length;
  const progress = tasks.length
    ? Math.round(tasks.reduce((sum, t) => sum + (t.status === "COMPLETED" ? 100 : t.progress), 0) / tasks.length)
    : 0;

  let health: "ON_TRACK" | "AT_RISK" | "DELAYED" | "BLOCKED" | "DONE" = "ON_TRACK";
  if (project.status === "COMPLETED") health = "DONE";
  else if (blockedTasks > 0 || project.status === "BLOCKED") health = "BLOCKED";
  else if (overdueTasks > 1) health = "DELAYED";
  else if (overdueTasks === 1 || (project.dueDate && project.dueDate < addDays(new Date(), 3))) health = "AT_RISK";

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted">
        <Link href="/projects" className="hover:text-ink transition-colors">
          Portfolio
        </Link>
        <span>/</span>
        <span className="text-ink font-medium">{project.name}</span>
      </div>

      {/* Main Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between border-b border-rule pb-6">
        <div className="space-y-2 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="page-title text-2xl md:text-3xl">{project.name}</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-md border border-rule font-medium bg-surface text-ink">
              {project.status.replace(/_/g, " ")}
            </span>
            <Status value={health} />
          </div>

          {project.description && (
            <p className="text-sm text-muted leading-relaxed">{project.description}</p>
          )}

          {project.platforms && project.platforms.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs text-muted mr-1">Platforms:</span>
              {project.platforms.map((plat) => (
                <span
                  key={plat}
                  className="rounded-md bg-sunk px-2 py-0.5 text-xs font-medium text-ink border border-rule/50"
                >
                  {plat}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Header Action Buttons */}
        <ProjectDetailActions
          projectId={project.id}
          projectName={project.name}
          canManage={canManage}
          canDelete={canDelete}
        />
      </header>

      {/* Project KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="metric-card">
          <span>Overall Progress</span>
          <div className="mt-1 space-y-1">
            <strong>{progress}%</strong>
            <Progress
              value={progress}
              tone={health === "ON_TRACK" || health === "DONE" ? "ontrack" : health === "BLOCKED" ? "blocked" : "risk"}
            />
          </div>
        </div>

        <div className="metric-card">
          <span>Open Tasks</span>
          <strong className="text-ink">{openTasks.length} <span className="text-xs text-muted font-normal">/ {tasks.length} total</span></strong>
        </div>

        <div className="metric-card">
          <span>Blockers & Overdue</span>
          <strong className={blockedTasks > 0 || overdueTasks > 0 ? "text-blocked" : "text-ontrack"}>
            {blockedTasks} blocked · {overdueTasks} late
          </strong>
        </div>

        <div className="metric-card">
          <span>Target Deadline</span>
          <strong className={overdueTasks > 0 ? "text-blocked" : "text-ink"}>
            {project.dueDate ? fmt(project.dueDate, "d MMM yyyy") : "Open schedule"}
          </strong>
        </div>
      </div>

      {/* Team Roster & Timeline Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Leadership & Staffing Panel */}
        <section className="rounded-xl border border-rule bg-surface p-5 md:col-span-1 space-y-5">
          <div className="border-b border-rule pb-3">
            <h2 className="text-sm font-semibold text-ink">Team & Leadership</h2>
            <p className="text-xs text-muted">Assigned leads and contributors.</p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Lead */}
            <div>
              <span className="text-muted block mb-1 uppercase tracking-wider text-[10px] font-semibold">
                Project Lead
              </span>
              {project.lead ? (
                <div className="p-2 rounded-lg bg-sunk border border-rule/50">
                  <p className="font-semibold text-ink">{project.lead.user.name}</p>
                  <p className="text-muted">{project.lead.title ?? project.lead.user.email}</p>
                </div>
              ) : (
                <p className="text-muted italic">Unassigned</p>
              )}
            </div>

            {/* Manager */}
            <div>
              <span className="text-muted block mb-1 uppercase tracking-wider text-[10px] font-semibold">
                Project Manager
              </span>
              {project.manager ? (
                <div className="p-2 rounded-lg bg-sunk border border-rule/50">
                  <p className="font-semibold text-ink">{project.manager.user.name}</p>
                  <p className="text-muted">{project.manager.title ?? project.manager.user.email}</p>
                </div>
              ) : (
                <p className="text-muted italic">Unassigned</p>
              )}
            </div>

            {/* Team Members */}
            <div>
              <span className="text-muted block mb-1.5 uppercase tracking-wider text-[10px] font-semibold">
                Team Members ({project.members.length})
              </span>
              {project.members.length === 0 ? (
                <p className="text-muted italic">No team members assigned.</p>
              ) : (
                <div className="divide-y divide-rule/40 border border-rule/50 rounded-lg bg-sunk max-h-48 overflow-y-auto">
                  {project.members.map((m) => (
                    <div key={m.id} className="p-2 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-ink">{m.employee.user.name}</p>
                        <p className="text-[11px] text-muted">{m.employee.title ?? m.employee.user.email}</p>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-rule text-muted">
                        {m.roleOnProject}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Project Tasks Panel */}
        <section className="rounded-xl border border-rule bg-surface p-5 md:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-rule pb-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">Project Tasks ({tasks.length})</h2>
              <p className="text-xs text-muted">Action items registered under this initiative.</p>
            </div>
            <Link
              href={`/tasks?projectId=${project.id}`}
              className="btn btn-secondary text-xs py-1 px-3"
            >
              Open Task Board
            </Link>
          </div>

          {tasks.length === 0 ? (
            <div className="py-12 text-center text-muted text-xs space-y-2">
              <p>No tasks assigned to this project yet.</p>
              <Link
                href="/tasks"
                className="btn btn-primary text-xs inline-block"
              >
                Create a Task
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-rule max-h-[420px] overflow-y-auto">
              {tasks.map((task) => (
                <div key={task.id} className="py-2.5 px-2 flex items-center justify-between hover:bg-sunk rounded-lg transition-colors text-xs">
                  <div className="space-y-0.5 max-w-md">
                    <p className="font-medium text-ink">{task.title}</p>
                    <p className="text-muted text-[11px]">
                      Assignee: {task.assignee?.user.name ?? "Unassigned"} · Priority: {task.priority}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Status value={task.status} />
                    <span className="text-muted text-[11px]">
                      {task.dueDate ? fmt(task.dueDate, "d MMM") : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
