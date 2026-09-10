# Connector Contract

NOVA connectors are replaceable adapters. A Composio adapter and a future direct OAuth adapter must expose the same behavior to the application.

## Adapter responsibilities

An adapter must:

- identify its provider and supported NOVA capabilities;
- start an authorization flow without exposing credentials to the browser;
- return a stable external account ID and connection state;
- perform cursor-based, idempotent reads;
- normalize remote records into `NormalizedEvent` objects;
- execute an action only after NOVA supplies a valid approval context;
- revoke the provider connection and invalidate local consent;
- expose health without returning tokens or secret payloads.

## Connection lifecycle

`disconnected → connecting → connected → degraded | reauth_required → disconnected`

NOVA records one consent grant per capability. Revocation immediately prevents new reads and actions, while retained derived records follow the user's retention choice.

## Composio adapter flow

1. The server creates a Composio Connect Link for the current NOVA user with `POST /api/v3.1/connected_accounts/link`.
2. The browser is redirected to the provider authorization page.
3. The callback is validated server-side and mapped to an opaque connector account record.
4. NOVA requests only the read capabilities selected by the user.
5. A bounded initial sync is normalized and committed with a sync cursor.
6. Verified webhooks or scheduled polling continue from that cursor.
7. Write tools remain unavailable until a separate consent grant and per-action approval exist.

Composio keys, webhook secrets, and provider tokens must never be committed or returned to the client.

## Capability examples

| NOVA capability | Typical remote operation | Default level |
|---|---|---|
| `email.read` | list and retrieve messages | observe |
| `calendar.read` | list events | observe |
| `files.read` | search approved files | observe |
| `email.send` | send a reviewed draft | act + approval |
| `calendar.write` | create or modify an event | act + approval |
| `notifications.write` | send a desktop or mobile alert | act + approval |

## Webhook envelope

Each accepted webhook is converted to a provider-neutral envelope containing provider, external account ID, provider event ID, event type, occurred time, and payload. Signature verification happens before parsing; duplicate provider event IDs are no-ops.

## Integration test gate

The first Composio test must use a non-critical account and read-only scopes. It passes only when connection, incremental sync, duplicate delivery, expired authorization, revocation, and secret-redaction cases all behave correctly. No email or calendar write tool should be enabled during this test.

NOVA's first reviewed read tools are `GMAIL_FETCH_EMAILS`, `OUTLOOK_LIST_MESSAGES`, and `LINKEDIN_GET_MY_INFO`, each pinned to a dated toolkit version in server configuration. The Gmail and Outlook adapters import bounded inbox results. The LinkedIn adapter intentionally imports only data allowed by the concrete LinkedIn auth config; broad member, feed, Sales Navigator, talent, and organization access must never be implied because most of those permissions require separate LinkedIn approval.

Provider reads do not automatically invoke an LLM. Normalization, deduplication, tags, and first-pass summaries are deterministic. Enhanced model summaries are a separate, budgeted operation and must reuse the stored content hash when the source is unchanged.

NOVA intentionally uses Connect Links instead of the deprecated managed-OAuth `initiate` flow. Read tools must be reviewed, allowlisted, and pinned to a dated Composio toolkit version before execution. The provider client in `lib/nova/providers/composio.ts` enforces both rules.

## External contract references

- [Composio connected accounts and Connect Links](https://docs.composio.dev/reference/api-reference/connected-accounts)
- [Composio tool execution](https://docs.composio.dev/reference/api-reference/tools)
- [Composio webhook delivery and signatures](https://docs.composio.dev/docs/setting-up-triggers/subscribing-to-events)
