package repository

// Ebene-2-Aggregation der oeffentlichen Anime-Contributions (Phase 67-03).
// Waehrend GetPublicAnimeContributions (Ebene 1) die anime-weiten Beitraege
// (release_version_id IS NULL) liefert, haengt attachVersionBreakdowns die
// versions-spezifischen Beitraege (release_version_id IS NOT NULL) pro Gruppe an.
//
// Das Muster spiegelt attachHiddenCounts: eine separate Query plus map-Merge ueber
// groupIndex (keine komplexe UNION-Single-Query). Die Versions-Ebene fuehrt dieselben
// Public-Filter wie Ebene 1 (is_public_on_anime_page = true AND hfgm.visibility = 'public'),
// um Information Disclosure nicht-oeffentlicher Beitraege zu verhindern (T-67-03-ID).
// Die animeID-Query ist vollstaendig parametrisiert ($1, T-67-03-SQLI).

import (
	"context"
	"fmt"
)

// ReleaseVersionBreakdownGroup buendelt die oeffentlichen Beitraege einer Gruppe
// fuer genau eine Release-Version (Spiegel zu ReleaseVersionBreakdown in
// frontend/src/types/contributions.ts; JSON-Tags snake_case).
type ReleaseVersionBreakdownGroup struct {
	ReleaseVersionID int64                  `json:"release_version_id"`
	EpisodeNumber    string                 `json:"episode_number"`
	Version          string                 `json:"version"`
	Contributors     []PublicContributorRow `json:"contributors"`
}

// attachVersionBreakdowns sammelt die versions-spezifischen oeffentlichen Beitraege
// (ac.release_version_id IS NOT NULL) pro Fansub-Gruppe und haengt sie als nach
// Episode -> Version sortierte Aufschluesselung an die Gruppen-Structs an.
//
// Gruppen, die bereits anime-weite Beitraege haben, werden ueber groupIndex gemerged.
// Gruppen, die ausschliesslich versions-spezifische Beitraege besitzen, werden neu
// in groups + groupIndex aufgenommen, damit sie auf der Anime-Seite erscheinen.
func (r *AnimeContributionsRepository) attachVersionBreakdowns(ctx context.Context, animeID int64, groups *[]PublicAnimeContributionGroup, groupIndex map[int64]int) error {
	slugCol := fmt.Sprintf(memberSlugExpr, "m.nickname")
	displayCol := fmt.Sprintf(memberDisplayExpr, "m", "m")

	query := `
		SELECT
			ac.fansub_group_id,
			fg.name AS fansub_group_name,
			fg.slug AS fansub_group_slug,
			ac.release_version_id,
			COALESCE(ep.episode_number, '') AS episode_number,
			rv.version,
			` + displayCol + ` AS member_display_name,
			` + slugCol + ` AS member_slug,
			ac.started_year,
			ac.ended_year,
			(ac.status = 'confirmed') AS is_verified,
			COALESCE(ARRAY_AGG(acr.role_code) FILTER (WHERE acr.role_code IS NOT NULL), ARRAY[]::text[]) AS role_codes,
			COALESCE(ARRAY_AGG(COALESCE(rd.label_de, acr.role_code)) FILTER (WHERE acr.role_code IS NOT NULL), ARRAY[]::text[]) AS role_labels
		FROM anime_contributions ac
		JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
		JOIN members m ON m.id = hfgm.member_id
		JOIN fansub_groups fg ON fg.id = ac.fansub_group_id
		JOIN release_versions rv ON rv.id = ac.release_version_id
		JOIN fansub_releases fr ON fr.id = rv.release_id
		JOIN episodes ep ON ep.id = fr.episode_id
		LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
		LEFT JOIN role_definitions rd ON rd.code = acr.role_code
		WHERE ac.anime_id = $1
		  AND ac.is_public_on_anime_page = true
		  AND hfgm.visibility = 'public'
		  AND ac.release_version_id IS NOT NULL
		GROUP BY ac.id, ac.fansub_group_id, fg.name, fg.slug, ac.release_version_id,
			ep.episode_number, ep.sort_index, ep.id, rv.version,
			m.display_name, m.nickname, ac.started_year, ac.ended_year, ac.status
		ORDER BY ac.fansub_group_id, COALESCE(ep.sort_index, 2147483647), ep.id, rv.version
	`

	rows, err := r.db.Query(ctx, query, animeID)
	if err != nil {
		return fmt.Errorf("public anime contributions: version breakdowns: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var (
			fgID      int64
			fgName    string
			fgSlug    string
			versionID int64
			episode   string
			version   string
			contrib   PublicContributorRow
		)
		if err := rows.Scan(
			&fgID, &fgName, &fgSlug,
			&versionID, &episode, &version,
			&contrib.MemberDisplayName, &contrib.MemberSlug,
			&contrib.StartedYear, &contrib.EndedYear, &contrib.IsVerified,
			&contrib.Roles, &contrib.RoleLabels,
		); err != nil {
			return fmt.Errorf("public anime contributions: version breakdowns scan: %w", err)
		}

		idx := r.ensureVersionGroup(groups, groupIndex, fgID, fgName, fgSlug)
		g := &(*groups)[idx]
		appendToVersionBreakdown(g, versionID, episode, version, contrib)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("public anime contributions: version breakdowns iterate: %w", err)
	}
	return nil
}

// ensureVersionGroup liefert den groups-Index der Gruppe fgID. Existiert sie noch
// nicht (nur versions-spezifische Beitraege, keine anime-weiten), wird sie neu
// angelegt, damit solche Gruppen auf der Anime-Seite erscheinen.
func (r *AnimeContributionsRepository) ensureVersionGroup(groups *[]PublicAnimeContributionGroup, groupIndex map[int64]int, fgID int64, fgName, fgSlug string) int {
	if idx, ok := groupIndex[fgID]; ok {
		return idx
	}
	*groups = append(*groups, PublicAnimeContributionGroup{
		FansubGroupID:   fgID,
		FansubGroupName: fgName,
		FansubGroupSlug: fgSlug,
		Contributors:    make([]PublicContributorRow, 0),
	})
	idx := len(*groups) - 1
	groupIndex[fgID] = idx
	return idx
}

// appendToVersionBreakdown sortiert einen Contributor in die passende
// ReleaseVersionBreakdownGroup der Gruppe ein. Die Reihenfolge aus der Query
// (Episode -> Version) bleibt erhalten: ein neuer release_version_id-Block wird
// am Ende der Liste angehaengt, bestehende Bloecke bekommen den Contributor angefuegt.
func appendToVersionBreakdown(g *PublicAnimeContributionGroup, versionID int64, episode, version string, contrib PublicContributorRow) {
	for i := range g.VersionBreakdown {
		if g.VersionBreakdown[i].ReleaseVersionID == versionID {
			g.VersionBreakdown[i].Contributors = append(g.VersionBreakdown[i].Contributors, contrib)
			return
		}
	}
	g.VersionBreakdown = append(g.VersionBreakdown, ReleaseVersionBreakdownGroup{
		ReleaseVersionID: versionID,
		EpisodeNumber:    episode,
		Version:          version,
		Contributors:     []PublicContributorRow{contrib},
	})
}
