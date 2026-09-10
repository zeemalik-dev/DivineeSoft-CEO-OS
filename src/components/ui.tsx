import type { ReactNode } from "react";

const STATUS_TEXT: Record<string, string> = {
  NOT_STARTED: "Not started",
  STARTED: "Started",
  IN_PROGRESS: "In progress",
  WAITING_FOR_REVIEW: "Waiting for review",
  BLOCKED: "Blocked",
  COMPLETED: "Completed",
  NOTHING_ASSIGNED: "Nothing assigned",
  ON_TRACK: "On track",
  AT_RISK: "At risk",
  DELAYED: "Delayed",
  DONE: "Done",
  OPEN: "Open",
  INVESTIGATING: "Investigating",
  RESOLVED: "Resolved",
};

const STATUS_COLOR: Record<string, string> = {
  BLOCKED: "text-blocked",
  DELAYED: "text-blocked",
  OPEN: "text-blocked",
  AT_RISK: "text-risk",
  WAITING_FOR_REVIEW: "text-risk",
  INVESTIGATING: "text-risk",
  IN_PROGRESS: "text-ontrack",
  ON_TRACK: "text-ontrack",
  COMPLETED: "text-ontrack",
  DONE: "text-ontrack",
  RESOLVED: "text-ontrack",
};

export function statusLabel(status: string) {
  return STATUS_TEXT[status] ?? status.toLowerCase().replace(/_/g, " ");
}

export function Status({ value }: { value: string }) {
  return <span className={STATUS_COLOR[value] ?? "text-muted"}>{statusLabel(value)}</span>;
}

export function Progress({ value, tone = "ink" }: { value: number; tone?: "ink" | "blocked" | "risk" | "ontrack" }) {
  const fill = { ink: "bg-ink", blocked: "bg-blocked", risk: "bg-risk", ontrack: "bg-ontrack" }[tone];
  return (
    <span className="inline-flex h-[3px] w-full max-w-[120px] overflow-hidden bg-rule align-middle" aria-hidden>
      <span className={`h-full ${fill}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </span>
  );
}

export function Panel({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <header className="panel-head">
        <h2>{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-[18px] py-5 text-sm text-muted">{children}</p>;
}
