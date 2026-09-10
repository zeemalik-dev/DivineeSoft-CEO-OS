import { prisma } from "@/lib/db";
import { audit, emitActivity } from "@/lib/audit";
import type { SessionUser } from "@/lib/auth/session";
import { HttpError } from "@/lib/auth/session";
import { canEditTask, canAssignToEmployee } from "@/lib/auth/rbac";
import type { Prisma, TaskStatus } from "@prisma/client";

export const taskInclude = {
  project: { select: { id: true, name: true } },
  assignee: { select: { id: true, user: { select: { id: true, name: true, email: true } } } },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.TaskInclude;

/** Progress implied by a status change, so the two never drift apart. */
function progressFor(status: TaskStatus, current: number): number {
  if (status === "COMPLETED") return 100;
  if (status === "NOT_STARTED") return 0;
  if (status === "STARTED" && current === 0) return 5;
  return current;
}

export async function loadTaskForEdit(user: SessionUser, taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: taskInclude });
  if (!task) throw new HttpError(404, "That task no longer exists.");
  if (task.kind === "CEO_PERSONAL" && user.role !== "CEO") {
    throw new HttpError(404, "That task no longer exists.");
  }
  const allowed = await canEditTask(user, {
    assigneeId: task.assigneeId,
    createdById: task.createdById,
    kind: task.kind,
  });
  if (!allowed) throw new HttpError(403, "You can only change tasks you own or manage.");
  return task;
}

type ApplyInput = {
  status?: TaskStatus;
  progress?: number;
  priority?: Prisma.TaskUpdateInput["priority"];
  title?: string;
  description?: string | null;
  dueDate?: Date | null;
  scheduledFor?: Date | null;
  assigneeId?: string | null;
  projectId?: string | null;
  blockerNote?: string | null;
  comment?: string;
};

export async function applyTaskChange(user: SessionUser, taskId: string, input: ApplyInput) {
  const before = await loadTaskForEdit(user, taskId);
  if (input.assigneeId !== undefined && !(await canAssignToEmployee(user, input.assigneeId))) {
    throw new HttpError(403, "You can only assign tasks within your reporting scope.");
  }

  const data: Prisma.TaskUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.dueDate !== undefined) data.dueDate = input.dueDate;
  if (input.scheduledFor !== undefined) data.scheduledFor = input.scheduledFor;
  if (input.projectId !== undefined) {
    data.project = input.projectId ? { connect: { id: input.projectId } } : { disconnect: true };
  }
  if (input.assigneeId !== undefined) {
    data.assignee = input.assigneeId ? { connect: { id: input.assigneeId } } : { disconnect: true };
  }
  if (input.blockerNote !== undefined) data.blockerNote = input.blockerNote;

  let nextProgress = input.progress ?? before.progress;
  if (input.status) {
    nextProgress = progressFor(input.status, input.progress ?? before.progress);
    data.status = input.status;
    if (input.status === "STARTED" && !before.startedAt) data.startedAt = new Date();
    if (input.status === "COMPLETED") {
      data.completedAt = new Date();
      data.blockerNote = null;
    }
    if (before.status === "COMPLETED" && input.status !== "COMPLETED") data.completedAt = null;
  }
  data.progress = Math.max(0, Math.min(100, nextProgress));

  const task = await prisma.task.update({ where: { id: taskId }, data, include: taskInclude });

  const updates: Prisma.TaskUpdateCreateManyInput[] = [];
  if (input.status && input.status !== before.status) {
    updates.push({
      taskId,
      authorId: user.id,
      type: input.status === "BLOCKED" ? "BLOCKER" : "STATUS_CHANGE",
      fromStatus: before.status,
      toStatus: input.status,
      message: input.status === "BLOCKED" ? (input.blockerNote ?? null) : null,
    });
  }
  if (input.progress !== undefined && input.progress !== before.progress) {
    updates.push({ taskId, authorId: user.id, type: "PROGRESS", progress: task.progress });
  }
  if (input.assigneeId !== undefined && input.assigneeId !== before.assigneeId) {
    updates.push({
      taskId,
      authorId: user.id,
      type: "ASSIGNMENT",
      message: task.assignee?.user.name ?? "Unassigned",
    });
  }
  if (input.comment) {
    updates.push({ taskId, authorId: user.id, type: "COMMENT", message: input.comment });
  }
  if (updates.length) await prisma.taskUpdate.createMany({ data: updates });

  await audit({
    actorId: user.id,
    action: "task.update",
    entityType: "Task",
    entityId: taskId,
    metadata: { from: { status: before.status, progress: before.progress }, to: input } as Prisma.InputJsonValue,
  });

  if (input.status || input.progress !== undefined || input.comment) {
    await emitActivity({
      type: input.status ? `task.${input.status.toLowerCase()}` : "task.progress",
      actorName: user.name,
      summary: describeChange(user.name, task.title, before.status, input),
      entityType: "Task",
      entityId: taskId,
      payload: { status: task.status, progress: task.progress } as Prisma.InputJsonValue,
    });
  }

  return task;
}

function describeChange(actor: string, title: string, from: TaskStatus, input: ApplyInput) {
  if (input.status === "BLOCKED") return `${actor} is blocked on “${title}”`;
  if (input.status === "COMPLETED") return `${actor} completed “${title}”`;
  if (input.status === "STARTED") return `${actor} started “${title}”`;
  if (input.status === "WAITING_FOR_REVIEW") return `${actor} sent “${title}” for review`;
  if (input.status) return `${actor} moved “${title}” from ${from} to ${input.status}`;
  if (input.progress !== undefined) return `${actor} updated “${title}” to ${input.progress}%`;
  return `${actor} commented on “${title}”`;
}

/**
 * A task is overdue when it has a past due date and is not finished.
 * Built fresh on each call — a module-level constant would freeze "now"
 * at process start and quietly go stale on a long-running server.
 */
export function overdueWhere(): Prisma.TaskWhereInput {
  return { dueDate: { lt: new Date() }, status: { not: "COMPLETED" }, approvalState: "APPROVED" };
}

export function isOverdue(task: { dueDate: Date | null; status: TaskStatus }) {
  return !!task.dueDate && task.status !== "COMPLETED" && task.dueDate < new Date();
}
