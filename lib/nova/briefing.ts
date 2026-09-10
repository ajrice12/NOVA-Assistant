import type { DailyBriefing, NovaAlert, NormalizedEvent } from "./domain.ts";

export function compileBriefing(events: NormalizedEvent[], alerts: NovaAlert[], now = new Date()): DailyBriefing {
  const nextDay = now.getTime() + 24 * 3_600_000;
  const upcoming = events
    .filter((event) => {
      const time = new Date(event.startsAt ?? event.dueAt ?? event.occurredAt).getTime();
      return time >= now.getTime() && time <= nextDay;
    })
    .sort((a, b) => new Date(a.startsAt ?? a.dueAt ?? a.occurredAt).getTime() - new Date(b.startsAt ?? b.dueAt ?? b.occurredAt).getTime());
  const upcomingIds = new Set(upcoming.map((event) => event.id));
  const informational = events.filter((event) => !upcomingIds.has(event.id)).slice(0, 8);
  const urgent = alerts.filter((alert) => alert.status === "open" && (alert.severity === "critical" || alert.severity === "urgent"));
  const dueSoon = alerts.filter((alert) => alert.kind === "deadline" && alert.status === "open").length;
  const headline = urgent.length
    ? `${urgent.length} urgent ${urgent.length === 1 ? "item needs" : "items need"} attention.`
    : upcoming.length
      ? `${upcoming.length} ${upcoming.length === 1 ? "item is" : "items are"} coming up in the next 24 hours.`
      : "No urgent connected-account activity was detected.";

  return {
    generatedAt: now.toISOString(),
    headline,
    urgent,
    upcoming,
    informational,
    counts: { urgent: urgent.length, dueSoon, unreadSignals: events.filter((event) => event.metadata.unread === true).length },
  };
}
