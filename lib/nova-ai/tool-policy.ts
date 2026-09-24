import type { ActionRisk, NovaActionProposal, NovaIntent } from "./types.ts";

const RISK: Record<NovaIntent, ActionRisk> = {
  SEARCH_MESSAGES: "READ_ONLY", FETCH_THREAD: "READ_ONLY", DRAFT_REPLY: "READ_ONLY", SEARCH_CALENDAR: "READ_ONLY",
  ARCHIVE_MESSAGE: "LOW_RISK", MARK_READ: "LOW_RISK", SEND_REPLY: "COMMUNICATION",
  CREATE_CALENDAR_EVENT: "COMMUNICATION", CREATE_TASK: "COMMUNICATION",
};

export function riskForIntent(intent: NovaIntent) { return RISK[intent]; }
export function requiresConfirmation(intent: NovaIntent) { return RISK[intent] !== "READ_ONLY"; }

export function authorizeProposal(proposal: NovaActionProposal, input: { userId: string; accountUserId: string; confirmedProposalId?: string }) {
  if (input.userId !== input.accountUserId) return { allowed: false, reason: "The selected account belongs to another user." };
  if (!requiresConfirmation(proposal.intent)) return { allowed: true, reason: "Read-only action." };
  if (input.confirmedProposalId !== proposal.id) return { allowed: false, reason: "Review and explicitly confirm this exact action first." };
  return { allowed: true, reason: "The exact visible proposal was confirmed." };
}
