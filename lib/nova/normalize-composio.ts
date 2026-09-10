import type { RemoteKnowledgeItem, SupportedCloudProvider } from "./persistence";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    const record = asRecord(value);
    if (record && typeof record.content === "string" && record.content.trim()) return record.content.trim();
  }
  return "";
}

function extractRecords(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.map(asRecord).filter((item): item is Record<string, unknown> => Boolean(item));
  const record = asRecord(value);
  if (!record) return [];
  for (const key of ["messages", "items", "value", "results", "elements", "data"]) {
    if (Array.isArray(record[key])) return extractRecords(record[key]);
  }
  return [record];
}

function senderName(record: Record<string, unknown>) {
  const sender = asRecord(record.sender) ?? asRecord(record.from);
  const emailAddress = sender ? asRecord(sender.emailAddress) : null;
  return stringValue(emailAddress?.name, emailAddress?.address, sender?.name, sender?.email, record.author);
}

function occurredAt(record: Record<string, unknown>) {
  const candidate = stringValue(
    record.receivedDateTime,
    record.sentDateTime,
    record.createdAt,
    record.created_at,
    record.lastModifiedDateTime,
    record.internalDate,
  );
  const numeric = Number(candidate);
  const parsed = Number.isFinite(numeric) && numeric > 0
    ? numeric < 10_000_000_000 ? numeric * 1000 : numeric
    : Date.parse(candidate);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

export function normalizeComposioResult(provider: SupportedCloudProvider, payload: unknown): RemoteKnowledgeItem[] {
  return extractRecords(payload).slice(0, 50).map((record, index) => {
    const person = senderName(record);
    const name = stringValue(record.name, record.localizedName, record.headline);
    const title = stringValue(record.subject, record.title, name, person ? `Message from ${person}` : "Imported item");
    const content = stringValue(
      record.bodyPreview,
      record.snippet,
      asRecord(record.body)?.content,
      record.description,
      record.text,
      record.headline,
      title,
    );
    const externalId = stringValue(
      record.id,
      record.messageId,
      record.message_id,
      record.entityUrn,
      record.urn,
      `${provider}:${occurredAt(record)}:${index}`,
    );
    return {
      externalId,
      title: person && !title.toLowerCase().includes(person.toLowerCase()) ? `${title} — ${person}` : title,
      content,
      occurredAt: occurredAt(record),
      canonicalUrl: stringValue(record.webLink, record.permalink, record.url) || null,
    };
  });
}
