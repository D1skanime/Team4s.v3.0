-- Migration 0158: make every assignable Fansub role available for historical credits.
--
-- Historical role records document real past work only. Adding group_history
-- changes neither active assignment eligibility nor operative capabilities.
BEGIN;

CREATE TABLE migration_0158_historical_role_context_backup (
    role_code TEXT PRIMARY KEY,
    contexts TEXT[] NOT NULL
);

INSERT INTO migration_0158_historical_role_context_backup (role_code, contexts)
SELECT code, contexts
FROM role_definitions
WHERE code IN ('techadmin', 'gfxler', 'karaoke_fx', 'admin');

UPDATE role_definitions
SET contexts = (
    SELECT ARRAY(
        SELECT DISTINCT context_value
        FROM unnest(contexts || ARRAY['group_history']::text[]) AS context_value
        ORDER BY context_value
    )
)
WHERE code IN ('techadmin', 'gfxler', 'karaoke_fx', 'admin');

COMMIT;
