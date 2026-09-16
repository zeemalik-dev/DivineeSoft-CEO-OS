import { handler, ok } from "@/lib/api";
import { assertCronAuth, runOnce } from "@/server/jobs/runner";
import { runOverdueSweep } from "@/server/jobs/reminders";
import { localDateKey } from "@/lib/dates";


export const maxDuration = 120;

export const GET = handler(async (req: Request) => {
  assertCronAuth(req);
  const result = await runOnce("overdue-sweep", localDateKey(), runOverdueSweep);
  return ok(result);
});

export const POST = GET;
