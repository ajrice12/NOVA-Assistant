const STOP_WORDS = new Set([
  "about", "after", "again", "also", "because", "been", "before", "being", "between",
  "could", "does", "from", "have", "into", "just", "more", "most", "only", "other",
  "over", "same", "should", "some", "such", "than", "that", "their", "there", "these",
  "they", "this", "those", "through", "under", "very", "what", "when", "where", "which",
  "while", "with", "would", "your",
]);

export type CompactSummary = {
  summary: string;
  keyPoints: string[];
  tags: string[];
  strategy: "extractive";
  modelCalls: 0;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function sentences(value: string) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return [];
  return (normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [normalized])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  const slice = value.slice(0, Math.max(0, max - 1));
  const boundary = slice.lastIndexOf(" ");
  return `${slice.slice(0, boundary > max * 0.6 ? boundary : slice.length).trim()}…`;
}

export function summarizeWithoutModel(content: string): CompactSummary {
  const parts = sentences(content);
  const summary = truncate(parts.slice(0, 2).join(" ") || "Saved without a generated summary.", 360);
  const signal = /\b(due|deadline|need|must|please|decid|agreed|next|follow[- ]?up|\$|%|\d{1,2}[:/]\d{1,2})\b/i;
  const keyPoints = [...parts.filter((part) => signal.test(part)), ...parts]
    .filter((part, index, all) => all.indexOf(part) === index)
    .slice(0, 4)
    .map((part) => truncate(part, 180));

  const frequencies = new Map<string, number>();
  for (const word of normalizeWhitespace(content).toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) ?? []) {
    if (STOP_WORDS.has(word)) continue;
    frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
  }
  const tags = [...frequencies]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 5)
    .map(([word]) => word);

  return { summary, keyPoints, tags, strategy: "extractive", modelCalls: 0 };
}

export function summarizeCollection(items: Array<{ title: string; summary: string; sourceType: string }>) {
  if (!items.length) return "Your knowledge library is empty. Capture a note or connect a source to begin.";
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.sourceType, (counts.get(item.sourceType) ?? 0) + 1);
  const mix = [...counts].map(([type, count]) => `${count} ${type}${count === 1 ? "" : "s"}`).join(", ");
  return `${items.length} saved items across ${mix}. The newest item is “${items[0].title}.”`;
}
