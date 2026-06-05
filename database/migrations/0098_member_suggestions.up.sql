-- Migration 0098: member_suggestions — Vorschläge registrierter User (Phase 76, Decision 6).
-- Lock H: KEINE FK-Verbindung zu anime_contributions oder member_claims.
-- HINWEIS: Nächste freie Nummer war 0098 (0097 belegt durch v12_status_foundation/Phase 72).

CREATE TABLE IF NOT EXISTS member_suggestions (
    id                    BIGSERIAL PRIMARY KEY,
    submitter_app_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    suggestion_type       VARCHAR(40) NOT NULL,
    target_type           VARCHAR(40) NOT NULL,
    target_id             BIGINT NOT NULL,
    content_text          TEXT NULL,
    media_asset_id        BIGINT NULL REFERENCES media_assets(id) ON DELETE SET NULL,
    status                VARCHAR(20) NOT NULL DEFAULT 'pending',
    review_note           TEXT NULL,
    reviewer_app_user_id  BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_member_suggestions_type CHECK (
        suggestion_type IN ('error_report', 'story', 'media')
    ),
    CONSTRAINT chk_member_suggestions_target_type CHECK (
        target_type IN ('anime', 'contribution', 'fansub_group', 'member')
    ),
    CONSTRAINT chk_member_suggestions_status CHECK (
        status IN ('pending', 'in_review', 'approved', 'rejected')
    )
);

CREATE INDEX IF NOT EXISTS idx_member_suggestions_submitter
    ON member_suggestions (submitter_app_user_id);
CREATE INDEX IF NOT EXISTS idx_member_suggestions_status
    ON member_suggestions (status);

-- Additive Spalte für member_reason auf anime_contributions (D-09):
-- Members müssen bei "Das war ich nicht" eine Pflicht-Begründung angeben.
ALTER TABLE anime_contributions
    ADD COLUMN IF NOT EXISTS member_reason TEXT NULL;

COMMENT ON COLUMN anime_contributions.member_reason IS
    'Pflicht-Begründung des Members bei Widerspruch (Das war ich nicht, Phase 76 D-09)';
