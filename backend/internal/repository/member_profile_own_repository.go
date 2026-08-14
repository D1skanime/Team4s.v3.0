package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

func (r *MemberProfileRepository) GetOwnProfile(ctx context.Context, appUserID int64) (*models.MemberProfile, error) {
	if appUserID <= 0 {
		return nil, ErrNotFound
	}

	base, err := r.ensureProfileBase(ctx, appUserID)
	if err != nil {
		return nil, err
	}
	base.Memberships, err = r.loadMemberships(ctx, base.MemberID, appUserID, true, true)
	if err != nil {
		return nil, err
	}
	if !base.HasMemberProfile {
		base.HistoricalCredits = []models.MemberProfileCredit{}
		base.RecentMedia = []models.MemberProfileRecentMedia{}
		base.RecentContributions = []models.MemberProfileRecentContribution{}
		base.HasProjectAssignments = false
		return base, nil
	}

	base.HistoricalCredits, err = r.loadHistoricalCredits(ctx, base.MemberID)
	if err != nil {
		return nil, err
	}
	base.RecentMedia, err = r.loadRecentMedia(ctx, base.MemberID)
	if err != nil {
		return nil, err
	}
	base.RecentContributions, err = r.loadRecentContributions(ctx, base.MemberID, false)
	if err != nil {
		return nil, err
	}
	base.HasProjectAssignments, err = r.hasProjectAssignments(ctx, base.MemberID)
	if err != nil {
		return nil, err
	}

	return base, nil
}

// hasProjectAssignments is the sole source of truth for D-06/D-09 project eligibility.
// It is only ever invoked for a member with a verified profile (base.HasMemberProfile
// already required a verified member_claims row via ensureProfileBaseTx). It deliberately
// checks real, existing assignment rows via EXISTS — never global/realm role, membership
// alone, or member_id > 0 — so has_member_profile can never be mistaken for eligibility.
func (r *MemberProfileRepository) hasProjectAssignments(ctx context.Context, memberID int64) (bool, error) {
	var exists bool
	if err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM anime_contributions ac
			LEFT JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
			WHERE COALESCE(ac.member_id, hfgm.member_id) = $1
			  AND ac.status = 'confirmed'
		) OR EXISTS(
			SELECT 1
			FROM release_member_roles rmr
			WHERE rmr.member_id = $1
		)
	`, memberID).Scan(&exists); err != nil {
		return false, fmt.Errorf("check project assignments for member %d: %w", memberID, err)
	}
	return exists, nil
}

func (r *MemberProfileRepository) UpdateOwnProfile(
	ctx context.Context,
	appUserID int64,
	input models.MemberProfileUpdateInput,
) (*models.MemberProfile, error) {
	base, err := r.ensureProfileBase(ctx, appUserID)
	if err != nil {
		return nil, err
	}
	if !base.HasMemberProfile {
		return nil, ErrMemberProfileRequired
	}

	if input.ProfileVisibility.Set && input.ProfileVisibility.Value != nil {
		visibility := strings.TrimSpace(*input.ProfileVisibility.Value)
		if visibility != models.ProfileVisibilityPublic && visibility != models.ProfileVisibilityPrivate {
			return nil, ErrValidation
		}
	}
	activeFromDate, err := normalizeProfileActivityDate(input.ActiveFromDate.Value)
	if err != nil {
		return nil, ErrValidation
	}
	activeUntilDate, err := normalizeProfileActivityDate(input.ActiveUntilDate.Value)
	if err != nil {
		return nil, ErrValidation
	}
	activeUntilSet := input.ActiveUntilDate.Set
	if input.IsCurrentlyActive.Set && input.IsCurrentlyActive.Value != nil && *input.IsCurrentlyActive.Value && !activeUntilSet {
		activeUntilSet = true
		activeUntilDate = nil
	}
	effectiveFrom := base.ActiveFromDate
	if input.ActiveFromDate.Set {
		effectiveFrom = activeFromDate
	}
	effectiveUntil := base.ActiveUntilDate
	if activeUntilSet {
		effectiveUntil = activeUntilDate
	}
	if !isValidProfileActivityRange(effectiveFrom, effectiveUntil) {
		return nil, ErrValidation
	}

	var updatedAt time.Time
	if err := r.db.QueryRow(ctx, `
		UPDATE members
		SET
			display_name = CASE WHEN $2 THEN NULLIF($3, '') ELSE display_name END,
			nickname = CASE WHEN $4 THEN COALESCE(NULLIF($5, ''), nickname) ELSE nickname END,
			slogan = CASE WHEN $6 THEN NULLIF($7, '') ELSE slogan END,
			member_history_description = CASE WHEN $8 THEN NULLIF($9, '') ELSE member_history_description END,
			active_from_date = CASE WHEN $10 THEN $11::date ELSE active_from_date END,
			active_until_date = CASE WHEN $12 THEN $13::date ELSE active_until_date END,
			active_from_year = CASE WHEN $10 THEN CASE WHEN $11::date IS NULL THEN NULL ELSE EXTRACT(YEAR FROM $11::date)::int END ELSE active_from_year END,
			active_until_year = CASE WHEN $12 THEN CASE WHEN $13::date IS NULL THEN NULL ELSE EXTRACT(YEAR FROM $13::date)::int END ELSE active_until_year END,
			is_currently_active = CASE WHEN $14 THEN COALESCE($15, is_currently_active) ELSE is_currently_active END,
			profile_visibility = CASE WHEN $16 THEN COALESCE(NULLIF($17, ''), profile_visibility) ELSE profile_visibility END,
			member_story_json = CASE WHEN $18 THEN $19::jsonb ELSE member_story_json END,
			member_story_html = CASE WHEN $20 THEN NULLIF($21, '') ELSE member_story_html END,
			member_story_text = CASE WHEN $22 THEN COALESCE($23, '') ELSE member_story_text END,
			member_story_editor_type = CASE WHEN $24 THEN COALESCE(NULLIF($25, ''), member_story_editor_type) ELSE member_story_editor_type END,
			member_story_content_schema_version = CASE WHEN $26 THEN COALESCE($27, member_story_content_schema_version) ELSE member_story_content_schema_version END,
			updated_at = NOW()
		WHERE id = $1
		RETURNING updated_at
	`,
		base.MemberID,
		input.DisplayName.Set, normalizeOptionalString(input.DisplayName.Value),
		input.FansubName.Set, normalizeOptionalString(input.FansubName.Value),
		input.Bio.Set, normalizeOptionalString(input.Bio.Value),
		input.MemberStory.Set, normalizeOptionalString(input.MemberStory.Value),
		input.ActiveFromDate.Set, activeFromDate,
		activeUntilSet, activeUntilDate,
		input.IsCurrentlyActive.Set, input.IsCurrentlyActive.Value,
		input.ProfileVisibility.Set, normalizeOptionalString(input.ProfileVisibility.Value),
		input.MemberStoryJSON.Set, rawJSONToNullableString(input.MemberStoryJSON.Value),
		input.MemberStoryHTML.Set, normalizeOptionalString(input.MemberStoryHTML.Value),
		input.MemberStoryText.Set, normalizeOptionalString(input.MemberStoryText.Value),
		input.MemberStoryEditorType.Set, normalizeOptionalString(input.MemberStoryEditorType.Value),
		input.MemberStoryContentSchemaVersion.Set, input.MemberStoryContentSchemaVersion.Value,
	).Scan(&updatedAt); err != nil {
		if isCheckViolation(err) {
			return nil, ErrValidation
		}
		return nil, fmt.Errorf("update own member profile for app_user %d: %w", appUserID, err)
	}

	profile, err := r.GetOwnProfile(ctx, appUserID)
	if err != nil {
		return nil, err
	}
	profile.UpdatedAt = updatedAt
	return profile, nil
}

func (r *MemberProfileRepository) AttachUploadedAvatar(
	ctx context.Context,
	appUserID int64,
	input models.MemberProfileAvatarUploadInput,
) (*models.MemberProfile, error) {
	base, err := r.ensureProfileBase(ctx, appUserID)
	if err != nil {
		return nil, err
	}
	if !base.HasMemberProfile {
		return nil, ErrMemberProfileRequired
	}
	if strings.TrimSpace(input.FilePath) == "" || strings.TrimSpace(input.MimeType) == "" {
		return nil, ErrValidation
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin avatar attach tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var mediaTypeID int64
	if err := tx.QueryRow(ctx, `
		SELECT id
		FROM media_types
		WHERE name = 'avatar'
		LIMIT 1
	`).Scan(&mediaTypeID); err != nil {
		return nil, fmt.Errorf("load media type avatar: %w", err)
	}

	var mediaID int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO media_assets (media_type_id, file_path, mime_type, format, uploaded_by, created_at)
		VALUES ($1, $2, $3, 'image', (SELECT legacy_user_id FROM app_users WHERE id = $4), NOW())
		RETURNING id
	`, mediaTypeID, strings.TrimSpace(input.FilePath), strings.TrimSpace(input.MimeType), appUserID).Scan(&mediaID); err != nil {
		return nil, fmt.Errorf("insert avatar media asset: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO media_files (media_id, variant, path, width, height, size)
		VALUES ($1, 'original', $2, COALESCE($3, 0), COALESCE($4, 0), $5)
	`, mediaID, strings.TrimSpace(input.FilePath), input.Width, input.Height, input.SizeBytes); err != nil {
		return nil, fmt.Errorf("insert avatar media file: %w", err)
	}

	sourcePath := strings.TrimSpace(input.SourceFilePath)
	if sourcePath != "" && sourcePath != strings.TrimSpace(input.FilePath) {
		if _, err := tx.Exec(ctx, `
			INSERT INTO media_files (media_id, variant, path, width, height, size)
			VALUES ($1, 'source_original', $2, 0, 0, $3)
		`, mediaID, sourcePath, input.SourceSizeBytes); err != nil {
			return nil, fmt.Errorf("insert avatar source media file: %w", err)
		}
	}

	if _, err := tx.Exec(ctx, `
		UPDATE members
		SET avatar_media_id = $2,
			updated_at = NOW()
		WHERE id = $1
	`, base.MemberID, mediaID); err != nil {
		return nil, fmt.Errorf("attach avatar to member %d: %w", base.MemberID, err)
	}

	if base.Avatar != nil && base.Avatar.ID > 0 {
		if _, err := tx.Exec(ctx, `DELETE FROM media_files WHERE media_id = $1`, base.Avatar.ID); err != nil {
			return nil, fmt.Errorf("delete previous avatar media files %d: %w", base.Avatar.ID, err)
		}
		if _, err := tx.Exec(ctx, `DELETE FROM media_assets WHERE id = $1`, base.Avatar.ID); err != nil {
			return nil, fmt.Errorf("delete previous avatar media asset %d: %w", base.Avatar.ID, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit avatar attach tx: %w", err)
	}

	return r.GetOwnProfile(ctx, appUserID)
}

func (r *MemberProfileRepository) AttachUploadedBackground(
	ctx context.Context,
	appUserID int64,
	input models.MemberProfileBackgroundUploadInput,
) (*models.MemberProfile, error) {
	base, err := r.ensureProfileBase(ctx, appUserID)
	if err != nil {
		return nil, err
	}
	if !base.HasMemberProfile {
		return nil, ErrMemberProfileRequired
	}
	if strings.TrimSpace(input.FilePath) == "" || strings.TrimSpace(input.MimeType) == "" {
		return nil, ErrValidation
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin profile background attach tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var mediaTypeID int64
	if err := tx.QueryRow(ctx, `
		SELECT id
		FROM media_types
		WHERE name = 'background'
		LIMIT 1
	`).Scan(&mediaTypeID); err != nil {
		return nil, fmt.Errorf("load media type background: %w", err)
	}

	var previousBackgroundID *int64
	if err := tx.QueryRow(ctx, `
		SELECT background_media_id
		FROM members
		WHERE id = $1
	`, base.MemberID).Scan(&previousBackgroundID); err != nil {
		return nil, fmt.Errorf("load previous profile background for member %d: %w", base.MemberID, err)
	}

	var mediaID int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO media_assets (media_type_id, file_path, mime_type, format, uploaded_by, created_at)
		VALUES ($1, $2, $3, 'image', (SELECT legacy_user_id FROM app_users WHERE id = $4), NOW())
		RETURNING id
	`, mediaTypeID, strings.TrimSpace(input.FilePath), strings.TrimSpace(input.MimeType), appUserID).Scan(&mediaID); err != nil {
		return nil, fmt.Errorf("insert profile background media asset: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO media_files (media_id, variant, path, width, height, size)
		VALUES ($1, 'original', $2, COALESCE($3, 0), COALESCE($4, 0), $5)
	`, mediaID, strings.TrimSpace(input.FilePath), input.Width, input.Height, input.SizeBytes); err != nil {
		return nil, fmt.Errorf("insert profile background media file: %w", err)
	}

	if strings.TrimSpace(input.SourceFilePath) != "" {
		if _, err := tx.Exec(ctx, `
			INSERT INTO media_files (media_id, variant, path, width, height, size)
			VALUES ($1, 'source_original', $2, 0, 0, $3)
		`, mediaID, strings.TrimSpace(input.SourceFilePath), input.SourceSizeBytes); err != nil {
			return nil, fmt.Errorf("insert profile background source media file: %w", err)
		}
	}

	if _, err := tx.Exec(ctx, `
		UPDATE members
		SET background_media_id = $2,
			updated_at = NOW()
		WHERE id = $1
	`, base.MemberID, mediaID); err != nil {
		return nil, fmt.Errorf("attach profile background to member %d: %w", base.MemberID, err)
	}

	if previousBackgroundID != nil && *previousBackgroundID > 0 && *previousBackgroundID != mediaID {
		if _, err := tx.Exec(ctx, `DELETE FROM media_files WHERE media_id = $1`, *previousBackgroundID); err != nil {
			return nil, fmt.Errorf("delete previous profile background media files %d: %w", *previousBackgroundID, err)
		}
		if _, err := tx.Exec(ctx, `DELETE FROM media_assets WHERE id = $1`, *previousBackgroundID); err != nil {
			return nil, fmt.Errorf("delete previous profile background media asset %d: %w", *previousBackgroundID, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit profile background attach tx: %w", err)
	}

	return r.GetOwnProfile(ctx, appUserID)
}

func (r *MemberProfileRepository) ensureProfileBase(ctx context.Context, appUserID int64) (*models.MemberProfile, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin ensure profile tx: %w", err)
	}
	defer tx.Rollback(ctx)

	base, err := r.ensureProfileBaseTx(ctx, tx, appUserID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit ensure profile tx: %w", err)
	}
	return base, nil
}
