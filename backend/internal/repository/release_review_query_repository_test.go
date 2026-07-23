package repository

import (
	"context"
	"path/filepath"
	"runtime"
	"testing"
	"time"

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
