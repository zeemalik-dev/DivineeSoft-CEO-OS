import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";

/**
 * Everyone an employee is allowed to see. CEO sees all; a manager sees their
 * own reporting line (recursively); an employee sees only themselves.
 */
export async function visibleEmployeeIds(user: SessionUser): Promise<string[] | "ALL"> {
  if (user.role === "CEO") return "ALL";
  if (!user.employeeId) return [];
  if (user.role === "EMPLOYEE") return [user.employeeId];

  const all = await prisma.employee.findMany({ select: { id: true, reportsToId: true } });
  const childrenOf = new Map<string, string[]>();
  for (const e of all) {
    if (!e.reportsToId) continue;
    childrenOf.set(e.reportsToId, [...(childrenOf.get(e.reportsToId) ?? []), e.id]);
  }
  const seen = new Set<string>([user.employeeId]);
  const queue = [user.employeeId];
  while (queue.length) {
    const id = queue.shift()!;
    for (const child of childrenOf.get(id) ?? []) {
      if (!seen.has(child)) {
        seen.add(child);
        queue.push(child);
      }
    }
  }
  return [...seen];
}

export async function canSeeEmployee(user: SessionUser, employeeId: string): Promise<boolean> {
  const scope = await visibleEmployeeIds(user);
  return scope === "ALL" || scope.includes(employeeId);
}

export async function canAssignToEmployee(user: SessionUser, employeeId: string | null): Promise<boolean> {
  if (!employeeId) return user.role === "CEO" || user.role === "MANAGER";
  if (user.role === "CEO") return true;
  if (!user.employeeId) return false;
  return canSeeEmployee(user, employeeId);
}

/** Assignee, the task's creator, anyone above the assignee, and the CEO may edit a task. */
export async function canEditTask(
  user: SessionUser,
  task: { assigneeId: string | null; createdById: string; kind: string },
): Promise<boolean> {
  if (user.role === "CEO") return true;
  if (task.kind === "CEO_PERSONAL") return false;
  if (task.createdById === user.id) return true;
  if (task.assigneeId && task.assigneeId === user.employeeId) return true;
  if (task.assigneeId) return canSeeEmployee(user, task.assigneeId);
  return false;
}

export function isManagerOrAbove(user: SessionUser) {
  return user.role === "CEO" || user.role === "MANAGER";
}

export function canManageProject(user: SessionUser) {
  return user.role === "CEO" || user.role === "MANAGER";
}

export function canDeleteProject(user: SessionUser) {
  return user.role === "CEO";
}

