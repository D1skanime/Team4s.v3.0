-- Persist the real source group for release-version-scoped public content.
ALTER TABLE release_version_media
    ADD COLUMN fansub_group_id BIGINT NULL REFERENCES fansub_groups(id) ON DELETE SET NULL;

ALTER TABLE release_version_notes
    ADD COLUMN fansub_group_id BIGINT NULL REFERENCES fansub_groups(id) ON DELETE SET NULL;

CREATE INDEX idx_rvm_release_version_source_group
    ON release_version_media(release_version_id, fansub_group_id)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_rvn_release_version_source_group
    ON release_version_notes(release_version_id, fansub_group_id)
    WHERE deleted_at IS NULL;

-- Backfill media only when the uploader identity has exactly one contribution
-- group in the concrete release context. Ambiguous legacy rows intentionally stay NULL.
WITH candidates AS (
    SELECT rvm.id, MIN(ac.fansub_group_id) AS fansub_group_id
    FROM release_version_media rvm
    JOIN app_users au ON au.legacy_user_id = rvm.uploaded_by_user_id
    JOIN member_claims mc ON mc.app_user_id = au.id
        AND mc.claim_status = 'verified'
    JOIN release_versions rv ON rv.id = rvm.release_version_id
    JOIN fansub_releases fr ON fr.id = rv.release_id
    JOIN episodes ep ON ep.id = fr.episode_id
    JOIN anime_contributions ac ON ac.member_id = mc.member_id
        AND (ac.release_version_id = rvm.release_version_id
            OR (ac.release_version_id IS NULL AND ac.anime_id = ep.anime_id))
    JOIN release_version_groups rvg ON rvg.release_version_id = rvm.release_version_id
        AND rvg.fansub_group_id = ac.fansub_group_id
    WHERE rvm.deleted_at IS NULL
    GROUP BY rvm.id
    HAVING COUNT(DISTINCT ac.fansub_group_id) = 1
)
UPDATE release_version_media rvm
SET fansub_group_id = candidates.fansub_group_id
FROM candidates
WHERE rvm.id = candidates.id;

-- Notes additionally require the matching contribution role.
WITH candidates AS (
    SELECT rvn.id, MIN(ac.fansub_group_id) AS fansub_group_id
    FROM release_version_notes rvn
    JOIN contributor_roles cr ON cr.id = rvn.role_id
    JOIN release_versions rv ON rv.id = rvn.release_version_id
    JOIN fansub_releases fr ON fr.id = rv.release_id
    JOIN episodes ep ON ep.id = fr.episode_id
    JOIN anime_contributions ac ON ac.member_id = rvn.member_id
        AND (ac.release_version_id = rvn.release_version_id
            OR (ac.release_version_id IS NULL AND ac.anime_id = ep.anime_id))
    JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
        AND acr.role_code = cr.name
    JOIN release_version_groups rvg ON rvg.release_version_id = rvn.release_version_id
        AND rvg.fansub_group_id = ac.fansub_group_id
    WHERE rvn.deleted_at IS NULL
    GROUP BY rvn.id
    HAVING COUNT(DISTINCT ac.fansub_group_id) = 1
)
UPDATE release_version_notes rvn
SET fansub_group_id = candidates.fansub_group_id
FROM candidates
WHERE rvn.id = candidates.id;
