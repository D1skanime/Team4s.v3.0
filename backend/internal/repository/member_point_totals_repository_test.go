package repository

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"testing"
	"time"

	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// Phase 109 (Wave 0, RED): Concurrency-, Idempotenz-, Reversal-, Ranking-Sortierungs-
// und JSON-Feldnamen-Tests fuer das noch nicht existierende MemberPointTotalsRepository.
// Diese Datei referenziert MemberPointTotalsRepository, NewMemberPointTotalsRepository,
// MemberPointRankingRow und ListRanking, die erst in Plan 109-02 entstehen -- das
// Kompilieren (go build ./internal/repository/...) schlaegt an dieser Stelle bewusst mit
// "undefined: NewMemberPointTotalsRepository" (RED) fehl. Siehe 109-01-PLAN.md Task 2.

func TestMemberPointTotalsRankingUsesCanonicalStoredSlug(t *testing.T) {
	contentBytes, err := os.ReadFile("member_point_totals_repository.go")
	require.NoError(t, err)
	content := strings.ToLower(string(contentBytes))
	compact := strings.Join(strings.Fields(content), " ")

	require.Contains(t, compact, "m.public_slug as slug", "ranking must select the stored canonical slug directly")
	for _, forbidden := range []string{"memberslugexpr", "regexp_replace", "coalesce(m.public_slug", "id::text"} {
		require.NotContains(t, content, forbidden, "ranking must not contain generated or fallback member identity")
	}
}

// openMemberPointTotalsPostgres wendet 0131 (ueber openPointLedgerPostgres) und die neue
// Migration 0139_member_point_totals.up.sql auf eine isolierte Schema-Fixture an und
// erweitert testlokal die members-Tabelle um nickname/display_name/profile_visibility
// (testsupport/phase106_postgres.go bleibt dabei unveraendert -- die Basis-Fixture kennt
// nur members(id)).
func openMemberPointTotalsPostgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := openPointLedgerPostgres(t)

	_, file, _, _ := runtime.Caller(0)
	testsupport.ApplySQLFile(t, pool, filepath.Join(filepath.Dir(file), "..", "..", "..", "database", "migrations", "0139_member_point_totals.up.sql"))

	_, err := pool.Exec(context.Background(), `
ALTER TABLE members
	ADD COLUMN nickname TEXT,
	ADD COLUMN display_name TEXT,
	ADD COLUMN profile_visibility TEXT NOT NULL DEFAULT 'public',
	ADD COLUMN public_slug TEXT NOT NULL DEFAULT 'member-one'`)
	require.NoError(t, err)

	return pool
}

// postgresAwardInputForMember baut postgresAwardInput() fuer eine abweichende MemberID um.
func postgresAwardInputForMember(memberID int64, idempotencyKey string) PointAwardInput {
	in := postgresAwardInput(idempotencyKey)
	in.MemberID = memberID
	return in
}

func pointStringPtr(v string) *string { return &v }

func TestMemberPointTotalsPostgresConcurrentAwardsSumCorrectly(t *testing.T) {
	pool := openMemberPointTotalsPostgres(t)
	ledger := NewPointLedgerRepository(pool)

	inputA := postgresAwardInput("award:mpt-concurrent-a")
	inputB := postgresAwardInput("award:mpt-concurrent-a")
	inputB.SourceKey = "mpt-concurrent-b"
	inputB.IdempotencyKey = "award:mpt-concurrent-b"

	start := make(chan struct{})
	errs := make(chan error, 2)
	var ready sync.WaitGroup
	ready.Add(2)
	for _, in := range []PointAwardInput{inputA, inputB} {
		in := in
		go func() {
			ready.Done()
			<-start
			_, err := ledger.InsertAward(context.Background(), in)
			errs <- err
		}()
	}
	ready.Wait()
	close(start)
	require.NoError(t, <-errs)
	require.NoError(t, <-errs)

	var total int64
	require.NoError(t, pool.QueryRow(context.Background(),
		`SELECT total_points FROM member_point_totals WHERE member_id = 1`).Scan(&total))
	require.Equal(t, int64(2*10), total, "zwei unterschiedliche Awards fuer denselben Member muessen sich addieren, kein Lost Update")
}

func TestMemberPointTotalsPostgresRetrySameAwardDoesNotDoubleCount(t *testing.T) {
	pool := openMemberPointTotalsPostgres(t)
	ledger := NewPointLedgerRepository(pool)
	in := postgresAwardInput("award:mpt-retry")

	_, err := ledger.InsertAward(context.Background(), in)
	require.NoError(t, err)
	_, err = ledger.InsertAward(context.Background(), in)
	require.NoError(t, err, "Retry mit identischem idempotency_key darf nicht fehlschlagen")

	var total int64
	require.NoError(t, pool.QueryRow(context.Background(),
		`SELECT total_points FROM member_point_totals WHERE member_id = 1`).Scan(&total))
	require.Equal(t, int64(10), total, "ON CONFLICT DO NOTHING erzeugt kein zweites Insert-Event, der Trigger darf nicht erneut feuern")
}

func TestMemberPointTotalsPostgresReversalLowersTotal(t *testing.T) {
	pool := openMemberPointTotalsPostgres(t)
	ledger := NewPointLedgerRepository(pool)

	award, err := ledger.InsertAward(context.Background(), postgresAwardInput("award:mpt-reversal"))
	require.NoError(t, err)

	_, err = ledger.InsertReversal(context.Background(), PointReversalInput{
		OriginalEntryID: award.ID,
		ActorAppUserID:  10,
		IdempotencyKey:  "reverse:mpt-reversal",
		EffectiveAt:     time.Date(2026, 7, 27, 12, 0, 0, 0, time.UTC),
		Reason:          "Testkorrektur",
	})
	require.NoError(t, err)

	var total int64
	require.NoError(t, pool.QueryRow(context.Background(),
		`SELECT total_points FROM member_point_totals WHERE member_id = 1`).Scan(&total))
	require.Equal(t, int64(0), total, "Award+Reversal muss netto wieder auf 0 zurueckfallen (D-01/D-06)")
}

func TestMemberPointTotalsRankingOrderAndTieBreak(t *testing.T) {
	pool := openMemberPointTotalsPostgres(t)
	ledger := NewPointLedgerRepository(pool)

	_, err := pool.Exec(context.Background(), `
UPDATE members SET nickname = 'renamed-member-one', display_name = 'Member One', public_slug = 'member-one' WHERE id = 1;
INSERT INTO members (id, nickname, display_name, profile_visibility, public_slug) VALUES
	(2, 'renamed-member-two', 'Member Two', 'public', 'member-two'),
	(3, 'renamed-member-three', 'Member Three', 'public', 'member-three');
INSERT INTO point_rules (id, rule_code, rule_version, category, point_value)
	VALUES (102, 'small_contribution', 1, 'platform_contribution', 5);
`)
	require.NoError(t, err)

	// Member 1 und Member 2 landen bewusst auf demselben Punktestand (20), um den
	// Tie-Break member_id ASC zu erzwingen (Pitfall 5).
	_, err = ledger.InsertAward(context.Background(), postgresAwardInputForMember(1, "award:mpt-ranking-m1-a"))
	require.NoError(t, err)
	_, err = ledger.InsertAward(context.Background(), postgresAwardInputForMember(1, "award:mpt-ranking-m1-b"))
	require.NoError(t, err)
	_, err = ledger.InsertAward(context.Background(), postgresAwardInputForMember(2, "award:mpt-ranking-m2-a"))
	require.NoError(t, err)
	_, err = ledger.InsertAward(context.Background(), postgresAwardInputForMember(2, "award:mpt-ranking-m2-b"))
	require.NoError(t, err)

	memberThreeAward := PointAwardInput{
		MemberID:       3,
		SourceType:     "manual",
		SourceKey:      "member3-contribution",
		RuleID:         102,
		RuleCode:       "small_contribution",
		RuleVersion:    1,
		RuleCategory:   "platform_contribution",
		RulePointValue: 5,
		EffectiveAt:    time.Date(2026, 7, 27, 12, 0, 0, 0, time.UTC),
		IdempotencyKey: "award:mpt-ranking-m3",
	}
	_, err = ledger.InsertAward(context.Background(), memberThreeAward)
	require.NoError(t, err)

	rows, total, err := NewMemberPointTotalsRepository(pool).ListRanking(context.Background(), 1)
	require.NoError(t, err)
	require.Equal(t, 3, total)
	require.Len(t, rows, 3)

	require.Equal(t, int64(1), rows[0].MemberID)
	require.Equal(t, "Member One", rows[0].DisplayName)
	require.Equal(t, pointStringPtr("member-one"), rows[0].Slug)
	require.Equal(t, int64(20), rows[0].TotalPoints)

	require.Equal(t, int64(2), rows[1].MemberID, "bei Punktgleichstand entscheidet member_id ASC")
	require.Equal(t, pointStringPtr("member-two"), rows[1].Slug)
	require.Equal(t, int64(20), rows[1].TotalPoints)

	require.Equal(t, int64(3), rows[2].MemberID)
	require.Equal(t, pointStringPtr("member-three"), rows[2].Slug)
	require.Equal(t, int64(5), rows[2].TotalPoints)
}

func TestMemberPointTotalsRankingPageBounds(t *testing.T) {
	pool := openMemberPointTotalsPostgres(t)
	repo := NewMemberPointTotalsRepository(pool)

	_, _, err := repo.ListRanking(context.Background(), 0)
	require.NoError(t, err, "page < 1 muss intern wie Seite 1 behandelt werden, kein negativer OFFSET")

	_, _, err = repo.ListRanking(context.Background(), 5000)
	require.NoError(t, err, "page > 1000 muss auf die interne Obergrenze geklemmt werden")
}

func TestMemberPointRankingRowJSONFieldNames(t *testing.T) {
	row := MemberPointRankingRow{
		MemberID:    1,
		DisplayName: "Test",
		Slug:        pointStringPtr("test"),
		TotalPoints: 20,
	}

	data, err := json.Marshal(row)
	require.NoError(t, err)
	jsonString := string(data)

	require.Contains(t, jsonString, `"member_id"`)
	require.Contains(t, jsonString, `"display_name"`)
	require.Contains(t, jsonString, `"slug"`)
	require.Contains(t, jsonString, `"total_points"`)

	require.NotContains(t, jsonString, `"MemberID"`)
	require.NotContains(t, jsonString, `"DisplayName"`)
	require.NotContains(t, jsonString, `"TotalPoints"`)
}
