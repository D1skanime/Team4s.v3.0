package repository

import (
	"context"
	"fmt"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/stretchr/testify/require"
)

// TestEnsureThemeSegmentOrigin beweist die sieben planvorgegebenen Verhaltensfaelle von
// ensureThemeSegmentOriginTx (Phase 156, Plan 156-16, Task 1) direkt gegen echtes, isoliertes
// Postgres -- jeder Subtest ruft die Funktion selbst innerhalb einer eigenen Transaktion auf und
// liest den Zustand danach aus der Datenbank zurueck, nie aus dem eigenen Quelltext.
func TestEnsureThemeSegmentOrigin(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()

	const (
		animeID       = int64(1)
		fansubGroupID = int64(1)
		themeTypeID   = int64(1)
		themeID       = int64(1)
	)

	_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES ($1, 'OP1')`, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id) VALUES ($1, $2, $3)`, themeID, animeID, themeTypeID)
	require.NoError(t, err)

	// Der Contributor-Cleanup-Pfad (loadPublicEffectiveContributors) braucht Tabellen ausserhalb
	// dieser Migrationsfamilie -- exakt derselbe lokale Schema-Shim wie
	// theme_segment_origin_integration_test.go / release_detail_public_repository_segment_credits_test.go.
	_, err = pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS visibilities (
			id BIGSERIAL PRIMARY KEY,
			name TEXT NOT NULL UNIQUE
		);
		INSERT INTO visibilities (name) VALUES ('public') ON CONFLICT (name) DO NOTHING;

		ALTER TABLE members ADD COLUMN IF NOT EXISTS profile_visibility TEXT NOT NULL DEFAULT 'members_only';
		ALTER TABLE members ADD COLUMN IF NOT EXISTS public_slug TEXT;

		CREATE TABLE IF NOT EXISTS anime_contributions (
			id BIGSERIAL PRIMARY KEY,
			fansub_group_id BIGINT NOT NULL,
			anime_id BIGINT NOT NULL,
			member_id BIGINT NOT NULL REFERENCES members(id),
			release_version_id BIGINT NULL REFERENCES release_versions(id),
			is_public_on_anime_page BOOLEAN NOT NULL DEFAULT false,
			visibility_id BIGINT NULL REFERENCES visibilities(id)
		);

		CREATE TABLE IF NOT EXISTS anime_contribution_roles (
			id BIGSERIAL PRIMARY KEY,
			anime_contribution_id BIGINT NOT NULL REFERENCES anime_contributions(id) ON DELETE CASCADE,
			role_code TEXT NOT NULL
		);
	`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO role_definitions (code, label_de) VALUES ('translator', 'Übersetzung')
		ON CONFLICT (code) DO NOTHING
	`)
	require.NoError(t, err)

	const publicVisibilityID = int64(1)

	// seedEpisodeReleaseVersion legt eine Episode + fansub_release + release_version an und
	// verknuepft sie mit fansubGroupID. id ist die gemeinsame Basis fuer alle drei Zeilen-IDs.
	seedEpisodeReleaseVersion := func(t *testing.T, id int64, sortIndex int) int64 {
		t.Helper()
		episodeID, releaseID, releaseVersionID := id, id+1, id+2
		_, err := pool.Exec(ctx, `INSERT INTO episodes (id, anime_id, sort_index, episode_number) VALUES ($1, $2, $3, $4)`,
			episodeID, animeID, sortIndex, fmt.Sprint(sortIndex))
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2)`, releaseID, episodeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO release_versions (id, release_id, version) VALUES ($1, $2, 'v1')`, releaseVersionID, releaseID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $2)`, releaseVersionID, fansubGroupID)
		require.NoError(t, err)
		return releaseVersionID
	}

	seedSegment := func(t *testing.T) int64 {
		t.Helper()
		var segmentID int64
		err := pool.QueryRow(ctx, `
			INSERT INTO theme_segments (theme_id, fansub_group_id, version, start_episode, end_episode)
			VALUES ($1, $2, 'v1', 1, 1)
			RETURNING id
		`, themeID, fansubGroupID).Scan(&segmentID)
		require.NoError(t, err)
		return segmentID
	}

	assignSegment := func(t *testing.T, segmentID, releaseVersionID int64) {
		t.Helper()
		_, err := pool.Exec(ctx, `
			INSERT INTO theme_segment_assignments (theme_segment_id, release_version_id) VALUES ($1, $2)
		`, segmentID, releaseVersionID)
		require.NoError(t, err)
	}

	unassignSegment := func(t *testing.T, segmentID, releaseVersionID int64) {
		t.Helper()
		_, err := pool.Exec(ctx, `
			DELETE FROM theme_segment_assignments WHERE theme_segment_id = $1 AND release_version_id = $2
		`, segmentID, releaseVersionID)
		require.NoError(t, err)
	}

	setOrigin := func(t *testing.T, segmentID int64, releaseVersionID *int64) {
		t.Helper()
		_, err := pool.Exec(ctx, `UPDATE theme_segments SET origin_release_version_id = $2 WHERE id = $1`, segmentID, releaseVersionID)
		require.NoError(t, err)
	}

	readOrigin := func(t *testing.T, segmentID int64) *int64 {
		t.Helper()
		var origin *int64
		require.NoError(t, pool.QueryRow(ctx, `SELECT origin_release_version_id FROM theme_segments WHERE id = $1`, segmentID).Scan(&origin))
		return origin
	}

	addContribution := func(t *testing.T, memberID, releaseVersionID int64) {
		t.Helper()
		_, err := pool.Exec(ctx, `INSERT INTO members (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`, memberID)
		require.NoError(t, err)
		var contributionID int64
		err = pool.QueryRow(ctx, `
			INSERT INTO anime_contributions (fansub_group_id, anime_id, member_id, release_version_id, is_public_on_anime_page, visibility_id)
			VALUES ($1, $2, $3, $4, true, $5)
			RETURNING id
		`, fansubGroupID, animeID, memberID, releaseVersionID, publicVisibilityID).Scan(&contributionID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO anime_contribution_roles (anime_contribution_id, role_code) VALUES ($1, 'translator')`, contributionID)
		require.NoError(t, err)
	}

	addSegmentContributorSelection := func(t *testing.T, segmentID, memberID int64) {
		t.Helper()
		_, err := pool.Exec(ctx, `INSERT INTO members (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`, memberID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO theme_segment_contributors (theme_segment_id, member_id) VALUES ($1, $2)`, segmentID, memberID)
		require.NoError(t, err)
	}

	callEnsure := func(t *testing.T, segmentID int64) *ThemeSegmentOriginSyncOutcome {
		t.Helper()
		tx, err := pool.Begin(ctx)
		require.NoError(t, err)
		defer func() { _ = tx.Rollback(ctx) }()
		outcome, err := ensureThemeSegmentOriginTx(ctx, tx, segmentID)
		require.NoError(t, err)
		require.NoError(t, tx.Commit(ctx))
		return outcome
	}

	repo := NewAdminContentRepository(pool)

	t.Run("1: eine gueltige aktuelle Origin bleibt unveraendert, obwohl eine Zuweisung mit niedrigerer Episode existiert", func(t *testing.T) {
		segmentID := seedSegment(t)
		rvLow := seedEpisodeReleaseVersion(t, 10100, 1)
		rvHigh := seedEpisodeReleaseVersion(t, 10200, 2)
		assignSegment(t, segmentID, rvLow)
		assignSegment(t, segmentID, rvHigh)
		setOrigin(t, segmentID, &rvHigh)

		outcome := callEnsure(t, segmentID)
		require.False(t, outcome.Changed)
		require.NotNil(t, outcome.Before)
		require.Equal(t, rvHigh, *outcome.Before)
		require.NotNil(t, outcome.After)
		require.Equal(t, rvHigh, *outcome.After)
		require.Zero(t, outcome.RemovedContributorCount)

		got := readOrigin(t, segmentID)
		require.NotNil(t, got)
		require.Equal(t, rvHigh, *got, "eine gueltige Origin darf nicht auf die niedrigere Episode verschoben werden")
	})

	t.Run("2: eine Origin auf eine nicht mehr zugewiesene Release-Version wird auf die korrekte verbleibende Zuweisung neu berechnet", func(t *testing.T) {
		segmentID := seedSegment(t)
		rvStale := seedEpisodeReleaseVersion(t, 20100, 1)
		rvKeptLow := seedEpisodeReleaseVersion(t, 20200, 2)
		rvKeptHigh := seedEpisodeReleaseVersion(t, 20300, 3)
		assignSegment(t, segmentID, rvKeptLow)
		assignSegment(t, segmentID, rvKeptHigh)
		// rvStale ist absichtlich NICHT (mehr) zugewiesen -- simuliert eine veraltete Origin nach
		// einer Bereichsaenderung (GAP-04).
		setOrigin(t, segmentID, &rvStale)

		outcome := callEnsure(t, segmentID)
		require.True(t, outcome.Changed)
		require.NotNil(t, outcome.Before)
		require.Equal(t, rvStale, *outcome.Before)
		require.NotNil(t, outcome.After)
		require.Equal(t, rvKeptLow, *outcome.After, "die niedrigste verbleibende Episode muss gewinnen")

		got := readOrigin(t, segmentID)
		require.NotNil(t, got)
		require.Equal(t, rvKeptLow, *got)
	})

	t.Run("3: ein Segment ohne verbleibende Zuweisung erhaelt Origin NULL, wenn vorher ein Wert gesetzt war", func(t *testing.T) {
		segmentID := seedSegment(t)
		rv := seedEpisodeReleaseVersion(t, 30100, 1)
		assignSegment(t, segmentID, rv)
		setOrigin(t, segmentID, &rv)
		unassignSegment(t, segmentID, rv)

		outcome := callEnsure(t, segmentID)
		require.True(t, outcome.Changed)
		require.NotNil(t, outcome.Before)
		require.Equal(t, rv, *outcome.Before)
		require.Nil(t, outcome.After)

		got := readOrigin(t, segmentID)
		require.Nil(t, got)
	})

	t.Run("4: ein frisches Segment mit NULL Origin und keinen Zuweisungen bleibt NULL, Changed=false", func(t *testing.T) {
		segmentID := seedSegment(t)

		outcome := callEnsure(t, segmentID)
		require.False(t, outcome.Changed)
		require.Nil(t, outcome.Before)
		require.Nil(t, outcome.After)
		require.Zero(t, outcome.RemovedContributorCount)

		got := readOrigin(t, segmentID)
		require.Nil(t, got)
	})

	t.Run("5 (Case H): ein tatsaechlicher Origin-Wechsel entfernt atomar eine jetzt ungueltige Contributor-Auswahl", func(t *testing.T) {
		segmentID := seedSegment(t)
		rvA := seedEpisodeReleaseVersion(t, 50100, 1)
		rvB := seedEpisodeReleaseVersion(t, 50200, 2)
		assignSegment(t, segmentID, rvA)
		assignSegment(t, segmentID, rvB)
		setOrigin(t, segmentID, &rvA)

		const caseHMemberID = int64(55501)
		addContribution(t, caseHMemberID, rvA)
		addSegmentContributorSelection(t, segmentID, caseHMemberID)

		// Simuliert eine Bereichsverkuerzung, die rvA aus der Zuweisungsmenge entfernt -- die
		// Origin rvA ist danach ungueltig und muss auf rvB neu berechnet werden.
		unassignSegment(t, segmentID, rvA)

		outcome := callEnsure(t, segmentID)
		require.True(t, outcome.Changed)
		require.NotNil(t, outcome.Before)
		require.Equal(t, rvA, *outcome.Before)
		require.NotNil(t, outcome.After)
		require.Equal(t, rvB, *outcome.After)
		require.Equal(t, 1, outcome.RemovedContributorCount)

		ids, err := repo.GetThemeSegmentContributorMemberIDs(ctx, segmentID)
		require.NoError(t, err)
		require.Empty(t, ids, "die jetzt ungueltige Auswahl muss entfernt sein")
	})

	t.Run("6: wenn die neue Origin NULL ist, werden ALLE Contributor-Zeilen des Segments entfernt", func(t *testing.T) {
		segmentID := seedSegment(t)
		rv := seedEpisodeReleaseVersion(t, 60100, 1)
		assignSegment(t, segmentID, rv)
		setOrigin(t, segmentID, &rv)

		const memberID = int64(60601)
		addContribution(t, memberID, rv)
		addSegmentContributorSelection(t, segmentID, memberID)

		unassignSegment(t, segmentID, rv)

		outcome := callEnsure(t, segmentID)
		require.True(t, outcome.Changed)
		require.Nil(t, outcome.After)
		require.Equal(t, 1, outcome.RemovedContributorCount)

		ids, err := repo.GetThemeSegmentContributorMemberIDs(ctx, segmentID)
		require.NoError(t, err)
		require.Empty(t, ids)
	})

	t.Run("7: keine Contributor-Zeile wird jemals als Nebenwirkung eingefuegt, auch wenn die neue Origin einen gueltigen Kandidaten haette", func(t *testing.T) {
		segmentID := seedSegment(t)
		rvStale := seedEpisodeReleaseVersion(t, 70100, 1)
		rvNew := seedEpisodeReleaseVersion(t, 70200, 2)
		assignSegment(t, segmentID, rvNew)
		setOrigin(t, segmentID, &rvStale)

		// memberID ist ein gueltiger effektiver Contributor der NEUEN Origin -- ohne jede
		// vorherige theme_segment_contributors-Auswahl. Eine automatische Auswahl waere hier ein
		// stiller Regelverstoss (P156-05/P156-06: keine Auto-Selektion).
		const memberID = int64(70701)
		addContribution(t, memberID, rvNew)

		idsBefore, err := repo.GetThemeSegmentContributorMemberIDs(ctx, segmentID)
		require.NoError(t, err)
		require.Empty(t, idsBefore)

		outcome := callEnsure(t, segmentID)
		require.True(t, outcome.Changed)
		require.NotNil(t, outcome.After)
		require.Equal(t, rvNew, *outcome.After)
		require.Zero(t, outcome.RemovedContributorCount, "nichts existierte, also gibt es nichts zu entfernen")

		idsAfter, err := repo.GetThemeSegmentContributorMemberIDs(ctx, segmentID)
		require.NoError(t, err)
		require.Empty(t, idsAfter, "ensureThemeSegmentOriginTx darf niemals einen Contributor automatisch auswaehlen")
	})
}
