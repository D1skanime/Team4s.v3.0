package repository

import (
	"testing"

	"github.com/stretchr/testify/require"
)

// Plan 150-07 (D-30, siebte Fundstelle): reine In-Memory-Unit-Tests fuer
// roleVolumeThresholdForBadgeCode -- kein Postgres-Fixture noetig, weil die Funktion nur ueber
// das bereits exportierte, kleine badges.RoleVolume.Tiers-Slice scannt (keine Query).
func TestRoleVolumeThresholdForBadgeCode(t *testing.T) {
	t.Run("role_volume gold tier resolves to 320", func(t *testing.T) {
		threshold := roleVolumeThresholdForBadgeCode("role_volume_translator_gold")
		require.NotNil(t, threshold)
		require.Equal(t, int64(320), *threshold)
	})

	t.Run("underscore-containing role code (quality_checker) resolves via known tier suffix, not naive split", func(t *testing.T) {
		threshold := roleVolumeThresholdForBadgeCode("role_volume_quality_checker_bronze")
		require.NotNil(t, threshold)
		require.Equal(t, int64(12), *threshold)
	})

	t.Run("non-role_volume badge code returns nil", func(t *testing.T) {
		threshold := roleVolumeThresholdForBadgeCode("first_contribution")
		require.Nil(t, threshold)
	})

	t.Run("malformed/unknown tier suffix returns nil defensively", func(t *testing.T) {
		threshold := roleVolumeThresholdForBadgeCode("role_volume_translator_unknowntier")
		require.Nil(t, threshold)
	})
}
