# VM (nimbus-vm) Script System Audit

**Created:** 2026-02-19  
**Updated:** 2026-02-20  
**Status:** ✅ MIGRATION COMPLETE

---

## Executive Summary

### ✅ RESOLVED (2026-02-20)

All scripts have been:
1. **Reorganized** into category folders under `scripts/`
2. **Fixed** — all `/home/node/` paths updated to `/home/papperpictures/`
3. **Validated** — syntax checked (py_compile, node --check)
4. **Old copies deleted** — root workspace is clean

See `/home/papperpictures/.openclaw/workspace/scripts/MIGRATION-LOG.md` for full details.

---

## Historical Context (Pre-Migration)

**Good News:** All scripts were in ONE location (`~/.openclaw/workspace/`) — no duplicates in agent workspaces.

**Bad News (FIXED):** Many scripts had **hardcoded `/home/node/` paths** which were WRONG. The VM username is `papperpictures`, not `node`. These scripts were copied from Docker environment and have now been corrected.

---

## Script Location

| Location | Script Count |
|----------|-------------|
| `~/.openclaw/workspace/` (main) | 55 scripts |
| `~/.openclaw/agents/*/workspace/` (agents) | 0 scripts ✅ |

**No duplicates.** All scripts are centralized in the main workspace.

---

## Script Categories

### ✅ ACTIVELY USED & WORKING

These scripts are called by systemd, mentioned in TOOLS.md, or have correct paths:

| Script | Called By | Paths |
|--------|-----------|-------|
| `db-watcher.py` | systemd service | ✅ Correct (`/home/papperpictures/`) |
| `batch-embed.py` | TOOLS.md, env vars | ✅ Uses env vars |
| `graph-extract.py` | db-watcher.py import | ✅ Uses env vars |
| `graph-query.py` | TOOLS.md | ✅ Uses env vars |
| `send-email.js` | TOOLS.md | ✅ Correct paths |
| `gmail-multi-router.js` | TOOLS.md | ✅ Correct paths |
| `google-tts.sh` | TOOLS.md | ✅ Uses env vars |
| `save-email-to-db.py` | send-email.js | ✅ Uses env vars |
| `db-watcher-host.py` | unused? | ✅ Correct paths |
| `google-calendar-auth.js` | manual | ✅ Correct paths |

### ⚠️ HAVE WRONG PATHS (`/home/node/` instead of `/home/papperpictures/`)

These scripts would FAIL if run because they reference `/home/node/`:

| Script | Wrong Path References |
|--------|----------------------|
| `batch-taxonomy.py` | `/home/node/.openclaw/workspace/taxonomy-extract.py` |
| `daily-extract.py` | `/home/node/.openclaw/workspace/graph-extract.py` |
| `fetch-attachment.py` | `/home/node/.openclaw/workspace/attachments` |
| `import-missing-messages.py` | `/home/node/.openclaw/agents/default/sessions/` |
| `import-sessions.py` | `/home/node/.openclaw/agents/default/sessions` |
| `import-structured.py` | `/home/node/.openclaw/agents/default/sessions` |
| `sync-to-db.py` | `/home/node/.openclaw/agents/default/sessions` |
| `update-graph-context.py` | `/home/node/.openclaw/workspace/memory/` |
| `check-email.js` | `/home/node/.openclaw/workspace/` |
| `cost-tracker.js` | `/home/node/.openclaw/agents/default/sessions` |
| `email-triage.js` | `/home/node/.openclaw/workspace/` |
| `gmail-search.js` | `/home/node/.openclaw/credentials/` |
| `screenshot.js` | `/home/node/.openclaw/workspace/memory/screenshots` |
| `voice-proxy.js` | `/home/node/.openclaw/openclaw.json` |
| `startup.sh` | `/home/node/.openclaw/workspace` |
| `check-email-priority.sh` | needs checking |
| `gog-send.sh` | needs checking |

### 🗄️ OLD/EXPERIMENTAL (Probably Not Used)

These appear to be experiments or old versions:

| Script | Notes |
|--------|-------|
| `taxonomy-feb3.py` | Old experiment |
| `taxonomy-feb3-v2.py` | Old experiment |
| `taxonomy-feb4.py` | Old experiment |
| `taxonomy-feb4-v2.py` | Old experiment |
| `taxonomy-feb4-batch.py` | Old experiment |
| `taxonomy-feb4-fast.py` | Old experiment |
| `taxonomy-feb4-final.py` | Old experiment |
| `taxonomy-feb4-simple.py` | Old experiment |
| `taxonomy-gemini.py` | Old experiment |
| `taxonomy-extract.py` | Old experiment |
| `taxonomy_extract_feb5.py` | Old experiment |
| `batch-taxonomy.py` | Old experiment |
| `tag_batch.py` | Old experiment |
| `tag_batch4.py` | Old experiment |
| `tag_messages.py` | Old experiment |
| `daily-extract.py` | Old/unused |
| `convert-to-structured.py` | One-time migration? |
| `import-to-db.py` | One-time migration? |

### ❓ UNCLEAR STATUS

| Script | Notes |
|--------|-------|
| `graph-extractor.js` | JS version of graph-extract.py? |
| `gmail-router.js` | Older version of gmail-multi-router.js? |
| `db.js` | Utility library? |
| `storage.js` | Supabase utility? |
| `log-api-cost.js` | Cost logging utility? |
| `ns-trip.js` | NS train trip script? |
| `semantic-search.py` | Standalone search? |
| `backfill-embeddings.py` | One-time backfill? |
| `transcribe-youtube.py` | YouTube transcription? |
| `generate-lorem-pdf.sh` | Test file generator? |

---

## Dependency Graph

```
systemd
  └── db-watcher.py
        ├── imports graph-extract.py (via importlib)
        └── writes to PostgreSQL (via env vars)

TOOLS.md references:
  ├── graph-query.py → PostgreSQL
  ├── graph-extract.py → PostgreSQL
  ├── update-graph-context.py → memory/graph-context.md
  ├── send-email.js
  │     └── calls save-email-to-db.py
  ├── google-tts.sh → Google Cloud TTS API
  ├── gmail-multi-router.js → gog CLI
  └── batch-embed.py → PostgreSQL

startup.sh (BROKEN - wrong paths):
  ├── db-watcher.py
  ├── batch-embed.py
  └── gmail-multi-router.js
```

---

## Hook System

| File | Location | Status |
|------|----------|--------|
| `gmail-filter.mjs` | `~/.openclaw/gmail-filter.mjs` | Simple version (569 bytes) |
| `gmail-filter.mjs` | `~/.openclaw/hooks/transforms/gmail-filter.mjs` | Full version (2332 bytes) with newsletter filtering |

**Which is used?** openclaw.json references `"module": "gmail-filter.mjs"` (relative), so it uses `~/.openclaw/hooks/transforms/gmail-filter.mjs`.

---

## What's Actually Working

Based on systemd and correct paths:

1. **db-watcher.py** - Running via systemd, correct paths ✅
2. **graph-extract.py** - Called by db-watcher, uses env vars ✅
3. **graph-query.py** - Manual use, uses env vars ✅
4. **batch-embed.py** - Uses env vars ✅
5. **send-email.js** - Correct paths ✅
6. **save-email-to-db.py** - Uses env vars ✅
7. **gmail-multi-router.js** - Correct paths ✅
8. **google-tts.sh** - Uses env vars ✅

---

## What's Broken

1. **startup.sh** - Has `/home/node/` hardcoded, won't work
2. **check-email.js** - Has `/home/node/` hardcoded
3. **update-graph-context.py** - Has `/home/node/` hardcoded
4. **cost-tracker.js** - Has `/home/node/` hardcoded
5. **All import-*.py scripts** - Reference `/home/node/` and `agents/default`
6. Many other scripts with wrong paths

---

## Recommendations

### Immediate (Critical)

1. **Fix startup.sh** - Change `/home/node/` to `/home/papperpictures/`
2. **Fix update-graph-context.py** - Currently outputs to wrong location
3. **Fix check-email.js** - If being used for email polling

### Medium Priority

4. **Archive old taxonomy scripts** - Move to `archive/` folder
5. **Delete or fix unused scripts** - import-*.py, sync-to-db.py, etc.
6. **Remove duplicate gmail-filter.mjs** - Keep only the hooks/transforms version

### Low Priority (Cleanup)

7. **Organize scripts into folders** - Same structure as Mac Studio plan
8. **Standardize path handling** - Use env vars instead of hardcoded paths
9. **Remove truly unused scripts** - After confirming they're not needed

---

## Why This Happened

The scripts appear to have been copied from a different environment where:
- Username was `node` (possibly a Docker container or different VM)
- Agent was named `default` instead of `nimbus`

Some scripts were updated to work on the current VM (the critical ones like db-watcher.py, send-email.js), but many were left with old paths.

---

## Next Steps

1. **DO NOT run startup.sh** - It will fail
2. **Confirm which scripts are actually needed**
3. **Fix paths in needed scripts**
4. **Archive/delete unused scripts**
5. **Then organize into proper folder structure**

---

## Files Reference

### Scripts with CORRECT `/home/papperpictures/` paths:
- db-watcher.py
- db-watcher-host.py
- gmail-multi-router.js
- google-calendar-auth.js
- send-email.js

### Scripts using environment variables (path-agnostic):
- batch-embed.py
- graph-extract.py
- graph-query.py
- save-email-to-db.py
- google-tts.sh

### Scripts with WRONG `/home/node/` paths (17 files):
- batch-taxonomy.py
- daily-extract.py
- fetch-attachment.py
- import-missing-messages.py
- import-sessions.py
- import-structured.py
- sync-to-db.py
- update-graph-context.py
- check-email.js
- cost-tracker.js
- email-triage.js
- gmail-search.js
- screenshot.js
- voice-proxy.js
- startup.sh
- check-email-priority.sh
- gog-send.sh
