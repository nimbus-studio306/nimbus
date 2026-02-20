# Mac Studio Concepts - Overview

Research prepared for Zsolt while he sleeps (2026-02-17)

## Hardware Reference
- **Mac Studio M1 Max**: 32GB unified memory, 512GB storage
- **Neural Engine**: 16-core, 15.8 TOPS
- **GPU**: 24-core or 32-core (M1 Max)
- **Comparable**: M4, M4 Pro machines

## Key Insight
Apple Silicon's unified memory architecture means the GPU and Neural Engine share RAM with the CPU. This enables running larger AI models than discrete GPU systems with equivalent VRAM.

32GB unified memory ≈ running models that would need 24GB+ VRAM on NVIDIA

## Document Structure

### 10 Specialized Multi-Machine Setups (01-10)
Each document describes a specialized role for a Mac in a fleet, optimized for specific workflows.

### 5 Individual Business Powerhouse Concepts (11-15)
Standalone Mac Studio setups that could run a business or be rented.

## Core Philosophy
- **Transform, don't generate** - Use AI to process existing materials
- **Rental model viable** - Stable systems that can be deployed and rented
- **Neural Engine leverage** - Local AI without cloud dependency

## Key Frameworks & Libraries
- **MLX** - Apple's ML framework optimized for Apple Silicon
- **Core ML** - Apple's native ML inference
- **Metal** - GPU compute
- **Whisper.cpp** - Local speech recognition
- **llama.cpp** - Local LLM inference
- **Stable Diffusion (Core ML)** - Image models
