# Meeting Notes: Zsolt Kallos (Zsolti) System Vision
**Date:** 2026-02-26  
**Time:** 02:16 UTC  
**Attendees:** Zsolt Szederkényi (Papi), Zsolt Kallos (Zsolti / KallosSoft), Nimbus

## Context
This meeting took place during a voice call where Zsolti described his vision for an advanced AI-assisted software development system. The goal is to create something far beyond current capabilities — a system where talking to AI results in working software in minutes.

## Zsolti's Ultimate Vision
> "I will just talk and at the end of the talk with the AI agent, the OpenClaw system, I will at the end have a website and I can make viral content, viral videos even that I'm going for a hike and in 10 minutes I have a working prototype of whatever software website application I described."

## Core Architecture

### Agent Separation
- **Nimbus** (current): General assistant, coordination, communication
- **Agent Master** (new): Dedicated coding/programming multi-agent system
  - Will have its OWN database (separate from Nimbus knowledge graph)
  - Focused purely on software development
  - Nimbus can work with Agent Master and use its features

## The Four Pillars

### Pillar 1: Smart Multi-Thread Management
**Problem:** Currently one WhatsApp session = one thread. Zsolti talks about multiple topics (architecture, design, planning) in one message.

**Solution:**
- One universal chat interface (could still be WhatsApp)
- OpenClaw manages internal sub-sessions/threads
- Automatic topic detection and routing
- Messages can spawn 1-5 topics automatically
- Topics persist across messages (design continues in design thread)

**Example Flow:**
- Message 1: "Architecture and design" → Spawns Thread A (arch) + Thread B (design)
- Message 2: "Design and planning" → Continues Thread B + Spawns Thread C (planning)
- Result: 3 active threads, user can switch between them

### Pillar 2: Visualization & Interface
**Problem:** Coding agents (Claude Code, Gemini CLI, Codex) output massive text walls. Hard to overview.

**Solution:**
- **Simplified summaries:** 100 lines → 5 lines explaining what happened
- **Animations:** Checkmarks, progress indicators, playful interactions
- **Diagrams:** Visual project planning (boxes, lines, node diagrams)
- **Screenshots in WhatsApp:** Visual feedback within current interface

**Ultimate Interface Vision:**
- Simple text input at bottom
- Main screen: Visual bubbles or node diagram
- Clickable processes/threads
- Each process shows simplified, animated responses
- Switch between spawned sub-processes easily

### Pillar 3: Multi-Agent System with Specialized Agents
**Concept:** Software development has distinct phases, each requiring different expertise. Instead of one generic coding agent, create ~10 specialized agents.

**Planning Phase Agents (Example):**
1. **High-level/Product Agent** — Use cases, user stories, non-technical descriptions
2. **Architecture Agent** — Technical specifications for developers (databases, APIs, structure)
3. **Visual/UX Agent** — Design systems, colors, styles, look-and-feel

**Implementation Phase Agents:**
- Database specialist (Postgres, SQL, Supabase)
- Authentication specialist
- Storage specialist
- AI integration specialist (Gemini, local models, STT/TTS)
- Frontend specialist
- Backend/API specialist
- DevOps/deployment specialist

**Thread-Agent Relationship:**
- Each thread (from Pillar 1) should be taken over by ONE agent
- Question posed: Should one thread ever have multiple agents? 
- **Nimbus Assessment:** Start with 1-thread-1-agent. Simpler, clearer ownership. Can evolve to handoffs later if needed.

**Agent Implementation Options:**
1. **Claude Code native agents** — Check if global agent setup exists
2. **Kimi (fallback)** — If Claude Code agents insufficient
3. **System prompts as "agents"** — Call Cloud Code with specific system prompts describing the agent's expertise
4. **MCP + Skills per agent** — Each agent gets dedicated tools:
   - Database agent → Supabase MCP, SQL skills
   - Auth agent → Auth0/Supabase Auth MCP
   - AI agent → Gemini API, local model tools
   - etc.

**Key Principle:** Don't reinvent if existing solutions work. Research first:
- Multi-process visualization tools
- Thread management systems
- Agent frameworks (OpenAI Agents, AutoGen, etc.)

### Pillar 4: Self-Hosted Infrastructure & Deployment
**Goal:** Zero-cost testing until ready for production scale

**Local Infrastructure on Mac Studio M1 Max:**
- **Self-hosted Supabase** — Postgres + Auth + Storage (free, local)
- **OpenClaw Gateway** — Already running
- **Deployment ports open** — For local testing

**Domain Strategy:**
- Base domain: `kalosoft.co` (already owned, unused)
- Subdomain pattern: `projectname.kalosoft.co`
- CNAME records pointing to local deployments
- Publicly accessible for testing (up to 10-20 users)

**API Key Strategy:**
- Reuse existing keys for all test projects:
  - Gemini API (for generation)
  - Google Cloud (for services)
  - Existing accounts for quick testing
- No cost until promotion to "production"

**Multi-Instance Supabase:**
- Papi's VPS already has custom multi-instance Supabase setup
- Each project gets isolated database instance
- Nimbus needs access to study this configuration
- Can create new schemas programmatically

**Deployment Flow:**
1. Talk to AI → Project spec created
2. Agents implement → Code generated
3. Local Supabase → Database + auth provisioned
4. Deploy to local port → `myapp.kalosoft.co`
5. Test with small group → Iterate
6. **Later:** Migrate to cloud Supabase/Vercel for production

## UI/Interface Strategy

### Two-Track Approach
Papi (Puppy) outlined parallel interface development:

**1. Terminal UI (Fastest for Testing)**
- Priority: Speed of development and testing
- May need API layer for terminal interface
- Always faster for power users
- Start here to validate multi-agent/thread logic

**2. Web/App-like UI (Ultimate Goal)**
- Visual, playful, Apple-style minimalism
- Minimal buttons, maximum visual feedback
- Node diagrams, animations, simplified summaries
- Repository already researched (3 different UI repos found)

### Design Philosophy
> "Apple style of coding — least amount of buttons, most amount of visuals. Intuitive."

- 100 lines of code output → 5-line visual summary
- Checkmarks, progress bars, playful animations
- Screenshot-based updates in WhatsApp (interim)
- Clickable nodes representing threads/agents

## Research Requirements

Before building, investigate existing solutions:

### Multi-Process Management
- [ ] OpenClaw native process/thread management
- [ ] Cloud Code agent capabilities
- [ ] Open-source workflow orchestrators (Temporal, Airflow, etc.)
- [ ] AI agent frameworks (OpenAI Agents SDK, AutoGen, CrewAI)

### Visualization
- [ ] Terminal-based process visualizers
- [ ] Web-based node/graph editors (React Flow, etc.)
- [ ] Animation libraries for coding progress
- [ ] Screenshot/preview generation tools

### Existing Tools to Review
From earlier research (3 repositories):
1. AI chat interface (terminal-based)
2. UI-focused interface (web/app)
3. Terminal UI (TUI) framework

**Principle:** Use existing wheels where possible. Only build custom visualization if nothing meets the "playful, simplified" requirement.

## Key Distinctions

### Current State vs Desired State
| Current | Desired |
|---------|---------|
| Single thread per session | Multi-thread with smart routing |
| Text-only responses | Visual + animated + simplified |
| One agent (Nimbus) | Separate agents: Nimbus + Agent Master |
| Generic coding output | Summarized, visual coding feedback |
| WhatsApp as primary interface | Dedicated visual interface (eventually) |

### Agent Master Specifics
- Own database (not shared with Nimbus knowledge graph)
- Handles all coding/programming tasks
- Proxies: Claude Code, Gemini CLI, Codex (GPT-5.3-Codex)
- Produces simplified, visual outputs
- Manages multiple coding threads simultaneously

## Implementation Notes
- Must create **Agent Master** as separate entity from Nimbus
- Agent Master needs workspace folder and documentation
- Database separation is critical
- Visualization system needs design
- WhatsApp can be interim interface, but dedicated UI is goal

## Related Documentation
- See: `/home/papperpictures/.openclaw/agents/nimbus/workspace/mac-studio/concepts/` for hardware reference
- Agent Master documentation to be created separately

## Next Steps

### Immediate (This Week)
1. **Research existing tools** — Multi-agent frameworks, process orchestrators, visualization libraries
2. **Audit Papi's VPS Supabase setup** — Study multi-instance configuration, get access credentials
3. **Claude Code agent investigation** — Check if global agents can be configured
4. **Review 3 UI repositories** — Found earlier by Papi/Zsolti

### Design Phase
5. **Agent taxonomy** — Finalize the ~10 specialized agents and their responsibilities
6. **Thread-agent mapping** — Confirm 1-thread-1-agent vs multi-agent handoffs
7. **MCP/Skills inventory** — List required tools for each agent type
8. **Domain/DNS planning** — CNAME structure for kalosoft.co subdomains

### MVP Scope
9. **Start with Terminal UI** — Faster to test multi-agent logic
10. **Pick 2-3 core agents first** — Don't build all 10 at once
11. **Single project type initially** — Web apps only, expand later
12. **Local Supabase only** — Cloud migration comes after MVP works

### Documentation
13. Create Agent Master workspace (separate from Nimbus)
14. Document agent specifications
15. Create system architecture diagram
16. Set up kalosoft.co subdomain testing

### Technical Decisions Needed
- [ ] Claude Code agents vs system prompts vs custom agent framework
- [ ] Terminal UI framework choice
- [ ] Web UI framework choice (React, Vue, Svelte?)
- [ ] Database per project vs schema per project
- [ ] Deployment: Docker, native, or other?

---
*Meeting complete. Four pillars defined. Ready for research and prototyping phase.*
