package repository

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

// Phase 129 (Plan 02, Wave 1, RED): server-autoritativer Badge-Fortschritt darf nur aus
// OEFFENTLICHEN Fakten berechnet werden (PMDA-06, PMPR-06). loadBadgeProgress zaehlt fuer
// die "progress"-Familie COUNT(DISTINCT ac.anime_id) WHERE status='confirmed' OHNE
// is_public_on_member_profile-Filter -- eine bestaetigte, aber nicht-oeffentliche
// Contribution blaeht den Fortschritt faelschlich auf.

// TestPhase129BadgeProgressExcludesPrivateConfirmedContributions deckt PMDA-06 ab: ein
// Member mit einer confirmed+public und einer confirmed+private Contribution (distinkte
// Anime) muss im "progress"-Fortschritt genau 1 zaehlen. Der aktuelle Code zaehlt 2
// (beide confirmed, Sichtbarkeit ignoriert) -> ROT. Nach dem Fix (is_public_on_member_
// profile=true ergaenzen) zaehlt er 1.
func TestPhase129BadgeProgressExcludesPrivateConfirmedContributions(t *testing.T) {
	pool := openPhase129Postgres(t)
	repo := NewMemberProfileRepository(pool, "")

	mustExecPhase129(t, pool, `
		INSERT INTO members (id, nickname, public_slug) VALUES (1295001, 'phase129-progress', 'phase129-progress');
		INSERT INTO fansub_groups (id, slug, name, status) VALUES (1295201, 'phase129-progress-grp', 'Phase129 Progress Group', 'active');
		INSERT INTO anime (id, title) VALUES (1295301, 'Phase129 Progress Public'), (1295302, 'Phase129 Progress Private');
		INSERT INTO anime_contributions (id, fansub_group_id, anime_id, member_id, status, is_public_on_member_profile, started_year)
		VALUES (1295401, 1295201, 1295301, 1295001, 'confirmed', true, 2020);
		INSERT INTO anime_contributions (id, fansub_group_id, anime_id, member_id, status, is_public_on_member_profile, started_year)
		VALUES (1295402, 1295201, 1295302, 1295001, 'confirmed', false, 2021);
	`)

	progress, err := repo.loadBadgeProgress(context.Background(), 1295001, 0)
	require.NoError(t, err)

	var found bool
	for _, entry := range progress {
		if entry.Family == "progress" {
			found = true
			require.Equalf(t, int64(1), entry.CurrentCount,
				"PMDA-06: a confirmed-but-private contribution must NOT inflate the public 'progress' badge count; expected 1, got %d", entry.CurrentCount)
		}
	}
	require.True(t, found, "expected a 'progress' badge-progress family entry")
}
