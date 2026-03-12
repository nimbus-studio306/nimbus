/**
 * AudioWorklet Processor for Efficient Real-Time Audio Capture
 *
 * This processor continuously captures audio from a MediaStream and produces
 * 500ms chunks for transcription. Uses AudioWorklet for low-latency processing.
 *
 * Usage:
 *   const audioWorklet = new AudioWorkletProcessor({
 *     stream: mediaStream,
 *     chunkSize: 500, // ms
 *     sampleRate: 16000
 *   });
 *
 *   audioWorklet.onChunk = (chunk) => { ... }
 *   audioWorklet.start();
 */

class AudioChunkProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super(options);

    // Configuration
    this.chunkSizeMs = options.processorOptions.chunkSize || 500;
    this.sampleRate = options.processorOptions.sampleRate || 16000;

    // Audio data buffers
    this.audioBuffer = new Float32Array(this.chunkSizeMs * this.sampleRate / 1000);
    this.audioBufferLength = 0;
    this.isCapturing = false;

    // Event handlers
    this.onChunk = null;
    this.onError = null;

    // Initialize
    this.port.onmessage = this.handleMessage.bind(this);
  }

  handleMessage(event) {
    if (event.data === 'start') {
      this.isCapturing = true;
    } else if (event.data === 'stop') {
      this.isCapturing = false;
      this.flush();
    }
  }

  process(inputs, outputs, parameters) {
    // Get audio input from source
    const input = inputs[0];
    if (input && input.length > 0 && input[0].length > 0) {
      const audioData = input[0];

      // Copy audio data to buffer
      if (this.isCapturing) {
        for (let i = 0; i < audioData.length; i++) {
          if (this.audioBufferLength < this.audioBuffer.length) {
            this.audioBuffer[this.audioBufferLength++] = audioData[i];
          } else {
            // Buffer full - push chunk
            this.pushChunk();
            this.audioBufferLength = 0;
            this.audioBuffer[i] = audioData[i];
            this.audioBufferLength++;
          }
        }
      }
    }

    // Continue processing (return true to keep alive)
    return true;
  }

  pushChunk() {
    // Create chunk buffer (avoid copying if possible)
    const chunk = this.audioBuffer.slice(0, this.audioBufferLength);

    // Convert to 16-bit PCM
    const pcmChunk = this.floatTo16BitPCM(chunk);

    // Send to main thread
    if (this.onChunk) {
      this.onChunk(pcmChunk, this.audioBufferLength);
    }

    // Reset buffer
    this.audioBufferLength = 0;
  }

  flush() {
    // Send any remaining audio in buffer
    if (this.audioBufferLength > 0) {
      this.pushChunk();
    }
  }

  floatTo16BitPCM(input) {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
  }
}

registerProcessor('audio-chunk-processor', AudioChunkProcessor);
