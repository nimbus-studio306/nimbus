# Mac Studio OpenClaw Setup Guide

**Machine:** Mac Studio M2 Max  
**User:** studiokallos  
**Domain:** studiokallos.studio306.nl  
**Last Updated:** 2026-02-20

This documents a complete OpenClaw installation on macOS with all integrations working. Use this as a reference for reproducing the setup on any Mac.

---

## Table of Contents
1. [System Requirements](#system-requirements)
2. [Core Installation](#core-installation)
3. [OpenClaw Gateway](#openclaw-gateway)
4. [Database Setup](#database-setup)
5. [Cloudflare Tunnel](#cloudflare-tunnel)
6. [Google Cloud Services](#google-cloud-services)
7. [Email System](#email-system)
8. [Background Services](#background-services)
9. [Proven Capabilities](#proven-capabilities)
10. [CLI Tools Reference](#cli-tools-reference)

---

## System Requirements

### macOS
- macOS 14+ (Sonoma or later recommended)
- Apple Silicon (M1/M2/M3/M4) for MLX support

### Homebrew Packages (Essential)
```bash
brew install node python@3.13 git gh ffmpeg yt-dlp tesseract pandoc ripgrep jq
brew install cloudflared nginx ollama postgresql@16
brew install sox espeak-ng  # for audio processing
```

### Homebrew Packages (Media Generation)
```bash
brew install imagemagick ghostscript poppler weasyprint mermaid-cli
brew install mlx mlx-c  # Apple Silicon ML framework
```

---

## Core Installation

### 1. Node.js Setup
```bash
# Install Node 22 via Homebrew
brew install node@22

# Set up npm global directory (no sudo needed)
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'

# Add to PATH in ~/.zshrc
export PATH="$HOME/.npm-global/bin:$PATH"
```

### 2. Python Setup
```bash
# Install Python 3.13
brew install python@3.13

# Create alias
alias python3=/opt/homebrew/bin/python3.13
alias pip3=/opt/homebrew/bin/pip3.13
```

### 3. OpenClaw Installation
```bash
npm install -g openclaw

# Verify
openclaw --version
```

### 4. SSH for Remote Access
Ensure SSH is enabled in System Settings → General → Sharing → Remote Login.

For non-interactive shells to find Homebrew tools, create `~/.zshenv`:
```bash
# ~/.zshenv - runs for ALL shells (interactive + non-interactive)
if [ -x /usr/libexec/path_helper ]; then eval $(/usr/libexec/path_helper -s); fi
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$PATH"
export PATH="$HOME/.npm-global/bin:$PATH"
```

---

## OpenClaw Gateway

### Configuration Path
```
~/.openclaw/openclaw.json
```

### Directory Structure
```
~/.openclaw/
├── openclaw.json          # Main config
├── .env                   # Environment variables
├── credentials/           # API keys, OAuth tokens
├── media/                 # Inbound/outbound media
├── workspace/             # Main shared workspace
└── agents/
    └── nimbus-studio/
        ├── workspace/     # Agent-specific files
        ├── sessions/      # Conversation logs
        └── agent/         # Auth profiles
```

### LaunchAgent (Auto-start on Login)
Create `~/Library/LaunchAgents/nl.studio306.openclaw-gateway.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>nl.studio306.openclaw-gateway</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/studiokallos/.npm-global/bin/openclaw</string>
        <string>gateway</string>
        <string>start</string>
        <string>--foreground</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/studiokallos/.openclaw</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/Users/studiokallos/.npm-global/bin</string>
        <key>HOME</key>
        <string>/Users/studiokallos</string>
        <key>OPENCLAW_GATEWAY_BIND</key>
        <string>lan</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/studiokallos/.openclaw/logs/gateway.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/studiokallos/.openclaw/logs/gateway.err</string>
</dict>
</plist>
```

Load with:
```bash
mkdir -p ~/.openclaw/logs
launchctl load ~/Library/LaunchAgents/nl.studio306.openclaw-gateway.plist
```

### Gateway Commands
```bash
# Check status
launchctl print gui/$(id -u)/nl.studio306.openclaw-gateway

# Restart
launchctl kickstart -k gui/$(id -u)/nl.studio306.openclaw-gateway

# Stop
launchctl unload ~/Library/LaunchAgents/nl.studio306.openclaw-gateway.plist

# View logs
tail -f ~/.openclaw/logs/gateway.log
```

---

## Database Setup

### PostgreSQL (Supabase)
Uses remote Supabase PostgreSQL. Connection details in `.env`:
```bash
DB_HOST=<supabase-host>
DB_PORT=5433
DB_NAME=postgres
DB_SCHEMA=project_openclaw_<agent>
DB_USER=<user>
DB_PASSWORD=<password>
```

### Schema Tables
- `structured_sessions` - Session metadata
- `structured_messages` - All messages with embeddings
- `structured_tool_calls` - Tool invocations
- `nodes` - Knowledge graph entities
- `edges` - Knowledge graph relationships
- `emails` - Email archive with embeddings
- `extraction_queue` - Pending entity extractions

### db-watcher (Real-time Sync)
Watches session JSONL files and syncs to PostgreSQL in real-time.

LaunchAgent: `nl.studio306.openclaw.db-watcher.plist`

Script location: `~/.openclaw/agents/nimbus-studio/workspace/db-watcher.py`

---

## Cloudflare Tunnel

### Installation
```bash
brew install cloudflared
cloudflared tunnel login
cloudflared tunnel create studiokallos
```

### Configuration
`~/.cloudflared/config.yml`:
```yaml
tunnel: <tunnel-id>
credentials-file: /Users/studiokallos/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: studiokallos.studio306.nl
    path: /gmail-pubsub
    service: http://localhost:8793
  - hostname: studiokallos.studio306.nl
    service: http://localhost:18790
  - service: http_status:404
```

### DNS Setup
In Cloudflare DNS, create CNAME:
```
studiokallos.studio306.nl → <tunnel-id>.cfargotunnel.com
```

### Run as Service
```bash
sudo cloudflared service install
sudo launchctl load /Library/LaunchDaemons/com.cloudflare.cloudflared.plist
```

---

## Google Cloud Services

### Enabled APIs
| API | Purpose |
|-----|---------|
| Generative Language API | Gemini AI models |
| Gmail API | Email read/send |
| Google Calendar API | Calendar access |
| Cloud Pub/Sub API | Gmail push notifications |
| Google Drive API | File access |
| Google Docs API | Document access |
| People API | Contacts |
| Cloud Text-to-Speech | TTS (Hungarian) |

### Authentication Methods

**1. API Key (simple)**
For Gemini API - stored in `.env` as `GEMINI_API_KEY`

**2. OAuth2 (user consent)**
For Gmail, Calendar - uses refresh tokens stored in `~/.openclaw/credentials/`

**3. Service Account (server-to-server)**
For Pub/Sub - JSON key file

### gog CLI (Google Multi-Account)
```bash
brew install gogcli

# Add account
gog auth login --account user@gmail.com

# Gmail operations
gog gmail list --account user@gmail.com
gog gmail thread get <id> --account user@gmail.com

# Calendar operations
gog calendar events --account user@gmail.com --today
gog calendar create primary --account user@gmail.com --summary "Meeting" --from "2026-02-20T13:00:00+01:00" --to "2026-02-20T14:00:00+01:00"
```

---

## Email System

### Inbound (Gmail Pub/Sub)
Real-time email notifications via Google Cloud Pub/Sub:

1. **Pub/Sub Topic**: `projects/<project>/topics/gmail-notifications`
2. **Push Subscription**: Sends to `https://studiokallos.studio306.nl/gmail-pubsub`
3. **Gmail Router**: Receives webhooks on port 8793, forwards to OpenClaw

LaunchAgent: `nl.studio306.gmail-router.plist`

### Outbound (SMTP with DKIM)
Sends from `nimbus@studio306.nl` with DKIM signing:

```bash
# send-email.js usage
node send-email.js recipient@example.com "Subject" body.txt --cc someone@example.com --attach file.pdf
```

DKIM config in `.env`:
```bash
DKIM_PRIVATE_KEY_PATH=~/.openclaw/credentials/dkim-private.pem
DKIM_SELECTOR=nimbus
DKIM_DOMAIN=studio306.nl
```

---

## Background Services

### LaunchAgents Summary
| Service | Port | Purpose |
|---------|------|---------|
| `nl.studio306.openclaw-gateway` | 18790 | Main OpenClaw gateway |
| `nl.studio306.gmail-router` | 8793 | Gmail Pub/Sub webhook receiver |
| `nl.studio306.openclaw.db-watcher` | - | Session → PostgreSQL sync |
| `nl.studio306.openclaw.batch-embed` | - | Background embedding generation |
| `homebrew.mxcl.ollama` | 11434 | Local LLM inference |
| `homebrew.mxcl.nginx` | 80/443 | Reverse proxy (optional) |

### Managing Services
```bash
# List all OpenClaw services
launchctl list | grep studio306

# Restart a service
launchctl kickstart -k gui/$(id -u)/nl.studio306.openclaw-gateway

# View logs
tail -f ~/.openclaw/logs/gateway.log
```

---

## Proven Capabilities

These features have been tested and confirmed working:

### AI Models
| Provider | Models | Status |
|----------|--------|--------|
| Anthropic | Claude Opus 4.5, Sonnet 4.5 | ✅ Working |
| Google | Gemini 2.5 Pro/Flash | ✅ Working |
| OpenAI | GPT-5.3 Codex | ✅ Working |
| Ollama | Gemma 3 (local) | ✅ Working |

### Voice (TTS/STT)
| Feature | Provider | Status |
|---------|----------|--------|
| English TTS | Edge TTS (built-in) | ✅ Working |
| Hungarian TTS | Google Cloud TTS (`hu-HU-Chirp3-HD-Aoede`) | ✅ Working |
| Speech-to-Text | Gemini 2.5 Flash | ✅ Working |

### Media Generation (Google)
| Feature | Model | Status |
|---------|-------|--------|
| Image Generation | Imagen 4.0 | ✅ Working |
| Video Generation | Veo 2.0/3.0 | ✅ Working |
| Video with Audio | Veo 3.0 | ✅ Working |

### Browser Automation
| Feature | Tool | Status |
|---------|------|--------|
| Screenshots | Puppeteer | ✅ Working |
| Page Snapshots | Built-in browser tool | ✅ Working |
| PDF Generation | Puppeteer | ✅ Working |

### Document Processing
| Feature | Tool | Status |
|---------|------|--------|
| YouTube Transcripts | yt-dlp + Gemini | ✅ Working |
| OCR | Tesseract | ✅ Working |
| PDF to Text | Poppler (pdftotext) | ✅ Working |
| Markdown to PDF | Pandoc + WeasyPrint | ✅ Working |
| Diagrams | Mermaid CLI | ✅ Working |

### Knowledge Graph
| Feature | Status |
|---------|--------|
| Entity Extraction | ✅ Working |
| Semantic Search | ✅ Working (HNSW indexes) |
| Relationship Traversal | ✅ Working |
| Message Embeddings | ✅ Working |

### Email
| Feature | Status |
|---------|--------|
| Gmail Read (multi-account) | ✅ Working |
| Gmail Pub/Sub Push | ✅ Working |
| SMTP Send with DKIM | ✅ Working |
| Email to DB with Embeddings | ✅ Working |

---

## CLI Tools Reference

### Essential Commands
```bash
# OpenClaw
openclaw gateway status
openclaw gateway start --foreground
openclaw channels login --channel whatsapp

# Google (gog)
gog gmail list --account <email>
gog calendar events --account <email> --today

# Media
ffmpeg -i input.mp4 output.mp3
yt-dlp --list-formats <url>
tesseract image.png output.txt

# Search
rg "pattern" /path/to/search
jq '.key' file.json

# Git
gh repo clone owner/repo
gh pr create --title "PR" --body "Description"
```

### Python Libraries (Key)
```
google-generativeai  # Gemini API
anthropic            # Claude API
openai               # GPT API
psycopg2-binary      # PostgreSQL
watchdog             # File system events
aiohttp              # Async HTTP
```

### Node.js Libraries (Key)
```
openclaw             # Gateway
puppeteer            # Browser automation
@anthropic-ai/sdk    # Claude
openai               # GPT
```

---

## Environment Variables Template

Create `~/.openclaw/.env`:
```bash
# OpenClaw Configuration
OPENCLAW_CONFIG_DIR=/Users/<user>/.openclaw
OPENCLAW_WORKSPACE_DIR=/Users/<user>/.openclaw/workspace
OPENCLAW_GATEWAY_PORT=18790
OPENCLAW_GATEWAY_BIND=lan
OPENCLAW_GATEWAY_TOKEN=<generate-random-token>

# AI Model Credentials
ANTHROPIC_OAUTH_TOKEN=<oauth-token>
GEMINI_API_KEY=<api-key>

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://<user>:<pass>@<host>:5433/postgres?schema=<schema>
DB_HOST=<host>
DB_PORT=5433
DB_NAME=postgres
DB_SCHEMA=project_openclaw_<agent>
DB_USER=<user>
DB_PASSWORD=<password>

# Email (SMTP)
SMTP_USER=<email>
SMTP_PASS=<password>
SMTP_HOST=<smtp-server>
SMTP_PORT=465

# DKIM Signing
DKIM_PRIVATE_KEY_PATH=/Users/<user>/.openclaw/credentials/dkim-private.pem
DKIM_SELECTOR=nimbus
DKIM_DOMAIN=studio306.nl

# Google OAuth (for gog CLI)
GOG_KEYRING_PASSWORD=<keyring-password>
```

---

## Troubleshooting

### Gateway won't start
```bash
# Check logs
tail -100 ~/.openclaw/logs/gateway.err

# Verify config
openclaw gateway status

# Check port in use
lsof -i :18790
```

### SSH can't find tools
Ensure `~/.zshenv` has PATH exports (runs for non-interactive shells).

### Pub/Sub not receiving emails
1. Check tunnel is running: `cloudflared tunnel info`
2. Verify webhook URL in GCP Console → Pub/Sub → Subscriptions
3. Check gmail-router logs

### db-watcher not syncing
```bash
# Check if running
launchctl list | grep db-watcher

# View logs
cat ~/.openclaw/logs/db-watcher.log

# Manual test
python3 ~/.openclaw/agents/nimbus-studio/workspace/db-watcher.py
```

---

## Quick Start Checklist

- [ ] Install Homebrew packages
- [ ] Install Node.js and npm global config
- [ ] Install OpenClaw (`npm install -g openclaw`)
- [ ] Create `~/.openclaw/` directory structure
- [ ] Configure `openclaw.json`
- [ ] Set up `.env` with credentials
- [ ] Install Cloudflare Tunnel
- [ ] Configure DNS
- [ ] Set up LaunchAgents
- [ ] Initialize database schema
- [ ] Test gateway: `openclaw gateway status`
- [ ] Test tunnel: visit `https://<domain>/`

---

*This documentation was generated from a working Mac Studio installation. Adapt paths and credentials for your setup.*
