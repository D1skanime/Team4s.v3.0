package repository

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

type publicContributionCandidate struct {
	ReleaseVersionID int64
	ContributionID   int64
	FansubGroupID    int64
	MemberID         int64
	Name             string
	AvatarURL        *string
	RoleLabels       []string
	IsOverride       bool
	IsPublic         bool
}

type publicContributionGroupKey struct {
	releaseVersionID int64
	fansubGroupID    int64
}

type publicContributorKey struct {
	fansubGroupID int64
	memberID      int64
}

type publicContributorAccumulator struct {
	contributor PublicReleaseContributor
	roleLabels  map[string]struct{}
}

// loadPublicEffectiveContributors resolves the public crew for each release version.
// Precedence is evaluated independently for every attached fansub group: exact
// release-version assignments replace that group's anime defaults, while groups
// without overrides continue to inherit their own defaults.
func loadPublicEffectiveContributors(
	ctx context.Context,
	db *pgxpool.Pool,
	releaseVersionIDs []int64,
) (map[int64][]PublicReleaseContributor, error) {
	if len(releaseVersionIDs) == 0 {
		return map[int64][]PublicReleaseContributor{}, nil
	}

	rows, err := db.Query(ctx, `
		WITH release_context AS (
			SELECT rv.id AS release_version_id, e.anime_id
			FROM release_versions rv
			JOIN fansub_releases fr ON fr.id = rv.release_id
			JOIN episodes e ON e.id = fr.episode_id
			WHERE rv.id = ANY($1::bigint[])
		)
		SELECT
			rc.release_version_id,
			ac.id AS contribution_id,
			ac.fansub_group_id,
			ac.member_id,
			COALESCE(NULLIF(TRIM(m.nickname), ''), NULLIF(TRIM(m.display_name), ''), 'Mitglied') AS member_name,
			NULLIF(TRIM(member_avatar.file_path), '') AS avatar_url,
			COALESCE(
				ARRAY_AGG(DISTINCT COALESCE(rd.label_de, acr.role_code) ORDER BY COALESCE(rd.label_de, acr.role_code))
					FILTER (WHERE acr.role_code IS NOT NULL),
				ARRAY[]::text[]
			) AS role_labels,
			COALESCE(ac.release_version_id = rc.release_version_id, false) AS is_override,
			(
				COALESCE(ac.is_public_on_anime_page = true, false)
				AND COALESCE(v.name, 'public') = 'public'
			) AS is_public
		FROM release_context rc
		JOIN release_version_groups rvg ON rvg.release_version_id = rc.release_version_id
		JOIN anime_contributions ac
		  ON ac.fansub_group_id = rvg.fansub_group_id
		 AND (
			ac.release_version_id = rc.release_version_id
			OR (
				ac.release_version_id IS NULL
				AND ac.anime_id = rc.anime_id
			)
		 )
		JOIN members m ON m.id = ac.member_id
		LEFT JOIN media_assets member_avatar ON member_avatar.id = m.avatar_media_id
		LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		LEFT JOIN role_definitions rd ON rd.code = acr.role_code
		LEFT JOIN visibilities v ON v.id = ac.visibility_id
		GROUP BY rc.release_version_id, ac.id, m.nickname, m.display_name, member_avatar.file_path, v.name
		ORDER BY rc.release_version_id, ac.fansub_group_id, ac.id
	`, releaseVersionIDs)
	if err != nil {
		return nil, fmt.Errorf("load public effective contributors: %w", err)
	}
	defer rows.Close()

	candidates := make([]publicContributionCandidate, 0)
	for rows.Next() {
		var candidate publicContributionCandidate
		if err := rows.Scan(
			&candidate.ReleaseVersionID,
			&candidate.ContributionID,
			&candidate.FansubGroupID,
			&candidate.MemberID,
			&candidate.Name,
			&candidate.AvatarURL,
			&candidate.RoleLabels,
			&candidate.IsOverride,
			&candidate.IsPublic,
		); err != nil {
			return nil, fmt.Errorf("scan public effective contributor candidate: %w", err)
		}
		candidates = append(candidates, candidate)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate public effective contributor candidates: %w", err)
	}

	return resolvePublicEffectiveContributors(candidates), nil
}

func resolvePublicEffectiveContributors(
	candidates []publicContributionCandidate,
) map[int64][]PublicReleaseContributor {
	grouped := make(map[publicContributionGroupKey][]publicContributionCandidate)
	for _, candidate := range candidates {
		key := publicContributionGroupKey{
			releaseVersionID: candidate.ReleaseVersionID,
			fansubGroupID:    candidate.FansubGroupID,
		}
		grouped[key] = append(grouped[key], candidate)
	}

	resolved := make(map[int64]map[publicContributorKey]*publicContributorAccumulator)
	for _, groupCandidates := range grouped {
		hasOverride := false
		for _, candidate := range groupCandidates {
			if candidate.IsOverride {
				hasOverride = true
				break
			}
		}

		for _, candidate := range groupCandidates {
			if candidate.IsOverride != hasOverride || !candidate.IsPublic {
				continue
			}

			contributors := resolved[candidate.ReleaseVersionID]
			if contributors == nil {
				contributors = make(map[publicContributorKey]*publicContributorAccumulator)
				resolved[candidate.ReleaseVersionID] = contributors
			}
			key := publicContributorKey{
				fansubGroupID: candidate.FansubGroupID,
				memberID:      candidate.MemberID,
			}
			accumulator := contributors[key]
			if accumulator == nil {
				accumulator = &publicContributorAccumulator{
					contributor: PublicReleaseContributor{
						FansubGroupID: candidate.FansubGroupID,
						MemberID:      candidate.MemberID,
						Name:          candidate.Name,
						AvatarURL:     candidate.AvatarURL,
					},
					roleLabels: make(map[string]struct{}),
				}
				contributors[key] = accumulator
			} else if accumulator.contributor.AvatarURL == nil && candidate.AvatarURL != nil {
				accumulator.contributor.AvatarURL = candidate.AvatarURL
			}

			for _, roleLabel := range candidate.RoleLabels {
				roleLabel = strings.TrimSpace(roleLabel)
				if roleLabel != "" {
					accumulator.roleLabels[roleLabel] = struct{}{}
				}
			}
		}
	}

	result := make(map[int64][]PublicReleaseContributor, len(resolved))
	for releaseVersionID, contributors := range resolved {
		items := make([]PublicReleaseContributor, 0, len(contributors))
		for _, accumulator := range contributors {
			roles := make([]string, 0, len(accumulator.roleLabels))
			for roleLabel := range accumulator.roleLabels {
				roles = append(roles, roleLabel)
			}
			sort.Strings(roles)
			accumulator.contributor.RoleLabel = strings.Join(roles, ", ")
			items = append(items, accumulator.contributor)
		}
		sort.Slice(items, func(i, j int) bool {
			if items[i].Name != items[j].Name {
				return items[i].Name < items[j].Name
			}
			if items[i].FansubGroupID != items[j].FansubGroupID {
				return items[i].FansubGroupID < items[j].FansubGroupID
			}
			return items[i].MemberID < items[j].MemberID
		})
		result[releaseVersionID] = items
	}

	return result
}
