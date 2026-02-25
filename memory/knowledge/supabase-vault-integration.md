# Supabase Vault Integration Patterns

**Purpose:** Secure credential storage using Supabase Vault

**Status:** Research Phase

---

## What is Supabase Vault?

Supabase Vault is a service for securely storing secrets, certificates, and sensitive data. It provides:

- **HashiCorp Vault integration:** Native support for Vault authentication
- **Client libraries:** JavaScript, Go, Python, etc.
- **Policies:** RBAC for secret access
- **Audit logging:** Track who accessed what

---

## Integration Approaches

### 1. External Vault (HashiCorp)

**Architecture:**
```
OpenClaw (Zsolt's VPS)
    ↓ HTTPS
Supabase Vault (managed by Zsolt)
    ↓
Applications using Vault API
```

**Pros:**
- Enterprise-grade security
- Auditing and compliance
- Centralized secret management

**Cons:**
- Requires Vault infrastructure
- Additional complexity
- Network dependency

**Implementation Pattern:**
```javascript
// Via Supabase Edge Functions or separate microservice
async function getSecret(secretName) {
  const response = await fetch(`${supabaseUrl}/vault/secrets/${secretName}`, {
    headers: {
      'Authorization': `Bearer ${vaultApiKey}`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
}
```

### 2. Supabase Database with Row-Level Security

**Architecture:**
```
Supabase Database
  - vault_credentials table
    - id
    - name (e.g., "gmail_papperpictures")
    - encrypted_value (AES-256)
    - created_at
    - updated_at
  - row_level_security enabled
    - allowlist of user IDs (only Zsolt's account)
```

**Pros:**
- Built into Supabase infrastructure
- No external services
- Same auth as main database

**Cons:**
- Less specialized than Vault
- Can be bypassed if RLS misconfigured
- Not audit-trail focused

**Implementation Pattern:**
```sql
-- Table
CREATE TABLE vault_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  encrypted_value BYTEA NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy
CREATE POLICY "Only Zsolt can access vault" ON vault_credentials
  USING (auth.uid() = (SELECT user_id FROM users WHERE email = 'zsolt@studio306.nl'));

-- Encryption (using crypto-js or similar)
const encrypted = CryptoJS.AES.encrypt(secret, encryptionKey).toString();
```

### 3. Hybrid: Database + External Vault

**Architecture:**
```
OpenClaw Gateway
  ↓
PostgreSQL Database (supabase_vault table for regular secrets)
  ↓
HashiCorp Vault (for highly sensitive secrets like API keys)
```

**Pros:**
- Flexible: regular secrets in DB, ultra-sensitive in Vault
- Leverage both strengths
- Gradual migration path

**Cons:**
- Multiple systems to maintain
- Complexity in access patterns
- Potential for inconsistent security

---

## Recommended Pattern for Zsolt

**Current State:**
- Credentials stored in `/home/papperpictures/.openclaw/credentials/`
- `.env` files with partial secrets (redacted in docs)
- Google OAuth tokens stored in JSON files

**Recommended Approach:** Hybrid

**Phase 1 (Quick Win): Database + RLS**
- Migrate credentials to Supabase vault_credentials table
- Enable strict RLS policies
- Encrypt sensitive values (AES-256)
- No external infrastructure needed

**Phase 2 (Future): Vault Integration**
- When Zsolt has dedicated Vault infrastructure
- Migrate API keys to Vault
- Use Supabase as proxy for application access

---

## Implementation Plan

### Step 1: Database Schema
```sql
CREATE TABLE vault_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  encrypted_value BYTEA NOT NULL,
  category TEXT,  -- 'api_key', 'token', 'credential', etc.
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  accessed_by UUID,
  accessed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_vault_name ON vault_credentials(name);
CREATE INDEX idx_vault_category ON vault_credentials(category);

-- RLS Policy (adjust for actual Supabase setup)
CREATE POLICY "Vault access restricted" ON vault_credentials
  FOR SELECT
  USING (auth.uid() = (SELECT id FROM users WHERE email = 'zsolt@studio306.nl'));
```

### Step 2: Encryption Helper
```javascript
// scripts/vault/encrypt-secret.js
const CryptoJS = require('crypto-js');

const ENCRYPTION_KEY = process.env.VAULT_ENCRYPTION_KEY;  // 32-byte key

function encrypt(text) {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

function decrypt(encryptedText) {
  const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

module.exports = { encrypt, decrypt };
```

### Step 3: Migration Script
```javascript
// scripts/vault/migrate-credentials.js
const fs = require('fs');
const path = require('path');
const { encrypt } = require('./encrypt-secret');

const credentialsDir = '/home/papperpictures/.openclaw/credentials';
const envFile = '/home/papperpictures/.openclaw/workspace/.env.email';

function migrate() {
  // Read existing credentials
  const envContent = fs.readFileSync(envFile, 'utf8');

  // Parse and encrypt
  const credentials = [];
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value && !key.startsWith('#')) {
      credentials.push({
        name: key,
        encrypted_value: encrypt(value),
        category: 'api_key'
      });
    }
  });

  // Save to Supabase (via API client)
  console.log(`Migrated ${credentials.length} credentials`);
}

migrate();
```

### Step 4: Access Pattern
```javascript
// Instead of reading directly from file
// scripts/vault/get-secret.js
const { decrypt } = require('./encrypt-secret');

async function getSecret(secretName) {
  // Fetch from Supabase with RLS
  const { data, error } = await supabase
    .from('vault_credentials')
    .select('encrypted_value')
    .eq('name', secretName)
    .single();

  if (error) throw error;

  return decrypt(data.encrypted_value);
}

// Usage
const apiKey = await getSecret('gmail_api_key');
```

---

## Security Considerations

### 🔐 Encryption
- Use AES-256 GCM for encryption
- Key rotation strategy (rotate encryption key quarterly)
- Never store unencrypted secrets

### 🔒 Access Control
- Strict RLS policies
- Audit all vault accesses
- Require explicit authorization for each secret
- Principle of least privilege

### 📋 Audit Logging
- Log all read operations (who, when, which secret)
- Log all write operations (who, when, which secret)
- Alert on failed access attempts

### 🔄 Key Management
- Encryption key stored in environment (never in git)
- Rotate keys regularly
- Backup keys securely (separate storage)

---

## Current Issues

### ❌ Current Setup
- Credentials in `/home/papperpictures/.openclaw/credentials/`
- `.env` files partially redacted
- No encryption at rest
- No access control beyond file permissions

### ✅ Proposed Improvements
- ✅ Database-backed storage
- ✅ Encryption at rest
- ✅ Row-level security
- ✅ Audit logging
- ✅ Centralized secret management

---

## Next Steps

1. **Discuss with Zsolt:**
   - Does Supabase Vault exist in his infrastructure?
   - What's his preferred approach (DB only vs Vault)?
   - Do we have an encryption key management strategy?

2. **Implementation:**
   - Create vault_credentials table
   - Implement encryption/decryption helpers
   - Migrate existing credentials
   - Update scripts to use vault instead of files

3. **Testing:**
   - Verify encryption/decryption works
   - Test RLS policies
   - Audit access logs
   - Migrate all credential files

---

**References:**
- Supabase Vault documentation
- HashiCorp Vault integration guides
- Current credential audit: `memory/knowledge/security-credential-audit.md`
