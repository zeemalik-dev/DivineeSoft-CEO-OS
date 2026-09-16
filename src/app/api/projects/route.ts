import { prisma } from "@/lib/db";
import { requireUser, requireCeo } from "@/lib/auth/session";
import { handler, ok } from "@/lib/api";
import { projectHealth } from "@/server/dashboard";
import { audit } from "@/lib/audit";
import { z } from "zod";



export const GET = handler(async () => {
  await requireUser();
  return ok({ projects: await projectHealth() });
});

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  platforms: z.array(z.string()).default([]),
  leadId: z.string().cuid().nullish(),
  managerId: z.string().cuid().nullish(),
  dueDate: z.coerce.date().nullish(),
});

export const POST = handler(async (req: Request) => {
  const user = await requireCeo();
  const input = schema.parse(await req.json());
  const project = await prisma.project.create({
    data: {
      name: input.name,
      slug: input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      description: input.description ?? null,
      platforms: input.platforms,
      leadId: input.leadId ?? null,
      managerId: input.managerId ?? null,
      dueDate: input.dueDate ?? null,
      startedAt: new Date(),
    },
  });
  await audit({ actorId: user.id, action: "project.create", entityType: "Project", entityId: project.id });
  return ok({ project }, 201);
});
