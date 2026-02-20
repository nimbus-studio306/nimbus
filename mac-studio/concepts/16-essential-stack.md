# Essential Stack: What to Learn

## Priority 1: Core Frameworks

### MLX (Apple Machine Learning)
**Why**: Native Apple Silicon ML framework, fastest local inference
```bash
pip install mlx mlx-lm mlx-whisper
```
- MLX-LM: Run LLMs locally
- MLX-Whisper: Speech recognition
- MLX-Stable-Diffusion: Image generation
- **Learn**: https://github.com/ml-explore/mlx

### llama.cpp
**Why**: Run any GGUF model, Metal-optimized
```bash
brew install llama.cpp
```
- Most compatible with model ecosystem
- Best performance for chat/completion
- **Learn**: https://github.com/ggerganov/llama.cpp

### Whisper.cpp
**Why**: Best local speech recognition
```bash
brew install whisper-cpp
```
- Real-time capable
- 100+ languages
- **Learn**: https://github.com/ggerganov/whisper.cpp

## Priority 2: Orchestration

### Ollama
**Why**: Simplest way to run local models
```bash
brew install ollama
ollama pull mistral
ollama pull codellama
```
- API at localhost:11434
- Easy model management
- **Learn**: https://ollama.ai

### ComfyUI
**Why**: Most powerful Stable Diffusion workflows
```bash
git clone https://github.com/comfyanonymous/ComfyUI
```
- Node-based, visual
- Runs on MPS (Metal)
- **Learn**: https://github.com/comfyanonymous/ComfyUI

## Priority 3: Media Processing

### FFmpeg
**Why**: Universal media tool, VideoToolbox hardware acceleration
```bash
brew install ffmpeg
```
- Transcode anything
- Extract audio
- Burn subtitles
- **Learn**: https://ffmpeg.org/documentation.html

### ImageMagick
**Why**: Batch image processing
```bash
brew install imagemagick
```
- Resize, convert, composite
- Scriptable
- **Learn**: https://imagemagick.org

## Priority 4: Python Ecosystem

### Essential Libraries
```bash
# ML/AI
pip install torch torchvision  # PyTorch (MPS backend)
pip install transformers       # Hugging Face
pip install langchain          # LLM orchestration

# Audio
pip install librosa soundfile pydub
pip install pyannote-audio     # Speaker diarization

# Image
pip install pillow opencv-python
pip install realesrgan rembg   # Enhancement

# Video
pip install moviepy
pip install yt-dlp             # Download videos
```

## Priority 5: Development Tools

### Docker Alternative
```bash
brew install orbstack  # or colima
```
- OrbStack: Best Docker experience on Mac
- Native ARM containers
- Lower overhead than Docker Desktop

### VS Code + Extensions
- **Continue**: Local AI coding assistant
- **GitHub Copilot**: If using API
- **Cursor**: AI-native editor (separate app)

## Learning Path

### Week 1-2: Foundations
1. Install Ollama, run mistral
2. Set up Whisper.cpp, transcribe files
3. Learn basic FFmpeg commands
4. Explore MLX examples

### Week 3-4: Integration
1. Build a simple pipeline (audio → transcript → summary)
2. Set up ComfyUI for image work
3. Create batch processing scripts
4. Connect tools via Python

### Month 2: Specialization
1. Pick 2-3 concepts from the list
2. Build working prototypes
3. Test with real projects
4. Document workflows

### Month 3: Productization
1. Create rental-ready configurations
2. Write setup scripts
3. Build monitoring
4. Prepare documentation for clients

## Key Resources

### Documentation
- MLX: https://ml-explore.github.io/mlx/
- Hugging Face: https://huggingface.co/docs
- LangChain: https://python.langchain.com/

### Communities
- MLX Discord
- LocalLLaMA subreddit
- Hugging Face forums

### YouTube Channels
- Sam Witteveen (LangChain/RAG)
- Matt Williams (Ollama)
- Sebastian Raschka (ML fundamentals)
