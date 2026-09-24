"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Provider = "gmail" | "outlook" | "linkedin";

type Source = {
  id: string;
  title: string;
  content: string;
  summary: string;
  sourceType: string;
  provider: string;
  accountLabel: string;
  canonicalUrl: string | null;
  labels: string[];
  occurredAt: number;
  updatedAt: number;
  summaryStrategy: string;
  modelCallCount: number;
};

type Connection = {
  id: string;
  provider: string;
  label: string;
  status: string;
  lastSyncAt: number | null;
};

type WorkspaceData = {
  user: { displayName: string; email: string };
  sources: Source[];
  connections: Connection[];
  briefing: string;
  budget: {
    summaryMode: string;
    dailyModelCallLimit: number;
    batchSize: number;
    onlyProcessChangedContent: boolean;
    modelCallsInView: number;
    unchangedItemsSkipped: number;
  };
};

const PROVIDERS: Array<{ id: Provider; name: string; mark: string; description: string; limit?: string }> = [
  { id: "gmail", name: "Gmail", mark: "G", description: "Read recent email and keep a compact, searchable copy in NOVA." },
  { id: "outlook", name: "Outlook", mark: "O", description: "Bring work mail into the same list with read-only access first." },
  { id: "linkedin", name: "LinkedIn", mark: "in", description: "Import approved profile or organization data available to your LinkedIn app.", limit: "Broader member and feed access requires LinkedIn approval." },
];

const SOURCE_TYPES = ["note", "email", "meeting", "linkedin", "research", "document"];

function formatDate(value: number | null) {
  if (!value) return "Not synced";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function WorkspaceClient({ user }: { user: { displayName: string; email: string } }) {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sourceType, setSourceType] = useState("note");
  const [saving, setSaving] = useState(false);
  const [busyProvider, setBusyProvider] = useState<Provider | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/nova/workspace", { cache: "no-store" });
      const payload = await response.json() as WorkspaceData & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Workspace unavailable.");
      setData(payload);
      setSelectedId((current) => current && payload.sources.some((source) => source.id === current) ? current : payload.sources[0]?.id ?? null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Workspace unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [load]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return data?.sources ?? [];
    return (data?.sources ?? []).filter((source) =>
      `${source.title} ${source.summary} ${source.content} ${source.labels.join(" ")}`.toLowerCase().includes(normalized),
    );
  }, [data, query]);
  const selected = filtered.find((source) => source.id === selectedId) ?? filtered[0] ?? null;

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/nova/workspace", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, content, sourceType }),
      });
      const payload = await response.json() as { id?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not save this item.");
      setTitle("");
      setContent("");
      setNotice("Saved permanently with a zero-call summary.");
      await load();
      if (payload.id) setSelectedId(payload.id);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save this item.");
    } finally {
      setSaving(false);
    }
  }

  async function connect(provider: Provider) {
    setBusyProvider(provider);
    setNotice("");
    try {
      const response = await fetch("/api/nova/connect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const payload = await response.json() as { redirectUrl?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || "Connection unavailable.");
      if (!payload.redirectUrl) throw new Error("The connection did not return a secure sign-in page.");
      window.location.assign(payload.redirectUrl);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Connection unavailable.");
      setBusyProvider(null);
    }
  }

  async function sync(provider: Provider) {
    setBusyProvider(provider);
    setNotice("");
    try {
      const response = await fetch("/api/nova/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const payload = await response.json() as { count?: number; modelCalls?: number; error?: string };
      if (!response.ok) throw new Error(payload.error || "Sync unavailable.");
      setNotice(`${payload.count ?? 0} items synchronized with ${payload.modelCalls ?? 0} model calls.`);
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Sync unavailable.");
    } finally {
      setBusyProvider(null);
    }
  }

  async function remove(source: Source) {
    if (!window.confirm(`Delete “${source.title}” from NOVA?`)) return;
    const response = await fetch(`/api/nova/workspace/${encodeURIComponent(source.id)}`, { method: "DELETE" });
    const payload = await response.json() as { error?: string };
    if (!response.ok) {
      setNotice(payload.error || "This item could not be deleted.");
      return;
    }
    setNotice("Item deleted.");
    await load();
  }

  async function copyBrief() {
    if (!data) return;
    await navigator.clipboard.writeText(data.briefing);
    setNotice("Brief copied.");
  }

  return <main className="library-shell">
    <header className="library-topbar">
      <Link href="/" className="library-brand">NOVA <span>knowledge workspace</span></Link>
      <div className="library-user"><span>{user.displayName}</span><small>{user.email}</small></div>
      <a href="/signout-with-chatgpt?return_to=%2F" target="_top" className="library-signout">Sign out</a>
    </header>

    <section className="library-hero">
      <div>
        <span className="eyebrow">Private · permanent · source linked</span>
        <h1>One place for the information that runs your day.</h1>
      </div>
      <div className="library-brief">
        <span>NOVA BRIEF</span>
        <p>{loading ? "Loading your private library…" : data?.briefing}</p>
        <button onClick={copyBrief} disabled={!data}>Copy brief</button>
      </div>
    </section>

    {notice && <div className="library-notice" role="status"><span>✦</span>{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}

    <section className="source-panel" aria-labelledby="source-heading">
      <div className="library-section-head">
        <div><span className="eyebrow">Connected sources</span><h2 id="source-heading">Bring accounts into NOVA</h2></div>
        <p>OAuth tokens stay with the connection broker. NOVA stores normalized, user-scoped records—not provider credentials.</p>
      </div>
      <div className="source-cards">
        {PROVIDERS.map((provider) => {
          const connection = data?.connections.find((item) => item.provider === provider.id);
          const connected = connection?.status === "active";
          return <article key={provider.id}>
            <div className="source-card-top"><i>{provider.mark}</i><span className={connected ? "live" : "pending"}>{connected ? "Connected" : connection ? "Finish sign-in" : "Not connected"}</span></div>
            <h3>{provider.name}</h3>
            <p>{provider.description}</p>
            {provider.limit && <small>{provider.limit}</small>}
            <footer>
              <span>{connection ? `Last sync: ${formatDate(connection.lastSyncAt)}` : "Read only to start"}</span>
              {connection ? <button onClick={() => sync(provider.id)} disabled={busyProvider === provider.id}>{busyProvider === provider.id ? "Working…" : "Sync now"}</button>
                : <button onClick={() => connect(provider.id)} disabled={busyProvider === provider.id}>{busyProvider === provider.id ? "Opening…" : "Connect"}</button>}
            </footer>
          </article>;
        })}
      </div>
    </section>

    <section className="capture-panel" aria-labelledby="capture-heading">
      <form onSubmit={save}>
        <div className="library-section-head compact">
          <div><span className="eyebrow">Quick capture</span><h2 id="capture-heading">Add anything worth remembering</h2></div>
          <p>Paste a meeting, email, research excerpt, or note. It stays in your account and receives an instant no-model summary.</p>
        </div>
        <div className="capture-fields">
          <label>Title <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Optional—NOVA can use the first line" maxLength={180} /></label>
          <label>Type <select value={sourceType} onChange={(event) => setSourceType(event.target.value)}>{SOURCE_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
        </div>
        <label className="capture-body">Information <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Paste the information you want NOVA to organize…" maxLength={20000} /></label>
        <div className="capture-footer"><span>{content.length.toLocaleString()} / 20,000 characters · summary cost: 0 model calls</span><button disabled={saving || !content.trim()}>{saving ? "Saving…" : "Save and summarize →"}</button></div>
      </form>

      <aside className="budget-card">
        <span className="eyebrow">Cost guardrail</span>
        <strong>{data?.budget.modelCallsInView ?? 0}</strong>
        <h3>model calls in this view</h3>
        <p>Efficient mode summarizes with deterministic code first. Unchanged content is reused, and future AI enhancement is batched and capped at {data?.budget.dailyModelCallLimit ?? 20} calls per day.</p>
        <dl><div><dt>Batch size</dt><dd>{data?.budget.batchSize ?? 25} items</dd></div><div><dt>Cache policy</dt><dd>Changed content only</dd></div><div><dt>Stored permanently</dt><dd>Cloudflare D1</dd></div></dl>
      </aside>
    </section>

    <section className="knowledge-panel" aria-labelledby="knowledge-heading">
      <div className="library-section-head">
        <div><span className="eyebrow">Your library</span><h2 id="knowledge-heading">Notes, summaries, and source lists</h2></div>
        <label className="library-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search saved information" /></label>
      </div>
      <div className="knowledge-grid">
        <div className="knowledge-list">
          <div className="knowledge-list-meta"><span>{filtered.length} items</span><button onClick={() => void load()}>Refresh</button></div>
          {loading ? <div className="library-empty">Loading your library…</div> : filtered.length ? filtered.map((source) => <button key={source.id} className={selected?.id === source.id ? "knowledge-row selected" : "knowledge-row"} onClick={() => setSelectedId(source.id)}>
            <span>{source.sourceType}</span><strong>{source.title}</strong><p>{source.summary}</p><small>{source.accountLabel} · {formatDate(source.updatedAt)}</small>
          </button>) : <div className="library-empty"><strong>No saved information yet.</strong><span>Capture a note above or connect a source.</span></div>}
        </div>
        <article className="knowledge-detail">
          {selected ? <>
            <div className="knowledge-detail-top"><span>{selected.provider} / {selected.sourceType}</span><button onClick={() => remove(selected)}>Delete</button></div>
            <h2>{selected.title}</h2>
            <div className="knowledge-summary"><span>✦ NOVA SUMMARY</span><p>{selected.summary}</p></div>
            {selected.labels.length > 0 && <div className="knowledge-tags">{selected.labels.map((label) => <span key={label}>{label}</span>)}</div>}
            <div className="knowledge-content"><span>Saved source</span><p>{selected.content || "No source excerpt was stored for this item."}</p></div>
            <footer><span>{selected.summaryStrategy} summary · {selected.modelCallCount} model calls</span>{selected.canonicalUrl && <a href={selected.canonicalUrl} target="_blank" rel="noreferrer">Open original ↗</a>}</footer>
          </> : <div className="library-empty"><strong>Select an item</strong><span>Its summary and saved source will appear here.</span></div>}
        </article>
      </div>
    </section>
  </main>;
}
