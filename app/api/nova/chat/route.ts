import { getChatGPTUser } from "@/app/chatgpt-auth";
import { workspaceToChatContext } from "@/lib/nova-ai/context-builder";
import { answerFromContext } from "@/lib/nova-ai/response-generator";
import { loadWorkspace } from "@/lib/nova/persistence";
import { DEV_WORKSPACE } from "@/lib/nova/dev-workspace";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in to use NOVA chat." }, { status: 401 });
  const body = await request.json().catch(() => null) as { message?: unknown; page?: unknown } | null;
  if (typeof body?.message !== "string" || !body.message.trim()) return Response.json({ error: "Add a message." }, { status: 400 });
  const workspace = user.userId === "local-development-user" ? DEV_WORKSPACE : await loadWorkspace(user);
  const context = workspaceToChatContext({ page: typeof body.page === "string" ? body.page : "/", sources: workspace.sources, connections: workspace.connections });
  return Response.json(answerFromContext(body.message.slice(0, 2_000), context));
}
