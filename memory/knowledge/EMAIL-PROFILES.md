# Email Account Profiles

*Documenting how to use each Gmail account — signatures, tone, and when to use which.*

**Status:** DRAFT — awaiting Zsolt's review and input

---

## Quick Reference

| Account | Display Name | Primary Use | Status |
|---------|--------------|-------------|--------|
| `papperpictures@gmail.com` | "Zsolt Szederkényi" | Personal, general correspondence | ✅ Active |
| `urbandanceteam@gmail.com` | "Urban Dance Team" | Urban Dance Forever events | ✅ Active |
| `studio306nl@gmail.com` | "Studio 306" / "Zsolt Szederkényi — Studio 306" | Photography/video business | ✅ Active |
| `funkin4holland@gmail.com` | "Funkin' 4 Holland" | Dance events, Netherlands | ✅ Active |
| `c3studios.nl@gmail.com` | "C3 Studios" | C3 Studios partnership | ✅ Active |

---

## Detailed Profiles

### 1. papperpictures@gmail.com — Personal

**Display Name:** Zsolt Szederkényi

**When to Use:**
- Personal correspondence
- General inquiries not specific to a business
- Networking (when not representing a specific brand)

**Tone & Style:**
- Professional but personal
- Can be more relaxed than business accounts
- First-name basis acceptable

**Signature:**
```
Zsolt Szederkényi
papperpictures@gmail.com
```

**Aliases/Send-As:**
- `hello@papperpictures.nl` (preferred for public-facing)

---

### 2. urbandanceteam@gmail.com — Urban Dance Team

**Display Name:** Urban Dance Team

**When to Use:**
- Urban Dance Forever event coordination
- Dance community outreach
- Crew-related communication

**Tone & Style:**
- Energetic, community-focused
- Representative of the dance crew/brand
- Use "we" not "I" where appropriate

**Signature:**
```
Urban Dance Team
urbandanceteam@gmail.com
```

---

### 3. studio306nl@gmail.com — Studio 306

**Display Name:** Studio 306 (or "Zsolt Szederkényi — Studio 306")

**When to Use:**
- Photography/video business inquiries
- Client communication for Studio 306 projects
- Professional creative services

**Tone & Style:**
- Professional, creative industry tone
- Consultative — ask about project goals, offer strategic input
- Research client before responding (check their website, social)
- Ask deliverables + budget early (not price-first, understanding-first)

**Signature:**
```
Zsolt Szederkényi — Studio 306
studio306nl@gmail.com
https://studio306.nl
```

**Aliases/Send-As:**
- `nimbus@studio306.nl` (Nimbus/AI assistant account)
- `zsolt@studio306.nl` (direct personal business)
- `hello@studio306.nl` (general inquiries)

---

### 4. funkin4holland@gmail.com — Funkin' 4 Holland

**Display Name:** Funkin' 4 Holland

**When to Use:**
- Funkin' 4 Holland event coordination
- Netherlands dance scene communication
- Event promotion and logistics

**Tone & Style:**
- Event-organizer energy
- Representative of the brand/event series
- Community and culture focused

**Signature:**
```
Funkin' 4 Holland
funkin4holland@gmail.com
```

**Aliases/Send-As:**
- `zsolt@funkin4.nl`

---

### 5. c3studios.nl@gmail.com — C3 Studios

**Display Name:** C3 Studios (⚠️ Never show "@gmail.com" to recipients)

**When to Use:**
- C3 Studios partnership communication
- Joint venture coordination
- Business related to the C3 Studios entity

**Tone & Style:**
- Professional partnership tone
- Representing the studio as an organization
- Formal but not stiff

**Signature:**
```
C3 Studios
admin@c3studios.nl
```

**Aliases/Send-As:**
- `admin@c3studios.nl`
- `info@c3studios.nl` (⚠️ RECEIVE ONLY — do not send from this address)

---

## Decision Flowchart

```
What is this email about?
│
├─→ Personal / General → papperpictures@gmail.com
│
├─→ Urban Dance Forever / Dance crew → urbandanceteam@gmail.com
│
├─→ Photography / Video / Creative services → studio306nl@gmail.com
│
├─→ Funkin' 4 Holland / NL dance events → funkin4holland@gmail.com
│
└─→ C3 Studios partnership → c3studios.nl@gmail.com
```

---

## Open Questions (for Zsolt)

1. **Priority/Preference:** When multiple accounts could apply, which takes precedence?

2. **Response Time Expectations:** Different SLAs for different accounts?
   - Personal: ???
   - Business (Studio 306): ???
   - Events (UDT/F4H): ???

3. **Auto-Response/Out-of-Office:** Different messages for different accounts?

4. **Forwarding Rules:** Should any accounts auto-forward to others?

5. **Archive vs Delete:** Retention policies per account?

6. **Signature Variations:** Different signatures for different contexts (e.g., new inquiry vs. ongoing thread)?

7. **Tone Calibration:** Any accounts that should be more/less formal than described?

---

## Technical Notes

- All accounts configured in `gog` CLI for multi-account access
- OAuth2 refresh tokens may expire — re-authorization needed periodically
- Signatures are NOT automatically appended by Gmail API — must be manually added
- See `/home/papperpictures/.openclaw/workspace/email-signatures.json` for full signature list

---

*Last updated: 2026-02-25*
*Next step: Review with Zsolt and fill in open questions*
