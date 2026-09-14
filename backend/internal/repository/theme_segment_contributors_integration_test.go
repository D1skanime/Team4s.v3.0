package repository

// TestSetThemeSegmentContributors and TestListThemeSegmentContributorCandidates prove
// against a real, isolated Postgres instance the validated write/read path for
// theme_segment_contributors (Phase 156, Plan 156-12/GAP-01, 156-UAT.md Nachtrag
// 2026-09-12 -- bestaetigter Datenmodell-Entscheid):
//   - a valid subset selection succeeds and is idempotent on re-save
//   - a memberID that does not resolve as an effective Origin contributor is rejected
//     with ErrConflict and writes NOTHING (all-or-nothing)
//   - a member who IS a contributor of a DIFFERENT release (not this segment's Origin)
//     is rejected the same way ("fremder Release")
//   - a segment with origin_release_version_id IS NULL rejects ANY selection with
//     ErrConflict
//   - segmentID<=0 / a memberID<=0 is rejected before any DB write ("ungueltige IDs")
//   - ListThemeSegmentContributorCandidates returns every effective Origin contributor,
//     INCLUDING an encoder-only one, with correct Selected flags before/after a write
//   - an add-then-remove round trip reports accurate Added/Removed counts and leaves
//     exactly the new set selected
//
// Package repository (nicht repository_test), analog zu
// release_detail_public_repository_segment_credits_test.go -- dieser Test greift auf
// unexportierte AdminContentRepository-Interna zu.
//
// Skips cleanly when TEAM4S_PHASE117_TEST_DSN is unset.

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// newSegmentContributorsFixture creates the same local schema addendum as
// release_detail_public_repository_segment_credits_test.go (anime_contributions/
// anime_contribution_roles/visibilities, members.profile_visibility/public_slug) --
// loadPublicEffectiveContributors needs these tables to resolve who is an effective
// Origin contributor. Mirrors Plan 156-03's precedent of a local, per-test-file fixture
// addendum. Plan 156-16 also added the identical shim to testsupport/phase117_postgres.go's
// createPhase117Prerequisites (ensureThemeSegmentOriginTx now reaches it from more call
// sites) -- IF NOT EXISTS/ON CONFLICT keep this local copy collision-free either way.
func newSegmentContributorsFixture(t *testing.T) (*pgxpool.Pool, context.Context) {
	t.Helper()
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
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
		INSERT INTO role_definitions (code, label_de) VALUES
			('translator', 'Übersetzung'),
			('timer', 'Timing'),
			('encoder', 'Encoding')
	`)
	require.NoError(t, err)

	return pool, ctx
}

func TestSetThemeSegmentContributors(t *testing.T) {
	pool, ctx := newSegmentContributorsFixture(t)
	repo := NewAdminContentRepository(pool)

	const (
		animeID       = int64(1)
		fansubGroupID = int64(1)
		themeTypeID   = int64(1)
		themeID       = int64(1)

		publicVisibilityID = int64(1)
	)

	_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES ($1, 'OP1')`, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id, title) VALUES ($1, $2, $3, 'Moonlight')`, themeID, animeID, themeTypeID)
	require.NoError(t, err)

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

	newMember := func(t *testing.T) int64 {
		t.Helper()
		memberID := nextID
		nextID++
		_, err := pool.Exec(ctx, `INSERT INTO members (id) VALUES ($1)`, memberID)
		require.NoError(t, err)
		return memberID
	}

	newContribution := func(t *testing.T, memberID, releaseVersionID int64, roleCode string) {
		t.Helper()
		var contributionID int64
		err := pool.QueryRow(ctx, `
			INSERT INTO anime_contributions (fansub_group_id, anime_id, member_id, release_version_id, is_public_on_anime_page, visibility_id)
			VALUES ($1, $2, $3, $4, true, $5)
			RETURNING id
		`, fansubGroupID, animeID, memberID, releaseVersionID, publicVisibilityID).Scan(&contributionID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO anime_contribution_roles (anime_contribution_id, role_code) VALUES ($1, $2)`, contributionID, roleCode)
		require.NoError(t, err)
	}

	t.Run("gueltige Teilmenge gelingt und ist beim erneuten Speichern idempotent", func(t *testing.T) {
		originID := newReleaseVersion(t)
		segmentID := newSegment(t, &originID)
		memberA := newMember(t)
		memberB := newMember(t)
		newContribution(t, memberA, originID, "translator")
		newContribution(t, memberB, originID, "timer")

		added, removed, err := repo.SetThemeSegmentContributors(ctx, segmentID, []int64{memberA, memberB})
		require.NoError(t, err)
		require.Equal(t, 2, added)
		require.Equal(t, 0, removed)

		ids, err := repo.GetThemeSegmentContributorMemberIDs(ctx, segmentID)
		require.NoError(t, err)
		require.ElementsMatch(t, []int64{memberA, memberB}, ids)

		added, removed, err = repo.SetThemeSegmentContributors(ctx, segmentID, []int64{memberA, memberB})
		require.NoError(t, err)
		require.Equal(t, 0, added, "erneutes Speichern derselben Menge darf nichts hinzufuegen")
		require.Equal(t, 0, removed, "erneutes Speichern derselben Menge darf nichts entfernen")
	})

	t.Run("ein memberID, der kein effektiver Origin-Contributor ist, wird abgelehnt und schreibt nichts", func(t *testing.T) {
		originID := newReleaseVersion(t)
		segmentID := newSegment(t, &originID)
		fabricatedMemberID := nextID
		nextID++
		_, err := pool.Exec(ctx, `INSERT INTO members (id) VALUES ($1)`, fabricatedMemberID)
		require.NoError(t, err)

		added, removed, err := repo.SetThemeSegmentContributors(ctx, segmentID, []int64{fabricatedMemberID})
		require.Error(t, err)
		require.True(t, errors.Is(err, ErrConflict))
		require.Equal(t, 0, added)
		require.Equal(t, 0, removed)

		ids, err := repo.GetThemeSegmentContributorMemberIDs(ctx, segmentID)
		require.NoError(t, err)
		require.Empty(t, ids, "eine abgelehnte Auswahl darf die Tabelle nicht veraendern")
	})

	t.Run("ein Contributor eines FREMDEN Release (nicht der Origin) wird abgelehnt", func(t *testing.T) {
		originID := newReleaseVersion(t)
		foreignReleaseID := newReleaseVersion(t)
		segmentID := newSegment(t, &originID)
		foreignMemberID := newMember(t)
		newContribution(t, foreignMemberID, foreignReleaseID, "translator")

		added, removed, err := repo.SetThemeSegmentContributors(ctx, segmentID, []int64{foreignMemberID})
		require.Error(t, err)
		require.True(t, errors.Is(err, ErrConflict))
		require.Equal(t, 0, added)
		require.Equal(t, 0, removed)

		ids, err := repo.GetThemeSegmentContributorMemberIDs(ctx, segmentID)
		require.NoError(t, err)
		require.Empty(t, ids)
	})

	t.Run("ein Segment ohne Origin lehnt JEDE Auswahl ab", func(t *testing.T) {
		segmentID := newSegment(t, nil)
		memberID := newMember(t)

		added, removed, err := repo.SetThemeSegmentContributors(ctx, segmentID, []int64{memberID})
		require.Error(t, err)
		require.True(t, errors.Is(err, ErrConflict))
		require.Equal(t, 0, added)
		require.Equal(t, 0, removed)
	})

	t.Run("ungueltige IDs werden abgelehnt, ohne die DB zu berühren", func(t *testing.T) {
		originID := newReleaseVersion(t)
		segmentID := newSegment(t, &originID)
		memberID := newMember(t)
		newContribution(t, memberID, originID, "translator")

		_, _, err := repo.SetThemeSegmentContributors(ctx, 0, []int64{memberID})
		require.True(t, errors.Is(err, ErrNotFound))

		_, _, err = repo.SetThemeSegmentContributors(ctx, segmentID, []int64{0})
		require.True(t, errors.Is(err, ErrValidation))

		_, _, err = repo.SetThemeSegmentContributors(ctx, segmentID, []int64{-1})
		require.True(t, errors.Is(err, ErrValidation))

		_, _, err = repo.SetThemeSegmentContributors(ctx, segmentID, []int64{memberID, memberID})
		require.True(t, errors.Is(err, ErrValidation), "ein doppelter memberID im Input ist ungueltig")

		ids, err := repo.GetThemeSegmentContributorMemberIDs(ctx, segmentID)
		require.NoError(t, err)
		require.Empty(t, ids)
	})

	t.Run("Hinzufuegen-dann-Entfernen-Rundlauf meldet genaue Added/Removed-Zaehlung", func(t *testing.T) {
		originID := newReleaseVersion(t)
		segmentID := newSegment(t, &originID)
		memberA := newMember(t)
		memberB := newMember(t)
		memberC := newMember(t)
		newContribution(t, memberA, originID, "translator")
		newContribution(t, memberB, originID, "timer")
		newContribution(t, memberC, originID, "translator")

		added, removed, err := repo.SetThemeSegmentContributors(ctx, segmentID, []int64{memberA, memberB})
		require.NoError(t, err)
		require.Equal(t, 2, added)
		require.Equal(t, 0, removed)

		added, removed, err = repo.SetThemeSegmentContributors(ctx, segmentID, []int64{memberB, memberC})
		require.NoError(t, err)
		require.Equal(t, 1, added, "nur memberC ist neu")
		require.Equal(t, 1, removed, "nur memberA faellt weg")

		ids, err := repo.GetThemeSegmentContributorMemberIDs(ctx, segmentID)
		require.NoError(t, err)
		require.ElementsMatch(t, []int64{memberB, memberC}, ids)
	})

	t.Run("leere Auswahl entfernt eine bestehende Selektion vollstaendig", func(t *testing.T) {
		originID := newReleaseVersion(t)
		segmentID := newSegment(t, &originID)
		memberA := newMember(t)
		newContribution(t, memberA, originID, "translator")

		_, _, err := repo.SetThemeSegmentContributors(ctx, segmentID, []int64{memberA})
		require.NoError(t, err)

		added, removed, err := repo.SetThemeSegmentContributors(ctx, segmentID, []int64{})
		require.NoError(t, err)
		require.Equal(t, 0, added)
		require.Equal(t, 1, removed)

		ids, err := repo.GetThemeSegmentContributorMemberIDs(ctx, segmentID)
		require.NoError(t, err)
		require.Empty(t, ids)
	})
}

func TestListThemeSegmentContributorCandidates(t *testing.T) {
	pool, ctx := newSegmentContributorsFixture(t)
	repo := NewAdminContentRepository(pool)

	const (
		animeID       = int64(1)
		fansubGroupID = int64(1)
		themeTypeID   = int64(1)
		themeID       = int64(1)

		publicVisibilityID = int64(1)
	)

	_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES ($1, 'OP1')`, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id, title) VALUES ($1, $2, $3, 'Moonlight')`, themeID, animeID, themeTypeID)
	require.NoError(t, err)

	nextID := int64(1)
	episodeID := nextID
	releaseID := nextID
	originID := nextID
	nextID++
	_, err = pool.Exec(ctx, `INSERT INTO episodes (id, anime_id, sort_index, episode_number) VALUES ($1, $2, 1, '1')`, episodeID, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2)`, releaseID, episodeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO release_versions (id, release_id, version) VALUES ($1, $2, 'v1')`, originID, releaseID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $2)`, originID, fansubGroupID)
	require.NoError(t, err)

	var noOriginSegmentID int64
	err = pool.QueryRow(ctx, `INSERT INTO theme_segments (theme_id, origin_release_version_id) VALUES ($1, NULL) RETURNING id`, themeID).Scan(&noOriginSegmentID)
	require.NoError(t, err)

	var segmentID int64
	err = pool.QueryRow(ctx, `INSERT INTO theme_segments (theme_id, origin_release_version_id) VALUES ($1, $2) RETURNING id`, themeID, originID).Scan(&segmentID)
	require.NoError(t, err)

	translatorID := nextID
	nextID++
	encoderOnlyID := nextID
	nextID++
	_, err = pool.Exec(ctx, `INSERT INTO members (id) VALUES ($1), ($2)`, translatorID, encoderOnlyID)
	require.NoError(t, err)

	insertContribution := func(memberID int64, roleCode string) {
		var contributionID int64
		err := pool.QueryRow(ctx, `
			INSERT INTO anime_contributions (fansub_group_id, anime_id, member_id, release_version_id, is_public_on_anime_page, visibility_id)
			VALUES ($1, $2, $3, $4, true, $5)
			RETURNING id
		`, fansubGroupID, animeID, memberID, originID, publicVisibilityID).Scan(&contributionID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO anime_contribution_roles (anime_contribution_id, role_code) VALUES ($1, $2)`, contributionID, roleCode)
		require.NoError(t, err)
	}
	insertContribution(translatorID, "translator")
	insertContribution(encoderOnlyID, "encoder")

	t.Run("ein Segment ohne Origin liefert eine leere, nicht-nil Liste", func(t *testing.T) {
		candidates, err := repo.ListThemeSegmentContributorCandidates(ctx, noOriginSegmentID)
		require.NoError(t, err)
		require.NotNil(t, candidates)
		require.Empty(t, candidates)
	})

	t.Run("die Kandidatenliste enthaelt JEDEN effektiven Origin-Contributor inkl. Encoder-only, mit korrektem Selected", func(t *testing.T) {
		before, err := repo.ListThemeSegmentContributorCandidates(ctx, segmentID)
		require.NoError(t, err)
		require.Len(t, before, 2, "Encoder-only-Contributor muss in der Admin-Kandidatenliste erscheinen, obwohl er nie oeffentlicher Segment-Credit wird")
		for _, candidate := range before {
			require.False(t, candidate.Selected, "vor jeder Auswahl ist niemand selektiert")
		}

		_, _, err = repo.SetThemeSegmentContributors(ctx, segmentID, []int64{translatorID})
		require.NoError(t, err)

		after, err := repo.ListThemeSegmentContributorCandidates(ctx, segmentID)
		require.NoError(t, err)
		require.Len(t, after, 2)
		for _, candidate := range after {
			if candidate.MemberID == translatorID {
				require.True(t, candidate.Selected)
			} else {
				require.False(t, candidate.Selected)
			}
		}
	})
}
