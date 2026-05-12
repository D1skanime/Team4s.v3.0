ALTER TABLE fansub_group_notes
  DROP COLUMN IF EXISTS body_json,
  DROP COLUMN IF EXISTS body_text,
  DROP COLUMN IF EXISTS editor_type,
  DROP COLUMN IF EXISTS content_schema_version;
