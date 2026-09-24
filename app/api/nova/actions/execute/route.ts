import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { authorizeProposal } from "@/lib/nova-ai/tool-policy";
import type { NovaActionProposal } from "@/lib/nova-ai/types";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in to execute actions." }, { status: 401 });
  const body = await request.json().catch(() => null) as { proposal?: NovaActionProposal; confirmedProposalId?: string } | null;
  if (!body?.proposal) return Response.json({ error: "A visible action proposal is required." }, { status: 400 });
  const decision = authorizeProposal(body.proposal, { userId: user.userId, accountUserId: user.userId, confirmedProposalId: body.confirmedProposalId });
  if (!decision.allowed) return Response.json({ error: decision.reason, confirmationRequired: true }, { status: 409 });
  const mode = (env as unknown as Record<string, string | undefined>).NOVA_TOOL_EXECUTION_MODE ?? "mock";
  if (mode !== "live") return Response.json({ status: "simulated", receiptId: crypto.randomUUID(), message: "Simulated only; no external provider was contacted." });
  return Response.json({ error: "Live execution requires an installed, reviewed provider mapping for this intent. Nothing was sent." }, { status: 501 });
}
