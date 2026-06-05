-- Migration 0096: v1.2 status foundation.
-- Adds read-only status axes for profile memorial state, contribution disputes,
-- visibility, and review lifecycle without changing existing content or technical
-- processing status columns.

ALTER TABLE members
    ADD COLUMN IF NOT EXISTS profile_status VARCHAR(20) NOT NULL DEFAULT 'active';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_members_profile_status'
    ) THEN
        ALTER TABLE members
            ADD CONSTRAINT chk_members_profile_status
            CHECK (profile_status IN ('active','historical','memorial'));
    END IF;
END $$;

ALTER TABLE anime_contributions
    ADD COLUMN IF NOT EXISTS dispute_state VARCHAR(20) NOT NULL DEFAULT 'none';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_anime_contributions_dispute_state'
    ) THEN
        ALTER TABLE anime_contributions
            ADD CONSTRAINT chk_anime_contributions_dispute_state
            CHECK (dispute_state IN ('none','open','resolved'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS review_statuses (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(40) UNIQUE NOT NULL,
    label_de VARCHAR(80) NOT NULL,
    sort_order INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO review_statuses (code, label_de, sort_order) VALUES
    ('in_review', 'in Prüfung', 10),
    ('approved', 'freigegeben', 20),
    ('rejected', 'abgelehnt', 30),
    ('archived', 'archiviert', 40),
    ('removed', 'entfernt', 50)
ON CONFLICT (code) DO UPDATE SET
    label_de = EXCLUDED.label_de,
    sort_order = EXCLUDED.sort_order;

ALTER TABLE anime_contributions
    ADD COLUMN IF NOT EXISTS visibility_id BIGINT,
    ADD COLUMN IF NOT EXISTS review_status_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_anime_contributions_visibility'
    ) THEN
        ALTER TABLE anime_contributions
            ADD CONSTRAINT fk_anime_contributions_visibility
            FOREIGN KEY (visibility_id) REFERENCES visibilities(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_anime_contributions_review_status'
    ) THEN
        ALTER TABLE anime_contributions
            ADD CONSTRAINT fk_anime_contributions_review_status
            FOREIGN KEY (review_status_id) REFERENCES review_statuses(id) ON DELETE SET NULL;
    END IF;
END $$;

ALTER TABLE media_assets
    ADD COLUMN IF NOT EXISTS visibility_id BIGINT,
    ADD COLUMN IF NOT EXISTS review_status_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_media_assets_visibility'
    ) THEN
        ALTER TABLE media_assets
            ADD CONSTRAINT fk_media_assets_visibility
            FOREIGN KEY (visibility_id) REFERENCES visibilities(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_media_assets_review_status'
    ) THEN
        ALTER TABLE media_assets
            ADD CONSTRAINT fk_media_assets_review_status
            FOREIGN KEY (review_status_id) REFERENCES review_statuses(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_anime_contributions_visibility_id
    ON anime_contributions(visibility_id)
    WHERE visibility_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_anime_contributions_review_status_id
    ON anime_contributions(review_status_id)
    WHERE review_status_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_media_assets_visibility_id
    ON media_assets(visibility_id)
    WHERE visibility_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_media_assets_review_status_id
    ON media_assets(review_status_id)
    WHERE review_status_id IS NOT NULL;
