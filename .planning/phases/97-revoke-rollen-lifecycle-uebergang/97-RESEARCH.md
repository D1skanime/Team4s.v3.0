# Phase 97: Rollen-Lifecycle — historische Rolle-Authoring, Claim-Aktivierung & tagesgenaue Historie – Research

**Researched:** 2026-07-01
**Domain:** Fansub-Gruppen-Rollensystem: DB-Migration (Jahr→Datum), Authoring-Dialog, Claim-Auflösungslogik, aktive-Rollen-Zuweisung, Capability-Abgrenzung
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (aus CONTEXT.md)

### Locked Decisions
- **D-01 (Mehrere historische Rollen):** Eine Person (`members`) kann N historische Rollen haben, je eigener Eintrag in `hist_group_member_roles` mit eigenem Zeitraum. Schema unterstützt das bereits (per-Rolle-Tabelle) — Authoring/UI muss es explizit erlauben.
- **D-02 (Tagesgenaue Daten):** `hist_group_member_roles` erhält Start-/Enddatum als DATE statt `started_year`/`ended_year`. `hist_fansub_group_members` erhält `joined_date`/`left_date` (DATE). Aktive Rollen (`fansub_group_member_roles`, heute nur `created_at`) erhalten ein Tenure-Startdatum (DATE).
- **D-03 (Rolle im Historie-Dialog wählbar):** Dialog „Historisches Mitglied anlegen/bearbeiten" MUSS die historische Rolle(n) direkt wählbar machen — samt tagesgenauem Start-/Enddatum pro Rolle. Ersetzt die reinen Jahr-Felder und integriert die bisher getrennte Rollenauswahl.
- **D-04 (Enddatum-Regel):** Historische Rolle OHNE Enddatum = Person weiterhin aktiv in dieser Rolle. MIT Enddatum = beendet/historisch. Kein separater „Entzug"-Button.
- **D-05 (Claim-Aktivierung):** Beim Identitäts-Claim gilt: historische Rollen OHNE Enddatum → aktive App-Rollen übernehmen; für BEENDETE Rollen weist der Admin neue aktive Rolle zu.
- **D-06 (Aktive Rollen zuweisen):** Der Admin kann einem geclaimten App-User aktive Rollen zuweisen — dedizierte, klar bedienbare Zuweisung.
- **D-07 (Capability nur aktiv):** Historische Zuweisungen tragen KEINE Rechte; keine Änderung am bestehenden `canForContext`-Enforcement nötig.
- **D-08 (Anzeige, UI deferred):** Historische Rollen im Member-Profil anzeigen — Gestaltung NOCH OFFEN, Folge-Phase; für Phase 97 zählt korrekte DB-Abbildung + Datenverfügbarkeit.

### Claude's Discretion
- Konkrete Migrationsmechanik Jahr→DATE (Bestandsdaten-Mapping: Jahr → 1. Januar des Jahres als Fallback).
- Genaue API-/DTO-Formen.
- Wellen-Schnitt beim Planen — empfohlene Aufteilung: Wave A DB-Migration, Wave B Authoring-UI, Wave C Claim-Flow + Zuweisung.

### Deferred Ideas (OUT OF SCOPE)
- Polierte/öffentliche Historie-Timeline-UI (Cookie-Subs-Stil).
- G3 Mobile Member-Management-UI.
- Ende-Automatik-Vorschlag bei Übergabe.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID   | Description                                                                                                                | Research Support                                                                               |
|------|----------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| D-01 | Mehrere historische Rollen pro Person (N Einträge in `hist_group_member_roles`)                                           | Schema-Struktur bestätigt; Authoring-UI muss es explizit freigeben (kein 1:1-Limit heute)     |
| D-02 | Tagesgenaue Start-/Enddaten in `hist_group_member_roles` und `hist_fansub_group_members`; Tenure-Startdatum in aktiven Rollen | Additive Migrationsstrategie ermittelt; `chk_*_years`-Checks müssen bei Bestandsdaten beachtet werden |
| D-03 | Rollen direkt im Mitglied-Dialog wählbar (ersetzt reine YearPicker-Felder)                                                | `GroupHistRoleDialog` + `GroupMemberFormModals` identifiziert; Integration-Strategie geplant  |
| D-04 | Enddatum-Regel: ohne Enddatum = aktiv, mit Enddatum = historisch                                                          | `status`-Spalte entfällt als Statusindikator; Enddatum ist alleiniges Signal                  |
| D-05 | Claim-Aktivierung: `VerifyClaim` → Rollen ohne Enddatum → aktive App-Rollen                                               | `VerifyClaim` in `MemberClaimsRepository` ist Einstiegspunkt; Auflösungslogik ergänzen        |
| D-06 | Aktive Rollen zuweisen über bestehenden `SetRole`-Pfad                                                                    | `SetRole` in `FansubGroupAppMemberRepository` ist wiederverwendbar                            |
| D-07 | Capability nur für aktive Rollen (keine Änderung am Enforcement)                                                          | `canForContext` liest nur `fansub_group_member_roles`; historische Tabelle nicht berührt       |
| D-08 | Korrekte DB-Abbildung + Datenverfügbarkeit für Member-Profil (UI deferred)                                                | Abfrage-Schicht muss DATE-Felder liefern; Frontend-Anzeige folgt späterer Phase               |
</phase_requirements>

---

## Summary

Phase 97 vervollständigt den Rollen-Lebenszyklus in Richtung historisch → aktiv. Die drei Kernbereiche sind: (1) ein DB-Schema-Upgrade von Jahres-Integers auf tagesgenaue DATE-Spalten, (2) die Authoring-UI-Erweiterung im historischen Mitgliedsdialog um Rollenauswahl mit Datumseingabe, und (3) die Claim-Aktivierungslogik, die beim Bestätigen eines Member-Claims historische Rollen ohne Enddatum automatisch in aktive App-Rollen überträgt.

Das bestehende Schema in `hist_group_member_roles` (Migration 0083) trägt `started_year`/`ended_year` als `INT NULL` mit einem `chk_hist_group_member_roles_years`-Check. Die Migration muss additive neue `DATE`-Spalten anlegen, Bestandsdaten per Jahr→`YYYY-01-01`-Mapping füllen, dann die alten INT-Spalten löschen. Parallel erhält `fansub_group_member_roles` eine neue `tenure_started_on DATE`-Spalte (ohne NOT NULL, damit Bestandszeilen ohne Migration leer bleiben können). Die nächste freie Migrationsnummer ist `0114`.

Der Claim-Flow hängt an `MemberClaimsRepository.VerifyClaim` (Go, `backend/internal/repository/member_claims_repository.go` Z. 175). Dort wird nach Claim-Verifikation aktuell nichts an `fansub_group_member_roles` geschrieben. Die Auflösungslogik (historische Rollen ohne Enddatum → aktive Rollen) muss innerhalb dieser Transaktion oder als expliziter Admin-Schritt danach ergänzt werden.

**Primärempfehlung:** Drei klar getrennte Wellen — Wave 1 DB-Migration (0114/0115), Wave 2 Authoring-UI-Erweiterung (Dialog + Backend-DTOs), Wave 3 Claim-Aktivierungslogik + Admin-Zuweisung. D-07 erfordert keine Code-Änderung, nur Verifikation.

---

## Architectural Responsibility Map

| Capability                             | Primary Tier   | Secondary Tier     | Rationale                                                                    |
|----------------------------------------|---------------|--------------------|------------------------------------------------------------------------------|
| DATE-Migration Jahr→Datum              | Database       | Backend            | Schema-Änderung; Backend-DTOs und Go-Typen folgen der DB-Struktur            |
| Historische Rollen authoren (CRUD)     | API / Backend  | Frontend Server    | Schreibpfade in `HistGroupMemberRolesRepository`; UI konsumiert             |
| Authoring-Dialog um Datumseingabe erweitern | Frontend (Client) | — | `GroupHistRoleDialog.tsx` + `GroupMemberFormModals.tsx`; reine UI-Erweiterung |
| Claim-Aktivierungslogik                | API / Backend  | —                  | Gehört in Transaktion beim `VerifyClaim`; kein UI-Trigger möglich            |
| Aktive Rollen zuweisen                 | API / Backend  | Frontend (Client)  | `SetRole` in `FansubGroupAppMemberRepository`; UI steuert Aufruf             |
| Capability-Enforcement (D-07)          | API / Backend  | —                  | `canForContext` in `permissions.go`; keine Änderung nötig                    |
| Tenure-Startdatum in aktiven Rollen     | Database       | Backend            | Neues DATE-Feld in `fansub_group_member_roles`; Backend befüllt bei SetRole  |

---

## Standard Stack

### Core (keine neuen Packages — ausschließlich bestehende)

| Library / Modul                          | Version   | Zweck                              | Warum Standard                                                       |
|------------------------------------------|-----------|------------------------------------|----------------------------------------------------------------------|
| Go `time.Time` / pgx `pgtype.Date`       | Go 1.25   | DATE-Typ in pgx v5 lesen/schreiben | pgx/v5 schon im Stack; `pgtype.Date` oder `time.Time` für DATE-Scan  |
| `github.com/jackc/pgx/v5`                | bestehend | SQL-Queries, Migrationen           | Einziger DB-Treiber im Projekt                                       |
| React 18 / Next.js 16 App Router         | bestehend | Frontend-UI                        | Bestehendes Framework                                                |
| `@/components/ui` (YearPicker, Select, FormField, Modal, Input) | bestehend | Authoring-Dialog                   | Globales Design-System — Pflicht per CLAUDE.md                       |

### Datumsdarstellung im Frontend (kein neues Package)

Da es keinen DatePicker in `@/components/ui` gibt (bestätigt: nur `YearPicker` vorhanden), wird das Datum über ein natives `<input type="date">` INNERHALB eines neuen `@/components/ui`-Primitives (z. B. `DateInput`) oder über `<Input type="date">` mit dem bestehenden `Input`-Primitive bedient.

`<Input type="date">` ist zulässig, da `Input` das globale Primitive ist und `type="date"` ein nativer Input-Typ ist — keine Umgehung des Design-Systems. Das globale UI-System hat keinen eigenständigen DatePicker.

**WICHTIG — CLAUDE.md-Enforcement:** Native `<input type="date">` direkt (ohne das `Input`-Primitive) ist verboten. Immer `<Input type="date" ... />` aus `@/components/ui` verwenden.

### Alternatives Considered

| Statt | Könnte man nutzen | Tradeoff |
|-------|-------------------|----------|
| Additive Migration (neue Spalten, Bestandsdaten füllen, alte löschen) | Direkte ALTER COLUMN mit DEFAULT | ALTER COLUMN auf NOT NULL schlägt fehl wenn NULL-Zeilen existieren; additive Strategie ist sicherer |
| `time.Time` für DATE-Spalten in pgx | `pgtype.Date` | `time.Time` funktioniert für DATE-Spalten in pgx v5 direkt per Scan; `pgtype.Date` nötig nur für nullable DATE |

---

## Package Legitimacy Audit

> Keine neuen externen Packages in dieser Phase. Alle verwendeten Bibliotheken sind im bestehenden Stack.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
Admin-Browser
    |
    | POST /admin/fansubs/:id/group-members         (hist Mitglied anlegen, heute: joined_year/left_year)
    | PATCH /admin/fansubs/:id/group-members/:mid   (bearbeiten)
    | POST /admin/fansubs/:id/group-member-roles    (hist Rolle anlegen, heute: started_year/ended_year)
    | PATCH /admin/fansubs/:id/group-member-roles/:rid
    |
    +---> FansubHistGroupMembersHandler
    |       --> HistGroupMembersRepository        [schreibt hist_fansub_group_members]
    |
    +---> FansubHistGroupMemberRolesHandler
    |       --> HistGroupMemberRolesRepository    [schreibt hist_group_member_roles]
    |
    | POST /admin/fansubs/:id/member-claims/:claimId/verify
    |
    +---> MemberClaimsHandler.VerifyClaim()
            --> MemberClaimsRepository.VerifyClaim()  [setzt claim_status='verified']
            --> [NEU D-05] ResolvePendingRolesToActive()
                           liest hist_group_member_roles WHERE ended_date IS NULL
                           schreibt fansub_group_member_roles (SetRole-Muster)
                           ohne Enddatum → aktive Rolle; mit Enddatum → ignorieren
            |
            +--- [wenn Enddatum vorhanden] Admin weist manuelle aktive Rolle zu
                   POST /admin/fansubs/:id/members/:appUserId/roles
                   --> FansubGroupAppMemberRepository.SetRole()
```

### Recommended Project Structure

Keine neuen Verzeichnisse nötig. Alle Änderungen in bestehenden Dateien und einem neuen Migrations-Paar:

```
database/migrations/
├── 0114_hist_roles_date_migration.up.sql    # hist-Tabellen: INT → DATE
├── 0114_hist_roles_date_migration.down.sql
├── 0115_active_roles_tenure_date.up.sql     # fansub_group_member_roles + tenure_started_on DATE
└── 0115_active_roles_tenure_date.down.sql

backend/internal/repository/
├── hist_group_member_roles_repository.go    # DATE-Typen in Go-Structs anpassen
├── hist_group_members_repository.go         # DATE-Typen in Go-Structs anpassen
├── fansub_group_app_members_repository.go   # SetRole: tenure_started_on befüllen
└── member_claims_repository.go              # VerifyClaim: Claim-Aktivierungslogik (D-05)

backend/internal/handlers/
├── fansub_hist_group_member_roles_handler.go  # DTOs: started_year/ended_year → started_date/ended_date
└── fansub_hist_group_members_handler.go       # DTOs: joined_year/left_year → joined_date/left_date

frontend/src/app/admin/fansubs/[id]/edit/
├── GroupHistRoleDialog.tsx                    # YearPicker → Input type="date"
├── GroupMemberFormModals.tsx                  # YearPicker → Input type="date"
└── GroupMembersTab.tsx                        # ggf. kleine Anpassungen
```

### Pattern 1: Additive DATE-Migration mit Bestandsdaten-Mapping

**Was:** Bestehende INT-Jahresspalten werden nicht direkt geändert, sondern durch neue DATE-Spalten ergänzt, mit Bestandsdaten befüllt, dann die alten Spalten gedroppt.

**Wann:** Immer wenn eine Spalte umbenannt oder ihr Typ geändert wird und Bestandsdaten migriert werden müssen, um FK-Constraints zu erfüllen.

**Beispiel (Migration 0114):**
```sql
-- [VERIFIED: Codebase — db/migrations/0082, 0083, 0112 als Referenz-Muster]
BEGIN;

-- Schritt 1: Neue DATE-Spalten anlegen (nullable, kein Default-Pflicht)
ALTER TABLE hist_group_member_roles
    ADD COLUMN IF NOT EXISTS started_date DATE NULL,
    ADD COLUMN IF NOT EXISTS ended_date   DATE NULL;

-- Schritt 2: Bestandsdaten Jahr → 1. Jan des Jahres mappen
UPDATE hist_group_member_roles
SET started_date = MAKE_DATE(started_year, 1, 1)
WHERE started_year IS NOT NULL;

UPDATE hist_group_member_roles
SET ended_date = MAKE_DATE(ended_year, 1, 1)
WHERE ended_year IS NOT NULL;

-- Schritt 3: Neuen Date-Check anlegen (ersetzt chk_hist_group_member_roles_years)
ALTER TABLE hist_group_member_roles
    DROP CONSTRAINT IF EXISTS chk_hist_group_member_roles_years,
    ADD CONSTRAINT chk_hist_group_member_roles_dates
        CHECK (ended_date IS NULL OR started_date IS NULL OR ended_date >= started_date);

-- Schritt 4: Alte INT-Spalten droppen
ALTER TABLE hist_group_member_roles
    DROP COLUMN IF EXISTS started_year,
    DROP COLUMN IF EXISTS ended_year;

COMMIT;
```

**Analoges Muster für `hist_fansub_group_members` (Migration 0114 im selben File):**
```sql
ALTER TABLE hist_fansub_group_members
    ADD COLUMN IF NOT EXISTS joined_date DATE NULL,
    ADD COLUMN IF NOT EXISTS left_date   DATE NULL;

UPDATE hist_fansub_group_members
SET joined_date = MAKE_DATE(joined_year, 1, 1) WHERE joined_year IS NOT NULL;

UPDATE hist_fansub_group_members
SET left_date = MAKE_DATE(left_year, 1, 1) WHERE left_year IS NOT NULL;

ALTER TABLE hist_fansub_group_members
    DROP CONSTRAINT IF EXISTS chk_hist_fansub_group_members_years,
    ADD CONSTRAINT chk_hist_fansub_group_members_dates
        CHECK (left_date IS NULL OR joined_date IS NULL OR left_date >= joined_date);

ALTER TABLE hist_fansub_group_members
    DROP COLUMN IF EXISTS joined_year,
    DROP COLUMN IF EXISTS left_year;
```

### Pattern 2: Tenure-Startdatum in aktiven Rollen (Migration 0115)

**Was:** `fansub_group_member_roles` erhält `tenure_started_on DATE NULL`. Bestandszeilen bleiben NULL; neue Zeilen (nach Migration) werden beim Setzen der Rolle mit dem aktuellen Datum befüllt.

```sql
-- Migration 0115
ALTER TABLE fansub_group_member_roles
    ADD COLUMN IF NOT EXISTS tenure_started_on DATE NULL;
```

**Down-Migration:** Spalte droppen.

### Pattern 3: Claim-Aktivierungslogik in VerifyClaim

**Was:** Nach erfolgreicher Claim-Verifikation werden alle `hist_group_member_roles`-Einträge ohne `ended_date` für diesen Member gelesen. Für jeden wird ein Eintrag in `fansub_group_member_roles` angelegt (SetRole-Muster).

```go
// [ASSUMED] — Pseudocode; tatsächliche Implementierung folgt dem SetRole-Muster aus
// fansub_group_app_members_repository.go (Z. 399-406)
// Innerhalb der VerifyClaim-Transaktion oder als separater Post-Verify-Schritt:
rows, err := tx.Query(ctx, `
    SELECT r.role_code, hfgm.fansub_group_id
    FROM hist_group_member_roles r
    JOIN hist_fansub_group_members hfgm ON hfgm.id = r.hist_fansub_group_member_id
    WHERE hfgm.member_id = $1
      AND r.ended_date IS NULL
`, memberID)
// → für jede Zeile: INSERT INTO fansub_group_member_roles ON CONFLICT DO NOTHING
```

**Wichtig:** Die Logik muss `IsKnownFansubGroupRole` (oder `IsCapabilityBearingRole`) prüfen, bevor eine aktive Rolle geschrieben wird, da nicht alle historischen Rollencodes (z. B. `founder`) unbedingt als aktive App-Rollen sinnvoll sind. [ASSUMED: ob founder als aktive Rolle übernommen werden soll — Klärung im Plan erforderlich.]

### Anti-Patterns zu vermeiden

- **Direkte ALTER COLUMN started_year TYPE DATE:** Schlägt fehl, wenn Bestandsdaten nicht konvertierbar sind. Immer additiv vorgehen (neues Feld, füllen, altes droppen).
- **NOT NULL-Constraint bei tenure_started_on sofort setzen:** Bestandszeilen haben NULL. Das Feld bleibt NULL für historische Zeilen; neue Zeilen werden beim Anlegen mit aktuellem Datum befüllt.
- **Jahres-Check (chk_*_years) stehen lassen nachdem Spalte gedroppt:** CHECK-Constraint referenziert gedropfte Spalte → erst Constraint droppen, dann Spalte.
- **`<input type="date">` direkt ohne `Input`-Primitive:** CLAUDE.md-Verletzung; immer `<Input type="date" ... />` aus `@/components/ui`.
- **YearPicker komplett entfernen:** `YearPicker` wird in anderen Dialogen noch verwendet (z. B. Member-Beitrittsjahr). Nur im Rollen-Kontext durch Datumseingabe ersetzen.
- **Claim-Aktivierung ohne Rechte-Whitelist:** Historische Rollencodes, die nicht zu `IsKnownFansubGroupRole` gehören (z. B. hypothetische Sonderrollen), dürfen keine aktiven App-Rollen erzeugen.

---

## Don't Hand-Roll

| Problem                             | Nicht selbst bauen          | Stattdessen                                        | Warum                                                         |
|-------------------------------------|-----------------------------|----------------------------------------------------|---------------------------------------------------------------|
| DATE-Konvertierung Jahr→Datum       | Eigenen Go-Konverter        | SQL `MAKE_DATE(year, 1, 1)` in der Migration       | DB-native, atomar, reversibel                                |
| Rollen-Whitelist-Prüfung            | Eigene Liste im Handler     | `repository.IsGroupHistoryWhitelistRole(code)` [VERIFIED: Codebase] | Bereits vorhanden; Whitelist wird dort gepflegt            |
| Aktive-Rollen-Schreibpfad           | Neuen Insert-Pfad           | `FansubGroupAppMemberRepository.SetRole(enable=true)` [VERIFIED: Codebase] | Enthält Last-Admin-Guard und Conflict-Handling             |
| Claim-Flow-Basislogik               | Neu erfinden                | `MemberClaimsRepository.VerifyClaim()` [VERIFIED: Codebase] | Transaktion, Idempotenz und Audit bereits vorhanden        |
| Datumsfeld im Frontend              | Eigenes DatePicker-UI       | `<Input type="date" />` aus `@/components/ui`      | Design-System-Pflicht; kein DatePicker-Primitive vorhanden   |

---

## Common Pitfalls

### Pitfall 1: FK ON DELETE RESTRICT auf `hist_group_member_roles.role_code`
**Was schiefgeht:** Migration 0085 hat einen FK `fk_hist_group_member_roles_role_code` (→ `role_definitions(code)`) mit ON DELETE RESTRICT. Wenn die Migration versucht, die Spalte zu droppen oder zu ändern, muss der FK vorher entfernt werden — oder der Ansatz nutzt neue Spalten (additiv), sodass die Spalte `role_code` erhalten bleibt und nur `started_year`/`ended_year` getauscht werden.
**Warum:** Erfahrung aus Migration 0112 (siehe Kommentar dort: "Kritische Reihenfolge...").
**Prävention:** Die DATE-Migration betrifft NUR `started_year`/`ended_year` (nicht `role_code`) → FK ist nicht betroffen. Trotzdem prüfen, ob ein CHECK auf den Jahresspalten existiert (ja: `chk_hist_group_member_roles_years`) — dieser muss vor dem DROP der Spalten entfernt werden.

### Pitfall 2: `chk_hist_group_member_roles_years` und analoger Check in `hist_fansub_group_members`
**Was schiefgeht:** Beide Tabellen haben `CHECK (ended_year IS NULL OR started_year IS NULL OR ended_year >= started_year)`. Dieser Check referenziert die zu droppenden Spalten. PostgreSQL erlaubt kein `DROP COLUMN` wenn ein CHECK-Constraint die Spalte referenziert.
**Prävention:** In der Migration explizit `DROP CONSTRAINT IF EXISTS chk_hist_group_member_roles_years` vor `DROP COLUMN`. Dann neuen Constraint `chk_hist_group_member_roles_dates` mit DATE-Vergleich anlegen. [VERIFIED: Codebase — 0083, 0082 bestätigen die genauen Constraint-Namen]

### Pitfall 3: Bestandsdaten mit NULL-Jahres-Feldern
**Was schiefgeht:** Einige Zeilen haben `started_year IS NULL` oder `ended_year IS NULL`. Das UPDATE-Mapping `MAKE_DATE(started_year, 1, 1)` würde für diese Zeilen NULL zurückgeben (MAKE_DATE mit NULL-Input → NULL). Das ist korrekt und gewollt — NULL-Datum bedeutet „keine Angabe". Kein Problem, solange das UPDATE-WHERE korrekt auf `WHERE started_year IS NOT NULL` filtert.
**Prävention:** UPDATE-Statement immer mit `WHERE year IS NOT NULL` schreiben.

### Pitfall 4: D-10-Auto-Archivierung schreibt noch `started_year`/`ended_year`
**Was schiefgeht:** In `fansub_group_app_members_repository.go` (Z. 438-443) wird bei SetRole(false) ein INSERT in `hist_group_member_roles` mit den alten INT-Spalten geschrieben. Nach der DATE-Migration existieren diese Spalten nicht mehr → der Go-Code kompiliert zwar (Spaltenname ist ein String), aber SQL schlägt zur Laufzeit fehl.
**Prävention:** Gleichzeitig mit der DB-Migration das Auto-Archivierungs-INSERT in `SetRole` anpassen: `started_year`/`ended_year` → `started_date`/`ended_date` (DATE-Werte aus `roleCreatedAt.Truncate(24*time.Hour)` und `time.Now().Truncate(24*time.Hour)`). Diese Änderung MUSS atomar mit der DB-Migration deployed werden (Docker rebuild Backend nach Migration).

### Pitfall 5: Go-Struct-Typen `*int` → `*time.Time` in Repository-Structs
**Was schiefgeht:** `HistGroupMemberRoleRow.StartedYear *int` und `.EndedYear *int` müssen auf `*time.Time` (oder `pgtype.Date`) geändert werden. Alle Scan()-Aufrufe, JSON-Serialisierungen und Tests, die `started_year`/`ended_year` als int lesen, müssen angepasst werden.
**Umfang:** `hist_group_member_roles_repository.go` (Zeilen 14-28, 62-70), alle Handler-DTOs in `fansub_hist_group_member_roles_handler.go`.
**Prävention:** Nach Migrationsstrategie wählen (additive Spalten), dann Go-Structs auf DATE-Felder umstellen. `go build ./...` und `go test ./...` als Regressions-Gate.

### Pitfall 6: Frontend-TypeScript-Typen (`started_year: number | null`) überall im Code verteilt
**Was schiefgeht:** In `GroupHistRoleDialog.tsx`, `GroupMembersHistTable.tsx`, `GroupMembersTab.tsx`, API-Typen in `@/types/fansub.ts` und `lib/api.ts` wird `started_year`/`ended_year` als `number | null` erwartet. Nach der Migration liefert der Backend-Endpunkt ISO-Datum-Strings.
**Prävention:** Alle Frontend-Typen gleichzeitig mit dem Backend-DTO-Umbau auf `string | null` (ISO 8601) umstellen. `tsc --noEmit` als Gate.

### Pitfall 7: Docker-Rebuild-Pflicht
**Was schiefgeht:** Neue Go-Route/Handler und DB-Migration sind erst nach Rebuild von `team4sv30-backend` sichtbar. Frontend-Änderungen erst nach Rebuild von `team4sv30-frontend`.
**Prävention:** Jede Wave muss mit `docker compose up -d --build team4sv30-backend` (und ggf. frontend) abschließen. Live-Verifikation immer auf `:3000` (Prod-Build), nicht :3002.

### Pitfall 8: Claim-Aktivierung → fansub_lead-Sonderweg
**Was schiefgeht:** Beim Claim-Aktivierungsflow wird eine historische Rolle mit `role_code='fansub_lead'` ohne Enddatum gefunden. Ein naives INSERT in `fansub_group_member_roles` würde eine zweite Fansub-Lead-Zeile anlegen — ohne den Last-Active-Lead-Guard.
**Prävention:** Claim-Aktivierungslogik muss `ensureMemberMutationAllowed` (oder dessen Guard-Logik) auch beim Claim-Schreiben respektieren, oder `fansub_lead` aus dem automatischen Claim-Aktivierungsflow ausschließen und stattdessen einen separaten Admin-Schritt anbieten.

---

## Code Examples

### Ist-Stand: Auto-Archivierung in SetRole (muss angepasst werden)

```go
// [VERIFIED: Codebase — backend/internal/repository/fansub_group_app_members_repository.go Z. 438-443]
_, _ = r.db.Exec(ctx,
    `INSERT INTO hist_group_member_roles
     (hist_fansub_group_member_id, role_code, started_year, ended_year, status, visibility)
     VALUES ($1, $2, $3, $4, 'ended', 'internal')
     ON CONFLICT DO NOTHING`,
    histMemberID, role, roleCreatedAt.Year(), time.Now().Year())
// → Nach Migration: started_year/ended_year durch started_date/ended_date (DATE) ersetzen
```

### Claim-Aktivierung (neues Muster, Einstiegspunkt)

```go
// [VERIFIED: Codebase — backend/internal/repository/member_claims_repository.go Z. 175]
// VerifyClaim bestätigt den Claim; nach Commit (Z. 234) oder innerhalb der Transaktion:
// → Neue Methode: ResolvePendingRolesToActive(ctx, tx, memberID, fansubGroupID, actorAppUserID)
//    Liest hist_group_member_roles WHERE ended_date IS NULL für diesen Member+Gruppe
//    Schreibt fansub_group_member_roles ON CONFLICT DO NOTHING für jeden Eintrag
//    fansub_lead-Sonderweg: nur wenn kein aktiver Lead existiert (last_active_lead-Guard)
```

### Frontend: Datumseingabe (Pflicht-Pattern)

```tsx
// [VERIFIED: Codebase — @/components/ui/index.ts enthält Input; kein DatePicker-Primitive]
import { FormField, Input } from '@/components/ui'

<FormField label="Rolle von" htmlFor="role-started-date">
  <Input
    id="role-started-date"
    type="date"
    value={roleForm.startedDate}
    onChange={(e) => setRoleForm((f) => ({ ...f, startedDate: e.target.value }))}
  />
</FormField>
// KEIN: <input type="date" ... /> direkt — Design-System-Verstoß
```

### Bestehende Rollenauswahl (bleibt erhalten, nur YearPicker entfällt)

```tsx
// [VERIFIED: Codebase — GroupHistRoleDialog.tsx Z. 115-129]
// Die Select-Rollenauswahl (historyRoleOptions) bleibt erhalten.
// Nur die YearPicker-Felder (started_year, ended_year) werden durch <Input type="date"> ersetzt.
```

---

## State of the Art

| Alter Ansatz            | Aktueller Ansatz (nach Phase 97) | Geändert in     | Impact                                                               |
|-------------------------|----------------------------------|-----------------|----------------------------------------------------------------------|
| `started_year INT NULL` | `started_date DATE NULL`         | Migration 0114  | Tagesgenaue Historisierung; Jahres-Picker entfällt im Rollen-Dialog |
| `joined_year INT NULL`  | `joined_date DATE NULL`          | Migration 0114  | Mitgliedschaft tagesgenau                                           |
| `fansub_group_member_roles` hat nur `created_at` | + `tenure_started_on DATE NULL` | Migration 0115  | Startdatum der aktiven Rolle explizit                              |
| Claim-Verifikation ohne Rollen-Auflösung | + Claim-Aktivierungslogik (D-05) | Phase 97 | Historische Rollen ohne Enddatum → aktive Rollen                 |

**Deprecated/Outdated:**
- `StartedYear *int` / `EndedYear *int` in `HistGroupMemberRoleRow` (Go-Struct) → nach Migration durch `StartedDate *time.Time` / `EndedDate *time.Time` ersetzen.
- `JoinedYear *int` / `LeftYear *int` in `HistGroupMemberRow` (Go-Struct) → analog.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `founder` als historische Rolle OHNE Enddatum soll beim Claim-Flow NICHT automatisch als aktive Rolle gesetzt werden (da `founder` kein normaler SetRole-Pfad, nur Gründungshistorie) | Claim-Aktivierungslogik D-05 | Falsche aktive Rollen; oder Gründer erhalten irrtümlich Lead-Rechte |
| A2 | `fansub_lead` ohne Enddatum → beim Claim-Aktivierungsflow AUSGENOMMEN (Sonderweg: Last-Active-Lead-Guard muss zuerst geprüft werden) | Pitfall 8 | Last-Active-Lead-Invariante gebrochen |
| A3 | DATE-Bestandsdaten werden per `MAKE_DATE(year, 1, 1)` auf den 1. Januar gemappt (nicht z. B. 31. Dez. oder Mitte des Jahres) | Migration 0114 | Geringe Auswirkung auf Anzeige; kein Datenverlust |
| A4 | Down-Migration für 0114 stellt INT-Spalten zurück mit `EXTRACT(YEAR FROM date_column)` als Rückkonvertierung | Standard Stack | Wenn Down-Mig nötig → Monats-/Tagsinformation geht verloren (akzeptabler Verlust) |
| A5 | `tenure_started_on` in `fansub_group_member_roles` bleibt nullable; Bestandszeilen ohne Datum funktionieren weiterhin | Migration 0115 | Wenn NOT NULL nötig → alle Bestandszeilen müssten Datum erhalten |

**Falls Tabelle leer:** — Nein, es gibt Assumptions.

---

## Open Questions (RESOLVED)

1. **Claim-Aktivierung: Welche Rollencodes sollen automatisch aktiv werden?**
   - Was bekannt: `D-05` sagt alle Rollen ohne Enddatum.
   - Was unklar: Gilt das für `founder` (historische Ehrenrolle, kein aktiver Zweck) und `fansub_lead` (Sonderweg mit Last-Admin-Guard)?
   - Empfehlung: Im Plan explizit whitelist für Claim-Aktivierung definieren — analog zu `groupHistoryDialogRoleWhitelist`. Sicherste Lösung: nur `co_leader`, `project_lead`, `techadmin`, `gfxler`, `fansub_lead` (mit Guard) — `founder` ausschließen.
   - **(RESOLVED)** Plan 04 Task 1 SQL: AND role_code <> ALL(ARRAY['fansub_lead','founder']) — beide explizit ausgeschlossen. IsGroupHistoryWhitelistRole als zweiter defensiver Guard. fansub_lead muss Admin manuell via D-06 ClaimManagementPanel/SetRole zuweisen.

2. **D-03: Soll der Mitglied-Dialog (GroupMemberFormModals) Rollen direkt integrieren oder bleibt der separate `GroupHistRoleDialog` erhalten?**
   - Was bekannt: Aktuell sind beide getrennt. D-03 sagt „integrieren".
   - Was unklar: Ob das bedeutet, den `GroupHistRoleDialog` abzuschaffen oder ihn über einen „Rollen hinzufügen"-Button innerhalb `GroupMemberFormModals` einzubetten.
   - Empfehlung: Im Plan klären. Pragmatischer Weg: `GroupHistRoleDialog` als Inline-Sektion in `GroupMemberFormModals` einbetten (kein eigener Button mehr), aber Dialog-Code bleibt als eigene Datei (450-Zeilen-Limit).
   - **(RESOLVED)** Plan 03 Task 2: GroupHistRoleDialog bleibt als eigene Datei erhalten (450-Zeilen-Limit). Einbettung in GroupMembersTab über bestehenden Aufruf-Flow. D-01-Mehrfachrollen via wiederholtes Dialog-Öffnen (Schema unterstützt N Rollen pro Person).

3. **Existiert `hist_group_members_repository.go` als separate Datei neben dem Roles-Repository?**
   - Was bekannt: `main.go` instanziiert `repository.NewHistGroupMembersRepository(dbPool)`.
   - Was unklar: Dateiname und Struct-Struktur (für die DATE-Migration relevant).
   - Empfehlung: Datei vor dem Plan lesen (Glob: `backend/internal/repository/hist_group_members_repository.go`).
   - **(RESOLVED)** Plan 02 read_first bestätigt: `backend/internal/repository/hist_group_members_repository.go` existiert (418 Zeilen), Struct `HistGroupMemberRow` mit `JoinedYear/LeftYear *int` — wird in Plan 02 Task 2 auf `JoinedDate/LeftDate *time.Time` umgestellt.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL (Docker) | DB-Migrationen | ✓ | 16 (Compose) | — |
| Go 1.25 | Backend-Compilation | ✓ | 1.25 (go.mod) | — |
| Docker Compose (Backend + Frontend) | Rebuild nach Migration | ✓ | — | — |
| `time.Time` für DATE in pgx v5 | Go-Struct-Typen | ✓ | pgx/v5 vorhanden | `pgtype.Date` als Alternative |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3 (Frontend), Go `testing` + `testify` (Backend) |
| Config file | `frontend/vitest.config.ts` |
| Quick run Frontend | `npm --prefix frontend run test` |
| Quick run Backend | `go test ./...` (in `backend/`) |
| Full suite | `go test ./...` + `tsc --noEmit` + `npm --prefix frontend run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-02 | Migration läuft durch (up + down) | Integration (SQL) | `go test ./...` (migrate-Paket, falls vorhanden) | ✅ Wave 0 (97-00) |
| D-02 | Go-Structs kompilieren mit DATE-Typen | Compile | `go build ./...` | ✅ (implizit) |
| D-03 | Rollen-Dialog rendert `started_date`/`ended_date` statt YearPicker | Unit (Vitest) | `npm --prefix frontend run test -- GroupHistRoleDialog` | ✅ Wave 0 (97-00) |
| D-04 | Enddatum-Regel: Rolle ohne Enddatum gilt als aktiv | Unit (Go) | `go test ./... -run TestHistRoleEndDateRule` | ✅ Wave 0 (97-00) |
| D-05 | VerifyClaim → Rollen ohne Enddatum werden in fansub_group_member_roles geschrieben | Unit (Go) | `go test ./... -run TestVerifyClaimActivatesRoles` | ✅ Wave 0 (97-00) |
| D-07 | canForContext liest nur aktive Rollen (keine hist-Tabelle) | Unit (Go, bestehend) | `go test ./internal/permissions/...` | ✅ (bestehende Tests) |

### Sampling Rate
- **Pro Task-Commit:** `go build ./...` (Backend) oder `tsc --noEmit` + Vitest für geänderte Datei (Frontend)
- **Pro Wave-Merge:** `go test ./...` + `tsc --noEmit` + `npm --prefix frontend run test`
- **Phase Gate:** Vollständige Suite grün + Live-UAT auf `:3000` vor `/gsd:verify-work`

### Wave 0 Gaps
- [x] `backend/internal/repository/member_claims_repository_claim_activation_test.go` — deckt D-05 (Plan 97-00)
- [x] `backend/internal/repository/hist_group_member_roles_date_test.go` — deckt D-02/D-04 (Plan 97-00)
- [x] Frontend: `GroupHistRoleDialog.test.tsx` — deckt D-03 (Plan 97-00)

---

## Security Domain

> `security_enforcement` ist nicht explizit auf `false` gesetzt → Abschnitt inkludiert.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | nein | (keine neuen Auth-Oberflächen) |
| V3 Session Management | nein | — |
| V4 Access Control | ja | `CanForFansubGroup(ActionFansubGroupMembersManage)` vor Schreibpfaden |
| V5 Input Validation | ja | Rollencodes gegen `IsGroupHistoryWhitelistRole`; Datum-Strings via `time.Parse("2006-01-02", ...)` |
| V6 Cryptography | nein | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unerlaubte Rollen-Aktivierung über Claim-Flow | Elevation of Privilege | `IsKnownFansubGroupRole`-Check vor INSERT in `fansub_group_member_roles` |
| Claim-Bestätigung ohne Gruppen-Scope-Prüfung | Tampering | `VerifyClaim` prüft `JOIN hist_fansub_group_members hgm WHERE hgm.fansub_group_id = $2` |
| SQL-Injection über Rollencode-Input | Tampering | Parametrisierte Queries (bereits Standard im Projekt) |
| Cross-Group-Scope bei LIST-Anfragen | Information Disclosure | WR-02-Pattern aus Phase 95 (CR-01-Gate in `CreateHistGroupMemberRole`) |

---

## Sources

### Primary (HIGH confidence)
- Codebase direkt gelesen:
  - `database/migrations/0082_historical_fansub_group_members.up.sql` — exakte Spaltennamen und CHECK-Constraints
  - `database/migrations/0083_hist_group_member_roles.up.sql` — exakte Spaltennamen, CHECK-Name `chk_hist_group_member_roles_years`
  - `database/migrations/0112_role_model_cleanup.up.sql` — Migrationsmuster, FK-Reihenfolge
  - `database/migrations/0113_fansub_lead_label_leader.up.sql` — letzte Migration (0113), nächste freie Nummer: **0114**
  - `backend/internal/repository/hist_group_member_roles_repository.go` — Go-Structs, Methoden, Whitelist
  - `backend/internal/repository/fansub_group_app_members_repository.go` — SetRole, D-10-Auto-Archivierung (Z. 407-445)
  - `backend/internal/repository/member_claims_repository.go` — VerifyClaim (Z. 175-238)
  - `backend/internal/handlers/member_claims_handler.go` — VerifyClaim-Handler
  - `backend/internal/permissions/permissions.go` — canForContext, fansubGroupRoleCatalog, Rollen-Konstanten
  - `frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.tsx` — aktueller Dialog-Aufbau (YearPicker vorhanden)
  - `frontend/src/app/admin/fansubs/[id]/edit/GroupMemberFormModals.tsx` — aktueller Mitglied-Dialog
  - `frontend/src/components/ui/YearPicker.tsx` — kein DatePicker in @/components/ui
  - `frontend/src/components/ui/` (Index) — verfügbare Primitives: kein `DatePicker`

### Secondary (MEDIUM confidence)
- `95-06-SUMMARY.md` — Gap G4-Entscheidungen, Leader-Terminologie, Stand nach Phase 95
- `95-CONTEXT.md` — D-09/D-10/D-11/D-12 (Vorentscheidungen)
- `97-CONTEXT.md` — D-01 bis D-08 (authoritative Entscheidungsquelle)

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — ausschließlich bestehende Bibliotheken
- Datenbankschema-Ist-Stand: HIGH — direkt aus Migrations-SQL gelesen
- Migration 0114-Strategie: HIGH — bewährtes additives Muster aus 0112
- Claim-Aktivierungslogik: MEDIUM — Einstiegspunkt klar (`VerifyClaim`), Detailimplementierung ist Discretion
- Frontend-Datumseingabe: HIGH — kein DatePicker in @/components/ui bestätigt
- Pitfalls: HIGH — aus Codebase-Analyse, nicht aus Training

**Research date:** 2026-07-01
**Valid until:** 2026-08-01 (stabile Stack; 30 Tage)
