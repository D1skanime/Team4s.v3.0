ALTER TABLE members
    DROP COLUMN IF EXISTS member_story_content_schema_version,
    DROP COLUMN IF EXISTS member_story_editor_type,
    DROP COLUMN IF EXISTS member_story_text,
    DROP COLUMN IF EXISTS member_story_html,
    DROP COLUMN IF EXISTS member_story_json;
