import type {
  ConnectedAccount,
  ConnectorDefinition,
  ConnectorProvider,
  NovaCapability,
  NormalizedEvent,
} from "./domain.ts";

export const CONNECTOR_CATALOG: readonly ConnectorDefinition[] = [
  {
    provider: "device",
    name: "This device",
    category: "device",
    description: "Local time, approximate location, weather, and device context.",
    capabilities: ["location.read"],
    defaultPermission: "observe",
    supportsWebhooks: false,
    supportsIncrementalSync: false,
  },
  {
    provider: "manual",
    name: "Quick capture",
    category: "knowledge",
    description: "Store pasted notes, meeting details, research, and other text in your private NOVA library.",
    capabilities: ["documents.read"],
    defaultPermission: "observe",
    supportsWebhooks: false,
    supportsIncrementalSync: false,
  },
  {
    provider: "gmail",
    name: "Gmail",
    category: "communication",
    description: "Read, categorize, summarize, draft, and—only with approval—send email.",
    capabilities: ["email.read", "email.draft", "email.send"],
    defaultPermission: "observe",
    supportsWebhooks: true,
    supportsIncrementalSync: true,
  },
  {
    provider: "outlook",
    name: "Outlook",
    category: "communication",
    description: "Monitor work mail and prepare approved follow-ups.",
    capabilities: ["email.read", "email.draft", "email.send"],
    defaultPermission: "observe",
    supportsWebhooks: true,
    supportsIncrementalSync: true,
  },
  {
    provider: "linkedin",
    name: "LinkedIn",
    category: "career",
    description: "Read your approved profile and organization data; LinkedIn limits broader member-data access.",
    capabilities: ["professional.read"],
    defaultPermission: "observe",
    supportsWebhooks: false,
    supportsIncrementalSync: true,
  },
  {
    provider: "google-calendar",
    name: "Google Calendar",
    category: "calendar",
    description: "Read schedules, detect conflicts, and propose events before writing.",
    capabilities: ["calendar.read", "calendar.draft", "calendar.write"],
    defaultPermission: "observe",
    supportsWebhooks: true,
    supportsIncrementalSync: true,
  },
  {
    provider: "outlook-calendar",
    name: "Outlook Calendar",
    category: "calendar",
    description: "Monitor availability, deadlines, and approved calendar changes.",
    capabilities: ["calendar.read", "calendar.draft", "calendar.write"],
    defaultPermission: "observe",
    supportsWebhooks: true,
    supportsIncrementalSync: true,
  },
  {
    provider: "google-drive",
    name: "Drive & knowledge",
    category: "knowledge",
    description: "Index user-approved files for grounded retrieval and summaries.",
    capabilities: ["documents.read"],
    defaultPermission: "observe",
    supportsWebhooks: true,
    supportsIncrementalSync: true,
  },
  {
    provider: "market-data",
    name: "Market watch",
    category: "finance",
    description: "Read-only watchlists, price signals, filings, and company news.",
    capabilities: ["market.read"],
    defaultPermission: "observe",
    supportsWebhooks: true,
    supportsIncrementalSync: true,
  },
  {
    provider: "job-search",
    name: "Job search",
    category: "career",
    description: "Discover real roles and rank them against an approved resume profile.",
    capabilities: ["jobs.read", "documents.read"],
    defaultPermission: "observe",
    supportsWebhooks: false,
    supportsIncrementalSync: true,
  },
] as const;

export interface ConnectorSyncContext {
  account: ConnectedAccount;
  cursor: string | null;
  since: string | null;
  signal?: AbortSignal;
}

export interface ConnectorSyncResult {
  events: NormalizedEvent[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ConnectorAction {
  capability: NovaCapability;
  input: Record<string, unknown>;
  idempotencyKey: string;
}

export interface ConnectorAdapter {
  readonly provider: ConnectorProvider;
  sync(context: ConnectorSyncContext): Promise<ConnectorSyncResult>;
  execute(action: ConnectorAction, account: ConnectedAccount): Promise<{ externalId: string; status: "accepted" | "complete" }>;
  verifyWebhook?(headers: Headers, rawBody: string): Promise<boolean>;
}

export class ConnectorRegistry {
  private readonly adapters = new Map<ConnectorProvider, ConnectorAdapter>();

  register(adapter: ConnectorAdapter) {
    if (this.adapters.has(adapter.provider)) throw new Error(`Connector already registered: ${adapter.provider}`);
    this.adapters.set(adapter.provider, adapter);
  }

  get(provider: ConnectorProvider) {
    const adapter = this.adapters.get(provider);
    if (!adapter) throw new Error(`No active adapter for ${provider}`);
    return adapter;
  }

  has(provider: ConnectorProvider) {
    return this.adapters.has(provider);
  }

  list() {
    return [...this.adapters.keys()];
  }
}

export function getConnectorDefinition(provider: ConnectorProvider) {
  return CONNECTOR_CATALOG.find((connector) => connector.provider === provider) ?? null;
}
