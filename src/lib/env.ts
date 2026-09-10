// Central place for configuration. Nothing secret is ever inlined in source.
function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  databaseUrl: () => required("DATABASE_URL"),
  authSecret: () => required("AUTH_SECRET"),
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS ?? 12),
  companyName: process.env.COMPANY_NAME ?? "DivineeSoft Technologies",
  companyTimezone: process.env.COMPANY_TIMEZONE ?? "Asia/Karachi",
  briefingHour: Number(process.env.DAILY_BRIEFING_HOUR ?? 9),
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  resendKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "DivineeSoft Ops <ops@divineesoft.com>",
  emailRedirectAllTo: process.env.EMAIL_REDIRECT_ALL_TO ?? "",
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicWorkspaceId: process.env.ANTHROPIC_WORKSPACE_ID ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5",
  cronSecret: () => required("CRON_SECRET"),
  seedPassword: process.env.SEED_DEFAULT_PASSWORD ?? "ChangeMe!2026",
};
