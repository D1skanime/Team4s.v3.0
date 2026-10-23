package repository

// Verhaltenstests für FansubGroupHintsRepository gegen eine echte, isolierte
// Postgres-Instanz (testsupport.OpenPhase191Postgres), die migration 0187 tatsächlich
// anwendet. Benötigt TEAM4S_PHASE191_TEST_DSN; ohne gesetzte Variable werden die Tests
// übersprungen (t.Skip in openPhasePostgres), nicht fehlschlagend.

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

// TestFansubGroupHint_CreateHint_NewTuple_Succeeds prüft das erste Behavior-Bullet: ein brandneues
// (sender, target_group, hint_type, related_anime_id, requested_role_code)-Tupel legt
// erfolgreich einen Hinweis mit status='open' an.
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
		HintType:            "correction",
		RelatedAnimeID:      &animeID,
	})
	require.NoError(t, err)
	require.NotNil(t, row)
	assert.Equal(t, "open", row.Status)
	assert.EqualValues(t, 1001, row.SenderAppUserID)
	assert.EqualValues(t, 2001, row.TargetFansubGroupID)
	assert.Equal(t, "correction", row.HintType)
	assert.Equal(t, "Sender Eins", row.SenderDisplayName)
	assert.Equal(t, "Zielgruppe Eins", row.TargetFansubGroupName)
	require.NotNil(t, row.RelatedAnimeTitle)
	assert.Equal(t, "Testanime Eins", *row.RelatedAnimeTitle)
}

// TestFansubGroupHint_CreateHint_DuplicateOpenHint_ReturnsConflict prüft D-04(1): ein zweites CreateHint
// mit identischem (sender, target_group, hint_type, related_anime_id,
// requested_role_code)-Tupel wie ein bereits offener Hinweis wird mit ErrConflict
// abgewiesen — erzwungen durch den Partial-Unique-Index, nicht durch eine
// Anwendungs-Prüfung.
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
		HintType:            "correction",
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

	_, err := repo.CreateHint(ctx, HintInput{
		SenderAppUserID:     1003,
		TargetFansubGroupID: 999999,
		HintType:            "membership_request",
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, ErrNotFound), "expected ErrNotFound, got %v", err)
}

// TestFansubGroupHint_CreateHint_TwoMembershipRequestsNullRole_CollideAsDuplicate ist der gezielte
// Regressionstest für die COALESCE-NULL-Semantik-Falle: zwei Mitgliedschaftsanfragen vom
// selben Absender an dieselbe Gruppe, BEIDE mit requested_role_code=NULL ("keine
// bestimmte Rolle"), müssen als Duplikat kollidieren. Ein einfacher klassischer
// UNIQUE-Constraint würde das NICHT erkennen (Postgres behandelt zwei NULLs als
// verschieden) — genau deshalb nutzt die Migration COALESCE(requested_role_code, '').
func TestFansubGroupHint_CreateHint_TwoMembershipRequestsNullRole_CollideAsDuplicate(t *testing.T) {
	pool := testsupport.OpenPhase191Postgres(t)
	ctx := context.Background()
	repo := NewFansubGroupHintsRepository(pool)

	seedPhase191AppUser(t, pool, 1004, "sender4@example.test", "Sender Vier")
	seedPhase191FansubGroup(t, pool, 2004, "Zielgruppe Vier")

	input := HintInput{
		SenderAppUserID:     1004,
		TargetFansubGroupID: 2004,
		HintType:            "membership_request",
		RequestedRoleCode:   nil,
	}

	_, err := repo.CreateHint(ctx, input)
	require.NoError(t, err)

	_, err = repo.CreateHint(ctx, input)
	require.Error(t, err)
	assert.True(t, errors.Is(err, ErrConflict), "expected ErrConflict (COALESCE NULL regression), got %v", err)
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
	animeA := int64(3005)
	animeB := int64(3006)

	open, err := repo.CreateHint(ctx, HintInput{SenderAppUserID: 1005, TargetFansubGroupID: 2005, HintType: "correction", RelatedAnimeID: &animeA})
	require.NoError(t, err)
	toConfirm, err := repo.CreateHint(ctx, HintInput{SenderAppUserID: 1005, TargetFansubGroupID: 2005, HintType: "correction", RelatedAnimeID: &animeB})
	require.NoError(t, err)
	toReject, err := repo.CreateHint(ctx, HintInput{SenderAppUserID: 1005, TargetFansubGroupID: 2005, HintType: "membership_request"})
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

// TestFansubGroupHint_ListForFansubLeadRole_OnlyFansubLeadRequests_HonorsFiltersAndPagination prüft D-01:
// nur Mitgliedschaftsanfragen mit requested_role_code='fansub_lead' erscheinen, egal ob
// die Zeile 'co_leader' oder "keine bestimmte Rolle" (NULL) hat; zusätzlich werden
// Status-/Zielgruppen-Filter und ClampAdminListPage-Pagination geprüft.
func TestFansubGroupHint_ListForFansubLeadRole_OnlyFansubLeadRequests_HonorsFiltersAndPagination(t *testing.T) {
	pool := testsupport.OpenPhase191Postgres(t)
	ctx := context.Background()
	repo := NewFansubGroupHintsRepository(pool)

	seedPhase191AppUser(t, pool, 1006, "sender6@example.test", "Sender Sechs")
	seedPhase191FansubGroup(t, pool, 2006, "Zielgruppe Sechs")
	seedPhase191FansubGroup(t, pool, 2007, "Zielgruppe Sieben")

	fansubLead := permissions.RoleFansubLead
	coLeader := "co_leader"

	leadHintGroup6, err := repo.CreateHint(ctx, HintInput{SenderAppUserID: 1006, TargetFansubGroupID: 2006, HintType: "membership_request", RequestedRoleCode: &fansubLead})
	require.NoError(t, err)
	_, err = repo.CreateHint(ctx, HintInput{SenderAppUserID: 1006, TargetFansubGroupID: 2007, HintType: "membership_request", RequestedRoleCode: &fansubLead})
	require.NoError(t, err)
	_, err = repo.CreateHint(ctx, HintInput{SenderAppUserID: 1006, TargetFansubGroupID: 2006, HintType: "membership_request", RequestedRoleCode: &coLeader})
	require.NoError(t, err)
	_, err = repo.CreateHint(ctx, HintInput{SenderAppUserID: 1006, TargetFansubGroupID: 2007, HintType: "membership_request"})
	require.NoError(t, err)

	t.Run("only fansub_lead rows are returned", func(t *testing.T) {
		rows, total, err := repo.ListForFansubLeadRole(ctx, AdminHintListFilter{})
		require.NoError(t, err)
		assert.Equal(t, 2, total)
		for _, row := range rows {
			require.NotNil(t, row.RequestedRoleCode)
			assert.Equal(t, permissions.RoleFansubLead, *row.RequestedRoleCode)
		}
	})

	t.Run("target group filter scopes correctly", func(t *testing.T) {
		groupID := int64(2006)
		rows, total, err := repo.ListForFansubLeadRole(ctx, AdminHintListFilter{TargetFansubGroupID: &groupID})
		require.NoError(t, err)
		require.Len(t, rows, 1)
		assert.Equal(t, 1, total)
		assert.EqualValues(t, leadHintGroup6.ID, rows[0].ID)
	})

	t.Run("status filter excludes decided rows", func(t *testing.T) {
		require.NoError(t, repo.Confirm(ctx, leadHintGroup6.ID, 1006))
		status := "open"
		rows, total, err := repo.ListForFansubLeadRole(ctx, AdminHintListFilter{Status: &status})
		require.NoError(t, err)
		assert.Equal(t, 1, total)
		require.Len(t, rows, 1)
	})

	t.Run("pagination clamps via ClampAdminListPage", func(t *testing.T) {
		rows, _, err := repo.ListForFansubLeadRole(ctx, AdminHintListFilter{Limit: 99999})
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
	seedPhase191FansubGroup(t, pool, 2008, "Zielgruppe Acht")

	hint, err := repo.CreateHint(ctx, HintInput{SenderAppUserID: 1007, TargetFansubGroupID: 2008, HintType: "membership_request"})
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
	seedPhase191FansubGroup(t, pool, 2009, "Zielgruppe Neun")

	hint, err := repo.CreateHint(ctx, HintInput{SenderAppUserID: 1008, TargetFansubGroupID: 2009, HintType: "membership_request"})
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
