# Nimbus

Personal AI assistant built with OpenClaw.

## Current Status

- ✅ Gmail OAuth2 + read access
- ✅ Gmail write access (create, update, delete emails)
- ✅ Gmail Pub/Sub notifications
- ✅ Email database persistence with embeddings
- ✅ Google Calendar read access
- ✅ Knowledge graph system
- 🚧 Gmail multi-account support (in progress)
- 🚧 Real-time voice transcription (research complete)
- 🚧 WhatsApp integration

## Quick Start

### Gmail Setup
```bash
cd /home/papperpictures/.openclaw/workspace
node scripts/email/gmail-search.js url
node scripts/email/gmail-search.js code <CODE>
```

### Gmail Search
```bash
node scripts/email/gmail-search.js search "from:daniel@speldansen.se"
node scripts/email/gmail-search.js get <messageId>
node scripts/email/gmail-search.js archive <messageId>
```

### Email Database
```bash
# Fetch emails from server
node scripts/email/check-email.js

# Save email to DB
python3 scripts/email/save-email-to-db.py <email.json>

# Real-time DB sync (background)
python3 scripts/database/db-watcher.py
```

## Documentation

- **MEMORY.md** — Long-term memory (keep this private)
- **TOOLS.md** — My tools and capabilities
- **AGENTS.md** — Workspace structure and rules
- **SOUL.md** — My persona and boundaries
- **USER.md** — About Zsolt
- **memory/** — Historical context and research
- **docs/** — Architecture and design docs

## Knowledge Graph

The knowledge graph has 11,000+ nodes and 16,700+ edges, tracking:
- People (friends, colleagues, clients)
- Projects (websites, apps, events)
- Tools (OpenClaw, plugins, scripts)
- Topics (dance, photography, AI)

Use `knowledge_graph` tool for semantic search or exact entity lookups.

## Email Routing

The Gmail router (`gmail-multi-router.js`) handles:
- Email polling (cron every 30 min)
- Gmail Pub/Sub notifications (real-time)
- Email saving to database
- Semantic email search

## Infrastructure

- **Host:** nimbus-vm (GCP VM, 4GB RAM, 2 vCPU)
- **Domain:** nimbus-cloud.studio306.nl (Cloudflare Tunnel)
- **Database:** Supabase PostgreSQL (81.0.107.97:5433)
- **Agents:** nimbus (main), deeper (sub-agent), agentmaster (Mac Studio M1 Max)

## License

Personal use only — Zsolt Szederkényi
