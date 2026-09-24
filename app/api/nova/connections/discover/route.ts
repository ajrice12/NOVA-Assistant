import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getComposioProviderConfig } from "@/lib/nova/composio-config";
import { saveDiscoveredConnection, type SupportedCloudProvider } from "@/lib/nova/persistence";
import { ComposioReadOnlyClient } from "@/lib/nova/providers/composio";

const TOOLKIT_PROVIDER: Record<string, SupportedCloudProvider | undefined> = {
  gmail: "gmail", outlook: "outlook", outlookmail: "outlook", microsoft_outlook: "outlook", linkedin: "linkedin",
};

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in before discovering connected accounts." }, { status: 401 });
  const config = getComposioProviderConfig("gmail");
  if (!config.apiKey) return Response.json({ error: "Composio is not configured on this deployment." }, { status: 503 });
  try {
    const client = new ComposioReadOnlyClient({ apiKey: config.apiKey, readToolAllowlist: [config.toolSlug] });
    const result = user.userId === "local-development-user"
      ? await client.listAllConnectedAccounts()
      : await client.listConnectedAccounts(user.userId);
    const discovered: Array<{ provider: SupportedCloudProvider; accountId: string }> = [];
    for (const account of result.items) {
      const provider = TOOLKIT_PROVIDER[account.toolkit.slug.toLowerCase()];
      if (!provider || provider === "outlook" || account.status !== "ACTIVE") continue;
      await saveDiscoveredConnection(user, provider, account.id);
      discovered.push({ provider, accountId: account.id });
    }
    return Response.json({ discovered });
  } catch (error) {
    console.error("NOVA Composio discovery failed", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "Connected Composio accounts could not be discovered." }, { status: 502 });
  }
}
