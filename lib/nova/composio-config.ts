import { env } from "cloudflare:workers";
import type { SupportedCloudProvider } from "./persistence";

type RuntimeEnv = Record<string, string | undefined>;

const PROVIDERS = {
  gmail: {
    authConfigKey: "COMPOSIO_GMAIL_AUTH_CONFIG_ID",
    toolKey: "COMPOSIO_GMAIL_READ_TOOL",
    versionKey: "COMPOSIO_GMAIL_TOOL_VERSION",
    defaultTool: "GMAIL_FETCH_EMAILS",
    defaultVersion: "20260903_00",
    arguments: {
      user_id: "me",
      query: "in:inbox newer_than:7d",
      max_results: 10,
      include_payload: false,
      verbose: false,
      ids_only: false,
    },
  },
  outlook: {
    authConfigKey: "COMPOSIO_OUTLOOK_AUTH_CONFIG_ID",
    toolKey: "COMPOSIO_OUTLOOK_READ_TOOL",
    versionKey: "COMPOSIO_OUTLOOK_TOOL_VERSION",
    defaultTool: "OUTLOOK_LIST_MESSAGES",
    defaultVersion: "20260903_00",
    arguments: { user_id: "me", folder: "inbox", top: 25 },
  },
  linkedin: {
    authConfigKey: "COMPOSIO_LINKEDIN_AUTH_CONFIG_ID",
    toolKey: "COMPOSIO_LINKEDIN_READ_TOOL",
    versionKey: "COMPOSIO_LINKEDIN_TOOL_VERSION",
    defaultTool: "LINKEDIN_GET_MY_INFO",
    defaultVersion: "20260826_00",
    arguments: {},
  },
} as const;

function runtimeEnv() {
  return env as unknown as RuntimeEnv;
}

export function getComposioProviderConfig(provider: SupportedCloudProvider) {
  const values = runtimeEnv();
  const definition = PROVIDERS[provider];
  return {
    apiKey: values.COMPOSIO_API_KEY?.trim() ?? "",
    authConfigId: values[definition.authConfigKey]?.trim() ?? "",
    toolSlug: values[definition.toolKey]?.trim() || definition.defaultTool,
    toolVersion: values[definition.versionKey]?.trim() || definition.defaultVersion,
    arguments: definition.arguments,
  };
}

export function getComposioGmailSendConfig() {
  const values = runtimeEnv();
  return {
    apiKey: values.COMPOSIO_API_KEY?.trim() ?? "",
    toolSlug: values.COMPOSIO_GMAIL_SEND_TOOL?.trim() || "GMAIL_SEND_EMAIL",
    toolVersion: values.COMPOSIO_GMAIL_SEND_TOOL_VERSION?.trim() || "20260903_00",
  };
}

export function getComposioGmailTrashConfig() {
  const values = runtimeEnv();
  return {
    apiKey: values.COMPOSIO_API_KEY?.trim() ?? "",
    toolSlug: values.COMPOSIO_GMAIL_TRASH_TOOL?.trim() || "GMAIL_MOVE_TO_TRASH",
    toolVersion: values.COMPOSIO_GMAIL_TRASH_TOOL_VERSION?.trim() || "20260903_00",
  };
}

export function isSupportedCloudProvider(value: unknown): value is SupportedCloudProvider {
  return value === "gmail" || value === "outlook" || value === "linkedin";
}
