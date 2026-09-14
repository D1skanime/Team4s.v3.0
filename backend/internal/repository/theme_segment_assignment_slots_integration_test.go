package repository

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/testsupport"
)

type segmentSlotFixture struct {
	pool     *pgxpool.Pool
	repo     *AdminContentRepository
	ctx      context.Context
	versions []int64
}

func newSegmentSlotFixture(t *testing.T) segmentSlotFixture {
	t.Helper()
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	seedAutoAssignBaseFixture(t, pool, ctx, 1, 1, 1)
	seedAutoAssignFansubGroup(t, pool, ctx, 1)
	seedAutoAssignFansubGroup(t, pool, ctx, 2)
	_, err := pool.Exec(ctx, `
        INSERT INTO theme_types(id,name) VALUES (2,'ED Kara'),(3,'Opening 2'),(4,'Insert');
        INSERT INTO themes(id,anime_id,theme_type_id) VALUES(2,1,2),(3,1,3),(4,1,4);
    `)
	require.NoError(t, err)
	f := segmentSlotFixture{pool: pool, repo: NewAdminContentRepository(pool), ctx: ctx}
	for n := 1; n <= 5; n++ {
		id := createAutoAssignReleaseVersion(t, pool, ctx, int64(100+n))
		_, err := pool.Exec(ctx, `INSERT INTO release_version_groups(release_version_id,fansub_group_id) VALUES($1,1)`, id)
		require.NoError(t, err)
		f.versions = append(f.versions, id)
	}
	return f
}

func (f segmentSlotFixture) segment(t *testing.T, themeID int64, start, end int) int64 {
	t.Helper()
	return seedAutoAssignThemeSegment(t, f.pool, f.ctx, themeID, 1, start, end)
}
func (f segmentSlotFixture) assign(t *testing.T, segmentID int64, episode int) {
	t.Helper()
	_, err := f.repo.AssignThemeSegmentToReleaseVersion(f.ctx, segmentID, f.versions[episode-1])
	require.NoError(t, err)
}
func (f segmentSlotFixture) ids(t *testing.T, segmentID int64) []int64 {
	t.Helper()
	ids, err := f.repo.ListThemeSegmentAssignments(f.ctx, segmentID)
	require.NoError(t, err)
	return ids
}
func (f segmentSlotFixture) createInput(themeID int64, start, end int) models.AdminThemeSegmentCreateInput {
	group := int64(1)
	return models.AdminThemeSegmentCreateInput{ThemeID: themeID, FansubGroupID: &group, Version: "v1", StartEpisode: &start, EndEpisode: &end}
}

func TestSegmentSlotDirectAndRange(t *testing.T) {
	f := newSegmentSlotFixture(t)
	op := f.segment(t, 1, 4, 4)
	ed := f.segment(t, 2, 2, 2)
	f.assign(t, op, 4)
	f.assign(t, ed, 2)
	contender := f.segment(t, 3, 1, 4)
	_, err := f.repo.AssignThemeSegmentToReleaseVersion(f.ctx, contender, f.versions[3])
	require.ErrorIs(t, err, ErrSegmentAssignmentConflict, "all canonical OP aliases share one real-version slot")
	f.assign(t, op, 4) // own repeat is idempotent
	result, err := f.repo.AssignThemeSegmentToEpisodeRange(f.ctx, contender, 1, 1, "v1", 1, 4)
	require.NoError(t, err)
	require.ElementsMatch(t, f.versions[:3], result.Added)
	require.Equal(t, []models.ThemeSegmentAssignmentConflict{{ReleaseVersionID: f.versions[3], EpisodeNumber: "4", ExistingSegmentID: op}}, result.SkippedConflicts)
	edRange := f.segment(t, 2, 1, 4)
	result, err = f.repo.AssignThemeSegmentToEpisodeRange(f.ctx, edRange, 1, 1, "v1", 1, 4)
	require.NoError(t, err)
	require.ElementsMatch(t, []int64{f.versions[0], f.versions[2], f.versions[3]}, result.Added)
	require.Equal(t, []models.ThemeSegmentAssignmentConflict{{ReleaseVersionID: f.versions[1], EpisodeNumber: "2", ExistingSegmentID: ed}}, result.SkippedConflicts)
	// Persisted range does not override the actual sparse assignments.
	require.ElementsMatch(t, []int64{f.versions[0], f.versions[2], f.versions[3]}, f.ids(t, edRange))
	result, err = f.repo.AssignThemeSegmentToEpisodeRange(f.ctx, edRange, 1, 1, "v1", 1, 4)
	require.NoError(t, err)
	require.Empty(t, result.Added)
	require.Len(t, result.SkippedConflicts, 1)
}

func TestSegmentSlotAtomicCreateAndUpdate(t *testing.T) {
	f := newSegmentSlotFixture(t)
	occupied := f.segment(t, 1, 4, 4)
	f.assign(t, occupied, 4)
	t.Run("single occupied create rolls back segment", func(t *testing.T) {
		var before, after int
		require.NoError(t, f.pool.QueryRow(f.ctx, `SELECT count(*) FROM theme_segments`).Scan(&before))
		created, result, err := f.repo.CreateAnimeSegment(f.ctx, 1, f.createInput(3, 4, 4), f.versions[3])
		require.ErrorIs(t, err, ErrSegmentAssignmentConflict)
		require.Nil(t, created)
		require.Nil(t, result)
		require.NoError(t, f.pool.QueryRow(f.ctx, `SELECT count(*) FROM theme_segments`).Scan(&after))
		require.Equal(t, before, after)
	})
	t.Run("range create skips occupied editor release", func(t *testing.T) {
		created, result, err := f.repo.CreateAnimeSegment(f.ctx, 1, f.createInput(3, 1, 4), f.versions[3])
		require.NoError(t, err)
		require.NotNil(t, created)
		require.ElementsMatch(t, f.versions[:3], created.AssignedReleaseVersionIDs)
		require.Len(t, result.SkippedConflicts, 1)
		t.Run("all occupied update leaves metadata and assignments", func(t *testing.T) {
			start, end := 4, 4
			_, err := f.repo.UpdateAnimeSegment(f.ctx, created.ID, models.AdminThemeSegmentPatchInput{StartEpisode: &start, EndEpisode: &end})
			require.ErrorIs(t, err, ErrSegmentAssignmentConflict)
			var savedStart, savedEnd int
			require.NoError(t, f.pool.QueryRow(f.ctx, `SELECT start_episode,end_episode FROM theme_segments WHERE id=$1`, created.ID).Scan(&savedStart, &savedEnd))
			require.Equal(t, 1, savedStart)
			require.Equal(t, 4, savedEnd)
			require.ElementsMatch(t, f.versions[:3], f.ids(t, created.ID))
		})
		t.Run("own unchanged edit allowed", func(t *testing.T) {
			version := "v1"
			result, err := f.repo.UpdateAnimeSegment(f.ctx, created.ID, models.AdminThemeSegmentPatchInput{Version: &version})
			require.NoError(t, err)
			require.Empty(t, result.Added)
			require.Len(t, result.SkippedConflicts, 1)
		})
	})
	t.Run("future range with no release remains valid", func(t *testing.T) {
		created, result, err := f.repo.CreateAnimeSegment(f.ctx, 1, f.createInput(2, 10, 12), 0)
		require.NoError(t, err)
		require.NotNil(t, created)
		require.Empty(t, result.Added)
	})
}

func TestSegmentSlotTypeMutationAndOverrideProtection(t *testing.T) {
	f := newSegmentSlotFixture(t)
	op := f.segment(t, 1, 1, 4)
	ed := f.segment(t, 2, 2, 2)
	f.assign(t, op, 2)
	f.assign(t, op, 4)
	f.assign(t, ed, 2)
	_, err := f.repo.UpsertThemeSegmentEpisodeOverride(f.ctx, models.AdminThemeSegmentEpisodeOverrideUpsertInput{ThemeSegmentID: op, ReleaseVersionID: f.versions[3], StartTime: "00:00:10", EndTime: "00:01:30"})
	require.NoError(t, err)
	result, err := f.repo.AssignThemeSegmentToEpisodeRange(f.ctx, op, 1, 1, "v1", 2, 2)
	require.NoError(t, err)
	require.Equal(t, []int64{f.versions[3]}, result.ProtectedByOverride)
	edTheme := int64(2)
	_, err = f.repo.UpdateAnimeSegment(f.ctx, op, models.AdminThemeSegmentPatchInput{ThemeID: &edTheme})
	require.ErrorIs(t, err, ErrSegmentAssignmentConflict)
	var actualTheme int64
	require.NoError(t, f.pool.QueryRow(f.ctx, `SELECT theme_id FROM theme_segments WHERE id=$1`, op).Scan(&actualTheme))
	require.Equal(t, int64(1), actualTheme)
	err = f.repo.UpdateAdminAnimeTheme(f.ctx, 1, models.AdminAnimeThemePatchInput{ThemeTypeID: &edTheme})
	require.ErrorIs(t, err, ErrSegmentAssignmentConflict)
	var actualType int64
	require.NoError(t, f.pool.QueryRow(f.ctx, `SELECT theme_type_id FROM themes WHERE id=1`).Scan(&actualType))
	require.Equal(t, int64(1), actualType)
	override, err := f.repo.GetThemeSegmentEpisodeOverride(f.ctx, op, f.versions[3])
	require.NoError(t, err)
	require.Equal(t, "00:00:10", override.StartTime)
}

func TestSegmentSlotThemeMutationChecksItsOwnSegments(t *testing.T) {
	f := newSegmentSlotFixture(t)
	a, b := f.segment(t, 4, 1, 1), f.segment(t, 4, 1, 1)
	f.assign(t, a, 1)
	f.assign(t, b, 1) // INSERT remains multi-valued.
	op := int64(1)
	require.ErrorIs(t, f.repo.UpdateAdminAnimeTheme(f.ctx, 4, models.AdminAnimeThemePatchInput{ThemeTypeID: &op}), ErrSegmentAssignmentConflict)
}

func TestSegmentSlotConcurrentWriters(t *testing.T) {
	f := newSegmentSlotFixture(t)
	a, b := f.segment(t, 1, 1, 1), f.segment(t, 3, 1, 1)
	start := make(chan struct{})
	results := make(chan error, 2)
	ctx, cancel := context.WithTimeout(f.ctx, 10*time.Second)
	defer cancel()
	var wg sync.WaitGroup
	for _, id := range []int64{a, b} {
		wg.Add(1)
		go func(id int64) {
			defer wg.Done()
			<-start
			_, err := f.repo.AssignThemeSegmentToReleaseVersion(ctx, id, f.versions[0])
			results <- err
		}(id)
	}
	close(start)
	wg.Wait()
	close(results)
	successes, conflicts := 0, 0
	for err := range results {
		if err == nil {
			successes++
		} else if errors.Is(err, ErrSegmentAssignmentConflict) {
			conflicts++
		} else {
			t.Fatal(err)
		}
	}
	require.Equal(t, 1, successes)
	require.Equal(t, 1, conflicts)
	var count int
	require.NoError(t, f.pool.QueryRow(f.ctx, `SELECT count(*) FROM theme_segment_assignments WHERE release_version_id=$1`, f.versions[0]).Scan(&count))
	require.Equal(t, 1, count)
}

func TestSegmentSlotReverseImportAmbiguityAndIsolation(t *testing.T) {
	f := newSegmentSlotFixture(t)
	first, second := f.segment(t, 1, 1, 4), f.segment(t, 3, 1, 4)
	ed := f.segment(t, 2, 1, 4)
	// Cross-anime lookalike must not enter the candidate set.
	_, err := f.pool.Exec(f.ctx, `INSERT INTO anime(id) VALUES(2); INSERT INTO themes(id,anime_id,theme_type_id) VALUES(5,2,2)`)
	require.NoError(t, err)
	otherAnime := f.segment(t, 5, 1, 4)
	callUpsertReleaseVersionGroup(t, f.pool, f.ctx, f.versions[0], 1)
	require.Empty(t, f.ids(t, first))
	require.Empty(t, f.ids(t, second))
	require.Empty(t, f.ids(t, otherAnime))
	require.Equal(t, []int64{f.versions[0]}, f.ids(t, ed))
	// An existing assignment is never replaced when a later import sees ambiguity.
	f.assign(t, first, 2)
	callUpsertReleaseVersionGroup(t, f.pool, f.ctx, f.versions[1], 1)
	require.Equal(t, []int64{f.versions[1]}, f.ids(t, first))
	require.Empty(t, f.ids(t, second))
	// Same episode, another actual version/group has its own OP slot.
	_, err = f.pool.Exec(f.ctx, `INSERT INTO release_versions(id,release_id,version) SELECT 999,release_id,'v2' FROM release_versions WHERE id=$1`, f.versions[0])
	require.NoError(t, err)
	_, err = f.pool.Exec(f.ctx, `INSERT INTO release_version_groups VALUES(999,2)`)
	require.NoError(t, err)
	_, err = f.repo.AssignThemeSegmentToReleaseVersion(f.ctx, second, 999)
	require.NoError(t, err)
	_, err = f.repo.AssignThemeSegmentToReleaseVersion(f.ctx, otherAnime, 999)
	require.ErrorIs(t, err, ErrConflict)
}

func TestSegmentSlotRangeHasBoundedAssignmentStatements(t *testing.T) {
	// The new write seam must use one set-based insertion, not one command per
	// release. Functional large-range fixture verifies all rows reach the same set.
	f := newSegmentSlotFixture(t)
	for n := 6; n <= 100; n++ {
		e := int64(100 + n)
		_, err := f.pool.Exec(f.ctx, `INSERT INTO episodes(id,anime_id,sort_index,episode_number) VALUES($1,1,$2,$3)`, e, n, fmt.Sprint(n))
		require.NoError(t, err)
		rv := createAutoAssignReleaseVersion(t, f.pool, f.ctx, e)
		_, err = f.pool.Exec(f.ctx, `INSERT INTO release_version_groups VALUES($1,1)`, rv)
		require.NoError(t, err)
	}
	segment := f.segment(t, 1, 1, 100)
	counter := &queryCounter{}
	traced := openTracedPoolOnSameSchema(t, f.pool, counter)
	repo := NewAdminContentRepository(traced)
	counter.reset()
	result, err := repo.AssignThemeSegmentToEpisodeRange(f.ctx, segment, 1, 1, "v1", 1, 1)
	require.NoError(t, err)
	require.Len(t, result.Added, 1)
	one := counter.count()
	_, err = f.pool.Exec(f.ctx, `DELETE FROM theme_segment_assignments WHERE theme_segment_id=$1`, segment)
	require.NoError(t, err)
	counter.reset()
	result, err = repo.AssignThemeSegmentToEpisodeRange(f.ctx, segment, 1, 1, "v1", 1, 100)
	require.NoError(t, err)
	require.Len(t, result.Added, 100)
	hundred := counter.count()
	require.Equal(t, one, hundred, "range assignment statements must not grow per target")
	require.Len(t, f.ids(t, segment), 100)
	t.Logf("range assignment query count: one=%d hundred=%d", one, hundred)
}

func TestSegmentSlotImportRejectsOtherAnimeBeforeVariantLock(t *testing.T) {
	f := newSegmentSlotFixture(t)
	_, err := f.pool.Exec(f.ctx, `INSERT INTO anime(id) VALUES(2); INSERT INTO release_variants(id,release_version_id) VALUES(1,1012); INSERT INTO stream_sources(id,provider_type,external_id) VALUES(1,'jellyfin','existing-media'); INSERT INTO release_streams(id,variant_id,stream_source_id) VALUES(1,1,1)`)
	require.NoError(t, err)
	held, err := f.pool.Begin(f.ctx)
	require.NoError(t, err)
	defer held.Rollback(f.ctx)
	_, err = held.Exec(f.ctx, `SELECT id FROM release_variants WHERE id=1 FOR UPDATE`)
	require.NoError(t, err)
	ctx, cancel := context.WithTimeout(f.ctx, 2*time.Second)
	defer cancel()
	tx, err := f.pool.Begin(ctx)
	require.NoError(t, err)
	defer tx.Rollback(f.ctx)
	require.NoError(t, lockSegmentAssignmentAnimeTx(ctx, tx, 2))
	_, err = upsertImportReleaseGraph(ctx, tx, nil, episodeImportReleaseIDs{AnimeID: 2}, models.EpisodeImportMappingRow{MediaItemID: "existing-media"}, models.EpisodeImportMediaCandidate{}, nil)
	require.ErrorIs(t, err, ErrConflict, "cross-anime rejection must not wait on another anime's variant lock")
}

func TestSegmentSlotConcurrentCreateAndTypeChange(t *testing.T) {
	for _, mode := range []string{"create", "range", "type_change"} {
		t.Run(mode, func(t *testing.T) {
			f := newSegmentSlotFixture(t)
			contender := f.segment(t, 1, 1, 1)
			sourceTheme := int64(4)
			if mode == "range" {
				sourceTheme = 3
			}
			source := f.segment(t, sourceTheme, 1, 1)
			if mode == "type_change" {
				f.assign(t, source, 1)
			}
			start := make(chan struct{})
			outcomes := make(chan error, 2)
			ctx, cancel := context.WithTimeout(f.ctx, 10*time.Second)
			defer cancel()
			go func() {
				<-start
				_, err := f.repo.AssignThemeSegmentToReleaseVersion(ctx, contender, f.versions[0])
				outcomes <- err
			}()
			go func() {
				<-start
				var err error
				switch mode {
				case "create":
					_, _, err = f.repo.CreateAnimeSegment(ctx, 1, f.createInput(3, 1, 1), f.versions[0])
				case "range":
					_, err = f.repo.AssignThemeSegmentToEpisodeRange(ctx, source, 1, 1, "v1", 1, 1)
				case "type_change":
					op := int64(1)
					_, err = f.repo.UpdateAnimeSegment(ctx, source, models.AdminThemeSegmentPatchInput{ThemeID: &op})
				}
				outcomes <- err
			}()
			close(start)
			successes, conflicts := 0, 0
			for n := 0; n < 2; n++ {
				err := <-outcomes
				if err == nil {
					successes++
				} else if errors.Is(err, ErrSegmentAssignmentConflict) {
					conflicts++
				} else {
					t.Fatal(err)
				}
			}
			require.Equal(t, 1, successes)
			require.Equal(t, 1, conflicts)
			var count int
			require.NoError(t, f.pool.QueryRow(f.ctx, `SELECT count(*) FROM theme_segment_assignments a JOIN theme_segments s ON s.id=a.theme_segment_id JOIN themes th ON th.id=s.theme_id WHERE a.release_version_id=$1 AND th.theme_type_id IN(1,3)`, f.versions[0]).Scan(&count))
			require.Equal(t, 1, count)
		})
	}
}

func TestSegmentSlotCompleteRangeRejectsForeignEditorContext(t *testing.T) {
	f := newSegmentSlotFixture(t)
	_, err := f.pool.Exec(f.ctx, `
        INSERT INTO anime(id) VALUES(2);
        INSERT INTO episodes(id,anime_id,sort_index,episode_number) VALUES(901,2,1,'1');
        INSERT INTO fansub_releases(id,episode_id) VALUES(902,901);
        INSERT INTO release_versions(id,release_id,version) VALUES(903,902,'v1');
        INSERT INTO release_version_groups(release_version_id,fansub_group_id) VALUES(903,1);
    `)
	require.NoError(t, err)
	var before, after int
	require.NoError(t, f.pool.QueryRow(f.ctx, `SELECT count(*) FROM theme_segments`).Scan(&before))
	created, result, err := f.repo.CreateAnimeSegment(f.ctx, 1, f.createInput(1, 1, 4), 903)
	require.ErrorIs(t, err, ErrConflict)
	require.Nil(t, created)
	require.Nil(t, result)
	require.NoError(t, f.pool.QueryRow(f.ctx, `SELECT count(*) FROM theme_segments`).Scan(&after))
	require.Equal(t, before, after, "foreign editor context must not leave a new segment")
	var assignments int
	require.NoError(t, f.pool.QueryRow(f.ctx, `SELECT count(*) FROM theme_segment_assignments`).Scan(&assignments))
	require.Zero(t, assignments, "even the otherwise valid local range must not be assigned")
}
