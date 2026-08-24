package migrations_test

import (
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/stretchr/testify/require"
)

// Phase 109 (Wave 0, RED): Migrations-Contract-Test fuer die noch nicht existierende
// Migration 0139 (member_point_totals-Tabelle + AFTER-INSERT-Trigger + Guard-Trigger).
// Dieser Test referenziert database/migrations/0139_member_point_totals.up.sql/.down.sql,
// die erst in Plan 109-02 angelegt werden -- das Kompilieren gelingt, die Testausfuehrung
// schlaegt an dieser Stelle erwartungsgemaess fehl (Datei nicht gefunden). Siehe
// 109-01-PLAN.md Task 1.
const (
	phase109MigrationName = "0139_member_point_totals"
	phase109UpFile        = phase109MigrationName + ".up.sql"
	phase109DownFile      = phase109MigrationName + ".down.sql"
)

func TestPhase109MigrationUpContract(t *testing.T) {
	up := readPhase106Migration(t, phase109UpFile)

	requireOrder(t, up, "create table member_point_totals", "create function apply_point_ledger_entry_to_member_total")
	requireOrder(t, up, "create function apply_point_ledger_entry_to_member_total", "create trigger point_ledger_apply_member_total")

	requireSQLContains(t, up,
		"member_id bigint primary key references members(id)",
		"total_points bigint not null default 0",
		"after insert on point_ledger_entries",
		"for each row execute function apply_point_ledger_entry_to_member_total",
		"on conflict (member_id) do update",
		"total_points = member_point_totals.total_points + new.point_value",
		"before insert or update or delete on member_point_totals",
		"pg_trigger_depth() <= 1",
		"raise exception",
	)

	require.NotContains(t, up, "insert into point_ledger_entries", "trigger darf niemals selbst in den fremden Ledger schreiben")
	require.NotContains(t, up, "on delete cascade", "FK auf members darf keine Cascade tragen, analog 0131")
}

func TestPhase109MigrationDownContract(t *testing.T) {
	down := readPhase106Migration(t, phase109DownFile)

	requireSQLContains(t, down, "drop trigger", "drop function", "drop table if exists member_point_totals")
	requireOrder(t, down, "drop trigger", "drop table if exists member_point_totals")
	requireOrder(t, down, "drop function", "drop table if exists member_point_totals")

	require.NotContains(t, down, "drop table if exists point_ledger_entries", "0139 darf nur seinen eigenen Trigger auf der fremden Tabelle entfernen, niemals die Tabelle selbst")
}

func TestPhase109MigrationLiveUpDownUp(t *testing.T) {
	pool := testsupport.OpenPhase106Postgres(t)

	// Der 0139-Trigger haengt am Ziel point_ledger_entries aus 0131 -- ohne diese
	// Abhaengigkeit zuerst anzuwenden, kann 0139 den Trigger nicht anlegen.
	testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, "0131_member_point_foundation.up.sql"))
	testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase109UpFile))
	testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase109DownFile))
	testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase109UpFile))

	assertPhase106TableExists(t, pool, "member_point_totals")
}
