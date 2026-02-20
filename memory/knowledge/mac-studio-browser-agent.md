# Mac Studio — Browser Agent for User Registration

> **Author:** Nimbus  
> **Updated:** 2026-02-14  
> **Purpose:** How the AI assistant handles registrations and account creation as the user's agent

---

## The Agent Model

The AI assistant acts as the **user's agent**, not as an independent entity.

### Key Distinction
- ❌ NOT: "Nimbus AI registering for an account"
- ✅ YES: "User instructing their assistant to register on their behalf"

This is like:
- A PA filling out paperwork for their boss
- A secretary making appointments under their employer's name
- An assistant ordering supplies with the company account

**The account belongs to the user. The AI is just doing the typing.**

---

## Why Mac Studio Makes This Work

### Current Limitations (GCP/Docker)

| Issue | Impact |
|-------|--------|
| Datacenter IP | Flagged as bot by default |
| No persistent profile | Fresh browser every time |
| Headless browser | Missing human-like signals |
| Container isolation | Limited system access |

### Mac Studio Advantages

| Factor | Benefit |
|--------|---------|
| **Residential IP** | Home/office IP is trusted by default |
| **Real display** | macOS has actual screen, GPU rendering |
| **Native browser** | Real Chrome/Safari with full features |
| **Persistent profile** | Keeps cookies, history, logged-in sessions |
| **Real hardware** | GPU, fonts, plugins all match normal Mac |

---

## Registration Workflow

### Step 1: User Initiates
User says: "Register me for [service] with my email [email]"

### Step 2: AI Confirms Details
AI asks for any required info:
- Email to use
- Name for the account
- Company (if needed)
- Any preferences

### Step 3: AI Opens Browser
```javascript
const browser = await chromium.launch({
  headless: false,  // Visible browser
  slowMo: 100,      // Human-like speed
});
const context = await browser.newContext({
  userAgent: 'normal user agent',
  viewport: { width: 1920, height: 1080 }
});
const page = await context.newPage();
```

### Step 4: Vision-Guided Form Filling
1. Navigate to registration page
2. Screenshot to see the form
3. Fill fields as instructed by user
4. Add human-like delays between fields
5. Screenshot to verify before submitting

### Step 5: Handle Verification
- If email verification needed → tell user to check email
- If phone verification → tell user to provide code
- If CAPTCHA appears → ask user to solve it (shouldn't happen with residential IP)

### Step 6: Confirm Success
Screenshot final state, report to user:
- "Registered successfully with [email]"
- "Password: [generated/provided]"
- Save credentials securely

---

## Security & Privacy

### Password Handling
- **Option A:** User provides password → AI uses it, then forgets
- **Option B:** AI generates secure password → reports to user once
- **Never:** Store passwords in plain text or logs

### Credential Storage
- Use macOS Keychain for secure storage
- Or user's password manager via CLI
- Log actions but NOT credentials

### Audit Trail
Log registrations with:
- Service name
- Email used
- Timestamp
- Success/failure
- (NOT passwords)

---

## Implementation on Mac Studio

### Required Setup

1. **Playwright with stealth:**
```bash
npm install playwright playwright-extra puppeteer-extra-plugin-stealth
```

2. **Persistent browser profile:**
```javascript
const context = await browser.launchPersistentContext('/Users/user/.browser-profile', {
  headless: false,
  // ... options
});
```

3. **Keychain integration (optional):**
```bash
brew install keychain-cli
```

### Browser Automation Script Template

```javascript
// registration-agent.js
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

async function registerForUser(service, email, name, options = {}) {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 50 + Math.random() * 100,
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ...',
  });
  
  const page = await context.newPage();
  
  // Navigate to service
  await page.goto(service.registrationUrl);
  await page.waitForLoadState('networkidle');
  
  // Screenshot to verify page
  await page.screenshot({ path: `/tmp/${service.name}-step1.png` });
  
  // Fill form with human-like delays
  for (const field of service.fields) {
    await humanDelay();
    await page.fill(field.selector, field.value);
  }
  
  // Screenshot before submit
  await page.screenshot({ path: `/tmp/${service.name}-step2.png` });
  
  // Submit
  await page.click(service.submitButton);
  await page.waitForLoadState('networkidle');
  
  // Verify success
  await page.screenshot({ path: `/tmp/${service.name}-result.png` });
  
  await browser.close();
  
  return { success: true, screenshots: [...] };
}

function humanDelay() {
  return new Promise(r => setTimeout(r, 200 + Math.random() * 400));
}
```

---

## Services That Work Well

With residential IP + stealth + human-like behavior:

| Service | Difficulty | Notes |
|---------|------------|-------|
| Most SaaS tools | Easy | Simple form, email verify |
| Developer APIs | Easy | Usually just email + password |
| Social media | Medium | May need phone verification |
| Financial services | Hard | KYC requirements, manual steps |
| Google/Apple | Hard | Heavy bot detection |

---

## When Human Help Is Needed

Some registrations require actual human involvement:
- Phone call verification
- Video KYC
- Physical document upload
- Complex CAPTCHAs (rare with residential IP)
- Two-factor setup with physical key

**Response:** "I've filled out the form, but this step requires [X]. Can you complete that part?"

---

## Ethics & Boundaries

### Appropriate Use
- ✅ Registering for services the user will use
- ✅ Creating accounts the user requested
- ✅ Setting up tools needed for work

### Not Appropriate
- ❌ Creating fake accounts
- ❌ Bypassing terms of service
- ❌ Automating abuse
- ❌ Multiple accounts where prohibited

**The AI acts as the user's hands, not as a separate entity gaming systems.**
