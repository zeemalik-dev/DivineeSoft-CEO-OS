import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { canManageProject, canDeleteProject } from "@/lib/auth/rbac";
import { updateProjectSchema } from "@/lib/validation";
import { handler, ok, fail } from "@/lib/api";
import { audit, emitActivity } from "@/lib/audit";
import { addDays } from "@/lib/dates";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, ctx: Ctx) => {
  await requireUser();
  const { id } = await ctx.params;

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
    return fail(404, "Project not found.");
  }

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

  return ok({
    project: {
      ...project,
      totalTasks: tasks.length,
      openTasks: openTasks.length,
      overdueTasks,
      blockedTasks,
      progress,
      health,
    },
  });
});

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const user = await requireUser();
  if (!canManageProject(user)) {
    return fail(403, "You need CEO or Manager permissions to edit projects.");
  }

  const { id } = await ctx.params;
  const before = await prisma.project.findUnique({
    where: { id },
    include: { members: true },
  });

  if (!before) {
    return fail(404, "Project not found.");
  }

  const input = updateProjectSchema.parse(await req.json());

  // Check unique name if name changed
  let slug = before.slug;
  if (input.name && input.name !== before.name) {
    const existing = await prisma.project.findUnique({
      where: { name: input.name },
      select: { id: true },
    });
    if (existing && existing.id !== id) {
      return fail(409, "Another project with this name already exists.");
    }
    let baseSlug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!baseSlug) baseSlug = `project-${Date.now()}`;
    slug = baseSlug;
    let counter = 1;
    while (true) {
      const match = await prisma.project.findUnique({ where: { slug }, select: { id: true } });
      if (!match || match.id === id) break;
      slug = `${baseSlug}-${counter++}`;
    }
  }

  // Handle member synchronization if memberIds provided
  if (input.memberIds !== undefined) {
    await prisma.projectMember.deleteMany({
      where: { projectId: id },
    });
    if (input.memberIds.length > 0) {
      await prisma.projectMember.createMany({
        data: input.memberIds.map((employeeId) => ({
          projectId: id,
          employeeId,
          roleOnProject: "Contributor",
        })),
        skipDuplicates: true,
      });
    }
  }

  const updated = await prisma.project.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name, slug } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.platforms !== undefined ? { platforms: input.platforms } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.healthNote !== undefined ? { healthNote: input.healthNote } : {}),
      ...(input.leadId !== undefined ? { leadId: input.leadId } : {}),
      ...(input.managerId !== undefined ? { managerId: input.managerId } : {}),
      ...(input.startedAt !== undefined ? { startedAt: input.startedAt } : {}),
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
    },
    include: {
      lead: { select: { id: true, title: true, user: { select: { id: true, name: true } } } },
      manager: { select: { id: true, title: true, user: { select: { id: true, name: true } } } },
      members: {
        include: {
          employee: { select: { id: true, title: true, user: { select: { id: true, name: true } } } },
        },
      },
    },
  });

  await audit({
    actorId: user.id,
    action: "project.update",
    entityType: "Project",
    entityId: id,
    metadata: { before: { name: before.name, status: before.status }, after: input },
  });

  await emitActivity({
    type: "project.updated",
    actorName: user.name,
    summary: `${user.name} updated project “${updated.name}”${input.status && input.status !== before.status ? ` (Status: ${input.status})` : ""}`,
    entityType: "Project",
    entityId: id,
  });

  return ok({ project: updated });
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();

  // ONLY CEO can delete projects
  if (!canDeleteProject(user)) {
    return fail(403, "Only the CEO can delete projects. Managers can archive or edit them.");
  }

  const { id } = await ctx.params;
  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!project) {
    return fail(404, "Project not found.");
  }

  // Unlink associated tasks
  await prisma.task.updateMany({
    where: { projectId: id },
    data: { projectId: null },
  });

  // Delete project members and project
  await prisma.projectMember.deleteMany({ where: { projectId: id } });
  await prisma.project.delete({ where: { id } });

  await audit({ actorId: user.id, action: "project.delete", entityType: "Project", entityId: id });
  await emitActivity({
    type: "project.deleted",
    actorName: user.name,
    summary: `${user.name} deleted project “${project.name}”`,
    entityType: "Project",
    entityId: id,
  });

  return ok({ message: `Project “${project.name}” deleted successfully.`, id });
});
