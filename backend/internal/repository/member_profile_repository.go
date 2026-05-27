package repository

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

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
	if input.ActiveFromYear.Set && input.ActiveFromYear.Value != nil && *input.ActiveFromYear.Value <= 0 {
		return nil, ErrValidation
	}
	if input.ActiveUntilYear.Set && input.ActiveUntilYear.Value != nil && *input.ActiveUntilYear.Value <= 0 {
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
			active_from_year = CASE WHEN $10 THEN $11 ELSE active_from_year END,
			active_until_year = CASE WHEN $12 THEN $13 ELSE active_until_year END,
			is_currently_active = CASE WHEN $14 THEN COALESCE($15, is_currently_active) ELSE is_currently_active END,
			profile_visibility = CASE WHEN $16 THEN COALESCE(NULLIF($17, ''), profile_visibility) ELSE profile_visibility END,
			updated_at = NOW()
		WHERE id = $1
		RETURNING updated_at
	`,
		base.MemberID,
		input.DisplayName.Set, normalizeOptionalString(input.DisplayName.Value),
		input.FansubName.Set, normalizeOptionalString(input.FansubName.Value),
		input.Bio.Set, normalizeOptionalString(input.Bio.Value),
		input.MemberStory.Set, normalizeOptionalString(input.MemberStory.Value),
		input.ActiveFromYear.Set, input.ActiveFromYear.Value,
		input.ActiveUntilYear.Set, input.ActiveUntilYear.Value,
		input.IsCurrentlyActive.Set, input.IsCurrentlyActive.Value,
		input.ProfileVisibility.Set, normalizeOptionalString(input.ProfileVisibility.Value),
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
		appUserID       int64
		legacyUserID    *int64
		email           string
		keycloakSubject string
		accountName     string
		accountStatus   string
		accountRoles    []string
		memberID        *int64
		memberDisplay   *string
		memberNickname  *string
		memberBio       *string
		memberStory     *string
		activeFromYear  *int32
		activeUntilYear *int32
		currentlyActive bool
		visibility      *string
		avatarID        *int64
		avatarPath      *string
		avatarMimeType  *string
		avatarCreatedAt *time.Time
		avatarWidth     *int
		avatarHeight    *int
		avatarSize      *int64
		memberCreatedAt *time.Time
		memberUpdatedAt *time.Time
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
			m.active_from_year,
			m.active_until_year,
			COALESCE(m.is_currently_active, false),
			m.profile_visibility,
			m.avatar_media_id,
			ma.file_path,
			ma.mime_type,
			ma.created_at,
			NULLIF(mf.width, 0),
			NULLIF(mf.height, 0),
			mf.size,
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
				active_from_year,
				active_until_year,
				is_currently_active,
				profile_visibility,
				avatar_media_id,
				created_at,
				updated_at
			FROM members
			WHERE user_id = au.legacy_user_id
			ORDER BY id ASC
			LIMIT 1
		) m ON true
		LEFT JOIN media_assets ma ON ma.id = m.avatar_media_id
		LEFT JOIN media_files mf ON mf.media_id = ma.id AND mf.variant = 'original'
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
		&row.activeFromYear,
		&row.activeUntilYear,
		&row.currentlyActive,
		&row.visibility,
		&row.avatarID,
		&row.avatarPath,
		&row.avatarMimeType,
		&row.avatarCreatedAt,
		&row.avatarWidth,
		&row.avatarHeight,
		&row.avatarSize,
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

	profile := &models.MemberProfile{
		MemberID:           *row.memberID,
		AppUserID:          row.appUserID,
		LegacyUserID:       row.legacyUserID,
		DisplayName:        strings.TrimSpace(valueOrDefault(row.memberDisplay, row.accountName)),
		FansubName:         strings.TrimSpace(valueOrDefault(row.memberNickname, row.accountName)),
		Email:              row.email,
		KeycloakSubject:    row.keycloakSubject,
		Bio:                normalizeLoadedOptionalString(row.memberBio),
		MemberStory:        normalizeLoadedOptionalString(row.memberStory),
		ActiveFromYear:     row.activeFromYear,
		ActiveUntilYear:    row.activeUntilYear,
		IsCurrentlyActive:  row.currentlyActive,
		ProfileVisibility:  strings.TrimSpace(valueOrDefault(row.visibility, models.ProfileVisibilityMembersOnly)),
		CreatedAt:          valueOrNow(row.memberCreatedAt),
		UpdatedAt:          valueOrNow(row.memberUpdatedAt),
		AccountStatus:      row.accountStatus,
		AccountDisplayName: row.accountName,
		AccountGlobalRoles: row.accountRoles,
	}
	if row.avatarID != nil && row.avatarPath != nil && row.avatarCreatedAt != nil {
		profile.Avatar = &models.MediaAsset{
			ID:          *row.avatarID,
			Filename:    filepath.Base(strings.TrimSpace(*row.avatarPath)),
			PublicURL:   r.publicURLForPath(strings.TrimSpace(*row.avatarPath)),
			MimeType:    strings.TrimSpace(valueOrDefault(row.avatarMimeType, "")),
			SizeBytes:   valueOrZeroInt64(row.avatarSize),
			Width:       row.avatarWidth,
			Height:      row.avatarHeight,
			CreatedAt:   *row.avatarCreatedAt,
			StoragePath: strings.TrimSpace(*row.avatarPath),
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

func (r *MemberProfileRepository) publicURLForPath(filePath string) string {
	trimmed := strings.TrimSpace(filePath)
	if trimmed == "" {
		return ""
	}
	if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") {
		return trimmed
	}
	if !strings.HasPrefix(trimmed, "/") {
		trimmed = "/" + trimmed
	}
	return r.publicBaseURL + trimmed
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
