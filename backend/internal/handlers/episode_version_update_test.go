package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/testsupport"
)

// evuFixturePlatformAdminIdentity mirrors evecFixturePlatformAdminIdentity: a real
// platform-admin identity whose IsPlatformAdmin=true short-circuits
// UpdateEpisodeVersion's permission-check branch entirely (isReleaseMetadataOnlyPatch
// is false once fansub_groups is set, so the ONLY thing that keeps this test from
// needing a wired permissionSvc/auditLogRepo is actor.IsPlatformAdmin=true) --
// D-11's own point is that the Phase-187 guard still applies even so.
func evuFixturePlatformAdminIdentity() middleware.AuthIdentity {
	return middleware.AuthIdentity{
		UserID:          5001,
		AppUserID:       5001,
		AppUserStatus:   models.AppUserStatusActive,
		IsPlatformAdmin: true,
		DisplayName:     "Fixture-Admin",
	}
}

// openEVUFixture opens the shared Phase-187 Postgres fixture (release_version_groups
// composite key, migration 0137 dependents tables, already provided by Plan 01) and
// extends it with exactly the additional chain UpdateEpisodeVersion's own
// h.episodeVersionRepo.Update/GetByID calls need to reach the group-sync guard at
// all: anime -> episode -> fansub_release -> release_version -> release_variant,
// plus the handful of zero-row tables GetByID's SELECT still references
// (release_streams/stream_sources/release_variant_episodes/theme_segment_assignments/
// theme_segments) and the slug/name/logo_url columns resolveMemberGroupsForSync's
// ID-lookup and GetByID's fansub_groups json_agg both read.
func openEVUFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase187Postgres(t)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
		ALTER TABLE fansub_groups ADD COLUMN IF NOT EXISTS slug TEXT, ADD COLUMN IF NOT EXISTS name TEXT, ADD COLUMN IF NOT EXISTS logo_url TEXT;
		ALTER TABLE anime_fansub_groups ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS notes TEXT;
		ALTER TABLE release_versions ADD COLUMN IF NOT EXISTS release_id BIGINT, ADD COLUMN IF NOT EXISTS title TEXT, ADD COLUMN IF NOT EXISTS production_started_on TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS release_date TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS version VARCHAR(20) NOT NULL DEFAULT 'v1';

		CREATE TABLE episodes (
			id BIGINT PRIMARY KEY,
			anime_id BIGINT NOT NULL REFERENCES anime(id),
			episode_number TEXT,
			title TEXT
		);
		CREATE TABLE fansub_releases (
			id BIGINT PRIMARY KEY,
			episode_id BIGINT NOT NULL REFERENCES episodes(id),
			release_date TIMESTAMPTZ NULL
		);
		CREATE TABLE release_variants (
			id BIGINT PRIMARY KEY,
			release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
			resolution TEXT,
			video_quality TEXT,
			subtitle_type TEXT,
			crc32 TEXT,
			duration_seconds INT,
			filename TEXT,
			container TEXT,
			video_codec TEXT,
			audio_codec TEXT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NULL,
			modified_at TIMESTAMPTZ NULL
		);
		CREATE TABLE release_variant_episodes (
			release_variant_id BIGINT REFERENCES release_variants(id),
			episode_id BIGINT REFERENCES episodes(id),
			position INT NOT NULL DEFAULT 0
		);
		CREATE TABLE stream_sources (
			id BIGINT PRIMARY KEY,
			provider_type TEXT,
			external_id TEXT,
			url TEXT,
			metadata JSONB
		);
		CREATE TABLE release_streams (
			id BIGINT PRIMARY KEY,
			variant_id BIGINT REFERENCES release_variants(id),
			stream_source_id BIGINT REFERENCES stream_sources(id),
			jellyfin_item_id VARCHAR(255)
		);
		CREATE TABLE theme_segments (
			id BIGINT PRIMARY KEY,
			source_type TEXT,
			source_ref TEXT
		);
		CREATE TABLE theme_segment_assignments (
			theme_segment_id BIGINT REFERENCES theme_segments(id),
			release_version_id BIGINT REFERENCES release_versions(id)
		);

		INSERT INTO anime (id) VALUES (5001);
		INSERT INTO episodes (id, anime_id, episode_number) VALUES (5011, 5001, '1');
		INSERT INTO fansub_releases (id, episode_id) VALUES (5021, 5011);
	`)
	require.NoError(t, err)
	return pool
}

func evuFixtureHandler(pool *pgxpool.Pool) *FansubHandler {
	return &FansubHandler{episodeVersionRepo: repository.NewEpisodeVersionRepository(pool)}
}

func evuFixtureRequest(h *FansubHandler, versionID int64, body string) *httptest.ResponseRecorder {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPatch, fmt.Sprintf("/admin/episode-versions/%d", versionID), strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "versionId", Value: fmt.Sprint(versionID)}}
	c.Set("auth_identity", evuFixturePlatformAdminIdentity())
	h.UpdateEpisodeVersion(c)
	return w
}

// TestUpdateEpisodeVersion_GroupGuard proves the Phase-187 editor-path guard at the
// HTTP-handler layer (D-01/D-02/D-06/D-07/D-08/D-09/D-10/D-11/D-14): 409 with a
// German per-kind breakdown when the removed group still has real dependents (even
// though the caller is a platform admin -- D-11), 400 when the patch would reduce
// the release version to zero groups, and 200 when the removed group has zero
// dependents (D-01 regression at the handler layer too).
func TestUpdateEpisodeVersion_GroupGuard(t *testing.T) {
	t.Run("409 with German dependents breakdown, even for a platform admin", func(t *testing.T) {
		pool := openEVUFixture(t)
		ctx := context.Background()

		const (
			releaseVersionID = int64(5031)
			variantID        = int64(5041)
			keptGroupID      = int64(5051)
			removedGroupID   = int64(5052)
			memberID         = int64(5061)
		)
		_, err := pool.Exec(ctx, `INSERT INTO release_versions (id, release_id) VALUES ($1, 5021)`, releaseVersionID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO release_variants (id, release_version_id) VALUES ($1, $2)`, variantID, releaseVersionID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id, slug, name) VALUES ($1, 'kept', 'Kept'), ($2, 'removed', 'Removed')`, keptGroupID, removedGroupID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO members (id) VALUES ($1)`, memberID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `
			INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES
				($1, $2), ($1, $3)
		`, releaseVersionID, keptGroupID, removedGroupID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `
			INSERT INTO release_role_credit_lifecycles (
				release_version_id, fansub_group_id, member_id, role_code, generation, lifecycle_status
			) VALUES ($1, $2, $3, 'timing', 1, 'pending')
		`, releaseVersionID, removedGroupID, memberID)
		require.NoError(t, err)

		h := evuFixtureHandler(pool)
		rec := evuFixtureRequest(h, variantID, fmt.Sprintf(`{"fansub_groups":[{"id":%d}]}`, keptGroupID))

		require.Equal(t, http.StatusConflict, rec.Code, rec.Body.String())
		require.Contains(t, rec.Body.String(), "release_version_group_has_dependents")
		require.Contains(t, rec.Body.String(), "1 Credit,")
	})

	t.Run("200 when the removed group has zero dependents", func(t *testing.T) {
		pool := openEVUFixture(t)
		ctx := context.Background()

		const (
			releaseVersionID = int64(5032)
			variantID        = int64(5042)
			keptGroupID      = int64(5053)
			removedGroupID   = int64(5054)
		)
		_, err := pool.Exec(ctx, `INSERT INTO release_versions (id, release_id) VALUES ($1, 5021)`, releaseVersionID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO release_variants (id, release_version_id) VALUES ($1, $2)`, variantID, releaseVersionID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id, slug, name) VALUES ($1, 'kept2', 'Kept'), ($2, 'removed2', 'Removed')`, keptGroupID, removedGroupID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `
			INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES
				($1, $2), ($1, $3)
		`, releaseVersionID, keptGroupID, removedGroupID)
		require.NoError(t, err)

		h := evuFixtureHandler(pool)
		rec := evuFixtureRequest(h, variantID, fmt.Sprintf(`{"fansub_groups":[{"id":%d}]}`, keptGroupID))

		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

		var response struct {
			Data models.EpisodeVersion `json:"data"`
		}
		require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &response))
		require.Len(t, response.Data.FansubGroups, 1)
		require.Equal(t, keptGroupID, response.Data.FansubGroups[0].ID)
	})

	t.Run("400 when the patch would reduce the release version to zero groups", func(t *testing.T) {
		pool := openEVUFixture(t)
		ctx := context.Background()

		const (
			releaseVersionID = int64(5033)
			variantID        = int64(5043)
			groupID          = int64(5055)
		)
		_, err := pool.Exec(ctx, `INSERT INTO release_versions (id, release_id) VALUES ($1, 5021)`, releaseVersionID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO release_variants (id, release_version_id) VALUES ($1, $2)`, variantID, releaseVersionID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id, slug, name) VALUES ($1, 'sole', 'Sole')`, groupID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $2)`, releaseVersionID, groupID)
		require.NoError(t, err)

		h := evuFixtureHandler(pool)
		rec := evuFixtureRequest(h, variantID, `{"fansub_groups":[]}`)

		require.Equal(t, http.StatusBadRequest, rec.Code, rec.Body.String())
	})
}

// TestUpdateEpisodeVersionGroupGuardErrorsIsChainIsWired is a narrow unit check
// (no HTTP layer) proving the errors.Is chain this task adds actually recognizes
// both new Phase-187 sentinels, independent of the full-stack tests above.
func TestUpdateEpisodeVersionGroupGuardErrorsIsChainIsWired(t *testing.T) {
	require.True(t, errors.Is(repository.ErrGroupHasDependents, repository.ErrGroupHasDependents))
	require.True(t, errors.Is(repository.ErrReleaseVersionGroupsEmpty, repository.ErrReleaseVersionGroupsEmpty))
}
