BEGIN;

CREATE TABLE release_crew_snapshots (
    release_version_id BIGINT NOT NULL,
    fansub_group_id BIGINT NOT NULL,
    snapshot_mode TEXT NOT NULL CHECK (snapshot_mode IN ('inherited', 'independent')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (release_version_id, fansub_group_id),
    FOREIGN KEY (release_version_id, fansub_group_id)
        REFERENCES release_version_groups(release_version_id, fansub_group_id)
        ON DELETE CASCADE
);

CREATE TABLE release_role_credit_lifecycles (
    id BIGSERIAL PRIMARY KEY,
    release_version_id BIGINT NOT NULL,
    fansub_group_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    role_code TEXT NOT NULL CHECK (btrim(role_code) <> ''),
    generation INTEGER NOT NULL CHECK (generation > 0),
    lifecycle_status TEXT NOT NULL CHECK (
        lifecycle_status IN ('pending', 'awarded', 'reversed')
    ),
    award_entry_id BIGINT NULL UNIQUE
        REFERENCES point_ledger_entries(id) ON DELETE RESTRICT,
    reversal_entry_id BIGINT NULL UNIQUE
        REFERENCES point_ledger_entries(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (release_version_id, fansub_group_id)
        REFERENCES release_version_groups(release_version_id, fansub_group_id)
        ON DELETE RESTRICT,
    UNIQUE (
        release_version_id,
        fansub_group_id,
        member_id,
        role_code,
        generation
    ),
    CONSTRAINT chk_release_role_credit_lifecycle_shape CHECK (
        (lifecycle_status = 'pending'
            AND award_entry_id IS NULL
            AND reversal_entry_id IS NULL)
        OR
        (lifecycle_status = 'awarded'
            AND award_entry_id IS NOT NULL
            AND reversal_entry_id IS NULL)
        OR
        (lifecycle_status = 'reversed'
            AND award_entry_id IS NOT NULL
            AND reversal_entry_id IS NOT NULL)
    )
);

CREATE INDEX idx_release_role_credit_context
    ON release_role_credit_lifecycles (
        release_version_id,
        fansub_group_id,
        member_id,
        role_code,
        generation DESC
    );

CREATE TABLE project_note_credit_lifecycles (
    id BIGSERIAL PRIMARY KEY,
    anime_id BIGINT NOT NULL,
    fansub_group_id BIGINT NOT NULL,
    first_author_member_id BIGINT NOT NULL
        REFERENCES members(id) ON DELETE RESTRICT,
    generation INTEGER NOT NULL CHECK (generation > 0),
    lifecycle_status TEXT NOT NULL CHECK (
        lifecycle_status IN ('pending', 'awarded', 'reversed')
    ),
    award_entry_id BIGINT NULL UNIQUE
        REFERENCES point_ledger_entries(id) ON DELETE RESTRICT,
    reversal_entry_id BIGINT NULL UNIQUE
        REFERENCES point_ledger_entries(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (anime_id, fansub_group_id)
        REFERENCES anime_fansub_groups(anime_id, fansub_group_id)
        ON DELETE RESTRICT,
    UNIQUE (anime_id, fansub_group_id, generation),
    CONSTRAINT chk_project_note_credit_lifecycle_shape CHECK (
        (lifecycle_status = 'pending'
            AND award_entry_id IS NULL
            AND reversal_entry_id IS NULL)
        OR
        (lifecycle_status = 'awarded'
            AND award_entry_id IS NOT NULL
            AND reversal_entry_id IS NULL)
        OR
        (lifecycle_status = 'reversed'
            AND award_entry_id IS NOT NULL
            AND reversal_entry_id IS NOT NULL)
    )
);

CREATE INDEX idx_project_note_credit_context
    ON project_note_credit_lifecycles (
        anime_id,
        fansub_group_id,
        generation DESC
    );

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM point_rules
        WHERE rule_code = 'release_role_work'
          AND rule_version = 1
          AND (category <> 'fansub_work' OR point_value <> 1)
    ) THEN
        RAISE EXCEPTION 'release_role_work version 1 conflicts with the required fansub_work point value 1';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM point_rules
        WHERE rule_code = 'project_text_first_author'
          AND rule_version = 1
          AND (category <> 'platform_contribution' OR point_value <> 5)
    ) THEN
        RAISE EXCEPTION 'project_text_first_author version 1 conflicts with the required platform_contribution point value 5';
    END IF;
END;
$$;

INSERT INTO point_rules (rule_code, rule_version, category, point_value)
VALUES
    ('release_role_work', 1, 'fansub_work', 1),
    ('project_text_first_author', 1, 'platform_contribution', 5)
ON CONFLICT (rule_code, rule_version) DO NOTHING;

COMMIT;
