package repository

import (
	"context"
	"fmt"

	"team4s.v3/backend/internal/models"
)

// Phase 113: Wiederholbare Leistungs-Badges (Bronze/Silber/Gold) -- drei read-time
// abgeleitete Contribution-Familien nach dem Phase-112-loadRoleVolumeBadges-Muster
// (member_profile_role_volume_repository.go). Kein neuer Buchungspfad, keine
// Persistenz -- Aggregation + Schwellenmapping laufen bei jedem Profil-Read frisch
// (GAM-04/D-01). Tier-Tokens sind intern-englisch (bronze/silver/gold), Familien
// enden bewusst bei Gold -- KEIN platinum-Tier (113-CONTEXT D-02/D-03/D-04).

// highestContribProjectsTier liefert die hoechste erreichte Stufe fuer Familie 1
// ("vollstaendig mitgetragene Projekte", D-02). Zaehlbasis ist die Anzahl Projekte
// (anime_id, fansub_group_id), die der Member ueber JEDE ledger-erfasste
// release_version hinweg mit mindestens einem eigenen netto-awarded
// release_role_credit_lifecycles-Credit abgedeckt hat. Schwellen: 1/5/15.
func highestContribProjectsTier(count int) string {
	switch {
	case count >= 15:
		return "gold"
	case count >= 5:
		return "silver"
	case count >= 1:
		return "bronze"
	default:
		return ""
	}
}

// highestContribChronicleTier liefert die hoechste erreichte Stufe fuer Familie 2
// ("Chronist", D-03). Zaehlbasis ist die Netto-Anzahl veroeffentlichter, nicht
// geloeschter Notiz-/Text-Beitraege des Members ueber release_version_notes
// (Pflicht-Kern, member_id direkt) plus anime_fansub_project_notes und
// fansub_group_notes ueber den created_by_user_id-Autor-Seam. Schwellen: 10/50/150.
func highestContribChronicleTier(count int) string {
	switch {
	case count >= 150:
		return "gold"
	case count >= 50:
		return "silver"
	case count >= 10:
		return "bronze"
	default:
		return ""
	}
}

// highestContribArchivistTier liefert die hoechste erreichte Stufe fuer Familie 3
// ("Bildarchivar", D-04). Zaehlbasis ist COUNT(*) ueber release_version_media
// Zeilen des Members ueber den Autor-Seam, ausschliesslich net soft-delete
// (deleted_at IS NULL), ohne Freigabe-/Sichtbarkeitsfilter. Schwellen: 10/50/150.
func highestContribArchivistTier(count int) string {
	switch {
	case count >= 150:
		return "gold"
	case count >= 50:
		return "silver"
	case count >= 10:
		return "bronze"
	default:
		return ""
	}
}

// authorMemberSeam ist der wiederkehrende Autor->Member-Auflösungs-Seam (Pattern 3):
// uploaded_by_user_id/created_by_user_id (users.id) -> app_users.legacy_user_id ueber
// eine verified member_claims-Zeile. Nur verified Claims mit gesetztem legacy_user_id
// zaehlen; historische Member ohne Account/Claim liefern bewusst 0 (Pitfall 3).
const authorMemberSeam = `
	SELECT au.legacy_user_id
	FROM member_claims mc
	JOIN app_users au ON au.id = mc.app_user_id
	WHERE mc.member_id = $1
	  AND mc.claim_status = 'verified'
	  AND au.legacy_user_id IS NOT NULL
`

// loadContribProjectsCount liefert die Rohzahl fuer Familie 1 (D-02, "vollstaendig
// mitgetragene Projekte") -- exakt dieselbe SQL, die zuvor inline in
// loadContributionBadges lag (116-02, Plan 116-02 Task 1: Rohzahl-Extraktion,
// verhaltenserhaltend). Wird sowohl von loadContributionBadges (Tier-Ableitung) als
// auch von GetOwnDashboard (D-04 "noch X bis naechste Stufe") wiederverwendet.
func (r *MemberProfileRepository) loadContribProjectsCount(ctx context.Context, memberID int64) (int64, error) {
	var projectsCount int64
	if err := r.db.QueryRow(ctx, `
		WITH project_versions AS (
			SELECT ep.anime_id, rvg.fansub_group_id, rv.id AS release_version_id
			FROM release_versions rv
			JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
			JOIN fansub_releases fr ON fr.id = rv.release_id
			JOIN episodes ep ON ep.id = fr.episode_id
			WHERE EXISTS (
				SELECT 1 FROM release_role_credit_lifecycles l
				WHERE l.release_version_id = rv.id
				  AND l.fansub_group_id = rvg.fansub_group_id
				  AND l.lifecycle_status = 'awarded'
			)
		),
		member_covered AS (
			SELECT DISTINCT release_version_id, fansub_group_id
			FROM release_role_credit_lifecycles
			WHERE member_id = $1 AND lifecycle_status = 'awarded'
		)
		SELECT COUNT(*) FROM (
			SELECT pv.anime_id, pv.fansub_group_id
			FROM project_versions pv
			GROUP BY pv.anime_id, pv.fansub_group_id
			HAVING COUNT(*) > 0
			   AND COUNT(*) = COUNT(*) FILTER (
					WHERE EXISTS (
						SELECT 1 FROM member_covered mc
						WHERE mc.release_version_id = pv.release_version_id
						  AND mc.fansub_group_id = pv.fansub_group_id
					))
		) fully_carried
	`, memberID).Scan(&projectsCount); err != nil {
		return 0, fmt.Errorf("load contribution-projects coverage for member %d: %w", memberID, err)
	}
	return projectsCount, nil
}

// loadContribChronicleCount liefert die Rohzahl fuer Familie 2 (D-03, "Chronist") --
// exakt dieselbe SQL, die zuvor inline in loadContributionBadges lag. Diese Rohzahl
// ist zugleich die D-03-Kennzahl "geschriebene Beitraege" (RESEARCH Pitfall 2: NICHT
// previous_contributions_count).
func (r *MemberProfileRepository) loadContribChronicleCount(ctx context.Context, memberID int64) (int64, error) {
	var chronicleCount int64
	if err := r.db.QueryRow(ctx, `
		SELECT
			(SELECT COUNT(*) FROM release_version_notes
			 WHERE member_id = $1 AND status = 'published' AND deleted_at IS NULL)
			+
			(SELECT COUNT(*) FROM anime_fansub_project_notes
			 WHERE status = 'published' AND deleted_at IS NULL
			   AND created_by_user_id IN (`+authorMemberSeam+`))
			+
			(SELECT COUNT(*) FROM fansub_group_notes
			 WHERE status = 'published' AND deleted_at IS NULL
			   AND created_by_user_id IN (`+authorMemberSeam+`))
	`, memberID).Scan(&chronicleCount); err != nil {
		return 0, fmt.Errorf("load contribution-chronicle count for member %d: %w", memberID, err)
	}
	return chronicleCount, nil
}

// loadContribArchivistCount liefert die Rohzahl fuer Familie 3 (D-04, "Bildarchivar")
// -- exakt dieselbe SQL, die zuvor inline in loadContributionBadges lag. Diese
// Rohzahl ist zugleich die D-03-Kennzahl "hochgeladene Bilder".
func (r *MemberProfileRepository) loadContribArchivistCount(ctx context.Context, memberID int64) (int64, error) {
	var archivistCount int64
	if err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM release_version_media rvm
		WHERE rvm.deleted_at IS NULL
		  AND rvm.uploaded_by_user_id IN (`+authorMemberSeam+`)
	`, memberID).Scan(&archivistCount); err != nil {
		return 0, fmt.Errorf("load contribution-archivist count for member %d: %w", memberID, err)
	}
	return archivistCount, nil
}

// loadContributionBadges aggregiert die drei abgeleiteten Contribution-Familien
// (Familie 1 Vollabdeckung, Familie 2 Chronist, Familie 3 Bildarchivar) fuer einen
// Member und emittiert je Familie nur die hoechste erreichte Stufe als synthetisches
// PublicMemberBadge (ID:0, nie persistiert -- GAM-04, D-01 Live-Projektion). Wird
// ausschliesslich innerhalb von GetPublicMemberProfile aufgerufen, hinter dem
// bestehenden members_only-Visibility-Gate (V4, T-113-03). Ab Plan 116-02 delegiert
// die Funktion die drei Zaehlungen an die extrahierten loadContribXCount-Methoden
// (verhaltenserhaltend, keine SQL-Aenderung) statt sie inline zu berechnen.
func (r *MemberProfileRepository) loadContributionBadges(ctx context.Context, memberID int64) ([]models.PublicMemberBadge, error) {
	items := make([]models.PublicMemberBadge, 0)

	projectsCount, err := r.loadContribProjectsCount(ctx, memberID)
	if err != nil {
		return nil, err
	}
	if tier := highestContribProjectsTier(int(projectsCount)); tier != "" {
		progress := buildContribCategoryProgress("contribution_projects", projectsCount)
		items = append(items, models.PublicMemberBadge{
			ID:            0,
			BadgeCode:     "contribution_projects_" + tier,
			BadgeCategory:  "contribution",
			CurrentCount:   &progress.CurrentCount,
			CurrentTier:    &progress.CurrentTier,
			NextThreshold:  progress.NextThreshold,
			RemainingCount: progress.RemainingCount,
			NextTier:       progress.NextTier,
		})
	}

	chronicleCount, err := r.loadContribChronicleCount(ctx, memberID)
	if err != nil {
		return nil, err
	}
	if tier := highestContribChronicleTier(int(chronicleCount)); tier != "" {
		progress := buildContribCategoryProgress("contribution_chronicle", chronicleCount)
		items = append(items, models.PublicMemberBadge{
			ID:            0,
			BadgeCode:     "contribution_chronicle_" + tier,
			BadgeCategory:  "contribution",
			CurrentCount:   &progress.CurrentCount,
			CurrentTier:    &progress.CurrentTier,
			NextThreshold:  progress.NextThreshold,
			RemainingCount: progress.RemainingCount,
			NextTier:       progress.NextTier,
		})
	}

	archivistCount, err := r.loadContribArchivistCount(ctx, memberID)
	if err != nil {
		return nil, err
	}
	if tier := highestContribArchivistTier(int(archivistCount)); tier != "" {
		progress := buildContribCategoryProgress("contribution_archivist", archivistCount)
		items = append(items, models.PublicMemberBadge{
			ID:            0,
			BadgeCode:     "contribution_archivist_" + tier,
			BadgeCategory:  "contribution",
			CurrentCount:   &progress.CurrentCount,
			CurrentTier:    &progress.CurrentTier,
			NextThreshold:  progress.NextThreshold,
			RemainingCount: progress.RemainingCount,
			NextTier:       progress.NextTier,
		})
	}

	return items, nil
}
