package repository

import (
	"context"
	"errors"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/stretchr/testify/require"
)

// TestSetThemeSegmentOrigin beweist gegen eine echte, isolierte Postgres-Instanz die vier
// planvorgegebenen Verhaltensfaelle von SetThemeSegmentOrigin (Phase 156, Workstream C, Task 1):
//  1. Setzen der Origin auf eine dem Segment zugewiesene release_version_id gelingt, und ein
//     nachfolgendes Lesen zeigt den neuen Wert.
//  2. Setzen der Origin auf eine NICHT zugewiesene release_version_id wird mit ErrConflict
//     abgelehnt, die Spalte bleibt unveraendert (kein stilles Uebernehmen, kein Klemmen).
//  3. Setzen der Origin auf eine nicht existierende segmentID liefert ErrNotFound.
//  4. ListAnimeSegments und GetAnimeSegmentByID liefern beide die aktuelle
//     OriginReleaseVersionID (nil vor dem Setzen, befuellt danach).
//
// Skips cleanly when TEAM4S_PHASE117_TEST_DSN is unset.
func TestSetThemeSegmentOrigin(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	repo := NewAdminContentRepository(pool)

	const (
		animeID             = int64(1)
		episodeID           = int64(1)
		fansubGroupID       = int64(1)
		fansubReleaseID     = int64(1)
		releaseVersionA     = int64(10)
		releaseVersionB     = int64(20)
		releaseVersionThird = int64(30) // niemals zugewiesen -- fuer den Konflikt-Testfall
		themeTypeID         = int64(1)
		themeID             = int64(1)
	)

	_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO episodes (id, anime_id, sort_index, episode_number) VALUES ($1, $2, 1, '1')`, episodeID, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2)`, fansubReleaseID, episodeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_versions (id, release_id, version) VALUES ($1, $4, 'v1'), ($2, $4, 'v1'), ($3, $4, 'v1')
	`, releaseVersionA, releaseVersionB, releaseVersionThird, fansubReleaseID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $4), ($2, $4), ($3, $4)
	`, releaseVersionA, releaseVersionB, releaseVersionThird, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES ($1, 'OP1')`, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id) VALUES ($1, $2, $3)`, themeID, animeID, themeTypeID)
	require.NoError(t, err)

	// Seit Plan 156-12/GAP-01 laedt SetThemeSegmentOrigin bei jedem erfolgreichen Setzen die
	// effektiven Contributors der NEUEN Origin (fuer den atomaren Cleanup nicht mehr gueltiger
	// theme_segment_contributors-Zeilen) -- ohne diese lokale Fixture-Ergaenzung (mirrors
	// release_detail_public_repository_segment_credits_test.go/Plan 156-03s Praezedenzfall)
	// scheitert jeder erfolgreiche Fall an der fehlenden anime_contributions-Tabelle.
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

	var segmentID int64
	err = pool.QueryRow(ctx, `
		INSERT INTO theme_segments (theme_id, fansub_group_id, version, start_episode, end_episode)
		VALUES ($1, $2, 'v1', 1, 1)
		RETURNING id
	`, themeID, fansubGroupID).Scan(&segmentID)
	require.NoError(t, err)

	_, err = repo.AssignThemeSegmentToReleaseVersion(ctx, segmentID, releaseVersionA)
	require.NoError(t, err)
	_, err = repo.AssignThemeSegmentToReleaseVersion(ctx, segmentID, releaseVersionB)
	require.NoError(t, err)

	// CR-01 (156-REVIEW.md, Folge-Fix zu Plan 156-16): AssignThemeSegmentToReleaseVersion ruft
	// seit diesem Fix selbst ensureThemeSegmentOriginTx auf, damit die manuelle Einzel-Zuweisung
	// nicht mehr die GAP-05-Erscheinungsform reproduziert (frisches Segment bleibt fuer immer
	// NULL). Die Vorbereitung oben (zwei AssignThemeSegmentToReleaseVersion-Aufrufe) setzt die
	// Origin dadurch bereits VOR jedem expliziten SetThemeSegmentOrigin-Aufruf automatisch auf
	// releaseVersionA (beide Ziele haben dieselbe Episode, release_version_id ASC entscheidet).
	t.Run("die vorbereitenden manuellen Zuweisungen haben die Origin bereits automatisch gesetzt (CR-01)", func(t *testing.T) {
		segments, err := repo.ListAnimeSegments(ctx, animeID, fansubGroupID, "v1", 0)
		require.NoError(t, err)
		require.Len(t, segments, 1)
		require.NotNil(t, segments[0].OriginReleaseVersionID, "die manuelle Einzel-Zuweisung muss die Origin automatisch gesetzt haben")
		require.Equal(t, releaseVersionA, *segments[0].OriginReleaseVersionID)

		got, err := repo.GetAnimeSegmentByID(ctx, animeID, segmentID, 0)
		require.NoError(t, err)
		require.NotNil(t, got.OriginReleaseVersionID)
		require.Equal(t, releaseVersionA, *got.OriginReleaseVersionID)
	})

	t.Run("Setzen auf eine zugewiesene release_version_id gelingt und ist danach lesbar", func(t *testing.T) {
		_, err := repo.SetThemeSegmentOrigin(ctx, segmentID, releaseVersionA)
		require.NoError(t, err)

		var origin *int64
		err = pool.QueryRow(ctx, `SELECT origin_release_version_id FROM theme_segments WHERE id = $1`, segmentID).Scan(&origin)
		require.NoError(t, err)
		require.NotNil(t, origin)
		require.Equal(t, releaseVersionA, *origin)

		got, err := repo.GetAnimeSegmentByID(ctx, animeID, segmentID, 0)
		require.NoError(t, err)
		require.NotNil(t, got.OriginReleaseVersionID)
		require.Equal(t, releaseVersionA, *got.OriginReleaseVersionID)

		segments, err := repo.ListAnimeSegments(ctx, animeID, fansubGroupID, "v1", 0)
		require.NoError(t, err)
		require.Len(t, segments, 1)
		require.NotNil(t, segments[0].OriginReleaseVersionID)
		require.Equal(t, releaseVersionA, *segments[0].OriginReleaseVersionID)
	})

	t.Run("Setzen auf eine NICHT zugewiesene release_version_id wird abgelehnt, Spalte bleibt unveraendert", func(t *testing.T) {
		_, err := repo.SetThemeSegmentOrigin(ctx, segmentID, releaseVersionThird)
		require.Error(t, err)
		require.True(t, errors.Is(err, ErrConflict))

		// unveraendert: der vorherige Test hat die Origin bereits auf releaseVersionA gesetzt.
		var origin *int64
		queryErr := pool.QueryRow(ctx, `SELECT origin_release_version_id FROM theme_segments WHERE id = $1`, segmentID).Scan(&origin)
		require.NoError(t, queryErr)
		require.NotNil(t, origin)
		require.Equal(t, releaseVersionA, *origin, "ein abgelehntes Ziel darf die Spalte nicht veraendern")
	})

	t.Run("Setzen auf eine nicht existierende segmentID liefert ErrNotFound", func(t *testing.T) {
		const missingSegmentID = int64(999999)
		_, err := repo.SetThemeSegmentOrigin(ctx, missingSegmentID, releaseVersionA)
		require.Error(t, err)
		require.True(t, errors.Is(err, ErrNotFound))
	})

	t.Run("segmentID/releaseVersionID<=0 liefert ErrNotFound ohne DB-Zugriff", func(t *testing.T) {
		_, err := repo.SetThemeSegmentOrigin(ctx, 0, releaseVersionA)
		require.True(t, errors.Is(err, ErrNotFound))
		_, err = repo.SetThemeSegmentOrigin(ctx, segmentID, 0)
		require.True(t, errors.Is(err, ErrNotFound))
	})

	// Case H (156-UAT.md Regressionsmatrix): ein Segment traegt eine
	// theme_segment_contributors-Auswahl fuer einen Contributor von Origin A, der KEIN
	// effektiver Contributor von Origin B ist -- das Setzen der Origin auf B muss diese
	// Auswahl im SELBEN Commit wie das origin_release_version_id-UPDATE entfernen und die
	// Anzahl melden (T-156-21/T-156-22).
	t.Run("Case H: Origin-Wechsel entfernt atomar eine jetzt ungueltige Contributor-Auswahl", func(t *testing.T) {
		const publicVisibilityID = int64(1)
		const caseHMemberID = int64(555)
		_, err := pool.Exec(ctx, `INSERT INTO members (id) VALUES ($1)`, caseHMemberID)
		require.NoError(t, err)

		var contributionID int64
		err = pool.QueryRow(ctx, `
			INSERT INTO anime_contributions (fansub_group_id, anime_id, member_id, release_version_id, is_public_on_anime_page, visibility_id)
			VALUES ($1, $2, $3, $4, true, $5)
			RETURNING id
		`, fansubGroupID, animeID, caseHMemberID, releaseVersionA, publicVisibilityID).Scan(&contributionID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO anime_contribution_roles (anime_contribution_id, role_code) VALUES ($1, 'translator')`, contributionID)
		require.NoError(t, err)

		// Origin ist bereits auf releaseVersionA (siehe voriger Subtest). caseHMemberID ist
		// effektiver Contributor von A, aber NICHT von B -- die Segment-Auswahl wird direkt
		// referenziert, ohne ueber SetThemeSegmentContributors' eigene Validierung zu laufen,
		// um den Cleanup-Pfad isoliert zu pruefen.
		_, err = pool.Exec(ctx, `
			INSERT INTO theme_segment_contributors (theme_segment_id, member_id) VALUES ($1, $2)
		`, segmentID, caseHMemberID)
		require.NoError(t, err)

		removedContributorCount, err := repo.SetThemeSegmentOrigin(ctx, segmentID, releaseVersionB)
		require.NoError(t, err)
		require.Equal(t, 1, removedContributorCount)

		ids, err := repo.GetThemeSegmentContributorMemberIDs(ctx, segmentID)
		require.NoError(t, err)
		require.Empty(t, ids, "die jetzt ungueltige Auswahl muss entfernt sein")
	})
}
