BEGIN;

-- Source-owned lifecycle metadata only. Content remains in release_version_notes,
-- and process media remains in release_version_media -> media_assets -> media_files.
CREATE TABLE release_version_note_review_lifecycle (
    id BIGSERIAL PRIMARY KEY,
    release_version_note_id BIGINT NOT NULL UNIQUE
        REFERENCES release_version_notes(id) ON DELETE RESTRICT,
    source_revision BIGINT NOT NULL CHECK (source_revision > 0),
    review_state TEXT NOT NULL CHECK (review_state IN ('pending', 'confirmed', 'rejected', 'tombstoned')),
    submitter_app_user_id BIGINT NOT NULL REFERENCES app_users(id),
    submitter_member_id BIGINT NOT NULL REFERENCES members(id),
    submitted_at TIMESTAMPTZ NOT NULL,
    last_activity_at TIMESTAMPTZ NOT NULL,
    decided_at TIMESTAMPTZ NULL,
    cleanup_due_at TIMESTAMPTZ NULL,
    tombstoned_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_release_note_review_activity_order CHECK (
        last_activity_at >= submitted_at
    ),
    CONSTRAINT chk_release_note_review_decision_order CHECK (
        decided_at IS NULL OR decided_at >= submitted_at
    ),
    CONSTRAINT chk_release_note_review_cleanup_order CHECK (
        cleanup_due_at IS NULL OR cleanup_due_at >= last_activity_at
    ),
    CONSTRAINT chk_release_note_review_tombstone_shape CHECK (
        (review_state = 'tombstoned' AND tombstoned_at IS NOT NULL)
        OR
        (review_state <> 'tombstoned' AND tombstoned_at IS NULL)
    )
);

CREATE TABLE release_version_media_review_lifecycle (
    id BIGSERIAL PRIMARY KEY,
    release_version_media_id BIGINT NOT NULL UNIQUE
        REFERENCES release_version_media(id) ON DELETE RESTRICT,
    source_revision BIGINT NOT NULL CHECK (source_revision > 0),
    review_state TEXT NOT NULL CHECK (review_state IN ('pending', 'confirmed', 'rejected', 'tombstoned')),
    category TEXT NOT NULL CHECK (category IN ('screenshot', 'typesetting_karaoke', 'fun_outtake', 'other')),
    submitter_app_user_id BIGINT NOT NULL REFERENCES app_users(id),
    submitter_member_id BIGINT NOT NULL REFERENCES members(id),
    submitted_at TIMESTAMPTZ NOT NULL,
    last_activity_at TIMESTAMPTZ NOT NULL,
    decided_at TIMESTAMPTZ NULL,
    cleanup_due_at TIMESTAMPTZ NULL,
    tombstoned_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_release_rvm_review_activity_order CHECK (
        last_activity_at >= submitted_at
    ),
    CONSTRAINT chk_release_rvm_review_decision_order CHECK (
        decided_at IS NULL OR decided_at >= submitted_at
    ),
    CONSTRAINT chk_release_rvm_review_cleanup_order CHECK (
        cleanup_due_at IS NULL OR cleanup_due_at >= last_activity_at
    ),
    CONSTRAINT chk_release_rvm_review_tombstone_shape CHECK (
        (review_state = 'tombstoned' AND tombstoned_at IS NOT NULL)
        OR
        (review_state <> 'tombstoned' AND tombstoned_at IS NULL)
    )
);

-- Full tuple indexes support deterministic oldest-first queue and cleanup cursors.
CREATE INDEX idx_release_note_review_queue
    ON release_version_note_review_lifecycle (review_state, submitted_at, id);

CREATE INDEX idx_release_rvm_review_queue
    ON release_version_media_review_lifecycle (review_state, submitted_at, id);

CREATE INDEX idx_release_note_review_cleanup
    ON release_version_note_review_lifecycle (review_state, cleanup_due_at, id)
    WHERE cleanup_due_at IS NOT NULL;

CREATE INDEX idx_release_rvm_review_cleanup
    ON release_version_media_review_lifecycle (review_state, cleanup_due_at, id)
    WHERE cleanup_due_at IS NOT NULL;

-- Read-only shared projection. It unifies queue metadata without copying source
-- content, media paths, or Phase-107 decision/audit/credit state.
CREATE VIEW release_review_lifecycle_sources AS
SELECT
    'release_version_note'::TEXT AS source_type,
    lifecycle.release_version_note_id AS source_id,
    lifecycle.id AS lifecycle_id,
    lifecycle.source_revision,
    'text'::TEXT AS review_kind,
    NULL::TEXT AS category,
    lifecycle.review_state,
    lifecycle.submitter_app_user_id,
    lifecycle.submitter_member_id,
    lifecycle.submitted_at,
    lifecycle.last_activity_at,
    lifecycle.decided_at,
    lifecycle.cleanup_due_at,
    lifecycle.tombstoned_at
FROM release_version_note_review_lifecycle lifecycle
UNION ALL
SELECT
    'release_version_media'::TEXT AS source_type,
    lifecycle.release_version_media_id AS source_id,
    lifecycle.id AS lifecycle_id,
    lifecycle.source_revision,
    'image'::TEXT AS review_kind,
    lifecycle.category,
    lifecycle.review_state,
    lifecycle.submitter_app_user_id,
    lifecycle.submitter_member_id,
    lifecycle.submitted_at,
    lifecycle.last_activity_at,
    lifecycle.decided_at,
    lifecycle.cleanup_due_at,
    lifecycle.tombstoned_at
FROM release_version_media_review_lifecycle lifecycle;

-- Physical deletion is a separate persistent outbox. IDs intentionally remain
-- scalar snapshots: a completed logical scrub or later source-row cleanup must
-- not erase retry history. Runtime workers must recheck every reference class
-- and resolve controlled storage paths before deleting a file.
CREATE TABLE release_review_file_delete_jobs (
    id BIGSERIAL PRIMARY KEY,
    release_version_media_id BIGINT NOT NULL CHECK (release_version_media_id > 0),
    media_asset_id BIGINT NOT NULL CHECK (media_asset_id > 0),
    media_file_id BIGINT NOT NULL CHECK (media_file_id > 0),
    job_state TEXT NOT NULL DEFAULT 'pending' CHECK (
        job_state IN ('pending', 'completed')
    ),
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    last_attempt_at TIMESTAMPTZ NULL,
    last_error_code TEXT NULL,
    next_attempt_at TIMESTAMPTZ NULL,
    completed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (media_file_id),
    CONSTRAINT chk_release_review_file_delete_error_code CHECK (
        last_error_code IS NULL
        OR (
            phase106_trim_unicode_whitespace(last_error_code) <> ''
            AND last_error_code = phase106_trim_unicode_whitespace(last_error_code)
        )
    ),
    CONSTRAINT chk_release_review_file_delete_completion CHECK (
        (job_state = 'pending' AND completed_at IS NULL)
        OR
        (job_state = 'completed' AND completed_at IS NOT NULL)
    ),
    CONSTRAINT chk_release_review_file_delete_attempt_order CHECK (
        next_attempt_at IS NULL
        OR last_attempt_at IS NULL
        OR next_attempt_at >= last_attempt_at
    )
);

CREATE INDEX idx_release_review_file_delete_pending
    ON release_review_file_delete_jobs (job_state, next_attempt_at, id)
    WHERE job_state = 'pending';

COMMIT;
