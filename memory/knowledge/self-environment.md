# My Environment
> Created: 2026-02-02 20:35 UTC
> Updated: 2026-02-02 20:35 UTC

## Runtime
- **Container**: Docker (openclaw-repo-openclaw-gateway-1)
- **OS**: Linux 6.8.0-1045-gcp (x64)
- **User**: node
- **Node**: v22.22.0
- **Python**: 3.x (stdlib only, no pip packages)

## Available CLI Tools
| Tool | Path | Notes |
|------|------|-------|
| git | /usr/bin/git | Can manage repos |
| curl | /usr/bin/curl | HTTP requests |
| wget | /usr/bin/wget | Downloads |
| python3 | /usr/bin/python3 | With sqlite3, csv, json, urllib |
| node | /usr/local/bin/node | Primary runtime |
| npm | /usr/local/bin/npm | Package manager |
| pnpm | /usr/local/bin/pnpm | Package manager (preferred) |
| gh | ~/.local/bin/gh | GitHub CLI, authenticated |

## NOT Available (may need installing)
- jq (JSON processor)
- sqlite3 CLI (but Python sqlite3 module works)
- docker CLI (running inside container)
- claude CLI
- gemini CLI

## Verified Capabilities
| Capability | Works? | Notes |
|-----------|--------|-------|
| Send email (self) | ✅ YES | nimbus→nimbus delivery confirmed 2026-02-02 20:46 UTC |
| Send email (external) | ❓ UNVERIFIED | Sent to zsolt@studio306.nl, he said not received |
| Check inbox (IMAP) | ✅ YES | check-email.js works, detects new mail |
| web_fetch | ✅ YES | Can fetch and extract web page content |
| web_search | ❌ NO | Missing Brave API key |
| Browser (sandbox) | ❌ NO | Sandbox browser not enabled |
| Browser (host) | ❓ UNTESTED | May work with target="host" |
| TTS English | ✅ YES | Edge TTS via built-in tts tool |
| TTS Hungarian | ✅ YES | Google Cloud TTS via Gemini API key |
| Audio transcription | ✅ YES | transcribe.js via Gemini API |
| Python + SQLite3 | ✅ YES | Available for structured data |
| Git | ✅ YES | Initialized workspace repo |
| GitHub CLI | ✅ YES | Authenticated as papperpopper, read + push to existing repos |
| GitHub repo creation | ❌ NO | PAT is fine-grained, no createRepository scope |
| Local git | ✅ YES | Workspace initialized as repo, commits work as timeline |

## APIs I Can Use
| API | Auth | Notes |
|-----|------|-------|
| Gemini | $GEMINI_API_KEY (set via env var) | Chat, embeddings, TTS, STT, vision |
| GitHub | gh CLI authenticated | papperpopper/nimbus repo |
| SMTP | nimbus@studio306.nl | Send emails via phantom.versanus.eu:465 |
| IMAP | nimbus@studio306.nl | Check emails via phantom.versanus.eu:993 |

## Key Paths
| Path | What |
|------|------|
| /home/node/.openclaw/workspace/ | My workspace (files load into context) |
| /home/node/.openclaw/openclaw.json | Gateway config |
| /home/node/.openclaw/media/inbound/ | Received media files |
| /app/src/ | OpenClaw source code (~50 directories) |
| /app/docs/ | OpenClaw documentation |
| /app/node_modules/ | Dependencies |

## Python SQLite3
Can create/use databases without installing anything:
```python
python3 -c "import sqlite3; db = sqlite3.connect('mydb.sqlite'); ..."
```
This is my database option for structured knowledge storage.

## Gemini API Access
Can call directly via Node.js https or curl:
- Endpoint: generativelanguage.googleapis.com
- Models: gemini-2.0-flash, gemini-pro, etc.
- Capabilities: chat, embeddings, code generation
- Can use for: research, web search (via grounding), heavy reading tasks

## Workspace Structure (as of 2026-02-02)
```
workspace/
├── AGENTS.md (196 lines) — operating instructions
├── SOUL.md (59 lines) — personality/behavior
├── MEMORY.md (140 lines) — long-term memory (loads every session)
├── TOOLS.md (106 lines) — tool-specific notes
├── IDENTITY.md (10 lines) — who I am
├── USER.md (36 lines) — who Zsolt is
├── HEARTBEAT.md (9 lines) — periodic check tasks
├── BOOTSTRAP.md — first-run ritual (should delete)
├── VM-STRUCTURE.md — VM file structure reference
├── check-email.js — IMAP inbox checker
├── send-email.js — SMTP email sender
├── transcribe.js — audio transcription via Gemini
├── screenshot.js — browser screenshot tool
├── data/accounting/ — financial data (CSV)
├── memory/ — daily logs + research notes
├── reference/ — THIS directory, my knowledge base
├── nimbus/ — monorepo (packages/voice, packages/chat)
└── nimbus-app/ — mobile app prototype
```
