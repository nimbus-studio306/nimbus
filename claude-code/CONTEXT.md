# Claude Code Context

## Database

Schema: `project_openclaw_nimbus` (PostgreSQL with pgvector 0.8.0)
Access: env vars `$DB_HOST`, `$DB_PORT`, `$DB_USER`, `$DB_PASSWORD`, `$DB_NAME`, `$DB_SCHEMA`

### Core Tables (19 total)

**Knowledge graph:**
- `nodes` (85 rows) — id, node_type, name, description, properties(jsonb), embedding(vector), importance, access_count, source_ref, created_at, updated_at, deleted_at, embedding_model
- `edges` (55 rows) — id, source_id→nodes, target_id→nodes, edge_type, properties(jsonb), weight, confidence, is_bidirectional, source_type, source_ref, valid_from, valid_until, context_timestamp, source_message_id, decision_text, blocker_reason, resolved_at, review_status, created_at, updated_at
- `entity_aliases` (28 rows) — id, canonical_node_id→nodes, alias, alias_normalized(UNIQUE), created_at
- `content_tags` (1,959 rows) — id, node_id→nodes, content_type, content_id, created_at

**Messages:**
- `structured_messages` (13,483 rows, 35MB) — id, session_id, raw_entry_id, entry_id, parent_entry_id, role, content_text, content_json(jsonb), has_thinking, has_tool_call, model_id, provider, tokens_in/out/cache_read/cache_write, cost_usd, stop_reason, created_at, embedding(vector), message_source, embedding_model
- `structured_sessions` (56 rows) — id, session_key, channel, session_type, context_summary, embedding(vector), embedding_model, created_at
- `structured_tool_calls` (5,067 rows)
- `raw_entries` (8,676 rows, 16MB) — raw JSONL archive

**Import/raw layer (still actively used by import scripts):**
- `messages` (has embedding+index) — import-sessions.py and import-structured.py write here, convert-to-structured.py reads from here
- `sessions` (has embedding+index) — same import pipeline as messages
- `category_nodes` (56 rows) — actively read by tag_batch.py for category lookups
- `tool_calls`, `notes` — minimal data

**Other:**
- `documents` (17 rows) — id, node_id→nodes, path, url, title, content, summary, mime_type, embedding(vector), metadata(jsonb), created_at, embedding_model
- `emails` (18 rows) — id, message_id(UNIQUE), direction, from/to/cc_addr, subject, body_text, body_html, is_html, embedding(vector), sent_at, created_at, embedding_model
- `memories` (24 rows) — id, node_id, content, category, importance, source, embedding(vector), metadata(jsonb), created_at, updated_at, embedding_model
- `extraction_queue` (200 rows) — id, message_id, status, entity_count, edge_count, error_text, processed_at, created_at
- `extraction_feedback` (0 rows) — edge_id→edges, original_confidence, human_verdict, correction_notes
- `extraction_log` — content_type, content_id, status, tags/categories/vocabularies created, error_message

### Graph State

- 85 nodes: 51 categories, 15 tools, 7 people (incl garbage: "I", "You", "Claude"), 5 projects, 3 vocabularies, 3 date_refs (garbage), 1 agent (Nimbus)
- 55 edges: 51 `contains` (taxonomy), 2 `uses`, 1 `works_on`, 1 `collaborates_with` — only 3 real relationship edges
- 1,959 content_tags linking messages to categories

### Embedding Status (pre-migration)

ALL embeddings are 768d and incompatible (mixed models in different vector spaces):
- structured_messages: 3,282 embedded (text-embedding-004, 768d), 10,201 missing
- nodes: 82 embedded (gemini-embedding-001 forced to 768d — DIFFERENT vector space)
- Everything else: text-embedding-004 at 768d

**Decision:** Clear all, re-embed with gemini-embedding-001 at native 3072d.
Vector columns were typed as `vector(768)` — ALTERed to `vector(3072)` in migration.

### API (Google Cloud, paid tier 1)

| Model | Purpose | RPM | TPM |
|-------|---------|-----|-----|
| `gemini-embedding-001` | Embeddings (3072d) | 3,000 | 1,000,000 |
| `gemini-3-flash-preview` | LLM extraction | 300 | — |

- `text-embedding-004` returns 404 (model not found) on this key
- Rate limits are per Google Cloud project, token bucket algorithm
- Input limit (embedding): 2048 tokens
- Vector indexes use `halfvec(3072)` cast (pgvector 0.8.0 caps native vector indexing at 2000d)
- Search queries must use `embedding::halfvec(3072) <=> query::halfvec(3072)`

## Key Scripts

| Script | Purpose | State |
|--------|---------|-------|
| db-watcher.py | Real-time JSONL→PostgreSQL sync | Updated: embedding, tagging, queue, extraction (every 30s, batch=10) |
| graph-extract.py | Entity extraction from messages | Updated: gemini-3-flash-preview, halfvec queries, robust JSON parsing, transient error retry |
| graph-query.py | Semantic search on nodes | Updated: halfvec(3072) queries |
| batch-embed.py | Bulk embed messages | Updated: gemini-embedding-001 |
| semantic-search.py | Cross-table semantic search | Updated: gemini-embedding-001 |
| save-email-to-db.py | Save sent emails with embedding | Updated: gemini-embedding-001 |
| import-to-db.py | Import knowledge docs | Updated: gemini-embedding-001 |
| import-sessions.py | Import session transcripts | Updated: gemini-embedding-001 |
| check-email.js | Check inbox (DKIM) | Node script |
| send-email.js | Send email (DKIM signed) | Node script |
| transcribe.js | Gemini STT for audio | Node script |
| taxonomy-gemini.py | Content tagging via Gemini | Python script |

Note: `github/openclaw/scripts/` copies still have old `text-embedding-004` refs — Nimbus manages that repo.

## Workspace Layout

```
/home/node/.openclaw/workspace/
├── docs/           — specs (entity-extraction-design.md, config-rollback-spec.md)
├── memory/         — daily notes (YYYY-MM-DD.md)
├── claude-code/    — Claude Code output folder
│   ├── db-migration-v1.sql         — Main migration (embedding clear, schema fixes)
│   ├── db-migration-v1-indexes.sql — Post-re-embed index creation
│   ├── batch-re-embed.py           — Re-embed all data at 3072d
│   ├── CONTEXT.md                  — This file
│   └── KNOWLEDGE-GRAPH-RESEARCH.md — 939-line analysis doc
├── plugins/        — voice-proxy plugin
├── github/         — cloned repos
├── MEMORY.md       — Nimbus's long-term memory (DON'T TOUCH)
├── TOOLS.md        — tool documentation
└── *.py, *.js      — operational scripts
```

## Migration Plan (3 steps, in order) — COMPLETED

1. **`db-migration-v1.sql`** — Adds embedding_model columns, clears all 768d embeddings, ALTERs vector(768)→vector(3072), drops all vector indexes, fixes FKs/duplicates, cleans artifacts, adds aliases/edges
2. **`batch-re-embed.py`** — Re-embeds all data at 3072d (3,435 rows: 79 nodes, 24 memories, 17 docs, 18 emails, 5 sessions, 3,292 messages)
3. **`db-migration-v1-indexes.sql`** — Creates HNSW indexes on halfvec(3072) cast for all 6 tables

## OpenClaw Plugin

The knowledge graph is exposed to agents via an OpenClaw extension plugin at `extensions/knowledge-graph/`.

**Tool name:** `knowledge_graph`

**Actions:**
- `search` — semantic vector search across nodes + messages
- `entity` — exact name/alias lookup with full relationship graph
- `relationships` — edge traversal for a given entity
- `categories` — category tag lookup by message ID or name

**Configuration:** All settings come from plugin config or environment variables. No hardcoded credentials or paths. See `extensions/knowledge-graph/README.md` for full config reference.

**Config example (in OpenClaw config.yml):**
```yaml
plugins:
  knowledge-graph:
    database:
      schema: my_schema  # or set DB_SCHEMA env var
    embedding:
      provider: gemini
      apiKeyEnv: GEMINI_API_KEY
    search:
      useHalfvec: true
```

## Pending Work

- [x] Run migration (3 steps above)
- [x] Add inline category tagging to db-watcher.py (regex-based, zero API cost)
- [x] Check graph-query.py — already on gemini-embedding-001, no changes needed
- [x] Entity→category linking in graph-extract.py (same_as + relates_to edges)
- [x] Add extraction queueing heuristic to db-watcher.py
- [x] Build OpenClaw plugin for agent graph access (`extensions/knowledge-graph/`)
- [ ] Process full extraction backlog (~2,000 messages pending)
- [ ] Enable plugin in Nimbus agent config

## 6 Behaviors to Bake Into System Code

1. Embed on ingest (every new message gets embedding immediately)
2. Tag on ingest (regex-based category tags, zero API cost)
3. Extraction with rate limiting and exponential backoff
4. Extract from ALL messages (not just user messages)
5. Alias resolution on entity creation
6. Write embedding_model on every embedding
