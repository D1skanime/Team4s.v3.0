BEGIN;

-- The lifecycle and retry rows are durable history. Refuse a destructive
-- rollback before changing any object when such history exists.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM release_version_note_review_lifecycle)
       OR EXISTS (SELECT 1 FROM release_version_media_review_lifecycle)
       OR EXISTS (SELECT 1 FROM release_review_file_delete_jobs) THEN
        RAISE EXCEPTION '0135 release review lifecycle rollback refused: durable lifecycle or delete-job data exists';
    END IF;
END;
$$;

DROP VIEW IF EXISTS release_review_lifecycle_sources;
DROP TABLE IF EXISTS release_review_file_delete_jobs;
DROP TABLE IF EXISTS release_version_media_review_lifecycle;
DROP TABLE IF EXISTS release_version_note_review_lifecycle;

COMMIT;
