# Gmail Account Definitions

**Last Updated:** 2026-03-09
**Purpose:** Central configuration for all 5 Gmail accounts

## Account Structure

Each account requires:
- `email`: Gmail address
- `name`: Display name for this account
- `signingName`: Name to use in email signatures
- `signature`: Full email signature
- `tone`: Communication style (formal/casual)
- `useCase`: Primary use case (personal/business/events)
- `priority`: Priority level (1=personal, 2=dance events, 3=studio, 4=fun events, 5=c3studios)
- `domains`: Allowed domains for outgoing messages (for validation)
- `aliases`: Alternative short names for easy reference

## Account List

### 1. papperpictures (Priority 1)
```json
{
  "email": "papperpictures@gmail.com",
  "name": "Papper Pictures",
  "signingName": "Papper Pictures",
  "signature": "Best regards,\nPapper Pictures\nhttps://papperpictures.nl",
  "tone": "professional",
  "useCase": "personal photography business",
  "priority": 1,
  "domains": ["papperpictures.nl", "papperpictures.com"],
  "aliases": ["personal", "papi", "me"]
}
```

**Usage:**
- Personal communications
- Photography client emails
- General business
- Everyday use

---

### 2. urbandanceteam (Priority 2)
```json
{
  "email": "urbandanceteam@gmail.com",
  "name": "Urban Dance Team",
  "signingName": "Urban Dance Team",
  "signature": "Best regards,\nUrban Dance Team\nhttps://urban-dance-hungary.hu",
  "tone": "enthusiastic",
  "useCase": "urban dance events and workshops",
  "priority": 2,
  "domains": ["urban-dance-hungary.hu", "udh-events.hu"],
  "aliases": ["dance", "udh", "dance-team"]
}
```

**Usage:**
- Urban Dance Forever events
- Dance workshop communications
- Dance community outreach
- Summer Dance Forever events

---

### 3. studio306nl (Priority 3)
```json
{
  "email": "studio306nl@gmail.com",
  "name": "Studio 306",
  "signingName": "Studio 306",
  "signature": "Best regards,\nStudio 306\nHuismanstraat 30, 3082 HK Rotterdam\nhttps://studio306.nl",
  "tone": "professional",
  "useCase": "personal studio operations",
  "priority": 3,
  "domains": ["studio306.nl"],
  "aliases": ["studio", "my-studio", "306"]
}
```

**Usage:**
- Studio inquiries
- Equipment maintenance
- Studio logistics
- Personal admin

---

### 4. funkin4holland (Priority 4)
```json
{
  "email": "funkin4holland@gmail.com",
  "name": "Funkin' 4 Holland",
  "signingName": "Funkin' 4 Holland",
  "signature": "Best regards,\nFunkin' 4 Holland\nhttps://funkin4.nl",
  "tone": "energetic",
  "useCase": "Dutch dance events",
  "priority": 4,
  "domains": ["funkin4.nl"],
  "aliases": ["funkin", "holland", "events"]
}
```

**Usage:**
- Funkin' 4 Holland events
- Dutch dance community
- Event announcements
- Weekend dance events

---

### 5. c3studios.nl (Priority 5)
```json
{
  "email": "c3studios.nl@gmail.com",
  "name": "C3 Studios",
  "signingName": "C3 Studios",
  "signature": "Best regards,\nC3 Studios\nHuismanstraat 30, 3082 HK Rotterdam\nhttps://c3studios.nl",
  "tone": "professional",
  "useCase": "C3 Studios partnership communications",
  "priority": 5,
  "domains": ["c3studios.nl"],
  "aliases": ["c3", "c3studios"]
}
```

**Usage:**
- C3 Studios partnership
- Building management
- Shared studio access
- C3 events

---

## Usage Guidelines

### When to Use Which Account

1. **Always use "personal" (papperpictures) for:**
   - Personal emails to friends/family
   - Client communications that aren't business-specific
   - Everyday inbox management
   - Receipts, invoices from non-business entities

2. **Use "studio" (studio306nl) for:**
   - Studio business inquiries
   - Equipment-related emails
   - Studio maintenance
   - Space booking confirmations

3. **Use "dance" (urbandanceteam) for:**
   - Urban Dance Forever events
   - Dance workshop communications
   - Dance community outreach
   - Summer Dance Forever events

4. **Use "funkin" (funkin4holland) for:**
   - Funkin' 4 Holland events
   - Dutch dance community
   - Weekend dance events

5. **Use "c3" (c3studios.nl) for:**
   - C3 Studios partnership
   - Building management
   - Shared studio access
   - C3 events

### Default Behavior

- **Default account:** papperpictures (personal)
- **Domain matching:** If sending to dance-related domain, use dance account
- **User confirmation:** ALWAYS confirm which account to use before sending
- **Exceptions:** Zsolt explicitly approves different routing

---

*This file is the source of truth for all Gmail account configuration.*
