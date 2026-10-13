-- Reverts migration 0183 (drop member_suggestions).
-- Recreates the table in its final shape from 0098's original CREATE TABLE (the
-- anime_contributions.member_reason column that the same 0098 migration also added is a
-- separate, still-live feature and was never touched by 0183 -- nothing to recreate for it here).
--
-- Schema-only, same caveat as migration 0178's down: the entire Go handler
-- (suggestions_me_handler.go), repository (member_suggestions_repository.go), the three
-- /api/v1/me/suggestions* routes, and the matching frontend dead-code (ReportModal.tsx and
-- friends) were deleted in the SAME phase as the 0183 up migration. Running `migrate down` on
-- this file alone recreates an empty table that nothing in the current codebase reads or
-- writes -- restoring the feature itself requires reverting that code too, not just this schema.
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
