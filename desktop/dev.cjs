/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require("node:child_process");
const electron = require("electron");

const url = process.env.ATLAS_DESKTOP_URL || "http://localhost:3001";
let server;
async function ready() {
  try { return (await fetch(url, { signal: AbortSignal.timeout(1000) })).ok; } catch { return false; }
}
(async () => {
  if (!(await ready())) {
    server = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "dev"], { stdio: "inherit", env: process.env });
    for (let attempt = 0; attempt < 60 && !(await ready()); attempt += 1) await new Promise(resolve => setTimeout(resolve, 1000));
    if (!(await ready())) { console.error("Atlas development server did not start."); server.kill(); process.exit(1); }
  }
  const desktop = spawn(electron, ["desktop/main.cjs"], { stdio: "inherit", env: { ...process.env, ATLAS_DESKTOP_URL: `${url}/?desktop=1#chat`, ATLAS_IN_PROCESS_GPU: process.platform === "win32" ? "1" : process.env.ATLAS_IN_PROCESS_GPU } });
  desktop.on("exit", code => { if (server) server.kill(); process.exit(code ?? 0); });
})();
