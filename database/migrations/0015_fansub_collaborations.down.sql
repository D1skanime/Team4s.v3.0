-- Rollback Migration 0015: Fansub Collaborations

DROP TABLE IF EXISTS fansub_collaboration_members;
ALTER TABLE fansub_groups DROP COLUMN IF EXISTS group_type;
