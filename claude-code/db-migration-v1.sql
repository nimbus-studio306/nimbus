-- =============================================================================
-- Database Migration v1: Foundation Fixes + 3072d Embedding Migration
-- Schema: project_openclaw_nimbus
-- Date: 2026-02-06
-- Author: Claude Code (reviewed by Nimbus + Zsolt)
--
-- Run with:
--   PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER \
--     -d $DB_NAME -v ON_ERROR_STOP=1 -f db-migration-v1.sql
--
-- Always run in a transaction. Rollback if anything fails.
--
-- WHAT THIS DOES:
--   1. Adds embedding_model tracking columns
--   2. Clears ALL existing 768d embeddings (incompatible with new 3072d model)
--   3. Drops ALL existing vector indexes (built for 768d data)
--   4. Adds missing FK on edges.source_message_id
--   5. Drops duplicate indexes on edges table
--   6. Cleans up artifact nodes (I, You, Claude, date_ref)
--   7. Adds same_as edges for duplicate category/entity nodes
--   8. Adds missing entity aliases
--   9. Adds Nimbus agent edges
--
-- AFTER THIS MIGRATION:
--   - Run batch-re-embed.py to re-embed ALL data at 3072d
--   - Run db-migration-v1-indexes.sql to create new vector indexes
-- =============================================================================

BEGIN;

SET search_path TO project_openclaw_nimbus;

-- =============================================================================
-- 1. ADD embedding_model COLUMN TO ALL EMBEDDING TABLES
--    Track which model produced each embedding. Prevents silent model mixing.
-- =============================================================================

ALTER TABLE nodes ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(50);
ALTER TABLE structured_messages ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(50);
ALTER TABLE structured_sessions ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(50);
ALTER TABLE emails ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(50);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(50);
ALTER TABLE memories ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(50);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(50);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(50);

-- =============================================================================
-- 2. CLEAR ALL EXISTING 768d EMBEDDINGS
--    These are incompatible with the new gemini-embedding-001 3072d vectors.
--    The old embeddings were a mix of:
--      - text-embedding-004 (768d) in messages/sessions/emails/documents/memories
--      - gemini-embedding-001 forced to 768d in nodes (different vector space!)
--    All must be cleared and re-embedded uniformly.
--
--    Counts being cleared:
--      structured_messages: 3,282
--      nodes: 82
--      memories: 23
--      emails: 18
--      documents: 17
--      structured_sessions: 5
-- =============================================================================

UPDATE structured_messages SET embedding = NULL, embedding_model = NULL WHERE embedding IS NOT NULL;
UPDATE nodes SET embedding = NULL, embedding_model = NULL WHERE embedding IS NOT NULL;
UPDATE memories SET embedding = NULL, embedding_model = NULL WHERE embedding IS NOT NULL;
UPDATE emails SET embedding = NULL, embedding_model = NULL WHERE embedding IS NOT NULL;
UPDATE documents SET embedding = NULL, embedding_model = NULL WHERE embedding IS NOT NULL;
UPDATE structured_sessions SET embedding = NULL, embedding_model = NULL WHERE embedding IS NOT NULL;
UPDATE messages SET embedding = NULL, embedding_model = NULL WHERE embedding IS NOT NULL;
UPDATE sessions SET embedding = NULL, embedding_model = NULL WHERE embedding IS NOT NULL;

-- =============================================================================
-- 2b. ALTER VECTOR COLUMNS FROM 768d TO 3072d
--     Columns are typed as vector(768) — must be widened before 3072d inserts.
--     Safe to run after clearing embeddings (all NULLs, no data conversion).
-- =============================================================================

SET search_path TO project_openclaw_nimbus, public;
ALTER TABLE nodes ALTER COLUMN embedding TYPE vector(3072);
ALTER TABLE structured_messages ALTER COLUMN embedding TYPE vector(3072);
ALTER TABLE structured_sessions ALTER COLUMN embedding TYPE vector(3072);
ALTER TABLE emails ALTER COLUMN embedding TYPE vector(3072);
ALTER TABLE documents ALTER COLUMN embedding TYPE vector(3072);
ALTER TABLE memories ALTER COLUMN embedding TYPE vector(3072);
ALTER TABLE messages ALTER COLUMN embedding TYPE vector(3072);
ALTER TABLE sessions ALTER COLUMN embedding TYPE vector(3072);
SET search_path TO project_openclaw_nimbus;

-- =============================================================================
-- 3. DROP ALL EXISTING VECTOR INDEXES
--    These were built for 768d data and must be recreated after re-embedding.
--    New indexes will be created in db-migration-v1-indexes.sql AFTER
--    re-embedding is complete (IVFFlat needs data to build lists).
--
--    Existing indexes being dropped:
--      idx_emails_embedding     - IVFFlat, lists=20
--      idx_messages_embedding   - IVFFlat, lists=100 (on old messages table)
--      idx_nodes_embedding      - IVFFlat, lists=50
--      idx_sessions_embedding   - IVFFlat, lists=20
--      memories_emb_idx         - HNSW (partial: WHERE embedding IS NOT NULL)
--      nodes_emb_idx            - HNSW (partial: WHERE NOT deleted, duplicates idx_nodes_embedding)
-- =============================================================================

DROP INDEX IF EXISTS idx_emails_embedding;
DROP INDEX IF EXISTS idx_messages_embedding;
DROP INDEX IF EXISTS idx_nodes_embedding;
DROP INDEX IF EXISTS idx_sessions_embedding;
DROP INDEX IF EXISTS memories_emb_idx;
DROP INDEX IF EXISTS nodes_emb_idx;

-- =============================================================================
-- 4. ADD MISSING FOREIGN KEY: edges.source_message_id -> structured_messages.id
--    The column exists but has no referential integrity.
-- =============================================================================

-- Check if constraint already exists before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'edges_source_message_id_fkey'
  ) THEN
    ALTER TABLE edges
      ADD CONSTRAINT edges_source_message_id_fkey
      FOREIGN KEY (source_message_id) REFERENCES structured_messages(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================================================
-- 5. DROP DUPLICATE INDEXES ON edges
--    Three pairs of identical indexes wasting space and write performance.
-- =============================================================================

DROP INDEX IF EXISTS edges_source_idx;  -- duplicate of idx_edges_source
DROP INDEX IF EXISTS edges_target_idx;  -- duplicate of idx_edges_target
DROP INDEX IF EXISTS edges_type_idx;    -- duplicate of idx_edges_type

-- =============================================================================
-- 6. CLEAN UP ARTIFACT NODES
--    "I", "You", "Claude claude-opus-4-5" are extraction artifacts, not real people.
--    date_ref nodes are timestamps misidentified as entities.
-- =============================================================================

-- Remove aliases pointing to artifact nodes first (FK constraint)
DELETE FROM entity_aliases WHERE canonical_node_id IN (
  SELECT id FROM nodes
  WHERE (node_type = 'person' AND name IN ('I', 'You', 'Claude claude-opus-4-5'))
     OR node_type = 'date_ref'
);

-- Remove edges connected to artifact nodes
DELETE FROM edges WHERE source_id IN (
  SELECT id FROM nodes
  WHERE (node_type = 'person' AND name IN ('I', 'You', 'Claude claude-opus-4-5'))
     OR node_type = 'date_ref'
) OR target_id IN (
  SELECT id FROM nodes
  WHERE (node_type = 'person' AND name IN ('I', 'You', 'Claude claude-opus-4-5'))
     OR node_type = 'date_ref'
);

-- Soft delete the artifact nodes
UPDATE nodes SET deleted_at = NOW()
WHERE (node_type = 'person' AND name IN ('I', 'You', 'Claude claude-opus-4-5'))
   OR node_type = 'date_ref';

-- =============================================================================
-- 7. ADD same_as EDGES BETWEEN DUPLICATE CATEGORY/ENTITY NODES
--    "Docker" exists as both a category and a tool. Link them.
-- =============================================================================

INSERT INTO edges (source_id, target_id, edge_type, source_type, confidence, review_status)
SELECT c.id, t.id, 'same_as', 'system', 1.0, 'auto_approved'
FROM nodes c
JOIN nodes t ON lower(c.name) = lower(t.name) AND c.node_type != t.node_type
WHERE c.node_type = 'category'
  AND t.node_type IN ('tool', 'project')
  AND c.deleted_at IS NULL
  AND t.deleted_at IS NULL
ON CONFLICT (source_id, target_id, edge_type) DO NOTHING;

-- =============================================================================
-- 8. ADD MISSING ALIASES
-- =============================================================================

-- Zsolt aliases
INSERT INTO entity_aliases (canonical_node_id, alias, alias_normalized)
SELECT id, 'Zsolt', 'zsolt' FROM nodes WHERE name = 'Zsolt Szederkényi' AND node_type = 'person'
ON CONFLICT (alias_normalized) DO NOTHING;

INSERT INTO entity_aliases (canonical_node_id, alias, alias_normalized)
SELECT id, 'Papi', 'papi' FROM nodes WHERE name = 'Zsolt Szederkényi' AND node_type = 'person'
ON CONFLICT (alias_normalized) DO NOTHING;

INSERT INTO entity_aliases (canonical_node_id, alias, alias_normalized)
SELECT id, 'Szederkényi', 'szederkényi' FROM nodes WHERE name = 'Zsolt Szederkényi' AND node_type = 'person'
ON CONFLICT (alias_normalized) DO NOTHING;

-- Nimbus aliases
INSERT INTO entity_aliases (canonical_node_id, alias, alias_normalized)
SELECT id, 'Nimbus', 'nimbus' FROM nodes WHERE name = 'Nimbus' AND node_type = 'agent'
ON CONFLICT (alias_normalized) DO NOTHING;

INSERT INTO entity_aliases (canonical_node_id, alias, alias_normalized)
SELECT id, 'Nimbusz', 'nimbusz' FROM nodes WHERE name = 'Nimbus' AND node_type = 'agent'
ON CONFLICT (alias_normalized) DO NOTHING;

-- Anya
INSERT INTO entity_aliases (canonical_node_id, alias, alias_normalized)
SELECT id, 'Anya', 'anya' FROM nodes WHERE name = 'Anya' AND node_type = 'person'
ON CONFLICT (alias_normalized) DO NOTHING;

-- Zizi
INSERT INTO entity_aliases (canonical_node_id, alias, alias_normalized)
SELECT id, 'Zizi', 'zizi' FROM nodes WHERE name = 'Zizi' AND node_type = 'person'
ON CONFLICT (alias_normalized) DO NOTHING;

-- OpenClaw aliases
INSERT INTO entity_aliases (canonical_node_id, alias, alias_normalized)
SELECT id, 'openclaw', 'openclaw' FROM nodes WHERE name = 'OpenClaw' AND node_type = 'project'
ON CONFLICT (alias_normalized) DO NOTHING;

INSERT INTO entity_aliases (canonical_node_id, alias, alias_normalized)
SELECT id, 'Clawdbot', 'clawdbot' FROM nodes WHERE name = 'OpenClaw' AND node_type = 'project'
ON CONFLICT (alias_normalized) DO NOTHING;

-- =============================================================================
-- 9. ADD Nimbus NODE EDGES
--    The Nimbus agent node (1 node, 0 edges) should be connected.
-- =============================================================================

-- Nimbus is an instance of the OpenClaw project
INSERT INTO edges (source_id, target_id, edge_type, source_type, confidence, review_status)
SELECT n.id, p.id, 'instance_of', 'system', 1.0, 'auto_approved'
FROM nodes n, nodes p
WHERE n.name = 'Nimbus' AND n.node_type = 'agent'
  AND p.name = 'OpenClaw' AND p.node_type = 'project'
ON CONFLICT (source_id, target_id, edge_type) DO NOTHING;

-- Zsolt owns/operates Nimbus
INSERT INTO edges (source_id, target_id, edge_type, source_type, confidence, review_status)
SELECT z.id, n.id, 'operates', 'system', 1.0, 'auto_approved'
FROM nodes z, nodes n
WHERE z.name = 'Zsolt Szederkényi' AND z.node_type = 'person'
  AND n.name = 'Nimbus' AND n.node_type = 'agent'
ON CONFLICT (source_id, target_id, edge_type) DO NOTHING;

-- =============================================================================
-- 10. VERIFY (sanity check before commit)
-- =============================================================================

DO $$
DECLARE
  node_count INTEGER;
  edge_count INTEGER;
  alias_count INTEGER;
  artifact_count INTEGER;
  orphan_embeddings INTEGER;
BEGIN
  SELECT count(*) INTO node_count FROM nodes WHERE deleted_at IS NULL;
  SELECT count(*) INTO edge_count FROM edges;
  SELECT count(*) INTO alias_count FROM entity_aliases;
  SELECT count(*) INTO artifact_count FROM nodes
    WHERE deleted_at IS NOT NULL
    AND (node_type = 'date_ref' OR name IN ('I', 'You', 'Claude claude-opus-4-5'));

  -- Verify all embeddings were cleared
  SELECT count(*) INTO orphan_embeddings FROM (
    SELECT 1 FROM structured_messages WHERE embedding IS NOT NULL
    UNION ALL SELECT 1 FROM nodes WHERE embedding IS NOT NULL
    UNION ALL SELECT 1 FROM memories WHERE embedding IS NOT NULL
    UNION ALL SELECT 1 FROM emails WHERE embedding IS NOT NULL
    UNION ALL SELECT 1 FROM documents WHERE embedding IS NOT NULL
    UNION ALL SELECT 1 FROM structured_sessions WHERE embedding IS NOT NULL
  ) t;

  RAISE NOTICE '=== Migration v1 Summary ===';
  RAISE NOTICE 'Active nodes: %', node_count;
  RAISE NOTICE 'Total edges: %', edge_count;
  RAISE NOTICE 'Total aliases: %', alias_count;
  RAISE NOTICE 'Soft-deleted artifacts: %', artifact_count;
  RAISE NOTICE 'Remaining embeddings (should be 0): %', orphan_embeddings;

  IF orphan_embeddings > 0 THEN
    RAISE WARNING 'Not all embeddings were cleared! % remain', orphan_embeddings;
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- POST-MIGRATION: Two-step process
-- =============================================================================
--
-- STEP 1: Re-embed all data at 3072d using gemini-embedding-001
--   Run: python3 batch-re-embed.py
--   This re-embeds (in order of priority):
--     - nodes (82 rows) — critical for graph queries
--     - memories (23 rows) — core knowledge
--     - documents (17 rows) — knowledge base
--     - emails (18 rows) — communication history
--     - structured_sessions (5 rows) — session summaries
--     - structured_messages (3,282 rows) — bulk, run last
--   All scripts already updated to use gemini-embedding-001 (3072d native).
--
-- STEP 2: Create new vector indexes for 3072d
--   Run: psql ... -f db-migration-v1-indexes.sql
--   IVFFlat indexes need populated data to compute list centroids,
--   so indexes MUST be created AFTER re-embedding, not before.
--
-- NOTE: messages/sessions/category_nodes are NOT legacy — they are
-- the import layer used by import-sessions.py, import-structured.py,
-- convert-to-structured.py, and tag_batch.py. Do not drop.
-- =============================================================================
