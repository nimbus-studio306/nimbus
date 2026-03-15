#!/usr/bin/env node

/**
 * WhatsApp Call Transcription - Phase 1: 500ms Chunk STT
 *
 * Purpose: Real-time transcription with 500ms chunk size (Phase 1 of 3-phase optimization)
 * Architecture: Chunk audio → STT → Display → Repeat
 * Expected latency: ~500ms per chunk (baseline, before optimizations)
 *
 * Usage:
 *   node stt-whatsapp.js --config=whatsapp-stt-config.json
 *
 * Features:
 * - Captures browser audio via getDisplayMedia()
 * - Splits audio into 500ms chunks
 * - Sends each chunk to Google Cloud Speech-to-Text
 * - Displays transcript in real-time
 * - Supports manual stop/clear
 *
 * Dependencies:
 * - Google Cloud Speech-to-Text API (STT)
 * - Browser getUserMedia() API (audio capture)
 * - WAV encoding (simple header construction)
 *
 * Reference:
 * - Research: memory/knowledge/optimize-audio-latency.md
 * - Testing: memory/knowledge/whatsapp-call-transcription-test.md
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// =====================================================
// CONFIGURATION (loaded from file or defaults)
// =====================================================
let config = {
  // STT settings
  stt: {
    languageCode: 'en-US',
    sampleRateHertz: 16000,  // WAV standard rate
    encoding: 'LINEAR16',      // 16-bit PCM
    interimResults: true,     // Show results while speaking
    enableAutomaticPunctuation: true
  },

  // Audio chunk settings
  audio: {
    chunkDurationMs: 500,     // Phase 1: baseline 500ms
    minSilenceMs: 250,        // Minimum silence before sending chunk
    maxSilenceMs: 750,        // Maximum silence before sending chunk
    sampleRate: 16000
  },

  // UI settings
  ui: {
    showTimestamps: true,
    showInterim: true,
    showFinal: true,
    colorFinal: 'green',
    colorInterim: 'cyan'
  }
};

// =====================================================
// AUDIO CAPTURE (Browser via getUserMedia)
// =====================================================

/**
 * Request audio capture via browser
 * Users must click "Share Audio" in browser dialog
 */
async function captureAudio() {
  console.log('\n=== PHASE 1: Audio Capture ===\n');
  console.log('📢 A browser dialog will open. Click "Share Audio" to allow microphone access.');
  console.log('👉 Note: Select the browser tab with the WhatsApp call audio.');
  console.log('⏳ After granting permission, press SPACE to start transcription.\n');

  // Display Media capture (browser-based audio)
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: false,
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  });

  console.log('✅ Audio capture started. Press SPACE to begin transcription.\n');

  // Convert stream to Node.js format
  const audioContext = new (window.AudioContext || window.webkitAudioContext)({
    sampleRate: config.audio.sampleRate
  });

  const source = audioContext.createMediaStreamSource(stream);
  const bufferSize = config.audio.sampleRate * (config.audio.chunkDurationMs / 1000);
  const scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);

  const audioChunks = [];
  let isRecording = false;

  // Handle incoming audio data
  scriptProcessor.onaudioprocess = (e) => {
    if (!isRecording) return;

    const inputData = e.inputBuffer.getChannelData(0);

    // Convert float32 PCM (AudioContext) to int16 PCM (STT format)
    const int16Data = new Int16Array(inputData.length);
    for (let i = 0; i < inputData.length; i++) {
      // Clamp and scale
      let sample = inputData[i] * 32767;
      if (sample > 32767) sample = 32767;
      if (sample < -32768) sample = -32768;
      int16Data[i] = sample;
    }

    audioChunks.push(int16Data);
  };

  source.connect(scriptProcessor);
  scriptProcessor.connect(audioContext.destination);

  // Keyboard handler
  const stopHandler = () => {
    console.log('\n⏸️  Recording paused. Press SPACE to resume or Ctrl+C to stop.\n');
    isRecording = false;
  };

  const startHandler = () => {
    console.log('▶️  Recording started!\n');
    isRecording = true;
  };

  process.stdin.setRawMode(true);
  process.stdin.resume();

  process.stdin.on('data', (data) => {
    const key = data.toString('trim').toLowerCase();

    if (key === ' ') {
      if (isRecording) {
        stopHandler();
      } else {
        startHandler();
      }
    } else if (key === 'q' || key === 'x') {
      console.log('\n👋 Transcription stopped.');
      process.exit(0);
    }
  });

  // Cleanup on exit
  process.on('SIGINT', () => {
    console.log('\n👋 Interrupted. Stopping transcription...');
    stream.getTracks().forEach(track => track.stop());
    audioContext.close();
    process.exit(0);
  });

  // Show instruction
  readline.emitKeypressEvents(process.stdin);
}

// =====================================================
// STT API INTEGRATION (Google Cloud Speech-to-Text)
// =====================================================

/**
 * Send audio chunk to Google Cloud Speech-to-Text
 */
async function transcribeChunk(audioData) {
  // Convert Int16Array to WAV format (simple wrapper)
  const wavHeader = createWavHeader(audioData.length, config.audio.sampleRate);
  const wavData = new Uint8Array(wavHeader.length + audioData.length * 2);
  const wavView = new DataView(wavData.buffer);

  // Write WAV header
  let offset = 0;
  for (let i = 0; i < wavHeader.length; i++) {
    wavView.setUint8(offset++, wavHeader[i]);
  }

  // Write audio data (little-endian)
  for (let i = 0; i < audioData.length; i++) {
    wavView.setInt16(offset + (i * 2), audioData[i], true);
    offset += 2;
  }

  // Send to Google Cloud Speech-to-Text API
  const url = `https://speech.googleapis.com/v1p1beta1/speech:recognize?key=${process.env.GOOGLE_CLOUD_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({
      config: {
        encoding: config.stt.encoding,
        sampleRateHertz: config.audio.sampleRate,
        languageCode: config.stt.languageCode,
        interimResults: config.stt.interimResults,
        enableAutomaticPunctuation: config.stt.enableAutomaticPunctuation
      },
      audio: {
        content: arrayBufferToBase64(wavData.buffer)
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`STT API error (${response.status}): ${error}`);
  }

  const data = await response.json();

  return {
    interimTranscript: data.results?.[0]?.alternatives?.[0]?.transcript || '',
    isFinal: data.results?.[0]?.isFinal || false,
    wordTimeOffsets: data.results?.[0]?.alternatives?.[0]?.wordTimeOffsets || []
  };
}

/**
 * Create WAV header for Int16 PCM audio
 */
function createWavHeader(dataLength, sampleRate) {
  const byteRate = sampleRate * 2;  // 16-bit = 2 bytes per sample
  const blockSize = 16;
  const dataSize = dataLength * 2;
  const fileSize = dataSize + 36;

  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  // RIFF header
  view.setUint8(0, 0x52);  // 'R'
  view.setUint8(1, 0x49);  // 'I'
  view.setUint8(2, 0x46);  // 'F'
  view.setUint8(3, 0x46);  // 'F'

  // File size
  view.setUint32(4, fileSize, true);

  // WAVE header
  view.setUint8(8, 0x57);  // 'W'
  view.setUint8(9, 0x41);  // 'A'
  view.setUint8(10, 0x56); // 'V'
  view.setUint8(11, 0x45); // 'E'

  // fmt chunk
  view.setUint8(12, 0x66);  // 'f'
  view.setUint8(13, 0x6D);  // 'm'
  view.setUint8(14, 0x74);  // 't'
  view.setUint8(15, 0x20);  // ' '

  // Chunk size (16 for PCM)
  view.setUint32(16, 16, true);

  // Audio format (1 = PCM)
  view.setUint16(20, 1, true);

  // Number of channels (1 = mono)
  view.setUint16(22, 1, true);

  // Sample rate
  view.setUint32(24, sampleRate, true);

  // Byte rate
  view.setUint32(28, byteRate, true);

  // Block alignment
  view.setUint16(32, 2, true);

  // Bits per sample
  view.setUint16(34, 16, true);

  // data chunk
  view.setUint8(36, 0x64);  // 'd'
  view.setUint8(37, 0x61);  // 'a'
  view.setUint8(38, 0x74);  // 'a'
  view.setUint8(39, 0x61);  // 'a'

  // Data size
  view.setUint32(40, dataSize, true);

  return new Uint8Array(buffer);
}

/**
 * Convert ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// =====================================================
// REAL-TIME TRANSCRIPTION LOOP
// =====================================================

/**
 * Main transcription loop with 500ms chunk size
 */
async function startTranscription() {
  console.log('\n=== PHASE 1: Real-Time Transcription (500ms Chunks) ===\n');
  console.log('🔄 Transcribing... Press SPACE to pause, Ctrl+C to stop.\n');

  const startTime = Date.now();
  let lastTransmitTime = startTime;
  let silenceDuration = 0;
  let lastTranscript = '';
  let currentInterim = '';

  while (true) {
    // Check if we should transmit (500ms elapsed OR silence threshold)
    const now = Date.now();
    const elapsed = now - lastTransmitTime;
    const silenceMs = now - lastSilenceTime;

    // Transmit if: elapsed >= 500ms OR silence >= 250ms OR silence >= 750ms
    if (elapsed >= config.audio.chunkDurationMs ||
        silenceDuration >= config.audio.minSilenceMs ||
        silenceDuration >= config.audio.maxSilenceMs) {

      // Transmit current audio chunk
      const result = await transcribeChunk(currentChunk);
      currentChunk = [];  // Clear chunk buffer

      // Display interim results
      if (result.interimTranscript) {
        console.log(`[INTERIM] ${result.interimTranscript}`);
      }

      // Final results
      if (result.isFinal) {
        console.log(`[FINAL] ${result.interimTranscript}\n`);
        lastTranscript += ' ' + result.interimTranscript;
      }

      lastTransmitTime = now;
      silenceDuration = 0;
      currentInterim = '';
    }

    // Wait before next iteration
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  // Load config if file exists
  const configPath = process.argv.find(arg => arg.startsWith('--config='));
  if (configPath) {
    const path = configPath.split('=')[1];
    try {
      const configData = JSON.parse(fs.readFileSync(path, 'utf8'));
      config = { ...config, ...configData };
    } catch (err) {
      console.error(`❌ Failed to load config from ${path}: ${err.message}`);
      process.exit(1);
    }
  }

  console.log('🎤 WhatsApp Call Transcription - Phase 1 (500ms Chunks)');
  console.log('='.repeat(50));
  console.log(`Chunk size: ${config.audio.chunkDurationMs}ms`);
  console.log(`Sample rate: ${config.audio.sampleRate}Hz`);
  console.log(`STT language: ${config.stt.languageCode}`);
  console.log('='.repeat(50) + '\n');

  // Step 1: Capture audio
  await captureAudio();

  // Step 2: Start transcription loop
  await startTranscription();
}

// Run main
main().catch(err => {
  console.error(`❌ Error: ${err.message}`);
  process.exit(1);
});
