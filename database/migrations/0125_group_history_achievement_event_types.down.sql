-- Migration 0125 rollback: restore the original group history event type set.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM fansub_group_history
        WHERE event_type NOT IN ('founding', 'disbanding', 'hiatus', 'rebranding', 'milestone', 'other')
    ) THEN
        RAISE EXCEPTION 'cannot restore old fansub_group_history event_type constraint while newer achievement event types exist';
    END IF;
END $$;

ALTER TABLE fansub_group_history
    DROP CONSTRAINT IF EXISTS chk_fansub_group_history_event_type;

ALTER TABLE fansub_group_history
    ADD CONSTRAINT chk_fansub_group_history_event_type
    CHECK (event_type IN ('founding', 'disbanding', 'hiatus', 'rebranding', 'milestone', 'other'));
