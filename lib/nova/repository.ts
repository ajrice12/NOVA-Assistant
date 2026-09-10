import type { ConnectedAccount, MemoryRecord, NovaAlert, NormalizedEvent, PlannerItem } from "./domain.ts";

export interface SyncCheckpoint {
  accountId: string;
  cursor: string | null;
  lastSuccessfulSyncAt: string | null;
}

export interface NovaRepository {
  listAccounts(userId: string): Promise<ConnectedAccount[]>;
  saveAccount(account: ConnectedAccount): Promise<void>;
  getCheckpoint(accountId: string): Promise<SyncCheckpoint | null>;
  saveCheckpoint(checkpoint: SyncCheckpoint): Promise<void>;
  upsertEvents(events: NormalizedEvent[]): Promise<void>;
  listRecentEvents(userId: string, since: string): Promise<NormalizedEvent[]>;
  upsertAlerts(alerts: NovaAlert[]): Promise<void>;
  listOpenAlerts(userId: string): Promise<NovaAlert[]>;
  upsertPlannerItems(items: PlannerItem[]): Promise<void>;
  listPlannerItems(userId: string, from: string, to: string): Promise<PlannerItem[]>;
  upsertMemory(records: MemoryRecord[]): Promise<void>;
  appendAudit(entry: { userId: string; action: string; outcome: string; metadata: Record<string, unknown>; createdAt: string }): Promise<void>;
}
