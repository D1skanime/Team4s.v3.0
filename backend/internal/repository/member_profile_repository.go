package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"path/filepath"
	"regexp"
	"strings"
	"time"
	"unicode"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/text/unicode/norm"
)

var (
	memberSlugNonAlphanumeric = regexp.MustCompile(`[^a-z0-9]+`)
	memberSlugNumeric         = regexp.MustCompile(`^[0-9]+$`)
)

type publicMemberProfileBaseRow struct {
	memberID            int64
	appUserID           *int64
	fansubName          string
	bio                 *string
	memberStoryHTML     *string
	activeFromDate      *string
	activeUntilDate     *string
	isCurrentlyActive   bool
	profileVisibility   *string
	avatarPath          *string
	backgroundImagePath *string
}

type MemberProfileRepository struct {
	db            *pgxpool.Pool
	publicBaseURL string
}

func NewMemberProfileRepository(db *pgxpool.Pool, publicBaseURL string) *MemberProfileRepository {
	return &MemberProfileRepository{
		db:            db,
		publicBaseURL: strings.TrimRight(strings.TrimSpace(publicBaseURL), "/"),
	}
}

func (r *MemberProfileRepository) GetOwnProfile(ctx context.Context, appUserID int64) (*models.MemberProfile, error) {
	if appUserID <= 0 {
		return nil, ErrNotFound
	}

	base, err := r.ensureProfileBase(ctx, appUserID)
	if err != nil {
		return nil, err
	}

	base.Memberships, err = r.loadMemberships(ctx, base.MemberID, appUserID)
	if err != nil {
		return nil, err
	}
	base.HistoricalCredits, err = r.loadHistoricalCredits(ctx, base.MemberID)
	if err != nil {
		return nil, err
	}
	base.RecentMedia, err = r.loadRecentMedia(ctx, appUserID)
	if err != nil {
		return nil, err
	}
	base.RecentContributions, err = r.loadRecentContributions(ctx, base.MemberID)
	if err != nil {
		return nil, err
	}

	return base, nil
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

	if input.ProfileVisibility.Set && input.ProfileVisibility.Value != nil {
		visibility := strings.TrimSpace(*input.ProfileVisibility.Value)
		if visibility != models.ProfileVisibilityPublic && visibility != models.ProfileVisibilityMembersOnly {
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

func (r *MemberProfileRepository) GetPublicMemberProfile(ctx context.Context, slug string) (*models.PublicMemberProfile, error) {
	normalizedSlug := normalizeMemberProfileSlug(slug)
	if normalizedSlug == "" {
		return nil, ErrNotFound
	}
	isNumericSlug := memberSlugNumeric.MatchString(normalizedSlug)
	var numericID int64
	if isNumericSlug {
		if _, err := fmt.Sscan(normalizedSlug, &numericID); err != nil || numericID <= 0 {
			return nil, ErrNotFound
		}
	}

	var row publicMemberProfileBaseRow
	err := r.db.QueryRow(ctx, `
		WITH candidates AS (
			SELECT
				m.id,
				au.id AS app_user_id,
				m.nickname,
				m.slogan,
				m.member_story_html,
				to_char(m.active_from_date, 'YYYY-MM-DD') AS active_from_date,
				to_char(m.active_until_date, 'YYYY-MM-DD') AS active_until_date,
				COALESCE(m.is_currently_active, false) AS is_currently_active,
				m.profile_visibility,
				avatar.file_path AS avatar_path,
				background.file_path AS background_image_path,
				LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(TRIM(m.nickname), '[^a-z0-9]+', '-', 'gi'))) AS db_slug
			FROM members m
			LEFT JOIN app_users au ON au.legacy_user_id = m.user_id
			LEFT JOIN media_assets avatar ON avatar.id = m.avatar_media_id
			LEFT JOIN media_assets background ON background.id = m.background_media_id
		)
		SELECT
			id,
			app_user_id,
			nickname,
			slogan,
			member_story_html,
			active_from_date,
			active_until_date,
			is_currently_active,
			profile_visibility,
			avatar_path,
			background_image_path
		FROM candidates
		WHERE db_slug = $1
		   OR ($2::bool AND id = $3::bigint)
		ORDER BY CASE WHEN db_slug = $1 THEN 0 ELSE 1 END, id ASC
		LIMIT 1
	`, normalizedSlug, isNumericSlug, numericID).Scan(
		&row.memberID,
		&row.appUserID,
		&row.fansubName,
		&row.bio,
		&row.memberStoryHTML,
		&row.activeFromDate,
		&row.activeUntilDate,
		&row.isCurrentlyActive,
		&row.profileVisibility,
		&row.avatarPath,
		&row.backgroundImagePath,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		fallbackRow, fallbackErr := r.findPublicMemberProfileByNormalizedSlug(ctx, normalizedSlug)
		if fallbackErr != nil {
			return nil, fallbackErr
		}
		row = *fallbackRow
		err = nil
	}
	if err != nil {
		return nil, fmt.Errorf("load public member profile for slug %q: %w", slug, err)
	}

	appUserID := int64(0)
	if row.appUserID != nil {
		appUserID = *row.appUserID
	}
	profile := &models.PublicMemberProfile{
		MemberID:            row.memberID,
		AppUserID:           appUserID,
		FansubName:          strings.TrimSpace(row.fansubName),
		Bio:                 normalizeLoadedOptionalString(row.bio),
		MemberStoryHTML:     normalizeLoadedOptionalString(row.memberStoryHTML),
		ActiveFromDate:      profileActivityDateOrYear(row.activeFromDate, nil),
		ActiveUntilDate:     profileActivityDateOrYear(row.activeUntilDate, nil),
		IsCurrentlyActive:   row.isCurrentlyActive,
		ProfileVisibility:   strings.TrimSpace(valueOrDefault(row.profileVisibility, models.ProfileVisibilityMembersOnly)),
		Memberships:         []models.MemberProfileMembership{},
		RecentMedia:         []models.MemberProfileRecentMedia{},
		RecentContributions: []models.MemberProfileRecentContribution{},
	}
	if row.avatarPath != nil && strings.TrimSpace(*row.avatarPath) != "" {
		profile.Avatar = &models.MemberProfileAvatar{
			PublicURL: r.publicURLForPath(strings.TrimSpace(*row.avatarPath)),
		}
	}
	if row.backgroundImagePath != nil && strings.TrimSpace(*row.backgroundImagePath) != "" {
		profile.BackgroundImage = &models.MemberProfileBgImage{
			PublicURL: r.publicURLForPath(strings.TrimSpace(*row.backgroundImagePath)),
		}
	}

	var loadErr error
	profile.Memberships, loadErr = r.loadMemberships(ctx, row.memberID, appUserID)
	if loadErr != nil {
		return nil, loadErr
	}
	if appUserID > 0 {
		profile.RecentMedia, loadErr = r.loadRecentMedia(ctx, appUserID)
		if loadErr != nil {
			return nil, loadErr
		}
	}
	profile.RecentContributions, loadErr = r.loadRecentContributions(ctx, row.memberID)
	if loadErr != nil {
		return nil, loadErr
	}

	return profile, nil
}

func (r *MemberProfileRepository) findPublicMemberProfileByNormalizedSlug(ctx context.Context, normalizedSlug string) (*publicMemberProfileBaseRow, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			m.id,
			au.id AS app_user_id,
			m.nickname,
			m.slogan,
			m.member_story_html,
			to_char(m.active_from_date, 'YYYY-MM-DD') AS active_from_date,
			to_char(m.active_until_date, 'YYYY-MM-DD') AS active_until_date,
			COALESCE(m.is_currently_active, false) AS is_currently_active,
			m.profile_visibility,
			avatar.file_path AS avatar_path,
			background.file_path AS background_image_path
		FROM members m
		LEFT JOIN app_users au ON au.legacy_user_id = m.user_id
		LEFT JOIN media_assets avatar ON avatar.id = m.avatar_media_id
		LEFT JOIN media_assets background ON background.id = m.background_media_id
		ORDER BY m.id ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("fallback public member profile slug lookup: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var row publicMemberProfileBaseRow
		if err := rows.Scan(
			&row.memberID,
			&row.appUserID,
			&row.fansubName,
			&row.bio,
			&row.memberStoryHTML,
			&row.activeFromDate,
			&row.activeUntilDate,
			&row.isCurrentlyActive,
			&row.profileVisibility,
			&row.avatarPath,
			&row.backgroundImagePath,
		); err != nil {
			return nil, fmt.Errorf("scan fallback public member profile row: %w", err)
		}
		if normalizeMemberProfileSlug(row.fansubName) == normalizedSlug {
			return &row, nil
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate fallback public member profile rows: %w", err)
	}
	return nil, ErrNotFound
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

func (r *MemberProfileRepository) ensureProfileBaseTx(ctx context.Context, tx pgx.Tx, appUserID int64) (*models.MemberProfile, error) {
	type baseRow struct {
		appUserID                       int64
		legacyUserID                    *int64
		email                           string
		keycloakSubject                 string
		accountName                     string
		accountStatus                   string
		accountRoles                    []string
		memberID                        *int64
		memberDisplay                   *string
		memberNickname                  *string
		memberBio                       *string
		memberStory                     *string
		memberStoryJSON                 []byte
		memberStoryHTML                 *string
		memberStoryText                 *string
		memberStoryEditorType           *string
		memberStoryContentSchemaVersion *int32
		activeFromDate                  *string
		activeUntilDate                 *string
		activeFromYear                  *int32
		activeUntilYear                 *int32
		currentlyActive                 bool
		visibility                      *string
		avatarID                        *int64
		avatarPath                      *string
		avatarSourcePath                *string
		avatarMimeType                  *string
		avatarCreatedAt                 *time.Time
		avatarWidth                     *int
		avatarHeight                    *int
		avatarSize                      *int64
		backgroundID                    *int64
		backgroundPath                  *string
		backgroundSourcePath            *string
		backgroundCreatedAt             *time.Time
		memberCreatedAt                 *time.Time
		memberUpdatedAt                 *time.Time
	}

	var row baseRow
	err := tx.QueryRow(ctx, `
		SELECT
			au.id,
			au.legacy_user_id,
			au.email,
			au.keycloak_subject,
			au.display_name,
			au.status,
			COALESCE(
				ARRAY(
					SELECT agr.role
					FROM app_user_global_roles agr
					WHERE agr.app_user_id = au.id
					ORDER BY agr.role
				),
				ARRAY[]::varchar[]
			) AS account_roles,
			m.id,
			m.display_name,
			m.nickname,
			m.slogan,
			m.member_history_description,
			m.member_story_json,
			m.member_story_html,
			m.member_story_text,
			m.member_story_editor_type,
			m.member_story_content_schema_version,
			to_char(m.active_from_date, 'YYYY-MM-DD'),
			to_char(m.active_until_date, 'YYYY-MM-DD'),
			m.active_from_year,
			m.active_until_year,
			COALESCE(m.is_currently_active, false),
			m.profile_visibility,
			m.avatar_media_id,
			ma.file_path,
			mf_source.path,
			ma.mime_type,
			ma.created_at,
			NULLIF(mf.width, 0),
			NULLIF(mf.height, 0),
			mf.size,
			m.background_media_id,
			bg.file_path,
			bg_source.path,
			bg.created_at,
			m.created_at,
			m.updated_at
		FROM app_users au
		LEFT JOIN LATERAL (
			SELECT
				id,
				display_name,
				nickname,
				slogan,
				member_history_description,
				member_story_json,
				member_story_html,
				member_story_text,
				member_story_editor_type,
				member_story_content_schema_version,
				active_from_date,
				active_until_date,
				active_from_year,
				active_until_year,
				is_currently_active,
				profile_visibility,
				avatar_media_id,
				background_media_id,
				created_at,
				updated_at
			FROM members
			WHERE user_id = au.legacy_user_id
			ORDER BY id ASC
			LIMIT 1
		) m ON true
		LEFT JOIN media_assets ma ON ma.id = m.avatar_media_id
		LEFT JOIN media_files mf ON mf.media_id = ma.id AND mf.variant = 'original'
		LEFT JOIN media_files mf_source ON mf_source.media_id = ma.id AND mf_source.variant = 'source_original'
		LEFT JOIN media_assets bg ON bg.id = m.background_media_id
		LEFT JOIN media_files bg_source ON bg_source.media_id = bg.id AND bg_source.variant = 'source_original'
		WHERE au.id = $1
		FOR UPDATE OF au
	`, appUserID).Scan(
		&row.appUserID,
		&row.legacyUserID,
		&row.email,
		&row.keycloakSubject,
		&row.accountName,
		&row.accountStatus,
		&row.accountRoles,
		&row.memberID,
		&row.memberDisplay,
		&row.memberNickname,
		&row.memberBio,
		&row.memberStory,
		&row.memberStoryJSON,
		&row.memberStoryHTML,
		&row.memberStoryText,
		&row.memberStoryEditorType,
		&row.memberStoryContentSchemaVersion,
		&row.activeFromDate,
		&row.activeUntilDate,
		&row.activeFromYear,
		&row.activeUntilYear,
		&row.currentlyActive,
		&row.visibility,
		&row.avatarID,
		&row.avatarPath,
		&row.avatarSourcePath,
		&row.avatarMimeType,
		&row.avatarCreatedAt,
		&row.avatarWidth,
		&row.avatarHeight,
		&row.avatarSize,
		&row.backgroundID,
		&row.backgroundPath,
		&row.backgroundSourcePath,
		&row.backgroundCreatedAt,
		&row.memberCreatedAt,
		&row.memberUpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("load own member profile base for app_user %d: %w", appUserID, err)
	}
	if row.legacyUserID == nil || *row.legacyUserID <= 0 {
		return nil, fmt.Errorf("own member profile for app_user %d: legacy user bridge missing", appUserID)
	}

	if row.memberID == nil {
		nickname := strings.TrimSpace(row.accountName)
		if nickname == "" {
			nickname = "Mitglied"
		}
		displayName := nickname
		visibility := models.ProfileVisibilityMembersOnly
		var createdID int64
		var createdAt time.Time
		var updatedAt time.Time
		if err := tx.QueryRow(ctx, `
			INSERT INTO members (
				user_id,
				nickname,
				display_name,
				profile_visibility,
				is_currently_active,
				created_at,
				updated_at
			)
			VALUES ($1, $2, $3, $4, false, NOW(), NOW())
			RETURNING id, created_at, updated_at
		`, *row.legacyUserID, nickname, displayName, visibility).Scan(&createdID, &createdAt, &updatedAt); err != nil {
			return nil, fmt.Errorf("create member profile for app_user %d: %w", appUserID, err)
		}

		row.memberID = &createdID
		row.memberNickname = &nickname
		row.memberDisplay = &displayName
		row.visibility = &visibility
		row.memberCreatedAt = &createdAt
		row.memberUpdatedAt = &updatedAt
	}

	memberStory := normalizeLoadedOptionalString(row.memberStoryText)
	if memberStory == nil {
		memberStory = normalizeLoadedOptionalString(row.memberStory)
	}
	memberStoryJSON := rawJSONMessagePtr(row.memberStoryJSON)
	memberStoryHTML := normalizeLoadedOptionalString(row.memberStoryHTML)
	memberStoryText := normalizeLoadedOptionalString(row.memberStoryText)
	editorType := strings.TrimSpace(valueOrDefault(row.memberStoryEditorType, "tiptap"))
	contentSchemaVersion := int32(1)
	if row.memberStoryContentSchemaVersion != nil && *row.memberStoryContentSchemaVersion > 0 {
		contentSchemaVersion = *row.memberStoryContentSchemaVersion
	}

	profile := &models.MemberProfile{
		MemberID:                        *row.memberID,
		AppUserID:                       row.appUserID,
		LegacyUserID:                    row.legacyUserID,
		DisplayName:                     strings.TrimSpace(valueOrDefault(row.memberDisplay, row.accountName)),
		FansubName:                      strings.TrimSpace(valueOrDefault(row.memberNickname, row.accountName)),
		Email:                           row.email,
		KeycloakSubject:                 row.keycloakSubject,
		Bio:                             normalizeLoadedOptionalString(row.memberBio),
		MemberStory:                     memberStory,
		MemberStoryJSON:                 memberStoryJSON,
		MemberStoryHTML:                 memberStoryHTML,
		MemberStoryText:                 memberStoryText,
		MemberStoryEditorType:           editorType,
		MemberStoryContentSchemaVersion: contentSchemaVersion,
		ActiveFromDate:                  profileActivityDateOrYear(row.activeFromDate, row.activeFromYear),
		ActiveUntilDate:                 profileActivityDateOrYear(row.activeUntilDate, row.activeUntilYear),
		ActiveFromYear:                  row.activeFromYear,
		ActiveUntilYear:                 row.activeUntilYear,
		IsCurrentlyActive:               row.currentlyActive,
		ProfileVisibility:               strings.TrimSpace(valueOrDefault(row.visibility, models.ProfileVisibilityMembersOnly)),
		CreatedAt:                       valueOrNow(row.memberCreatedAt),
		UpdatedAt:                       valueOrNow(row.memberUpdatedAt),
		AccountStatus:                   row.accountStatus,
		AccountDisplayName:              row.accountName,
		AccountGlobalRoles:              row.accountRoles,
	}
	if row.avatarID != nil && row.avatarPath != nil && row.avatarCreatedAt != nil {
		sourceOriginalURL := ""
		if row.avatarSourcePath != nil {
			sourceOriginalURL = r.publicURLForPath(strings.TrimSpace(*row.avatarSourcePath))
		}
		profile.Avatar = &models.MediaAsset{
			ID:                *row.avatarID,
			Filename:          filepath.Base(strings.TrimSpace(*row.avatarPath)),
			PublicURL:         r.publicURLForPath(strings.TrimSpace(*row.avatarPath)),
			SourceOriginalURL: sourceOriginalURL,
			MimeType:          strings.TrimSpace(valueOrDefault(row.avatarMimeType, "")),
			SizeBytes:         valueOrZeroInt64(row.avatarSize),
			Width:             row.avatarWidth,
			Height:            row.avatarHeight,
			CreatedAt:         *row.avatarCreatedAt,
			StoragePath:       strings.TrimSpace(*row.avatarPath),
		}
	}
	if row.backgroundID != nil && row.backgroundPath != nil && row.backgroundCreatedAt != nil {
		sourceOriginalURL := ""
		if row.backgroundSourcePath != nil {
			sourceOriginalURL = r.publicURLForPath(strings.TrimSpace(*row.backgroundSourcePath))
		}
		profile.BackgroundImage = &models.MemberProfileBgImage{
			ID:                *row.backgroundID,
			PublicURL:         r.publicURLForPath(strings.TrimSpace(*row.backgroundPath)),
			SourceOriginalURL: sourceOriginalURL,
			StoragePath:       strings.TrimSpace(*row.backgroundPath),
		}
	}
	return profile, nil
}

func (r *MemberProfileRepository) loadMemberships(
	ctx context.Context,
	memberID int64,
	appUserID int64,
) ([]models.MemberProfileMembership, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			fg.id,
			fg.name,
			fg.slug,
			fg.logo_url,
			fg.status,
			gm.joined_year,
			gm.left_year,
			fgm.status,
			COALESCE(
				ARRAY(
					SELECT fgmr.role
					FROM fansub_group_member_roles fgmr
					WHERE fgmr.fansub_group_member_id = fgm.id
					ORDER BY fgmr.role
				),
				ARRAY[]::varchar[]
			) AS app_member_roles,
			(gm.id IS NOT NULL) AS has_historical_link
		FROM fansub_groups fg
		LEFT JOIN group_members gm
			ON gm.group_id = fg.id
		   AND gm.member_id = $1
		LEFT JOIN fansub_group_members fgm
			ON fgm.fansub_group_id = fg.id
		   AND fgm.app_user_id = $2
		WHERE gm.id IS NOT NULL
		   OR fgm.id IS NOT NULL
		ORDER BY fg.name ASC
	`, memberID, appUserID)
	if err != nil {
		return nil, fmt.Errorf("load memberships for member %d: %w", memberID, err)
	}
	defer rows.Close()

	items := make([]models.MemberProfileMembership, 0)
	for rows.Next() {
		var item models.MemberProfileMembership
		if err := rows.Scan(
			&item.FansubGroupID,
			&item.FansubGroupName,
			&item.FansubGroupSlug,
			&item.LogoURL,
			&item.GroupStatus,
			&item.JoinedYear,
			&item.LeftYear,
			&item.AppMemberStatus,
			&item.AppMemberRoles,
			&item.HasHistoricalLink,
		); err != nil {
			return nil, fmt.Errorf("scan membership row: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate memberships for member %d: %w", memberID, err)
	}
	return items, nil
}

func (r *MemberProfileRepository) loadHistoricalCredits(ctx context.Context, memberID int64) ([]models.MemberProfileCredit, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			fg.id,
			fg.name,
			cr.name,
			cr.label,
			COUNT(DISTINCT rmr.release_id)::int
		FROM release_member_roles rmr
		JOIN release_versions rv ON rv.release_id = rmr.release_id
		JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
		JOIN fansub_groups fg ON fg.id = rvg.fansub_group_id
		JOIN contributor_roles cr ON cr.id = rmr.role_id
		WHERE rmr.member_id = $1
		GROUP BY fg.id, fg.name, cr.name, cr.label
		ORDER BY fg.name ASC, cr.label ASC, cr.name ASC
	`, memberID)
	if err != nil {
		return nil, fmt.Errorf("load historical credits for member %d: %w", memberID, err)
	}
	defer rows.Close()

	items := make([]models.MemberProfileCredit, 0)
	for rows.Next() {
		var item models.MemberProfileCredit
		if err := rows.Scan(
			&item.FansubGroupID,
			&item.FansubGroupName,
			&item.RoleName,
			&item.RoleLabel,
			&item.ReleaseCount,
		); err != nil {
			return nil, fmt.Errorf("scan historical credit row: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate historical credits for member %d: %w", memberID, err)
	}
	return items, nil
}

func (r *MemberProfileRepository) loadRecentMedia(ctx context.Context, appUserID int64) ([]models.MemberProfileRecentMedia, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			rvm.id,
			rvm.category,
			COALESCE(mf_thumb.path, ''),
			a.title,
			rv.id,
			COALESCE(NULLIF(rv.title, ''), NULLIF(rv.version, ''), CONCAT('#', rv.id::text))
		FROM release_version_media rvm
		JOIN release_versions rv ON rv.id = rvm.release_version_id
		JOIN fansub_releases fr ON fr.id = rv.release_id
		JOIN episodes e ON e.id = fr.episode_id
		JOIN anime a ON a.id = e.anime_id
		LEFT JOIN media_files mf_thumb ON mf_thumb.media_id = rvm.media_asset_id AND mf_thumb.variant = 'thumb'
		WHERE rvm.uploaded_by_user_id = $1
		  AND rvm.deleted_at IS NULL
		ORDER BY rvm.created_at DESC
		LIMIT 3
	`, appUserID)
	if err != nil {
		return nil, fmt.Errorf("load recent media for user %d: %w", appUserID, err)
	}
	defer rows.Close()

	items := make([]models.MemberProfileRecentMedia, 0)
	for rows.Next() {
		var item models.MemberProfileRecentMedia
		var thumbnailPath string
		if err := rows.Scan(
			&item.ID,
			&item.Category,
			&thumbnailPath,
			&item.AnimeTitle,
			&item.ReleaseVersionID,
			&item.ReleaseVersionLabel,
		); err != nil {
			return nil, fmt.Errorf("scan recent media row: %w", err)
		}
		item.ThumbnailURL = r.publicURLForPath(thumbnailPath)
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate recent media for user %d: %w", appUserID, err)
	}
	return items, nil
}

func (r *MemberProfileRepository) loadRecentContributions(ctx context.Context, memberID int64) ([]models.MemberProfileRecentContribution, error) {
	rows, err := r.db.Query(ctx, `
		SELECT release_id, anime_title, anime_id, fansub_group_name, role_name, role_label
		FROM (
			SELECT DISTINCT ON (rmr.release_id, rmr.role_id)
				rmr.release_id,
				rmr.created_at,
				a.title   AS anime_title,
				a.id      AS anime_id,
				fg.name   AS fansub_group_name,
				cr.name   AS role_name,
				cr.label  AS role_label
			FROM release_member_roles rmr
			JOIN contributor_roles cr ON cr.id = rmr.role_id
			JOIN fansub_releases fr ON fr.id = rmr.release_id
			JOIN episodes e ON e.id = fr.episode_id
			JOIN anime a ON a.id = e.anime_id
			JOIN release_versions rv ON rv.release_id = rmr.release_id
			JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
			JOIN fansub_groups fg ON fg.id = rvg.fansub_group_id
			WHERE rmr.member_id = $1
			ORDER BY rmr.release_id, rmr.role_id, rmr.created_at DESC
		) deduped
		ORDER BY created_at DESC
		LIMIT 3
	`, memberID)
	if err != nil {
		return nil, fmt.Errorf("load recent contributions for member %d: %w", memberID, err)
	}
	defer rows.Close()

	items := make([]models.MemberProfileRecentContribution, 0)
	for rows.Next() {
		var item models.MemberProfileRecentContribution
		if err := rows.Scan(
			&item.ID,
			&item.AnimeTitle,
			&item.AnimeID,
			&item.FansubGroupName,
			&item.RoleName,
			&item.RoleLabel,
		); err != nil {
			return nil, fmt.Errorf("scan recent contribution row: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate recent contributions for member %d: %w", memberID, err)
	}
	return items, nil
}

func (r *MemberProfileRepository) publicURLForPath(filePath string) string {
	trimmed := strings.TrimSpace(filePath)
	if trimmed == "" {
		return ""
	}
	if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") {
		return trimmed
	}
	normalized := strings.ReplaceAll(trimmed, "\\", "/")
	if strings.HasPrefix(normalized, "/app/media/") {
		trimmed = "/media/" + strings.TrimPrefix(normalized, "/app/media/")
	} else if strings.HasPrefix(normalized, "app/media/") {
		trimmed = "/media/" + strings.TrimPrefix(normalized, "app/media/")
	} else if strings.HasPrefix(normalized, "media/") {
		trimmed = "/" + normalized
	}
	if !strings.HasPrefix(trimmed, "/") {
		trimmed = "/" + trimmed
	}
	return r.publicBaseURL + trimmed
}

func normalizeMemberProfileSlug(value string) string {
	normalized := norm.NFD.String(strings.ToLower(strings.TrimSpace(value)))
	runes := make([]rune, 0, len(normalized))
	for _, r := range normalized {
		if unicode.Is(unicode.Mn, r) {
			continue
		}
		runes = append(runes, r)
	}
	return strings.Trim(memberSlugNonAlphanumeric.ReplaceAllString(string(runes), "-"), "-")
}

func normalizeOptionalString(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	return &trimmed
}

func normalizeLoadedOptionalString(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func rawJSONToNullableString(value *json.RawMessage) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(string(*value))
	if trimmed == "" || trimmed == "null" {
		return nil
	}
	return &trimmed
}

func rawJSONMessagePtr(value []byte) *json.RawMessage {
	trimmed := strings.TrimSpace(string(value))
	if trimmed == "" || trimmed == "null" {
		return nil
	}
	raw := json.RawMessage(append([]byte(nil), []byte(trimmed)...))
	return &raw
}

func normalizeProfileActivityDate(value *string) (*string, error) {
	if value == nil {
		return nil, nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil, nil
	}
	parsed, err := time.Parse("2006-01-02", trimmed)
	if err != nil || parsed.Format("2006-01-02") != trimmed {
		return nil, ErrValidation
	}
	if parsed.Month() != time.January || parsed.Day() != 1 {
		return nil, ErrValidation
	}
	year := parsed.Year()
	if year < 1970 || year > 2100 {
		return nil, ErrValidation
	}
	return &trimmed, nil
}

func isValidProfileActivityRange(from *string, until *string) bool {
	if from == nil || until == nil {
		return true
	}
	return *until >= *from
}

func profileActivityDateOrYear(dateValue *string, yearValue *int32) *string {
	if dateValue != nil && strings.TrimSpace(*dateValue) != "" {
		trimmed := strings.TrimSpace(*dateValue)
		return &trimmed
	}
	if yearValue == nil || *yearValue < 1970 || *yearValue > 2100 {
		return nil
	}
	value := fmt.Sprintf("%04d-01-01", *yearValue)
	return &value
}

func valueOrDefault(value *string, fallback string) string {
	if value == nil {
		return fallback
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return fallback
	}
	return trimmed
}

func valueOrNow(value *time.Time) time.Time {
	if value == nil {
		return time.Now().UTC()
	}
	return *value
}

func valueOrZeroInt64(value *int64) int64 {
	if value == nil {
		return 0
	}
	return *value
}

func isCheckViolation(err error) bool {
	return isPgErrorCode(err, "23514")
}
