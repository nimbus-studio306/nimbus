# Chat Interface Review (nimbus-app/)
> Created: 2026-02-04 02:30 UTC
> Source: Direct code review of nimbus-app/index.html (1185 lines)

## What It Is
- Single-file PWA (`index.html` + manifest + service worker + icon)
- Dark theme, mobile-optimized, iOS safe area support
- Connects to OpenClaw gateway via WebSocket
- Auto-detects gateway URL from current host

## Features Found
- ✅ WebSocket chat with gateway (full protocol implementation)
- ✅ Voice input via browser SpeechRecognition API
- ✅ Auto-send on speech end (no manual send button needed for voice)
- ✅ Interim transcription (shows text as you speak)
- ✅ Markdown rendering in messages
- ✅ Dark theme with nice UI
- ✅ Connection status indicator
- ✅ Config screen (gateway URL, token, session key)
- ✅ PWA installable (manifest.json, service worker)

## What's Missing / Not Implemented
- ❌ No TTS (response playback) — only text display
- ❌ No WebRTC — uses basic SpeechRecognition API
- ❌ No audio message support (can't send/receive voice notes)
- ❌ No streaming TTS (can't hear responses)
- ❌ Browser SpeechRecognition is Chrome-dependent, limited on iOS Safari

## Voice Input Details
```
Browser SpeechRecognition → interim text → auto-send on speech end
```
- Uses `window.SpeechRecognition || window.webkitSpeechRecognition`
- `continuous: false` — stops after one utterance
- `interimResults: true` — shows text while speaking
- Auto-sends when speech recognition ends
- Hides mic button if SpeechRecognition not available

## Gateway Connection
- Default URL: auto from `location.host` (ws:// or wss://)
- Sends `connect` message with token + sessionKey
- Handles: `connected`, `message`, `error`, `turn-start`, `turn-end`
- Session key default: `main`

## How to Access
- File location: `/home/node/.openclaw/workspace/nimbus-app/`
- Was deployed to: needs to be served via gateway or separate server
- Original port discussion: 8080 was tried but conflicts with signal-cli

## Improvement Path
1. **Add TTS playback** — when response arrives, convert to speech and play
2. **Add continuous voice mode** — keep listening after response plays
3. **Add VAD** — better silence detection than browser default
4. **Eventually**: Replace browser STT with Gemini Live API for quality + consistency
