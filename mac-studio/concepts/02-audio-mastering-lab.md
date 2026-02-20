# Concept 02: Audio Mastering Lab

## Role in Fleet
Dedicated audio processing, mastering, stem separation, and AI-enhanced music production.

## Hardware Target
Mac Studio M1 Max (32GB) - audio is less memory-intensive than video

## Core Capabilities
- **Stem separation**: Isolate vocals, drums, bass, instruments
- **Mastering**: AI-assisted loudness normalization, EQ
- **Noise reduction**: Background noise removal
- **Transcription**: Speech-to-text with speaker diarization
- **Voice cloning**: Train voice models for dubbing/ADR
- **Music analysis**: BPM detection, key detection, mood analysis

## Key Software Stack

### DAW / Audio Processing
- **Logic Pro** (native Apple Silicon, included plugins)
- **Audacity** (free, scripting support)
- **SoX** (command-line audio Swiss army knife)
- **FFmpeg** (audio extraction, conversion)

### AI Audio Tools
- **Whisper.cpp** - Local speech recognition
- **Demucs** - Stem separation (Facebook/Meta)
- **Ultimate Vocal Remover** - GUI for multiple models
- **RVC** - Real-time voice conversion
- **Coqui TTS** - Text-to-speech with voice cloning

### Python Libraries
- **librosa** - Audio analysis
- **pydub** - Simple audio manipulation
- **soundfile** - Read/write audio files
- **pyannote** - Speaker diarization

## MLX Opportunities
- Run Whisper models natively on Apple Silicon
- Local voice synthesis
- Real-time audio effects with ML
- Music generation (AudioCraft/MusicGen ports)

## Rental Model Potential
- **Stem separation**: €2-5 per track
- **Podcast mastering**: €20-50 per episode
- **Batch transcription**: €0.10-0.50 per minute
- **Voice cloning setup**: €100-300 per voice

## Workflow Example: Podcast Production
1. Upload raw podcast audio
2. Auto-transcribe with Whisper
3. Identify speakers (diarization)
4. Remove background noise
5. Normalize loudness
6. Export transcript + polished audio

## Setup Commands
```bash
# Core audio tools
brew install sox ffmpeg

# Whisper.cpp for transcription
brew install whisper-cpp

# Python audio stack
pip install librosa soundfile pydub pyannote-audio

# Demucs for stem separation
pip install demucs
```

## Storage Notes
Audio is lightweight compared to video. 512GB internal sufficient for most workflows.
Keep stems and masters, archive raw to external.
