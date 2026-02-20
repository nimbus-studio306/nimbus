# Concept 03: Photo Processing Hub

## Role in Fleet
Batch photo editing, AI enhancement, cataloging, and professional retouching.

## Hardware Target
Mac Studio M1 Max (32GB) or even M4 (sufficient for photos)

## Core Capabilities
- **Batch RAW processing**: Convert thousands of RAWs efficiently
- **AI upscaling**: Enhance resolution for print
- **Object removal**: Clean up backgrounds, remove distractions
- **Face retouching**: Skin smoothing, blemish removal
- **Color grading**: Apply consistent looks across sets
- **Cataloging**: AI-powered tagging and organization
- **Background replacement**: Portrait extraction and compositing

## Key Software Stack

### Photo Processing
- **Adobe Lightroom Classic** (batch processing, presets)
- **Capture One** (tethered shooting, color science)
- **DxO PhotoLab** (excellent noise reduction)
- **Affinity Photo** (one-time purchase, powerful)
- **darktable** (free, open source)

### AI Enhancement
- **Topaz Photo AI** (denoise, sharpen, upscale)
- **Real-ESRGAN** (open source upscaling)
- **Stable Diffusion** (inpainting, outpainting)
- **rembg** (background removal)
- **GFPGAN/CodeFormer** (face restoration)

### Command Line
- **ImageMagick** (batch operations)
- **ExifTool** (metadata management)

### Python Libraries
- **Pillow** (PIL fork, image manipulation)
- **opencv-python** (computer vision)
- **rawpy** (RAW file reading)

## MLX Opportunities
- Run SDXL locally for inpainting
- Face detection and enhancement models
- Style transfer
- Automatic culling (select best shots from a set)

## Rental Model Potential
- **Wedding culling service**: €50-100 per event (AI selects best 500 from 5000)
- **Batch retouching**: €1-3 per image
- **AI upscaling**: €0.50-2 per image
- **Background removal**: €0.20-0.50 per image

## Workflow Example: Event Photography
1. Photographer uploads 3000 RAW files
2. AI culls to top 800 (sharpness, exposure, faces, duplicates)
3. Batch apply color preset
4. Export JPEGs + web-sized
5. Generate proof gallery
6. Apply retouching to selected finals

## Setup Commands
```bash
# Image processing tools
brew install imagemagick exiftool

# Python image stack
pip install pillow opencv-python rawpy

# Background removal
pip install rembg

# Real-ESRGAN for upscaling
pip install realesrgan
```

## Storage Strategy
- RAW files are large (30-60MB each)
- External SSD for active projects
- Archive processed JPEGs, keep RAWs on NAS
- 512GB internal for software + active work
