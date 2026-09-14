package repository

// TestEnsureThemeSegmentContributorsPreselected and TestEnsureThemeSegmentOriginAndContributors
// prove the two new GAP-07 functions (Phase 156, Plan 156-18, 156-UAT.md GAP-07 --
// "Segment-Mitwirkende automatisch vorauswaehlen (gespeichert, abwaehlbar)",
// Auftraggeber-bestaetigt 2026-09-14) against a real, isolated Postgres instance. Every
// assertion reads back real state via GetThemeSegmentContributorMemberIDs and a direct
// SELECT contributors_initialized_at -- never this file's own source text.
//
// Skips cleanly when TEAM4S_PHASE117_TEST_DSN is unset.

import (
	"context"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// ensureContributorsInitializedAtColumn adds theme_segments.contributors_initialized_at ahead of
// migration 0165 (created later in this same plan, Task 3) landing in testsupport's shared
// Phase-117 fixture list -- IF NOT EXISTS keeps this compatible once the real migration also
// runs against the same schema. Reused by every 156-18 test file that needs the column.
func ensureContributorsInitializedAtColumn(t *testing.T, pool *pgxpool.Pool, ctx context.Context) {
	t.Helper()
	_, err := pool.Exec(ctx, `ALTER TABLE theme_segments ADD COLUMN IF NOT EXISTS contributors_initialized_at TIMESTAMPTZ NULL;`)
	require.NoError(t, err)
}

// newPreselectionFixture mirrors newSegmentContributorsFixture's local schema addendum
// (anime_contributions/anime_contribution_roles/visibilities, members.profile_visibility/
// public_slug) plus the new marker column.
func newPreselectionFixture(t *testing.T) (*pgxpool.Pool, context.Context) {
	t.Helper()
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	ensureContributorsInitializedAtColumn(t, pool, ctx)

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
	return pool, ctx
}

type preselectionFixtureIDs struct {
	pool          *pgxpool.Pool
	ctx           context.Context
	repo          *AdminContentRepository
	nextID        int64
	animeID       int64
	fansubGroupID int64
	themeID       int64
}

const preselectionPublicVisibilityID = int64(1)

func newPreselectionScenario(t *testing.T) *preselectionFixtureIDs {
	t.Helper()
	pool, ctx := newPreselectionFixture(t)
	s := &preselectionFixtureIDs{
		pool:          pool,
		ctx:           ctx,
		repo:          NewAdminContentRepository(pool),
		nextID:        1,
		animeID:       1,
		fansubGroupID: 1,
		themeID:       1,
	}
	_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, s.animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, s.fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES (1, 'OP1')`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id) VALUES ($1, $2, 1)`, s.themeID, s.animeID)
	require.NoError(t, err)
	return s
}

func (s *preselectionFixtureIDs) take() int64 {
	id := s.nextID
	s.nextID++
	return id
}

func (s *preselectionFixtureIDs) newReleaseVersion(t *testing.T) int64 {
	t.Helper()
	episodeID := s.take()
	releaseID := s.take()
	releaseVersionID := s.take()
	_, err := s.pool.Exec(s.ctx, `INSERT INTO episodes (id, anime_id, sort_index, episode_number) VALUES ($1, $2, $3, $4)`,
		episodeID, s.animeID, episodeID, "e")
	require.NoError(t, err)
	_, err = s.pool.Exec(s.ctx, `INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2)`, releaseID, episodeID)
	require.NoError(t, err)
	_, err = s.pool.Exec(s.ctx, `INSERT INTO release_versions (id, release_id, version) VALUES ($1, $2, 'v1')`, releaseVersionID, releaseID)
	require.NoError(t, err)
	_, err = s.pool.Exec(s.ctx, `INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $2)`, releaseVersionID, s.fansubGroupID)
	require.NoError(t, err)
	return releaseVersionID
}

func (s *preselectionFixtureIDs) newSegment(t *testing.T, originReleaseVersionID *int64) int64 {
	t.Helper()
	segmentID := s.take()
	_, err := s.pool.Exec(s.ctx, `INSERT INTO theme_segments (id, theme_id, origin_release_version_id) VALUES ($1, $2, $3)`, segmentID, s.themeID, originReleaseVersionID)
	require.NoError(t, err)
	return segmentID
}

func (s *preselectionFixtureIDs) newMember(t *testing.T) int64 {
	t.Helper()
	memberID := s.take()
	_, err := s.pool.Exec(s.ctx, `INSERT INTO members (id) VALUES ($1)`, memberID)
	require.NoError(t, err)
	return memberID
}

// newContribution optionally overrides the fansub group owning the contribution -- needed for
// the override-vs-inherited-default fixture below (a DIFFERENT group's override must not steal a
// member preselected via another group's anime-level default).
func (s *preselectionFixtureIDs) newContribution(t *testing.T, memberID int64, releaseVersionID *int64, fansubGroupID int64, roleCode string) {
	t.Helper()
	var contributionID int64
	err := s.pool.QueryRow(s.ctx, `
		INSERT INTO anime_contributions (fansub_group_id, anime_id, member_id, release_version_id, is_public_on_anime_page, visibility_id)
		VALUES ($1, $2, $3, $4, true, $5)
		RETURNING id
	`, fansubGroupID, s.animeID, memberID, releaseVersionID, preselectionPublicVisibilityID).Scan(&contributionID)
	require.NoError(t, err)
	_, err = s.pool.Exec(s.ctx, `INSERT INTO anime_contribution_roles (anime_contribution_id, role_code) VALUES ($1, $2)`, contributionID, roleCode)
	require.NoError(t, err)
}

func (s *preselectionFixtureIDs) marker(t *testing.T, segmentID int64) *string {
	t.Helper()
	var marker *string
	err := s.pool.QueryRow(s.ctx, `SELECT contributors_initialized_at::text FROM theme_segments WHERE id = $1`, segmentID).Scan(&marker)
	require.NoError(t, err)
	return marker
}

func TestEnsureThemeSegmentContributorsPreselected(t *testing.T) {
	t.Run("originReleaseVersionID nil ist ein No-op ohne Schreibzugriff", func(t *testing.T) {
		s := newPreselectionScenario(t)
		segmentID := s.newSegment(t, nil)

		tx, err := s.pool.Begin(s.ctx)
		require.NoError(t, err)
		defer func() { _ = tx.Rollback(s.ctx) }()
		count, err := ensureThemeSegmentContributorsPreselectedTx(s.ctx, tx, segmentID, nil)
		require.NoError(t, err)
		require.Equal(t, 0, count)
		require.NoError(t, tx.Commit(s.ctx))

		require.Nil(t, s.marker(t, segmentID))
		ids, err := s.repo.GetThemeSegmentContributorMemberIDs(s.ctx, segmentID)
		require.NoError(t, err)
		require.Empty(t, ids)
	})

	t.Run("bereits initialisiertes Segment bleibt No-op, selbst wenn die Origin vollqualifizierte Contributor haette", func(t *testing.T) {
		s := newPreselectionScenario(t)
		originID := s.newReleaseVersion(t)
		segmentID := s.newSegment(t, &originID)
		translator := s.newMember(t)
		s.newContribution(t, translator, &originID, s.fansubGroupID, "translator")

		_, err := s.pool.Exec(s.ctx, `UPDATE theme_segments SET contributors_initialized_at = NOW() WHERE id = $1`, segmentID)
		require.NoError(t, err)

		tx, err := s.pool.Begin(s.ctx)
		require.NoError(t, err)
		defer func() { _ = tx.Rollback(s.ctx) }()
		count, err := ensureThemeSegmentContributorsPreselectedTx(s.ctx, tx, segmentID, &originID)
		require.NoError(t, err)
		require.Equal(t, 0, count, "kein Auto-Refill -- decision 5")
		require.NoError(t, tx.Commit(s.ctx))

		ids, err := s.repo.GetThemeSegmentContributorMemberIDs(s.ctx, segmentID)
		require.NoError(t, err)
		require.Empty(t, ids)
	})

	t.Run("Marker NULL und gueltige Origin: nur segment-relevante Rollen werden eingefuegt, Marker wird gesetzt", func(t *testing.T) {
		s := newPreselectionScenario(t)
		originID := s.newReleaseVersion(t)
		segmentID := s.newSegment(t, &originID)
		translatorA := s.newMember(t)
		translatorB := s.newMember(t)
		encoderOnly := s.newMember(t)
		s.newContribution(t, translatorA, &originID, s.fansubGroupID, "translator")
		s.newContribution(t, translatorB, &originID, s.fansubGroupID, "translator")
		s.newContribution(t, encoderOnly, &originID, s.fansubGroupID, "encoder")

		tx, err := s.pool.Begin(s.ctx)
		require.NoError(t, err)
		defer func() { _ = tx.Rollback(s.ctx) }()
		count, err := ensureThemeSegmentContributorsPreselectedTx(s.ctx, tx, segmentID, &originID)
		require.NoError(t, err)
		require.Equal(t, 2, count, "beide Uebersetzer werden eingefuegt, der Encoder-only nie")
		require.NoError(t, tx.Commit(s.ctx))

		ids, err := s.repo.GetThemeSegmentContributorMemberIDs(s.ctx, segmentID)
		require.NoError(t, err)
		require.ElementsMatch(t, []int64{translatorA, translatorB}, ids)
		require.NotNil(t, s.marker(t, segmentID))
	})

	t.Run("Origin mit null segment-relevanten Contributorn zaehlt trotzdem als initialisiert", func(t *testing.T) {
		s := newPreselectionScenario(t)
		originID := s.newReleaseVersion(t)
		segmentID := s.newSegment(t, &originID)
		encoderOnly := s.newMember(t)
		s.newContribution(t, encoderOnly, &originID, s.fansubGroupID, "encoder")

		tx, err := s.pool.Begin(s.ctx)
		require.NoError(t, err)
		defer func() { _ = tx.Rollback(s.ctx) }()
		count, err := ensureThemeSegmentContributorsPreselectedTx(s.ctx, tx, segmentID, &originID)
		require.NoError(t, err)
		require.Equal(t, 0, count)
		require.NoError(t, tx.Commit(s.ctx))

		require.NotNil(t, s.marker(t, segmentID), "auch ohne qualifizierten Contributor gilt das Segment als initialisiert, nie erneut versucht")
		ids, err := s.repo.GetThemeSegmentContributorMemberIDs(s.ctx, segmentID)
		require.NoError(t, err)
		require.Empty(t, ids)
	})

	t.Run("vererbter Anime-Default-Contributor wird wie ein direkter Release-Contributor eingefuegt", func(t *testing.T) {
		s := newPreselectionScenario(t)
		originID := s.newReleaseVersion(t)
		segmentID := s.newSegment(t, &originID)
		defaultMember := s.newMember(t)
		// release_version_id IS NULL -- Anime-Default, keine Override fuer diese Gruppe auf dieser Origin.
		s.newContribution(t, defaultMember, nil, s.fansubGroupID, "timer")

		tx, err := s.pool.Begin(s.ctx)
		require.NoError(t, err)
		defer func() { _ = tx.Rollback(s.ctx) }()
		count, err := ensureThemeSegmentContributorsPreselectedTx(s.ctx, tx, segmentID, &originID)
		require.NoError(t, err)
		require.Equal(t, 1, count)
		require.NoError(t, tx.Commit(s.ctx))

		ids, err := s.repo.GetThemeSegmentContributorMemberIDs(s.ctx, segmentID)
		require.NoError(t, err)
		require.Equal(t, []int64{defaultMember}, ids)
	})

	t.Run("Gruppen-Override ersetzt den ererbten Default -- nur das Override-Mitglied wird eingefuegt", func(t *testing.T) {
		s := newPreselectionScenario(t)
		originID := s.newReleaseVersion(t)
		segmentID := s.newSegment(t, &originID)
		defaultMember := s.newMember(t)
		overrideMember := s.newMember(t)
		// defaultMember haelt einen Anime-Default fuer dieselbe Gruppe...
		s.newContribution(t, defaultMember, nil, s.fansubGroupID, "translator")
		// ...aber die Gruppe hat auf DIESER Origin ein Override mit einem ANDEREN Mitglied.
		s.newContribution(t, overrideMember, &originID, s.fansubGroupID, "translator")

		tx, err := s.pool.Begin(s.ctx)
		require.NoError(t, err)
		defer func() { _ = tx.Rollback(s.ctx) }()
		count, err := ensureThemeSegmentContributorsPreselectedTx(s.ctx, tx, segmentID, &originID)
		require.NoError(t, err)
		require.Equal(t, 1, count)
		require.NoError(t, tx.Commit(s.ctx))

		ids, err := s.repo.GetThemeSegmentContributorMemberIDs(s.ctx, segmentID)
		require.NoError(t, err)
		require.Equal(t, []int64{overrideMember}, ids, "nur das Override-Mitglied zaehlt, der ererbte Default derselben Gruppe nicht")
	})
}

func TestEnsureThemeSegmentOriginAndContributors(t *testing.T) {
	t.Run("ruft ensureThemeSegmentOriginTx zuerst auf und liefert dessen Fehler unveraendert", func(t *testing.T) {
		s := newPreselectionScenario(t)
		const missingSegmentID = int64(999999)

		tx, err := s.pool.Begin(s.ctx)
		require.NoError(t, err)
		defer func() { _ = tx.Rollback(s.ctx) }()
		_, _, err = ensureThemeSegmentOriginAndContributorsTx(s.ctx, tx, missingSegmentID)
		require.Error(t, err)
	})

	t.Run("feuert die Vorauswahl unabhaengig von outcome.Changed, solange outcome.After != nil", func(t *testing.T) {
		s := newPreselectionScenario(t)
		originID := s.newReleaseVersion(t)
		segmentID := s.newSegment(t, &originID)
		translator := s.newMember(t)
		s.newContribution(t, translator, &originID, s.fansubGroupID, "translator")
		_, err := s.pool.Exec(s.ctx, `INSERT INTO theme_segment_assignments (theme_segment_id, release_version_id) VALUES ($1, $2)`, segmentID, originID)
		require.NoError(t, err)

		tx, err := s.pool.Begin(s.ctx)
		require.NoError(t, err)
		defer func() { _ = tx.Rollback(s.ctx) }()
		outcome, preselected, err := ensureThemeSegmentOriginAndContributorsTx(s.ctx, tx, segmentID)
		require.NoError(t, err)
		require.False(t, outcome.Changed, "die Origin war bereits gueltig, ensureThemeSegmentOriginTx meldet Changed=false")
		require.Equal(t, 1, preselected, "die Vorauswahl feuert trotzdem, weil outcome.After != nil")
		require.NoError(t, tx.Commit(s.ctx))

		ids, err := s.repo.GetThemeSegmentContributorMemberIDs(s.ctx, segmentID)
		require.NoError(t, err)
		require.Equal(t, []int64{translator}, ids)
	})

	t.Run("outcome.After == nil ruft die Vorauswahl mit nil auf, die korrekt No-op bleibt", func(t *testing.T) {
		s := newPreselectionScenario(t)
		segmentID := s.newSegment(t, nil)

		tx, err := s.pool.Begin(s.ctx)
		require.NoError(t, err)
		defer func() { _ = tx.Rollback(s.ctx) }()
		outcome, preselected, err := ensureThemeSegmentOriginAndContributorsTx(s.ctx, tx, segmentID)
		require.NoError(t, err)
		require.Nil(t, outcome.After)
		require.Equal(t, 0, preselected)
		require.NoError(t, tx.Commit(s.ctx))

		require.Nil(t, s.marker(t, segmentID), "ohne Origin bleibt der Merker NULL")
	})
}
