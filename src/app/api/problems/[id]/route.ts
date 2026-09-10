import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { handler, ok } from "@/lib/api";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  status: z.enum(["OPEN", "INVESTIGATING", "IN_PROGRESS", "RESOLVED"]).optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  ownerId: z.string().cuid().nullish(),
});

export const PATCH = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await ctx.params;
  const input = schema.parse(await req.json());
  const problem = await prisma.problem.update({
    where: { id },
    data: { ...input, resolvedAt: input.status === "RESOLVED" ? new Date() : null },
  });
  return ok({ problem });
});
