import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { handler, ok } from "@/lib/api";
import { z } from "zod";



const schema = z.object({
  status: z.enum(["CAPTURED", "EXPLORING", "APPROVED", "PARKED", "DISCARDED", "SHIPPED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  title: z.string().min(3).optional(),
  description: z.string().nullish(),
});

export const PATCH = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await ctx.params;
  const idea = await prisma.idea.update({ where: { id }, data: schema.parse(await req.json()) });
  return ok({ idea });
});
