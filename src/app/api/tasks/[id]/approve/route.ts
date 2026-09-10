import { requireCeo } from "@/lib/auth/session";
import { handler, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { audit, emitActivity } from "@/lib/audit";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({ decision: z.enum(["APPROVE", "REJECT"]) });

export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireCeo();
  const { id } = await ctx.params;
  const { decision } = schema.parse(await req.json());

  const task = await prisma.task.update({
    where: { id },
    data: {
      approvalState: decision === "APPROVE" ? "APPROVED" : "REJECTED",
      approvedById: user.id,
      approvedAt: new Date(),
    },
    include: { assignee: { select: { user: { select: { name: true } } } } },
  });

  await audit({ actorId: user.id, action: `task.${decision.toLowerCase()}`, entityType: "Task", entityId: id });
  await emitActivity({
    type: "task.approval",
    actorName: user.name,
    summary: `${user.name} ${decision === "APPROVE" ? "approved" : "rejected"} the suggested task “${task.title}”`,
    entityType: "Task",
    entityId: id,
  });
  return ok({ task });
});
