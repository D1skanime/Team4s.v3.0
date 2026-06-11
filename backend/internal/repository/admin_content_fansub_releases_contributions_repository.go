package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// EffectiveContributionRow ist die aufgelöste Mitwirkenden-Ansicht für eine Release-Version.
// Entweder versions-spezifischer Override (IsOverride=true) oder Projekt-Default (IsOverride=false).
type EffectiveContributionRow struct {
	ContributionID  int64    `json:"contribution_id"`
	MemberID        int64    `json:"member_id"`
	MemberName      string   `json:"member_display_name"`
	MemberAvatarURL *string  `json:"member_avatar_url,omitempty"`
	RoleCodes       []string `json:"role_codes"`
}

// EffectiveContributionsResult enthält den aufgelösten Mitwirkenden-Satz und Metadaten
// zur Auflösungsquelle (versions-spezifisch oder anime-weit).
type EffectiveContributionsResult struct {
	Rows       []EffectiveContributionRow `json:"data"`
	IsOverride bool                       `json:"is_override"`
	Source     string                     `json:"source"` // "release_version" | "anime_default"
}

// FansubReleasesContributionsRepository enthält Queries für den aufgelösten Mitwirkenden-Satz.
type FansubReleasesContributionsRepository struct {
	db *pgxpool.Pool
}

// NewFansubReleasesContributionsRepository erstellt ein neues FansubReleasesContributionsRepository.
func NewFansubReleasesContributionsRepository(db *pgxpool.Pool) *FansubReleasesContributionsRepository {
	return &FansubReleasesContributionsRepository{db: db}
}

// ListEffectiveContributionsForVersion löst den Mitwirkenden-Satz für eine Release-Version auf.
// Auflösungsreihenfolge (D-02):
//  1. Versions-spezifische Entries (release_version_id = versionID AND fansub_group_id = groupID)
//  2. Fallback: anime-weite Entries (release_version_id IS NULL, anime_id aus Release ermittelt)
//
// Gibt nil, nil zurück wenn versionID oder fansubGroupID <= 0 (Defensiv-Check).
func (r *FansubReleasesContributionsRepository) ListEffectiveContributionsForVersion(
	ctx context.Context,
	releaseVersionID int64,
	fansubGroupID int64,
) (*EffectiveContributionsResult, error) {
	if releaseVersionID <= 0 || fansubGroupID <= 0 {
		return nil, nil
	}

	// Schritt 1: Versions-spezifische Contributions
	rows, err := r.db.Query(ctx, `
		SELECT ac.id, ac.member_id, m.nickname,
		       CASE WHEN ma.file_path IS NOT NULL AND ma.file_path != '' THEN ma.file_path ELSE NULL END AS avatar_path,
		       COALESCE(ARRAY_AGG(acr.role_code) FILTER (WHERE acr.role_code IS NOT NULL), ARRAY[]::text[]) AS role_codes
		FROM anime_contributions ac
		JOIN members m ON m.id = ac.member_id
		LEFT JOIN media_assets ma ON ma.id = m.avatar_media_id
		LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		WHERE ac.release_version_id = $1
		  AND ac.fansub_group_id = $2
		GROUP BY ac.id, m.nickname, ma.file_path
		ORDER BY m.nickname ASC
	`, releaseVersionID, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("list effective contributions version=%d group=%d step=1: %w", releaseVersionID, fansubGroupID, err)
	}
	defer rows.Close()

	items := make([]EffectiveContributionRow, 0)
	for rows.Next() {
		var item EffectiveContributionRow
		var avatarPath *string
		if err := rows.Scan(&item.ContributionID, &item.MemberID, &item.MemberName, &avatarPath, &item.RoleCodes); err != nil {
			return nil, fmt.Errorf("list effective contributions version=%d group=%d step=1: scan: %w", releaseVersionID, fansubGroupID, err)
		}
		if avatarPath != nil && *avatarPath != "" {
			item.MemberAvatarURL = avatarPath
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list effective contributions version=%d group=%d step=1: iterate: %w", releaseVersionID, fansubGroupID, err)
	}

	// Schritt 1 hat Ergebnisse — versions-spezifischer Override
	if len(items) > 0 {
		return &EffectiveContributionsResult{
			Rows:       items,
			IsOverride: true,
			Source:     "release_version",
		}, nil
	}

	// Schritt 2: Fallback — anime-weite Contributions (release_version_id IS NULL)
	// anime_id wird über release_versions → fansub_releases → episodes ermittelt
	fallbackRows, err := r.db.Query(ctx, `
		SELECT ac.id, ac.member_id, m.nickname,
		       CASE WHEN ma.file_path IS NOT NULL AND ma.file_path != '' THEN ma.file_path ELSE NULL END AS avatar_path,
		       COALESCE(ARRAY_AGG(acr.role_code) FILTER (WHERE acr.role_code IS NOT NULL), ARRAY[]::text[]) AS role_codes
		FROM anime_contributions ac
		JOIN members m ON m.id = ac.member_id
		LEFT JOIN media_assets ma ON ma.id = m.avatar_media_id
		LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		WHERE ac.release_version_id IS NULL
		  AND ac.fansub_group_id = $2
		  AND ac.anime_id = (
		      SELECT ep.anime_id
		      FROM release_versions rv
		      JOIN fansub_releases fr ON fr.id = rv.release_id
		      JOIN episodes ep ON ep.id = fr.episode_id
		      WHERE rv.id = $1
		      LIMIT 1
		  )
		GROUP BY ac.id, m.nickname, ma.file_path
		ORDER BY m.nickname ASC
	`, releaseVersionID, fansubGroupID)
	if err != nil {
		return nil, fmt.Errorf("list effective contributions version=%d group=%d step=2: %w", releaseVersionID, fansubGroupID, err)
	}
	defer fallbackRows.Close()

	fallbackItems := make([]EffectiveContributionRow, 0)
	for fallbackRows.Next() {
		var item EffectiveContributionRow
		var avatarPath *string
		if err := fallbackRows.Scan(&item.ContributionID, &item.MemberID, &item.MemberName, &avatarPath, &item.RoleCodes); err != nil {
			return nil, fmt.Errorf("list effective contributions version=%d group=%d step=2: scan: %w", releaseVersionID, fansubGroupID, err)
		}
		if avatarPath != nil && *avatarPath != "" {
			item.MemberAvatarURL = avatarPath
		}
		fallbackItems = append(fallbackItems, item)
	}
	if err := fallbackRows.Err(); err != nil {
		return nil, fmt.Errorf("list effective contributions version=%d group=%d step=2: iterate: %w", releaseVersionID, fansubGroupID, err)
	}

	return &EffectiveContributionsResult{
		Rows:       fallbackItems,
		IsOverride: false,
		Source:     "anime_default",
	}, nil
}
