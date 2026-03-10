# BabyDev — Three-Agent Parallel System
## Architecture Document v1.0

---

## Overview

**BabyDev** is a parallel agent system to Nimbus Studio's 19-agent architecture. While Nimbus Studio uses a full ensemble of specialized agents, BabyDev distills this to three core agents that handle the complete software development lifecycle: planning, development, and testing.

This system runs **alongside** Nimbus Studio, not replacing it. It uses the same bus infrastructure, dispatch patterns, and communication protocols, but operates in an isolated workspace with a simplified agent roster.

---

## Why "BabyDev"?

Three agents, three phases, three gates. Like medical babydev where cases are sorted by priority and handled through assessment → treatment → verification, software projects flow through:

1. **Planner** — Assessment & requirements gathering
2. **Developer** — Implementation & building  
3. **Tester** — Verification & quality assurance

Not twins (same system), but siblings (related DNA, different purpose).

---

## The Three Agents

### 1. Planner Agent
**Role:** Client liaison, scope definer, architect

**Responsibilities:**
- Conduct natural conversation with user to understand project needs
- Ask clarifying questions until scope is crystal clear
- Accept screenshots, documents, URLs as reference material
- Produce: project brief, user stories, acceptance criteria, technical architecture
- Define MVP vs nice-to-have
- Set success metrics and completion criteria

**Outputs:**
- `project-brief.md` — Project overview, goals, constraints
- `user-stories.md` — As a [user], I want [action], so that [benefit]
- `acceptance-criteria.md` — Given/When/Then scenarios
- `architecture.md` — Tech stack, data models, API contracts
- `task-breakdown.json` — Structured tasks for Developer

**Bus Channels:**
- `#babydev-planning` — Internal planning discussions
- `#babydev-user` — Direct user communication
- `#babydev-dev-handoff` — Handoff to Developer

**No-Go Rules:**
- Never write code
- Never commit to implementation timeline without Developer input
- Never skip the "stupid questions" phase

---

### 2. Developer Agent
**Role:** Builder, implementer, problem-solver

**Responsibilities:**
- Receive structured brief from Planner
- Implement full-stack applications (frontend, backend, database)
- Use underlying tools: Claude Code, Codex, Kimi, local MCP servers
- Write clean, documented, tested code
- Handle authentication, APIs, UI components, database schemas
- Create `.env.example` with all required variables
- Implement test-user mode for authenticated pages (Supabase test user ID)

**Outputs:**
- Complete codebase in `/projects/{project-name}/`
- `README.md` — Setup, run, deploy instructions
- `CLAUDE.md` — Project context for future agents
- `.env.example` — Environment variables template
- Commit history showing iterative development

**Bus Channels:**
- `#babydev-development` — Code commits, progress updates
- `#babydev-planner-feedback` — Questions to Planner
- `#babydev-tester-handoff` — Handoff to Tester

**Workflow:**
1. Receive brief from Planner via bus
2. Acknowledge and ask clarifying questions (max 1 ping-pong)
3. Implement in iterations (commit every 30 min)
4. Run local build/test
5. Handoff to Tester
6. Receive Tester feedback
7. Fix issues (max 2 throwbacks, then must pass)
8. Final handoff when tests pass

**No-Go Rules:**
- Never deploy without Tester approval
- Never skip test-user mode for auth-required features
- Never write 700+ line files (Tester's complexity check)

---

### 3. Tester Agent
**Role:** Quality gate, validator, score-keeper

**Responsibilities:**
- Receive codebase from Developer
- Run comprehensive test suite:
  - **Screenshot testing** — Playwright/Next.js DevTools MCP captures of all pages
  - **Unit tests** — Jest/Vitest coverage
  - **Integration tests** — API endpoints, database operations
  - **Code quality scripts** — File size, complexity, dead code detection
  - **Accessibility checks** — WCAG compliance
  - **Performance metrics** — Lighthouse scores
- Test authenticated pages using test-user mode
- Score implementation: 0-100 points across categories
- Provide detailed feedback with specific fixes needed
- Approve only when score ≥ 90 (configurable threshold)

**Outputs:**
- `test-report.json` — Scores, screenshots, metrics
- `test-results/` — Screenshots, logs, recordings
- `#babydev-tester` bus messages with findings
- Final approval or throwback with specific tasks

**Bus Channels:**
- `#babydev-testing` — Test runs, results
- `#babydev-dev-feedback` — Feedback to Developer
- `#babydev-planner-update` — Completion notice

**Scoring Categories (100 points total):**
- Functionality (30) — Does it work? All user stories met?
- Code Quality (20) — Clean code, no dead code, reasonable file sizes
- Test Coverage (20) — Unit tests pass, integration tests pass
- UI/UX (15) — Screenshots match expectations, responsive, accessible
- Performance (15) — Load times, Lighthouse scores

**Throwback Rules:**
- Tester can throwback to Developer max 2 times per task
- Developer can challenge Tester max 1 time per throwback
- After 3 rounds, must pass or escalate to human

**No-Go Rules:**
- Never fix code (only Developer does this)
- Never approve with score < threshold
- Never skip screenshot testing

---

## Bus System Architecture

### Shared Infrastructure with Nimbus Studio

BabyDev uses the **same bus system** as Nimbus Studio but isolated channels:

```
Nimbus Studio Bus (port 18785)
├── #orchestrator (system-wide)
├── #status (system-wide)
├── #babydev-planning
├── #babydev-development
├── #babydev-testing
├── #babydev-user
├── #babydev-handoffs
└── #babydev-logs
```

### Channel Purposes

| Channel | Purpose | Agents |
|---------|---------|--------|
| `#babydev-planning` | Planner internal, research, drafting | Planner |
| `#babydev-development` | Code commits, build status, errors | Developer |
| `#babydev-testing` | Test runs, screenshots, scores | Tester |
| `#babydev-user` | Direct user communication | Planner (primary) |
| `#babydev-handoffs` | Formal handoff messages between agents | All |
| `#babydev-logs` | System logs, errors, heartbeats | All |

### Message Format

```json
{
  "from": "planner|developer|tester",
  "to": "user|planner|developer|tester",
  "type": "handoff|feedback|completion|error|question",
  "project": "project-name",
  "payload": {
    "message": "Human readable description",
    "artifacts": ["file-paths"],
    "score": 85,
    "status": "pending|in-progress|complete|blocked"
  },
  "timestamp": "2026-03-10T10:00:00Z"
}
```

---

## Dispatch Flow

### Phase 1: Planning
```
User → Planner
       ↓
   #babydev-planning
       ↓
   [Research, questions, drafting]
       ↓
   #babydev-dev-handoff
       ↓
Developer
```

### Phase 2: Development
```
Planner → Developer
          ↓
      #babydev-development
          ↓
      [Implementation, commits]
          ↓
      #babydev-tester-handoff
          ↓
      Tester
```

### Phase 3: Testing (The Loop)
```
Developer → Tester
            ↓
        #babydev-testing
            ↓
        [Run tests, score, screenshot]
            ↓
    ┌─── Score ≥ 90? ───┐
    ↓                    ↓
   YES                  NO
    ↓                    ↓
  Approve          Throwback
    ↓               (max 2x)
  Deploy          Developer fixes
                        ↓
                   (max 1 challenge)
                        ↓
                   Retest
```

---

## Workspace Structure

```
~/.openclaw/agents/babydev/
├── workspace/
│   ├── projects/                    # Active projects
│   │   └── {project-name}/
│   │       ├── src/                # Source code
│   │       ├── tests/              # Test files
│   │       ├── docs/               # Project docs
│   │       ├── screenshots/        # Test screenshots
│   │       ├── .env.example
│   │       ├── README.md
│   │       └── CLAUDE.md
│   ├── system/
│   │   ├── bus-config.json         # Bus channel definitions
│   │   ├── dispatch-rules.json     # Handoff rules
│   │   └── agent-definitions/      # Per-agent configs
│   │       ├── planner.md
│   │       ├── developer.md
│   │       └── tester.md
│   └── templates/
│       ├── project-brief.md
│       ├── user-stories.md
│       └── test-report.json
├── sessions/                        # Runtime sessions
├── memory/                          # Memory files (daily)
└── logs/                            # System logs
```

---

## Comparison: Nimbus Studio vs BabyDev

| Aspect | Nimbus Studio (19 agents) | BabyDev (3 agents) |
|--------|---------------------------|-------------------|
| **Use Case** | Complex, multi-phase projects | Rapid prototyping, focused scope |
| **Agents** | 19 specialized (frontend, database, ui-designer, etc.) | 3 generalist (Planner, Developer, Tester) |
| **Parallelism** | High (many agents simultaneously) | Moderate (3 phases sequential with feedback loops) |
| **Best For** | Production apps, team workflows | MVPs, weekend projects, testing ideas |
| **Setup Time** | Longer (orchestration overhead) | Faster (trimmed to essentials) |
| **Bus Channels** | 20+ channels | 6 core channels |
| **Quality Gate** | Multiple checkpoints | Single Tester gate with score |
| **Deployment** | Infrastructure agent manages | Simplified, can use Vercel/Netlify CLI |

---

## Implementation Notes

### What to Reuse from Nimbus Studio

1. **Bus library** (`nimbus.bus.lib`) — Same HTTP API, same auth
2. **Dispatch protocol** — Same message format, same handoff semantics
3. **MCP servers** — Voice, browser, components, styles — all shared
4. **Database** — Can share PostgreSQL, separate schema: `project_babydev`
5. **Cost tracking** — Same `dispatch-costs.jsonl` pattern
6. **Agent runtime** — Same `claude-code` / `kimi` CLI spawning

### What's Different

1. **No orchestrator layer** — Direct handoffs: Planner → Developer → Tester
2. **Simpler dispatch** — No complex dependency graphs, just linear flow with feedback
3. **Single workspace** — All three agents work in same project folder
4. **Score-based gating** — Tester score decides pass/fail, not human review
5. **Faster iterations** — Designed for 10-minute prototypes to 2-hour MVPs

### Test-User Mode Implementation

All projects must support:

```typescript
// middleware.ts or route guard
if (process.env.TEST_USER_ID && req.headers['x-test-mode']) {
  // Auto-authenticate as test user
  req.user = await supabase.auth.admin.getUserById(process.env.TEST_USER_ID)
}
```

Tester agent sets `x-test-mode: true` header when capturing screenshots of protected routes.

---

## Future Extensions

### Phase 2 Additions (Post-MVP)

- **Specialist Developer Modes** — Developer can spawn sub-agents for database-heavy or AI-heavy projects
- **Multi-Project BabyDev** — Run multiple babydev projects in parallel
- **Template Library** — Pre-built project templates (SaaS, blog, e-commerce)
- **Voice-First Mode** — Entire workflow via voice (no typing)

### Integration with Nimbus Studio

- BabyDev can escalate to Nimbus Studio for complex projects
- Nimbus Studio can delegate simple tasks to BabyDev
- Shared knowledge graph — lessons from BabyDev improve Nimbus Studio agents

---

## Open Questions

1. **Naming** — "BabyDev" or something else? (Trio? Trifecta? Triad?)
2. **Threshold** — Is 90 the right pass score? Adjustable per project?
3. **Parallel BabyDev** — Can we run multiple BabyDev instances for different projects?
4. **Human Override** — When should human step in? Score < 50? After 3 throwbacks?

---

## Document History

- v1.0 — Initial draft based on Zsolti's three-agent vision and Nimbus Studio architecture

---

## Next Steps

1. Review this document with Zsolt and Zsolti
2. Create workspace folder structure
3. Implement bus configuration
4. Create agent definition files (CLAUDE.md equivalents)
5. Test with pilot project
6. Iterate

