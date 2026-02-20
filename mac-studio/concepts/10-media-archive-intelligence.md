# Concept 10: Media Archive Intelligence

## Role in Fleet
AI-powered media asset management, search, and organization.

## Hardware Target
Mac Studio M1 Max (32GB) - needs to process and index large media libraries

## Core Capabilities
- **Visual search**: Find images by description
- **Face recognition**: Group photos by person
- **Scene detection**: Auto-tag video segments
- **Audio indexing**: Search spoken content
- **Duplicate detection**: Find similar/duplicate files
- **Auto-tagging**: AI-generated keywords
- **Natural language search**: "Show me sunset photos from 2023"

## The Problem This Solves
Photographers, videographers, and media companies have MASSIVE archives:
- Millions of photos/videos
- Impossible to manually tag
- Search is limited to filenames
- Finding specific content takes hours

## Key Software Stack

### Media Management
- **PhotoPrism** (self-hosted Google Photos)
- **Immich** (modern, fast, AI-powered)
- **Plex** (video library)
- **Jellyfin** (open-source Plex alternative)

### AI Vision
- **CLIP** (image-text similarity)
- **BLIP** (image captioning)
- **YOLOv8** (object detection)
- **InsightFace** (face recognition)
- **OpenCV** (computer vision basics)

### Search & Indexing
- **Meilisearch** (fast search)
- **Elasticsearch** (enterprise search)
- **ChromaDB** (vector embeddings)
- **SQLite** (lightweight metadata)

### MLX Native
- **mlx-clip** (CLIP on Apple Silicon)
- **mlx-vlm** (vision-language models)

## Architecture
```
Media Files → 
  Processing Pipeline →
    Visual Features (CLIP) →
    Face Embeddings (InsightFace) →
    Audio Transcription (Whisper) →
    Object Detection (YOLO) →
  Vector Database →
    Natural Language Search
```

## Rental Model Potential
- **Archive indexing**: €0.01-0.05 per file
- **Monthly hosting**: €100-500 depending on size
- **Search API access**: €50-200/month
- **Face recognition setup**: €200-500
- **Custom training**: €1000-5000 (for specific content types)

## PhotoPrism Setup
```bash
# Docker-based setup (using OrbStack)
docker pull photoprism/photoprism:latest

# Run with config
docker run -d \
  --name photoprism \
  -p 2342:2342 \
  -v ~/Pictures:/photoprism/originals \
  -v ~/photoprism-storage:/photoprism/storage \
  -e PHOTOPRISM_ADMIN_PASSWORD="secure" \
  photoprism/photoprism

# Access at localhost:2342
```

## Immich Setup (Modern Alternative)
```bash
# Clone immich
git clone https://github.com/immich-app/immich
cd immich/docker

# Configure environment
cp .env.example .env
# Edit .env with settings

# Start
docker compose up -d
```

## Custom CLIP Search
```python
import mlx_clip
from pathlib import Path
import chromadb

# Initialize CLIP
clip = mlx_clip.load("ViT-B-32")

# Index images
def index_image(path):
    embedding = clip.encode_image(path)
    return embedding

# Search by text
def search(query, collection):
    text_embedding = clip.encode_text(query)
    results = collection.query(
        query_embeddings=[text_embedding],
        n_results=10
    )
    return results

# Example: "sunset on beach"
results = search("sunset on beach", image_collection)
```

## Storage Considerations
- Thumbnails and previews: Fast SSD
- Original files: NAS/external
- Vector embeddings: ~1KB per image
- 1 million images ≈ 1GB vectors + 100GB thumbnails
