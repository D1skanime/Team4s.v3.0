package repository

// Ausgelagert aus anime_contributions_proposal_repository.go für das 450-Zeilen-Limit
// (Phase 143). Enthält die Member-Dashboard-Ansicht auf Contributions inkl.
// Vorschlagsfeldern sowie die Selbstveröffentlichung nach Ablauf der Review-Frist.

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

// MemberContributionWithProposalRow erweitert AnimeContributionRow um proposal-spezifische
// Felder für die Member-Dashboard-Ansicht. CanSelfPublish und ReviewNote werden in der
// Member-Listen-Query on-read berechnet — sie gehören NICHT zu animeContributionSelectCols.
// FansubGroupName und IsOwnProposal sind Phase-76-Erweiterungen (D-12, D-03a).
// EpisodeNumber und EpisodeSortIndex sind quick-260620-qog-Erweiterungen für die
// Folgen-Gruppierung im Frontend (NULL bei anime-weiten Beiträgen ohne release_version_id).
// WorkedReleaseVersionCount und TotalReleaseVersionCount sind quick-260707-jya-Erweiterungen
// (D-01): korrelierte Zählwerte pro Anime+Gruppe dieser Zeile — kein Aggregat über mehrere
// Zeilen, sondern für alle Rollen-Zeilen desselben Projekts (anime_id+fansub_group_id) identisch.
type MemberContributionWithProposalRow struct {
	AnimeContributionRow
	AnimeTitle                string  `json:"anime_title"`
	CanSelfPublish            bool    `json:"can_self_publish"`
	ReviewNote                *string `json:"review_note"`
	FansubGroupName           string  `json:"fansub_group_name"`
	IsOwnProposal             bool    `json:"is_own_proposal"`
	EpisodeNumber             *string `json:"episode_number"`
	EpisodeSortIndex          *int    `json:"episode_sort_index"`
	TotalReleaseVersionCount  int32   `json:"total_release_version_count"`
	WorkedReleaseVersionCount int32   `json:"worked_release_version_count"`
	HasOwnReleaseWork         bool    `json:"has_own_release_work"`
}

// ListByMemberIDWithProposalFields gibt Contributions für einen Member zurück,
// angereichert um CanSelfPublish (berechnet on-read: status='proposed' UND
// created_at+90d < NOW()), ReviewNote, FansubGroupName (D-12) und IsOwnProposal (D-03a).
// appUserID wird als $2 übergeben, um IsOwnProposal server-seitig zu berechnen.
func (r *AnimeContributionsRepository) ListByMemberIDWithProposalFields(ctx context.Context, memberID int64, appUserID int64) ([]MemberContributionWithProposalRow, error) {
	reviewNoteExpr := "ac.review_note"
	hasReviewNote, err := r.hasAnimeContributionReviewNoteColumn(ctx)
	if err != nil {
		return nil, err
	}
	if !hasReviewNote {
		reviewNoteExpr = "NULL::text AS review_note"
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			`+animeContributionSelectCols+`,
			COALESCE(a.title_de, a.title_en, a.title, '') AS anime_title,
			(ac.status = 'proposed' AND ac.created_at + INTERVAL '90 days' < NOW()) AS can_self_publish,
			`+reviewNoteExpr+`,
			COALESCE(fg.name, '') AS fansub_group_name,
			COALESCE(ac.created_by = $2, false) AS is_own_proposal,
			ep.episode_number,
			ep.sort_index AS episode_sort_index,
			CASE WHEN ac.release_version_id IS NULL THEN false ELSE (
				EXISTS (
					SELECT 1 FROM release_version_notes n
					LEFT JOIN release_version_note_review_lifecycle lifecycle
					  ON lifecycle.release_version_note_id = n.id
					WHERE n.release_version_id = ac.release_version_id
					  AND n.member_id = $1
					  AND n.deleted_at IS NULL
					  AND (lifecycle.review_state IS NULL OR lifecycle.review_state <> 'rejected')
				) OR EXISTS (
					SELECT 1 FROM release_version_media m
					LEFT JOIN release_version_media_review_lifecycle lifecycle
					  ON lifecycle.release_version_media_id = m.id
					WHERE m.release_version_id = ac.release_version_id
					  AND m.uploaded_by_user_id = $2
					  AND m.deleted_at IS NULL
					  AND (lifecycle.review_state IS NULL OR lifecycle.review_state <> 'rejected')
				)
			) END AS has_own_release_work,
			(SELECT COUNT(DISTINCT rv.id) FROM release_versions rv
			 JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
			 JOIN fansub_releases fr2 ON fr2.id = rv.release_id
			 JOIN episodes ep ON ep.id = fr2.episode_id
			 WHERE ep.anime_id = ac.anime_id
			   AND rvg.fansub_group_id = ac.fansub_group_id)::int AS total_release_version_count,
			(SELECT COUNT(DISTINCT rv.id) FROM release_versions rv
			 JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
			 JOIN fansub_releases fr2 ON fr2.id = rv.release_id
			 JOIN episodes ep ON ep.id = fr2.episode_id
			 WHERE ep.anime_id = ac.anime_id
			   AND rvg.fansub_group_id = ac.fansub_group_id
			   AND (
			     EXISTS (
			       SELECT 1 FROM release_version_notes n
			       WHERE n.release_version_id = rv.id
			         AND n.member_id = $1
			         AND n.deleted_at IS NULL
			     )
			     OR EXISTS (
			       SELECT 1 FROM release_version_media m
			       WHERE m.release_version_id = rv.id
			         AND m.deleted_at IS NULL
			         AND m.uploaded_by_user_id IN (
			           SELECT mc.app_user_id FROM member_claims mc
			           WHERE mc.member_id = $1 AND mc.claim_status = 'verified'
			         )
			     )
			   ))::int AS worked_release_version_count
		FROM anime_contributions ac
		LEFT JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
		JOIN anime a ON a.id = ac.anime_id
		LEFT JOIN fansub_groups fg ON fg.id = ac.fansub_group_id
		LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		LEFT JOIN role_definitions rd ON rd.code = acr.role_code
		LEFT JOIN release_versions rv ON rv.id = ac.release_version_id
		LEFT JOIN fansub_releases fr ON fr.id = rv.release_id
		LEFT JOIN episodes ep ON ep.id = fr.episode_id
		WHERE COALESCE(ac.member_id, hfgm.member_id) = $1
		GROUP BY ac.id, a.title_de, a.title_en, a.title, fg.name, ep.episode_number, ep.sort_index
		ORDER BY ac.created_at DESC
		LIMIT 50
	`, memberID, appUserID)
	if err != nil {
		return nil, fmt.Errorf("contributions mit vorschlagsfeldern: %w", err)
	}
	defer rows.Close()

	result := make([]MemberContributionWithProposalRow, 0)
	for rows.Next() {
		var row MemberContributionWithProposalRow
		if err := rows.Scan(
			&row.ID,
			&row.FansubGroupMemberID,
			&row.FansubGroupID,
			&row.AnimeID,
			&row.MemberID,
			&row.Status,
			&row.Note,
			&row.StartedYear,
			&row.EndedYear,
			&row.IsPublicOnAnimePage,
			&row.IsPublicOnMemberProfile,
			&row.ReleaseVersionID,
			&row.ConfirmedBy,
			&row.ConfirmedAt,
			&row.CreatedBy,
			&row.CreatedAt,
			&row.UpdatedBy,
			&row.UpdatedAt,
			&row.RoleCodes,
			&row.RoleLabels,
			&row.AnimeTitle,
			&row.CanSelfPublish,
			&row.ReviewNote,
			&row.FansubGroupName,
			&row.IsOwnProposal,
			&row.EpisodeNumber,
			&row.EpisodeSortIndex,
			&row.HasOwnReleaseWork,
			&row.TotalReleaseVersionCount,
			&row.WorkedReleaseVersionCount,
		); err != nil {
			return nil, fmt.Errorf("contributions mit vorschlagsfeldern: scan: %w", err)
		}
		result = append(result, row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("contributions mit vorschlagsfeldern: iterate: %w", err)
	}
	return result, nil
}

func (r *AnimeContributionsRepository) hasAnimeContributionReviewNoteColumn(ctx context.Context) (bool, error) {
	var exists bool
	if err := r.db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = current_schema()
			  AND table_name = 'anime_contributions'
			  AND column_name = 'review_note'
		)
	`).Scan(&exists); err != nil {
		return false, fmt.Errorf("detect anime_contributions.review_note column: %w", err)
	}
	return exists, nil
}

// SelfPublish ermöglicht einem Member, einen eigenen Vorschlag nach Ablauf der 90-Tage-Frist
// selbst öffentlich zu schalten. Status bleibt 'proposed' (NICHT 'confirmed'), da der
// Eintrag weiterhin als unverified/(historisch) erscheinen soll (D-11, D-15).
//
// Prüft serverseitig: status='proposed' AND created_at + 90 Tage < NOW().
// Bedingung nicht erfüllt → ErrConflict. Eintrag nicht gefunden → ErrNotFound.
func (r *AnimeContributionsRepository) SelfPublish(ctx context.Context, contributionID int64, appUserID int64) error {
	// 90-Tage-Check: serverseitig, nicht via Frontend-Gate (T-65-01-01).
	var checkID int64
	err := r.db.QueryRow(ctx, `
		SELECT id
		FROM anime_contributions
		WHERE id = $1
		  AND status = 'proposed'
		  AND created_at + INTERVAL '90 days' < NOW()
	`, contributionID).Scan(&checkID)
	if err != nil {
		if err == pgx.ErrNoRows {
			// Entweder existiert der Eintrag nicht, hat falschen Status oder
			// die 90 Tage sind noch nicht abgelaufen.
			return fmt.Errorf("selbst veröffentlichen: 90-Tage-Frist nicht abgelaufen oder Eintrag nicht gefunden: %w", ErrConflict)
		}
		return fmt.Errorf("selbst veröffentlichen: 90-Tage-Check: %w", err)
	}

	// Status bleibt 'proposed' — nur Sichtbarkeitsflags + confirmed_by setzen.
	tag, err := r.db.Exec(ctx, `
		UPDATE anime_contributions
		SET
			is_public_on_anime_page = true,
			is_public_on_member_profile = true,
			confirmed_by = $2,
			confirmed_at = NOW(),
			updated_at = NOW()
		WHERE id = $1 AND status = 'proposed'
	`, contributionID, appUserID)
	if err != nil {
		return fmt.Errorf("selbst veröffentlichen: update: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("selbst veröffentlichen: Eintrag nicht gefunden: %w", ErrNotFound)
	}
	return nil
}
