import type { ChatContext } from "./types.ts";

export function appendTurn(context: ChatContext, turn: ChatContext["conversation"][number], limit = 24): ChatContext {
  return { ...context, conversation: [...context.conversation, turn].slice(-limit) };
}

export function resolveOrdinalReference(context: ChatContext, ordinal: number) {
  const lastAssistant = [...context.conversation].reverse().find((turn) => turn.role === "assistant" && turn.referencedMessageIds?.length);
  return lastAssistant?.referencedMessageIds?.[ordinal - 1] ?? null;
}
