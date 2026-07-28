package repository

import (
	"testing"

	"github.com/stretchr/testify/require"
)

// TestHighestContribProjectsTier deckt die Grenzwerte der Familie-1-Schwellenlogik
// (Bronze 1 / Silber 5 / Gold 15, D-02) DB-frei ab.
func TestHighestContribProjectsTier(t *testing.T) {
	require.Equal(t, "", highestContribProjectsTier(0))
	require.Equal(t, "bronze", highestContribProjectsTier(1))
	require.Equal(t, "bronze", highestContribProjectsTier(4))
	require.Equal(t, "silver", highestContribProjectsTier(5))
	require.Equal(t, "silver", highestContribProjectsTier(14))
	require.Equal(t, "gold", highestContribProjectsTier(15))
}

// TestHighestContribChronicleTier deckt die Grenzwerte der Familie-2-Schwellenlogik
// (Bronze 10 / Silber 50 / Gold 150, D-03) DB-frei ab.
func TestHighestContribChronicleTier(t *testing.T) {
	require.Equal(t, "", highestContribChronicleTier(9))
	require.Equal(t, "bronze", highestContribChronicleTier(10))
	require.Equal(t, "bronze", highestContribChronicleTier(49))
	require.Equal(t, "silver", highestContribChronicleTier(50))
	require.Equal(t, "silver", highestContribChronicleTier(149))
	require.Equal(t, "gold", highestContribChronicleTier(150))
}

// TestHighestContribArchivistTier deckt die Grenzwerte der Familie-3-Schwellenlogik
// (Bronze 10 / Silber 50 / Gold 150, D-04) DB-frei ab.
func TestHighestContribArchivistTier(t *testing.T) {
	require.Equal(t, "", highestContribArchivistTier(9))
	require.Equal(t, "bronze", highestContribArchivistTier(10))
	require.Equal(t, "bronze", highestContribArchivistTier(49))
	require.Equal(t, "silver", highestContribArchivistTier(50))
	require.Equal(t, "silver", highestContribArchivistTier(149))
	require.Equal(t, "gold", highestContribArchivistTier(150))
}
