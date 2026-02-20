# Knowledge Graph Automatic Retrieval — Integration Options

> **Author:** Nimbus  
> **Created:** 2026-02-06  
> **Purpose:** Evaluate how to automatically query the knowledge graph before answering

---

## The Problem

Currently, the knowledge graph exists but retrieval is manual. I only query it when I explicitly decide to run `python3 graph-query.py search "topic"`. The goal is to make retrieval automatic — relevant entities should appear in my context without me having to think about it.

---

## Option 1: Extend `memory_search` Tool

### How It Works Now

The `memory_search` tool in OpenClaw:
- Lives in `/app/src/memory/manager-search.ts` and `/app/src/memory/manager.ts`
- Uses SQLite with sqlite-vec extension for vector storage
- Searches markdown files (MEMORY.md + memory/*.md) chunked into ~500 char pieces
- Does **hybrid search**: BM25 keyword matching + vector cosine similarity
- Results merged via weighted scoring in `/app/src/memory/hybrid.ts`
- Returns: `{ path, startLine, endLine, score, snippet, source }`

### What We'd Change

Create a wrapper or extend the manager to also query PostgreSQL:

```python
# graph-memory-search.py (wrapper approach)
def unified_search(query: str, limit: int = 10):
    # 1. Call existing memory_search via OpenClaw
    file_results = call_memory_search(query, limit)
    
    # 2. Query knowledge graph nodes
    embedding = get_embedding(query)
    graph_results = query_nodes(embedding, limit)
    
    # 3. Merge and dedupe
    return merge_results(file_results, graph_results)
```

Or modify `/app/src/memory/manager.ts` directly to add a PostgreSQL query path.

### Pros
- ✅ I already use `memory_search` habitually — no behavior change needed
- ✅ Single tool returns both file snippets AND graph entities
- ✅ Familiar result format
- ✅ Can be done as external script (no OpenClaw core changes)

### Cons
- ❌ Requires me to remember to call `memory_search` (not fully automatic)
- ❌ If done as wrapper script, need to maintain two search systems
- ❌ If modifying core, requires TypeScript + rebuilding OpenClaw

### Implementation Effort
- **Wrapper script**: 2-3 hours (Python, calls both systems)
- **Core modification**: 4-6 hours (TypeScript, need to understand manager.ts)

---

## Option 2: Pre-Turn Hook (agent:bootstrap)

### How It Works

OpenClaw has an `agent:bootstrap` hook event that fires **before workspace files are injected**. Hooks can mutate `context.bootstrapFiles` to add/modify injected content.

The `soul-evil` bundled hook shows this pattern:
```typescript
// From /app/src/hooks/bundled/soul-evil/handler.ts
if (!workspaceDir || !Array.isArray(context.bootstrapFiles)) {
  return;
}
// ... modifies context.bootstrapFiles
```

### What We'd Build

A hook that:
1. Extracts key terms from the incoming message (available in context)
2. Queries PostgreSQL for relevant entities
3. Formats them as a "hot context" block
4. Injects as a virtual bootstrap file

```typescript
// hooks/graph-context/handler.ts
const handler: HookHandler = async (event) => {
  if (event.type !== 'agent' || event.action !== 'bootstrap') return;
  
  const context = event.context as AgentBootstrapHookContext;
  const sessionKey = context.sessionKey;
  
  // Get the pending user message (need to find where this is accessible)
  const userMessage = await getLastUserMessage(sessionKey);
  
  // Query graph for relevant entities
  const entities = await queryGraphEntities(userMessage);
  
  // Inject as bootstrap content
  context.bootstrapFiles.push({
    path: 'graph-context-live.md',
    content: formatEntitiesAsMarkdown(entities),
    role: 'context'
  });
};
```

### Challenge: Accessing the User Message

The `agent:bootstrap` hook fires during session setup, but I need to check if the **current user message** is accessible at that point. Looking at the code:
- `bootstrapFiles` are resolved in `attempt.ts` before the agent turn
- The user message should be in the session transcript

Need to verify: can the hook access the pending user message?

### Pros
- ✅ Fully automatic — I never have to think about it
- ✅ Context appears naturally alongside other injected files
- ✅ Uses OpenClaw's native hook system
- ✅ No changes to my behavior or prompts needed

### Cons
- ❌ Adds latency to every turn (PostgreSQL query + embedding)
- ❌ Requires TypeScript hook implementation
- ❌ Need to verify user message is accessible at bootstrap time
- ❌ May inject irrelevant entities if query matching is imprecise

### Implementation Effort
- **4-6 hours**: Write hook, test user message access, handle edge cases

---

## Option 3: Dynamic Hot Context File

### How It Works Now

`memory/graph-context.md` exists and gets auto-loaded as part of the memory/ directory. The script `update-graph-context.py` refreshes it with recent/important entities.

But it's **static** — it shows a snapshot of the graph, not entities relevant to the current query.

### What We'd Change

Make it dynamic by having `db-watcher.py` or a pre-turn script:
1. Detect a new user message
2. Extract key terms
3. Query graph for matching entities
4. Overwrite `memory/graph-context.md` with relevant results
5. This file then gets picked up by normal memory loading

```python
# In db-watcher.py or as pre-turn trigger
def update_context_for_message(message_text: str):
    # Extract key terms
    terms = extract_key_terms(message_text)
    
    # Query graph
    entities = semantic_search_nodes(terms)
    
    # Write to hot context file
    with open('memory/graph-context.md', 'w') as f:
        f.write(format_entities(entities))
```

### Challenge: Timing

The file needs to be updated **before** my turn starts. Options:
- Trigger from db-watcher.py when a new user message is detected
- Use a filesystem watcher on the session transcript
- Hook into OpenClaw's message processing pipeline

### Pros
- ✅ Uses existing file-based memory system
- ✅ No OpenClaw core changes
- ✅ I automatically see it via normal memory loading
- ✅ Simple Python implementation

### Cons
- ❌ Race condition risk (file update vs. context loading timing)
- ❌ Requires detecting "new user message" event externally
- ❌ File I/O overhead on every message
- ❌ Less elegant than native integration

### Implementation Effort
- **2-3 hours**: Script logic
- **+1-2 hours**: Reliable triggering mechanism

---

## Comparison Matrix

| Aspect | Option 1: Extend memory_search | Option 2: Pre-turn Hook | Option 3: Dynamic Hot File |
|--------|-------------------------------|------------------------|---------------------------|
| **Automaticity** | Semi (I must call it) | Fully automatic | Fully automatic |
| **Latency** | On-demand only | Every turn | Every turn |
| **OpenClaw changes** | None (wrapper) or Core | Hook only | None |
| **Implementation** | Python or TypeScript | TypeScript | Python |
| **Reliability** | High | High | Medium (race conditions) |
| **Effort** | 2-6 hours | 4-6 hours | 3-5 hours |

---

## Recommendation

**Start with Option 1 (wrapper script)**, then evolve to **Option 2 (hook)**.

### Phase 1: Quick Win (Today)
Create `unified-search.py` that:
1. Takes a query
2. Calls graph-query.py for entity search
3. Formats results like memory_search output
4. I call this instead of/alongside memory_search

### Phase 2: Native Integration (This Week)
Build the `agent:bootstrap` hook:
1. Verify user message is accessible
2. Implement entity query + injection
3. Test with real conversations
4. Enable in config

### Phase 3: Optimize (Ongoing)
- Cache frequent queries
- Tune relevance thresholds
- Add entity type filtering (people vs tools vs projects)
- Measure latency impact

---

## Code Locations Reference

| Component | Path |
|-----------|------|
| memory_search implementation | `/app/src/memory/manager.ts` |
| Search logic | `/app/src/memory/manager-search.ts` |
| Hybrid merge | `/app/src/memory/hybrid.ts` |
| Hook system | `/app/src/hooks/hooks.ts` |
| Bootstrap hook type | `/app/src/hooks/internal-hooks.ts` |
| Example hook (soul-evil) | `/app/src/hooks/bundled/soul-evil/handler.ts` |
| Bootstrap file resolution | `/app/src/agents/bootstrap-files.ts` |
| Agent turn attempt | `/app/src/agents/pi-embedded-runner/run/attempt.ts` |
| Graph query script | `/home/node/.openclaw/workspace/graph-query.py` |
| Graph context updater | `/home/node/.openclaw/workspace/update-graph-context.py` |
