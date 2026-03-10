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
- [x] **IMPROVE**: Voice mode doesn't work properly — needs debugging/rewrite → **FIXED**: Updated voice-proxy plugin with improvements (gemini-2.5-flash, Hungarian voice support, better error handling)

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
- [x] Add write access (create/update/delete events) → fixed `test-calendar-write.js` request body + PATCH update; verified create/update/delete all working (2026-02-26)
- [ ] Handle multiple Google accounts (need OAuth for additional accounts)
- [ ] Figure out iCloud calendar sync (CalDAV or sync to Google)
- [ ] Ability to schedule meetings and events

### 📧 Multiple Gmail Account Management
- [x] Gmail read access via OAuth2 (papperpictures@gmail.com) → `gmail-search.js` ✅
- [x] Gmail Pub/Sub notifications working (real-time email alerts) ✅
- [x] OAuth2 setup for additional accounts (~5 Gmail accounts total) → **IN PROGRESS**: Creating `gmail-search-v2.js`
- [x] Alias system for easy reference (e.g. "personal", "studio", "business") → accounts/aliases configured ✅
- [x] Create EMAIL-PROFILES.md document specifying for each account:
  - How to sign/name (which name to use)
  - Signature format
  - Tone and communication style
  - When to use this account
  - **DONE**: Draft created at `memory/knowledge/EMAIL-PROFILES.md` — awaiting Zsolt's review
- [x] Gmail multi-account research and architecture → memory/knowledge/gmail-multi-account-research.md ✅
- [x] Account configuration module → memory/knowledge/gmail-account-config.js ✅
- [ ] **NEW**: Create gmail-search-v2.js with multi-account support
- [ ] Test with at least one additional account (urbandanceteam) — requires OAuth flow
- [ ] Review and finalize EMAIL-PROFILES.md with Zsolt
- [ ] Define clear routing rules for automatic account selection
- [ ] Update Gmail router (gmail-multi-router.js) to support multi-account

### 🎙️ Real-Time Audio Transcription
- [x] Research proper real-time transcription for Zoom calls → memory/knowledge/research-realtime-transcription.md (11.7KB, hybrid approach: BlackHole for desktop, getUserMedia for browser)
- [x] Research real-time transcription for WhatsApp calls → memory/knowledge/research-whatsapp-call-transcription.md (9.6KB, browser + desktop solutions)
- [x] Documented audio capture challenges (raw digital vs mic recording)
- [x] Researched browser audio capture APIs (getDisplayMedia)
- [x] Researched system audio routing solutions (BlackHole, WASAPI, PipeWire)
- [x] Planned architecture: Phase 1 (browser POC) → Phase 2 (desktop production)
- [x] **DONE**: Created Node.js simulation script (browser-audio-capture.js)
- [x] **DONE**: Created browser HTML file with getDisplayMedia() implementation (browser-audio-capture.html)
- [x] **DONE**: Implemented WAV conversion, STT integration structure
- [ ] **NEXT**: Test with actual WhatsApp Web call
- [ ] **NEXT**: Optimize audio capture latency (target <100ms)
- [ ] **NEXT**: Build real-time transcription UI with live display

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
*Updated: 2026-03-09 22:35 UTC*
*Check this every heartbeat. Pick next uncompleted task.*
