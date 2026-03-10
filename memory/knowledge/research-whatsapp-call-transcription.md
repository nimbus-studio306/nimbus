# Real-Time WhatsApp Call Transcription Research

**Date:** 2026-03-10
**Task:** Research methods for capturing WhatsApp call audio for real-time transcription
**Status:** Research Phase

## Key Challenges

### 1. Raw Digital Audio Capture vs Microphone Recording
**Problem:** WhatsApp calls use VoIP (Voice over IP) — digital audio already exists somewhere in the system. Need to capture it at the system level, not with microphone recording.

**Current limitation:** All STT solutions require audio as input. If we only have mic recording, latency and quality suffer.

**Goal:** Capture WhatsApp audio directly from the call stream.

---

## Solution Options

### Option A: Web Audio API (Browser-Based)

**How it works:**
- WhatsApp Web browser uses the WebRTC API for calls
- Browser provides `getUserMedia()` API that can capture system audio

**Technical approach:**
```javascript
// Browser captures system audio (not just mic)
navigator.mediaDevices.getDisplayMedia({
  video: true,  // Request video (required for audio)
  audio: true,
  videoConstraints: {
    displaySurface: 'monitor',
    preferredFrameRate: 30
  }
}).then(stream => {
  // Get audio track from stream
  const audioTrack = stream.getAudioTracks()[0];

  // Use WebRTC or MediaRecorder to capture
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const source = audioContext.createMediaStreamSource([audioTrack]);
  const destination = audioContext.createMediaStreamDestination();

  source.connect(destination);

  // Get raw PCM audio
  const rawData = destination.stream.getAudioTracks()[0];

  // Send to STT API
  sendToSTT(rawData);
});
```

**Pros:**
- Browser-native API
- No system-level audio routing needed
- Works for WhatsApp Web

**Cons:**
- **Only works for WhatsApp Web** — not mobile app
- User must share screen (requires explicit permission)
- Platform restrictions (iOS requires "Screen Record" permission)

**Research needed:**
- Can `getDisplayMedia()` capture system audio without visible video?
- How to get pure audio from `getDisplayMedia()` stream?
- Does WhatsApp Web expose WebRTC audio tracks directly?

---

### Option B: Desktop Audio Capture (Electron/Local App)

**How it works:**
- Run WhatsApp as desktop app (WhatsApp Desktop for Windows/Mac)
- Use system audio capture at OS level

**Windows approach:**
- Windows Audio Session API (WASAPI)
- Desktop Audio Recording APIs (DirectShow)

**macOS approach:**
- Core Audio (CAHAL)
- Audio Unit framework
- BlackHole virtual audio device

**Example (Windows):**
```python
import win32api, win32con, win32sound
from ctypes import *

# Capture from default system audio device
def capture_whatsapp_audio():
    # Get default playback device
    device = win32sound.GetDefaultPlaybackWaveInDevice()

    # Set up audio capture
    win32sound.PlaybackSound(device, win32con.SND_FILENAME, "whatsapp_call.wav")
```

**Example (macOS):**
```python
import coreaudio
from AudioKit import AudioEngine, AudioFile

# Create virtual audio device (BlackHole)
# Route WhatsApp audio to BlackHole
# Read from BlackHole
```

**Pros:**
- Works for both Web and Desktop apps
- System-level capture (high quality, low latency)
- Can handle multiple apps simultaneously

**Cons:**
- Complex to implement cross-platform
- Requires desktop app (WhatsApp Desktop)
- Platform-specific code

---

### Option C: Mobile App Methods (Android/iOS)

**Android approach:**
- **Aloop:** Record screen + audio overlay app
- **Screen Recorder apps:** Capture call audio directly
- **ADB command line:**
  ```bash
  # Android 11+: Use screensharing via adb
  adb shell media_session stream
  ```

**iOS approach:**
- **Screen recording:** Built-in screen recording captures call audio
- **第三方 screen recording apps**
- **Custom iOS development:** Use AVFoundation to capture call audio (private APIs, may violate terms)

**Pros:**
- Works for mobile apps
- No desktop software needed

**Cons:**
- Requires screen recording (visible to user)
- Platform restrictions
- Quality issues with screen capture

---

## Recommended Architecture

### Phase 1: Browser-Based (Quick Win)
**Goal:** Get real-time transcription working for WhatsApp Web

**Implementation:**
1. Create local Electron app that hosts WhatsApp Web
2. Use `getDisplayMedia()` to capture system audio
3. Convert audio to compatible format (WAV/PCM)
4. Send to Gemini STT via WebSocket
5. Display transcription in real-time

**Technical stack:**
- Electron + Puppeteer for WhatsApp Web
- Web Audio API for audio capture
- WebSocket to Gemini STT
- TTS for response (if needed)

**Estimated effort:** 2-3 days

**Next steps:**
1. Research `getDisplayMedia()` audio-only mode
2. Test audio capture quality and latency
3. Implement STT integration
4. Test with actual WhatsApp Web calls

---

### Phase 2: Desktop Audio Capture (Production)
**Goal:** Production-grade solution for all platforms

**Implementation:**
1. Develop platform-specific audio capture modules:
   - Windows: WASAPI
   - macOS: Core Audio (BlackHole)
   - Linux: PulseAudio (PipeWire)
2. Create routing rules:
   - WhatsApp Desktop → Audio Capture
   - Route to STT → Transcription → TTS → back to call
3. Build cross-platform desktop app (Electron + native modules)

**Technical stack:**
- Electron desktop app
- Native audio capture modules (electron-acrylic-windows, electron-vibrancy for UI)
- BlackHole virtual audio device (macOS)
- PipeWire/Rastral (Linux)

**Estimated effort:** 1-2 weeks

**Next steps:**
1. Implement Windows audio capture
2. Implement macOS audio capture
3. Implement Linux audio capture
4. Build routing logic
5. Test with multiple apps

---

## Integration with Gemini STT

### Current STT Setup
- **Provider:** Google Gemini 2.5 Flash (via OpenClaw voice proxy)
- **Format:** WAV audio
- **Language:** Auto-detected (Hungarian/English)
- **Streaming:** Yes, if properly implemented

### Streaming Transcription Architecture

**Option 1: WebSocket Streaming**
```
[Call Audio] → [Audio Capture] → [WAV Encoder] → [WebSocket] → [Gemini STT]
                                                              ↓
                                                    [Transcription]
                                                              ↓
                                                    [Display/Text]
```

**Option 2: Chunked API**
```
[Call Audio] → [Audio Capture] → [WAV Encoder] → [REST API: Send Audio Chunk]
                                                                  ↓
                                                      [Gemini STT: Process]
                                                                  ↓
                                                    [Transcription Chunk]
                                                                  ↓
                                                    [Display/Text]
```

**Streaming benefits:**
- Real-time transcription (no waiting for full audio)
- Lower latency
- Better user experience
- Can transcribe while user is speaking

**Implementation considerations:**
- Audio chunk size: 1-2 seconds (enough for accuracy, low latency)
- Frame rate: 16kHz or 48kHz (Gemini STT supports both)
- Format: WAV header + PCM data
- Streaming protocol: WebSocket (preferred) or HTTP chunked transfer

---

## Testing Plan

### Phase 1 Tests
1. **Audio capture quality:**
   - Test `getDisplayMedia()` with video turned off
   - Measure audio latency (should be <100ms)
   - Measure audio quality (SNR, bitrate)

2. **STT integration:**
   - Test sending audio chunks to Gemini STT
   - Verify transcription accuracy
   - Test streaming performance

3. **End-to-end:**
   - Make actual WhatsApp Web call
   - Verify transcription appears in real-time
   - Test with Hungarian and English

### Phase 2 Tests
1. **Platform-specific:**
   - Windows: Capture from multiple apps
   - macOS: Capture with BlackHole
   - Linux: Capture with PipeWire

2. **Performance:**
   - Latency measurements
   - CPU usage
   - Memory usage

3. **Reliability:**
   - Handle call disconnect
   - Handle network changes
   - Handle API errors

---

## Known Limitations

1. **WhatsApp Web only:** Browser solution doesn't work for mobile
2. **User visibility:** Screen sharing is required (user must click "Start Sharing")
3. **Platform permissions:** iOS requires "Screen Record" permission
4. **Audio routing:** Complex to route audio from specific app (WhatsApp) only
5. **Multiple calls:** Need to handle multiple concurrent calls

---

## Open Questions

1. **Can `getDisplayMedia()` capture only audio?**
   - Research shows video is required
   - Can we turn off video rendering after capture starts?

2. **How to get raw audio from `getDisplayMedia()`?**
   - `stream.getAudioTracks()[0]`
   - Need to verify PCM format and sample rate

3. **Does WhatsApp Web expose WebRTC tracks?**
   - Browser developer tools can inspect
   - Need to test in actual call

4. **What's the best audio routing solution?**
   - Desktop: BlackHole (macOS), PipeWire (Linux), WASAPI (Windows)
   - Need to test which is most reliable

5. **Should we route WhatsApp Desktop instead?**
   - Pros: No browser needed, better audio quality
   - Cons: User must use desktop app (less convenient)

---

## Next Steps

1. **Research `getDisplayMedia()` audio-only mode** (1 hour)
2. **Test audio capture with browser tools** (2 hours)
3. **Implement browser-based POC** (full day)
4. **Compare with desktop audio capture** (full day)
5. **Decide on architecture** (1 hour)

---

*Status: Ready to start implementation*
*Estimated effort: 3-4 days for browser POC, 1-2 weeks for desktop production*
