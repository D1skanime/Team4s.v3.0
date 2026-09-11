package repository

// TestAttachReleaseTimelineSegments beweist gegen eine echte, isolierte
// Postgres-Instanz die Kernregeln von Plan 156-06 (P156-10/P156-11/P156-12):
//   - First-Occurrence: ein geteiltes Segment erscheint nur auf seiner ersten
//     zugewiesenen Release-Version, nicht erneut auf einer spaeteren
//   - die First-Occurrence-Regel ist GLOBAL (projektweit), nicht auf die
//     aktuell geladene Cursor-Seite beschraenkt -- eine spaeter geladene
//     Folge zeigt das Segment nicht erneut, nur weil ihre frueher zugewiesene
//     Folge gerade nicht Teil dieses Aufrufs ist
//   - zwei tatsaechlich verschiedene Segmente erscheinen je auf ihrer eigenen
//     First-Occurrence-Folge
//   - der zurueckgelieferte Type kommt aus CanonicalSegmentType, nicht aus
//     einer SQL-LIKE-Heuristik
//   - ein Segment ohne jede Zuweisung fuer die geladenen Release-Versionen
//     erscheint nie -- auch dann nicht, wenn sein start_episode/end_episode
//     die geladene Folge rein rechnerisch abdecken wuerde (Regressionsschutz
//     gegen die alte Bereichs-basierte Ableitung, Pitfall E-1)
//
// Package repository (nicht repository_test), analog zu
// theme_segment_assignments_integration_test.go und
// release_detail_public_segments_integration_test.go -- dieser Test greift
// direkt auf die unexportierte attachReleaseTimelineSegments-Methode zu.
//
// Skips cleanly when TEAM4S_PHASE117_TEST_DSN is unset.

import (
	"context"
	"strconv"
	"testing"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/testsupport"

	"github.com/stretchr/testify/require"
)

func TestAttachReleaseTimelineSegments(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	repo := NewGroupRepository(pool)

	const (
		animeID         = int64(1)
		fansubGroupID   = int64(1)
		themeTypeOPID   = int64(1)
		themeTypeInsID  = int64(2)
		themeOPID       = int64(1)
		themeInsertID   = int64(2)
		segmentAID      = int64(1) // OP, geteilt ueber Folge 1+2 -- Test 1
		segmentBID      = int64(2) // OP, geteilt ueber Folge 3+4 -- Test 2 (Pagination)
		segmentCID      = int64(3) // INSERT, nur Folge 5 -- Test 3
		segmentDID      = int64(4) // OP, Range deckt Folge 6 ab, aber KEINE Zuweisung -- Test 5
	)

	_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES ($1, 'OP1'), ($2, 'INSERT1')`, themeTypeOPID, themeTypeInsID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO themes (id, anime_id, theme_type_id) VALUES ($1, $3, $4), ($2, $3, $5)
	`, themeOPID, themeInsertID, animeID, themeTypeOPID, themeTypeInsID)
	require.NoError(t, err)

	// Acht Folgen (1..8), jede mit eigenem fansub_release + release_version,
	// damit die First-Occurrence-Ordnung ueber echten episodes.sort_index
	// nachgewiesen werden kann statt ueber Einfuegereihenfolge.
	releaseVersionIDs := make(map[int]int64, 8)
	for episodeNum := 1; episodeNum <= 8; episodeNum++ {
		episodeID := int64(100 + episodeNum)
		fansubReleaseID := int64(200 + episodeNum)
		releaseVersionID := int64(300 + episodeNum)
		_, err = pool.Exec(ctx, `INSERT INTO episodes (id, anime_id, sort_index, episode_number) VALUES ($1, $2, $3, $4)`,
			episodeID, animeID, episodeNum, strconv.Itoa(episodeNum))
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2)`, fansubReleaseID, episodeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO release_versions (id, release_id, version) VALUES ($1, $2, 'v1')`, releaseVersionID, fansubReleaseID)
		require.NoError(t, err)
		releaseVersionIDs[episodeNum] = releaseVersionID
	}

	_, err = pool.Exec(ctx, `
		INSERT INTO theme_segments (id, theme_id, fansub_group_id, version, start_episode, end_episode)
		VALUES
			($1, $5, $6, 'v1', NULL, NULL),
			($2, $5, $6, 'v1', NULL, NULL),
			($3, $7, $6, 'v1', NULL, NULL),
			($4, $5, $6, 'v1', 6, 6)
	`, segmentAID, segmentBID, segmentCID, segmentDID, themeOPID, fansubGroupID, themeInsertID)
	require.NoError(t, err)

	_, err = pool.Exec(ctx, `
		INSERT INTO theme_segment_assignments (theme_segment_id, release_version_id) VALUES
			($1, $2), ($1, $3),
			($4, $5), ($4, $6),
			($7, $8)
	`,
		segmentAID, releaseVersionIDs[1], releaseVersionIDs[2],
		segmentBID, releaseVersionIDs[3], releaseVersionIDs[4],
		segmentCID, releaseVersionIDs[5],
	)
	require.NoError(t, err)
	// segmentDID intentionally receives NO row in theme_segment_assignments --
	// its start_episode/end_episode range covers Folge 6, but the point of
	// Test 5 is that this must no longer matter.

	t.Run("erscheint nur bei erster Zuweisung, beide Folgen auf derselben Seite geladen", func(t *testing.T) {
		episodes := []models.EpisodeReleaseSummary{
			{ID: releaseVersionIDs[1]},
			{ID: releaseVersionIDs[2]},
		}
		err := repo.attachReleaseTimelineSegments(ctx, animeID, fansubGroupID, episodes)
		require.NoError(t, err)

		require.Len(t, episodes[0].TimelineSegments, 1, "Folge 1 ist die erste Zuweisung von Segment A")
		require.Equal(t, segmentAID, episodes[0].TimelineSegments[0].ID)
		require.Equal(t, CanonicalSegmentType("OP1"), episodes[0].TimelineSegments[0].Type, "Type muss aus CanonicalSegmentType kommen, nicht aus einer SQL-LIKE-Heuristik")
		require.True(t, episodes[0].HasOP)

		require.Empty(t, episodes[1].TimelineSegments, "Folge 2 ist bereits die zweite Zuweisung desselben theme_segment_id -- darf NICHT erneut erscheinen")
		require.False(t, episodes[1].HasOP)
	})

	t.Run("globale First-Occurrence bleibt korrekt auch wenn die fruehere Folge auf einer anderen Seite liegt", func(t *testing.T) {
		// Nur Folge 4 wird geladen (simuliert eine Cursor-Seite, auf der Folge 3
		// -- die tatsaechlich erste Zuweisung von Segment B -- NICHT enthalten
		// ist). Die First-Occurrence-Pruefung liest die VOLLSTAENDIGE
		// Zuweisungshistorie aus der DB, nicht nur die uebergebenen episodes.
		episodes := []models.EpisodeReleaseSummary{
			{ID: releaseVersionIDs[4]},
		}
		err := repo.attachReleaseTimelineSegments(ctx, animeID, fansubGroupID, episodes)
		require.NoError(t, err)

		require.Empty(t, episodes[0].TimelineSegments, "Folge 4 ist NICHT die globale erste Zuweisung von Segment B (das ist Folge 3) -- darf trotz fehlender Folge 3 in dieser Seite nicht erscheinen")
	})

	t.Run("zwei tatsaechlich verschiedene Segmente erscheinen je auf eigener First-Occurrence-Folge", func(t *testing.T) {
		episodes := []models.EpisodeReleaseSummary{
			{ID: releaseVersionIDs[1]},
			{ID: releaseVersionIDs[5]},
		}
		err := repo.attachReleaseTimelineSegments(ctx, animeID, fansubGroupID, episodes)
		require.NoError(t, err)

		require.Len(t, episodes[0].TimelineSegments, 1)
		require.Equal(t, segmentAID, episodes[0].TimelineSegments[0].ID)
		require.Equal(t, "OP", episodes[0].TimelineSegments[0].Type)

		require.Len(t, episodes[1].TimelineSegments, 1)
		require.Equal(t, segmentCID, episodes[1].TimelineSegments[0].ID)
		require.Equal(t, "INSERT", episodes[1].TimelineSegments[0].Type)
		require.Equal(t, CanonicalSegmentType("INSERT1"), episodes[1].TimelineSegments[0].Type)
	})

	t.Run("ein Segment ohne jede Zuweisung erscheint nie -- auch wenn seine Range die Folge rechnerisch abdeckt", func(t *testing.T) {
		episodes := []models.EpisodeReleaseSummary{
			{ID: releaseVersionIDs[6]},
		}
		err := repo.attachReleaseTimelineSegments(ctx, animeID, fansubGroupID, episodes)
		require.NoError(t, err)

		require.Empty(t, episodes[0].TimelineSegments, "Segment D hat keine theme_segment_assignments-Zeile -- die alte Bereichs-basierte Ableitung darf nicht mehr wirken")
	})
}
