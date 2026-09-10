export const NOVA_CORE_VERSION = "0.3.0";

export type ConnectorProvider =
  | "device"
  | "manual"
  | "gmail"
  | "outlook"
  | "linkedin"
  | "google-calendar"
  | "outlook-calendar"
  | "google-drive"
  | "onedrive"
  | "slack"
  | "composio"
  | "market-data"
  | "job-search";

export type NovaCapability =
  | "email.read"
  | "email.draft"
  | "email.send"
  | "calendar.read"
  | "calendar.draft"
  | "calendar.write"
  | "documents.read"
  | "messages.read"
  | "professional.read"
  | "market.read"
  | "jobs.read"
  | "location.read"
  | "notifications.write";

export type PermissionLevel = "observe" | "suggest" | "act";
export type ConnectionStatus = "disconnected" | "connecting" | "active" | "expired" | "error";
export type Sensitivity = "public" | "personal" | "confidential" | "restricted";
export type EventKind =
  | "email"
  | "calendar-event"
  | "task"
  | "market-signal"
  | "news"
  | "weather"
  | "document"
  | "job"
  | "message"
  | "system";
export type AlertSeverity = "info" | "attention" | "urgent" | "critical";

export interface ConnectorDefinition {
  provider: ConnectorProvider;
  name: string;
  category: "communication" | "calendar" | "knowledge" | "finance" | "career" | "device";
  description: string;
  capabilities: readonly NovaCapability[];
  defaultPermission: PermissionLevel;
  supportsWebhooks: boolean;
  supportsIncrementalSync: boolean;
}

export interface ConnectedAccount {
  id: string;
  userId: string;
  provider: ConnectorProvider;
  label: string;
  externalAccountId: string | null;
  status: ConnectionStatus;
  grantedCapabilities: NovaCapability[];
  permissionLevel: PermissionLevel;
  lastSyncAt: string | null;
  createdAt: string;
}

export interface EventSource {
  provider: ConnectorProvider;
  accountId: string;
  externalId: string;
  canonicalUrl?: string;
}

export interface NormalizedEvent {
  id: string;
  userId: string;
  kind: EventKind;
  source: EventSource;
  title: string;
  summary: string;
  occurredAt: string;
  dueAt?: string;
  startsAt?: string;
  endsAt?: string;
  participants: string[];
  labels: string[];
  sensitivity: Sensitivity;
  metadata: Record<string, string | number | boolean | null>;
}

export interface NovaAlert {
  id: string;
  userId: string;
  eventId: string;
  severity: AlertSeverity;
  kind: "deadline" | "conflict" | "priority" | "market" | "connection";
  title: string;
  body: string;
  dueAt?: string;
  dedupeKey: string;
  status: "open" | "acknowledged" | "resolved";
  createdAt: string;
}

export interface PlannerItem {
  id: string;
  userId: string;
  eventId?: string;
  title: string;
  kind: "event" | "task" | "focus" | "follow-up";
  startsAt: string;
  endsAt: string;
  status: "proposed" | "confirmed" | "complete" | "cancelled";
  origin: "source" | "nova-suggestion" | "user";
}

export interface ActionRequest {
  id: string;
  userId: string;
  account: ConnectedAccount | null;
  capability: NovaCapability;
  description: string;
  sensitivity: Sensitivity;
  userApproved: boolean;
}

export interface PolicyDecision {
  allowed: boolean;
  requiresApproval: boolean;
  reason: string;
  auditCode:
    | "ALLOW_READ"
    | "ALLOW_APPROVED_ACTION"
    | "DENY_NO_CONNECTION"
    | "DENY_ACCOUNT_OWNERSHIP"
    | "DENY_SCOPE"
    | "DENY_PERMISSION"
    | "DENY_APPROVAL_REQUIRED";
}

export interface MemoryRecord {
  id: string;
  userId: string;
  sourceEventId: string;
  content: string;
  keywords: string[];
  sensitivity: Sensitivity;
  occurredAt: string;
}

export interface DailyBriefing {
  generatedAt: string;
  headline: string;
  urgent: NovaAlert[];
  upcoming: NormalizedEvent[];
  informational: NormalizedEvent[];
  counts: { urgent: number; dueSoon: number; unreadSignals: number };
}
