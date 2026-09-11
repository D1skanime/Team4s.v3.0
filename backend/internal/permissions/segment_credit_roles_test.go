package permissions

import (
	"testing"

	"github.com/stretchr/testify/require"
)

// TestSegmentCreditRoleCodes proves the single central definition of
// segment-relevant contributor role codes (Phase 156, Workstream D,
// P156-08/P156-09): exactly {translator, timer, karaoke_fx, typesetter},
// excluding encoder and quality_checker, defined once in this package.
func TestSegmentCreditRoleCodes(t *testing.T) {
	t.Run("contains exactly the four segment-relevant role codes", func(t *testing.T) {
		require.ElementsMatch(t, []string{"translator", "timer", "karaoke_fx", "typesetter"}, SegmentCreditRoleCodes)
	})

	t.Run("never contains encoder or quality_checker", func(t *testing.T) {
		require.NotContains(t, SegmentCreditRoleCodes, "encoder")
		require.NotContains(t, SegmentCreditRoleCodes, "quality_checker")
	})

	t.Run("role constants match the DB role_definitions catalog codes verbatim", func(t *testing.T) {
		require.Equal(t, "translator", RoleTranslator)
		require.Equal(t, "typesetter", RoleTypesetter)
		require.Equal(t, "karaoke_fx", RoleKaraokeFX)
	})
}
