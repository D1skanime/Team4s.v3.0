-- Down migration 0051: Remove explicit source columns from theme_segments

ALTER TABLE theme_segments
    DROP COLUMN IF EXISTS source_type,
    DROP COLUMN IF EXISTS source_ref,
    DROP COLUMN IF EXISTS source_label;
