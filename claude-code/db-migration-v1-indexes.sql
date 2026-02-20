-- =============================================================================
-- Database Migration v1 - STEP 2: Create Vector Indexes for 3072d
-- Schema: project_openclaw_nimbus
-- Date: 2026-02-06
-- Author: Claude Code
--
-- PREREQUISITE: Run AFTER batch-re-embed.py has completed.
--
-- pgvector 0.8.0 limits: HNSW and IVFFlat max 2000d on `vector` type.
-- At 3072d, we use halfvec cast for indexing (supports up to 4096d).
-- Data stays as vector(3072) — the index expression casts to halfvec(3072).
-- halfvec uses float16 (vs float32) — negligible recall loss at 3072d.
--
-- Run with:
--   PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER \
--     -d $DB_NAME -v ON_ERROR_STOP=1 -f db-migration-v1-indexes.sql
-- =============================================================================

SET search_path TO project_openclaw_nimbus, public;

-- Check embedding counts before creating indexes
DO $$
DECLARE
  sm_count INTEGER;
  node_count INTEGER;
  mem_count INTEGER;
  email_count INTEGER;
  doc_count INTEGER;
  sess_count INTEGER;
BEGIN
  SELECT count(*) INTO sm_count FROM structured_messages WHERE embedding IS NOT NULL;
  SELECT count(*) INTO node_count FROM nodes WHERE embedding IS NOT NULL;
  SELECT count(*) INTO mem_count FROM memories WHERE embedding IS NOT NULL;
  SELECT count(*) INTO email_count FROM emails WHERE embedding IS NOT NULL;
  SELECT count(*) INTO doc_count FROM documents WHERE embedding IS NOT NULL;
  SELECT count(*) INTO sess_count FROM structured_sessions WHERE embedding IS NOT NULL;

  RAISE NOTICE 'Embedded rows: messages=%, nodes=%, memories=%, emails=%, documents=%, sessions=%',
    sm_count, node_count, mem_count, email_count, doc_count, sess_count;

  IF sm_count = 0 THEN
    RAISE EXCEPTION 'No embedded messages found. Run batch-re-embed.py first!';
  END IF;
END $$;

-- =============================================================================
-- structured_messages: Main search table, highest row count
-- HNSW on halfvec cast (3072d exceeds vector type's 2000d index limit)
-- m=16, ef_construction=64 balances build speed and recall
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_sm_embedding_3072
  ON structured_messages
  USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- =============================================================================
-- nodes: Graph entity search
-- HNSW on halfvec cast, partial index: only active nodes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_nodes_embedding_3072
  ON nodes
  USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops)
  WHERE embedding IS NOT NULL AND deleted_at IS NULL;

-- =============================================================================
-- memories: Core knowledge retrieval
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_memories_embedding_3072
  ON memories
  USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops)
  WHERE embedding IS NOT NULL;

-- =============================================================================
-- documents: Knowledge base search
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_documents_embedding_3072
  ON documents
  USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops)
  WHERE embedding IS NOT NULL;

-- =============================================================================
-- emails: Communication search
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_emails_embedding_3072
  ON emails
  USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops)
  WHERE embedding IS NOT NULL;

-- =============================================================================
-- structured_sessions: Session summary search
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_sessions_embedding_3072
  ON structured_sessions
  USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops)
  WHERE embedding IS NOT NULL;

-- =============================================================================
-- Verify indexes were created
-- =============================================================================
DO $$
DECLARE
  idx_count INTEGER;
BEGIN
  SELECT count(*) INTO idx_count
  FROM pg_indexes
  WHERE schemaname = 'project_openclaw_nimbus'
    AND (indexdef LIKE '%vector%' OR indexdef LIKE '%halfvec%');

  RAISE NOTICE 'Vector indexes created: %', idx_count;
END $$;
