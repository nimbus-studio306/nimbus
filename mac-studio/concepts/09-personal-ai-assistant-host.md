# Concept 09: Personal AI Assistant Host

## Role in Fleet
Run a complete AI assistant like Nimbus/OpenClaw for clients.

## Hardware Target
Mac Studio M1 Max (32GB) or even M4 (16GB sufficient for assistant + small models)

## Core Capabilities
- **Always-on assistant**: 24/7 availability
- **Multi-channel**: WhatsApp, Telegram, Signal, Discord
- **Memory & context**: Knowledge graph, long-term memory
- **Tool use**: Email, calendar, web search, file management
- **Voice interface**: TTS + STT
- **Local AI**: Privacy-preserving, no cloud LLM required

## The OpenClaw Stack
What you've built is the template:
- **OpenClaw**: Gateway, channels, tools
- **Claude/GPT API** or **local Ollama**: LLM backend
- **PostgreSQL**: Knowledge graph, message storage
- **Cloudflare Tunnel**: Secure exposure
- **Whisper**: Speech-to-text
- **Edge TTS/Google TTS**: Text-to-speech

## Key Software Stack

### Core
- **Node.js** (OpenClaw runtime)
- **PostgreSQL** (structured storage)
- **Redis** (optional, caching)

### LLM Options
- **Claude API**: Best quality, requires API key
- **GPT-4 API**: Good alternative
- **Ollama + Mistral**: Fully local, no API costs
- **MLX + local models**: Native Apple Silicon

### Channels
- **WhatsApp Business API** or **whatsapp-web.js**
- **Telegram Bot API**
- **Signal-cli**
- **Discord.js**

### Voice
- **Whisper.cpp**: Local STT
- **Edge TTS**: Free, good quality
- **ElevenLabs**: Premium voices (API)

## Rental Model Potential
- **Personal AI assistant**: €50-150/month
- **Business assistant**: €200-500/month
- **Setup + customization**: €500-2000
- **Training/onboarding**: €100-200/hour
- **White-label solution**: €1000-5000 + monthly

## What Makes This Valuable
1. **Privacy**: Data stays on controlled infrastructure
2. **Customization**: SOUL.md, MEMORY.md, custom tools
3. **Integration**: Connects to client's services
4. **Availability**: Always on, always responsive
5. **Cost**: After setup, mostly just electricity

## Setup Overview
```bash
# Install OpenClaw
npm install -g openclaw

# Configure
openclaw configure

# Start gateway
openclaw gateway start

# Set up Cloudflare tunnel
cloudflared tunnel create nimbus
cloudflared tunnel route dns nimbus assistant.domain.com

# Run as service
sudo openclaw gateway service install
```

## Client Onboarding Flow
1. Initial consultation (understand needs)
2. Set up Mac with base system
3. Configure channels (WhatsApp, etc.)
4. Customize SOUL.md for personality
5. Set up initial MEMORY.md
6. Configure tools (email, calendar)
7. Training session with client
8. Monitoring + adjustments

## Scaling
Each Mac can host 1-3 AI assistants depending on usage:
- Separate user accounts
- Isolated OpenClaw instances
- Shared Ollama backend (if using local models)
