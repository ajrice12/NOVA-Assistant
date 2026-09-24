import { AppLogo, providerNames } from "./app-logo";
import { Icon } from "./icon";
import { connectionStatus, relativeTime, PROVIDERS, type Connection, type Provider } from "@/lib/atlas/workspace";

export function ConnectedCluster({ connections, restoring, syncing, onOpen }: { connections: Connection[]; restoring: boolean; syncing: string[]; onOpen: () => void }) {
  return <div className="connected-cluster"><span>{restoring ? "Restoring connections" : "Your connected apps"}</span><div>
    {connections.length ? connections.slice(0, 5).map(c => <button key={c.id} onClick={onOpen} className={`connected-icon ${syncing.includes(c.provider) ? "is-syncing" : ""}`} aria-label={`${c.label}: ${restoring ? "verifying" : connectionStatus(c.status)}`} title={`${c.label} · ${restoring ? "Verifying connection" : connectionStatus(c.status)} · Last sync: ${relativeTime(c.lastSyncAt)}`}><AppLogo provider={c.provider} /><i data-status={restoring ? "connecting" : connectionStatus(c.status)} /></button>) : <button onClick={onOpen} className="connected-icon" title="Connect an app" aria-label="Connect an app"><Icon name="plus" /></button>}
    {connections.length > 5 && <button onClick={onOpen} className="text-button">+{connections.length - 5}</button>}
  </div></div>;
}
export function ConnectedApps({ connections, restoring, syncing, errors, onConnect, onSync, busy }: { connections: Connection[]; restoring: boolean; syncing: string[]; errors: Record<string, string>; onConnect: (p: Provider) => void; onSync: (p: Provider) => void; busy?: string | null }) {
  return <div className="apps-page"><p className="eyebrow">Connected to your world</p><h1>Atlas works where you do.</h1><p className="page-intro">Your apps bring the context. You stay in control of every action.</p>
    <div className="integration-list">{PROVIDERS.map(p => {
      const c = connections.find(item => item.provider === p.id);
      const status = connectionStatus(c?.status);
      const isSyncing = syncing.includes(p.id);
      return <section className="integration-row" key={p.id}><div className="integration-logo"><AppLogo provider={p.id} size={32} /></div><div className="integration-copy"><h2>{p.name}</h2><p>{p.description}</p><div className="integration-meta"><span className="connection-label" data-status={status}>{restoring ? "Checking connection…" : isSyncing ? "Syncing…" : status === "connected" ? "Connected" : status === "attention" ? "Needs attention" : status === "connecting" ? "Finish sign-in" : status === "error" ? "Connection unavailable" : "Not connected"}</span>{c?.lastSyncAt && <span>Synced {relativeTime(c.lastSyncAt)}</span>}</div>{errors[p.id] && <small className="error-text">{errors[p.id]}</small>}
      {c && <details className="connection-details"><summary>Connection details</summary><p>{c.label}</p><p>Capabilities: {p.id === "gmail" ? "Read · Draft · Send with confirmation · Move to Trash with confirmation" : "Read approved information"}</p><p>Last sync: {c.lastSyncAt ? new Date(c.lastSyncAt).toLocaleString() : "Not synced yet"}</p></details>}</div>
      {status === "connected" ? <button className="secondary" disabled={restoring || isSyncing || busy === p.id} onClick={() => onSync(p.id)}><Icon name="refresh" size={16} />{isSyncing ? "Syncing" : "Sync now"}</button> : <button className="secondary" disabled={restoring || busy === p.id} onClick={() => onConnect(p.id)}>{busy === p.id ? "Opening…" : status === "attention" || status === "error" ? "Reconnect" : status === "connecting" ? "Finish sign-in" : "Connect"}<Icon name="arrow" size={16} /></button>}</section>;
    })}</div>
    <section className="available-apps"><h2>More of your workspace</h2><p>These providers are in the connector catalog. Live connection support has not been configured yet.</p><div>{["slack", "teams", "calendar", "drive", "notion", "github"].map(p => <span key={p}><AppLogo provider={p} size={24} />{providerNames[p]}<small>Not configured</small></span>)}</div></section>
  </div>;
}
