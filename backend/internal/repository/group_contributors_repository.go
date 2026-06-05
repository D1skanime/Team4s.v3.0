package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// GroupContributorsRepository liefert projektspezifische Mitwirkende (Anime+Gruppe).
type GroupContributorsRepository struct {
	db *pgxpool.Pool
}

// NewGroupContributorsRepository erstellt ein neues GroupContributorsRepository.
func NewGroupContributorsRepository(db *pgxpool.Pool) *GroupContributorsRepository {
	return &GroupContributorsRepository{db: db}
}

// --- DTOs ---

// GroupTeamMember ist ein App-Member mit Rollen an den Releases dieser Gruppe+Anime.
type GroupTeamMember struct {
	MemberID          int64    `json:"member_id"`
	MemberDisplayName string   `json:"member_display_name"`
	MemberSlug        *string  `json:"member_slug"`
	RoleLabels        []string `json:"role_labels"`
}

// GroupExternalContributor ist ein externer Mitwirkender aus anime_contributions.
type GroupExternalContributor struct {
	MemberDisplayName string   `json:"member_display_name"`
	MemberSlug        *string  `json:"member_slug"`
	RoleLabels        []string `json:"role_labels"`
	IsVerified        bool     `json:"is_verified"`
}

// GroupContributorsResponse ist die Antwort für GET /anime/:id/group/:groupId/contributors.
type GroupContributorsResponse struct {
	TeamMembers          []GroupTeamMember          `json:"team_members"`
	ExternalContributors []GroupExternalContributor `json:"external_contributors"`
}

// GetProjectContributors gibt Mitwirkende zurück, die an diesem Anime für diese Gruppe
// beigetragen haben. Gibt zwei getrennte Blöcke zurück (D-07):
//   - TeamMembers: App-Member aus release_member_roles (Release-Credits)
//   - ExternalContributors: externe Mitwirkende aus anime_contributions (anime-weit, group-scoped)
//
// Beide Slices sind niemals nil (leere Slices bei keinen Daten).
func (r *GroupContributorsRepository) GetProjectContributors(ctx context.Context, animeID, groupID int64) (*GroupContributorsResponse, error) {
	slugCol := fmt.Sprintf(memberSlugExpr, "m.nickname")
	displayCol := fmt.Sprintf(memberDisplayExpr, "m", "m")

	resp := &GroupContributorsResponse{
		TeamMembers:          make([]GroupTeamMember, 0),
		ExternalContributors: make([]GroupExternalContributor, 0),
	}

	// Query A: Externe Mitwirkende aus anime_contributions gescoped auf Gruppe+Anime.
	// Nur is_public_on_anime_page=true, visibility='public', release_version_id IS NULL.
	externalQuery := `
		SELECT
			` + displayCol + ` AS member_display_name,
			` + slugCol + ` AS member_slug,
			(ac.status = 'confirmed') AS is_verified,
			COALESCE(ARRAY_AGG(COALESCE(rd.label_de, acr.role_code)) FILTER (WHERE acr.role_code IS NOT NULL), ARRAY[]::text[]) AS role_labels
		FROM anime_contributions ac
		JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
		JOIN members m ON m.id = hfgm.member_id
		LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		LEFT JOIN role_definitions rd ON rd.code = acr.role_code
		WHERE ac.anime_id = $1
		  AND ac.fansub_group_id = $2
		  AND ac.is_public_on_anime_page = true
		  AND hfgm.visibility = 'public'
		  AND ac.release_version_id IS NULL
		GROUP BY m.display_name, m.nickname, ac.status
		ORDER BY member_display_name
	`

	extRows, err := r.db.Query(ctx, externalQuery, animeID, groupID)
	if err != nil {
		return nil, fmt.Errorf("group contributors: external query: %w", err)
	}
	defer extRows.Close()

	for extRows.Next() {
		var c GroupExternalContributor
		if err := extRows.Scan(
			&c.MemberDisplayName,
			&c.MemberSlug,
			&c.IsVerified,
			&c.RoleLabels,
		); err != nil {
			return nil, fmt.Errorf("group contributors: external scan: %w", err)
		}
		if c.RoleLabels == nil {
			c.RoleLabels = make([]string, 0)
		}
		resp.ExternalContributors = append(resp.ExternalContributors, c)
	}
	if err := extRows.Err(); err != nil {
		return nil, fmt.Errorf("group contributors: external iterate: %w", err)
	}

	// Query B: Team-Beteiligte aus release_member_roles gescoped auf Anime+Gruppe.
	// Aggregiert Rollen je Person über das gesamte Projekt (D-08).
	teamQuery := `
		SELECT DISTINCT ON (m.id)
			m.id AS member_id,
			` + displayCol + ` AS member_display_name,
			` + slugCol + ` AS member_slug,
			COALESCE(ARRAY_AGG(DISTINCT cr.label) FILTER (WHERE cr.label IS NOT NULL), ARRAY[]::text[]) AS role_labels
		FROM release_member_roles rmr
		JOIN members m ON m.id = rmr.member_id
		JOIN contributor_roles cr ON cr.id = rmr.role_id
		JOIN fansub_releases fr ON fr.id = rmr.release_id
		JOIN episodes e ON e.id = fr.episode_id
		JOIN release_versions rv ON rv.release_id = fr.id
		JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
		WHERE e.anime_id = $1 AND rvg.fansub_group_id = $2
		GROUP BY m.id, m.display_name, m.nickname
		ORDER BY m.id, member_display_name
	`

	teamRows, err := r.db.Query(ctx, teamQuery, animeID, groupID)
	if err != nil {
		return nil, fmt.Errorf("group contributors: team query: %w", err)
	}
	defer teamRows.Close()

	for teamRows.Next() {
		var tm GroupTeamMember
		if err := teamRows.Scan(
			&tm.MemberID,
			&tm.MemberDisplayName,
			&tm.MemberSlug,
			&tm.RoleLabels,
		); err != nil {
			return nil, fmt.Errorf("group contributors: team scan: %w", err)
		}
		if tm.RoleLabels == nil {
			tm.RoleLabels = make([]string, 0)
		}
		resp.TeamMembers = append(resp.TeamMembers, tm)
	}
	if err := teamRows.Err(); err != nil {
		return nil, fmt.Errorf("group contributors: team iterate: %w", err)
	}

	return resp, nil
}
