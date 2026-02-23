# Gemini Grounding Reliability Harness (Draft)

Date: 2026-02-21 07:28 UTC

## Purpose
Run repeated query batches and measure how often grounding/citations appear by query type.

## Query buckets
- live_weather: "Current weather in Rotterdam right now"
- live_news: "What happened in AI this week? Include sources"
- navigation: "Official OpenClaw docs URL"
- evergreen_fact: "What is the capital of Hungary?"
- recent_event: "Top EU AI policy update in the last 7 days"

## Metrics
- grounded: boolean (citations/tool evidence present)
- citation_count: integer
- latency_ms
- response_len
- run_id, bucket, timestamp

## Run protocol
- 3 rounds minimum
- Shuffle query order each round
- Keep model + temperature constant
- 10-20s spacing between prompts

## Output schema (JSONL)
```json
{"ts":"...","run":1,"bucket":"live_weather","grounded":true,"citation_count":3,"latency_ms":2400}
```

## Current blocker
- `web_search` unavailable in this runtime (`missing_brave_api_key`)
- direct `web_fetch` attempts to ai.google.dev returned no content via tool

## Practical next step
Use direct Gemini API test runner from main workspace scripts (if existing) or add one in `/home/papperpictures/.openclaw/workspace/scripts/research/` once network/tooling path is confirmed.
