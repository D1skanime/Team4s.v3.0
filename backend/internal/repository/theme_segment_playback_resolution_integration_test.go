package repository_test

import (
	"context"
	"testing"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"
	"team4s.v3/backend/internal/testsupport"

	"github.com/stretchr/testify/require"
)

// TestThemeSegmentPlaybackResolution beweist gegen eine echte, isolierte Postgres-
// Instanz das reale Mehr-Folgen-Verhalten der Phase-117-Plan-03-Umstellung (nicht
// nur String-Pattern-Checks wie das aeltere segment_playback_resolution_test.go):
//   - deterministische Pro-Release-Version-Aufloesung (RESEARCH.md Risk 3)
//   - Override-Isolation (D-01): ein Zeit-Override fuer Folge B veraendert NICHT die
//     Offset-Werte von Folge A desselben geteilten Segments
//   - Render-Cache-Kollisionsfreiheit inkl. Beweis auf Ebene der tatsaechlich
//     genutzten SourceIdentity/Cache-Key-Hashfunktion (Nyquist-Fix W2, RESEARCH.md
//     Risk 1)
//   - Episoden-Bereichsfilterung in GetSegmentReleaseDuration (RESEARCH.md Risk 3)
//
// Package repository_test (statt repository) exakt wie review_credit_repository_test.go
// -- dieser Test importiert services (fuer BuildSegmentRenderCacheKey), und services
// importiert seinerseits repository (anime_metadata_backfill.go); ein Import aus dem
// internen Test-Package repository wuerde daher einen Import-Zyklus erzeugen.
//
// Skips cleanly when TEAM4S_PHASE117_TEST_DSN is unset.
func TestThemeSegmentPlaybackResolution(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	repo := repository.NewAdminContentRepository(pool)

	const (
		animeID         = int64(1)
		episodeOneID    = int64(1)
		episodeTwoID    = int64(2)
		fansubGroupID   = int64(1)
		fansubReleaseA  = int64(1)
		fansubReleaseB  = int64(2)
		releaseVersionA = int64(10)
		releaseVersionB = int64(20)
		variantAID      = int64(100)
		variantBID      = int64(200)
		streamSourceA   = int64(1000)
		streamSourceB   = int64(2000)
		releaseStreamA  = int64(1)
		releaseStreamB  = int64(2)
		themeTypeID     = int64(1)
		themeID         = int64(1)
	)

	_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO episodes (id, anime_id, sort_index, episode_number) VALUES ($1, $3, 1, '1'), ($2, $3, 2, '2')
	`, episodeOneID, episodeTwoID, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $3), ($2, $4)
	`, fansubReleaseA, fansubReleaseB, episodeOneID, episodeTwoID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_versions (id, release_id, version) VALUES ($1, $3, 'v1'), ($2, $4, 'v1')
	`, releaseVersionA, releaseVersionB, fansubReleaseA, fansubReleaseB)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $3), ($2, $3)
	`, releaseVersionA, releaseVersionB, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_variants (id, release_version_id, duration_seconds) VALUES ($1, $3, 1500), ($2, $4, 1600)
	`, variantAID, variantBID, releaseVersionA, releaseVersionB)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO stream_sources (id, provider_type, external_id, url)
		VALUES ($1, 'jellyfin', 'ext-A', 'https://jellyfin.example/a'), ($2, 'jellyfin', 'ext-B', 'https://jellyfin.example/b')
	`, streamSourceA, streamSourceB)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_streams (id, variant_id, stream_source_id) VALUES ($1, $3, $5), ($2, $4, $6)
	`, releaseStreamA, releaseStreamB, variantAID, variantBID, streamSourceA, streamSourceB)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES ($1, 'OP1')`, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id) VALUES ($1, $2, $3)`, themeID, animeID, themeTypeID)
	require.NoError(t, err)

	startEpisode := 1
	endEpisode := 2
	startTime := "00:01:00"
	endTime := "00:01:30"
	version := "v1"

	segment, err := repo.CreateAnimeSegment(ctx, animeID, models.AdminThemeSegmentCreateInput{
		ThemeID:       themeID,
		FansubGroupID: ptrInt64(fansubGroupID),
		Version:       version,
		StartEpisode:  &startEpisode,
		EndEpisode:    &endEpisode,
		StartTime:     &startTime,
		EndTime:       &endTime,
	}, releaseVersionA)
	require.NoError(t, err)
	segmentID := segment.ID

	_, err = repo.AssignThemeSegmentToReleaseVersion(ctx, segmentID, releaseVersionB)
	require.NoError(t, err)

	// Ein echter Segment-Patch (statt eines No-Op-Aufrufs) loest syncThemeSegmentPlaybackSourceTx
	// fuer ALLE aktuell zugewiesenen Release-Versionen (A und B) erneut aus -- exakt der Pfad, den
	// ein Admin ueber PATCH .../segments/:id in der Praxis durchlaeuft.
	resyncSegment := func(t *testing.T) {
		t.Helper()
		err := repo.UpdateAnimeSegment(ctx, segmentID, models.AdminThemeSegmentPatchInput{Version: &version})
		require.NoError(t, err)
	}
	resyncSegment(t)

	t.Run("resolves distinct StreamExternalID per release version (RESEARCH.md Risk 3)", func(t *testing.T) {
		sourceA, err := repo.GetThemeSegmentRenderSource(ctx, segmentID, releaseVersionA)
		require.NoError(t, err)
		sourceB, err := repo.GetThemeSegmentRenderSource(ctx, segmentID, releaseVersionB)
		require.NoError(t, err)

		require.NotNil(t, sourceA.StreamExternalID)
		require.NotNil(t, sourceB.StreamExternalID)
		require.Equal(t, "ext-A", *sourceA.StreamExternalID)
		require.Equal(t, "ext-B", *sourceB.StreamExternalID)
		require.NotEqual(t, *sourceA.StreamExternalID, *sourceB.StreamExternalID,
			"zwei unterschiedliche Release-Versionen desselben geteilten Segments muessen unterschiedliche Streams aufloesen")
	})

	t.Run("episode override applies only to its own release version, base time for the other stays unchanged (D-01)", func(t *testing.T) {
		_, err := repo.UpsertThemeSegmentEpisodeOverride(ctx, models.AdminThemeSegmentEpisodeOverrideUpsertInput{
			ThemeSegmentID:   segmentID,
			ReleaseVersionID: releaseVersionB,
			StartTime:        "00:01:30",
			EndTime:          "00:03:00",
		})
		require.NoError(t, err)
		resyncSegment(t)

		var startOffsetA, endOffsetA, startOffsetB, endOffsetB int32
		err = pool.QueryRow(ctx, `
			SELECT start_offset_seconds, end_offset_seconds
			FROM theme_segment_playback_sources
			WHERE theme_segment_id = $1 AND release_version_id = $2
		`, segmentID, releaseVersionA).Scan(&startOffsetA, &endOffsetA)
		require.NoError(t, err)
		err = pool.QueryRow(ctx, `
			SELECT start_offset_seconds, end_offset_seconds
			FROM theme_segment_playback_sources
			WHERE theme_segment_id = $1 AND release_version_id = $2
		`, segmentID, releaseVersionB).Scan(&startOffsetB, &endOffsetB)
		require.NoError(t, err)

		require.Equal(t, int32(60), startOffsetA, "Release-Version A muss die unveraenderte Basis-Zeit behalten (00:01:00)")
		require.Equal(t, int32(90), endOffsetA, "Release-Version A muss die unveraenderte Basis-Zeit behalten (00:01:30)")
		require.Equal(t, int32(90), startOffsetB, "Release-Version B muss die Override-Zeit als Offset-Basis verwenden (00:01:30)")
		require.Equal(t, int32(180), endOffsetB, "Release-Version B muss die Override-Zeit als Offset-Basis verwenden (00:03:00)")
	})

	t.Run("ready render cache lookup is release_version_id-scoped, no cross-episode leak (RESEARCH.md Risk 1)", func(t *testing.T) {
		sourceA, err := repo.GetThemeSegmentRenderSource(ctx, segmentID, releaseVersionA)
		require.NoError(t, err)
		sourceB, err := repo.GetThemeSegmentRenderSource(ctx, segmentID, releaseVersionB)
		require.NoError(t, err)

		cacheA, err := repo.UpsertThemeSegmentRenderCacheQueued(ctx, models.ThemeSegmentRenderCacheUpsertInput{
			ThemeSegmentID:    segmentID,
			PlaybackSourceID:  &sourceA.PlaybackSourceID,
			ReleaseVersionID:  ptrInt64(releaseVersionA),
			CacheKey:          "theme-segment-test-cache-a",
			SourceKind:        sourceA.SourceKind,
			SourceFingerprint: "fingerprint-a",
			RenderProfile:     services.DefaultSegmentRenderProfile,
		})
		require.NoError(t, err)
		cacheB, err := repo.UpsertThemeSegmentRenderCacheQueued(ctx, models.ThemeSegmentRenderCacheUpsertInput{
			ThemeSegmentID:    segmentID,
			PlaybackSourceID:  &sourceB.PlaybackSourceID,
			ReleaseVersionID:  ptrInt64(releaseVersionB),
			CacheKey:          "theme-segment-test-cache-b",
			SourceKind:        sourceB.SourceKind,
			SourceFingerprint: "fingerprint-b",
			RenderProfile:     services.DefaultSegmentRenderProfile,
		})
		require.NoError(t, err)

		require.NoError(t, repo.MarkThemeSegmentRenderCacheReady(ctx, models.ThemeSegmentRenderCacheReadyInput{
			CacheKey: cacheA.CacheKey, OutputPath: "a.mp4", MimeType: "video/mp4",
			DurationSeconds: 30, VideoCodec: "h264", AudioCodec: "aac",
		}))
		require.NoError(t, repo.MarkThemeSegmentRenderCacheReady(ctx, models.ThemeSegmentRenderCacheReadyInput{
			CacheKey: cacheB.CacheKey, OutputPath: "b.mp4", MimeType: "video/mp4",
			DurationSeconds: 90, VideoCodec: "h264", AudioCodec: "aac",
		}))

		readyA, err := repo.GetReadyThemeSegmentRenderCache(ctx, segmentID, releaseVersionA)
		require.NoError(t, err)
		require.Equal(t, "theme-segment-test-cache-a", readyA.CacheKey,
			"GetReadyThemeSegmentRenderCache(segment, A) darf NICHT den fuer B markierten Cache-Eintrag liefern")

		readyB, err := repo.GetReadyThemeSegmentRenderCache(ctx, segmentID, releaseVersionB)
		require.NoError(t, err)
		require.Equal(t, "theme-segment-test-cache-b", readyB.CacheKey,
			"GetReadyThemeSegmentRenderCache(segment, B) darf NICHT den fuer A markierten Cache-Eintrag liefern")
	})

	t.Run("BuildSegmentRenderCacheKey produces distinct keys for distinct release versions (Nyquist-Fix W2)", func(t *testing.T) {
		sourceA, err := repo.GetThemeSegmentRenderSource(ctx, segmentID, releaseVersionA)
		require.NoError(t, err)
		sourceB, err := repo.GetThemeSegmentRenderSource(ctx, segmentID, releaseVersionB)
		require.NoError(t, err)
		require.NotNil(t, sourceA.StartOffsetSeconds)
		require.NotNil(t, sourceA.EndOffsetSeconds)
		require.NotNil(t, sourceA.StreamExternalID)
		require.NotNil(t, sourceB.StreamExternalID)

		keyA, err := services.BuildSegmentRenderCacheKey(services.SegmentRenderWindow{
			SegmentID:      segmentID,
			SourceKind:     sourceA.SourceKind,
			SourceIdentity: *sourceA.StreamExternalID,
			StartSeconds:   *sourceA.StartOffsetSeconds,
			EndSeconds:     *sourceA.EndOffsetSeconds,
			RenderProfile:  services.DefaultSegmentRenderProfile,
		})
		require.NoError(t, err)
		keyB, err := services.BuildSegmentRenderCacheKey(services.SegmentRenderWindow{
			SegmentID:      segmentID,
			SourceKind:     sourceB.SourceKind,
			SourceIdentity: *sourceB.StreamExternalID,
			// Bewusst dieselben Start/End-Werte wie keyA: das isoliert SourceIdentity als
			// einzige tatsaechliche Variable zwischen den beiden Keys (Nyquist-Fix W2 --
			// der Unterschied muss von SourceIdentity kommen, nicht von einer zufaellig
			// abweichenden Offset-Zeit).
			StartSeconds:  *sourceA.StartOffsetSeconds,
			EndSeconds:    *sourceA.EndOffsetSeconds,
			RenderProfile: services.DefaultSegmentRenderProfile,
		})
		require.NoError(t, err)

		require.NotEqual(t, keyA, keyB,
			"RESEARCH.md Risk 1 ist nur behoben, wenn zwei Release-Versionen desselben Segments tatsaechlich unterschiedliche Cache-Key-Strings erzeugen (nicht nur unterschiedliche DB-Spaltenwerte)")
	})

	t.Run("GetSegmentReleaseDuration returns nil when the only matching variant lies outside the requested episode range (RESEARCH.md Risk 3)", func(t *testing.T) {
		// Die einzige Variante fuer (animeID, fansubGroupID, 'v1') in Folge-1-Kontext (releaseVersionA)
		// liegt bei Episode 1 -- ein Bereichsfilter 5..6 darf keine Laufzeit liefern.
		duration, err := repo.GetSegmentReleaseDuration(ctx, animeID, fansubGroupID, version, 5, 6)
		require.NoError(t, err)
		require.Nil(t, duration, "eine Variante ausserhalb des angefragten Episoden-Bereichs darf nicht geliefert werden")

		durationInRange, err := repo.GetSegmentReleaseDuration(ctx, animeID, fansubGroupID, version, 1, 1)
		require.NoError(t, err)
		require.NotNil(t, durationInRange, "eine Variante innerhalb des angefragten Episoden-Bereichs muss weiterhin gefunden werden")
	})
}

func ptrInt64(v int64) *int64 { return &v }
