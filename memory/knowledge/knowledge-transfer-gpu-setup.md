# Knowledge Transfer: OpenClaw + Knowledge Graph + GPU Setup

> **Author:** Nimbus  
> **Created:** 2026-02-06  
> **Target:** Ubuntu 22.04+ with NVIDIA GPU (3090/5090)  
> **Purpose:** Reproduce and extend the full AI assistant stack

---

## Overview — What We Built

This setup combines:
1. **OpenClaw** — the AI gateway (manages sessions, tools, channels, memory)
2. **Knowledge Graph** — PostgreSQL with entity extraction + semantic search
3. **Multi-Model Access** — Claude (primary), Gemini (STT/TTS/vision), local models via Ollama
4. **Custom Tools** — email, graph queries, database sync, cost tracking
5. **Workspace System** — structured memory, daily logs, research docs

With a GPU, you add:
- **Local LLM inference** — faster, cheaper, private
- **Local STT/TTS** — Whisper, Kokoro, etc.
- **LoRA fine-tuning** — custom adapters for personality/knowledge
- **Resource pooling** — multiple models loaded, shared across instances

---

## Part 1: Core OpenClaw Setup

### Prerequisites (Ubuntu)

```bash
# System packages
sudo apt update && sudo apt install -y \
  git curl wget build-essential \
  docker.io docker-compose-v2 \
  postgresql-client \
  ffmpeg tesseract-ocr poppler-utils \
  python3 python3-pip python3-venv

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# pnpm (OpenClaw uses it)
npm install -g pnpm
```

### Clone and Build OpenClaw

```bash
cd ~
git clone https://github.com/openclaw/openclaw.git
cd openclaw

# Install dependencies
pnpm install

# Build
pnpm build
pnpm ui:build

# Create config directory
mkdir -p ~/.openclaw
```

### Minimal Config (openclaw.json)

```json
{
  "gateway": {
    "bind": "lan",
    "port": 18789,
    "auth": { "token": "your-secret-token-here" }
  },
  "sandbox": { "enabled": false },
  "models": {
    "default": "anthropic/claude-sonnet-4-20250514",
    "providers": {
      "anthropic": { "apiKey": "${ANTHROPIC_API_KEY}" },
      "google": { "apiKey": "${GEMINI_API_KEY}" }
    }
  },
  "memorySearch": {
    "enabled": true,
    "provider": "gemini",
    "model": "gemini-embedding-001"
  }
}
```

### Run with Docker

```bash
# Build Docker image
docker build -t openclaw:local .

# Run container
docker run -d \
  --name openclaw \
  -p 18789:18789 \
  -v ~/.openclaw:/home/node/.openclaw \
  -e ANTHROPIC_API_KEY="your-key" \
  -e GEMINI_API_KEY="your-key" \
  --restart unless-stopped \
  openclaw:local
```

### Or Run Directly (development)

```bash
cd ~/openclaw
ANTHROPIC_API_KEY="..." GEMINI_API_KEY="..." pnpm gateway
```

---

## Part 2: Workspace Structure

The workspace is where the agent's personality, memory, and tools live.

```
~/.openclaw/workspace/
├── AGENTS.md          # How the agent should behave
├── SOUL.md            # Personality, tone, rules
├── USER.md            # Info about the user
├── TOOLS.md           # Local tool notes
├── MEMORY.md          # Curated long-term memory
├── HEARTBEAT.md       # Periodic task checklist
├── TODO.md            # Active tasks
├── memory/
│   ├── YYYY-MM-DD.md  # Daily logs
│   ├── knowledge/     # Research docs, guides
│   └── graph-context.md  # Hot entities from knowledge graph
├── *.py, *.js         # Custom scripts
└── .env.*             # Credentials (gitignored)
```

Key files from my setup you should copy:
- `AGENTS.md` — session startup behavior, memory rules
- `SOUL.md` — personality (customize this!)
- The memory/ structure

---

## Part 3: Knowledge Graph (PostgreSQL)

### Why a Knowledge Graph?

OpenClaw's built-in memory is flat text + vector search. Good for recall, but no relationships. The knowledge graph adds:
- **Entities** — people, projects, concepts with properties
- **Edges** — relationships between entities (works_on, knows, depends_on)
- **Semantic search** — find entities by meaning, not just keywords
- **Context injection** — hot entities loaded into agent context

### Database Schema

```sql
-- Schema for one assistant instance
CREATE SCHEMA project_openclaw_agent1;
SET search_path TO project_openclaw_agent1;

-- Entities (nodes)
CREATE TABLE nodes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL,  -- person, project, concept, tool, etc.
  properties JSONB DEFAULT '{}',
  embedding VECTOR(768),  -- for semantic search
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relationships (edges)
CREATE TABLE edges (
  id SERIAL PRIMARY KEY,
  source_id INT REFERENCES nodes(id) ON DELETE CASCADE,
  target_id INT REFERENCES nodes(id) ON DELETE CASCADE,
  relation TEXT NOT NULL,  -- works_on, knows, uses, depends_on, etc.
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- For tracking what's been processed
CREATE TABLE extraction_queue (
  id SERIAL PRIMARY KEY,
  source_type TEXT NOT NULL,  -- message, email, document
  source_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending, processing, done, error
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Sessions and messages (optional, for full persistence)
CREATE TABLE structured_sessions (
  id SERIAL PRIMARY KEY,
  session_key TEXT UNIQUE NOT NULL,
  channel TEXT,
  started_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE structured_messages (
  id SERIAL PRIMARY KEY,
  session_id INT REFERENCES structured_sessions(id),
  message_id TEXT,
  role TEXT NOT NULL,
  content TEXT,
  timestamp TIMESTAMPTZ,
  embedding VECTOR(768)
);

-- Indexes
CREATE INDEX idx_nodes_embedding ON nodes USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_nodes_type ON nodes(entity_type);
CREATE INDEX idx_edges_source ON edges(source_id);
CREATE INDEX idx_edges_target ON edges(target_id);
CREATE INDEX idx_messages_embedding ON structured_messages USING ivfflat (embedding vector_cosine_ops);
```

### Entity Extraction Script (graph-extract.py)

This uses Gemini to extract entities from messages:

```python
#!/usr/bin/env python3
"""Extract entities and relationships from messages using Gemini."""

import os
import json
import psycopg2
from psycopg2.extras import Json
import google.generativeai as genai

# Config
DB_CONFIG = {
    'host': os.environ.get('DB_HOST', 'localhost'),
    'port': os.environ.get('DB_PORT', '5432'),
    'user': os.environ.get('DB_USER'),
    'password': os.environ.get('DB_PASSWORD'),
    'dbname': os.environ.get('DB_NAME'),
    'options': f"-c search_path={os.environ.get('DB_SCHEMA', 'public')}"
}

genai.configure(api_key=os.environ.get('GEMINI_API_KEY'))

EXTRACTION_PROMPT = """Extract entities and relationships from this message.

Message:
{content}

Return JSON:
{{
  "entities": [
    {{"name": "...", "type": "person|project|concept|tool|place|org", "properties": {{...}}}}
  ],
  "relationships": [
    {{"source": "entity_name", "relation": "works_on|knows|uses|etc", "target": "entity_name"}}
  ]
}}

Only extract clear, factual information. Skip vague references."""

def extract_entities(content: str) -> dict:
    model = genai.GenerativeModel('gemini-2.0-flash')
    response = model.generate_content(EXTRACTION_PROMPT.format(content=content))
    
    # Parse JSON from response
    text = response.text
    if '```json' in text:
        text = text.split('```json')[1].split('```')[0]
    return json.loads(text)

def get_or_create_node(conn, name: str, entity_type: str, properties: dict = None) -> int:
    with conn.cursor() as cur:
        # Check if exists
        cur.execute("SELECT id FROM nodes WHERE LOWER(name) = LOWER(%s)", (name,))
        row = cur.fetchone()
        if row:
            return row[0]
        
        # Create new
        cur.execute(
            "INSERT INTO nodes (name, entity_type, properties) VALUES (%s, %s, %s) RETURNING id",
            (name, entity_type, Json(properties or {}))
        )
        return cur.fetchone()[0]

def create_edge(conn, source_id: int, target_id: int, relation: str, properties: dict = None):
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO edges (source_id, target_id, relation, properties) 
               VALUES (%s, %s, %s, %s) 
               ON CONFLICT DO NOTHING""",
            (source_id, target_id, relation, Json(properties or {}))
        )

def process_message(conn, message_id: str, content: str):
    try:
        result = extract_entities(content)
        
        # Create nodes
        node_ids = {}
        for entity in result.get('entities', []):
            node_id = get_or_create_node(
                conn, entity['name'], entity['type'], entity.get('properties')
            )
            node_ids[entity['name']] = node_id
        
        # Create edges
        for rel in result.get('relationships', []):
            source_id = node_ids.get(rel['source'])
            target_id = node_ids.get(rel['target'])
            if source_id and target_id:
                create_edge(conn, source_id, target_id, rel['relation'])
        
        conn.commit()
        return len(result.get('entities', [])), len(result.get('relationships', []))
    
    except Exception as e:
        conn.rollback()
        print(f"Error processing {message_id}: {e}")
        return 0, 0
```

### Graph Query Script (graph-query.py)

```python
#!/usr/bin/env python3
"""Query the knowledge graph with semantic search."""

import os
import sys
import psycopg2
import google.generativeai as genai
import numpy as np

DB_CONFIG = {...}  # same as above

genai.configure(api_key=os.environ.get('GEMINI_API_KEY'))

def get_embedding(text: str) -> list:
    result = genai.embed_content(
        model='models/embedding-001',
        content=text,
        task_type='retrieval_query'
    )
    return result['embedding']

def search(query: str, limit: int = 10):
    embedding = get_embedding(query)
    
    conn = psycopg2.connect(**DB_CONFIG)
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, name, entity_type, properties,
                   1 - (embedding <=> %s::vector) as similarity
            FROM nodes
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """, (embedding, embedding, limit))
        
        results = cur.fetchall()
        for r in results:
            print(f"{r[1]} ({r[2]}) - {r[4]:.3f}")
            if r[3]:
                print(f"  Properties: {r[3]}")

def traverse(node_id: int, depth: int = 2):
    conn = psycopg2.connect(**DB_CONFIG)
    with conn.cursor() as cur:
        cur.execute("""
            WITH RECURSIVE graph AS (
                SELECT id, name, entity_type, 0 as depth
                FROM nodes WHERE id = %s
                
                UNION ALL
                
                SELECT n.id, n.name, n.entity_type, g.depth + 1
                FROM nodes n
                JOIN edges e ON (e.target_id = n.id OR e.source_id = n.id)
                JOIN graph g ON (e.source_id = g.id OR e.target_id = g.id)
                WHERE g.depth < %s AND n.id != g.id
            )
            SELECT DISTINCT id, name, entity_type, depth FROM graph ORDER BY depth
        """, (node_id, depth))
        
        for row in cur.fetchall():
            indent = "  " * row[3]
            print(f"{indent}{row[1]} ({row[2]})")

if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'help'
    if cmd == 'search':
        search(' '.join(sys.argv[2:]))
    elif cmd == 'traverse':
        traverse(int(sys.argv[2]), int(sys.argv[3]) if len(sys.argv) > 3 else 2)
    elif cmd == 'stats':
        conn = psycopg2.connect(**DB_CONFIG)
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM nodes")
            print(f"Nodes: {cur.fetchone()[0]}")
            cur.execute("SELECT COUNT(*) FROM edges")
            print(f"Edges: {cur.fetchone()[0]}")
```

---

## Part 4: GPU-Specific Setup (3090/5090)

### NVIDIA Drivers + CUDA

```bash
# Add NVIDIA repo
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.1-1_all.deb
sudo dpkg -i cuda-keyring_1.1-1_all.deb
sudo apt update

# Install drivers + CUDA
sudo apt install -y nvidia-driver-550 cuda-toolkit-12-4

# Verify
nvidia-smi
```

### Ollama (Local LLM Server)

```bash
# Install
curl -fsSL https://ollama.ai/install.sh | sh

# Start service
sudo systemctl enable ollama
sudo systemctl start ollama

# Pull models (adjust for your VRAM)
# 3090 (24GB): up to ~14B models, or 30B quantized
# 5090 (32GB): up to ~30B models comfortably

ollama pull qwen2.5:14b
ollama pull deepseek-coder-v2:16b
ollama pull llama3.1:8b

# Verify
ollama list
curl http://localhost:11434/api/tags
```

### Add Ollama to OpenClaw Config

```json
{
  "models": {
    "providers": {
      "anthropic": { "apiKey": "${ANTHROPIC_API_KEY}" },
      "google": { "apiKey": "${GEMINI_API_KEY}" },
      "ollama": {
        "baseUrl": "http://localhost:11434",
        "api": "ollama"
      }
    }
  }
}
```

Now you can use `ollama/qwen2.5:14b` as a model in OpenClaw!

### Local STT (Whisper)

```bash
# whisper.cpp with CUDA
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp
make GGML_CUDA=1

# Download model
./models/download-ggml-model.sh large-v3-turbo

# Test
./main -m models/ggml-large-v3-turbo.bin -f audio.wav
```

### Local TTS (Kokoro/Piper)

```bash
# Piper (fast, lightweight)
pip install piper-tts

# Download voices
piper --download-dir ~/.local/share/piper/voices \
  --model en_US-amy-medium --output-file test.wav "Hello world"
```

### vLLM (Advanced: Multi-Model Serving with Pooling)

For the resource pool concept — serving multiple models efficiently:

```bash
pip install vllm

# Run as API server
python -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen2.5-14B-Instruct \
  --gpu-memory-utilization 0.8 \
  --port 8000
```

vLLM supports dynamic batching, PagedAttention, and can swap models. This is the foundation for the job_executor/resource pool architecture.

---

## Part 5: Multi-Model Function Calls

### How It Works in My Setup

1. **Primary (Claude)** — main agent brain, complex reasoning
2. **Gemini** — STT (audio transcription), TTS, vision, embeddings
3. **Local (Ollama)** — fast responses, code completion, privacy-sensitive tasks

OpenClaw routes based on model prefix: `anthropic/...`, `google/...`, `ollama/...`

### Calling Different Models from Agent

The agent can use `sessions_spawn` with a different model:

```python
# Spawn a sub-agent with a local model
sessions_spawn(
    task="Analyze this code and suggest improvements",
    model="ollama/deepseek-coder-v2:16b",
    cleanup="delete"
)
```

### Custom Script for Multi-Model Orchestration

```javascript
// orchestrate.js — call the right model for the task
const ROUTING = {
  code: 'ollama/deepseek-coder-v2:16b',
  quick: 'ollama/llama3.1:8b',
  reasoning: 'anthropic/claude-sonnet-4-20250514',
  vision: 'google/gemini-2.0-flash'
};

async function routeTask(task, type = 'reasoning') {
  const model = ROUTING[type];
  // ... call appropriate API
}
```

---

## Part 6: Essential Scripts to Copy

From my workspace, these are the key scripts:

| Script | Purpose |
|--------|---------|
| `check-email.js` | IMAP inbox polling |
| `send-email.js` | SMTP sending with DKIM |
| `graph-extract.py` | Entity extraction to knowledge graph |
| `graph-query.py` | Semantic search on graph |
| `db-watcher.py` | Real-time sync JSONL → PostgreSQL |
| `batch-embed.py` | Generate embeddings for all nodes |
| `startup.sh` | Run on container start |

---

## Part 7: Putting It All Together

### Startup Sequence

1. PostgreSQL running (local or remote)
2. Ollama running (`ollama serve`)
3. OpenClaw container starts
4. `startup.sh` runs inside container:
   - Starts `db-watcher.py` (background)
   - Runs `batch-embed.py` (updates embeddings)
5. Agent wakes up, reads MEMORY.md + today's log

### Docker Compose (Full Stack)

```yaml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: openclaw
      POSTGRES_PASSWORD: your-password
      POSTGRES_DB: openclaw
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_models:/root/.ollama
    ports:
      - "11434:11434"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  openclaw:
    build: .
    depends_on:
      - postgres
      - ollama
    environment:
      - ANTHROPIC_API_KEY
      - GEMINI_API_KEY
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USER=openclaw
      - DB_PASSWORD=your-password
      - DB_NAME=openclaw
    volumes:
      - ~/.openclaw:/home/node/.openclaw
    ports:
      - "18789:18789"

volumes:
  pgdata:
  ollama_models:
```

---

## Summary

**What makes this setup powerful:**

1. **OpenClaw** handles the orchestration — sessions, memory, tools, channels
2. **Knowledge graph** gives relational memory — who knows who, what depends on what
3. **Multi-model** — right model for the job, local + cloud
4. **GPU acceleration** — fast local inference, training, no API costs for routine tasks
5. **Structured workspace** — personality, memory, tools all version-controlled

**To reproduce:**
1. Install prerequisites (Docker, Node, Python, NVIDIA drivers)
2. Clone OpenClaw, configure with your API keys
3. Set up PostgreSQL with pgvector for knowledge graph
4. Install Ollama + pull models that fit your GPU
5. Copy workspace structure (AGENTS.md, SOUL.md, memory/, scripts)
6. Run and let it learn!

The scripts are in my workspace and can be exported. Want me to package them?
