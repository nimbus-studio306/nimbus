# Real-Time Voice Interface Research
> Created: 2026-02-04 02:30 UTC
> Status: In progress

## The Goal
Zsolt wants to talk naturally — not press record, send, wait. Near-real-time voice conversation.

## Key Discovery: Gemini 2.0 Live API
- **Bidirectional streaming** — send/receive audio in real-time over WebSocket
- Audio format: raw PCM 16-bit, 16kHz input, 24kHz output
- **Barge-in support** — user can interrupt mid-response
- Natural-sounding speech in 24 languages
- This is EXACTLY what we need for the voice layer
- Could use Gemini Live directly for conversation, OR just for STT/TTS and pipe to Claude

## Architecture Options

### Option A: WebSocket + VAD + Chunked Audio (RECOMMENDED START)
```
Browser (PWA)
  → MediaRecorder captures audio
  → Client-side VAD detects speech end
  → WebSocket sends audio chunk to server
  → Server → Gemini STT (or Live API)
  → Text → Claude API
  → Response → Edge TTS / Google TTS
  → Audio → WebSocket back to browser
  → Browser plays audio
```
**Pros**: Simpler, uses APIs we already have, works on CPU
**Cons**: Not truly real-time, noticeable latency per turn
**Estimated latency**: 2-5 seconds per turn

### Option B: Gemini Live API as Voice Layer
```
Browser (PWA)
  → WebSocket to our server
  → Server proxies to Gemini Live API
  → Gemini handles STT + response (or we intercept text for Claude)
  → Audio streams back continuously
```
**Pros**: Lowest latency, true real-time, barge-in support
**Cons**: Gemini generates responses (not Claude), or need complex proxy
**Note**: Could use Gemini Live for STT only, pipe text to Claude, then TTS back

### Option C: Deepgram/AssemblyAI Streaming STT
- Purpose-built streaming STT services
- Better accuracy than general APIs
- Adds cost ($0.0043/min Deepgram, similar AssemblyAI)
- Consider if Gemini STT quality is insufficient

### Option D: OpenAI Realtime API Style
- Not directly available for Claude
- But the pattern (WebSocket + streaming) is replicable

## What We Have
| Component | Current | Notes |
|-----------|---------|-------|
| STT | Gemini API (batch) | Works, but batch not streaming |
| TTS English | Edge TTS (free) | Good quality, but batch |
| TTS Hungarian | Google Cloud TTS | Good, batch |
| AI | Claude (Anthropic) | No streaming audio, text only |
| Frontend | nimbus-app/ (exists?) | Needs review |
| Server | Node.js on GCP VM | CPU only, 2 vCPU |
| Alt Server | VPS Budapest | 8GB RAM, 4 vCPU |

## Recommended Path
1. **Start simple**: WebSocket + client-side VAD + batch STT/TTS (Option A)
   - Get the basic flow working first
   - User speaks → audio sent on silence → transcribed → Claude → TTS → played
2. **Then optimize**: Replace batch STT with Gemini Live API streaming
3. **Then optimize more**: Stream TTS playback (start playing before full response)
4. **Eventually**: Full duplex with barge-in support

## Near-Term: "Good Enough" Voice
Even without true real-time, we can improve the current experience:
- Auto-send voice on silence detection (no manual send button)
- Auto-play response audio (no manual play)
- Visual indicator showing processing state
- This alone would make voice interaction much smoother

## Infrastructure Considerations
- GCP VM (CPU only): Fine for proxying, not for running local STT/TTS models
- VPS Budapest: More power, could run lightweight models if needed
- All heavy lifting should use cloud APIs (Gemini, Google TTS, Edge TTS)
- WebSocket server is lightweight — either machine works

## Verified (2026-02-04 02:35 UTC)

### Gemini Live API — WORKS ✅
- Tested with our API key — WebSocket connection successful
- Text mode: `gemini-2.0-flash-exp-image-generation` — works, streaming text
- Audio mode: `gemini-2.5-flash-native-audio-latest` — works, returns PCM audio
- Audio format: 16-bit PCM, 24kHz, mono (as documented)
- Got 0.76s audio for "say hello" — fast response
- Voice: "Aoede" available (same voice we use for Hungarian TTS!)
- Available bidi models:
  - `gemini-2.0-flash-exp-image-generation` (text + bidi)
  - `gemini-2.5-flash-native-audio-latest` (native audio)
  - `gemini-2.5-flash-native-audio-preview-09-2025`
  - `gemini-2.5-flash-native-audio-preview-12-2025`
- `ws` module available via `/app/node_modules`
- `ffmpeg` available via playwright install (for audio conversion)
- Python `wave` module works for PCM → WAV conversion

### This Changes the Architecture
With Gemini Live API confirmed working, **Option B becomes viable**:
- Use Gemini as the voice layer (STT + natural speech output)
- Intercept the text to pipe through Claude if needed
- Or use Gemini directly for quick voice interactions
- Reserve Claude for complex reasoning tasks

## Edge TTS Internals (from source study)
- Uses `node-edge-tts` module (Microsoft Edge's online TTS service)
- Default voice: `en-US-MichelleNeural`
- Default format: `audio-24khz-48kbitrate-mono-mp3`
- **Internally streams via WebSocket** — writes audio chunks to file stream
- Could intercept chunks for real-time forwarding to client
- OpenClaw's TTS pipeline: text → Edge TTS → mp3 file → send to channel
- For streaming: would need to bypass file write, forward chunks directly

## Complete Voice Pipeline (Theoretically Possible Now)
```
Browser mic → WebSocket → Gemini Live API (STT)
  → transcript text → Claude API (reasoning)
  → response text → Edge TTS (streaming chunks)
  → audio chunks → WebSocket → browser speaker
```
All components verified available. Main work = glue code + frontend.

## Remaining Questions
- [ ] What's the latency end-to-end? (need to measure with real conversation)
- [ ] Can we stream audio input (mic → Gemini) in real time?
- [ ] Can we interrupt (barge-in) mid-response?
- [ ] Cost per minute of Live API usage?
- [ ] Can we use Gemini Live for BOTH STT and TTS (skip Edge TTS)?
