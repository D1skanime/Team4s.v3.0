package repository

// 173-05 Task 1/Task 2: proves that AttachUploadedAvatar/AttachUploadedBackground insert a
// variant='display' media_files row when DisplayFilePath is non-empty (omitting it gracefully
// when empty, keeping old call sites compiling/passing), and that the own-profile base read
// (ensureProfileBase, the function GetOwnProfile builds on) exposes a DisplayURL on
// Avatar/BackgroundImage with a fallback to the original URL when no display row exists yet
// (pre-migration rows).
//
// Uses ensureProfileBase (package-private, same package) rather than the full GetOwnProfile
// aggregate -- GetOwnProfile additionally loads memberships/credits/recent-media/contributions
// against a much larger real-schema surface (fansub_groups, hist_group_member_roles, etc.)
// that is unrelated to this plan's display_url change and out of scope to replicate here.
//
// Skips cleanly when TEAM4S_PHASE106_TEST_DSN is unset.

import (
	"context"
	"testing"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

func createMemberProfileAvatarBackgroundSchema(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	// OpenPhase106Postgres's createPhase106Prerequisites already created bare "members (id)" and
	// "app_users (id)" tables in this isolated schema -- widen them with ALTER instead of
	// CREATE TABLE (which would fail with "relation already exists").
	_, err := pool.Exec(context.Background(), `
ALTER TABLE app_users
	ADD COLUMN legacy_user_id BIGINT,
	ADD COLUMN email TEXT NOT NULL DEFAULT '',
	ADD COLUMN keycloak_subject TEXT NOT NULL DEFAULT '',
	ADD COLUMN display_name TEXT,
	ADD COLUMN status TEXT NOT NULL DEFAULT 'active',
	ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE app_user_global_roles (app_user_id BIGINT, role TEXT);
ALTER TABLE members
	ADD COLUMN public_slug TEXT,
	ADD COLUMN display_name TEXT,
	ADD COLUMN nickname TEXT,
	ADD COLUMN slogan TEXT,
	ADD COLUMN member_history_description TEXT,
	ADD COLUMN member_story_json JSONB,
	ADD COLUMN member_story_html TEXT,
	ADD COLUMN member_story_text TEXT,
	ADD COLUMN member_story_editor_type TEXT,
	ADD COLUMN member_story_content_schema_version INT,
	ADD COLUMN active_from_date DATE,
	ADD COLUMN active_until_date DATE,
	ADD COLUMN active_from_year INT,
	ADD COLUMN active_until_year INT,
	ADD COLUMN is_currently_active BOOLEAN NOT NULL DEFAULT false,
	ADD COLUMN noindex BOOLEAN NOT NULL DEFAULT false,
	ADD COLUMN profile_visibility TEXT NOT NULL DEFAULT 'public',
	ADD COLUMN avatar_media_id BIGINT,
	ADD COLUMN background_media_id BIGINT,
	ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE TABLE member_claims (
	id BIGINT PRIMARY KEY, member_id BIGINT NOT NULL, app_user_id BIGINT NOT NULL,
	claim_status TEXT NOT NULL DEFAULT 'verified'
);
CREATE TABLE media_types (id BIGINT PRIMARY KEY, name TEXT);
CREATE TABLE media_assets (
	id BIGSERIAL PRIMARY KEY, media_type_id BIGINT, file_path TEXT, mime_type TEXT, format TEXT,
	uploaded_by BIGINT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE media_files (
	id BIGSERIAL PRIMARY KEY, media_id BIGINT NOT NULL, variant TEXT, path TEXT,
	width INT, height INT, size BIGINT, status TEXT NOT NULL DEFAULT 'ready'
);
INSERT INTO media_types (id, name) VALUES (1, 'avatar'), (2, 'background');
`)
	require.NoError(t, err)
}

func seedMemberProfileFixture(t *testing.T, pool *pgxpool.Pool, appUserID, memberID int64) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `INSERT INTO app_users (id, email, display_name, status) VALUES ($1, 'm@example.com', 'Test User', 'active')`, appUserID)
	require.NoError(t, err)
	_, err = pool.Exec(context.Background(), `INSERT INTO members (id, display_name) VALUES ($1, 'Test Member')`, memberID)
	require.NoError(t, err)
	_, err = pool.Exec(context.Background(), `INSERT INTO member_claims (id, member_id, app_user_id, claim_status) VALUES ($1, $2, $3, 'verified')`, memberID*1000, memberID, appUserID)
	require.NoError(t, err)
}

// attachUploadedAvatarIgnoringAggregateReadback calls AttachUploadedAvatar and tolerates an
// error from its trailing r.GetOwnProfile(...) read-back call -- that aggregate additionally
// touches memberships/credits/media tables this test's minimal schema does not provide. The
// INSERT/UPDATE transaction itself already committed before that read-back runs, so the write
// side is fully exercised regardless.
func attachUploadedAvatarIgnoringAggregateReadback(t *testing.T, repo *MemberProfileRepository, ctx context.Context, appUserID int64, input models.MemberProfileAvatarUploadInput) {
	t.Helper()
	if _, err := repo.AttachUploadedAvatar(ctx, appUserID, input); err != nil {
		t.Logf("AttachUploadedAvatar read-back aggregate error (expected, minimal schema): %v", err)
	}
}

func attachUploadedBackgroundIgnoringAggregateReadback(t *testing.T, repo *MemberProfileRepository, ctx context.Context, appUserID int64, input models.MemberProfileBackgroundUploadInput) {
	t.Helper()
	if _, err := repo.AttachUploadedBackground(ctx, appUserID, input); err != nil {
		t.Logf("AttachUploadedBackground read-back aggregate error (expected, minimal schema): %v", err)
	}
}

// TestAttachUploadedAvatar_InsertsDisplayRowAndEnsureProfileBaseExposesDisplayURL covers both
// Task 1 (write side) and Task 2 (read side) for avatars in one DB round-trip.
func TestAttachUploadedAvatar_InsertsDisplayRowAndEnsureProfileBaseExposesDisplayURL(t *testing.T) {
	pool := testsupport.OpenPhase106Postgres(t)
	createMemberProfileAvatarBackgroundSchema(t, pool)
	repo := NewMemberProfileRepository(pool, "http://localhost:8092")
	ctx := context.Background()

	const appUserID int64 = 1
	const memberID int64 = 1
	seedMemberProfileFixture(t, pool, appUserID, memberID)

	width, height := 100, 100
	displayWidth, displayHeight := 80, 80
	attachUploadedAvatarIgnoringAggregateReadback(t, repo, ctx, appUserID, models.MemberProfileAvatarUploadInput{
		FilePath:         "/media/profile/1/avatar/x/original.png",
		PublicURL:        "http://localhost:8092/media/profile/1/avatar/x/original.png",
		MimeType:         "image/png",
		SizeBytes:        1000,
		Width:            &width,
		Height:           &height,
		DisplayFilePath:  "/media/profile/1/avatar/x/display.jpg",
		DisplayWidth:     &displayWidth,
		DisplayHeight:    &displayHeight,
		DisplaySizeBytes: 500,
	})

	var displayCount int64
	require.NoError(t, pool.QueryRow(ctx, `SELECT COUNT(*) FROM media_files WHERE variant = 'display'`).Scan(&displayCount))
	require.Equal(t, int64(1), displayCount, "AttachUploadedAvatar muss eine variant='display'-Zeile einfuegen, wenn DisplayFilePath gesetzt ist")

	profile, err := repo.ensureProfileBase(ctx, appUserID)
	require.NoError(t, err)
	require.NotNil(t, profile.Avatar)
	require.Contains(t, profile.Avatar.DisplayURL, "display.jpg", "ensureProfileBase muss display_url auf die display-Zeile setzen")
	require.NotEqual(t, profile.Avatar.PublicURL, profile.Avatar.DisplayURL)
}

// TestAttachUploadedAvatar_OmitsDisplayRowWhenPathEmpty belegt die Rueckwaertskompatibilitaet:
// alte Call-Sites, die DisplayFilePath nie setzen, bleiben kompilierbar und funktionsfaehig --
// und der Lesepfad faellt dann korrekt auf die PublicURL zurueck (Vor-Migration-Parity).
func TestAttachUploadedAvatar_OmitsDisplayRowWhenPathEmpty(t *testing.T) {
	pool := testsupport.OpenPhase106Postgres(t)
	createMemberProfileAvatarBackgroundSchema(t, pool)
	repo := NewMemberProfileRepository(pool, "http://localhost:8092")
	ctx := context.Background()

	const appUserID int64 = 2
	const memberID int64 = 2
	seedMemberProfileFixture(t, pool, appUserID, memberID)

	width, height := 100, 100
	attachUploadedAvatarIgnoringAggregateReadback(t, repo, ctx, appUserID, models.MemberProfileAvatarUploadInput{
		FilePath:  "/media/profile/2/avatar/x/original.png",
		PublicURL: "http://localhost:8092/media/profile/2/avatar/x/original.png",
		MimeType:  "image/png",
		SizeBytes: 1000,
		Width:     &width,
		Height:    &height,
	})

	var displayCount int64
	require.NoError(t, pool.QueryRow(ctx, `SELECT COUNT(*) FROM media_files WHERE variant = 'display'`).Scan(&displayCount))
	require.Equal(t, int64(0), displayCount, "ohne DisplayFilePath darf keine display-Zeile entstehen")

	profile, err := repo.ensureProfileBase(ctx, appUserID)
	require.NoError(t, err)
	require.NotNil(t, profile.Avatar)
	require.Equal(t, profile.Avatar.PublicURL, profile.Avatar.DisplayURL, "ohne display-Zeile muss display_url auf das Original zurueckfallen")
}

// TestAttachUploadedBackground_InsertsDisplayRowAndEnsureProfileBaseExposesDisplayURL mirrors
// the avatar test for profile backgrounds.
func TestAttachUploadedBackground_InsertsDisplayRowAndEnsureProfileBaseExposesDisplayURL(t *testing.T) {
	pool := testsupport.OpenPhase106Postgres(t)
	createMemberProfileAvatarBackgroundSchema(t, pool)
	repo := NewMemberProfileRepository(pool, "http://localhost:8092")
	ctx := context.Background()

	const appUserID int64 = 3
	const memberID int64 = 3
	seedMemberProfileFixture(t, pool, appUserID, memberID)

	width, height := 1920, 384
	displayWidth, displayHeight := 1920, 384
	attachUploadedBackgroundIgnoringAggregateReadback(t, repo, ctx, appUserID, models.MemberProfileBackgroundUploadInput{
		FilePath:         "/media/profile/3/background/x/original.png",
		PublicURL:        "http://localhost:8092/media/profile/3/background/x/original.png",
		MimeType:         "image/png",
		SizeBytes:        5000,
		Width:            &width,
		Height:           &height,
		DisplayFilePath:  "/media/profile/3/background/x/display.jpg",
		DisplayWidth:     &displayWidth,
		DisplayHeight:    &displayHeight,
		DisplaySizeBytes: 2500,
	})

	profile, err := repo.ensureProfileBase(ctx, appUserID)
	require.NoError(t, err)
	require.NotNil(t, profile.BackgroundImage)
	require.Contains(t, profile.BackgroundImage.DisplayURL, "display.jpg")
	require.NotEqual(t, profile.BackgroundImage.PublicURL, profile.BackgroundImage.DisplayURL)
}
