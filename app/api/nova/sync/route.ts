import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getComposioProviderConfig, isSupportedCloudProvider } from "@/lib/nova/composio-config";
import { normalizeComposioResult } from "@/lib/nova/normalize-composio";
import { getConnection, saveRemoteItems } from "@/lib/nova/persistence";
import { ComposioReadOnlyClient } from "@/lib/nova/providers/composio";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in with ChatGPT before syncing an account." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  if (!isSupportedCloudProvider(body.provider)) {
    return Response.json({ error: "Choose Gmail, Outlook, or LinkedIn." }, { status: 400 });
  }
  const connection = await getConnection(user.userId, body.provider);
  if (!connection?.external_account_id) {
    return Response.json({ error: "Connect this account before syncing it." }, { status: 409 });
  }
  const config = getComposioProviderConfig(body.provider);
  if (!config.apiKey) return Response.json({ error: "The connector broker is not configured." }, { status: 503 });

  try {
    const client = new ComposioReadOnlyClient({ apiKey: config.apiKey, readToolAllowlist: [config.toolSlug] });
    const result = await client.executeReadTool({
      toolSlug: config.toolSlug,
      version: config.toolVersion,
      connectedAccountId: connection.external_account_id,
      userId: user.userId,
      arguments: config.arguments,
    });
    if (!result.successful) throw new Error(result.error || "Provider sync failed.");
    const items = normalizeComposioResult(body.provider, result.data);
    const count = await saveRemoteItems(user, body.provider, items);
    return Response.json({ count, modelCalls: 0, summaryStrategy: "extractive" });
  } catch (error) {
    console.error("NOVA sync failed", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "The account could not be synchronized. Reconnect it or try again shortly." }, { status: 502 });
  }
}
