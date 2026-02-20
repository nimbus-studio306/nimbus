# Multi-Agent Setup via WhatsApp Groups

## How It Works
Each WhatsApp group can be bound to a different OpenClaw agent. Each agent has its own model, context window, identity, and optionally its own workspace/memory.

## Setup Steps

### 1. Create the WhatsApp group
- Zsolt creates a group on WhatsApp, adds the bot number (+31651453590)
- Send a message from a non-bot number (e.g. +36703407845) to trigger session creation

### 2. Find the group JID
```
sessions_list → look for new group session → grab the JID (format: 120363...@g.us)
```

### 3. Add the model (if needed)
If the agent uses a non-default model, add it to `models.providers`:
```json
{
  "models": {
    "providers": {
      "anthropic": {
        "baseUrl": "https://api.anthropic.com",
        "api": "anthropic-messages",
        "models": [{
          "id": "claude-opus-4-6-1m",
          "name": "Claude Opus 4.6 (1M context)",
          "api": "anthropic-messages",
          "contextWindow": 1000000,
          "maxTokens": 32000,
          "reasoning": true,
          "input": ["text", "image"],
          "headers": {
            "anthropic-beta": "context-1m-2025-08-07"
          }
        }]
      }
    }
  }
}
```

### 4. Add the agent to `agents.list`
```json
{
  "agents": {
    "list": [
      { "id": "default", "default": true, "workspace": "/home/node/.openclaw/workspace" },
      {
        "id": "deeper",
        "workspace": "/home/node/.openclaw/workspace",
        "model": {
          "primary": "anthropic/claude-opus-4-6-1m",
          "fallbacks": ["anthropic/claude-opus-4-6"]
        },
        "identity": { "name": "Deeper", "emoji": "🔮" }
      }
    ]
  }
}
```

**Agent options:**
- `workspace` — same workspace = shared SOUL.md, MEMORY.md, TOOLS.md; different = isolated
- `model` — primary + fallbacks
- `identity` — name, emoji, avatar
- `heartbeat` — own heartbeat schedule
- `skills` — skill allowlist
- `tools` — tool permissions
- `sandbox` — sandboxing mode

### 5. Add the binding
Routes the WhatsApp group to the agent:
```json
{
  "bindings": [{
    "agentId": "deeper",
    "match": {
      "channel": "whatsapp",
      "peer": { "kind": "group", "id": "120363422613163894@g.us" }
    }
  }]
}
```

### 6. Add group to WhatsApp config
```json
{
  "channels": {
    "whatsapp": {
      "groups": {
        "THE_JID@g.us": { "requireMention": false }
      },
      "accounts": {
        "default": {
          "groups": {
            "THE_JID@g.us": { "requireMention": false }
          }
        }
      }
    }
  }
}
```

### 7. Apply via config.patch
Steps 3-6 can be done in one or two `config.patch` calls. Gateway auto-restarts.

## Current Agents

| Agent | Model | Context | WhatsApp Group | JID | Purpose |
|-------|-------|---------|---------------|-----|---------|
| default | claude-opus-4-6 | 150K | DM + nimbus-journal | — | Main assistant |
| deeper | claude-opus-4-6-1m | 1M (beta) | deeper | 120363422613163894@g.us | Deep analysis, full history |

## Database Tracking
- All messages tagged with `agent_id` in `structured_messages` and `structured_sessions`
- Knowledge graph nodes/edges have `source_agent` column
- Filter by agent: `WHERE agent_id = 'deeper'`

## Key Notes
- Messages from the bot's own number don't create sessions — need a message from another number first
- Don't need invite links — bot is added directly to the group
- `agents.list` is an array — must include ALL agents when patching (patch replaces the array)
- Shared workspace = shared personality + memory; separate workspace = isolated agent
- Long context pricing applies above 200K tokens on Anthropic
- The beta header `context-1m-2025-08-07` is required for 1M context

## Future Agents (Planned)

| Agent | Purpose | Model | Workspace |
|-------|---------|-------|-----------|
| dev | Coding, infrastructure | TBD | Shared or separate |
| journal | Reflection, memory | TBD | Shared |
