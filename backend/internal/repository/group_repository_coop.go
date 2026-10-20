package repository

// getCoopGroups liefert echte Coop-Partner fuer diesen Anime und diese Gruppe --
// nur Gruppen, die mindestens eine release_version_groups-Zeile mit DERSELBEN
// release_version_id teilen wie groupID. Im Gegensatz zu getOtherGroups (jede
// Gruppe mit IRGENDEINEM Release zu diesem Anime, ueberlappend oder nicht)
// erfordert dies einen echten gemeinsamen Release. Ausgelagert in eine eigene
// Datei (nicht in group_repository.go, bereits 454 Zeilen am 450-Zeilen-Limit --
// siehe D-04/189-01-PLAN.md).

import (
	"context"
	"fmt"

	"team4s.v3/backend/internal/models"
)

// getCoopGroups liefert jede ANDERE Fansub-Gruppe, die auf diesem Anime
// mindestens eine release_version_id mit groupID teilt -- ein Self-Join auf
// release_version_groups (gleiche release_version_id, andere fansub_group_id),
// NICHT ueber getOtherGroups' Pro-Episode-Form. Eine Gruppe mit einem eigenen,
// nicht ueberlappenden Release auf demselben Anime erscheint hier NICHT.
func (r *GroupRepository) getCoopGroups(
	ctx context.Context,
	animeID int64,
	groupID int64,
) ([]models.FansubGroupSummary, error) {
	query := `
		SELECT
			DISTINCT fg.id,
			fg.slug,
			fg.name,
			fg.logo_url
		FROM release_version_groups rvg_self
		JOIN release_version_groups rvg_other
			ON rvg_other.release_version_id = rvg_self.release_version_id
		 AND rvg_other.fansub_group_id != rvg_self.fansub_group_id
		JOIN release_versions rev ON rev.id = rvg_self.release_version_id
		JOIN fansub_releases fr ON fr.id = rev.release_id
		JOIN episodes e ON e.id = fr.episode_id
		JOIN fansub_groups fg ON fg.id = rvg_other.fansub_group_id
		WHERE rvg_self.fansub_group_id = $2 AND e.anime_id = $1
		ORDER BY fg.name ASC
	`

	rows, err := r.db.Query(ctx, query, animeID, groupID)
	if err != nil {
		return nil, fmt.Errorf("query coop groups for anime %d: %w", animeID, err)
	}
	defer rows.Close()

	groups := make([]models.FansubGroupSummary, 0, 8)
	for rows.Next() {
		var group models.FansubGroupSummary
		if err := rows.Scan(&group.ID, &group.Slug, &group.Name, &group.LogoURL); err != nil {
			return nil, fmt.Errorf("scan coop group row: %w", err)
		}
		groups = append(groups, group)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate coop group rows: %w", err)
	}

	return groups, nil
}
