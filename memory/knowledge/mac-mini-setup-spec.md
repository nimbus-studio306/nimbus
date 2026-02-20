# Mac Mini M4 Pro — AI Assistant Workstation Setup Spec

> **Author:** Nimbus (for Zsolt)  
> **Last updated:** 2026-02-04 (corrected: M4 Pro, not M4 Max)  
> **Target hardware:** Mac Mini M4 Pro, 24–64 GB unified memory, 512 GB – 8 TB SSD  
> **Purpose:** Local AI assistant workstation — LLM inference, STT/TTS, fine-tuning, OpenClaw integration  
> **Note:** Mac Mini only comes in M4 and M4 Pro. For M4 Max, see MacBook Pro / Mac Studio.

---

## Table of Contents

1. [Hardware Baseline](#1-hardware-baseline)
2. [Audio Processing](#2-audio-processing)
3. [Browser Automation](#3-browser-automation)
4. [Python ML Stack](#4-python-ml-stack)
5. [Local STT (Speech-to-Text)](#5-local-stt-speech-to-text)
6. [Local TTS (Text-to-Speech)](#6-local-tts-text-to-speech)
7. [Local LLMs](#7-local-llms)
8. [LoRA Fine-Tuning](#8-lora-fine-tuning)
9. [Open-Weight Models — What Fits?](#9-open-weight-models--what-fits)
10. [Database](#10-database)
11. [Dev Tools](#11-dev-tools)
12. [OpenClaw Integration](#12-openclaw-integration)
13. [Total Disk Budget](#13-total-disk-budget)
14. [Installation Order (Bootstrap Script)](#14-installation-order-bootstrap-script)

---

## 1. Hardware Baseline

### Mac Mini M4 Pro Specs (CORRECTED)

| Spec | Value |
|------|-------|
| CPU | 12-core (8P + 4E), configurable to 14-core |
| GPU | 16-core Metal GPU, configurable to 20-core |
| Neural Engine | 16-core |
| Memory | 24 GB base, configurable to **48 GB** or **64 GB** unified |
| Memory bandwidth | 273 GB/s |
| SSD | 512 GB / 1 TB / 2 TB / 4 TB / 8 TB |
| OS | macOS 15 Sequoia+ |

> ⚠️ **Previous version incorrectly listed M4 Max specs.** Mac Mini does NOT come with M4 Max. Only M4 and M4 Pro are available. For M4 Max (40-core GPU, 546 GB/s bandwidth, up to 128 GB), consider MacBook Pro M4 Max or Mac Studio.

### Mac Mini M4 (base) — Budget Option

| Spec | Value |
|------|-------|
| CPU | 10-core (4P + 6E) |
| GPU | 10-core Metal GPU |
| Memory | 16 GB base, configurable to 24 GB or 32 GB |
| Memory bandwidth | 120 GB/s |
| SSD | 256 GB / 512 GB / 1 TB / 2 TB |

### MacBook Pro M4 Max — Power Option (if needed)

| Spec | Value |
|------|-------|
| CPU | 16-core (12P + 4E) |
| GPU | 40-core Metal GPU |
| Memory | 48 GB or **128 GB** unified |
| Memory bandwidth | 546 GB/s |
| Notes | Portable, built-in display, battery. Zsolti may consider as workstation. |

### Why This Matters for AI

- **Unified memory** = GPU and CPU share the same RAM pool. A 40 GB model loaded for GPU inference uses the same physical memory as CPU. No PCIe transfer bottleneck.
- **M4 Pro 273 GB/s bandwidth** = solid for inference, ~2× slower than M4 Max but still faster than most consumer GPUs for large model serving (thanks to larger memory pool vs VRAM-limited GPUs).
- **Metal 3** = Apple's GPU framework; MLX and llama.cpp both use it natively.
- **Recommendation: Get the 64 GB M4 Pro model.** The price jump is modest and it unlocks larger models. With 24 GB you're limited to ~14B models comfortably, 48 GB opens up 32B-class, 64 GB allows some 70B quantized models (tight).

### macOS Tuning

```bash
# Increase wired memory limit for large models (MLX recommends this)
sudo sysctl iogpu.wired_limit_mb=57344  # ~56 GB for 64GB machine
# For 48GB machine:
sudo sysctl iogpu.wired_limit_mb=40960  # ~40 GB
```

---

## 2. Audio Processing

### Essential

| Package | Install | Disk | ARM Native? | Notes |
|---------|---------|------|------------|-------|
| **ffmpeg** | `brew install ffmpeg` | ~150 MB | ✅ Yes | Core audio/video Swiss army knife. Needed by virtually everything. |
| **sox** | `brew install sox` | ~30 MB | ✅ Yes | Audio effects, format conversion, silence detection |
| **portaudio** | `brew install portaudio` | ~5 MB | ✅ Yes | Required by `pyaudio` for mic input |
| **libsndfile** | `brew install libsndfile` | ~5 MB | ✅ Yes | Audio file I/O for Python libraries |

### Python Audio Libraries

| Package | Install | Notes |
|---------|---------|-------|
| **soundfile** | `pip install soundfile` | Read/write WAV, FLAC, OGG via libsndfile |
| **librosa** | `pip install librosa` | Audio analysis, feature extraction |
| **pyaudio** | `pip install pyaudio` | Mic capture (needs portaudio) |
| **pydub** | `pip install pydub` | High-level audio manipulation (needs ffmpeg) |
| **numpy** | `pip install numpy` | Audio is just arrays |

**Priority:** 🔴 Essential — the voice pipeline depends on all of these.

---

## 3. Browser Automation

| Package | Install | Disk | ARM Native? | Notes |
|---------|---------|------|------------|-------|
| **Playwright** | `pip install playwright && playwright install` | ~500 MB (Chromium) | ✅ Yes (ARM Chromium) | **Recommended.** Better API, auto-waits, faster. |
| **Puppeteer** | `npm install puppeteer` | ~300 MB (Chromium) | ✅ Yes | Node.js alternative, solid but Playwright is better |
| **Selenium** | `pip install selenium` | ~50 MB + driver | ✅ Yes | Legacy, only if you need specific browser |

### Recommendation

Use **Playwright** — it's what OpenClaw uses internally and has the best Apple Silicon support. Install all browsers for flexibility:

```bash
pip install playwright
playwright install  # installs Chromium, Firefox, WebKit (~1.2 GB total)
```

Also install the Node.js version for OpenClaw skills:
```bash
npx playwright install
```

**Priority:** 🟡 Nice-to-have (OpenClaw already has browser tools; useful for custom skills)

---

## 4. Python ML Stack

### Package Manager: Use `uv` or `conda` (miniforge)

For Apple Silicon, **miniforge** (conda-forge) gives the best pre-built ARM packages. Alternatively, `uv` is fast and modern.

```bash
# Option A: miniforge (recommended for ML)
brew install miniforge
conda create -n ai python=3.12
conda activate ai

# Option B: uv (fast pip alternative)
brew install uv
uv venv --python 3.12 .venv
source .venv/bin/activate
```

### Core ML Packages

| Package | Install | Disk | ARM/MPS? | Priority |
|---------|---------|------|----------|----------|
| **numpy** | `pip install numpy` | ~30 MB | ✅ Accelerate framework | 🔴 Essential |
| **pandas** | `pip install pandas` | ~50 MB | ✅ Native | 🔴 Essential |
| **scikit-learn** | `pip install scikit-learn` | ~30 MB | ✅ Native | 🟡 Useful |
| **PyTorch (MPS)** | `pip install torch torchvision torchaudio` | ~800 MB | ✅ MPS backend | 🔴 Essential |
| **MLX** | `pip install mlx` | ~50 MB | ✅ **Native Apple** | 🔴 Essential |
| **transformers** | `pip install transformers` | ~20 MB | ✅ (via MPS/MLX) | 🔴 Essential |
| **huggingface-hub** | `pip install huggingface-hub` | ~10 MB | ✅ | 🔴 Essential |
| **safetensors** | `pip install safetensors` | ~5 MB | ✅ | 🔴 Essential |
| **accelerate** | `pip install accelerate` | ~10 MB | ✅ | 🟡 Useful |
| **sentencepiece** | `pip install sentencepiece` | ~5 MB | ✅ | 🔴 Essential |
| **tokenizers** | `pip install tokenizers` | ~10 MB | ✅ Rust-based | 🔴 Essential |
| **scipy** | `pip install scipy` | ~40 MB | ✅ | 🟡 Useful |
| **matplotlib** | `pip install matplotlib` | ~50 MB | ✅ | 🟢 Optional |
| **jupyter** | `pip install jupyterlab` | ~100 MB | ✅ | 🟡 Useful for experiments |

### PyTorch MPS Setup

```python
import torch
# Check MPS availability
print(torch.backends.mps.is_available())  # Should be True
device = torch.device("mps")
```

**Total disk:** ~1.2 GB for all Python ML packages  
**Memory:** Minimal (models use the memory, not the framework)

---

## 5. Local STT (Speech-to-Text)

### Tier 1: MLX Audio (⭐ Recommended)

The **mlx-audio** package is purpose-built for Apple Silicon and includes multiple STT models:

```bash
pip install mlx-audio
```

| Model | Size | Memory | Speed | Languages | Notes |
|-------|------|--------|-------|-----------|-------|
| **Whisper Large v3 Turbo** | ~800 MB | ~1.5 GB | ⚡ Very fast | 99+ | Best balance of speed & quality |
| **Whisper Large v3** | ~1.5 GB | ~3 GB | Fast | 99+ | Maximum accuracy |
| **Qwen3-ASR 1.7B** | ~1 GB (8-bit) | ~2 GB | Fast | Multi | Excellent for structured tasks |
| **Qwen3-ASR 0.6B** | ~400 MB (8-bit) | ~1 GB | ⚡ Very fast | Multi | Good for real-time |
| **Parakeet TDT 0.6B** | ~600 MB | ~1 GB | ⚡ Very fast | EN only | NVIDIA's model, very accurate |
| **Voxtral Mini 3B** | ~3 GB | ~4 GB | Fast | Multi | Mistral's speech model |

```bash
# Transcribe audio
mlx_audio.stt.generate --model mlx-community/whisper-large-v3-turbo-asr-fp16 --audio input.wav

# Python API
from mlx_audio.stt.generate import generate_transcription
result = generate_transcription(
    model="mlx-community/whisper-large-v3-turbo-asr-fp16",
    audio="audio.wav"
)
print(result.text)
```

### Tier 2: whisper.cpp (Alternative)

Standalone C++ implementation with Metal acceleration:

```bash
brew install whisper-cpp
# Or build from source for latest Metal optimizations:
git clone https://github.com/ggml-org/whisper.cpp
cd whisper.cpp && cmake -B build -DGGML_METAL=ON && cmake --build build
```

| Model | GGML Size | Memory | Notes |
|-------|-----------|--------|-------|
| whisper-tiny | 75 MB | ~200 MB | Real-time, lower quality |
| whisper-base | 142 MB | ~300 MB | Good for quick transcription |
| whisper-small | 466 MB | ~700 MB | Balanced |
| whisper-medium | 1.5 GB | ~2 GB | High quality |
| whisper-large-v3 | 3.1 GB | ~4 GB | Best quality |
| whisper-large-v3-turbo | 1.6 GB | ~2.5 GB | ⭐ Best speed/quality ratio |

### Recommendation

**Use mlx-audio with Whisper Large v3 Turbo** as primary STT. It's optimized for Apple Silicon, has Python API integration, and supports the OpenAI-compatible REST API mode for easy integration.

**Priority:** 🔴 Essential for voice pipeline

---

## 6. Local TTS (Text-to-Speech)

### Tier 1: MLX Audio TTS Models (⭐ Recommended)

```bash
pip install mlx-audio
```

| Model | Size | Memory | Speed | Languages | Quality | Notes |
|-------|------|--------|-------|-----------|---------|-------|
| **Kokoro 82M** | ~170 MB | ~500 MB | ⚡ Real-time | EN, JA, ZH, FR, ES, IT, PT, HI | ★★★★ | Fast, 54 voice presets, tiny |
| **Chatterbox** | ~2 GB | ~3 GB | Fast | 16 languages incl. **Hungarian** 🇭🇺 | ★★★★★ | Expressive, multilingual! |
| **Qwen3-TTS 1.7B** | ~2 GB | ~3 GB | Fast | Multi | ★★★★★ | Voice cloning, emotion control |
| **Dia 1.6B** | ~1.6 GB | ~2.5 GB | Fast | EN | ★★★★ | Dialogue-focused |
| **CSM 1B** | ~1 GB | ~2 GB | Fast | EN | ★★★★ | Voice cloning from reference audio |
| **Spark TTS 0.5B** | ~500 MB | ~1 GB | ⚡ Very fast | EN, ZH | ★★★ | Lightweight |

```bash
# Generate speech (CLI)
mlx_audio.tts.generate --model mlx-community/Kokoro-82M-bf16 --text "Hello world!" --play

# With Chatterbox (supports Hungarian!)
mlx_audio.tts.generate --model mlx-community/Chatterbox-bf16 --text "Szia, Zsolt!" --play

# OpenAI-compatible API server
mlx_audio.server --tts-model mlx-community/Kokoro-82M-bf16 --stt-model mlx-community/whisper-large-v3-turbo-asr-fp16
```

### Tier 2: Piper (Ultra-low-latency)

```bash
# Install via pip or brew
pip install piper-tts
```

- **Size:** ~15–50 MB per voice model
- **Memory:** ~100 MB
- **Latency:** <50ms (CPU only, no GPU needed)
- **Quality:** ★★★ (good but not as natural as neural models)
- **Use case:** System notifications, quick confirmations, low-latency responses

### Tier 3: Coqui TTS / XTTS v2

```bash
pip install TTS
```

- **XTTS v2:** ~2 GB model, supports 16 languages, voice cloning
- **Memory:** ~4 GB (uses PyTorch, can use MPS)
- **Quality:** ★★★★★ (one of the best open-source TTS)
- **Caveat:** Coqui as a company shut down; repo is community-maintained. Still works but less active development.

### Recommendation

**Primary:** Kokoro 82M for English (fast, tiny, great quality) + Chatterbox for Hungarian/multilingual.  
**Voice cloning:** CSM 1B or Qwen3-TTS.  
**Fallback:** Piper for ultra-low-latency system responses.

**Priority:** 🔴 Essential for voice pipeline  
**Chatterbox is notable for Hungarian support** — very relevant for Zsolt.

---

## 7. Local LLMs

### Three Runtimes (Pick Based on Use Case)

| Runtime | Install | Backend | Best For | API |
|---------|---------|---------|----------|-----|
| **Ollama** | `brew install ollama` | llama.cpp | Easy management, OpenClaw integration | OpenAI-compatible |
| **MLX LM** | `pip install mlx-lm` | MLX (Apple) | Max Apple Silicon performance, fine-tuning | Python API + CLI |
| **llama.cpp** | `brew install llama.cpp` | GGML + Metal | Raw performance, custom setups | CLI + HTTP server |

### Ollama (⭐ Primary Recommendation)

Ollama wraps llama.cpp with easy model management and an OpenAI-compatible API. This is what OpenClaw connects to.

```bash
brew install ollama
ollama serve  # starts the API server on port 11434

# Pull models
ollama pull llama3.3
ollama pull qwen3:32b
ollama pull deepseek-r1:32b
```

### MLX LM (⭐ For Fine-Tuning & Max Performance)

Apple's native framework — fastest inference on Apple Silicon, plus LoRA/QLoRA fine-tuning.

```bash
pip install mlx-lm

# Run a model
mlx_lm.generate --model mlx-community/Qwen3-30B-A3B-4bit --prompt "Hello"

# Chat
mlx_lm.chat --model mlx-community/Meta-Llama-3.1-70B-Instruct-4bit
```

### Memory Budget — What Fits?

The rule of thumb for 4-bit quantized models:

```
Memory needed ≈ (parameters × 0.5 bytes) + 2–4 GB overhead
```

**With 64 GB unified memory:**

| Model | Params | 4-bit Size | Memory (with KV cache) | Fits? | Speed |
|-------|--------|-----------|----------------------|-------|-------|
| Llama 3.2 3B | 3B | ~2 GB | ~4 GB | ✅ Easy | ⚡ 100+ tok/s |
| Qwen3-8B | 8B | ~5 GB | ~7 GB | ✅ Easy | ⚡ 70+ tok/s |
| Gemma 3 12B | 12B | ~7 GB | ~10 GB | ✅ Easy | ⚡ 50+ tok/s |
| Phi-4 14B | 14B | ~9 GB | ~12 GB | ✅ Easy | Fast 40+ tok/s |
| Mistral Small 24B | 24B | ~14 GB | ~18 GB | ✅ Comfortable | Fast 30+ tok/s |
| Qwen3-30B-A3B (MoE) | 30B (3B active) | ~18 GB | ~22 GB | ✅ Comfortable | ⚡ Fast (sparse) |
| DeepSeek-R1 32B | 32B | ~20 GB | ~25 GB | ✅ Comfortable | 25+ tok/s |
| Qwen3 32B | 32B | ~20 GB | ~25 GB | ✅ Comfortable | 25+ tok/s |
| Llama 3.3 70B | 70B | ~40 GB | ~48 GB | ⚠️ Tight (64GB only) | 10-15 tok/s |
| Qwen2.5 72B | 72B | ~42 GB | ~50 GB | ⚠️ Tight (64GB only) | 8-12 tok/s |
| Llama 3.1 405B | 405B | ~220 GB | N/A | ❌ No | — |

**With 48 GB unified memory:**

| Model | Fits? | Notes |
|-------|-------|-------|
| Up to 32B | ✅ Comfortable | ~25 GB, leaves room for OS + other tasks |
| Qwen3-30B-A3B (MoE) | ✅ Best bang for buck | Only 3B params active per token |
| 70B | ❌ Too tight | Would need ~48GB just for model, no room for OS |

### Recommendation: Model Lineup

Keep these pulled and ready:

```bash
# Lightweight (always loaded, fast responses)
ollama pull qwen3:8b              # ~5 GB — quick tasks, tool calls

# Workhorse (primary assistant)
ollama pull qwen3:32b             # ~20 GB — excellent for assistant tasks
# OR
ollama pull deepseek-r1:32b       # ~20 GB — reasoning tasks

# Heavy hitter (64GB only, for complex tasks)
ollama pull llama3.3:70b          # ~40 GB — when you need the best

# Coding specialist
ollama pull qwen2.5-coder:32b    # ~20 GB — code generation

# Reasoning
ollama pull qwq:32b              # ~20 GB — deliberate reasoning
```

**Priority:** 🔴 Essential

---

## 8. LoRA Fine-Tuning

### MLX LM Fine-Tuning (⭐ The Way to Go on Apple Silicon)

MLX LM has first-class LoRA and QLoRA support, optimized for Apple Silicon:

```bash
pip install "mlx-lm[train]"
```

### Supported Model Families

Mistral, Llama, Phi2, Mixtral, Qwen2, Gemma, OLMo, MiniCPM, InternLM2

### Fine-Tuning Modes

| Mode | Memory Usage | Quality | Speed |
|------|-------------|---------|-------|
| **QLoRA** (4-bit base + LoRA) | Lowest (~60% of base model) | Good | Fastest |
| **LoRA** (fp16 base + LoRA) | Medium (~110% of base model) | Better | Fast |
| **DoRA** (Weight-Decomposed LoRA) | Medium | Best | Fast |
| **Full fine-tune** | Highest (~200%+ of base model) | Maximum | Slowest |

### Memory Requirements for Fine-Tuning

| Base Model | QLoRA Memory | LoRA Memory | Full Fine-Tune |
|------------|-------------|-------------|----------------|
| 7B | ~6 GB | ~16 GB | ~32 GB |
| 8B | ~7 GB | ~18 GB | ~36 GB |
| 13B–14B | ~12 GB | ~30 GB | ~56 GB ⚠️ |
| 32B | ~24 GB | ~64 GB ⚠️ | ❌ |
| 70B | ~42 GB ⚠️ | ❌ | ❌ |

**On 64 GB Mac Mini:** QLoRA fine-tune up to 32B, LoRA up to 14B comfortably  
**On 48 GB Mac Mini:** QLoRA fine-tune up to 14B, LoRA up to 8B comfortably

### How to Fine-Tune

```bash
# Prepare data (JSONL format)
# train.jsonl format:
# {"messages": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}

# QLoRA fine-tuning (4-bit quantized base)
mlx_lm.lora \
    --model mlx-community/Qwen2.5-7B-Instruct-4bit \
    --train \
    --data ./training_data \
    --iters 600 \
    --batch-size 4

# Evaluate
mlx_lm.lora \
    --model mlx-community/Qwen2.5-7B-Instruct-4bit \
    --adapter-path ./adapters \
    --data ./training_data \
    --test

# Fuse adapter into model
mlx_lm.fuse --model mlx-community/Qwen2.5-7B-Instruct-4bit

# Export to GGUF (for Ollama)
mlx_lm.fuse \
    --model mlx-community/Qwen2.5-7B-Instruct-4bit \
    --export-gguf
```

### Data Format

MLX LM supports:
- **Chat format:** `{"messages": [{"role": "system", ...}, {"role": "user", ...}, {"role": "assistant", ...}]}`
- **Completions:** `{"prompt": "...", "completion": "..."}`
- **Tool calling:** Full function-calling training data
- **Text:** `{"text": "raw text"}`

### Fine-Tuning Use Cases for OpenClaw

1. **Personality tuning** — Train a model on Nimbus's conversation style
2. **Tool calling** — Improve function calling reliability
3. **Domain knowledge** — Zsolt's specific workflows and preferences
4. **Hungarian language** — Improve Hungarian understanding/generation

**Priority:** 🟡 Nice-to-have (powerful but needs curated data)

---

## 9. Open-Weight Models — What Fits?

### Best Models for Assistant Tasks (Ranked)

#### 🏆 Tier 1: Best Overall Assistants

| Model | Size | 4-bit | Strengths | Fits 48GB? | Fits 64GB? |
|-------|------|-------|-----------|-----------|-----------|
| **Qwen3 32B** | 32B | ~20 GB | Tool calling, multilingual, coding, reasoning | ✅ | ✅ |
| **Llama 3.3 70B** | 70B | ~40 GB | Best open model overall, tool calling | ❌ | ⚠️ Tight |
| **DeepSeek-R1 32B** | 32B | ~20 GB | Strong reasoning, thinking traces | ✅ | ✅ |
| **Qwen3-30B-A3B** (MoE) | 30B/3B active | ~18 GB | Fast, efficient, tool-capable | ✅ | ✅ |
| **Mistral Small 24B** | 24B | ~14 GB | Excellent quality/size ratio, tools | ✅ | ✅ |

#### 🥈 Tier 2: Specialized

| Model | Size | 4-bit | Strengths | Notes |
|-------|------|-------|-----------|-------|
| **Qwen2.5-Coder 32B** | 32B | ~20 GB | Best open coding model | Outstanding for code |
| **Gemma 3 27B** | 27B | ~16 GB | Vision + text, Google quality | Good multimodal |
| **Phi-4 14B** | 14B | ~9 GB | Punches way above weight | Great for smaller footprint |
| **QwQ 32B** | 32B | ~20 GB | Deep reasoning (like o1) | Thinking/reasoning specialist |

#### 🥉 Tier 3: Lightweight / Fast

| Model | Size | 4-bit | Strengths | Notes |
|-------|------|-------|-----------|-------|
| **Qwen3 8B** | 8B | ~5 GB | Fast, capable, tools | Good daily driver |
| **Llama 3.2 3B** | 3B | ~2 GB | Instant responses | Quick tasks, triage |
| **Gemma 3 4B** | 4B | ~3 GB | Efficient, multilingual | Edge tasks |
| **Phi-3 3.8B** | 3.8B | ~2.5 GB | Surprisingly capable | Quick reasoning |

### Model Decision Matrix

```
Need best quality?           → Qwen3 32B or Llama 3.3 70B (64GB)
Need fast + good?            → Qwen3-30B-A3B (MoE) or Mistral Small 24B
Need coding?                 → Qwen2.5-Coder 32B
Need reasoning?              → DeepSeek-R1 32B or QwQ 32B
Need vision?                 → Gemma 3 27B
Need instant response?       → Qwen3 8B or Llama 3.2 3B
Need Hungarian?              → Qwen3 32B (best multilingual) or Llama 3.3 70B
Need minimal memory?         → Phi-4 14B (best quality per GB)
```

### Recommended Setup: Multi-Model Strategy

Run a **small model** always-on + **swap in** larger models for complex tasks:

```
Always loaded:  Qwen3 8B (~5 GB)        — fast triage, simple questions
On demand:      Qwen3 32B (~20 GB)       — complex assistant tasks
On demand:      Qwen2.5-Coder 32B (~20 GB) — coding sessions
Special:        Llama 3.3 70B (~40 GB)   — maximum quality (64GB only)
```

**Note:** Ollama automatically loads/unloads models. You can set `OLLAMA_KEEP_ALIVE=24h` to keep the primary model warm.

---

## 10. Database

### PostgreSQL (via Supabase or standalone)

| Option | Install | Disk | Memory | Notes |
|--------|---------|------|--------|-------|
| **PostgreSQL 16** | `brew install postgresql@16` | ~100 MB + data | 256 MB–2 GB | Lightweight, ARM native |
| **Supabase CLI** | `brew install supabase/tap/supabase` | ~500 MB (Docker images) | 1–2 GB | Full Supabase stack, requires Docker |
| **pgvector** | `brew install pgvector` | ~5 MB | Minimal | Vector embeddings extension — essential for RAG |

```bash
# Standalone PostgreSQL + pgvector (recommended for simplicity)
brew install postgresql@16 pgvector
brew services start postgresql@16

# In psql:
CREATE EXTENSION vector;
```

**For Supabase self-hosted** (if you want the full stack — auth, storage, realtime):
```bash
brew install supabase/tap/supabase
supabase init
supabase start  # Runs via Docker
```

### Redis

| Package | Install | Disk | Memory | Notes |
|---------|---------|------|--------|-------|
| **Redis 7** | `brew install redis` | ~10 MB | 50 MB–1 GB | ARM native, in-memory store |
| **KeyDB** | `brew install keydb` | ~10 MB | 50 MB–1 GB | Redis-compatible, multi-threaded |

```bash
brew install redis
brew services start redis
```

Use cases: caching, session storage, pub/sub for real-time features, rate limiting.

### Vector Database Options

| Option | Notes |
|--------|-------|
| **pgvector** (in PostgreSQL) | ⭐ Recommended — no extra service, good enough for most RAG |
| **Chroma** | `pip install chromadb` — embedded, Python-native |
| **Qdrant** | `brew install qdrant` — standalone, faster for large-scale |

**Priority:**
- PostgreSQL + pgvector: 🔴 Essential (core data + embeddings)
- Redis: 🟡 Nice-to-have (caching layer)
- Supabase full stack: 🟢 Optional (overkill for personal assistant)

---

## 11. Dev Tools

### Essential

| Tool | Install | Notes |
|------|---------|-------|
| **Homebrew** | `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"` | Package manager, ARM native |
| **Node.js 22 LTS** | `brew install node@22` | Required for OpenClaw |
| **pnpm** | `npm install -g pnpm` | Fast package manager |
| **Git** | `brew install git` | Version control |
| **Python 3.12** | `brew install python@3.12` | ML stack |
| **uv** | `brew install uv` | Fast Python package manager |

### Docker

| Option | Notes |
|--------|-------|
| **OrbStack** (⭐ Recommended) | `brew install orbstack` — Fast, ARM native, lightweight Docker alternative |
| **Docker Desktop** | `brew install --cask docker` — Official but heavier |
| **Colima** | `brew install colima` — Lightweight CLI-based |

**OrbStack** is strongly recommended over Docker Desktop on Apple Silicon — it's faster, uses less memory, and has better ARM support.

### Nice-to-Have

| Tool | Install | Notes |
|------|---------|-------|
| **Rust** | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` | Some Python packages need it |
| **cmake** | `brew install cmake` | Building whisper.cpp, llama.cpp from source |
| **Xcode CLT** | `xcode-select --install` | C/C++ compiler, Metal SDK |
| **tmux** | `brew install tmux` | Terminal multiplexer |
| **jq** | `brew install jq` | JSON processing |
| **ripgrep** | `brew install ripgrep` | Fast search |
| **htop** | `brew install htop` | System monitoring |
| **asitop** | `pip install asitop` | Apple Silicon GPU/ANE monitoring |

**Priority:** 🔴 Essential (all core dev tools)

---

## 12. OpenClaw Integration

### How Local Models Connect to OpenClaw

OpenClaw natively supports Ollama as a provider. This is the primary integration path.

#### Option A: Ollama Provider (⭐ Simplest)

```jsonc
// openclaw.json (or via CLI)
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "ollama/qwen3:32b",
        "fallback": ["ollama/qwen3:8b", "anthropic/claude-opus-4-5"]
      }
    }
  }
}
```

Setup:
```bash
# 1. Install & start Ollama
brew install ollama
ollama serve

# 2. Pull models
ollama pull qwen3:32b

# 3. Enable in OpenClaw
export OLLAMA_API_KEY="ollama-local"
# Or:
openclaw config set models.providers.ollama.apiKey "ollama-local"
```

OpenClaw auto-discovers Ollama models:
- Queries `http://127.0.0.1:11434/api/tags` and `/api/show`
- Keeps tool-capable models
- Detects reasoning models (thinking support)
- All costs = $0

#### Option B: MLX LM as OpenAI-Compatible Server

For MLX-optimized models (potentially faster than Ollama):

```bash
# Start MLX LM server (OpenAI-compatible)
pip install "mlx-lm[server]"
mlx_lm.server --model mlx-community/Qwen3-30B-A3B-4bit --port 8000
```

```jsonc
// openclaw.json — custom provider
{
  "models": {
    "providers": {
      "mlx": {
        "baseUrl": "http://localhost:8000/v1",
        "apiKey": "mlx-local",
        "api": "openai-completions",
        "models": [
          {
            "id": "qwen3-30b",
            "name": "Qwen3 30B A3B (MLX)",
            "reasoning": false,
            "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 32768,
            "maxTokens": 32768
          }
        ]
      }
    }
  }
}
```

#### Option C: LM Studio (GUI alternative)

LM Studio provides a GUI model manager with OpenAI-compatible API:

```jsonc
{
  "models": {
    "providers": {
      "lmstudio": {
        "baseUrl": "http://localhost:1234/v1",
        "apiKey": "lm-studio",
        "api": "openai-completions",
        "models": [{ "id": "loaded-model", "name": "LM Studio Model" }]
      }
    }
  }
}
```

### Hybrid Strategy (Recommended)

```
┌─────────────────────────────────────────────┐
│            OpenClaw Gateway                   │
│                                               │
│  primary: ollama/qwen3:32b (local, free)     │
│  fallback: anthropic/claude-opus-4-5 (cloud)  │
│                                               │
│  STT: mlx-audio whisper (local)              │
│  TTS: mlx-audio kokoro/chatterbox (local)    │
└─────────────────────────────────────────────┘
```

- **Day-to-day:** Local Qwen3 32B handles most tasks at $0 cost
- **Complex/critical:** Falls back to Claude Opus for hard problems
- **Voice:** Entirely local STT/TTS pipeline
- **Cost:** Dramatically reduced API bills

### STT/TTS Integration with OpenClaw

MLX Audio can run an **OpenAI-compatible API server**:

```bash
# Start combined STT+TTS server
mlx_audio.server \
    --tts-model mlx-community/Kokoro-82M-bf16 \
    --stt-model mlx-community/whisper-large-v3-turbo-asr-fp16 \
    --port 5000
```

This provides `/v1/audio/transcriptions` and `/v1/audio/speech` endpoints — the same API format OpenClaw and other tools expect.

**Priority:** 🔴 Essential — this is the whole point!

---

## 13. Total Disk Budget

| Category | Size | Notes |
|----------|------|-------|
| macOS + system | ~30 GB | Base OS |
| Homebrew packages | ~2 GB | ffmpeg, Python, Node, etc. |
| Python ML environment | ~3 GB | PyTorch, MLX, transformers, etc. |
| Playwright browsers | ~1.2 GB | Chromium, Firefox, WebKit |
| Ollama models (4–5 models) | ~60–80 GB | See model table above |
| MLX models (STT + TTS) | ~5–8 GB | Whisper + Kokoro + Chatterbox |
| PostgreSQL + data | ~1–10 GB | Depends on usage |
| Docker images | ~5–10 GB | If using OrbStack/Docker |
| Development repos | ~5–10 GB | OpenClaw, projects |
| **Total** | **~120–160 GB** | |

**Recommendation:** 1 TB SSD is sufficient. 2 TB gives room to experiment with more models.

---

## 14. Installation Order (Bootstrap Script)

Run in this order on a fresh Mac Mini M4 Pro (or MacBook Pro M4 Max):

```bash
#!/bin/bash
# Mac Mini M4 Pro AI Workstation Bootstrap
# Run after initial macOS setup

set -e

echo "=== 1. System Basics ==="
xcode-select --install
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

echo "=== 2. Core Dev Tools ==="
brew install git node@22 python@3.12 cmake jq ripgrep tmux htop
npm install -g pnpm

echo "=== 3. Docker (OrbStack) ==="
brew install orbstack

echo "=== 4. Audio Tools ==="
brew install ffmpeg sox portaudio libsndfile

echo "=== 5. Python Environment ==="
brew install uv
uv venv --python 3.12 ~/.venvs/ai
source ~/.venvs/ai/bin/activate

echo "=== 6. Python ML Stack ==="
pip install numpy pandas scikit-learn scipy matplotlib
pip install torch torchvision torchaudio
pip install mlx mlx-lm "mlx-lm[train]"
pip install transformers huggingface-hub safetensors accelerate sentencepiece tokenizers
pip install mlx-audio
pip install soundfile librosa pyaudio pydub
pip install jupyterlab

echo "=== 7. Browser Automation ==="
pip install playwright
playwright install

echo "=== 8. Ollama ==="
brew install ollama
ollama serve &
sleep 5
ollama pull qwen3:8b
ollama pull qwen3:32b
ollama pull qwen2.5-coder:32b

echo "=== 9. Databases ==="
brew install postgresql@16 pgvector redis
brew services start postgresql@16
brew services start redis

echo "=== 10. OpenClaw ==="
npm install -g openclaw@latest
export OLLAMA_API_KEY="ollama-local"
openclaw onboard --install-daemon

echo "=== 11. Apple Silicon Tuning ==="
sudo sysctl iogpu.wired_limit_mb=57344  # For 64GB model
pip install asitop  # GPU monitoring

echo "=== 12. Pull STT/TTS Models ==="
python -c "from mlx_audio.tts.utils import load_model; load_model('mlx-community/Kokoro-82M-bf16')"
python -c "from mlx_audio.tts.utils import load_model; load_model('mlx-community/Chatterbox-bf16')"
python -c "from mlx_audio.stt.generate import generate_transcription"

echo ""
echo "=== DONE! ==="
echo "Next steps:"
echo "  1. Start Ollama:    ollama serve"
echo "  2. Start OpenClaw:  openclaw gateway"
echo "  3. Configure model: openclaw config set agents.defaults.model.primary 'ollama/qwen3:32b'"
echo "  4. Pull more models as needed"
echo "  5. Set up voice pipeline with mlx_audio.server"
```

---

## Summary: Essential vs Nice-to-Have

### 🔴 Essential (Must Have)

- Homebrew, Node 22, Python 3.12, Git, pnpm
- ffmpeg, sox, audio libraries
- MLX + mlx-lm + mlx-audio
- Ollama + 2–3 core models (Qwen3 8B + 32B)
- PyTorch (MPS backend)
- PostgreSQL + pgvector
- OpenClaw

### 🟡 Nice-to-Have (Strongly Recommended)

- Playwright (browser automation)
- Redis (caching)
- mlx-lm[train] (LoRA fine-tuning)
- Jupyter (experimentation)
- asitop (monitoring)
- Additional models (coding, reasoning)

### 🟢 Optional (When Needed)

- Docker / OrbStack
- Supabase full stack
- Coqui TTS / Piper
- LM Studio (GUI)
- whisper.cpp standalone (mlx-audio covers this)

---

## Key Decisions Summary

| Decision | Recommendation | Why |
|----------|---------------|-----|
| Memory config | **64 GB** | Unlocks 70B models, comfortable fine-tuning |
| SSD | 1 TB minimum, 2 TB ideal | Models are large |
| LLM runtime | **Ollama** (primary) + **MLX LM** (fine-tuning) | Best integration + performance |
| Primary assistant model | **Qwen3 32B** | Best multilingual, tool calling, quality/size |
| STT | **mlx-audio Whisper Large v3 Turbo** | Native Apple Silicon, fast, accurate |
| TTS | **Kokoro 82M** (EN) + **Chatterbox** (HU/multi) | Fast + Hungarian support |
| Docker | **OrbStack** | Lighter than Docker Desktop |
| Database | **PostgreSQL + pgvector** | Simple, powerful, vector search |
| Python package manager | **uv** | Modern, fast |
| Fine-tuning | **MLX LM QLoRA** | Apple-native, memory efficient |

---

*This document should be updated as models improve and new tools emerge. Check the MLX Community on Hugging Face for latest model conversions: https://huggingface.co/mlx-community*
