# LoRA Memory Modules — Deep Dive Research

*Last updated: 2026-02-05*

## Overview

LoRA (Low-Rank Adaptation) adapters can serve as "memory modules" — persistent, specialized knowledge that augments a base model without full fine-tuning. This document covers the complete lifecycle from data selection through deployment and versioning.

---

## 1. What is a Memory Module?

A LoRA "memory module" is a small adapter (~1-50MB) trained on specific data to give a base model:
- **Domain knowledge**: Legal, medical, coding, company-specific terminology
- **Style/persona**: Writing voice, personality, communication patterns
- **Task specialization**: SQL generation, summarization, classification
- **Personal context**: User preferences, conversation patterns, learned behaviors

### Why LoRA for Memory?
| Approach | Training Cost | Storage | Inference Speed | Composability |
|----------|--------------|---------|-----------------|---------------|
| Full fine-tune | Very high | Full model (~14GB for 7B) | Same | None |
| LoRA adapter | Low (~1-5% params) | 10-100MB | Same (after merge) | Excellent |
| RAG only | None | Vector DB | Slower (retrieval) | N/A |
| Prompt stuffing | None | None | Slower (long context) | Limited |

---

## 2. Data Pipeline: Selecting & Formatting Training Data

### Data Sources for OpenClaw Sessions

```
structured_messages (PostgreSQL)
├── Conversations (role: user/assistant)
├── Tool calls and results
├── System instructions
└── Metadata (timestamps, costs, channels)
```

### Selection Criteria

**Good training data:**
- Clear question → quality answer pairs
- Domain-specific exchanges (legal, medical, technical)
- Style-defining conversations (humor, formality, brevity)
- Successful task completions
- User preference signals (corrections, "yes that's right")

**Bad training data:**
- Tool-heavy exchanges (mostly exec outputs)
- Error recovery / debugging sessions
- Very short or fragmentary exchanges
- Private/sensitive content
- Ambiguous or incorrect responses

### Data Extraction Query

```sql
-- Extract high-quality conversation pairs
SELECT 
    m1.content as user_message,
    m2.content as assistant_response,
    m1.session_key,
    m1.timestamp
FROM structured_messages m1
JOIN structured_messages m2 
    ON m1.session_key = m2.session_key 
    AND m2.sequence_num = m1.sequence_num + 1
WHERE m1.role = 'user' 
    AND m2.role = 'assistant'
    AND LENGTH(m1.content) > 50
    AND LENGTH(m2.content) > 100
    -- Filter out tool-heavy responses
    AND m2.content NOT LIKE '%<tool_call>%'
    AND m2.content NOT LIKE '%```bash%'
ORDER BY m1.timestamp DESC
LIMIT 1000;
```

### Data Formatting

**Standard format (train.jsonl):**
```json
{"text": "<|user|>\nWhat's the capital of France?\n<|assistant|>\nThe capital of France is Paris."}
{"text": "<|user|>\nExplain quantum computing simply.\n<|assistant|>\nQuantum computing uses quantum bits (qubits) that can exist in multiple states simultaneously..."}
```

**Chat format (preferred for instruction-tuned models):**
```json
{"messages": [
    {"role": "user", "content": "What's the capital of France?"},
    {"role": "assistant", "content": "The capital of France is Paris."}
]}
```

**Chatml format (common for many models):**
```
<|im_start|>user
What's the capital of France?<|im_end|>
<|im_start|>assistant
The capital of France is Paris.<|im_end|>
```

---

## 3. Training Pipeline

### MLX on Apple Silicon (Recommended for Local)

```bash
# Install MLX LM
pip install mlx-lm

# Basic LoRA training
mlx_lm.lora \
    --model mlx-community/Qwen2.5-7B-Instruct-4bit \
    --train \
    --data ./training_data \
    --iters 1000 \
    --batch-size 4 \
    --lora-layers 16 \
    --adapter-path ./adapters/memory-v1

# Evaluate
mlx_lm.lora \
    --model mlx-community/Qwen2.5-7B-Instruct-4bit \
    --adapter-path ./adapters/memory-v1 \
    --test

# Generate (inference)
mlx_lm.generate \
    --model mlx-community/Qwen2.5-7B-Instruct-4bit \
    --adapter-path ./adapters/memory-v1 \
    --prompt "What have you learned about the user?"
```

### Memory Requirements (MLX QLoRA)

| Model Size | RAM for QLoRA Training | Batch Size | Tokens/sec (M2 Ultra) |
|------------|------------------------|------------|----------------------|
| 7B-4bit | 8-12 GB | 4 | ~450 |
| 13B-4bit | 16-20 GB | 2 | ~250 |
| 32B-4bit | 32-40 GB | 1 | ~120 |
| 70B-4bit | 64-80 GB | 1 | ~50 |

### Key Training Parameters

```python
# Typical LoRA config
{
    "r": 16,              # Rank (8-64 typical, higher = more capacity)
    "lora_alpha": 32,     # Scaling factor (often 2*r)
    "target_modules": [   # Which layers to adapt
        "q_proj", "v_proj",     # Attention (always)
        "k_proj", "o_proj",     # Attention (recommended)
        "gate_proj", "up_proj", "down_proj"  # FFN (optional, more capacity)
    ],
    "lora_dropout": 0.05, # Regularization
    "bias": "none"        # Usually none for LLMs
}
```

### Training Best Practices

1. **Start small**: r=8, 500 iterations, evaluate
2. **Increase rank** if underfitting: r=16, 32, 64
3. **Reduce rank** if overfitting or need efficiency
4. **Use validation set**: 10-20% held out
5. **Early stopping**: Monitor val loss, stop when it increases
6. **Learning rate**: 1e-4 to 5e-5 typical

---

## 4. Adapter Composition: Stacking & Merging

### Single Active Adapter (Simplest)
```python
# Load base + one adapter
model = PeftModel.from_pretrained(base_model, "adapter_path")
# Use it
output = model.generate(...)
```

### Runtime Adapter Switching
```python
# Load multiple adapters
model.load_adapter("style_adapter", adapter_name="style")
model.load_adapter("domain_adapter", adapter_name="domain")

# Switch between them
model.set_adapter("style")
output = model.generate(...)

model.set_adapter("domain")
output = model.generate(...)
```

### Weighted Merging (Combine Knowledge)
```python
# Merge multiple adapters with weights
model.add_weighted_adapter(
    adapters=["style", "domain", "persona"],
    weights=[0.3, 0.5, 0.2],  # Must sum to 1.0 for linear
    adapter_name="combined",
    combination_type="linear"  # or "cat", "svd", "ties", "dare_ties", "dare_linear", "magnitude_prune"
)
model.set_adapter("combined")
```

### Combination Types

| Type | Description | Use Case |
|------|-------------|----------|
| `linear` | Weighted sum of adapters | General purpose merging |
| `cat` | Concatenate adapters (increases rank) | Maximum capacity |
| `svd` | SVD-based merging | Memory efficient |
| `ties` | TrimMergeFuse algorithm | Reduce interference |
| `dare_ties` | DARE + TIES | Better for many adapters |
| `dare_linear` | DARE + linear | Simpler DARE variant |
| `magnitude_prune` | Prune low-magnitude weights | Sparsity |

### Permanent Merging (Deployment)
```python
# Merge adapter into base weights permanently
merged_model = model.merge_and_unload()
merged_model.save_pretrained("./merged_model")

# Now runs at full speed with no adapter overhead
```

---

## 5. Integration with OpenClaw

### Option A: Ollama Auto-Discovery (Recommended)

```yaml
# openclaw.json
{
  "providers": {
    "ollama": {
      "type": "ollama/ollama",
      "url": "http://localhost:11434",
      "models": ["qwen3:32b", "qwen3:32b-memory-v1"]
    }
  }
}
```

```bash
# Create Modelfile with adapter
FROM qwen3:32b
ADAPTER ./adapters/memory-v1.gguf

# Register with Ollama
ollama create qwen3:32b-memory-v1 -f Modelfile
```

### Option B: MLX Server + OpenAI-Compatible Endpoint

```bash
# Start MLX server with adapter
mlx_lm.server \
    --model mlx-community/Qwen2.5-32B-Instruct-4bit \
    --adapter-path ./adapters/memory-v1 \
    --port 8080
```

```yaml
# openclaw.json
{
  "providers": {
    "local-mlx": {
      "type": "openai/chat",
      "url": "http://localhost:8080/v1",
      "models": ["default"]
    }
  }
}
```

### Option C: Hybrid — Local for Speed, Cloud for Quality

```yaml
{
  "providers": {
    "local": {
      "type": "ollama/ollama",
      "url": "http://localhost:11434",
      "models": ["qwen3:32b-memory-v1"]
    },
    "cloud": {
      "type": "anthropic/messages",
      "models": ["claude-opus-4-5"]
    }
  },
  "routing": {
    "default": "local",
    "complex_tasks": "cloud"
  }
}
```

---

## 6. Remote GPU Training

When local resources are insufficient, delegate training to external GPUs.

### Option A: Runpod / Vast.ai / Lambda Labs

```bash
# SSH to GPU instance
ssh ubuntu@gpu-instance

# Clone training repo
git clone https://github.com/user/training-scripts
cd training-scripts

# Install deps
pip install -r requirements.txt

# Run training
python train_lora.py \
    --model meta-llama/Llama-3.2-8B \
    --data ./data/train.jsonl \
    --output ./adapters/memory-v1

# Download adapter
scp ubuntu@gpu-instance:./adapters/memory-v1/* ./local/adapters/
```

### Option B: Kallos Zsolti's GPU Fleet

Given the GPU collaboration opportunity:

```bash
# Send training job to fleet (conceptual)
nimbus-train submit \
    --data ./prepared/train.jsonl \
    --config ./configs/qlora-32b.json \
    --output-bucket s3://nimbus-adapters/memory-v2
```

Fleet advantages:
- 15-20 GPUs across Europe
- ComfyUI already running (familiar with ML workloads)
- Pay-per-use vs. always-on cloud costs

### Training Time Estimates

| Model | GPU | QLoRA Time (1K iters) | Cost (~) |
|-------|-----|----------------------|----------|
| 7B | RTX 4090 | 30 min | $0.50 |
| 13B | RTX 4090 | 1 hour | $1.00 |
| 32B | A100 40GB | 2-3 hours | $6.00 |
| 70B | A100 80GB | 6-8 hours | $20.00 |

---

## 7. Evaluation & Validation

### Metrics to Track

1. **Perplexity**: Lower = better fit to training data
2. **BLEU/ROUGE**: For generation quality
3. **Task accuracy**: Domain-specific benchmarks
4. **Human eval**: Does it "feel" right?

### Evaluation Script

```python
# eval_adapter.py
from mlx_lm import load, generate
import json

model, tokenizer = load(
    "mlx-community/Qwen2.5-7B-Instruct-4bit",
    adapter_path="./adapters/memory-v1"
)

test_prompts = [
    "What's my preferred communication style?",
    "Summarize what you know about my projects.",
    "How should you handle sensitive topics?",
]

for prompt in test_prompts:
    response = generate(model, tokenizer, prompt=prompt, max_tokens=200)
    print(f"Q: {prompt}\nA: {response}\n---")
```

### A/B Testing

```python
# Compare base vs adapted model
def compare_responses(prompt, base_model, adapted_model):
    base_response = generate(base_model, prompt)
    adapted_response = generate(adapted_model, prompt)
    
    print(f"Base: {base_response}")
    print(f"Adapted: {adapted_response}")
    # Log for human evaluation
```

---

## 8. Versioning & Lifecycle

### Directory Structure

```
adapters/
├── memory-v1/
│   ├── adapter_config.json
│   ├── adapter_model.safetensors
│   ├── training_args.json
│   └── README.md (training notes)
├── memory-v2/
│   └── ...
├── style-casual-v1/
│   └── ...
└── domain-legal-v1/
    └── ...
```

### Version Tracking

```json
// adapters/registry.json
{
    "adapters": [
        {
            "name": "memory-v1",
            "base_model": "Qwen2.5-32B-Instruct-4bit",
            "created": "2026-02-05",
            "training_data": "sessions-2026-01.jsonl",
            "iterations": 1000,
            "final_loss": 0.82,
            "notes": "Initial memory adapter, conversation style"
        },
        {
            "name": "memory-v2",
            "base_model": "Qwen2.5-32B-Instruct-4bit",
            "created": "2026-02-10",
            "training_data": "sessions-2026-01-02.jsonl",
            "iterations": 1500,
            "final_loss": 0.71,
            "notes": "Added domain knowledge, improved accuracy"
        }
    ]
}
```

### Lifecycle Stages

```
┌─────────────────────────────────────────────────────────┐
│                    ADAPTER LIFECYCLE                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  1. DATA PREP          2. TRAINING         3. VALIDATION │
│  ┌─────────────┐       ┌───────────┐       ┌──────────┐ │
│  │ Extract     │──────▶│ QLoRA     │──────▶│ Eval     │ │
│  │ Format      │       │ MLX/PEFT  │       │ Metrics  │ │
│  │ Clean       │       │ Remote GPU│       │ Human QA │ │
│  └─────────────┘       └───────────┘       └──────────┘ │
│         │                    │                   │       │
│         │                    │                   │       │
│  4. DEPLOYMENT         5. MONITORING       6. RETIRE    │
│  ┌─────────────┐       ┌───────────┐       ┌──────────┐ │
│  │ Ollama reg  │◀──────│ Usage     │──────▶│ Archive  │ │
│  │ Config      │       │ Feedback  │       │ Replace  │ │
│  │ A/B test    │       │ Drift     │       │ Delete   │ │
│  └─────────────┘       └───────────┘       └──────────┘ │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 9. LoRA vs OpenClaw's Existing Memory System

### Current OpenClaw Memory

- **MEMORY.md**: Curated long-term notes (loaded each session)
- **memory/*.md**: Daily logs, knowledge files
- **Vector embeddings**: Semantic search via memory_search
- **Session transcripts**: Full conversation history

### How LoRA Adapters Complement This

| Aspect | File-Based Memory | LoRA Adapter |
|--------|------------------|--------------|
| Speed | Context loading (~slow for large files) | Instant (weights in model) |
| Capacity | Limited by context window | Unlimited (baked into weights) |
| Updatability | Instant edit | Requires retraining |
| Precision | Exact recall via search | Fuzzy/generalized knowledge |
| Privacy | Readable text files | Encoded in weights (harder to inspect) |

### Recommended Hybrid Approach

1. **LoRA for stable knowledge**: Style, preferences, domain expertise
2. **Files for dynamic info**: Current projects, recent decisions, todos
3. **RAG for facts**: Dates, names, specific details that must be exact

```
User Query
    │
    ├──▶ LoRA Adapter (style, personality, domain)
    │         │
    │         ▼
    ├──▶ MEMORY.md (recent context, preferences)
    │         │
    │         ▼
    └──▶ Vector Search (specific facts, dates)
              │
              ▼
         Combined Response
```

---

## 10. Security Considerations

### Data Privacy

- Training data may contain PII — sanitize before training
- Adapter weights encode training data (potential extraction attacks)
- Don't share adapters publicly if trained on private conversations

### Adapter Integrity

- Sign adapters with checksums
- Verify before loading (prevent malicious adapters)
- Keep training logs for audit

### Access Control

```bash
# Adapter directory permissions
chmod 700 adapters/
chmod 600 adapters/*/*.safetensors
```

---

## Summary

LoRA memory modules offer a powerful way to extend base models with personalized knowledge while maintaining efficiency. The key workflow:

1. **Extract** quality conversation pairs from OpenClaw sessions
2. **Format** into standard training format (JSONL)
3. **Train** using MLX (local) or remote GPUs
4. **Validate** with metrics and human evaluation
5. **Deploy** via Ollama or OpenAI-compatible server
6. **Monitor** usage and retrain as needed

For Nimbus specifically:
- Train on curated Zsolt conversations for style/preferences
- Use memory_search + MEMORY.md for dynamic/recent info
- Consider GPU fleet training for larger models (32B+)
- Version adapters and track improvements over time

---

## References

- [LoRA Paper (2021)](https://arxiv.org/abs/2106.09685)
- [QLoRA Paper (2023)](https://arxiv.org/abs/2305.14314)
- [HuggingFace PEFT Docs](https://huggingface.co/docs/peft)
- [MLX Examples — LoRA](https://github.com/ml-explore/mlx-examples/tree/main/lora)
- [MLX LM Documentation](https://github.com/ml-explore/mlx-lm)
