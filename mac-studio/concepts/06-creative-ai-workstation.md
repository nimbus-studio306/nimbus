# Concept 06: Creative AI Workstation

## Role in Fleet
Image generation, style transfer, creative exploration - but focused on EDITING not generating from scratch.

## Hardware Target
Mac Studio M1 Max (32GB) - good for SD, SDXL runs but slower than dedicated GPU

## Core Philosophy
**Transform existing materials, don't replace them.**
- Enhance photos, don't generate fake ones
- Apply styles to real footage
- Composite intelligently
- Expand canvases, don't fabricate scenes

## Core Capabilities
- **Inpainting**: Remove objects, fill gaps naturally
- **Outpainting**: Extend canvas edges
- **Style transfer**: Apply artistic styles to photos/video
- **Upscaling**: AI-enhanced resolution increase
- **Colorization**: Add color to B&W footage
- **Restoration**: Fix old/damaged photos
- **Compositing**: Intelligent blending of elements

## Key Software Stack

### Stable Diffusion
- **AUTOMATIC1111** (feature-rich web UI)
- **ComfyUI** (node-based, powerful workflows)
- **DiffusionBee** (Mac-native, simple)
- **Draw Things** (iOS/Mac native)

### MLX Native
- **mlx-stable-diffusion** (Apple's port)
- **mflux** (optimized FLUX implementation)

### Style Transfer
- **Neural Style Transfer** (classic algorithm)
- **Real-Time Style Transfer** (video capable)
- **ControlNet** (guided generation)

### Restoration
- **GFPGAN** (face restoration)
- **CodeFormer** (face/image restoration)
- **DeOldify** (colorization)
- **Real-ESRGAN** (upscaling)

## Ethical Boundaries (Important)
This workstation should be configured with guardrails:
- **No deepfakes** - No face replacement without consent
- **No fake photos** - Editing, not fabrication
- **Watermarking** - AI-assisted content marked
- **Consent** - Only process authorized materials

## Rental Model Potential
- **Photo restoration service**: €20-50 per image
- **Style transfer for artists**: €10-30 per piece
- **Batch enhancement**: €100-300 per project
- **Canvas extension**: €15-40 per image
- **Colorization**: €30-100 per image

## Workflow Example: Photo Restoration
1. Scan old damaged photo
2. AI removes scratches and tears (inpainting)
3. Upscale to modern resolution
4. Enhance faces (GFPGAN)
5. Optionally colorize
6. Export print-ready file

## MLX Stable Diffusion Setup
```bash
# Clone MLX SD implementation
git clone https://github.com/ml-explore/mlx-examples
cd mlx-examples/stable_diffusion

# Install dependencies
pip install -r requirements.txt

# Run inpainting
python txt2img.py --prompt "restore this photo" \
  --init-image damaged.jpg \
  --mask mask.png \
  --strength 0.7
```

## ComfyUI Setup (More Powerful)
```bash
# ComfyUI for complex workflows
git clone https://github.com/comfyanonymous/ComfyUI
cd ComfyUI
pip install -r requirements.txt

# Download models to models/ folder
# Run with MPS (Metal) backend
python main.py --force-fp16
```

## Performance Notes
- SDXL: ~30-60 seconds per image on M1 Max
- SD 1.5: ~10-20 seconds per image
- Batch processing: Queue overnight
- Video style transfer: Real-time not feasible, batch process
