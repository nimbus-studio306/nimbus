# Nimbus / OpenClaw VM — Setup & Maintenance Guide

> ⚠️ **OUTDATED — DOCKER ERA** — As of 2026-02-17, OpenClaw runs NATIVELY (no Docker).
> This file describes the old Docker setup. Paths like `/home/node/` and Docker commands no longer apply.
> Native install: user=papperpictures, service=openclaw-gateway.service, config=/home/papperpictures/.openclaw/

> **Last verified**: 2026-02-12
> **VM**: GCP e2-medium `openclaw-agent` (34.10.85.7)
> **Public URL**: https://nimbus.studio306.nl
> **This file lives in two places** — keep both in sync:
> 1. Local: `/Users/papperpictures/Desktop/development/github/openclaw/SETUP.md`
> 2. VM: `~/.openclaw/workspace/SETUP.md`

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Stock vs Custom — Component Inventory](#2-stock-vs-custom--component-inventory)
3. [Reproduce from Scratch](#3-reproduce-from-scratch)
4. [Update Procedure](#4-update-procedure)
5. [External Services & Credentials](#5-external-services--credentials)
6. [Dockerfile.nimbus Reference](#6-dockerfilenimbus-reference)
7. [openclaw.json Reference](#7-openclawjson-reference)
8. [Backup Strategy](#8-backup-strategy)
9. [Troubleshooting](#9-troubleshooting)
10. [Appendices](#10-appendices)

---

## 1. Architecture Overview

### System Diagram

```
                    ┌─────────────────────────────────────────────────┐
                    │  Internet                                       │
                    │                                                 │
                    │  nimbus.studio306.nl ──► Cloudflare Zero Trust  │
                    │         │                (Google login 2FA)      │
                    └─────────┼───────────────────────────────────────┘
                              │
                    ┌─────────▼───────────────────────────────────────┐
                    │  GCP VM: openclaw-agent (34.10.85.7)            │
                    │  Ubuntu 22.04 │ e2-medium │ 50GB SSD            │
                    │                                                 │
                    │  ┌─ cloudflared (systemd) ──────────────────┐   │
                    │  │  tunnel: nimbus → localhost:18789         │   │
                    │  └──────────────────────────────────────────┘   │
                    │                                                 │
                    │  ┌─ Docker ─────────────────────────────────┐   │
                    │  │                                           │   │
                    │  │  nimbus:local container                   │   │
                    │  │  ├─ OpenClaw Gateway (:18789, :18790)     │   │
                    │  │  ├─ db-watcher.py (background)            │   │
                    │  │  ├─ Chromium headless (:18800 CDP)        │   │
                    │  │  └─ Claude Code (on-demand)               │   │
                    │  │                                           │   │
                    │  │  Bind mounts:                             │   │
                    │  │   ~/.openclaw/  ──► /home/node/.openclaw  │   │
                    │  │   ~/.openclaw/workspace/ ──► workspace    │   │
                    │  │   ~/.openclaw/claude-state/ ──► .claude   │   │
                    │  │   ~/.openclaw/entrypoint.sh ──► (ro)      │   │
                    │  └──────────────────────────────────────────┘   │
                    └─────────────────────────────────────────────────┘
                              │
                    ┌─────────▼───────────────────────────────────────┐
                    │  External PostgreSQL (Supabase VPS)              │
                    │  81.0.107.97:5433                                │
                    │  Schema: project_openclaw_nimbus                 │
                    │  19 tables │ 22,866 messages │ 3072d vectors     │
                    └─────────────────────────────────────────────────┘
```

### Docker Image Stack

```
┌──────────────────────────────────────────────────┐
│  nimbus:local                          6.92 GB   │  ◄── Dockerfile.nimbus (CUSTOM)
│  + system packages (ffmpeg, jq, etc.)            │
│  + Google Chrome                                 │
│  + Python (yt-dlp, pandas, psycopg2, etc.)       │
│  + Node tools (typescript, eslint, etc.)         │
│  + Claude Code 2.1.39                            │
│  + mdbook                                        │
├──────────────────────────────────────────────────┤
│  openclaw:local                        4.27 GB   │  ◄── repo/Dockerfile (STOCK)
│  + OpenClaw gateway (node openclaw.mjs)          │
│  + pnpm, bun, built-in skills                    │
├──────────────────────────────────────────────────┤
│  node:22-bookworm                      1.13 GB   │  ◄── Docker Hub (STOCK)
│  + Node.js v22.22.0, Python 3.11.2              │
└──────────────────────────────────────────────────┘
```

### Port Map

| Port  | Service                | Access              |
|-------|------------------------|----------------------|
| 18789 | Gateway (WebSocket+UI) | Cloudflare tunnel    |
| 18790 | Bridge                 | Internal             |
| 18800 | Chromium CDP           | Container only       |
| 5433  | PostgreSQL (outbound)  | → 81.0.107.97        |

### Persistence Map

| Host Path | Container Path | What | Survives Rebuild? |
|-----------|---------------|------|:-----------------:|
| `~/.openclaw/` | `/home/node/.openclaw` | Config, sessions, agents | Yes |
| `~/.openclaw/workspace/` | `/home/papperpictures/.openclaw/workspace` | All custom scripts, tools, data | Yes |
| `~/.openclaw/claude-state/` | `/home/node/.claude` | Claude Code auth, sessions, projects | Yes |
| `~/.openclaw/entrypoint.sh` | `/entrypoint.sh` (ro) | Container entrypoint | Yes |

### What Does NOT Survive Container Recreation

| Item | Path (container) | How It's Restored |
|------|-----------------|-------------------|
| Claude Code binary | `/home/node/.local/share/claude/versions/` | Baked into nimbus:local image |
| Symlinks in ~/.local/bin/ | `/home/papperpictures/.local/bin/claude-msg` | Recreated by entrypoint.sh |
| Playwright cache | `~/.cache/ms-playwright/` | System Chrome in image; not needed |
| pip/npm runtime packages | Various | All baked into nimbus:local image |

---

## 2. Stock vs Custom — Component Inventory

### Stock OpenClaw (from upstream — don't modify directly)

| Component | Location | Notes |
|-----------|----------|-------|
| Gateway binary | `/app/` (container) | Built from repo Dockerfile |
| Dockerfile | `~/openclaw-repo/Dockerfile` | Stock build; nimbus extends this |
| docker-compose.yml | `~/openclaw-repo/docker-compose.yml` | **Modified** — has custom bind mounts |
| .env | `~/openclaw-repo/.env` | **Modified** — has Nimbus-specific vars |
| OpenClaw source | `~/openclaw-repo/` | git clone of openclaw/openclaw |

### Custom Nimbus Components (YOUR code)

#### Docker Layer
| File | Purpose |
|------|---------|
| `~/openclaw-repo/Dockerfile.nimbus` | Extends openclaw:local with all tools |

#### Entrypoint & Startup
| File | Purpose |
|------|---------|
| `~/.openclaw/entrypoint.sh` | Container init: nimbus-app copy, Claude Code setup, startup.sh |
| `workspace/startup.sh` | Background services: db-watcher, chromium, symlinks |

#### Database Pipeline
| File | Lines | Purpose |
|------|-------|---------|
| `workspace/db-watcher.py` | 462 | Real-time JSONL→PostgreSQL sync with auto-embed + tagging |
| `workspace/graph-extract.py` | 730 | Gemini LLM entity extraction for knowledge graph |
| `workspace/batch-embed.py` | ~50 | Bulk embedding with gemini-embedding-001 (3072d) |
| `workspace/graph-dedupe.py` | ~230 | Entity deduplication |
| `workspace/graph-query.py` | ~230 | Semantic search on knowledge graph |
| `workspace/import-structured.py` | ~350 | Import OpenClaw sessions to structured schema |
| `workspace/convert-to-structured.py` | ~350 | Raw JSONL → structured database schema |
| `workspace/import-to-db.py` | ~230 | Import knowledge documents with embeddings |
| `workspace/semantic-search.py` | ~230 | Cross-table semantic search |

#### Email System
| File | Purpose |
|------|---------|
| `workspace/check-email.js` | IMAP inbox polling with DKIM verification |
| `workspace/send-email.js` | SMTP sender with DKIM signing, DB persistence |
| `workspace/daily-email-template.html` | Daily digest template |
| `workspace/daily-extract.py` | Extract daily insights for email |
| `workspace/save-email-to-db.py` | Archive emails with embeddings |

#### Browser Automation
| File | Purpose |
|------|---------|
| `workspace/scripts/browser-vision-loop.py` | Vision-based browser automation via Gemini |
| `workspace/screenshot.js` | Screen capture via CDP |
| `workspace/transcribe.js` | Gemini STT for audio files |
| `workspace/transcribe-youtube.py` | YouTube audio extraction + STT |

#### Claude Code Sub-Agent
| File | Purpose |
|------|---------|
| `workspace/claude-msg` | Quick sync wrapper: `claude-msg "question"` |
| `workspace/claude-code/run-task.sh` | Async task runner with 5-min timeout |
| `workspace/claude-code/CLAUDE.md` | Claude Code memory file |
| `workspace/claude-code/INSTRUCTIONS.md` | Behavior guide for sub-agent |
| `workspace/claude-code/CONTEXT.md` | DB schema, API limits, script reference |
| `workspace/scripts/claude-run.sh` | Timeout wrapper for direct invocations |

#### Nimbus PWA
| File | Purpose |
|------|---------|
| `workspace/nimbus-app/index.html` | 82KB chat interface |
| `workspace/nimbus-app/manifest.json` | PWA metadata (dark theme) |
| `workspace/nimbus-app/sw.js` | Service worker for offline |

#### Plugins (Custom OpenClaw Plugins)
| Directory | Purpose |
|-----------|---------|
| `workspace/plugins/voice-proxy/` | Voice message routing proxy |
| `workspace/plugins/knowledge-graph/` | Semantic entity search tool |

#### Memory System
| File | Purpose |
|------|---------|
| `workspace/memory/YYYY-MM-DD.md` | Daily session logs |
| `workspace/memory/graph-context.md` | Knowledge graph state |
| `workspace/memory/email-state.json` | IMAP sync cursor |

#### Background Jobs (managed by startup.sh + db-watcher.py)
| Job | Schedule | What |
|-----|----------|------|
| db-watcher.py | Continuous | Watches JSONL files, syncs to DB, auto-embeds, auto-tags |
| Entity extraction | Queued by db-watcher | Extracts entities from new messages via Gemini |
| Email check | Every 30 min (via db-watcher cron logic) | Polls IMAP inbox |
| Daily email summary | 08:00 UTC | Sends daily digest |

### Config Files (sensitive — never commit)

| File | Host Path | Contains | Sensitive? |
|------|-----------|----------|:----------:|
| `.env` | `~/openclaw-repo/.env` | All API keys, DB creds, tokens | **YES** |
| `openclaw.json` | `~/.openclaw/openclaw.json` | Gateway config, channel tokens | **YES** |
| `SOUL.md` | `~/.openclaw/workspace/SOUL.md` | Agent behavior instructions | No |
| `dkim-private.pem` | `~/.openclaw/credentials/dkim-private.pem` | Email signing key | **YES** |
| `.credentials.json` | `~/.openclaw/claude-state/.credentials.json` | Claude Code OAuth | **YES** |
| `.env.email` | `~/.openclaw/workspace/.env.email` | Email SMTP/IMAP creds | **YES** |

---

## 3. Reproduce from Scratch

### 3.1: Create GCP VM

```bash
gcloud compute instances create openclaw-agent \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --boot-disk-size=50GB \
  --boot-disk-type=pd-balanced \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --project=neat-drummer-486005-e4

# Reserve static IP
gcloud compute addresses create openclaw-static-ip \
  --region=us-central1 \
  --project=neat-drummer-486005-e4

# Assign static IP to VM
gcloud compute instances delete-access-config openclaw-agent \
  --zone=us-central1-a --access-config-name="External NAT" \
  --project=neat-drummer-486005-e4
gcloud compute instances add-access-config openclaw-agent \
  --zone=us-central1-a --address=<STATIC_IP> \
  --project=neat-drummer-486005-e4
```

### 3.2: Initial VM Setup

```bash
# SSH in
ssh openclaw

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Re-login to pick up docker group
exit
ssh openclaw
```

### 3.3: Clone OpenClaw Repo

```bash
git clone https://github.com/openclaw/openclaw.git ~/openclaw-repo
cd ~/openclaw-repo
```

### 3.4: Build openclaw:local

```bash
cd ~/openclaw-repo
docker build -t openclaw:local -f Dockerfile .
```

Takes ~10 minutes. Builds the stock OpenClaw gateway from source.

### 3.5: Create Persistent Directories

```bash
mkdir -p ~/.openclaw
mkdir -p ~/.openclaw/workspace
mkdir -p ~/.openclaw/claude-state
mkdir -p ~/.openclaw/credentials
```

### 3.6: Restore Custom Files

**If restoring from backup** (recommended):
```bash
# From local machine
scp nimbus-backup-YYYYMMDD.tar.gz openclaw:~/
ssh openclaw 'cd ~ && tar xzf nimbus-backup-YYYYMMDD.tar.gz'
```

**If restoring from scratch**, place these files:
- `~/.openclaw/.env` — copy from Section 5 template, fill in secrets
- `~/.openclaw/openclaw.json` — copy from Section 7 template
- `~/.openclaw/entrypoint.sh` — copy from below
- `~/.openclaw/workspace/` — clone from git repo `papperpopper/nimbus` (private)
- `~/.openclaw/credentials/dkim-private.pem` — regenerate or restore from secure backup

### 3.7: Place Dockerfile.nimbus

Copy `Dockerfile.nimbus` to `~/openclaw-repo/Dockerfile.nimbus`. Full content in [Section 6](#6-dockerfilenimbus-reference).

### 3.8: Build nimbus:local

```bash
cd ~/openclaw-repo
docker build -t nimbus:local -f Dockerfile.nimbus .
```

Takes ~5 minutes. **Must build AFTER openclaw:local** (it extends it).

### 3.9: Configure docker-compose.yml + .env

The stock `docker-compose.yml` needs these modifications:

**In docker-compose.yml** (volumes section of openclaw-gateway):
```yaml
volumes:
  - ${OPENCLAW_CONFIG_DIR}:/home/node/.openclaw
  - ${OPENCLAW_WORKSPACE_DIR}:/home/papperpictures/.openclaw/workspace
  - ${OPENCLAW_CONFIG_DIR}/entrypoint.sh:/entrypoint.sh:ro
  - ${CLAUDE_STATE_DIR:-/home/papperpictures/.openclaw/claude-state}:/home/node/.claude
```

Add `user: root` and custom entrypoint:
```yaml
user: root
entrypoint: ["/entrypoint.sh"]
```

Remove named volume section (replaced by bind mount).

**In .env** (key names — fill in actual values):
```bash
OPENCLAW_IMAGE=nimbus:local
OPENCLAW_CONFIG_DIR=/home/papperpictures/.openclaw
OPENCLAW_WORKSPACE_DIR=/home/papperpictures/.openclaw/workspace
CLAUDE_STATE_DIR=/home/papperpictures/.openclaw/claude-state
OPENCLAW_GATEWAY_TOKEN=<REPLACE>
OPENCLAW_GATEWAY_BIND=lan
OPENCLAW_GATEWAY_PORT=18789
OPENCLAW_BRIDGE_PORT=18790
DATABASE_URL=<REPLACE>
DB_HOST=<REPLACE>
DB_PORT=5433
DB_NAME=<REPLACE>
DB_SCHEMA=project_openclaw_nimbus
DB_USER=<REPLACE>
DB_PASSWORD=<REPLACE>
SUPABASE_URL=<REPLACE>
SUPABASE_ANON_KEY=<REPLACE>
SUPABASE_AUTH_EMAIL=<REPLACE>
SUPABASE_AUTH_PASSWORD=<REPLACE>
GITHUB_TOKEN=<REPLACE>
ANTHROPIC_OAUTH_TOKEN=<REPLACE>
GEMINI_API_KEY=<REPLACE>
DKIM_DOMAIN=<REPLACE>
DKIM_SELECTOR=<REPLACE>
DKIM_PRIVATE_KEY_PATH=/home/papperpictures/.openclaw/credentials/dkim-private.pem
```

### 3.10: Run OpenClaw Onboarding (first time only)

```bash
cd ~/openclaw-repo
sudo docker compose run --rm openclaw-cli onboard --no-install-daemon
```

### 3.11: Start Gateway

```bash
cd ~/openclaw-repo
sudo docker compose up -d openclaw-gateway
```

### 3.12: Set Up Cloudflare Tunnel

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
  -o /tmp/cloudflared.deb && sudo dpkg -i /tmp/cloudflared.deb

# Authenticate (opens browser)
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create nimbus

# Create config at /etc/cloudflared/config.yml:
sudo mkdir -p /etc/cloudflared
sudo tee /etc/cloudflared/config.yml << 'EOF'
tunnel: <TUNNEL_UUID>
credentials-file: /etc/cloudflared/<TUNNEL_UUID>.json

ingress:
  - hostname: nimbus.studio306.nl
    service: http://localhost:18789
  - service: http_status:404
EOF

# Copy credentials
sudo cp ~/.cloudflared/<TUNNEL_UUID>.json /etc/cloudflared/

# Create DNS record
cloudflared tunnel route dns nimbus nimbus.studio306.nl

# Install as systemd service
sudo cloudflared service install

# Start
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

**Cloudflare Zero Trust Access** (configured in Cloudflare dashboard):
- Application: nimbus.studio306.nl
- Policy: Google login required
- Team: auth-studio
- Allowed emails: studio306nl@gmail.com, papperpictures@gmail.com
- OAuth Client ID: 378128822690-up3qqg4hpq6mqjm8id8aamorrrft2shp.apps.googleusercontent.com

### 3.13: Authenticate Claude Code (inside container)

```bash
sudo docker exec -it openclaw-repo-openclaw-gateway-1 \
  su node -s /bin/bash -c "claude auth login"
```

This stores credentials at `/home/node/.claude/.credentials.json` (persisted via bind mount).

### 3.14: Authenticate Messaging Channels

```bash
# WhatsApp (shows QR code)
cd ~/openclaw-repo
sudo docker compose run --rm openclaw-cli channels login whatsapp

# Telegram (already configured via botToken in openclaw.json)
# Signal (currently disabled)
```

### 3.15: Deployment Verification Checklist

- [ ] `sudo docker ps` — container running
- [ ] `https://nimbus.studio306.nl` — loads through Cloudflare
- [ ] `sudo docker logs openclaw-repo-openclaw-gateway-1` — no errors
- [ ] Gateway startup shows: `[entrypoint] Running workspace startup`
- [ ] db-watcher running: `sudo docker exec ... pgrep -f db-watcher`
- [ ] Claude Code available: `sudo docker exec ... claude --version`
- [ ] Database connected: check db-watcher.log for successful queries
- [ ] WhatsApp responding to messages
- [ ] Telegram responding to messages

---

## 4. Update Procedure

When OpenClaw upstream releases updates:

### 4.1: Pre-Update Checklist

```bash
# Create VM snapshot (safety net)
gcloud compute disks snapshot openclaw-agent \
  --zone=us-central1-a \
  --snapshot-names=pre-update-$(date +%Y%m%d) \
  --project=neat-drummer-486005-e4

# Note current state
ssh openclaw 'sudo docker images --format "{{.Repository}}:{{.Tag}} {{.Size}}" | grep -v none'
ssh openclaw 'git -C ~/openclaw-repo log --oneline -1'
```

### 4.2: Pull Upstream Changes

```bash
ssh openclaw 'cd ~/openclaw-repo && git stash && git pull origin main && git stash pop'
```

**Check for breaking changes:**
```bash
# Did the stock Dockerfile change?
ssh openclaw 'cd ~/openclaw-repo && git diff HEAD~1 Dockerfile'

# Did docker-compose.yml change? (we have local modifications)
ssh openclaw 'cd ~/openclaw-repo && git diff HEAD~1 docker-compose.yml'
```

If `docker-compose.yml` has upstream changes conflicting with our modifications, merge carefully — our custom volumes and entrypoint must be preserved.

### 4.3: Rebuild openclaw:local

```bash
ssh openclaw 'cd ~/openclaw-repo && docker build -t openclaw:local -f Dockerfile .'
```

### 4.4: Rebuild nimbus:local

```bash
ssh openclaw 'cd ~/openclaw-repo && docker build -t nimbus:local -f Dockerfile.nimbus .'
```

**If this fails**, common causes:
- Base image changed user (check `USER` directives in stock Dockerfile)
- Base image changed working directory (check `WORKDIR`)
- Package names changed in Debian repos
- Claude Code install URL changed

Check: `ssh openclaw 'cd ~/openclaw-repo && git diff HEAD~1 Dockerfile'`

### 4.5: Recreate Containers

```bash
ssh openclaw 'cd ~/openclaw-repo && sudo docker compose down && sudo docker compose up -d openclaw-gateway'
```

All bind-mounted data survives. The entrypoint will auto-run startup.sh.

### 4.6: Post-Update Verification

Same as [Section 3.15](#315-deployment-verification-checklist).

### 4.7: Rollback Procedure

**Option A: Restore from snapshot** (nuclear option)
```bash
gcloud compute instances stop openclaw-agent --zone=us-central1-a
# Restore disk from snapshot via GCP Console or gcloud
gcloud compute instances start openclaw-agent --zone=us-central1-a
```

**Option B: Rebuild from previous commit** (lighter)
```bash
ssh openclaw 'cd ~/openclaw-repo && git log --oneline -5'  # find previous commit
ssh openclaw 'cd ~/openclaw-repo && git checkout <PREV_COMMIT>'
ssh openclaw 'cd ~/openclaw-repo && docker build -t openclaw:local -f Dockerfile .'
ssh openclaw 'cd ~/openclaw-repo && docker build -t nimbus:local -f Dockerfile.nimbus .'
ssh openclaw 'cd ~/openclaw-repo && sudo docker compose down && sudo docker compose up -d openclaw-gateway'
```

---

## 5. External Services & Credentials

| Service | Purpose | Account | How to Recreate |
|---------|---------|---------|-----------------|
| GCP | VM hosting | studio306nl@gmail.com (project: neat-drummer-486005-e4) | Section 3.1 |
| Cloudflare | Tunnel + DNS + Zero Trust | studio306.nl zone | Section 3.12 |
| PostgreSQL | Database (Supabase VPS) | 81.0.107.97:5433 | Separate VPS, not covered here |
| Anthropic | Claude API (gateway model) | API key in .env | console.anthropic.com |
| Google AI | Gemini API (embeddings, extraction, vision) | API key in .env, restricted to generativelanguage.googleapis.com | GCP Console → API keys |
| Claude Code | Sub-agent binary + auth | OAuth in claude-state/.credentials.json | `claude auth login` inside container |
| Telegram | Bot channel | Bot token in openclaw.json | BotFather |
| WhatsApp Business | Messaging | QR pairing via `openclaw channels login` | Re-pair via QR |
| Signal | Messaging | Currently disabled | Signal CLI setup |
| Email | IMAP/SMTP | Creds in .env.email | VPS mail server config |
| GitHub | Workspace repo (papperpopper/nimbus) | PAT in .env | github.com → Settings → Tokens |

### Messaging Channels Detail

**WhatsApp Business**
- Phone: +31651453590
- DM policy: allowlist
- Allowed DM numbers: +36703407845 (Zsolt), +40732848913
- Groups:
  - `120363425168962992@g.us` (requireMention: false)
  - `120363422613163894@g.us` (requireMention: false, bound to "deeper" agent)
- Media max: 50MB
- Debounce: 0ms
- Accounts: `default` (main) + `personal` (self-chat, Zsolt only)
- Pairing: `sudo docker compose run --rm openclaw-cli channels login whatsapp`

**Telegram**
- Bot: @Nimbus_clawbot
- Bot token: stored in openclaw.json `channels.telegram.botToken`
- DM policy: allowlist
- Allowed user ID: 7130479203
- Group policy: open
- Stream mode: partial

**Signal**
- Phone: +31651453590
- Status: **disabled**
- Signal CLI HTTP URL: http://172.17.0.1:8080
- DM policy: allowlist
- Allowed: +36703407845 (Zsolt)

**Email**
- Server: phantom.versanus.eu
- DKIM domain + selector: in .env
- DKIM private key: `~/.openclaw/credentials/dkim-private.pem`
- Credentials: in `workspace/.env.email`

### Cloudflare Zero Trust Access

- Application: nimbus.studio306.nl
- Team: auth-studio
- Auth method: Google login
- Allowed emails: studio306nl@gmail.com, papperpictures@gmail.com
- OAuth Client ID: 378128822690-up3qqg4hpq6mqjm8id8aamorrrft2shp.apps.googleusercontent.com

### Billing

- Using Google Cloud free trial ($300 credits / 90 days)
- e2-medium: ~$25/month
- 50GB pd-balanced (SSD): ~$5/month
- Total: ~$30/month (covered by trial)
- Old 30GB pd-standard (HDD) disk kept as rollback: `openclaw-agent`
- Snapshot: `openclaw-agent-snapshot-20260211` (pre-SSD migration)

---

## 6. Dockerfile.nimbus Reference

```dockerfile
# Nimbus custom image - extends openclaw:local with all tools baked in
# Build: docker build -f Dockerfile.nimbus -t nimbus:local .
# Cuts container startup from ~2-3 min to ~5 seconds
#
# BUILD ORDER: openclaw:local MUST exist first.
# Full rebuild: docker build -t openclaw:local -f Dockerfile . && docker build -t nimbus:local -f Dockerfile.nimbus .

FROM openclaw:local

USER root

# ── System packages ──────────────────────────────────────────────────
RUN apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
      libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
      libgbm1 libasound2 libpango-1.0-0 libcairo2 \
      ffmpeg jq \
      poppler-utils tesseract-ocr pandoc sox ripgrep htop sqlite3 \
      graphviz postgresql-client \
      python3-pip wkhtmltopdf \
      wget curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*

# ── Google Chrome (DO NOT silence errors — must succeed) ─────────────
RUN wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -O /tmp/chrome.deb && \
    apt-get update -qq && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y -f /tmp/chrome.deb && \
    rm -f /tmp/chrome.deb && \
    apt-get clean && rm -rf /var/lib/apt/lists/* && \
    google-chrome-stable --version

# ── Playwright Chromium (for browser automation scripts) ─────────────
RUN su node -s /bin/bash -c "cd /app && node /app/node_modules/playwright-core/cli.js install chromium" && \
    CHROME_PATH=$(find /home/node/.cache/ms-playwright -name chrome -type f 2>/dev/null | head -1) && \
    if [ -n "$CHROME_PATH" ]; then \
      ln -sf "$CHROME_PATH" /usr/bin/chromium && \
      echo "Playwright Chromium linked: $CHROME_PATH"; \
    else \
      echo "WARNING: Playwright Chromium not found, linking google-chrome instead" && \
      ln -sf /usr/bin/google-chrome-stable /usr/bin/chromium; \
    fi

# ── Python packages ─────────────────────────────────────────────────
# Core: psycopg2-binary (DB), supabase (API), watchdog (db-watcher)
# Media: pillow (images), pdfplumber (PDF), yt-dlp (YouTube)
# Vision: opencv-python-headless (CV2)
# AI/ML: google-generativeai + google-genai (Gemini), google-cloud-* (Vision, Speech, TTS, Translate, Storage, Language)
# Utils: beautifulsoup4 (HTML), pandas (data), python-dotenv (env files)
RUN pip3 install --break-system-packages --no-cache-dir \
      yt-dlp beautifulsoup4 pandas pdfplumber pillow \
      psycopg2-binary supabase watchdog \
      google-generativeai google-cloud-vision \
      python-dotenv edge-tts \
      opencv-python-headless \
      google-genai \
      google-cloud-speech google-cloud-texttospeech \
      google-cloud-translate google-cloud-storage \
      google-cloud-language

# ── Node.js workspace packages (used by agent scripts) ──────────────
# These are NOT in OpenClaw's pnpm tree, so must be installed separately
RUN cd /home/node && npm install --save \
      node-fetch@2 ws pg puppeteer better-sqlite3 \
      nodemailer imap @google/generative-ai @supabase/supabase-js && \
    chown -R node:node /home/node/node_modules /home/node/package.json /home/node/package-lock.json

# ── Node.js global tools ─────────────────────────────────────────────
RUN npm install -g typescript eslint prettier @mermaid-js/mermaid-cli vitest 2>/dev/null

# ── mdbook ───────────────────────────────────────────────────────────
RUN curl -sSL https://github.com/rust-lang/mdBook/releases/download/v0.4.40/mdbook-v0.4.40-x86_64-unknown-linux-gnu.tar.gz \
    | tar -xz -C /usr/local/bin

# ── Claude Code (installed as node user) ─────────────────────────────
RUN su node -s /bin/bash -c "curl -fsSL https://claude.ai/install.sh | bash" 2>/dev/null && \
    ln -sf /home/papperpictures/.local/bin/claude /usr/local/bin/claude

# ── Static symlinks ──────────────────────────────────────────────────
RUN mkdir -p /docs/reference && \
    ln -sf /app/docs/reference/templates /docs/reference/templates

RUN if [ -d /app/node_modules/playwright-core ] && [ ! -d /app/node_modules/playwright ]; then \
      ln -sf /app/node_modules/playwright-core /app/node_modules/playwright; \
    fi

# ── Ensure node ownership ───────────────────────────────────────────
RUN chown -R node:node /home/node

USER node

# ── Make workspace scripts find these packages ───────────────────────
ENV NODE_PATH=/home/node/node_modules:/app/node_modules
```

---

## 7. openclaw.json Reference

Key sections (redacted — actual file at `~/.openclaw/openclaw.json`):

```jsonc
{
  // Browser: headless Chrome, no sandbox (Docker), attach to existing instance
  "browser": {
    "executablePath": "/usr/bin/chromium",
    "headless": true,
    "noSandbox": true,
    "attachOnly": true
  },

  // Auth profiles: Anthropic (Claude API), Google (Gemini), OpenAI Codex
  "auth": {
    "profiles": {
      "google:default": { "provider": "google", "mode": "api_key" },
      "anthropic:default": { "provider": "anthropic", "mode": "token" },
      "anthropic:manual": { "provider": "anthropic", "mode": "token" }
    }
  },

  // Agent defaults
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-opus-4-5",
        "fallbacks": ["openai-codex/gpt-5.3-codex"]
      },
      "workspace": "/home/papperpictures/.openclaw/workspace",
      "contextTokens": 180000,        // Max context window
      "compaction": { "mode": "safeguard" },
      "heartbeat": { "every": "8h" },
      "maxConcurrent": 4,
      "subagents": { "maxConcurrent": 8 },
      "sandbox": { "mode": "off" }    // IMPORTANT: sandbox is off
    },
    "list": [
      { "id": "default", "default": true },
      {
        "id": "deeper",                // Sub-agent for WhatsApp group
        "workspace": "/home/papperpictures/.openclaw/workspace-deeper",
        "identity": { "name": "Deeper", "emoji": "🔮" }
      }
    ]
  },

  // Tools
  "tools": {
    "alsoAllow": ["knowledge_graph"],  // Custom plugin tool
    "exec": { "host": "gateway", "security": "full" },
    "media": { /* image, audio, video via Google provider */ }
  },

  // Agent bindings: route WhatsApp group to "deeper" agent
  "bindings": [{
    "agentId": "deeper",
    "match": { "channel": "whatsapp", "peer": { "kind": "group", "id": "120363422613163894@g.us" } }
  }],

  // Messages: TTS (text-to-speech) via Edge, reaction scope for groups
  "messages": {
    "ackReactionScope": "group-mentions",
    "tts": { "auto": "inbound", "mode": "final", "provider": "edge", "maxTextLength": 100000 }
  },

  // Talk: Gemini API key for voice/vision features
  "talk": {
    "apiKey": "<GEMINI_API_KEY>",      // Same key as in .env
    "interruptOnSpeech": true
  },

  // Gateway
  "gateway": {
    "port": 18789,
    "bind": "loopback",
    "controlUi": { "allowInsecureAuth": true },  // Token-only auth over HTTPS
    "auth": { "mode": "token", "token": "<GATEWAY_TOKEN>" },
    "trustedProxies": ["172.16.0.0/12"]           // Docker bridge for Cloudflare
  },

  // Channels (see Section 5 for full detail)
  "channels": {
    "whatsapp": {
      "accounts": {
        "default": {
          "dmPolicy": "allowlist",
          "allowFrom": ["+36703407845", "+40732848913"],
          "groupPolicy": "allowlist",
          "groups": {
            "120363425168962992@g.us": { "requireMention": false },
            "120363422613163894@g.us": { "requireMention": false }  // → deeper agent
          },
          "debounceMs": 0
        },
        "personal": {
          "dmPolicy": "allowlist",
          "selfChatMode": true,
          "allowFrom": ["+36703407845"]
        }
      },
      "mediaMaxMb": 50
    },
    "telegram": {
      "enabled": true,
      "botToken": "<BOT_TOKEN>",       // @Nimbus_clawbot
      "allowFrom": ["7130479203"],      // Zsolt's Telegram user ID
      "dmPolicy": "allowlist",
      "groupPolicy": "open",
      "streamMode": "partial"
    },
    "signal": {
      "enabled": false,
      "account": "+31651453590",
      "httpUrl": "http://172.17.0.1:8080"
    }
  },

  // Plugins (custom)
  "plugins": {
    "load": {
      "paths": [
        "/home/papperpictures/.openclaw/workspace/plugins/voice-proxy",
        "/home/papperpictures/.openclaw/workspace/plugins/knowledge-graph"
      ]
    }
  }
}
```

---

## 8. Backup Strategy

### Critical (must backup — irreplaceable without effort)

| What | Host Path | Why |
|------|-----------|-----|
| API keys + secrets | `~/.openclaw/.env`, `~/openclaw-repo/.env` | Can't be recovered |
| Gateway config | `~/.openclaw/openclaw.json` | Complex, took many iterations |
| DKIM key | `~/.openclaw/credentials/dkim-private.pem` | Can't regenerate without DNS changes |
| Claude Code auth | `~/.openclaw/claude-state/.credentials.json` | Avoids re-auth hassle |
| All workspace scripts | `~/.openclaw/workspace/` | 500KB+ custom code |
| Dockerfile.nimbus | `~/openclaw-repo/Dockerfile.nimbus` | Custom image definition |
| Entrypoint | `~/.openclaw/entrypoint.sh` | Container init logic |

### Recommended Backup Methods

**1. GCP Snapshots** (recommended for full VM)
```bash
# Manual snapshot
gcloud compute disks snapshot openclaw-agent \
  --zone=us-central1-a \
  --snapshot-names=backup-$(date +%Y%m%d) \
  --project=neat-drummer-486005-e4

# Automated: Set up snapshot schedule in GCP Console
# → Compute Engine → Snapshots → Create Schedule
# Suggested: Daily, keep 7
```

**2. Tar backup** (for off-VM storage)
```bash
# On VM
tar czf ~/nimbus-backup-$(date +%Y%m%d).tar.gz \
  -C /home/papperpictures \
  .openclaw/ \
  openclaw-repo/.env \
  openclaw-repo/Dockerfile.nimbus \
  openclaw-repo/docker-compose.yml

# Copy to local machine
scp openclaw:~/nimbus-backup-*.tar.gz ~/Desktop/development/github/openclaw/backups/
```

### NOT needed in backup (rebuildable)

- Docker images (rebuilt from Dockerfiles)
- Container state (ephemeral, recreated from bind mounts)
- Claude Code binary (re-downloaded during image build)
- node_modules (reinstalled during build)

---

## 9. Troubleshooting

### Container won't start after image rebuild

```bash
# Check logs
sudo docker logs openclaw-repo-openclaw-gateway-1

# Common: entrypoint.sh permissions
chmod +x ~/.openclaw/entrypoint.sh

# Common: .env missing or incomplete
cat ~/openclaw-repo/.env | grep -c "="  # should show ~25 vars

# Common: openclaw.json permissions
sudo chown 1000:1000 ~/.openclaw/openclaw.json
chmod 644 ~/.openclaw/openclaw.json
```

### Claude Code not available inside container

```bash
# Check if binary exists
sudo docker exec openclaw-repo-openclaw-gateway-1 which claude
# → Should be /usr/local/bin/claude

# If missing, image needs rebuild:
cd ~/openclaw-repo && docker build -t nimbus:local -f Dockerfile.nimbus .

# Check auth
sudo docker exec openclaw-repo-openclaw-gateway-1 ls -la /home/node/.claude/.credentials.json

# Re-authenticate if needed
sudo docker exec -it openclaw-repo-openclaw-gateway-1 su node -s /bin/bash -c "claude auth login"
```

### Claude Code processes getting killed (OOM)

```bash
# Check memory
sudo docker exec openclaw-repo-openclaw-gateway-1 ps aux --sort=-%mem | head -10

# Kill zombies
sudo docker exec openclaw-repo-openclaw-gateway-1 pkill -f "claude (doctor|login)"

# Prevention: run-task.sh has 5-min timeout, claude-msg uses < /dev/null
```

### db-watcher.py not running

```bash
# Check if running
sudo docker exec openclaw-repo-openclaw-gateway-1 pgrep -f db-watcher

# Check logs
sudo docker exec openclaw-repo-openclaw-gateway-1 cat /home/papperpictures/.openclaw/workspace/logs/db-watcher.log

# Restart manually
sudo docker exec openclaw-repo-openclaw-gateway-1 \
  su node -s /bin/bash -c "cd /home/papperpictures/.openclaw/workspace && python3 -u db-watcher.py &"

# Common: PostgreSQL connection refused
# → Check VPS firewall whitelist for VM IP (34.10.85.7)
# → Check DB_HOST, DB_PORT, DB_PASSWORD in .env
```

### Cloudflare tunnel disconnected

```bash
sudo systemctl status cloudflared
sudo systemctl restart cloudflared
# Check tunnel in Cloudflare dashboard → Zero Trust → Tunnels
```

### Disk space running low

```bash
# Check usage
df -h /

# Docker images are the biggest consumer
sudo docker images --format "{{.Repository}}:{{.Tag}} {{.Size}}" | grep -v none

# Prune dangling images (intermediate build layers)
sudo docker image prune

# Check workspace growth
du -sh ~/.openclaw/workspace/*/ | sort -rh | head -10
```

### Gateway unreachable after OpenClaw update

```bash
# Check if trustedProxies was reset (Cloudflare tunnel needs this)
sudo cat ~/.openclaw/openclaw.json | grep -A2 trustedProxies
# Must be: "trustedProxies": ["172.16.0.0/12"]

# Check if allowInsecureAuth was dropped
sudo cat ~/.openclaw/openclaw.json | grep allowInsecureAuth
# Must be: "allowInsecureAuth": true

# Check if bind address changed
sudo cat ~/.openclaw/openclaw.json | grep bind
```

---

## 10. Appendices

### A: SSH Configuration

On local machine (`~/.ssh/config`):
```
Host openclaw openclaw-ssh
    HostName 34.10.85.7
    User papperpictures
    IdentityFile ~/.ssh/google_compute_engine
```

### B: Command Quick Reference

```bash
# === Gateway ===
cd ~/openclaw-repo && sudo docker compose up -d openclaw-gateway    # Start
cd ~/openclaw-repo && sudo docker compose down                       # Stop
cd ~/openclaw-repo && sudo docker compose restart openclaw-gateway   # Restart
sudo docker logs -f openclaw-repo-openclaw-gateway-1                 # Logs (follow)
sudo docker logs --tail 50 openclaw-repo-openclaw-gateway-1          # Logs (last 50)

# === SSH fallback (if direct SSH breaks) ===
gcloud compute ssh openclaw-agent --zone=us-central1-a --project=neat-drummer-486005-e4

# === Container shell ===
sudo docker exec -it openclaw-repo-openclaw-gateway-1 su node -s /bin/bash

# === Run command in container ===
sudo docker exec openclaw-repo-openclaw-gateway-1 COMMAND

# === Rebuild images ===
cd ~/openclaw-repo
docker build -t openclaw:local -f Dockerfile .          # Stock
docker build -t nimbus:local -f Dockerfile.nimbus .      # Custom

# === Health check ===
sudo docker ps                                            # Container status
sudo docker stats --no-stream                             # Resource usage
df -h /                                                   # Disk
free -h                                                   # Memory

# === Claude Code ===
sudo docker exec openclaw-repo-openclaw-gateway-1 claude --version
sudo docker exec openclaw-repo-openclaw-gateway-1 su node -s /bin/bash -c "claude auth login"

# === Cloudflare ===
sudo systemctl status cloudflared
sudo systemctl restart cloudflared

# === Snapshots ===
gcloud compute disks snapshot openclaw-agent \
  --zone=us-central1-a \
  --snapshot-names=snapshot-$(date +%Y%m%d) \
  --project=neat-drummer-486005-e4
```

### C: Workspace File Tree

```
~/.openclaw/workspace/
├── SOUL.md                          # Agent identity & behavior
├── MEMORY.md                        # Agent persistent memory
├── TODO.md                          # Active tasks
├── DATABASE.md, FEATURES.md, ...    # Documentation
├── startup.sh                       # Background service launcher
├── claude-msg                       # Claude Code quick wrapper
├── db-watcher.py                    # Real-time JSONL→DB sync
├── graph-extract.py                 # Entity extraction
├── batch-embed.py                   # Bulk embeddings
├── graph-dedupe.py                  # Entity dedup
├── graph-query.py                   # Semantic search
├── import-structured.py             # Session import
├── convert-to-structured.py         # JSONL converter
├── semantic-search.py               # Cross-table search
├── check-email.js                   # IMAP polling
├── send-email.js                    # SMTP sender
├── daily-email-template.html        # Email template
├── daily-extract.py                 # Daily digest
├── save-email-to-db.py              # Email archiver
├── screenshot.js                    # CDP screenshot
├── transcribe.js                    # Audio STT
├── transcribe-youtube.py            # YouTube STT
├── voice-proxy.js                   # Voice routing
├── cost-tracker.js                  # API cost monitor
├── log-api-cost.js                  # Cost logger
├── db.js, storage.js                # DB/storage helpers
├── package.json                     # Node dependencies
├── claude-code/                     # Claude Code sub-agent
│   ├── CLAUDE.md                    # Sub-agent memory
│   ├── INSTRUCTIONS.md              # Behavior guide
│   ├── CONTEXT.md                   # DB schema reference
│   ├── run-task.sh                  # Async runner (5-min timeout)
│   ├── tasks/                       # Task output files
│   └── *.sql, *.py                  # Migration/tool scripts
├── scripts/
│   ├── claude-run.sh                # Timeout wrapper
│   ├── browser-vision-loop.py       # Vision automation
│   ├── install-computer-use.sh      # Setup script
│   └── start-virtual-display.sh     # Display setup
├── plugins/
│   ├── voice-proxy/                 # Voice proxy plugin
│   └── knowledge-graph/             # Knowledge graph plugin
├── nimbus-app/                      # PWA interface
│   ├── index.html                   # Chat UI (82KB)
│   ├── manifest.json                # PWA config
│   └── sw.js                        # Service worker
├── memory/                          # Daily logs
│   ├── YYYY-MM-DD.md               # Session logs
│   ├── email-state.json            # IMAP cursor
│   └── graph-context.md            # Graph state
├── docs/                            # Technical documentation
│   ├── SYSTEM-ARCHITECTURE.md
│   ├── OPENCLAW-CONFIG-REFERENCE.md
│   └── ...
├── logs/                            # Service logs
│   ├── db-watcher.log
│   └── chromium.log
└── drafts/                          # Draft content
```

### D: Version Pinning (known-good as of 2026-02-12)

| Component | Version | Source |
|-----------|---------|--------|
| OpenClaw | commit `90f58333e` | github.com/openclaw/openclaw |
| Node.js | v22.22.0 | node:22-bookworm base image |
| Python | 3.11.2 | Debian bookworm |
| Claude Code | 2.1.39 | claude.ai/install.sh |
| mdbook | 0.4.40 | GitHub release |
| Google Chrome | stable (auto-updated) | dl.google.com |
| cloudflared | latest | Cloudflare releases |
| Ubuntu | 22.04 LTS | GCP image |

### E: entrypoint.sh

```bash
#!/bin/bash
# OpenClaw container entrypoint (nimbus:local image)
# Lightweight - all heavy installs are baked into the Docker image.
# Only does runtime-dependent tasks that require mounted volumes.

echo "[entrypoint] Copying nimbus-app.html..."
if [ -f /home/papperpictures/.openclaw/workspace/nimbus-app/index.html ]; then
  mkdir -p /app/dist/control-ui
  cp /home/papperpictures/.openclaw/workspace/nimbus-app/index.html /app/dist/control-ui/nimbus-app.html 2>/dev/null || true
  chown node:node /app/dist/control-ui/nimbus-app.html 2>/dev/null || true
fi

echo "[entrypoint] Ensuring Claude Code state directory..."
mkdir -p /home/node/.claude
chown -R node:node /home/node/.claude

echo "[entrypoint] Setting up Claude Code wrapper..."
mkdir -p /home/node/.local/bin
ln -sf /home/papperpictures/.openclaw/workspace/claude-msg /home/papperpictures/.local/bin/claude-msg 2>/dev/null
chown -h node:node /home/papperpictures/.local/bin/claude-msg 2>/dev/null

echo "[entrypoint] Running workspace startup (background services)..."
if [ -f /home/papperpictures/.openclaw/workspace/startup.sh ]; then
  su node -s /bin/bash -c "bash /home/papperpictures/.openclaw/workspace/startup.sh" &
fi

echo "[entrypoint] Starting gateway as node user..."
cd /app
exec su node -s /bin/bash -c "cd /app && exec $*"
```
