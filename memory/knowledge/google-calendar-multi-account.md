# Google Calendar Multiple Accounts - OAuth2 Architecture

**Date:** 2026-03-12
**Status:** Research Complete
**Next Steps:** Awaiting Zsolt's decision on implementation

---

## High-Level Overview

Google Calendar API uses OAuth2 authentication. **Each Google account needs its own OAuth flow and refresh token.** The OAuth client credentials (client_id/client_secret) are the app identity, not the user - multiple users can use the same client ID with their own tokens.

---

## OAuth2 Flow for Multiple Accounts

### Single OAuth Flow (Per Account)

**For each Google account you want to access:**

1. **Generate Authorization URL:**
   ```
   https://accounts.google.com/o/oauth2/auth?
     client_id={YOUR_CLIENT_ID}&
     redirect_uri=urn%3Aietf%3Awg%3Aoauth%3A2.0%3Aoob&
     response_type=code&
     scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.readonly+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar&
     access_type=offline&
     prompt=consent
   ```

2. **User Authorizes:**
   - User opens URL in browser
   - Signs in with their Google account
   - Confirms scopes (Calendar read/write)
   - Redirects to callback with `code` parameter

3. **Exchange Code for Refresh Token:**
   ```javascript
   const response = await fetch("https://oauth2.googleapis.com/token", {
     method: "POST",
     body: new URLSearchParams({
       client_id: "YOUR_CLIENT_ID",
       client_secret: "YOUR_CLIENT_SECRET",
       code: authorizationCode,
       redirect_uri: "urn:ietf:wg:oauth:2.0:oob",
       grant_type: "authorization_code"
     })
   });

   const { refresh_token, access_token, expires_in } = await response.json();
   ```

4. **Store Refresh Token:**
   - Each account gets its own token file
   - File naming convention: `google-calendar-tokens-{email}.json`
   - Store in secure location (e.g., `~/.openclaw/credentials/`)

5. **Token Refresh Logic:**
   ```javascript
   const response = await fetch("https://oauth2.googleapis.com/token", {
     method: "POST",
     body: new URLSearchParams({
       client_id: "YOUR_CLIENT_ID",
       client_secret: "YOUR_CLIENT_SECRET",
       refresh_token: refreshToken,
       grant_type: "refresh_token"
     })
   });

   const { access_token } = await response.json();
   // Use access_token for API requests
   ```

---

## Implementation Architecture

### Token Storage Structure

```
~/.openclaw/credentials/
├── google-calendar-tokens-papperpictures@gmail.com.json
├── google-calendar-tokens-studio306nl@gmail.com.json
├── google-calendar-tokens-urbandanceteam@gmail.com.json
└── google-calendar-tokens-funkin4holland@gmail.com.json
```

**Each token file contains:**
```json
{
  "refresh_token": "1//...",
  "access_token": "ya29...",
  "expires_at": 1710324325
}
```

### Account Configuration

**File:** `accounts/google-calendar-accounts.json`

```json
{
  "papperpictures@gmail.com": {
    "name": "Personal",
    "primary": true,
    "calendar_id": "primary",
    "scopes": ["https://www.googleapis.com/auth/calendar.readonly", "https://www.googleapis.com/auth/calendar.events"]
  },
  "studio306nl@gmail.com": {
    "name": "Studio 306",
    "primary": false,
    "calendar_id": "studio306",
    "scopes": ["https://www.googleapis.com/auth/calendar.readonly"]
  }
}
```

### CLI Tool Usage

**List accounts:**
```bash
node google-calendar-search.js accounts --list
```

**List events (specific account):**
```bash
node google-calendar-search.js events --account studio306nl@gmail.com --days 7
```

**Create event:**
```bash
node google-calendar-search.js events create --account papperpictures@gmail.com \
  --summary "Meeting" \
  --from "2026-03-12T14:00:00" \
  --to "2026-03-12T15:00:00"
```

---

## Scopes for Different Access Levels

| Scope | Permission |
|-------|------------|
| `https://www.googleapis.com/auth/calendar.readonly` | Read-only access |
| `https://www.googleapis.com/auth/calendar.events` | Read/write events (CRUD) |
| `https://www.googleapis.com/auth/calendar` | Full calendar access (manage calendars too) |

**Recommended scopes:**
- **Read-only:** `calendar.readonly`
- **Read/write events:** `calendar.readonly` + `calendar.events`
- **Full access:** `calendar` (includes managing multiple calendars)

---

## Token Management

### Token Expiration
- **Access tokens:** Expire after ~1 hour
- **Refresh tokens:** Valid until revoked by user or expires (rarely)

### Token Refresh
- Access token fetched when needed
- If expired, use refresh token to get new access token
- Background refresh: check and refresh before expiry

### Token Revocation
- User can revoke access via Google Account settings
- Should detect revoked tokens and alert user
- Optionally delete revoked token files

---

## Implementation Options

### Option 1: Single Token File (SIMPLE - NOT RECOMMENDED)

**Storage:** Single file `google-calendar-tokens.json`

**Pros:**
- Simple storage
- Easy to implement

**Cons:**
- Can only authorize one account at a time
- Need to re-authorize if you want to switch accounts
- Confusion about which account owns which tokens

**Not recommended for production use.**

---

### Option 2: Per-Account Token Files (RECOMMENDED)

**Storage:** One token file per account

**Pros:**
- Multiple accounts supported natively
- No confusion about which account owns which tokens
- Easy to add/remove accounts
- Clean separation

**Cons:**
- More files to manage
- Slightly more complex initial setup

**Recommended for production.**

---

### Option 3: Centralized Token Store with Account Mapping

**Storage:** Single token file with account mapping

```json
{
  "tokens": {
    "papperpictures@gmail.com": {
      "refresh_token": "1//...",
      "access_token": "ya29...",
      "expires_at": 1710324325
    },
    "studio306nl@gmail.com": {
      "refresh_token": "1//...",
      "access_token": "ya29...",
      "expires_at": 1710324325
    }
  }
}
```

**Pros:**
- Single file to manage
- Easy to inspect all tokens at once

**Cons:**
- Larger file size
- Slightly more complex access logic
- Same amount of maintenance

**Alternative recommended approach.**

---

## Implementation Steps (Option 2 - Per-Account Files)

### Step 1: Create Account Configuration

Create `accounts/google-calendar-accounts.json`:

```json
{
  "papperpictures@gmail.com": {
    "name": "Personal",
    "primary": true,
    "calendar_id": "primary"
  },
  "studio306nl@gmail.com": {
    "name": "Studio 306",
    "primary": false,
    "calendar_id": "studio306"
  },
  "urbandanceteam@gmail.com": {
    "name": "Urban Dance Team",
    "primary": false,
    "calendar_id": "primary"
  }
}
```

### Step 2: Create OAuth Helper Module

Create `lib/google-calendar-oauth.js`:

```javascript
const fs = require('fs').promises;
const path = require('path');

const TOKENS_DIR = path.join(__dirname, '..', 'credentials');

async function getTokenPath(email) {
  return path.join(TOKENS_DIR, `google-calendar-tokens-${email.replace(/[^a-zA-Z0-9.-]/g, '-')}.json`);
}

async function saveToken(email, tokenData) {
  const tokenPath = await getTokenPath(email);
  await fs.mkdir(TOKENS_DIR, { recursive: true });
  await fs.writeFile(tokenPath, JSON.stringify(tokenData, null, 2));
}

async function loadToken(email) {
  const tokenPath = await getTokenPath(email);
  const data = await fs.readFile(tokenPath, 'utf-8');
  return JSON.parse(data);
}

async function refreshAccessToken(email) {
  const tokenData = await loadToken(email);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: tokenData.refresh_token,
      grant_type: 'refresh_token'
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(`Token refresh failed: ${data.error}`);

  tokenData.access_token = data.access_token;
  tokenData.expires_at = Date.now() + (data.expires_in * 1000);

  await saveToken(email, tokenData);
  return tokenData.access_token;
}

async function getAccessToken(email) {
  const tokenData = await loadToken(email);

  // Check if token is expired
  if (tokenData.expires_at && Date.now() < tokenData.expires_at - 30000) {
    return tokenData.access_token;
  }

  // Token expired, refresh it
  return await refreshAccessToken(email);
}

module.exports = {
  getTokenPath,
  saveToken,
  loadToken,
  refreshAccessToken,
  getAccessToken
};
```

### Step 3: Create Search/Query Tool

Create `google-calendar-search.js`:

```javascript
const { getAccessToken } = require('./lib/google-calendar-oauth');
const fs = require('fs').promises;

async function listEvents(account, days = 7) {
  const accessToken = await getAccessToken(account);
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${account}/events?timeMin=${new Date().toISOString()}&timeMax=${new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()}&orderBy=startTime&singleEvents=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  if (!response.ok) throw new Error(`Calendar API error: ${response.status}`);
  const data = await response.json();
  return data.items || [];
}

// CLI parsing and execution...
```

### Step 4: OAuth Flow for New Account

Create `google-calendar-auth.js` (similar to existing Gmail OAuth flow):

```javascript
const { saveToken, loadToken } = require('./lib/google-calendar-oauth');
const { createOAuth2Client } = require('./lib/google-auth-base');

async function authorize(email) {
  const client = createOAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);

  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar'
    ],
    prompt: 'consent',
    state: JSON.stringify({ email })
  });

  console.log('Authorize this app by visiting this URL:');
  console.log(authUrl);

  // Read code from stdin (interactive)
  const code = await new Promise(resolve => {
    process.stdin.once('data', data => resolve(data.toString().trim()));
  });

  const { tokens } = await client.getToken(code);
  await saveToken(email, tokens);
  console.log(`Tokens saved for ${email}`);
}

authorize(process.argv[2]);
```

### Step 5: Update Account Config

Run OAuth flow for each account:

```bash
node google-calendar-auth.js papperpictures@gmail.com
node google-calendar-auth.js studio306nl@gmail.com
node google-calendar-auth.js urbandanceteam@gmail.com
```

Each flow generates a refresh token and saves it to `credentials/google-calendar-tokens-{email}.json`.

---

## Testing & Verification

### Test Read Access

```bash
node google-calendar-search.js events --account papperpictures@gmail.com --days 1
```

**Expected:** Returns today's events from papperpictures@gmail.com calendar

### Test Write Access

```bash
node google-calendar-search.js events create --account papperpictures@gmail.com \
  --summary "Test Event" \
  --from "2026-03-12T20:00:00" \
  --to "2026-03-12T21:00:00"
```

**Expected:** Creates event on papperpictures@gmail.com calendar

### Test Multiple Accounts

```bash
node google-calendar-search.js events --account papperpictures@gmail.com --days 1
node google-calendar-search.js events --account studio306nl@gmail.com --days 1
```

**Expected:** Returns events from both calendars

---

## Security Considerations

### Token Storage
- Store tokens in `~/.openclaw/credentials/` (already .gitignored)
- File permissions: 600 (read/write only by owner)
- Never commit token files to git

### Token Revocation
- Google provides a token revocation endpoint
- Add function to revoke specific token:
  ```javascript
  async function revokeToken(email) {
    const tokenData = await loadToken(email);
    const response = await fetch('https://accounts.google.com/o/oauth2/revoke', {
      method: 'POST',
      body: new URLSearchParams({ token: tokenData.refresh_token })
    });
    if (response.ok) {
      // Delete token file
      const tokenPath = await getTokenPath(email);
      await fs.unlink(tokenPath);
      console.log(`Revoked tokens for ${email}`);
    }
  }
  ```

### Scope Minimization
- Only request necessary scopes
- Avoid `calendar` (full access) unless needed
- Use `calendar.readonly` + `calendar.events` instead

---

## Known Limitations

1. **One OAuth flow per account** - Can't authorize multiple accounts at once (need manual flows)
2. **Token refresh is asynchronous** - Access token expires after 1 hour
3. **No UI** - OAuth flow is command-line (paste URL, paste code)
4. **No real-time sync** - Polling only (can't subscribe to webhooks without additional setup)

---

## Open Questions for Zsolt

1. **Which Google accounts do you want to integrate with Calendar?**
   - papperpictures@gmail.com (personal)
   - studio306nl@gmail.com (studio)
   - urbandanceteam@gmail.com (Urban Dance Forever)
   - funkin4holland@gmail.com (dance events)
   - c3studios.nl@gmail.com (C3 Studios partnership)

2. **What access level for each account?**
   - Read-only (view events)
   - Read/write events (CRUD events)
   - Full calendar access (manage calendars too)

3. **Preferred implementation approach?**
   - Per-account token files (Option 2)
   - Centralized token store (Option 3)

4. **Do you want CLI tool or web UI?**
   - CLI (quick, scriptable)
   - Web UI (visual, easier for non-technical use)
   - Both

5. **Do you need to schedule meetings and events automatically?**
   - Just list events
   - Create events on demand
   - Full calendar automation

---

## Decision Matrix

| Implementation | Setup Time | Usability | Security | Scalability |
|----------------|------------|-----------|----------|-------------|
| Single token file | 30 min | ⭐⭐ | ⭐⭐ | ⭐ |
| Per-account files | 2-3 hrs | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Centralized store | 2-3 hrs | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## Recommended Action

**For now:** Implement **Option 2 (Per-Account Token Files)**

**Why:**
- Best security (isolated tokens)
- Easiest to add/remove accounts
- Clean separation between accounts
- Recommended for production

**Next Steps:**
1. Get Zsolt's answers to open questions
2. Create account configuration file
3. Implement OAuth helper module
4. Create search/query tool
5. Create auth flow script
6. Test with all accounts
