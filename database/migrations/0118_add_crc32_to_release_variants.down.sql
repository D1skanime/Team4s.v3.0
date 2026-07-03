ALTER TABLE release_variants
    DROP CONSTRAINT IF EXISTS chk_release_variants_crc32;

ALTER TABLE release_variants
    DROP COLUMN IF EXISTS crc32;
