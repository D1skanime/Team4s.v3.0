BEGIN;

ALTER TABLE project_note_credit_lifecycles
    DROP CONSTRAINT chk_project_note_credit_lifecycle_shape;

ALTER TABLE project_note_credit_lifecycles
    ALTER COLUMN first_author_member_id DROP NOT NULL,
    ADD COLUMN first_author_app_user_id BIGINT NOT NULL
        REFERENCES app_users(id) ON DELETE RESTRICT;

ALTER TABLE project_note_credit_lifecycles
    DROP CONSTRAINT project_note_credit_lifecycles_lifecycle_status_check;

ALTER TABLE project_note_credit_lifecycles
    ADD CONSTRAINT project_note_credit_lifecycles_lifecycle_status_check CHECK (
        lifecycle_status IN ('pending', 'awarded', 'skipped_no_member', 'reversed')
    ),
    ADD CONSTRAINT chk_project_note_credit_lifecycle_shape CHECK (
        (lifecycle_status = 'pending'
            AND first_author_member_id IS NOT NULL
            AND award_entry_id IS NULL
            AND reversal_entry_id IS NULL)
        OR
        (lifecycle_status = 'awarded'
            AND first_author_member_id IS NOT NULL
            AND award_entry_id IS NOT NULL
            AND reversal_entry_id IS NULL)
        OR
        (lifecycle_status = 'skipped_no_member'
            AND first_author_member_id IS NULL
            AND award_entry_id IS NULL
            AND reversal_entry_id IS NULL)
        OR
        (lifecycle_status = 'reversed'
            AND first_author_member_id IS NOT NULL
            AND award_entry_id IS NOT NULL
            AND reversal_entry_id IS NOT NULL)
    );

COMMIT;
