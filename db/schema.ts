import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const userProfiles = sqliteTable("user_profiles", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  timezone: text("timezone").notNull(),
  preferencesJson: text("preferences_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [uniqueIndex("idx_user_profiles_email").on(table.email)]);

export const connectorAccounts = sqliteTable("connector_accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  label: text("label").notNull(),
  externalAccountId: text("external_account_id"),
  status: text("status").notNull(),
  permissionLevel: text("permission_level").notNull(),
  grantedCapabilitiesJson: text("granted_capabilities_json").notNull(),
  connectionReference: text("connection_reference"),
  lastSyncAt: integer("last_sync_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  index("idx_connector_accounts_user_status").on(table.userId, table.status),
  uniqueIndex("idx_connector_accounts_user_provider_external").on(table.userId, table.provider, table.externalAccountId),
]);

export const consentGrants = sqliteTable("consent_grants", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  connectorAccountId: text("connector_account_id").notNull().references(() => connectorAccounts.id, { onDelete: "cascade" }),
  capability: text("capability").notNull(),
  permissionLevel: text("permission_level").notNull(),
  status: text("status").notNull(),
  grantedAt: integer("granted_at", { mode: "timestamp_ms" }).notNull(),
  revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
}, (table) => [
  uniqueIndex("idx_consent_account_capability").on(table.connectorAccountId, table.capability),
  index("idx_consent_user_status").on(table.userId, table.status),
]);

export const sourceItems = sqliteTable("source_items", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  connectorAccountId: text("connector_account_id").notNull().references(() => connectorAccounts.id, { onDelete: "cascade" }),
  sourceType: text("source_type").notNull(),
  externalId: text("external_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  summary: text("summary").notNull(),
  summaryStrategy: text("summary_strategy").notNull().default("extractive"),
  modelCallCount: integer("model_call_count").notNull().default(0),
  sensitivity: text("sensitivity").notNull(),
  occurredAt: integer("occurred_at", { mode: "timestamp_ms" }).notNull(),
  dueAt: integer("due_at", { mode: "timestamp_ms" }),
  startsAt: integer("starts_at", { mode: "timestamp_ms" }),
  endsAt: integer("ends_at", { mode: "timestamp_ms" }),
  canonicalUrl: text("canonical_url"),
  labelsJson: text("labels_json").notNull(),
  participantsJson: text("participants_json").notNull(),
  metadataJson: text("metadata_json").notNull(),
  contentHash: text("content_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  uniqueIndex("idx_source_items_account_external").on(table.connectorAccountId, table.externalId),
  index("idx_source_items_user_occurred").on(table.userId, table.occurredAt),
  index("idx_source_items_user_due").on(table.userId, table.dueAt),
]);

export const alerts = sqliteTable("alerts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  sourceItemId: text("source_item_id").references(() => sourceItems.id, { onDelete: "set null" }),
  severity: text("severity").notNull(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  dueAt: integer("due_at", { mode: "timestamp_ms" }),
  status: text("status").notNull(),
  dedupeKey: text("dedupe_key").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  acknowledgedAt: integer("acknowledged_at", { mode: "timestamp_ms" }),
}, (table) => [
  uniqueIndex("idx_alerts_user_dedupe").on(table.userId, table.dedupeKey),
  index("idx_alerts_user_status_severity").on(table.userId, table.status, table.severity),
]);

export const plannerItems = sqliteTable("planner_items", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  sourceItemId: text("source_item_id").references(() => sourceItems.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  kind: text("kind").notNull(),
  startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
  endsAt: integer("ends_at", { mode: "timestamp_ms" }).notNull(),
  status: text("status").notNull(),
  origin: text("origin").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  index("idx_planner_user_starts").on(table.userId, table.startsAt),
  index("idx_planner_user_status").on(table.userId, table.status),
]);

export const memoryRecords = sqliteTable("memory_records", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  sourceItemId: text("source_item_id").notNull().references(() => sourceItems.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  keywordsJson: text("keywords_json").notNull(),
  sensitivity: text("sensitivity").notNull(),
  embeddingReference: text("embedding_reference"),
  occurredAt: integer("occurred_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  index("idx_memory_user_occurred").on(table.userId, table.occurredAt),
  uniqueIndex("idx_memory_source_item").on(table.sourceItemId),
]);

export const syncRuns = sqliteTable("sync_runs", {
  id: text("id").primaryKey(),
  connectorAccountId: text("connector_account_id").notNull().references(() => connectorAccounts.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  cursor: text("cursor"),
  itemCount: integer("item_count").notNull(),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  errorCode: text("error_code"),
}, (table) => [index("idx_sync_runs_account_started").on(table.connectorAccountId, table.startedAt)]);

export const auditEntries = sqliteTable("audit_entries", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  connectorAccountId: text("connector_account_id").references(() => connectorAccounts.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id"),
  outcome: text("outcome").notNull(),
  requiresApproval: integer("requires_approval", { mode: "boolean" }).notNull(),
  metadataJson: text("metadata_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [index("idx_audit_user_created").on(table.userId, table.createdAt)]);
