# WhatsApp Call Transcription - Phase 1: 500ms Chunks

## Overview

Phase 1 implements real-time audio transcription with **500ms chunk size** as the baseline architecture.

**Status:** ✅ Implementation complete, awaiting testing

## What's Been Built

### 1. Main Transcription Script (`stt-whatsapp.js`)

**Purpose:** Real-time STT with 500ms chunks

**Key Features:**
- ✅ Browser audio capture via `getDisplayMedia()`
- ✅ Audio context → ScriptProcessor → Int16 PCM conversion
- ✅ Chunk-based STT with 500ms duration
- ✅ Silence detection (250ms minimum, 750ms maximum)
- ✅ Google Cloud Speech-to-Text API integration
- ✅ Interim and final results display
- ✅ Manual start/stop with SPACE key
- ✅ WAV encoding with proper headers
- ✅ Base64 encoding for API requests

**Usage:**
```bash
cd /home/papperpictures/.openclaw/workspace
node scripts/audio/stt-whatsapp.js --config=scripts/audio/whatsapp-stt-config.json
```

**Requirements:**
- Node.js 14+
- Google Cloud Speech-to-Text API key (`GOOGLE_CLOUD_API_KEY`)
- Browser with WebRTC support (chromium/firefox/edge)

---

### 2. Configuration File (`whatsapp-stt-config.json`)

**Purpose:** STT and audio chunk settings

**Key Settings:**
```json
{
  "stt": {
    "languageCode": "en-US",
    "sampleRateHertz": 16000,
    "encoding": "LINEAR16",
    "interimResults": true,
    "enableAutomaticPunctuation": true
  },
  "audio": {
    "chunkDurationMs": 500,    // Phase 1 baseline
    "minSilenceMs": 250,
    "maxSilenceMs": 750
  }
}
```

---

### 3. Audio Capture Test HTML (`whatsapp-audio-capture-test.html`)

**Purpose:** Visual test of browser audio capture

**Key Features:**
- ✅ Button to start capture
- ✅ Real-time chunk counting
- ✅ Duration tracking
- ✅ Log of captured chunks
- ✅ Visual status indicators
- ✅ Keyboard controls (SPACE to pause)
- ✅ WAV encoding verification

**Usage:**
1. Open file in browser: `open scripts/audio/whatsapp-audio-capture-test.html`
2. Click "▶️ Start Capture"
3. In browser dialog, select "Share Audio" for WhatsApp Web tab
4. Press SPACE to pause, STOP to end

---

## Architecture

### Phase 1 Flow (500ms Baseline)

```
┌─────────────────┐
│  Browser getUser │
│     Media()      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Audio Context  │
│   ScriptProcessor│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Chunk Capture  │
│  (500ms buffer) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Silence Detect │
│ (250-750ms)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  WAV Encoding   │
│  + Base64       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  STT API Call   │
│  (Google Cloud) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Display Result │
│  (interim + final)│
└─────────────────┘
```

---

## Implementation Details

### Audio Processing

1. **Capture:** `navigator.mediaDevices.getDisplayMedia({ audio: true })`
   - User selects browser tab with WhatsApp call audio
   - Requires "Share Audio" permission

2. **Processing:** `AudioContext.createScriptProcessor(bufferSize, 1, 1)`
   - bufferSize = 16000 samples × 0.5s = 8000 samples
   - Input: Float32 PCM (AudioContext standard)
   - Output: Int16 PCM (STT API standard)

3. **Conversion:** `Int16Array.from(Float32Array)`
   - Scale: [-1, 1] → [-32767, 32767]
   - Clamp: prevent overflow/underflow

### STT Integration

1. **Chunk Timing:**
   - Baseline: 500ms chunks
   - Min silence: 250ms (early detection)
   - Max silence: 750ms (avoid dead air)

2. **API Request:**
   - Endpoint: `https://speech.googleapis.com/v1p1beta1/speech:recognize`
   - Format: JSON with Base64-encoded WAV
   - Config: 16kHz, LINEAR16, interim results enabled

3. **Response Parsing:**
   - `results[0].alternatives[0].transcript` (interim)
   - `results[0].isFinal` (final confirmation)
   - Word time offsets (future: for timestamp display)

---

## Testing Plan

### Step 1: Browser Audio Capture Test

**Goal:** Verify audio capture works before STT integration

```bash
# Open test file in browser
open scripts/audio/whatsapp-audio-capture-test.html
```

**Verification:**
- [ ] Can click "Start Capture"
- [ ] Browser dialog appears with "Share Audio" option
- [ ] After selecting WhatsApp Web tab, audio capture starts
- [ ] Chunk counter increases over time
- [ ] Duration timer works
- [ ] Log shows chunk transmissions
- [ ] Can press SPACE to pause, STOP to end

**Success Criteria:**
- ✅ At least 10 chunks captured
- ✅ No errors in log
- ✅ Duration matches actual recording time

---

### Step 2: STT Integration Test

**Goal:** Verify STT API works with captured audio

```bash
cd /home/papperpictures/.openclaw/workspace
node scripts/audio/stt-whatsapp.js --config=scripts/audio/whatsapp-stt-config.json
```

**Verification:**
- [ ] Browser dialog appears
- [ ] Can select WhatsApp Web tab with audio
- [ ] Press SPACE to start transcription
- [ ] Interim results appear in real-time
- [ ] Final results appear after speaking
- [ ] Automatic punctuation works
- [ ] Can stop with Ctrl+C

**Success Criteria:**
- ✅ At least 5 transcription results
- ✅ Interim and final results both display
- ✅ API errors are handled gracefully
- ✅ Transcript makes sense (not garbage)

---

### Step 3: Live WhatsApp Call Test

**Goal:** Test with actual WhatsApp call

**Preparation:**
1. Make a test call to yourself (or another number)
2. Ensure audio is routed to browser tab
3. Launch STT script in terminal
4. Start transcription

**Verification:**
- [ ] Can capture WhatsApp call audio
- [ ] Transcription is accurate
- [ ] Latency is acceptable (< 2 seconds)
- [ ] Handles interruptions and pauses
- [ ] No dropouts or errors

---

## Known Limitations

1. **Browser Dependency:** Requires browser with WebRTC support
2. **Audio Quality:** Depends on system audio routing (Windows/Linux sound routing)
3. **Single Stream:** Can only capture one audio source at a time
4. **No Editing:** Can't edit or review past chunks
5. **No Export:** No transcript export to file yet

---

## Next Steps (Phase 2: 200ms Chunks)

**After Phase 1 testing succeeds:**

1. Implement **200ms chunk size** (50% latency reduction)
2. Add **adaptive chunking** (200ms for speech, 500ms for silence)
3. Improve **silence detection** (200ms, 600ms thresholds)
4. Add **progressive transcription** (better real-time feel)
5. **Testing:** Compare Phase 1 vs Phase 2 latency

**Expected Results:**
- Latency: 500ms → 200ms
- Accuracy: Improves with more context
- UX: Better real-time feel

---

## References

- **Research:** `memory/knowledge/optimize-audio-latency.md`
- **Testing Plan:** `memory/knowledge/whatsapp-call-transcription-test.md`
- **Architecture:** Phase 1 → Phase 2 → Phase 3 (100ms)

---

## Notes

- Phase 1 is the **baseline** architecture
- Latency reduction comes from smaller chunks, better silence detection, and streaming
- Testing is required before moving to Phase 2
- Always test in a test call first before using for actual conversations
