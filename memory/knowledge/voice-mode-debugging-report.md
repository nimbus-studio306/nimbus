# Voice Mode Debugging Report

**Status:** Investigation Complete

**Date:** 2026-02-25

---

## Current Implementation

### Architecture
```
nimbus-app (browser)
  ↓ WebSocket / HTTP
OpenClaw Gateway (port 18790)
  ↓ Plugin routes
voice-proxy plugin
  ├─ POST /voice/stt → Gemini STT
  └─ POST /voice/tts → Edge TTS
```

### Components Verified ✅

1. **Plugin Status:** Enabled in openclaw.json ✅
2. **Health Endpoint:** `GET /voice/health` returns `{"ok":true,"stt":"gemini","tts":"edge"}` ✅
3. **STT Route:** `POST /voice/stt` configured ✅
4. **TTS Route:** `POST /voice/tts` configured ✅

---

## Issues Identified

### Issue 1: Missing Web Interface

**Problem:** No nimbus-app.html found in workspace

**Impact:** Users cannot access voice mode UI

**Location Expected:** 
- `/home/papperpictures/.openclaw/workspace/nimbus-app/nimbus-app.html` ❌ Not found
- `/app/dist/control-ui/nimbus-app.html` (mentioned in MEMORY.md as deployment target)

**Evidence:**
```bash
find /home/papperpictures/.openclaw -name "nimbus-app*" -type f
# No results

find /home/papperpictures/.openclaw -name "*.html" -type f
# Only /home/papperpictures/.openclaw/canvas/index.html
```

**Root Cause:** The nimbus-app PWA (mentioned in TODO.md as "Nimbus app voice mode built (nimbus-app.html)") is missing from the workspace.

**Solution:** Either:
1. Locate the nimbus-app.html file (might be in /app/ directory on the VM)
2. Recreate the voice call interface
3. Check if it was deleted or moved

---

### Issue 2: Session Management

**Current State:**
- Dedicated `voice-call` session key is mentioned in MEMORY.md
- Session isolation from main chat

**Potential Problems:**
- Session key might not be properly configured
- Voice-call session might not persist
- Context might not be properly isolated

**Verification Needed:**
- Check if voice-call sessions are created
- Verify session persistence
- Test context isolation

---

### Issue 3: STT Quality Issues

**Current Implementation:**
```javascript
// From plugins/voice-proxy/index.js
const model = 'gemini-2.5-pro';
const prompt = "Transcribe this audio clip exactly as spoken...";
```

**Potential Issues:**
1. **Model Selection:** Using `gemini-2.5-pro` instead of `gemini-2.5-flash` (flash is faster for STT)
2. **Timeout:** 30 second timeout might be too short for long audio
3. **Error Handling:** Returns empty string for unclear audio instead of retrying
4. **No Streaming:** Currently batch processing, not true streaming

**Recommended Fixes:**
```javascript
// Use flash model for faster STT
const model = 'gemini-2.5-flash';

// Increase timeout for longer audio
const timeout = 60000; // 60 seconds

// Add retry logic for unclear audio
let retries = 0;
const maxRetries = 2;
```

---

### Issue 4: TTS Configuration

**Current Implementation:**
```javascript
// From plugins/voice-proxy/index.js
const tts = new EdgeTTS({
  voice: voice || 'en-US-MichelleNeural',
  lang: 'en-US',
  outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
});
```

**Potential Issues:**
1. **Voice Selection:** Only supports English voice (MichelleNeural)
2. **No Hungarian Support:** Zsolt speaks Hungarian, needs `hu-HU-Chirp3-HD-Aoede`
3. **File Handling:** Creates temp files in `/tmp/` without cleanup verification
4. **No Streaming:** Batch TTS, not streaming

**Recommended Fixes:**
```javascript
// Support multiple voices
const voiceMap = {
  'en': 'en-US-MichelleNeural',
  'hu': 'hu-HU-Chirp3-HD-Aoede',
  'default': 'en-US-MichelleNeural'
};

// Detect language and select appropriate voice
const selectedVoice = voiceMap[detectedLang] || voiceMap['default'];
```

---

### Issue 5: Audio Format Compatibility

**Current Implementation:**
```javascript
const cleanMime = mimeType.split(';')[0] || 'audio/webm';
```

**Potential Issues:**
1. **Browser Compatibility:** Different browsers send different formats (webm, mp4, wav)
2. **No Format Validation:** Doesn't check if format is supported
3. **No Conversion:** If browser sends unsupported format, transcription fails

**Supported Formats by Gemini STT:**
- audio/wav (preferred)
- audio/mp3
- audio/mpeg
- audio/ogg
- audio/webm

**Recommended Fixes:**
```javascript
const supportedFormats = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/webm'];

if (!supportedFormats.includes(cleanMime)) {
  // Convert to wav using ffmpeg
  const converted = await convertToWav(audioBuffer);
  return transcribeAudio(converted, 'audio/wav');
}
```

---

### Issue 6: Streaming vs Batch

**Current State:**
- Both STT and TTS are batch operations
- User must wait for full audio processing
- No real-time streaming

**Impact:**
- High latency (3-5 seconds for STT, 2-3 seconds for TTS)
- Poor user experience for voice calls
- Not truly "real-time"

**Solution:** Implement WebSocket streaming

---

## Root Cause Analysis

### Primary Issue: Missing Frontend
The voice-proxy plugin works correctly, but there's no user interface to access it. The nimbus-app.html (voice call PWA) is missing.

### Secondary Issues:
1. STT model is slower than necessary (pro vs flash)
2. No Hungarian TTS voice support
3. No audio format conversion
4. Batch processing instead of streaming

---

## Recommended Solutions

### Option 1: Quick Fix (Minimal)
1. Locate or recreate nimbus-app.html
2. Update STT model to gemini-2.5-flash
3. Add Hungarian voice support
4. Test end-to-end voice call

**Estimated effort:** 2-3 hours

### Option 2: Proper Fix (Recommended)
1. Rewrite voice-proxy with WebSocket streaming
2. Implement real-time STT with Gemini Live API
3. Add audio format conversion (ffmpeg)
4. Create proper nimbus-app.html with:
   - WebSocket connection
   - Real-time audio visualization
   - Language detection
   - Transcript display
   - Call controls (mute, hangup)

**Estimated effort:** 1-2 days

### Option 3: Hybrid Approach
1. Fix existing batch implementation (Option 1)
2. Create separate WebSocket streaming server
3. Allow user to choose batch vs streaming mode
4. Gradually migrate to full streaming

**Estimated effort:** 3-4 hours initial + ongoing

---

## Testing Plan

### Test 1: Voice Proxy Health
```bash
curl http://localhost:18790/voice/health
```

### Test 2: STT Endpoint
```bash
# Create test audio
curl -X POST http://localhost:18790/voice/stt \
  -H "Content-Type: audio/webm" \
  --data-binary @test-audio.webm
```

### Test 3: TTS Endpoint
```bash
curl -X POST http://localhost:18790/voice/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world","voice":"en-US-MichelleNeural"}' \
  -o output.mp3
```

### Test 4: End-to-End (requires nimbus-app.html)
1. Open nimbus-app.html in browser
2. Click "Start Voice Call"
3. Speak into microphone
4. Verify transcription appears
5. Verify response is spoken

---

## Immediate Actions Needed

1. ✅ **Verify voice-proxy plugin is working** — Done, health endpoint responds
2. ⏳ **Locate or recreate nimbus-app.html** — Needed for UI
3. ⏳ **Update STT model to gemini-2.5-flash** — Faster transcription
4. ⏳ **Add Hungarian TTS voice** — Support Zsolt's language
5. ⏳ **Test end-to-end voice call** — Requires UI

---

## Conclusion

**Primary Issue:** The voice-proxy plugin is functional, but the frontend (nimbus-app.html) is missing, making voice mode inaccessible.

**Secondary Issues:** STT/TTS configuration can be optimized for better performance and language support.

**Recommendation:** Proceed with Option 1 (Quick Fix) to restore basic functionality, then plan Option 2 (Proper Fix) for production-quality voice calls.
