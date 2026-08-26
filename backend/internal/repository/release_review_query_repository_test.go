package repository

import (
	"context"
	"path/filepath"
	"runtime"
	"sync"
	"testing"
	"time"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReleaseReviewQueueCursorPreservesFullTupleAndScope(t *testing.T) {
	submittedAt := time.Date(2026, 7, 23, 9, 30, 0, 123000000, time.UTC)
	scope := ReleaseReviewQueueScope{
		FansubGroupID:    21,
		View:             ReleaseReviewQueueViewOpen,
		AnimeID:          81,
		ReleaseVersionID: 41,
		ReviewKind:       string(ReviewKindImage),
		Category:         "screenshot",
		Search:           "folge 01",
	}
	cursor, err := EncodeReleaseReviewQueueCursor(scope, ReleaseReviewSortKey{
		SubmittedAt: submittedAt,
		SourceType:  ReleaseVersionMediaReviewSourceType,
		SourceID:    601,
	})
	require.NoError(t, err)

	decoded, err := DecodeReleaseReviewQueueCursor(scope, cursor)
	require.NoError(t, err)
	assert.True(t, decoded.SubmittedAt.Equal(submittedAt))
	assert.Equal(t, ReleaseVersionMediaReviewSourceType, decoded.SourceType)
	assert.EqualValues(t, 601, decoded.SourceID)

	foreignGroup := scope
	foreignGroup.FansubGroupID = 22
	_, err = DecodeReleaseReviewQueueCursor(foreignGroup, cursor)
	assert.ErrorIs(t, err, ErrValidation)

	foreignFilter := scope
	foreignFilter.Category = "other"
	_, err = DecodeReleaseReviewQueueCursor(foreignFilter, cursor)
	assert.ErrorIs(t, err, ErrValidation)
}

func TestReleaseReviewQueueCursorRejectsMalformedOrIncompleteValues(t *testing.T) {
	scope := ReleaseReviewQueueScope{
		FansubGroupID: 21,
		View:          ReleaseReviewQueueViewOpen,
	}
	for _, cursor := range []string{
		"",
		"not-base64",
		"e30",
	} {
		_, err := DecodeReleaseReviewQueueCursor(scope, cursor)
		assert.ErrorIs(t, err, ErrValidation, cursor)
	}

	_, err := EncodeReleaseReviewQueueCursor(scope, ReleaseReviewSortKey{
		SubmittedAt: time.Now(),
		SourceType:  "foreign",
		SourceID:    1,
	})
	assert.ErrorIs(t, err, ErrValidation)
}

func TestReleaseReviewQueueNormalizesAndCapsPageSize(t *testing.T) {
	assert.Equal(t, 50, NormalizeReleaseReviewQueueLimit(0))
	assert.Equal(t, 1, NormalizeReleaseReviewQueueLimit(1))
	assert.Equal(t, 50, NormalizeReleaseReviewQueueLimit(50))
	assert.Equal(t, 50, NormalizeReleaseReviewQueueLimit(51))
	assert.Equal(t, 50, NormalizeReleaseReviewQueueLimit(5000))
}

func TestReleaseReviewQueueReviewIDIsOpaqueAndStrict(t *testing.T) {
	id, err := EncodeReleaseReviewID(ReleaseVersionNoteReviewSourceType, 501)
	require.NoError(t, err)
	assert.NotContains(t, id, "release_version_note")
	assert.NotContains(t, id, "501")

	sourceType, sourceID, err := DecodeReleaseReviewID(id)
	require.NoError(t, err)
	assert.Equal(t, ReleaseVersionNoteReviewSourceType, sourceType)
	assert.EqualValues(t, 501, sourceID)

	for _, invalid := range []string{"", "501", "not-base64", "e30"} {
		_, _, err := DecodeReleaseReviewID(invalid)
		assert.ErrorIs(t, err, ErrValidation)
	}
}

func TestReleaseReviewQueueFilterValidation(t *testing.T) {
	valid := ReleaseReviewQueueOptions{
		Scope: ReleaseReviewQueueScope{
			FansubGroupID: 21,
			View:          ReleaseReviewQueueViewHistory,
			ReviewKind:    string(ReviewKindImage),
			Category:      "typesetting_karaoke",
			Search:        "  Projekt A  ",
		},
		AllowedKinds: []string{string(ReviewKindImage)},
		Limit:        50,
	}
	require.NoError(t, ValidateReleaseReviewQueueOptions(valid))

	tests := []ReleaseReviewQueueOptions{
		{Scope: ReleaseReviewQueueScope{FansubGroupID: 0, View: ReleaseReviewQueueViewOpen}, AllowedKinds: []string{string(ReviewKindText)}},
		{Scope: ReleaseReviewQueueScope{FansubGroupID: 21, View: "foreign"}, AllowedKinds: []string{string(ReviewKindText)}},
		{Scope: ReleaseReviewQueueScope{FansubGroupID: 21, View: ReleaseReviewQueueViewOpen, ReviewKind: "foreign"}, AllowedKinds: []string{string(ReviewKindText)}},
		{Scope: ReleaseReviewQueueScope{FansubGroupID: 21, View: ReleaseReviewQueueViewOpen, Category: "foreign"}, AllowedKinds: []string{string(ReviewKindImage)}},
		{Scope: ReleaseReviewQueueScope{FansubGroupID: 21, View: ReleaseReviewQueueViewOpen, ReviewKind: string(ReviewKindText), Category: "screenshot"}, AllowedKinds: []string{string(ReviewKindText)}},
		{Scope: ReleaseReviewQueueScope{FansubGroupID: 21, View: ReleaseReviewQueueViewOpen}, AllowedKinds: nil},
	}
	for index, input := range tests {
		assert.ErrorIs(t, ValidateReleaseReviewQueueOptions(input), ErrValidation, "case %d", index)
	}
}

func TestReleaseReviewQueueRepositoryFiltersCountsDetailAndStablePages(t *testing.T) {
	pool := openReleaseReviewQueryFixture(t)
	repo := NewReleaseReviewQueryRepository(pool)
	ctx := context.Background()
	scope := ReleaseReviewQueueScope{FansubGroupID: 21, View: ReleaseReviewQueueViewOpen}
	allowed := []string{string(ReviewKindText), string(ReviewKindImage)}

	first, err := repo.List(ctx, ReleaseReviewQueueOptions{
		Scope: scope, AllowedKinds: allowed, Limit: 2,
	})
	require.NoError(t, err)
	require.Len(t, first.Items, 2)
	require.NotEmpty(t, first.NextCursor)
	assert.True(t, first.Items[0].SubmittedAt.Equal(first.Items[1].SubmittedAt))

	second, err := repo.List(ctx, ReleaseReviewQueueOptions{
		Scope: scope, AllowedKinds: allowed, Limit: 2, Cursor: first.NextCursor,
	})
	require.NoError(t, err)
	require.Len(t, second.Items, 1)
	seen := map[string]bool{}
	for _, item := range append(first.Items, second.Items...) {
		assert.False(t, seen[item.ID], "cursor pages must be duplicate-free")
		seen[item.ID] = true
		assert.EqualValues(t, 21, item.FansubGroupID)
	}

	counts, err := repo.Counts(ctx, ReleaseReviewQueueOptions{
		Scope: scope, AllowedKinds: allowed, Limit: 50,
	})
	require.NoError(t, err)
	assert.EqualValues(t, 1, counts.Text)
	assert.EqualValues(t, 2, counts.Image)
	assert.Zero(t, counts.Contribution)
	assert.EqualValues(t, 1, counts.Categories.Screenshot)
	assert.EqualValues(t, 1, counts.Categories.Other)

	imagePage, err := repo.List(ctx, ReleaseReviewQueueOptions{
		Scope: ReleaseReviewQueueScope{
			FansubGroupID: 21, View: ReleaseReviewQueueViewOpen,
			AnimeID: 81, ReleaseVersionID: 41,
			ReviewKind: string(ReviewKindImage), Category: "screenshot", Search: "Anime Eins",
		},
		AllowedKinds: []string{string(ReviewKindImage)}, Limit: 50,
	})
	require.NoError(t, err)
	require.Len(t, imagePage.Items, 1)
	assert.Equal(t, "screenshot", imagePage.Items[0].Category)

	detail, err := repo.Detail(ctx, 21, first.Items[0].ID, allowed)
	require.NoError(t, err)
	if detail.ReviewKind == ReviewKindText {
		require.NotNil(t, detail.Text)
		assert.Nil(t, detail.Image)
		assert.Contains(t, detail.Text.BodyHTML, "Prüftext")
	} else {
		require.NotNil(t, detail.Image)
		assert.Nil(t, detail.Text)
		assert.Contains(t, detail.Image.OriginalURL, "/media/")
	}

	_, err = repo.Detail(ctx, 22, first.Items[0].ID, allowed)
	assert.ErrorIs(t, err, ErrNotFound)

	history, err := repo.List(ctx, ReleaseReviewQueueOptions{
		Scope:        ReleaseReviewQueueScope{FansubGroupID: 21, View: ReleaseReviewQueueViewHistory},
		AllowedKinds: allowed, Limit: 50,
	})
	require.NoError(t, err)
	require.Len(t, history.Items, 1)
	assert.Equal(t, ReleaseReviewStateRejected, history.Items[0].Status)

	next, err := repo.Next(ctx, 21, first.Items[0].ID, allowed)
	require.NoError(t, err)
	require.NotNil(t, next)
	assert.NotEqual(t, first.Items[0].ID, next.ID)
}

func openReleaseReviewQueryFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase107Postgres(t)
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		CREATE TABLE users (id BIGINT PRIMARY KEY);
		ALTER TABLE app_users ADD COLUMN legacy_user_id BIGINT NULL REFERENCES users(id);
		ALTER TABLE members ADD COLUMN nickname TEXT, ADD COLUMN display_name TEXT;
		CREATE TABLE anime (
			id BIGINT PRIMARY KEY, title TEXT, title_de TEXT, title_en TEXT
		);
		CREATE TABLE episodes (
			id BIGINT PRIMARY KEY, anime_id BIGINT NOT NULL REFERENCES anime(id),
			episode_number TEXT NOT NULL
		);
		CREATE TABLE fansub_releases (
			id BIGINT PRIMARY KEY, episode_id BIGINT NOT NULL REFERENCES episodes(id)
		);
		ALTER TABLE release_versions
			ADD COLUMN release_id BIGINT REFERENCES fansub_releases(id),
			ADD COLUMN version TEXT NOT NULL DEFAULT 'v1';
		CREATE TABLE release_version_groups (
			release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
			fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
			PRIMARY KEY (release_version_id, fansub_group_id)
		);
		CREATE TABLE contributor_roles (id BIGINT PRIMARY KEY, name TEXT NOT NULL);
		CREATE TABLE release_version_notes (
			id BIGINT PRIMARY KEY,
			release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
			fansub_group_id BIGINT REFERENCES fansub_groups(id),
			member_id BIGINT NOT NULL REFERENCES members(id),
			role_id BIGINT NOT NULL REFERENCES contributor_roles(id),
			title TEXT, body_html TEXT NOT NULL, deleted_at TIMESTAMPTZ
		);
		CREATE TABLE media_assets (id BIGINT PRIMARY KEY);
		CREATE TABLE media_files (
			id BIGINT PRIMARY KEY, media_id BIGINT NOT NULL REFERENCES media_assets(id),
			variant TEXT NOT NULL, path TEXT NOT NULL, status TEXT NOT NULL
		);
		CREATE TABLE release_version_media (
			id BIGINT PRIMARY KEY,
			release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
			fansub_group_id BIGINT REFERENCES fansub_groups(id),
			media_asset_id BIGINT NOT NULL REFERENCES media_assets(id),
			category TEXT NOT NULL, caption TEXT, uploaded_by_user_id BIGINT REFERENCES users(id),
			deleted_at TIMESTAMPTZ
		);
	`)
	require.NoError(t, err)

	_, file, _, ok := runtime.Caller(0)
	require.True(t, ok)
	migrations := filepath.Join(filepath.Dir(file), "..", "..", "..", "database", "migrations")
	testsupport.ApplySQLFile(t, pool, filepath.Join(migrations, "0134_review_foundation.up.sql"))
	testsupport.ApplySQLFile(t, pool, filepath.Join(migrations, "0135_release_review_lifecycle.up.sql"))

	_, err = pool.Exec(ctx, `
		INSERT INTO users(id) VALUES (1001), (1002);
		INSERT INTO members(id, nickname, display_name) VALUES
			(101, 'Einreicher', 'Einreicher Eins'), (102, 'Reviewer', 'Reviewer Zwei');
		INSERT INTO app_users(id, status, legacy_user_id) VALUES
			(11, 'active', 1001), (12, 'active', 1002);
		INSERT INTO fansub_groups(id) VALUES (21), (22);
		INSERT INTO anime(id, title, title_de) VALUES (81, 'Anime One', 'Anime Eins'), (82, 'Anime Two', 'Anime Zwei');
		INSERT INTO episodes(id, anime_id, episode_number) VALUES (31, 81, '01'), (32, 82, '02');
		INSERT INTO fansub_releases(id, episode_id) VALUES (51, 31), (52, 32);
		INSERT INTO release_versions(id, release_id, version) VALUES (41, 51, 'v1'), (42, 52, 'v2');
		INSERT INTO release_version_groups(release_version_id, fansub_group_id) VALUES (41, 21), (42, 22);
		INSERT INTO contributor_roles(id, name) VALUES (71, 'translator');
		INSERT INTO release_version_notes(
			id, release_version_id, fansub_group_id, member_id, role_id, title, body_html
		) VALUES
			(501, 41, 21, 101, 71, 'Dialog', '<p>Prüftext</p>'),
			(502, 42, 22, 101, 71, 'Fremd', '<p>Fremd</p>');
		INSERT INTO media_assets(id) VALUES (701), (702), (703);
		INSERT INTO media_files(id, media_id, variant, path, status) VALUES
			(801, 701, 'original', '/app/media/review/701/original.png', 'ready'),
			(802, 701, 'thumb', '/app/media/review/701/thumb.png', 'ready'),
			(803, 702, 'original', '/app/media/review/702/original.png', 'ready'),
			(804, 703, 'original', '/app/media/review/703/original.png', 'ready');
		INSERT INTO release_version_media(
			id, release_version_id, fansub_group_id, media_asset_id, category, caption, uploaded_by_user_id
		) VALUES
			(601, 41, 21, 701, 'screenshot', 'Bild Eins', 1001),
			(602, 41, 21, 702, 'other', 'Bild Zwei', 1001),
			(603, 41, 21, 703, 'fun_outtake', 'Verlauf', 1001);
		INSERT INTO release_version_note_review_lifecycle(
			release_version_note_id, source_revision, review_state,
			submitter_app_user_id, submitter_member_id, submitted_at, last_activity_at
		) VALUES
			(501, 1, 'pending', 11, 101, '2026-07-23T09:00:00Z', '2026-07-23T09:00:00Z'),
			(502, 1, 'pending', 11, 101, '2026-07-23T09:00:00Z', '2026-07-23T09:00:00Z');
		INSERT INTO release_version_media_review_lifecycle(
			release_version_media_id, source_revision, review_state, category,
			submitter_app_user_id, submitter_member_id, submitted_at, last_activity_at, decided_at
		) VALUES
			(601, 1, 'pending', 'screenshot', 11, 101, '2026-07-23T09:00:00Z', '2026-07-23T09:00:00Z', NULL),
			(602, 1, 'pending', 'other', 11, 101, '2026-07-23T09:00:00Z', '2026-07-23T09:00:00Z', NULL),
			(603, 1, 'rejected', 'fun_outtake', 11, 101, '2026-07-23T09:00:00Z', '2026-07-23T09:00:00Z', '2026-07-23T10:00:00Z');
	`)
	require.NoError(t, err)
	return pool
}

// releaseReviewItemIDs projects a page's opaque item IDs for containment assertions.
func releaseReviewItemIDs(items []ReleaseReviewQueueItem) []string {
	ids := make([]string, 0, len(items))
	for _, item := range items {
		ids = append(ids, item.ID)
	}
	return ids
}

// TestReleaseReviewQueueRepositoryExcludesActorsOwnSubmissionFromListAndCounts proves the
// RQUE-02 gap closure: List/Counts exclude an actor's own submissions using BOTH identity
// signals (direct app_user_id match, and a verified-member-claim match even under a
// different app_user_id), mirroring review_service.go's decision-time definition exactly.
func TestReleaseReviewQueueRepositoryExcludesActorsOwnSubmissionFromListAndCounts(t *testing.T) {
	pool := openReleaseReviewQueryFixture(t)
	ctx := context.Background()

	// Second-signal fixture row: submitted by a third, distinct app_user (13) but on
	// behalf of member 101 -- the same member the acting app_user (11) is themselves
	// verified as (ActorMemberIDs=[101] below). Proves the member-claim signal excludes
	// this row even though its submitter_app_user_id (13) never equals the actor's own
	// app_user_id (11).
	_, err := pool.Exec(ctx, `
		INSERT INTO users(id) VALUES (1003);
		INSERT INTO app_users(id, status, legacy_user_id) VALUES (13, 'active', 1003);
		INSERT INTO media_assets(id) VALUES (704);
		INSERT INTO media_files(id, media_id, variant, path, status) VALUES
			(805, 704, 'original', '/app/media/review/704/original.png', 'ready');
		INSERT INTO release_version_media(
			id, release_version_id, fansub_group_id, media_asset_id, category, caption, uploaded_by_user_id
		) VALUES (604, 41, 21, 704, 'other', 'Bild Drei', 1003);
		INSERT INTO release_version_media_review_lifecycle(
			release_version_media_id, source_revision, review_state, category,
			submitter_app_user_id, submitter_member_id, submitted_at, last_activity_at, decided_at
		) VALUES (604, 1, 'pending', 'other', 13, 101, '2026-07-23T09:00:00Z', '2026-07-23T09:00:00Z', NULL);
	`)
	require.NoError(t, err)

	repo := NewReleaseReviewQueryRepository(pool)
	scope := ReleaseReviewQueueScope{FansubGroupID: 21, View: ReleaseReviewQueueViewOpen}
	allowed := []string{string(ReviewKindText), string(ReviewKindImage)}

	// Actor is app_user 11 (the fixture's own submitter for rows 501/601/602), also
	// verified as member 101 (matching row 604's submitter_member_id via the second
	// signal). Every pending row in group 21 must be excluded.
	ownPage, err := repo.List(ctx, ReleaseReviewQueueOptions{
		Scope: scope, AllowedKinds: allowed, Limit: 50,
		ActorAppUserID: 11, ActorMemberIDs: []int64{101},
	})
	require.NoError(t, err)
	assert.Empty(t, ownPage.Items, "actor's own submissions (both identity signals) must be fully excluded")

	ownCounts, err := repo.Counts(ctx, ReleaseReviewQueueOptions{
		Scope: scope, AllowedKinds: allowed, Limit: 50,
		ActorAppUserID: 11, ActorMemberIDs: []int64{101},
	})
	require.NoError(t, err)
	assert.Zero(t, ownCounts.Text)
	assert.Zero(t, ownCounts.Image)

	// A non-submitter, non-member-matching actor (app_user 12) sees the full set
	// unchanged: 501 (text), 601/602/604 (image).
	foreignPage, err := repo.List(ctx, ReleaseReviewQueueOptions{
		Scope: scope, AllowedKinds: allowed, Limit: 50, ActorAppUserID: 12,
	})
	require.NoError(t, err)
	assert.Len(t, foreignPage.Items, 4)

	foreignCounts, err := repo.Counts(ctx, ReleaseReviewQueueOptions{
		Scope: scope, AllowedKinds: allowed, Limit: 50, ActorAppUserID: 12,
	})
	require.NoError(t, err)
	assert.EqualValues(t, 1, foreignCounts.Text)
	assert.EqualValues(t, 3, foreignCounts.Image)
}

// TestReleaseReviewQueueOwnViewReturnsOnlyActorsOwnPendingSubmissions proves RQUE-03/D01/
// D03/D14: view=own returns only the actor's own currently-pending rows across BOTH review
// kinds -- the value AllowedKinds carries here (text+image) is exactly what the real
// handler's D10 capability bypass unconditionally computes for view=own (Plan 141-02 Task
// 2), never derived from a capability check -- and a decided row from the same actor is
// never included (D14: own-pending only ever shows currently-pending submissions).
func TestReleaseReviewQueueOwnViewReturnsOnlyActorsOwnPendingSubmissions(t *testing.T) {
	pool := openReleaseReviewQueryFixture(t)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
		INSERT INTO media_assets(id) VALUES (705);
		INSERT INTO media_files(id, media_id, variant, path, status) VALUES
			(806, 705, 'original', '/app/media/review/705/original.png', 'ready');
		INSERT INTO release_version_media(
			id, release_version_id, fansub_group_id, media_asset_id, category, caption, uploaded_by_user_id
		) VALUES (605, 41, 21, 705, 'other', 'Bild Vier', 1001);
		INSERT INTO release_version_media_review_lifecycle(
			release_version_media_id, source_revision, review_state, category,
			submitter_app_user_id, submitter_member_id, submitted_at, last_activity_at, decided_at
		) VALUES (605, 1, 'confirmed', 'other', 11, 101, '2026-07-23T09:00:00Z', '2026-07-23T09:00:00Z', '2026-07-23T10:00:00Z');
	`)
	require.NoError(t, err)

	repo := NewReleaseReviewQueryRepository(pool)
	scope := ReleaseReviewQueueScope{FansubGroupID: 21, View: ReleaseReviewQueueViewOwn}
	allowed := []string{string(ReviewKindText), string(ReviewKindImage)}

	page, err := repo.List(ctx, ReleaseReviewQueueOptions{
		Scope: scope, AllowedKinds: allowed, Limit: 50, ActorAppUserID: 11,
	})
	require.NoError(t, err)
	require.Len(t, page.Items, 3, "own view must return the actor's text + image pending rows, and only those")
	decidedID, err := EncodeReleaseReviewID(ReleaseVersionMediaReviewSourceType, 605)
	require.NoError(t, err)
	ids := releaseReviewItemIDs(page.Items)
	assert.NotContains(t, ids, decidedID, "decided rows must never appear in view=own (D14)")
	hasText, hasImage := false, false
	for _, item := range page.Items {
		assert.Equal(t, ReleaseReviewStatePending, item.Status)
		if item.ReviewKind == ReviewKindText {
			hasText = true
		}
		if item.ReviewKind == ReviewKindImage {
			hasImage = true
		}
	}
	assert.True(t, hasText, "own view must include the actor's pending text submission")
	assert.True(t, hasImage, "own view must include the actor's pending image submissions")

	counts, err := repo.Counts(ctx, ReleaseReviewQueueOptions{
		Scope: scope, AllowedKinds: allowed, Limit: 50, ActorAppUserID: 11,
	})
	require.NoError(t, err)
	assert.EqualValues(t, 1, counts.Text)
	assert.EqualValues(t, 2, counts.Image)
}

// TestReleaseReviewQueueRepositorySortsNewestFirst proves the D15 sort-direction
// correction: List returns pending rows newest-first (descending by submitted_at), and
// cursor-based pagination remains duplicate-free and correctly ordered under the new
// direction.
func TestReleaseReviewQueueRepositorySortsNewestFirst(t *testing.T) {
	pool := openReleaseReviewQueryFixture(t)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
		UPDATE release_version_note_review_lifecycle
		SET submitted_at = '2026-07-23T09:00:00Z', last_activity_at = '2026-07-23T09:00:00Z'
		WHERE release_version_note_id = 501;
		UPDATE release_version_media_review_lifecycle
		SET submitted_at = '2026-07-23T09:05:00Z', last_activity_at = '2026-07-23T09:05:00Z'
		WHERE release_version_media_id = 601;
		UPDATE release_version_media_review_lifecycle
		SET submitted_at = '2026-07-23T09:10:00Z', last_activity_at = '2026-07-23T09:10:00Z'
		WHERE release_version_media_id = 602;
	`)
	require.NoError(t, err)

	repo := NewReleaseReviewQueryRepository(pool)
	scope := ReleaseReviewQueueScope{FansubGroupID: 21, View: ReleaseReviewQueueViewOpen}
	allowed := []string{string(ReviewKindText), string(ReviewKindImage)}

	full, err := repo.List(ctx, ReleaseReviewQueueOptions{Scope: scope, AllowedKinds: allowed, Limit: 50})
	require.NoError(t, err)
	require.Len(t, full.Items, 3)
	assert.True(t, full.Items[0].SubmittedAt.After(full.Items[1].SubmittedAt), "item 0 must be newer than item 1")
	assert.True(t, full.Items[1].SubmittedAt.After(full.Items[2].SubmittedAt), "item 1 must be newer than item 2")

	first, err := repo.List(ctx, ReleaseReviewQueueOptions{Scope: scope, AllowedKinds: allowed, Limit: 2})
	require.NoError(t, err)
	require.Len(t, first.Items, 2)
	require.NotEmpty(t, first.NextCursor)

	second, err := repo.List(ctx, ReleaseReviewQueueOptions{
		Scope: scope, AllowedKinds: allowed, Limit: 2, Cursor: first.NextCursor,
	})
	require.NoError(t, err)
	require.Len(t, second.Items, 1)

	combined := append(append([]ReleaseReviewQueueItem{}, first.Items...), second.Items...)
	seen := map[string]bool{}
	for index, item := range combined {
		assert.False(t, seen[item.ID], "cursor pages must be duplicate-free")
		seen[item.ID] = true
		if index > 0 {
			assert.True(t, combined[index-1].SubmittedAt.After(item.SubmittedAt),
				"pagination must remain strictly newest-to-oldest across pages")
		}
	}
}

// releaseReviewDelegationCacheOnce loads permissions' package-level role-capability cache
// exactly once for this file's real-Postgres RDEL-05 test. ResolveGroupRights' roleAllows
// lookup reads a package-level cache that starts nil; without loading it, ListActorGroupRoles
// results could never grant anything via role (mirrors review_service_test.go's identical
// precedent in package services, and authz_permissions_group_rights_test.go's real-Postgres
// pattern in this same package -- this is the first test in package repository to touch
// role-based Can() results, hence its own independent sync.Once).
var releaseReviewDelegationCacheOnce sync.Once

// releaseReviewDelegationCacheLoader satisfies LoadCache's D-10 "every known action appears
// in >=1 role" catalog check while granting exactly what this test needs:
// "fansub_image_reviewer" -> ActionReviewImageDecide only (no role-based text-review
// capability), so the specialized review.text.decide grant this test exercises is the ONLY
// source of that action's Allowed=true. Every other canonical action is parked under an
// unused role, matching review_service_test.go's precedent.
type releaseReviewDelegationCacheLoader struct{}

func (releaseReviewDelegationCacheLoader) LoadRoleCapabilities(
	context.Context,
) (map[string][]permissions.Action, error) {
	return map[string][]permissions.Action{
		"fansub_image_reviewer": {permissions.ActionReviewImageDecide},
		"_release_review_test_unused_role": {
			permissions.ActionFansubGroupEdit,
			permissions.ActionFansubGroupLinksManage,
			permissions.ActionFansubGroupMembersView,
			permissions.ActionFansubGroupHistoricalMembersManage,
			permissions.ActionFansubGroupHistoricalRolesManage,
			permissions.ActionFansubGroupHistoricalMembersLink,
			permissions.ActionFansubGroupInvitationsView,
			permissions.ActionFansubGroupInvitationsCreate,
			permissions.ActionFansubGroupInvitationsCancel,
			permissions.ActionFansubGroupNotesWrite,
			permissions.ActionFansubGroupMediaView,
			permissions.ActionFansubGroupMediaUpload,
			permissions.ActionFansubGroupMediaUpdate,
			permissions.ActionFansubGroupMediaReorder,
			permissions.ActionFansubGroupMediaDelete,
			permissions.ActionFansubGroupMembersManage,
			permissions.ActionFansubGroupPageGeneralEdit,
			permissions.ActionFansubGroupPageTechnicalLinksEdit,
			permissions.ActionFansubGroupPageFoundingHistoryEdit,
			permissions.ActionFansubGroupLinksUpdate,
			permissions.ActionAnimeFansubProjectNotesWrite,
			permissions.ActionReleaseView,
			permissions.ActionReleaseVersionView,
			permissions.ActionReleaseVersionMediaView,
			permissions.ActionReleaseVersionMediaUpload,
			permissions.ActionReleaseVersionMediaUpdate,
			permissions.ActionReleaseVersionMediaDelete,
			permissions.ActionReleaseVersionMediaDeleteOwn,
			permissions.ActionReleaseVersionNotesWrite,
			permissions.ActionReleaseVersionSegmentsManage,
			permissions.ActionReviewTextDecide,
			permissions.ActionReviewContributionDecide,
			permissions.ActionUserGroupCapabilityOverrideManage,
		},
	}, nil
}

func ensureReleaseReviewDelegationCacheLoaded(t *testing.T) {
	t.Helper()
	releaseReviewDelegationCacheOnce.Do(func() {
		if err := permissions.NewService(nil).LoadCache(
			context.Background(), releaseReviewDelegationCacheLoader{},
		); err != nil {
			t.Fatalf("load permissions cache for release review delegation test: %v", err)
		}
	})
}

// TestPhase141RevokedDelegationImmediateEffect proves RDEL-05 end to end: granting a
// specialized review.text.decide delegation to a member with no role-based text-review
// capability makes their text submission appear in List/Counts immediately, and revoking it
// makes the item disappear immediately -- in the SAME test, no restart or cache clear. The
// AllowedKinds passed to List/Counts is computed from the just-resolved
// permissions.Service.ResolveGroupRights result at each step, exactly mirroring what the
// real handler's queueOptions/authorizedKinds would compute from the SAME resolution
// (Plan 141-02 Task 2) -- this test deliberately spans the permissions and repository
// packages within one package repository test file.
func TestPhase141RevokedDelegationImmediateEffect(t *testing.T) {
	ensureReleaseReviewDelegationCacheLoaded(t)
	pool := openReleaseReviewQueryFixture(t)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
		CREATE TABLE fansub_group_member_roles (
			fansub_group_member_id BIGINT NOT NULL REFERENCES fansub_group_members(id) ON DELETE CASCADE,
			role TEXT NOT NULL,
			PRIMARY KEY (fansub_group_member_id, role)
		);
		CREATE TABLE user_group_capability_overrides (
			app_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
			fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
			action_code TEXT NOT NULL,
			effect TEXT NOT NULL CHECK (effect IN ('allow', 'deny')),
			PRIMARY KEY (app_user_id, fansub_group_id, action_code)
		);
		INSERT INTO users(id) VALUES (1003);
		INSERT INTO app_users(id, status, legacy_user_id) VALUES (13, 'active', 1003);
		INSERT INTO members(id, nickname, display_name) VALUES (103, 'Delegierte', 'Delegierte Drei');
		INSERT INTO member_claims(id, member_id, app_user_id, claim_status, verified_at)
			VALUES (301, 103, 13, 'verified', NOW());
		INSERT INTO fansub_group_members(id, fansub_group_id, app_user_id, member_id, status)
			VALUES (33, 21, 13, 103, 'active');
		INSERT INTO fansub_group_member_roles(fansub_group_member_id, role)
			VALUES (33, 'fansub_image_reviewer');
	`)
	require.NoError(t, err)

	repo := NewReleaseReviewQueryRepository(pool)
	delegationRepo := NewReviewDelegationRepository(pool)
	authzRepo := NewAuthzRepository(pool)
	permissionSvc := permissions.NewService(authzRepo)
	delegate := permissions.Actor{AppUserID: 13, Status: "active"}
	scope := ReleaseReviewQueueScope{FansubGroupID: 21, View: ReleaseReviewQueueViewOpen}
	textID, err := EncodeReleaseReviewID(ReleaseVersionNoteReviewSourceType, 501)
	require.NoError(t, err)

	allowedKindsFor := func(res *permissions.GroupRightsResolution) []string {
		var kinds []string
		if res.Can(permissions.ActionReviewTextDecide).Allowed {
			kinds = append(kinds, string(ReviewKindText))
		}
		if res.Can(permissions.ActionReviewImageDecide).Allowed {
			kinds = append(kinds, string(ReviewKindImage))
		}
		return kinds
	}

	// Before any specialized grant: the delegate can only decide image (role-based via
	// fansub_image_reviewer), never text.
	before, err := permissionSvc.ResolveGroupRights(ctx, delegate, 21)
	require.NoError(t, err)
	require.False(t, before.Can(permissions.ActionReviewTextDecide).Allowed)
	require.True(t, before.Can(permissions.ActionReviewImageDecide).Allowed)

	beforeList, err := repo.List(ctx, ReleaseReviewQueueOptions{
		Scope: scope, AllowedKinds: allowedKindsFor(before), Limit: 50,
	})
	require.NoError(t, err)
	assert.NotContains(t, releaseReviewItemIDs(beforeList.Items), textID,
		"text item must not be visible before the specialized text delegation is granted")

	beforeCounts, err := repo.Counts(ctx, ReleaseReviewQueueOptions{
		Scope: scope, AllowedKinds: allowedKindsFor(before), Limit: 50,
	})
	require.NoError(t, err)
	assert.Zero(t, beforeCounts.Text)
	assert.EqualValues(t, 2, beforeCounts.Image)

	// Grant the specialized review.text.decide delegation.
	granted, err := delegationRepo.GrantAction(ctx, 33, string(permissions.ActionReviewTextDecide))
	require.NoError(t, err)
	require.True(t, granted)

	afterGrant, err := permissionSvc.ResolveGroupRights(ctx, delegate, 21)
	require.NoError(t, err)
	require.True(t, afterGrant.Can(permissions.ActionReviewTextDecide).Allowed)
	assert.Equal(t, permissions.ProvenanceSpecializedGrant, afterGrant.Can(permissions.ActionReviewTextDecide).DecisiveSource)

	afterGrantList, err := repo.List(ctx, ReleaseReviewQueueOptions{
		Scope: scope, AllowedKinds: allowedKindsFor(afterGrant), Limit: 50,
	})
	require.NoError(t, err)
	assert.Contains(t, releaseReviewItemIDs(afterGrantList.Items), textID,
		"text item must appear immediately after the specialized text delegation is granted, no restart")

	afterGrantCounts, err := repo.Counts(ctx, ReleaseReviewQueueOptions{
		Scope: scope, AllowedKinds: allowedKindsFor(afterGrant), Limit: 50,
	})
	require.NoError(t, err)
	assert.EqualValues(t, 1, afterGrantCounts.Text)
	assert.EqualValues(t, 2, afterGrantCounts.Image)

	// Revoke the specialized delegation.
	revoked, err := delegationRepo.RevokeAction(ctx, 33, string(permissions.ActionReviewTextDecide))
	require.NoError(t, err)
	require.True(t, revoked)

	afterRevoke, err := permissionSvc.ResolveGroupRights(ctx, delegate, 21)
	require.NoError(t, err)
	require.False(t, afterRevoke.Can(permissions.ActionReviewTextDecide).Allowed)

	afterRevokeList, err := repo.List(ctx, ReleaseReviewQueueOptions{
		Scope: scope, AllowedKinds: allowedKindsFor(afterRevoke), Limit: 50,
	})
	require.NoError(t, err)
	assert.NotContains(t, releaseReviewItemIDs(afterRevokeList.Items), textID,
		"text item must disappear immediately after revoke, no restart or cache clear")

	afterRevokeCounts, err := repo.Counts(ctx, ReleaseReviewQueueOptions{
		Scope: scope, AllowedKinds: allowedKindsFor(afterRevoke), Limit: 50,
	})
	require.NoError(t, err)
	assert.Zero(t, afterRevokeCounts.Text)
	assert.EqualValues(t, 2, afterRevokeCounts.Image)
}

// TestReleaseReviewQueueNeverIncludesContributionSourceType is an explicit RQUE-06
// regression guard: even with a real anime_contributions proposal row present in the
// database, the shared release_review_lifecycle_sources view (a UNION ALL hardcoding only
// 'text' and 'image') never emits review_kind='contribution', and no List/Counts call, for
// any AllowedKinds combination, ever returns such a row.
func TestReleaseReviewQueueNeverIncludesContributionSourceType(t *testing.T) {
	pool := openReleaseReviewQueryFixture(t)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
		CREATE TABLE hist_fansub_group_members (
			id BIGSERIAL PRIMARY KEY,
			fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
			member_id BIGINT NOT NULL REFERENCES members(id),
			status VARCHAR(20) NOT NULL DEFAULT 'historical'
		);
		CREATE TABLE anime_contributions (
			id BIGSERIAL PRIMARY KEY,
			fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
			anime_id BIGINT NOT NULL REFERENCES anime(id),
			fansub_group_member_id BIGINT NOT NULL REFERENCES hist_fansub_group_members(id),
			status VARCHAR(20) NOT NULL DEFAULT 'draft'
		);
		INSERT INTO hist_fansub_group_members(id, fansub_group_id, member_id, status)
			VALUES (901, 21, 101, 'active');
		INSERT INTO anime_contributions(id, fansub_group_id, anime_id, fansub_group_member_id, status)
			VALUES (9001, 21, 81, 901, 'proposed');
	`)
	require.NoError(t, err)

	var contributionRows int
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM release_review_lifecycle_sources WHERE review_kind = 'contribution'`,
	).Scan(&contributionRows))
	assert.Zero(t, contributionRows, "release_review_lifecycle_sources must never emit review_kind='contribution'")

	repo := NewReleaseReviewQueryRepository(pool)
	scope := ReleaseReviewQueueScope{FansubGroupID: 21, View: ReleaseReviewQueueViewOpen}
	for _, allowed := range [][]string{
		{string(ReviewKindText)},
		{string(ReviewKindImage)},
		{string(ReviewKindText), string(ReviewKindImage)},
	} {
		page, err := repo.List(ctx, ReleaseReviewQueueOptions{Scope: scope, AllowedKinds: allowed, Limit: 50})
		require.NoError(t, err)
		for _, item := range page.Items {
			assert.NotEqual(t, ReviewKind("contribution"), item.ReviewKind)
		}
	}

	// Defense in depth beyond the view's own guarantee: the options layer itself rejects
	// "contribution" as an invalid AllowedKinds entry before any query runs.
	assert.ErrorIs(t, ValidateReleaseReviewQueueOptions(ReleaseReviewQueueOptions{
		Scope: scope, AllowedKinds: []string{"contribution"}, Limit: 50,
	}), ErrValidation)
}
