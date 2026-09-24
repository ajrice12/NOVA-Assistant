"use client";

import { useEffect, useState } from "react";

export default function LocalSignInPage() {
  const [status, setStatus] = useState("Starting a secure local demonstration session…");

  useEffect(() => {
    const returnTo = new URLSearchParams(window.location.search).get("return_to") || "/workspace";
    void fetch("/api/nova/dev-session", { method: "POST" })
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json() as { error?: string }).error || "Local sign-in is unavailable.");
        window.location.replace(returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/workspace");
      })
      .catch((error: unknown) => setStatus(error instanceof Error ? error.message : "Local sign-in failed."));
  }, []);

  return <main className="local-signin"><div className="local-signin-card"><span>✦ NOVA</span><div className="local-signin-orbit" aria-hidden="true"><i /><b>N</b></div><h1>Activating this device</h1><p>{status}</p><small>This localhost-only session cannot activate in production or access an external account.</small></div></main>;
}
