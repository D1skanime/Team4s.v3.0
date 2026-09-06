package repository

import (
	"context"
	"fmt"

	"team4s.v3/backend/internal/badges"
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
// Typ 3) fuer die eigene Sicht. Phase 150 (D-07, plus die Revision 2026-09-06 fuer
// CurrentThreshold) ergaenzt Tier/Schwellen/Rest, aus badges.RoleVolume abgeleitet --
// vorher trug diese Zeile nur role_code+count, das Frontend leitete Tier/Schwelle
// selbst ab. CurrentThreshold ist nil, solange CurrentTier leer ist ("" = unterhalb
// Bronze); sonst die Registry-Schwelle der aktuell erreichten Stufe (nicht der
// naechsten -- das bleibt NextThreshold).
type OwnDashboardRoleVolumeEntry struct {
	RoleCode         string  `json:"role_code"`
	Count            int64   `json:"count"`
	CurrentTier      string  `json:"current_tier"`
	CurrentThreshold *int64  `json:"current_threshold"`
	NextThreshold    *int64  `json:"next_threshold"`
	RemainingCount   *int64  `json:"remaining_count"`
	NextTier         *string `json:"next_tier"`
}

// OwnDashboardCategoryProgress ist eine Zeile der D-04-Fortschritts-Tabelle fuer genau
// eine Contribution-Familie ("noch X bis naechste Stufe"). NextThreshold ist nil,
// sobald die hoechste Stufe (Gold) bereits erreicht ist.
type OwnDashboardCategoryProgress struct {
	Family         string  `json:"family"`
	CurrentTier    string  `json:"current_tier"`
	CurrentCount   int64   `json:"current_count"`
	NextThreshold  *int64  `json:"next_threshold"`
	RemainingCount *int64  `json:"remaining_count"`
	NextTier       *string `json:"next_tier"`
}

// OwnDashboardData ist der vollstaendige Response-Body fuer GET /api/v1/me/dashboard
// (D-08). HasMemberProfile=false signalisiert den D-09-Leerzustand (kein verifiziertes
// Member-Profil) -- der Handler baut diesen Zweig selbst, ohne GetOwnDashboard
// aufzurufen (kein memberID=0-Aufruf gegen die DB).
// OwnDashboardPendingClaim is a leader task that survived server-side authorization.
type OwnDashboardPendingClaim struct {
	ClaimID         int64  `json:"claim_id"`
	FansubGroupID   int64  `json:"fansub_group_id"`
	FansubGroupName string `json:"fansub_group_name"`
	MemberNickname  string `json:"member_nickname"`
	CreatedAt       string `json:"created_at"`
}

type OwnDashboardPendingGroupMediaReview struct {
	FansubGroupID   int64  `json:"fansub_group_id"`
	FansubGroupName string `json:"fansub_group_name"`
	Count           int64  `json:"count"`
}

// OwnDashboardPendingReleaseReview aggregates actionable pending release reviews by
// fansub group and anime. Text and image counts are separately authorization-scoped.
type OwnDashboardPendingReleaseReview struct {
	FansubGroupID int64  `json:"fansub_group_id"`
	AnimeID       int64  `json:"anime_id"`
	AnimeTitle    string `json:"anime_title"`
	ImageCount    int64  `json:"image_count"`
	TextCount     int64  `json:"text_count"`
}

// OwnDashboardPendingOwnNoteRevisionItem is one of the actor's own release-version
// notes whose review lifecycle is currently 'rejected' (Criterion 7).
type OwnDashboardPendingOwnNoteRevisionItem struct {
	ReleaseVersionID int64  `json:"release_version_id"`
	EpisodeNumber    string `json:"episode_number"`
	NoteTitle        string `json:"note_title"`
}

// OwnDashboardPendingOwnNoteRevisionGroup aggregates the actor's own rejected release-
// version notes by anime-project + fansub-group, mirroring
// PendingOwnNoteRevisionAttention's grouping key (Criterion 7).
type OwnDashboardPendingOwnNoteRevisionGroup struct {
	AnimeID         int64                                    `json:"anime_id"`
	AnimeTitle      string                                   `json:"anime_title"`
	FansubGroupID   int64                                    `json:"fansub_group_id"`
	FansubGroupName string                                   `json:"fansub_group_name"`
	Items           []OwnDashboardPendingOwnNoteRevisionItem `json:"items"`
}

type OwnDashboardData struct {
	HasMemberProfile         bool                                      `json:"has_member_profile"`
	TotalPoints              int64                                     `json:"total_points"`
	BadgesCount              int                                       `json:"badges_count"`
	ProjectsCount            int64                                     `json:"projects_count"`
	ImagesCount              int64                                     `json:"images_count"`
	ContributionsCount       int64                                     `json:"contributions_count"`
	RoleVolume               []OwnDashboardRoleVolumeEntry             `json:"role_volume"`
	CategoryProgress         []OwnDashboardCategoryProgress            `json:"category_progress"`
	// PointsProgress (D-08, Phase 150) ersetzt die bisherige client-seitige
	// total_points -> Meilenstein-Ableitung: eine serverautoritative
	// Fortschrittszeile aus badges.Points, in derselben Form wie eine
	// Contribution-Familienzeile (Family: "points").
	PointsProgress           OwnDashboardCategoryProgress              `json:"points_progress"`
	PendingClaims            []OwnDashboardPendingClaim                `json:"pending_claims"`
	PendingGroupMediaReviews []OwnDashboardPendingGroupMediaReview     `json:"pending_group_media_reviews"`
	PendingReleaseReviews    []OwnDashboardPendingReleaseReview        `json:"pending_release_reviews"`
	PendingOwnNoteRevisions  []OwnDashboardPendingOwnNoteRevisionGroup `json:"pending_own_note_revisions"`
}

// contribFamilyRegistry bindet jeden Familiennamen an seine autoritative
// backend/internal/badges-Family (Phase 150 D-01/D-02). Die vorher hier lokal
// gefuehrten Schwellen-/Tier-Funktions-Karten hielten trotz gegenteiliger
// Kommentierung eine EIGENE Zahlenkopie; diese Karte haelt keine Zahlen mehr,
// nur die Zuordnung Familienname -> Registry-Family.
var contribFamilyRegistry = map[string]badges.Family{
	"contribution_projects":  badges.ContributionProjects,
	"contribution_chronicle": badges.ContributionChronicle,
	"contribution_archivist": badges.ContributionArchivist,
}

// buildContribCategoryProgress berechnet eine D-04-Fortschrittszeile fuer eine
// Contribution-Familie aus deren Rohzahl, ausschliesslich ueber die Registry-Family
// (Phase 150 D-01/D-02 -- keine lokalen Schwellen-Literale mehr). NextThreshold ist
// die kleinste Schwelle echt oberhalb der aktuellen Rohzahl; ist die Rohzahl >= der
// hoechsten (Gold-)Schwelle, bleibt NextThreshold nil ("Hoechste Stufe erreicht").
func buildContribCategoryProgress(family string, count int64) OwnDashboardCategoryProgress {
	fam := contribFamilyRegistry[family]
	tier := fam.CurrentTier(count)
	var nextThreshold *int64
	var remainingCount *int64
	var nextTier *string
	if next, ok := fam.NextTier(count); ok {
		t := next.Threshold
		nextThreshold = &t
		r := fam.Remaining(count)
		remainingCount = &r
		n := next.Code
		nextTier = &n
	}
	return OwnDashboardCategoryProgress{
		Family:         family,
		CurrentTier:    tier,
		CurrentCount:   count,
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
		currentTier := badges.RoleVolume.CurrentTier(entry.Count)
		roleVolumeEntry := OwnDashboardRoleVolumeEntry{
			RoleCode:    entry.RoleCode,
			Count:       entry.Count,
			CurrentTier: currentTier,
		}
		if currentTier != "" {
			// Registry-Schwelle der bereits erreichten (aktuellen) Stufe -- linearer Scan
			// ueber das kleine (4-Element), bereits exportierte badges.RoleVolume.Tiers-Slice
			// (Plan 150-05's Revision, kein neuer Registry-Aufruf).
			for _, tier := range badges.RoleVolume.Tiers {
				if tier.Code == currentTier {
					threshold := tier.Threshold
					roleVolumeEntry.CurrentThreshold = &threshold
					break
				}
			}
			badgesCount++
		}
		if next, ok := badges.RoleVolume.NextTier(entry.Count); ok {
			nextThreshold := next.Threshold
			roleVolumeEntry.NextThreshold = &nextThreshold
			remaining := badges.RoleVolume.Remaining(entry.Count)
			roleVolumeEntry.RemainingCount = &remaining
			nextTier := next.Code
			roleVolumeEntry.NextTier = &nextTier
		}
		roleVolume = append(roleVolume, roleVolumeEntry)
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

	// PointsProgress (D-08): dieselbe Form wie eine Contribution-Familienzeile, aus dem
	// bereits geladenen totalPoints ueber badges.Points -- keine neue Abfrage.
	pointsTier := badges.Points.CurrentTier(totalPoints)
	pointsProgress := OwnDashboardCategoryProgress{
		Family:       "points",
		CurrentTier:  pointsTier,
		CurrentCount: totalPoints,
	}
	if next, ok := badges.Points.NextTier(totalPoints); ok {
		nextThreshold := next.Threshold
		pointsProgress.NextThreshold = &nextThreshold
		remaining := badges.Points.Remaining(totalPoints)
		pointsProgress.RemainingCount = &remaining
		nextTier := next.Code
		pointsProgress.NextTier = &nextTier
	}

	return &OwnDashboardData{
		HasMemberProfile:        true,
		TotalPoints:             totalPoints,
		BadgesCount:             badgesCount,
		ProjectsCount:           projectsCount,
		ImagesCount:             archivistCount,
		ContributionsCount:      chronicleCount,
		RoleVolume:              roleVolume,
		CategoryProgress:        categoryProgress,
		PointsProgress:          pointsProgress,
		PendingClaims:           []OwnDashboardPendingClaim{},
		PendingReleaseReviews:   []OwnDashboardPendingReleaseReview{},
		PendingOwnNoteRevisions: []OwnDashboardPendingOwnNoteRevisionGroup{},
	}, nil
}
