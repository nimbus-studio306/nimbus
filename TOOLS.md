---
summary: "Workspace template for TOOLS.md"
read_when:
  - Bootstrapping a workspace manually
---
# TOOLS.md - Local Notes

Skills define *how* tools work. This file is for *your* specifics — the stuff that's unique to your setup.

## ⚠️ WORKSPACE STRUCTURE (IMPORTANT)

**Two different workspaces exist:**
- **Main workspace:** `/home/papperpictures/.openclaw/workspace/` — shared scripts, plugins, tools
- **Agent workspace:** `/home/papperpictures/.openclaw/agents/nimbus/workspace/` — my personal files (SOUL.md, MEMORY.md, etc.)

**My agent workspace has NO scripts.** All executable scripts live in the main workspace.

When running scripts, ALWAYS use full paths or `cd /home/papperpictures/.openclaw/workspace && ...`

## Avatars (2026-02-20)

**Primary:**
- `avatars/avatar_nimbus_final_square.png` — Nimbus profile (1024x1024)
- `avatars/avatar_nimbus_loop.mp4` — Nimbus animated (9:16)
- `avatars/avatar_nimbus_studio_final_clean.png` — Studio profile (1024x1024, text-free)
- `avatars/avatar_nimbus_studio_soft_loop.mp4` — Studio animated (9:16)

**Branded/Archive:** `avatars/` folder has 16 alternates (cyberpunk, soft, branded, square crops)

---

## ⚠️ JSON Editing (CRITICAL)

**NEVER use `edit` tool on `.json` files.** The exact whitespace matching fails constantly.

**USE `jq` instead:**
```bash
jq '.path.to.key = value' file.json > /tmp/out.json && mv /tmp/out.json file.json
```

Example (editing openclaw.json):
```bash
jq '.agents.defaults.models."anthropic/claude-opus-4-6".alias = "opus"' openclaw.json > /tmp/config.json && mv /tmp/config.json openclaw.json
```

Then restart gateway if needed. **jq is 100% reliable for JSON edits.**

## What Goes Here

Things like:
- Camera names and locations
- SSH hosts and aliases  
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## TTS Voices

### English (Zsolt's preferred)
- **Provider:** Edge TTS (built-in `tts` tool)
- **Voice approved:** 2026-02-14

### ⚠️ Voice Reply Protocol (Flexible & Strict Delivery)

**The Logic (INTENT):**
1. **Default:** Audio In → Audio Out.
2. **Override (Text):** If Zsolt asks for text (or "read"), output **TEXT ONLY**.
3. **Override (Mixed):** If Zsolt asks for both or specific parts, use `[[tts]]` tags for the audio parts.

**The Delivery (MECHANISM - HARD RULE, NEVER BREAK THIS):**
Chronological ordering is critical — messages must arrive in the order sent.

**For audio-only responses:**
1. Call `tts({ text: "..." })`.
2. TTS returns audio_as_voice marker — treat delivery as already handled by transport.
3. Reply exactly `NO_REPLY`.

**For mixed responses (text + audio):**
1. Send text message FIRST via `message.send()` (wait for result).
2. Add delay (300ms minimum) to ensure text reaches transport queue first.
3. Then call `tts(...)` for audio immediately.
4. Reply `NO_REPLY` after audio is queued.

**Critical - FIFO Chronological Order (HARD RULE):**
- User message arrives
- [I process and understand]
- Send acknowledgment: brief confirmation I understood
- [delay 300ms]
- Send text response
- [delay 300ms]  
- Send audio response
- [STOP - NO FURTHER MESSAGES]
- Reply NO_REPLY

**NEVER:**
- Send multiple independent text messages
- Add explanatory text between acknowledgment and response
- Send commentary about what I just did
- Break the response into scattered pieces

Sequence is: acknowledgment → [delay] → text → [delay] → audio → STOP

### 🚫 Ordering Guard (2026-02-22)
- Audio must never arrive before its text explanation
- Use the two-step pipeline: text → delay → audio → NO_REPLY
- If ordering appears wrong again, increase delay or use audio-only responses

### Hungarian
- **Provider:** Google Cloud TTS (via GEMINI_API_KEY)
- **Voice:** `hu-HU-Chirp3-HD-Aoede`

## STT (Speech-to-Text)

**ALWAYS use these models - NEVER use 2.0 Flash:**
- **Primary:** `gemini-2.5-pro`
- **Fallback:** `gemini-2.5-flash`

Script pattern:
```python
response = client.models.generate_content(
    model='gemini-2.5-pro',  # NEVER 2.0!
    contents=[
        'Transcribe this audio accurately. Output only the transcription, nothing else.',
        {'inline_data': {'mime_type': 'audio/wav', 'data': base64.b64encode(audio_data).decode()}}
    ]
)
```
- **Script:** `/home/papperpictures/.openclaw/workspace/scripts/voice/google-tts.sh "text" "hu-HU-Chirp3-HD-Aoede" "/tmp/output.mp3"`
- Remember: name is **Nimbusz** in Hungarian!

### Google TTS (Alternative)
- Available but NOT preferred for English
- Script: `/home/papperpictures/.openclaw/workspace/scripts/voice/google-tts.sh "text" "en-US-Chirp3-HD-Aoede" "/tmp/output.mp3"`
- Use only if specifically requested

## Email

### Gmail Access
**gog CLI is installed** at `/usr/local/bin/gog`
- Use `gog gmail` for multi-account Gmail access
- All 5 accounts OAuth working ✅

**All accounts working (verified 2026-02-20):**
- papperpictures@gmail.com ✅
- urbandanceteam@gmail.com ✅
- studio306nl@gmail.com ✅
- funkin4holland@gmail.com ✅
- c3studios.nl@gmail.com ✅

### Sending (nimbus@studio306.nl via SMTP)
- **Send email:** `cd /home/papperpictures/.openclaw/workspace && node send-email.js <to> <subject> <bodyFile> [--cc <cc>] [--attach <file>...]`
- DKIM signed, saves to DB with embeddings
- Supports attachments: `--attach file.pdf --attach image.jpg`
- **Full path:** `/home/papperpictures/.openclaw/workspace/scripts/email/send-email.js`

### Creating Reply Drafts (IMPORTANT PROCESS)
1. **ALWAYS fetch thread first:** `gog gmail thread get <id> --account <email>`
2. **Get exact original subject** from the thread
3. **Use correct subject:** `Re: [exact original subject]` — NEVER invent subject lines
4. **Create draft:** `gog gmail drafts create --account <email> --to <to> --subject "Re: [exact subject]" --reply-to-message-id <msgId> --body "..."`

**Why this matters:** Gmail threading uses In-Reply-To headers + subject matching. Wrong subject = email appears as new thread, not a reply.

### Legacy (DO NOT USE)
- ~~gmail-search.js~~ — single-account, superseded by gog
- `/home/papperpictures/.openclaw/workspace/scripts/email/check-email.js` — still used by cron for inbox polling + DB persistence

## Knowledge Graph

### Plugin Location & Config
**Path:** `/home/papperpictures/.openclaw/workspace/plugins/knowledge-graph/`
**Config in openclaw.json:**
```json
{
  "plugins": {
    "load": {
      "paths": ["/home/papperpictures/.openclaw/workspace/plugins/knowledge-graph"]
    },
    "entries": {
      "knowledge-graph": { "enabled": true }
    }
  }
}
```

### Native Tool (PREFERRED)
Use the `knowledge_graph` tool directly — it's a registered OpenClaw tool with 4 actions:

| Action | Use For | Example |
|--------|---------|---------|
| `search` | Semantic search across entities + messages | `knowledge_graph({ query: "email infrastructure" })` |
| `entity` | Exact name/alias lookup with relationships | `knowledge_graph({ query: "OpenClaw", action: "entity" })` |
| `relationships` | Find all edges for an entity | `knowledge_graph({ query: "Zsolt", action: "relationships" })` |
| `categories` | Category tags by message ID or name | `knowledge_graph({ query: "Docker", action: "categories" })` |

**When to use:**
- Before saying "I don't know" about something from the past
- When asked about people, projects, tools, or prior decisions
- To find connections between entities
- To recall context from old conversations

### Additional Plugin Tools
The knowledge-graph plugin also provides:

| Tool | Use For |
|------|---------|
| `db_query` | Read-only SQL queries against PostgreSQL. Direct access to structured_messages, nodes, edges tables. |
| `db_search` | Semantic search specifically on messages using embeddings. |
| `session_grep` | Search across session JSONL files for text patterns. Find past conversations, errors, tool calls. |

**db_query example:**
```
db_query({ sql: "SELECT name, node_type FROM nodes WHERE importance > 5 LIMIT 10" })
```

**session_grep example:**
```
session_grep({ pattern: "error", type_filter: "error", max_results: 10, include_context: true })
```

**Plugin paths:**
- knowledge-graph: `/home/papperpictures/.openclaw/workspace/plugins/knowledge-graph/`
- session-grep: `/home/papperpictures/.openclaw/workspace/plugins/session-grep/`

### CLI Scripts (for maintenance/debugging)
All scripts in `/home/papperpictures/.openclaw/workspace/`:
- **Search:** `python3 /home/papperpictures/.openclaw/workspace/scripts/graph/graph-query.py search "topic"` — semantic search on entities
- **Stats:** `python3 /home/papperpictures/.openclaw/workspace/scripts/graph/graph-query.py stats` — node/edge counts
- **Traverse:** `python3 /home/papperpictures/.openclaw/workspace/scripts/graph/graph-query.py traverse <node_id> [depth]` — explore connections
- **Extract:** `python3 /home/papperpictures/.openclaw/workspace/scripts/graph/graph-extract.py extract message <id>` — extract entities from a message
- **Process queue:** `python3 /home/papperpictures/.openclaw/workspace/scripts/graph/graph-extract.py process [batch]` — process pending extractions
- **Hot context:** `memory/graph-context.md` — auto-loaded, recent entities
- **Update context:** `python3 /home/papperpictures/.openclaw/workspace/scripts/graph/update-graph-context.py` — refresh hot context file

## Database Scripts
All scripts in `/home/papperpictures/.openclaw/workspace/`:
- **DB watcher:** `python3 /home/papperpictures/.openclaw/workspace/scripts/database/db-watcher.py` — real-time sync from JSONL to PostgreSQL (runs in background)
- **Save email:** `python3 /home/papperpictures/.openclaw/workspace/scripts/email/save-email-to-db.py <json_file>` — insert email with embedding
- **Startup:** `/home/papperpictures/.openclaw/workspace/scripts/util/startup.sh` — starts db-watcher + runs batch embed
- **Batch embed:** `python3 /home/papperpictures/.openclaw/workspace/scripts/database/batch-embed.py` — process messages missing embeddings

## Database Connection
- **Host:** 81.0.107.97:5433 (Zsolt's Supabase VPS)
- **Schema:** `project_openclaw_nimbus`
- **Tables:** `structured_sessions`, `structured_messages`, `structured_tool_calls`, `nodes`, `edges`, `emails`, `extraction_queue`
- **Env vars:** `$DB_HOST`, `$DB_PORT`, `$DB_USER`, `$DB_PASSWORD`, `$DB_NAME`, `$DB_SCHEMA`

## Installed Capabilities

### CLI Tools (use via exec)
| Tool | Command | Use For |
|------|---------|---------|
| ffmpeg | `ffmpeg -i in.mp4 out.mp3` | Audio/video conversion |
| yt-dlp | `yt-dlp <url>` | Download YouTube/media |
| tesseract | `tesseract image.png output` | OCR images → text |
| pdftotext | `pdftotext file.pdf -` | PDF → text |
| pandoc | `pandoc in.md -o out.html` | Document conversion |
| wkhtmltopdf | `wkhtmltopdf input.html output.pdf` | HTML/Markdown → PDF |
| convert | `convert in.png -resize 50% out.png` | ImageMagick image manipulation |
| identify | `identify image.png` | ImageMagick image info |
| rg | `rg "pattern" path/` | Fast text search |
| jq | `jq '.key' file.json` | JSON processing |
| sqlite3 | `sqlite3 db.sqlite` | SQLite queries |
| chromium | `chromium --headless` | Headless browser (use `browser` tool instead) |
| mmdc | `mmdc -i in.mmd -o out.png` | Mermaid diagrams |
| gs | `gs -sDEVICE=pdfwrite ...` | Ghostscript PDF/PostScript |
| sox | `sox in.wav out.mp3` | Audio processing |
| Xvfb | `Xvfb :99 -screen 0 1920x1080x24` | Virtual display |
| xvfb-run | `xvfb-run command` | Run in virtual display |
| claude | `claude "prompt"` | Claude Code CLI |

### Python Libraries (use in scripts)
- **pandas** — data analysis, CSV/Excel handling
- **pdfplumber** — detailed PDF extraction (tables, layout)
- **pdfminer.six** — lower-level PDF text extraction
- **pypdfium2** — PDF rendering/conversion
- **beautifulsoup4** — HTML/XML parsing
- **pillow** — image manipulation (PIL)
- **opencv-python-headless** — computer vision, image processing (cv2)
- **numpy** — numerical operations
- **psycopg2** — PostgreSQL database
- **watchdog** — file system monitoring
- **httpx** — modern async HTTP client
- **aiohttp** — async HTTP client/server
- **requests** — classic HTTP client
- **supabase** — Supabase Python client (auth, storage, functions)
- **dropbox** — Dropbox API client
- **pydub** — audio manipulation (cut, join, effects)
- **soundfile** — read/write audio files (WAV, FLAC, etc.)
- **mutagen** — audio metadata (ID3 tags, etc.)
- **imageio** + **imageio-ffmpeg** — image/video I/O
- **psd-tools** — Photoshop PSD file processing
- **xlrd** — read Excel files (.xls)
- **xlsxwriter** — write Excel files (.xlsx)
- **pysubs2** — subtitle processing (SRT, ASS, VTT)
- **rich** — beautiful terminal output/formatting
- **pyiceberg** — Apache Iceberg data lake tables
- **moviepy** — video editing (cuts, effects, compositing)
- **pillow_heif** — HEIF/HEIC image support
- **openpyxl** — read/write Excel files (.xlsx)
- **gspread** — Google Sheets API client
- **edge-tts** — Microsoft Edge TTS (free text-to-speech)
- **google-genai** — Google Gemini API client
- **google-cloud-speech** — Google Cloud Speech-to-Text
- **google-cloud-texttospeech** — Google Cloud TTS
- **google-cloud-vision** — Google Cloud Vision API
- **google-cloud-translate** — Google Cloud Translation
- **google-cloud-storage** — Google Cloud Storage
- **google-cloud-language** — Google Cloud Natural Language

### Node/Dev Tools
- **TypeScript 5.9.3** — `tsc` compiler
- **eslint, prettier** — code formatting
- **vitest** — testing
- **mermaid-cli** — `mmdc -i diagram.mmd -o output.png` — renders Mermaid diagrams ✅
- **ghostscript** — PDF/PostScript processing (`gs` command)
- **Claude Code CLI** — `/home/papperpictures/.local/bin/claude` (v2.1.39)

### Claude Code Web Search (IMPORTANT)
Claude Code can search the web, but needs specific flags:
```bash
# MUST use PTY mode (pty: true in exec) — hangs without it
# MUST use --dangerously-skip-permissions for web search/fetch
/home/papperpictures/.local/bin/claude --print --dangerously-skip-permissions "Search query here"
```
Use this when Brave Search API is unavailable or for research tasks.

### Display & Recording Tools
- **Xvfb** — virtual framebuffer (headless X server)
- **xvfb-run** — wrapper to run commands in virtual display
- **fluxbox** — lightweight window manager for Xvfb
- **x11vnc** — VNC server for remote viewing of virtual display

Screen recording example:
```bash
# Start virtual display
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99
fluxbox &

# Run browser in virtual display
chromium --no-sandbox --display=:99 &

# Record with ffmpeg
ffmpeg -f x11grab -video_size 1920x1080 -i :99 -t 30 output.mp4
```

### Audio Tools
- **ffmpeg** — universal audio/video processing
- **sox** — `sox in.wav out.mp3` — audio processing, effects, conversion

## Web Browsing — Multiple Options

Different websites need different approaches. Use the right tool for the job:

### Option 1: `web_fetch` (Lightweight)
- **Best for:** Static pages, articles, docs, simple HTML
- **Pros:** Fast, low resource, no browser needed
- **Cons:** No JavaScript execution, no dynamic content
- **Use:** `web_fetch({ url: "...", extractMode: "markdown" })`

### Option 2: Playwright Browser (Direct Scripts)
- **Best for:** Dynamic pages, SPAs, JS-rendered content, interactions
- **Pros:** Full JS execution, screenshots, reliable
- **Status:** Chrome 145 has crashpad bug — use Playwright server instead of OpenClaw browser tool
- **Server:** Started by startup.sh, endpoint in `/tmp/playwright-ws-endpoint.txt`

**Usage:**
```javascript
const { chromium } = require('playwright');
const fs = require('fs');
const wsEndpoint = fs.readFileSync('/tmp/playwright-ws-endpoint.txt', 'utf8').trim();
const browser = await chromium.connect(wsEndpoint);
const page = await browser.newPage();
await page.goto('https://example.com');
await page.screenshot({ path: '/tmp/screenshot.png' });
await browser.close();
```

**OpenClaw `browser` tool:** Currently broken (expects CDP on 18800, Chrome 145 crashes)

**For full-page screenshots:**
1. Open page
2. Scroll down to trigger lazy loading: `{ kind: "evaluate", fn: "window.scrollTo(0, document.body.scrollHeight)" }`
3. Wait 2-3 seconds
4. Scroll back to top
5. Take fullPage screenshot

### Option 3: Browser + Vision API (Visual Understanding)
- **Best for:** Understanding layouts, finding elements visually, complex UIs
- **Workflow:** Take screenshot → send to `image` tool with prompt
- **Use when:** DOM snapshot is confusing, need visual context

### Option 4: Hybrid Approach
1. Try `web_fetch` first (fast)
2. If content missing/dynamic → use `browser`
3. If visually complex → add Vision API analysis

### Known Limitations
- **YouTube embeds:** Show black in headless (iframe blocking)
- **Cookie banners:** Click "Accept" via DOM snapshot refs
- **Lazy loading:** Scroll down to trigger, then screenshot
- **Some SPAs:** May need wait time after navigation

### Troubleshooting
- **Browser not running:** Check `browser({ action: "status", profile: "openclaw" })` — OpenClaw auto-manages it
- **CDP socket closed:** Chromium crashed, OpenClaw will restart it automatically
- **Black screenshots:** Page didn't render, try scroll + wait

### Fonts (FIXED 2026-02-12)
ImageMagick fonts now work! Available font families:
- `DejaVu-Sans`, `DejaVu-Sans-Bold`, `DejaVu-Serif`, `DejaVu-Sans-Mono`
- `Liberation-Sans`, `Liberation-Serif`, `Liberation-Mono`
- URW Base35 fonts (Bookman, Nimbus, etc.)

Example with text overlay:
```bash
convert -size 600x200 gradient:navy-darkblue \
  -fill cyan -font DejaVu-Sans-Bold -pointsize 48 \
  -gravity center -annotate 0 'Hello World' output.png
```

## My Capabilities (USE THESE)

### Data Search — In Order
1. **Session files (SOURCE):** `grep "text" /home/papperpictures/.openclaw/agents/nimbus/sessions/*.jsonl`
2. **Database:** `psql "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"` or Python with psycopg2
3. **Workspace files:** `rg "text" /home/papperpictures/.openclaw/workspace/`

### Python Libraries I Have
- **psycopg2** — PostgreSQL direct access
- **pandas** — data analysis, CSV/Excel
- **google-generativeai** — Gemini embeddings/LLM
- **watchdog** — file monitoring
- **pdfplumber** — PDF extraction
- **beautifulsoup4** — HTML parsing

### Shell Tools I Have
- **grep/rg** — text search (rg is faster)
- **jq** — JSON processing
- **psql** — PostgreSQL CLI
- **ffmpeg** — audio/video
- **yt-dlp** — YouTube download
- **tesseract** — OCR

### Key Paths
- Session files: `/home/papperpictures/.openclaw/agents/nimbus/sessions/*.jsonl`
- My workspace: `/home/papperpictures/.openclaw/workspace/`
- Media inbound: `/home/papperpictures/.openclaw/media/inbound/`
- Claude Code: `/home/papperpictures/.local/bin/claude`, wrapper at `claude-msg`
  - State persists in bind mount (`~/.openclaw/claude-state/` on host)
  - **No re-auth after restarts** — credentials persist
  - Entrypoint auto-runs startup.sh + creates symlinks

### When Searching for Old Content
1. Get exact text sample from user
2. `grep "exact text" /home/papperpictures/.openclaw/agents/nimbus/sessions/*.jsonl`
3. If not found, then try database
4. DON'T assume data is missing — try ALL sources first

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.

## WhatsApp Group Setup (NEW GROUP PROCESS)

When Zsolt creates a new WhatsApp group and adds me (+31651453590):

1. **I'm already in the group** — no invite link needed
2. **Find the JID** — run `sessions_list`, look for new group session with the group name
3. **Add to config** — patch config to add the JID to `channels.whatsapp.groups`:
   ```json
   {
     "channels": {
       "whatsapp": {
         "groups": {
           "<JID>@g.us": { "requireMention": false }
         },
         "accounts": {
           "default": {
             "groups": {
               "<JID>@g.us": { "requireMention": false }
             }
           }
         }
       }
     }
   }
   ```
4. **Gateway restarts automatically** after config.patch

That's it. No `allowGroups` field exists — use `groups` object with the JID as key.

## Infrastructure — DO NOT SUGGEST ALTERNATIVES

### Web UI Access
- **URL:** https://nimbus-cloud.studio306.nl
- **Auth:** token query param (see openclaw.json gateway.auth.token)
- **NEVER suggest SSH tunnels, direct IP access, or opening firewall ports** — Cloudflare handles everything

### VM
- **Project:** neat-drummer-486005-e4
- **OS:** Ubuntu 22.04 LTS
- **User:** papperpictures (native install — NO Docker)

### Ports (all behind Cloudflare, NOT directly exposed)
- **18790** — OpenClaw gateway (WebSocket + HTTP)

### Native Install (NO DOCKER)
- OpenClaw runs natively as systemd user service: `openclaw-gateway.service`
- **Config:** /home/papperpictures/.openclaw/openclaw.json
- **Workspace:** /home/papperpictures/.openclaw/workspace/
- **Agents:** /home/papperpictures/.openclaw/agents/
- **Claude Code:** /home/papperpictures/.local/bin/claude

### Cloudflare Tunnel
- **Domain:** nimbus-cloud.studio306.nl → localhost:18790 (via nginx proxy on 18789)
- **Service:** cloudflared (systemd service)

## Voice Messages (TTS → Send)

**CORRECT FLOW:**
1. Generate audio: `tts({ text: "Hello!" })` → returns a MEDIA line with actual path
2. Output the MEDIA line exactly as returned — OpenClaw handles delivery

**DO NOT** put example file paths in documentation — they get parsed as real media!

## Google Media Generation (Discovered 2026-02-14)

Full skill: `skills/google-media-gen/SKILL.md`

### Image Generation (Imagen 4)
- `imagen-4.0-generate-001` — standard quality ✅ WORKING
- `imagen-4.0-ultra-generate-001` — ultra quality
- `imagen-4.0-fast-generate-001` — fast generation

### Video Generation (Veo)
- `veo-2.0-generate-001` — stable, **NO audio** ✅ WORKING
- `veo-3.0-generate-001` — **WITH native audio** (sound effects, ambient)
- `veo-3.1-generate-preview` — latest with audio

### Key Notes
- Veo 2 = video only, add audio with ffmpeg
- Veo 3 = video + AI-generated audio (use this for complete videos!)
- Image-to-video works: pass `image=types.Image(image_bytes=..., mime_type=...)`
- Download videos with `x-goog-api-key` header
- Generation takes 1-2+ minutes, poll with `operation.done`

## Google Calendar (gog)

### Create event
```bash
gog calendar create primary \
  --account papperpictures@gmail.com \
  --summary "Event title" \
  --from "2026-02-20T13:00:00+01:00" \
  --to "2026-02-20T14:00:00+01:00" \
  --location "Location" \
  --description "Description" \
  --reminder "popup:30m"
```

### List events
```bash
gog calendar events --account papperpictures@gmail.com --today
gog calendar events --account papperpictures@gmail.com --tomorrow
gog calendar events --account papperpictures@gmail.com --days 7
```

### Search events
```bash
gog calendar search "query" --account papperpictures@gmail.com
```

## Gmail Router (CRITICAL)
**Location:** `/home/papperpictures/.openclaw/workspace/scripts/email/gmail-multi-router.js`
**Systemd:** `~/.config/systemd/user/gmail-router.service`

**MUST have this environment variable:**
```
Environment="GOG_KEYRING_PASSWORD=openclaw"
```

Without it, gog cannot access OAuth tokens in non-TTY mode and the router fails silently.

**Verify working:**
```bash
systemctl --user status gmail-router
tail /tmp/gmail-router.log
```

If you see "no TTY available for keyring" errors, the password is missing.

## STT (Speech-to-Text)

**ALWAYS use these models - NEVER use 2.0 Flash:**
- **Primary:** `gemini-2.5-pro`
- **Fallback:** `gemini-2.5-flash`

Script pattern:
```python
response = client.models.generate_content(
    model='gemini-2.5-pro',  # NEVER 2.0!
    contents=[
        'Transcribe this audio accurately. Output only the transcription, nothing else.',
        {'inline_data': {'mime_type': 'audio/wav', 'data': base64.b64encode(audio_data).decode()}}
    ]
)
```

## Custom Chat Commands

| Command | Action | Script |
|---------|--------|--------|
| `/lsmodels` | List all available models with aliases | `node /home/papperpictures/.openclaw/workspace/scripts/list-models.js` |

When a user types `/lsmodels` in chat, run the script above and send the output as the reply.

## Code Graph (Live — Feb 22, 2026)

The code graph is **fully operational** with 11,008 nodes, 16,735 edges, and 100% embedding coverage across all repos.

### Database Tables (already created and populated)
- `code_nodes` — 11,008 entries (functions, files, classes, modules, types, interfaces, methods, config_keys)
- `code_edges` — 16,735 entries (imports, defines, exports, contains, extends, implements)
- `code_graph_status` — tracks which chunks have been processed

### CLI: `nimbus code-graph`
```bash
nimbus code-graph extract [--repo X] [--force]   # regex extraction from code_chunks
nimbus code-graph resolve                          # cross-file import resolution
nimbus code-graph embed [--limit N]                # generate Gemini embeddings
nimbus code-graph stats                            # print graph statistics
nimbus code-graph query <name>                     # quick node lookup
nimbus code-graph reset                            # truncate all code graph tables
nimbus index-all                                   # full pipeline: index + extract + resolve + embed
```

### Post-Commit Hooks
Installed in all 7 GitHub repos on studiokallos. On every commit, automatically runs: index → extract → resolve → embed (background, logs to /tmp/openclaw-post-commit.log).

### Scripts Location
All code-graph scripts are in the **main workspace**: `/home/papperpictures/.openclaw/workspace/scripts/code-graph/`

### Do NOT re-initialize
Tables exist and are populated. Do not run CREATE TABLE or initialization — it will fail or wipe data.


## Voice MCP (Kokoro TTS + MLX Whisper STT) on Mac Studio

The voice-mcp runs on studiokallos with an HTTP API on port 18792.
Access via node: `openclaw nodes invoke --node studiokallos --command system.run`

### Speak on Mac Studio Speakers
```bash
openclaw nodes invoke --node studiokallos --command system.run \
  --params '{"command":["curl","-s","-X","POST","http://127.0.0.1:18792/speak","-H","Content-Type: application/json","-d","{\"text\":\"Hello from nimbus VM\",\"voice\":\"af_heart\",\"speed\":1.0}"]}' \
  --json --invoke-timeout 30000
```

### Generate Audio File (WAV/FLAC)
```bash
openclaw nodes invoke --node studiokallos --command system.run \
  --params '{"command":["curl","-s","-X","POST","http://127.0.0.1:18792/tts","-H","Content-Type: application/json","-d","{\"text\":\"Hello\",\"voice\":\"af_heart\"}","-o","/tmp/output.wav"]}' \
  --json
```

### Other Endpoints
- `GET /health` — `{"ok": true, "tts": "kokoro", "stt": "mlx-whisper"}`
- `GET /voices` — List available voice presets
- `GET /status` — Playback queue status
- `POST /stop` — Stop current playback
- `POST /stt` — Transcribe audio (send raw bytes, query: ?model=medium&language=en)


### Record from Mac Studio Mic and Transcribe (STT)

Record audio from the AirPods/mic and transcribe via MLX Whisper.
The listen script is at `/tmp/listen.py` on studiokallos.

```bash
# Record and transcribe (default 30s, with start/end beeps)
openclaw nodes invoke --node studiokallos --command system.run \
  --params '{"command":["/Users/studiokallos/.openclaw/services/voice-mcp/.venv/bin/python3","/tmp/listen.py"]}' \
  --json --invoke-timeout 90000

# Optional durations: 15, 30 (default), 60, 120, 180 seconds
openclaw nodes invoke --node studiokallos --command system.run \
  --params '{"command":["/Users/studiokallos/.openclaw/services/voice-mcp/.venv/bin/python3","/tmp/listen.py","15"]}' \
  --json --invoke-timeout 60000
```

The script plays a beep before recording starts and another when recording ends.
Records from the default mic at 16kHz mono, then transcribes via MLX Whisper.
Set invoke-timeout to at least duration + 30 seconds for transcription time.

**STT query params:** `?model=small|medium|large&language=en&corrections=true`

### Full Voice Loop Example

```bash
# 1. Listen to user
TRANSCRIPT=$(openclaw nodes invoke --node studiokallos --command system.run \
  --params '{"command":["/Users/studiokallos/.openclaw/services/voice-mcp/.venv/bin/python3","/tmp/listen.py","5"]}' \
  --json --invoke-timeout 60000 | jq -r '.payload.stdout' | grep 'Transcription:' | sed 's/Transcription: //')

# 2. Process and respond via TTS
openclaw nodes invoke --node studiokallos --command system.run \
  --params "{\"command\":[\"curl\",\"-s\",\"-X\",\"POST\",\"http://127.0.0.1:18792/speak\",\"-H\",\"Content-Type: application/json\",\"-d\",\"{\\\"text\\\":\\\"Your response here\\\",\\\"voice\\\":\\\"af_heart\\\"}\"]}" \
  --json --invoke-timeout 30000
```


## Google Meet (Playwright on Mac Studio)

Join, create, and manage Google Meet calls via Playwright browser on studiokallos.
Script: `/Users/studiokallos/.openclaw/workspace/scripts/meet/meet-join.py`
Account: nimbus.kallossoft@gmail.com (persistent session in `/tmp/pw-meet-profile2`)

### Commands

| Command | Description | Needs GUI | Gateway timeout safe |
|---------|-------------|-----------|---------------------|
| `status` | Check if signed in | No (headless) | Yes |
| `signin <email> <pass> [totp]` | Sign in to Google | Yes | No |
| `create` | Create meeting, return link | Yes | No |
| `invite <url> <emails...>` | Calendar invite with Meet link | Yes | No |
| `join <url>` | Join meeting (long-running) | Yes | No |
| `admit` | Admit waiting guests | Yes | No |
| `leave` | Leave/close meeting browser | No | Yes |

### Check Status (via node invoke — fast, <30s)
```bash
openclaw nodes invoke --node studiokallos --command system.run \
  --params '{"command":["python3","/Users/studiokallos/.openclaw/workspace/scripts/meet/meet-join.py","status"]}' \
  --json --invoke-timeout 30000
```

### Create Meeting (via SSH — exceeds gateway 30s timeout)
```bash
ssh studiokallos 'sudo launchctl asuser 501 su - studiokallos -c "MEET_GUI_SESSION=1 python3 /Users/studiokallos/.openclaw/workspace/scripts/meet/meet-join.py create"'
```

### Join Meeting (via SSH — long-running, stays in call)
```bash
# Join with mic on, camera off
ssh studiokallos 'sudo launchctl asuser 501 su - studiokallos -c "MEET_GUI_SESSION=1 python3 /Users/studiokallos/.openclaw/workspace/scripts/meet/meet-join.py join https://meet.google.com/xxx-xxxx-xxx"' &

# Join with auto-admit enabled
ssh studiokallos 'sudo launchctl asuser 501 su - studiokallos -c "MEET_AUTO_ADMIT=1 MEET_GUI_SESSION=1 python3 /Users/studiokallos/.openclaw/workspace/scripts/meet/meet-join.py join https://meet.google.com/xxx-xxxx-xxx"' &
```

### Send Calendar Invite (via SSH)
```bash
ssh studiokallos 'sudo launchctl asuser 501 su - studiokallos -c "MEET_GUI_SESSION=1 python3 /Users/studiokallos/.openclaw/workspace/scripts/meet/meet-join.py invite https://meet.google.com/xxx-xxxx-xxx email1@example.com email2@example.com"'
```

### Admit Waiting Guests (via SSH)
```bash
ssh studiokallos 'sudo launchctl asuser 501 su - studiokallos -c "MEET_GUI_SESSION=1 python3 /Users/studiokallos/.openclaw/workspace/scripts/meet/meet-join.py admit"'
```

### Leave Meeting
```bash
# Via node invoke (fast)
openclaw nodes invoke --node studiokallos --command system.run \
  --params '{"command":["python3","/Users/studiokallos/.openclaw/workspace/scripts/meet/meet-join.py","leave"]}' \
  --json --invoke-timeout 30000
```

### Sign In (only needed if session expires)
```bash
ssh studiokallos 'sudo launchctl asuser 501 su - studiokallos -c "MEET_GUI_SESSION=1 python3 /Users/studiokallos/.openclaw/workspace/scripts/meet/meet-join.py signin nimbus.kallossoft@gmail.com KALLOSsoft_0422 <TOTP_CODE>"'
```
Ask Zsolt for the TOTP code from Google Authenticator.

### Notes
- GUI commands need `sudo launchctl asuser 501` for macOS WindowServer access
- The `join` command stays alive (loop) — run in background with `&`
- Auto-admit (`MEET_AUTO_ADMIT=1`) checks every 5s for waiting guests
- Mic uses BlackHole 16ch (virtual audio for meet-bridge integration)
- Screenshots saved to `/tmp/meet-*.png` for debugging
- Related: `meet-bridge.py` (audio bridge with VAD/STT/TTS), `meet-mode.sh` (audio routing)
