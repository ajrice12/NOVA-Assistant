# NOVA AI command center

## Implementation assessment

NOVA is a Vinext/React 19 TypeScript application targeting Cloudflare Workers. It already had ChatGPT authentication, D1/Drizzle persistence, a connector catalog, read-only Composio Connect Links/tool execution, normalized source items, zero-model summaries, an approval policy, a workspace, and NOVA Pulse. Those systems remain the foundation; the upgrade adds `lib/nova-ai` rather than replacing `lib/nova`.

The current Composio production path is server-only and uses direct v3.1 API calls with dated tool versions. Gmail, Outlook, and LinkedIn are configured for read operations. Write tools are deliberately not assumed: every write slug must be explicitly reviewed and allowlisted.

## Architecture

`lib/nova-ai/types.ts` defines unified messages, intelligence, conversations, action proposals, risks, and provider-neutral AI contracts. `message-intelligence.ts` and `prioritization.ts` provide deterministic, explainable first-pass analysis. `context-builder.ts` converts persisted connected sources into chat context. `response-generator.ts` powers grounded retrieval answers and editable drafts. `tool-policy.ts` and `action-planner.ts` enforce exact-action confirmation and account ownership boundaries.

The assistant UI is an upgraded NOVA Pulse panel. It queries `/api/nova/chat`, renders source-backed message cards, and can request editable drafts through `/api/nova/draft`. Drafts are visibly marked **Not sent**. The UI never treats drafting as permission to send.

## Action execution

The safe default is `NOVA_TOOL_EXECUTION_MODE=mock`. The execution endpoint returns a simulation receipt and never contacts providers in this mode. `live` mode intentionally refuses execution until a reviewed semantic-intent-to-Composio mapping is installed; this prevents a configuration typo or model output from selecting an arbitrary tool.

To add an action:

1. Add or reuse a normalized intent in `lib/nova-ai/types.ts`.
2. Assign its risk in `tool-policy.ts`.
3. Add a reviewed, dated Composio tool slug to server configuration.
4. Map only validated arguments and bind the selected connected account.
5. Require the exact proposal ID for confirmation.
6. Add success, provider-failure, wrong-account, and no-confirmation tests.

## Environment and safe testing

See `.env.example`. AI behavior currently uses the deterministic provider so it remains grounded and deployable without another secret. Keep `NOVA_TOOL_EXECUTION_MODE=mock`, connect a non-production account, sync messages, ask “What needs my attention?”, generate a draft, edit it, and choose Review send. Verify that NOVA says nothing was sent.

## Known limitations

This iteration provides grounded retrieval chat, message intelligence, rich references, editable drafts, and the confirmation boundary. It does not yet execute live writes, persist multi-turn conversations, stream model tokens, discover dynamic Composio schemas, or render complete provider threads. Those capabilities are left behind a safe refusal rather than simulated as production-ready behavior.
