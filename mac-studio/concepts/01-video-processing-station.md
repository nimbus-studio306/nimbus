# Concept 01: Video Processing Station

## Role in Fleet
Dedicated video transcoding, color grading, and AI-enhanced editing.

## Hardware Target
Mac Studio M1 Max (32GB) or M4 Pro

## Core Capabilities
- **Proxy generation**: Convert 4K/6K/8K footage to editing proxies
- **Transcoding**: H.264, H.265/HEVC, ProRes conversions
- **Color grading**: DaVinci Resolve with Neural Engine acceleration
- **AI upscaling**: Frame interpolation, resolution enhancement
- **Object removal**: AI-powered cleanup of footage
- **Auto-editing**: Scene detection, highlight extraction

## Key Software Stack

### Video Processing
- **FFmpeg** (with VideoToolbox hardware acceleration)
- **HandBrake** (Metal-accelerated)
- **DaVinci Resolve** (free version powerful enough)
- **Compressor** (Apple's transcoding tool)

### AI Enhancement
- **Topaz Video AI** (upscaling, frame interpolation)
- **Real-ESRGAN** (MLX port for upscaling)
- **RIFE** (frame interpolation)

### Automation
- **folder actions** or **Hazel** for watch folders
- **Python + MoviePy** for scripted processing

## MLX Opportunities
- Run video understanding models locally
- Scene classification
- Content-aware editing suggestions
- Automatic B-roll matching

## Rental Model Potential
- **Per-hour transcoding**: €5-15/hour depending on resolution
- **Project-based**: €50-200 for wedding/event video processing
- **Monthly subscription**: €200-500 for unlimited proxy generation

## Storage Considerations
512GB internal is limiting for video. Recommend:
- External Thunderbolt SSD array
- NAS for archive
- Work on external, archive to NAS

## Setup Commands
```bash
# Install FFmpeg with hardware acceleration
brew install ffmpeg

# Install Python video tools
pip install moviepy opencv-python

# MLX for AI processing
pip install mlx mlx-examples
```

## Workflow Example
1. Client uploads raw footage to watch folder
2. System auto-generates proxies
3. AI analyzes content, suggests cuts
4. Exports in multiple formats
5. Notifies client via webhook
