# Gmail Multi-Account Management Research

**Date:** 2026-03-09
**Task:** Enable OAuth2 for 5 Gmail accounts with alias system
**Status:** Research Phase

## Current Architecture

### Single-Account Setup
- **Credentials:** `/home/papperpictures/.openclaw/credentials/google-oauth-client.json`
- **Tokens:** `/home/papperpictures/.openclaw/credentials/google-gmail-tokens.json`
- **Scope:** `https://www.googleapis.com/auth/gmail.modify` (read + modify)
- **Implementation:** `gmail-search.js` — hardcoded to single account

### Current Workflow
```bash
# First-time setup
node gmail-search.js url                          # Get authorization URL
node gmail-search.js code <CODE>                  # Exchange code for tokens

# Normal use
node gmail-search.js search <query>               # Search emails from default account
```

## Challenges

### 1. Multiple OAuth Flows
- Each Gmail account needs its own OAuth authorization
- Google OAuth2 doesn't support multi-account credentials out-of-the-box
- Need separate authorization URL generation per account
- Need separate token exchange per account

### 2. Token Storage Strategy
**Options:**

#### A. Directory per Account
```
credentials/
├── google-oauth-client.json               # Master credentials
├── gmail-tokens/
│   ├── papperpictures.json                # Account 1
│   ├── urbandanceteam.json                # Account 2
│   ├── studio306nl.json                   # Account 3
│   ├── funkin4holland.json                # Account 4
│   └── c3studios.json                     # Account 5
└── email-profiles/
    ├── papperpictures.json                # Profile data
    ├── urbandanceteam.json
    ├── studio306nl.json
    ├── funkin4holland.json
    └── c3studios.json
```

**Pros:**
- Easy to manage individual tokens
- Profile data co-located with tokens
- No merge conflicts

**Cons:**
- More files to maintain
- Need to track which token file is which

#### B. Single JSON with Account Structure
```json
{
  "accounts": {
    "papperpictures": {
      "credentials": { "client_id": "...", "client_secret": "..." },
      "tokens": { "access_token": "...", "refresh_token": "..." },
      "profile": { "name": "...", "signature": "...", "tone": "..." }
    },
    "urbandanceteam": { ... },
    ...
  },
  "default": "papperpictures"
}
```

**Pros:**
- Single source of truth
- Easy to switch between accounts
- Profile data centrally managed

**Cons:**
- Complex JSON structure
- Need to handle merging (refresh tokens vs full token refresh)

### 3. Account Selection Strategy

**Options:**

#### A. CLI Arguments
```bash
node gmail-search.js --account urbandanceteam search "subject:Dance"
node gmail-search.js --account studio306nl search "inbox"
```

**Pros:**
- Explicit and clear
- Works with scripts

**Cons:**
- Verbose
- Easy to forget account flag

#### B. Environment Variable
```bash
export GMAIL_DEFAULT_ACCOUNT=urbandanceteam
node gmail-search.js search "subject:Dance"
```

**Pros:**
- Easy for interactive use
- Scripts can set it once

**Cons:**
- Not visible in command
- Easy to override

#### C. Prompt if Default Not Set
```bash
$ node gmail-search.js search "subject:Dance"
Which account? [papperpictures/urbandanceteam/studio306nl/funkin4holland/c3studios] (default: papperpictures)
> studio306nl
```

**Pros:**
- No memory needed
- Clear when needed
- Defaults intelligently

**Cons:**
- Requires interactive prompt
- Not suitable for automation

### 4. Token Refresh Handling

**Current behavior:**
```javascript
async function refreshAccessToken() {
  const creds = loadCredentials();
  const tokens = loadTokens();
  // Refresh using refresh_token
  // Save new tokens
}
```

**Multi-account behavior:**
```javascript
async function refreshAccessToken(accountName) {
  const creds = loadCredentials();
  const tokens = loadTokens(accountName);
  // Refresh using account-specific refresh_token
  // Save new tokens for this account
}
```

**Challenge:** When using Option B (single JSON structure), we need to decide:
- Always refresh the whole account entry?
- Or only update the access token and keep refresh token?
- What if we lose the refresh token?

**Decision:** Store separate token files (Option A) to avoid merge complexity.

## Implementation Plan

### Phase 1: Directory Structure
```bash
mkdir -p /home/papperpictures/.openclaw/credentials/gmail/
mkdir -p /home/papperpictures/.openclaw/credentials/email-profiles/
```

### Phase 2: Refactor gmail-search.js

**New Functions Needed:**
```javascript
// Load tokens for specific account
function loadTokens(accountName) {
  const path = `/home/papperpictures/.openclaw/credentials/gmail/${accountName}.json`;
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

// Save tokens for specific account
function saveTokens(accountName, tokens) {
  const path = `/home/papperpictures/.openclaw/credentials/gmail/${accountName}.json`;
  fs.writeFileSync(path, JSON.stringify(tokens, null, 2));
}

// Generate auth URL for specific account
function generateAuthUrl(accountName) {
  const account = loadAccountConfig(accountName);
  // ... generate URL with account-specific redirect
}

// Exchange code for tokens (account-specific)
async function exchangeCode(accountName, code) {
  const account = loadAccountConfig(accountName);
  // ... exchange code
}

// Gmail request (account-aware)
async function gmailRequest(path, accountName) {
  const tokens = loadTokens(accountName);
  // ... make request with account token
}
```

**Account Configuration:**
```javascript
const ACCOUNTS = {
  'papperpictures': {
    'email': 'papperpictures@gmail.com',
    'name': 'Papper Pictures',
    'signingName': 'Papper Pictures',
    'signature': 'Best regards,\nZsolt Szederkényi\nPapper Pictures',
    'tone': 'professional',
    'useCase': 'personal',
    'priority': 1
  },
  'urbandanceteam': {
    'email': 'urbandanceteam@gmail.com',
    'name': 'Urban Dance Team',
    'signingName': 'Urban Dance Team',
    'signature': 'Best regards,\nUrban Dance Team',
    'tone': 'enthusiastic',
    'useCase': 'urban dance events',
    'priority': 2
  },
  // ... other accounts
};
```

**Refactored Commands:**
```bash
# Setup accounts
node gmail-search.js account:list              # List all configured accounts
node gmail-search.js account:add <name>        # Add new account (start OAuth flow)
node gmail-search.js account:remove <name>     # Remove account (delete tokens)
node gmail-search.js account:select <name>     # Set default account

# Email operations (use selected account)
node gmail-search.js search <query>
node gmail-search.js get <messageId>
node gmail-search.js archive <messageId>
```

### Phase 3: Email Profiles

**Email-PROFILES.md Updates:**
- Replace hardcoded account definitions with JSON structure
- Define tone, signature, use cases for each account
- Add alias system (short names: "personal", "studio", "business")
- Add rules: when to use each account

### Phase 4: Gmail Router Integration

**Gmail Router (gmail-multi-router.js):**
- Update to support multi-account
- Add account selection logic
- Use profile aliases for easy switching
- Test with multiple accounts

### Phase 5: Testing

**Test Cases:**
1. Add 1 new account (urbandanceteam)
2. Verify OAuth flow works
3. Test email search from urbandanceteam
4. Test email search from papperpictures (default)
5. Test account switching
6. Test token refresh for each account
7. Test removing account

## Rollback Plan

If multi-account implementation fails:
- Keep existing single-account setup
- New `gmail-search-v2.js` with multi-account support
- Gradual migration: one account at a time

## Estimated Effort

| Task | Time |
|------|------|
| Research and design | 30 min |
| Directory structure | 10 min |
| Refactor gmail-search.js | 2 hours |
| Create email profiles | 30 min |
| Test accounts | 1 hour |
| Update Gmail router | 1 hour |
| **Total** | **~5 hours** |

## Open Questions

1. **Should we migrate EMAIL-PROFILES.md to JSON structure?**
   - Pros: Easier to parse programmatically
   - Cons: Format changes might confuse existing README

2. **Token file naming:**
   - Use account name (papperpictures.json)?
   - Use email (papperpictures@gmail.com.json)?
   - Recommendation: account name (human-readable)

3. **Session persistence:**
   - Save last selected account in ~/.nimbus/last-account
   - Auto-remember user preference

4. **What if refresh token is lost?**
   - Re-run OAuth flow for that account
   - Warn user before deleting account

5. **Automation concerns:**
   - Should account switching be automatic based on email domain?
   - Or keep manual and explicit?

---

*Next Step:* Create ACCOUNTS.md with initial account definitions, then start refactoring gmail-search.js.
