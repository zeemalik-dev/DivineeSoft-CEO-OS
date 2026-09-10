import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { visibleEmployeeIds, isManagerOrAbove, canAssignToEmployee } from "@/lib/auth/rbac";
import { createTaskSchema } from "@/lib/validation";
import { handler, ok, fail } from "@/lib/api";
import { audit, emitActivity } from "@/lib/audit";
import { taskInclude } from "@/server/tasks";
import { sendMail } from "@/lib/email/client";
import { taskAssignedEmail } from "@/lib/email/templates";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

export const GET = handler(async (req: Request) => {
  const user = await requireUser();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const projectId = url.searchParams.get("projectId");
  const assigneeId = url.searchParams.get("assigneeId");
  const kind = url.searchParams.get("kind") ?? "TEAM";
  const scope = await visibleEmployeeIds(user);

  const where: Prisma.TaskWhereInput = { kind: kind as Prisma.TaskWhereInput["kind"] };
  if (kind === "CEO_PERSONAL") {
    if (user.role !== "CEO") return fail(403, "That list belongs to the CEO.");
  } else if (scope !== "ALL") {
    where.OR = [{ assigneeId: { in: scope } }, { createdById: user.id }];
    where.approvalState = "APPROVED";
  }
  if (status === "OVERDUE") {
    where.dueDate = { lt: new Date() };
    where.status = { not: "COMPLETED" };
  } else if (status && status !== "ALL") {
    where.status = status as Prisma.TaskWhereInput["status"];
  }
  if (projectId) where.projectId = projectId;
  if (assigneeId) where.assigneeId = assigneeId;

  const tasks = await prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: [{ status: "asc" }, { priority: "desc" }, { dueDate: "asc" }],
    take: 200,
  });
  return ok({ tasks });
});

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const input = createTaskSchema.parse(await req.json());

  const isPersonal = input.kind === "CEO_PERSONAL";
  if (isPersonal && user.role !== "CEO") return fail(403, "Only the CEO has a personal task list here.");
  if (!isPersonal && !isManagerOrAbove(user) && input.assigneeId && input.assigneeId !== user.employeeId) {
    return fail(403, "You can only create tasks for yourself.");
  }
  if (!isPersonal && !(await canAssignToEmployee(user, input.assigneeId ?? user.employeeId ?? null))) {
    return fail(403, "You can only assign tasks within your reporting scope.");
  }

  const task = await prisma.task.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      kind: input.kind,
      priority: input.priority,
      dueDate: input.dueDate ?? null,
      scheduledFor: input.scheduledFor ?? null,
      estimatedMinutes: input.estimatedMinutes ?? null,
      projectId: input.projectId ?? null,
      assigneeId: isPersonal ? null : input.assigneeId ?? user.employeeId ?? null,
      createdById: user.id,
      tags: input.tags,
      isRecurring: input.isRecurring,
      recurrenceRule: input.recurrenceRule ?? null,
      approvalState: "APPROVED",
      approvedById: user.id,
      approvedAt: new Date(),
    },
    include: taskInclude,
  });

  await audit({ actorId: user.id, action: "task.create", entityType: "Task", entityId: task.id });
  await emitActivity({
    type: "task.created",
    actorName: user.name,
    summary: `${user.name} created “${task.title}”${task.assignee ? ` for ${task.assignee.user.name}` : ""}`,
    entityType: "Task",
    entityId: task.id,
  });

  if (task.assignee && task.assignee.user.id !== user.id) {
    const { subject, html } = taskAssignedEmail({
      name: task.assignee.user.name,
      assignedBy: user.name,
      task: { title: task.title, project: task.project?.name ?? null, dueDate: task.dueDate, priority: task.priority },
    });
    await sendMail({ to: task.assignee.user.email, subject, html, template: "task_assigned" });
    await prisma.notification.create({
      data: { userId: task.assignee.user.id, title: `New task: ${task.title}`, link: "/my-tasks" },
    });
  }

  return ok({ task }, 201);
});
