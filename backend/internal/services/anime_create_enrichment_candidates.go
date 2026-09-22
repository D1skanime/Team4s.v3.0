package services

import (
	"strings"

	"team4s.v3/backend/internal/models"
)

// annotateExistingAniSearchCandidates markiert Kandidaten, die bereits zu einem vorhandenen
// Team4s-Anime gehören, mit ExistingAnimeID/ExistingTitle, statt sie aus dem Ergebnis zu
// entfernen (D-31). Kein Kandidat wird jemals übersprungen; matches stammt aus genau EINEM
// gebündelten Repository-Aufruf (ResolveAdminAnimeRelationTargetsBySources), niemals pro
// Kandidat einzeln.
func annotateExistingAniSearchCandidates(
	candidates []models.AdminAnimeAniSearchSearchCandidate,
	matches map[string]models.AdminAnimeSourceMatch,
) []models.AdminAnimeAniSearchSearchCandidate {
	annotated := make([]models.AdminAnimeAniSearchSearchCandidate, 0, len(candidates))
	for _, candidate := range candidates {
		sourceKey := normalizeLookupKey("anisearch:" + strings.TrimSpace(candidate.AniSearchID))
		if match, exists := matches[sourceKey]; exists {
			animeID := match.AnimeID
			title := match.Title
			candidate.ExistingAnimeID = &animeID
			candidate.ExistingTitle = &title
		}
		annotated = append(annotated, candidate)
	}
	return annotated
}
