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
)

func (r *MemberProfileRepository) ensureProfileBaseTx(ctx context.Context, tx pgx.Tx, appUserID int64) (*models.MemberProfile, error) {
	type baseRow struct {
		appUserID                       int64
		legacyUserID                    *int64
		email                           string
		keycloakSubject                 string
		accountName                     string
		accountStatus                   string
		accountRoles                    []string
		accountCreatedAt                time.Time
		accountUpdatedAt                time.Time
		memberID                        *int64
		memberPublicSlug                *string
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
		noindex                         bool
		isVerified                      bool
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
			au.created_at,
			au.updated_at,
			m.id,
			m.public_slug,
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
			COALESCE(m.noindex, false),
			EXISTS(
				SELECT 1
				FROM member_claims mc
				WHERE mc.app_user_id = au.id
				  AND mc.claim_status = 'verified'
			) AS is_verified,
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
				m.id,
				m.public_slug,
				m.display_name,
				m.nickname,
				m.slogan,
				m.member_history_description,
				m.member_story_json,
				m.member_story_html,
				m.member_story_text,
				m.member_story_editor_type,
				m.member_story_content_schema_version,
				m.active_from_date,
				m.active_until_date,
				m.active_from_year,
				m.active_until_year,
				m.is_currently_active,
				m.noindex,
				m.profile_visibility,
				m.avatar_media_id,
				m.background_media_id,
				m.created_at,
				m.updated_at
			FROM members m
			JOIN member_claims mc ON mc.member_id = m.id
				AND mc.app_user_id = au.id
				AND mc.claim_status = 'verified'
			ORDER BY m.id ASC
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
		&row.accountCreatedAt,
		&row.accountUpdatedAt,
		&row.memberID,
		&row.memberPublicSlug,
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
		&row.noindex,
		&row.isVerified,
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
	if row.memberID == nil {
		accountName := strings.TrimSpace(row.accountName)
		if accountName == "" {
			accountName = strings.TrimSpace(row.email)
		}
		return &models.MemberProfile{
			MemberID:                        0,
			HasMemberProfile:                false,
			AppUserID:                       row.appUserID,
			LegacyUserID:                    row.legacyUserID,
			DisplayName:                     accountName,
			FansubName:                      "",
			Slug:                            "",
			Email:                           row.email,
			KeycloakSubject:                 row.keycloakSubject,
			MemberStoryEditorType:           "tiptap",
			MemberStoryContentSchemaVersion: 1,
			IsCurrentlyActive:               false,
			Noindex:                         false,
			IsVerified:                      false,
			ProfileVisibility:               models.ProfileVisibilityPublic,
			CreatedAt:                       row.accountCreatedAt,
			UpdatedAt:                       row.accountUpdatedAt,
			AccountStatus:                   row.accountStatus,
			AccountDisplayName:              accountName,
			AccountGlobalRoles:              row.accountRoles,
		}, nil
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
		HasMemberProfile:                true,
		AppUserID:                       row.appUserID,
		LegacyUserID:                    row.legacyUserID,
		DisplayName:                     strings.TrimSpace(valueOrDefault(row.memberDisplay, row.accountName)),
		FansubName:                      strings.TrimSpace(valueOrDefault(row.memberNickname, row.accountName)),
		Slug:                            strings.TrimSpace(valueOrDefault(row.memberPublicSlug, "")),
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
		Noindex:                         row.noindex,
		IsVerified:                      row.isVerified,
		ProfileVisibility:               strings.TrimSpace(valueOrDefault(row.visibility, models.ProfileVisibilityPublic)),
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
