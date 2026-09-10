import { prisma } from "@/lib/db";
import { localDayBounds, addDays } from "@/lib/dates";
import { overdueWhere } from "@/server/tasks";

export type CompanyOverview = {
  totalEmployees: number;
  activeEmployees: number;
  employeesWithoutActiveTask: number;
  activeProjects: number;
  projectsAtRisk: number;
  tasksInProgress: number;
  completedToday: number;
  overdue: number;
  blocked: number;
  upcomingDeadlines: number;
  pendingApproval: number;
  awaitingReview: number;
};

export async function companyOverview(): Promise<CompanyOverview> {
  const { start, end } = localDayBounds();
  const soon = addDays(new Date(), 7);
  const approved = { approvalState: "APPROVED" as const, kind: "TEAM" as const };

  const [
    totalEmployees,
    activeEmployees,
    employeesWithoutActiveTask,
    activeProjects,
    projectsAtRisk,
    tasksInProgress,
    completedToday,
    overdue,
    blocked,
    upcomingDeadlines,
    pendingApproval,
    awaitingReview,
  ] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { isActive: true } }),
    prisma.employee.count({
      where: {
        isActive: true,
        assignedTasks: {
          none: { approvalState: "APPROVED", status: { not: "COMPLETED" } },
        },
      },
    }),
    prisma.project.count({ where: { status: { in: ["ACTIVE", "PLANNING"] } } }),
    prisma.project.count({
      where: {
        status: { notIn: ["ARCHIVED", "COMPLETED"] },
        tasks: {
          some: {
            approvalState: "APPROVED",
            status: { not: "COMPLETED" },
            dueDate: { lt: new Date() },
          },
        },
      },
    }),
    prisma.task.count({ where: { ...approved, status: { in: ["STARTED", "IN_PROGRESS"] } } }),
    prisma.task.count({ where: { ...approved, status: "COMPLETED", completedAt: { gte: start, lte: end } } }),
    prisma.task.count({ where: { ...overdueWhere(), kind: "TEAM" } }),
    prisma.task.count({ where: { ...approved, status: "BLOCKED" } }),
    prisma.task.count({
      where: { ...approved, status: { not: "COMPLETED" }, dueDate: { gte: new Date(), lte: soon } },
    }),
    prisma.task.count({ where: { approvalState: "PENDING_APPROVAL" } }),
    prisma.task.count({ where: { ...approved, status: "WAITING_FOR_REVIEW" } }),
  ]);

  return {
    totalEmployees,
    activeEmployees,
    employeesWithoutActiveTask,
    activeProjects,
    projectsAtRisk,
    tasksInProgress,
    completedToday,
    overdue,
    blocked,
    upcomingDeadlines,
    pendingApproval,
    awaitingReview,
  };
}

export type TeamRow = {
  employeeId: string;
  name: string;
  email: string;
  title: string;
  currentProject: string | null;
  currentTask: string | null;
  taskStatus: string;
  progress: number;
  lastUpdateAt: Date | null;
  blocker: string | null;
  openTasks: number;
  overdueTasks: number;
};

const ACTIVE_FIRST = ["BLOCKED", "IN_PROGRESS", "STARTED", "WAITING_FOR_REVIEW", "NOT_STARTED"];

/**
 * "Currently working on" is derived from task state and the employee's own
 * updates — not from any machine monitoring.
 */
export async function teamActivity(employeeIds?: string[]): Promise<TeamRow[]> {
  const employees = await prisma.employee.findMany({
    where: employeeIds ? { id: { in: employeeIds } } : undefined,
    include: {
      user: { select: { name: true, email: true } },
      assignedTasks: {
        where: { status: { not: "COMPLETED" }, approvalState: "APPROVED" },
        include: {
          project: { select: { name: true } },
          updates: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
        },
        orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  return employees.map((employee) => {
    const tasks = [...employee.assignedTasks].sort(
      (a, b) => ACTIVE_FIRST.indexOf(a.status) - ACTIVE_FIRST.indexOf(b.status),
    );
    const current = tasks[0];
    const lastUpdateAt = employee.assignedTasks
      .flatMap((t) => t.updates.map((u) => u.createdAt))
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    return {
      employeeId: employee.id,
      name: employee.user.name,
      email: employee.user.email,
      title: employee.title,
      currentProject: current?.project?.name ?? null,
      currentTask: current?.title ?? null,
      taskStatus: current?.status ?? "NOTHING_ASSIGNED",
      progress: current?.progress ?? 0,
      lastUpdateAt,
      blocker: current?.status === "BLOCKED" ? (current.blockerNote ?? "No detail given") : null,
      openTasks: employee.assignedTasks.length,
      overdueTasks: employee.assignedTasks.filter(
        (t) => t.dueDate && t.dueDate < new Date(),
      ).length,
    };
  });
}

export type ProjectRow = {
  id: string;
  name: string;
  status: string;
  progress: number;
  openTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  lead: string | null;
  dueDate: Date | null;
  health: "ON_TRACK" | "AT_RISK" | "DELAYED" | "BLOCKED" | "DONE";
};

export async function projectHealth(): Promise<ProjectRow[]> {
  const projects = await prisma.project.findMany({
    where: { status: { notIn: ["ARCHIVED"] } },
    include: {
      lead: { select: { user: { select: { name: true } } } },
      tasks: { where: { approvalState: "APPROVED" }, select: { status: true, progress: true, dueDate: true } },
    },
    orderBy: { name: "asc" },
  });

  return projects.map((project) => {
    const tasks = project.tasks;
    const open = tasks.filter((t) => t.status !== "COMPLETED");
    const overdue = open.filter((t) => t.dueDate && t.dueDate < new Date()).length;
    const blocked = open.filter((t) => t.status === "BLOCKED").length;
    const progress = tasks.length
      ? Math.round(tasks.reduce((sum, t) => sum + (t.status === "COMPLETED" ? 100 : t.progress), 0) / tasks.length)
      : 0;

    let health: ProjectRow["health"] = "ON_TRACK";
    if (project.status === "COMPLETED") health = "DONE";
    else if (blocked > 0 || project.status === "BLOCKED") health = "BLOCKED";
    else if (overdue > 1) health = "DELAYED";
    else if (overdue === 1 || (project.dueDate && project.dueDate < addDays(new Date(), 3))) health = "AT_RISK";

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      progress,
      openTasks: open.length,
      overdueTasks: overdue,
      blockedTasks: blocked,
      lead: project.lead?.user.name ?? null,
      dueDate: project.dueDate,
      health,
    };
  });
}

export async function recentActivity(limit = 25) {
  return prisma.activityEvent.findMany({ orderBy: { id: "desc" }, take: limit });
}

export async function openRisks() {
  const [blockedTasks, dueSoon, awaitingReview, openProblems] = await Promise.all([
    prisma.task.findMany({
      where: { status: "BLOCKED", kind: "TEAM" },
      include: { assignee: { select: { user: { select: { name: true } } } }, project: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.task.findMany({
      where: {
        status: { not: "COMPLETED" },
        kind: "TEAM",
        dueDate: { gte: new Date(), lte: addDays(new Date(), 3) },
      },
      include: { assignee: { select: { user: { select: { name: true } } } }, project: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 20,
    }),
    prisma.task.findMany({
      where: { status: "WAITING_FOR_REVIEW" },
      include: { assignee: { select: { user: { select: { name: true } } } } },
      take: 20,
    }),
    prisma.problem.findMany({
      where: { status: { not: "RESOLVED" } },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: 10,
    }),
  ]);
  return { blockedTasks, dueSoon, awaitingReview, openProblems };
}
