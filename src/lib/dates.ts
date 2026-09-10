import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";
import { env } from "@/lib/env";

export const TZ = () => env.companyTimezone;

export function nowLocal(): Date {
  return toZonedTime(new Date(), TZ());
}

/** yyyy-MM-dd in company time — the key used for daily idempotency. */
export function localDateKey(date = new Date()): string {
  return formatInTimeZone(date, TZ(), "yyyy-MM-dd");
}

/** UTC instants bounding "today" in company time. */
export function localDayBounds(date = new Date()) {
  const key = localDateKey(date);
  const start = fromZonedTime(`${key} 00:00:00`, TZ());
  const end = fromZonedTime(`${key} 23:59:59.999`, TZ());
  return { start, end, key };
}

export function localDateOnly(date = new Date()): Date {
  return new Date(`${localDateKey(date)}T00:00:00.000Z`);
}

export function fmt(date: Date | null | undefined, pattern = "d MMM, HH:mm"): string {
  if (!date) return "—";
  return formatInTimeZone(date, TZ(), pattern);
}

export function relative(date: Date | null | undefined): string {
  if (!date) return "no updates yet";
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}
