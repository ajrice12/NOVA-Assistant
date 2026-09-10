"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { answerPulse, buildPulseReport, type PulseWorkspace } from "@/lib/nova/pulse";

type PulseData = PulseWorkspace & {
  user: { displayName: string; email: string };
};

function formatReportTime(value: number | null) {
  if (!value) return "Needs action";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export default function NovaPulse() {
  const [open, setOpen] = useState(true);
  const [data, setData] = useState<PulseData | null>(null);
  const [signedIn, setSignedIn] = useState(true);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [lastChecked, setLastChecked] = useState<number | null>(null);

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

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 60_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [load]);

  const report = useMemo(() => data ? buildPulseReport(data) : null, [data]);

  async function checkEmail() {
    if (!data) return;
    const providers = data.connections
      .filter((connection) => ["gmail", "outlook"].includes(connection.provider) && connection.status === "active")
      .map((connection) => connection.provider);
    if (!providers.length) {
      setAnswer("Connect Gmail or Outlook before checking email.");
      return;
    }
    setChecking(true);
    let imported = 0;
    let failure = "";
    for (const provider of providers) {
      try {
        const response = await fetch("/api/nova/sync", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ provider }),
        });
        const payload = await response.json() as { count?: number; error?: string };
        if (!response.ok) throw new Error(payload.error || `${provider} could not be checked.`);
        imported += payload.count ?? 0;
      } catch (error) {
        failure = error instanceof Error ? error.message : "An email account could not be checked.";
      }
    }
    await load();
    setAnswer(failure || `${imported} email item${imported === 1 ? "" : "s"} checked. Routine reports used 0 model calls.`);
    setChecking(false);
  }

  function ask(event: FormEvent) {
    event.preventDefault();
    if (!data || !question.trim()) return;
    setAnswer(answerPulse(question, data));
    setQuestion("");
  }

  if (!open) {
    return <button className="nova-pulse-launcher" onClick={() => setOpen(true)} aria-label="Open NOVA Pulse reports">
      <span>✦</span><strong>NOVA</strong>{report?.badgeCount ? <b>{report.badgeCount}</b> : null}
    </button>;
  }

  return <aside className="nova-pulse" aria-label="NOVA Pulse reports">
    <header className="nova-pulse-head">
      <div><span>✦</span><strong>NOVA PULSE</strong><small>{lastChecked ? "Live" : "Starting"}</small></div>
      <button onClick={() => setOpen(false)} aria-label="Minimize NOVA Pulse">—</button>
    </header>

    <div className="nova-pulse-feed" aria-live="polite">
      {!signedIn ? <div className="nova-pulse-bubble assistant">
        <span>NOVA</span><p>Sign in to see private reports from your connected accounts.</p>
        <a href="/signin-with-chatgpt?return_to=%2Fworkspace" target="_top">Sign in →</a>
      </div> : loading && !data ? <div className="nova-pulse-bubble assistant"><span>NOVA</span><p>Checking your latest information…</p></div> : <>
        <div className="nova-pulse-bubble assistant">
          <span>NOVA</span><p>{data?.user.displayName ? `${data.user.displayName}, ${report?.headline?.toLowerCase()}` : report?.headline}</p>
        </div>
        {report?.items.map((item) => <article className={`nova-pulse-report ${item.tone}`} key={item.id}>
          <div><span>{item.provider}</span><time>{formatReportTime(item.updatedAt)}</time></div>
          <strong>{item.title}</strong>
          <p>{item.body}</p>
        </article>)}
        {answer && <div className="nova-pulse-bubble assistant"><span>NOVA</span><p>{answer}</p></div>}
      </>}
    </div>

    {signedIn && <>
      <div className="nova-pulse-actions">
        <button onClick={() => void checkEmail()} disabled={checking || !data}>{checking ? "Checking…" : "Check email"}</button>
        <button onClick={() => void load()} disabled={loading}>Refresh reports</button>
      </div>
      <form className="nova-pulse-form" onSubmit={ask}>
        <label htmlFor="nova-pulse-question">Ask about your updates</label>
        <div><input id="nova-pulse-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="What changed?" /><button disabled={!data || !question.trim()} aria-label="Ask NOVA">↑</button></div>
      </form>
      <footer>Routine reports · 0 model calls</footer>
    </>}
  </aside>;
}
