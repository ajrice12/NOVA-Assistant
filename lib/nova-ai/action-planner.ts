import { riskForIntent } from "./tool-policy.ts";
import type { NovaActionProposal, NovaIntent } from "./types.ts";

export function createActionProposal(input: { intent: NovaIntent; accountId: string; targetId: string; summary: string; arguments?: Record<string, unknown> }): NovaActionProposal {
  if (!input.accountId || !input.targetId) throw new Error("An action must identify both its account and target.");
  return { id: crypto.randomUUID(), intent: input.intent, risk: riskForIntent(input.intent), accountId: input.accountId, targetId: input.targetId, summary: input.summary, arguments: input.arguments ?? {}, status: "proposed" };
}

export function resolveSendReference(pending: NovaActionProposal | undefined) {
  return pending?.intent === "SEND_REPLY" && pending.status === "proposed" ? pending : null;
}
