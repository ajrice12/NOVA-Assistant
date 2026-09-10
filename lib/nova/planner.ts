import type { NovaAlert, PlannerItem } from "./domain.ts";

export interface PlannerConflict {
  id: string;
  first: PlannerItem;
  second: PlannerItem;
  overlapMinutes: number;
}

export function detectPlannerConflicts(items: PlannerItem[]): PlannerConflict[] {
  const active = items
    .filter((item) => item.status !== "cancelled" && item.status !== "complete")
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const conflicts: PlannerConflict[] = [];

  for (let left = 0; left < active.length; left += 1) {
    for (let right = left + 1; right < active.length; right += 1) {
      const first = active[left];
      const second = active[right];
      const overlap = Math.min(new Date(first.endsAt).getTime(), new Date(second.endsAt).getTime())
        - Math.max(new Date(first.startsAt).getTime(), new Date(second.startsAt).getTime());
      if (overlap <= 0) {
        if (new Date(second.startsAt).getTime() >= new Date(first.endsAt).getTime()) break;
        continue;
      }
      conflicts.push({ id: `conflict:${first.id}:${second.id}`, first, second, overlapMinutes: Math.round(overlap / 60_000) });
    }
  }

  return conflicts;
}

export function conflictsToAlerts(conflicts: PlannerConflict[], now = new Date()): NovaAlert[] {
  return conflicts.map((conflict) => ({
    id: `alert-${conflict.id}`,
    userId: conflict.first.userId,
    eventId: conflict.first.eventId ?? conflict.first.id,
    severity: "urgent",
    kind: "conflict",
    title: "Schedule conflict detected",
    body: `${conflict.first.title} overlaps ${conflict.second.title} by ${conflict.overlapMinutes} minutes.`,
    dueAt: conflict.first.startsAt,
    dedupeKey: conflict.id,
    status: "open",
    createdAt: now.toISOString(),
  }));
}

export function sortPlanner(items: PlannerItem[]) {
  return [...items].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}
