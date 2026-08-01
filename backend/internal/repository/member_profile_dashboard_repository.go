package repository

import (
	"context"
	"fmt"
)

// Plan 116-02 (D-03/D-04): GetOwnDashboard buendelt die fuenf Kennzahlen ("Punkte",
// "Badges (Anzahl)", "Projekte (Anzahl)", "hochgeladene Bilder", "geschriebene
// Beitraege") und den Kategorie-Fortschritt (Punkte-Meilenstein/Rollen-Volumen/
// Contribution-Familien) fuer die EIGENE (nicht-oeffentliche) Sicht des eingeloggten
// Members in einer Response. Wiederverwendet ausschliesslich die in Plan 116-02
// Task 1 extrahierten Rohzahl-Bausteine (loadTotalPoints, loadContribProjectsCount,
// loadContribChronicleCount, loadContribArchivistCount, loadRoleVolumeCounts) -- keine
// SQL-Duplizierung. Rein lesend, kein neuer Schreibpfad.

// OwnDashboardRoleVolumeEntry ist eine Rohzahl-Zeile der Rollen-Volumen-Tabelle (D-04
// Typ 3) fuer die eigene Sicht.
type OwnDashboardRoleVolumeEntry struct {
	RoleCode string `json:"role_code"`
	Count    int64  `json:"count"`
}

// OwnDashboardCategoryProgress ist eine Zeile der D-04-Fortschritts-Tabelle fuer genau
// eine Contribution-Familie ("noch X bis naechste Stufe"). NextThreshold ist nil,
// sobald die hoechste Stufe (Gold) bereits erreicht ist.
type OwnDashboardCategoryProgress struct {
	Family        string `json:"family"`
	CurrentTier   string `json:"current_tier"`
	CurrentCount  int64  `json:"current_count"`
	NextThreshold  *int64  `json:"next_threshold"`
	RemainingCount *int64  `json:"remaining_count"`
	NextTier       *string `json:"next_tier"`
}

// OwnDashboardData ist der vollstaendige Response-Body fuer GET /api/v1/me/dashboard
// (D-08). HasMemberProfile=false signalisiert den D-09-Leerzustand (kein verifiziertes
// Member-Profil) -- der Handler baut diesen Zweig selbst, ohne GetOwnDashboard
// aufzurufen (kein memberID=0-Aufruf gegen die DB).
type OwnDashboardData struct {
	HasMemberProfile   bool                           `json:"has_member_profile"`
	TotalPoints        int64                          `json:"total_points"`
	BadgesCount        int                            `json:"badges_count"`
	ProjectsCount      int64                          `json:"projects_count"`
	ImagesCount        int64                          `json:"images_count"`
	ContributionsCount int64                          `json:"contributions_count"`
	RoleVolume         []OwnDashboardRoleVolumeEntry  `json:"role_volume"`
	CategoryProgress   []OwnDashboardCategoryProgress `json:"category_progress"`
}

// contribFamilyAscendingThresholds spiegelt die Bronze/Silber/Gold-Schwellen der
// bestehenden highestContribXTier-Switches (member_profile_contribution_badges_repository.go)
// wortgetreu -- NIEMALS eigene Zahlen einfuehren. Reihenfolge ist aufsteigend, damit
// der naechste-Schwelle-Scan in buildContribCategoryProgress linear funktioniert.
var contribFamilyAscendingThresholds = map[string][]int64{
	"contribution_projects":  {1, 5, 15},
	"contribution_chronicle": {10, 50, 150},
	"contribution_archivist": {10, 50, 150},
}

// contribFamilyTierFuncs bindet jede Familie an ihre bestehende, unveraenderte
// Tier-Ableitungsfunktion -- Single Source of Truth bleibt
// member_profile_contribution_badges_repository.go.
var contribFamilyTierFuncs = map[string]func(int) string{
	"contribution_projects":  highestContribProjectsTier,
	"contribution_chronicle": highestContribChronicleTier,
	"contribution_archivist": highestContribArchivistTier,
}

// buildContribCategoryProgress berechnet eine D-04-Fortschrittszeile fuer eine
// Contribution-Familie aus deren Rohzahl. NextThreshold ist die kleinste Schwelle
// echt oberhalb der aktuellen Rohzahl; ist die Rohzahl >= der hoechsten (Gold-)
// Schwelle, bleibt NextThreshold nil ("Hoechste Stufe erreicht").
func buildContribCategoryProgress(family string, count int64) OwnDashboardCategoryProgress {
	tier := contribFamilyTierFuncs[family](int(count))
	var nextThreshold *int64
	var remainingCount *int64
	var nextTier *string
	tierNames := []string{"bronze", "silver", "gold"}
	for index, threshold := range contribFamilyAscendingThresholds[family] {
		if count < threshold {
			t := threshold
			nextThreshold = &t
			r := threshold - count
			remainingCount = &r
			n := tierNames[index]
			nextTier = &n
			break
		}
	}
	return OwnDashboardCategoryProgress{
		Family:        family,
		CurrentTier:   tier,
		CurrentCount:  count,
		NextThreshold:  nextThreshold,
		RemainingCount: remainingCount,
		NextTier:       nextTier,
	}
}

// loadDistinctRoleEntryCount liefert COUNT(DISTINCT role_code) ueber dieselbe
// WHERE/Tabelle wie der role-entry-Abschnitt von loadPublicBadges
// (member_profile_repository.go:607-626) -- KEINE Sichtbarkeitsfilterung, synthetisch,
// nicht aus member_badges. Zaehlt "irgendeine awarded Rolle jemals erreicht", unabhaengig
// von einer Mengen-Schwelle (im Unterschied zu loadRoleVolumeCounts/highestRoleVolumeTier).
func (r *MemberProfileRepository) loadDistinctRoleEntryCount(ctx context.Context, memberID int64) (int64, error) {
	var count int64
	if err := r.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT role_code)
		FROM release_role_credit_lifecycles
		WHERE member_id = $1 AND lifecycle_status = 'awarded'
	`, memberID).Scan(&count); err != nil {
		return 0, fmt.Errorf("load distinct role-entry count for member %d: %w", memberID, err)
	}
	return count, nil
}

// loadOwnDashboardProjectsCount liefert die D-03-Kennzahl "Projekte (Anzahl)" --
// eine eigenstaendige Aggregatsabfrage (RESEARCH Pitfall 6), die bewusst NICHT mit der
// Familie-1-Rohzahl (loadContribProjectsCount, "vollstaendig mitgetragene Projekte")
// verwechselt werden darf. Zaehlt jedes bestaetigte (anime_id, fansub_group_id)-Paar,
// an dem der Member ueber eine direkte member_id-Zuordnung ODER historische
// Gruppenmitgliedschaft beteiligt war -- ungefiltert nach Sichtbarkeit (Eigenansicht).
func (r *MemberProfileRepository) loadOwnDashboardProjectsCount(ctx context.Context, memberID int64) (int64, error) {
	var count int64
	if err := r.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT (ac.anime_id, ac.fansub_group_id))
		FROM anime_contributions ac
		LEFT JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
		WHERE COALESCE(ac.member_id, hfgm.member_id) = $1 AND ac.status = 'confirmed'
	`, memberID).Scan(&count); err != nil {
		return 0, fmt.Errorf("load own-dashboard projects count for member %d: %w", memberID, err)
	}
	return count, nil
}

// GetOwnDashboard aggregiert die D-03-Kennzahlen und die D-04-Kategorie-Fortschritts-
// Tabelle fuer die eigene Sicht eines verifizierten Members. Wird ausschliesslich vom
// dashboard_me_handler.go nach erfolgreicher Ownership-Gate-Aufloesung aufgerufen
// (D-08) -- memberID kommt nie direkt aus einem Request-Parameter.
func (r *MemberProfileRepository) GetOwnDashboard(ctx context.Context, memberID int64) (*OwnDashboardData, error) {
	totalPoints, err := r.loadTotalPoints(ctx, memberID)
	if err != nil {
		return nil, err
	}

	familyProjectsCount, err := r.loadContribProjectsCount(ctx, memberID)
	if err != nil {
		return nil, err
	}
	chronicleCount, err := r.loadContribChronicleCount(ctx, memberID)
	if err != nil {
		return nil, err
	}
	archivistCount, err := r.loadContribArchivistCount(ctx, memberID)
	if err != nil {
		return nil, err
	}

	roleVolumeCounts, err := r.loadRoleVolumeCounts(ctx, memberID)
	if err != nil {
		return nil, err
	}

	distinctRoleEntryCount, err := r.loadDistinctRoleEntryCount(ctx, memberID)
	if err != nil {
		return nil, err
	}

	projectsCount, err := r.loadOwnDashboardProjectsCount(ctx, memberID)
	if err != nil {
		return nil, err
	}

	badgesCount := 0
	if totalPoints >= 1 {
		badgesCount++ // Punkt-Meilenstein (Phase 112 Typ 2), Rohzahl selbst ungenutzt hier
	}
	badgesCount += int(distinctRoleEntryCount)

	roleVolume := make([]OwnDashboardRoleVolumeEntry, 0, len(roleVolumeCounts))
	for _, entry := range roleVolumeCounts {
		roleVolume = append(roleVolume, OwnDashboardRoleVolumeEntry{RoleCode: entry.RoleCode, Count: entry.Count})
		if highestRoleVolumeTier(int(entry.Count)) != "" {
			badgesCount++
		}
	}

	if highestContribProjectsTier(int(familyProjectsCount)) != "" {
		badgesCount++
	}
	if highestContribChronicleTier(int(chronicleCount)) != "" {
		badgesCount++
	}
	if highestContribArchivistTier(int(archivistCount)) != "" {
		badgesCount++
	}

	categoryProgress := []OwnDashboardCategoryProgress{
		buildContribCategoryProgress("contribution_projects", familyProjectsCount),
		buildContribCategoryProgress("contribution_chronicle", chronicleCount),
		buildContribCategoryProgress("contribution_archivist", archivistCount),
	}

	return &OwnDashboardData{
		HasMemberProfile:   true,
		TotalPoints:        totalPoints,
		BadgesCount:        badgesCount,
		ProjectsCount:      projectsCount,
		ImagesCount:        archivistCount,
		ContributionsCount: chronicleCount,
		RoleVolume:         roleVolume,
		CategoryProgress:   categoryProgress,
	}, nil
}
