import type { ChatContext, UnifiedMessage } from "./types.ts";

type WorkspaceSource = { id: string; title: string; content: string; summary: string; sourceType: string; provider: string; accountLabel: string; occurredAt: number; canonicalUrl: string | null };
type WorkspaceConnection = { id: string; provider: string; label: string; status: string };

export function workspaceToChatContext(input: { page?: string; sources: WorkspaceSource[]; connections: WorkspaceConnection[] }): ChatContext {
  const messages: UnifiedMessage[] = input.sources.filter((source) => source.sourceType === "email" || source.sourceType === "message").map((source) => ({
    id: source.id, externalId: source.id, source: source.provider, accountId: input.connections.find((item) => item.provider === source.provider)?.id,
    sender: { name: source.title.split(/[—-]/)[0]?.trim() || source.provider }, subject: source.title,
    preview: source.summary, body: source.content, timestamp: new Date(source.occurredAt).toISOString(), unread: true,
    canonicalUrl: source.canonicalUrl ?? undefined,
  }));
  return { page: input.page ?? "/", messages, conversation: [], connectedApps: input.connections.filter((item) => item.status === "active").map((item) => ({ provider: item.provider, accountId: item.id, label: item.label, capabilities: item.provider === "gmail" || item.provider === "outlook" ? ["read", "search", "draft"] : ["read"] })) };
}
