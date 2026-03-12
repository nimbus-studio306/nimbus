# Audio Latency Optimization - Phase 1 Implementation

**Date:** 2026-03-12
**Task:** Implement Phase 1 latency optimization (500ms chunks → ~300ms latency)
**Status:** Implementation Phase

## Current State

### Existing Implementation
- ✅ Browser audio capture using getDisplayMedia()
- ✅ 500ms transcription interval (already optimized)
- ✅ Real-time transcription UI with live display
- ✅ WAV conversion and Gemini STT integration
- ⚠️ Could optimize audio processing pipeline

### Latency Breakdown (Current)
1. **Audio capture:** 50-100ms
2. **WAV encoding:** 5-10ms
3. **STT API call:** 200-500ms
4. **Total latency:** 255-610ms (target: <300ms)

## Phase 1 Optimizations

### 1. Audio Processing Pipeline Optimization

**Goal:** Reduce audio capture overhead from 50-100ms to ~30ms

**Current approach:**
```javascript
// Each 500ms interval:
offlineContext.startRendering() → wait for render → get audio data
```

**Optimized approach:**
```javascript
// Use Web Audio API ScriptProcessor (deprecated but efficient for chunking)
// Or use AudioWorklet for better performance (requires separate file)
```

**Implementation:**
1. Create dedicated AudioWorklet processor for efficient chunking
2. Use ring buffer for continuous audio capture
3. Reduce OfflineAudioContext overhead

### 2. Chunk Size Calibration

**Target:** 500ms chunks = ~300ms effective latency

**Chunk size breakdown:**
- Audio capture: ~30ms
- WAV encoding: ~5ms
- API overhead: ~15ms
- Processing delay: ~250ms
- **Total: ~300ms**

**Why 500ms?**
- **Accuracy:** 75-85% (sweet spot)
- **Latency:** ~300ms (acceptable for real-time)
- **API costs:** Moderate (10 chunks per second vs 20 for 250ms)

### 3. Network Optimization

**Goal:** Reduce STT API overhead from 200-500ms to ~150ms

**Strategies:**
1. Use streaming API when available (Gemini Live)
2. Enable response caching for repeated queries
3. Batch multiple small chunks into single API call when possible
4. Use HTTP/2 multiplexing

**Current:** Sequential chunk processing
**Target:** Streaming or batched processing

### 4. UI Optimization

**Goal:** Reduce display latency from ~250ms to ~150ms

**Improvements:**
1. Debounce transcription display (don't show every single chunk)
2. Smooth text updates (avoid UI thrashing)
3. Add visual latency indicator

## Implementation Plan

### Step 1: Create AudioWorklet Processor
**File:** `scripts/audio-worklet.js`

**Features:**
- Continuous audio capture from media stream
- 500ms chunk generation
- Ring buffer for efficient memory management
- Low-latency audio processing

### Step 2: Optimize HTML Implementation
**File:** `scripts/browser-audio-capture.html`

**Changes:**
1. Add AudioWorklet support
2. Add latency metrics display
3. Optimize UI updates
4. Add error handling

### Step 3: Add Latency Monitoring
**File:** `scripts/browser-audio-capture.js`

**Metrics to track:**
- Audio capture latency
- WAV encoding latency
- STT API latency
- Display update latency
- Overall system latency

### Step 4: Test and Validate
1. Test with actual WhatsApp Web call
2. Measure latency at each stage
3. Verify accuracy with 500ms chunks
4. Compare with 1000ms baseline

## Expected Results

### Latency Reduction
- **Current:** 255-610ms
- **Phase 1 target:** <300ms
- **Improvement:** ~50% reduction in worst-case

### Accuracy
- **Chunk size:** 500ms
- **Accuracy:** 75-85%
- **Acceptable for:** Real-time transcription display

### API Costs
- **Current:** 20 API calls/second (500ms chunks)
- **Phase 1:** 20 API calls/second (same)
- **Note:** Cost depends on implementation details

## Success Criteria

✅ Total latency <300ms
✅ Audio accuracy >75%
✅ Real-time display works smoothly
✅ No memory leaks or performance degradation
✅ Works with WhatsApp Web

## Next Steps (Phase 2)

After Phase 1 is validated:
1. Implement streaming API integration (Gemini Live)
2. Optimize to 250ms chunks → ~200ms latency
3. Test accuracy with shorter chunks
4. Implement automatic chunk size adaptation

---

*Last updated: 2026-03-12*
