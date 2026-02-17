# Nimbus Database & Storage

## Access Methods

| Method | Credential | Use For |
|--------|------------|---------|
| **Direct SQL** | `openclaw_nimbus_user` | Database queries, migrations, bulk ops |
| **REST API** | `nimbus@studio306.nl` | PostgREST API, Supabase client |
| **Storage API** | `nimbus@studio306.nl` | File upload/download |

---

## 1. Direct SQL Access

### Connection (Port 5432 - no SSL)
```
postgresql://openclaw_nimbus_user:Ncl4w_N1mbu5_2026!xK9@81.0.107.97:5432/postgres
```

### Connection (Port 5433 - SSL)
```
postgresql://openclaw_nimbus_user:Ncl4w_N1mbu5_2026!xK9@81.0.107.97:5433/postgres?sslmode=require
```

> **Note:** Use direct IP `81.0.107.97`, NOT `auth.studio306.nl` (Cloudflare doesn't proxy PostgreSQL)

### Using db.js
```javascript
const db = require('./db.js');
const result = await db.query('SELECT * FROM my_table WHERE id = $1', [123]);
await db.end();
```

### CLI
```bash
node db.js "SELECT current_schema(), current_user;"
```

---

## 2. Supabase API & Storage

### Credentials
| Field | Value |
|-------|-------|
| URL | `https://auth.studio306.nl` |
| Email | `nimbus@studio306.nl` |
| Password | `Ncl4w_Auth_2026!svcK9` |
| User ID | `66276729-e155-4bae-8474-1b64b05d1fdf` |

### Using storage.js
```javascript
const storage = require('./storage.js');
await storage.signIn();

// Upload
await storage.upload('docs/file.pdf', buffer);

// Download
const data = await storage.download('docs/file.pdf');

// List
const files = await storage.list('docs/');
```

---

## 3. Storage Bucket

| Field | Value |
|-------|-------|
| Bucket | `nimbus` |
| Access | Private (auth required) |
| Max Size | 50 MB per file |

---

## 4. pgvector for Embeddings

```javascript
const db = require('./db.js');

// Create vector table
await db.query(`
  CREATE TABLE IF NOT EXISTS embeddings (
    id SERIAL PRIMARY KEY,
    content TEXT,
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`);

// Similarity search
const results = await db.query(`
  SELECT content, 1 - (embedding <=> $1::vector) as similarity
  FROM embeddings
  ORDER BY embedding <=> $1::vector
  LIMIT 5
`, [JSON.stringify(queryEmbedding)]);
```

---

## Environment Variables

Already set in docker-compose:
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SCHEMA`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_AUTH_EMAIL`, `SUPABASE_AUTH_PASSWORD`

---

## Network

VM IP `34.57.90.52` is whitelisted for ports 5432, 5433.
