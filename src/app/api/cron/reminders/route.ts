import { handler, ok } from "@/lib/api";
import { assertCronAuth } from "@/server/jobs/runner";
import { runDueReminders, runDeadlineWarnings } from "@/server/jobs/reminders";


export const maxDuration = 120;

export const GET = handler(async (req: Request) => {
  assertCronAuth(req);
  const [reminders, warnings] = await Promise.all([runDueReminders(), runDeadlineWarnings()]);
  return ok({ reminders, warnings });
});

export const POST = GET;
