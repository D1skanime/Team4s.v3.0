-- Migration 0101 down: Rollback is not supported for this data migration.
-- The expand-and-delete of collaboration junction rows cannot be reversed;
-- original collaboration group rows and fansub_collaboration_members links
-- are gone after the up migration runs.
DO $$ BEGIN
    RAISE WARNING 'Migration 0101 down: rollback not supported for data migration';
END $$;
