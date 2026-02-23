ALTER TABLE anime
    DROP COLUMN IF EXISTS view_count,
    DROP COLUMN IF EXISTS description,
    DROP COLUMN IF EXISTS genre,
    DROP COLUMN IF EXISTS title_en,
    DROP COLUMN IF EXISTS title_de;
