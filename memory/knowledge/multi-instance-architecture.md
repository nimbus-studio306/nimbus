# Multi-Instance AI Assistant Architecture

*Created: 2026-02-12*
*Status: Draft*

## Overview

This document outlines how to deploy multiple OpenClaw assistant instances on a single machine or across a fleet, with proper resource isolation, tool contention management, and scalability patterns.

---

## Hardware Tiers

| Machine | RAM | Max Instances | Use Case |
|---------|-----|---------------|----------|
| M1 Mac Mini 8GB | 8GB | 2-3 | Dev/testing, single-purpose assistants |
| M4 Mac Mini 64GB | 64GB | 5-8 | Production multi-agent deployment |
| M4 Pro MacBook Pro 128GB | 128GB | 10-15 | Heavy workloads, local LLM + agents |
| GPU VPS (A100 80GB) | 80GB VRAM | N/A | Training, burst inference |

### Memory Budget per Instance

Each OpenClaw instance needs:
- **Base process**: ~200-400MB (Node.js + gateway)
- **Context window**: Variable (Claude handles this server-side)
- **Tool overhead**: ~100-300MB (browser, ffmpeg, python processes)
- **Local LLM (optional)**: 4-32GB depending on model

**Rule of thumb**: Budget 2-4GB per lightweight instance, 8-16GB if running local models.

---

## Instance Specialization Patterns

### Pattern 1: Role-Based Separation
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Main Assistant │  │   Dev Instance  │  │ Journal Instance│
│    (Nimbus)     │  │    (focused)    │  │   (private)     │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ • All channels  │  │ • GitHub only   │  │ • WhatsApp only │
│ • General tasks │  │ • Code reviews  │  │ • Mood tracking │
│ • Coordination  │  │ • PRs, commits  │  │ • Daily logs    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Pattern 2: Model-Tiered Routing
```
Incoming Request
      │
      ▼
┌─────────────┐
│   Router    │ ← Classifies by complexity
└─────────────┘
      │
      ├──▶ Simple query → Haiku instance (cheap, fast)
      ├──▶ Standard task → Sonnet instance (balanced)
      └──▶ Complex/creative → Opus instance (quality)
```

### Pattern 3: Hybrid Local + Cloud
```
┌─────────────────────────────────────────────┐
│               Mac Mini (local)              │
│  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Qwen3 32B   │  │ OpenClaw instances  │  │
│  │ (Q4 quant)  │  │ using local Ollama  │  │
│  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────┘
                      │
                      ▼ (fallback for complex tasks)
              ┌───────────────┐
              │ Claude API    │
              │ (Anthropic)   │
              └───────────────┘
```

---

## Port Allocation Strategy

Each instance needs unique ports:

| Instance | Gateway Port | Bridge Port | Browser CDP |
|----------|--------------|-------------|-------------|
| main     | 18789        | 18790       | 18800       |
| dev      | 18791        | 18792       | 18801       |
| journal  | 18793        | 18794       | 18802       |
| backup   | 18795        | 18796       | 18803       |

**Convention**: Base port + (instance_index * 2) for gateway/bridge pairs.

---

## API Key Isolation

**Problem**: Single API key = shared rate limits = one busy instance blocks others.

**Solution**: Separate API keys per instance (or per tier).

```yaml
# Instance: main
auth:
  anthropic:
    default:
      token: sk-ant-api03-main-xxx
      
# Instance: dev
auth:
  anthropic:
    default:
      token: sk-ant-api03-dev-xxx
```

**Fallback strategy**: If primary key is rate-limited, fall back to shared pool key.

---

## Tool Contention Management

### Browser Pool
Multiple instances shouldn't fight over Chromium.

**Option 1**: Dedicated browser per instance (wasteful)
**Option 2**: Shared browser pool with request queuing

```javascript
// browser-pool.js (conceptual)
class BrowserPool {
  constructor(maxBrowsers = 3) {
    this.browsers = [];
    this.queue = [];
    this.maxBrowsers = maxBrowsers;
  }
  
  async acquire(instanceId) {
    // Return available browser or queue request
  }
  
  async release(browser) {
    // Return to pool, serve queued requests
  }
}
```

### Exec Limits
Prevent runaway processes:

```yaml
exec:
  maxConcurrent: 3
  timeoutDefault: 30000
  oomKillEnabled: true
```

### Media Processing Queue
ffmpeg, imagemagick, etc. are CPU-heavy:

```javascript
// Use a job queue (BullMQ, Agenda) for heavy operations
mediaQueue.add('transcode', { input, output, opts });
```

---

## Deployment Options

### Option 1: Docker Compose
```yaml
version: '3.8'
services:
  openclaw-main:
    image: openclaw:local
    ports:
      - "18789:18789"
    volumes:
      - ./agents/main:/home/node/.openclaw
    environment:
      - INSTANCE_ID=main
      
  openclaw-dev:
    image: openclaw:local
    ports:
      - "18791:18789"
    volumes:
      - ./agents/dev:/home/node/.openclaw
    environment:
      - INSTANCE_ID=dev
```

### Option 2: PM2 (Direct)
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'openclaw-main',
      script: 'node_modules/.bin/openclaw',
      args: 'gateway start',
      cwd: '/home/node/agents/main',
      env: { PORT: 18789 }
    },
    {
      name: 'openclaw-dev',
      script: 'node_modules/.bin/openclaw',
      args: 'gateway start', 
      cwd: '/home/node/agents/dev',
      env: { PORT: 18791 }
    }
  ]
};
```

---

## Instance Communication

Instances can message each other via `sessions_send`:

```javascript
// From main instance, delegate to dev instance
sessions_send({
  sessionKey: 'agent:dev:main',
  message: 'Review this PR: https://github.com/...'
});
```

Or via shared database/message queue for async coordination.

---

## Reproducible Onboarding Script

```bash
#!/bin/bash
# new-instance.sh <instance_name>

INSTANCE=$1
BASE_PORT=$((18789 + ($RANDOM % 100) * 2))

mkdir -p ~/agents/$INSTANCE
cd ~/agents/$INSTANCE

# Copy base config
cp ~/agents/template/openclaw.json .
cp ~/agents/template/AGENTS.md .

# Substitute instance-specific values
sed -i "s/PORT_PLACEHOLDER/$BASE_PORT/g" openclaw.json
sed -i "s/INSTANCE_PLACEHOLDER/$INSTANCE/g" openclaw.json

# Generate new API key allocation (manual step)
echo "TODO: Add API key to openclaw.json"

# Start
openclaw gateway start
```

---

## Monitoring & Observability

Each instance should expose:
- **Health endpoint**: `/health` → 200 OK
- **Metrics**: Token usage, response times, error rates
- **Logs**: Structured JSON, shipped to central collector

**Dashboard**: Grafana + Prometheus scraping each instance.

---

## Open Questions

1. **Session sharing**: Should instances share a database for cross-instance memory?
2. **Failover**: If main instance dies, how to promote backup?
3. **Load balancing**: Round-robin vs. capability-based routing?
4. **Cost tracking**: Per-instance billing/budgets?

---

## Next Steps

- [ ] Create Docker Compose template
- [ ] Test 2-instance deployment on current VM
- [ ] Document API key provisioning workflow
- [ ] Build basic health check dashboard
