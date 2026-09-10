import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { HttpError } from "@/lib/auth/session";

/** Cron endpoints are public URLs; they must prove they are the scheduler. */
export function assertCronAuth(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  const secret = env.cronSecret();
  if (token !== secret) throw new HttpError(401, "Bad cron credentials.");
}

/**
 * Runs a job at most once per runKey. A retried or duplicated cron delivery
 * finds the JobRun row and returns instead of emailing everyone twice.
 */
export async function runOnce<T>(jobKey: string, runKey: string, fn: () => Promise<T>) {
  try {
    await prisma.jobRun.create({ data: { jobKey, runKey } });
  } catch {
    return { skipped: true as const, reason: `${jobKey} already ran for ${runKey}` };
  }

  try {
    const detail = await fn();
    await prisma.jobRun.update({
      where: { jobKey_runKey: { jobKey, runKey } },
      data: { finishedAt: new Date(), ok: true, detail: detail as object },
    });
    return { skipped: false as const, detail };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.jobRun.update({
      where: { jobKey_runKey: { jobKey, runKey } },
      data: { finishedAt: new Date(), ok: false, detail: { error: message } },
    });
    throw error;
  }
}
