import { enrichMessages } from "./message-intelligence.ts";
import type { ChatContext } from "./types.ts";

export function answerFromContext(question: string, context: ChatContext) {
  const messages = enrichMessages(context.messages);
  const query = question.toLowerCase();
  const filtered = messages.filter((message) => {
    const text = `${message.sender.name ?? ""} ${message.subject ?? ""} ${message.preview} ${message.body ?? ""} ${message.intelligence?.category ?? ""}`.toLowerCase();
    if (/recruit|interview/.test(query)) return /recruit|interview|application|hiring/.test(text);
    if (/need.*(reply|attention)|important|priority|waiting on me/.test(query)) return Boolean(message.intelligence?.requiresResponse || ["critical", "high"].includes(message.intelligence?.priority ?? ""));
    return query.split(/\W+/).filter((term) => term.length > 3).some((term) => text.includes(term));
  }).slice(0, 5);
  if (!messages.length) return { text: "I don’t have any synced messages to analyze yet. Connect and sync Gmail or Outlook, then ask again.", references: [] };
  const results = filtered.length ? filtered : messages.slice(0, 3);
  return {
    text: results.length === 1 ? "I found one relevant message." : `I found ${results.length} messages worth reviewing.`,
    references: results.map((message) => ({ id: message.id, title: message.subject || message.sender.name || "Message", source: message.source, summary: message.intelligence?.summary ?? message.preview, priority: message.intelligence?.priority ?? "normal", why: message.intelligence?.explanation ?? "Matches your request", requiresResponse: message.intelligence?.requiresResponse ?? false, canonicalUrl: message.canonicalUrl })),
  };
}

export function generateDraft(input: { senderName?: string; subject?: string; body: string; tone?: string; instruction?: string }) {
  const name = input.senderName?.split(" ")[0] || "there";
  const tone = input.tone ?? "professional";
  const core = input.instruction?.trim() || "Thank you for reaching out. I appreciate the update and will follow up shortly.";
  return { recipient: input.senderName || "Recipient", subject: input.subject?.startsWith("Re:") ? input.subject : `Re: ${input.subject || "Your message"}`, tone, body: `Hi ${name},\n\n${core}\n\nBest,` };
}
