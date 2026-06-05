-- Migration 0099: member_correction_reports — review-gebundene Korrektur-Vorschläge zu Member-Profilen.
-- Lock H: Eigene Tabelle, strikt getrennt von Claims/Requests/Contributions.
-- Vorschläge werden NIE direkt veröffentlicht (D-18); status DEFAULT 'in_review'.

CREATE TABLE IF NOT EXISTS member_correction_reports (
    id                      BIGSERIAL PRIMARY KEY,
    submitter_app_user_id   BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    member_id               BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    target_type             VARCHAR(20) NOT NULL,
    target_id               BIGINT NULL,
    reason_text             TEXT NOT NULL,
    status                  VARCHAR(20) NOT NULL DEFAULT 'in_review',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_member_correction_reports_target_type
        CHECK (target_type IN ('profile', 'contribution', 'role')),
    CONSTRAINT chk_member_correction_reports_status
        CHECK (status IN ('in_review', 'accepted', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_member_correction_reports_member_status
    ON member_correction_reports (member_id, status);
