import { requireUser } from "@/lib/auth/session";
import { updateTaskSchema } from "@/lib/validation";
import { handler, ok } from "@/lib/api";
import { applyTaskChange, loadTaskForEdit } from "@/server/tasks";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const task = await loadTaskForEdit(user, id);
  const updates = await prisma.taskUpdate.findMany({
    where: { taskId: id },
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return ok({ task, updates });
});

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const input = updateTaskSchema.parse(await req.json());
  const task = await applyTaskChange(user, id, input);
  return ok({ task });
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await loadTaskForEdit(user, id);
  await prisma.task.delete({ where: { id } });
  return ok({ deleted: true });
});
