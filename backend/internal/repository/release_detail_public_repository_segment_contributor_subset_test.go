package repository

// TestSegmentContributorSubsetMatrix beweist gegen eine echte, isolierte Postgres-
// Instanz die volle A-J-plus-K-Regressionsmatrix aus 156-UAT.md Auftragspunkt 16 (plus
// dem Nachtrag vom 2026-09-12, Case K) fuer die zwei-Bedingungen-Segment-Credit-
// Projektion (Plan 156-13, GAP-01): ein Origin-Beteiligter erscheint NUR, wenn er
// explizit als Segment-Contributor ausgewaehlt wurde UND seine aktuelle, effektiv
// aufgeloeste Origin-Rolle segmentrelevant ist. Jeder Fall ist ein eigener, unabhaengig
// fehlschlagender Subtest -- keiner wird aus einem anderen abgeleitet.
//
// Nutzt dieselbe segmentCreditsFixture wie TestReleaseDetailPublicSegmentOriginCredits
// (release_detail_public_repository_segment_credits_test.go), um die Postgres-Fixture-
// Erzeugungs-SQL nicht zu duplizieren (CLAUDE.md 450-Zeilen-Limit).
//
// Skips cleanly when TEAM4S_PHASE117_TEST_DSN is unset.

import (
	"context"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/stretchr/testify/require"
)

func TestSegmentContributorSubsetMatrix(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	repo := NewReleaseDetailPublicRepository(pool, "")
	f := newSegmentCreditsFixture(t, ctx, pool)

	viewedReleaseVersionID := f.newReleaseVersion(t, ctx)

	load := func(t *testing.T) []PublicReleaseSegment {
		t.Helper()
		segments, err := repo.loadReleaseSegments(ctx, f.animeID, f.fansubGroupID, viewedReleaseVersionID, "v1", "1", nil)
		require.NoError(t, err)
		return segments
	}

	t.Run("A_origin_has_three_qcs_segment_selects_one_only_that_one_appears", func(t *testing.T) {
		originID := f.newReleaseVersion(t, ctx)
		segmentID := f.newSegment(t, ctx, &originID)
		f.assignSegment(t, ctx, segmentID, viewedReleaseVersionID)
		qcA, qcB, qcC := f.allocID(), f.allocID(), f.allocID()
		f.newContribution(t, ctx, qcA, originID, "quality_checker")
		f.newContribution(t, ctx, qcB, originID, "quality_checker")
		f.newContribution(t, ctx, qcC, originID, "quality_checker")
		f.selectContributor(t, ctx, segmentID, qcB)

		found := findSegmentByID(load(t), segmentID)
		require.NotNil(t, found)
		require.Len(t, found.Participants, 1)
		require.Equal(t, qcB, found.Participants[0].MemberID)
	})

	t.Run("B_origin_has_two_editors_segment_selects_one_only_that_one_appears", func(t *testing.T) {
		originID := f.newReleaseVersion(t, ctx)
		segmentID := f.newSegment(t, ctx, &originID)
		f.assignSegment(t, ctx, segmentID, viewedReleaseVersionID)
		editorA, editorB := f.allocID(), f.allocID()
		f.newContribution(t, ctx, editorA, originID, "editor")
		f.newContribution(t, ctx, editorB, originID, "editor")
		f.selectContributor(t, ctx, segmentID, editorA)

		found := findSegmentByID(load(t), segmentID)
		require.NotNil(t, found)
		require.Len(t, found.Participants, 1)
		require.Equal(t, editorA, found.Participants[0].MemberID)
	})

	t.Run("C_five_distinct_people_five_distinct_roles_all_appear_with_current_role", func(t *testing.T) {
		originID := f.newReleaseVersion(t, ctx)
		segmentID := f.newSegment(t, ctx, &originID)
		f.assignSegment(t, ctx, segmentID, viewedReleaseVersionID)
		roles := []string{"translator", "typesetter", "karaoke_fx", "editor", "quality_checker"}
		memberIDs := make([]int64, len(roles))
		for i, role := range roles {
			memberIDs[i] = f.allocID()
			f.newContribution(t, ctx, memberIDs[i], originID, role)
			f.selectContributor(t, ctx, segmentID, memberIDs[i])
		}

		found := findSegmentByID(load(t), segmentID)
		require.NotNil(t, found)
		require.Len(t, found.Participants, 5)
		roleCodesByMember := make(map[int64][]string, len(found.Participants))
		for _, p := range found.Participants {
			roleCodesByMember[p.MemberID] = p.RoleCodes
		}
		for i, role := range roles {
			require.Containsf(t, roleCodesByMember[memberIDs[i]], role, "member %d must carry its current role %q", memberIDs[i], role)
		}
	})

	t.Run("D_encoder_is_origin_contributor_and_explicitly_selected_appears_as_karaoke_encoding", func(t *testing.T) {
		originID := f.newReleaseVersion(t, ctx)
		segmentID := f.newSegment(t, ctx, &originID)
		f.assignSegment(t, ctx, segmentID, viewedReleaseVersionID)
		encoderID := f.allocID()
		f.newContribution(t, ctx, encoderID, originID, "encoder")
		f.selectContributor(t, ctx, segmentID, encoderID)

		found := findSegmentByID(load(t), segmentID)
		require.NotNil(t, found)
		require.Len(t, found.Participants, 1, "GAP-09 (Plan 156-21): ein explizit ausgewaehlter Encoder erscheint jetzt als Segment-Credit")
		require.Equal(t, encoderID, found.Participants[0].MemberID)
		require.Equal(t, "Karaoke-Encoding", found.Participants[0].SegmentRoleLabel)
	})

	t.Run("D2_designer_is_origin_contributor_and_explicitly_selected_appears_as_logo", func(t *testing.T) {
		originID := f.newReleaseVersion(t, ctx)
		segmentID := f.newSegment(t, ctx, &originID)
		f.assignSegment(t, ctx, segmentID, viewedReleaseVersionID)
		designerID := f.allocID()
		f.newContribution(t, ctx, designerID, originID, "designer")
		f.selectContributor(t, ctx, segmentID, designerID)

		found := findSegmentByID(load(t), segmentID)
		require.NotNil(t, found)
		require.Len(t, found.Participants, 1, "GAP-09 (Plan 156-21): ein explizit ausgewaehlter Designer erscheint jetzt als Segment-Credit")
		require.Equal(t, designerID, found.Participants[0].MemberID)
		require.Equal(t, "Logo", found.Participants[0].SegmentRoleLabel)
	})

	t.Run("D3_encoder_and_designer_not_selected_do_not_appear_despite_segment_relevant_origin_role", func(t *testing.T) {
		originID := f.newReleaseVersion(t, ctx)
		segmentID := f.newSegment(t, ctx, &originID)
		f.assignSegment(t, ctx, segmentID, viewedReleaseVersionID)
		encoderID := f.allocID()
		designerID := f.allocID()
		f.newContribution(t, ctx, encoderID, originID, "encoder")
		f.newContribution(t, ctx, designerID, originID, "designer")
		// Bewusst KEIN selectContributor-Aufruf -- "keine Auswahl = keine Credits" gilt
		// fuer Encoder/Designer exakt wie fuer jede andere Rolle (GAP-09).

		found := findSegmentByID(load(t), segmentID)
		require.NotNil(t, found)
		require.Empty(t, found.Participants, "ohne explizite Auswahl erscheinen weder Encoder noch Designer")
	})

	t.Run("D4_raw_provider_explicitly_selected_never_appears", func(t *testing.T) {
		originID := f.newReleaseVersion(t, ctx)
		segmentID := f.newSegment(t, ctx, &originID)
		f.assignSegment(t, ctx, segmentID, viewedReleaseVersionID)
		rawProviderID := f.allocID()
		f.newContribution(t, ctx, rawProviderID, originID, "raw_provider")
		f.selectContributor(t, ctx, segmentID, rawProviderID)

		found := findSegmentByID(load(t), segmentID)
		require.NotNil(t, found)
		require.Empty(t, found.Participants, "raw_provider bleibt dauerhaft ausgeschlossen, unabhaengig von expliziter Auswahl (Rollen-Katalog-Ausschluss gewinnt sogar gegen explizite Auswahl)")
	})

	t.Run("E_role_change_qc_to_editor_reflects_automatically_without_segment_edit", func(t *testing.T) {
		originID := f.newReleaseVersion(t, ctx)
		segmentID := f.newSegment(t, ctx, &originID)
		f.assignSegment(t, ctx, segmentID, viewedReleaseVersionID)
		memberID := f.allocID()
		f.newContribution(t, ctx, memberID, originID, "quality_checker")
		f.selectContributor(t, ctx, segmentID, memberID)

		before := findSegmentByID(load(t), segmentID)
		require.NotNil(t, before)
		require.Len(t, before.Participants, 1)
		require.Contains(t, before.Participants[0].RoleCodes, "quality_checker")

		_, err := pool.Exec(ctx, `UPDATE anime_contribution_roles SET role_code = 'editor' WHERE anime_contribution_id = (SELECT id FROM anime_contributions WHERE member_id = $1 AND release_version_id = $2)`, memberID, originID)
		require.NoError(t, err)

		after := findSegmentByID(load(t), segmentID)
		require.NotNil(t, after)
		require.Len(t, after.Participants, 1)
		require.Contains(t, after.Participants[0].RoleCodes, "editor")
		require.NotContains(t, after.Participants[0].RoleCodes, "quality_checker")
	})

	t.Run("F_role_change_qc_to_raw_provider_removes_person_from_segment_credits", func(t *testing.T) {
		// GAP-09 (Plan 156-21): 'encoder' waere hier kein taugliches Beispiel mehr, da es
		// jetzt selbst segmentrelevant ist -- 'raw_provider' ist der neue, dauerhafte
		// Standardbeispiel-Fall fuer eine NICHT-segmentrelevante Rolle.
		originID := f.newReleaseVersion(t, ctx)
		segmentID := f.newSegment(t, ctx, &originID)
		f.assignSegment(t, ctx, segmentID, viewedReleaseVersionID)
		memberID := f.allocID()
		f.newContribution(t, ctx, memberID, originID, "quality_checker")
		f.selectContributor(t, ctx, segmentID, memberID)

		before := findSegmentByID(load(t), segmentID)
		require.NotNil(t, before)
		require.Len(t, before.Participants, 1)

		_, err := pool.Exec(ctx, `UPDATE anime_contribution_roles SET role_code = 'raw_provider' WHERE anime_contribution_id = (SELECT id FROM anime_contributions WHERE member_id = $1 AND release_version_id = $2)`, memberID, originID)
		require.NoError(t, err)

		after := findSegmentByID(load(t), segmentID)
		require.NotNil(t, after)
		require.Empty(t, after.Participants, "QC->raw_provider: Person verschwindet, kein Fehler, kein Zombie-Credit")
	})

	t.Run("G_origin_contribution_row_deleted_no_crash_no_credit_no_inconsistent_role", func(t *testing.T) {
		originID := f.newReleaseVersion(t, ctx)
		segmentID := f.newSegment(t, ctx, &originID)
		f.assignSegment(t, ctx, segmentID, viewedReleaseVersionID)
		memberID := f.allocID()
		contributionID := f.newContribution(t, ctx, memberID, originID, "translator")
		f.selectContributor(t, ctx, segmentID, memberID)

		before := findSegmentByID(load(t), segmentID)
		require.NotNil(t, before)
		require.Len(t, before.Participants, 1)

		_, err := pool.Exec(ctx, `DELETE FROM anime_contributions WHERE id = $1`, contributionID)
		require.NoError(t, err)

		after := findSegmentByID(load(t), segmentID)
		require.NotNil(t, after, "kein Absturz, das Segment bleibt in der Ergebnisliste")
		require.Empty(t, after.Participants, "der Join liefert schlicht keinen Treffer mehr -- kein Fehler, keine inkonsistente Rollenanzeige")
	})

	t.Run("H_origin_changed_to_release_without_contributor_no_inconsistent_read_state", func(t *testing.T) {
		originA := f.newReleaseVersion(t, ctx)
		originB := f.newReleaseVersion(t, ctx)
		segmentID := f.newSegment(t, ctx, &originA)
		f.assignSegment(t, ctx, segmentID, viewedReleaseVersionID)
		memberID := f.allocID()
		f.newContribution(t, ctx, memberID, originA, "translator")
		f.selectContributor(t, ctx, segmentID, memberID)

		// Direkter Origin-Wechsel OHNE den Repository-Schreibpfad (SetThemeSegmentOrigin,
		// Plan 156-12, raeumt Auswahl-Zeilen atomar auf) -- dieser Test prueft
		// ausschliesslich die LESE-Seite: selbst wenn eine jetzt ungueltige
		// theme_segment_contributors-Zeile stehen bliebe, darf die Projektion weder
		// abstuerzen noch die Person unter der falschen Origin zeigen.
		_, err := pool.Exec(ctx, `UPDATE theme_segments SET origin_release_version_id = $1 WHERE id = $2`, originB, segmentID)
		require.NoError(t, err)

		found := findSegmentByID(load(t), segmentID)
		require.NotNil(t, found)
		require.Empty(t, found.Participants, "der Beitragende gehoert nicht zur NEUEN Origin -- keine Credits, kein Fehler")
	})

	t.Run("I_origin_has_three_qcs_none_selected_zero_credits_not_all_three", func(t *testing.T) {
		originID := f.newReleaseVersion(t, ctx)
		segmentID := f.newSegment(t, ctx, &originID)
		f.assignSegment(t, ctx, segmentID, viewedReleaseVersionID)
		f.newContribution(t, ctx, f.allocID(), originID, "quality_checker")
		f.newContribution(t, ctx, f.allocID(), originID, "quality_checker")
		f.newContribution(t, ctx, f.allocID(), originID, "quality_checker")

		found := findSegmentByID(load(t), segmentID)
		require.NotNil(t, found)
		require.Empty(t, found.Participants, "keine Auswahl -- NICHT automatisch alle drei anzeigen")
	})

	t.Run("J_preexisting_segment_no_selection_gets_zero_person_credits_despite_real_origin_contributors", func(t *testing.T) {
		originID := f.newReleaseVersion(t, ctx)
		// Kein selectContributor-Aufruf ueberhaupt -- simuliert ein Segment von VOR der
		// theme_segment_contributors-Migration (0162): niemals eine Auswahl-Zeile
		// erhalten, obwohl die Origin echte, segmentrelevante Beteiligte hat.
		segmentID := f.newSegment(t, ctx, &originID)
		f.assignSegment(t, ctx, segmentID, viewedReleaseVersionID)
		f.newContribution(t, ctx, f.allocID(), originID, "translator")
		f.newContribution(t, ctx, f.allocID(), originID, "timer")

		found := findSegmentByID(load(t), segmentID)
		require.NotNil(t, found)
		require.Empty(t, found.Participants, "kein Legacy-Fallback: keine Auswahl = keine Credits")
	})

	t.Run("K_inherited_default_overridden_to_relevant_role", func(t *testing.T) {
		originID := f.newReleaseVersion(t, ctx)
		segmentID := f.newSegment(t, ctx, &originID)
		f.assignSegment(t, ctx, segmentID, viewedReleaseVersionID)
		memberID := f.allocID()
		// Der Beitragende ist zum Auswahlzeitpunkt NUR ueber einen vererbten
		// Anime-Default wirksam (release_version_id IS NULL) -- keine Release-scoped
		// Zeile existiert ueberhaupt.
		f.newAnimeDefaultContribution(t, ctx, memberID, "translator")
		f.selectContributor(t, ctx, segmentID, memberID)

		before := findSegmentByID(load(t), segmentID)
		require.NotNil(t, before)
		require.Len(t, before.Participants, 1, "vererbter Anime-Default macht die Person effektiv und segmentrelevant")
		require.Contains(t, before.Participants[0].RoleCodes, "translator")

		// Spaeter: Release-Level-Override fuer DIESELBE Person auf der Origin --
		// segmentrelevant (translator -> timer). Die theme_segment_contributors-Zeile
		// selbst wird NICHT angefasst.
		f.newContribution(t, ctx, memberID, originID, "timer")

		after := findSegmentByID(load(t), segmentID)
		require.NotNil(t, after)
		require.Len(t, after.Participants, 1, "die Auswahl bleibt unveraendert -- die Person ist weiterhin effektiv, jetzt mit der NEUEN Rolle")
		require.Equal(t, memberID, after.Participants[0].MemberID)
		require.Contains(t, after.Participants[0].RoleCodes, "timer")
		require.NotContains(t, after.Participants[0].RoleCodes, "translator", "der vererbte Default wird vom Override vollstaendig verdraengt, nicht addiert")
	})

	t.Run("K_inherited_default_overridden_to_irrelevant_role", func(t *testing.T) {
		originID := f.newReleaseVersion(t, ctx)
		segmentID := f.newSegment(t, ctx, &originID)
		f.assignSegment(t, ctx, segmentID, viewedReleaseVersionID)
		memberID := f.allocID()
		f.newAnimeDefaultContribution(t, ctx, memberID, "translator")
		f.selectContributor(t, ctx, segmentID, memberID)

		before := findSegmentByID(load(t), segmentID)
		require.NotNil(t, before)
		require.Len(t, before.Participants, 1, "vererbter Anime-Default macht die Person effektiv und segmentrelevant")

		// Spaeter: Release-Level-Override auf eine NICHT-segmentrelevante Rolle
		// (translator -> raw_provider, GAP-09s neues dauerhaftes Beispiel -- 'encoder'
		// waere hier seit GAP-09 kein taugliches Beispiel mehr, da es jetzt selbst
		// segmentrelevant ist). Dieselbe theme_segment_contributors-Zeile bleibt
		// unveraendert bestehen.
		f.newContribution(t, ctx, memberID, originID, "raw_provider")

		after := findSegmentByID(load(t), segmentID)
		require.NotNil(t, after)
		require.Empty(t, after.Participants, "das Override macht die Person nicht mehr segmentrelevant -- kein Fehler, kein Zombie-Credit, keine veraltete Rollenanzeige")
	})

	t.Run("NoOrigin_selection_row_present_but_ignored_no_crash", func(t *testing.T) {
		segmentID := f.newSegment(t, ctx, nil)
		f.assignSegment(t, ctx, segmentID, viewedReleaseVersionID)
		memberID := f.allocID()
		f.ensureMember(t, ctx, memberID)
		f.selectContributor(t, ctx, segmentID, memberID)

		found := findSegmentByID(load(t), segmentID)
		require.NotNil(t, found)
		require.Empty(t, found.Participants, "kein Origin -> keine Credits, unabhaengig von einer eventuell vorhandenen Auswahl-Zeile")
	})
}
