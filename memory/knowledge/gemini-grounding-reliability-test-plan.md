# Gemini Grounding Reliability Test Plan

Date: 2026-02-21 06:08 UTC
Status: started
Related TODO: "Test reliability — sometimes grounding doesn't trigger (query-dependent)"

## Goal
Measure when Gemini grounding triggers vs. does not trigger, grouped by query type.

## Minimal test matrix (first pass)
1. Current weather in Rotterdam
2. "What happened in AI news this week?"
3. Navigational query (official OpenClaw docs URL)
4. Factual evergreen query ("capital of Hungary")
5. Recent event query with date constraints

## Capture fields per run
- Prompt text
- Model used
- Grounding enabled? (yes/no)
- Source citations returned? (count)
- Response freshness quality (manual score 1-5)
- Latency (seconds)

## Next step
Create a small script to run 3 rounds of this matrix and aggregate trigger rate by query type.
