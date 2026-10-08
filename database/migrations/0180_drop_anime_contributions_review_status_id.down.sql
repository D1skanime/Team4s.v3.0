-- Reverse of 0180: re-add anime_contributions.review_status_id, its FK, and its index exactly as
-- migration 0097 originally created them.
ALTER TABLE anime_contributions
    ADD COLUMN IF NOT EXISTS review_status_id BIGINT;

DO $$
BEGIN
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

CREATE INDEX IF NOT EXISTS idx_anime_contributions_review_status_id
    ON anime_contributions(review_status_id)
    WHERE review_status_id IS NOT NULL;
