-- Safety check: only proceed when the legacy text columns still exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fansub_groups'
      AND column_name = 'description'
  ) OR NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fansub_groups'
      AND column_name = 'history'
  ) OR NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fansub_groups'
      AND column_name = 'history_description'
  ) THEN
    RAISE EXCEPTION '0071_drop_fansub_legacy_text_fields requires fansub_groups.description, history, and history_description to exist';
  END IF;
END $$;

ALTER TABLE fansub_groups
  DROP COLUMN description,
  DROP COLUMN history,
  DROP COLUMN history_description;
