import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getComposioProviderConfig, isSupportedCloudProvider } from "@/lib/nova/composio-config";
import { savePendingConnection } from "@/lib/nova/persistence";
import { ComposioReadOnlyClient } from "@/lib/nova/providers/composio";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in with ChatGPT before connecting an account." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  if (!isSupportedCloudProvider(body.provider)) {
    return Response.json({ error: "Choose Gmail, Outlook, or LinkedIn." }, { status: 400 });
  }
  const config = getComposioProviderConfig(body.provider);
  if (!config.apiKey || !config.authConfigId) {
    return Response.json({
      code: "setup_required",
      error: `${body.provider === "gmail" ? "Gmail" : body.provider === "outlook" ? "Outlook" : "LinkedIn"} is ready in Atlas, but its secure connection has not been configured by the product owner yet.`,
    }, { status: 503 });
  }

  try {
    const client = new ComposioReadOnlyClient({ apiKey: config.apiKey, readToolAllowlist: [config.toolSlug] });
    const callbackUrl = new URL(`/workspace?connected=${body.provider}`, request.url).toString();
    const link = await client.createAuthLink({
      authConfigId: config.authConfigId,
      userId: user.userId,
      alias: `${body.provider}-${user.userId}`.slice(0, 120),
      callbackUrl,
    });
    await savePendingConnection(user, body.provider, link.connected_account_id);
    return Response.json({ redirectUrl: link.redirect_url, expiresAt: link.expires_at });
  } catch (error) {
    console.error("Atlas connection failed", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "The secure connection could not be started. Try again shortly." }, { status: 502 });
  }
}
