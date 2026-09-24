import { getChatGPTUser } from "@/app/chatgpt-auth";
import { createActionProposal } from "@/lib/nova-ai/action-planner";
import type { NovaIntent } from "@/lib/nova-ai/types";

const ALLOWED = new Set<NovaIntent>(["SEND_REPLY", "ARCHIVE_MESSAGE", "MARK_READ", "CREATE_CALENDAR_EVENT", "CREATE_TASK"]);

export async function POST(request: Request) {
  if (!await getChatGPTUser()) return Response.json({ error: "Sign in to propose actions." }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.intent !== "string" || !ALLOWED.has(body.intent as NovaIntent) || typeof body.accountId !== "string" || typeof body.targetId !== "string") return Response.json({ error: "A supported intent, account, and target are required." }, { status: 400 });
  if (body.intent === "SEND_REPLY") {
    const args = typeof body.arguments === "object" && body.arguments ? body.arguments as Record<string, unknown> : {};
    const recipient = typeof args.recipient_email === "string" ? args.recipient_email.trim() : "";
    const subject = typeof args.subject === "string" ? args.subject.trim() : "";
    const message = typeof args.body === "string" ? args.body.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || !subject || !message) {
      return Response.json({ error: "A valid recipient, subject, and message are required." }, { status: 400 });
    }
  }
  return Response.json(createActionProposal({ intent: body.intent as NovaIntent, accountId: body.accountId, targetId: body.targetId, summary: typeof body.summary === "string" ? body.summary : body.intent, arguments: typeof body.arguments === "object" && body.arguments ? body.arguments as Record<string, unknown> : {} }), { status: 201 });
}
