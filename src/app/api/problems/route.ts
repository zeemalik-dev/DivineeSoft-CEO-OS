import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { problemSchema } from "@/lib/validation";
import { handler, ok } from "@/lib/api";
import { audit, emitActivity } from "@/lib/audit";

export const runtime = "nodejs";

export const GET = handler(async () => {
  await requireUser();
  const problems = await prisma.problem.findMany({
    include: { solutions: true, owner: { select: { name: true } }, reportedBy: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { severity: "desc" }, { createdAt: "desc" }],
    take: 100,
  });
  return ok({ problems });
});

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const input = problemSchema.parse(await req.json());
  const problem = await prisma.problem.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      category: input.category ?? null,
      severity: input.severity,
      ownerId: input.ownerId ?? null,
      reportedById: user.id,
    },
  });
  await audit({ actorId: user.id, action: "problem.create", entityType: "Problem", entityId: problem.id });
  await emitActivity({
    type: "problem.created",
    actorName: user.name,
    summary: `${user.name} logged a ${problem.severity.toLowerCase()} problem: ${problem.title}`,
    entityType: "Problem",
    entityId: problem.id,
  });
  return ok({ problem }, 201);
});
