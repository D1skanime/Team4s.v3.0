-- Migration 0150: Phase-137 effective-rights override catalog delta.
-- Migration 0146 shipped the fail-closed user_overridable flag with zero rows
-- flipped to true. This migration is purely additive: it adds the dedicated,
-- permanently non-overridable override-management capability and flips
-- exactly ten approved group/review actions to user_overridable = true.
-- Migration 0146 itself is not edited.

BEGIN;

-- The dedicated group-scoped capability that authorizes managing per-user
-- capability overrides. Its code contains the "capability" token, which the
-- existing chk_action_definitions_user_override_policy CHECK constraint
-- (migration 0146) structurally rejects for user_overridable = true. It is
-- also explicitly inserted with user_overridable = false below.
INSERT INTO action_definitions (
    code,
    label_de,
    category,
    sort_order,
    description_de,
    help_text_de,
    user_overridable
) VALUES (
    'user_group_capability_override.manage',
    'Nutzer-Rechteausnahmen verwalten',
    'rechteverwaltung',
    10,
    'Individuelle Erlaubnis- oder Verbotsausnahmen für ein Mitglied innerhalb einer Fansub-Gruppe verwalten.',
    'Gilt ausschließlich innerhalb der zugehörigen Fansub-Gruppe und bleibt selbst niemals überschreibbar.',
    false
)
ON CONFLICT (code) DO UPDATE SET
    label_de = EXCLUDED.label_de,
    category = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order,
    description_de = EXCLUDED.description_de,
    help_text_de = EXCLUDED.help_text_de,
    user_overridable = EXCLUDED.user_overridable;

-- The deliberately chosen pilot set: the seven Phase-136 group media/page/
-- link actions plus all three review.*.decide actions. Every other action
-- remains fail-closed at its default false.
UPDATE action_definitions
SET user_overridable = true
WHERE code IN (
    'fansub_group_media.upload',
    'fansub_group_media.update',
    'fansub_group_media.reorder',
    'fansub_group_page.general_edit',
    'fansub_group_page.technical_links_edit',
    'fansub_group_page.founding_history_edit',
    'fansub_group_links.update',
    'review.text.decide',
    'review.image.decide',
    'review.contribution.decide'
);

-- Only fansub_lead currently owns broad group member administration
-- (fansub_group.members.manage, seeded in migration 0108). founder and
-- co_leader are not seeded here merely because of their role names.
INSERT INTO role_capabilities (role_code, action_code) VALUES
    ('fansub_lead', 'user_group_capability_override.manage')
ON CONFLICT (role_code, action_code) DO NOTHING;

COMMIT;
