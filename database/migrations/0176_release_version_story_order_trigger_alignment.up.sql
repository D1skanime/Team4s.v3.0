-- Migration 0176: align the legacy runtime story-order trigger with item_type.
-- The runtime schema may retain this trigger after the item_kind -> item_type rename.
CREATE OR REPLACE FUNCTION validate_release_version_story_order_target()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.item_type = 'media' AND NOT EXISTS (
        SELECT 1 FROM release_version_media
        WHERE id = NEW.release_version_media_id
          AND release_version_id = NEW.release_version_id
          AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'story media target is not owned by release version %', NEW.release_version_id USING ERRCODE = '23514';
    END IF;
    IF NEW.item_type = 'kara' AND NOT EXISTS (
        SELECT 1 FROM theme_segment_assignments
        WHERE theme_segment_id = NEW.theme_segment_id
          AND release_version_id = NEW.release_version_id
    ) THEN
        RAISE EXCEPTION 'story segment target is not assigned to release version %', NEW.release_version_id USING ERRCODE = '23514';
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;