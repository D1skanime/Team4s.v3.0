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
// Heuristik ("kara"/"typeset").
//
// Seit Plan 156-13 (156-UAT.md GAP-01, Nachtrag 2026-09-12) gilt eine ZWEI-Bedingungen-
// Regel statt reiner Rollen-Filterung: ein Beteiligter erscheint in Participants NUR,
// wenn (a) er explizit als Segment-Contributor ausgewaehlt wurde
// (theme_segment_contributors, Plan 156-12) UND (b) sein aktueller, effektiv aufgeloester
// Origin-Rollen-Satz mindestens eine Rolle aus permissions.SegmentCreditRoleCodes
// enthaelt. "Keine Auswahl = keine personenbezogenen Segment-Credits" -- ein Segment ohne
// jede theme_segment_contributors-Zeile liefert eine leere Participants-Liste, auch wenn
// die Origin reale, oeffentliche, rollenrelevante Beteiligte hat. Kein Legacy-Fallback auf
// "alle Origin-Beteiligten zeigen".

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
// geratene Ersatzquelle. Genau ZWEI gebuendelte Aufrufe fuer die GESAMTE Items-Menge
// (ein loadPublicEffectiveContributors-Aufruf fuer die deduplizierte Origin-Menge, ein
// loadThemeSegmentContributorSelections-Aufruf fuer die gesamte Segment-Menge) -- keine
// Pro-Segment-Query (T-156-01: dieselbe is_public_on_anime_page/visibility-Gate wie
// jeder andere Public-Contributor-Read, kein zweiter, paralleler Ladepfad).
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

	segmentIDs := make([]int64, len(items))
	for i := range items {
		segmentIDs[i] = items[i].ThemeSegmentID
	}
	selectedMemberIDsBySegment, err := loadThemeSegmentContributorSelections(ctx, r.db, segmentIDs)
	if err != nil {
		return fmt.Errorf("release detail: load segment contributor selections: %w", err)
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
		// selectedMemberIDs ist nil, wenn das Segment KEINE theme_segment_contributors-
		// Zeile hat -- ein nil-Map-Lookup liefert immer "nicht enthalten", das ergibt
		// automatisch die geforderte "keine Auswahl = keine Credits"-Semantik ohne
		// gesonderten Sonderfall.
		selectedMemberIDs := selectedMemberIDsBySegment[items[i].ThemeSegmentID]
		filtered := make([]PublicReleaseContributor, 0)
		for _, contributor := range contributorsByOrigin[*originID] {
			if !hasAnySegmentRelevantRole(contributor.RoleCodes, segmentRelevantRoles) {
				continue
			}
			if _, selected := selectedMemberIDs[contributor.MemberID]; !selected {
				continue
			}
			contributor.SegmentRoleLabel = permissions.SegmentCreditLabelForRoles(contributor.RoleCodes)
			filtered = append(filtered, contributor)
		}
		items[i].Participants = filtered
	}
	return nil
}

// loadThemeSegmentContributorSelections laedt die explizite Segment-Contributor-Auswahl
// (theme_segment_contributors, Plan 156-12) fuer eine Menge von Segmenten in EINER
// gebuendelten Abfrage -- unabhaengig davon, ob irgendein Segment ueberhaupt eine Zeile
// hat, damit der Query-Budget-Test dieselbe Abfragezahl unabhaengig von der
// Auswahl-Kardinalitaet beweisen kann (T-156-27).
func loadThemeSegmentContributorSelections(ctx context.Context, db pgxQuerier, segmentIDs []int64) (map[int64]map[int64]struct{}, error) {
	rows, err := db.Query(ctx, `
		SELECT theme_segment_id, member_id
		FROM theme_segment_contributors
		WHERE theme_segment_id = ANY($1)
	`, segmentIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	selections := make(map[int64]map[int64]struct{})
	for rows.Next() {
		var themeSegmentID, memberID int64
		if err := rows.Scan(&themeSegmentID, &memberID); err != nil {
			return nil, err
		}
		if selections[themeSegmentID] == nil {
			selections[themeSegmentID] = make(map[int64]struct{})
		}
		selections[themeSegmentID][memberID] = struct{}{}
	}
	return selections, rows.Err()
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
