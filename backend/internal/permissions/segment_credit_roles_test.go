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
