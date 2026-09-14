package repository

import (
	"context"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/testsupport"
)

func TestReleaseVersionMediaTitleMigrationRoundTrip(t *testing.T) {
	pool := openReleaseVersionMediaReplaceFixture(t) // applies actual 0163 up in private schema
	ctx := context.Background()
	_, file, _, ok := runtime.Caller(0)
	require.True(t, ok)
	migrations := filepath.Join(filepath.Dir(file), "..", "..", "..", "database", "migrations")
	_, err := pool.Exec(ctx, `UPDATE release_version_media SET title=$1,caption='separate caption' WHERE id=601`, strings.Repeat("界", 200))
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `UPDATE release_version_media SET title=$1 WHERE id=601`, strings.Repeat("界", 201))
	require.Error(t, err)
	testsupport.ApplySQLFile(t, pool, filepath.Join(migrations, "0163_release_version_media_title.down.sql"))
	var exists bool
	require.NoError(t, pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='release_version_media' AND column_name='title')`).Scan(&exists))
	require.False(t, exists)
	var caption string
	require.NoError(t, pool.QueryRow(ctx, `SELECT caption FROM release_version_media WHERE id=601`).Scan(&caption))
	require.Equal(t, "separate caption", caption)
	testsupport.ApplySQLFile(t, pool, filepath.Join(migrations, "0163_release_version_media_title.up.sql"))
	var title *string
	require.NoError(t, pool.QueryRow(ctx, `SELECT title FROM release_version_media WHERE id=601`).Scan(&title))
	require.Nil(t, title)
}

func TestReleaseVersionMediaPreviewSerializesConcurrentChoices(t *testing.T) {
	pool := openReleaseVersionMediaReplaceFixture(t)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	repo := NewMediaRepository(pool, "")
	tx1, err := pool.Begin(ctx)
	require.NoError(t, err)
	defer tx1.Rollback(ctx)
	tx2, err := pool.Begin(ctx)
	require.NoError(t, err)
	defer tx2.Rollback(ctx)
	require.NoError(t, repo.ClearPreviewCandidateForVersion(ctx, tx1, 41, 601))
	started := make(chan struct{})
	done := make(chan error, 1)
	go func() { close(started); done <- repo.ClearPreviewCandidateForVersion(ctx, tx2, 41, 602) }()
	<-started
	select {
	case err := <-done:
		t.Fatalf("second selection must wait for version lock, got %v", err)
	case <-time.After(100 * time.Millisecond):
	}
	yes := true
	require.NoError(t, repo.PatchReleaseVersionMedia(ctx, tx1, 601, ReleaseVersionMediaPatchInput{IsPreviewCandidate: &yes}))
	require.NoError(t, tx1.Commit(ctx))
	require.NoError(t, <-done)
	require.NoError(t, repo.PatchReleaseVersionMedia(ctx, tx2, 602, ReleaseVersionMediaPatchInput{IsPreviewCandidate: &yes}))
	require.NoError(t, tx2.Commit(ctx))
	var count int
	var chosen int64
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*),min(id) FROM release_version_media WHERE release_version_id=41 AND is_preview_candidate AND deleted_at IS NULL`).Scan(&count, &chosen))
	require.Equal(t, 1, count)
	require.Equal(t, int64(602), chosen)
}

// The existing private-schema fixture is extended only with the direct public
// media readers' prerequisites; no application rows or files are used.
func TestReleaseVersionMediaTitlePublicProjections(t *testing.T) {
	pool := openReleaseVersionMediaReplaceFixture(t)
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
 ALTER TABLE users ADD COLUMN username TEXT;
 ALTER TABLE app_users ADD COLUMN display_name TEXT, ADD COLUMN preferred_username TEXT;
 ALTER TABLE members ADD COLUMN display_name TEXT, ADD COLUMN nickname TEXT, ADD COLUMN user_id BIGINT;
 CREATE TABLE anime (id BIGINT PRIMARY KEY, title TEXT, title_de TEXT, title_en TEXT);
 CREATE TABLE episodes (id BIGINT PRIMARY KEY, anime_id BIGINT, episode_number TEXT, sort_index INT);
 CREATE TABLE fansub_releases (id BIGINT PRIMARY KEY, episode_id BIGINT);
 ALTER TABLE release_versions ADD COLUMN release_id BIGINT, ADD COLUMN version TEXT, ADD COLUMN title TEXT;
 CREATE TABLE media_types (id BIGINT PRIMARY KEY, name TEXT);
 ALTER TABLE media_assets ADD COLUMN media_type_id BIGINT, ADD COLUMN mime_type TEXT, ADD COLUMN file_path TEXT, ADD COLUMN caption TEXT;
 ALTER TABLE release_version_notes ADD COLUMN release_version_id BIGINT, ADD COLUMN member_id BIGINT, ADD COLUMN title TEXT,
  ADD COLUMN body_text TEXT, ADD COLUMN body_html TEXT, ADD COLUMN created_at TIMESTAMPTZ, ADD COLUMN updated_at TIMESTAMPTZ,
  ADD COLUMN deleted_at TIMESTAMPTZ, ADD COLUMN visibility TEXT, ADD COLUMN status TEXT;
 INSERT INTO anime VALUES (1,'Fixture Anime',NULL,NULL);
 INSERT INTO episodes VALUES (2,1,'02',2);
 INSERT INTO fansub_releases VALUES (3,2);
 UPDATE release_versions SET release_id=3,version='v1' WHERE id=41;
 INSERT INTO media_types VALUES (1,'image');
 UPDATE media_assets SET media_type_id=1,mime_type='image/png',file_path='/media/title.png';
 INSERT INTO media_files (media_id,variant,path,status) VALUES (703,'original','/media/title.png','ready'),(703,'thumb','/media/title-thumb.jpg','ready');
 UPDATE release_version_media SET title='Individueller Titel',caption='Separater Beschreibungstext' WHERE id=602;
 `)
	require.NoError(t, err)
	wantTitle := "Individueller Titel"
	wantCaption := "Separater Beschreibungstext"
	detail := NewReleaseDetailPublicRepository(pool, "")
	images, err := detail.loadImages(ctx, 41)
	require.NoError(t, err)
	require.Len(t, images, 1)
	require.Equal(t, &wantTitle, images[0].Title)
	require.Equal(t, &wantCaption, images[0].Caption)
	page, err := detail.ListReleaseVersionImagesCursor(ctx, 1, 21, 41, "screenshot", "", 20)
	require.NoError(t, err)
	require.Len(t, page.Items, 1)
	require.Equal(t, &wantTitle, page.Items[0].Title)
	require.Equal(t, &wantCaption, page.Items[0].Caption)
	group, err := NewGroupReleaseMediaRepository(pool, "").GetPublicReleaseMedia(ctx, 1, 21)
	require.NoError(t, err)
	require.Len(t, group.Items, 1)
	require.Equal(t, &wantTitle, group.Items[0].Title)
	require.Equal(t, &wantCaption, group.Items[0].Caption)
	member := NewProjectMemberPublicRepository(pool)
	media, _, _, err := member.ListMedia(ctx, 1, 21, 101, "", 20)
	require.NoError(t, err)
	require.Len(t, media, 1)
	require.Equal(t, &wantTitle, media[0].Title)
	require.Equal(t, &wantCaption, media[0].Caption)
	profile := NewMemberProfileRepository(pool, "")
	contributions, err := profile.loadLatestContributions(ctx, 101, 20, 0)
	require.NoError(t, err)
	require.Len(t, contributions, 1)
	require.Equal(t, &wantTitle, contributions[0].Title)
	require.Equal(t, &wantCaption, contributions[0].TextPreview)
	// The older recent-media loader uses its existing app-user-based predicate.
	// Overlapping fixture IDs exercise its scan without changing that ownership seam.
	_, err = pool.Exec(ctx, `INSERT INTO app_users(id,status) VALUES(2001,'active'); INSERT INTO member_claims(id,member_id,app_user_id,claim_status) VALUES(202,101,2001,'verified')`)
	require.NoError(t, err)
	recent, err := profile.loadRecentMedia(ctx, 101)
	require.NoError(t, err)
	require.Len(t, recent, 1)
	require.Equal(t, &wantTitle, recent[0].Title)
	require.Equal(t, wantCaption, recent[0].Caption)
}
