package repository

// Verhaltenstests für FansubGroupHintsRepository gegen eine echte, isolierte
// Postgres-Instanz (testsupport.OpenPhase191Postgres), die migrationen 0187 UND 0188
// tatsächlich anwendet (D-09 Schema-Schnitt: kein hint_type/requested_role_code mehr,
// related_anime_id ist NOT NULL). Benötigt TEAM4S_PHASE191_TEST_DSN; ohne gesetzte
// Variable werden die Tests übersprungen (t.Skip in openPhasePostgres), nicht
// fehlschlagend.

import (
	"context"
	"errors"
	"testing"
	"time"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func seedPhase191AppUser(t *testing.T, pool *pgxpool.Pool, id int64, email, displayName string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO app_users (id, status, email, display_name) VALUES ($1, 'active', $2, $3)
		ON CONFLICT (id) DO NOTHING
	`, id, email, displayName)
	require.NoError(t, err)
}

func seedPhase191FansubGroup(t *testing.T, pool *pgxpool.Pool, id int64, name string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO fansub_groups (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING
	`, id, name)
	require.NoError(t, err)
}

func seedPhase191Anime(t *testing.T, pool *pgxpool.Pool, id int64, title string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO anime (id, title) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING
	`, id, title)
	require.NoError(t, err)
}

// seedPhase191FansubGroupMemberWithRole legt ein fansub_group_members-Mitglied mit dem
// übergebenen Status an und ordnet ihm optional eine fansub_group_member_roles-Rolle zu
// (role == "" bedeutet "keine Rolle") -- die einzige Grundlage, aus der HasActiveLead/
// ListWithoutActiveLead die "hat die Gruppe eine aktive Leitung"-Antwort serverseitig
// berechnen.
func seedPhase191FansubGroupMemberWithRole(t *testing.T, pool *pgxpool.Pool, memberID, fansubGroupID, appUserID int64, status string, role string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO fansub_group_members (id, fansub_group_id, app_user_id, status) VALUES ($1, $2, $3, $4)
		ON CONFLICT (id) DO NOTHING
	`, memberID, fansubGroupID, appUserID, status)
	require.NoError(t, err)

	if role != "" {
		_, err = pool.Exec(context.Background(), `
			INSERT INTO fansub_group_member_roles (fansub_group_member_id, role) VALUES ($1, $2)
			ON CONFLICT (fansub_group_member_id, role) DO NOTHING
		`, memberID, role)
		require.NoError(t, err)
	}
}

// TestFansubGroupHint_CreateHint_NewTuple_Succeeds prüft das erste Behavior-Bullet: ein brandneues
// (sender, target_group, related_anime_id)-Tupel legt erfolgreich einen Hinweis mit
// status='open' an.
func TestFansubGroupHint_CreateHint_NewTuple_Succeeds(t *testing.T) {
	pool := testsupport.OpenPhase191Postgres(t)
	ctx := context.Background()
	repo := NewFansubGroupHintsRepository(pool)

	seedPhase191AppUser(t, pool, 1001, "sender1@example.test", "Sender Eins")
	seedPhase191FansubGroup(t, pool, 2001, "Zielgruppe Eins")
	seedPhase191Anime(t, pool, 3001, "Testanime Eins")
	animeID := int64(3001)

	row, err := repo.CreateHint(ctx, HintInput{
		SenderAppUserID:     1001,
		TargetFansubGroupID: 2001,
		RelatedAnimeID:      &animeID,
	})
	require.NoError(t, err)
	require.NotNil(t, row)
	assert.Equal(t, "open", row.Status)
	assert.EqualValues(t, 1001, row.SenderAppUserID)
	assert.EqualValues(t, 2001, row.TargetFansubGroupID)
	assert.Equal(t, "Sender Eins", row.SenderDisplayName)
	assert.Equal(t, "Zielgruppe Eins", row.TargetFansubGroupName)
	require.NotNil(t, row.RelatedAnimeTitle)
	assert.Equal(t, "Testanime Eins", *row.RelatedAnimeTitle)
}

// TestFansubGroupHint_CreateHint_DuplicateOpenHint_ReturnsConflict prüft D-04(1): ein zweites CreateHint
// mit identischem (sender, target_group, related_anime_id)-Tupel wie ein bereits offener
// Hinweis wird mit ErrConflict abgewiesen — erzwungen durch den Partial-Unique-Index,
// nicht durch eine Anwendungs-Prüfung.
func TestFansubGroupHint_CreateHint_DuplicateOpenHint_ReturnsConflict(t *testing.T) {
	pool := testsupport.OpenPhase191Postgres(t)
	ctx := context.Background()
	repo := NewFansubGroupHintsRepository(pool)

	seedPhase191AppUser(t, pool, 1002, "sender2@example.test", "Sender Zwei")
	seedPhase191FansubGroup(t, pool, 2002, "Zielgruppe Zwei")
	seedPhase191Anime(t, pool, 3002, "Testanime Zwei")
	animeID := int64(3002)

	input := HintInput{
		SenderAppUserID:     1002,
		TargetFansubGroupID: 2002,
		RelatedAnimeID:      &animeID,
	}

	_, err := repo.CreateHint(ctx, input)
	require.NoError(t, err)

	_, err = repo.CreateHint(ctx, input)
	require.Error(t, err)
	assert.True(t, errors.Is(err, ErrConflict), "expected ErrConflict, got %v", err)
}

// TestFansubGroupHint_CreateHint_UnknownTargetGroup_ReturnsNotFound prüft das dritte Behavior-Bullet:
// eine target_fansub_group_id, die nicht existiert, löst den FK-Verstoß auf
// target_fansub_group_id aus und wird zu ErrNotFound gemappt.
func TestFansubGroupHint_CreateHint_UnknownTargetGroup_ReturnsNotFound(t *testing.T) {
	pool := testsupport.OpenPhase191Postgres(t)
	ctx := context.Background()
	repo := NewFansubGroupHintsRepository(pool)

	seedPhase191AppUser(t, pool, 1003, "sender3@example.test", "Sender Drei")
	seedPhase191Anime(t, pool, 3003, "Testanime Drei")
	animeID := int64(3003)

	_, err := repo.CreateHint(ctx, HintInput{
		SenderAppUserID:     1003,
		TargetFansubGroupID: 999999,
		RelatedAnimeID:      &animeID,
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, ErrNotFound), "expected ErrNotFound, got %v", err)
}

// TestFansubGroupHint_ListByTargetGroup_ReturnsAllStatuses_OrderedByCreatedAt prüft, dass die Liste über
// ALLE Status (offen + bestätigt + abgelehnt) zurückgibt, nicht nur offene — das
// Frontend filtert client-seitig per Toggle, analog zu ContributionsReviewSection.tsx.
func TestFansubGroupHint_ListByTargetGroup_ReturnsAllStatuses_OrderedByCreatedAt(t *testing.T) {
	pool := testsupport.OpenPhase191Postgres(t)
	ctx := context.Background()
	repo := NewFansubGroupHintsRepository(pool)

	seedPhase191AppUser(t, pool, 1005, "sender5@example.test", "Sender Fuenf")
	seedPhase191FansubGroup(t, pool, 2005, "Zielgruppe Fuenf")
	seedPhase191Anime(t, pool, 3005, "Testanime Fuenf")
	seedPhase191Anime(t, pool, 3006, "Testanime Sechs")
	seedPhase191Anime(t, pool, 3007, "Testanime Sieben")
	animeA := int64(3005)
	animeB := int64(3006)
	animeC := int64(3007)

	open, err := repo.CreateHint(ctx, HintInput{SenderAppUserID: 1005, TargetFansubGroupID: 2005, RelatedAnimeID: &animeA})
	require.NoError(t, err)
	toConfirm, err := repo.CreateHint(ctx, HintInput{SenderAppUserID: 1005, TargetFansubGroupID: 2005, RelatedAnimeID: &animeB})
	require.NoError(t, err)
	toReject, err := repo.CreateHint(ctx, HintInput{SenderAppUserID: 1005, TargetFansubGroupID: 2005, RelatedAnimeID: &animeC})
	require.NoError(t, err)

	require.NoError(t, repo.Confirm(ctx, toConfirm.ID, 1005))
	note := "Abgelehnt im Test"
	require.NoError(t, repo.Reject(ctx, toReject.ID, 1005, &note))

	rows, err := repo.ListByTargetGroup(ctx, 2005)
	require.NoError(t, err)
	require.Len(t, rows, 3)

	statuses := map[int64]string{}
	for _, row := range rows {
		statuses[row.ID] = row.Status
	}
	assert.Equal(t, "open", statuses[open.ID])
	assert.Equal(t, "acknowledged", statuses[toConfirm.ID])
	assert.Equal(t, "rejected", statuses[toReject.ID])

	for i := 1; i < len(rows); i++ {
		assert.False(t, rows[i].CreatedAt.Before(rows[i-1].CreatedAt), "rows must be ordered by created_at ascending")
	}
}

// TestFansubGroupHint_HasActiveLead_ReflectsFansubGroupMemberRoles prüft D-11 unabhängig von
// ListWithoutActiveLead: HasActiveLead muss ausschließlich aus fansub_group_member_roles
// berechnet werden (gebunden über permissions.RoleFansubLead, niemals ein String-Literal)
// -- true bei einem aktiven fansub_lead-Mitglied, false ohne jede fansub_lead-Rolle in der
// Gruppe, und false, wenn die einzige fansub_lead-Rolle an einem status='disabled'-Mitglied
// hängt (eine inaktive Leitung zählt nicht als aktive Leitung).
func TestFansubGroupHint_HasActiveLead_ReflectsFansubGroupMemberRoles(t *testing.T) {
	pool := testsupport.OpenPhase191Postgres(t)
	ctx := context.Background()
	repo := NewFansubGroupHintsRepository(pool)

	seedPhase191AppUser(t, pool, 1100, "lead-active@example.test", "Aktive Leitung")
	seedPhase191AppUser(t, pool, 1101, "no-lead@example.test", "Kein Leitungsmitglied")
	seedPhase191AppUser(t, pool, 1102, "lead-disabled@example.test", "Deaktivierte Leitung")
	seedPhase191FansubGroup(t, pool, 2100, "Gruppe mit aktiver Leitung")
	seedPhase191FansubGroup(t, pool, 2101, "Gruppe ohne Leitungsrolle")
	seedPhase191FansubGroup(t, pool, 2102, "Gruppe mit nur deaktivierter Leitung")

	seedPhase191FansubGroupMemberWithRole(t, pool, 4100, 2100, 1100, "active", permissions.RoleFansubLead)
	seedPhase191FansubGroupMemberWithRole(t, pool, 4101, 2101, 1101, "active", "")
	seedPhase191FansubGroupMemberWithRole(t, pool, 4102, 2102, 1102, "disabled", permissions.RoleFansubLead)

	hasLead, err := repo.HasActiveLead(ctx, 2100)
	require.NoError(t, err)
	assert.True(t, hasLead, "group with an active fansub_lead member must report true")

	hasLead, err = repo.HasActiveLead(ctx, 2101)
	require.NoError(t, err)
	assert.False(t, hasLead, "group with zero fansub_lead rows must report false")

	hasLead, err = repo.HasActiveLead(ctx, 2102)
	require.NoError(t, err)
	assert.False(t, hasLead, "group whose only fansub_lead member is disabled must report false")
}

// TestFansubGroupHint_ListWithoutActiveLead_OnlyGroupsMissingAnActiveLead_HonorsFiltersAndPagination prüft
// D-11: ListWithoutActiveLead gibt nur Hinweise an Zielgruppen zurück, die aktuell KEINE
// Person mit status='active' UND der Rolle permissions.RoleFansubLead haben -- eine nur
// disabled-Leitung zählt weiterhin als "ohne aktive Leitung" und muss erscheinen; zusätzlich
// werden Status-/Zielgruppen-Filter und ClampAdminListPage-Pagination geprüft.
func TestFansubGroupHint_ListWithoutActiveLead_OnlyGroupsMissingAnActiveLead_HonorsFiltersAndPagination(t *testing.T) {
	pool := testsupport.OpenPhase191Postgres(t)
	ctx := context.Background()
	repo := NewFansubGroupHintsRepository(pool)

	seedPhase191AppUser(t, pool, 1006, "sender6@example.test", "Sender Sechs")
	seedPhase191AppUser(t, pool, 1200, "lead-active@example.test", "Aktive Leitung")
	seedPhase191AppUser(t, pool, 1201, "lead-disabled@example.test", "Deaktivierte Leitung")
	seedPhase191FansubGroup(t, pool, 2006, "Gruppe ohne Leitung Eins")
	seedPhase191FansubGroup(t, pool, 2007, "Gruppe ohne Leitung Zwei (nur disabled)")
	seedPhase191FansubGroup(t, pool, 2008, "Gruppe mit aktiver Leitung")
	seedPhase191Anime(t, pool, 3100, "Projekt Eins")
	seedPhase191Anime(t, pool, 3101, "Projekt Zwei")
	seedPhase191Anime(t, pool, 3102, "Projekt Drei")
	anime1 := int64(3100)
	anime2 := int64(3101)
	anime3 := int64(3102)

	// 2006: keine fansub_group_member_roles-Zeile ueberhaupt -> ohne aktive Leitung.
	// 2007: nur ein status='disabled'-Mitglied mit fansub_lead -> weiterhin ohne aktive Leitung.
	seedPhase191FansubGroupMemberWithRole(t, pool, 4007, 2007, 1201, "disabled", permissions.RoleFansubLead)
	// 2008: ein status='active'-Mitglied mit fansub_lead -> hat eine aktive Leitung, darf nicht erscheinen.
	seedPhase191FansubGroupMemberWithRole(t, pool, 4008, 2008, 1200, "active", permissions.RoleFansubLead)

	hintGroup6, err := repo.CreateHint(ctx, HintInput{SenderAppUserID: 1006, TargetFansubGroupID: 2006, RelatedAnimeID: &anime1})
	require.NoError(t, err)
	hintGroup7, err := repo.CreateHint(ctx, HintInput{SenderAppUserID: 1006, TargetFansubGroupID: 2007, RelatedAnimeID: &anime2})
	require.NoError(t, err)
	_, err = repo.CreateHint(ctx, HintInput{SenderAppUserID: 1006, TargetFansubGroupID: 2008, RelatedAnimeID: &anime3})
	require.NoError(t, err)

	t.Run("only hints whose target group has no active lead are returned", func(t *testing.T) {
		rows, total, err := repo.ListWithoutActiveLead(ctx, AdminHintListFilter{})
		require.NoError(t, err)
		assert.Equal(t, 2, total)
		ids := map[int64]bool{}
		for _, row := range rows {
			ids[row.ID] = true
		}
		assert.True(t, ids[hintGroup6.ID], "hint to group without any lead role must be included")
		assert.True(t, ids[hintGroup7.ID], "hint to group with only a disabled lead must be included")
	})

	t.Run("target group filter scopes correctly", func(t *testing.T) {
		groupID := int64(2006)
		rows, total, err := repo.ListWithoutActiveLead(ctx, AdminHintListFilter{TargetFansubGroupID: &groupID})
		require.NoError(t, err)
		require.Len(t, rows, 1)
		assert.Equal(t, 1, total)
		assert.EqualValues(t, hintGroup6.ID, rows[0].ID)
	})

	t.Run("status filter excludes decided rows", func(t *testing.T) {
		require.NoError(t, repo.Confirm(ctx, hintGroup6.ID, 1006))
		status := "open"
		rows, total, err := repo.ListWithoutActiveLead(ctx, AdminHintListFilter{Status: &status})
		require.NoError(t, err)
		assert.Equal(t, 1, total)
		require.Len(t, rows, 1)
		assert.EqualValues(t, hintGroup7.ID, rows[0].ID)
	})

	t.Run("pagination clamps via ClampAdminListPage", func(t *testing.T) {
		rows, _, err := repo.ListWithoutActiveLead(ctx, AdminHintListFilter{Limit: 99999})
		require.NoError(t, err)
		limit, _ := ClampAdminListPage(99999, 0)
		assert.LessOrEqual(t, len(rows), limit)
	})
}

// TestFansubGroupHint_Confirm_OpenHint_SetsAcknowledged_AndAlreadyDecidedReturnsNotFound prüft Confirm auf
// einem offenen Hinweis (status='acknowledged', decided_by/decided_at gesetzt) und dass ein
// zweiter Confirm-Aufruf auf dem bereits entschiedenen Hinweis ErrNotFound liefert statt
// eines stillen No-Ops.
func TestFansubGroupHint_Confirm_OpenHint_SetsAcknowledged_AndAlreadyDecidedReturnsNotFound(t *testing.T) {
	pool := testsupport.OpenPhase191Postgres(t)
	ctx := context.Background()
	repo := NewFansubGroupHintsRepository(pool)

	seedPhase191AppUser(t, pool, 1007, "sender7@example.test", "Sender Sieben")
	seedPhase191FansubGroup(t, pool, 2009, "Zielgruppe Acht")
	seedPhase191Anime(t, pool, 3200, "Projekt Acht")
	animeID := int64(3200)

	hint, err := repo.CreateHint(ctx, HintInput{SenderAppUserID: 1007, TargetFansubGroupID: 2009, RelatedAnimeID: &animeID})
	require.NoError(t, err)

	before := time.Now().Add(-time.Second)
	require.NoError(t, repo.Confirm(ctx, hint.ID, 1007))

	updated, err := repo.GetByID(ctx, hint.ID)
	require.NoError(t, err)
	assert.Equal(t, "acknowledged", updated.Status)
	require.NotNil(t, updated.DecidedBy)
	assert.EqualValues(t, 1007, *updated.DecidedBy)
	require.NotNil(t, updated.DecidedAt)
	assert.True(t, updated.DecidedAt.After(before))

	err = repo.Confirm(ctx, hint.ID, 1007)
	require.Error(t, err)
	assert.True(t, errors.Is(err, ErrNotFound), "expected ErrNotFound on already-decided hint, got %v", err)
}

// TestFansubGroupHint_Reject_OpenHint_SetsRejectedWithNote prüft Reject auf einem offenen Hinweis:
// status='rejected', decision_note gesetzt, decided_by/decided_at gesetzt.
func TestFansubGroupHint_Reject_OpenHint_SetsRejectedWithNote(t *testing.T) {
	pool := testsupport.OpenPhase191Postgres(t)
	ctx := context.Background()
	repo := NewFansubGroupHintsRepository(pool)

	seedPhase191AppUser(t, pool, 1008, "sender8@example.test", "Sender Acht")
	seedPhase191FansubGroup(t, pool, 2010, "Zielgruppe Neun")
	seedPhase191Anime(t, pool, 3201, "Projekt Neun")
	animeID := int64(3201)

	hint, err := repo.CreateHint(ctx, HintInput{SenderAppUserID: 1008, TargetFansubGroupID: 2010, RelatedAnimeID: &animeID})
	require.NoError(t, err)

	note := "Nicht zustaendig fuer diese Anfrage."
	require.NoError(t, repo.Reject(ctx, hint.ID, 1008, &note))

	updated, err := repo.GetByID(ctx, hint.ID)
	require.NoError(t, err)
	assert.Equal(t, "rejected", updated.Status)
	require.NotNil(t, updated.DecisionNote)
	assert.Equal(t, note, *updated.DecisionNote)
	require.NotNil(t, updated.DecidedBy)
	assert.EqualValues(t, 1008, *updated.DecidedBy)
}
