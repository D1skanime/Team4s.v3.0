package services

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/testsupport"
)

// TestReleaseMetadataCreditServiceAwardIfCompleted is the first-ever test for
// ReleaseMetadataCreditService.AwardIfCompleted. It documents the resolved
// behavior of the ambiguous rv.id/rev.id lookup at
// release_metadata_credit_service.go:43-51 (`WHERE rv.id = $1 OR rev.id = $1
// ORDER BY rv.id LIMIT 1`) and proves the ordinary award-once/idempotent
// happy path.
func TestReleaseMetadataCreditServiceAwardIfCompleted(t *testing.T) {
	t.Run("AmbiguousIDCollisionCreditsTheWrongReleaseVersion", func(t *testing.T) {
		pool := openReleaseMetadataCreditPool(t)

		_, err := pool.Exec(context.Background(), `
INSERT INTO anime(id) VALUES (61);
INSERT INTO members(id) VALUES (51);
INSERT INTO app_users(id, status) VALUES (71, 'active');
INSERT INTO member_claims(id, member_id, app_user_id, claim_status, verified_at)
VALUES (81, 51, 71, 'verified', NOW());
INSERT INTO fansub_groups(id) VALUES (41);

-- versionA (release_versions.id = 500): the release version that ends up
-- credited, even though it is not the one the caller passes by ID.
INSERT INTO episodes(id, anime_id) VALUES (161, 61);
INSERT INTO fansub_releases(id, episode_id, release_date) VALUES (171, 161, '2026-06-01');
INSERT INTO release_versions(id, release_id, production_started_on, release_date)
VALUES (500, 171, '2026-05-01', '2026-06-01');
INSERT INTO release_version_groups(release_version_id, fansub_group_id) VALUES (500, 41);
-- A release_variants row whose OWN id (600) collides with versionB's id below.
INSERT INTO release_variants(id, release_version_id) VALUES (600, 500);

-- versionB (release_versions.id = 600): the release version the caller
-- actually intends to credit by passing literal ID 600 -- but 600 also
-- matches the variant above via "rv.id = $1".
INSERT INTO episodes(id, anime_id) VALUES (162, 61);
INSERT INTO fansub_releases(id, episode_id, release_date) VALUES (172, 162, '2026-06-05');
INSERT INTO release_versions(id, release_id, production_started_on, release_date)
VALUES (600, 172, '2026-05-02', '2026-06-05');
INSERT INTO release_version_groups(release_version_id, fansub_group_id) VALUES (600, 41);
-- versionB's own real variant; its id (700) does not collide with anything.
INSERT INTO release_variants(id, release_version_id) VALUES (700, 600);`)
		require.NoError(t, err)

		service := NewReleaseMetadataCreditService(pool)
		require.NoError(t, service.AwardIfCompleted(context.Background(), 600, 71))

		credited := releaseMetadataCreditedVersionID(t, pool, 51)
		// Documents the resolved (surprising) behavior: "ORDER BY rv.id LIMIT 1"
		// prefers the row matched via "rv.id = $1" (release_variants.id=600,
		// release_version_id=500) over the row matched via "rev.id = $1"
		// (release_versions.id=600 itself, reached only via its own variant
		// rv.id=700), because 600 < 700. The caller passed 600 intending to
		// credit release_versions.id=600 (versionB), but release_versions.id=500
		// (versionA) is silently credited instead. The query is not changed by
		// this plan (VALIDATION.md scopes this phase to documenting, not
		// necessarily fixing, the ambiguity); this is a real finding for a
		// future phase/quick-task, tracked in 143-10-SUMMARY.md.
		require.Equal(t, int64(500), credited, "ambiguous rv.id/rev.id lookup silently credited the wrong release version")
		require.Equal(t, "release-version:500:metadata-complete", releaseMetadataCreditSourceKey(t, pool, 51))
	})

	t.Run("HappyPathAwardsOnceAndIsIdempotent", func(t *testing.T) {
		pool := openReleaseMetadataCreditPool(t)

		_, err := pool.Exec(context.Background(), `
INSERT INTO anime(id) VALUES (62);
INSERT INTO members(id) VALUES (52);
INSERT INTO app_users(id, status) VALUES (72, 'active');
INSERT INTO member_claims(id, member_id, app_user_id, claim_status, verified_at)
VALUES (82, 52, 72, 'verified', NOW());
INSERT INTO fansub_groups(id) VALUES (42);

INSERT INTO episodes(id, anime_id) VALUES (261, 62);
INSERT INTO fansub_releases(id, episode_id, release_date) VALUES (271, 261, '2026-07-01');
INSERT INTO release_versions(id, release_id, production_started_on, release_date)
VALUES (900, 271, '2026-06-01', '2026-07-01');
INSERT INTO release_version_groups(release_version_id, fansub_group_id) VALUES (900, 42);
-- This variant's own id (950) does not collide with any release_versions.id
-- seeded in this subtest, so the lookup is unambiguous here.
INSERT INTO release_variants(id, release_version_id) VALUES (950, 900);`)
		require.NoError(t, err)

		service := NewReleaseMetadataCreditService(pool)

		require.NoError(t, service.AwardIfCompleted(context.Background(), 950, 72))
		require.Equal(t, int64(900), releaseMetadataCreditedVersionID(t, pool, 52))
		require.Equal(t, 1, releaseMetadataCreditLedgerCount(t, pool))

		// Second call for the same release version must be a no-op (idempotent
		// on source_key uniqueness, per the `alreadyAwarded` short-circuit at
		// release_metadata_credit_service.go:63-69).
		require.NoError(t, service.AwardIfCompleted(context.Background(), 950, 72))
		require.Equal(t, 1, releaseMetadataCreditLedgerCount(t, pool))
	})
}

func openReleaseMetadataCreditPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase107Postgres(t)
	_, err := pool.Exec(context.Background(), `
CREATE TABLE anime (
    id BIGINT PRIMARY KEY
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
    ADD COLUMN production_started_on DATE,
    ADD COLUMN release_date TIMESTAMPTZ;
CREATE TABLE release_variants (
    id BIGINT PRIMARY KEY,
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id)
);
CREATE TABLE release_version_groups (
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
    PRIMARY KEY (release_version_id, fansub_group_id)
);
INSERT INTO point_rules (rule_code, rule_version, category, point_value)
VALUES ('release_metadata_complete', 1, 'fansub_work', 1);`)
	require.NoError(t, err)
	return pool
}

func releaseMetadataCreditedVersionID(t testing.TB, pool *pgxpool.Pool, memberID int64) int64 {
	t.Helper()
	var versionID int64
	require.NoError(t, pool.QueryRow(context.Background(), `
SELECT release_version_id FROM point_ledger_entries
WHERE source_type = 'release_metadata' AND entry_kind = 'award' AND member_id = $1
ORDER BY id DESC LIMIT 1`, memberID).Scan(&versionID))
	return versionID
}

func releaseMetadataCreditSourceKey(t testing.TB, pool *pgxpool.Pool, memberID int64) string {
	t.Helper()
	var sourceKey string
	require.NoError(t, pool.QueryRow(context.Background(), `
SELECT source_key FROM point_ledger_entries
WHERE source_type = 'release_metadata' AND entry_kind = 'award' AND member_id = $1
ORDER BY id DESC LIMIT 1`, memberID).Scan(&sourceKey))
	return sourceKey
}

func releaseMetadataCreditLedgerCount(t testing.TB, pool *pgxpool.Pool) int {
	t.Helper()
	var count int
	require.NoError(t, pool.QueryRow(context.Background(), `
SELECT COUNT(*) FROM point_ledger_entries WHERE source_type = 'release_metadata'`).Scan(&count))
	return count
}
