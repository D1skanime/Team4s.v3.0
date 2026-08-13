# Phase 106: Beitrags- und Punktefundament - Pattern Map

**Mapped:** 2026-07-22
**Dateien analysiert:** 14 neue/geänderte Dateien aus den finalen Frontmattern von 106-01 bis 106-04
**Analogs gefunden:** 14 / 14 (teilweise als zusammengesetztes Muster oder ausdrücklich dokumentierte No-Exact-Analog-/Research-Naht)
**Scope:** ausschließlich additives Backend-/Datenbankfundament; keine HTTP-Schreibroute, kein Frontend, keine Review-/Quellenadapter-Verkabelung, keine Media-/Upload-Änderung

## Verbindliche Dateiliste

Die folgende Liste ist die exakte Vereinigungsmenge der `files_modified`-Frontmatter aus `106-01-PLAN.md` bis `106-04-PLAN.md`. Sie folgt der empfohlenen Projektstruktur in `106-RESEARCH.md` plus einer notwendigen, kleinen Erweiterung der bereits vorhandenen `DBTX`-Naht. Die Migrationsnummer `0131` ist nur der am Mapping-Tag freie Kandidat und muss unmittelbar vor der Implementierung erneut gegen getrackte und ungetrackte Migrationen geprüft werden.

| Neue/geänderte Datei | Änderung | Begründung |
|---|---|---|
| `database/migrations/0131_member_point_foundation.up.sql` | neu | additive Tabellen `point_rules` und `point_ledger_entries`, Constraints und Indizes |
| `database/migrations/0131_member_point_foundation.down.sql` | neu | ausschließlich Ledger vor Katalog zurückbauen |
| `backend/internal/testsupport/phase106_postgres.go` | neu | opt-in PostgreSQL-16-Fixture mit DSN-/Runtime-DB-/Schema-Guard für disposable Phase-106-Tests |
| `backend/internal/testsupport/phase106_postgres_test.go` | neu | Unit-/Source-Verträge für DSN-Auswahl, Datenbankname, Schema und `public`-Ausschluss |
| `backend/internal/migrations/phase106_member_points_test.go` | neu | Up-/Down-, Ownership-, Constraint- und Boundary-Vertrag; Up → Down → Up auf isoliertem PostgreSQL |
| `backend/internal/repository/audit_logs.go` | ändern | bestehendes gemeinsames `DBTX` um `QueryRow` ergänzen; keine zweite DB-Abstraktion erzeugen |
| `backend/internal/repository/point_rules_repository.go` | neu | read-only Zugriff auf versionierte Regeln; keine Update-/Delete-Methoden |
| `backend/internal/repository/point_rules_repository_test.go` | neu | exakter RuleRef-, Validation-, NotFound- und No-Latest-/No-Mutation-Vertrag |
| `backend/internal/repository/point_ledger_repository.go` | neu | insert-first Award, Konfliktvergleich, `FOR UPDATE`-Lesen und append-only Storno |
| `backend/internal/repository/point_ledger_repository_test.go` | neu | Repository-, Retry-, Mismatch-, Reversal-, Rollback- und echte Concurrency-Tests |
| `backend/internal/services/point_service.go` | neu | typisierte Commands, serverseitige Regel-/Key-Auswahl und Transaktionskoordination |
| `backend/internal/services/point_service_credit_test.go` | neu | Credit-, RuleRef-, RewardKind-/Slot-Key- und caller-owned-Tx-Verträge |
| `backend/internal/services/point_service_reverse_test.go` | neu | Reverse-, Retry-, Fehler- und Tx-Lifecycle-Verträge |
| `backend/internal/services/point_service_boundary_test.go` | neu | enge Source-Boundary nur für Phase-106-Produktionsartefakte |

Bewusst **nicht** in dieser Phase: `backend/cmd/server/main.go`, Handler, Routes, `shared/contracts/*.yaml`, Frontenddateien, Badge-Dateien, Review-Repositories sowie alle Media-/Upload-Dateien. Der neue Service hat in Phase 106 nur Tests als Consumer und wird noch nicht in den Server-Graph eingehängt.

## File Classification

| Neue/geänderte Datei | Rolle | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `database/migrations/0131_member_point_foundation.up.sql` | migration/config | CRUD + append-only/event-driven | `0108_capability_registry.up.sql`, `0129_release_playback_entitlements.up.sql`, `0128_group_history_single_use_events.up.sql`, `0087_anime_contribution_roles_and_badges.up.sql` | composite role-match |
| `database/migrations/0131_member_point_foundation.down.sql` | migration/config | batch/schema rollback | `0108_capability_registry.down.sql` | exact rollback ordering |
| `backend/internal/testsupport/phase106_postgres.go` | test fixture | opt-in DB integration/isolation | Kein exakter Bestandsanalog; `106-RESEARCH.md` „Fixture-Lücke“ + `runner.go` für pgx-Transaktionen | no exact analog / research seam |
| `backend/internal/testsupport/phase106_postgres_test.go` | test | fixture guard/unit + source contract | `release_content_source_groups_test.go` für positive/negative Source-Assertions; Fixture-spezifischer Guard aus `106-RESEARCH.md` | composite role-match |
| `backend/internal/migrations/phase106_member_points_test.go` | test | file-I/O + DB integration | `phase103_release_playback_entitlements_test.go`, `release_content_source_groups_test.go`, `runner.go` | role-match; DB fixture gap |
| `backend/internal/repository/audit_logs.go` | repository utility | request-response/DB | same file, `DBTX` at lines 25-35 | exact extension seam |
| `backend/internal/repository/point_rules_repository.go` | repository | request-response/read | `authz_permissions.go` lines 233-295 | role-match |
| `backend/internal/repository/point_rules_repository_test.go` | test | read-only lookup/unit + source boundary | `asset_lifecycle_service_test.go` für Fakes/Error-Assertions und `anime_contributions_proposal_repository_test.go` für Source-Verträge | composite role-match |
| `backend/internal/repository/point_ledger_repository.go` | repository | append-only event write + CRUD read | `audit_logs.go`, `anime_contributions_proposal_repository.go`, `anime_contributions_proposal_merge_repository.go` | composite strong match |
| `backend/internal/repository/point_ledger_repository_test.go` | test | DB integration + concurrent event write | `anime_contributions_proposal_repository_test.go` lines 78-110 | role-match; real PostgreSQL fixture new |
| `backend/internal/services/point_service.go` | service | transactional request-response/event-driven | `asset_lifecycle_service.go` lines 16-43, `badge_service.go` lines 14-26, proposal transaction lines 46-148 | composite role-match |
| `backend/internal/services/point_service_credit_test.go` | test | transform + transactional Credit command | `asset_lifecycle_service_test.go` lines 14-32, 48-97 für Fakes/Error-Assertions; disposable Tx-Probe aus `106-RESEARCH.md` | composite role-match |
| `backend/internal/services/point_service_reverse_test.go` | test | transactional Reverse command + retry | `asset_lifecycle_service_test.go` lines 14-32, 48-97 und Reversal-/Locking-Research in `106-RESEARCH.md` | composite role-match |
| `backend/internal/services/point_service_boundary_test.go` | test | focused source contract | `anime_contributions_proposal_repository_test.go` lines 78-110 für Source-Fragmente; Phase-106-Scope aus `106-RESEARCH.md` | composite role-match |

## Pattern Assignments

### `database/migrations/0131_member_point_foundation.up.sql` (migration, append-only/event-driven)

**Primäre Analogs:**

- `database/migrations/0108_capability_registry.up.sql` für getrennten Katalog und abhängige Tabelle.
- `database/migrations/0129_release_playback_entitlements.up.sql` für gekoppelte `CHECK`-Constraints und partielle Kontextindizes.
- `database/migrations/0128_group_history_single_use_events.up.sql` für einen partiellen Unique-Index.
- `database/migrations/0087_anime_contribution_roles_and_badges.up.sql` für Member-FK, Unique und benannte Checks.

**Katalog-/FK-Grundform** (`0108_capability_registry.up.sql`, Zeilen 8-22):

```sql
CREATE TABLE IF NOT EXISTS action_definitions (
    code       TEXT PRIMARY KEY,
    label_de   TEXT NOT NULL,
    category   TEXT,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS role_capabilities (
    role_code   TEXT NOT NULL REFERENCES role_definitions(code) ON DELETE CASCADE,
    action_code TEXT NOT NULL REFERENCES action_definitions(code) ON DELETE CASCADE,
    PRIMARY KEY (role_code, action_code)
);
```

Übertragen: zuerst `point_rules`, danach `point_ledger_entries`. Für Regeln `(rule_code, rule_version)` eindeutig machen und `rule_version > 0`, `points > 0` erzwingen. Für den Ledger `member_id NOT NULL`, optionalen `actor_app_user_id`, Rule-Referenz plus Snapshot (`rule_code`, `rule_version`, `point_value`), `effective_at` und getrenntes `recorded_at` speichern.

**Gekoppelte Check-Form** (`0129_release_playback_entitlements.up.sql`, Zeilen 18-39):

```sql
CONSTRAINT chk_release_playback_entitlement_subject
    CHECK (
        (subject_type = 'app_user' AND subject_app_user_id IS NOT NULL AND subject_role_code IS NULL)
        OR
        (subject_type = 'role' AND subject_app_user_id IS NULL AND subject_role_code IS NOT NULL)
    ),
CONSTRAINT chk_release_playback_entitlement_scope
    CHECK (
        (scope_type = 'global' AND fansub_group_id IS NULL AND anime_id IS NULL AND release_version_id IS NULL)
        OR
        (scope_type = 'group' AND fansub_group_id IS NOT NULL AND anime_id IS NULL AND release_version_id IS NULL)
    )
```

Übertragen: Award und Storno in **einem** benannten Check koppeln:

- Award: `entry_kind='award'`, `point_value > 0`, `reverses_entry_id IS NULL`, kein Stornogrund.
- Storno: `entry_kind='reversal'`, `point_value < 0`, `reverses_entry_id IS NOT NULL`, getrimmter Pflichtgrund.
- Selbstreferenz über `CHECK (reverses_entry_id IS NULL OR reverses_entry_id <> id)` verbieten.

**Partieller Unique-Index** (`0128_group_history_single_use_events.up.sql`, Zeilen 1-4):

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_fansub_group_history_single_use_event
ON fansub_group_history (fansub_group_id, event_type)
WHERE event_type IN (
    'founding',
```

Übertragen:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_point_ledger_single_reversal
    ON point_ledger_entries (reverses_entry_id)
    WHERE reverses_entry_id IS NOT NULL;
```

Zusätzlich `idempotency_key` per Unique-Constraint/-Index absichern. Dieser DB-Constraint ist der letzte Arbiter unter Parallelität; ein Go-Precheck reicht nicht.

**Member-zentrierte Tabellenform** (`0087_anime_contribution_roles_and_badges.up.sql`, Zeilen 17-30):

```sql
CREATE TABLE IF NOT EXISTS member_badges (
    id                 BIGSERIAL PRIMARY KEY,
    member_id          BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    badge_code         TEXT NOT NULL,
    badge_category     VARCHAR(30) NOT NULL,
    awarded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_member_badges_member_code UNIQUE (member_id, badge_code),
    CONSTRAINT chk_member_badges_category CHECK (...)
);
```

Nur Form und Member-Anker kopieren, **nicht** die `ON DELETE CASCADE`-Semantik. Der Ledger ist historische Autorität: `member_id`, Rule und Reversal müssen erhalten bleiben (`RESTRICT`/Default-NO-ACTION); optionale Actor-/Gruppen-/Release-Version-Kontexte dürfen keine Ledgerzeile löschen.

**Consumer-/Delete-Trace vor FK-Wahl:**

- `FansubRepository.DeleteGroup` löscht heute Contributions und historische Mitgliedschaften explizit und danach die Gruppe (`fansub_repository.go`, Zeilen 649-675).
- `EpisodeVersionRepository.Delete` löscht bei der letzten Variante die reale `release_versions`-Zeile (`episode_version_repository_write_helpers.go`, Zeilen 252-323).
- Deshalb sind optionale `fansub_group_id`-/`release_version_id`-Kontexte im Ledger als `ON DELETE SET NULL` passend; `source_key` bleibt der dauerhafte fachliche Beleg. `CASCADE` würde Audit-Historie vernichten, `RESTRICT` würde bestehende legitime Delete-Flows blockieren.
- `actor_app_user_id` folgt dem Audit-Analog `ON DELETE SET NULL` (`0075_audit_logs.up.sql`, Zeilen 1-14).

**Nicht kopieren:**

- `0108_capability_registry.up.sql` Zeilen 45-48 nutzt `ON CONFLICT ... DO UPDATE`. Punktregeln sind unveränderlich: keine produktive Update-/Delete-Semantik.
- Keine produktiven Rule-Seeds: konkrete Werte sind laut CONTEXT offen. Nur Test-Fixtures dürfen Regeln einfügen.
- Keine Media-Tabelle, kein Upload-Pfad, kein Hash-/Textlängenfeld und kein Trigger auf bestehende Reviews.

---

### `database/migrations/0131_member_point_foundation.down.sql` (migration, schema rollback)

**Analog:** `database/migrations/0108_capability_registry.down.sql`

**Abhängigkeitsreihenfolge** (Zeilen 4-9):

```sql
BEGIN;

DROP TABLE IF EXISTS role_capabilities;
DROP TABLE IF EXISTS action_definitions;

COMMIT;
```

Übertragen: zuerst `point_ledger_entries`, danach `point_rules` droppen. Explizite Indizes können vorher mit `DROP INDEX IF EXISTS` entfernt werden oder mit der Tabelle fallen; der Down-Test soll die erwarteten Namen trotzdem prüfen. Keine andere Tabelle, kein historischer Datensatz und keine Media-Struktur darf im Down-Pfad berührt werden.

---

### `backend/internal/testsupport/phase106_postgres.go` (test fixture, disposable PostgreSQL)

**No exact analog / Research-Naht:** `106-RESEARCH.md` dokumentiert ausdrücklich, dass kein wiederverwendbares PostgreSQL-Integrationstest-Fixture und keine Testcontainers-/pgxmock-Abhängigkeit existiert. `backend/internal/migrations/runner.go` liefert nur das pgx-Transaktions-/SQL-Ausführungsmuster, nicht die Testisolierung.

Übertragen: eine Phase-106-lokale Fixture mit ausschließlich `TEAM4S_PHASE106_TEST_DSN`, geparstem Datenbanknamen `team4s_phase106_test_*`, Runtime-Abgleich per `current_database()`, zufälligem gequotetem Schema und einem Search-Path ohne `public`. Die Fixture darf weder `DATABASE_URL` verwenden noch eine normale Entwicklungsdatenbank zurücksetzen. Das ist die im Research benannte neue Seam; sie bleibt in `backend/internal/testsupport` und wird nicht in das globale `repository/testmain_test.go` verschoben.

### `backend/internal/testsupport/phase106_postgres_test.go` (test, Fixture-Guard)

**Analogs:** positive/negative Source-Assertions aus `release_content_source_groups_test.go`; DB-/Schema-Isolationsanforderungen aus `106-RESEARCH.md` und `106-VALIDATION.md`.

Übertragen: tabellarisch akzeptierte und abgewiesene DSN-/Datenbanknamen, Schema-Namensvalidierung, `DATABASE_URL`-allein-skipped sowie ein Source-Guard gegen executable `public.`-Ziele testen. Diese Datei testet nur die Fixture; Live-Migrationsinvarianten bleiben in `phase106_member_points_test.go`.

---

### `backend/internal/migrations/phase106_member_points_test.go` (test, file-I/O + DB integration)

**Analogs:** `phase103_release_playback_entitlements_test.go`, `release_content_source_groups_test.go`, `fansub_integrity_test.go`, `runner.go`.

**Robuste Pfadauflösung und Up-/Down-Lesen** (`phase103_release_playback_entitlements_test.go`, Zeilen 11-25):

```go
_, filename, _, _ := runtime.Caller(0)
root := filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", ".."))
upPath := filepath.Join(root, "database", "migrations", "0129_release_playback_entitlements.up.sql")
downPath := filepath.Join(root, "database", "migrations", "0129_release_playback_entitlements.down.sql")
upBytes, err := os.ReadFile(upPath)
// ...
downBytes, err := os.ReadFile(downPath)
```

**Positive und negative Boundary-Assertions** (`release_content_source_groups_test.go`, Zeilen 18-35):

```go
for _, needle := range []string{
    "release_version_media", "release_version_notes", "fansub_group_id BIGINT NULL",
    "REFERENCES fansub_groups(id) ON DELETE SET NULL",
} {
    if !strings.Contains(u, needle) {
        t.Fatalf("UP missing %q", needle)
    }
}
if strings.Contains(u, "MIN(rvg.fansub_group_id)") {
    t.Fatal("must not choose an arbitrary release group")
}
```

Übertragen: Tabellen, FKs, Rule-/Point-Checks, Unique-Key, partiellen Reversal-Index, `effective_at`/`recorded_at` und korrekte Down-Reihenfolge statisch prüfen. Zusätzlich explizit verbieten: Media-/Upload-Tabellennamen, Review-/Badge-Wiring, `ON DELETE CASCADE` an Ledgerkontexten und produktive Rule-Seeds.

**Echter Up-/Down-Mechanismus** (`runner.go`, Zeilen 245-311):

```go
tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
defer func() { _ = tx.Rollback(ctx) }()
if _, err := tx.Exec(ctx, string(sqlBytes)); err != nil { /* ... */ }
if err := tx.Commit(ctx); err != nil { /* ... */ }
```

Der Phasentest muss auf einer disponiblen/isolierten PostgreSQL-16-Datenbank wirklich Up → Down → Up ausführen und danach Katalog-/Ledger-Constraints abfragen. Source-Substring-Tests allein erfüllen die Concurrency-/Migration-Anforderung nicht.

**Fixture-Lücke:** Im Repository existiert kein wiederverwendbares PostgreSQL-Integrationstest-Fixture und keine Testcontainers-/pgxmock-Abhängigkeit. Keine neue Bibliothek installieren. Die Fixture muss einen expliziten Test-DSN verwenden und pro Lauf eine disposable Datenbank oder ein exklusives Schema anlegen; niemals still die normale Entwicklungsdatenbank verwenden. Das bestehende `repository/testmain_test.go` ist nur ein In-Memory-Catalog-Setup und darf nicht zu einem globalen DB-Zwang für alle Repositorytests erweitert werden.

---

### `backend/internal/repository/audit_logs.go` (Repository-Utility, DBTX)

**Analog/zu erweiternde Naht:** dieselbe Datei, Zeilen 25-35.

```go
type AuditLogRepository struct {
    db DBTX
}

type DBTX interface {
    Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
}

func NewAuditLogRepository(db DBTX) *AuditLogRepository {
    return &AuditLogRepository{db: db}
}
```

Erweiterung für beide neuen Repositorys:

```go
type DBTX interface {
    Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
    QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}
```

Dafür `github.com/jackc/pgx/v5` importieren. `Query` ist nicht nötig, solange die neuen Methoden jeweils Einzelzeilen liefern.

**Consumer-Trace:** `NewAuditLogRepository` erhält im Server `dbPool` (`backend/cmd/server/main.go`, Zeile 140), in einem Handlertest `nil`, und wird danach als Pointer durch Handler/Claim-Repositories gereicht. Es wurden keine handgeschriebenen `DBTX`-Fakes gefunden, die nur `Exec` implementieren. `*pgxpool.Pool` und `pgx.Tx` erfüllen die erweiterte Schnittstelle; die Erweiterung erzeugt daher keine zweite DB-Abstraktion und bricht die gefundenen Consumer nicht.

**Nicht kopieren:** `AuditLogRepository.Write` erlaubt nil und wird in Review-Handlern best-effort ignoriert (`contribution_review_handler.go`, Zeilen 142-151). Ein Ledger-Write ist autoritativ: nie nil-no-op und nie `_ = pointService.Credit(...)`.

---

### `backend/internal/repository/point_rules_repository.go` (repository, read-only catalog)

**Analog:** `backend/internal/repository/authz_permissions.go`, Zeilen 233-295, plus `audit_logs.go` Constructor.

**Read-/Scan-/Wrap-Muster** (`authz_permissions.go`, Zeilen 238-262):

```go
rows, err := r.db.Query(ctx, `
    SELECT code FROM role_definitions
    WHERE assignable = true
    ORDER BY sort_order, code
`)
if err != nil {
    return nil, fmt.Errorf("load fansub group roles: %w", err)
}
defer rows.Close()
// Scan, rows.Err, kontextuelles %w
```

Für Phase 106 nur den exakten Einzelregel-Lookup über `DBTX.QueryRow` und Gleichheit auf `(rule_code, rule_version)` implementieren. Es gibt keine höchste, neueste, aktive oder geplante Regelauswahl und kein `ORDER BY rule_version DESC LIMIT 1`. `pgx.ErrNoRows` in `repository.ErrNotFound` übersetzen und alle anderen Fehler mit Operation/Rule-Code wrappen.

**Constructor-/Tx-Bindung:**

```go
type PointRulesRepository struct { db DBTX }

func NewPointRulesRepository(db DBTX) *PointRulesRepository {
    return &PointRulesRepository{db: db}
}

func (r *PointRulesRepository) WithDB(db DBTX) *PointRulesRepository {
    return NewPointRulesRepository(db)
}
```

Für `WithDB` gibt es im Bestand keinen exakten Analog; es ist die kleinste Ergänzung, um denselben Repositoryvertrag mit Pool und `pgx.Tx` zu verwenden. Keine Rule-Update-, Delete- oder Upsert-Methode hinzufügen.

**Catalog-Consumer:** Anders als der Permission-Catalog (`permissions.go`, Zeilen 305-351) braucht Phase 106 keinen Startup-Cache und kein `main.go`-Wiring. Regeln werden innerhalb der Award-Transaktion gelesen; Testregeln werden pro Test als Fixture eingefügt. Konkrete Produktionswerte bleiben offen.

---

### `backend/internal/repository/point_rules_repository_test.go` (test, exakter RuleRef)

**Analogs:** Fake-/`errors.Is`-Muster aus `asset_lifecycle_service_test.go`; positive/negative Source-Vertragsform aus `anime_contributions_proposal_repository_test.go`.

Übertragen: ein kleiner `DBTX`-/`pgx.Row`-Fake beweist exakte Code-und-Version-Parameter, Validation und `ErrNotFound`-Wrapping. Ein fokussierter Source-Vertrag verbietet Latest-/Active-/Schedule-/Update-/Delete-/Upsert-APIs. Es gibt keinen exakten Rule-Repository-Testanalog; die zusammengesetzte Zuordnung folgt der in `106-RESEARCH.md` aufgelösten A3-Seam und führt keine neue Testbibliothek ein.

---

### `backend/internal/repository/point_ledger_repository.go` (repository, append-only event write)

**Analogs:** `audit_logs.go` für DBTX/append-only Insert; `anime_contributions_proposal_repository.go` und `anime_contributions_proposal_merge_repository.go` für Transaktion, Locking, `ErrNoRows`, `FOR UPDATE`, `ON CONFLICT` und Fehler-Wrapping.

**Transaktionsmuster** (`anime_contributions_proposal_repository.go`, Zeilen 46-62, 144-148):

```go
tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
if err != nil {
    return nil, fmt.Errorf("vorschlag erstellen: transaktion starten: %w", err)
}
defer tx.Rollback(ctx)
// ...
if err := tx.Commit(ctx); err != nil {
    return nil, fmt.Errorf("vorschlag erstellen: commit: %w", err)
}
```

Im Punktefundament soll der **Service** diese Grenze besitzen; das Repository erhält den bereits gebundenen `DBTX`/`pgx.Tx` über `WithDB`.

**Lock-/ErrNoRows-Muster** (`anime_contributions_proposal_merge_repository.go`, Zeilen 92-114):

```go
err := tx.QueryRow(ctx, `
    SELECT id, status, note, started_year, ended_year
    FROM anime_contributions
    WHERE ...
    FOR UPDATE
`, ...).Scan(...)
if errors.Is(err, pgx.ErrNoRows) {
    return nil, nil
}
if err != nil {
    return nil, fmt.Errorf("vorschlag erweitern: vorhandenen beitrag suchen: %w", err)
}
```

Übertragen: `GetForUpdate(ctx, awardID)` muss die Originalbuchung sperren. Der Service verbietet Storno-von-Storno/Selbstreferenz, das Repository schreibt die negative Gegenbuchung. Partial-Unique bleibt der Race-Arbiter für zwei parallele Stornos.

**Insert-/Conflict-Muster** (`anime_contributions_proposal_merge_repository.go`, Zeilen 162-171):

```go
if _, err := tx.Exec(ctx, `
    INSERT INTO anime_contribution_roles (anime_contribution_id, role_code)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
`, target.ID, code); err != nil {
    // FK/sonstige Fehler übersetzen und wrappen
}
```

Für Awards stärker ausführen:

```sql
INSERT INTO point_ledger_entries (...)
VALUES (...)
ON CONFLICT (idempotency_key) DO NOTHING
RETURNING id, entry_kind, member_id, source_type, source_key,
          rule_code, rule_version, point_value, effective_at;
```

Leeres `RETURNING` (`pgx.ErrNoRows`) bedeutet **nicht automatisch Erfolg**: existierende Zeile laden und Member, Source, Regel, Wert und Wirkzeit semantisch vergleichen. Nur identischer Retry gibt die vorhandene Buchung zurück; Abweichung unter gleichem Key liefert `ErrConflict` und verändert nichts.

**Fehlerkonvention** (`repository/errors.go`, Zeilen 3-9; Merge-Repository, Zeilen 158-171):

```go
var ErrConflict = errors.New("conflict")
var ErrValidation = errors.New("validation")

return fmt.Errorf("vorschlag erweitern: ...: %w", ErrConflict)
```

Bestehende Sentinels mit `%w` nutzen, damit Service/Tests `errors.Is` verwenden können. FK-, Unique- und Check-Verletzungen gezielt in `ErrNotFound`, `ErrConflict` bzw. `ErrValidation` übersetzen; Originalfehler nicht als String vergleichen.

**Nicht kopieren:**

- Keine Award-/Originalzeile aktualisieren oder löschen.
- Kein `SELECT`-then-`INSERT` ohne Unique-Constraint.
- Kein alleiniger Advisory-Lock; er kann Abläufe deterministischer machen, ersetzt aber Unique nicht.
- Keine Badge-Semantik aus `badge_repository.go` Zeilen 53-89 (`DO UPDATE`, Revoke per `UPDATE`).

---

### `backend/internal/repository/point_ledger_repository_test.go` (test, echte DB + Concurrency)

**Analog:** `anime_contributions_proposal_repository_test.go`, Zeilen 78-110, für serialisierte Source-Verträge; kein vorhandener exakter DB-Integrationstest.

```go
required := []string{
    "lockProposalContext(ctx, tx, ...)",
    "SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))",
    "AND status IN ('draft', 'proposed')",
}
for _, fragment := range required {
    if !strings.Contains(source, fragment) {
        t.Fatalf("... Fragment fehlt: %q", fragment)
    }
}
```

Source-Inspection ist nur für Boundary-Negativtests geeignet. Kernfälle müssen gegen PostgreSQL laufen:

1. Zwei Goroutines starten gleichzeitig denselben Award; beide erhalten dasselbe logische Ergebnis, DB enthält exakt eine Award-Zeile.
2. Gleicher Key mit anderem Member, Source, Rule oder Wert liefert `ErrConflict`; bestehende Zeile bleibt unverändert.
3. Zwei parallele Stornos desselben Awards erzeugen exakt eine Gegenbuchung.
4. Storno-von-Storno, Selbstreferenz, falsches Vorzeichen und leerer Grund scheitern.
5. Erzwungener Fehler vor Commit hinterlässt weder halben Award noch halbes Storno.
6. Rule v2 verändert den gespeicherten v1-Snapshot nicht und macht dieselbe Source nicht erneut awardfähig.

**Fixture-Regeln:**

- Pro Test eindeutige Member/App-User/Rule/Source-IDs bzw. ein exklusives Schema verwenden.
- Rule-Fixtures explizit einfügen; keine Produktionswerte voraussetzen.
- Mit Barrier/Channels beide Goroutines bis unmittelbar vor den konkurrierenden Insert/Storno-Pfad bringen; bloß sequenzielle Doppelaufrufe sind kein Concurrency-Test.
- Cleanup ausschließlich im disposable Testkontext; keine globale Entwicklungs-DB leeren.
- `repository/testmain_test.go` Zeilen 17-24 initialisiert nur den Permission-Catalog und ist kein DB-Fixture-Analog.

---

### `backend/internal/services/point_service.go` (service, transactionale Commands)

**Analogs:** `asset_lifecycle_service.go` für kleines Store-Interface/Constructor; `badge_service.go` nur für Member-zentrierte Serviceposition; Proposal-Repository für Tx-Grenze.

**Abhängigkeiten als Interface und Constructor** (`asset_lifecycle_service.go`, Zeilen 16-43):

```go
type AssetLifecycleStore interface {
    LookupAssetLifecycleSubject(ctx context.Context, entityType string, entityID int64) (*models.AssetLifecycleSubject, error)
    RecordAssetLifecycleEvent(ctx context.Context, entry models.AssetLifecycleAuditEntry) error
}

type AssetLifecycleService struct {
    store AssetLifecycleStore
}

func NewAssetLifecycleService(store AssetLifecycleStore, storageDir string) *AssetLifecycleService {
    return &AssetLifecycleService{store: store, /* ... */}
}
```

Übertragen: schmale Interfaces für Tx-Start, Rule-Lookup und Ledger-Operationen definieren bzw. Repositorys injizieren. Constructor-Abhängigkeiten vollständig übergeben; keine globalen Repositorys.

**Command-Vertrag:** Der Aufrufer darf weder `point_value` noch rohen `idempotency_key` setzen. Der Service nimmt strukturierte, vertrauenswürdige Source-Felder, `member_id`, optionalen Actor, fachliche Wirkzeit und Rule-Code an, lädt die Regel serverseitig und baut den Key deterministisch, z. B.:

```text
v1|<reward-kind>|<source-type>|<stable-source>|beneficiary:<member-id>|slot:<role-or-action>
```

Regelversion und Punktewert gehören nicht in den Key. Datei-Hash, Textlänge und Content-Kopie gehören ebenfalls nie hinein.

**Transaktionsablauf:**

```text
BeginTx
  -> tx-gebundenes RuleRepository
  -> Regel serverseitig laden
  -> tx-gebundenes LedgerRepository
  -> InsertAward oder GetForUpdate + InsertReversal
Commit
bei jedem Fehler: deferred Rollback + Fehler zurückgeben
```

**Servicefehler:** Bestehendes Sentinel-/Wrapping-Muster aus `repository/errors.go` und Proposal-Code verwenden. Phasenspezifische stabile Fehler wie `ErrPointIdempotencyConflict`/`ErrInvalidReversal` dürfen in `point_service.go` liegen; ein separates Fehlerfile ist für diesen kleinen Scope nicht nötig. Tests müssen `errors.Is` prüfen. Das strukturierte HTTP-Fehlermuster aus `asset_lifecycle_errors.go` ist hier nicht erforderlich, weil Phase 106 keinen Handler/HTTP-Contract besitzt.

**Wichtiges negatives Analog:** `badge_service.go` Zeilen 28-39 loggt/ignoriert Einzelprobleme und `badge_repository.go` mutiert bestehende Zeilen. Das ist für abgeleitete Badges zulässig, für das autoritative Ledger aber verboten. Jeder Rule-, Insert-, Storno- oder Commit-Fehler muss an den Aufrufer zurückgehen und die Transaktion zurückrollen.

**Consumer-Grenze:** In Phase 106 nicht in `backend/cmd/server/main.go` konstruieren und nicht an `ContributionReviewHandler.Confirm/Reject` hängen. Der aktuelle Review-Handler prüft nur `fansub_group.members.manage` und schreibt Audit nachträglich best-effort (`contribution_review_handler.go`, Zeilen 121-153); Self-Review-/Capability-/Source-Scope-Guards folgen erst in Phase 107.

---

### `backend/internal/services/point_service_credit_test.go` (test, Credit + Transaktionsgrenze)

**Analogs:** Fake-Store- und `errors.As`/`errors.Is`-Muster aus `asset_lifecycle_service_test.go`, Zeilen 14-32 und 48-97; kein exakter Analog für einen gemeinsam mit einer Domainmutation ausgeführten caller-owned pgx-Transaktionstest, daher die in `106-RESEARCH.md` beschriebene Transaktions-Seam verwenden.

Übertragen: Fakes zeichnen Rule-Lookup, generierten Key, Ledger-Command, Begin/Commit/Rollback und Rückgabefehler auf. Tabellarische Tests beweisen Member-Pflicht, optionalen Actor, exakten RuleRef, serverseitigen Snapshot, delimiter-sicheren RewardKind-/Source-/Member-/Slot-Key, Regelversionsstabilität, Slot-Trennung und die getrennten Lifecycle-Verträge von `CreditInTx` und `Credit`. Der opt-in PostgreSQL-Test nutzt das Phase-106-Fixture für gemeinsame Domainmarker-plus-Award-Commit-/Rollback-Atomicität.

### `backend/internal/services/point_service_reverse_test.go` (test, Reverse + Retry)

**Analogs:** dieselben Fake-/Fehlerassertions aus `asset_lifecycle_service_test.go`; `FOR UPDATE`-/Stornoablauf und Lost-Response-Retry stammen aus der Reversal-Transaktionsanalyse in `106-RESEARCH.md` und dem Proposal-Locking-Analog.

Übertragen: Tests zeichnen `GetForUpdate`, den aus der Original-ID erzeugten Reversal-Key, den engen `PointReversalInput` und die Transaktions-Lifecycle-Aufrufe auf. Sie beweisen exakte Ableitung/Negation, Reversal-of-Reversal-Ablehnung, Pflichtgrund, identischen Lost-Response-Retry, Mismatch-Konflikt und Rollback bei Begin-/Lock-/Insert-/Commit-Fehlern.

### `backend/internal/services/point_service_boundary_test.go` (test, fokussierter Source-Vertrag)

**Analog:** positive/negative Fragment-Assertions aus `anime_contributions_proposal_repository_test.go`, Zeilen 78-110; der genaue Scan-Scope stammt aus der Phase Boundary und dem Security Domain in `106-RESEARCH.md`.

Übertragen: ausschließlich `point_service.go`, beide Point-Repositorys und beide Phase-106-Migrationsdateien scannen. HTTP/Handler, Review/Capability, Badge/Profile, Retention/Cleanup, Media/Upload/Crop/Thumbnail/Relation, Hashing/Ranking und Latest-Regelauswahl dort verbieten; `main.go`, globale Handler-Verzeichnisse und künftige Phase-107/108-Consumer ausdrücklich nicht scannen.

## Shared Patterns

### DBTX und atomare Transaktion

**Quellen:** `audit_logs.go` Zeilen 25-35; `anime_contributions_proposal_repository.go` Zeilen 46-148.
**Anwenden auf:** beide neuen Repositorys und `PointService`.

- Eine gemeinsame `DBTX`-Naht, keine parallele `PointDBTX`-Kopie.
- Repositorys sind mit Pool und Tx konstruier-/bindbar.
- Service besitzt Begin/Commit/Rollback; Repositorymethoden starten keine verschachtelte Transaktion.
- Domainmutation plus künftiger Award müssen später denselben Tx-Pfad nutzen; Phase 106 verdrahtet noch keinen Adapter.

### Fehlerbehandlung

**Quellen:** `repository/errors.go` Zeilen 3-9; Proposal-Code Zeilen 119-145 und Merge-Code Zeilen 108-171.
**Anwenden auf:** alle neuen Repository-/Servicemethoden.

- `errors.Is(err, pgx.ErrNoRows)` statt Stringvergleich.
- bekannte DB-Verletzungen in stabile Sentinels übersetzen.
- Kontext mit `fmt.Errorf("operation: %w", err)` erhalten.
- Keine best-effort-/nil-no-op-Semantik im Punktepfad.

### Immutable Catalog

**Quellen:** Struktur aus `0108_capability_registry.up.sql`; Read-Muster aus `authz_permissions.go`.
**Anwenden auf:** `point_rules`, Rule-Repository und Service.

- neue Wertung = neue `(rule_code, rule_version)`-Zeile.
- keine Update-/Delete-/Upsert-Produktionsmethode.
- Ledger speichert angewandte Regel und Wert als Snapshot.
- keine Produktions-Fixtures, solange konkrete Werte offen sind.

### Insert-first Idempotency

**Quelle:** lokales `ON CONFLICT`-/Locking-Muster aus Proposal-Repositories, ergänzt durch den neuen DB-Unique-Vertrag.
**Anwenden auf:** Award und historisch spätere Imports.

- Key serverseitig aus stabiler fachlicher Source/Beneficiary/Slot bilden.
- zuerst Insert versuchen, bei Konflikt existierende Zeile semantisch vergleichen.
- identischer Retry liefert vorhandenes Ergebnis; abweichender Retry scheitert geschlossen.

### Append-only Reversal

**Quellen:** `FOR UPDATE` aus Merge-Repository Zeilen 92-114; partieller Unique-Index aus Migration 0128.
**Anwenden auf:** Storno-Service und Ledger-Repository.

- Originalaward sperren.
- Original nie mutieren.
- negative Gegenbuchung mit Pflichtgrund und Referenz schreiben.
- partieller Unique-Index erzwingt höchstens ein direktes Storno.

### Test-Fixtures und Boundary-Verifikation

**Quellen:** Pfad-/Source-Test aus Phase 103/130; Fake-Store aus AssetLifecycle-Service-Test; Catalog-`TestMain` nur als negatives Abgrenzungsbeispiel.
**Anwenden auf:** `phase106_postgres_test.go`, den Migrationstest, beide Repositorytests und die drei aufgeteilten PointService-Testdateien.

- statische SQL-/Source-Checks nur für Struktur und verbotene Kopplungen.
- echte PostgreSQL-Tests für Unique, Check, FK, Locking und Parallelität.
- Testdaten lokal und deterministisch; keine produktiven Rule-Werte voraussetzen.
- kein DB-Setup in globales `repository.TestMain` ziehen.

## Consumer Trace und Scope-Schutz

| Bestehender Consumer/Flow | Befund | Konsequenz für Phase 106 |
|---|---|---|
| `backend/cmd/server/main.go:140` + Audit-Handler/Repositories | `AuditLogRepository` wird mit `*pgxpool.Pool` konstruiert; keine Exec-only Fakes gefunden | `DBTX.QueryRow` kann sicher ergänzt werden |
| `backend/cmd/server/main.go:453-467` | BadgeService und ContributionReviewHandler sind produktiv verdrahtet | keinen PointService dort registrieren; kein Badge-/Review-Side-Effect |
| `contribution_review_handler.go:121-153` | heutiger Confirm-Flow hat generelles Gruppenrecht und nachgelagertes best-effort Audit | nicht als Award-Adapter kopieren; Phase 107/108 abwarten |
| `fansub_repository.go:649-675` | Gruppenlöschung entfernt abhängige Contribution-/Memberdaten und dann die Gruppe | optionaler Ledger-Gruppenkontext `SET NULL`, Ledger bleibt |
| `episode_version_repository_write_helpers.go:252-323` | Release-Version kann physisch gelöscht werden | optionaler Ledger-Release-Kontext `SET NULL`, stabiler Source-Key bleibt |
| `badge_repository.go:53-89` | Badge wird per Upsert/Update reaktiviert bzw. widerrufen | ausdrücklich kein Ledger-Analog; Award/Storno append-only |
| `repository/testmain_test.go:17-49` | globales Setup lädt nur Rollen-/Capability-Fixtures | nicht als PostgreSQL-Testfixture missbrauchen |

## No Exact Analog Found

| Benötigtes Teilmuster | Grund | Planner-Hinweis |
|---|---|---|
| Disponibles PostgreSQL-Integrationstest-Fixture | Bestehende Repositorytests sind überwiegend Source-/Unit-Tests; keine testcontainers-/pgxmock-/DB-Fixture vorhanden | Ohne neue Dependency einen expliziten Test-DSN plus disposable DB/exklusives Schema innerhalb der Phase-106-Tests schaffen; normale Dev-DB nie implizit verwenden |
| Transaktionsbindbares `WithDB` für Repositorys | `DBTX` existiert, aber kein bestehendes `WithDB`-Clone-Muster | kleine Constructor-Weiterleitung in beiden neuen Repositorys; keine Unit-of-Work-Abstraktion bauen |
| Unveränderlicher versionierter Punktekatalog | Capability-Katalog wird bei Konflikt aktualisiert; Badge-Katalog ist mutierbar | nur Tabellen-/Read-Muster übernehmen; Rule-Update/Delete/Upsert verbieten |
| Semantischer Mismatch-Vergleich nach `ON CONFLICT DO NOTHING` | Bestand nutzt Konflikte überwiegend als idempotentes Ignorieren | vollständigen bestehenden Ledgerdatensatz laden und alle semantischen Felder vergleichen |

## Nicht zu kopierende Bestandsmuster

1. `badge_repository.go`: `ON CONFLICT DO UPDATE` und `UPDATE ... status='revoked'` widersprechen append-only.
2. `badge_service.go`: Fehler loggen und verschlucken widerspricht autoritativem Ledger.
3. `audit_logs.go`: nil-no-op/best-effort ist nur Zusatztelemetrie, kein Ledgervertrag.
4. `0108_capability_registry.up.sql`: mutierende Seed-Upserts widersprechen unveränderlichen Rule-Versionen.
5. `0129_release_playback_entitlements.up.sql`: `ON DELETE CASCADE` auf Gruppen-/Release-Kontexten darf nicht auf das Ledger übertragen werden.
6. Heutiger Contribution-Confirm-Handler: noch kein Self-Review-/dedizierter Capability-/vollständiger Source-Scope-Guard; keine Wiring-Arbeit in Phase 106.
7. Media-Uploader, Hashes oder Contentmenge: keine Attribution und kein Idempotenzsignal für Punkte.

## Metadata

**Analog-Suchscope:** `backend/internal/repository`, `backend/internal/services`, `backend/internal/migrations`, `database/migrations`, plus direkte Consumer in `backend/cmd/server` und `backend/internal/handlers`
**Dateien im Primärscope gescannt:** 473 (173 Repository, 27 Services, 13 Migrationstests, 260 SQL-Migrationsdateien)
**Starke Analoggruppen gelesen:** DBTX/Audit, Proposal-Transaktion und Merge, Capability-/Rule-Katalog, partielle Unique-Indizes, Migration-Up/Down-Tests, Member-Badge-Abgrenzung, Service-/Fake-Store-Muster
**Migrationsstand beim Mapping:** `0130_release_content_source_groups` ist höchste eingecheckte Migration; keine modifizierten/ungetrackten Dateien unter `database/migrations` oder `backend/internal/migrations`
**Pattern extraction date:** 2026-07-22
