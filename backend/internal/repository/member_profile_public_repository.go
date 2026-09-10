package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

// Phase 131-05 (CONTEXT D-04): documented INITIAL page sizes for the embedded lists the
// public profile load ships. These initials are the FIXED contract (they match today's
// behaviour); the enforced MAX page sizes live with the HTTP clamp seam in the handler
// package (parseBoundedProjectPageValue). The initial profile load passes these so a
// member with many rows returns only the documented first page instead of an unbounded
// slice. Kept as named constants (not literals) per the D-04 note.
const (
	currentProjectsInitialPageSize       = 6
	latestContributionsInitialPageSize   = 3
	previousContributionsInitialPageSize = 6
)

// GetPublicMemberProfile is a temporary public-only compatibility entry point.
// New handlers resolve optional viewer access explicitly, then call the ID loader.
func (r *MemberProfileRepository) GetPublicMemberProfile(ctx context.Context, slug string) (*models.PublicMemberProfile, error) {
	access, err := r.ResolvePublicMemberAccess(ctx, slug, 0)
	if err != nil {
		return nil, err
	}
	profile, err := r.GetPublicMemberProfileByID(ctx, access.MemberID)
	if err != nil {
		return nil, err
	}
	profile.IsOwner = access.IsOwner
	profile.IsPrivatePreview = access.IsPrivatePreview
	return profile, nil
}

func (r *MemberProfileRepository) GetPublicMemberProfileByID(ctx context.Context, memberID int64) (*models.PublicMemberProfile, error) {
	if memberID <= 0 {
		return nil, ErrNotFound
	}
	var row publicMemberProfileBaseRow
	err := r.db.QueryRow(ctx, `
		SELECT
			m.id,
			m.public_slug,
			m.nickname,
			m.slogan,
			m.member_story_html,
			to_char(m.active_from_date, 'YYYY-MM-DD') AS active_from_date,
			to_char(m.active_until_date, 'YYYY-MM-DD') AS active_until_date,
			m.active_from_year,
			m.active_until_year,
			COALESCE(m.is_currently_active, false) AS is_currently_active,
			COALESCE(m.noindex, false) AS noindex,
			EXISTS(
				SELECT 1 FROM member_claims mc
				WHERE mc.member_id = m.id
				  AND mc.claim_status = 'verified'
			) AS is_verified,
			COALESCE(m.profile_status, 'active') AS profile_status,
			m.profile_visibility,
			avatar.file_path AS avatar_path,
			background.file_path AS background_image_path
		FROM members m
		LEFT JOIN media_assets avatar ON avatar.id = m.avatar_media_id
		LEFT JOIN media_assets background ON background.id = m.background_media_id
		WHERE m.id = $1
	`, memberID).Scan(
		&row.memberID, &row.publicSlug, &row.fansubName, &row.bio, &row.memberStoryHTML,
		&row.activeFromDate, &row.activeUntilDate, &row.activeFromYear, &row.activeUntilYear,
		&row.isCurrentlyActive, &row.noindex,
		&row.isVerified, &row.profileStatus, &row.profileVisibility, &row.avatarPath,
		&row.backgroundImagePath,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("load public member profile for member %d: %w", memberID, err)
	}
	profile := &models.PublicMemberProfile{
		MemberID:                   row.memberID,
		Slug:                       strings.TrimSpace(row.publicSlug),
		FansubName:                 strings.TrimSpace(row.fansubName),
		Bio:                        normalizeLoadedOptionalString(row.bio),
		MemberStoryHTML:            normalizeLoadedOptionalString(row.memberStoryHTML),
		ActiveFromDate:             profileActivityDateOrYear(row.activeFromDate, nil),
		ActiveUntilDate:            profileActivityDateOrYear(row.activeUntilDate, nil),
		ActiveFromYear:             yearWhenDateAbsent(row.activeFromDate, row.activeFromYear),
		ActiveUntilYear:            yearWhenDateAbsent(row.activeUntilDate, row.activeUntilYear),
		IsCurrentlyActive:          row.isCurrentlyActive,
		Noindex:                    row.noindex,
		IsVerified:                 row.isVerified,
		ProfileStatus:              strings.TrimSpace(valueOrDefault(&row.profileStatus, "active")),
		ProfileVisibility:          strings.TrimSpace(valueOrDefault(row.profileVisibility, models.ProfileVisibilityPublic)),
		Memberships:                []models.PublicMemberMembership{},
		PublicBadges:               []models.PublicMemberBadge{},
		BadgeProgress:              []models.PublicMemberBadgeProgress{},
		CurrentProjects:            []models.PublicMemberCurrentProject{},
		LatestContributions:        []models.PublicMemberLatestContribution{},
		PreviousContributions:      []models.PublicMemberPreviousContribution{},
		PreviousContributionsCount: 0,
	}
	if row.avatarPath != nil && strings.TrimSpace(*row.avatarPath) != "" {
		profile.Avatar = &models.MemberProfileAvatar{PublicURL: r.publicURLForPath(strings.TrimSpace(*row.avatarPath))}
	}
	if row.backgroundImagePath != nil && strings.TrimSpace(*row.backgroundImagePath) != "" {
		profile.BackgroundImage = &models.PublicMemberProfileBackgroundImage{PublicURL: r.publicURLForPath(strings.TrimSpace(*row.backgroundImagePath))}
	}
	var loadErr error
	richMemberships, loadErr := r.loadMemberships(ctx, row.memberID, 0, row.isVerified, false)
	if loadErr != nil {
		return nil, loadErr
	}
	profile.Memberships = toPublicMemberships(richMemberships)
	profile.PublicBadges, loadErr = r.loadPublicBadges(ctx, row.memberID)
	if loadErr != nil {
		return nil, loadErr
	}
	// Phase 154 (RCA-05/P154-01..04): the four raw-count loaders below are hoisted to run
	// exactly ONCE per request here, then passed into the three consumers that each used
	// to re-query them a second time (loadRoleVolumeBadges, loadContributionBadges,
	// loadBadgeProgress). No SQL changed -- only the call count per request.
	roleVolumeCounts, loadErr := r.loadRoleVolumeCounts(ctx, row.memberID)
	if loadErr != nil {
		return nil, loadErr
	}
	projectsCount, loadErr := r.loadContribProjectsCount(ctx, row.memberID)
	if loadErr != nil {
		return nil, loadErr
	}
	chronicleCount, loadErr := r.loadContribChronicleCount(ctx, row.memberID)
	if loadErr != nil {
		return nil, loadErr
	}
	archivistCount, loadErr := r.loadContribArchivistCount(ctx, row.memberID)
	if loadErr != nil {
		return nil, loadErr
	}
	volumeBadges := r.loadRoleVolumeBadges(roleVolumeCounts)
	profile.PublicBadges = append(profile.PublicBadges, volumeBadges...)
	contributionBadges := r.loadContributionBadges(projectsCount, chronicleCount, archivistCount)
	profile.PublicBadges = append(profile.PublicBadges, contributionBadges...)
	profile.TotalPoints, loadErr = r.loadTotalPoints(ctx, row.memberID)
	if loadErr != nil {
		return nil, loadErr
	}
	profile.BadgeProgress, loadErr = r.loadBadgeProgress(ctx, row.memberID, profile.TotalPoints, roleVolumeCounts, projectsCount, chronicleCount, archivistCount)
	if loadErr != nil {
		return nil, loadErr
	}
	profile.CurrentProjects, loadErr = r.loadCurrentProjects(ctx, row.memberID, currentProjectsInitialPageSize, 0)
	if loadErr != nil {
		return nil, loadErr
	}
	profile.CurrentProjectsCount, loadErr = r.countCurrentProjects(ctx, row.memberID)
	if loadErr != nil {
		return nil, loadErr
	}
	profile.KnownFor, loadErr = r.loadKnownFor(ctx, row.memberID)
	if loadErr != nil {
		return nil, loadErr
	}
	profile.LatestContributions, loadErr = r.loadLatestContributions(ctx, row.memberID, latestContributionsInitialPageSize, 0)
	if loadErr != nil {
		return nil, loadErr
	}
	profile.PreviousContributions, loadErr = r.loadPreviousContributions(ctx, row.memberID, previousContributionsInitialPageSize, 0)
	if loadErr != nil {
		return nil, loadErr
	}
	// PreviousContributionsCount reflects the rows actually returned by this bounded page.
	// With no previous-contributions continuation endpoint (131-05 step 4: none needed --
	// the frontend renders the embedded list, no separate "Mehr anzeigen"), len() keeps the
	// count HONEST against what the payload carries; advertising a larger grand total the
	// client could never load would be dishonest (D-03).
	profile.PreviousContributionsCount = len(profile.PreviousContributions)
	return profile, nil
}

// loadPublicBadges laedt nur visibility='public' AND status='active' Badges eines Members.
// Projektions-Hilfsfunktion fuer GetPublicMemberProfile (CTE-Erweiterung ausgelagert wegen 450-Zeilen-Limit).
//
// D-10 (Phase 150, Plan 04): role-entry Badges ("role_entry_<code>") werden HIER NICHT MEHR
// erzeugt. Bis Plan 150-04 fragte diese Funktion zusaetzlich unabhaengig
// release_role_credit_lifecycles ab und haengte fuer jede Rolle mit mindestens einem awarded
// Credit eine eigene, progress-lose "role_entry_<code>"-Zeile an -- redundant zu
// loadRoleVolumeBadges (unmittelbar danach in GetPublicMemberProfileByID aufgerufen), das
// denselben Badge-Code fuer JEDE Stufe (inklusive entry) bereits MIT Progress-Feldern
// (CurrentCount/CurrentTier/NextThreshold/RemainingCount/NextTier) liefert. Die role-entry-
// Quelle ist jetzt exklusiv loadRoleVolumeBadges; diese Funktion liefert nur noch die real
// persistierten member_badges-Zeilen.
func (r *MemberProfileRepository) loadPublicBadges(ctx context.Context, memberID int64) ([]models.PublicMemberBadge, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, badge_code, badge_category
		FROM member_badges
		WHERE member_id=$1 AND status='active' AND visibility='public'
		ORDER BY awarded_at
	`, memberID)
	if err != nil {
		return []models.PublicMemberBadge{}, fmt.Errorf("load public badges for member %d: %w", memberID, err)
	}
	defer rows.Close()

	items := make([]models.PublicMemberBadge, 0)
	for rows.Next() {
		var b models.PublicMemberBadge
		if err := rows.Scan(&b.ID, &b.BadgeCode, &b.BadgeCategory); err != nil {
			return nil, fmt.Errorf("scan public badge row for member %d: %w", memberID, err)
		}
		items = append(items, b)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate public badges for member %d: %w", memberID, err)
	}

	return items, nil
}

// loadTotalPoints laedt total_points aus member_point_totals (trigger-maintained, siehe
// Migration 0139) -- reines SELECT, niemals eine Aggregation ueber point_ledger_entries
// zur Anfragezeit (D-02, matching des bestehenden Read-only-Konventions). Ein Member ohne
// jede Ledger-Zeile hat keine member_point_totals-Zeile; in diesem Fall wird 0 statt eines
// Fehlers zurueckgegeben.
func (r *MemberProfileRepository) loadTotalPoints(ctx context.Context, memberID int64) (int64, error) {
	var total int64
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(total_points, 0)
		FROM member_point_totals
		WHERE member_id = $1
	`, memberID).Scan(&total)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, nil
	}
	if err != nil {
		return 0, fmt.Errorf("load total points for member %d: %w", memberID, err)
	}
	return total, nil
}

// toPublicMemberships bildet die reichen (own/edit) Mitgliedschafts-Strukturen auf das
// oeffentliche Allow-List-Shape ab (D-01): interne App-Permission-/Status-Felder werden
// strukturell fallengelassen, nicht nur weggelassen.
func toPublicMemberships(rich []models.MemberProfileMembership) []models.PublicMemberMembership {
	out := make([]models.PublicMemberMembership, 0, len(rich))
	for _, m := range rich {
		roles := m.Roles
		if roles == nil {
			roles = []models.PublicMemberRole{}
		}
		out = append(out, models.PublicMemberMembership{
			FansubGroupID:     m.FansubGroupID,
			FansubGroupName:   m.FansubGroupName,
			FansubGroupSlug:   m.FansubGroupSlug,
			LogoURL:           m.LogoURL,
			GroupStatus:       m.GroupStatus,
			JoinedYear:        m.JoinedYear,
			LeftYear:          m.LeftYear,
			IsCurrent:         m.IsCurrent,
			Roles:             roles,
			HasHistoricalLink: m.HasHistoricalLink,
		})
	}
	return out
}
