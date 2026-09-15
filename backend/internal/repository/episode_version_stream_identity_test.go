package repository_test

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
)

func TestReleaseStreamIdentityExplicitSourceAndLegacyCollision(t *testing.T) {
	pool, _ := openEpisodeVersionPublicFixture(t)
	ctx := context.Background()
	repo := repository.NewEpisodeVersionRepository(pool)
	// A colliding foreign variant ID must never override a canonical release version.
	legacy, err := repo.GetReleaseStreamSource(ctx, 10)
	require.NoError(t, err)
	require.EqualValues(t, 10, legacy.ID)
	require.Equal(t, "own", legacy.MediaItemID)
	explicit, ok := any(repo).(interface {
		GetReleaseStreamSource(context.Context, int64, ...int64) (*models.ReleaseStreamSource, error)
	})
	require.True(t, ok, "existing resolver must accept an explicit optional variant selector")
	own, err := explicit.GetReleaseStreamSource(ctx, 10, 100)
	require.NoError(t, err)
	require.EqualValues(t, 10, own.ID)
	require.Equal(t, "own", own.MediaItemID)
	_, err = explicit.GetReleaseStreamSource(ctx, 10, 10)
	require.ErrorIs(t, err, repository.ErrNotFound)
	foreign, err := explicit.GetReleaseStreamSource(ctx, 20, 10)
	require.NoError(t, err)
	require.EqualValues(t, 20, foreign.ID)
	_, err = explicit.GetReleaseStreamSource(ctx, 10, 999)
	require.ErrorIs(t, err, repository.ErrNotFound)
	_, err = explicit.GetReleaseStreamSource(ctx, 11, 101)
	require.ErrorIs(t, err, repository.ErrNotFound, "valid variant without stream")
	_, err = pool.Exec(ctx, `INSERT INTO release_streams (id,variant_id,stream_source_id) VALUES (20,101,2),(21,200,2)`)
	require.NoError(t, err)
	equal, err := explicit.GetReleaseStreamSource(ctx, 200, 200)
	require.NoError(t, err)
	require.EqualValues(t, 200, equal.ID)
	second, err := explicit.GetReleaseStreamSource(ctx, 11, 101)
	require.NoError(t, err)
	require.EqualValues(t, 11, second.ID)
	for _, selector := range []int64{0, -1} {
		_, err = explicit.GetReleaseStreamSource(ctx, 10, selector)
		require.ErrorIs(t, err, repository.ErrValidation)
	}
	_, err = explicit.GetReleaseStreamSource(ctx, 10, 100, 101)
	require.ErrorIs(t, err, repository.ErrValidation)
}

func TestReleaseStreamIdentitySnapshotSingleRead(t *testing.T) {
	pool, tr := openEpisodeVersionPublicFixture(t)
	ctx := context.Background()
	repo := repository.NewEpisodeVersionRepository(pool)
	source, err := repo.GetReleaseStreamSource(ctx, 10)
	require.NoError(t, err)
	require.Nil(t, source.JellyfinSource)
	require.Len(t, tr.queries, 1)
	_, err = pool.Exec(ctx, `UPDATE stream_sources SET metadata='{"jellyfin_source":{"version":1,"media_source_id":"B","source_path":"/library/B.mkv","streams_complete":true,"subtitle_tracks":[{"index":4},{"index":8}]}}' WHERE id=2`)
	require.NoError(t, err)
	tr.reset()
	source, err = repo.GetReleaseStreamSource(ctx, 10, 100)
	require.NoError(t, err)
	require.NotNil(t, source.JellyfinSource)
	require.Equal(t, "B", *source.MediaSourceID)
	require.Len(t, source.JellyfinSource.SubtitleTracks, 2)
	require.Len(t, tr.queries, 1, "one chosen source query, independent of tracks")
	_, err = pool.Exec(ctx, `INSERT INTO release_variants(id,release_version_id) VALUES (102,10); INSERT INTO release_streams(id,variant_id,stream_source_id) VALUES(0,102,1)`)
	require.NoError(t, err)
	source, err = repo.GetReleaseStreamSource(ctx, 10)
	require.NoError(t, err)
	require.Equal(t, "own", source.MediaItemID, "variant order precedes stream order")
}

func TestEpisodeVersionStreamURLProjectionSanitizesWithoutWriting(t *testing.T) {
	cases := []struct {
		name, provider, raw, want string
		absent                    bool
	}{
		{"jellyfin", "jellyfin", "https://media.fixture/stream?api_key=dummy-private-key&MediaSourceId=B&static=true#dummy-private-key", "https://media.fixture/stream?MediaSourceId=B&static=true", false},
		{"mixed provider spelling", " JeLlYfIn ", "https://media.fixture/stream?ApiKey=dummy-private-key&X-Emby-Token=dummy-private-key&keep=yes", "https://media.fixture/stream?keep=yes", false},
		{"malformed", "jellyfin", "://dummy-private-key", "", true},
		{"malformed query", "jellyfin", "https://media.fixture/stream?api_key=dummy-private-key&bad=%ZZ", "", true},
		{"emby unchanged", "emby", "https://media.fixture/stream?api_key=dummy-private-key", "https://media.fixture/stream?api_key=dummy-private-key", false},
		{"fanart unchanged", "fanart", "https://media.fixture/stream?api_key=dummy-private-key", "https://media.fixture/stream?api_key=dummy-private-key", false},
		{"external unchanged", "external", "https://media.fixture/stream?api_key=dummy-private-key", "https://media.fixture/stream?api_key=dummy-private-key", false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			pool, tr := openEpisodeVersionPublicFixture(t)
			ctx := context.Background()
			_, err := pool.Exec(ctx, "UPDATE stream_sources SET provider_type=$1,url=$2 WHERE id=2", tc.provider, tc.raw)
			require.NoError(t, err)
			_, err = pool.Exec(ctx, "DELETE FROM release_streams WHERE id=3")
			require.NoError(t, err)
			repo := repository.NewEpisodeVersionRepository(pool)
			tr.reset()
			item, err := repo.GetByID(ctx, 100)
			require.NoError(t, err)
			if tc.absent {
				require.Nil(t, item.StreamURL)
			} else {
				require.NotNil(t, item.StreamURL)
				require.Equal(t, tc.want, *item.StreamURL)
			}
			editor := models.EpisodeVersionEditorContext{Version: *item}
			for _, response := range []any{item, editor} {
				raw, err := json.Marshal(response)
				require.NoError(t, err)
				if strings.EqualFold(strings.TrimSpace(tc.provider), "jellyfin") {
					require.NotContains(t, string(raw), "dummy-private-key")
				}
			}
			grouped, err := repo.ListGroupedByAnimeID(ctx, 1, true, true)
			require.NoError(t, err)
			body, err := json.Marshal(grouped)
			require.NoError(t, err)
			if strings.EqualFold(strings.TrimSpace(tc.provider), "jellyfin") {
				require.NotContains(t, string(body), "dummy-private-key")
			}
			for _, q := range tr.queries {
				require.NotContains(t, strings.ToUpper(q.SQL), "UPDATE STREAM_SOURCES")
			}
			var stored string
			require.NoError(t, pool.QueryRow(ctx, "SELECT url FROM stream_sources WHERE id=2").Scan(&stored))
			require.Equal(t, tc.raw, stored, "output projection must not rewrite stored source")
		})
	}
}

func TestEpisodeVersionStreamURLProjectionCreateAndUpdateResponses(t *testing.T) {
	pool := versionSourceFixture(t)
	ctx := context.Background()
	repo := repository.NewEpisodeVersionRepository(pool)
	raw := "https://media.fixture/Videos/created/stream?api_key=dummy-create-key&MediaSourceId=created-B&static=true"
	binding := versionSourceSnapshot("created-B", "/anime/created.mkv", true)
	created, err := repo.Create(ctx, models.EpisodeVersionCreateInput{AnimeID: 1, EpisodeNumber: 2, MediaProvider: "jellyfin", MediaItemID: "created", StreamURL: &raw, JellyfinSource: binding})
	require.NoError(t, err)
	for _, item := range []*models.EpisodeVersion{created} {
		encoded, err := json.Marshal(item)
		require.NoError(t, err)
		require.NotContains(t, string(encoded), "dummy-create-key")
		require.NotNil(t, item.StreamURL)
		require.Contains(t, *item.StreamURL, "MediaSourceId=created-B")
	}
	title := "Updated title"
	updated, err := repo.Update(ctx, created.VariantID, models.EpisodeVersionPatchInput{Title: models.OptionalString{Set: true, Value: &title}})
	require.NoError(t, err)
	encoded, err := json.Marshal(updated)
	require.NoError(t, err)
	require.NotContains(t, string(encoded), "dummy-create-key")
	var stored string
	require.NoError(t, pool.QueryRow(ctx, "SELECT url FROM stream_sources WHERE provider_type='jellyfin' AND external_id='created'").Scan(&stored))
	require.Equal(t, raw, stored, "create/update response projection does not migrate the persisted URL")
}
