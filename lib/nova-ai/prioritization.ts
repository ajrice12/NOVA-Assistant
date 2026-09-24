import type { MessagePriority, UnifiedMessage } from "./types.ts";

export interface PriorityResult { score: number; priority: MessagePriority; reasons: string[] }

const RECRUITING = /recruit|interview|application|hiring|candidate/i;
const DEADLINE = /deadline|due\s+(today|tomorrow|by)|by\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)|expires?/i;
const QUESTION = /\?|please (reply|respond|confirm|send|share)|let me know|are you available/i;
const AUTOMATED = /no-?reply|newsletter|unsubscribe|digest|notification/i;
const SECURITY = /security alert|unusual activity|password reset|payment failed|fraud/i;

export function scoreMessage(message: Pick<UnifiedMessage, "subject" | "preview" | "body" | "sender" | "unread" | "timestamp">, now = new Date()): PriorityResult {
  const text = `${message.subject ?? ""} ${message.preview} ${message.body ?? ""} ${message.sender.address ?? ""}`;
  let score = 20;
  const reasons: string[] = [];
  if (SECURITY.test(text)) { score += 60; reasons.push("Potential security or financial issue"); }
  if (RECRUITING.test(text)) { score += 24; reasons.push("Recruiting communication"); }
  if (QUESTION.test(text)) { score += 22; reasons.push("Contains a direct question or request"); }
  if (DEADLINE.test(text)) { score += 24; reasons.push("Mentions a deadline or time constraint"); }
  if (message.unread) { score += 6; reasons.push("Unread"); }
  const ageHours = Math.max(0, (now.getTime() - new Date(message.timestamp).getTime()) / 3_600_000);
  if (ageHours <= 24) { score += 6; reasons.push("Received recently"); }
  if (AUTOMATED.test(text)) { score -= 35; reasons.push("Appears automated or promotional"); }
  score = Math.max(0, Math.min(100, score));
  return { score, priority: score >= 90 ? "critical" : score >= 70 ? "high" : score >= 40 ? "normal" : "low", reasons };
}
