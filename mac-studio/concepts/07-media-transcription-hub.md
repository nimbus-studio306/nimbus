# Concept 07: Media Transcription Hub

## Role in Fleet
High-volume transcription, translation, subtitling, and content indexing.

## Hardware Target
Mac Studio M1 Max or even M4 - Whisper runs excellently on Apple Silicon

## Core Capabilities
- **Speech-to-text**: Accurate transcription in 100+ languages
- **Speaker diarization**: Identify who said what
- **Translation**: Transcribe + translate in one pass
- **Subtitling**: Generate SRT/VTT files
- **Content indexing**: Searchable media archives
- **Meeting notes**: Auto-generate summaries
- **Podcast production**: Transcripts + show notes

## Key Software Stack

### Transcription
- **Whisper.cpp** (fastest on Apple Silicon)
- **faster-whisper** (CTranslate2 backend)
- **whisper-mlx** (native MLX port)
- **MacWhisper** (Mac GUI app)
- **Buzz** (cross-platform GUI)

### Diarization
- **pyannote-audio** (speaker identification)
- **whisperX** (word-level timestamps + diarization)

### Subtitling
- **Subtitle Edit** (professional SRT editing)
- **Aegisub** (advanced subtitling)
- **ffmpeg** (burn subtitles into video)

### Translation
- **Whisper** (built-in translation)
- **NLLB** (Meta's translation model)
- **MarianMT** (fast translation models)

## Whisper Model Selection
| Model | Size | Speed (M1 Max) | Accuracy |
|-------|------|----------------|----------|
| tiny | 39M | Real-time | Good for drafts |
| base | 74M | Real-time | Decent |
| small | 244M | ~3x real-time | Good |
| medium | 769M | ~6x real-time | Great |
| large-v3 | 1.5GB | ~10x real-time | Best |

For production, **large-v3** is worth the time investment.

## Rental Model Potential
- **Per-minute transcription**: €0.10-0.50/minute
- **Subtitling service**: €2-5/minute (includes timing)
- **Translation**: +50% on base transcription
- **Diarization**: +30% on base
- **Rush service**: 2-3x pricing
- **Monthly subscription**: €200-500 for businesses

## Workflow Example: YouTube Subtitle Service
1. Client uploads video
2. Extract audio track (ffmpeg)
3. Transcribe with Whisper large-v3
4. Diarize speakers (pyannote)
5. Generate word-level timestamps (whisperX)
6. Export SRT file
7. Optionally translate to other languages
8. Deliver via webhook/email

## Batch Processing Setup
```bash
# Whisper.cpp (fastest)
brew install whisper-cpp

# Transcribe a file
whisper-cpp -m models/ggml-large-v3.bin \
  -f audio.wav \
  -of output \
  --output-srt

# Batch process folder
for f in *.wav; do
  whisper-cpp -m models/ggml-large-v3.bin \
    -f "$f" -of "${f%.wav}" --output-srt
done
```

## WhisperX Setup (With Diarization)
```bash
pip install whisperx

# Transcribe with diarization
whisperx audio.wav \
  --model large-v3 \
  --diarize \
  --min_speakers 2 \
  --max_speakers 5
```

## Storage Strategy
- Audio files: Moderate size
- Keep transcripts (text is tiny)
- Archive processed audio to NAS
- SQLite database for search indexing

## Scaling
Multiple Mac Minis could form a transcription cluster:
- Load balancer distributes jobs
- Each machine processes independently
- Results aggregate to central storage
