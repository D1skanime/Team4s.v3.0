-- Migration 0146: canonical capability policy and role presentation catalog.
-- Runtime per-user resolution and mutation orchestration remain Phase 137 work.

BEGIN;

ALTER TABLE action_definitions
    ADD COLUMN description_de TEXT,
    ADD COLUMN help_text_de TEXT,
    ADD COLUMN user_overridable BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE action_definitions
    ADD CONSTRAINT uq_action_definitions_code_override_policy
        UNIQUE (code, user_overridable),
    ADD CONSTRAINT chk_action_definitions_user_override_policy CHECK (
        NOT user_overridable
        OR code !~ '(^|[._])(capability|role|delegation|security|audit)([._]|$)'
        AND code NOT IN (
            'fansub_group.members.manage',
            'fansub_group.invitations.create',
            'fansub_group.invitations.cancel'
        )
    );

ALTER TABLE role_definitions
    ADD COLUMN color_key TEXT NOT NULL DEFAULT 'other',
    ADD COLUMN icon_key TEXT NOT NULL DEFAULT 'other',
    ADD CONSTRAINT chk_role_definitions_color_key CHECK (color_key ~ '^[a-z0-9_]+$'),
    ADD CONSTRAINT chk_role_definitions_icon_key CHECK (icon_key ~ '^[a-z0-9_]+$');

-- user is the bounded artwork semantic consumed by the shared badge renderer.
-- Role existence still comes exclusively from role_definitions; this metadata
-- only selects the shipped artwork family for established contribution roles.
UPDATE role_definitions
SET icon_key = 'user'
WHERE code IN (
    'translator', 'editor', 'timer', 'typesetter', 'encoder',
    'raw_provider', 'quality_checker', 'project_lead', 'designer',
    'admin', 'other'
);

INSERT INTO action_definitions (
    code,
    label_de,
    category,
    sort_order,
    description_de,
    help_text_de
) VALUES
    ('fansub_group_media.upload', 'Gruppenbilder hochladen', 'gruppenmedien', 10,
        'Bilder, Logos und Banner einer Fansub-Gruppe hochladen.',
        'Gilt ausschließlich innerhalb der zugehörigen Fansub-Gruppe.'),
    ('fansub_group_media.update', 'Gruppenbilder bearbeiten', 'gruppenmedien', 20,
        'Metadaten bestehender Gruppenbilder, Logos und Banner bearbeiten.',
        'Das Löschen von Medien ist nicht enthalten.'),
    ('fansub_group_media.reorder', 'Gruppenbilder sortieren', 'gruppenmedien', 30,
        'Die Reihenfolge der Gruppenbilder ändern.',
        'Gilt ausschließlich innerhalb der zugehörigen Fansub-Gruppe.'),
    ('fansub_group_page.general_edit', 'Allgemeine Gruppendaten bearbeiten', 'gruppenseite', 10,
        'Allgemeine Inhalte der Fansub-Seite bearbeiten.',
        'Technische Links und Gründungshistorie sind getrennte Rechte.'),
    ('fansub_group_page.technical_links_edit', 'Technische Links bearbeiten', 'gruppenseite', 20,
        'Technische Verweise der Fansub-Seite bearbeiten.',
        'Gilt für technische Gruppenlinks, nicht für Rechteverwaltung.'),
    ('fansub_group_page.founding_history_edit', 'Gründungshistorie bearbeiten', 'gruppenseite', 30,
        'Gründungsdatum und historische Gruppendaten bearbeiten.',
        'Gilt ausschließlich für die dokumentierte Gruppenhistorie.'),
    ('fansub_group_links.update', 'Gruppenlinks bearbeiten', 'gruppenseite', 40,
        'Allgemeine Links der Fansub-Seite bearbeiten.',
        'Gilt ausschließlich innerhalb der zugehörigen Fansub-Gruppe.')
ON CONFLICT (code) DO UPDATE SET
    label_de = EXCLUDED.label_de,
    category = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order,
    description_de = EXCLUDED.description_de,
    help_text_de = EXCLUDED.help_text_de;

-- Complete the canonical metadata for the entire capability inventory that
-- predates this migration. Review actions are intentionally named explicitly:
-- they are security decisions and must never fall through as anonymous rows.
UPDATE action_definitions AS action
SET description_de = metadata.description_de,
    help_text_de = metadata.help_text_de
FROM (VALUES
    ('review.text.decide',
        'Textbeiträge prüfen und verbindlich bestätigen oder ablehnen.',
        'Die Entscheidung wird mit Prüfer und Ergebnis revisionssicher protokolliert.'),
    ('review.image.decide',
        'Bildbeiträge prüfen und verbindlich bestätigen oder ablehnen.',
        'Die Entscheidung gilt nur für Bilder im zugehörigen fachlichen Kontext.'),
    ('review.contribution.decide',
        'Mitwirkungen prüfen und verbindlich bestätigen oder ablehnen.',
        'Die Entscheidung verändert den bestätigten Beitragsstatus.')
) AS metadata(code, description_de, help_text_de)
WHERE action.code = metadata.code;

UPDATE action_definitions
SET description_de = COALESCE(
        NULLIF(BTRIM(description_de), ''),
        label_de || '.'
    ),
    help_text_de = COALESCE(
        NULLIF(BTRIM(help_text_de), ''),
        'Gilt ausschließlich im autorisierten ' ||
        COALESCE(NULLIF(BTRIM(category), ''), 'Capability') || '-Kontext.'
    );

INSERT INTO role_definitions (
    code,
    label_de,
    contexts,
    sort_order,
    assignable,
    color_key,
    icon_key
) VALUES (
    'karaoke_fx',
    'Karaoke-FX',
    ARRAY['fansub_group', 'anime_contribution'],
    45,
    true,
    'creative',
    'image'
)
ON CONFLICT (code) DO UPDATE SET
    label_de = EXCLUDED.label_de,
    contexts = EXCLUDED.contexts,
    sort_order = EXCLUDED.sort_order,
    assignable = EXCLUDED.assignable,
    color_key = EXCLUDED.color_key,
    icon_key = EXCLUDED.icon_key;

INSERT INTO role_capabilities (role_code, action_code) VALUES
    ('gfxler', 'fansub_group_media.upload'),
    ('gfxler', 'fansub_group_media.update'),
    ('gfxler', 'fansub_group_media.reorder'),
    ('techadmin', 'fansub_group_media.upload'),
    ('techadmin', 'fansub_group_media.update'),
    ('techadmin', 'fansub_group_media.reorder'),
    ('techadmin', 'fansub_group_page.technical_links_edit'),
    ('founder', 'fansub_group_media.upload'),
    ('founder', 'fansub_group_media.update'),
    ('founder', 'fansub_group_media.reorder'),
    ('founder', 'fansub_group_page.founding_history_edit'),
    ('co_leader', 'fansub_group_media.upload'),
    ('co_leader', 'fansub_group_media.update'),
    ('co_leader', 'fansub_group_media.reorder'),
    ('co_leader', 'fansub_group_page.general_edit'),
    ('co_leader', 'fansub_group_links.update')
ON CONFLICT (role_code, action_code) DO NOTHING;

CREATE INDEX role_capabilities_action_role_idx
    ON role_capabilities (action_code, role_code);

CREATE TABLE user_group_capability_overrides (
    id BIGSERIAL PRIMARY KEY,
    app_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    action_code TEXT NOT NULL,
    catalog_user_overridable BOOLEAN NOT NULL DEFAULT true CHECK (catalog_user_overridable),
    effect TEXT NOT NULL,
    created_by_app_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    updated_by_app_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_user_group_capability_override_action_policy
        FOREIGN KEY (action_code, catalog_user_overridable)
        REFERENCES action_definitions(code, user_overridable) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_user_group_capability_overrides_effect
        CHECK (effect IN ('allow', 'deny')),
    CONSTRAINT uq_user_group_capability_overrides_subject
        UNIQUE (app_user_id, fansub_group_id, action_code)
);

CREATE INDEX user_group_capability_overrides_action_group_user_idx
    ON user_group_capability_overrides (action_code, fansub_group_id, app_user_id);

CREATE TABLE user_group_capability_override_history (
    id BIGSERIAL PRIMARY KEY,
    app_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE RESTRICT,
    action_code TEXT NOT NULL REFERENCES action_definitions(code) ON DELETE RESTRICT,
    actor_app_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    actor_is_platform_admin BOOLEAN NOT NULL DEFAULT false,
    before_effect TEXT,
    after_effect TEXT,
    reason_category TEXT,
    reason_text TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_user_group_capability_override_history_before
        CHECK (before_effect IS NULL OR before_effect IN ('allow', 'deny')),
    CONSTRAINT chk_user_group_capability_override_history_after
        CHECK (after_effect IS NULL OR after_effect IN ('allow', 'deny')),
    CONSTRAINT chk_user_group_capability_override_history_transition
        CHECK (
            (before_effect IS NOT NULL OR after_effect IS NOT NULL)
            AND before_effect IS DISTINCT FROM after_effect
        ),
    CONSTRAINT chk_user_group_capability_override_history_reason_category
        CHECK (reason_category IS NULL OR reason_category IN (
            'task_delegation',
            'security_measure',
            'role_gap',
            'other'
        )),
    CONSTRAINT chk_user_group_capability_override_history_reason_required
        CHECK (actor_is_platform_admin OR reason_category IS NOT NULL),
    CONSTRAINT chk_user_group_capability_override_history_other_reason
        CHECK (
            reason_category <> 'other'
            OR NULLIF(BTRIM(reason_text), '') IS NOT NULL
        )
);

CREATE INDEX user_group_capability_override_history_subject_idx
    ON user_group_capability_override_history
        (app_user_id, fansub_group_id, occurred_at DESC);

CREATE INDEX user_group_capability_override_history_action_idx
    ON user_group_capability_override_history
        (action_code, occurred_at DESC);

CREATE FUNCTION prevent_user_group_capability_override_history_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'user_group_capability_override_history is append-only';
END;
$$;

CREATE TRIGGER trg_user_group_capability_override_history_append_only
    BEFORE UPDATE OR DELETE ON user_group_capability_override_history
    FOR EACH ROW
    EXECUTE FUNCTION prevent_user_group_capability_override_history_mutation();

COMMENT ON COLUMN action_definitions.user_overridable IS
    'Fail-closed opt-in for group-scoped personal allow/deny overrides. Deny precedence is resolved by the central permission service.';
COMMENT ON TABLE user_group_capability_overrides IS
    'Current group-scoped personal allow/deny state. IdP-owned platform-admin authority is never stored here and remains non-deniable.';
COMMENT ON TABLE user_group_capability_override_history IS
    'Immutable real-transition history with actor, target, group, action, before/after state and reason provenance. Exact no-op suppression belongs to the mutation service.';

COMMIT;
