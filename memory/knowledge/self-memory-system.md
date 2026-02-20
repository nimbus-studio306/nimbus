# How My Memory Works
> Created: 2026-02-02 20:45 UTC
> Source: /app/src/memory/, /app/docs/concepts/memory.md

## Overview
My memory is **plain Markdown files** in the workspace. Nothing else. The model (me) only "remembers" what's written to disk.

## Two Layers
1. **MEMORY.md** — curated long-term memory. Loads into context every main session. Should be LEAN.
2. **memory/YYYY-MM-DD.md** — daily logs. Today + yesterday loaded at session start.

## Vector Search (memory_search tool)
The system builds a **vector index** over all my .md files for semantic search:
- Files indexed: MEMORY.md + memory/*.md + any extraPaths configured
- Indexing: Markdown files are **chunked** (split by character limit with overlap)
- Each chunk gets an **embedding** (via Gemini, OpenAI, or local model)
- Search is **hybrid**: BM25 keyword search + vector similarity, results merged
- Database: SQLite with sqlite-vec extension for vector operations
- Watched for changes: chokidar watches files, re-indexes on modification

### Key internals (from /app/src/memory/):
- `manager.ts` — main MemoryIndexManager class
- `internal.ts` — file listing, hashing, markdown chunking
- `hybrid.ts` — BM25 + vector merge logic
- `embeddings.ts` — provider abstraction (OpenAI/Gemini/local)
- `sqlite.ts` / `sqlite-vec.ts` — storage layer
- `sync-memory-files.ts` — watches for file changes

### Chunking
- Markdown split into chunks by character limit (~tokens * 4 chars)
- Overlap between chunks to avoid losing context at boundaries
- Each chunk stored with: path, startLine, endLine, text hash, embedding

## Implications for Me
1. **MEMORY.md loads every session** → keep it small, only critical info
2. **memory/*.md files are searchable** → good for detailed notes (vector search finds them)
3. **reference/*.md files are NOT automatically indexed** unless in memory/ or configured as extraPaths
4. **New files need to be in memory/ or MEMORY.md** to be searchable via memory_search
5. **Chunking means** my notes should be well-structured with clear sections

## What I Should Do
- Keep MEMORY.md lean (critical references only, with file paths to deeper content)
- Use memory/ directory for detailed notes that need to be searchable
- Consider: should reference/ files move to memory/reference/ to be indexed?
- Or: configure extraPaths in config to include reference/

## Verified Facts (from database inspection)
- **Database**: /home/node/.openclaw/memory/default.sqlite
- **Tables**: files, chunks, embedding_cache, chunks_fts (BM25), chunks_vec (vector)
- **Currently indexed**: 6 files, 23 chunks, 81 cached embeddings
- **Indexed paths**: MEMORY.md + 5 files in memory/
- **reference/ is NOT indexed** — only MEMORY.md and memory/*.md are auto-indexed
- **Embedding provider**: Gemini (via GEMINI_API_KEY)

## Decision
Keep learning notes in `memory/reference/` instead of `reference/` so they get indexed.
Or: ask Zsolt to add `reference/` to `memorySearch.extraPaths` config.
For now: important references go in memory/, exploratory notes can stay in reference/.
