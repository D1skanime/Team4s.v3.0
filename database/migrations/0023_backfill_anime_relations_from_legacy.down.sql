-- Migration 0023 rollback: Remove backfilled anime relations
-- Only removes relations with type 'related' that were added by this migration

DELETE FROM anime_relations
WHERE relation_type_id = (SELECT id FROM relation_types WHERE name = 'related');

-- Note: We don't remove the 'related' relation_type as it might be used by manually added relations
