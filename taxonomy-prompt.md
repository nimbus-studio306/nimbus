# Taxonomy Extraction Prompt

## Rules

1. **Filter garbage**: Skip messages that are:
   - JSON blobs (starts with `{` or `[`)
   - MEDIA paths (`MEDIA:/...`)
   - System responses (`NO_REPLY`, `HEARTBEAT_OK`)
   - Tool results (starts with `[openclaw]` or similar)
   - Less than 100 characters of actual content

2. **Use existing categories first**: Query what's already in the database
   - `SELECT id, name FROM nodes WHERE node_type = 'category'`
   - If a category fits, use it

3. **Create new categories when needed**: If a topic doesn't fit existing ones
   - Create a new category node: `INSERT INTO nodes (node_type, name) VALUES ('category', 'NewName')`
   - Link to appropriate vocabulary: `INSERT INTO edges (source_id, target_id, edge_type) VALUES (vocab_id, new_cat_id, 'contains')`
   - Don't duplicate - check if category exists first

4. **Tag all relevant categories**: No artificial limit — if 5 categories apply, tag all 5. Just be genuinely selective (don't tag "Tools" just because a script is mentioned in passing).

## Database
- Schema: `project_openclaw_nimbus`
- Insert tags: `INSERT INTO content_tags (category_node_id, content_type, content_id) VALUES (cat_id, 'message', msg_id)`
- Get categories: `SELECT id, name FROM nodes WHERE node_type = 'category'`
- Get untagged: `SELECT id, content_text FROM structured_messages WHERE role IN ('user','assistant') AND LENGTH(content_text) > 100 AND NOT EXISTS (SELECT 1 FROM content_tags WHERE content_type='message' AND content_id::text = id::text)`

## Example
Message: "I've updated the Docker compose file to expose port 18789 and added the new env vars"
Tags: Infrastructure, Configuration, Tools

Message: "The WhatsApp messages are coming through but Telegram is still broken"
Tags: Messaging

Message: "HEARTBEAT_OK"
Tags: (skip - system response)

Message: '{"status": "ok", "count": 5}'
Tags: (skip - JSON blob)
