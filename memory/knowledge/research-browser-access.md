# Browser & Internet Access Research
> Created: 2026-02-04 02:25 UTC
> Status: In progress

## What I Have Now

### web_fetch (WORKS ✅)
- Fetches any URL and extracts readable content as markdown
- Tested on funkin4.nl — works great
- Limitation: no JavaScript execution, no interaction, no screenshots
- Good for: reading content, checking APIs, scraping static pages

### web_search via Brave API (WORKS ✅)
- Built into OpenClaw as a tool
- Returns titles, URLs, snippets
- Good for: finding information, researching topics

### Gemini API with Google Search Grounding (WORKS ✅ — confirmed real search)
- `tools: [{ google_search: {} }]` in API call
- **Confirmed real-time web search** — returned current Rotterdam weather (4°C, Feb 4 2026 3:26 AM)
- Returns actual web sources with URLs
- Inconsistent: doesn't always trigger grounding (depends on query)
- Good for: research, fact-checking, current events
- **Zsolt suspected it wasn't real search — it IS, verified with live weather data**

### Browser Tool (PARTIALLY AVAILABLE ⚠️)
- OpenClaw has a built-in `browser` tool with snapshot/screenshot/navigate/act capabilities
- `playwright-core` is installed in the container
- Chromium binaries ARE downloaded (`/home/node/.cache/ms-playwright/chromium-1208/`)
- **Problem**: Missing system library `libxfixes3` — chromium can't launch
- **Fix needed**: `sudo apt-get install -y libxfixes3` on host, then:
  ```
  sudo docker exec -u root openclaw-repo-openclaw-gateway-1 apt-get install -y libxfixes3
  ```
- After fix: full browser automation available (navigate, screenshot, click, type, etc.)
- This would enable: UI testing, visual validation, form interaction, JavaScript-heavy sites

## What I Don't Have

### Persistent Browser Session
- No way to maintain logged-in state across sessions
- Would need: cookie/session storage, profile persistence
- Future: could store browser profiles in workspace

### Visual Real-Time Feedback
- Screenshots work (when browser is fixed)
- No live streaming of browser content
- Snapshot tool returns accessibility tree (structured DOM data)
- Good enough for testing UIs and validating layouts

## Recommendations

### Immediate (needs Zsolt to run one command):
Install libxfixes3 in container → unlocks full browser automation via OpenClaw's built-in browser tool. This is the single biggest capability upgrade available right now.

### Already Working:
- web_fetch for content reading
- web_search for finding things
- Gemini grounding for research with real search

### Future:
- Browser profile persistence
- Headless browser for automated testing
- Integration with Zsolt's websites for monitoring
