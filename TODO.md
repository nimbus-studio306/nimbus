# TODO.md — Active Task List

## Priority 1: Research (needed for future building)

### 🔍 Browser/Internet Access Solutions
- [x] Research headless browser options → playwright-core available, chromium installed
- [x] Check OpenClaw browser tool → exists, needs chromium running
- [x] Test browser access → WORKING (libxfixes3 installed)
- [x] Document findings → memory/knowledge/research-browser-access.md
- [x] **FIXED**: Persistent Chromium on port 18800, auto-managed by OpenClaw
- [x] Full browser automation works: navigate, screenshot, interact, vision-guided actions

### 🔍 Verify Gemini Web Search
- [x] Test grounding → CONFIRMED real web search (live weather data returned)
- [x] Verified with current Rotterdam weather (4°C, Feb 4 2026 3:26 AM)
- [x] Documented capabilities
- [x] Test reliability — sometimes grounding doesn't trigger (query-dependent) — **DONE**: tested 5/5 buckets with `gemini-2.5-pro` (weather, news, navigation, fact, recent event) and all returned valid citations/grounding. `gemini-1.5-pro` is missing/deprecated in v1beta API.

### 🎙️ Real-Time Voice Solutions
- [x] Research WebRTC + VAD architecture → documented
- [x] Research streaming STT → discovered Gemini 2.0 Live API (bidirectional streaming!)
- [x] Research streaming TTS options → Edge TTS (batch), Google TTS (batch)
- [x] Architecture options documented → memory/knowledge/research-voice-realtime.md
- [x] **DONE**: Gemini Live API works! Text + audio modes confirmed. Native audio model available.
- [x] Research streaming TTS (chunked playback) → implemented in voice-proxy plugin
- [x] Nimbus app voice mode built (nimbus-app.html) — basic prototype exists
- [ ] **IMPROVE**: Voice mode doesn't work properly — needs debugging/rewrite

### 🖥️ Chat Interface Review
- [x] Found nimbus-app/ → single-file PWA (1185 lines)
- [x] Reviewed code → WebSocket chat, voice input via SpeechRecognition, auto-send
- [x] Documented → memory/knowledge/research-chat-interface.md
- [x] Missing: no TTS playback, no WebRTC, Chrome-dependent STT
- [x] Get it served/accessible → deployed at nimbus-cloud.studio306.nl/nimbus-app.html
- [x] Add TTS playback for responses → implemented in voice-proxy plugin

## Priority 2: Mac Mini / Local Setup Planning

### 🖥️ Ideal Package List for Local Machine
- [x] Research: what packages/tools would an AI assistant need locally?
- [x] Audio processing: ffmpeg, sox, audio libraries
- [x] Browser automation: Puppeteer, Playwright + full Chromium
- [x] Python stack: numpy, pandas, scikit-learn, whisper, etc.
- [x] Local STT: Whisper variants → mlx-audio recommended (Whisper Large v3 Turbo)
- [x] Local TTS: options for Apple Silicon → Kokoro (EN) + Chatterbox (HU!)
- [x] Document as "dream setup" spec → memory/knowledge/mac-mini-setup-spec.md (908 lines)

### 🧠 Open-Weight Models + LoRA Research
- [x] Research: Gemma, other small language models → Qwen3 32B best all-around, tiered list in spec
- [x] Research: LoRA fine-tuning on Apple Silicon → MLX LM QLoRA, memory tables documented
- [x] What GPU/memory requirements for training vs inference? → detailed tables in spec
- [x] How would this integrate with OpenClaw? → Ollama auto-discovery, trivial config
- [x] Document findings → included in memory/knowledge/mac-mini-setup-spec.md

### 🧠 LoRA Memory Modules — Deep Dive
- [x] Research: full LoRA adapter lifecycle (data → train → validate → deploy → version)
- [x] What data goes into a memory module? (conversations, domain knowledge, style, preferences)
- [x] Data pipeline: how to select, clean, format training data from OpenClaw sessions
- [x] Can you stack/merge multiple LoRA adapters? Research adapter composition
- [x] Integration: LoRA modules vs OpenClaw's existing memory system (complement or replace?)
- [x] Remote GPU training: how to delegate training to external GPU fleet
- [x] Evaluation: how to measure if an adapter actually improves performance
- [x] Document full pipeline spec → **memory/knowledge/lora-memory-modules.md** (15KB)

### 🖥️ Multi-Instance Deployment (NEW)
- [x] ~~Update Mac Mini spec with correct hardware~~ — fixed M4 Max → M4 Pro, added all tiers (commit 7e02440)
- [x] Hardware tiering: M1 8GB (3 instances) → M4 Pro 64GB (5-8) → M4 Max 128GB via MacBook Pro (10-15) ✅
- [x] Resource management: memory limits, port allocation, tool contention ✅
- [x] Separate API keys per instance (rate limit isolation) ✅
- [x] Docker Compose / PM2 deployment templates ✅
- [x] Tool contention: browser pooling, exec limits, media processing queues ✅
- [x] Hybrid architecture: Mac Mini (always-on) + GPU fleet (burst) + Cloud APIs (quality) ✅
- [x] Reproducible onboarding: scripts for spinning up new assistant instances ✅
- **Documented in:** `memory/knowledge/multi-instance-architecture.md` (commit f2f532c)

## Priority 1.5: Integrations (NEW)

### 📅 Calendar Access
- [x] Set up Google Calendar OAuth2 authentication → `google-calendar-auth.js` (commit 2ed8114)
- [x] Read access to Zsolt's calendars (papperpictures@gmail.com) ✅
- [ ] Add write access (create/update/delete events)
- [ ] Handle multiple Google accounts (need OAuth for additional accounts)
- [ ] Figure out iCloud calendar sync (CalDAV or sync to Google)
- [ ] Ability to schedule meetings and events

### 📧 Multiple Gmail Account Management
- [x] Gmail read access via OAuth2 (papperpictures@gmail.com) → `gmail-search.js` ✅
- [x] Gmail Pub/Sub notifications working (real-time email alerts) ✅
- [ ] OAuth2 setup for additional accounts (~5 Gmail accounts total)
- [ ] Alias system for easy reference (e.g. "personal", "studio", "business")
- [x] Create EMAIL-PROFILES.md document specifying for each account:
  - How to sign/name (which name to use)
  - Signature format
  - Tone and communication style
  - When to use this account
- [ ] Never assume which account - always confirm before sending
- [ ] Discuss with Zsolt to define each account's profile

### 🎙️ Real-Time Audio Transcription
- [ ] Research proper real-time transcription for Zoom calls (not post-recording)
- [ ] Research real-time transcription for WhatsApp calls
- [ ] Need raw digital audio capture, not microphone recording
- [ ] Explore browser audio capture APIs
- [ ] Explore system audio routing solutions (BlackHole on Mac, etc.)
- [ ] Integration with Gemini or other STT for live transcription

## Priority 3: Security & Infrastructure

### 🔐 Credential Security
- [x] Audit current credential storage → memory/knowledge/security-credential-audit.md
- [x] Fixed: removed partial API key prefix from tracked files
- [x] Review and redact gateway token from TOOLS.md → already REDACTED
- [x] Research Supabase Vault integration patterns → memory/knowledge/supabase-vault-integration.md (7.7KB, hybrid approach recommended)
- [x] Add `*.env` `*.key` to .gitignore → already present

## Priority 2.5: Vision & Architecture Documentation

### 📋 Document Future Architecture Vision (2026-02-09)
- [x] Create `docs/VISION-FUTURE-ARCHITECTURE.md` with roadmap from tonight's conversation:
  - LoRA memory modules: self-improving AI with continuous learning
  - Multi-agent architecture: specialized instances (dev, journaling, main)
  - Device control: ATEM, PTZ cameras, VISCA, sliders, gimbals, DMX/lights
  - Video production: AI-directed live editing and switching
  - Performance art: human-AI improvisation with AV control
  - Dev session graphs: specialized extraction for code/development data
  - Local training: M1 Pro → March GPU → self-hosted LoRA pipeline
  - Digital archive: WhatsApp, SMS, emails, ChatGPT/Claude history
- [x] Add per-topic breakdown docs as needed — all in one doc for now
- [ ] Review with Zsolt before implementing

## Priority 3: Ongoing

### 📚 Continue Learning
- [x] Deeper dive into OpenClaw modules → memory/knowledge/openclaw-extension-guide.md (987 lines)
- [x] Explore what I can build → skills, hooks, plugins, providers all documented
- [x] Keep MEMORY.md lean — review and trim

## Completed (Recent)

### ✅ Email → Database Persistence (2026-02-05)
- [x] Created `emails` table with pgvector embedding column
- [x] Updated send-email.js to save sent emails to DB + auto-embed
- [x] Updated check-email.js to fetch full body + save received emails to DB
- [x] Created save-email-to-db.py for shared DB insert logic
- [x] Tested: both sent and received emails saving with embeddings ✅

---
*Updated: 2026-02-24 21:12 UTC*
*Check this every heartbeat. Pick next uncompleted task.*
