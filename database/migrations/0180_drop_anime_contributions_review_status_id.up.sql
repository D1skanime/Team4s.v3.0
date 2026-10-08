-- D-20 (176-13): anime_contributions.review_status_id has been write-only since migration 0097
-- (confirmed via a full repo-wide grep: the only two references were copy-forward writes in
-- contributions_me_handler.go's revision-clone INSERT...SELECT, never read back for any review
-- decision anywhere in the repository layer). Drop the FK, its index, then the column.
ALTER TABLE anime_contributions
    DROP CONSTRAINT IF EXISTS fk_anime_contributions_review_status;

DROP INDEX IF EXISTS idx_anime_contributions_review_status_id;

ALTER TABLE anime_contributions
    DROP COLUMN IF EXISTS review_status_id;
