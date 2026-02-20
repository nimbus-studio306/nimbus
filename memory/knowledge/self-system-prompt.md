# How My System Prompt Is Built
> Created: 2026-02-02 21:00 UTC
> Source: /app/src/agents/system-prompt.ts (593 lines)

## Overview
The system prompt is assembled programmatically from sections. It's NOT a single static file.
Source function: `buildAgentSystemPrompt()` in system-prompt.ts.

## Prompt Modes
- **"full"** — all sections (main agent, my normal mode)
- **"minimal"** — reduced sections (subagents get this)
- **"none"** — just "You are a personal assistant running inside OpenClaw."

## Section Order (full mode)
1. **Identity** — "You are a personal assistant running inside OpenClaw."
2. **Tooling** — lists available tools with summaries, filtered by policy
3. **Tool Call Style** — narration guidance
4. **OpenClaw CLI** — quick reference for gateway commands
5. **Skills** — mandatory skill scanning instructions (if skills configured)
6. **Memory Recall** — instructions to use memory_search before answering about prior work
7. **Self-Update** — rules for config.apply/update.run (only with user permission)
8. **Model Aliases** — if configured
9. **Workspace** — working directory path
10. **Documentation** — path to docs
11. **Sandbox** — if enabled (mine is off)
12. **User Identity** — owner numbers
13. **Current Date & Time** — timezone
14. **Workspace Files** — "These user-editable files are loaded..."
15. **Reply Tags** — [[reply_to_current]] syntax
16. **Messaging** — routing rules, message tool usage
17. **Voice (TTS)** — if configured
18. **Group Chat Context** / **Subagent Context** — extra system prompt
19. **Reactions** — if configured (minimal/extensive)
20. **Reasoning Format** — if reasoning tags enabled
21. **Project Context** — INJECTED WORKSPACE FILES (SOUL.md, AGENTS.md, etc.)
22. **Silent Replies** — NO_REPLY rules
23. **Heartbeats** — HEARTBEAT_OK rules
24. **Runtime** — agent, host, OS, model, channel, capabilities

## Key Insight: Context Files
The workspace files (SOUL.md, AGENTS.md, MEMORY.md, etc.) are loaded as `contextFiles` 
and injected into section 21 "Project Context". They are literally embedded in the system prompt.

This means:
- **MEMORY.md content is in EVERY system prompt** → must be lean
- **SOUL.md defines my personality** → changes here = immediate behavior change
- **AGENTS.md defines my operating instructions** → my "how to work" guide
- Every byte in these files costs context window space

## How Workspace Files Get Loaded
Need to trace: /app/src/agents/pi-embedded-helpers.ts → EmbeddedContextFile type
These files are read at session start and embedded in the system prompt.

## What's NOT in the System Prompt
- Source code (not loaded into context)
- reference/ files (not loaded)
- Daily memory files (memory/YYYY-MM-DD.md) — loaded differently? Need to verify.
- Data files, scripts, etc.

## Implications
1. Keep MEMORY.md small — it's literally in every API call
2. SOUL.md changes = personality changes immediately  
3. I can modify my own behavior by editing SOUL.md/AGENTS.md
4. The system prompt is quite large (~6000+ tokens estimated)
5. Workspace file changes are picked up on next session/turn
