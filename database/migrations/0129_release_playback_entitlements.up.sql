-- Phase 103: centrally evaluated full-release playback entitlements.
-- Episodes intentionally are not a scope: every rule ultimately addresses a
-- concrete release-version context.

CREATE TABLE release_playback_entitlement_rules (
    id BIGSERIAL PRIMARY KEY,
    subject_type TEXT NOT NULL,
    subject_app_user_id BIGINT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    subject_role_code TEXT NULL REFERENCES role_definitions(code) ON DELETE CASCADE,
    effect TEXT NOT NULL,
    scope_type TEXT NOT NULL,
    fansub_group_id BIGINT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    anime_id BIGINT NULL REFERENCES anime(id) ON DELETE CASCADE,
    release_version_id BIGINT NULL REFERENCES release_versions(id) ON DELETE CASCADE,
    created_by_app_user_id BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_release_playback_entitlement_subject_type
        CHECK (subject_type IN ('app_user', 'role')),
    CONSTRAINT chk_release_playback_entitlement_subject
        CHECK (
            (subject_type = 'app_user' AND subject_app_user_id IS NOT NULL AND subject_role_code IS NULL)
            OR
            (subject_type = 'role' AND subject_app_user_id IS NULL AND subject_role_code IS NOT NULL)
        ),
    CONSTRAINT chk_release_playback_entitlement_effect
        CHECK (effect IN ('allow', 'deny')),
    CONSTRAINT chk_release_playback_entitlement_scope_type
        CHECK (scope_type IN ('global', 'group', 'project', 'release')),
    CONSTRAINT chk_release_playback_entitlement_scope
        CHECK (
            (scope_type = 'global' AND fansub_group_id IS NULL AND anime_id IS NULL AND release_version_id IS NULL)
            OR
            (scope_type = 'group' AND fansub_group_id IS NOT NULL AND anime_id IS NULL AND release_version_id IS NULL)
            OR
            (scope_type = 'project' AND fansub_group_id IS NOT NULL AND anime_id IS NOT NULL AND release_version_id IS NULL)
            OR
            (scope_type = 'release' AND fansub_group_id IS NULL AND anime_id IS NULL AND release_version_id IS NOT NULL)
        )
);

CREATE UNIQUE INDEX uq_release_playback_entitlement_rule
    ON release_playback_entitlement_rules (
        subject_type,
        COALESCE(subject_app_user_id, 0),
        COALESCE(subject_role_code, ''),
        scope_type,
        COALESCE(fansub_group_id, 0),
        COALESCE(anime_id, 0),
        COALESCE(release_version_id, 0)
    );

CREATE INDEX idx_release_playback_entitlement_user
    ON release_playback_entitlement_rules (subject_app_user_id)
    WHERE subject_app_user_id IS NOT NULL;

CREATE INDEX idx_release_playback_entitlement_role
    ON release_playback_entitlement_rules (subject_role_code)
    WHERE subject_role_code IS NOT NULL;

CREATE INDEX idx_release_playback_entitlement_group_project
    ON release_playback_entitlement_rules (fansub_group_id, anime_id)
    WHERE fansub_group_id IS NOT NULL;

CREATE INDEX idx_release_playback_entitlement_release
    ON release_playback_entitlement_rules (release_version_id)
    WHERE release_version_id IS NOT NULL;
