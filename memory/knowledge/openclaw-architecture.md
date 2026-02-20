# OpenClaw Source Architecture

> Created: 2026-02-03
> Source: /app/src/ (direct code study)
> Method: Entry-point analysis of index.ts / main files, not line-by-line reading

---

## Module Map

### Core Runtime

| Directory | Purpose | Key Files | Key Exports |
|-----------|---------|-----------|-------------|
| `gateway/` | **WebSocket/HTTP server** — the heart of OpenClaw. Starts the gateway daemon, manages WS clients, routes RPC methods, serves Control UI and OpenAI-compatible HTTP endpoints. | `server.ts` → `server.impl.ts` (main startup), `call.ts` (client-side RPC), `net.ts` (bind/networking), `boot.ts` (BOOT.md runner) | `startGatewayServer()`, `callGateway()`, `GatewayServer`, `GatewayClient` |
| `agents/` | **Agent execution engine** — runs LLM conversations. Handles model selection, auth profiles, tool registration, CLI backends (Claude Code), embedded pi-agent, skills, workspaces. No index.ts — flat module with many focused files. | `agent-scope.ts` (agent config resolution), `pi-embedded-runner/run.ts` (main agent loop), `cli-runner.ts` (CLI backend like Claude Code), `model-selection.ts`, `auth-profiles.ts`, `skills.ts`, `tools/` (tool definitions) | `runEmbeddedPiAgent()`, `runCliAgent()`, `listAgentIds()`, `resolveAgentWorkspaceDir()` |
| `commands/` | **CLI command implementations** — the bridge between CLI/gateway RPC and the agent engine. Each file is a command or subcommand. | `agent.ts` (core `agentCommand()`), `agents.ts`, `auth-choice.ts` (provider setup wizard), `agent/delivery.ts`, `agent/session.ts` | `agentCommand()` — the main entry that resolves sessions, picks models, runs agent, delivers results |
| `config/` | **Configuration system** — loads, validates, migrates `openclaw.json`. Split into focused type files. | `config.ts` (re-exports), `io.ts` (read/write), `types.ts` (re-exports ~30 type files), `zod-schema.ts` (validation), `sessions.ts` (session store) | `loadConfig()`, `OpenClawConfig`, `writeConfigFile()`, session store CRUD |
| `channels/` | **Messaging channel abstraction** — defines the channel plugin interface and registry. Actual channel implementations are separate dirs. | `registry.ts` (channel ordering + meta), `session.ts` (inbound session tracking), `plugins/types.ts` (plugin interface), `dock.ts` | `ChannelPlugin`, `ChannelId`, `normalizeChatChannelId()`, `listChatChannels()` |
| `plugins/` | **Plugin system** — loader, registry, hooks, services, CLI extensions, HTTP handlers, provider plugins. | `runtime.ts` (global singleton registry), `registry.ts` (PluginRegistry builder), `loader.ts`, `hooks.ts`, `services.ts` | `PluginRegistry`, `setActivePluginRegistry()`, `requireActivePluginRegistry()` |

### Agent Subsystems

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `auto-reply/` | **Inbound message processing** — command detection, reply dispatch, thinking levels, heartbeat, templating. The "brain" that decides what to do with each incoming message. | `dispatch.ts` (entry point), `reply.ts` (re-exports), `templating.ts` (MsgContext type), `command-detection.ts`, `thinking.ts`, `heartbeat.ts` |
| `routing/` | **Session key resolution** — maps (channel, account, peer) → (agentId, sessionKey). Supports bindings for multi-agent setups. | `resolve-route.ts` (main router), `bindings.ts`, `session-key.ts` |
| `sessions/` | **Session metadata** — level overrides, model overrides, send policy, transcript events. Lightweight; heavy session logic lives in config/sessions. | `level-overrides.ts`, `model-overrides.ts`, `send-policy.ts`, `session-key-utils.ts` |
| `memory/` | **Vector memory search** — indexes workspace + session files using embeddings (OpenAI or Gemini), stores in SQLite + sqlite-vec. Hybrid BM25 + vector search. | `index.ts`, `manager.ts` (MemoryIndexManager), `embeddings.ts`, `hybrid.ts`, `internal.ts` |
| `hooks/` | **Internal hook system** — event-driven extensibility for agent, session, command, gateway events. | `internal-hooks.ts` |
| `cron/` | **Cron service** — scheduled job execution with agent runs. Persisted to store. | `service.ts` (CronService class), `schedule.ts`, `store.ts`, `isolated-agent.ts` |

### Channel Implementations

| Directory | Purpose |
|-----------|---------|
| `telegram/` | Telegram Bot API channel |
| `whatsapp/` | WhatsApp Web (baileys) channel |
| `discord/` | Discord Bot API channel |
| `signal/` | Signal via signal-cli REST |
| `slack/` | Slack Socket Mode channel |
| `imessage/` | iMessage (macOS only) channel |
| `line/` | LINE channel |
| `web/` | WhatsApp Web auto-reply + web accounts |

### Infrastructure & Support

| Directory | Purpose |
|-----------|---------|
| `infra/` | Low-level infra: agent events, device identity, bonjour discovery, heartbeat runner, tailnet, TLS, environment, skills-remote, exec-approval |
| `cli/` | CLI framework: argv parsing, browser CLI, command formatting, deps injection |
| `daemon/` | Daemon management: launchd plist, paths, service lifecycle |
| `browser/` | Browser automation (Playwright) |
| `canvas-host/` | Canvas host server for rendering UI panels |
| `media/` | MIME detection, media processing |
| `media-understanding/` | Image/media analysis before agent processing |
| `link-understanding/` | URL content extraction |
| `tts/` | Text-to-speech |
| `markdown/` | Markdown processing utilities |
| `logging/` | Subsystem logger, diagnostic logging |
| `security/` | Audit, filesystem security, content scanning |
| `process/` | Shell process execution, command queue |
| `providers/` | LLM provider-specific code (GitHub Copilot auth, Google, Qwen OAuth) |
| `pairing/` | Mobile node pairing protocol |
| `node-host/` | Node host (mobile device) runtime |
| `acp/` | Agent Communication Protocol |
| `plugin-sdk/` | SDK for external plugin development |
| `shared/` | Shared text utilities |
| `utils/` | Common utility functions |
| `compat/` | Backward compatibility shims |
| `tui/` | Terminal UI components |
| `terminal/` | Terminal input/output |
| `wizard/` | Setup wizard (onboarding) |
| `scripts/` | Build/maintenance scripts |
| `docs/` | Documentation generation |
| `test-helpers/` | Test infrastructure |
| `test-utils/` | Test utilities |
| `types/` | TypeScript declaration files (.d.ts) for external libs |

---

## Data Flow

### Inbound Message: Channel → Agent → Response

```
┌──────────────┐     ┌───────────────┐     ┌────────────────┐
│  Channel      │────▶│  auto-reply/   │────▶│  routing/       │
│  (telegram,   │     │  dispatch.ts   │     │  resolve-route  │
│   discord,    │     │                │     │  .ts            │
│   whatsapp…)  │     │  Builds        │     │                │
│               │     │  MsgContext    │     │  Maps channel   │
│  Receives     │     │  (templating)  │     │  + peer →       │
│  raw message  │     │                │     │  agentId +      │
│               │     │  Detects       │     │  sessionKey     │
│               │     │  /commands     │     │                │
└──────────────┘     └───────────────┘     └────────────────┘
                                                    │
                                                    ▼
┌──────────────┐     ┌───────────────┐     ┌────────────────┐
│  Channel      │◀────│  auto-reply/   │◀────│  commands/      │
│  sends reply  │     │  reply         │     │  agent.ts       │
│  back to user │     │  dispatcher    │     │  agentCommand() │
│               │     │  (chunking,    │     │                │
│               │     │   typing)      │     │  • resolves     │
│               │     │                │     │    session      │
│               │     │                │     │  • picks model  │
│               │     │                │     │  • runs agent   │
│               │     │                │     │  • delivers     │
└──────────────┘     └───────────────┘     └────────────────┘
                                                    │
                                                    ▼
                                            ┌────────────────┐
                                            │  agents/        │
                                            │  pi-embedded-   │
                                            │  runner/run.ts  │
                                            │                │
                                            │  OR             │
                                            │                │
                                            │  agents/        │
                                            │  cli-runner.ts  │
                                            │  (Claude Code)  │
                                            │                │
                                            │  • System prompt│
                                            │  • Tools        │
                                            │  • LLM call     │
                                            │  • Tool loop    │
                                            └────────────────┘
```

### Gateway WebSocket Flow (webchat / Control UI)

```
Client (browser/CLI) ──WS──▶ gateway/server.impl.ts
                              │
                              ├── gateway/client.ts (WS protocol)
                              ├── gateway/auth.ts (token/password auth)
                              ├── gateway/server-methods.ts (RPC dispatch)
                              │     ├── server-chat.ts (chat runs)
                              │     ├── server-channels.ts (channel management)
                              │     ├── server-browser.ts (browser control)
                              │     └── server-mobile-nodes.ts (device control)
                              │
                              ├── gateway/server-http.ts (REST endpoints)
                              │     ├── openai-http.ts (/v1/chat/completions)
                              │     └── openresponses-http.ts (/v1/responses)
                              │
                              └── gateway/control-ui.ts (web dashboard)
```

### Agent Execution Detail

```
agentCommand() [commands/agent.ts]
  │
  ├── resolveSession() → sessionId, sessionKey, sessionEntry
  ├── resolveConfiguredModelRef() → provider + model
  ├── buildWorkspaceSkillSnapshot() → skills available to agent
  ├── runWithModelFallback() → tries primary, falls back on failure
  │     │
  │     ├── runEmbeddedPiAgent() [agents/pi-embedded-runner/run.ts]
  │     │     ├── Builds system prompt (bootstrap files, skills, identity)
  │     │     ├── Registers tools (bash, browser, message, memory, cron, etc.)
  │     │     ├── Calls LLM via @mariozechner/pi-agent-core
  │     │     ├── Executes tool calls in loop
  │     │     └── Returns result + payloads
  │     │
  │     └── runCliAgent() [agents/cli-runner.ts]
  │           ├── Spawns external CLI process (e.g. Claude Code)
  │           ├── Passes prompt + system prompt
  │           └── Parses JSONL output
  │
  ├── updateSessionStoreAfterAgentRun() → persists token counts, model info
  └── deliverAgentCommandResult() → sends response to channel/client
```

---

## Key Interfaces

### MsgContext (auto-reply/templating.ts)
The universal inbound message representation. Every channel converts its native format into this.
```typescript
type MsgContext = {
  Body?: string;              // Raw message text
  BodyForAgent?: string;      // Prompt body with context
  CommandBody?: string;       // For command detection
  From?: string;              // Sender identifier
  To?: string;                // Recipient
  SessionKey?: string;        // Resolved session
  AccountId?: string;         // Provider account
  Channel?: OriginatingChannelType;
  ChatType?: "dm" | "group";
  GroupId?: string;
  Images?: ImageContent[];
  // ... many more fields for threading, replies, forwarding, etc.
}
```

### OpenClawConfig (config/types.ts)
The main configuration object. Split across ~30 type files covering every subsystem.
Re-exported through `config/types.ts`. Validated by Zod schema.

### ChannelPlugin (channels/plugins/types.ts)
Interface every channel must implement. Provides adapters for:
- `ChannelOutboundAdapter` — sending messages
- `ChannelSetupAdapter` — configuration
- `ChannelStatusAdapter` — health checks
- `ChannelSecurityAdapter` — DM policies
- `ChannelHeartbeatAdapter` — periodic checks
- `ChannelMessagingAdapter` — message actions (send, edit, delete, react)
- `ChannelThreadingAdapter` — thread support
- Plus: auth, directory, group, pairing, streaming adapters

### PluginRegistry (plugins/registry.ts)
Global singleton holding all registered plugins:
```typescript
type PluginRegistry = {
  plugins: [];         // All loaded plugins
  tools: [];           // Agent tools from plugins
  hooks: [];           // Event hooks
  channels: [];        // Channel plugin registrations
  providers: [];       // LLM provider plugins
  gatewayHandlers: {}; // WS RPC method handlers
  httpHandlers: [];    // HTTP middleware
  httpRoutes: [];      // HTTP route handlers
  services: [];        // Background services
  commands: [];        // CLI commands
  diagnostics: [];     // Health diagnostics
}
```

### EmbeddedPiRunResult (agents/pi-embedded-runner/types.ts)
Return type from the main agent execution. Contains response text, tool payloads, usage metrics, abort status.

### AgentTool / AnyAgentTool (agents/tools/common.ts)
From `@mariozechner/pi-agent-core`. Every tool (bash, browser, message, memory, etc.) implements this interface.

### SessionEntry (config/sessions.ts)
Persisted per-session state: model overrides, thinking level, skills snapshot, token counts, channel info, timestamps.

---

## Dependencies

### Import Graph (major modules)

```
gateway/server.impl.ts (TOP LEVEL — imports nearly everything)
  ├── agents/agent-scope.ts
  ├── agents/subagent-registry.ts
  ├── agents/skills/refresh.ts
  ├── channels/plugins/
  ├── cli/deps.ts
  ├── config/config.ts
  ├── infra/* (agent-events, heartbeat, skills-remote, restart, device-identity, etc.)
  ├── logging/
  ├── plugins/ (loader, services, runtime)
  ├── wizard/onboarding.ts
  ├── gateway/server-*.ts (all server sub-modules)
  └── cron/

commands/agent.ts (AGENT EXECUTION — second biggest hub)
  ├── agents/agent-scope.ts
  ├── agents/auth-profiles.ts
  ├── agents/cli-runner.ts
  ├── agents/model-selection.ts
  ├── agents/model-fallback.ts
  ├── agents/pi-embedded.ts
  ├── agents/skills.ts
  ├── auto-reply/thinking.ts
  ├── config/config.ts
  ├── config/sessions.ts
  ├── infra/agent-events.ts
  ├── routing/session-key.ts
  ├── sessions/*
  └── utils/message-channel.ts

auto-reply/dispatch.ts (INBOUND MESSAGE HANDLER)
  ├── config/config.ts
  ├── auto-reply/templating.ts (MsgContext)
  ├── auto-reply/reply/ (dispatchers)
  └── auto-reply/types.ts

channels/registry.ts (CHANNEL LAYER)
  ├── channels/plugins/types.ts
  └── plugins/runtime.ts

memory/manager.ts (MEMORY/SEARCH)
  ├── agents/agent-scope.ts
  ├── agents/memory-search.ts
  ├── config/config.ts
  ├── config/sessions/paths.ts
  ├── memory/embeddings.ts
  ├── memory/internal.ts
  ├── memory/hybrid.ts
  ├── memory/sqlite.ts
  └── memory/sqlite-vec.ts

routing/resolve-route.ts (SESSION ROUTING)
  ├── agents/agent-scope.ts
  ├── config/config.ts
  ├── routing/bindings.ts
  └── routing/session-key.ts
```

### Dependency Layers (top → bottom)

```
┌─────────────────────────────────────────────┐
│  gateway/server.impl.ts                      │  ← Top: orchestrates everything
├─────────────────────────────────────────────┤
│  commands/agent.ts  │  auto-reply/dispatch   │  ← Execution + message handling
├─────────────────────────────────────────────┤
│  agents/*  │  channels/*  │  plugins/*        │  ← Core subsystems
├─────────────────────────────────────────────┤
│  routing/  │  sessions/  │  memory/  │ cron/  │  ← Support subsystems
├─────────────────────────────────────────────┤
│  config/  │  infra/  │  logging/  │  hooks/   │  ← Foundation
├─────────────────────────────────────────────┤
│  utils/  │  shared/  │  types/  │  compat/    │  ← Primitives
└─────────────────────────────────────────────┘
```

### External Dependencies (key ones)
- `@mariozechner/pi-agent-core` — Core agent loop (tool calling, conversation management)
- `@mariozechner/pi-ai` — LLM API abstraction (ImageContent type, etc.)
- `chokidar` — File watching (memory index)
- `node:sqlite` — Built-in SQLite (memory storage)
- `sqlite-vec` — Vector extension for SQLite
- Zod — Config validation

---

## Agent Tools Registry

Tools available to the agent (from `agents/tools/`):

| Tool File | Purpose |
|-----------|---------|
| `browser-tool.ts` | Browser automation via Playwright |
| `canvas-tool.ts` | Canvas rendering control |
| `cron-tool.ts` | Cron job management |
| `discord-actions.ts` | Discord-specific actions |
| `gateway-tool.ts` | Gateway control |
| `image-tool.ts` | Image analysis |
| `memory-tool.ts` | Memory search |
| `message-tool.ts` | Send messages across channels |
| `nodes-tool.ts` | Mobile node control (camera, screen, etc.) |
| `session-status-tool.ts` | Session info |
| `sessions-history-tool.ts` | Conversation history |
| `sessions-list-tool.ts` | List active sessions |
| `sessions-send-tool.ts` | Send to other sessions |
| `sessions-spawn-tool.ts` | Spawn sub-agents |
| `slack-actions.ts` | Slack-specific actions |
| `telegram-actions.ts` | Telegram-specific actions |
| `tts-tool.ts` | Text-to-speech |
| `web-fetch-tool.ts` | Fetch URL content |
| `web-search-tool.ts` | Web search |

Plus bash tools (`bash-tools.ts`) for exec/process — defined at agents/ root level, not in tools/.

---

## Notes

- **No monolithic index.ts** in agents/ — it's a flat directory with ~100+ files organized by concern
- **Plugin architecture** is central: channels, providers, tools, hooks, HTTP routes all go through the plugin registry
- **Two agent backends**: embedded pi-agent (default, in-process) and CLI runners (Claude Code, etc.)
- **Session keys** encode: `agent:{agentId}:{mainKey}:{channel}:{accountId}:{peerScope}` — see `routing/session-key.ts`
- **Config is JSON5** at `~/.openclaw/openclaw.json`, validated by Zod, auto-migrated from legacy formats
- **Memory search** uses hybrid BM25 + vector similarity, powered by SQLite + sqlite-vec
- **Gateway protocol** is WebSocket JSON-RPC with hello/auth handshake
