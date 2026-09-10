import { requireUser } from "@/lib/auth/session";
import { handler, ok } from "@/lib/api";
import { confirmAction, rejectAction } from "@/lib/ai/agent";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({ decision: z.enum(["CONFIRM", "REJECT"]) });

export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  if (user.role !== "CEO") return new Response(JSON.stringify({ error: "Only the CEO can confirm assistant actions." }), {
    status: 403,
    headers: { "content-type": "application/json" },
  });
  const { id } = await ctx.params;
  const { decision } = schema.parse(await req.json());

  if (decision === "REJECT") {
    await rejectAction(user, id);
    return ok({ status: "REJECTED" });
  }
  const outcome = await confirmAction(user, id);
  return ok({ status: outcome.kind === "ok" ? "CONFIRMED" : "FAILED", result: outcome.payload });
});
