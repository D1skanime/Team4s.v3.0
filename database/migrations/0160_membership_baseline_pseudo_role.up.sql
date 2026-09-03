-- Migration 0160: Phase 145 -- membership-baseline pseudo-role.
-- Turns the three hardcoded membership-baseline actions
-- (fansub_group.members.view, fansub_group_media.view, fansub_group_media.upload) into a
-- reserved, non-assignable pseudo-role ('group_member') represented in role_definitions /
-- role_capabilities, per the locked ROADMAP.md Phase 145 decision (D-01).

BEGIN;

-- A reserved role is excluded from every assignable/known-role catalog query regardless of
-- its contexts, while remaining eligible for capability-editing queries that only check
-- contexts.
ALTER TABLE role_definitions
    ADD COLUMN IF NOT EXISTS reserved BOOLEAN NOT NULL DEFAULT false;

INSERT INTO role_definitions (
    code,
    label_de,
    contexts,
    sort_order,
    assignable,
    reserved
) VALUES (
    'group_member',
    'Mitgliedschafts-Grundausstattung',
    ARRAY['fansub_group'],
    -10,
    false,
    true
)
ON CONFLICT (code) DO UPDATE SET
    label_de = EXCLUDED.label_de,
    contexts = EXCLUDED.contexts,
    sort_order = EXCLUDED.sort_order,
    assignable = EXCLUDED.assignable,
    reserved = EXCLUDED.reserved;

INSERT INTO role_capabilities (role_code, action_code) VALUES
    ('group_member', 'fansub_group.members.view'),
    ('group_member', 'fansub_group_media.view'),
    ('group_member', 'fansub_group_media.upload')
ON CONFLICT (role_code, action_code) DO NOTHING;

COMMIT;
