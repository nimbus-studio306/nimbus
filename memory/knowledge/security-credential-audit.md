# Credential Security Audit
> Created: 2026-02-04 03:38 UTC
> Status: Initial audit complete

## Current Credential Storage

### Environment Variables (Container)
| Variable | Purpose | Risk |
|----------|---------|------|
| GEMINI_API_KEY | Google AI services | Medium — in container env |
| OPENCLAW_GATEWAY_TOKEN | Gateway auth | Low — internal only |
| CLAUDE_AI_SESSION_KEY | Anthropic API | Medium — in container env |
| CLAUDE_WEB_SESSION_KEY | Claude web access | Medium — in container env |

### Files
| File | Contains | Protected? |
|------|----------|-----------|
| .env.email | SMTP/IMAP credentials | ✅ gitignored |
| openclaw.json | Gateway token (plaintext) | ⚠️ Not in workspace git, but readable |
| GitHub PAT | In gh CLI config | ✅ Not in workspace |

## Issues Found

### 🟡 Medium: Partial API key prefix was in tracked files
- `self-environment.md` had "AIzaSy..." prefix visible
- **Fixed**: replaced with generic "(set via env var)"
- Risk was low (prefix alone isn't exploitable) but bad practice

### 🟡 Medium: Gateway token in openclaw.json
- Plaintext token: visible in config file
- Also in TOOLS.md (full URL with token parameter)
- This token authenticates web UI access
- Mitigated by: Cloudflare Access (2FA) in front

### 🟢 Low: .env.email properly gitignored
- SMTP/IMAP credentials not in git history
- File is in workspace but excluded from commits

### 🟢 Low: No API keys committed to git history
- Checked all tracked files — no full keys found
- .gitignore covers .env files

## Recommendations

### Immediate (no infrastructure change)
1. ✅ Remove API key prefixes from tracked files (DONE)
2. Review TOOLS.md — remove or redact the full gateway URL with token
3. Add `*.env` and `*.key` to .gitignore as additional safety

### Short-term (with Zsolt)
4. Move secrets to a central secrets manager
5. Consider: docker secrets or env file mounted at runtime
6. Rotate gateway token periodically

### Long-term (with VPS/Supabase)
7. Supabase Vault for encrypted credential storage
8. API keys retrieved at runtime from vault, not env vars
9. Audit trail for credential access

## Security Rules for Nimbus
- NEVER commit actual API keys or tokens to git
- NEVER include key values in memory files or knowledge docs
- Reference keys by variable name only ($GEMINI_API_KEY, not the value)
- .env files MUST be in .gitignore
- If a key leaks: rotate immediately, notify Zsolt
