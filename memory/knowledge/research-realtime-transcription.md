# Real-Time Audio Transcription Research

**Purpose:** Live transcription for Zoom calls and WhatsApp calls

**Status:** Research Phase

---

## Requirements

**What we need:**
- Raw digital audio capture (NOT microphone recording)
- Real-time streaming transcription (not post-recording)
- Support for multiple platforms: Zoom, WhatsApp calls
- Low latency (sub-1 second ideally)

**Technical constraints:**
- GCP VM has no local STT/TTS
- Must use Gemini API (Google Cloud project 378128822690)
- Need audio capture API (browser/system audio)

---

## Options Evaluated

### 1. Browser Audio Capture API

**How it works:**
```javascript
navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    sampleRate: 44100
  }
}).then(stream => {
  const audioContext = new AudioContext({ sampleRate: 44100 });
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  source.connect(processor);
  processor.onaudioprocess = (e) => {
    const inputData = e.inputBuffer.getChannelData(0);
    // Send to Gemini STT API
  };
});
```

**Pros:**
- ✅ Browser-native
- ✅ Works with any web app (Zoom in browser, WhatsApp Web)
- ✅ Real-time audio capture
- ✅ No system audio routing needed

**Cons:**
- ❌ Only works in browser (Zoom in browser, not desktop app)
- ❌ Privacy concerns (browser captures all audio)
- ❌ Requires permission from user

**Suitability:** ⚠️ Good for web apps, bad for desktop Zoom

---

### 2. System Audio Capture (BlackHole on macOS)

**How it works:**
```
Desktop App → BlackHole (virtual audio device) → OpenClaw VM → STT
```

**Implementation:**
- macOS: Use BlackHole 16ch virtual audio driver
- Route system audio to BlackHole
- Monitor BlackHole in VM via SSH + audio capture

**Pros:**
- ✅ Works with desktop apps (Zoom desktop app, WhatsApp desktop)
- ✅ Captures all system audio
- ✅ True real-time transcription

**Cons:**
- ❌ Requires macOS system (BlackHole only on macOS)
- ❌ Privacy concerns (captures everything on system)
- ❌ Requires BlackHole driver installation
- ❌ Complex audio routing

**Suitability:** ✅ Best for desktop apps (Zoom, WhatsApp)

---

### 3. Screen Share + Speech Recognition

**How it works:**
- User shares audio as screen share in app
- OpenClaw captures screen share audio
- Transcribes using Gemini STT API

**Pros:**
- ✅ Works with all apps (desktop and web)
- ✅ Simple implementation
- ✅ Uses browser's speech recognition

**Cons:**
- ❌ Not true real-time (screen share delay)
- ❌ User must enable screen share
- ❌ Privacy concerns (screen capture everything)
- ❌ Lower quality audio (screen share compression)

**Suitability:** ⚠️ Quick solution, but not ideal

---

### 4. Zoom Plugin / API Integration

**How it works:**
- Use Zoom Meeting SDK or Webhook API
- Receive meeting audio data
- Process via OpenClaw

**Pros:**
- ✅ Official Zoom integration
- ✅ No system audio capture needed
- ✅ High quality audio

**Cons:**
- ❌ Requires Zoom Developer account
- ❌ Paid SDK (per minute billing)
- ❌ Only works with Zoom
- ❌ Complex implementation

**Suitability:** ✅ Professional solution, but expensive

---

### 5. WhatsApp Web API + Audio Capture

**How it works:**
- Use WhatsApp Business API
- Handle voice call media
- Stream audio to STT

**Pros:**
- ✅ Official WhatsApp integration
- ✅ No system audio needed

**Cons:**
- ❌ Only works with WhatsApp Business
- ❌ Only voice messages, not live calls
- ❌ Not real-time call transcription
- ❌ Requires business verification

**Suitability:** ❌ Wrong solution (we need live calls, not voice messages)

---

## Recommended Solution: Hybrid Approach

### Primary: System Audio Capture (BlackHole on macOS)

**Architecture:**
```
Zsolt's Mac (studiokallos)
├─ Zoom desktop app
├─ WhatsApp desktop app
└─ System audio → BlackHole (virtual device)

BlackHole (virtual audio)
└─ Virtual cable → OpenClaw VM (SSH tunnel)

OpenClaw VM
└─ Monitor BlackHole audio
   → Gemini STT API (streaming)
   → Transcribe in real-time
```

**Implementation Steps:**

1. **Install BlackHole on macOS:**
   ```bash
   brew install blackhole-2ch
   # Or download from blackhole.audio
   ```

2. **Configure audio routing:**
   - System Settings → Sound → Output → BlackHole 2ch
   - System Settings → Sound → Input → BlackHole 2ch (if needed)
   - OpenClaw app (or separate script) monitors BlackHole

3. **OpenClaw VM:**
   - Use `npm` package `node-wav` to read audio from BlackHole
   - Stream audio chunks to Gemini STT API
   - Transcribe in real-time
   - Display transcript in nimbus-app

**Command to monitor BlackHole:**
```bash
# SSH to Mac
ssh studiokallos 'afplay /System/Library/Sounds/Ping.aiff'

# Monitor audio file (if BlackHole writes to file)
ffmpeg -f avfoundation -i :1 -ac 1 -ar 16000 -f wav /tmp/blackhole-audio.wav
```

---

### Secondary: Browser Audio Capture API

**Architecture:**
```
Browser (Chrome/Firefox)
├─ Zoom Web
├─ WhatsApp Web
└─ Browser captures audio via getUserMedia

Browser → WebSocket → OpenClaw VM → Gemini STT
```

**Implementation Steps:**

1. **Create WebSocket server in OpenClaw:**
   ```javascript
   // Server accepts audio chunks
   app.ws('/audio-stream', (ws) => {
     ws.on('message', (data) => {
       // Send to Gemini STT API
     });
   });
   ```

2. **Client-side script (browser):**
   ```javascript
   navigator.mediaDevices.getUserMedia({ audio: true })
     .then(stream => {
       const audioContext = new AudioContext();
       const source = audioContext.createMediaStreamSource(stream);
       const processor = audioContext.createScriptProcessor(4096, 1, 1);
       source.connect(processor);
       processor.onaudioprocess = (e) => {
         const audioChunk = e.inputBuffer.getChannelData(0);
         // Send via WebSocket
         ws.send(audioChunk);
       };
     });
   ```

3. **Gemini STT Integration:**
   ```javascript
   // Use Gemini Live API for streaming STT
   const client = new GoogleGenerativeAI(GEMINI_API_KEY);
   const model = client.getGenerativeModel({
     model: "gemini-2.5-flash"
   });

   const result = await model.generateContentStream({
     contents: [{ role: "user", parts: [{ inline_data: audio }] }],
     config: { responseMimeType: "audio/mpeg" }
   });
   ```

---

## Gemini STT Integration

**Option A: Gemini Live API (Recommended)**

```javascript
// Streaming STT with Gemini 2.5 Flash
const client = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });

async function transcribeAudioStream(audioStream) {
  const result = await model.generateContentStream({
    contents: [{ role: "user", parts: [{ inline_data: audio }] }],
    config: { responseMimeType: "audio/mpeg" }
  });

  for await (const chunk of result.stream) {
    const transcript = chunk.text();
    console.log('Transcript:', transcript);
  }
}
```

**Option B: Request to Assistant API with Audio Input**

```javascript
// Gemini 2.5 Pro
const client = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = client.getGenerativeModel({ model: "gemini-2.5-pro" });

const response = await model.startChat({
  generationConfig: { responseModalities: ["audio", "text"] }
});

const result = await response.sendMessage({
  contents: [{ parts: [{ inline_data: audio }] }]
});

const transcript = result.response.text();
```

**Option C: Streaming REST API**

```javascript
// Direct REST API call
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${GEMINI_API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ inline_data: { mime_type: 'audio/wav', data: audioBase64 } }] }],
      config: { responseMimeType: "text/plain" }
    })
  }
);

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  console.log('Chunk:', chunk);
}
```

---

## Implementation Priorities

### Phase 1: Proof of Concept (Desktop Audio)
1. Install BlackHole on Mac
2. Monitor BlackHole audio via SSH
3. Transcribe 30 seconds of audio
4. Display transcript in nimbus-app

**Estimated effort:** 2-3 hours

### Phase 2: Browser Audio Capture
1. Create WebSocket server in OpenClaw
2. Build browser client script
3. Integrate Gemini STT
4. Test with Zoom Web

**Estimated effort:** 3-4 hours

### Phase 3: Production Integration
1. Real-time streaming transcription
2. Transcript display in nimbus-app
3. Audio control (mute, volume)
4. Speaker separation (if possible)

**Estimated effort:** 5-6 hours

---

## Technical Challenges

### Challenge 1: Audio Format
**Issue:** Gemini STT expects specific audio format (16kHz WAV, mono)

**Solution:**
```javascript
// Convert raw audio data to WAV format
function convertToWav(audioBuffer) {
  const wavBuffer = Buffer.alloc(audioBuffer.length + 44);
  const data = wavBuffer;

  // WAV header (RIFF, fmt, data)
  data.write('RIFF', 0);
  data.writeUInt32LE(audioBuffer.length + 36, 4);
  data.write('WAVE', 8);
  data.write('fmt ', 12);
  data.writeUInt32LE(16, 16);  // PCM format
  data.writeUInt16LE(1, 20);   // Mono
  data.writeUInt16LE(16000, 22);  // 16kHz
  data.writeUInt32LE(32000, 24);  // 16-bit, 2 bytes per sample
  data.writeUInt16LE(16000, 28);  // align
  data.writeUInt16LE(16, 30);
  data.write('data', 36);
  data.writeUInt32LE(audioBuffer.length, 40);

  // Audio data
  audioBuffer.copy(wavBuffer, 44);

  return wavBuffer;
}
```

### Challenge 2: Audio Latency
**Issue:** System audio capture adds delay (~100-300ms)

**Solution:**
- Use 16kHz sample rate (lower bandwidth, acceptable for speech)
- Buffer 10-20ms of audio (balance latency vs accuracy)
- Send audio chunks every 20ms

### Challenge 3: Privacy Concerns
**Issue:** Capturing system audio means capturing everything (music, system sounds, etc.)

**Solution:**
- Only enable transcription when explicitly started
- Add mute/unmute button
- Use audio filtering (threshold-based) to ignore silence
- Display "transcribing" indicator

---

## Testing Plan

### Test 1: BlackHole Monitoring
```bash
# Install BlackHole on Mac
brew install blackhole-2ch

# Configure Mac to output audio to BlackHole
# System Settings → Sound → Output → BlackHole 2ch

# Monitor from VM
ssh studiokallos 'sudo fdiutil enableLegacyAudio 1'
ssh studiokallos 'ffmpeg -f avfoundation -i :1 -ac 1 -ar 16000 -f wav -'
```

### Test 2: Gemini STT Integration
```bash
# Test with 30-second WAV file
node scripts/stt/test-transcribe.js /tmp/test-audio.wav
```

### Test 3: Real-Time Stream
```bash
# Stream audio every 20ms
node scripts/stt/stream-audio.js /tmp/blackhole-audio.wav
```

---

## Resources

**Documentation:**
- [Gemini STT API](https://ai.google.dev/docs/stt)
- [BlackHole Audio](https://blackhole.audio/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

**Scripts to create:**
- `/scripts/stt/transcribe-file.js` - Transcribe WAV file
- `/scripts/stt/stream-audio.js` - Real-time streaming
- `/scripts/stt/monitor-blackhole.js` - Monitor BlackHole audio
- `/plugins/stt-proxy/` - WebSocket server for browser audio

---

## Conclusion

**Best approach:** Hybrid
- **Desktop apps:** BlackHole + system audio (most reliable)
- **Browser apps:** getUserMedia + WebSocket (no extra setup)

**Next steps:**
1. Install BlackHole on Mac
2. Test audio monitoring
3. Integrate Gemini STT with WAV format
4. Build WebSocket server for real-time streaming

**Estimated completion:** 1-2 days for full implementation
