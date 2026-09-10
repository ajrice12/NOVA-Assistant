import type { AlertSeverity, NovaAlert, NormalizedEvent } from "./domain.ts";

const HOUR = 3_600_000;

function stableId(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(36);
}

function deadlineSeverity(hours: number): AlertSeverity {
  if (hours <= 4) return "critical";
  if (hours <= 24) return "urgent";
  if (hours <= 72) return "attention";
  return "info";
}

export function deriveAlerts(events: NormalizedEvent[], now = new Date()): NovaAlert[] {
  const alerts: NovaAlert[] = [];

  for (const event of events) {
    if (event.dueAt) {
      const hours = (new Date(event.dueAt).getTime() - now.getTime()) / HOUR;
      if (Number.isFinite(hours) && hours >= 0 && hours <= 168) {
        const severity = deadlineSeverity(hours);
        const dedupeKey = `deadline:${event.source.provider}:${event.source.externalId}:${event.dueAt}`;
        alerts.push({
          id: `alert-${stableId(dedupeKey)}`,
          userId: event.userId,
          eventId: event.id,
          severity,
          kind: "deadline",
          title: hours <= 24 ? `Deadline approaching: ${event.title}` : `Upcoming deadline: ${event.title}`,
          body: `${event.summary || event.title} Due ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.dueAt))}.`,
          dueAt: event.dueAt,
          dedupeKey,
          status: "open",
          createdAt: now.toISOString(),
        });
      }
    }

    const labels = new Set(event.labels.map((label) => label.toLowerCase()));
    if ((labels.has("urgent") || labels.has("priority")) && !event.dueAt) {
      const dedupeKey = `priority:${event.source.provider}:${event.source.externalId}`;
      alerts.push({
        id: `alert-${stableId(dedupeKey)}`,
        userId: event.userId,
        eventId: event.id,
        severity: "attention",
        kind: "priority",
        title: event.title,
        body: event.summary,
        dedupeKey,
        status: "open",
        createdAt: now.toISOString(),
      });
    }
  }

  return alerts.sort((a, b) => {
    const order: Record<AlertSeverity, number> = { critical: 4, urgent: 3, attention: 2, info: 1 };
    return order[b.severity] - order[a.severity] || (a.dueAt ?? "").localeCompare(b.dueAt ?? "");
  });
}

export function dedupeAlerts(alerts: NovaAlert[]) {
  return [...new Map(alerts.map((alert) => [alert.dedupeKey, alert])).values()];
}
