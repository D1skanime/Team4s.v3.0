package handlers

import "team4s.v3/backend/internal/models"

// collectJellyfinFolderOptions enumerates the distinct jellyfin: folder IDs
// connected to an anime from its already-loaded source/source_links
// (AdminAnimeSyncSource, already loaded by GetAnimeSyncSource -- no extra
// DB/Jellyfin call needed), marking the folder matching mainSource as
// IsMain. An anime can have more than one connected Jellyfin folder (D-05).
//
// De-duplicates by Jellyfin ID, not by raw string identity, because
// syncAnimeSourceLinks persists the main folder into source_links too
// (RESEARCH.md §12) -- comparing raw strings would produce a spurious
// duplicate entry for the ordinary single-folder case.
//
// The resulting []models.JellyfinFolderOption is the single source of truth
// reused both by PreviewEpisodeImport's fail-closed ownership guard (165-04,
// admin_episode_import_ownership.go) and by 165-07's folder management
// surface (D-18), so both consumers stay in sync with the same allow-list.
func collectJellyfinFolderOptions(source *string, sourceLinks []string, mainSource *string) []models.JellyfinFolderOption {
	mainID := extractJellyfinSourceID(mainSource)

	options := make([]models.JellyfinFolderOption, 0, len(sourceLinks)+1)
	seen := make(map[string]struct{}, len(sourceLinks)+1)

	add := func(candidate *string) {
		id := extractJellyfinSourceID(candidate)
		if id == "" {
			return
		}
		if _, ok := seen[id]; ok {
			return
		}
		seen[id] = struct{}{}
		options = append(options, models.JellyfinFolderOption{
			JellyfinItemID: id,
			IsMain:         mainID != "" && id == mainID,
		})
	}

	add(source)
	for i := range sourceLinks {
		add(&sourceLinks[i])
	}

	return options
}
