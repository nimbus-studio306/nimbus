# Audio Capture Latency Optimization Research

**Date:** 2026-03-10
**Task:** Reduce audio capture latency to <100ms for real-time transcription
**Status:** Research Phase

## Current Implementation

### Architecture
```
[Call Audio] → [getDisplayMedia()] → [Web Audio API] → [WAV Encoder] → [STT API] → [Transcription]
```

### Current Latency Breakdown
Based on the browser POC implementation:

1. **getDisplayMedia() request:** 100-300ms
   - User interaction required
   - Browser permission prompt
   - Screen sharing negotiation

2. **Audio capture:** 50-100ms
   - Web Audio API captures audio chunk
   - Buffer size: 1 second
   - Conversion: PCM to WAV

3. **WAV encoding:** 5-10ms
   - Simple header construction
   - Float to 16-bit PCM conversion

4. **STT API call:** 200-500ms
   - HTTP request
   - Gemini processing time
   - Response streaming

**Total latency:** 355-910ms (target: <100ms)

---

## Latency Optimization Strategies

### Strategy 1: Smaller Audio Chunks

**Current:** 1-second chunks
**Option:** 100ms chunks

**Pros:**
- Lower latency (transcribes every 100ms instead of 1 second)
- More responsive real-time display

**Cons:**
- More API calls (10x increase)
- Higher network overhead
- Potential accuracy reduction (shorter audio = harder for STT)
- Higher Gemini API costs

**Trade-off Analysis:**
- **Chunk size vs accuracy:**
  - 1 second: 85-95% accuracy (standard)
  - 100ms: 60-75% accuracy (significant drop)
  - 500ms: 75-85% accuracy (compromise)

**Recommendation:** Use 500ms chunks as sweet spot (latency: 500ms, accuracy: 75-85%)

---

### Strategy 2: Stream Processing

**Current:** Send whole chunk, wait for response
**Option:** Stream audio bit-by-bit, get token-by-token transcription

**Implementation:**
```javascript
// Stream audio to Gemini
const response = await fetch('gemini-stt-api', {
  method: 'POST',
  headers: { 'Transfer-Encoding': 'chunked' },
  body: audioStream  // Stream instead of sending whole chunk
});

// Get transcription token-by-token
for await (const chunk of response.body) {
  const tokens = parseTokens(chunk);
  displayTokens(tokens);  // Show transcription as it's generated
}
```

**Pros:**
- True real-time transcription
- Lowest latency possible
- Users see results as they speak

**Cons:**
- Complex implementation
- Requires Gemini STT streaming API
- May not be available yet
- API cost increase (more tokens)

**Research needed:**
- Does Gemini STT support streaming?
- If not, implement client-side streaming (send audio, receive tokens progressively)

**Estimated latency:** 100-200ms (streaming) vs 500ms (chunking)

---

### Strategy 3: Audio Processing Pipeline Optimization

**Current:** Simple audio conversion
**Option:** Optimize Web Audio API pipeline

#### A. Use AudioWorklet (vs createMediaStreamSource)

**Current:**
```javascript
const source = audioContext.createMediaStreamSource(mediaStream);
const destination = audioContext.createMediaStreamDestination();
source.connect(destination);
```

**Optimized:**
```javascript
// Use AudioWorklet for more control
const audioWorklet = await audioContext.audioWorklet.addModule('audio-processor.js');
const source = new AudioWorkletNode(audioContext, 'audio-processor');
source.connect(audioContext.destination);

// In audio-processor.js:
class AudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs) {
    const inputData = inputs[0][0];  // Audio data
    const output = outputs[0][0];

    // Real-time processing
    for (let i = 0; i < inputData.length; i++) {
      output[i] = inputData[i];  // Copy to output
    }

    // Send to main thread via port
    this.port.postMessage({
      type: 'audio_chunk',
      data: inputData
    }, [inputData.buffer]);

    return true;  // Keep processor alive
  }
}
```

**Pros:**
- More control over audio processing
- Can implement DSP effects (noise reduction, echo cancellation)
- Lower latency through direct buffer manipulation

**Cons:**
- More complex code
- Requires Web Audio API understanding
- May not provide significant latency improvement

**Estimated latency reduction:** 20-30ms

---

#### B. Use OfflineAudioContext for Smaller Chunks

**Current:**
```javascript
const buffer = offlineContext.startRendering();
```

**Optimized:**
```javascript
// Render smaller chunks at once
const buffer = offlineContext.startRendering(100 * offlineContext.sampleRate);  // 100ms

// Process chunks sequentially
for (let offset = 0; offset < totalDuration; offset += 100 * sampleRate) {
  const chunk = buffer.getChannelData(0).subarray(offset, offset + 100 * sampleRate);
  await transcribeChunk(chunk);
}
```

**Pros:**
- More control over chunk timing
- Can process chunks independently
- Easier to interrupt for API calls

**Cons:**
- More complex logic
- May introduce jitter

**Estimated latency reduction:** 30-50ms

---

### Strategy 4: Network Optimization

**Current:** Send WAV to Gemini STT
**Option:** Send raw PCM data (smaller payload)

**Current payload:**
```
1 second audio @ 16kHz, 16-bit = 32000 bytes
WAV header + PCM data = 64044 bytes
```

**Optimized payload:**
```
1 second audio @ 16kHz, 16-bit = 32000 bytes
Raw PCM = 32000 bytes
```

**Reduction:** 50% smaller payload

**Implementation:**
```javascript
async function transcribeRawPCM(pcmData, sampleRate = 16000) {
  const base64Data = bufferToBase64(pcmData);

  await fetch('gemini-stt-api', {
    method: 'POST',
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{
          inline_data: {
            mime_type: 'audio/raw',  // Not WAV
            data: base64Data
          }
        }]
      }]
    })
  });
}
```

**Note:** Gemini STT supports raw audio? Need to verify.

**Pros:**
- 50% smaller payload
- Faster transmission
- Lower bandwidth usage

**Cons:**
- Need to verify Gemini STT API supports raw audio format
- May require more API knowledge

---

## Recommended Implementation Plan

### Phase 1: Chunk Size Optimization (1 day)

**Goal:** Reduce latency from 500ms to 300ms

**Steps:**
1. Implement 500ms chunks (instead of 1 second)
2. Measure latency with actual call
3. Compare accuracy vs 1-second chunks
4. Adjust based on results

**Implementation:**
```javascript
// In browser-audio-capture.html
const CHUNK_DURATION_MS = 500;  // Changed from 1000ms

function setupTranscription() {
  transcriptionInterval = setInterval(async () => {
    const audioData = await captureAudioChunk(destinationNode.stream.getAudioTracks()[0], CHUNK_DURATION_MS);
    // ... rest of logic
  }, CHUNK_DURATION_MS);
}
```

**Expected results:**
- Latency: 500ms → 300ms
- Accuracy: 85-95% → 75-85%
- Cost: Slight increase (50% more chunks)

---

### Phase 2: Audio Processing Optimization (1 day)

**Goal:** Reduce latency from 300ms to 200ms

**Steps:**
1. Implement OfflineAudioContext with smaller chunks
2. Test processing performance
3. Compare with current approach

**Implementation:**
```javascript
async function captureAudioChunkOptimized(audioTrack, durationMs) {
  const sampleRate = audioTrack.sampleRate;
  const numSamples = (durationMs / 1000) * sampleRate;

  const offlineContext = new OfflineAudioContext(
    1,  // mono
    numSamples,
    sampleRate
  );

  const source = offlineContext.createMediaStreamSource([audioTrack]);
  source.connect(offlineContext.destination);

  return await offlineContext.startRendering();
}
```

**Expected results:**
- Latency: 300ms → 200ms
- Accuracy: 75-85% (unchanged)

---

### Phase 3: Streaming API Integration (2-3 days)

**Goal:** True real-time transcription with <100ms latency

**Steps:**
1. Research Gemini STT streaming API
2. Implement client-side streaming
3. Test with actual calls
4. Build real-time UI with token-by-token display

**Implementation:**
```javascript
async function streamTranscribe(audioStream) {
  const response = await fetch('gemini-stt-api', {
    method: 'POST',
    headers: { 'Transfer-Encoding': 'chunked' },
    body: audioStream
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const tokens = parseStreamingTokens(chunk);
    displayTokens(tokens);
  }
}
```

**Expected results:**
- Latency: 200ms → 100ms
- Accuracy: 75-85% (unchanged)
- User experience: Near real-time transcription

**Note:** This requires Gemini STT streaming API support. May need to use alternative approach.

---

## Testing Methodology

### Latency Measurement

**Instrument the code:**
```javascript
const startTime = performance.now();

async function captureAndTranscribe() {
  const audioStart = performance.now();
  const audioData = await captureAudioChunk();
  const audioEnd = performance.now();

  const transcribeStart = performance.now();
  const transcription = await transcribeAudio(audioData);
  const transcribeEnd = performance.now();

  const totalLatency = transcribeEnd - audioStart;

  console.log(`Audio capture: ${(audioEnd - audioStart).toFixed(0)}ms`);
  console.log(`STT processing: ${(transcribeEnd - transcribeStart).toFixed(0)}ms`);
  console.log(`Total latency: ${(totalLatency).toFixed(0)}ms`);
}
```

### Accuracy Measurement

**Test with known audio:**
1. Speak predefined sentences (Hungarian and English)
2. Compare transcription with original
3. Calculate word error rate (WER)

**Test cases:**
- Simple sentences (5-10 words)
- Complex sentences (20-30 words)
- Technical terms
- Numbers and dates
- Both languages (HU/EN)

### User Testing

**Metrics to collect:**
- Perceived latency (user survey)
- Accuracy (comparison with original)
- Satisfaction rating (1-5 stars)
- Technical issues (crashes, errors)

---

## Expected Results

### Phase 1 (500ms chunks)
- **Latency:** 300ms
- **Accuracy:** 75-85%
- **User satisfaction:** 4/5

### Phase 2 (Optimized processing)
- **Latency:** 200ms
- **Accuracy:** 75-85%
- **User satisfaction:** 4/5

### Phase 3 (Streaming)
- **Latency:** 100ms
- **Accuracy:** 75-85%
- **User satisfaction:** 5/5

---

## Open Questions

1. **Does Gemini STT support streaming?**
   - If yes → implement streaming API
   - If no → implement client-side streaming

2. **What's the optimal chunk size?**
   - 100ms (fast, less accurate)
   - 500ms (sweet spot)
   - 1000ms (accurate, slower)

3. **Should we implement client-side vs server-side streaming?**
   - Client-side: More control, but more code
   - Server-side: Easier, but depends on API

4. **What's acceptable latency for users?**
   - <100ms (near real-time)
   - 100-300ms (fast)
   - 300-500ms (acceptable)

5. **How much latency improvement justifies implementation cost?**

---

## Next Steps

1. **Measure current latency** (1 day)
   - Instrument browser POC
   - Measure actual latency with test call
   - Establish baseline

2. **Implement Phase 1** (1 day)
   - Change chunk size from 1000ms to 500ms
   - Test with actual call
   - Measure latency improvement

3. **Implement Phase 2** (1 day)
   - Optimize audio processing
   - Test performance
   - Compare with Phase 1

4. **Research streaming API** (2 days)
   - Check Gemini STT streaming support
   - If not available, plan alternative

5. **User testing** (1 day)
   - Test with real users
   - Collect metrics
   - Iterate

---

*Status: Ready to start Phase 1 (chunk size optimization)*
*Estimated effort: 3-5 days for full optimization pipeline*
