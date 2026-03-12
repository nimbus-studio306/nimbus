# WhatsApp Call Transcription Testing Plan

**Date:** 2026-03-12
**Status:** Research Complete
**Next Steps:** Test WhatsApp Web call transcription

---

## Current State

**What We Have:**
1. **Browser audio capture script:** `browser-audio-capture.js`
2. **HTML test file:** `browser-audio-capture.html`
3. **WAV conversion logic** implemented
4. **STT integration structure** documented
5. **Latency optimization strategies** in `memory/knowledge/optimize-audio-latency.md`

**What's Missing:**
1. Real WhatsApp Web call to test
2. Phase 1 latency optimization (500ms chunks)
3. Real-time transcription UI with live display

---

## Test Environment Setup

### Prerequisites
1. WhatsApp Web browser tab open with Zsolt logged in
2. Browser with microphone access allowed
3. Chrome/Chromium with getUserMedia() support

### Setup Steps

**Step 1: Open WhatsApp Web**
```bash
# Use Chromium (already running on port 18800)
chromium --remote-debugging-port=18800 --user-data-dir=/tmp/chrome-debug https://web.whatsapp.com
```

**Step 2: Start Voice Call**
- Initiate a WhatsApp voice call to a contact
- Answer on the other side
- Wait for call to establish

**Step 3: Prepare Audio Capture Script**

Open test.html in Chromium:
```bash
chromium --remote-debugging-port=18800 --user-data-dir=/tmp/chrome-debug browser-audio-capture.html
```

Or use browser tool:
```bash
# Navigate to test file
# (use browser tool to open file://path/to/browser-audio-capture.html)
```

**Step 4: Capture Audio**
1. Click "Start Capture" in browser test UI
2. Browser captures system audio from WhatsApp Web call
3. Script converts to WAV format
4. Script prepares STT (placeholder implementation)

**Step 5: Test STT Integration**

Create test STT script:
```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.env.GOOGLE_API_KEY;

async function transcribeAudio(wavFilePath) {
  const genAI = new GoogleGenerativeAI(API_KEY);

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const file = await genAI.getGenerativeModel({
    model: 'gemini-2.5-flash'
  });

  // Actually, for audio transcription we need different API...
  // This is placeholder - actual implementation uses Google Cloud Speech-to-Text
}
```

---

## Testing Methodology

### Phase 1: Basic Functionality Test

**Goal:** Verify audio capture works with actual WhatsApp Web call

**Test Case:**
1. Initiate voice call to contact A
2. Capture audio with browser-audio-capture.js
3. Verify WAV file is created correctly
4. Check audio quality (no distortion, clear speech)

**Success Criteria:**
- WAV file created with valid header
- Audio levels are reasonable (not silent, not distorted)
- Duration matches call duration
- No console errors

**Expected Output:**
```
[INFO] Starting audio capture
[INFO] Capturing system audio from tab 123
[INFO] Audio chunks: 245 (avg 500ms per chunk)
[INFO] WAV file created: /tmp/whatsapp-call-20260312-230000.wav
[INFO] Duration: 3m 27s
[INFO] Sample rate: 44100 Hz
[INFO] Audio quality: Good (RMS: 0.45)
```

---

### Phase 2: STT Integration Test

**Goal:** Verify STT can transcribe captured audio

**Test Case:**
1. Capture audio from WhatsApp call
2. Send WAV file to STT service (Google Cloud Speech-to-Text)
3. Verify transcription accuracy

**Success Criteria:**
- STT returns transcription
- Transcription is accurate (90%+ accuracy)
- No STT API errors
- Processing time reasonable (< 5s for 3-minute call)

**Expected Output:**
```
[INFO] Sending audio to STT service
[INFO] Audio file: /tmp/whatsapp-call-20260312-230000.wav (3m 27s)
[INFO] STT processing...
[INFO] Transcription: "Hi Zsolt, how are you doing today? I wanted to talk about the project..."
[INFO] Transcription accuracy: 92%
[INFO] Processing time: 4.2s
```

**STT Service Options:**
1. **Google Cloud Speech-to-Text** (primary)
   - API: `google-cloud-speech`
   - Model: `latest-long`
   - Language: `hu-HU` (Hungarian), `en-US` (English)

2. **Gemini 2.5 Flash** (alternative)
   - API: `google-genai`
   - Model: `gemini-2.5-flash`
   - Not primary for audio (Gemini is for text-to-text)

**Recommendation:** Use Google Cloud Speech-to-Text for actual call transcription

---

### Phase 3: Latency Optimization Test (Phase 1: 500ms chunks)

**Goal:** Verify 500ms chunk size reduces latency

**Test Case:**
1. Capture audio in 500ms chunks (Phase 1 optimization)
2. Real-time STT processing
3. Measure and compare latency

**Success Criteria:**
- Latency < 1 second for most speech
- No significant quality degradation
- Real-time display works

**Expected Output:**
```
[INFO] Phase 1 Latency Optimization: 500ms chunks
[INFO] Audio chunk size: 500ms
[INFO] Expected latency: 500ms
[INFO] Actual average latency: 580ms (12% overhead)
[INFO] Real-time transcription working
```

**Latency Breakdown:**
- Capture time: 500ms
- Processing time: 300-500ms (depends on STT API)
- Display time: 100ms
- Total: ~1 second

**Reference:** Current system has 355ms latency (before optimization)

---

## Implementation Steps

### Step 1: Create STT Integration Script

**File:** `lib/stt-google-cloud.js`

```javascript
const speech = require('@google-cloud/speech');

async function transcribeWav(wavFilePath, language = 'en-US') {
  const client = new speech.SpeechClient({
    keyFilename: '/home/papperpictures/.openclaw/credentials/google-cloud-speech-key.json'
  });

  const audio = {
    encoding: 'LINEAR16',
    sampleRateHertz: 44100,
    languageCode: language,
    enableAutomaticPunctuation: true,
    model: 'latest_long'
  };

  const [response] = await client.recognize({
    audio: { uri: `gs://your-bucket/${wavFilePath}` },
    config: audio
  });

  return response.results
    .map(result => result.alternatives[0].transcript)
    .join(' ');
}

module.exports = { transcribeWav };
```

**Note:** For real-time STT, need streaming recognition API instead.

---

### Step 2: Update Audio Capture Script for Phase 1

**File:** `browser-audio-capture.js`

Add streaming STT integration:

```javascript
const stt = require('./lib/stt-google-cloud-streaming.js');

async function processChunks(chunks) {
  for (const chunk of chunks) {
    // Convert chunk to WAV (existing logic)
    const wavChunk = await convertToWav(chunk);

    // Send to STT (streaming)
    const transcript = await stt.recognizeStream([wavChunk]);

    // Display real-time
    displayTranscript(transcript);
  }
}
```

---

### Step 3: Build Real-Time Transcription UI

**File:** `browser-audio-capture.html` (existing) + enhancements

Add live display:

```html
<div id="transcription-display">
  <div id="live-transcript"></div>
  <div id="transcription-status">Ready to capture...</div>
</div>
```

JavaScript:
```javascript
function displayTranscript(transcript) {
  const liveDiv = document.getElementById('live-transcript');
  liveDiv.textContent = transcript;

  // Auto-scroll
  liveDiv.scrollTop = liveDiv.scrollHeight;

  // Status update
  const statusDiv = document.getElementById('transcription-status');
  statusDiv.textContent = `Transcribed: "${transcript.substring(0, 50)}..."`;
}
```

---

### Step 4: Test with Actual WhatsApp Web Call

**Prerequisites:**
1. Zsolt has WhatsApp Web open
2. Test contact available for call
3. Microphone working
4. Browser permissions granted

**Test Procedure:**
1. Open `browser-audio-capture.html` in Chromium
2. Click "Start Capture"
3. Initiate WhatsApp voice call
4. Answer on other side
5. Speak (separate audio channels on both sides)
6. Click "Stop Capture"
7. Verify transcription output

**Test Scenarios:**
- **Scenario 1:** English conversation
  - Call contact who speaks English
  - Verify STT captures English correctly
  - Expected language: `en-US`

- **Scenario 2:** Hungarian conversation
  - Call contact who speaks Hungarian
  - Verify STT captures Hungarian correctly
  - Expected language: `hu-HU`

- **Scenario 3:** Mixed language conversation
  - Speak in English, then Hungarian
  - Verify STT handles both correctly (or requires language switch)

---

## Success Metrics

### Phase 1 Test Success Criteria:
- [ ] Audio capture works with actual WhatsApp Web call
- [ ] WAV file created successfully
- [ ] Audio quality is acceptable (no distortion)
- [ ] STT integration works (transcription returns)
- [ ] Transcription accuracy > 90%
- [ ] Processing time < 5s for 3-minute call
- [ ] No console errors or crashes

### Phase 2 Latency Optimization Success Criteria:
- [ ] 500ms chunk size implemented
- [ ] Latency < 1 second (target: 580ms)
- [ ] Real-time display works
- [ ] No quality degradation
- [ ] Processing time acceptable (< 500ms per chunk)

---

## Open Questions for Zsolt

1. **Test Contact:**
   - Who should we call for testing? (business contact vs friend)
   - Should we use English or Hungarian?
   - Should we use mixed languages?

2. **Test Scenarios:**
   - How long should the test call be? (30s, 1m, 3m, 5m?)
   - Should we test:
     - Short conversations (30s)
     - Longer discussions (3-5m)
     - Fast speech vs slow speech
     - Multiple speakers (concurrent calls?)

3. **STT Service:**
   - Should we use Google Cloud Speech-to-Text or Gemini?
   - Hungarian language support verified?
   - Real-time streaming vs batch processing?

4. **Display Requirements:**
   - Should transcription appear in browser UI?
   - Should it save to file?
   - Should it be sent to Zsolt via TTS?
   - Should it be sent to OpenClaw chat?

5. **Next Steps:**
   - After testing, implement Phase 2 (200ms chunks)?
   - Build full UI with transcript history?
   - Add save/export functionality?

---

## Testing Script Template

**File:** `test-whatsapp-transcription.sh`

```bash
#!/bin/bash

# WhatsApp Call Transcription Test
# Usage: test-whatsapp-transcription.sh <language> <duration_seconds>

LANG=${1:-en-US}
DURATION=${2:-60}

echo "=== WhatsApp Call Transcription Test ==="
echo "Language: $LANG"
echo "Duration: ${DURATION}s"
echo "Start time: $(date '+%Y-%m-%d %H:%M:%S')"

# Start audio capture in background
echo "Starting audio capture..."
node browser-audio-capture.js --chunk-size 500 --language $LANG &
CAPTURE_PID=$!

# Wait for capture to start
sleep 2

# Start call (this would need manual initiation)
echo "Please initiate WhatsApp call now..."

# Wait for call duration
echo "Recording for ${DURATION} seconds..."
sleep $DURATION

# Stop capture
echo "Stopping capture..."
kill $CAPTURE_PID
wait $CAPTURE_PID 2>/dev/null

echo "End time: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Capture complete. Check /tmp/whatsapp-call-*.wav"
echo "Run: python3 test-transcription.py /tmp/whatsapp-call-*.wav"
```

---

## Decision Matrix

| Implementation | Effort | Benefit | Risk | Recommended |
|----------------|--------|---------|------|-------------|
| Basic STT integration | 1 hour | High | Low | ✅ YES |
| Phase 1 latency optimization | 2 hours | High | Medium | ✅ YES (after basic test) |
| Real-time UI | 2 hours | High | Low | ✅ YES (after optimization) |

**Total Implementation Time:** ~5 hours

---

## Next Steps

1. **Get Zsolt's approval** on testing approach
2. **Answer open questions** (test contact, scenarios, STT service, display)
3. **Implement basic STT integration**
4. **Test with actual WhatsApp Web call**
5. **Implement Phase 1 latency optimization**
6. **Build real-time transcription UI**
