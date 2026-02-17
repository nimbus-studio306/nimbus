# Nimbus Feature List

*Complete capabilities as of 2026-02-06*

---

## 1. Core Messaging (Built-in)

| Channel | Status | Mode |
|---------|--------|------|
| **WhatsApp Business** | ✅ Active | Two-way chat (+31651453590) |
| **Telegram** | ✅ Active | Bot (@Nimbus_clawbot) |
| **Web UI** | ✅ Active | nimbus.studio306.nl |
| **Signal** | ❌ Disabled | Config issues |
| **Discord** | ⏸️ Available | Not configured |

- Allowlist-based access control
- Multi-session isolation (DM vs group vs voice)
- Audio transcription (Gemini STT)
- Image analysis (vision models)

---

## 2. Voice Capabilities

| Feature | Provider | Notes |
|---------|----------|-------|
| **Voice Messages** | Gemini STT | Automatic transcription |
| **English TTS** | Edge TTS | MichelleNeural voice |
| **Hungarian TTS** | Google Cloud | hu-HU-Chirp3-HD-Aoede |
| **Real-time Voice Call** | Custom plugin | nimbus-app + voice-proxy |

### Voice Call UI (Custom)
- Browser-based WebSocket connection
- VAD (Voice Activity Detection) with adaptive threshold
- Streaming TTS (sentence-by-sentence)
- Dedicated session isolation

---

## 3. File & Code Operations (Built-in)

- **Read/Write/Edit** files in workspace
- **Shell execution** with background process management
- **Git integration** (commit, push to papperpopper/nimbus)
- **Code analysis** across languages

---

## 4. Web & Browser (Built-in)

| Tool | Status | Use |
|------|--------|-----|
| **web_search** | ✅ | Brave Search API |
| **web_fetch** | ✅ | URL → markdown extraction |
| **browser** | ⚠️ Blocked | Needs libxfixes3 install |

---

## 5. Database & Knowledge Graph (Custom)

### PostgreSQL + pgvector
- **Host:** Zsolt's Supabase VPS (81.0.107.97:5433)
- **Schema:** project_openclaw_nimbus

| Table | Purpose |
|-------|---------|
| `structured_sessions` | Conversation metadata |
| `structured_messages` | All messages with embeddings |
| `structured_tool_calls` | Tool usage tracking |
| `nodes` | Knowledge graph entities |
| `edges` | Entity relationships |
| `entity_aliases` | Name resolution ("Zsolti" → "Kallos Zsolti") |
| `emails` | Sent/received with embeddings |
| `content_tags` | Message categorization |
| `extraction_queue` | Entity extraction tracking |

### Real-time Sync
- **db-watcher.py** — monitors JSONL transcripts, syncs to DB
- **Embeddings** — Gemini embedding-001 (768 dims)

### Knowledge Graph
- **51 categories** across 3 vocabularies (OpenClaw, Projects, Dance)
- **31 entities** (people, projects, tools)
- **55 relationships** extracted
- **Semantic search** via pgvector cosine similarity

---

## 6. Email System (Custom)

| Feature | Implementation |
|---------|----------------|
| **Address** | nimbus@studio306.nl |
| **SMTP/IMAP** | phantom.versanus.eu (SSL) |
| **DKIM Signing** | RSA-SHA256, verified ✓ |
| **Inbox Check** | Cron every 30 min + on-demand |
| **DB Persistence** | All emails saved with embeddings |

Scripts: `check-email.js`, `send-email.js`, `save-email-to-db.py`

---

## 7. Automation (Built-in + Custom)

### Cron Jobs
- Email check (30 min, Haiku 4.5)
- Daily summary email (08:00 UTC)

### Heartbeat System
- Periodic self-check (configurable interval)
- HEARTBEAT.md task list
- Autonomous background work

### Memory System
- **MEMORY.md** — long-term curated knowledge
- **memory/*.md** — daily logs, research notes
- **memory_search** — semantic search across all memory files
- **graph-query.py** — knowledge graph queries

---

## 8. Installed CLI Tools

| Tool | Use |
|------|-----|
| ffmpeg | Audio/video conversion |
| yt-dlp | Media download |
| tesseract | OCR |
| pdftotext | PDF extraction |
| pandoc | Document conversion |
| sox | Audio processing |
| ripgrep | Fast text search |
| jq | JSON processing |
| sqlite3 | Local databases |

---

## 9. Python Libraries

- **pandas** — data analysis
- **pdfplumber** — PDF extraction
- **beautifulsoup4** — HTML parsing
- **pillow** — image manipulation
- **numpy** — numerical ops
- **psycopg2** — PostgreSQL
- **watchdog** — file monitoring

---

## 10. Infrastructure

| Component | Details |
|-----------|---------|
| **VM** | GCP e2-medium, us-central1-a |
| **OS** | Ubuntu 22.04 in Docker |
| **Domain** | nimbus.studio306.nl |
| **Tunnel** | Cloudflare + Zero Trust 2FA |
| **Model** | Claude Opus 4.5 (Anthropic) |
| **Embeddings** | Gemini embedding-001 |
| **Cost** | ~€25/month VM + API usage |

---

## 11. Custom Scripts

| Script | Purpose |
|--------|---------|
| `graph-extract.py` | Entity extraction from messages |
| `graph-query.py` | Knowledge graph search |
| `update-graph-context.py` | Refresh hot context |
| `transcribe.js` | Audio → text via Gemini |
| `cost-tracker.js` | API usage logging |
| `startup.sh` | Initialize db-watcher + batch jobs |

---

## 12. Workspace Files

| File | Purpose |
|------|---------|
| `SOUL.md` | Personality & behavior rules |
| `USER.md` | Zsolt's profile & contacts |
| `MEMORY.md` | Long-term knowledge |
| `TOOLS.md` | Local infrastructure notes |
| `HEARTBEAT.md` | Autonomous task list |
| `SESSIONS.md` | Active session index |
| `TODO.md` | Task tracking |
| `FEATURES.md` | This file |

---

## 13. Security & Rules

- **Message sending** — Never without explicit confirmation
- **Identity** — Never reveal AI on WhatsApp/Signal
- **Language** — English default, Hungarian when addressed in Hungarian
- **Channels** — Allowlist-only, owner IDs only
- **Config changes** — Always ask before gateway restart
- **External actions** — Ask before emails, tweets, public posts

---

## Summary

**Built-in OpenClaw:** 15+ tools (messaging, files, web, browser, cron, memory)  
**Custom additions:** Voice UI, PostgreSQL/pgvector, knowledge graph, email system, entity extraction  
**Total capabilities:** 50+ discrete features across infrastructure, automation, and intelligence
