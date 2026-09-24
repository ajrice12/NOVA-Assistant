"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { answerPulse, buildPulseReport, type PulseWorkspace } from "@/lib/nova/pulse";

type SyncProvider = "gmail" | "outlook" | "linkedin";

type PulseData = PulseWorkspace & {
  user: { displayName: string; email: string };
};

type ChatReference = { id: string; title: string; source: string; summary: string; priority: string; why: string; requiresResponse: boolean; canonicalUrl?: string };
type Draft = { recipient: string; subject: string; tone: string; body: string };

const AUTO_SYNC_PRIORITY: readonly SyncProvider[] = ["gmail", "outlook", "linkedin"];
const EMAIL_PROVIDERS: readonly SyncProvider[] = ["gmail", "outlook"];
const AUTO_SYNC_INTERVAL_MS = 10 * 60_000;

function providerName(provider: SyncProvider) {
  return provider === "gmail" ? "Gmail" : provider === "outlook" ? "Outlook" : "LinkedIn";
}

function formatReportTime(value: number | null) {
  if (!value) return "Needs action";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export default function NovaPulse() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<PulseData | null>(null);
  const [signedIn, setSignedIn] = useState(true);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [references, setReferences] = useState<ChatReference[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const automaticSyncInFlight = useRef(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/nova/workspace", { cache: "no-store" });
      if (response.status === 401) {
        setSignedIn(false);
        setData(null);
        return;
      }
      const payload = await response.json() as PulseData & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Reports are temporarily unavailable.");
      setSignedIn(true);
      setData(payload);
      setLastChecked(Date.now());
    } catch {
      setAnswer("I could not refresh reports just now. Try again shortly.");
    } finally {
      setLoading(false);
    }
  }, []);

  const syncProvider = useCallback(async (provider: SyncProvider) => {
    const response = await fetch("/api/nova/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    const payload = await response.json() as { count?: number; error?: string };
    if (!response.ok) throw new Error(payload.error || `${providerName(provider)} could not be checked.`);
    return payload.count ?? 0;
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 60_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [load]);

  useEffect(() => {
    if (!signedIn || !data || automaticSyncInFlight.current) return;
    if (data.user.email.endsWith("@nova.dev")) return;
    const provider = AUTO_SYNC_PRIORITY.find((candidate) =>
      data.connections.some((connection) => connection.provider === candidate && connection.status === "active"),
    );
    if (!provider) return;

    const key = `nova-pulse:last-auto-sync:${data.user.email}:${provider}`;
    let lastAutomaticSync = 0;
    try {
      lastAutomaticSync = Number(window.localStorage.getItem(key) ?? 0);
    } catch {
      // A privacy-restricted browser can still perform the in-memory check.
    }
    if (Date.now() - lastAutomaticSync < AUTO_SYNC_INTERVAL_MS) return;

    const automaticSync = window.setTimeout(() => {
      automaticSyncInFlight.current = true;
      try {
        window.localStorage.setItem(key, String(Date.now()));
      } catch {
        // Persistence is an optimization; the read-only sync still works without it.
      }
      setChecking(true);
      setAnswer(`Checking ${providerName(provider)} and preparing your login notes…`);
      void syncProvider(provider)
        .then(async (count) => {
          await load();
          setAnswer(count
            ? `${count} recent ${providerName(provider)} item${count === 1 ? "" : "s"} checked, summarized, and saved as notes.`
            : `${providerName(provider)} is connected. I found no recent items to add.`);
        })
        .catch(() => {
          setAnswer(`I could not refresh ${providerName(provider)} just now, so I am showing your last saved reports.`);
        })
        .finally(() => {
          setChecking(false);
          automaticSyncInFlight.current = false;
        });
    }, 0);
    return () => window.clearTimeout(automaticSync);
  }, [data, load, signedIn, syncProvider]);

  const report = useMemo(() => data ? buildPulseReport(data) : null, [data]);

  async function checkEmail() {
    if (!data) return;
    if (data.user.email.endsWith("@nova.dev")) {
      setAnswer("Local demonstration data is already loaded. Connect a real account in the hosted NOVA workspace for live sync.");
      return;
    }
    const providers = EMAIL_PROVIDERS.filter((provider) =>
      data.connections.some((connection) => connection.provider === provider && connection.status === "active"),
    );
    if (!providers.length) {
      setAnswer("Connect Gmail or Outlook before checking email.");
      return;
    }
    setChecking(true);
    let imported = 0;
    let failure = "";
    for (const provider of providers) {
      try {
        imported += await syncProvider(provider);
      } catch (error) {
        failure = error instanceof Error ? error.message : "An email account could not be checked.";
      }
    }
    await load();
    setAnswer(failure || `${imported} email item${imported === 1 ? "" : "s"} checked. Routine reports used 0 model calls.`);
    setChecking(false);
  }

  async function ask(event: FormEvent) {
    event.preventDefault();
    if (!data || !question.trim()) return;
    const prompt = question;
    setQuestion("");
    setChecking(true);
    setAnswer("Reviewing your connected workspace…");
    try {
      const response = await fetch("/api/nova/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: prompt, page: window.location.pathname }) });
      const payload = await response.json() as { text?: string; references?: ChatReference[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "NOVA could not answer that.");
      setAnswer(payload.text || answerPulse(prompt, data));
      setReferences(payload.references ?? []);
    } catch (error) {
      setAnswer(error instanceof Error ? error.message : answerPulse(prompt, data));
      setReferences([]);
    } finally {
      setChecking(false);
    }
  }

  async function createDraft(reference: ChatReference) {
    setChecking(true);
    try {
      const response = await fetch("/api/nova/draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ senderName: reference.title, subject: reference.title, body: reference.summary, tone: "professional" }) });
      const payload = await response.json() as Draft & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Draft unavailable.");
      setDraft(payload);
      setAnswer("I prepared a draft. Review and edit it below—nothing has been sent.");
    } catch (error) { setAnswer(error instanceof Error ? error.message : "Draft unavailable."); }
    finally { setChecking(false); }
  }

  if (!open) {
    return <button className="nova-pulse-launcher" onClick={() => setOpen(true)} aria-label="Open NOVA Pulse reports">
      <span>✦</span><strong>NOVA</strong><small>Open assistant</small>{report?.badgeCount ? <b>{report.badgeCount}</b> : null}
    </button>;
  }

  return <aside className="nova-pulse" aria-label="NOVA AI side panel">
    <header className="nova-pulse-head">
      <div><span>✦</span><strong>NOVA</strong><small>{lastChecked ? "Connected" : "Activating"}</small></div>
      <button onClick={() => setOpen(false)} aria-label="Dock NOVA to the screen edge">›</button>
    </header>
    <nav className="nova-pulse-tabs" aria-label="NOVA views"><button className="active">Assistant</button><button onClick={() => setAnswer("Your priority brief is shown below.")}>Brief</button><a href="/workspace">Workspace</a></nav>

    <div className="nova-pulse-feed" aria-live="polite">
      {!signedIn ? <div className="nova-pulse-bubble assistant">
        <span>NOVA</span><p>Sign in to see private reports from your connected accounts.</p>
        <a href="/signin-with-chatgpt?return_to=%2Fworkspace" target="_top">Sign in →</a>
      </div> : loading && !data ? <div className="nova-pulse-bubble assistant"><span>NOVA</span><p>Checking your latest information…</p></div> : <>
        <div className="nova-pulse-bubble assistant hero">
          <span>READY WHEN YOU ARE</span><p>{data?.user.displayName ? `${data.user.displayName}, ${report?.headline?.toLowerCase()}` : report?.headline}</p>
        </div>
        {report?.items.map((item) => <article className={`nova-pulse-report ${item.tone}`} key={item.id}>
          <div><span>{item.provider}</span><time>{formatReportTime(item.updatedAt)}</time></div>
          <strong>{item.title}</strong>
          <p>{item.body}</p>
        </article>)}
        {answer && <div className="nova-pulse-bubble assistant"><span>NOVA</span><p>{answer}</p></div>}
        {references.map((item) => <article className={`nova-reference ${item.priority}`} key={item.id}>
          <div><span>{item.source}</span><b>{item.priority}</b></div><strong>{item.title}</strong><p>{item.summary}</p><small>{item.why}</small>
          <footer>{item.canonicalUrl ? <a href={item.canonicalUrl} target="_blank" rel="noreferrer">View</a> : null}{item.requiresResponse ? <button onClick={() => void createDraft(item)}>Draft reply</button> : null}</footer>
        </article>)}
        {draft ? <article className="nova-draft"><header><span>DRAFT · {draft.tone}</span><b>Not sent</b></header><input aria-label="Draft subject" value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })}/><textarea aria-label="Draft response" value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })}/><footer><button onClick={() => setDraft(null)}>Cancel</button><button onClick={() => setAnswer("Sending requires a connected write-capable account and a separate confirmation. Nothing was sent.")}>Review send</button></footer></article> : null}
      </>}
    </div>

    {signedIn && <>
      <div className="nova-suggestions"><button onClick={() => setQuestion("What needs my attention?")}>What needs attention?</button><button onClick={() => setQuestion("Show messages waiting on me")}>Waiting on me</button><button onClick={() => setQuestion("Summarize recruiting messages")}>Recruiting</button></div>
      <div className="nova-pulse-actions">
        <button onClick={() => void checkEmail()} disabled={checking || !data}>{checking ? "Checking…" : "Check email"}</button>
        <button onClick={() => void load()} disabled={loading}>Refresh reports</button>
      </div>
      <form className="nova-pulse-form" onSubmit={ask}>
        <label htmlFor="nova-pulse-question">Ask about your updates</label>
        <div><input id="nova-pulse-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What changed?" /><button disabled={!data || !question.trim()} aria-label="Ask NOVA">↑</button></div>
      </form>
      <footer>Grounded in connected sources · external actions require confirmation</footer>
    </>}
  </aside>;
}
