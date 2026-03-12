# Gmail Multi-Account Implementation Plan

**Date:** 2026-03-12
**Status:** Research Complete
**Next Steps:** Await Zsolt's approval before implementing

---

## Current State

**Existing Tools:**
1. `gmail-search.js` - Single-account tool for papperpictures@gmail.com only
2. `gmail-multi-router.js` - Multi-account Pub/Sub router (ALREADY WORKING)
   - Configured for 5 accounts:
     - papperpictures@gmail.com
     - urbandanceteam@gmail.com
     - studio306nl@gmail.com
     - funkin4holland@gmail.com
     - c3studios.nl@gmail.com
   - All accounts have historyIds initialized
   - Pub/Sub notifications working

**What's Missing:**
1. Search/Query tool for individual accounts
2. Alias system for easy account reference
3. Automatic routing rules

---

## Required Implementation

### 1. Multi-Account Search Tool (gmail-search-v2.js)

**Goal:** Enable searching across all Gmail accounts from a single CLI tool.

**Features Needed:**
- List all configured accounts
- Search specific account: `node gmail-search-v2.js search "query" --account studio306nl@gmail.com`
- Search all accounts: `node gmail-search-v2.js search "query" --all`
- Get message from specific account: `node gmail-search-v2.js get <msgId> --account urbandanceteam@gmail.com`
- Alias support: `node gmail-search-v2.js search "query" --account studio`
- Support for multiple accounts in one command: `node gmail-search-v2.js search "query" --accounts studio306nl@gmail.com urbandanceteam@gmail.com`

**OAuth Token Storage:**
- One refresh token per account
- File naming: `google-gmail-tokens-{email}.json`
- Location: `~/.openclaw/credentials/`

**Example Output:**
```bash
$ node gmail-search-v2.js accounts
✓ papperpictures@gmail.com (Personal)
✓ studio306nl@gmail.com (Studio 306)
✓ urbandanceteam@gmail.com (Urban Dance Forever)
✓ funkin4holland@gmail.com (Funkin' 4 Holland)
✓ c3studios.nl@gmail.com (C3 Studios)

$ node gmail-search-v2.js search "meeting" --account studio306nl@gmail.com --limit 5
Found 3 emails from studio306nl@gmail.com:

1. Studio meeting notes
   From: team@studio306.nl
   Date: 2026-03-11 14:30
   Subject: Project update

2. Calendar invite
   From: nimbus@studio306.nl
   Date: 2026-03-10 09:15
   Subject: Sync calendar

3. Vendor quote
   From: supplier@example.com
   Date: 2026-03-09 16:45
   Subject: Equipment pricing
```

---

### 2. Alias System

**Goal:** Allow short aliases instead of full email addresses.

**Configuration:**
```
~/.openclaw/config/accounts/gmail-aliases.json
```

**Aliases Configuration:**
```json
{
  "personal": "papperpictures@gmail.com",
  "studio": "studio306nl@gmail.com",
  "udt": "urbandanceteam@gmail.com",
  "funkin": "funkin4holland@gmail.com",
  "c3": "c3studios.nl@gmail.com"
}
```

**Usage:**
```bash
node gmail-search-v2.js search "query" --account studio
node gmail-search-v2.js search "query" --all-accounts
```

---

### 3. Automatic Routing Rules

**Goal:** Define clear rules for which account to use based on email content/recipient.

**Routing Rules Configuration:**
```
~/.openclaw/config/email-routing.json
```

**Rules Structure:**
```json
{
  "rules": [
    {
      "pattern": "from:team@studio306.nl",
      "account": "studio306nl@gmail.com",
      "priority": 10
    },
    {
      "pattern": "from:organizers@urbanartistry.org",
      "account": "urbandanceteam@gmail.com",
      "priority": 10
    },
    {
      "pattern": "subject:*invoice*",
      "account": "studio306nl@gmail.com",
      "priority": 5
    },
    {
      "pattern": "from:work",
      "account": "papperpictures@gmail.com",
      "priority": 1
    }
  ],
  "fallback": "papperpictures@gmail.com"
}
```

**Usage:**
```bash
node gmail-search-v2.js search "invoice" --route
```

**Routing Logic:**
1. Check if recipient is specified (e.g., `--account studio`)
2. If not, apply routing rules based on:
   - From header
   - To header
   - Subject header
   - Label names
3. Return highest priority matching rule
4. If no rules match, use fallback account

---

### 4. Email Profiles Documentation

**File:** `memory/knowledge/EMAIL-PROFILES.md` (already drafted)

**Needs Zsolt's Review:**
- Email signatures for each account
- Tone and communication style per account
- When to use which account
- 7 open questions (sender names, signatures, topics per account, etc.)

---

## Implementation Steps

### Phase 1: Multi-Account Search Tool (2-3 hours)

**Step 1.1: Create OAuth Helper Module**
```
lib/gmail-multi-account-oauth.js
```
- `getTokenPath(email)` - return token file path
- `saveToken(email, token)` - save token
- `loadToken(email)` - load token
- `refreshAccessToken(email)` - refresh access token
- `getAccessToken(email)` - get or refresh access token

**Step 1.2: Create Alias Module**
```
lib/gmail-alias-resolver.js
```
- `resolveAlias(alias)` - convert alias to email
- `getAllAliases()` - list all aliases
- `saveAliases(aliases)` - save aliases
- `loadAliases()` - load aliases

**Step 1.3: Create Routing Rules Module**
```
lib/gmail-routing-rules.js
```
- `matchRule(message, rules)` - find matching rule
- `getAccountForMessage(message)` - determine account based on routing rules
- `saveRules(rules)` - save rules
- `loadRules()` - load rules

**Step 1.4: Create Main Search Tool**
```
gmail-search-v2.js
```
- CLI argument parsing
- Account selection (full email, alias, all, routing rules)
- Message search
- Message fetch
- Display formatted output
- Support for --limit, --from, --to, --subject, --label filters

**Step 1.5: Create Auth Flow Script**
```
gmail-multi-account-auth.js
```
- Generate auth URL for each account
- Exchange code for tokens
- Save tokens to separate files

**Step 1.6: Test with All Accounts**
```bash
node gmail-multi-account-auth.js papperpictures@gmail.com
node gmail-multi-account-auth.js studio306nl@gmail.com
node gmail-multi-account-auth.js urbandanceteam@gmail.com
node gmail-multi-account-auth.js funkin4holland@gmail.com
node gmail-multi-account-auth.js c3studios.nl@gmail.com

node gmail-search-v2.js accounts
node gmail-search-v2.js search "test" --account studio
node gmail-search-v2.js search "test" --all
```

---

### Phase 2: Complete Email-Profiles Documentation (30 min)

**Step 2.1: Review EMAIL-PROFILES.md draft**
- Check against Zsolt's expectations
- Add missing details
- Clarify 7 open questions

**Step 2.2: Add routing rules examples**
- Add example routing rules for each account
- Document business use cases

---

### Phase 3: Testing & Documentation (1 hour)

**Step 3.1: End-to-End Testing**
- Test all accounts individually
- Test alias system
- Test routing rules
- Test all filters (--from, --to, --subject, --label, --limit)

**Step 3.2: Create User Guide**
- Document CLI usage
- Document aliases configuration
- Document routing rules
- Include troubleshooting section

---

## Open Questions for Zsolt

1. **Routing Rules Priority:**
   - Should routing rules be hierarchical (lower number = higher priority)?
   - How many rules should we support (10, 50, 100)?
   - Should rules be regex or simple string matching?

2. **Routing Rules Behavior:**
   - Should routing rules apply to all searches or only un-specified accounts?
   - Should there be a "best effort" mode (apply closest match)?
   - Should rules be per-account or global?

3. **Alias Usage:**
   - What aliases do you want? (studio, personal, business, etc.)
   - Should aliases be case-insensitive?
   - Should aliases support nested references? (e.g., "personal:work")

4. **Email Profiles:**
   - What should each account be called? (personal, studio, business, etc.)
   - What signature format for each account?
   - What tone should each account have?
   - What topics should each account receive?
   - What are your business/communication styles for each account?
   - Should we include auto-replies or out-of-office messages?
   - Should we include promotional content vs. professional vs. personal?

5. **Integration:**
   - Should gmail-search-v2.js replace gmail-search.js?
   - Should we maintain both tools for compatibility?
   - Should gmail-search-v2.js be the default tool for searches?

---

## Benefits

### For Zsolt:
- **Easy account switching** - Use aliases instead of full emails
- **Automatic routing** - Gmail tool picks correct account based on email content
- **Consistent experience** - Single tool for all accounts
- **Better organization** - Clear separation between personal and business emails
- **Time savings** - No need to manually specify accounts repeatedly

### Technical:
- **Single source of truth** - All accounts in one place
- **Modular design** - Easy to add accounts or rules
- **Extensible** - Easy to add new features (labels, filters, etc.)
- **Maintainable** - Clear structure and documentation

---

## Risk Assessment

### Low Risk:
- Creating new tool doesn't affect existing gmail-search.js
- Existing gmail-multi-router.js remains unchanged
- No changes to gog or Google OAuth2

### Medium Risk:
- If OAuth tokens expire, need to re-authorize (expected, not unusual)
- Routing rules may need adjustment based on actual usage
- Alias system may need refinement based on common use cases

### Mitigation:
- Test thoroughly before deployment
- Keep git history clean (separate commits for each component)
- Document setup and usage clearly
- Provide rollback plan if issues arise

---

## Implementation Recommendation

**Implement in order:**
1. **Phase 1 (Priority 1)** - Multi-account search tool with alias support
2. **Phase 2 (Priority 2)** - Complete email profiles documentation
3. **Phase 3 (Priority 3)** - Testing and user guide

**Start with Zsolt's answers to the 5 open questions**, then proceed with implementation.

---

## Decision Matrix

| Option | Effort | Benefit | Risk | Recommended |
|--------|--------|---------|------|-------------|
| Multi-account search tool (aliases) | 2-3 hrs | High | Low | ✅ YES |
| Routing rules system | 1-2 hrs | Medium-High | Medium | ✅ YES (after aliases) |
| Email profiles completion | 30 min | Medium | Very Low | ✅ YES (should do) |

**Total Implementation Time:** ~4-5 hours

---

## Next Steps

1. **Get Zsolt's approval** on the implementation plan
2. **Answer 5 open questions** (routing rules, aliases, email profiles)
3. **Implement Phase 1** (multi-account search tool)
4. **Complete Phase 2** (email profiles documentation)
5. **Test and document** (Phase 3)
