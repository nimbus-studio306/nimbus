# AGENTMASTER-COORDINATION.md

**Created:** 2026-02-26  
**Purpose:** Coordination document for AgentMaster project development across multiple sessions

---

## 🎯 Project Overview

**AgentMaster** is a multi-agent orchestration system running on **studiokallos** (Mac Studio M1 Max) for **Nimbus Studio** (KallosSoft). It manages development workflows by dispatching specialized subagents to handle specific tasks.

### Key Entities
- **Primary Agent:** `agentmaster` (located at `/Users/studiokallos/.openclaw/agents/agentmaster/`)
- **Studio Variant:** `agentmaster-studio` (exists but workspace not yet initialized)
- **Host Machine:** studiokallos (Mac Studio M1 Max, 32GB)
- **Client:** KallosSoft / Zsolt Kallos
- **Project:** Nimbus Studio

---

## 📁 Directory Structure (studiokallos)

```
/Users/studiokallos/.openclaw/
├── agents/
│   ├── agentmaster/              # Main orchestrator agent
│   │   ├── workspace/
│   │   │   ├── AGENTS.md
│   │   │   ├── CLAUDE.md         # AgentMaster orchestrator instructions
│   │   │   ├── SUBAGENTS.md      # Specialist registry
│   │   │   ├── PIPELINE.md       # Task bus & pipeline spec
│   │   │   ├── PROJECT_CONTEXT.md # Template for managed projects
│   │   │   ├── SOUL.md
│   │   │   ├── TOOLS.md
│   │   │   ├── memory/
│   │   │   │   ├── tasks.json    # Task bus state (version 1, empty tasks)
│   │   │   │   └── dispatch.log
│   │   │   ├── dispatch.sh       # Subagent dispatch script
│   │   │   └── cost-summary.sh
│   │   └── subagents/            # Specialist agents
│   │       ├── frontend/
│   │       ├── typescript/
│   │       ├── supabase/
│   │       ├── python/
│   │       ├── openclaw/
│   │       ├── docs/
│   │       ├── testing/
│   │       ├── deployment/
│   │       └── vercel-cli/       # CLI agent for Vercel operations
│   ├── agentmaster-studio/       # Studio variant (workspace pending)
│   ├── nimbus-studio/
│   ├── deeper-studio/
│   └── ...
├── memory/
│   └── agentmaster.sqlite        # AgentMaster database
└── workspace/                    # Shared scripts and tools
    └── scripts/                  # Various utility scripts
```

---

## 🤖 Available Subagents

| Agent | Purpose | Default Model |
|-------|---------|---------------|
| `frontend` | React, Next.js, Tailwind, shadcn/ui | haiku |
| `typescript` | Types, tsconfig, ESLint, build tools | haiku |
| `supabase` | PostgreSQL, RLS, migrations, auth | haiku |
| `python` | Scripts, data processing, CLI tools | haiku |
| `openclaw` | System config, plugins, workspace | haiku |
| `docs` | READMEs, API docs, changelogs | haiku |
| `testing` | Unit/integration/E2E tests | haiku |
| `deployment` | CI/CD, releases, build orchestration | haiku |
| `vercel-cli` | Vercel platform (deploys, domains, env) | haiku |

---

## 🔄 How It Works

1. **OpenClaw/Nimbus** spawns AgentMaster with a task
2. **AgentMaster** reads CLAUDE.md → decomposes task → plans pipeline
3. **AgentMaster** dispatches subagents via `dispatch.sh`:
   ```bash
   ./dispatch.sh --agent <specialist> --task "..." --target /path/to/project
   ```
4. **Subagents** run via `claude -p` with `--dangerously-skip-permissions`
5. **Subagents** report back via stdout
6. **AgentMaster** validates → updates `tasks.json` → dispatches next

---

## 📋 Current Status

- **Task Bus:** Empty (`tasks.json` shows no active tasks)
- **All Agents:** Idle
- **Last Activity:** Unknown (no 2026-02-26.md yet)
- **Projects Managed:** Unknown (need PROJECT_CONTEXT.md files in target dirs)

---

## ⚠️ NON-INTERFERENCE PROTOCOL — INFORMATION COLLECTION ONLY

**CRITICAL:** This group chat (`Openclaw project`) is an **information collection and documentation channel** — NOT a development channel.

### What This Means
- **PURPOSE:** Collect updates, document progress, track decisions
- **NOT FOR:** Making changes, running commands, deploying code
- **STATUS:** Passive observer mode — active development happens elsewhere

### When Receiving Updates From This Group
1. **COLLECT** — Document the information in this coordination file
2. **LISTEN** — Understand what was developed/changed/decided
3. **REPORT** — Acknowledge receipt and summarize understanding
4. **DO NOT** directly modify AgentMaster files on studiokallos
5. **DO NOT** spawn subagents or interfere with running tasks
6. **DO NOT** assume control of the agentmaster session
7. **DO NOT** apply any changes to nimbus-vm (my own system)
8. **DO** treat updates as **informational only**
9. **DO** coordinate through Zsolt Szederkényi before taking ANY action

**Why:** AgentMaster may be actively managed in another session. This group is for STATUS UPDATES and PLANNING DISCUSSION only — all execution happens on studiokallos by the responsible agent/session.

---

## 📊 Knowledge Graph Context

**Related Entities:**
- Agent Master (project, ID 1496) — importance 10
- nimbus.studio306 (project, ID 1434) — importance 10
- Uses: Mac Studio, OpenClaw, Claude, Gemini
- Part of: KallosSoft organization
- Connected to: Context Manager Agent, Agent Factory, coding-agent projects

---

## 📚 Key Documentation

| File | Location | Purpose |
|------|----------|---------|
| CLAUDE.md | agentmaster/workspace/ | Orchestrator instructions |
| SUBAGENTS.md | agentmaster/workspace/ | Specialist registry |
| PIPELINE.md | agentmaster/workspace/ | Task bus specification |
| PROJECT_CONTEXT.md | agentmaster/workspace/ | Template for managed projects |
| This file | nimbus-vm workspace/ | Cross-session coordination |

---

## 🔗 Related Sessions

- **Active development on studiokallos:** Check `memory/tasks.json` before assuming control
- **Planning updates:** This WhatsApp group (Openclaw project)
- **Nimbus VM context:** `/home/papperpictures/.openclaw/agents/nimbus/workspace/`

---

## 📝 Recent Changes (if any)

*To be updated when significant changes are reported in this group.*

---

**Last Updated:** 2026-02-26 by Nimbus (nimbus-vm)
