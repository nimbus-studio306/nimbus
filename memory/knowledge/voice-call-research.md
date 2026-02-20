# Voice Call / Real-Time Voice Conversation Research

**Date:** 2026-02-04
**Goal:** Determine what's needed to add live voice conversation (phone call style) to the OpenClaw web UI at nimbus.studio306.nl

---

## 1. Existing Talk Mode Infrastructure

### What exists (native apps only — macOS/iOS/Android)
OpenClaw already has a **Talk Mode** — a continuous voice conversation loop implemented in the **native apps** (macOS SwiftUI, iOS, Android):

1. **Listen** for speech (on-device speech recognition)
2. **Send** transcript to model via `chat.send` (main session)
3. **Wait** for response
4. **Speak** response via ElevenLabs streaming TTS
5. Repeat

This runs entirely on the native client side. The gateway only sees text messages via `chat.send` — it has no awareness that voice is involved.

### Gateway-side talk support (minimal)
- **`talk.mode`** server method (`/app/src/gateway/server-methods/talk.ts`): A simple broadcast handler that relays `{enabled, phase, ts}` payloads to all connected clients. Used by native apps to sync talk mode state across devices.
- **Critical limitation**: `talk.mode` is **gated to require a connected iOS/Android node** — if called from a webchat client with no mobile node connected, it returns `"talk disabled: no connected iOS/Android nodes"`.
- **`talk.mode` is NOT audio processing** — it's just a state broadcast (listening/thinking/speaking phase).

### Talk config in `openclaw.json`
```json
{
  "talk": {
    "apiKey": "AIzaSyCwUajS44srcW8eu_ciPBK8HX32WsCH0PE",
    "interruptOnSpeech": true
  }
}
```

**Important discovery:** The `talk.apiKey` field is documented as being for **ElevenLabs** (the TTS provider for Talk mode). However, the actual key stored (`AIzaSy...`) is a **Google API key** — NOT an ElevenLabs key. This is likely a misconfiguration, or the user intended this key for something else (perhaps Google Speech-to-Text or Gemini).

The config schema (`/app/src/config/zod-schema.ts`) defines talk config as:
```typescript
talk: z.object({
  voiceId: z.string().optional(),        // ElevenLabs voice ID
  voiceAliases: z.record().optional(),   // Voice name -> ID map
  modelId: z.string().optional(),        // ElevenLabs model ID
  outputFormat: z.string().optional(),   // e.g. mp3_44100_128
  apiKey: z.string().optional(),         // Falls back to ELEVENLABS_API_KEY
  interruptOnSpeech: z.boolean().optional(), // Stop playback when user speaks
}).optional()
```

The `resolveTalkApiKey()` function (`/app/src/config/talk.ts`) specifically looks for `ELEVENLABS_API_KEY` in env/profile — confirming this is meant for ElevenLabs, not Google.

### `interruptOnSpeech: true`
This flag tells the native Talk mode client to **stop TTS playback when the user starts speaking** — enabling natural conversation interruption. Only relevant on native apps where the client controls audio playback.

---

## 2. Web UI (Control UI) — Current State

### Architecture
- **Framework:** Vite + Lit (web components)
- **Source:** `/app/ui/src/`
- **Communication:** Gateway WebSocket protocol (JSON-RPC style)
- **Key files:**
  - `/app/ui/src/ui/gateway.ts` — WebSocket client (`GatewayBrowserClient`)
  - `/app/ui/src/ui/controllers/chat.ts` — Chat state management
  - `/app/ui/src/ui/views/chat.ts` — Chat view (Lit templates)

### What the web UI can do today
- Text chat via `chat.send` / `chat.history` / `chat.abort`
- Image attachments (base64 upload)
- Streaming responses (delta events)
- Session management
- Config editing (including a "Talk" section with mic icon in config form)
- Full admin: channels, nodes, cron, skills, exec approvals, logs

### Voice/audio in web UI: **NOTHING**
- **Zero audio components** in the web UI source code
- No `getUserMedia`, `MediaRecorder`, `AudioContext`, `WebRTC`, or `AudioWorklet` references
- No microphone button or voice UI
- The "Talk" section in config form only lets you edit the talk config JSON — it doesn't provide a talk UI
- No audio playback components for TTS responses

---

## 3. TTS Infrastructure (Outbound Audio)

OpenClaw has robust TTS:
- **Providers:** ElevenLabs, OpenAI, Edge TTS (free, no API key)
- **Gateway RPC:** `tts.convert` — converts text to audio file, returns path
- **Auto-TTS:** Can auto-convert replies to audio (`messages.tts.auto: "always"`)
- **Edge TTS** is currently available (no API key needed)

The `tts.convert` gateway method works and could be used from the web UI to get audio for assistant responses.

---

## 4. Audio Transcription Infrastructure (Inbound Audio)

OpenClaw can transcribe audio:
- **Providers:** OpenAI (gpt-4o-mini-transcribe), Deepgram (nova-3), Google, local Whisper
- **Auto-detection:** If audio understanding is enabled, incoming audio is auto-transcribed
- **But:** This is designed for **file-based** voice notes (WhatsApp/Telegram), not real-time streaming

---

## 5. Voice Call Plugin (Phone Calls — Different Feature)

There's a separate **Voice Call plugin** for actual phone calls via Twilio/Telnyx/Plivo:
- Outbound/inbound PSTN phone calls
- Uses webhooks + media streams
- NOT installed or configured on this gateway
- This is a completely different feature from what we want

---

## 6. What's Needed for Web UI Voice Conversation

### Architecture Options

#### Option A: Browser-Side Voice Loop (Recommended — Simplest)
Mirror what the native apps do, but in the browser:

1. **Microphone capture** → Browser `getUserMedia()` + `MediaRecorder`
2. **Speech-to-text** → Send audio to gateway for transcription, OR use browser's Web Speech API (`SpeechRecognition`)
3. **Send transcript** → Existing `chat.send` (already works)
4. **Get response** → Existing chat event stream (already works)
5. **Text-to-speech** → Use `tts.convert` gateway RPC to get audio, then play via `<audio>` element, OR use browser's `SpeechSynthesis` API

**Pros:** Works with existing gateway infrastructure, no new server-side code needed.
**Cons:** Higher latency (record → upload → transcribe → LLM → TTS → download → play). Each step is sequential.

#### Option B: Google Gemini Multimodal Live API (Lowest Latency)
Use Google's real-time bidirectional audio API directly from the browser:

- WebSocket to `wss://generativelanguage.googleapis.com/...`
- Streams raw PCM audio both directions
- Model processes audio natively (no separate STT/TTS steps)
- The `talk.apiKey` (Google API key) would be used here
- Sub-second latency possible

**Pros:** Lowest latency, most natural conversation feel.
**Cons:** Bypasses the OpenClaw agent entirely (goes direct to Gemini), loses all tools/context/personality. Would need significant custom integration. The Google key in config might have been placed there with this intent.

#### Option C: OpenAI Realtime API
Similar to Option B but with OpenAI's realtime API:
- WebSocket-based
- Bidirectional audio
- No existing infrastructure in OpenClaw for this

**Cons:** Same bypass problem as Option B, plus requires OpenAI realtime API access.

### Recommended Implementation: Option A (Browser Voice Loop)

This is the most practical approach because it:
- Uses existing OpenClaw infrastructure (chat.send, tts.convert, audio transcription)
- Preserves all agent capabilities (tools, personality, context, memory)
- Can be built as a UI-only addition (no server changes needed)

### Components to Build

#### 1. Microphone Capture Component
```
New file: /app/ui/src/ui/components/voice-button.ts (Lit component)
- Mic button (toggle on/off)
- getUserMedia() for microphone access
- MediaRecorder for audio capture
- Visual feedback (recording indicator, audio level)
- Silence detection to auto-stop recording
```

#### 2. Audio Transcription (STT)
Two sub-options:
- **Browser Web Speech API** (`SpeechRecognition`): Free, works in Chrome/Edge, gives real-time partial transcripts. No server needed.
- **Server-side via gateway**: Record audio blob → send as attachment to `chat.send` (the existing audio understanding pipeline will transcribe it). More accurate but higher latency.

#### 3. Audio Playback for Responses
```
- Call tts.convert with assistant response text
- Receive audio file path
- Fetch audio file via gateway HTTP
- Play via Audio API or <audio> element
- Support interrupt (stop playback when user starts speaking)
```

#### 4. Voice Mode Toggle
```
- "Talk" mode button in chat UI (alongside Send/New Session)
- When active: show mic visualization, auto-listen after response plays
- Phase indicators: Listening → Thinking → Speaking
- Interrupt support: click or speak to stop current TTS playback
```

#### 5. Chat Controller Updates
```
Modify: /app/ui/src/ui/controllers/chat.ts
- Add voice mode state
- Add audio recording/playback management
- Handle the listen→send→wait→speak→listen loop
```

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `/app/ui/src/ui/components/voice-button.ts` | CREATE | Mic button + recording component |
| `/app/ui/src/ui/components/audio-player.ts` | CREATE | TTS audio playback component |
| `/app/ui/src/ui/components/voice-visualizer.ts` | CREATE | Audio level visualization |
| `/app/ui/src/ui/controllers/voice.ts` | CREATE | Voice mode state machine |
| `/app/ui/src/ui/controllers/chat.ts` | MODIFY | Integrate voice mode |
| `/app/ui/src/ui/views/chat.ts` | MODIFY | Add voice UI to chat view |
| `/app/ui/src/ui/app.ts` | MODIFY | Wire up voice controller |

### Browser Compatibility Considerations
- `getUserMedia` — All modern browsers ✅
- `MediaRecorder` — All modern browsers ✅
- `SpeechRecognition` — Chrome/Edge only ⚠️ (Firefox/Safari lack support)
- `AudioContext` — All modern browsers ✅
- **HTTPS required** for microphone access — ✅ (nimbus.studio306.nl is behind Cloudflare)

### Talk Config Clarification
The current `talk.apiKey` with a Google API key (`AIzaSy...`) is **not used by existing Talk mode** (which expects ElevenLabs). To use it for voice:
- It could power **Google Cloud Speech-to-Text** for transcription
- It could power **Google Gemini** for a direct voice API (Option B)
- It should NOT be in the `talk.apiKey` field if you want ElevenLabs TTS (put an ElevenLabs key there instead)

---

## 7. Summary

| Component | Exists? | Where? |
|-----------|---------|--------|
| Talk mode concept | ✅ | Native apps (macOS/iOS/Android) |
| `talk.mode` gateway RPC | ✅ | Server-side broadcast only |
| TTS (text→audio) | ✅ | `tts.convert` gateway RPC |
| Audio transcription | ✅ | Media understanding pipeline |
| Chat via WebSocket | ✅ | `chat.send` / events |
| Web UI voice components | ❌ | Nothing exists |
| Microphone capture in web UI | ❌ | Must build |
| Audio playback in web UI | ❌ | Must build |
| Voice mode loop in web UI | ❌ | Must build |
| Real-time streaming audio | ❌ | Not in OpenClaw at all |

### Bottom Line
**The server-side infrastructure largely exists** (chat, TTS, transcription). What's missing is entirely **UI-side**: we need to build the browser components for microphone capture, audio playback, and a voice conversation loop. No server-side changes are strictly required for a basic implementation — it's a UI feature that orchestrates existing gateway capabilities.

The fastest path to a working prototype is: **Web Speech API for STT** (free, instant, Chrome-only) + **`tts.convert` for TTS** + **a voice mode toggle in the chat UI**.
