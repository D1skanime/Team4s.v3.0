ALTER TABLE release_variants
    ADD COLUMN IF NOT EXISTS crc32 VARCHAR(8);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_release_variants_crc32'
    ) THEN
        ALTER TABLE release_variants
            ADD CONSTRAINT chk_release_variants_crc32
            CHECK (crc32 IS NULL OR crc32 ~ '^[0-9A-F]{8}$');
    END IF;
END $$;
