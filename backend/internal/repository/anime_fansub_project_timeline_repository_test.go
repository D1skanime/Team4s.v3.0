package repository

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/testsupport"
)

// TestUpdateAnimeFansubProjectTimelineRejectsEndBeforeCompletedRelease is the
// first fixture-based test for the "end before an already-completed release"
// date-validation rule in UpdateAnimeFansubProjectTimeline
// (anime_fansub_project_timeline_repository.go:83-85). It proves both the
// rejection and acceptance paths against a real latestReleaseCompletion value
// derived from a seeded release chain, plus the completedOn == nil pass-through case.
func TestUpdateAnimeFansubProjectTimelineRejectsEndBeforeCompletedRelease(t *testing.T) {
	pool := openProjectTimelinePool(t)
	repo := NewFansubNotesRepository(pool)
	ctx := context.Background()

	// Seed: anime 61 x fansub group 41 have one release chain whose latest
	// completion (MAX(COALESCE(rev.release_date, fr.release_date))) is
	// 2026-06-01, per anime_fansub_project_timeline_repository.go:71-79's join tree.
	_, err := pool.Exec(ctx, `
INSERT INTO anime(id) VALUES (61);
INSERT INTO fansub_groups(id) VALUES (41);
INSERT INTO anime_fansub_groups(anime_id, fansub_group_id) VALUES (61, 41);
INSERT INTO episodes(id, anime_id) VALUES (161, 61);
INSERT INTO fansub_releases(id, episode_id, release_date) VALUES (171, 161, '2026-05-20');
INSERT INTO release_versions(id, release_id, release_date) VALUES (500, 171, '2026-06-01');
INSERT INTO release_version_groups(release_version_id, fansub_group_id) VALUES (500, 41);`)
	require.NoError(t, err)

	mustDate := func(t testing.TB, value string) *time.Time {
		t.Helper()
		parsed, err := time.Parse("2006-01-02", value)
		require.NoError(t, err)
		return &parsed
	}

	t.Run("RejectsCompletedOnBeforeLatestReleaseCompletion", func(t *testing.T) {
		completedOn := mustDate(t, "2026-05-01") // before the seeded 2026-06-01 completion

		result, err := repo.UpdateAnimeFansubProjectTimeline(ctx, 61, 41, nil, completedOn)
		require.Nil(t, result)
		require.True(t, errors.Is(err, ErrInvalidProjectTimeline), "expected ErrInvalidProjectTimeline, got %v", err)

		// The row must not have been mutated by the rejected call.
		var startedOn, storedCompletedOn *time.Time
		require.NoError(t, pool.QueryRow(ctx, `
SELECT production_started_on, production_completed_on FROM anime_fansub_groups
WHERE anime_id = 61 AND fansub_group_id = 41`).Scan(&startedOn, &storedCompletedOn))
		require.Nil(t, startedOn)
		require.Nil(t, storedCompletedOn)
	})

	t.Run("AcceptsCompletedOnAtOrAfterLatestReleaseCompletion", func(t *testing.T) {
		startedOn := mustDate(t, "2026-04-01")
		completedOn := mustDate(t, "2026-06-01") // exactly the seeded completion date

		result, err := repo.UpdateAnimeFansubProjectTimeline(ctx, 61, 41, startedOn, completedOn)
		require.NoError(t, err)
		require.NotNil(t, result)
		require.NotNil(t, result.ProductionStartedOn)
		require.Equal(t, "2026-04-01", *result.ProductionStartedOn)
		require.NotNil(t, result.ProductionCompletedOn)
		require.Equal(t, "2026-06-01", *result.ProductionCompletedOn)
	})

	t.Run("CompletedOnNilBypassesTheRule", func(t *testing.T) {
		startedOn := mustDate(t, "2026-04-15")

		result, err := repo.UpdateAnimeFansubProjectTimeline(ctx, 61, 41, startedOn, nil)
		require.NoError(t, err)
		require.NotNil(t, result)
		require.NotNil(t, result.ProductionStartedOn)
		require.Equal(t, "2026-04-15", *result.ProductionStartedOn)
		require.Nil(t, result.ProductionCompletedOn)
	})
}

func openProjectTimelinePool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase107Postgres(t)
	_, err := pool.Exec(context.Background(), `
CREATE TABLE anime (
    id BIGINT PRIMARY KEY
);
CREATE TABLE anime_fansub_groups (
    anime_id BIGINT NOT NULL REFERENCES anime(id),
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
    production_started_on DATE,
    production_completed_on DATE,
    PRIMARY KEY (anime_id, fansub_group_id)
);
CREATE TABLE episodes (
    id BIGINT PRIMARY KEY,
    anime_id BIGINT NOT NULL REFERENCES anime(id)
);
CREATE TABLE fansub_releases (
    id BIGINT PRIMARY KEY,
    episode_id BIGINT NOT NULL REFERENCES episodes(id),
    release_date TIMESTAMPTZ
);
ALTER TABLE release_versions
    ADD COLUMN release_id BIGINT REFERENCES fansub_releases(id),
    ADD COLUMN release_date TIMESTAMPTZ;
CREATE TABLE release_version_groups (
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
    PRIMARY KEY (release_version_id, fansub_group_id)
);`)
	require.NoError(t, err)
	return pool
}
