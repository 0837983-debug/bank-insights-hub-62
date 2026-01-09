-- Create universal audit table for config changes
-- Table: config.changes_history

BEGIN;

CREATE TABLE IF NOT EXISTS config.changes_history (
  id           SERIAL PRIMARY KEY,
  table_name   VARCHAR(100) NOT NULL,     -- 'layouts', 'components', 'layout_component_mapping', 'component_fields'
  record_id    VARCHAR(200) NOT NULL,     -- record identifier (stringified)
  field_name   VARCHAR(100) NOT NULL,     -- field that changed
  old_value    TEXT,                      -- previous value (JSON as string for JSON fields)
  new_value    TEXT,                      -- new value (JSON as string for JSON fields)
  change_type  VARCHAR(50) NOT NULL,      -- 'INSERT', 'UPDATE', 'DELETE'
  changed_by   VARCHAR(100) NOT NULL,     -- user who made the change
  changed_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata     JSONB                      -- additional info (e.g., full diff in same tx)
);

CREATE INDEX IF NOT EXISTS idx_ch_table ON config.changes_history(table_name);
CREATE INDEX IF NOT EXISTS idx_ch_record ON config.changes_history(record_id);
CREATE INDEX IF NOT EXISTS idx_ch_changed_at ON config.changes_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_ch_change_type ON config.changes_history(change_type);

COMMIT;


