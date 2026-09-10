import type { MemoryRecord, NormalizedEvent } from "./domain.ts";

const STOP_WORDS = new Set(["the", "and", "for", "with", "that", "this", "from", "your", "have", "will", "into", "about", "when", "where"]);

export function tokenize(value: string) {
  return [...new Set((value.toLowerCase().match(/[a-z0-9][a-z0-9+.#-]{1,}/g) ?? []).filter((word) => !STOP_WORDS.has(word)))];
}

export function eventToMemory(event: NormalizedEvent): MemoryRecord {
  const content = `${event.title}\n${event.summary}`.trim();
  return {
    id: `memory:${event.id}`,
    userId: event.userId,
    sourceEventId: event.id,
    content,
    keywords: tokenize(`${content} ${event.labels.join(" ")}`).slice(0, 40),
    sensitivity: event.sensitivity,
    occurredAt: event.occurredAt,
  };
}

export function chunkText(text: string, targetWords = 180, overlapWords = 30) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const chunks: string[] = [];
  const step = Math.max(1, targetWords - overlapWords);
  for (let index = 0; index < words.length; index += step) {
    chunks.push(words.slice(index, index + targetWords).join(" "));
    if (index + targetWords >= words.length) break;
  }
  return chunks;
}

export function rankMemory(query: string, records: MemoryRecord[], limit = 8) {
  const terms = tokenize(query);
  const now = Date.now();
  return records
    .map((record) => {
      const matches = terms.filter((term) => record.keywords.includes(term)).length;
      const ageDays = Math.max(0, (now - new Date(record.occurredAt).getTime()) / 86_400_000);
      const recency = 1 / (1 + ageDays / 30);
      return { record, score: matches * 2 + recency };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
