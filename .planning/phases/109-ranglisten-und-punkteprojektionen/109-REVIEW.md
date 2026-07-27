---
phase: 109-ranglisten-und-punkteprojektionen
reviewed: 2026-07-27T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - backend/internal/migrations/phase109_member_point_totals_test.go
  - backend/internal/repository/member_point_totals_repository_test.go
  - database/migrations/0139_member_point_totals.up.sql
  - database/migrations/0139_member_point_totals.down.sql
  - backend/internal/repository/member_point_totals_repository.go
  - backend/internal/handlers/member_point_totals_handler.go
  - backend/cmd/server/main.go
  - shared/contracts/openapi.yaml
  - frontend/src/lib/api.ts
findings:
  critical: 1
  warning: 1
  info: 2
  total: 4
status: issues_found
---

# Phase 109: Code Review Report

**Reviewed:** 2026-07-27T00:00:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Geprueft wurden die neue Migration 0139 (`member_point_totals`-Tabelle plus zwei Trigger), das dazugehoerige Read-Repository, der Read-Handler, die main.go-Route-Registrierung, der OpenAPI-Contract-Eintrag und der Frontend-API-Client. Route-Platzierung (kein Shadowing von `/members/:slug`), SQL-Injection-Schutz (LIMIT/OFFSET ausschliesslich als pgx-Parameter), Feldnamen-Konsistenz (snake_case ueber Go-Struct/OpenAPI/Frontend) und die Sichtbarkeitsfilterung (`profile_visibility = 'public'`) sind korrekt umgesetzt. Die Kernsumme-Logik des `AFTER INSERT`-Triggers (`apply_point_ledger_entry_to_member_total`) ist korrekt: Awards tragen laut CHECK-Constraint aus 0131 immer `point_value > 0`, Reversals immer `point_value < 0`, sodass eine simple Addition fuer beide Faelle funktioniert; `ON CONFLICT ... DO NOTHING` in `point_ledger_entries` verhindert korrekt ein erneutes Feuern des AFTER-Triggers bei einem Idempotenz-Duplikat.

Der zweite Trigger in derselben Migration -- die Schreibsperre `member_point_totals_guard_direct_write` -- ist jedoch funktional wirkungslos (siehe CR-01). Das ist ein Blocker, weil genau dieser Trigger die im Repository-Kommentar dokumentierte Invariante "wird ausschliesslich vom Ledger-Trigger gepflegt" erzwingen soll, es aber tatsaechlich nie tut.

## Critical Issues

### CR-01: Guard-Trigger gegen Direktschreibzugriffe auf `member_point_totals` ist wirkungslos (`pg_trigger_depth() = 0` kann innerhalb einer Trigger-Funktion nie wahr sein)

**File:** `database/migrations/0139_member_point_totals.up.sql:25-37`

**Issue:**
`guard_member_point_totals_mutation()` soll direkte INSERT/UPDATE/DELETE-Zugriffe auf `member_point_totals` verbieten und nur den intern (vom AFTER-INSERT-Trigger auf `point_ledger_entries`) ausgeloesten Schreibzugriff durchlassen:

```sql
CREATE FUNCTION guard_member_point_totals_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF pg_trigger_depth() = 0 THEN
        RAISE EXCEPTION 'member_point_totals is maintained exclusively by the point_ledger_entries trigger';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;
```

`pg_trigger_depth()` liefert laut PostgreSQL-Doku "0 if not called, directly or indirectly, from inside a trigger" -- d. h. der Wert ist 0 nur, wenn man die Funktion NICHT innerhalb eines Triggers ausfuehrt. Diese Guard-Funktion IST aber selbst der Koerper eines Triggers (`BEFORE INSERT OR UPDATE OR DELETE ON member_point_totals`). Waehrend sie laeuft, befindet man sich per Definition immer "innerhalb eines Triggers" -- daher ist `pg_trigger_depth()` an dieser Stelle niemals 0, egal ob:
- ein Client/Skript direkt `INSERT/UPDATE/DELETE` auf `member_point_totals` ausfuehrt (Tiefe 1, da es der einzige aktive Trigger ist), oder
- der Aufruf verschachtelt aus `apply_point_ledger_entry_to_member_total()` kommt (Tiefe 2, da der AFTER-Trigger auf `point_ledger_entries` bereits Tiefe 1 belegt).

Die Bedingung `= 0` ist somit **immer falsch**, `RAISE EXCEPTION` wird nie erreicht, und die Funktion gibt in jedem Fall `COALESCE(NEW, OLD)` zurueck -- der Guard laesst jeden direkten Schreibzugriff klaglos durch. Damit ist die zentrale Integritaetsgarantie dieser Migration ("member_point_totals wird ausschliesslich vom Ledger-Trigger gepflegt", siehe auch Kommentar in `member_point_totals_repository.go:24-26`) auf DB-Ebene nicht durchgesetzt. Jeder direkte `UPDATE member_point_totals SET total_points = ...` (z. B. durch ein fehlerhaftes Skript, eine kuenftige Migration oder manuelle DB-Wartung) wird die Rangliste stillschweigend verfaelschen, ohne dass die DB dies verhindert oder meldet.

Zu beachten: Der Migrations-Contract-Test `TestPhase109MigrationUpContract` (`backend/internal/migrations/phase109_member_point_totals_test.go:37`) prueft nur, dass der Text `pg_trigger_depth() = 0` in der SQL-Datei vorkommt -- er fuehrt die Migration nie aus einem direkten Schreibversuch auf `member_point_totals` gegenueber aus, sodass dieser Bug durch keinen vorhandenen Test aufgedeckt wird.

**Fix:**
Die richtige Schwelle ist `<= 1` (Tiefe 1 = direkter, nicht verschachtelter Aufruf = zu blockieren; Tiefe 2 = aus dem Ledger-Trigger heraus verschachtelt = zulaessig):

```sql
CREATE FUNCTION guard_member_point_totals_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF pg_trigger_depth() <= 1 THEN
        RAISE EXCEPTION 'member_point_totals is maintained exclusively by the point_ledger_entries trigger';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;
```

Da der bestehende Migrations-Contract-Test exakt den (fehlerhaften) String `"pg_trigger_depth() = 0"` fordert (`phase109_member_point_totals_test.go:37`), muss diese Assertion beim Fix mit angepasst werden (`"pg_trigger_depth() <= 1"`), sonst schlaegt der Contract-Test nach der Korrektur fehl. Zusaetzlich sollte ein Live-Test ergaenzt werden, der tatsaechlich einen direkten `UPDATE`/`INSERT` gegen `member_point_totals` versucht und eine PostgreSQL-Exception erwartet -- nur so wird die Guard-Funktion tatsaechlich verifiziert statt nur textuell auf Vorhandensein geprueft.

## Warnings

### WR-01: Guard-Trigger-Verhalten ist zur Laufzeit nicht durch einen Test abgesichert

**File:** `backend/internal/migrations/phase109_member_point_totals_test.go:23-43`

**Issue:** Der einzige Test, der die Guard-Logik pruefft, ist ein reiner Text-Contract-Test (`requireSQLContains`), der nur nach Substrings in der `.sql`-Datei sucht. Es existiert kein Live-DB-Test, der tatsaechlich versucht, direkt in `member_point_totals` zu schreiben und eine Exception erwartet (analog zu den Live-Concurrency-/Idempotenz-Tests in `member_point_totals_repository_test.go`). Genau diese Luecke hat es ermoeglicht, dass CR-01 unbemerkt eingecheckt wurde.

**Fix:** Ergaenzen eines Tests in `backend/internal/repository/member_point_totals_repository_test.go` (oder einem Migrations-Live-Test), der z. B. `pool.Exec(ctx, "UPDATE member_point_totals SET total_points = 999 WHERE member_id = 1")` ausfuehrt und `require.Error(t, err)` erwartet.

## Info

### IN-01: OpenAPI-Tag "Ranking" ist nicht im globalen `tags:`-Block deklariert

**File:** `shared/contracts/openapi.yaml:8154`

**Issue:** Der neue Endpunkt nutzt `tags: [Ranking]`, aber im obersten `tags:`-Block (Zeilen 13-33) ist kein Eintrag `name: Ranking` mit Beschreibung vorhanden -- im Gegensatz zu allen anderen im Contract verwendeten Tags (Health, Auth, Anime, Comments, Watchlist, Profile, Episodes, Fansubs, Releases, Admin). Funktional meist unkritisch (die meisten OpenAPI-Renderer tolerieren das), aber inkonsistent mit der sonst durchgaengigen Tag-Dokumentationskonvention dieser Datei.

**Fix:**
```yaml
tags:
  ...
  - name: Admin
    description: Admin content management endpoints (P2).
  - name: Ranking
    description: Public member point ranking endpoints.
```

### IN-02: Fehlerantwort verletzt die im Projekt sonst uebliche Grossschreibung des deutschen Substantivs "Serverfehler"

**File:** `backend/internal/handlers/member_point_totals_handler.go:41`

**Issue:** `internalError(c, "interner serverfehler")` -- alle vergleichbaren Stellen im Handler-Package schreiben das Substantiv gross, z. B. `admin_content_fansub_releases_contributions_handlers.go:106,118` verwendet `"interner Serverfehler"`. Die hier verwendete durchgehende Kleinschreibung ist grammatikalisch falsch (deutsche Substantive werden grossgeschrieben) und weicht von der etablierten Konvention im selben Package ab.

**Fix:**
```go
internalError(c, "interner Serverfehler")
```

---

_Reviewed: 2026-07-27T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
