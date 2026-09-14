package permissions

import "strings"

// SegmentCreditRoleCodes is the single central definition of which contributor
// role codes are segment-relevant (Phase 156, Workstream D, P156-08/P156-09;
// extended by Plan 156-12/GAP-01 to {translator, timer, karaoke_fx,
// typesetter, editor, quality_checker}). It replaces the label-substring
// heuristic previously used to guess segment credits from an
// already-aggregated German role label
// (`strings.Contains(label, "kara") || strings.Contains(label, "typeset")`).
// `encoder` remains the only deliberately excluded contributor-relevant role --
// an encoder must never appear as a segment credit, regardless of any other
// role they hold (156-UAT.md). Consumed by the dynamic segment-credit
// projection in loadReleaseSegments/loadPublicEffectiveContributors (Plan
// 156-07) and by the segment-contributor candidate/validation path
// (Plan 156-12). This is defined here -- Domain-/Permissions-Nachbarschaft,
// nicht im Repository, nicht im Handler, nicht im Frontend -- and must not be
// duplicated anywhere else in the backend or frontend. Plan 156-17/156-UAT.md
// GAP-06 added the paired segment-label lookup (segmentCreditLabels /
// SegmentCreditLabelForRoles) below, so the role filter and its display label
// can never drift apart.
var SegmentCreditRoleCodes = []string{RoleTranslator, RoleTimer, RoleKaraokeFX, RoleTypesetter, RoleEditor, RoleQualityChecker}

// segmentCreditLabels is the confirmed Rollen-Code -> Segment-Beschriftung
// mapping from 156-UAT.md GAP-06 (Auftraggeber-bestaetigt 2026-09-14). It is
// paired with SegmentCreditRoleCodes above: every key here must be a code in
// SegmentCreditRoleCodes, and every code in SegmentCreditRoleCodes must have
// an entry here -- proven in both directions by
// TestSegmentCreditLabelCoverageIsDeckungsgleich in
// segment_credit_roles_test.go.
var segmentCreditLabels = map[string]string{
	RoleTranslator:     "Karaoke-Übersetzung",
	RoleTimer:          "Karaoke-Timing",
	RoleKaraokeFX:      "Karaoke-FX",
	RoleTypesetter:     "Typesetting / Logo",
	RoleEditor:         "Karaoke-Edit",
	RoleQualityChecker: "Karaoke-Qualitätsprüfung",
}

// SegmentCreditLabelForRoles returns the segment-specific German label(s) for
// the segment-relevant subset of roleCodes, comma-separated, in the fixed
// order of SegmentCreditRoleCodes -- never in the input slice's order. Codes
// not present in SegmentCreditRoleCodes (e.g. "encoder") are silently
// excluded. Returns an empty string for an empty or nil input, or when none
// of the input codes are segment-relevant.
func SegmentCreditLabelForRoles(roleCodes []string) string {
	present := make(map[string]struct{}, len(roleCodes))
	for _, code := range roleCodes {
		present[code] = struct{}{}
	}

	labels := make([]string, 0, len(SegmentCreditRoleCodes))
	for _, code := range SegmentCreditRoleCodes {
		if _, ok := present[code]; !ok {
			continue
		}
		labels = append(labels, segmentCreditLabels[code])
	}

	return strings.Join(labels, ", ")
}
