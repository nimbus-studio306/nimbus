# How to Extend OpenClaw — Practical Guide

> Last updated: 2026-02-04
> Source: `/app/docs/`, `/app/src/`, `/app/extensions/`, `/app/skills/`

OpenClaw has four extension systems, ordered from simplest to most powerful:

1. **Skills** — Prompt-based (SKILL.md files, no code required)
2. **Hooks** — Event-driven TypeScript handlers (HOOK.md + handler.ts)
3. **Plugins** — Full in-process extensions (tools, channels, providers, services)
4. **Configuration** — Model providers, tool policies, env injection via `openclaw.json`

---

## 1. Skills System (Simplest — No Code Required)

Skills are the primary way to add capabilities. A skill is a **directory with a `SKILL.md`** that tells the LLM how to use tools/scripts.

### Skill Locations (Precedence: highest → lowest)

| Location | Scope | Path |
|----------|-------|------|
| Workspace skills | Per-agent | `<workspace>/skills/` |
| Managed skills | All agents | `~/.openclaw/skills/` |
| Extra dirs | All agents | `skills.load.extraDirs` in config |
| Bundled skills | All agents | Shipped with OpenClaw |

### Creating a Skill

```bash
mkdir -p ~/.openclaw/workspace/skills/my-tool
```

Create `~/.openclaw/workspace/skills/my-tool/SKILL.md`:

```markdown
---
name: my-tool
description: Query my local API for project status
metadata: {"openclaw":{"emoji":"🔧","requires":{"env":["MY_API_KEY"]},"primaryEnv":"MY_API_KEY"}}
---

# My Tool

When the user asks about project status, call the local API:

```bash
curl -s -H "Authorization: Bearer $MY_API_KEY" http://localhost:8080/api/status
```

Report the results in a friendly format.
```

### SKILL.md Frontmatter Reference

**Required:**
```yaml
name: skill-name          # Unique identifier
description: Short desc   # Shown in skill lists
```

**Optional:**
```yaml
homepage: https://...     # URL for docs
user-invocable: true      # Expose as /command (default: true)
disable-model-invocation: false  # Hide from model prompt (default: false)
command-dispatch: tool     # Bypass model, invoke tool directly
command-tool: tool_name    # Tool to invoke when command-dispatch: tool
command-arg-mode: raw      # Forward raw args string
```

**Metadata (single-line JSON):**
```yaml
metadata: {"openclaw":{"emoji":"🔧","always":true,"os":["darwin","linux"],"requires":{"bins":["uv"],"anyBins":["ffmpeg","ffprobe"],"env":["API_KEY"],"config":["browser.enabled"]},"primaryEnv":"API_KEY","install":[{"id":"brew","kind":"brew","formula":"my-tool","bins":["my-tool"],"label":"Install via brew"}]}}
```

Key metadata fields:
- `always: true` — Skip all gates, always include
- `os: ["darwin","linux"]` — Platform filter
- `requires.bins` — All must exist on PATH
- `requires.anyBins` — At least one must exist
- `requires.env` — Env vars (can come from config `skills.entries.*.env`)
- `requires.config` — Config paths that must be truthy
- `primaryEnv` — Maps to `skills.entries.*.apiKey`

### Using `{baseDir}` in Skills

Reference the skill's own directory for scripts:

```markdown
```bash
uv run {baseDir}/scripts/my_script.py --prompt "generate something"
```
```

### Skill Config in `openclaw.json`

```json5
{
  "skills": {
    "entries": {
      "my-tool": {
        "enabled": true,
        "apiKey": "sk-...",
        "env": {
          "MY_API_KEY": "sk-..."
        },
        "config": {
          "endpoint": "http://localhost:8080"
        }
      }
    },
    "load": {
      "extraDirs": ["~/Projects/shared-skills/"],
      "watch": true,
      "watchDebounceMs": 250
    },
    "install": {
      "preferBrew": true,
      "nodeManager": "npm"
    }
  }
}
```

### Real-World Skill Examples

**Image generation (nano-banana-pro):**
```markdown
---
name: nano-banana-pro
description: Generate or edit images via Gemini 3 Pro Image
metadata: {"openclaw":{"emoji":"🍌","requires":{"bins":["uv"],"env":["GEMINI_API_KEY"]},"primaryEnv":"GEMINI_API_KEY","install":[{"id":"uv-brew","kind":"brew","formula":"uv","bins":["uv"],"label":"Install uv (brew)"}]}}
---
# Nano Banana Pro
Generate: `uv run {baseDir}/scripts/generate_image.py --prompt "description" --filename "output.png"`
Edit: `uv run {baseDir}/scripts/generate_image.py --prompt "instructions" --filename "out.png" -i "/path/in.png"`
```

**CLI wrapper (summarize):**
```markdown
---
name: summarize
description: Summarize or extract text from URLs, podcasts, local files
metadata: {"openclaw":{"emoji":"🧾","requires":{"bins":["summarize"]},"install":[{"id":"brew","kind":"brew","formula":"steipete/tap/summarize","bins":["summarize"],"label":"Install summarize (brew)"}]}}
---
# Summarize
```bash
summarize "https://example.com" --model google/gemini-3-flash-preview
```
```

### Skill CLI

```bash
openclaw skills list              # All skills
openclaw skills list --eligible   # Only ready-to-run
openclaw skills info <name>       # Detailed info
openclaw skills check             # Eligibility summary
```

### Hot Reload

Skills auto-refresh when files change (watcher enabled by default). Changes take effect on the next agent turn.

---

## 2. Hooks System (Event-Driven)

Hooks run TypeScript code in response to events. They're more powerful than skills but still straightforward.

### Hook Locations

| Location | Path |
|----------|------|
| Workspace hooks | `<workspace>/hooks/` |
| Managed hooks | `~/.openclaw/hooks/` |
| Bundled hooks | Shipped with OpenClaw |

### Creating a Hook

```bash
mkdir -p ~/.openclaw/workspace/hooks/my-hook
```

**`HOOK.md`:**
```markdown
---
name: my-hook
description: "Log all /new commands to a custom file"
metadata: {"openclaw":{"emoji":"📋","events":["command:new"],"requires":{"config":["workspace.dir"]}}}
---
# My Custom Hook
Logs session resets to a custom audit trail.
```

**`handler.ts`:**
```typescript
import fs from "node:fs/promises";
import path from "node:path";
import type { HookHandler } from "../../../src/hooks/hooks.js";

const handler: HookHandler = async (event) => {
  if (event.type !== "command" || event.action !== "new") return;
  
  const logPath = path.join(
    event.context?.workspaceDir || process.env.HOME + "/.openclaw/workspace",
    "memory",
    "command-audit.log"
  );
  
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    sessionKey: event.sessionKey,
    action: event.action,
  });
  
  await fs.appendFile(logPath, entry + "\n", "utf-8");
  console.log("[my-hook] Logged command event");
};

export default handler;
```

### Available Hook Events

| Event | Trigger |
|-------|---------|
| `command:new` | User runs `/new` |
| `command:reset` | User runs `/reset` |
| `gateway:startup` | Gateway starts (after channels) |

### Hook Config in `openclaw.json`

```json5
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "my-hook": {
          "enabled": true
        },
        "session-memory": {
          "enabled": true,
          "messages": 25   // Custom config per hook
        }
      },
      "load": {
        "extraDirs": ["~/Projects/my-hooks/"]
      }
    }
  }
}
```

### Bundled Hooks

| Hook | Events | Purpose |
|------|--------|---------|
| `session-memory` | `command:new` | Save session context to memory files |
| `command-logger` | all commands | Audit trail in `~/.openclaw/logs/commands.log` |
| `boot-md` | `gateway:startup` | Run BOOT.md on gateway start |
| `soul-evil` | various | Fun: occasionally swap SOUL.md content |

### Hook CLI

```bash
openclaw hooks list              # All hooks
openclaw hooks enable <name>     # Enable a hook
openclaw hooks disable <name>    # Disable a hook
openclaw hooks check             # Eligibility summary
openclaw hooks install <path>    # Install hook pack
```

---

## 3. Plugin System (Full Power)

Plugins are in-process extensions that can register **tools, channels, providers, services, commands, HTTP routes, and hooks**. This is the most powerful extension mechanism.

### Plugin Locations (Discovery Order)

| Location | Path | Origin |
|----------|------|--------|
| Config paths | `plugins.load.paths` | `config` |
| Workspace | `<workspace>/.openclaw/extensions/` | `workspace` |
| Global | `~/.openclaw/extensions/` | `global` |
| Bundled | Shipped with OpenClaw | `bundled` |

### Creating a Plugin

#### Directory Structure

```
~/.openclaw/extensions/my-plugin/
├── openclaw.plugin.json    # Required manifest
├── index.ts                # Entry point
├── package.json            # Optional (for dependencies)
└── src/
    └── my-tool.ts          # Tool implementation
```

#### Manifest (`openclaw.plugin.json`)

**Required fields:**
```json
{
  "id": "my-plugin",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  }
}
```

**Full manifest:**
```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "description": "Does cool things",
  "version": "1.0.0",
  "kind": "memory",
  "channels": ["my-channel"],
  "providers": ["my-provider"],
  "skills": ["skills/"],
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "endpoint": { "type": "string" },
      "apiKey": { "type": "string" }
    }
  },
  "uiHints": {
    "endpoint": { "label": "API Endpoint", "placeholder": "http://localhost:8080" },
    "apiKey": { "label": "API Key", "sensitive": true }
  }
}
```

#### Entry Point (`index.ts`)

```typescript
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";

export default function register(api: OpenClawPluginApi) {
  api.logger.info("My plugin loaded!");
  
  // Register a tool
  api.registerTool({
    name: "my_tool",
    description: "Does something useful",
    parameters: {
      type: "object",
      properties: {
        input: { type: "string", description: "The input to process" }
      },
      required: ["input"]
    },
    async execute(_id, params) {
      const result = await doSomething(params.input);
      return { content: [{ type: "text", text: result }] };
    }
  });
}
```

**Alternative: Object-style export:**
```typescript
const plugin = {
  id: "my-plugin",
  name: "My Plugin",
  description: "Does cool things",
  register(api: OpenClawPluginApi) {
    // Registration logic
  }
};
export default plugin;
```

### Plugin API Reference (`OpenClawPluginApi`)

The `api` object provides:

```typescript
interface OpenClawPluginApi {
  // Identity
  id: string;
  name: string;
  source: string;
  config: OpenClawConfig;       // Full gateway config
  pluginConfig?: Record<string, unknown>;  // Plugin-specific config
  runtime: PluginRuntime;       // Runtime utilities
  logger: PluginLogger;         // Logging
  
  // Registration methods
  registerTool(tool, opts?);     // Agent tools
  registerChannel(registration); // Chat channels
  registerProvider(provider);    // Model providers
  registerHook(events, handler, opts?);  // Event hooks
  registerHttpHandler(handler);  // HTTP request handler
  registerHttpRoute({ path, handler }); // Named HTTP route
  registerGatewayMethod(method, handler); // WebSocket RPC
  registerCli(registrar, opts?); // CLI commands
  registerService(service);      // Background services
  registerCommand(command);      // Chat commands (bypass LLM)
  
  // Lifecycle hooks (typed)
  on(hookName, handler, opts?);  // Typed lifecycle events
  
  // Utilities
  resolvePath(input);            // Resolve ~ paths
}
```

### Registering Tools

**Required (always available) tool:**
```typescript
api.registerTool({
  name: "lookup",
  description: "Look up information",
  parameters: {
    type: "object",
    properties: { query: { type: "string" } },
    required: ["query"]
  },
  async execute(_id, params) {
    return { content: [{ type: "text", text: `Result for: ${params.query}` }] };
  }
});
```

**Optional (opt-in) tool:**
```typescript
api.registerTool(
  {
    name: "dangerous_action",
    description: "Does something risky",
    parameters: { type: "object", properties: {} },
    async execute() {
      return { content: [{ type: "text", text: "Done" }] };
    }
  },
  { optional: true }  // Must be allowlisted to use
);
```

Enable optional tools in config:
```json5
{
  "agents": {
    "list": [{
      "id": "main",
      "tools": {
        "allow": [
          "dangerous_action",   // Specific tool
          "my-plugin",          // All tools from plugin
          "group:plugins"       // All plugin tools
        ]
      }
    }]
  }
}
```

**Context-aware tool factory:**
```typescript
api.registerTool(
  (ctx) => {
    if (ctx.sandboxed) return null;  // Skip in sandbox
    return {
      name: "host_only_tool",
      description: "Only works on host",
      parameters: { type: "object", properties: {} },
      async execute() {
        return { content: [{ type: "text", text: "Running on host" }] };
      }
    };
  },
  { optional: true }
);
```

### Registering a Custom Model Provider

```typescript
api.registerProvider({
  id: "my-local-llm",
  label: "My Local LLM",
  docsPath: "/providers/my-local-llm",
  aliases: ["local"],
  envVars: ["MY_LLM_API_KEY"],
  models: {
    baseUrl: "http://localhost:11434/v1",
    apiKey: "dummy",
    api: "openai-completions",
    models: [
      {
        id: "llama3.3",
        name: "Llama 3.3",
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 128000,
        maxTokens: 8192
      }
    ]
  },
  auth: [
    {
      id: "none",
      label: "No auth needed",
      kind: "custom",
      run: async () => ({
        profiles: [],
        defaultModel: "my-local-llm/llama3.3"
      })
    }
  ]
});
```

### Registering Chat Commands

Commands bypass the LLM entirely — great for simple state toggles:

```typescript
api.registerCommand({
  name: "status",
  description: "Show system status",
  acceptsArgs: false,
  requireAuth: true,
  handler: async (ctx) => {
    return {
      text: `System OK. Channel: ${ctx.channel}`,
    };
  }
});
```

### Registering HTTP Routes

```typescript
api.registerHttpRoute({
  path: "/my-plugin/callback",
  handler: async (req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
  }
});
```

### Plugin Lifecycle Hooks

```typescript
api.on("before_agent_start", async (event, ctx) => {
  return {
    prependContext: "Today's special context: ...",
  };
});

api.on("message_sending", async (event, ctx) => {
  // Modify or cancel outgoing messages
  if (event.content.includes("secret")) {
    return { cancel: true };
  }
  return { content: event.content + "\n\n— Sent via MyPlugin" };
});

api.on("before_tool_call", async (event, ctx) => {
  console.log(`Tool ${event.toolName} called with`, event.params);
  // return { block: true, blockReason: "Not allowed" };
});

api.on("gateway_start", async (event) => {
  console.log(`Gateway started on port ${event.port}`);
});
```

**All lifecycle hooks:**

| Hook | Context | Can Modify? |
|------|---------|-------------|
| `before_agent_start` | Agent | Yes (systemPrompt, prependContext) |
| `agent_end` | Agent | No |
| `before_compaction` | Agent | No |
| `after_compaction` | Agent | No |
| `message_received` | Message | No |
| `message_sending` | Message | Yes (content, cancel) |
| `message_sent` | Message | No |
| `before_tool_call` | Tool | Yes (params, block) |
| `after_tool_call` | Tool | No |
| `tool_result_persist` | Tool | Yes (message) |
| `session_start` | Session | No |
| `session_end` | Session | No |
| `gateway_start` | Gateway | No |
| `gateway_stop` | Gateway | No |

### Plugin Config in `openclaw.json`

```json5
{
  "plugins": {
    "entries": {
      "my-plugin": {
        "enabled": true,
        "config": {
          "endpoint": "http://localhost:8080",
          "apiKey": "sk-..."
        }
      }
    },
    "load": {
      "paths": ["~/Projects/my-plugins/my-plugin"]
    }
  }
}
```

### Plugin CLI

```bash
openclaw plugins list              # All plugins
openclaw plugins info <id>         # Plugin details
openclaw plugins enable <id>       # Enable
openclaw plugins disable <id>      # Disable
openclaw plugins install <path>    # Install from path/archive
openclaw plugins install -l ./dir  # Link local directory
openclaw plugins doctor            # Diagnose issues
```

---

## 4. Model Provider Configuration (Config-Only)

### Adding Ollama (Local — Auto-Detected)

Ollama at `localhost:11434` is auto-detected. Just:

```json5
{
  "agents": {
    "defaults": {
      "model": { "primary": "ollama/llama3.3" }
    }
  }
}
```

### Adding Any OpenAI-Compatible Server (LM Studio, vLLM, MLX, etc.)

```json5
{
  "agents": {
    "defaults": {
      "model": { "primary": "mlx-server/qwen2.5-coder" }
    }
  },
  "models": {
    "mode": "merge",
    "providers": {
      "mlx-server": {
        "baseUrl": "http://mac-mini.local:8080/v1",
        "apiKey": "dummy",
        "api": "openai-completions",
        "models": [
          {
            "id": "qwen2.5-coder",
            "name": "Qwen 2.5 Coder (MLX)",
            "reasoning": false,
            "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 128000,
            "maxTokens": 8192
          }
        ]
      }
    }
  }
}
```

### Adding Anthropic-Compatible Endpoints

```json5
{
  "models": {
    "providers": {
      "my-proxy": {
        "baseUrl": "https://my-proxy.example.com/anthropic",
        "apiKey": "${MY_PROXY_KEY}",
        "api": "anthropic-messages",
        "models": [
          { "id": "claude-sonnet", "name": "Claude Sonnet via Proxy" }
        ]
      }
    }
  }
}
```

### Provider Config Defaults

When omitted, models default to:
- `reasoning: false`
- `input: ["text"]`
- `cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }`
- `contextWindow: 200000`
- `maxTokens: 8192`

---

## 5. Mac Mini M4 Max — Specific Setup Ideas

### Local Model Provider via MLX

Run mlx-server on the Mac Mini, configure in OpenClaw:

```json5
{
  "models": {
    "mode": "merge",
    "providers": {
      "mlx": {
        "baseUrl": "http://127.0.0.1:8080/v1",
        "apiKey": "local",
        "api": "openai-completions",
        "models": [
          {
            "id": "mistral-nemo",
            "name": "Mistral Nemo (MLX)",
            "contextWindow": 128000,
            "maxTokens": 8192
          }
        ]
      }
    }
  }
}
```

### Using the Mac Mini as a Remote Node

Since our gateway runs on GCP Linux but the Mac Mini is a macOS node:
- macOS-only skills become eligible when the node is connected with `system.run` allowed
- Skills run via `nodes.run` on the Mac Mini
- Binary probing happens automatically

### Custom Workspace Skills for Local Tools

Create skills in `~/.openclaw/workspace/skills/` on the GCP instance that instruct the agent to use `nodes.run` for Mac-specific tools:

```markdown
---
name: mlx-generate
description: Generate text with local MLX models on Mac Mini
metadata: {"openclaw":{"emoji":"🍎","requires":{"config":["nodes"]}}}
---

# MLX Generate

Use the Mac Mini node to run MLX inference:

```bash
nodes run --node mac-mini -- python3 -c "from mlx_lm import load, generate; ..."
```
```

---

## 6. Webhooks (External Triggers)

Enable webhook endpoint for external system integration:

```json5
{
  "hooks": {
    "enabled": true,
    "token": "your-secret-token",
    "path": "/hooks"
  }
}
```

**Wake the agent:**
```bash
curl -X POST https://your-gateway/hooks/wake \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{"text": "New email from boss@company.com", "mode": "now"}'
```

**Run an isolated agent task:**
```bash
curl -X POST https://your-gateway/hooks/agent \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Check the server status and report back",
    "sessionKey": "hook:monitor:daily",
    "deliver": true,
    "channel": "telegram",
    "model": "anthropic/claude-sonnet-4-5"
  }'
```

---

## 7. Extension Decision Matrix

| Need | Use | Complexity |
|------|-----|-----------|
| Teach agent a CLI tool | **Skill** (SKILL.md) | ⭐ |
| Inject API keys for tools | **Config** (`skills.entries.*.env`) | ⭐ |
| Add a local LLM provider | **Config** (`models.providers`) | ⭐⭐ |
| React to /new or /reset | **Hook** (HOOK.md + handler.ts) | ⭐⭐ |
| Add a new agent tool | **Plugin** (registerTool) | ⭐⭐⭐ |
| Add a model provider with auth | **Plugin** (registerProvider) | ⭐⭐⭐ |
| Add a chat channel | **Plugin** (registerChannel) | ⭐⭐⭐⭐ |
| Modify messages before sending | **Plugin** (on message_sending) | ⭐⭐⭐ |
| External system → agent | **Webhook** (POST /hooks/agent) | ⭐⭐ |
| Run something on gateway start | **Hook** (`gateway:startup`) | ⭐⭐ |
| Bypass LLM for /commands | **Plugin** (registerCommand) | ⭐⭐⭐ |

---

## 8. Full Plugin Example: Ollama Provider Plugin

A complete plugin that registers Ollama as a model provider with auto-discovery:

```
~/.openclaw/extensions/ollama-enhanced/
├── openclaw.plugin.json
├── index.ts
└── package.json
```

**`openclaw.plugin.json`:**
```json
{
  "id": "ollama-enhanced",
  "name": "Ollama Enhanced",
  "description": "Auto-discover Ollama models",
  "providers": ["ollama-local"],
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "baseUrl": { "type": "string" },
      "autoDiscover": { "type": "boolean" }
    }
  },
  "uiHints": {
    "baseUrl": { "label": "Ollama URL", "placeholder": "http://localhost:11434" }
  }
}
```

**`index.ts`:**
```typescript
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";

export default function register(api: OpenClawPluginApi) {
  const config = api.pluginConfig ?? {};
  const baseUrl = (config.baseUrl as string) || "http://localhost:11434";

  api.registerProvider({
    id: "ollama-local",
    label: "Ollama (Local)",
    aliases: ["ollama"],
    auth: [{
      id: "none",
      label: "No auth (local)",
      kind: "custom",
      run: async () => ({
        profiles: [],
        configPatch: {
          models: {
            providers: {
              "ollama-local": {
                baseUrl: `${baseUrl}/v1`,
                apiKey: "ollama",
                api: "openai-completions",
                models: [
                  { id: "llama3.3", name: "Llama 3.3" },
                  { id: "qwen2.5-coder", name: "Qwen 2.5 Coder" },
                  { id: "deepseek-r1", name: "DeepSeek R1", reasoning: true }
                ]
              }
            }
          }
        },
        defaultModel: "ollama-local/llama3.3"
      })
    }]
  });

  api.registerTool({
    name: "ollama_models",
    description: "List locally available Ollama models",
    parameters: { type: "object", properties: {} },
    async execute() {
      try {
        const res = await fetch(`${baseUrl}/api/tags`);
        const data = await res.json();
        const models = data.models?.map((m: any) => m.name).join(", ") || "none";
        return { content: [{ type: "text", text: `Available models: ${models}` }] };
      } catch {
        return { content: [{ type: "text", text: "Ollama not reachable" }] };
      }
    }
  }, { optional: true });

  api.on("gateway_start", async () => {
    api.logger.info(`Ollama Enhanced plugin ready (${baseUrl})`);
  });
}
```

**Enable in config:**
```json5
{
  "plugins": {
    "entries": {
      "ollama-enhanced": {
        "enabled": true,
        "config": {
          "baseUrl": "http://localhost:11434",
          "autoDiscover": true
        }
      }
    }
  },
  "agents": {
    "list": [{
      "id": "main",
      "tools": { "allow": ["ollama_models"] }
    }]
  }
}
```

---

## 9. Key Files Reference

| What | Path |
|------|------|
| Gateway config | `~/.openclaw/openclaw.json` |
| Workspace skills | `~/.openclaw/workspace/skills/` |
| Workspace hooks | `~/.openclaw/workspace/hooks/` |
| Workspace plugins | `~/.openclaw/workspace/.openclaw/extensions/` |
| Global plugins | `~/.openclaw/extensions/` |
| Global skills | `~/.openclaw/skills/` |
| Global hooks | `~/.openclaw/hooks/` |
| Bundled plugins source | `/app/extensions/` |
| Bundled skills source | `/app/skills/` |
| Bundled hooks source | `/app/src/hooks/bundled/` |
| Plugin SDK types | `/app/src/plugin-sdk/index.ts` |
| Plugin types | `/app/src/plugins/types.ts` |
| Plugin discovery | `/app/src/plugins/discovery.ts` |
| Plugin registry | `/app/src/plugins/registry.ts` |
| Skill docs | `/app/docs/tools/skills.md` |
| Provider docs | `/app/docs/concepts/model-providers.md` |
| Plugin docs | `/app/docs/plugins/agent-tools.md` |

---

## 10. Important Notes

1. **Plugin SDK import**: Use `import type { OpenClawPluginApi } from "openclaw/plugin-sdk"` — the loader resolves this alias automatically.

2. **Config schema is mandatory**: Every plugin must have a `configSchema` in `openclaw.plugin.json`, even if empty: `{"type":"object","additionalProperties":false,"properties":{}}`.

3. **Sync registration only**: The `register()` function must be synchronous. Async registration is warned and ignored.

4. **Tool name conflicts**: Plugin tool names must not clash with core tools. Conflicts are silently skipped.

5. **Skill session snapshot**: Eligible skills are cached when a session starts. Changes take effect on the next new session (or hot-reload if watcher is enabled).

6. **Env scoping**: `skills.entries.*.env` is injected per-agent-run and restored after. It's host-only — sandboxed sessions need separate env config.

7. **TypeScript support**: Plugins support `.ts` files directly via jiti (no pre-compilation needed). Extensions: `.ts`, `.js`, `.mts`, `.cts`, `.mjs`, `.cjs`.
