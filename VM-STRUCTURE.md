# VM File Structure

> ⚠️ **OUTDATED — DOCKER ERA** — As of 2026-02-17, OpenClaw runs NATIVELY.
> User is `papperpictures`, paths are under `/home/papperpictures/`, no Docker containers.

Generated: 2026-02-02

## Home Directory (~/)

| Path | Size | Date | Notes |
|------|------|------|-------|
| `~/openclaw-repo/` | dir | 2026-02-01 | Git clone of openclaw/openclaw |
| `~/.openclaw/` | dir | 2026-02-01 | Main OpenClaw data (owned by ubuntu) |
| `~/.claude/` | dir | 2026-02-01 | Claude Code config |
| `~/.claude.json` | 5.9KB | 2026-02-01 | Claude Code auth |
| `~/.local/share/signal-cli/` | dir | 2026-02-01 | signal-cli account data |
| `~/capture-logs.sh` | 214B | 2026-01-31 | Log capture script |
| `~/capture-network.sh` | 277B | 2026-01-31 | Network capture script |

## ~/.openclaw/ (Main Data)

| Path | Size | Date | Notes |
|------|------|------|-------|
| `openclaw.json` | 3.7KB | 2026-02-01 | Gateway config |
| `openclaw.json.bak` | 3.7KB | 2026-02-01 | Config backup |
| `openclaw.json.bak.1-4` | ~3.5KB each | 2026-02-01 | Older config backups |
| `.env` | 143B | 2026-02-01 | GEMINI_API_KEY |
| `config.json` | 349B | 2026-02-01 | Additional config |
| `exec-approvals.json` | 176B | 2026-02-01 | Execution approvals |
| `update-check.json` | 118B | 2026-02-01 | Update check state |

### agents/

| Path | Size | Date | Notes |
|------|------|------|-------|
| `default/sessions/sessions.json` | 9.9KB | 2026-02-01 | Session index |
| `default/sessions/4348d395...jsonl` | 4.9MB | 2026-02-01 | Active session (main) |
| `default/sessions/4348d395...backup` | 7.3MB | 2026-02-01 | Session backup (has audio binary) |
| `default/sessions/cc5aa788...jsonl` | 913KB | 2026-02-01 | Session 2 |
| `default/sessions/cc5aa788...bak` | 1.7MB | 2026-02-01 | Session 2 backup |
| `default/sessions/fc351bd2...jsonl` | 56KB | 2026-02-01 | Session 3 |
| `default/sessions/cc27fb5d...deleted` | 416KB | 2026-02-01 | Deleted session |

### credentials/

| Path | Size | Date | Notes |
|------|------|------|-------|
| `telegram-pairing.json` | 328B | 2026-02-01 | Telegram pairing state |
| `whatsapp-pairing.json` | 249B | 2026-02-01 | WhatsApp pairing state |
| `whatsapp/default/creds.json` | 1.9KB | 2026-02-01 | WhatsApp Business auth |
| `whatsapp/default/creds.json.bak` | 1.9KB | 2026-02-01 | Auth backup |
| `whatsapp/default/pre-key-*.json` | ~200B each | 2026-02-01 | ~800 pre-keys |
| `whatsapp/default/session-*.json` | varies | 2026-02-01 | E2E sessions |
| `whatsapp/default/app-state-sync-*.json` | varies | 2026-02-01 | Sync state |
| `whatsapp/default/device-list-*.json` | varies | 2026-02-01 | Known devices |
| `whatsapp/default/lid-mapping-*.json` | varies | 2026-02-01 | LID mappings |

### memory/

| Path | Size | Date | Notes |
|------|------|------|-------|
| `default.sqlite` | 13.3MB | 2026-02-01 | Embeddings database |
| `default.sqlite.tmp-*` | 12.4MB, 100KB | 2026-02-01 | Temp DB files |

### devices/

| Path | Size | Date | Notes |
|------|------|------|-------|
| `paired.json` | 859B | 2026-02-01 | Paired devices |
| `pending.json` | 2B | 2026-02-01 | Pending pairings |

### identity/

| Path | Size | Date | Notes |
|------|------|------|-------|
| `device-auth.json` | 366B | 2026-02-01 | Device auth |
| `device.json` | 416B | 2026-02-01 | Device identity |

### cron/

| Path | Size | Date | Notes |
|------|------|------|-------|
| `jobs.json` | 32B | 2026-02-01 | Cron jobs config |
| `jobs.json.bak` | 32B | 2026-02-01 | Cron backup |

### canvas/

| Path | Size | Date | Notes |
|------|------|------|-------|
| `index.html` | 3.9KB | 2026-02-01 | Canvas UI |

### sandboxes/agent-default-2a63b213/ (stale copy)

| Path | Size | Date | Notes |
|------|------|------|-------|
| `AGENTS.md` | 7.9KB | 2026-02-01 | Sandbox workspace copy |
| `BOOTSTRAP.md` | 1.6KB | 2026-02-01 | (not updated with live workspace) |
| `HEARTBEAT.md` | 272B | 2026-02-01 | |
| `IDENTITY.md` | 441B | 2026-02-01 | |
| `SOUL.md` | 2.9KB | 2026-02-01 | |
| `TOOLS.md` | 1.3KB | 2026-02-01 | (missing infra update) |
| `USER.md` | 1.2KB | 2026-02-01 | |

### workspace/ (Nimbus live workspace)

| Path | Size | Date | Notes |
|------|------|------|-------|
| `AGENTS.md` | 7.9KB | 2026-02-01 | Workspace instructions |
| `BOOTSTRAP.md` | 1.6KB | 2026-02-01 | First-run ritual |
| `HEARTBEAT.md` | 272B | 2026-02-01 | Heartbeat config |
| `IDENTITY.md` | 441B | 2026-02-01 | Name, pronouns, vibe |
| `MEMORY.md` | 4.8KB | 2026-02-01 | Long-term memory |
| `SOUL.md` | 2.9KB | 2026-02-01 | Personality & rules |
| `TOOLS.md` | 3.1KB | 2026-02-01 | Tools + infrastructure |
| `USER.md` | 1.2KB | 2026-02-01 | User profile (Zsolt) |
| `transcribe.js` | 1.5KB | 2026-02-01 | Audio transcription helper |
| `claude-code-session.jsonl` | 3.8MB | 2026-02-01 | Claude Code session log |
| `memory/2026-02-01.md` | 4.9KB | 2026-02-01 | Daily memory log |
| `memory/voice-vision-transcript.md` | 2.0KB | 2026-02-01 | Voice/vision transcript |
| `nimbus-app/index.html` | 42KB | 2026-02-01 | PWA main page |
| `nimbus-app/icon.svg` | 591B | 2026-02-01 | App icon |
| `nimbus-app/manifest.json` | 376B | 2026-02-01 | PWA manifest |
| `nimbus-app/sw.js` | 829B | 2026-02-01 | Service worker |
| `nimbus-app/README.md` | 3.1KB | 2026-02-01 | App documentation |

## ~/openclaw-repo/ (Source Code)

| Path | Size | Date | Notes |
|------|------|------|-------|
| `docker-compose.yml` | 1.4KB | 2026-02-01 | Docker config (modified) |
| `.env` | 369B | 2026-02-01 | Env vars for Docker |
| `Dockerfile` | 1.1KB | 2026-01-31 | Main Dockerfile |
| `AGENTS.md` | 17.8KB | 2026-01-31 | Agent docs |
| `CLAUDE.md` | symlink | 2026-01-31 | → AGENTS.md |
| `README.md` | 87.4KB | 2026-01-31 | |
| `CHANGELOG.md` | 122KB | 2026-01-31 | |
| `package.json` | 10.8KB | 2026-01-31 | |
| `pnpm-lock.yaml` | 395.7KB | 2026-01-31 | |

### src/ (52 subdirectories)

| Directory | Notes |
|-----------|-------|
| `src/agents/` | Agent logic |
| `src/channels/` | Channel handlers |
| `src/cli/` | CLI interface |
| `src/commands/` | Command handlers |
| `src/config/` | Configuration |
| `src/cron/` | Cron jobs |
| `src/discord/` | Discord channel |
| `src/gateway/` | Gateway server |
| `src/hooks/` | Hook system |
| `src/infra/` | Infrastructure |
| `src/media/` | Media handling |
| `src/media-understanding/` | STT/vision |
| `src/memory/` | Memory/embeddings |
| `src/plugins/` | Plugin system |
| `src/providers/` | LLM providers |
| `src/security/` | Security |
| `src/sessions/` | Session management |
| `src/signal/` | Signal channel |
| `src/slack/` | Slack channel |
| `src/telegram/` | Telegram channel |
| `src/tts/` | Text-to-speech |
| `src/web/` | Web interface |
| `src/whatsapp/` | WhatsApp channel |

### extensions/ (31 directories)

| Directory | Notes |
|-----------|-------|
| `extensions/discord/` | Discord extension |
| `extensions/signal/` | Signal extension |
| `extensions/telegram/` | Telegram extension |
| `extensions/whatsapp/` | WhatsApp extension |
| `extensions/slack/` | Slack extension |
| `extensions/memory-core/` | Memory extension |
| `extensions/memory-lancedb/` | LanceDB memory |
| `extensions/voice-call/` | Voice call extension |
| `extensions/imessage/` | iMessage extension |
| `extensions/line/` | LINE extension |
| `extensions/matrix/` | Matrix extension |
| `extensions/nostr/` | Nostr extension |
| `extensions/googlechat/` | Google Chat extension |
| `extensions/msteams/` | MS Teams extension |
| ... and 17 more |

### skills/ (54 directories)

| Directory | Notes |
|-----------|-------|
| `skills/canvas/` | Canvas/drawing |
| `skills/camsnap/` | Camera snapshot |
| `skills/coding-agent/` | Code agent |
| `skills/discord/` | Discord skill |
| `skills/gemini/` | Gemini skill |
| `skills/github/` | GitHub skill |
| `skills/himalaya/` | Email (himalaya) |
| `skills/notion/` | Notion skill |
| `skills/obsidian/` | Obsidian skill |
| `skills/sag/` | ElevenLabs TTS |
| `skills/slack/` | Slack skill |
| `skills/spotify-player/` | Spotify |
| `skills/voice-call/` | Voice calls |
| `skills/weather/` | Weather |
| ... and 40 more |

## System Paths

| Path | Size | Date | Notes |
|------|------|------|-------|
| `/opt/signal-cli/` | dir | - | signal-cli v0.13.23 |
| `/opt/signal-cli/bin/signal-cli` | - | - | CLI binary (Java) |
| `/opt/signal-cli/lib/` | - | - | Java libraries |
| `/usr/local/bin/signal-cli` | symlink | - | → /opt/signal-cli/bin/signal-cli |
| `/etc/cloudflared/config.yml` | 231B | 2026-02-01 | Tunnel config |
| `/etc/cloudflared/42167d42...json` | 176B | 2026-02-01 | Tunnel credentials |
| `~/.local/share/signal-cli/data/accounts.json` | 179B | 2026-02-01 | Signal accounts |
| `~/.local/share/signal-cli/data/600490` | 1.6KB | 2026-02-01 | Signal account data |
| `~/.local/share/signal-cli/data/600490.d/` | dir | 2026-02-01 | Signal account store |

## Systemd Services (enabled)

| Service | Notes |
|---------|-------|
| `cloudflared.service` | Cloudflare Tunnel |
| `docker.service` | Docker daemon |
| `ssh.service` | SSH server |
| `containerd.service` | Container runtime |
| `google-guest-agent.service` | GCP guest agent |
| `ufw.service` | Firewall |
| `cron.service` | Cron daemon |

## Docker

| Container | Status | Notes |
|-----------|--------|-------|
| `openclaw-repo-openclaw-gateway-1` | Up | Gateway on port 18789 |
