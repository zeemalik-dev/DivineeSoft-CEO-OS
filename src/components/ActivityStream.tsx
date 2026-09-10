"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Event = { id: string; type: string; summary: string; createdAt: string };

/**
 * Subscribes to /api/stream. Each batch also refreshes the server-rendered
 * panels so the numbers above never disagree with the feed below.
 */
export function ActivityStream({ initial }: { initial: Event[] }) {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>(initial);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const since = initial[0]?.id ?? "0";
    const source = new EventSource(`/api/stream?since=${since}`);

    source.addEventListener("ready", () => setLive(true));
    source.addEventListener("activity", (event) => {
      const batch = JSON.parse((event as MessageEvent).data) as Event[];
      setEvents((current) => [...batch.reverse(), ...current].slice(0, 40));
      router.refresh();
    });
    source.onerror = () => setLive(false);

    return () => source.close();
  }, [initial, router]);

  return (
    <div>
      <ul className="divide-y divide-rule">
        {events.length === 0 && (
          <li className="px-[18px] py-5 text-sm text-muted">
            Nothing yet today. Activity appears the moment someone starts, updates or finishes a task.
          </li>
        )}
        {events.map((event) => (
          <li key={event.id} className="px-[18px] py-2.5 text-sm">
            <span className={event.type.includes("blocked") ? "text-blocked" : ""}>{event.summary}</span>
            <span className="ml-2 text-xs text-muted">
              {new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </li>
        ))}
      </ul>
      <p className="border-t border-rule px-[18px] py-2 text-xs text-muted">
        {live ? "Live" : "Reconnecting"}
      </p>
    </div>
  );
}
