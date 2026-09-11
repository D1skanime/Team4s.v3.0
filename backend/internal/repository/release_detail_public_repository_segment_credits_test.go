package repository

// TestReleaseDetailPublicSegmentOriginCredits beweist gegen eine echte, isolierte
// Postgres-Instanz die Origin-basierte, rollen-code-gefilterte Segment-Credit-
// Projektion (P156-07/P156-08/P156-09, Plan 156-07 Task 1):
//   - ein Segment, dessen ORIGIN-Release-Version keine Beteiligten hat, liefert eine
//     leere (nicht nil) Participants-Liste, keinen Fehler
//   - ein Segment, dessen ORIGIN-Release-Version einen Uebersetzer und einen Timer
//     hat, liefert beide inkl. ihrer RoleCodes
//   - eine Korrektur der Beteiligten-Rollen auf der ORIGIN-Release-Version (ohne das
//     Segment selbst anzufassen) wirkt sich sofort auf den NAECHSTEN Aufruf aus (live)
//   - ein neu hinzugefuegter Beteiligter auf der ORIGIN-Release-Version erscheint beim
//     naechsten Aufruf
//   - ein Encoder/Quality-Checker auf der ORIGIN-Release-Version erscheint NIE als
//     Segment-Credit, obwohl er ein echter, oeffentlich sichtbarer Beteiligter ist
//   - origin_release_version_id IS NULL liefert eine leere Participants-Liste, keinen
//     Fehler und keine geratene Ersatzquelle
//   - Type entspricht CanonicalSegmentType(rawTypeName), kein roher Passthrough
//
// Package repository (nicht repository_test), analog zu
// release_detail_public_segments_integration_test.go -- dieser Test greift direkt auf
// die unexportierte loadReleaseSegments-Methode zu.
//
// Skips cleanly when TEAM4S_PHASE117_TEST_DSN is unset.

import (
	"context"
	"fmt"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/stretchr/testify/require"
)

func TestReleaseDetailPublicSegmentOriginCredits(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	repo := NewReleaseDetailPublicRepository(pool, "")

	// Ergaenzt die geteilte Phase-117-Test-Fixture (theme_segments.
	// origin_release_version_id existiert bereits seit Migration 0161) LOKAL, nur in
	// dieser Testdatei, um die Tabellen, die loadPublicEffectiveContributors fuer die
	// Beteiligten-Aufloesung braucht (anime_contributions/anime_contribution_roles/
	// visibilities, members.profile_visibility/public_slug) -- mirrors Plan 156-03s
	// Praezedenzfall (lokale Fixture-Ergaenzung statt Aenderung an
	// testsupport/phase117_postgres.go, siehe 156-03-SUMMARY.md).
	_, err := pool.Exec(ctx, `
		CREATE TABLE visibilities (
			id BIGSERIAL PRIMARY KEY,
			name TEXT NOT NULL UNIQUE
		);
		INSERT INTO visibilities (name) VALUES ('public');

		ALTER TABLE members ADD COLUMN IF NOT EXISTS profile_visibility TEXT NOT NULL DEFAULT 'members_only';
		ALTER TABLE members ADD COLUMN IF NOT EXISTS public_slug TEXT;

		CREATE TABLE anime_contributions (
			id BIGSERIAL PRIMARY KEY,
			fansub_group_id BIGINT NOT NULL,
			anime_id BIGINT NOT NULL,
			member_id BIGINT NOT NULL REFERENCES members(id),
			release_version_id BIGINT NULL REFERENCES release_versions(id),
			is_public_on_anime_page BOOLEAN NOT NULL DEFAULT false,
			visibility_id BIGINT NULL REFERENCES visibilities(id)
		);

		CREATE TABLE anime_contribution_roles (
			id BIGSERIAL PRIMARY KEY,
			anime_contribution_id BIGINT NOT NULL REFERENCES anime_contributions(id) ON DELETE CASCADE,
			role_code TEXT NOT NULL
		);
	`)
	require.NoError(t, err)

	_, err = pool.Exec(ctx, `
		INSERT INTO role_definitions (code, label_de) VALUES
			('translator', 'Übersetzung'),
			('timer', 'Timing'),
			('typesetter', 'Typesetting'),
			('karaoke_fx', 'Karaoke-Effekte'),
			('encoder', 'Encoding'),
			('quality_checker', 'Qualitätsprüfung')
	`)
	require.NoError(t, err)

	const (
		animeID       = int64(1)
		fansubGroupID = int64(1)
		themeTypeID   = int64(1)
		themeID       = int64(1)

		publicVisibilityID = int64(1)
	)

	_, err = pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES ($1, 'OP1')`, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id, title) VALUES ($1, $2, $3, 'Moonlight')`, themeID, animeID, themeTypeID)
	require.NoError(t, err)

	// newReleaseVersion legt eine minimale Episode/Release/Version-Kette an --
	// jede Origin-Release-Version braucht ihren eigenen Fansub-Release/Episode-Pfad,
	// damit loadPublicEffectiveContributors' release_context-CTE (JOIN
	// fansub_releases/episodes) sie aufloesen kann.
	nextID := int64(1)
	newReleaseVersion := func(t *testing.T) int64 {
		t.Helper()
		episodeID := nextID
		releaseID := nextID
		releaseVersionID := nextID
		nextID++
		_, err := pool.Exec(ctx, `INSERT INTO episodes (id, anime_id, sort_index, episode_number) VALUES ($1, $2, $3, $4)`, episodeID, animeID, episodeID, fmt.Sprintf("%d", episodeID))
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2)`, releaseID, episodeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO release_versions (id, release_id, version) VALUES ($1, $2, 'v1')`, releaseVersionID, releaseID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $2)`, releaseVersionID, fansubGroupID)
		require.NoError(t, err)
		return releaseVersionID
	}

	newSegment := func(t *testing.T, originReleaseVersionID *int64) int64 {
		t.Helper()
		segmentID := nextID
		nextID++
		_, err := pool.Exec(ctx, `INSERT INTO theme_segments (id, theme_id, origin_release_version_id) VALUES ($1, $2, $3)`, segmentID, themeID, originReleaseVersionID)
		require.NoError(t, err)
		return segmentID
	}

	assignSegment := func(t *testing.T, segmentID, releaseVersionID int64) {
		t.Helper()
		_, err := pool.Exec(ctx, `INSERT INTO theme_segment_assignments (theme_segment_id, release_version_id) VALUES ($1, $2)`, segmentID, releaseVersionID)
		require.NoError(t, err)
	}

	newPublicContribution := func(t *testing.T, memberID, memberOriginReleaseVersionID int64, roleCode string) {
		t.Helper()
		_, err := pool.Exec(ctx, `INSERT INTO members (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`, memberID)
		require.NoError(t, err)
		var contributionID int64
		err = pool.QueryRow(ctx, `
			INSERT INTO anime_contributions (fansub_group_id, anime_id, member_id, release_version_id, is_public_on_anime_page, visibility_id)
			VALUES ($1, $2, $3, $4, true, $5)
			RETURNING id
		`, fansubGroupID, animeID, memberID, memberOriginReleaseVersionID, publicVisibilityID).Scan(&contributionID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO anime_contribution_roles (anime_contribution_id, role_code) VALUES ($1, $2)`, contributionID, roleCode)
		require.NoError(t, err)
	}

	viewedReleaseVersionID := newReleaseVersion(t)

	t.Run("Test1: Origin mit null Beteiligten liefert leere, nicht-nil Participants", func(t *testing.T) {
		originID := newReleaseVersion(t)
		segmentID := newSegment(t, &originID)
		assignSegment(t, segmentID, viewedReleaseVersionID)

		segments, err := repo.loadReleaseSegments(ctx, animeID, fansubGroupID, viewedReleaseVersionID, "v1", "1", nil)
		require.NoError(t, err)

		var found *PublicReleaseSegment
		for i := range segments {
			if segments[i].ThemeSegmentID == segmentID {
				found = &segments[i]
			}
		}
		require.NotNil(t, found, "Segment muss in der Ergebnisliste enthalten sein")
		require.NotNil(t, found.Participants, "Participants darf nicht nil sein")
		require.Empty(t, found.Participants, "Origin hat keine Beteiligten -- Participants muss leer sein")
	})

	t.Run("Test2: Origin mit Uebersetzer+Timer liefert beide inkl. RoleCodes", func(t *testing.T) {
		originID := newReleaseVersion(t)
		segmentID := newSegment(t, &originID)
		assignSegment(t, segmentID, viewedReleaseVersionID)

		translatorMemberID := nextID
		nextID++
		timerMemberID := nextID
		nextID++
		newPublicContribution(t, translatorMemberID, originID, "translator")
		newPublicContribution(t, timerMemberID, originID, "timer")

		segments, err := repo.loadReleaseSegments(ctx, animeID, fansubGroupID, viewedReleaseVersionID, "v1", "1", nil)
		require.NoError(t, err)

		var found *PublicReleaseSegment
		for i := range segments {
			if segments[i].ThemeSegmentID == segmentID {
				found = &segments[i]
			}
		}
		require.NotNil(t, found)
		require.Len(t, found.Participants, 2)
		gotMemberIDs := []int64{found.Participants[0].MemberID, found.Participants[1].MemberID}
		require.ElementsMatch(t, []int64{translatorMemberID, timerMemberID}, gotMemberIDs)
		for _, p := range found.Participants {
			require.NotEmpty(t, p.RoleCodes, "RoleCodes muss erhalten bleiben")
		}
	})

	t.Run("Test3: Rollenkorrektur auf der Origin wirkt sich sofort auf den naechsten Aufruf aus (live)", func(t *testing.T) {
		originID := newReleaseVersion(t)
		segmentID := newSegment(t, &originID)
		assignSegment(t, segmentID, viewedReleaseVersionID)

		memberID := nextID
		nextID++
		newPublicContribution(t, memberID, originID, "translator")

		findSegment := func(segments []PublicReleaseSegment) *PublicReleaseSegment {
			for i := range segments {
				if segments[i].ThemeSegmentID == segmentID {
					return &segments[i]
				}
			}
			return nil
		}

		before, err := repo.loadReleaseSegments(ctx, animeID, fansubGroupID, viewedReleaseVersionID, "v1", "1", nil)
		require.NoError(t, err)
		beforeSegment := findSegment(before)
		require.NotNil(t, beforeSegment)
		require.Len(t, beforeSegment.Participants, 1, "vor der Korrektur: der Uebersetzer ist segmentrelevant")

		// Korrektur direkt auf der Origin, OHNE das Segment anzufassen: die Rolle
		// wechselt von 'translator' (segmentrelevant) auf 'encoder' (NICHT
		// segmentrelevant) -- der Beitragende hat keine andere relevante Rolle mehr.
		_, err = pool.Exec(ctx, `UPDATE anime_contribution_roles SET role_code = 'encoder' WHERE anime_contribution_id = (SELECT id FROM anime_contributions WHERE member_id = $1 AND release_version_id = $2)`, memberID, originID)
		require.NoError(t, err)

		after, err := repo.loadReleaseSegments(ctx, animeID, fansubGroupID, viewedReleaseVersionID, "v1", "1", nil)
		require.NoError(t, err)
		afterSegment := findSegment(after)
		require.NotNil(t, afterSegment)
		require.Empty(t, afterSegment.Participants, "nach der Korrektur (kein Segment-Edit!): der Beitragende ist nicht mehr segmentrelevant")
	})

	t.Run("Test4: neu hinzugefuegter Beteiligter auf der Origin erscheint beim naechsten Aufruf", func(t *testing.T) {
		originID := newReleaseVersion(t)
		segmentID := newSegment(t, &originID)
		assignSegment(t, segmentID, viewedReleaseVersionID)

		findSegment := func(segments []PublicReleaseSegment) *PublicReleaseSegment {
			for i := range segments {
				if segments[i].ThemeSegmentID == segmentID {
					return &segments[i]
				}
			}
			return nil
		}

		before, err := repo.loadReleaseSegments(ctx, animeID, fansubGroupID, viewedReleaseVersionID, "v1", "1", nil)
		require.NoError(t, err)
		require.Empty(t, findSegment(before).Participants)

		newMemberID := nextID
		nextID++
		newPublicContribution(t, newMemberID, originID, "karaoke_fx")

		after, err := repo.loadReleaseSegments(ctx, animeID, fansubGroupID, viewedReleaseVersionID, "v1", "1", nil)
		require.NoError(t, err)
		afterSegment := findSegment(after)
		require.Len(t, afterSegment.Participants, 1)
		require.Equal(t, newMemberID, afterSegment.Participants[0].MemberID)
	})

	t.Run("Test5: Encoder und Quality-Checker erscheinen NIE als Segment-Credit", func(t *testing.T) {
		originID := newReleaseVersion(t)
		segmentID := newSegment(t, &originID)
		assignSegment(t, segmentID, viewedReleaseVersionID)

		encoderMemberID := nextID
		nextID++
		qcMemberID := nextID
		nextID++
		newPublicContribution(t, encoderMemberID, originID, "encoder")
		newPublicContribution(t, qcMemberID, originID, "quality_checker")

		segments, err := repo.loadReleaseSegments(ctx, animeID, fansubGroupID, viewedReleaseVersionID, "v1", "1", nil)
		require.NoError(t, err)

		var found *PublicReleaseSegment
		for i := range segments {
			if segments[i].ThemeSegmentID == segmentID {
				found = &segments[i]
			}
		}
		require.NotNil(t, found)
		require.Empty(t, found.Participants, "Encoder/QC sind real und oeffentlich, aber nie segmentrelevant")
	})

	t.Run("Test6: origin_release_version_id IS NULL liefert leere Participants, kein Fehler", func(t *testing.T) {
		segmentID := newSegment(t, nil)
		assignSegment(t, segmentID, viewedReleaseVersionID)

		segments, err := repo.loadReleaseSegments(ctx, animeID, fansubGroupID, viewedReleaseVersionID, "v1", "1", nil)
		require.NoError(t, err)

		var found *PublicReleaseSegment
		for i := range segments {
			if segments[i].ThemeSegmentID == segmentID {
				found = &segments[i]
			}
		}
		require.NotNil(t, found)
		require.NotNil(t, found.Participants)
		require.Empty(t, found.Participants)
	})

	t.Run("Test7: Type entspricht CanonicalSegmentType, kein roher Passthrough", func(t *testing.T) {
		segmentID := newSegment(t, nil)
		assignSegment(t, segmentID, viewedReleaseVersionID)

		segments, err := repo.loadReleaseSegments(ctx, animeID, fansubGroupID, viewedReleaseVersionID, "v1", "1", nil)
		require.NoError(t, err)

		var found *PublicReleaseSegment
		for i := range segments {
			if segments[i].ThemeSegmentID == segmentID {
				found = &segments[i]
			}
		}
		require.NotNil(t, found)
		require.Equal(t, CanonicalSegmentType("OP1"), found.Type)
		require.Equal(t, "OP", found.Type)
	})
}
