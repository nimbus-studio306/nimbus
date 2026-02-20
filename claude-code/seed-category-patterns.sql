-- =============================================================================
-- Seed match_patterns into category nodes' properties.
-- These are loaded by db-watcher.py for inline tagging on ingest.
--
-- To add/edit patterns: UPDATE the properties JSONB on the category node.
-- db-watcher.py reloads patterns every 5 minutes automatically.
--
-- Run with:
--   PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER \
--     -d $DB_NAME -f seed-category-patterns.sql
-- =============================================================================

SET search_path TO project_openclaw_nimbus;

-- Helper: merge match_patterns into existing properties without overwriting other keys
-- Usage: properties = properties || '{"match_patterns": [...]}'::jsonb

-- Messaging channels
UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bwhatsapp\\b"]}'::jsonb
WHERE id = 214 AND node_type = 'category';

UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\btelegram\\b"]}'::jsonb
WHERE id = 215 AND node_type = 'category';

UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bsignal[-_]?cli\\b", "\\bsignal\\b.*\\b(message|daemon|jsonrpc)\\b"]}'::jsonb
WHERE id = 216 AND node_type = 'category';

-- Voice
UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\btts\\b", "\\btext.?to.?speech\\b", "\\belevenlabs\\b", "\\bedge.?tts\\b"]}'::jsonb
WHERE id = 218 AND node_type = 'category';

UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bstt\\b", "\\bspeech.?to.?text\\b", "\\bwhisper\\b", "\\btranscrib"]}'::jsonb
WHERE id = 219 AND node_type = 'category';

-- Infrastructure
UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bdocker\\b", "\\bdocker.?compose\\b"]}'::jsonb
WHERE id = 221 AND node_type = 'category';

UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bgcp\\b", "\\bgoogle.?cloud\\b", "\\bcompute.?engine\\b"]}'::jsonb
WHERE id = 222 AND node_type = 'category';

UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bcloudflare\\b", "\\bcf.?tunnel\\b"]}'::jsonb
WHERE id = 223 AND node_type = 'category';

UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bvercel\\b"]}'::jsonb
WHERE id = 224 AND node_type = 'category';

-- Security
UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\boauth\\b", "\\b2fa\\b", "\\bauth.?token\\b", "\\bauth.?flow\\b"]}'::jsonb
WHERE id = 226 AND node_type = 'category';

UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bapi.?key\\b", "\\bapi_key\\b", "\\bsecret.?key\\b"]}'::jsonb
WHERE id = 227 AND node_type = 'category';

UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bdkim\\b", "\\bspf\\b", "\\bdmarc\\b"]}'::jsonb
WHERE id = 228 AND node_type = 'category';

-- Memory / Data
UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bpostgres\\b", "\\bpsql\\b", "\\bsupabase\\b", "\\bpgvector\\b"]}'::jsonb
WHERE id = 230 AND node_type = 'category';

UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bembeddings?\\b", "\\bvector.?search\\b", "\\bvector.?store\\b"]}'::jsonb
WHERE id = 231 AND node_type = 'category';

UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bknowledge.?graph\\b", "\\bentity.?extract", "\\bgraph.?extract"]}'::jsonb
WHERE id = 232 AND node_type = 'category';

-- Tools
UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bgit\\b.*\\b(commit|push|pull|clone|branch|merge)\\b"]}'::jsonb
WHERE id = 234 AND node_type = 'category';

UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bcommand.?line\\b", "\\bcli\\b.*\\b(command|tool|flag)\\b"]}'::jsonb
WHERE id = 235 AND node_type = 'category';

UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bffmpeg\\b", "\\bffprobe\\b"]}'::jsonb
WHERE id = 237 AND node_type = 'category';

-- Web UI
UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bweb.?ui\\b", "\\bnimbus\\.studio306\\b"]}'::jsonb
WHERE id = 238 AND node_type = 'category';

-- Email
UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bsmtp\\b", "\\bmail.?server\\b"]}'::jsonb
WHERE id = 240 AND node_type = 'category';

UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bimap\\b", "\\binbox\\b"]}'::jsonb
WHERE id = 241 AND node_type = 'category';

-- AI / API
UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bgemini\\b"]}'::jsonb
WHERE id = 243 AND node_type = 'category';

UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bclaude\\b", "\\banthropic\\b"]}'::jsonb
WHERE id = 244 AND node_type = 'category';

-- Projects
UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bfunkin4\\b"]}'::jsonb
WHERE id = 246 AND node_type = 'category';

UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bc3.?studios?\\b"]}'::jsonb
WHERE id = 247 AND node_type = 'category';

UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bpapper.?pictures?\\b"]}'::jsonb
WHERE id = 248 AND node_type = 'category';

UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bstudio.?306\\b"]}'::jsonb
WHERE id = 249 AND node_type = 'category';

UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\burban.?dance.?hungary\\b"]}'::jsonb
WHERE id = 250 AND node_type = 'category';

UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bgpu.?fleet\\b"]}'::jsonb
WHERE id = 251 AND node_type = 'category';

-- Dance
UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\burban.?dance\\b"]}'::jsonb
WHERE id = 253 AND node_type = 'category';

UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bhip.?hop\\b"]}'::jsonb
WHERE id = 254 AND node_type = 'category';

UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bhouse\\b.*\\bdance\\b", "\\bhouse.?music\\b"]}'::jsonb
WHERE id = 255 AND node_type = 'category';

UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\blocking\\b"]}'::jsonb
WHERE id = 256 AND node_type = 'category';

UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bpopping\\b"]}'::jsonb
WHERE id = 257 AND node_type = 'category';

UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bdance.?event\\b", "\\bdance.?battle\\b"]}'::jsonb
WHERE id = 258 AND node_type = 'category';

UPDATE nodes SET properties = COALESCE(properties, '{}'::jsonb) || '{"match_patterns": ["\\bdance.?history\\b", "\\boriginator\\b"]}'::jsonb
WHERE id = 259 AND node_type = 'category';

-- Verify
SELECT id, name, properties->>'match_patterns' as patterns
FROM nodes
WHERE node_type = 'category' AND properties->'match_patterns' IS NOT NULL
ORDER BY id;
