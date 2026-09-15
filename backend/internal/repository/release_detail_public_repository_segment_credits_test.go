package repository

// TestReleaseDetailPublicSegmentOriginCredits beweist gegen eine echte, isolierte
// Postgres-Instanz die Origin-basierte, rollen-code- UND explizit-auswahl-gefilterte
// Segment-Credit-Projektion (P156-07/P156-08/P156-09, Plan 156-07 Task 1; die
// explizite Auswahl-Bedingung kam mit Plan 156-13/156-UAT.md GAP-01 hinzu):
//   - ein Segment, dessen ORIGIN-Release-Version keine Beteiligten hat, liefert eine
//     leere (nicht nil) Participants-Liste, keinen Fehler
//   - ein Segment, dessen ORIGIN-Release-Version einen explizit ausgewaehlten
//     Uebersetzer und Timer hat, liefert beide inkl. ihrer RoleCodes
//   - eine Korrektur der Beteiligten-Rollen auf der ORIGIN-Release-Version (ohne das
//     Segment selbst anzufassen) wirkt sich sofort auf den NAECHSTEN Aufruf aus (live)
//   - ein neu hinzugefuegter, explizit ausgewaehlter Beteiligter auf der ORIGIN-Release-
//     Version erscheint beim naechsten Aufruf
//   - ein explizit ausgewaehlter Encoder erscheint als "Karaoke-Encoding", ein explizit
//     ausgewaehlter Designer als "Logo" (GAP-09, Plan 156-21, Auftraggeber-Entscheidung
//     im Chat, 2026-09-15 -- ersetzt die aeltere "Encoder nie"-Regel aus
//     156-UAT.md Regressionsfall D); ein explizit ausgewaehlter raw_provider erscheint
//     dagegen weiterhin NIE, unabhaengig von der Auswahl; ohne explizite Auswahl
//     erscheinen weder Encoder noch Designer, genau wie jede andere Rolle ("keine
//     Auswahl = keine Credits")
//   - origin_release_version_id IS NULL liefert eine leere Participants-Liste, keinen
//     Fehler und keine geratene Ersatzquelle
//   - Type entspricht CanonicalSegmentType(rawTypeName), kein roher Passthrough
//
// Die volle A-J-plus-K-Regressionsmatrix (156-UAT.md Auftragspunkt 16 + Nachtrag
// 2026-09-12) lebt in der Nachbardatei
// release_detail_public_repository_segment_contributor_subset_test.go und teilt sich
// die untenstehende segmentCreditsFixture, um die Postgres-Fixture-Erzeugungs-SQL nicht
// woertlich in zwei Dateien zu duplizieren (CLAUDE.md 450-Zeilen-Limit).
//
// Package repository (nicht repository_test), analog zu
// release_detail_public_segments_integration_test.go -- dieser Test greift direkt auf
// die unexportierte loadReleaseSegments-Methode zu.
//
// Skips cleanly when TEAM4S_PHASE117_TEST_DSN is unset.

import (
	"context"
	"fmt"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/testsupport"
)

// segmentCreditsFixture buendelt die lokale Schema-Ergaenzung (analog Plan 156-03s
// Praezedenzfall: lokale Fixture-Ergaenzung statt Aenderung an
// testsupport/phase117_postgres.go) und die ID-generierenden Helfer, die sowohl
// TestReleaseDetailPublicSegmentOriginCredits als auch
// TestSegmentContributorSubsetMatrix (Plan 156-13) brauchen.
type segmentCreditsFixture struct {
	pool *pgxpool.Pool

	animeID            int64
	fansubGroupID      int64
	themeID            int64
	publicVisibilityID int64
	nextID             int64
}

func newSegmentCreditsFixture(t *testing.T, ctx context.Context, pool *pgxpool.Pool) *segmentCreditsFixture {
	t.Helper()

	// Plan 156-16: dieser Shim lebt inzwischen auch in testsupport/phase117_postgres.go's
	// createPhase117Prerequisites (ensureThemeSegmentOriginTx braucht ihn jetzt aus mehr
	// Aufrufpfaden als nur SetThemeSegmentOrigin) -- IF NOT EXISTS/ON CONFLICT halten diese
	// lokale Kopie damit kollisionsfrei, statt sie zu entfernen und implizit von der
	// Aufrufreihenfolge abhaengig zu werden.
	_, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS visibilities (
			id BIGSERIAL PRIMARY KEY,
			name TEXT NOT NULL UNIQUE
		);
		INSERT INTO visibilities (name) VALUES ('public') ON CONFLICT (name) DO NOTHING;

		ALTER TABLE members ADD COLUMN IF NOT EXISTS profile_visibility TEXT NOT NULL DEFAULT 'members_only';
		ALTER TABLE members ADD COLUMN IF NOT EXISTS public_slug TEXT;

		CREATE TABLE IF NOT EXISTS anime_contributions (
			id BIGSERIAL PRIMARY KEY,
			fansub_group_id BIGINT NOT NULL,
			anime_id BIGINT NOT NULL,
			member_id BIGINT NOT NULL REFERENCES members(id),
			release_version_id BIGINT NULL REFERENCES release_versions(id),
			is_public_on_anime_page BOOLEAN NOT NULL DEFAULT false,
			visibility_id BIGINT NULL REFERENCES visibilities(id)
		);

		CREATE TABLE IF NOT EXISTS anime_contribution_roles (
			id BIGSERIAL PRIMARY KEY,
			anime_contribution_id BIGINT NOT NULL REFERENCES anime_contributions(id) ON DELETE CASCADE,
			role_code TEXT NOT NULL
		);
	`)
	require.NoError(t, err)

	_, err = pool.Exec(ctx, `
		INSERT INTO role_definitions (code, label_de) VALUES
			('translator', 'Übersetzung'),
			('timer', 'Timing'),
			('typesetter', 'Typesetting'),
			('karaoke_fx', 'Karaoke-Effekte'),
			('editor', 'Editing'),
			('encoder', 'Encoding'),
			('quality_checker', 'Qualitätsprüfung'),
			('designer', 'Design'),
			('raw_provider', 'Raw Provider')
	`)
	require.NoError(t, err)

	f := &segmentCreditsFixture{
		pool:               pool,
		animeID:            1,
		fansubGroupID:      1,
		themeID:            1,
		publicVisibilityID: 1,
		nextID:             1,
	}

	const themeTypeID = int64(1)
	_, err = pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, f.animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, f.fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES ($1, 'OP1')`, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id, title) VALUES ($1, $2, $3, 'Moonlight')`, f.themeID, f.animeID, themeTypeID)
	require.NoError(t, err)

	return f
}

func (f *segmentCreditsFixture) allocID() int64 {
	id := f.nextID
	f.nextID++
	return id
}

// newReleaseVersion legt eine minimale Episode/Release/Version-Kette an -- jede
// Origin-Release-Version braucht ihren eigenen Fansub-Release/Episode-Pfad, damit
// loadPublicEffectiveContributors' release_context-CTE (JOIN fansub_releases/episodes)
// sie aufloesen kann.
func (f *segmentCreditsFixture) newReleaseVersion(t *testing.T, ctx context.Context) int64 {
	t.Helper()
	id := f.allocID()
	_, err := f.pool.Exec(ctx, `INSERT INTO episodes (id, anime_id, sort_index, episode_number) VALUES ($1, $2, $3, $4)`, id, f.animeID, id, fmt.Sprintf("%d", id))
	require.NoError(t, err)
	_, err = f.pool.Exec(ctx, `INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2)`, id, id)
	require.NoError(t, err)
	_, err = f.pool.Exec(ctx, `INSERT INTO release_versions (id, release_id, version) VALUES ($1, $2, 'v1')`, id, id)
	require.NoError(t, err)
	_, err = f.pool.Exec(ctx, `INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $2)`, id, f.fansubGroupID)
	require.NoError(t, err)
	return id
}

func (f *segmentCreditsFixture) newSegment(t *testing.T, ctx context.Context, originReleaseVersionID *int64) int64 {
	t.Helper()
	segmentID := f.allocID()
	_, err := f.pool.Exec(ctx, `INSERT INTO theme_segments (id, theme_id, origin_release_version_id) VALUES ($1, $2, $3)`, segmentID, f.themeID, originReleaseVersionID)
	require.NoError(t, err)
	return segmentID
}

func (f *segmentCreditsFixture) assignSegment(t *testing.T, ctx context.Context, segmentID, releaseVersionID int64) {
	t.Helper()
	_, err := f.pool.Exec(ctx, `INSERT INTO theme_segment_assignments (theme_segment_id, release_version_id) VALUES ($1, $2)`, segmentID, releaseVersionID)
	require.NoError(t, err)
}

// newContribution legt einen oeffentlich sichtbaren anime_contributions-Eintrag mit
// genau einer Rolle auf einer konkreten Release-Version an (release-scoped, ggf. ein
// Override -- siehe newAnimeDefaultContribution fuer den vererbten Fall).
func (f *segmentCreditsFixture) newContribution(t *testing.T, ctx context.Context, memberID, releaseVersionID int64, roleCode string) int64 {
	t.Helper()
	return f.newContributionRow(t, ctx, memberID, &releaseVersionID, roleCode)
}

// newAnimeDefaultContribution legt einen vererbten Anime-Default-Beitrag an
// (release_version_id IS NULL) -- effektiv fuer JEDE Release-Version des Animes, solange
// keine Gruppen-Override-Zeile fuer dieselbe Release-Version existiert (Case K).
func (f *segmentCreditsFixture) newAnimeDefaultContribution(t *testing.T, ctx context.Context, memberID int64, roleCode string) int64 {
	t.Helper()
	return f.newContributionRow(t, ctx, memberID, nil, roleCode)
}

func (f *segmentCreditsFixture) newContributionRow(t *testing.T, ctx context.Context, memberID int64, releaseVersionID *int64, roleCode string) int64 {
	t.Helper()
	_, err := f.pool.Exec(ctx, `INSERT INTO members (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`, memberID)
	require.NoError(t, err)
	var contributionID int64
	err = f.pool.QueryRow(ctx, `
		INSERT INTO anime_contributions (fansub_group_id, anime_id, member_id, release_version_id, is_public_on_anime_page, visibility_id)
		VALUES ($1, $2, $3, $4, true, $5)
		RETURNING id
	`, f.fansubGroupID, f.animeID, memberID, releaseVersionID, f.publicVisibilityID).Scan(&contributionID)
	require.NoError(t, err)
	_, err = f.pool.Exec(ctx, `INSERT INTO anime_contribution_roles (anime_contribution_id, role_code) VALUES ($1, $2)`, contributionID, roleCode)
	require.NoError(t, err)
	return contributionID
}

// selectContributor traegt eine explizite Segment-Contributor-Auswahl ein
// (theme_segment_contributors, Plan 156-12) -- die Bedingung, auf die Plan 156-13 die
// oeffentliche Projektion zusaetzlich zur Rollen-Relevanz gated.
func (f *segmentCreditsFixture) selectContributor(t *testing.T, ctx context.Context, segmentID, memberID int64) {
	t.Helper()
	_, err := f.pool.Exec(ctx, `INSERT INTO theme_segment_contributors (theme_segment_id, member_id) VALUES ($1, $2)`, segmentID, memberID)
	require.NoError(t, err)
}

// ensureMember legt eine minimale members-Zeile an, falls sie noch nicht existiert --
// fuer Faelle, in denen eine Segment-Contributor-Auswahl OHNE eine begleitende
// anime_contributions-Zeile geprueft wird (die members-FK von
// theme_segment_contributors braucht trotzdem eine gueltige Zeile).
func (f *segmentCreditsFixture) ensureMember(t *testing.T, ctx context.Context, memberID int64) {
	t.Helper()
	_, err := f.pool.Exec(ctx, `INSERT INTO members (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`, memberID)
	require.NoError(t, err)
}

func findSegmentByID(segments []PublicReleaseSegment, segmentID int64) *PublicReleaseSegment {
	for i := range segments {
		if segments[i].ThemeSegmentID == segmentID {
			return &segments[i]
		}
	}
	return nil
}

func TestReleaseDetailPublicSegmentOriginCredits(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	repo := NewReleaseDetailPublicRepository(pool, "")
	f := newSegmentCreditsFixture(t, ctx, pool)

	viewedReleaseVersionID := f.newReleaseVersion(t, ctx)

	t.Run("Test1: Origin mit null Beteiligten liefert leere, nicht-nil Participants", func(t *testing.T) {
		originID := f.newReleaseVersion(t, ctx)
		segmentID := f.newSegment(t, ctx, &originID)
		f.assignSegment(t, ctx, segmentID, viewedReleaseVersionID)

		segments, err := repo.loadReleaseSegments(ctx, f.animeID, f.fansubGroupID, viewedReleaseVersionID, "v1", "1", nil)
		require.NoError(t, err)

		found := findSegmentByID(segments, segmentID)
		require.NotNil(t, found, "Segment muss in der Ergebnisliste enthalten sein")
		require.NotNil(t, found.Participants, "Participants darf nicht nil sein")
		require.Empty(t, found.Participants, "Origin hat keine Beteiligten -- Participants muss leer sein")
	})

	t.Run("Test2: Origin mit explizit ausgewaehltem Uebersetzer+Timer liefert beide inkl. RoleCodes", func(t *testing.T) {
		originID := f.newReleaseVersion(t, ctx)
		segmentID := f.newSegment(t, ctx, &originID)
		f.assignSegment(t, ctx, segmentID, viewedReleaseVersionID)

		translatorMemberID := f.allocID()
		timerMemberID := f.allocID()
		f.newContribution(t, ctx, translatorMemberID, originID, "translator")
		f.newContribution(t, ctx, timerMemberID, originID, "timer")
		f.selectContributor(t, ctx, segmentID, translatorMemberID)
		f.selectContributor(t, ctx, segmentID, timerMemberID)

		segments, err := repo.loadReleaseSegments(ctx, f.animeID, f.fansubGroupID, viewedReleaseVersionID, "v1", "1", nil)
		require.NoError(t, err)

		found := findSegmentByID(segments, segmentID)
		require.NotNil(t, found)
		require.Len(t, found.Participants, 2)
		gotMemberIDs := []int64{found.Participants[0].MemberID, found.Participants[1].MemberID}
		require.ElementsMatch(t, []int64{translatorMemberID, timerMemberID}, gotMemberIDs)
		for _, p := range found.Participants {
			require.NotEmpty(t, p.RoleCodes, "RoleCodes muss erhalten bleiben")
		}
	})

	t.Run("Test3: Rollenkorrektur auf der Origin wirkt sich sofort auf den naechsten Aufruf aus (live)", func(t *testing.T) {
		originID := f.newReleaseVersion(t, ctx)
		segmentID := f.newSegment(t, ctx, &originID)
		f.assignSegment(t, ctx, segmentID, viewedReleaseVersionID)

		memberID := f.allocID()
		f.newContribution(t, ctx, memberID, originID, "translator")
		f.selectContributor(t, ctx, segmentID, memberID)

		before, err := repo.loadReleaseSegments(ctx, f.animeID, f.fansubGroupID, viewedReleaseVersionID, "v1", "1", nil)
		require.NoError(t, err)
		beforeSegment := findSegmentByID(before, segmentID)
		require.NotNil(t, beforeSegment)
		require.Len(t, beforeSegment.Participants, 1, "vor der Korrektur: der Uebersetzer ist segmentrelevant UND ausgewaehlt")

		// Korrektur direkt auf der Origin, OHNE das Segment anzufassen: die Rolle
		// wechselt von 'translator' (segmentrelevant) auf 'raw_provider' (dauerhaft
		// NICHT segmentrelevant, GAP-09) -- der Beitragende hat keine andere relevante
		// Rolle mehr. 'encoder' waere seit GAP-09 kein taugliches Beispiel mehr, da es
		// jetzt selbst segmentrelevant ist.
		_, err = pool.Exec(ctx, `UPDATE anime_contribution_roles SET role_code = 'raw_provider' WHERE anime_contribution_id = (SELECT id FROM anime_contributions WHERE member_id = $1 AND release_version_id = $2)`, memberID, originID)
		require.NoError(t, err)

		after, err := repo.loadReleaseSegments(ctx, f.animeID, f.fansubGroupID, viewedReleaseVersionID, "v1", "1", nil)
		require.NoError(t, err)
		afterSegment := findSegmentByID(after, segmentID)
		require.NotNil(t, afterSegment)
		require.Empty(t, afterSegment.Participants, "nach der Korrektur (kein Segment-Edit!): der Beitragende ist nicht mehr segmentrelevant")
	})

	t.Run("Test4: neu hinzugefuegter, explizit ausgewaehlter Beteiligter auf der Origin erscheint beim naechsten Aufruf", func(t *testing.T) {
		originID := f.newReleaseVersion(t, ctx)
		segmentID := f.newSegment(t, ctx, &originID)
		f.assignSegment(t, ctx, segmentID, viewedReleaseVersionID)

		before, err := repo.loadReleaseSegments(ctx, f.animeID, f.fansubGroupID, viewedReleaseVersionID, "v1", "1", nil)
		require.NoError(t, err)
		require.Empty(t, findSegmentByID(before, segmentID).Participants)

		newMemberID := f.allocID()
		f.newContribution(t, ctx, newMemberID, originID, "karaoke_fx")
		f.selectContributor(t, ctx, segmentID, newMemberID)

		after, err := repo.loadReleaseSegments(ctx, f.animeID, f.fansubGroupID, viewedReleaseVersionID, "v1", "1", nil)
		require.NoError(t, err)
		afterSegment := findSegmentByID(after, segmentID)
		require.Len(t, afterSegment.Participants, 1)
		require.Equal(t, newMemberID, afterSegment.Participants[0].MemberID)
	})

	t.Run("Test5: Encoder und Designer erscheinen mit ihrer Karaoke-Beschriftung, wenn explizit ausgewaehlt; raw_provider nie (GAP-09)", func(t *testing.T) {
		originID := f.newReleaseVersion(t, ctx)
		segmentID := f.newSegment(t, ctx, &originID)
		f.assignSegment(t, ctx, segmentID, viewedReleaseVersionID)

		encoderMemberID := f.allocID()
		designerMemberID := f.allocID()
		translatorMemberID := f.allocID()
		rawProviderMemberID := f.allocID()
		f.newContribution(t, ctx, encoderMemberID, originID, "encoder")
		f.newContribution(t, ctx, designerMemberID, originID, "designer")
		f.newContribution(t, ctx, translatorMemberID, originID, "translator")
		f.newContribution(t, ctx, rawProviderMemberID, originID, "raw_provider")
		// Alle VIER werden explizit als Segment-Contributor ausgewaehlt -- Encoder,
		// Designer und Uebersetzer erscheinen jetzt (GAP-09), raw_provider erscheint
		// weiterhin NIE, unabhaengig von der Auswahl.
		f.selectContributor(t, ctx, segmentID, encoderMemberID)
		f.selectContributor(t, ctx, segmentID, designerMemberID)
		f.selectContributor(t, ctx, segmentID, translatorMemberID)
		f.selectContributor(t, ctx, segmentID, rawProviderMemberID)

		segments, err := repo.loadReleaseSegments(ctx, f.animeID, f.fansubGroupID, viewedReleaseVersionID, "v1", "1", nil)
		require.NoError(t, err)

		found := findSegmentByID(segments, segmentID)
		require.NotNil(t, found)
		gotMemberIDs := make([]int64, 0, len(found.Participants))
		labelsByMemberID := make(map[int64]string, len(found.Participants))
		for _, p := range found.Participants {
			gotMemberIDs = append(gotMemberIDs, p.MemberID)
			labelsByMemberID[p.MemberID] = p.SegmentRoleLabel
		}
		require.ElementsMatch(t, []int64{encoderMemberID, designerMemberID, translatorMemberID}, gotMemberIDs,
			"Encoder, Designer und Uebersetzer erscheinen (alle explizit ausgewaehlt und aufloesbar); raw_provider erscheint nie")
		require.Equal(t, "Karaoke-Encoding", labelsByMemberID[encoderMemberID])
		require.Equal(t, "Logo", labelsByMemberID[designerMemberID])
	})

	t.Run("Test5b: Encoder und Designer erscheinen NICHT, wenn sie auf der Origin nur die Rolle halten, aber nicht explizit ausgewaehlt sind (GAP-09)", func(t *testing.T) {
		originID := f.newReleaseVersion(t, ctx)
		segmentID := f.newSegment(t, ctx, &originID)
		f.assignSegment(t, ctx, segmentID, viewedReleaseVersionID)

		encoderMemberID := f.allocID()
		designerMemberID := f.allocID()
		f.newContribution(t, ctx, encoderMemberID, originID, "encoder")
		f.newContribution(t, ctx, designerMemberID, originID, "designer")
		// Keine selectContributor-Aufrufe -- "keine Auswahl = keine Credits" gilt fuer
		// Encoder/Designer exakt wie fuer jede andere Rolle.

		segments, err := repo.loadReleaseSegments(ctx, f.animeID, f.fansubGroupID, viewedReleaseVersionID, "v1", "1", nil)
		require.NoError(t, err)

		found := findSegmentByID(segments, segmentID)
		require.NotNil(t, found)
		require.Empty(t, found.Participants, "ohne explizite Auswahl erscheinen weder Encoder noch Designer, obwohl beide auf der Origin segmentrelevant sind")
	})

	t.Run("Test6: origin_release_version_id IS NULL liefert leere Participants, kein Fehler", func(t *testing.T) {
		segmentID := f.newSegment(t, ctx, nil)
		f.assignSegment(t, ctx, segmentID, viewedReleaseVersionID)

		segments, err := repo.loadReleaseSegments(ctx, f.animeID, f.fansubGroupID, viewedReleaseVersionID, "v1", "1", nil)
		require.NoError(t, err)

		found := findSegmentByID(segments, segmentID)
		require.NotNil(t, found)
		require.NotNil(t, found.Participants)
		require.Empty(t, found.Participants)
	})

	t.Run("Test7: Type entspricht CanonicalSegmentType, kein roher Passthrough", func(t *testing.T) {
		segmentID := f.newSegment(t, ctx, nil)
		f.assignSegment(t, ctx, segmentID, viewedReleaseVersionID)

		segments, err := repo.loadReleaseSegments(ctx, f.animeID, f.fansubGroupID, viewedReleaseVersionID, "v1", "1", nil)
		require.NoError(t, err)

		found := findSegmentByID(segments, segmentID)
		require.NotNil(t, found)
		require.Equal(t, CanonicalSegmentType("OP1"), found.Type)
		require.Equal(t, "OP", found.Type)
	})

	t.Run("Test8: SegmentRoleLabel traegt die Karaoke-Beschriftung, RoleLabel bleibt die Release-Rolle (156-UAT.md GAP-06)", func(t *testing.T) {
		originID := f.newReleaseVersion(t, ctx)
		segmentID := f.newSegment(t, ctx, &originID)
		f.assignSegment(t, ctx, segmentID, viewedReleaseVersionID)

		memberID := f.allocID()
		f.newContribution(t, ctx, memberID, originID, "translator")
		f.selectContributor(t, ctx, segmentID, memberID)

		segments, err := repo.loadReleaseSegments(ctx, f.animeID, f.fansubGroupID, viewedReleaseVersionID, "v1", "1", nil)
		require.NoError(t, err)

		found := findSegmentByID(segments, segmentID)
		require.NotNil(t, found)
		require.Len(t, found.Participants, 1)
		require.Equal(t, "Karaoke-Übersetzung", found.Participants[0].SegmentRoleLabel)
		require.Equal(t, "Übersetzung", found.Participants[0].RoleLabel, "RoleLabel muss unveraendert die Release-Rolle bleiben")
	})

	t.Run("Test9: Rollenkorrektur auf der Origin aendert SegmentRoleLabel sofort mit (kein Segment-Edit)", func(t *testing.T) {
		originID := f.newReleaseVersion(t, ctx)
		segmentID := f.newSegment(t, ctx, &originID)
		f.assignSegment(t, ctx, segmentID, viewedReleaseVersionID)

		memberID := f.allocID()
		f.newContribution(t, ctx, memberID, originID, "translator")
		f.selectContributor(t, ctx, segmentID, memberID)

		before, err := repo.loadReleaseSegments(ctx, f.animeID, f.fansubGroupID, viewedReleaseVersionID, "v1", "1", nil)
		require.NoError(t, err)
		beforeSegment := findSegmentByID(before, segmentID)
		require.NotNil(t, beforeSegment)
		require.Len(t, beforeSegment.Participants, 1)
		require.Equal(t, "Karaoke-Übersetzung", beforeSegment.Participants[0].SegmentRoleLabel)

		_, err = pool.Exec(ctx, `UPDATE anime_contribution_roles SET role_code = 'timer' WHERE anime_contribution_id = (SELECT id FROM anime_contributions WHERE member_id = $1 AND release_version_id = $2)`, memberID, originID)
		require.NoError(t, err)

		after, err := repo.loadReleaseSegments(ctx, f.animeID, f.fansubGroupID, viewedReleaseVersionID, "v1", "1", nil)
		require.NoError(t, err)
		afterSegment := findSegmentByID(after, segmentID)
		require.NotNil(t, afterSegment)
		require.Len(t, afterSegment.Participants, 1)
		require.Equal(t, "Karaoke-Timing", afterSegment.Participants[0].SegmentRoleLabel, "SegmentRoleLabel muss live nachziehen, ohne das Segment selbst anzufassen")
	})

	t.Run("Test10: loadContributors (normale Release-Mitwirkenden-Anzeige) liefert immer leeres SegmentRoleLabel", func(t *testing.T) {
		originID := f.newReleaseVersion(t, ctx)
		memberID := f.allocID()
		f.newContribution(t, ctx, memberID, originID, "translator")

		contributors, err := repo.loadContributors(ctx, originID)
		require.NoError(t, err)
		require.NotEmpty(t, contributors)
		for _, c := range contributors {
			require.Empty(t, c.SegmentRoleLabel, "loadContributors darf SegmentCreditLabelForRoles nie aufrufen -- die normale Anzeige bleibt unbeeinflusst")
		}
	})
}
