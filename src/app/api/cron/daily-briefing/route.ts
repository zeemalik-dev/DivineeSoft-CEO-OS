import { handler, ok } from "@/lib/api";
import { assertCronAuth, runOnce } from "@/server/jobs/runner";
import { runDailyBriefing } from "@/server/jobs/dailyBriefing";
import { localDateKey } from "@/lib/dates";

export const runtime = "nodejs";
export const maxDuration = 300;

export const GET = handler(async (req: Request) => {
  assertCronAuth(req);
  const result = await runOnce("daily-briefing", localDateKey(), runDailyBriefing);
  return ok(result);
});

export const POST = GET;
