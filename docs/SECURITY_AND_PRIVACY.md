# Security and Privacy

NOVA's usefulness depends on trust. Connected data is private by default, capabilities are narrow, and external actions are never inferred from a conversational request alone.

## Data classes

| Class | Examples | Default handling |
|---|---|---|
| Public | weather, public news | cache with source and expiry |
| Private | email metadata, calendar events | encrypted transport, user-scoped storage |
| Confidential | message bodies, file excerpts, personal notes | minimum retention, source-linked retrieval |
| Restricted | credentials, tokens, financial account numbers | never stored in application tables or model memory |

## Security promises

- Provider secrets remain in server-side secret storage or a connector vault.
- Browser code receives connection status and opaque IDs, not credentials.
- Every data query is scoped to the authenticated user.
- Consent is capability-specific, versioned, revocable, and auditable.
- Write actions require an explicit approval bound to the action payload and expiry.
- Logs redact message bodies, tokens, authorization headers, and webhook secrets.
- Audit records are append-only application events and exclude credential material.

## Threat controls

- **Prompt injection in email or files:** retrieved content is untrusted data, cannot grant tools, and cannot alter system policy.
- **Confused deputy actions:** action requests carry user ID, connector account, capability, exact payload, approval state, and expiry.
- **Cross-user access:** repository methods require a user scope and database indexes support owner filtering.
- **Webhook spoofing/replay:** verify signatures and timestamps, then deduplicate provider event IDs.
- **Over-broad memory:** sensitive or restricted content is excluded by default; users can inspect and delete retained memory.
- **Model hallucination:** user-facing claims link to stored evidence, while empty states explicitly say when no source is connected.

## User controls

Users must be able to see connected accounts, inspect granted capabilities, pause sync, revoke an account, choose retention, clear derived memory, and review the action audit trail. Revocation should take effect before any best-effort cleanup job begins.

## Model boundary

Models may summarize, classify, rank, and draft. They do not decide authorization, approve their own actions, calculate permission scope, validate webhook signatures, or invent missing operational data. Those responsibilities remain deterministic code paths.
