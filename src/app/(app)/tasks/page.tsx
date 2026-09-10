import { requireUser } from "@/lib/auth/session";
import { visibleEmployeeIds, isManagerOrAbove } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { TaskClient } from "@/components/TaskClient";

export const dynamic = "force-dynamic";

export default async function TasksPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "ALL";
  const projectId = typeof params.projectId === "string" ? params.projectId : undefined;
  const assigneeId = typeof params.assigneeId === "string" ? params.assigneeId : undefined;
  const scope = await visibleEmployeeIds(user);
  const where = {
    kind: "TEAM" as const,
    ...(projectId ? { projectId } : {}),
    ...(assigneeId ? { assigneeId } : {}),
    ...(scope === "ALL" ? {} : { OR: [{ assigneeId: { in: scope } }, { createdById: user.id }] }),
    ...(status === "OVERDUE"
      ? { dueDate: { lt: new Date() }, status: { not: "COMPLETED" as const } }
      : status !== "ALL" && status !== "UPCOMING"
        ? { status: status as "NOT_STARTED" | "STARTED" | "IN_PROGRESS" | "WAITING_FOR_REVIEW" | "BLOCKED" | "COMPLETED" }
        : status === "UPCOMING"
          ? { dueDate: { gte: new Date(), lte: new Date(Date.now() + 7 * 86400000) }, status: { not: "COMPLETED" as const } }
          : {}),
  };

  const tasks = await prisma.task.findMany({
    where,
    include: {
      project: { select: { name: true } },
      assignee: { select: { user: { select: { name: true } } } },
      createdBy: { select: { name: true } },
    },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { updatedAt: "desc" }],
    take: 200,
  });

  const [employees, projects] = user.role === "CEO" || user.role === "MANAGER"
    ? await Promise.all([
        prisma.employee.findMany({
          where: scope === "ALL" ? { isActive: true } : { id: { in: scope }, isActive: true },
          include: { user: { select: { name: true } } },
          orderBy: { user: { name: "asc" } },
        }),
        prisma.project.findMany({
          where: { status: { notIn: ["ARCHIVED", "COMPLETED"] } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
      ])
    : [[], []];

  return (
    <TaskClient
      employees={employees.map((employee) => ({ id: employee.id, name: employee.user.name }))}
      projects={projects}
      tasks={tasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        project: task.project,
        assignee: task.assignee,
      }))}
      canManage={isManagerOrAbove(user)}
      initialStatus={status}
    />
  );
}
