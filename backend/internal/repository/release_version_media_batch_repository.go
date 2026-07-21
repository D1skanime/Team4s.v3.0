package repository

import (
	"context"
	"fmt"
)

// ListReleaseVersionMediaRelationMetas is the batch variant of GetReleaseVersionMediaRelation.
// It loads the same four columns (id, release_version_id, category, uploaded_by_user_id) for a
// set of relation IDs in one query, so a caller that already knows the full ID set does not have
// to load each relation on its own. Soft-deleted rows are excluded (deleted_at IS NULL) exactly
// like the single-row loader. The caller is responsible for checking completeness — this method
// does not raise ErrNotFound and returns an empty slice for an empty input without querying.
func (r *MediaRepository) ListReleaseVersionMediaRelationMetas(ctx context.Context, relationIDs []int64) ([]ReleaseVersionMediaRelationMeta, error) {
	if len(relationIDs) == 0 {
		return []ReleaseVersionMediaRelationMeta{}, nil
	}
	rows, err := r.db.Query(ctx, `
		SELECT id, release_version_id, category, uploaded_by_user_id
		FROM release_version_media
		WHERE id = ANY($1) AND deleted_at IS NULL
	`, relationIDs)
	if err != nil {
		return nil, fmt.Errorf("list release_version_media relation metas: %w", err)
	}
	defer rows.Close()

	metas := make([]ReleaseVersionMediaRelationMeta, 0, len(relationIDs))
	for rows.Next() {
		var meta ReleaseVersionMediaRelationMeta
		if err := rows.Scan(&meta.RelationID, &meta.ReleaseVersionID, &meta.Category, &meta.UploadedByUserID); err != nil {
			return nil, fmt.Errorf("scan release_version_media relation meta: %w", err)
		}
		metas = append(metas, meta)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate release_version_media relation metas: %w", err)
	}
	return metas, nil
}

// ListReleaseVersionMediaContributorGroupIDsByRelation is the batch variant of
// ListReleaseVersionMediaContributorGroupIDs. It resolves the contributor fansub group(s) for a
// set of relation IDs in one query (rvm.id = ANY($1) instead of rvm.id = $1) and groups the result
// per relation ID. The JOIN/WHERE logic — including the DISTINCT and the release_version_id vs
// anime_id contribution condition — is identical to the single-relation loader, so the resolved
// group set per relation stays the same. Groups per relation are ascending and de-duplicated via
// SELECT DISTINCT plus ORDER BY rvm.id, ac.fansub_group_id. An empty input returns an empty map.
func (r *MediaRepository) ListReleaseVersionMediaContributorGroupIDsByRelation(ctx context.Context, relationIDs []int64) (map[int64][]int64, error) {
	result := make(map[int64][]int64)
	if len(relationIDs) == 0 {
		return result, nil
	}
	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT rvm.id, ac.fansub_group_id
		FROM release_version_media rvm
		JOIN app_users au ON au.legacy_user_id = rvm.uploaded_by_user_id
		JOIN member_claims mc ON mc.app_user_id = au.id
		  AND mc.claim_status = 'verified'
		  AND mc.member_id IS NOT NULL
		JOIN release_versions rv ON rv.id = rvm.release_version_id
		JOIN fansub_releases fr ON fr.id = rv.release_id
		JOIN episodes ep ON ep.id = fr.episode_id
		JOIN anime_contributions ac ON ac.member_id = mc.member_id
		JOIN release_version_groups rvg ON rvg.release_version_id = rvm.release_version_id
		  AND rvg.fansub_group_id = ac.fansub_group_id
		WHERE rvm.id = ANY($1)
		  AND rvm.deleted_at IS NULL
		  AND (
		    ac.release_version_id = rvm.release_version_id
		    OR (ac.release_version_id IS NULL AND ac.anime_id = ep.anime_id)
		  )
		ORDER BY rvm.id, ac.fansub_group_id
	`, relationIDs)
	if err != nil {
		return nil, fmt.Errorf("list rvm contributor groups by relation: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var relationID, groupID int64
		if err := rows.Scan(&relationID, &groupID); err != nil {
			return nil, fmt.Errorf("scan rvm contributor group by relation: %w", err)
		}
		result[relationID] = append(result[relationID], groupID)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate rvm contributor groups by relation: %w", err)
	}
	return result, nil
}
