-- Migration 0103: make historical group roles use the same role taxonomy as app group members.
--
-- The admin UI for "Hist. Mitglieder" offers the central Fansub member role set
-- (FANSUB_GROUP_ROLE_OPTIONS). Those codes must be valid for hist_group_member_roles,
-- which validates against the group_history context.

UPDATE role_definitions
SET contexts = (
    SELECT ARRAY(
        SELECT DISTINCT context_value
        FROM unnest(contexts || ARRAY['group_history']::text[]) AS context_value
        ORDER BY context_value
    )
)
WHERE code IN (
    'fansub_lead',
    'project_lead',
    'translator',
    'timer',
    'typesetter',
    'editor',
    'encoder',
    'raw_provider',
    'quality_checker',
    'designer'
);
