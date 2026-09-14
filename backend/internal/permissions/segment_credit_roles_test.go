package permissions

import (
	"testing"

	"github.com/stretchr/testify/require"
)

// TestSegmentCreditRoleCodes proves the single central definition of
// segment-relevant contributor role codes (Phase 156, Workstream D,
// P156-08/P156-09, extended by Plan 156-12/GAP-01): exactly {translator,
// timer, karaoke_fx, typesetter, editor, quality_checker}, excluding encoder,
// defined once in this package.
func TestSegmentCreditRoleCodes(t *testing.T) {
	t.Run("contains exactly the six segment-relevant role codes", func(t *testing.T) {
		require.ElementsMatch(t, []string{"translator", "timer", "karaoke_fx", "typesetter", "editor", "quality_checker"}, SegmentCreditRoleCodes)
	})

	t.Run("never contains encoder", func(t *testing.T) {
		require.NotContains(t, SegmentCreditRoleCodes, "encoder")
	})

	t.Run("contains editor and quality_checker as of Plan 156-12", func(t *testing.T) {
		require.Contains(t, SegmentCreditRoleCodes, "editor")
		require.Contains(t, SegmentCreditRoleCodes, "quality_checker")
	})

	t.Run("role constants match the DB role_definitions catalog codes verbatim", func(t *testing.T) {
		require.Equal(t, "translator", RoleTranslator)
		require.Equal(t, "typesetter", RoleTypesetter)
		require.Equal(t, "karaoke_fx", RoleKaraokeFX)
	})
}

// TestSegmentCreditLabelForRoles proves 156-UAT.md GAP-06's confirmed
// Rollen-Code -> Segment-Beschriftung mapping: each of the six segment-relevant
// role codes resolves to its exact confirmed German label.
func TestSegmentCreditLabelForRoles(t *testing.T) {
	cases := []struct {
		name      string
		roleCodes []string
		want      string
	}{
		{"translator", []string{"translator"}, "Karaoke-Übersetzung"},
		{"timer", []string{"timer"}, "Karaoke-Timing"},
		{"karaoke_fx", []string{"karaoke_fx"}, "Karaoke-FX"},
		{"typesetter", []string{"typesetter"}, "Typesetting / Logo"},
		{"editor", []string{"editor"}, "Karaoke-Edit"},
		{"quality_checker", []string{"quality_checker"}, "Karaoke-Qualitätsprüfung"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			require.Equal(t, tc.want, SegmentCreditLabelForRoles(tc.roleCodes))
		})
	}
}

// TestSegmentCreditLabelForRolesFixedOrder proves a person with two
// segment-relevant roles supplied in reversed order relative to
// SegmentCreditRoleCodes gets the output in SegmentCreditRoleCodes's fixed
// order, not input order.
func TestSegmentCreditLabelForRolesFixedOrder(t *testing.T) {
	got := SegmentCreditLabelForRoles([]string{"quality_checker", "translator"})
	require.Equal(t, "Karaoke-Übersetzung, Karaoke-Qualitätsprüfung", got)
}

// TestSegmentCreditLabelForRolesExcludesEncoder proves encoder never appears
// in the segment label output, even alongside a segment-relevant role.
func TestSegmentCreditLabelForRolesExcludesEncoder(t *testing.T) {
	got := SegmentCreditLabelForRoles([]string{"encoder", "translator"})
	require.Equal(t, "Karaoke-Übersetzung", got)
}

// TestSegmentCreditLabelForRolesEmptyInput proves an empty or nil input slice
// returns an empty string, no panic.
func TestSegmentCreditLabelForRolesEmptyInput(t *testing.T) {
	require.Equal(t, "", SegmentCreditLabelForRoles(nil))
	require.Equal(t, "", SegmentCreditLabelForRoles([]string{}))
}

// TestSegmentCreditLabelCoverageIsDeckungsgleich proves SegmentCreditRoleCodes
// and the internal label map are deckungsgleich (coverage-equal) in both
// directions: every code in SegmentCreditRoleCodes has a non-empty label, and
// no label-map key exists outside SegmentCreditRoleCodes. Adding a new
// segment-relevant code without a label must make this test fail.
func TestSegmentCreditLabelCoverageIsDeckungsgleich(t *testing.T) {
	labelKeys := make([]string, 0, len(segmentCreditLabels))
	for code, label := range segmentCreditLabels {
		require.NotEmpty(t, label, "segmentCreditLabels[%q] must not be empty", code)
		labelKeys = append(labelKeys, code)
	}

	require.ElementsMatch(t, SegmentCreditRoleCodes, labelKeys)
}
