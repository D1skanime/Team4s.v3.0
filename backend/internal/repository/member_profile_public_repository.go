package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
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
		Memberships:                []models.MemberProfileMembership{},
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
		profile.BackgroundImage = &models.MemberProfileBgImage{PublicURL: r.publicURLForPath(strings.TrimSpace(*row.backgroundImagePath))}
	}
	var loadErr error
	profile.Memberships, loadErr = r.loadMemberships(ctx, row.memberID, 0, false, false)
	if loadErr != nil {
		return nil, loadErr
	}
	profile.PublicBadges, loadErr = r.loadPublicBadges(ctx, row.memberID)
	if loadErr != nil {
		return nil, loadErr
	}
	volumeBadges, loadErr := r.loadRoleVolumeBadges(ctx, row.memberID)
	if loadErr != nil {
		return nil, loadErr
	}
	profile.PublicBadges = append(profile.PublicBadges, volumeBadges...)
	contributionBadges, loadErr := r.loadContributionBadges(ctx, row.memberID)
	if loadErr != nil {
		return nil, loadErr
	}
	profile.PublicBadges = append(profile.PublicBadges, contributionBadges...)
	profile.TotalPoints, loadErr = r.loadTotalPoints(ctx, row.memberID)
	if loadErr != nil {
		return nil, loadErr
	}
	profile.BadgeProgress, loadErr = r.loadBadgeProgress(ctx, row.memberID, profile.TotalPoints)
	if loadErr != nil {
		return nil, loadErr
	}
	profile.CurrentProjects, loadErr = r.loadCurrentProjects(ctx, row.memberID, 6, 0)
	if loadErr != nil {
		return nil, loadErr
	}
	profile.CurrentProjectsCount, loadErr = r.countCurrentProjects(ctx, row.memberID)
	if loadErr != nil {
		return nil, loadErr
	}
	profile.LatestContributions, loadErr = r.loadLatestContributions(ctx, row.memberID)
	if loadErr != nil {
		return nil, loadErr
	}
	profile.PreviousContributions, loadErr = r.loadPreviousContributions(ctx, row.memberID)
	if loadErr != nil {
		return nil, loadErr
	}
	profile.PreviousContributionsCount = len(profile.PreviousContributions)
	return profile, nil
}

// loadPublicBadges laedt nur visibility='public' AND status='active' Badges eines Members.
// Projektions-Hilfsfunktion fuer GetPublicMemberProfile (CTE-Erweiterung ausgelagert wegen 450-Zeilen-Limit).
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

	// D-03 (Live-Projektion): role-entry Badges werden NIE in member_badges geschrieben
	// (kein UpsertMemberBadge-Aufruf) -- sie werden bei jedem Read live aus
	// release_role_credit_lifecycles neu berechnet, sodass ein reversed Punkt die Badge
	// sofort auf dem naechsten Read verschwinden laesst. ID bleibt 0, da nichts
	// downstream Eindeutigkeit dieses Felds fuer diese synthetischen Zeilen voraussetzt.
	roleRows, err := r.db.Query(ctx, `
		SELECT DISTINCT role_code
		FROM release_role_credit_lifecycles
		WHERE member_id = $1 AND lifecycle_status = 'awarded'
		ORDER BY role_code
	`, memberID)
	if err != nil {
		return items, fmt.Errorf("load role-entry badges for member %d: %w", memberID, err)
	}
	defer roleRows.Close()
	for roleRows.Next() {
		var roleCode string
		if err := roleRows.Scan(&roleCode); err != nil {
			return nil, fmt.Errorf("scan role-entry badge row for member %d: %w", memberID, err)
		}
		items = append(items, models.PublicMemberBadge{ID: 0, BadgeCode: "role_entry_" + roleCode, BadgeCategory: "role_entry"})
	}
	if err := roleRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate role-entry badges for member %d: %w", memberID, err)
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
