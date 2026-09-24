import assert from "node:assert/strict";
import test from "node:test";

import { deriveAlerts } from "../lib/nova/alerts.ts";
import { CONNECTOR_CATALOG } from "../lib/nova/connectors.ts";
import type { ActionRequest, ConnectedAccount, NormalizedEvent, PlannerItem } from "../lib/nova/domain.ts";
import { rankJob } from "../lib/nova/jobs.ts";
import { chunkText, eventToMemory, rankMemory } from "../lib/nova/memory.ts";
import { normalizeComposioResult } from "../lib/nova/normalize-composio.ts";
import { detectPlannerConflicts } from "../lib/nova/planner.ts";
import { evaluateAction } from "../lib/nova/policy.ts";
import { answerPulse, buildPulseReport } from "../lib/nova/pulse.ts";
import { ComposioReadOnlyClient, verifyComposioWebhook } from "../lib/nova/providers/composio.ts";
import { processNovaContext } from "../lib/nova/runtime.ts";
import { summarizeWithoutModel } from "../lib/nova/summarize.ts";
import { createActionProposal, resolveSendReference } from "../lib/nova-ai/action-planner.ts";
import { analyzeMessage } from "../lib/nova-ai/message-intelligence.ts";
import { authorizeProposal, requiresConfirmation } from "../lib/nova-ai/tool-policy.ts";

const now = new Date("2026-08-20T12:00:00.000Z");

function event(overrides: Partial<NormalizedEvent> = {}): NormalizedEvent {
  return {
    id: "event-1",
    userId: "user-1",
    kind: "email",
    source: { provider: "gmail", accountId: "account-1", externalId: "message-1" },
    title: "Data analyst interview",
    summary: "Please reply before the interview deadline.",
    occurredAt: "2026-08-20T10:00:00.000Z",
    participants: ["recruiter@example.com"],
    labels: ["priority"],
    sensitivity: "personal",
    metadata: { unread: true },
    ...overrides,
  };
}

function account(overrides: Partial<ConnectedAccount> = {}): ConnectedAccount {
  return {
    id: "account-1",
    userId: "user-1",
    provider: "gmail",
    label: "Work Gmail",
    externalAccountId: "opaque-id",
    status: "active",
    grantedCapabilities: ["email.read", "email.draft", "email.send"],
    permissionLevel: "act",
    lastSyncAt: null,
    createdAt: now.toISOString(),
    ...overrides,
  };
}

test("connector catalog is unique and defaults to observe-only", () => {
  const providers = CONNECTOR_CATALOG.map(({ provider }) => provider);
  assert.equal(new Set(providers).size, providers.length);
  assert.ok(CONNECTOR_CATALOG.every(({ defaultPermission }) => defaultPermission === "observe"));
});

test("external write actions require explicit user approval", () => {
  const request: ActionRequest = {
    id: "action-1",
    userId: "user-1",
    account: account(),
    capability: "email.send",
    description: "Send reviewed reply",
    sensitivity: "personal",
    userApproved: false,
  };

  const denied = evaluateAction(request);
  assert.equal(denied.allowed, false);
  assert.equal(denied.requiresApproval, true);
  assert.equal(denied.auditCode, "DENY_APPROVAL_REQUIRED");
  assert.equal(evaluateAction({ ...request, userApproved: true }).allowed, true);
});

test("actions cannot use another user's connected account", () => {
  const decision = evaluateAction({
    id: "action-cross-user",
    userId: "user-1",
    account: account({ userId: "user-2" }),
    capability: "email.read",
    description: "Read another account",
    sensitivity: "personal",
    userApproved: false,
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.auditCode, "DENY_ACCOUNT_OWNERSHIP");
});

test("deadline severity is deterministic", () => {
  const alerts = deriveAlerts([event({ dueAt: "2026-08-20T15:00:00.000Z" })], now);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].severity, "critical");
  assert.equal(alerts[0].kind, "deadline");
});

test("planner detects the exact overlap", () => {
  const items: PlannerItem[] = [
    { id: "a", userId: "user-1", title: "Interview", kind: "event", startsAt: "2026-08-20T13:00:00.000Z", endsAt: "2026-08-20T14:00:00.000Z", status: "confirmed", origin: "source" },
    { id: "b", userId: "user-1", title: "Team call", kind: "event", startsAt: "2026-08-20T13:30:00.000Z", endsAt: "2026-08-20T14:30:00.000Z", status: "confirmed", origin: "source" },
  ];
  const conflicts = detectPlannerConflicts(items);
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].overlapMinutes, 30);
});

test("memory is source-linked, chunked, and relevance-ranked", () => {
  const interview = eventToMemory(event());
  const unrelated = eventToMemory(event({ id: "event-2", title: "Quarterly forecast", summary: "Finance review", labels: [] }));
  const ranked = rankMemory("interview recruiter", [unrelated, interview]);
  assert.equal(ranked[0].record.sourceEventId, "event-1");
  assert.deepEqual(chunkText("one two three four five six", 4, 1), ["one two three four", "four five six"]);
});

test("job matching explains complete skill overlap", () => {
  const ranked = rankJob(
    { id: "job-1", title: "React TypeScript Engineer", company: "NOVA", location: "Remote", description: "Build React and TypeScript systems with SQL.", applyUrl: "https://example.com/job", publishedAt: now.toISOString() },
    "Experienced with React, TypeScript, and SQL.",
  );
  assert.equal(ranked.matchScore, 100);
  assert.deepEqual(ranked.missingSkills, []);
});

test("runtime produces a grounded briefing from source events", () => {
  const result = processNovaContext([event({ dueAt: "2026-08-20T15:00:00.000Z" })], [], now);
  assert.equal(result.briefing.counts.urgent, 1);
  assert.equal(result.briefing.counts.unreadSignals, 1);
  assert.equal(result.memory[0].sourceEventId, "event-1");
});

test("restricted records never enter memory and first-pass summaries use zero model calls", () => {
  const result = processNovaContext([event({ sensitivity: "restricted" })], [], now);
  assert.equal(result.memory.length, 0);
  const summary = summarizeWithoutModel("Decision: launch Friday. Austin owns the final checklist due at 3:00 PM.");
  assert.equal(summary.modelCalls, 0);
  assert.match(summary.summary, /launch Friday/);
  assert.ok(summary.keyPoints.length > 0);
});

test("NOVA Pulse turns saved items and connection issues into short zero-call reports", () => {
  const workspace = {
    briefing: "Two items are saved.",
    sources: [{ id: "source-1", title: "Security alert", summary: "A new device signed in.", sourceType: "email", provider: "gmail", updatedAt: now.getTime() }],
    connections: [{ provider: "gmail", status: "active" }, { provider: "outlook", status: "connecting" }],
  };
  const report = buildPulseReport(workspace);
  assert.equal(report.badgeCount, 2);
  assert.equal(report.items[0].title, "Outlook needs attention");
  assert.match(answerPulse("Any email?", workspace), /Security alert/);
  assert.match(answerPulse("What is the cost?", workspace), /0 model calls/);
});

test("Gmail previews become useful, newest-first NOVA notes", () => {
  const items = normalizeComposioResult("gmail", {
    response_data: {
      messages: [
        { messageId: "older", sender: "Jordan <jordan@example.com>", subject: "Project plan", preview: "The launch checklist is ready for review.", messageTimestamp: "2026-08-20T10:00:00.000Z" },
        { messageId: "newer", sender: "Casey <casey@example.com>", subject: "Interview update", messageText: "Your interview moved to Friday at 2 PM.", messageTimestamp: "2026-08-20T11:00:00.000Z" },
      ],
    },
  });
  assert.equal(items[0].externalId, "newer");
  assert.match(items[0].title, /Casey/);
  assert.match(items[0].content, /Friday at 2 PM/);
});

test("Composio client uses Connect Links and blocks unreviewed tools", async () => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const client = new ComposioReadOnlyClient({
    apiKey: "server-test-key",
    readToolAllowlist: ["GMAIL_FETCH_EMAILS"],
    fetcher: async (input, init) => {
      capturedUrl = String(input);
      capturedInit = init;
      return Response.json({ link_token: "link-1", redirect_url: "https://connect.composio.dev/link-1", expires_at: now.toISOString(), connected_account_id: "ca_1" }, { status: 201 });
    },
  });

  await client.createAuthLink({ authConfigId: "ac_gmail", userId: "user-1", callbackUrl: "https://nova.example/connect/callback" });
  assert.match(capturedUrl, /\/api\/v3\.1\/connected_accounts\/link$/);
  assert.equal(new Headers(capturedInit?.headers).get("x-api-key"), "server-test-key");
  assert.match(String(capturedInit?.body), /"auth_config_id":"ac_gmail"/);
  assert.throws(
    () => client.executeReadTool({ toolSlug: "GMAIL_SEND_EMAIL", version: "20260820_00", connectedAccountId: "ca_1", userId: "user-1" }),
    /not in NOVA's reviewed read-only allowlist/,
  );
});

test("Composio discovery is scoped to the signed-in NOVA user", async () => {
  let capturedUrl = "";
  const client = new ComposioReadOnlyClient({
    apiKey: "server-test-key",
    readToolAllowlist: ["GMAIL_FETCH_EMAILS"],
    fetcher: async (input) => {
      capturedUrl = String(input);
      return Response.json({ items: [{ id: "ca_1", user_id: "user-1", status: "ACTIVE", toolkit: { slug: "gmail" } }] });
    },
  });
  const accounts = await client.listConnectedAccounts("user-1");
  assert.equal(accounts.items[0].id, "ca_1");
  assert.match(capturedUrl, /user_ids=user-1/);
  assert.match(capturedUrl, /statuses=ACTIVE/);
});

test("Composio webhook verification rejects replays and accepts a valid signature", async () => {
  const timestamp = Math.floor(now.getTime() / 1000).toString();
  const webhookId = "msg_1";
  const body = JSON.stringify({ id: webhookId, type: "composio.trigger.message" });
  const secret = "webhook-test-secret";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${webhookId}.${timestamp}.${body}`)));
  const signature = Buffer.from(signed).toString("base64");
  const headers = new Headers({ "webhook-id": webhookId, "webhook-timestamp": timestamp, "webhook-signature": `v1,${signature}` });

  assert.equal(await verifyComposioWebhook(headers, body, secret, now), true);
  assert.equal(await verifyComposioWebhook(headers, body, secret, new Date(now.getTime() + 301_000)), false);
});

test("message intelligence combines deterministic signals into an explainable priority", () => {
  const intelligence = analyzeMessage({ id: "m1", externalId: "m1", source: "gmail", sender: { name: "Recruiter" }, subject: "Interview availability", preview: "Are you available Friday? Please reply today.", timestamp: now.toISOString(), unread: true }, now);
  assert.equal(intelligence.category, "recruiting");
  assert.equal(intelligence.requiresResponse, true);
  assert.ok(intelligence.priorityScore >= 70);
});

test("drafting never authorizes a send", () => {
  assert.equal(requiresConfirmation("DRAFT_REPLY"), false);
  assert.equal(requiresConfirmation("SEND_REPLY"), true);
  const proposal = createActionProposal({ intent: "SEND_REPLY", accountId: "account-1", targetId: "thread-1", summary: "Send reviewed reply" });
  assert.equal(authorizeProposal(proposal, { userId: "user-1", accountUserId: "user-1" }).allowed, false);
});

test("send it cannot resolve without one identified pending draft", () => {
  assert.equal(resolveSendReference(undefined), null);
  const archive = createActionProposal({ intent: "ARCHIVE_MESSAGE", accountId: "account-1", targetId: "message-1", summary: "Archive" });
  assert.equal(resolveSendReference(archive), null);
});

test("confirmation is exact and account scoped", () => {
  const proposal = createActionProposal({ intent: "SEND_REPLY", accountId: "account-1", targetId: "thread-1", summary: "Send reviewed reply" });
  assert.equal(authorizeProposal(proposal, { userId: "user-1", accountUserId: "user-2", confirmedProposalId: proposal.id }).allowed, false);
  assert.equal(authorizeProposal(proposal, { userId: "user-1", accountUserId: "user-1", confirmedProposalId: "another-action" }).allowed, false);
  assert.equal(authorizeProposal(proposal, { userId: "user-1", accountUserId: "user-1", confirmedProposalId: proposal.id }).allowed, true);
});
