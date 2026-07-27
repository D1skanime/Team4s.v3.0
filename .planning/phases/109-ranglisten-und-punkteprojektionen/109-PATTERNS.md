# Phase 109: Ranglisten und Punkteprojektionen - Pattern Map

**Mapped:** 2026-07-27
**Files analyzed:** 9 (2 SQL, 3 Go-Produktivcode, 2 Go-Tests, 1 Contract-/Typ-Paar Frontend, 1 Route-Registrierung)
**Analogs found:** 9 / 9

Migrationsnummer zum Zeitpunkt dieser Analyse frisch geprüft: höchste vorhandene ist
`0138_project_note_first_author_lifecycle` (`ls database/migrations | sort | tail`). Nächste freie
Nummer ist **0139** — unmittelbar vor Implementierungsbeginn erneut prüfen (Pitfall 4,
mehrere GSD-Agenten laufen parallel auf `main`).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `database/migrations/0139_member_point_totals.up.sql` | migration | event-driven (Trigger) + CRUD (Tabelle) | `database/migrations/0131_member_point_foundation.up.sql` | exact (gleicher Migrationsstil, gleiches Projekt, plpgsql-Trigger-Konvention) |
| `database/migrations/0139_member_point_totals.down.sql` | migration | CRUD (symmetrischer Rückbau) | `database/migrations/0131_member_point_foundation.down.sql` | exact |
| `backend/internal/repository/member_point_totals_repository.go` | repository (reine Lese-Schicht) | CRUD (Read, paginiert) | `backend/internal/repository/member_archive_repository.go` (Pagination/Display-Name) + `backend/internal/repository/anime_contributions_public_repository.go` (memberDisplayExpr/memberSlugExpr) | role-match (Pagination-Stil identisch übernehmbar) |
| `backend/internal/repository/member_point_totals_repository_test.go` | test | integration (Concurrency, echtes Postgres) | `backend/internal/repository/point_ledger_repository_test.go` (`TestPointLedgerPostgresConcurrentAward`) | exact (identisches Concurrency-Testmuster, gleiche Fixture-Familie) |
| `backend/internal/handlers/member_point_totals_handler.go` | controller | request-response (dünner GET-Handler) | `backend/internal/handlers/contributions_public_handler.go` | exact |
| `backend/internal/migrations/phase109_member_point_totals_test.go` | test | migration contract | `backend/internal/migrations/phase106_member_points_test.go` | exact |
| `backend/cmd/server/main.go` (Route-Registrierung + Konstruktion) | route/config | request-response | Zeilen 525–543 (`archiveRepo`/`archiveHandler`/`contributionsPublicHandler`-Konstruktion + `v1.GET("/members/:slug/contributions", ...)`) | exact |
| `shared/contracts/openapi.yaml` (neuer Pfad) | config (API-Contract) | request-response | `/api/v1/members/{slug}` (Zeile 516) | role-match (kein bestehender Ranking-Endpunkt als 1:1-Vorlage vorhanden) |
| `frontend/src/lib/api.ts` (neue Funktion) + `frontend/src/types/*.ts` (neuer/erweiterter Typ) | service (API-Client) / model | request-response | `getMemberContributions` (Zeile 9101) + `searchArchive`/`ArchiveSearchResponse` (Zeile 9318–9364) | exact |

## Pattern Assignments

### `database/migrations/0139_member_point_totals.up.sql` (migration, event-driven Trigger + CRUD Tabelle)

**Analog:** `database/migrations/0131_member_point_foundation.up.sql`

**Migrations-Rahmen** (Zeilen 1–2, 160):
```sql
BEGIN;
...
COMMIT;
```

**Tabellen-/Trigger-Stil, den 0139 übernehmen soll** (abgeleitet aus 0131 Zeilen 3–22, konkret aus
RESEARCH.md Pattern 1 bereits fertig ausformuliert):
```sql
CREATE TABLE member_point_totals (
    member_id    BIGINT PRIMARY KEY REFERENCES members(id),
    total_points BIGINT NOT NULL DEFAULT 0,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE FUNCTION apply_point_ledger_entry_to_member_total() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO member_point_totals (member_id, total_points, updated_at)
    VALUES (NEW.member_id, NEW.point_value, NOW())
    ON CONFLICT (member_id) DO UPDATE
    SET total_points = member_point_totals.total_points + NEW.point_value,
        updated_at = NOW();
    RETURN NULL;
END;
$$;

CREATE TRIGGER point_ledger_apply_member_total
AFTER INSERT ON point_ledger_entries
FOR EACH ROW EXECUTE FUNCTION apply_point_ledger_entry_to_member_total();
```

**Guard-Trigger-Stil zu übernehmen** (analog `guard_point_ledger_mutation`, `0131` Zeilen 110–158;
`pg_trigger_depth()`-Idiom bereits im Projekt etabliert):
```sql
CREATE FUNCTION guard_member_point_totals_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF pg_trigger_depth() = 0 THEN
        RAISE EXCEPTION 'member_point_totals wird ausschliesslich durch den point_ledger_entries-Trigger gepflegt';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER member_point_totals_guard_direct_write
BEFORE INSERT OR UPDATE OR DELETE ON member_point_totals
FOR EACH ROW EXECUTE FUNCTION guard_member_point_totals_mutation();
```

**Kritische Konvention aus 0131 zu übernehmen:** Kein `ON DELETE CASCADE` auf der
`REFERENCES members(id)`-Spalte (0131 Zeile 26 nutzt kein Cascade; Kommentar in
`TestPhase106MigrationUpContract` Zeile 57: `"migration must not... on delete cascade"`
für Member-/Rule-/Reversal-Identität). `member_id BIGINT PRIMARY KEY REFERENCES members(id)`
ohne `ON DELETE`-Klausel ist der korrekte Stil.

---

### `database/migrations/0139_member_point_totals.down.sql` (migration, symmetrischer Rückbau)

**Analog:** `database/migrations/0131_member_point_foundation.down.sql` (vollständig, 15 Zeilen)

```sql
BEGIN;

DROP TRIGGER IF EXISTS point_ledger_guard_mutation ON point_ledger_entries;
DROP TRIGGER IF EXISTS point_ledger_validate_insert ON point_ledger_entries;
DROP FUNCTION IF EXISTS guard_point_ledger_mutation();
DROP FUNCTION IF EXISTS validate_point_ledger_insert();
DROP INDEX IF EXISTS uq_point_ledger_direct_reversal;
DROP TABLE IF EXISTS point_ledger_entries;

DROP TRIGGER IF EXISTS point_rules_immutable ON point_rules;
DROP FUNCTION IF EXISTS reject_point_rule_mutation();
DROP TABLE IF EXISTS point_rules;

COMMIT;
```

**Übertragenes Muster für 0139:** Trigger vor Funktion droppen, Funktion vor Tabelle droppen
(Reihenfolge testet `TestPhase106MigrationDownContract` explizit über `requireOrder`). Für 0139:
`DROP TRIGGER point_ledger_apply_member_total ON point_ledger_entries` →
`DROP TRIGGER member_point_totals_guard_direct_write ON member_point_totals` →
`DROP FUNCTION apply_point_ledger_entry_to_member_total()` →
`DROP FUNCTION guard_member_point_totals_mutation()` →
`DROP TABLE IF EXISTS member_point_totals`.

**Wichtig:** Der Trigger `point_ledger_apply_member_total` hängt auf `point_ledger_entries` — die
Down-Migration darf `point_ledger_entries` selbst **nicht** anfassen (gehört Phase 106, nicht 109).
Nur den eigenen Trigger auf dieser fremden Tabelle droppen, dann die eigene Tabelle/Funktionen.

---

### `backend/internal/repository/member_point_totals_repository.go` (repository, CRUD read/paginiert)

**Analog 1 (Pagination/Bounds):** `backend/internal/repository/member_archive_repository.go`

**Bounds-Check-Pattern** (Zeilen 60–67):
```go
// Bounds-Check: Seite >= 1 und <= 1000 (T-68-03-02)
if page < 1 {
    page = 1
}
if page > 1000 {
    page = 1000
}
offset := (page - 1) * archivePageSize
```

**Analog 2 (Display-Name/Slug-Ableitung — MUSS wiederverwendet werden, nicht neu erfinden):**
`backend/internal/repository/anime_contributions_public_repository.go` Zeilen 11–18:
```go
// memberSlugExpr derives a URL slug from members.nickname.
const memberSlugExpr = `NULLIF(LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(TRIM(%s), '[^a-z0-9]+', '-', 'gi'))), '')`

// memberDisplayExpr resolves the member display name.
const memberDisplayExpr = `COALESCE(NULLIF(TRIM(%s.display_name), ''), %s.nickname)`
```
Verwendung im Query-Builder (analog `member_archive_repository.go` Zeilen 180–181):
```go
fmt.Sprintf(memberDisplayExpr, "m", "m"),
fmt.Sprintf(memberSlugExpr, "m.nickname"),
```
Diese Konstanten liegen bereits im `repository`-Package — direkt verwendbar, keine Kopie nötig.

**Konstruktor-/Struktur-Konvention** (analog `member_archive_repository.go` Zeilen 41–48):
```go
type MemberArchiveRepository struct {
    db *pgxpool.Pool
}

func NewMemberArchiveRepository(db *pgxpool.Pool) *MemberArchiveRepository {
    return &MemberArchiveRepository{db: db}
}
```

**Query-Template für `ListRanking`** (bereits vollständig in RESEARCH.md Pattern 3 ausformuliert,
Stil aus `member_archive_repository.go` übernommen, Tie-Break gemäß Pitfall 5):
```go
const memberRankingPageSize = 50

func (r *MemberPointTotalsRepository) ListRanking(ctx context.Context, page int) ([]MemberPointRankingRow, int, error) {
    if page < 1 {
        page = 1
    }
    if page > 1000 {
        page = 1000
    }
    offset := (page - 1) * memberRankingPageSize

    var total int
    if err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM member_point_totals`).Scan(&total); err != nil {
        return nil, 0, fmt.Errorf("member point ranking: count: %w", err)
    }

    displayCol := fmt.Sprintf(memberDisplayExpr, "m", "m")
    slugCol := fmt.Sprintf(memberSlugExpr, "m.nickname")
    rows, err := r.db.Query(ctx, fmt.Sprintf(`
        SELECT m.id, %s AS display_name, %s AS slug, mpt.total_points
        FROM member_point_totals mpt
        JOIN members m ON m.id = mpt.member_id
        ORDER BY mpt.total_points DESC, m.id ASC
        LIMIT $1 OFFSET $2
    `, displayCol, slugCol), memberRankingPageSize, offset)
    // ... rows.Close(), scan analog member_archive_repository.go Zeilen 196–216
}
```
**Offene Entscheidung (Open Question 1 aus RESEARCH.md, Planner-Diskretion):** `INNER JOIN` liefert
nur Members mit mindestens einer Buchung (empfohlen als Start). `LEFT JOIN ... COALESCE(total_points, 0)`
wäre die Alternative, falls Phase 110 eine vollständige 0-Punkte-Liste braucht — schemakompatibel,
keine Migration nötig, falls später gewechselt wird.

**Fehlerbehandlungsstil** (durchgängig `fmt.Errorf("<bereich>: <schritt>: %w", err)`, siehe
`member_archive_repository.go` Zeilen 143, 189, 206, 214, 238, 247, 254, 270, 279, 286) — exakt
dieses Präfix-Muster (`member point ranking: ...`) für die neue Datei übernehmen.

---

### `backend/internal/repository/member_point_totals_repository_test.go` (test, Postgres-Concurrency)

**Analog:** `backend/internal/repository/point_ledger_repository_test.go`,
`TestPointLedgerPostgresConcurrentAward` (Zeilen 170–200)

```go
func TestPointLedgerPostgresConcurrentAward(t *testing.T) {
    pool := openPointLedgerPostgres(t)
    r := NewPointLedgerRepository(pool)
    in := postgresAwardInput("award:concurrent")
    start := make(chan struct{})
    results := make(chan *PointLedgerEntry, 2)
    errs := make(chan error, 2)
    var ready sync.WaitGroup
    ready.Add(2)
    for range 2 {
        go func() {
            ready.Done()
            <-start
            got, err := r.InsertAward(context.Background(), in)
            results <- got
            errs <- err
        }()
    }
    ready.Wait()
    close(start)
    a, b := <-results, <-results
    if err := <-errs; err != nil { t.Fatal(err) }
    if err := <-errs; err != nil { t.Fatal(err) }
    if a.ID != b.ID { t.Fatalf("concurrent IDs differ: %d != %d", a.ID, b.ID) }
}
```
**Fixture-/Helper-Import-Block zu übernehmen** (Zeilen 1–19): `testsupport.OpenPhase106Postgres`-
artiger Helper, `sync`, `pgx/v5`, `pgxpool` — für Phase 109 analog `testsupport.OpenPhase106Postgres`
prüfen, ob ein `OpenPhase109Postgres` nötig ist oder das bestehende Phase-106-Fixture (gleiche
DB/Schema-Isolation, gleiche `members`/`point_ledger_entries`-Basis) direkt wiederverwendet werden
kann — RESEARCH.md-Template (`TestMemberPointTotalsPostgresConcurrentAwardsSumCorrectly`) geht von
Wiederverwendung aus:
```go
func TestMemberPointTotalsPostgresConcurrentAwardsSumCorrectly(t *testing.T) {
    pool := openPointLedgerPostgres(t) // gleiche Fixture, gleiche Schema-Isolation
    ledger := NewPointLedgerRepository(pool)
    memberID := seedTestMember(t, pool)
    // ... zwei parallele InsertAward-Aufrufe fuer denselben memberID mit unterschiedlichen idempotency_key ...
    var total int64
    require.NoError(t, pool.QueryRow(context.Background(),
        `SELECT total_points FROM member_point_totals WHERE member_id = $1`, memberID).Scan(&total))
    require.Equal(t, int64(2*testAwardPointValue), total)
}
```
**Zusätzlich abzudecken (Pitfall 5, Ranking-Stabilität):** Test mit mind. zwei Members auf
identischem `total_points`-Wert, wiederholte `ListRanking`-Aufrufe müssen dieselbe Reihenfolge
liefern (`ORDER BY total_points DESC, member_id ASC`).

---

### `backend/internal/handlers/member_point_totals_handler.go` (controller, request-response)

**Analog:** `backend/internal/handlers/contributions_public_handler.go` (komplett, 75 Zeilen)

**Package-/Import-Konvention** (Zeilen 1–9):
```go
package handlers

import (
    "net/http"

    "team4s.v3/backend/internal/repository"

    "github.com/gin-gonic/gin"
)
```

**Handler-Struktur und Konstruktor** (Zeilen 13–20):
```go
type ContributionsPublicHandler struct {
    repo *repository.AnimeContributionsRepository
}

func NewContributionsPublicHandler(repo *repository.AnimeContributionsRepository) *ContributionsPublicHandler {
    return &ContributionsPublicHandler{repo: repo}
}
```

**Dünner GET-Handler mit deutschsprachigen Fehlermeldungen** (Zeilen 58–74, `GetMemberContributions`
als engster Analog — gleicher Slug-Parameter, gleiche Fehlerbehandlung):
```go
func (h *ContributionsPublicHandler) GetMemberContributions(c *gin.Context) {
    memberSlug := c.Param("slug")
    if len(memberSlug) < 2 {
        badRequest(c, "ungültiger member-slug")
        return
    }

    response, err := h.repo.GetPublicMemberContributions(c.Request.Context(), memberSlug)
    if err != nil {
        internalError(c, "interner serverfehler")
        return
    }

    c.JSON(http.StatusOK, response)
}
```
Für die Rangliste (kein Slug-Parameter, stattdessen `page`-Query, aus RESEARCH.md Code-Examples
bereits vollständig ausformuliert):
```go
func (h *MemberPointRankingHandler) GetMemberPointRanking(c *gin.Context) {
    page := parsePageParam(c.Query("page")) // Default 1, Bounds-Check analog member_archive_repository.go
    rows, total, err := h.repo.ListRanking(c.Request.Context(), page)
    if err != nil {
        internalError(c, "interner serverfehler")
        return
    }
    c.JSON(http.StatusOK, gin.H{"members": rows, "total": total, "page": page})
}
```
`badRequest`/`internalError` sind bereits projektweite Helper (siehe deren Verwendung in
`contributions_public_handler.go` Zeilen 27, 33, 45, 51, 63, 69) — keine neue Fehler-Formatierung
erfinden.

---

### `backend/internal/migrations/phase109_member_point_totals_test.go` (test, Migrations-Contract)

**Analog:** `backend/internal/migrations/phase106_member_points_test.go` (komplett, 659 Zeilen)

**Konstanten-/Dateipfad-Konvention** (Zeilen 18–28):
```go
const (
    phase106MigrationName = "0131_member_point_foundation"
    phase106UpFile         = phase106MigrationName + ".up.sql"
    phase106DownFile       = phase106MigrationName + ".down.sql"
    ...
)
```
Für Phase 109 analog: `phase109MigrationName = "0139_member_point_totals"`.

**Contract-Test-Muster (Up)** (Zeilen 30–68, Kernstruktur `requireOrder` + `requireSQLContains`):
```go
func TestPhase106MigrationUpContract(t *testing.T) {
    up := readPhase106Migration(t, phase106UpFile)
    requireOrder(t, up, "create table point_rules", "create table point_ledger_entries")
    requireSQLContains(t, up, /* ... erwartete SQL-Fragmente, normalisiert ueber strings.Fields+ToLower ... */)
}
```
Übertragen auf Phase 109 (bereits im RESEARCH.md Code-Examples-Abschnitt ausformuliert):
```go
func TestPhase109MigrationUpContract(t *testing.T) {
    up := readPhase109Migration(t, phase109UpFile)
    requireOrder(t, up, "create table member_point_totals", "create function apply_point_ledger_entry_to_member_total")
    requireSQLContains(t, up,
        "member_id bigint primary key references members(id)",
        "total_points bigint not null default 0",
        "after insert on point_ledger_entries",
        "for each row execute function apply_point_ledger_entry_to_member_total",
        "on conflict (member_id) do update",
        "total_points = member_point_totals.total_points + new.point_value",
    )
    require.NotContains(t, up, "insert into point_ledger_entries", "trigger darf nicht selbst in den Ledger schreiben")
}

func TestPhase109MigrationDownContract(t *testing.T) {
    down := readPhase109Migration(t, phase109DownFile)
    requireSQLContains(t, down, "drop trigger", "drop function", "drop table if exists member_point_totals")
}
```

**Helper-Funktionen 1:1 übernehmbar** (Zeilen 434–478, 653–658): `readPhase106Migration`,
`phase106MigrationPath`, `phase106RepoRoot`, `normalizePhase106SQL`, `requireSQLContains`,
`requireOrder`, `assertPhase106TableExists` — für Phase 109 als `phase109...`-Pendants duplizieren
(gleiches Package `migrations`, kann evtl. sogar dieselben generischen Helper wiederverwenden, falls
sie nicht bereits `phase106`-präfixiert exportiert sind; Namen sind aktuell alle package-privat mit
`phase106`-Präfix, daher **neue** `phase109`-Kopien nötig, um Namenskollisionen im selben Package zu
vermeiden).

**Live Up/Down/Up-Test-Muster** (Zeilen 113–120):
```go
func TestPhase106MigrationLiveUpDownUp(t *testing.T) {
    pool := testsupport.OpenPhase106Postgres(t)
    testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase106UpFile))
    testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase106DownFile))
    testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase106UpFile))
    assertPhase106TableExists(t, pool, "point_rules")
    assertPhase106TableExists(t, pool, "point_ledger_entries")
}
```
Für Phase 109 analog, plus Prüfung, dass die 0131-Migration bereits angewendet sein muss, bevor
0139 angewendet werden kann (0139 hängt am Trigger-Target `point_ledger_entries` aus 0131) —
`testsupport.ApplySQLFile` für `0131_member_point_foundation.up.sql` **vor** `0139_...up.sql`
aufrufen.

**Boundary-Test-Muster** (Zeilen 409–432, `TestPhase106MigrationBoundary`) — analoges Muster für
Phase 109 optional ergänzen, das prüft, dass `0139_member_point_totals.up/down.sql` **keine**
verbotenen Tokens aus fremden Phasen enthält (z. B. `media_asset`, `upload`, `capability`, `badge`),
und umgekehrt, dass `0131_member_point_foundation.*.sql` unverändert bleibt (Byte-Vergleich oder
Checksum gegen den bekannten Stand, falls verfügbar).

---

### `backend/cmd/server/main.go` (route/config, request-response — Registrierung, kein neuer Datei-Typ)

**Analog:** Zeilen 524–543 (Konstruktion + Registrierung bestehender Read-Handler direkt neben dem
Kollisionspunkt aus Pitfall 3):
```go
memberBadgesHandler := handlers.NewMemberBadgesHandler(badgeRepo)
archiveRepo := repository.NewMemberArchiveRepository(dbPool)
archiveHandler := handlers.NewMemberArchiveHandler(archiveRepo)
...
contributionsPublicHandler := handlers.NewContributionsPublicHandler(animeContributionsRepo)
...
v1.GET("/archiv", archiveHandler.SearchArchive)
...
v1.GET("/fansubs/:id/contributions", contributionsPublicHandler.GetFansubContributions)
v1.GET("/anime/:id/contributions", contributionsPublicHandler.GetAnimeContributions)
v1.GET("/members/:slug/contributions", contributionsPublicHandler.GetMemberContributions)
```
**Kollisionsregel (Pitfall 3, hart):** `v1.GET("/members/:slug", authOptionalMiddleware,
publicProfileHandler.GetPublicMemberProfile)` ist bereits in Zeile 352 registriert. Der neue
Ranglisten-Endpunkt darf **kein** Unterpfad von `/members/:slug` sein (z. B. **nicht**
`/members/ranking`), sondern muss ein eigener Top-Level-Pfad sein, der kein bestehendes
Parameter-Segment auf gleicher Tiefe trifft — Vorschlag aus RESEARCH.md:
`/api/v1/member-point-ranking` oder `/api/v1/leaderboard/members`. Registrierungszeile analog
Zeile 536 (`v1.GET("/archiv", archiveHandler.SearchArchive)` — ebenfalls unauthentifiziert, direkt
neben den anderen Public-Read-Routen einfügen):
```go
memberPointTotalsRepo := repository.NewMemberPointTotalsRepository(dbPool)
memberPointRankingHandler := handlers.NewMemberPointRankingHandler(memberPointTotalsRepo)
v1.GET("/member-point-ranking", memberPointRankingHandler.GetMemberPointRanking)
```

---

### `shared/contracts/openapi.yaml` (config, Contract) + Frontend (service/model)

**Analog (Struktur eines öffentlichen GET-Endpunkts ohne Pfadparameter, paginiert):**
`/api/v1/anime` (Zeilen 564–595, `page`/`per_page`-Query-Parameter-Stil) kombiniert mit
`/api/v1/members/{slug}` (Zeilen 516–563, Response-/Error-Schema-Stil: 400/404/500 mit
`ErrorResponse`).

Kein bestehender Ranking-Endpunkt im Contract vorhanden (weder `/archiv` noch
`/members/{slug}/contributions` sind aktuell in `shared/contracts/openapi.yaml` dokumentiert —
Contract-Abdeckung ist im Projekt bereits lückenhaft, daher **kein** exaktes Vorbild 1:1
kopierbar). Query-Parameter-Stil aus `/api/v1/anime` übernehmen:
```yaml
- name: page
  in: query
  schema:
    type: integer
    minimum: 1
    default: 1
```

**Frontend API-Client-Funktion — Analog:** `getMemberContributions` (`frontend/src/lib/api.ts`
Zeilen 9101–9126, kompletter Public-GET-Aufruf ohne Auth):
```typescript
export async function getMemberContributions(
  slug: string,
): Promise<PublicMemberContributionsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const encodedSlug = encodeURIComponent(slug);
  const response = await fetch(
    `${API_BASE_URL}/api/v1/members/${encodedSlug}/contributions`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }

  return response.json() as Promise<PublicMemberContributionsResponse>;
}
```

**Analog für paginierte Query-Params:** `searchArchive` (Zeilen 9341–9364):
```typescript
export async function searchArchive(params: {
  rolle?: string
  gruppe?: string
  von?: string | number
  bis?: string | number
  page?: number
}): Promise<ArchiveSearchResponse> {
  const API_BASE_URL = getApiBaseUrl()
  const query = new URLSearchParams()
  if (params.rolle) query.set('rolle', params.rolle)
  ...
  if (params.page && params.page > 1) query.set('page', String(params.page))

  const response = await fetch(
    `${API_BASE_URL}/api/v1/archiv${query.toString() ? `?${query.toString()}` : ''}`,
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
  return response.json() as Promise<ArchiveSearchResponse>
}
```
Für die Rangliste analog übertragen: `getMemberPointRanking(page?: number): Promise<MemberPointRankingResponse>`
gegen `/api/v1/member-point-ranking` (oder den final gewählten Pfad), gleiches `URLSearchParams`-
und `ApiError`-Muster.

**Frontend-Typ — Analog:** `ArchiveMemberRow`/`ArchiveSearchResponse` (`frontend/src/lib/api.ts`
Zeilen 9318–9333, direkt neben der zugehörigen API-Funktion definiert statt in `types/`) sowie
`PublicAnimeContribution` (`frontend/src/types/contributions.ts` Zeilen 3–11, snake_case JSON-Tags
spiegeln Backend-Response 1:1). Neuer Typ z. B.:
```typescript
export interface MemberPointRankingRow {
  id: number
  display_name: string
  slug: string | null
  total_points: number
}

export interface MemberPointRankingResponse {
  members: MemberPointRankingRow[]
  total: number
  page: number
}
```
**Ablageentscheidung (Planner-Diskretion):** Analog zu `ArchiveMemberRow` direkt in `api.ts`
co-lokalisiert (Präzedenzfall im selben Projekt) **oder** analog zu `contributions.ts` als eigene
Datei `frontend/src/types/memberPointRanking.ts` — beide Stile sind im Projekt bereits belegt;
kein Widerspruch zu CLAUDE.md, da rein UI-neutraler Datentyp betroffen ist (kein natives
`<select>/<input>` o. ä., globales UI-System (`@/components/ui`) ist für Phase 109 nicht relevant,
da Backend-only, keine UI-Komponente entsteht).

---

## Shared Patterns

### Boundary-Schutz — bestehende Dateien dürfen NICHT verändert werden
**Quelle:** `backend/internal/services/point_service_boundary_test.go` (Zeilen 10–24),
`backend/internal/services/review_service_boundary_test.go` (Zeilen 11–49)
**Gilt für:** Jede Planungs-/Implementierungsentscheidung dieser Phase.
```go
for _, forbidden := range []string{"net/http", "internal/handlers", "capability", "badge",
    "profile", "retention", "thumbnail", "upload", "crop", "sha256", "ranking", "getlatest",
    "latest rule"} { /* point_service_boundary_test.go */ }

for _, forbidden := range []string{ /* ... */ "ranking",
    "insert into " + "point_ledger_entries", "points_" + "ledger", "member_" + "points"} {
    /* review_service_boundary_test.go */ }
```
Die geschützten Dateien (**byte-identisch lassen**): `point_service.go`, `point_rules_repository.go`,
`point_ledger_repository.go`, `0131_member_point_foundation.up/down.sql`, `review_service.go`,
`review_delegation_repository.go`, `review_decision_repository.go`, `review_audit_repository.go`,
`review_credit_repository.go`. Jede Phase-109-Logik gehört ausschließlich in **neue** Dateien
(0139-Migration, `member_point_totals_repository.go`, `member_point_totals_handler.go`).

### Display-Name/Slug-Ableitung
**Quelle:** `backend/internal/repository/anime_contributions_public_repository.go` Zeilen 11–18
(`memberDisplayExpr`, `memberSlugExpr`)
**Apply to:** `member_point_totals_repository.go` (jede Query, die einen Member-Anzeigenamen oder
-Slug ausgibt) — bereits sechsfach im Projekt geteilt, siebte abweichende Implementierung wäre Slop.

### Pagination/Bounds-Check
**Quelle:** `backend/internal/repository/member_archive_repository.go` Zeilen 60–67
**Apply to:** `member_point_totals_repository.go` (`ListRanking`) und `member_point_totals_handler.go`
(`page`-Query-Parsing) — `page < 1 → 1`, `page > 1000 → 1000`, feste Seitengröße als Package-Konstante.

### Fehlerformat (Handler)
**Quelle:** `backend/internal/handlers/contributions_public_handler.go` (`badRequest`/`internalError`
Helper, Zeilen 27, 33, 45, 51, 63, 69)
**Apply to:** `member_point_totals_handler.go` — deutschsprachige, kleingeschriebene Fehlermeldungen
("ungültige anime-id", "interner serverfehler") mit korrekten Umlauten (CLAUDE.md-Pflicht).

### Concurrency-Testmuster (Postgres, keine Doppelzählung)
**Quelle:** `backend/internal/repository/point_ledger_repository_test.go` Zeilen 170–200
(`TestPointLedgerPostgresConcurrentAward`)
**Apply to:** `member_point_totals_repository_test.go` — zwei parallele identische
Award-Requests (gleicher `idempotency_key`) dürfen `total_points` nur einmal erhöhen
(Pitfall 2); zwei parallele **unterschiedliche** Award-Requests für denselben Member müssen sich
korrekt addieren (kein Lost Update, da `ON CONFLICT (member_id) DO UPDATE` implizit sperrt).

### Migrations-Contract-Testmuster
**Quelle:** `backend/internal/migrations/phase106_member_points_test.go` (`requireSQLContains`,
`requireOrder`, `readPhase106Migration`, `phase106MigrationPath`, `normalizePhase106SQL`)
**Apply to:** `phase109_member_point_totals_test.go` — Whitespace-normalisierter String-Contains-
Vergleich auf SQL-Fragmente, Reihenfolge-Check (`CREATE TABLE` vor `CREATE FUNCTION`/`CREATE TRIGGER`).

## No Analog Found

Keine Datei ohne Analog — alle neun Dateien haben mindestens einen role-match- oder exact-match-Analog
im bestehenden Code. Die einzige echte Lücke ist der **Contract-Eintrag** in
`shared/contracts/openapi.yaml`: Es existiert kein bestehender Ranking-/Leaderboard-Pfad als
1:1-Vorlage, und auch die strukturell nächsten Endpunkte (`/archiv`,
`/members/{slug}/contributions`) sind selbst noch nicht im Contract dokumentiert. Der Planner muss
den neuen Pfad aus den Bausteinen `/api/v1/anime` (Query-Parameter-Stil) und
`/api/v1/members/{slug}` (Response-/Error-Schema-Stil) komponieren statt kopieren.

## Metadata

**Analog search scope:** `backend/internal/repository/`, `backend/internal/handlers/`,
`backend/internal/migrations/`, `backend/internal/services/`, `database/migrations/`,
`backend/cmd/server/main.go`, `shared/contracts/openapi.yaml`, `frontend/src/lib/api.ts`,
`frontend/src/types/`
**Files scanned:** 13 (2 SQL, 1 Ledger-Repository, 2 Boundary-Tests, 1 Archiv-Repository,
1 Contributions-Repository, 1 Contributions-Handler, 1 Migrationstest, 1 Repository-Test,
1 main.go-Ausschnitt, 1 openapi.yaml-Ausschnitt, 1 api.ts-Ausschnitt, 1 contributions.ts)
**Pattern extraction date:** 2026-07-27
