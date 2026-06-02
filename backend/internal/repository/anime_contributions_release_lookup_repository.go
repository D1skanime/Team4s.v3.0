package repository

// Ausgelagert aus anime_contributions_repository.go (450-Zeilen-Limit, Phase 67-02).
// Enthaelt die Release-Version-Lookups fuer den Contribution-Schreibpfad:
//   - GroupParticipatesInReleaseVersion (D-03 Beteiligungspruefung)
//   - ListGroupReleaseVersionsForAnime (gruppen-gefiltertes Dropdown, D-07)
// Beide Queries sind vollstaendig parametrisiert ($1/$2), nie String-Konkatenation
// (SQL-Injection-Mitigation, T-67-02-SQLI).

import (
	"context"
	"fmt"
)

// GroupReleaseVersionOption ist eine einzelne Dropdown-Option fuer das Leader-Modal:
// eine Release-Version, an der die Gruppe beteiligt ist. JSON-Tags snake_case als
// Spiegel zu den Frontend-Typen.
type GroupReleaseVersionOption struct {
	ReleaseVersionID int64  `json:"release_version_id"`
	EpisodeNumber    string `json:"episode_number"`
	Version          string `json:"version"`
}

// GroupParticipatesInReleaseVersion liefert true, wenn die gegebene Fansub-Gruppe
// an der gegebenen Release-Version beteiligt ist (Zeile in release_version_groups).
// Wird in beiden Schreibpfaden (Leader-Handler + Member-Proposal) genutzt, um
// Cross-Group-Tampering zu verhindern (D-03, T-67-02-CG).
func (r *AnimeContributionsRepository) GroupParticipatesInReleaseVersion(ctx context.Context, fansubGroupID int64, releaseVersionID int64) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM release_version_groups
			WHERE release_version_id = $1 AND fansub_group_id = $2
		)
	`, releaseVersionID, fansubGroupID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("group participates in release version check: %w", err)
	}
	return exists, nil
}

// ListGroupReleaseVersionsForAnime liefert alle Release-Versionen des Anime, an denen
// die gegebene Gruppe beteiligt ist, als Dropdown-Optionen. Sortiert nach Episode
// (sort_index NULL-safe) dann Version (D-07). Ist die Gruppe an keiner Version
// beteiligt, wird eine leere Liste (kein Fehler) zurueckgegeben.
func (r *AnimeContributionsRepository) ListGroupReleaseVersionsForAnime(ctx context.Context, fansubGroupID int64, animeID int64) ([]GroupReleaseVersionOption, error) {
	rows, err := r.db.Query(ctx, `
		SELECT rv.id, COALESCE(ep.episode_number, ''), rv.version
		FROM release_versions rv
		JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
		JOIN fansub_releases fr ON fr.id = rv.release_id
		JOIN episodes ep ON ep.id = fr.episode_id
		WHERE rvg.fansub_group_id = $1 AND ep.anime_id = $2
		ORDER BY COALESCE(ep.sort_index, 2147483647), ep.id, rv.version
	`, fansubGroupID, animeID)
	if err != nil {
		return nil, fmt.Errorf("list group release versions for anime fansub=%d anime=%d: %w", fansubGroupID, animeID, err)
	}
	defer rows.Close()

	result := make([]GroupReleaseVersionOption, 0)
	for rows.Next() {
		var opt GroupReleaseVersionOption
		if err := rows.Scan(&opt.ReleaseVersionID, &opt.EpisodeNumber, &opt.Version); err != nil {
			return nil, fmt.Errorf("list group release versions for anime: scan: %w", err)
		}
		result = append(result, opt)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list group release versions for anime: iterate: %w", err)
	}
	return result, nil
}
