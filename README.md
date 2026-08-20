# NOVA — Work Intelligence

NOVA is a desktop-first AI command-center prototype for bringing email, calendars, files, and work apps into one calm workspace.

The current public version demonstrates:

- a morning briefing and daily schedule
- live device time and timezone
- automatic network-based geographic calibration with optional precise movement updates
- current weather plus a three-day forecast
- local and national headline feeds matched to the current region
- a unified inbox with priorities and categories
- AI-style thread summaries and suggested next actions
- search, filtering, archive, completion, and command interactions
- responsive desktop and mobile layouts
- an optional Windows startup launcher

> The inbox preview uses demonstration data and is labeled in the interface. Calendar events remain empty until a real account is authorized. The browser contacts regional data providers directly and falls back to approximate network location when precise browser access is blocked; device location is not written to NOVA's database.

## Live demo

[Open NOVA](https://nova-work-intelligence.ajrice444601.chatgpt.site)

## Run locally

Requirements: Node.js 22.13 or later.

```powershell
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Production build

```powershell
npm run build
npm start
```

## Open NOVA automatically on Windows

Run the installer once from PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-startup.ps1
```

At future Windows sign-ins, a hidden launcher waits until the hosted NOVA site is reachable and opens it in the default browser. To disable it, remove `NOVA Work Intelligence.vbs` from the current user's Startup folder.

## Roadmap

1. Secure OAuth connections for Outlook and Gmail
2. Calendar, Drive, Slack, and task-system connectors
3. Retrieval-augmented search over approved work content
4. Action approvals, audit history, and user-controlled memory
5. Optional packaged Windows desktop shell and voice interface

## Technology

React 19, TypeScript, Tailwind CSS, Vinext, Vite, and Cloudflare Workers-compatible output.
