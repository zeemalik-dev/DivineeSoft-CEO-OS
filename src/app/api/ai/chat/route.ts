import { requireUser } from "@/lib/auth/session";
import { handler, ok } from "@/lib/api";
import { rateLimit } from "@/lib/ratelimit";
import { runAssistant } from "@/lib/ai/agent";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  message: z.string().min(1).max(4000),
  conversationId: z.string().cuid().nullish(),
});

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  rateLimit(`ai:${user.id}`, 30, 5 * 60_000);
  const input = schema.parse(await req.json());
  const result = await runAssistant({
    user,
    conversationId: input.conversationId ?? null,
    message: input.message,
  });
  return ok(result);
});
