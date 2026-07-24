BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM project_note_credit_lifecycles
        WHERE first_author_member_id IS NULL
           OR lifecycle_status = 'skipped_no_member'
    ) THEN
        RAISE EXCEPTION '0138 rollback refused: unlinked first-author lifecycle history exists';
    END IF;
END;
$$;

ALTER TABLE project_note_credit_lifecycles
    DROP CONSTRAINT chk_project_note_credit_lifecycle_shape,
    DROP CONSTRAINT project_note_credit_lifecycles_lifecycle_status_check;

ALTER TABLE project_note_credit_lifecycles
    DROP COLUMN first_author_app_user_id,
    ALTER COLUMN first_author_member_id SET NOT NULL;

ALTER TABLE project_note_credit_lifecycles
    ADD CONSTRAINT project_note_credit_lifecycles_lifecycle_status_check CHECK (
        lifecycle_status IN ('pending', 'awarded', 'reversed')
    ),
    ADD CONSTRAINT chk_project_note_credit_lifecycle_shape CHECK (
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
    );

COMMIT;
