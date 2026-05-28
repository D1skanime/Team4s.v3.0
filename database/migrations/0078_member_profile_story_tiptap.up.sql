ALTER TABLE members
    ADD COLUMN IF NOT EXISTS member_story_json JSONB NULL,
    ADD COLUMN IF NOT EXISTS member_story_html TEXT NULL,
    ADD COLUMN IF NOT EXISTS member_story_text TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS member_story_editor_type TEXT NOT NULL DEFAULT 'tiptap',
    ADD COLUMN IF NOT EXISTS member_story_content_schema_version INT NOT NULL DEFAULT 1;

UPDATE members
SET
    member_story_json = jsonb_build_object(
        'type', 'doc',
        'content', jsonb_build_array(
            jsonb_build_object(
                'type', 'paragraph',
                'content', jsonb_build_array(
                    jsonb_build_object('type', 'text', 'text', member_history_description)
                )
            )
        )
    ),
    member_story_text = member_history_description,
    member_story_editor_type = 'tiptap',
    member_story_content_schema_version = 1
WHERE btrim(COALESCE(member_history_description, '')) <> ''
  AND member_story_json IS NULL;
