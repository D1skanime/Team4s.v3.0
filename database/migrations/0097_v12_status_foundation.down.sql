-- Rollback Migration 0096: remove v1.2 status foundation fields.

DROP INDEX IF EXISTS idx_media_assets_review_status_id;
DROP INDEX IF EXISTS idx_media_assets_visibility_id;
DROP INDEX IF EXISTS idx_anime_contributions_review_status_id;
DROP INDEX IF EXISTS idx_anime_contributions_visibility_id;

ALTER TABLE media_assets
    DROP CONSTRAINT IF EXISTS fk_media_assets_review_status,
    DROP CONSTRAINT IF EXISTS fk_media_assets_visibility;

ALTER TABLE media_assets
    DROP COLUMN IF EXISTS review_status_id,
    DROP COLUMN IF EXISTS visibility_id;

ALTER TABLE anime_contributions
    DROP CONSTRAINT IF EXISTS fk_anime_contributions_review_status,
    DROP CONSTRAINT IF EXISTS fk_anime_contributions_visibility,
    DROP CONSTRAINT IF EXISTS chk_anime_contributions_dispute_state;

ALTER TABLE anime_contributions
    DROP COLUMN IF EXISTS review_status_id,
    DROP COLUMN IF EXISTS visibility_id,
    DROP COLUMN IF EXISTS dispute_state;

ALTER TABLE members
    DROP CONSTRAINT IF EXISTS chk_members_profile_status;

ALTER TABLE members
    DROP COLUMN IF EXISTS profile_status;

DROP TABLE IF EXISTS review_statuses;
