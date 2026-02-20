# Knowledge Graph Research: Making It Actually Work

**Date:** 2026-02-06
**Researcher:** Claude Code (Opus 4.6)
**Scope:** Full system analysis, gap identification, unified design, implementation plan

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Gap Analysis](#2-gap-analysis)
3. [Root Cause Analysis](#3-root-cause-analysis)
4. [Unified System Design](#4-unified-system-design)
5. [Schema Changes](#5-schema-changes)
6. [The Unified Query Engine](#6-the-unified-query-engine)
7. [Automatic Enrichment Pipeline](#7-automatic-enrichment-pipeline)
8. [Document Integration](#8-document-integration)
9. [Implementation Plan](#9-implementation-plan)
10. [Migration Strategy](#10-migration-strategy)

---

## 1. Current State Assessment

### Database Inventory (as of 2026-02-06)

| Table | Rows | Purpose | Health |
|-------|------|---------|--------|
| structured_messages | 13,483 | All conversation messages | Active, 24% embedded |
| structured_sessions | 56 | Conversation sessions | Active |
| structured_tool_calls | 5,067 | Tool invocation records | Active |
| nodes | 85 | Graph entities | Sparse (mostly taxonomy) |
| edges | 55 | Relationships | 52/55 are taxonomy `contains` |
| content_tags | 1,959 | Message-to-category links | 8.8% of messages tagged |
| entity_aliases | 28 | Name resolution | Thin coverage |
| extraction_queue | 200 | Extraction job tracking | 130 pending, 6 rate-limited |
| documents | 17 | Research doc embeddings | All embedded, none linked to graph |
| memories | 24 | Core memories from MEMORY.md | 23/24 embedded |
| emails | 18 | Email archive | All embedded |
| category_nodes | 56 | Legacy category table | Partially overlaps with nodes |
| raw_entries | 8,676 | Raw JSONL archive | Reference only |

### Graph Composition

```
Nodes (85):
  51 categories  ── the taxonomy tree
  15 tools       ── extracted but mostly disconnected
   7 people      ── includes artifacts ("I", "You", "Claude claude-opus-4-5")
   5 projects    ── extracted but barely connected
   3 vocabularies ── taxonomy roots
   3 date_refs   ── extraction artifacts
   1 agent       ── Nimbus (0 edges)

Edges (55):
  51 contains     ── vocabulary/category hierarchy
   2 uses         ── OpenClaw→Cloudflare, OpenClaw→PostgreSQL
   1 works_on     ── Zsolt→GPU Fleet
   1 collaborates_with ── Zsolt→Kallos Zsolti
```

### What Exists and Works

1. **Taxonomy tree** is well-structured: 3 vocabularies → subcategories → leaf categories
2. **1,959 content_tags** link messages to categories (regex-based tagging)
3. **Embedding infrastructure** exists: pgvector indexes, Gemini API integration
4. **Entity extraction script** (`graph-extract.py`) is functional but barely used
5. **Semantic search** (`semantic-search.py`) searches across 4 tables
6. **Real-time ingestion** (`db-watcher.py`) syncs conversations to database
7. **17 research documents** are embedded and searchable

### What Doesn't Work

1. **The graph is almost empty** — 3 real relationship edges out of 55 total
2. **91% of messages are invisible** to the knowledge graph (no tags)
3. **76% of messages lack embeddings** (semantic search can't find them)
4. **Documents aren't linked** to the graph (all have `node_id = NULL`)
5. **Entity extraction is stalled** — rate-limited, slow, batch-only
6. **No unified query** — vector search and graph traversal are separate scripts
7. **No automatic enrichment** — extraction runs daily at best, manually at worst
8. **Duplicate entity problem** — "Claude" is both a category and a tool node; "I" and "You" are person nodes
9. **Two embedding models** in use (`gemini-embedding-001` and `text-embedding-004`) — different vector spaces

---

## 2. Gap Analysis

### Coverage Gaps

| Dimension | Current | Target | Gap |
|-----------|---------|--------|-----|
| Messages with embeddings | 3,282 (24%) | 13,483 (100%) | 10,201 messages |
| Messages with category tags | 1,189 (9%) | ~8,000+ (substantive msgs) | ~7,000 messages |
| Entity relationship edges | 3 | 200+ | Extraction pipeline stalled |
| Documents linked to graph | 0 | 17 | All documents orphaned |
| Knowledge docs in graph | 0 | 18 | memory/knowledge/*.md not integrated |
| Person nodes (real) | 4 | 10+ | Missing many mentioned people |
| Cross-domain connections | 0 | 50+ | Categories ↔ entities not linked |

### Structural Gaps

1. **No document nodes** — Research docs exist in `documents` table but aren't represented in the graph as nodes. You can't traverse from "Voice" category to the voice research document.

2. **No message-to-entity links** — `content_tags` only links messages to categories. There's no way to find which messages mention "Zsolt" or "GPU Fleet" through the graph.

3. **No category-to-entity connections** — The "Docker" category has 50 tagged messages, and "Docker" exists as a tool node, but they aren't connected. Same for Cloudflare, GCP, Gemini, Claude, etc.

4. **No temporal edges** — No way to query "what was discussed last Tuesday" or "when was GPU Fleet last mentioned."

5. **No concept nodes** — Only person/project/tool types exist. There's no way to represent concepts like "voice pipeline architecture" or "memory system design" that span multiple categories.

### Code Gaps

1. **No unified query function** — `graph-query.py` searches nodes only; `semantic-search.py` searches messages/documents only. Nothing combines them.

2. **No real-time extraction trigger** — `db-watcher.py` ingests messages but doesn't trigger entity extraction. Extraction only runs via daily cron or manual invocation.

3. **No document ingestion pipeline** — Documents were manually inserted. No script watches for new/changed markdown files.

4. **No feedback loop** — `extraction_feedback` table exists but is empty. No mechanism to learn from corrections.

---

## 3. Root Cause Analysis

### Why the graph is nearly empty

1. **Rate limiting killed the extraction pipeline.** The `extraction_queue` shows 6 items failed with HTTP 429 from Gemini API. The pipeline has no retry/backoff logic, so it just stopped.

2. **Extraction only processes user messages.** `queue_messages_for_extraction()` filters `WHERE m.role = 'user'`. But most substantive content is in assistant messages (code, explanations, research). User messages are often short prompts.

3. **Daily extraction is too infrequent.** 7,820 messages on Feb 5 alone. A daily batch run can't keep up, especially with rate limits.

4. **No extraction from assistant messages or documents.** The richest content (research docs, long assistant responses) is never processed for entities.

### Why search doesn't work well

1. **Two incompatible embedding models.** `graph-extract.py` uses `gemini-embedding-001` for node embeddings. `semantic-search.py` and `batch-embed.py` use `text-embedding-004` for message embeddings. These produce vectors in different spaces — comparing them is meaningless.

2. **Search only finds nodes OR messages, never both.** `graph-query.py` returns graph nodes. `semantic-search.py` returns message content. A user asking "what do I know about Docker?" gets one or the other, never a combined view.

3. **No graph-augmented retrieval.** Finding "Docker" as a graph node doesn't pull in the 50 messages tagged to the Docker category, or the documents about Docker configuration.

### Why documents are isolated

1. **Documents table has `node_id` column but all values are NULL.** The column exists for linking but was never used.

2. **No script creates document nodes.** `graph-extract.py` only extracts from messages. Nothing processes markdown files into the graph.

3. **Document embedding used a different model** than node embeddings, so even vector similarity between documents and nodes is unreliable.

---

## 4. Unified System Design

### Design Principles

1. **One embedding model everywhere.** Standardize on `text-embedding-004` (or the latest Gemini embedding model). Re-embed everything that used the old model.

2. **Graph-augmented retrieval, not graph OR retrieval.** Every query should: (a) find relevant nodes via embeddings, (b) traverse the graph for connected context, (c) pull actual content (messages, documents) connected to those nodes.

3. **Automatic, event-driven enrichment.** New messages should trigger extraction inline, not wait for a daily batch.

4. **Content nodes, not just entity nodes.** Documents and important message clusters should be first-class graph nodes, not just rows in separate tables.

5. **Merge categories and entities.** The "Docker" category and "Docker" tool node should be the same node, or explicitly linked.

### Architecture Overview

```
                    ┌─────────────────────────────────┐
                    │       UNIFIED QUERY ENGINE       │
                    │  graph_search(query, options)    │
                    └──────────┬──────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
     ┌────────────────┐ ┌──────────────┐ ┌──────────────────┐
     │ Vector Search  │ │   Graph      │ │  Content         │
     │ (embeddings)   │ │   Traversal  │ │  Retrieval       │
     │                │ │              │ │                  │
     │ Find relevant  │ │ Expand from  │ │ Fetch messages,  │
     │ nodes by       │ │ seed nodes   │ │ documents, emails│
     │ similarity     │ │ via edges    │ │ linked to nodes  │
     └────────────────┘ └──────────────┘ └──────────────────┘
              │                │                │
              └────────────────┼────────────────┘
                               ▼
                    ┌─────────────────────────────────┐
                    │     KNOWLEDGE GRAPH (PostgreSQL) │
                    │                                  │
                    │  nodes ──edges──> nodes          │
                    │    │                              │
                    │    ├── content_tags → messages    │
                    │    ├── document_links → documents │
                    │    └── node embeddings (vector)   │
                    └─────────────────────────────────┘

                    ┌─────────────────────────────────┐
                    │    ENRICHMENT PIPELINE           │
                    │                                  │
                    │  db-watcher ──trigger──>         │
                    │    inline_extract() ──>          │
                    │      nodes, edges, content_tags  │
                    │                                  │
                    │  doc-watcher ──trigger──>        │
                    │    doc_extract() ──>             │
                    │      document nodes + edges      │
                    └─────────────────────────────────┘
```

### The Three-Phase Query

Every knowledge query follows three phases:

**Phase 1: Seed Discovery (Vector Search)**
- Embed the query using `text-embedding-004`
- Search `nodes` table by embedding similarity (top N)
- Also search `structured_messages` for direct content matches (top M)
- Also search `documents` for matching research content

**Phase 2: Graph Expansion (Traversal)**
- From seed nodes, traverse edges (depth 1-2)
- Follow `contains` edges to find subcategories
- Follow `relates_to`, `uses`, `works_on` edges to find connected entities
- Follow reverse edges (what uses this? who works on this?)
- Collect all discovered node IDs

**Phase 3: Content Retrieval**
- For all discovered nodes, pull linked content via `content_tags`
- Pull linked documents via `documents.node_id`
- Pull linked emails if relevant
- Rank all content by: (a) relevance to original query, (b) proximity in graph, (c) recency
- Return structured result with context

### Result Structure

```json
{
  "query": "Docker infrastructure setup",
  "graph_context": {
    "primary_nodes": [
      {"id": 221, "name": "Docker", "type": "category", "score": 0.92},
      {"id": 272, "name": "Docker", "type": "tool", "score": 0.91}
    ],
    "connected_nodes": [
      {"id": 220, "name": "Infrastructure", "type": "category", "via": "contains"},
      {"id": 222, "name": "GCP", "type": "category", "via": "sibling"},
      {"id": 288, "name": "OpenClaw", "type": "project", "via": "uses"}
    ]
  },
  "content": {
    "messages": [
      {"id": 1234, "text": "...", "date": "2026-02-04", "relevance": 0.87},
      ...
    ],
    "documents": [
      {"title": "OpenClaw Architecture", "path": "memory/knowledge/openclaw-architecture.md", "relevance": 0.82}
    ],
    "emails": []
  },
  "summary": "Docker is used as the container runtime for OpenClaw infrastructure on GCP..."
}
```

---

## 5. Schema Changes

### 5.1 Merge Category-Tool-Entity Duplicates

The current schema has the same concept represented multiple times:
- "Docker" as category node (id=221) AND tool node (id=272)
- "Claude" as category (id=244) AND tool (id=277)
- "Cloudflare" as category (id=223) AND tool (id=271)
- etc.

**Recommendation:** Add cross-reference edges rather than merge, since categories and entities serve different purposes. Categories are for tagging messages; entities are for relationship modeling. But they should be explicitly linked.

```sql
-- Link category nodes to their entity counterparts
INSERT INTO edges (source_id, target_id, edge_type, source_type, confidence, review_status)
VALUES
  (221, 272, 'same_as', 'system', 1.0, 'auto_approved'),  -- Docker category ↔ Docker tool
  (244, 277, 'same_as', 'system', 1.0, 'auto_approved'),  -- Claude category ↔ Claude tool
  (223, 271, 'same_as', 'system', 1.0, 'auto_approved'),  -- Cloudflare
  (222, 273, 'same_as', 'system', 1.0, 'auto_approved'),  -- GCP
  (243, 278, 'same_as', 'system', 1.0, 'auto_approved'),  -- Gemini
  (216, 276, 'same_as', 'system', 1.0, 'auto_approved'),  -- Signal
  (215, 275, 'same_as', 'system', 1.0, 'auto_approved'),  -- Telegram
  (219, 287, 'same_as', 'system', 1.0, 'auto_approved'),  -- STT
  (218, 286, 'same_as', 'system', 1.0, 'auto_approved'),  -- TTS
  (224, 285, 'same_as', 'system', 1.0, 'auto_approved'),  -- Vercel
  (214, 274, 'same_as', 'system', 1.0, 'auto_approved'),  -- WhatsApp
  (227, 284, 'same_as', 'system', 1.0, 'auto_approved'),  -- API Keys
  (251, 270, 'same_as', 'system', 1.0, 'auto_approved');  -- GPU Fleet category ↔ project
```

### 5.2 Clean Up Artifact Nodes

Remove extraction artifacts:

```sql
-- Delete artifact person nodes
DELETE FROM entity_aliases WHERE canonical_node_id IN (
  SELECT id FROM nodes WHERE name IN ('I', 'You', 'Claude claude-opus-4-5') AND node_type = 'person'
);
DELETE FROM edges WHERE source_id IN (
  SELECT id FROM nodes WHERE name IN ('I', 'You', 'Claude claude-opus-4-5') AND node_type = 'person'
) OR target_id IN (
  SELECT id FROM nodes WHERE name IN ('I', 'You', 'Claude claude-opus-4-5') AND node_type = 'person'
);
DELETE FROM nodes WHERE name IN ('I', 'You', 'Claude claude-opus-4-5') AND node_type = 'person';

-- Delete timestamp date_ref artifacts
DELETE FROM entity_aliases WHERE canonical_node_id IN (
  SELECT id FROM nodes WHERE node_type = 'date_ref'
);
DELETE FROM nodes WHERE node_type = 'date_ref';
```

### 5.3 Add Document-to-Node Links

```sql
-- Add node_type 'document' for research docs
-- Create a node for each knowledge document and link it

-- Example: link openclaw-architecture.md to OpenClaw project and Infrastructure category
-- This should be done programmatically (see Section 8)
```

### 5.4 New Edge Types

Add these to the system to enable richer traversal:

| Edge Type | From → To | Purpose |
|-----------|-----------|---------|
| `same_as` | category → entity | Links duplicate representations |
| `documented_in` | entity → document | Links entities to research docs |
| `mentioned_in` | entity → message | Direct entity-message links (beyond content_tags) |
| `related_to` | entity → entity | General semantic relationship |
| `subtopic_of` | category → category | Softer than `contains` for cross-vocabulary links |
| `instance_of` | entity → category | "Docker" tool is an instance of "Infrastructure" |

### 5.5 Add Missing Aliases

```sql
INSERT INTO entity_aliases (canonical_node_id, alias, alias_normalized) VALUES
  (1, 'Zsolt', 'zsolt'),
  (1, 'Papi', 'papi'),
  (9, 'Nimbus', 'nimbus'),
  (288, 'openclaw', 'openclaw'),
  (270, 'GPU', 'gpu'),
  (270, 'GPUs', 'gpus')
ON CONFLICT (alias_normalized) DO NOTHING;
```

### 5.6 Standardize Embeddings

All embeddings must use the same model. Currently:
- `graph-extract.py` → `gemini-embedding-001`
- `batch-embed.py`, `semantic-search.py`, `db-watcher.py` → `text-embedding-004`

**Decision: Standardize on `text-embedding-004`** (it's newer and used by more components).

This means re-embedding all 85 nodes. Since there are only 85, this is a single batch operation.

---

## 6. The Unified Query Engine

### Core Function: `graph_search()`

This replaces both `graph-query.py:search_related()` and `semantic-search.py:search()` with a single function that combines vector search + graph traversal + content retrieval.

```
graph_search(query, options):

  Input:
    query: string          -- natural language query
    options:
      max_nodes: int       -- max graph nodes to return (default 10)
      max_content: int     -- max content items to return (default 20)
      traverse_depth: int  -- graph traversal depth (default 2)
      include_messages: bool    -- include linked messages (default true)
      include_documents: bool   -- include linked documents (default true)
      include_emails: bool      -- include linked emails (default false)
      time_filter: daterange    -- optional time window
      node_types: list[str]     -- filter to specific node types

  Algorithm:
    1. Embed query via text-embedding-004

    2. Vector search on nodes table:
       SELECT id, name, node_type, 1-(embedding <=> query_vec) as score
       FROM nodes
       WHERE embedding IS NOT NULL
       ORDER BY embedding <=> query_vec
       LIMIT max_nodes * 2

    3. Vector search on documents table:
       SELECT id, title, path, 1-(embedding <=> query_vec) as score
       FROM documents
       WHERE embedding IS NOT NULL
       ORDER BY embedding <=> query_vec
       LIMIT 5

    4. Graph expansion from top nodes:
       WITH RECURSIVE expansion AS (
         -- seed nodes from step 2 (top max_nodes)
         UNION ALL
         -- traverse edges bidirectionally, max traverse_depth
       )
       Collect all reachable nodes within depth limit

    5. Content retrieval:
       a. Messages via content_tags for all expanded nodes
       b. Documents via node_id for all expanded nodes
       c. Direct message search via embedding similarity (supplement)
       d. Rank by: query_similarity * 0.6 + graph_proximity * 0.3 + recency * 0.1

    6. Assemble result:
       - Graph context (nodes + edges subgraph)
       - Ranked content items
       - Optional: generate summary via LLM if result set is large

  Output:
    {
      graph: { nodes: [...], edges: [...] },
      content: { messages: [...], documents: [...], emails: [...] },
      metadata: { node_count, content_count, query_time_ms }
    }
```

### Query Examples

**"What's the Docker setup?"**
1. Vector search finds: Docker (category, 0.92), Docker (tool, 0.91), Infrastructure (category, 0.78)
2. Graph expansion: Docker category → Infrastructure → GCP, Cloudflare, Vercel (siblings); Docker tool → OpenClaw (via uses)
3. Content: 50 messages tagged "Docker", openclaw-architecture.md, self-environment.md sections about Docker
4. Result: comprehensive Docker context across conversations and research docs

**"Who is Zsolt?"**
1. Vector search finds: Zsolt Szederkényi (person, 0.95), Kallos Zsolti (person, 0.82)
2. Graph expansion: Zsolt → GPU Fleet (works_on), Kallos Zsolti (collaborates_with)
3. Content: messages from/about Zsolt, Urban Dance Hungary docs, personal context
4. Result: person profile with projects, relationships, and conversation history

**"Voice call implementation"**
1. Vector search finds: Voice (category, 0.89), STT (category, 0.85), TTS (category, 0.84)
2. Graph expansion: Voice → STT, TTS; STT→204 tagged messages; research-voice-realtime.md
3. Content: voice-related messages, voice research docs, voice call research doc
4. Result: complete voice implementation context

---

## 7. Automatic Enrichment Pipeline

### The Current Problem

Enrichment is manual and batch-oriented:
1. `db-watcher.py` ingests messages → no extraction triggered
2. `daily-extract.py` runs once/day → too slow, rate-limited
3. `graph-extract.py` processes one message at a time → expensive (1 LLM call + 1 embedding per entity)

### The New Pipeline

```
Message arrives (db-watcher)
  │
  ├── Is it substantive? (>100 chars, not system/heartbeat)
  │     NO → skip
  │     YES ↓
  │
  ├── Quick classification (regex-based, <1ms)
  │     → Assign category tags via content_tags
  │     → This is cheap and fast — do it inline
  │
  ├── Needs entity extraction? (mentions names, projects, decisions)
  │     → Check heuristics: proper nouns, project keywords, decision language
  │     NO → done (taxonomy tagging is sufficient)
  │     YES ↓
  │
  └── Queue for batch extraction (extraction_queue)
        → Process in background every 5 minutes (not daily)
        → With exponential backoff on rate limits
        → Prioritize: user messages > assistant messages > tool results
```

### Inline Taxonomy Tagging

The regex-based tagging from `tag_batch4.py` should run inline in `db-watcher.py` for every new message. This is fast (<1ms per message) and ensures 100% of substantive messages get category tags immediately.

```
def tag_message_inline(cur, message_id, content):
    """Fast regex-based category tagging — runs inline during ingestion"""
    if not content or len(content) < 30:
        return 0

    tags = []
    for category_id, patterns in CATEGORY_PATTERNS.items():
        for pattern in patterns:
            if pattern.search(content):
                tags.append(category_id)
                break

    for cat_id in tags:
        cur.execute("""
            INSERT INTO content_tags (node_id, content_type, content_id)
            VALUES (%s, 'message', %s)
            ON CONFLICT DO NOTHING
        """, (cat_id, message_id))

    return len(tags)
```

### Smart Extraction Scheduling

Instead of daily batch, run extraction every 5 minutes on queued items:

```
Extraction scheduler (every 5 minutes):
  1. Check queue size
  2. If queue > 0:
     a. Process up to 20 items per batch
     b. Use exponential backoff: if 429, wait 60s, then 120s, then 300s
     c. After processing, update graph-context.md
  3. If queue = 0:
     a. Check for unqueued substantive messages
     b. Queue up to 50 new items
```

### Extraction Priority

Not all messages deserve expensive LLM extraction. Prioritize:

| Priority | Criteria | Action |
|----------|----------|--------|
| High | User message with proper nouns, decisions, new topics | Extract immediately |
| Medium | Assistant message with research, analysis, recommendations | Extract in next batch |
| Low | Short replies, confirmations, tool results | Tag only, skip extraction |
| Skip | System messages, heartbeats, errors, <30 chars | No processing |

### Reducing API Costs

Current approach: 1 LLM call per message for extraction = expensive at scale (13,000+ messages).

**Batch extraction** — group 5-10 messages from the same session and extract entities from the batch. This:
- Reduces LLM calls by 5-10x
- Provides better context (entities mentioned across multiple messages)
- Avoids extracting the same entity from each message separately

```
Instead of:
  extract("I need to set up Docker") → entities: [Docker]
  extract("Let's use GCP for hosting") → entities: [GCP]
  extract("Deploy with Cloudflare") → entities: [Cloudflare]
  = 3 API calls

Do:
  extract("I need to set up Docker\n---\nLet's use GCP\n---\nDeploy with Cloudflare")
  → entities: [Docker, GCP, Cloudflare], relationships: [Docker→GCP: infrastructure, ...]
  = 1 API call, better relationship detection
```

---

## 8. Document Integration

### Current State

17 documents in `documents` table, all with embeddings, but:
- `node_id` is NULL for all 17
- No document nodes in the graph
- No edges connecting documents to entities or categories
- Can only be found via embedding similarity search

### Integration Strategy

Each research document should:
1. Get a `document` node in the graph
2. Be linked to relevant category nodes via `documented_in` edges
3. Have entities extracted from its content (people, projects, tools mentioned)
4. Be chunked for more granular retrieval

### Document Processing Pipeline

```
For each markdown file in memory/knowledge/:

  1. Create a document node:
     INSERT INTO nodes (name, node_type, description, embedding, importance)
     VALUES (title, 'document', summary, embedding, 7)

  2. Link to documents table:
     UPDATE documents SET node_id = new_node_id WHERE path = file_path

  3. Extract entities from content:
     → Run LLM extraction on document text
     → Create edges: entity --documented_in--> document_node

  4. Link to categories:
     → Match document content against category patterns
     → Create edges: document_node --relates_to--> category_node

  5. Chunk the document:
     → Split into sections (by ## headers)
     → Store chunks with embeddings for granular retrieval
     → Link chunks to parent document node
```

### Document-Category Mapping

Based on content analysis:

| Document | Primary Categories | Entity Links |
|----------|-------------------|--------------|
| openclaw-architecture.md | Infrastructure, Tools, Config | OpenClaw, Docker, PostgreSQL |
| openclaw-extension-guide.md | Tools, Config | OpenClaw |
| mac-mini-setup-spec.md | Infrastructure, Tools | GPU Fleet, Docker |
| research-voice-realtime.md | Voice, STT, TTS | Gemini, Edge TTS |
| research-browser-access.md | Tools, Web UI | Gemini, Brave |
| research-chat-interface.md | Web UI, Voice | OpenClaw |
| voice-call-research.md | Voice, STT, TTS | Gemini, Edge TTS |
| security-credential-audit.md | Security, API Keys | Gemini, Claude, Cloudflare |
| self-environment.md | Infrastructure, Tools | Docker, GCP, Git |
| self-memory-system.md | Memory, Database, Embeddings | SQLite, Gemini |
| self-system-prompt.md | Config | OpenClaw, Nimbus |
| lora-memory-modules.md | Memory, Embeddings | Ollama, MLX |
| hungarian-urban-dance-research.md | Hip-Hop, History, Events | Urban Dance Hungary |
| urban-dance-research-deep.md | Hip-Hop, House, History | Urban Dance |
| urban-dance-article-factcheck.md | Hip-Hop, History | Urban Dance |
| urban-dance-hungary-company.md | Urban Dance Hungary, Events | Zsolt |
| synthesis-day2-review.md | Memory, Config | Nimbus |

### Watching for New Documents

Add file watching to detect new/modified markdown files:

```
Document watcher (runs alongside db-watcher):
  Watch: memory/knowledge/*.md, memory/*.md
  On change:
    1. Re-embed the document
    2. Re-extract entities
    3. Update document node and edges
    4. Update graph-context.md
```

---

## 9. Implementation Plan

### Phase 0: Foundation Fixes (Prerequisite)

**Goal:** Fix the broken foundation before building new features.

**Tasks:**

0.1 **Standardize embedding model**
- Update `graph-extract.py` to use `text-embedding-004` instead of `gemini-embedding-001`
- Re-embed all 85 nodes using `text-embedding-004`
- Verify all components use the same model
- File: `graph-extract.py` (change `get_embedding()` function)

0.2 **Clean up artifact nodes**
- Delete "I", "You", "Claude claude-opus-4-5" person nodes
- Delete date_ref nodes (timestamps as entities are artifacts)
- Clean up orphaned aliases and edges
- Method: SQL scripts (see Section 5.2)

0.3 **Add `same_as` edges between duplicate category/entity nodes**
- Link 13 category-entity pairs (Docker↔Docker, Claude↔Claude, etc.)
- Method: SQL script (see Section 5.1)

0.4 **Add missing aliases**
- "Zsolt" → Zsolt Szederkényi, "Papi" → Zsolt, "Nimbus" → Nimbus agent
- Method: SQL script (see Section 5.5)

0.5 **Add rate limiting and backoff to extraction pipeline**
- `graph-extract.py`: add exponential backoff on 429 errors
- Add configurable delay between API calls (default 1s)
- Add retry logic (max 3 retries with backoff)

0.6 **Remove duplicate indexes on edges table**
- Drop: `edges_source_idx`, `edges_target_idx`, `edges_type_idx` (keep `idx_edges_*` versions)

---

### Phase 1: Backfill Embeddings + Tags

**Goal:** Make existing data searchable. This is the highest-impact work.

**Tasks:**

1.1 **Backfill message embeddings**
- Target: 10,201 messages without embeddings
- Use `batch-embed.py` with rate limiting (suggest 10 requests/sec for Gemini)
- Add retry logic and progress tracking
- Run as background job, resume-safe (skip already-embedded)

1.2 **Backfill category tags**
- Target: ~12,000 untagged messages
- Use `tag_batch4.py` regex patterns (no API calls needed, pure regex)
- Run in a single batch — this should complete in minutes
- Track which messages are genuinely unclassifiable vs just unprocessed

1.3 **Resume entity extraction**
- Reset the 6 rate-limited queue items from `error` to `pending`
- Process remaining 130 pending items with backoff logic (Phase 0.5)
- Queue ALL user messages >100 chars that aren't already in the queue
- Also queue assistant messages with substantive content (>200 chars, not tool results)

---

### Phase 2: Unified Query Engine

**Goal:** Build the combined vector+graph search described in Section 6.

**Tasks:**

2.1 **Create `graph-search.py`** — the unified query engine
- Implement the three-phase query (seed → expand → retrieve)
- Input: query string + options
- Output: structured JSON with graph context + content
- CLI interface for testing

2.2 **Content ranking algorithm**
- Score = similarity * 0.6 + graph_proximity * 0.3 + recency * 0.1
- Graph proximity: 1.0 for direct match, 0.7 for depth-1, 0.5 for depth-2
- Recency: exponential decay, half-life of 7 days

2.3 **Integration testing**
- Test queries: "Docker setup", "who is Zsolt", "voice implementation", "urban dance history"
- Verify results include both graph nodes and content items
- Benchmark query latency (target: <500ms for typical queries)

---

### Phase 3: Document Integration

**Goal:** Connect research documents to the knowledge graph.

**Tasks:**

3.1 **Create document nodes** for all 17 existing documents
- Create a `document` node in `nodes` table for each
- Set `node_id` in `documents` table to link them
- Add embeddings using `text-embedding-004`

3.2 **Extract entities from documents**
- Run LLM extraction on each document
- Create `documented_in` edges from entities to documents
- Create `relates_to` edges from documents to relevant categories

3.3 **Document section chunking**
- Split each document by ## headers into chunks
- Store chunks in `documents` table with parent reference
- Embed each chunk separately for granular retrieval

3.4 **Document watcher**
- Add file monitoring for `memory/knowledge/*.md`
- On file change: re-embed, re-extract, update graph
- Can be integrated into `db-watcher.py` or run as separate process

---

### Phase 4: Automatic Enrichment

**Goal:** Make the graph grow automatically from new conversations.

**Tasks:**

4.1 **Inline taxonomy tagging in db-watcher**
- Add `tag_message_inline()` to `db-watcher.py`
- Load regex patterns at startup (from `tag_batch4.py` patterns)
- Tag every substantive message as it arrives
- Zero API cost, <1ms per message

4.2 **Smart extraction queueing**
- Add heuristic function to `db-watcher.py`: `should_extract(content)`
- Check for: proper nouns, project keywords, decision language, new topics
- If yes → add to `extraction_queue` with priority
- Process queue every 5 minutes (not daily)

4.3 **Batch message extraction**
- Modify `graph-extract.py` to accept multiple messages (session batches)
- Group 5-10 messages from same session for single LLM call
- Better relationship detection + fewer API calls

4.4 **Extraction scheduler**
- Replace `daily-extract.py` with a proper scheduler
- Run every 5 minutes when queue is non-empty
- Exponential backoff on rate limits
- Update `graph-context.md` after each batch

---

### Phase 5: Quality + Feedback

**Goal:** Improve extraction quality over time.

**Tasks:**

5.1 **Confidence calibration**
- Review existing edges by confidence level
- Tune thresholds: auto_approve > 0.9, review 0.7-0.9, reject < 0.5
- Add periodic review of pending edges

5.2 **Entity deduplication pass**
- Run embedding similarity across all person, project, tool nodes
- Merge nodes with >0.9 similarity and same type
- Consolidate aliases

5.3 **Extraction prompt refinement**
- Add negative examples to prevent artifacts ("I", "You", timestamps)
- Add domain-specific examples (dance terminology, infrastructure terms)
- Test with sample messages and measure precision/recall

5.4 **Feedback mechanism**
- Implement `extraction_feedback` table usage
- Allow marking edges as correct/incorrect
- Feed corrections back into extraction prompt

---

## 10. Migration Strategy

### Embedding Re-standardization

Since we need to move everything to `text-embedding-004`:

1. **Re-embed nodes (85 items)** — one-time batch, ~85 API calls
2. **Continue backfilling messages (10,201 items)** — background job
3. **Re-embed documents if needed (17 items)** — check which model was used
4. **Verify memories (24 items)** — check which model was used

### Data Integrity

Before any migration:
1. Backup current nodes, edges, entity_aliases, content_tags tables
2. Run migrations in a transaction
3. Verify row counts and data integrity after each step

### Rollback Plan

If the unified query engine has issues:
- Keep `graph-query.py` and `semantic-search.py` functional as fallbacks
- New `graph-search.py` is additive, not a replacement until proven
- Same_as edges can be deleted without affecting existing functionality

---

## Appendix A: Current File Inventory

| File | Purpose | Status |
|------|---------|--------|
| `graph-extract.py` | Entity extraction from messages | Works but rate-limited, wrong embedding model |
| `graph-query.py` | Graph node search + traversal | Works but limited (nodes only) |
| `semantic-search.py` | Cross-table content search | Works but separate from graph |
| `batch-embed.py` | Backfill message embeddings | Works, needs to run more |
| `db-watcher.py` | Real-time message ingestion | Works, needs inline tagging |
| `update-graph-context.py` | Write graph snapshot to markdown | Works |
| `daily-extract.py` | Daily extraction scheduler | Works but too slow |
| `db-schema.sql` | Schema definitions | Partial (structured_* tables only) |
| `tag_batch4.py` | Regex-based category tagging | Works, 27 categories |
| `taxonomy_extract_feb5.py` | Earlier taxonomy tagger | Superseded by tag_batch4 |
| `taxonomy-feb4-final.py` | Earliest taxonomy tagger | Superseded |
| `batch-taxonomy.py` | Taxonomy orchestration | Legacy |

### Files to Create

| File | Purpose | Phase |
|------|---------|-------|
| `graph-search.py` | Unified query engine | Phase 2 |
| `doc-integrate.py` | Document → graph integration | Phase 3 |
| `extraction-scheduler.py` | 5-minute extraction scheduler | Phase 4 |

### Files to Modify

| File | Changes | Phase |
|------|---------|-------|
| `graph-extract.py` | Fix embedding model, add backoff, batch mode | Phase 0 + 4 |
| `db-watcher.py` | Add inline tagging, extraction queueing | Phase 4 |

---

## Appendix B: Priority Matrix

| Task | Impact | Effort | Priority |
|------|--------|--------|----------|
| Backfill category tags (regex) | HIGH | LOW | **P0** |
| Standardize embedding model | HIGH | LOW | **P0** |
| Clean artifact nodes | MEDIUM | LOW | **P0** |
| Add same_as edges | MEDIUM | LOW | **P0** |
| Backfill message embeddings | HIGH | MEDIUM | **P1** |
| Resume entity extraction | HIGH | MEDIUM | **P1** |
| Build unified query engine | HIGH | HIGH | **P2** |
| Document integration | MEDIUM | MEDIUM | **P2** |
| Inline tagging in db-watcher | HIGH | MEDIUM | **P3** |
| Smart extraction scheduling | HIGH | MEDIUM | **P3** |
| Batch message extraction | MEDIUM | MEDIUM | **P3** |
| Extraction prompt refinement | MEDIUM | LOW | **P4** |
| Feedback mechanism | LOW | MEDIUM | **P4** |

---

## Appendix C: Key Metrics to Track

After implementation, track these to measure success:

| Metric | Current | Target |
|--------|---------|--------|
| Messages with embeddings | 24% | 95%+ |
| Messages with category tags | 9% | 70%+ |
| Real entity edges (non-taxonomy) | 3 | 200+ |
| Documents linked to graph | 0 | 17+ |
| Average query response time | N/A | <500ms |
| Entities extracted per day | ~0 (stalled) | 20+ |
| Graph nodes total | 85 | 200+ |
| Cross-domain edges | 0 | 50+ |

---

## Appendix D: API Cost Estimates

| Operation | Model | Cost per call | Volume | Total |
|-----------|-------|---------------|--------|-------|
| Message embedding backfill | text-embedding-004 | ~$0.00001 | 10,201 | ~$0.10 |
| Node re-embedding | text-embedding-004 | ~$0.00001 | 85 | ~$0.001 |
| Entity extraction (batch of 5) | gemini-2.0-flash | ~$0.001 | 2,000 batches | ~$2.00 |
| Document extraction | gemini-2.0-flash | ~$0.002 | 17 | ~$0.03 |
| Inline tagging | (regex, no API) | $0 | unlimited | $0 |
| **Total one-time backfill** | | | | **~$2.13** |
| **Ongoing daily** | | | ~100 msgs/day | **~$0.02/day** |

The entire backfill and ongoing operation is extremely cheap. API cost is not a constraint.
