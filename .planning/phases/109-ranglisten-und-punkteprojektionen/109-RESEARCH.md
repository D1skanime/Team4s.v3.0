# Phase 109: Ranglisten und Punkteprojektionen - Research

**Researched:** 2026-07-27
**Domain:** PostgreSQL trigger-maintained aggregate (persisted running total) über einem bestehenden append-only Ledger; Go/Gin Read-Repository und Read-Endpunkt
**Confidence:** HIGH

## Summary

Phase 109 ist technisch klein, aber mit einer harten Nutzerentscheidung (D-05/D-06): eine
**persistierte** Netto-Punktsumme pro `member_id`, die **transaktional gemeinsam** mit jeder
Ledger-Buchung fortgeschrieben wird, und eine Anzeige-Abfrage, die **nur** diesen gespeicherten
Wert liest. Der Code-Seam-Audit (Frage 1 im Auftrag) ergab: **alle** Schreibpfade — Review-Credits
(`review_service.go`), Release-Review-Contribution (`release_review_decision.go`),
Release-Rollen-Arbeit (`release_crew_service.go`) und Projekttext-Erstcredit
(`project_note_credit_service.go`) — laufen ausnahmslos über `PointService.CreditInTx` /
`ReverseInTx`, die ihrerseits ausnahmslos `PointLedgerRepository.InsertAward` /
`InsertReversal` aufrufen. Es gibt **keinen** zweiten Schreibpfad und **kein** direktes
`INSERT INTO point_ledger_entries` außerhalb dieser einen Repository-Datei (durch Migrationstests
verifiziert). Das bedeutet: **ein einziger DB-seitiger `AFTER INSERT`-Trigger auf
`point_ledger_entries`** deckt jeden bestehenden und jeden zukünftigen Award/Reversal-Schreibpfad
ab, ohne dass ein einziger Go-Aufrufer angefasst werden muss.

Wichtiger, hart belegter Fund: Zwei bestehende Boundary-Tests
(`point_service_boundary_test.go`, `review_service_boundary_test.go`) verbieten explizit die
Token `"ranking"` und `"member_" + "points"` in `point_service.go`, `point_ledger_repository.go`,
`point_rules_repository.go`, `review_service.go` und den zugehörigen Review-Repositories. Diese
Dateien dürfen von Phase 109 **nicht verändert** werden — die Fortschreibungslogik gehört
architektonisch zwingend in eine **neue** Migration und eine **neue**, reine Lese-Repository-Datei.
Das entscheidet Frage 2 des Auftrags bereits eindeutig zugunsten des DB-Trigger-Ansatzes: ein
service-seitiges Increment hätte diese Dateien anfassen müssen und wäre durch die bestehenden
Boundary-Tests sofort rot geworden.

Da `ON CONFLICT (idempotency_key) DO NOTHING` in `InsertAward` und die partielle
`ON CONFLICT DO NOTHING`-Semantik in `InsertReversal` bereits dafür sorgen, dass bei einem Retry
**keine neue Zeile** physisch eingefügt wird, feuert ein `AFTER INSERT ROW`-Trigger niemals für
einen Duplikat-Versuch — die Summe kann durch Retries strukturell nicht doppelt zählen. Das
Netto-Vorzeichen liegt bereits in `point_value` (positiv bei Award, negativ bei Reversal), sodass
ein einziger, unifizierter Trigger für beide `entry_kind`-Werte reicht: `SUM`-Inkrement per
`INSERT ... ON CONFLICT (member_id) DO UPDATE SET total_points = total_points + NEW.point_value`.

**Primary recommendation:** Neue Migration (`0139_*`) mit Tabelle `member_point_totals
(member_id PK, total_points BIGINT, updated_at)` plus einem einzigen `AFTER INSERT ON
point_ledger_entries FOR EACH ROW`-Trigger, der die Summe upsertet. Ein neues, reines
Lese-Repository (`member_point_totals_repository.go`, keine Schreibmethoden) liefert die
absteigend sortierte, seitenweise Liste über `SELECT ... FROM member_point_totals JOIN members
... ORDER BY total_points DESC, member_id ASC`. Ein dünner GET-Handler + Route +
OpenAPI-Eintrag rundet es ab. `point_service.go`, `point_ledger_repository.go`,
`review_service.go` und alle Review-Repositories bleiben **byte-identisch** unverändert.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Persistierte Summenfortschreibung bei jeder Ledger-Buchung | Database / Storage (Trigger) | — | D-06 verlangt Transaktionsgleichheit mit dem Ledger-Write; ein `AFTER INSERT`-Trigger auf derselben Tabelle ist per Definition in derselben Transaktion und deckt jeden heutigen und künftigen Go-Aufrufer ab, ohne Service-Code zu koppeln |
| Lesen/Sortieren der Rangliste | API / Backend | Database / Storage | Reine `SELECT ... ORDER BY total_points DESC` gegen die bereits materialisierte Tabelle; kein Laufzeit-`SUM` (D-05) |
| Anzeige der Rangliste (UI) | — (out of scope) | — | Explizit Phase 110 (deferred); Phase 109 liefert nur die Backend-Grundlage |
| Punktevergabe/-storno selbst | API / Backend (bestehend) | Database / Storage (Ledger-Validierungstrigger) | Unverändert aus Phase 106/108; Phase 109 bucht keine neuen Punkte (D-02) |

## Standard Stack

Keine neuen externen Abhängigkeiten. Die Phase nutzt ausschließlich bereits vorhandene
Bausteine des Projekts:

### Core
| Baustein | Version/Fundstelle | Zweck | Warum Standard hier |
|---------|---------|---------|--------------|
| PostgreSQL Trigger/Funktion (plpgsql) | Postgres 16 (bestehende Docker-Compose-Version) `[VERIFIED: docker-compose.yml]` | Transaktionale Fortschreibung der Summe bei jedem Ledger-Insert | Bereits etabliertes Muster im selben Migrationsfile (`0131_member_point_foundation.up.sql`) für `validate_point_ledger_insert` / `guard_point_ledger_mutation` |
| `github.com/jackc/pgx/v5` / `pgxpool` | bereits in `go.mod` `[VERIFIED: backend/go.mod]` | DB-Zugriff für das neue Lese-Repository | Einziger DB-Treiber im Projekt, in jedem bestehenden Repository verwendet |
| Gin (`github.com/gin-gonic/gin`) | bereits in `go.mod` `[VERIFIED: backend/go.mod]` | HTTP-Handler für den neuen GET-Endpunkt | Einziges HTTP-Framework im Projekt |

### Supporting
Keine weiteren Pakete nötig. `strconv`, `context`, `fmt` aus der Standardbibliothek genügen für
Repository und Handler (analog zu `contributions_public_handler.go`).

### Alternatives Considered
| Statt | Könnte man nehmen | Tradeoff |
|------------|-----------|----------|
| DB-Trigger (`AFTER INSERT`) | Service-seitiges Increment in `PointService.CreditInTx`/`ReverseInTx` | Verboten durch bestehende Boundary-Tests (`ranking`/`member_points`-Token-Verbot in `point_service.go`); zusätzlich müsste jeder der 4 Aufrufer korrekt zwischen "frischer Insert" und "Retry-Replay" unterscheiden — der Trigger bekommt das strukturell geschenkt, weil er nur bei echtem Row-Insert feuert |
| Persistierte Summe (D-05, gesetzt) | Live `SUM(point_value) GROUP BY member_id` zur Anzeigezeit | Explizit vom Nutzer überstimmt (D-05); wäre bei wenigen hundert Membern performant genug gewesen, ist aber nicht die getroffene Entscheidung |
| Eine Tabelle für alle Member (gewählt) | Materialized View mit `REFRESH` | Materialized View wäre nicht "bei jeder Buchung fortgeschrieben", sondern nur bei explizitem Refresh — verletzt D-06 direkt |

**Installation:** Keine neuen Pakete. Nur eine neue SQL-Migration und zwei neue Go-Dateien.

**Package Legitimacy Audit:** Entfällt — Phase 109 installiert keine externen Pakete. `slopcheck`
wurde daher nicht ausgeführt; es gibt nichts zu prüfen.

## Architecture Patterns

### System Architecture Diagram

```
                    ┌──────────────────────────────────────────────────────────┐
                    │  Bestehende Phase-106/107/108-Schreibpfade (UNVERÄNDERT)  │
                    │                                                          │
  review_service.go │  release_review_decision.go │ release_crew_service.go   │ project_note_credit_service.go
        │           │            │                │        │                 │        │
        └───────────┴────────────┴────────────────┴────────┴─────────────────┴────────┘
                                          │
                                          ▼
                         PointService.CreditInTx / ReverseInTx
                          (point_service.go — NICHT ANFASSEN)
                                          │
                                          ▼
                PointLedgerRepository.InsertAward / InsertReversal
                     (point_ledger_repository.go — NICHT ANFASSEN)
                                          │
                                          ▼
                    INSERT INTO point_ledger_entries (echte Zeile,
                    ON CONFLICT DO NOTHING bei Retry → kein Insert, kein Trigger-Feuer)
                                          │
                              ┌───────────┴────────────┐
                              │  BEFORE INSERT Trigger  │  (Phase 106, unverändert:
                              │  validate_point_ledger_ │   Snapshot-Konsistenz)
                              │  insert                 │
                              └───────────┬────────────┘
                                          │ Zeile tatsächlich eingefügt
                                          ▼
                      ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
                      ┃  NEU (Phase 109): AFTER INSERT ROW Trigger    ┃
                      ┃  apply_point_ledger_entry_to_member_total()   ┃
                      ┃  → UPSERT member_point_totals.total_points   ┃
                      ┃    += NEW.point_value (Vorzeichen bereits     ┃
                      ┃    korrekt: Award +, Reversal −)              ┃
                      ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                                          │ (dieselbe DB-Transaktion, D-06 erfüllt)
                                          ▼
                          member_point_totals (member_id PK, total_points)
                                          │
                                          ▼ (nur lesend, kein Runtime-SUM — D-05)
                    NEU: MemberPointTotalsRepository.ListRanking()
                    SELECT ... ORDER BY total_points DESC, member_id ASC
                    LIMIT/OFFSET (Seiten-Pagination, analog member_archive_repository.go)
                                          │
                                          ▼
                    NEU: dünner GET-Handler → GET /api/v1/... (Route-Name: siehe Pitfall 3)
                                          │
                                          ▼
                          Konsument: Phase-110-UI/Badges (deferred, nicht Teil von 109)
```

### Recommended Project Structure
```
database/migrations/
├── 0139_member_point_totals.up.sql     # NEU: Tabelle + AFTER-INSERT-Trigger + Guard-Trigger
├── 0139_member_point_totals.down.sql   # NEU: symmetrischer Rückbau

backend/internal/repository/
├── point_ledger_repository.go          # UNVERÄNDERT (Boundary-Test-geschützt)
├── point_service.go … (services/)      # UNVERÄNDERT (Boundary-Test-geschützt)
├── member_point_totals_repository.go   # NEU: reines Lese-Repository (SELECT only)

backend/internal/handlers/
├── member_point_totals_handler.go      # NEU: ein GET-Handler, analog contributions_public_handler.go

backend/internal/migrations/
├── phase109_member_point_totals_test.go # NEU: Up/Down/Idempotenz/Contract-Tests analog phase106_member_points_test.go

backend/internal/repository/
├── member_point_totals_repository_test.go # NEU: Concurrency-Test analog point_ledger_repository_test.go
```

### Pattern 1: AFTER INSERT Trigger als einziger Schreibpfad für die aggregierte Summe
**Was:** Ein `AFTER INSERT ROW`-Trigger auf `point_ledger_entries`, der die Summe transaktional
fortschreibt. Kein Go-Code schreibt jemals direkt in `member_point_totals`.
**Wann verwenden:** Immer wenn eine append-only-Quelle bereits einen einzigen physischen
Insert-Punkt hat und eine abgeleitete, materialisierte Summe garantiert konsistent bleiben muss —
exakt der hier vorliegende Fall.
**Beispiel (Ableitung aus bestehendem Migrationsstil, `0131_member_point_foundation.up.sql`):**
```sql
-- Quelle: database/migrations/0139_member_point_totals.up.sql (neu, Stil aus 0131 übernommen)
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
Die `INSERT ... ON CONFLICT (member_id) DO UPDATE` nimmt implizit eine Zeilensperre auf
`member_point_totals` für den betroffenen `member_id` — parallele Buchungen für denselben Member
serialisieren sich automatisch über diese Zeile; parallele Buchungen für unterschiedliche Member
blockieren sich nicht gegenseitig.

### Pattern 2: Guard-Trigger gegen direkte Anwendungs-Writes (empfohlen, optional)
**Was:** Ein zusätzlicher `BEFORE INSERT OR UPDATE OR DELETE`-Trigger auf `member_point_totals`,
der jede Mutation außerhalb von `pg_trigger_depth() > 0` (also außerhalb des eigenen
Ledger-Triggers) ablehnt.
**Wann verwenden:** Passt zum bestehenden Codestil (`guard_point_ledger_mutation` nutzt exakt
dasselbe `pg_trigger_depth()`-Muster in `0131_member_point_foundation.up.sql`) und verhindert,
dass ein späterer Admin-Fix oder ein Bugfix versehentlich die Summe direkt schreibt und dadurch
von D-06 abweicht.
**Beispiel (Exception-Text bewusst Englisch, analog zum bestehenden
`guard_point_ledger_mutation`-Text `'point ledger is append-only'` aus 0131 — DB-Guard-Meldungen in
diesem Projekt sind konsequent Englisch gehalten, was die CLAUDE.md-Umlaut-Pflicht für deutsche
user-facing Strings sauber umgeht; kein deutscher Text mit ASCII-Ersetzung wie "ausschliesslich"
verwenden):**
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

CREATE TRIGGER member_point_totals_guard_direct_write
BEFORE INSERT OR UPDATE OR DELETE ON member_point_totals
FOR EACH ROW EXECUTE FUNCTION guard_member_point_totals_mutation();
```

### Pattern 3: Seitenweise Lese-Query nach bestehendem Muster
**Was:** Offset-Pagination mit fester Seitengröße und separatem `COUNT`, wie in
`member_archive_repository.go` (`SearchMembers`) etabliert — kein neues Cursor-Pattern nötig, weil
es hier keine unendliche Liste, sondern eine begrenzte Member-Menge ist.
**Beispiel:**
```go
// Quelle: Stil abgeleitet aus backend/internal/repository/member_archive_repository.go
const memberRankingPageSize = 50

func (r *MemberPointTotalsRepository) ListRanking(ctx context.Context, page int) ([]MemberPointRankingRow, int, error) {
    if page < 1 {
        page = 1
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
    // ... scan analog zu member_archive_repository.go
}
```
`memberDisplayExpr` und `memberSlugExpr` sind bereits projektweit geteilte Konstanten
(`backend/internal/repository/anime_contributions_public_repository.go:14,18`) und werden von
sechs bestehenden Repositories wiederverwendet — für die Rangliste dieselben nutzen statt eine
neue Display-Name-Ableitung zu erfinden.

`MemberPointRankingRow` selbst braucht explizite, snake_case JSON-Struct-Tags (`json:"member_id"`,
`json:"display_name"`, `json:"slug"`, `json:"total_points"`), analog `ArchiveMemberRow` in
`member_archive_repository.go` und den Struct-Tags in `anime_contributions_public_repository.go` —
ohne diese Tags würde `encoding/json` beim späteren `c.JSON`-Aufruf im Handler (Plan 109-03)
PascalCase-Feldnamen erzeugen und den snake_case-Contract aus OpenAPI/Frontend brechen.

### Anti-Patterns to Avoid
- **Laufzeit-`SUM(point_value) GROUP BY member_id` bei jeder Ranglisten-Abfrage:** Explizit durch
  D-05 ausgeschlossen ("Ausdrücklicher Wunsch des Nutzers, überstimmt die vorher an den Builder
  delegierte 'live vs. Aggregat'-Wahl"). Nicht implementieren, auch nicht als vermeintliche
  Übergangslösung.
- **Fortschreibung in `PointService.CreditInTx`/`ReverseInTx` statt im Trigger:** Würde
  `point_service.go` anfassen und den bestehenden Boundary-Test (`point_service_boundary_test.go`,
  verbietet Token `"ranking"`) sofort brechen. Auch architektonisch schlechter: vier Aufrufer statt
  eines einzigen DB-Objekts müssten korrekt bleiben.
- **Materialized View statt Tabelle+Trigger:** Erfüllt "bei jeder Buchung fortgeschrieben" nicht,
  weil ein Refresh nötig wäre.
- **Neue eigene Display-Name-/Slug-Ableitung:** `memberDisplayExpr`/`memberSlugExpr` bereits
  sechsfach im Projekt wiederverwendet; eine siebte, abweichende Implementierung wäre Slop.

## Don't Hand-Roll

| Problem | Nicht selbst bauen | Stattdessen verwenden | Warum |
|---------|-------------|--------------|--------|
| Konsistente Fortschreibung einer Summe über verteilte Go-Aufrufer | Ein "sync"-Job, der periodisch neu summiert, oder Increment-Aufrufe in jedem der vier Service-Call-Sites | Ein einziger `AFTER INSERT`-DB-Trigger auf `point_ledger_entries` | Ein Trigger ist per Definition transaktionsgleich mit dem Insert (D-06) und deckt jeden zukünftigen fünften Call-Site automatisch mit ab, ohne Codeänderung |
| Anzeigename/Slug für Member | Eigene `COALESCE(display_name, nickname)`-Formel neu schreiben | `memberDisplayExpr`/`memberSlugExpr` (bestehende Konstanten) | Bereits 6× im Projekt geteilt; Abweichung würde zu inkonsistenten Anzeigenamen zwischen Rangliste und bestehenden Member-Oberflächen führen |
| Seitenweise Listen-Abfrage | Neues Cursor-/Keyset-Pagination-Schema erfinden | Offset+COUNT-Muster aus `member_archive_repository.go` | Für eine begrenzte, nicht "endlos wachsende" Member-Menge ist Offset-Pagination hier das im Projekt bereits etablierte, einfachere Muster |

**Key insight:** Die eigentliche Arbeit dieser Phase ist *Disziplin*, nicht neue Mechanik — alles
Nötige (Ledger-Schema, PointService, Trigger-Stil, Display-Name-Ableitung, Pagination-Stil,
Migrationstest-Stil) existiert bereits im Projekt. Die Aufgabe ist, exakt einen neuen,
gut isolierten Baustein hinzuzufügen, ohne die bestehenden vier Schreibpfade oder die
Boundary-geschützten Dateien zu berühren.

## Common Pitfalls

### Pitfall 1: Service-seitiges Increment bricht bestehende Boundary-Tests
**Was schiefgeht:** Ein Increment-Aufruf wird in `PointService.CreditInTx`/`ReverseInTx` (oder in
`review_service.go`) eingebaut, weil das auf den ersten Blick näher am "Punktebuch" liegt.
**Warum es passiert:** Diese Dateien sind die naheliegendste Stelle, wenn man nicht weiß, dass es
bereits einen expliziten Architektur-Wächter dagegen gibt.
**Wie vermeiden:** `point_service_boundary_test.go` verbietet das Token `"ranking"` in
`point_service.go`, `point_rules_repository.go`, `point_ledger_repository.go` sowie in
`database/migrations/0131_member_point_foundation.up.sql`/`.down.sql`.
`review_service_boundary_test.go` verbietet zusätzlich `"ranking"` **und** `"member_" + "points"`
in `review_service.go` und den vier Review-Repositories. Jede Fortschreibungslogik gehört in eine
**neue** Migration und **neue** Go-Dateien.
**Warning signs:** `go test ./backend/internal/services/...` schlägt mit
`"contains forbidden Phase-106 coupling"` bzw. `"contains forbidden Phase-107 coupling"` fehl.

### Pitfall 2: Trigger feuert für Retry-Zeilen und zählt doppelt
**Was schiefgeht:** Ein naiver `AFTER INSERT`-Trigger, der nicht bedenkt, dass
`InsertAward`/`InsertReversal` bei einem Idempotenz-Konflikt (`ON CONFLICT DO NOTHING`) **keine**
neue physische Zeile erzeugen — vorausgesetzt, der Trigger wird korrekt als `AFTER INSERT`
(nicht `INSTEAD OF`) definiert und der Conflict-Skip verhindert das eigentliche Row-Insert-Event.
**Warum es passiert:** Vorstellung, man müsse im Trigger selbst nochmal auf Duplikate prüfen.
**Wie vermeiden:** Nichts extra prüfen — Postgres feuert `AFTER INSERT ROW`-Trigger **nur** für
tatsächlich eingefügte Zeilen. Ein `ON CONFLICT DO NOTHING`-Skip erzeugt kein Insert-Event und
damit kein Trigger-Feuern. Das ist bereits die korrekte, minimale Lösung — durch einen
Concurrency-Test (analog `TestPointLedgerPostgresConcurrentAward`) verifizieren: zwei parallele
identische Award-Requests dürfen die Summe nur einmal erhöhen.
**Warning signs:** Concurrency-Test zeigt `total_points` doppelt so hoch wie erwartet nach zwei
parallelen identischen Requests.

### Pitfall 3: Gin-Routenkonflikt zwischen neuem Endpunkt und bestehendem `/members/:slug`
**Was schiefgeht:** `v1.GET("/members/:slug", ...)` ist bereits in `backend/cmd/server/main.go`
(Zeile 352) registriert. Ein naiver neuer Endpunkt wie `/members/ranking` würde mit diesem
Parameter-Segment auf derselben Pfadtiefe kollidieren.
**Warum es passiert:** "Rangliste" klingt nach einem natürlichen Unterpfad von `/members`.
**Wie vermeiden:** Laut `.planning/STATE.md` (Phase 35: "`/reorder` registriert vor `/:relationId`
für korrektes Gin literal-before-param-Matching") hat dieses Team bereits einmal ein
Registrierungsreihenfolge-Problem in Gin dokumentiert und gelöst. Sicherster Weg: **kein**
Unterpfad von `/members/:slug`, sondern ein eigener Top-Level-Pfad (z. B.
`/api/v1/member-point-ranking` oder `/api/v1/leaderboard/members`), der mit keinem bestehenden
Parameter-Segment kollidieren kann. Exakte Benennung ist laut CONTEXT.md Bauentscheidung
("Exakte Endpunkt-/DTO-Benennung ... solange kein zweites Punktebuch ... entsteht").
**Warning signs:** Backend-Start panict beim Router-Setup mit einer Gin-Routenkonflikt-Meldung.

### Pitfall 4: Migrationsnummer-Kollision
**Was schiefgeht:** Eine parallel laufende Phase/Agent belegt `0139` zuerst (das Projekt arbeitet
laut CLAUDE.md mit mehreren GSD-Agenten auf `main` gleichzeitig; siehe
`.planning/STATE.md`-Historie z. B. "Migrationsnummer 0091 statt geplanter 0090").
**Warum es passiert:** Keine zentrale Nummernvergabe; Nummer wird beim Planen statisch gewählt.
**Wie vermeiden:** Unmittelbar vor dem Erstellen der Migration erneut `ls database/migrations |
sort | tail` prüfen und ggf. auf die nächste freie Nummer ausweichen (Inhalt/Form bleiben
unverändert, nur die Nummer verschiebt sich) — exakt das bereits dokumentierte Vorgehen aus
Phase 67.
**Warning signs:** `up`-Migration schlägt mit "relation already exists" oder Dateinamenkonflikt
beim Merge fehl.

### Pitfall 5: Instabile Sortierung bei Punktgleichstand
**Was schiefgeht:** `ORDER BY total_points DESC` ohne Tie-Break liefert bei Punktgleichstand eine
von der Postgres-internen Zeilenreihenfolge abhängige, nicht deterministische Reihenfolge —
zwischen zwei Seitenaufrufen können Mitglieder doppelt erscheinen oder fehlen.
**Warum es passiert:** Naive Übernahme von `ORDER BY total_points DESC` ohne Sekundärschlüssel.
**Wie vermeiden:** Immer `ORDER BY total_points DESC, member_id ASC` (oder ein anderer stabiler
Tie-Break) verwenden — analog zur bestehenden Konvention `ORDER BY m.id ASC` als Sekundärkriterium
in `member_archive_repository.go`.
**Warning signs:** Pagination-Tests mit gleich gewichteten Test-Membern zeigen abweichende
Ergebnisse bei wiederholten Abfragen derselben Seite.

## Code Examples

### Migrationstest-Template (Contract-Tests für Up/Down)
```go
// Quelle: Stil aus backend/internal/migrations/phase106_member_points_test.go
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

### Live-Concurrency-Test-Template (echtes Postgres, zwei parallele Awards)
```go
// Quelle: Stil aus backend/internal/repository/point_ledger_repository_test.go (TestPointLedgerPostgresConcurrentAward)
func TestMemberPointTotalsPostgresConcurrentAwardsSumCorrectly(t *testing.T) {
    pool := openPointLedgerPostgres(t) // gleiche Fixture, gleiche Schema-Isolation
    ledger := NewPointLedgerRepository(pool)
    memberID := seedTestMember(t, pool)

    start := make(chan struct{})
    var ready sync.WaitGroup
    ready.Add(2)
    for i := range 2 {
        go func(n int) {
            ready.Done()
            <-start
            _, _ = ledger.InsertAward(context.Background(), postgresAwardInputForMember(memberID, fmt.Sprintf("award:concurrent:%d", n)))
        }(i)
    }
    ready.Wait()
    close(start)
    // ... beide Goroutinen joinen (WaitGroup/Channel) ...

    var total int64
    require.NoError(t, pool.QueryRow(context.Background(),
        `SELECT total_points FROM member_point_totals WHERE member_id = $1`, memberID).Scan(&total))
    require.Equal(t, int64(2*testAwardPointValue), total, "zwei unterschiedliche Awards müssen sich addieren, kein Lost Update")
}
```

### Handler-Template (analog `contributions_public_handler.go`)
```go
// GetMemberPointRanking handles GET /api/v1/<gewählter-pfad>
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

## State of the Art

| Alter Ansatz (in diesem Projekt bislang üblich für Zähler) | Aktueller Ansatz für Phase 109 | Wann geändert | Auswirkung |
|--------------|------------------|---------------|--------|
| `BEFORE`-Trigger für Validierung/Immutabilität (0131, 0134) | `AFTER INSERT`-Trigger für aggregierende Fortschreibung | Neu in Phase 109 | Erstes Vorkommen eines "Aggregat-Trigger"-Musters im Projekt; kein Bruch mit bestehendem Stil, sondern konsequente Erweiterung (gleiche `plpgsql`/`FOR EACH ROW`-Bauweise) |
| Live-Aggregation zur Anzeigezeit (bisher keine Punktesumme existierte) | Persistierte, transaktional geführte Summe | Nutzerentscheidung D-05 (2026-07-26) | Anzeige-Query wird trivial (`SELECT`), Konsistenzverantwortung liegt vollständig bei der DB |

**Deprecated/outdated:** Nicht zutreffend — es gab vor Phase 109 keine Ranglisten-/Summenlogik zu
ersetzen.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Der neue Lese-Endpunkt sollte öffentlich (kein Auth-Zwang) sein, analog zu `GET /api/v1/members/:slug/contributions` (`authOptionalMiddleware`/keine Middleware) | Security Domain, Architecture Patterns | Falls der Nutzer die Rangliste als eingeloggt-only wünscht, müsste der Handler nachträglich mit `authMiddleware` versehen werden — geringer Umbau, aber ein API-Contract-Bruch, falls bereits ohne Auth veröffentlicht |
| A2 | Members ohne jemals gebuchte Punkte sollen **nicht** mit `total_points=0` in der Rangliste erscheinen (INNER JOIN statt LEFT JOIN von `members`) | Architecture Patterns Pattern 3, Open Questions | Falls Phase 110 eine vollständige Member-Liste inkl. 0-Punkte-Mitgliedern erwartet, muss die Query auf `LEFT JOIN` + `COALESCE(total_points, 0)` umgestellt werden |
| A3 | Exakter Tabellen-/Spaltenname `member_point_totals(member_id, total_points, updated_at)` ist nur Vorschlag, keine harte Vorgabe (CONTEXT.md erlaubt hier Bau-Diskretion) | Architecture Patterns | Kein Risiko — CONTEXT.md erlaubt ausdrücklich freie Benennung, solange D-05/D-06 gewahrt bleiben |
| A4 | Nächste freie Migrationsnummer ist `0139` (Stand dieser Recherche, höchste vorhandene: `0138_project_note_first_author_lifecycle`) | Common Pitfalls (Pitfall 4) | Bei parallelem GSD-Lauf könnte die Nummer bereits belegt sein — unmittelbar vor Planungs-/Implementierungsbeginn erneut prüfen |

## Open Questions (RESOLVED)

1. **Sollen Members ohne jemals gebuchte Punkte in der Rangliste erscheinen (mit 0 Punkten)? (RESOLVED)**
   - Was wir wissen: D-01 definiert die Rangliste als "Netto-Punktsumme pro Member, absteigend
     sortiert"; das mentale Modell des Nutzers ("am Ende muss doch einfach das Total an Punkten
     angezeigt werden") deutet eher auf eine kompakte Liste tatsächlicher Verdiener hin.
   - Was unklar war: Ob Phase 110 (Ranglisten-UI) eine vollständige Mitgliederliste inkl.
     0-Punkte-Zeilen braucht, oder ob eine Liste nur der Mitglieder mit `member_point_totals`-Zeile
     ausreicht.
   - **RESOLVED in Plan 109-02 (Task 2):** `INNER JOIN member_point_totals mpt JOIN members m` —
     nur Mitglieder mit mindestens einer Buchung erscheinen in der Rangliste. Schemakompatibel
     verlustfrei zu `LEFT JOIN + COALESCE(total_points, 0)` erweiterbar, falls Phase 110 später eine
     vollständige 0-Punkte-Liste braucht.

2. **Braucht der neue Endpunkt Authentifizierung? (RESOLVED)**
   - Was wir wissen: Vergleichbare bestehende Lese-Endpunkte (`GET /members/:slug/contributions`,
     `GET /anime/:id/contributions`) sind unauthentifiziert öffentlich; Member-Anzeigenamen sind
     bereits über diese Endpunkte öffentlich einsehbar.
   - Was unklar war: Ob Punktesummen (potenziell sensibler als reine Rollen-Contributions) bewusst
     hinter Login gehalten werden sollen, bis Phase 110 eine echte UI-Entscheidung trifft.
   - **RESOLVED in Plan 109-03 (Task 1):** Endpunkt ist unauthentifiziert (kein `authMiddleware`),
     analog zu `/archiv` und `/members/:slug/contributions`. Phase 110 kann bei Bedarf eine
     Sichtbarkeitsschranke nachziehen.

3. **Exakter Routenname/Pfad des neuen Endpunkts? (RESOLVED)**
   - Was wir wissen: CONTEXT.md gibt hier explizit Bau-Diskretion frei ("Exakte
     Endpunkt-/DTO-Benennung ... solange kein zweites Punktebuch ... entsteht").
   - Was unklar war: Der endgültige Name (z. B. `member-point-ranking` vs. `leaderboard`).
   - **RESOLVED in Plan 109-03 (Task 1):** Route `/api/v1/member-point-ranking`, registriert in
     `backend/cmd/server/main.go` (Pitfall 3 beachtet — kein Unterpfad von `/members/:slug`).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL (Docker Compose) | Migration + Trigger + Repository-Tests | Erwartet vorhanden (`docker-compose.yml` definiert Postgres 16 Service) `[ASSUMED — nicht in dieser Session live geprüft]` | 16 (laut STATE.md/CLAUDE.md-Konvention) | — (harte Abhängigkeit für Migrationstests) |
| Env `TEAM4S_PHASE106_TEST_DSN` (oder analoges `TEAM4S_PHASE109_TEST_DSN`) | Live-Migrations-/Concurrency-Tests (`testsupport.OpenPhase106Postgres`-Muster) | Nicht in dieser Session geprüft `[ASSUMED]` | — | Ohne gesetzte DSN überspringen die Postgres-Live-Tests (bestehendes Verhalten in `testsupport/phase106_postgres.go`); reine SQL-String-Contract-Tests (`requireSQLContains`) laufen trotzdem ohne DB |
| Go 1.25 Toolchain | Kompilieren/Testen neuer Repository-/Handler-Dateien | Erwartet vorhanden (`backend/go.mod`) `[VERIFIED: backend/go.mod referenziert in CLAUDE.md]` | 1.25 | — |

**Missing dependencies with no fallback:** Keine — Docker-Postgres wird bereits für Phase
106/108-Tests vorausgesetzt und ist damit projektweite Grundvoraussetzung, keine neue Phase-109-
spezifische Anforderung.

**Missing dependencies with fallback:** Fehlt die Test-DSN-Umgebungsvariable, laufen die reinen
String-/Contract-Tests trotzdem; nur die Live-Up/Down/Concurrency-Tests werden übersprungen
(bestehendes, akzeptiertes Projektverhalten).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Go `testing` + `stretchr/testify` (`require`) |
| Config file | keine zentrale Config; Test-DSN über Env `TEAM4S_PHASE106_TEST_DSN`-artige Variable pro Phase |
| Quick run command | `go test ./backend/internal/migrations/... -run TestPhase109 -v` |
| Full suite command | `go test ./backend/... -v` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-05/D-06 (persistiert, transaktional konsistent) | Award-Insert erhöht `member_point_totals.total_points` in derselben Transaktion; Reversal senkt sie | integration (echtes Postgres) | `go test ./backend/internal/repository/... -run TestMemberPointTotalsPostgres -v` | ❌ Wave 0 |
| D-06 (kein Doppelzählen bei Retry/Parallelität) | Zwei parallele identische Award-Requests erhöhen die Summe nur einmal | integration (Concurrency, echtes Postgres) | `go test ./backend/internal/repository/... -run TestMemberPointTotalsPostgresConcurrent -v` | ❌ Wave 0 |
| D-01 (absteigend sortierte Netto-Summe) | `ListRanking` liefert Members absteigend nach `total_points`, stabiler Tie-Break | unit/integration | `go test ./backend/internal/repository/... -run TestMemberPointTotalsRanking -v` | ❌ Wave 0 |
| Boundary-Schutz (keine Kopplung an Phase-106/107-Dateien) | `point_service.go`/`point_ledger_repository.go`/`review_service.go` bleiben unverändert und bestehen weiterhin ihre bestehenden Boundary-Tests | regression | `go test ./backend/internal/services/... -run TestPointServicePhase106Boundary -v` und `-run TestPhase107ReviewServiceBoundary` | ✅ bereits vorhanden |
| Migrations-Contract (Up/Down/Idempotenz) | Neue Migration enthält Tabelle+Trigger in korrekter Reihenfolge; Down räumt symmetrisch auf; Up-Down-Up ist idempotent | migration test | `go test ./backend/internal/migrations/... -run TestPhase109Migration -v` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `go test ./backend/internal/migrations/... ./backend/internal/repository/... -run TestPhase109 -v`
- **Per wave merge:** `go test ./backend/... -v`
- **Phase gate:** Vollständige Suite grün vor `/gsd:verify-work`, inklusive der bestehenden
  `TestPointServicePhase106Boundary` und `TestPhase107ReviewServiceBoundary` (Regressionsschutz).

### Wave 0 Gaps
- [ ] `backend/internal/migrations/phase109_member_point_totals_test.go` — deckt D-05/D-06 Migrations-Contract
- [ ] `backend/internal/repository/member_point_totals_repository_test.go` — deckt Concurrency (Pitfall 2), Ranking-Sortierung (Pitfall 5) und den snake_case JSON-Feldnamen-Contract (TestMemberPointRankingRowJSONFieldNames)
- [ ] Kein neues Test-Framework nötig — bestehendes `testsupport`-Paket direkt wiederverwendbar

*(Framework bereits vollständig vorhanden — keine Installation nötig)*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | nein | Reiner GET-Lese-Endpunkt ohne Statusänderung; siehe Open Question 2 zur Auth-Frage |
| V3 Session Management | nein | Kein neuer Session-State |
| V4 Access Control | ja (schwach) | Falls öffentlich (empfohlen, siehe A1): keine sensiblen Felder ausliefern — nur `member_id`, Anzeigename/Slug, `total_points`. Kein `actor_app_user_id`, keine internen Ledger-Details (D-04 verbietet ohnehin Aufschlüsselung) |
| V5 Input Validation | ja | `page`-Query-Parameter muss Bounds-geprüft werden (analog `member_archive_repository.go`: `page < 1 → 1`, `page > 1000 → 1000`), um pathologische `OFFSET`-Werte zu verhindern |
| V6 Cryptography | nein | Keine neuen Secrets/Krypto-Operationen |

### Known Threat Patterns for {Go/Gin/Postgres Read-Endpoint}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL Injection über `page`/Sortierparameter | Tampering | Ausschließlich `pgx`-Parameter (`$1`, `$2`) für `LIMIT`/`OFFSET`; keine String-Interpolation von Nutzereingaben — exakt das bestehende Muster in `member_archive_repository.go` |
| Informationsleck über Anzeigenamen historischer Members ohne Zustimmung | Information Disclosure | Bereits durch `profile_visibility`/`noindex`-Spalten auf `members` und bestehende Sichtbarkeitsfilter in anderen Public-Repositories abgedeckt; die Ranking-Query sollte dieselbe `profile_visibility='public'`-Bedingung erwägen, falls der Endpunkt unauthentifiziert ist (Klärung siehe Open Question 2) |
| Denial of Service durch teure Aggregation pro Request | Denial of Service | Entfällt strukturell durch D-05 — es gibt keine Laufzeit-Aggregation mehr, nur einen indizierten `SELECT` gegen eine Tabelle mit `member_id`-Primärschlüssel |

## Sources

### Primary (HIGH confidence)
- `backend/internal/repository/point_ledger_repository.go` — vollständige Ledger-Schreiblogik, Idempotenz-/Retry-Verhalten
- `backend/internal/services/point_service.go` — einziger Credit/Reverse-Seam
- `backend/internal/services/review_service.go`, `release_review_decision.go`, `release_crew_service.go`, `project_note_credit_service.go` — vollständige Inventur aller vier Aufrufer von `CreditInTx`/`ReverseInTx`
- `backend/internal/services/point_service_boundary_test.go`, `backend/internal/services/review_service_boundary_test.go` — harte Architekturgrenzen (verbotene Tokens), bestimmen die Trigger-vs-Service-Entscheidung
- `database/migrations/0131_member_point_foundation.up.sql`/`.down.sql` — Referenzstil für Trigger/Funktionen/Migrationsaufbau in diesem Projekt
- `backend/internal/migrations/phase106_member_points_test.go` — Referenzstil für Migrations-Contract-Tests
- `backend/internal/repository/point_ledger_repository_test.go` — Referenzstil für Concurrency-Tests mit echtem Postgres
- `backend/internal/repository/member_archive_repository.go` — Referenzstil für Pagination/Display-Name/Slug
- `backend/internal/repository/anime_contributions_public_repository.go` — Fundstelle der geteilten `memberDisplayExpr`/`memberSlugExpr`-Konstanten
- `backend/internal/handlers/contributions_public_handler.go` — Referenzstil für dünne GET-Handler
- `backend/cmd/server/main.go` — Bestehende Routenregistrierung, insbesondere `/members/:slug` (Zeile 352) als Kollisionsrisiko

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` (Phase-35-Eintrag zu Gin-Routenreihenfolge; Phase-67-Eintrag zu
  Migrationsnummer-Kollisionen) — projekteigene, dokumentierte Vorfälle, nicht allgemein
  verifizierte Gin-Dokumentation

### Tertiary (LOW confidence)
- Keine — alle Kernaussagen dieser Recherche stammen direkt aus dem Codebestand dieses Projekts.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - keine neuen externen Abhängigkeiten, alles bereits im Projekt verifiziert vorhanden
- Architecture: HIGH - vollständige Inventur aller Schreibpfade und beider Boundary-Tests direkt im Code gelesen
- Pitfalls: HIGH - alle fünf Pitfalls sind aus tatsächlichem Projektcode/-historie abgeleitet, nicht aus generischem Trainingswissen

**Research date:** 2026-07-27
**Valid until:** Migrationsnummer (Pitfall 4) muss unmittelbar vor Implementierung neu geprüft
werden (parallele GSD-Läufer auf `main`); ansonsten stabil bis zur nächsten strukturellen Änderung
an `point_ledger_entries` oder den Boundary-Tests (kein festes Ablaufdatum, da reine Code-Recherche
ohne externe Bibliotheksversionen).

---

*Phase: 109-ranglisten-und-punkteprojektionen*
*Context gathered: 2026-07-26 · Research gathered: 2026-07-27*
