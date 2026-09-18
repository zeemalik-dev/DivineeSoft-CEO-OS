import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { canManageProject } from "@/lib/auth/rbac";
import { createProjectSchema } from "@/lib/validation";
import { handler, ok, fail } from "@/lib/api";
import { audit, emitActivity } from "@/lib/audit";
import { addDays } from "@/lib/dates";

export const GET = handler(async () => {
  await requireUser();

  const projects = await prisma.project.findMany({
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
  });

  const enriched = projects.map((project) => {
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
      startedAt: project.startedAt,
      dueDate: project.dueDate,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
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

  return ok({ projects: enriched });
});

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  if (!canManageProject(user)) {
    return fail(403, "You need CEO or Manager permissions to create projects.");
  }

  const input = createProjectSchema.parse(await req.json());

  const existing = await prisma.project.findUnique({
    where: { name: input.name },
    select: { id: true },
  });
  if (existing) {
    return fail(409, "A project with this name already exists.");
  }

  let baseSlug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!baseSlug) baseSlug = `project-${Date.now()}`;
  let slug = baseSlug;
  let counter = 1;
  while (await prisma.project.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${baseSlug}-${counter++}`;
  }

  const project = await prisma.project.create({
    data: {
      name: input.name,
      slug,
      description: input.description ?? null,
      platforms: input.platforms,
      status: input.status,
      healthNote: input.healthNote ?? null,
      leadId: input.leadId ?? null,
      managerId: input.managerId ?? null,
      startedAt: input.startedAt ?? new Date(),
      dueDate: input.dueDate ?? null,
      ...(input.memberIds.length
        ? {
            members: {
              createMany: {
                data: input.memberIds.map((employeeId) => ({
                  employeeId,
                  roleOnProject: "Contributor",
                })),
                skipDuplicates: true,
              },
            },
          }
        : {}),
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

  await audit({ actorId: user.id, action: "project.create", entityType: "Project", entityId: project.id });
  await emitActivity({
    type: "project.created",
    actorName: user.name,
    summary: `${user.name} created project “${project.name}”`,
    entityType: "Project",
    entityId: project.id,
  });

  return ok({ project }, 201);
});

