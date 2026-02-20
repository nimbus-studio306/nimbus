# Concept 05: Voice Coding Center

## Role in Fleet
Voice-controlled development environment, dictation-to-code, accessible coding.

## Hardware Target
Mac Studio M1 Max (32GB) - needs both STT and LLM capabilities

## Core Capabilities
- **Voice-to-code**: Speak intentions, get working code
- **Hands-free navigation**: Control IDE with voice
- **Dictation**: Natural language to structured text
- **Code review by voice**: Discuss code, get explanations
- **Real-time transcription**: Meeting notes, pair programming
- **Accessibility**: Enable coding for motor-impaired developers

## Key Software Stack

### Speech Recognition
- **Whisper.cpp** (local, accurate, multilingual)
- **Vosk** (lightweight, real-time)
- **macOS Dictation** (built-in, Neural Engine)
- **Talon** (voice coding framework)

### Voice Coding Frameworks
- **Talon Voice** - Most powerful, scriptable
- **Cursorless** - Structural voice editing for VS Code
- **Serenade** - Natural language to code

### LLM Backend
- **Ollama + CodeLlama** - Code generation
- **Continue** - VS Code integration
- **Aider** - AI pair programming

### Text-to-Speech (for feedback)
- **macOS Say** (built-in)
- **Piper TTS** (local, natural voices)
- **Coqui TTS** (voice cloning)

## The Stack in Action
```
Voice Input → Whisper (STT) → Intent Parser → 
LLM (code generation) → IDE Action → 
TTS Confirmation (optional)
```

## Talon Setup
```bash
# Talon is the gold standard for voice coding
# Download from https://talonvoice.com

# Install Cursorless for VS Code
# Provides structural editing commands

# Example Talon commands:
# "define function hello" → def hello():
# "go line 50" → cursor to line 50
# "select funk" → select current function
```

## Rental Model Potential
- **Accessibility workstation**: €200-400/month
- **Voice dev environment setup**: €500-1000 one-time
- **Training + support**: €100-200/hour
- **Enterprise accessibility compliance**: €2000-5000

## Use Cases Beyond Accessibility
- **RSI prevention**: Reduce keyboard strain
- **Multitasking**: Code while hands are occupied
- **Rapid prototyping**: Faster than typing for some
- **Pair programming**: Both people can speak code

## MLX Integration
```python
# Real-time voice coding pipeline
import mlx_whisper
import mlx_lm

# Continuous listening
audio_stream = get_microphone_stream()

# Transcribe chunks
text = mlx_whisper.transcribe(audio_chunk)

# Parse intent and generate code
if is_code_request(text):
    code = mlx_lm.generate(
        model="codellama",
        prompt=f"Generate code: {text}"
    )
    insert_into_editor(code)
```

## Hardware Additions
- **Quality microphone**: Blue Yeti, Shure MV7
- **Noise-canceling**: Important for accuracy
- **Foot pedal**: Push-to-talk option
