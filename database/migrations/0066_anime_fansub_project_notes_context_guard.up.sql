DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM anime_fansub_project_notes apn
        LEFT JOIN anime_fansub_groups afg
            ON afg.anime_id = apn.anime_id
           AND afg.fansub_group_id = apn.fansub_group_id
        WHERE afg.anime_id IS NULL
    ) THEN
        RAISE EXCEPTION 'anime_fansub_project_notes contains rows without anime_fansub_groups context';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_anime_fansub_project_notes_context'
          AND conrelid = 'anime_fansub_project_notes'::regclass
    ) THEN
        ALTER TABLE anime_fansub_project_notes
            ADD CONSTRAINT fk_anime_fansub_project_notes_context
            FOREIGN KEY (anime_id, fansub_group_id)
            REFERENCES anime_fansub_groups (anime_id, fansub_group_id)
            ON DELETE CASCADE;
    END IF;
END $$;
