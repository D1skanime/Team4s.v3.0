package repository

import (
	"context"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/permissions"
)

// ListActorContributionRolesForAnimeProject gibt die role_codes zurück, die dem Actor
// für GENAU dieses (animeID, fansubGroupID)-Paar über eine bestätigte
// anime_contributions-Zeile zustehen (D-12, Kernfall des Bugfixes 188-05).
//
// Anders als ListActorContributionRolesForVersion (authz_roles.go, Release-Version-Ebene,
// akzeptiert JEDEN anime_contributions.status) filtert diese NEUE, eigenständige Methode
// bewusst auf status = 'confirmed' (Nutzervorgabe D-12) -- eine unbestätigte oder
// widerrufene Projektzuordnung gewährt keinen Zugriff. Die bestehende
// ListActorContributionRolesForVersion bleibt für die Release-Version-Ebene unverändert.
//
// fansub_group_id-Scope via JOIN auf fansub_group_members (fgm.fansub_group_id =
// ac.fansub_group_id) verhindert Cross-Gruppen-Leckage, der zusätzliche
// ac.anime_id = $1-Filter verhindert Cross-Anime-Leckage (T-188-05-01, Testfälle 3+4).
func (r *AuthzRepository) ListActorContributionRolesForAnimeProject(
	ctx context.Context,
	appUserID int64,
	animeID int64,
	fansubGroupID int64,
) ([]string, error) {
	if appUserID <= 0 || animeID <= 0 || fansubGroupID <= 0 {
		return nil, nil
	}

	rows, err := r.db.Query(ctx, `
		SELECT DISTINCT acr.role_code
		FROM anime_contributions ac
		JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		JOIN fansub_group_members fgm ON fgm.member_id = ac.member_id
		  AND fgm.fansub_group_id = ac.fansub_group_id
		WHERE ac.anime_id = $1
		  AND ac.fansub_group_id = $2
		  AND ac.status = 'confirmed'
		  AND fgm.app_user_id = $3
		  AND fgm.status = 'active'
		ORDER BY acr.role_code
	`, animeID, fansubGroupID, appUserID)
	if err != nil {
		return nil, fmt.Errorf("list actor contribution roles anime_project anime=%d fansub_group=%d user=%d: %w", animeID, fansubGroupID, appUserID, err)
	}
	defer rows.Close()

	roleCodes := make([]string, 0)
	for rows.Next() {
		var code string
		if err := rows.Scan(&code); err != nil {
			return nil, fmt.Errorf("list actor contribution roles anime_project anime=%d fansub_group=%d user=%d: scan: %w", animeID, fansubGroupID, appUserID, err)
		}
		roleCodes = append(roleCodes, strings.TrimSpace(code))
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list actor contribution roles anime_project anime=%d fansub_group=%d user=%d: iterate: %w", animeID, fansubGroupID, appUserID, err)
	}

	return roleCodes, nil
}

// Compile-Zeit-Assertion: AuthzRepository implementiert das optionale
// AnimeProjectContributionResolver-Interface (Task 3, permissions_anime_project.go).
var _ permissions.AnimeProjectContributionResolver = (*AuthzRepository)(nil)
