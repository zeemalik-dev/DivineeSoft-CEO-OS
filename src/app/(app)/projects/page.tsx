import { requireUser } from "@/lib/auth/session";
import { canManageProject, canDeleteProject } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { addDays } from "@/lib/dates";
import { ProjectClient } from "@/components/ProjectClient";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await requireUser();
  const canManage = canManageProject(user);
  const canDelete = canDeleteProject(user);

  const [rawProjects, employees] = await Promise.all([
    prisma.project.findMany({
      include: {
        lead: { select: { id: true, title: true, user: { select: { id: true, name: true, email: true } } } },
        manager: { select: { id: true, title: true, user: { select: { id: true, name: true, email: true } } } },
        members: {
          include: {
            employee: {
              select: { id: true, title: true, user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
        tasks: {
          where: { approvalState: "APPROVED" },
          select: { id: true, status: true, progress: true, dueDate: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employee.findMany({
      where: { isActive: true },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  const projects = rawProjects.map((project) => {
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

    return {
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description,
      platforms: project.platforms,
      status: project.status,
      healthNote: project.healthNote,
      startedAt: project.startedAt ? project.startedAt.toISOString() : null,
      dueDate: project.dueDate ? project.dueDate.toISOString() : null,
      leadId: project.leadId,
      lead: project.lead ? { id: project.lead.id, name: project.lead.user.name, title: project.lead.title } : null,
      managerId: project.managerId,
      manager: project.manager ? { id: project.manager.id, name: project.manager.user.name, title: project.manager.title } : null,
      members: project.members.map((m) => ({
        id: m.id,
        employeeId: m.employeeId,
        name: m.employee.user.name,
        roleOnProject: m.roleOnProject,
      })),
      totalTasks: tasks.length,
      openTasks: openTasks.length,
      overdueTasks,
      blockedTasks,
      progress,
      health,
    };
  });

  const employeeOptions = employees.map((emp) => ({
    id: emp.id,
    name: emp.user.name,
    title: emp.title,
  }));

  return (
    <ProjectClient
      initialProjects={projects}
      employees={employeeOptions}
      canManage={canManage}
      canDelete={canDelete}
      userRole={user.role}
    />
  );
}

