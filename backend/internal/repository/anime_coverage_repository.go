package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// AnimeCoverageRow enthält Aggregationsdaten für ein Anime innerhalb einer Fansub-Gruppe:
// Anzahl DISTINCT Mitwirkender, abgedeckte Rollencodes und ob ein Projekt-Einblick existiert.
type AnimeCoverageRow struct {
	AnimeID             int64    `json:"anime_id"`
	MemberCount         int      `json:"member_count"`
	CoveredRoleCodes    []string `json:"covered_role_codes"`
	HasProjectNote      bool     `json:"has_project_note"`
	HasFirstRelease     bool     `json:"has_first_release"`
	HasCompletedProject bool     `json:"has_completed_project"`
	HasCollaboration    bool     `json:"has_collaboration"`
}

// AnimeCoverageRepository berechnet Aggregations-Coverage für alle Anime einer Fansub-Gruppe.
// Wird von FansubAnimeContributionsHandler.GetAnimeCoverage genutzt.
type AnimeCoverageRepository struct {
	db *pgxpool.Pool
}

// NewAnimeCoverageRepository erstellt ein neues AnimeCoverageRepository.
func NewAnimeCoverageRepository(db *pgxpool.Pool) *AnimeCoverageRepository {
	return &AnimeCoverageRepository{db: db}
}

// CoverageByFansub liefert pro Anime der Gruppe die Anzahl DISTINCT Mitwirkender,
// die DISTINCT abgedeckten Rollencodes und den Projekt-Einblick-Status.
// Eine einzige Query — kein N+1. Nur Contributions mit Status != 'rejected' werden berücksichtigt.
func (r *AnimeCoverageRepository) CoverageByFansub(ctx context.Context, fansubGroupID int64) ([]AnimeCoverageRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			afg.anime_id,
			COUNT(DISTINCT ac.member_id) AS member_count,
			COALESCE(
				ARRAY_AGG(DISTINCT acr.role_code) FILTER (WHERE acr.role_code IS NOT NULL),
				ARRAY[]::text[]
			) AS covered_role_codes,
			EXISTS (
				SELECT 1
				FROM anime_fansub_project_notes afpn
				WHERE afpn.anime_id = afg.anime_id
				  AND afpn.fansub_group_id = afg.fansub_group_id
				  AND afpn.deleted_at IS NULL
				  AND afpn.status <> 'deleted'
			) AS has_project_note,
			EXISTS (
				SELECT 1
				FROM release_versions rv
				JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
				JOIN fansub_releases fr ON fr.id = rv.release_id
				JOIN episodes ep ON ep.id = fr.episode_id
				WHERE rvg.fansub_group_id = afg.fansub_group_id
				  AND ep.anime_id = afg.anime_id
				  AND (
					EXISTS (
						SELECT 1
						FROM release_version_notes rvn
						WHERE rvn.release_version_id = rv.id
						  AND rvn.deleted_at IS NULL
						  AND rvn.status <> 'deleted'
						  AND COALESCE(
							NULLIF(BTRIM(rvn.body_text), ''),
							NULLIF(BTRIM(rvn.body_markdown), ''),
							NULLIF(BTRIM(rvn.body_html), ''),
							NULLIF(BTRIM(COALESCE(rvn.title, '')), '')
						  ) IS NOT NULL
						  AND EXISTS (
							SELECT 1
							FROM anime_contributions ac_note
							LEFT JOIN hist_fansub_group_members hfgm_note ON hfgm_note.id = ac_note.fansub_group_member_id
							WHERE ac_note.anime_id = ep.anime_id
							  AND ac_note.fansub_group_id = rvg.fansub_group_id
							  AND COALESCE(ac_note.member_id, hfgm_note.member_id) = rvn.member_id
							  AND ac_note.status <> 'rejected'
							  AND (ac_note.release_version_id = rv.id OR ac_note.release_version_id IS NULL)
						  )
					)
					OR EXISTS (
						SELECT 1
						FROM release_version_media rvm
						WHERE rvm.release_version_id = rv.id
						  AND rvm.deleted_at IS NULL
						  AND EXISTS (
							SELECT 1
							FROM member_claims mc_media
							JOIN anime_contributions ac_media ON ac_media.member_id = mc_media.member_id
							LEFT JOIN hist_fansub_group_members hfgm_media ON hfgm_media.id = ac_media.fansub_group_member_id
							WHERE mc_media.app_user_id = rvm.uploaded_by_user_id
							  AND mc_media.claim_status = 'verified'
							  AND ac_media.anime_id = ep.anime_id
							  AND ac_media.fansub_group_id = rvg.fansub_group_id
							  AND COALESCE(ac_media.member_id, hfgm_media.member_id) = mc_media.member_id
							  AND ac_media.status <> 'rejected'
							  AND (ac_media.release_version_id = rv.id OR ac_media.release_version_id IS NULL)
						  )
					)
				  )
				  AND EXISTS (
					SELECT 1
					FROM theme_segments ts
					JOIN themes th ON th.id = ts.theme_id
					CROSS JOIN LATERAL (
						SELECT COALESCE(
							ep.sort_index,
							CASE WHEN COALESCE(ep.episode_number, '') ~ '^[0-9]+$' THEN ep.episode_number::int ELSE NULL END
						) AS episode_anchor
					) anchor
					WHERE th.anime_id = ep.anime_id
					  AND anchor.episode_anchor IS NOT NULL
					  AND (ts.start_episode IS NULL OR ts.start_episode <= anchor.episode_anchor)
					  AND (ts.end_episode IS NULL OR ts.end_episode >= anchor.episode_anchor)
					  AND (
						ts.fansub_group_id IS NULL
						OR ts.fansub_group_id IN (
							SELECT rvg_segment.fansub_group_id
							FROM release_version_groups rvg_segment
							WHERE rvg_segment.release_version_id = rv.id
						)
					  )
					  AND COALESCE(NULLIF(BTRIM(ts.version), ''), COALESCE(NULLIF(BTRIM(rv.version), ''), 'v1')) = COALESCE(NULLIF(BTRIM(rv.version), ''), 'v1')
				  )
			) AS has_first_release,
			(
				EXISTS (
					SELECT 1
					FROM release_versions rv
					JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
					JOIN fansub_releases fr ON fr.id = rv.release_id
					JOIN episodes ep ON ep.id = fr.episode_id
					WHERE rvg.fansub_group_id = afg.fansub_group_id
					  AND ep.anime_id = afg.anime_id
				)
				AND NOT EXISTS (
					SELECT 1
					FROM release_versions rv
					JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
					JOIN fansub_releases fr ON fr.id = rv.release_id
					JOIN episodes ep ON ep.id = fr.episode_id
					WHERE rvg.fansub_group_id = afg.fansub_group_id
					  AND ep.anime_id = afg.anime_id
					  AND NOT (
						EXISTS (
							SELECT 1
							FROM release_version_notes rvn
							WHERE rvn.release_version_id = rv.id
							  AND rvn.deleted_at IS NULL
							  AND rvn.status <> 'deleted'
							  AND COALESCE(
								NULLIF(BTRIM(rvn.body_text), ''),
								NULLIF(BTRIM(rvn.body_markdown), ''),
								NULLIF(BTRIM(rvn.body_html), ''),
								NULLIF(BTRIM(COALESCE(rvn.title, '')), '')
							  ) IS NOT NULL
							  AND EXISTS (
								SELECT 1
								FROM anime_contributions ac_note
								LEFT JOIN hist_fansub_group_members hfgm_note ON hfgm_note.id = ac_note.fansub_group_member_id
								WHERE ac_note.anime_id = ep.anime_id
								  AND ac_note.fansub_group_id = rvg.fansub_group_id
								  AND COALESCE(ac_note.member_id, hfgm_note.member_id) = rvn.member_id
								  AND ac_note.status <> 'rejected'
								  AND (ac_note.release_version_id = rv.id OR ac_note.release_version_id IS NULL)
							  )
						)
						OR EXISTS (
							SELECT 1
							FROM release_version_media rvm
							WHERE rvm.release_version_id = rv.id
							  AND rvm.deleted_at IS NULL
							  AND EXISTS (
								SELECT 1
								FROM member_claims mc_media
								JOIN anime_contributions ac_media ON ac_media.member_id = mc_media.member_id
								LEFT JOIN hist_fansub_group_members hfgm_media ON hfgm_media.id = ac_media.fansub_group_member_id
								WHERE mc_media.app_user_id = rvm.uploaded_by_user_id
								  AND mc_media.claim_status = 'verified'
								  AND ac_media.anime_id = ep.anime_id
								  AND ac_media.fansub_group_id = rvg.fansub_group_id
								  AND COALESCE(ac_media.member_id, hfgm_media.member_id) = mc_media.member_id
								  AND ac_media.status <> 'rejected'
								  AND (ac_media.release_version_id = rv.id OR ac_media.release_version_id IS NULL)
							  )
						)
					  )
				)
			) AS has_completed_project,
			EXISTS (
				SELECT 1
				FROM release_versions rv
				JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
				JOIN fansub_releases fr ON fr.id = rv.release_id
				JOIN episodes ep ON ep.id = fr.episode_id
				WHERE rvg.fansub_group_id = afg.fansub_group_id
				  AND ep.anime_id = afg.anime_id
				  AND (
					SELECT COUNT(DISTINCT rvg_peer.fansub_group_id)
					FROM release_version_groups rvg_peer
					WHERE rvg_peer.release_version_id = rv.id
				  ) >= 2
			) AS has_collaboration
		FROM anime_fansub_groups afg
		LEFT JOIN anime_contributions ac
			ON ac.anime_id = afg.anime_id
			AND ac.fansub_group_id = afg.fansub_group_id
			AND ac.status <> 'rejected'
		LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		WHERE afg.fansub_group_id = $1
		GROUP BY afg.anime_id, afg.fansub_group_id
		ORDER BY afg.anime_id
	`, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("anime coverage by fansub: query: %w", err)
	}
	defer rows.Close()

	result := make([]AnimeCoverageRow, 0)
	for rows.Next() {
		var row AnimeCoverageRow
		if err := rows.Scan(&row.AnimeID, &row.MemberCount, &row.CoveredRoleCodes, &row.HasProjectNote, &row.HasFirstRelease, &row.HasCompletedProject, &row.HasCollaboration); err != nil {
			return nil, fmt.Errorf("anime coverage by fansub: scan: %w", err)
		}
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("anime coverage by fansub: iterate: %w", err)
	}
	return result, nil
}
