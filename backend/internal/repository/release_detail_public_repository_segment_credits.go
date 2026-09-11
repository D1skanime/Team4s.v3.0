package repository

// Segment-Credit-Projektion fuer ReleaseDetailPublicRepository.loadReleaseSegments
// (release_detail_public_repository_helpers.go), ausgelagert in eine eigene Datei
// wegen des CLAUDE.md-450-Zeilen-Limits (Plan 156-07).
//
// Seit dem DECISIONS.md-Eintrag vom 2026-09-11 ("Release detail page stops
// suppressing already-visible segments, supersedes Phase 117 D-02") kommen
// Segment-Credits dynamisch aus der ORIGIN-Release-Version jedes Segments
// (theme_segments.origin_release_version_id, Plan 156-01/156-04) -- NICHT mehr aus
// den eigenen Beteiligten der betrachteten Release-Version per Label-Substring-
// Heuristik ("kara"/"typeset"). Gefiltert wird ausschliesslich auf
// permissions.SegmentCreditRoleCodes (P156-07/P156-08/P156-09), die einzige zentrale
// Definition segmentrelevanter Rollen-Codes.

import (
	"context"
	"fmt"

	"team4s.v3/backend/internal/permissions"
)

// applySegmentOriginCredits befuellt Participants je Segment aus dessen ORIGIN-
// Release-Version (origins[i], parallel zu items[i]) statt aus der betrachteten
// Release-Version selbst -- eine Korrektur am Origin oder an dessen Beteiligten
// wirkt sich damit sofort auf JEDEN naechsten Aufruf aus (live, nicht gecacht),
// ohne dass das Segment selbst angefasst werden muss. Ein nil-Origin (noch nicht
// bestimmt) ergibt eine leere (nicht nil, kein Fehler) Participants-Liste -- keine
// geratene Ersatzquelle. Genau EIN gebuendelter loadPublicEffectiveContributors-Aufruf
// fuer die gesamte, deduplizierte Origin-Menge, keine Pro-Segment-Query (T-156-01:
// dieselbe is_public_on_anime_page/visibility-Gate wie jeder andere Public-Contributor-
// Read, kein zweiter, paralleler Ladepfad).
func (r *ReleaseDetailPublicRepository) applySegmentOriginCredits(ctx context.Context, items []PublicReleaseSegment, origins []*int64) error {
	distinctOriginIDs := make(map[int64]struct{})
	for _, id := range origins {
		if id != nil {
			distinctOriginIDs[*id] = struct{}{}
		}
	}
	originReleaseVersionIDs := make([]int64, 0, len(distinctOriginIDs))
	for id := range distinctOriginIDs {
		originReleaseVersionIDs = append(originReleaseVersionIDs, id)
	}

	contributorsByOrigin, err := loadPublicEffectiveContributors(ctx, r.db, originReleaseVersionIDs)
	if err != nil {
		return fmt.Errorf("release detail: load segment origin credits: %w", err)
	}

	segmentRelevantRoles := make(map[string]struct{}, len(permissions.SegmentCreditRoleCodes))
	for _, code := range permissions.SegmentCreditRoleCodes {
		segmentRelevantRoles[code] = struct{}{}
	}

	for i := range items {
		originID := origins[i]
		if originID == nil {
			items[i].Participants = make([]PublicReleaseContributor, 0)
			continue
		}
		filtered := make([]PublicReleaseContributor, 0)
		for _, contributor := range contributorsByOrigin[*originID] {
			if hasAnySegmentRelevantRole(contributor.RoleCodes, segmentRelevantRoles) {
				filtered = append(filtered, contributor)
			}
		}
		items[i].Participants = filtered
	}
	return nil
}

// hasAnySegmentRelevantRole prueft, ob mindestens einer der RoleCodes eines
// Beteiligten in der segmentrelevanten Allow-List enthalten ist -- Einschluss per
// beliebiger relevanter Rolle, kein Ausschluss des gesamten Beitrags wegen einer
// ZUSAETZLICHEN nicht-relevanten Rolle (T-156-13: ein Encoder, der auch Übersetzer
// ist, zaehlt weiterhin fuer seine Übersetzer-Arbeit).
func hasAnySegmentRelevantRole(roleCodes []string, segmentRelevantRoles map[string]struct{}) bool {
	for _, code := range roleCodes {
		if _, ok := segmentRelevantRoles[code]; ok {
			return true
		}
	}
	return false
}
