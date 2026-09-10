import { Resend } from "resend";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

const resend = env.resendKey ? new Resend(env.resendKey) : null;

export type Mail = { to: string; subject: string; html: string; template: string };

/**
 * Sends through Resend when a key is configured. Without a key nothing leaves
 * the building — the message is stored in EmailLog so you can inspect it in dev.
 */
export async function sendMail({ to, subject, html, template }: Mail) {
  const recipient = env.emailRedirectAllTo || to;

  if (!resend) {
    await prisma.emailLog.create({
      data: { to: recipient, subject, template, status: "LOGGED_ONLY", html },
    });
    console.info(`[email:logged-only] ${recipient} — ${subject}`);
    return { delivered: false as const };
  }

  try {
    await resend.emails.send({ from: env.emailFrom, to: recipient, subject, html });
    await prisma.emailLog.create({ data: { to: recipient, subject, template, status: "SENT" } });
    return { delivered: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.emailLog.create({
      data: { to: recipient, subject, template, status: "FAILED", error: message, html },
    });
    console.error(`[email:failed] ${recipient} — ${message}`);
    return { delivered: false as const };
  }
}

export async function sendAll(mails: Mail[]) {
  const results = await Promise.allSettled(mails.map(sendMail));
  return {
    attempted: mails.length,
    delivered: results.filter((r) => r.status === "fulfilled" && r.value.delivered).length,
  };
}
