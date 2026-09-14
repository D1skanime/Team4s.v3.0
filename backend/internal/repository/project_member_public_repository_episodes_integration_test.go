package repository

// TestProjectMemberEpisodesCountUnionDedup beweist gegen eine echte, isolierte Postgres-Instanz
// (Phase 157, Workstream D) die UNION/DISTINCT-Semantik von countEpisodes: die Anzahl der
// Folgen, zu denen ein Member mindestens einen oeffentlichen Textbeitrag ODER ein oeffentliches
// Medium in einem Projekt hat -- weder additiv (Notizen + Medien) noch gleich einer der beiden
// Einzelzahlen.
//
// Fixture (4 Folgen):
//   - Folge A: nur eine oeffentliche Notiz, kein Medium -> zaehlt einmal
//   - Folge B: nur ein oeffentliches Medium, keine Notiz -> zaehlt einmal
//   - Folge C: BEIDES (oeffentliche Notiz + oeffentliches Medium) -> zaehlt genau EINMAL (beweist
//     DISTINCT/UNION-Dedup, keine additive Doppelzaehlung)
//   - Folge D: eine nicht-oeffentliche Notiz (visibility='internal') UND ein nicht freigegebenes
//     Medium (status != 'ready') -> vollstaendig ausgeschlossen
//
// Erwartung: countEpisodes == 3 (A, B, C); countNotes == 2 (A, C); countMedia == 2 (B, C) --
// beweist, dass die Vereinigungszahl weder sum(notes)+sum(media) noch gleich einer der beiden
// Einzelzahlen ist.
//
// Lokale Fixture-Ergaenzung statt Aenderung an testsupport/phase117_postgres.go (Praezedenzfall:
// release_detail_public_repository_segment_credits_test.go). Package repository (nicht
// repository_test) -- direkter Zugriff auf countEpisodes/countNotes/countMedia (unexported,
// selbes Package).
//
// Skips cleanly when TEAM4S_PHASE117_TEST_DSN is unset (testsupport.OpenPhase117Postgres).

import (
	"context"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/stretchr/testify/require"
)

func TestProjectMemberEpisodesCountUnionDedup(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()

	// --- lokale Fixture-Ergaenzung (Tabellen, die countEpisodes/countMedia brauchen, aber nicht
	// in testsupport/phase117_postgres.go stehen) ---
	_, err := pool.Exec(ctx, `
		ALTER TABLE members ADD COLUMN user_id BIGINT;

		CREATE TABLE users (
			id BIGINT PRIMARY KEY
		);

		CREATE TABLE app_users (
			id BIGSERIAL PRIMARY KEY,
			legacy_user_id BIGINT REFERENCES users(id),
			status VARCHAR(20) NOT NULL DEFAULT 'active'
		);

		CREATE TABLE member_claims (
			id BIGSERIAL PRIMARY KEY,
			member_id BIGINT NOT NULL REFERENCES members(id),
			app_user_id BIGINT REFERENCES app_users(id),
			claim_status VARCHAR(20) NOT NULL DEFAULT 'pending'
		);

		CREATE TABLE IF NOT EXISTS visibilities (
			id BIGSERIAL PRIMARY KEY,
			name VARCHAR(40) NOT NULL UNIQUE
		);
		INSERT INTO visibilities (name) VALUES ('public') ON CONFLICT (name) DO NOTHING;

		CREATE TABLE review_statuses (
			id BIGSERIAL PRIMARY KEY,
			code VARCHAR(40) NOT NULL UNIQUE
		);
		INSERT INTO review_statuses (code) VALUES ('approved');

		ALTER TABLE media_assets
			ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ready',
			ADD COLUMN visibility_id BIGINT REFERENCES visibilities(id),
			ADD COLUMN review_status_id BIGINT REFERENCES review_statuses(id);

		CREATE TABLE release_version_media (
			id BIGINT PRIMARY KEY,
			release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
			media_asset_id BIGINT NOT NULL REFERENCES media_assets(id),
			uploaded_by_user_id BIGINT REFERENCES users(id),
			fansub_group_id BIGINT REFERENCES fansub_groups(id),
			deleted_at TIMESTAMPTZ
		);
	`)
	require.NoError(t, err)

	const (
		animeID       = int64(300)
		fansubGroupID = int64(300)
		memberID      = int64(300)
		userID        = int64(300)
		publicVisID   = int64(1)
		approvedRSID  = int64(1)
	)

	_, err = pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id, name) VALUES ($1, 'Episodes-Test-Gruppe')`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO users (id) VALUES ($1)`, userID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO members (id, nickname, user_id) VALUES ($1, 'Episodes-Testmitglied', $2)`, memberID, userID)
	require.NoError(t, err)

	type episodeFixture struct {
		episodeID        int64
		releaseID        int64
		releaseVersionID int64
		mediaAssetID     int64
	}
	episodeA := episodeFixture{episodeID: 301, releaseID: 301, releaseVersionID: 3010}
	episodeB := episodeFixture{episodeID: 302, releaseID: 302, releaseVersionID: 3020, mediaAssetID: 4020}
	episodeC := episodeFixture{episodeID: 303, releaseID: 303, releaseVersionID: 3030, mediaAssetID: 4030}
	episodeD := episodeFixture{episodeID: 304, releaseID: 304, releaseVersionID: 3040, mediaAssetID: 4040}

	for label, ep := range map[string]episodeFixture{"A": episodeA, "B": episodeB, "C": episodeC, "D": episodeD} {
		_, err = pool.Exec(ctx, `INSERT INTO episodes (id, anime_id, episode_number) VALUES ($1, $2, $3)`,
			ep.episodeID, animeID, label)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2)`, ep.releaseID, ep.episodeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO release_versions (id, release_id, version) VALUES ($1, $2, 'v1')`,
			ep.releaseVersionID, ep.releaseID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $2)`,
			ep.releaseVersionID, fansubGroupID)
		require.NoError(t, err)
	}

	noteID := int64(5000)
	insertNote := func(releaseVersionID int64, visibility, status string) {
		noteID++
		_, err = pool.Exec(ctx, `
			INSERT INTO release_version_notes (id, release_version_id, member_id, visibility, status)
			VALUES ($1, $2, $3, $4, $5)
		`, noteID, releaseVersionID, memberID, visibility, status)
		require.NoError(t, err)
	}
	insertMedia := func(mediaAssetID, releaseVersionID int64, mediaStatus string) {
		_, err = pool.Exec(ctx, `
			INSERT INTO media_assets (id, status, visibility_id, review_status_id) VALUES ($1, $2, $3, $4)
		`, mediaAssetID, mediaStatus, publicVisID, approvedRSID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `
			INSERT INTO release_version_media (id, release_version_id, media_asset_id, uploaded_by_user_id, fansub_group_id)
			VALUES ($1, $2, $3, $4, $5)
		`, mediaAssetID, releaseVersionID, mediaAssetID, userID, fansubGroupID)
		require.NoError(t, err)
	}

	// Folge A: nur oeffentliche Notiz.
	insertNote(episodeA.releaseVersionID, "public", "published")

	// Folge B: nur oeffentliches Medium.
	insertMedia(episodeB.mediaAssetID, episodeB.releaseVersionID, "ready")

	// Folge C: oeffentliche Notiz UND oeffentliches Medium -- muss trotzdem nur EINMAL zaehlen.
	insertNote(episodeC.releaseVersionID, "public", "published")
	insertMedia(episodeC.mediaAssetID, episodeC.releaseVersionID, "ready")

	// Folge D: nicht-oeffentliche Notiz UND nicht freigegebenes Medium -- vollstaendig ausgeschlossen.
	insertNote(episodeD.releaseVersionID, "internal", "published")
	insertMedia(episodeD.mediaAssetID, episodeD.releaseVersionID, "processing")

	repo := NewProjectMemberPublicRepository(pool)

	gotEpisodes, err := repo.countEpisodes(ctx, animeID, fansubGroupID, memberID)
	require.NoError(t, err)
	gotNotes, err := repo.countNotes(ctx, animeID, fansubGroupID, memberID)
	require.NoError(t, err)
	gotMedia, err := repo.countMedia(ctx, animeID, fansubGroupID, memberID)
	require.NoError(t, err)

	require.Equal(t, 3, gotEpisodes, "countEpisodes muss Folgen A, B, C zaehlen (Vereinigung, nicht additiv, nicht Einzelzahl)")
	require.Equal(t, 2, gotNotes, "countNotes muss Folgen A, C zaehlen")
	require.Equal(t, 2, gotMedia, "countMedia muss Folgen B, C zaehlen")
}
