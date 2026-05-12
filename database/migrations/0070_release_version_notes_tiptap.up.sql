ALTER TABLE release_version_notes
  ADD COLUMN IF NOT EXISTS body_json              JSONB  NULL,
  ADD COLUMN IF NOT EXISTS body_text              TEXT   NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS editor_type            TEXT   NOT NULL DEFAULT 'tiptap',
  ADD COLUMN IF NOT EXISTS content_schema_version INT    NOT NULL DEFAULT 1;
