package permissions

import "strings"

// SegmentCreditRoleCodes is the single central definition of which contributor
// role codes are segment-relevant (Phase 156, Workstream D, P156-08/P156-09;
// extended by Plan 156-12/GAP-01 to {translator, timer, karaoke_fx,
// typesetter, editor, quality_checker}; extended by Plan 156-20/156-UAT.md
// GAP-09 to {..., encoder, designer}). It replaces the label-substring
// heuristic previously used to guess segment credits from an
// already-aggregated German role label
// (`strings.Contains(label, "kara") || strings.Contains(label, "typeset")`).
// `encoder` and `designer` are segment-relevant like every other code in this
// list -- they are visible as a segment credit ONLY when explicitly selected
// as a `theme_segment_contributor` (same rule as every other role here), no
// different treatment. This supersedes the earlier
// `156-USER-REQUEST.md`/GAP-01/Regressionsfall-D rule that an encoder must
// never appear as a segment credit -- that rule is retired by GAP-09
// (Auftraggeber-Entscheidung im Chat, 2026-09-15). Consumed by the dynamic
// segment-credit projection in loadReleaseSegments/loadPublicEffectiveContributors
// (Plan 156-07) and by the segment-contributor candidate/validation path
// (Plan 156-12). This is defined here -- Domain-/Permissions-Nachbarschaft,
// nicht im Repository, nicht im Handler, nicht im Frontend -- and must not be
// duplicated anywhere else in the backend or frontend. Plan 156-17/156-UAT.md
// GAP-06 added the paired segment-label lookup (segmentCreditLabels /
// SegmentCreditLabelForRoles) below, so the role filter and its display label
// can never drift apart.
var SegmentCreditRoleCodes = []string{RoleTranslator, RoleTimer, RoleKaraokeFX, RoleTypesetter, RoleEditor, RoleQualityChecker, RoleEncoder, RoleDesigner}

// SegmentCreditPreselectionRoleCodes is the narrower, GAP-09-introduced
// (Plan 156-20) preselection-only subset of SegmentCreditRoleCodes: the
// original six codes, deliberately excluding encoder/designer. It exists
// because automatic preselection (ensureThemeSegmentContributorsPreselectedTx,
// wired in Plan 156-21) must keep excluding encoder/designer from being
// auto-added as segment contributors even though the credit/label list above
// no longer excludes them -- an admin may still add encoder/designer
// manually, but they are never auto-selected. Proven to be a true (strictly
// smaller) subset of SegmentCreditRoleCodes by
// TestSegmentCreditPreselectionRoleCodes in segment_credit_roles_test.go.
var SegmentCreditPreselectionRoleCodes = []string{RoleTranslator, RoleTimer, RoleKaraokeFX, RoleTypesetter, RoleEditor, RoleQualityChecker}

// segmentCreditLabels is the confirmed Rollen-Code -> Segment-Beschriftung
// mapping from 156-UAT.md GAP-06 (Auftraggeber-bestaetigt 2026-09-14),
// extended by GAP-09 (Plan 156-20, Auftraggeber-Entscheidung im Chat,
// 2026-09-15) with encoder/designer and a sharpened typesetter label. It is
// paired with SegmentCreditRoleCodes above: every key here must be a code in
// SegmentCreditRoleCodes, and every code in SegmentCreditRoleCodes must have
// an entry here -- proven in both directions by
// TestSegmentCreditLabelCoverageIsDeckungsgleich in
// segment_credit_roles_test.go.
var segmentCreditLabels = map[string]string{
	RoleTranslator:     "Karaoke-Übersetzung",
	RoleTimer:          "Karaoke-Timing",
	RoleKaraokeFX:      "Karaoke-FX",
	RoleTypesetter:     "Karaoke-Typesetting",
	RoleEditor:         "Karaoke-Edit",
	RoleQualityChecker: "Karaoke-Qualitätsprüfung",
	RoleEncoder:        "Karaoke-Encoding",
	RoleDesigner:       "Logo",
}

// SegmentCreditLabelForRoles returns the segment-specific German label(s) for
// the segment-relevant subset of roleCodes, comma-separated, in the fixed
// order of SegmentCreditRoleCodes -- never in the input slice's order. Codes
// not present in SegmentCreditRoleCodes (e.g. "raw_provider") are silently
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
