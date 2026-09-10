import { dedupeAlerts, deriveAlerts } from "./alerts.ts";
import { compileBriefing } from "./briefing.ts";
import type { NormalizedEvent, PlannerItem } from "./domain.ts";
import { eventToMemory } from "./memory.ts";
import { conflictsToAlerts, detectPlannerConflicts } from "./planner.ts";

export function processNovaContext(events: NormalizedEvent[], planner: PlannerItem[], now = new Date()) {
  const conflicts = detectPlannerConflicts(planner);
  const alerts = dedupeAlerts([...deriveAlerts(events, now), ...conflictsToAlerts(conflicts, now)]);
  const memory = events.filter((event) => event.sensitivity !== "restricted").map(eventToMemory);
  const briefing = compileBriefing(events, alerts, now);
  return { alerts, conflicts, memory, briefing };
}
