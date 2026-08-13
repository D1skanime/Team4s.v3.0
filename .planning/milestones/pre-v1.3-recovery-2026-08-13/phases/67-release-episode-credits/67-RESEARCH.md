# Phase 67: Release- und Episode-Credits (Post-MVP) - Research

**Researched:** 2026-06-02
**Domain:** PostgreSQL-Schemaerweiterung (nullable FK + Konsistenz-Constraint), Go/Gin Handler-Validierung, pgx-Aggregations-Query-Erweiterung, Next.js Progressive-Disclosure-UI
**Confidence:** HIGH (alle Befunde aus direktem Codebase-Read verifiziert)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `anime_contributions` bekommt **eine** nullable Spalte **`release_version_id`** (FK → `release_versions`, ON-DELETE-Detail = Research). Additiv, kein Breaking Change. **Kein `episode_id`** (redundant, transitiv über `release_version → fansub_release → episode`).
- **D-02:** Ebenen pro Contribution: `release_version_id` NULL = **anime-weit**; gesetzt = **release-version-spezifisch**. Episode ergibt sich automatisch.
- **D-03:** **Konsistenz-Constraint:** Wenn `release_version_id` gesetzt, muss die `fansub_group_id` der Contribution in `release_version_groups` für diese Version vorkommen. Durchsetzung über Handler-Validierung und/oder DB-Constraint — Mechanismus klärt Research.
- **D-04:** **Weg A (fokussiert):** `anime_contributions` ist maßgebliches Credit-Modell. `release_member_roles` (Migration 0044) bleibt in Phase 67 **unangetastet**, wird als abzulösen markiert → eigene Cleanup-Phase.
- **D-05:** Default-Ansicht bleibt **nach Gruppe gruppiert**. Wo release-version-spezifische Beiträge existieren, **aufklappbare Detailebene pro Release-Version** (Progressive Disclosure wie Phase 64).
- **D-06:** Pro Gruppe zuerst **anime-weite** Beiträge, darunter **versions-spezifische** — klar getrennt.
- **D-07:** Sortierung der Aufschlüsselung: **nach Episode-Nr, dann Version**.
- **D-08:** Sowohl **Leader-Frontend** (Phase 63) als auch **Member-Vorschlagsformular** (Phase 65) erhalten optionales Release-Version-Feld.
- **D-09:** Auswahl über **abhängiges Dropdown**: Release-Versionen (Episode + Version), gefiltert auf Versionen der gewählten Gruppe (`release_version_groups`). Leer = anime-weit.
- **D-10:** `release_version_id` ist **nachträglich bearbeitbar**.
- **D-11:** Alle user-facing Strings auf Deutsch mit korrekten Umlauten.

### Claude's Discretion
- ON-DELETE-Verhalten und exakte Constraint-Form für `release_version_id`.
- Konsistenzprüfung (D-03) als DB-Constraint (Trigger) vs. rein im Handler.
- Anpassung der öffentlichen Query (zusätzliche Aufschlüsselungs-Ebene) ohne Bruch der anime-weiten Anzeige.
- Wiederverwendung bestehender Release-Version-Lookups für das abhängige Dropdown.
- Handler/Repo-Aufteilung unter dem 450-Zeilen-Limit.

### Deferred Ideas (OUT OF SCOPE)
- Ablösung von `release_member_roles` (Repos umstellen, Tabelle droppen) — eigene Cleanup-Phase.
- `episode_id` als direkter FK — verworfen (redundant).
- n:m-Verknüpfung einer Contribution zu mehreren Versionen — verworfen für V1.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| P67-SC1 | `anime_contributions` kann optional an `release_version_id` geknüpft werden (nullable FK, kein Breaking Change). Episode-Granularität transitiv über `release_version → fansub_release → episode`. | Migration 0090 (siehe "Migration"), CreateOrUpdate/Create/Update-Erweiterung in `anime_contributions_upsert_repository.go` + `anime_contributions_repository.go`. KRITISCH: bestehender UNIQUE-Constraint `uq_anime_contribution_member` muss erweitert werden (siehe Pitfall 1). |
| P67-SC2 | Anime-Seite zeigt Contributions aufgeschlüsselt nach Episode/Release-Version wenn vorhanden. | Public-Query-Erweiterung in `anime_contributions_public_repository.go` (`GetPublicAnimeContributions`), neue DTO-Ebene, Frontend `GroupContributionBlock.tsx` Progressive Disclosure. |
</phase_requirements>

## Summary

Phase 67 ist eine reine **Brownfield-Schemaerweiterung** im bereits etablierten `anime_contributions`-Modell. Sie fügt genau eine nullable Spalte `release_version_id` (FK → `release_versions`) hinzu, erweitert die öffentliche Aggregations-Query um eine zweite Aufschlüsselungs-Ebene und ergänzt beide Eingabeflächen (Leader-CRUD + Member-Vorschlag) um ein gruppen-gefiltertes Dropdown. Das gesamte Datenmodell, alle Handler-Muster, Audit-Logging, Permission-Checks und Public-DTOs existieren bereits aus den Phasen 62-65 und werden **erweitert, nicht ersetzt**.

Der wichtigste Befund: Der in Migration `0088` eingeführte UNIQUE-Constraint `uq_anime_contribution_member (fansub_group_id, anime_id, fansub_group_member_id)` **kollidiert** mit dem neuen Versions-Konzept (D-02). Sobald derselbe Member sowohl anime-weit (NULL) als auch versions-spezifisch eingetragen werden soll, verletzt das den Constraint. Dieser Constraint **muss** in derselben Migration um `release_version_id` erweitert werden (siehe Pitfall 1) — das ist die mit Abstand höchste Planungs-Priorität und betrifft auch das `ON CONFLICT`-Target im Upsert-Code.

Zweiter zentraler Befund: Die Konsistenzprüfung (D-03) lässt sich mit dem bestehenden FK-Mechanismus **nicht** als einfacher FK ausdrücken (kein Composite-Match möglich, weil `release_version_groups` nur `(release_version_id, fansub_group_id)` führt, aber NULL erlaubt sein muss). Empfehlung: **Handler-Validierung** als primärer Mechanismus (analog `MemberBelongsToFansub`), optional ergänzt durch einen Defense-in-Depth-Trigger. Migration ist append-only und muss `0090` verwenden — `0089` ist bereits durch den **noch nicht ausgeführten** Phase-65-Plan reserviert (siehe Pitfall 4 / Environment).

**Primary recommendation:** Eine Migration `0090` (additive Spalte + erweiterter UNIQUE-Constraint + Index), Konsistenzprüfung im Handler über eine neue `GroupParticipatesInReleaseVersion`-Repo-Methode, Public-Query als zweite Aggregations-Ebene innerhalb derselben Repo-Datei (mit Augenmerk auf das 450-Zeilen-Limit → Auslagerung in `anime_contributions_public_versions_repository.go`), Dropdown-Daten über Wiederverwendung des `ListFansubAnimeReleases`-Query-Musters.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Nullable FK + erweiterter UNIQUE-Constraint + Index | Database / Storage | — | Append-only Migration, Schema-Wahrheit liegt in `database/migrations/`. |
| Konsistenz-Constraint (Gruppe ∈ release_version_groups) | API / Backend (Handler-Validierung) | Database (optionaler Trigger als Defense-in-Depth) | Composite-FK kann NULL-Fall nicht ausdrücken; bestehende Validierungs-Konvention ist Handler-seitig (`MemberBelongsToFansub`). |
| Versions-Aufschlüsselung der Public-Query | API / Backend (Repository) | — | Aggregation gehört in die Repo-Schicht; Handler bleibt dünn (`contributions_public_handler.go`). |
| Release-Version-Dropdown-Daten (gruppen-gefiltert) | API / Backend (Repository) | — | Wiederverwendung des `release_version_groups`-Joins; kein Client-seitiges Filtern. |
| Aufklappbare Versions-Detailebene | Browser / Client (React State) | — | Progressive Disclosure ist reiner Client-State (wie `expandedGroupId` heute). |
| Optionales Release-Version-Feld in Formularen | Browser / Client | API / Backend (nimmt optionales Feld an + validiert) | Abhängiges Dropdown ist UI; Validierung/Persistenz im Backend. |

## Standard Stack

Keine neuen Bibliotheken. Phase 67 nutzt ausschließlich den bestehenden Stack.

### Core (bereits installiert, verifiziert via CLAUDE.md + go.mod-Imports im gelesenen Code)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Go | 1.25 (go.mod); Toolchain lokal 1.26.1 | Backend-Runtime | [VERIFIED: CLAUDE.md + `go version`] Projekt-Standard. |
| Gin | `github.com/gin-gonic/gin` | HTTP-Handler | [VERIFIED: handler imports] Alle bestehenden Contribution-Handler nutzen Gin. |
| pgx/v5 | `github.com/jackc/pgx/v5` (+ pgxpool) | DB-Zugriff | [VERIFIED: repository imports] Alle Repos nutzen `*pgxpool.Pool`. |
| Next.js | 16 (App Router) | Frontend | [VERIFIED: CLAUDE.md] |
| React | 18.3.1 | UI | [VERIFIED: CLAUDE.md] |
| Vitest | 3 | Frontend-Tests | [VERIFIED: CLAUDE.md] |
| testify | `github.com/stretchr/testify` | Backend-Tests | [VERIFIED: CLAUDE.md] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Handler-Validierung für D-03 | DB-Trigger (PL/pgSQL) auf INSERT/UPDATE | Trigger garantiert auch bei Direktzugriff; aber Projekt hat **keine** bestehenden Trigger (verifiziert: keine `CREATE TRIGGER` in den gelesenen Migrationen) → würde neue Konvention einführen. Empfehlung: Handler primär, Trigger optional als Defense-in-Depth. |
| Erweiterter UNIQUE-Constraint | Partieller Unique-Index getrennt für NULL/non-NULL | Postgres behandelt NULLs in UNIQUE als distinct → `(group, anime, member, release_version_id)` erlaubt mehrere NULL-Zeilen NICHT sauber. Siehe Pitfall 1 für die korrekte Lösung. |

**Installation:** Keine. `npm install` / `go get` nicht erforderlich.

## Package Legitimacy Audit

> Nicht zutreffend — Phase 67 installiert **keine** externen Pakete. Alle benötigten Bibliotheken sind bereits Teil des Projekt-Stacks (Go-Module + npm), verifiziert über bestehende Imports im gelesenen Code. slopcheck/Registry-Verifikation entfällt.

## Architecture Patterns

### System Architecture Diagram

```
EINGABE (zwei Flächen)
  Leader-Admin-Form (manage/groups)        Member-Vorschlag-Form (me/contributions)
        |                                          |
        | optionales release_version_id            | optionales release_version_id
        | (Dropdown: nur Versionen der Gruppe)     | (Dropdown: nur Versionen der Gruppe)
        v                                          v
  POST/PATCH /admin/fansubs/:id/anime/:animeId/    POST /me/anime-contributions (Proposal, Phase 65)
   contributions[/:contributionId]
        |                                          |
        +---------------------+--------------------+
                              v
                  FansubAnimeContributionsHandler / Proposal-Handler
                              |
                  [VALIDIERUNG] 1. MemberBelongsToFansub (bestehend)
                                2. NEU: GroupParticipatesInReleaseVersion(group, rvid)  <- D-03
                              |
                              v
                  AnimeContributionsRepository.CreateOrUpdate / Create / Update
                              |  schreibt release_version_id
                              v
                  +-----------------------------------------------+
                  | anime_contributions                           |
                  |   + release_version_id BIGINT NULL            |
                  |   FK -> release_versions(id) ON DELETE SET NULL|
                  |   UNIQUE(group, anime, member, release_version_id*) |
                  +-----------------------------------------------+
                              |
   release_version_id --transitiv--> release_versions -> fansub_releases -> episodes (Episode-Nr)
                              |
ANZEIGE
                              v
   GET /anime/:id/contributions
                              |
   GetPublicAnimeContributions (erweitert)
     Ebene 1: GROUP BY fansub_group_id (anime-weit, release_version_id IS NULL)   <- bestehend
     Ebene 2: NEU pro Gruppe: release-version-spezifische Beiträge,
              JOIN release_versions/fansub_releases/episodes,
              sortiert Episode-Nr -> Version (D-07)
                              |
                              v
   AnimeContributionsSection -> GroupContributionBlock
     "Allgemein an der Serie beteiligt" (Ebene 1)
     "▾ Nach Release-Version" (Ebene 2, aufklappbar, Client-State)
```

### Recommended Project Structure (Erweiterungen, keine Neustrukturierung)
```
database/migrations/
  0090_anime_contributions_release_version.up.sql   # NEU: Spalte + UNIQUE-Erweiterung + Index
  0090_anime_contributions_release_version.down.sql # NEU
backend/internal/repository/
  anime_contributions_repository.go                 # Create/Update: release_version_id (447 Z. → Limit beachten!)
  anime_contributions_upsert_repository.go          # CreateOrUpdate: ON CONFLICT-Target + Spalte
  anime_contributions_public_repository.go          # bestehende Ebene-1-Query (390 Z.)
  anime_contributions_public_versions_repository.go # NEU: Ebene-2-Aggregation (450-Limit-Auslagerung)
  anime_contributions_release_lookup_repository.go  # NEU: GroupParticipatesInReleaseVersion + Dropdown-Query
backend/internal/handlers/
  fansub_anime_contributions_handler.go             # Request-Structs + D-03-Validierung (435 Z. → Limit!)
  contributions_public_handler.go                   # unverändert (dünn)
backend/internal/migrations/
  phase67_release_version_credits_test.go           # NEU: Migration-Contract-Test (Pattern wie phase61)
shared/contracts/
  openapi.yaml                                       # release_version_id + neue Public-DTO-Felder
frontend/src/types/contributions.ts                 # AnimeContributionGroup + ReleaseVersionBreakdown
frontend/src/components/anime/
  GroupContributionBlock.tsx                         # Versions-Detailebene
  ReleaseVersionBreakdown.tsx                        # NEU: aufklappbare Versions-Liste
frontend/src/lib/api.ts                              # Dropdown-Fetch + erweiterte Response-Typen
```

### Pattern 1: Additive nullable FK-Migration (append-only)
**What:** Neue Spalte + FK + Index in einer up-Migration, reversibel in down.
**When to use:** P67-SC1.
**Example:**
```sql
-- Source: Muster aus 0086/0087/0088 (verifiziert im Repo)
-- 0090_anime_contributions_release_version.up.sql
ALTER TABLE anime_contributions
    ADD COLUMN IF NOT EXISTS release_version_id BIGINT NULL
    REFERENCES release_versions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_anime_contributions_release_version
    ON anime_contributions(release_version_id)
    WHERE release_version_id IS NOT NULL;

-- KRITISCH (Pitfall 1): UNIQUE-Constraint aus 0088 ersetzen
ALTER TABLE anime_contributions
    DROP CONSTRAINT IF EXISTS uq_anime_contribution_member;
ALTER TABLE anime_contributions
    ADD CONSTRAINT uq_anime_contribution_member
    UNIQUE NULLS NOT DISTINCT (fansub_group_id, anime_id, fansub_group_member_id, release_version_id);
```
**ON DELETE SET NULL begründet:** Wird eine `release_version` gelöscht, soll die Contribution (= historisches Faktum, dass die Gruppe am Anime beteiligt war) **erhalten** bleiben und auf "anime-weit" zurückfallen — nicht mitgelöscht (CASCADE wäre Datenverlust) und nicht blockiert (RESTRICT würde legitimes Löschen von Release-Versionen verhindern). Das ist konsistent mit dem Tabellen-Kommentar in 0086 ("historisches Faktenregister") und dem ON-DELETE-SET-NULL-Muster der `confirmed_by`/`created_by`-FKs derselben Tabelle. [VERIFIED: 0086_anime_contributions.up.sql]

### Pattern 2: Handler-Validierung mit Repo-Existenzprüfung (D-03)
**What:** Vor dem Upsert prüfen, dass die Gruppe an der gewählten Version beteiligt ist.
**When to use:** Bei jedem Create/Update/Proposal mit gesetztem `release_version_id`.
**Example:**
```go
// Source: Muster aus MemberBelongsToFansub (anime_contributions_repository.go:89, verifiziert)
func (r *AnimeContributionsRepository) GroupParticipatesInReleaseVersion(
    ctx context.Context, fansubGroupID, releaseVersionID int64,
) (bool, error) {
    var exists bool
    err := r.db.QueryRow(ctx, `
        SELECT EXISTS(
            SELECT 1 FROM release_version_groups
            WHERE release_version_id = $1 AND fansub_group_id = $2
        )
    `, releaseVersionID, fansubGroupID).Scan(&exists)
    if err != nil {
        return false, fmt.Errorf("group participates in release version check: %w", err)
    }
    return exists, nil
}
```
Handler-seitig analog zur bestehenden `belongs`-Prüfung mit HTTP 422 + deutscher Fehlermeldung ("Gruppe war an dieser Release-Version nicht beteiligt").

### Pattern 3: Gruppen-gefiltertes Dropdown-Query (D-09)
**What:** Liste der Release-Versionen einer Gruppe für einen Anime, mit Episode-Nr + Version-Label.
**When to use:** Datenquelle für das abhängige Dropdown in beiden Formularen.
**Example:**
```sql
-- Source: abgeleitet aus ListFansubAnimeReleases (admin_content_fansub_releases.go:24, verifiziert)
SELECT
    rv.id                            AS release_version_id,
    ep.episode_number,
    ep.sort_index,
    rv.version
FROM release_versions rv
JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
JOIN fansub_releases fr ON fr.id = rv.release_id
JOIN episodes ep ON ep.id = fr.episode_id
WHERE rvg.fansub_group_id = $1
  AND ep.anime_id = $2
ORDER BY COALESCE(ep.sort_index, 2147483647), ep.id, rv.version
```

### Pattern 4: Zweite Aggregations-Ebene in der Public-Query (P67-SC2, D-05/06/07)
**What:** Bestehende Gruppen-Aggregation um eine versions-spezifische Liste pro Gruppe erweitern, ohne die anime-weite Anzeige zu brechen.
**When to use:** `GetPublicAnimeContributions`.
**Empfehlung:** Zweite Query (separat von der bestehenden), die NUR `release_version_id IS NOT NULL`-Zeilen liefert, joined gegen `release_versions → fansub_releases → episodes`, sortiert `episode.sort_index/episode_number → version`. Ergebnis in `map[fansubGroupID][]ReleaseVersionBreakdownRow` einsammeln und an die bestehenden Group-Structs anhängen — exakt das Two-Query-Muster, das `attachHiddenCounts` bereits verwendet (verifiziert: `anime_contributions_public_repository.go:176`). Die bestehende Ebene-1-Query MUSS um `AND ac.release_version_id IS NULL` ergänzt werden, damit versions-spezifische Beiträge nicht doppelt im "Allgemein"-Block erscheinen.

### Anti-Patterns to Avoid
- **Episode_id-Spalte hinzufügen:** Verworfen (D-01, redundant). Episode immer transitiv ableiten.
- **CASCADE auf release_version_id:** Würde historische Contributions bei Versions-Löschung vernichten — widerspricht "historisches Faktenregister".
- **Client-seitiges Filtern der Dropdown-Optionen:** Gruppen-Filter gehört in die SQL (`release_version_groups`-Join), nicht ins Frontend.
- **Ebene-1- und Ebene-2-Beiträge in EINER Query mit UNION mischen:** Erschwert das saubere Trennen (D-06) und das 450-Zeilen-Limit. Zwei Queries sind hier klarer.
- **UNIQUE-Constraint unverändert lassen:** Bricht D-02 (siehe Pitfall 1).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Release-Version-Lookup für Dropdown | Neuen Episode/Release-Join from scratch | `ListFansubAnimeReleases`-Muster (`admin_content_fansub_releases.go`) | Episode-Sortierung (`sort_index` NULL-safe), Gruppen-Filter und Version-Count sind dort bereits korrekt gelöst. |
| Member-/Gruppen-Konsistenzprüfung | Eigene Cross-Group-Logik | `MemberBelongsToFansub`-Muster + neue `GroupParticipatesInReleaseVersion` | Identisches EXISTS-Muster, gleiche Fehlerbehandlung. |
| Two-Query-Aggregation anhängen | Komplexe Single-Query mit verschachtelten Arrays | `attachHiddenCounts`-Muster (zweite Query + map-Merge) | Bereits erprobt in derselben Datei. |
| FK-Verletzungs-Mapping | Eigene SQLSTATE-Prüfung | `isForeignKeyViolation`/`isUniqueViolation` (`sql_errors.go`) | Zentral vorhanden, bereits in Create/Update verwendet. |
| Audit-Logging | Eigenes Log | `auditLogRepo.Write` (bestehend im Handler) | Observability-Constraint (CLAUDE.md) bereits abgedeckt. |
| Migration-Contract-Test | Manuelles SQL-Review | `phase61_contributions_model_test.go`-Muster (`assertContainsAll`/`readMigrationFile`) | Etabliertes Pattern für Schema-Regression. |

**Key insight:** Praktisch jeder Baustein dieser Phase existiert bereits als Muster im Repo. Der Wert der Phase liegt in der korrekten Verdrahtung (besonders UNIQUE-Constraint + ON-CONFLICT-Target), nicht in neuer Mechanik.

## Runtime State Inventory

> Phase 67 ist **kein** Rename/Refactor, sondern eine additive Schemaerweiterung. Trotzdem geprüft, weil ein UNIQUE-Constraint geändert wird:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `anime_contributions` enthält laut STATE.md/Discussion-Log nur **Testdaten** (kein Sicherungsbedarf, User-bestätigt). Bestehende Zeilen haben `release_version_id` = NULL nach Migration (Default). | Keine Datenmigration nötig — additive Spalte ist NULL-default. UNIQUE-Erweiterung ist abwärtskompatibel für bestehende NULL-Zeilen. |
| Live service config | Keine. Contributions sind reine DB-/API-Daten, keine externe Service-Konfiguration. | None — verifiziert: kein n8n/Datadog/externer State in diesem Domain. |
| OS-registered state | Keine. | None. |
| Secrets/env vars | Keine. Kein neuer Secret-/Env-Bezug. | None. |
| Build artifacts | Go-Backend muss nach Migration + Code-Änderung neu gebaut werden (Docker), Frontend neu gebaut. | Docker-Rebuild backend+frontend vor UAT (Standard-Schritt, vgl. STATE Phase 28). |

**Constraint-Migration-Risiko:** Falls in einer realen Umgebung bereits Zeilen existieren, die nach der neuen `NULLS NOT DISTINCT`-Regel kollidieren würden, schlägt `ADD CONSTRAINT` fehl. In der Testdaten-Umgebung unkritisch; Plan sollte dennoch einen Pre-Check/Hinweis enthalten.

## Common Pitfalls

### Pitfall 1: UNIQUE-Constraint `uq_anime_contribution_member` kollidiert mit Versions-Konzept
**What goes wrong:** Migration 0088 definiert `UNIQUE (fansub_group_id, anime_id, fansub_group_member_id)`. D-02 verlangt, dass derselbe Member einmal anime-weit (NULL) UND einmal pro Release-Version eingetragen werden kann. Mit dem bestehenden Constraint scheitert der zweite Eintrag mit Unique-Violation; das `ON CONFLICT (fansub_group_id, anime_id, fansub_group_member_id)` im `CreateOrUpdate` (verifiziert: `anime_contributions_upsert_repository.go:48`) würde zudem versions-spezifische Einträge fälschlich auf den anime-weiten Eintrag upserten.
**Why it happens:** Der Constraint stammt aus dem Cross-Group-/Duplikat-Schutz (Phase 62/69-Bereich) und kennt die Versions-Dimension noch nicht.
**How to avoid:**
1. In Migration 0090 den Constraint droppen und mit `release_version_id` neu anlegen: `UNIQUE NULLS NOT DISTINCT (fansub_group_id, anime_id, fansub_group_member_id, release_version_id)`. `NULLS NOT DISTINCT` (Postgres 15+, Projekt nutzt PG16 → verfügbar) sorgt dafür, dass auch der anime-weite NULL-Eintrag pro Member nur **einmal** existieren kann. [VERIFIED: PG16 in CLAUDE.md; NULLS NOT DISTINCT ist PG15+ Feature]
2. Das `ON CONFLICT`-Target in `CreateOrUpdate` auf die neuen vier Spalten erweitern.
3. Phase-65-Proposal-Duplikatkriterium (D-05 dort: gleiche Member+Anime+Gruppe) muss konsistent angepasst werden, falls Phase 65 vor 67 landet (Koordination — siehe Pitfall 4).
**Warning signs:** Test "zweiter versions-spezifischer Eintrag" wirft 409 Conflict; UAT: versions-spezifischer Beitrag überschreibt den allgemeinen.

### Pitfall 2: Doppelte Anzeige im "Allgemein"-Block
**What goes wrong:** Wenn die bestehende Ebene-1-Query nicht um `AND ac.release_version_id IS NULL` gefiltert wird, erscheinen versions-spezifische Beiträge zusätzlich im allgemeinen Block.
**Why it happens:** Die heutige Query (`anime_contributions_public_repository.go:115`) filtert nur nach `anime_id` + Public-Flags.
**How to avoid:** Ebene-1-Query um `AND ac.release_version_id IS NULL` ergänzen; Ebene 2 (`IS NOT NULL`) separat aggregieren. Auch `attachHiddenCounts` prüfen, ob es nach Ebenen getrennt zählen soll (Empfehlung: Hidden-Count bleibt gruppenweit unverändert, damit keine Doppelzählung).
**Warning signs:** Contributor taucht in beiden Blöcken auf.

### Pitfall 3: 450-Zeilen-Limit gesprengt
**What goes wrong:** `anime_contributions_repository.go` hat bereits **447 Zeilen** (verifiziert), `fansub_anime_contributions_handler.go` **435 Zeilen**, `anime_contributions_public_repository.go` **390 Zeilen**. Schon kleine Erweiterungen überschreiten das CLAUDE.md-Limit.
**Why it happens:** Die Dateien sind nahe am Limit.
**How to avoid:** Neue Methoden konsequent auslagern — Muster ist im Repo etabliert (`anime_contributions_member_repository.go`, Auslagerungs-Kommentar in `anime_contributions_repository.go:447`). Konkret:
- `GroupParticipatesInReleaseVersion` + Dropdown-Query → neue Datei `anime_contributions_release_lookup_repository.go`.
- Ebene-2-Aggregation → neue Datei `anime_contributions_public_versions_repository.go`.
- Handler-Validierung kompakt halten; ggf. Request-Struct-Erweiterung minimal.
**Warning signs:** Datei > 450 Zeilen beim Lint/Review.

### Pitfall 4: Migrationsnummer-Kollision mit Phase 65/66
**What goes wrong:** Phase 67 plant naiv `0089`, aber Phase 65 hat `0089_anime_contributions_review_note` bereits reserviert (verifiziert: `65-01-PLAN.md` Zeile 8) — auch wenn die Datei **noch nicht auf der Platte existiert** (höchste vorhandene Migration ist `0088`, verifiziert via Glob+ls).
**Why it happens:** Phasen 65/66/67/70 sind alle in PLANUNG, keine ausgeführt (verifiziert: git log zeigt nur `docs(65)`/`docs(66)`/`docs(70)`; STATE.md ist teilweise out-of-sync, behauptet Phase 69 EXECUTING + Migration 0088 aus Phase 69, was nicht zum Filesystem passt).
**How to avoid:** Phase 67 reserviert `0090_anime_contributions_release_version`. Plan muss explizit notieren: **abhängig von der Ausführungsreihenfolge**. Falls Phase 65 (0089) NICHT vor 67 landet, ist 0089 frei — der Planner sollte die Nummer **zur Planungszeit gegen die dann existierenden Migrationen prüfen** und ggf. die nächste freie Nummer wählen. CONTEXT.md nennt Phase 67 "Depends on Phase 64" und erweitert Flächen aus 63/65 — die 65-Proposal-Persistenz (`CreateProposal`) ist die Stelle, die das optionale `release_version_id` mit annehmen muss.
**Warning signs:** Migrate-Tool meldet doppelte Versionsnummer; zwei Migrationsdateien mit `0089`.

### Pitfall 5: D-03-Validierung fehlt im Member-Proposal-Pfad
**What goes wrong:** Das Leader-CRUD validiert, aber der Member-Vorschlag (Phase 65 `CreateProposal`) übergeht die Konsistenzprüfung.
**Why it happens:** Zwei getrennte Eingabe-Handler (D-08).
**How to avoid:** `GroupParticipatesInReleaseVersion` in BEIDEN Pfaden aufrufen. Da Phase 65 noch nicht implementiert ist, sollte der Phase-67-Plan die Validierung als gemeinsamen Baustein definieren, den beide Handler nutzen.
**Warning signs:** Member kann inkonsistente Version vorschlagen, die das Leader-Form ablehnen würde.

## Code Examples

### Erweiterter Upsert (ON CONFLICT-Target)
```go
// Source: anime_contributions_upsert_repository.go:32-58 (verifiziert), erweitert
// INSERT ... release_version_id ... 
// ON CONFLICT (fansub_group_id, anime_id, fansub_group_member_id, release_version_id)
// DO UPDATE SET ... (release_version_id bleibt Teil des Keys, nicht des SET)
```

### Frontend-Typ-Erweiterung
```typescript
// Source: frontend/src/types/contributions.ts:34 (verifiziert), erweitert
export interface ReleaseVersionBreakdown {
  release_version_id: number
  episode_number: string      // ep.episode_number ist VARCHAR (verifiziert 0035)
  version: string             // 'v1', 'v2', ...
  contributors: PublicAnimeContribution[]
}

export interface AnimeContributionGroup {
  fansub_group_id: number
  fansub_group_name: string
  fansub_group_slug: string
  active_from_year: number | null
  active_until_year: number | null
  contributors: PublicAnimeContribution[]        // anime-weit (release_version_id IS NULL)
  version_breakdown: ReleaseVersionBreakdown[]    // NEU: sortiert Episode-Nr -> Version
  hidden_contributor_count: number
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `release_member_roles` (Migration 0044) als Credit-Pfad | `anime_contributions` als maßgebliches Credit-Modell | Phase 67 (Weg A, D-04) | `release_member_roles` bleibt unangetastet; Ablösung = eigene spätere Cleanup-Phase. NICHT in Phase 67 anfassen. |
| Contributions nur anime-weit | Optionale Versions-/Episode-Granularität | Phase 67 | Additive Spalte, kein Breaking Change. |

**Deprecated/outdated:**
- `release_member_roles`: als abzulösen markiert (genutzt von `contributor_dashboard_repository.go`, `member_profile_repository.go`, `release_version_notes_repository.go` — verifiziert via Grep). In Phase 67 NICHT migrieren.
- STATE.md-Eintrag "[Phase 69-01]: Migration 0088 ... Cross-Group-Schutz" beschreibt **die existierende 0088** (verifiziert) — die Numerierung in STATE für Phase 69 ist irreführend; verlasse dich auf das Filesystem, nicht auf STATE.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `anime_contributions` enthält nur Testdaten (kein Migrations-Datenrisiko bei UNIQUE-Änderung). | Runtime State Inventory | Niedrig — User-bestätigt im Discussion-Log (Phase 65/67) und STATE. Falls falsch: ADD CONSTRAINT könnte bei Kollisionen fehlschlagen → Pre-Check nötig. |
| A2 | Phase 65 (0089) wird NICHT zwingend vor Phase 67 ausgeführt; Reihenfolge offen. | Pitfall 4 | Mittel — Planner muss Migrationsnummer zur Planungszeit gegen reale Dateien prüfen. |
| A3 | `NULLS NOT DISTINCT` ist auf der Ziel-PG16-Instanz verfügbar. | Pitfall 1 | Niedrig — PG15+ Feature, Projekt nutzt PG16 (CLAUDE.md). Falls deaktiviert/älter: Fallback über partiellen Unique-Index + Trigger nötig. |
| A4 | ON DELETE SET NULL ist das gewünschte Verhalten (historisches Faktum bleibt erhalten). | Pattern 1 | Niedrig — konsistent mit Tabellen-Semantik; ist aber eine Claude's-Discretion-Empfehlung, die der Planner/discuss bestätigen sollte. |
| A5 | Member-Proposal-Pfad (Phase 65 `CreateProposal`) existiert noch nicht und muss von Phase 67 mit-erweitert werden. | Pitfall 5 | Mittel — falls Phase 65 zuerst landet, ist die Erweiterung ein PATCH am dann vorhandenen Code; falls 67 zuerst, muss die Validierung als gemeinsamer Baustein vorgesehen werden. |

## Open Questions

1. **Reihenfolge Phase 65 vs. 67 und damit Migrationsnummer + Proposal-Integration.**
   - What we know: Beide Phasen sind nur geplant, nicht ausgeführt; 65 reserviert 0089.
   - What's unclear: Welche zuerst gemerged wird.
   - Recommendation: Planner prüft `ls database/migrations/` zur Planungszeit und wählt die nächste freie Nummer (vermutlich 0090). Member-Proposal-Erweiterung defensiv als optionalen Block planen.

2. **Trigger als zusätzliche D-03-Absicherung gewünscht?**
   - What we know: Projekt hat aktuell keine DB-Trigger; Handler-Validierung ist die Konvention.
   - What's unclear: Ob Defense-in-Depth gewünscht ist.
   - Recommendation: Primär Handler-Validierung (geringere Komplexität, konsistent). Trigger nur falls der Planner/User explizit DB-Level-Garantie verlangt.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Go Toolchain | Backend-Build | ✓ | 1.26.1 (go.mod: 1.25) | — |
| Node | Frontend-Build | ✓ | 24.14.0 | — |
| PostgreSQL 16 | Schema/Migration | ✓ (per Docker Compose) | 16 (CLAUDE.md) | — (`NULLS NOT DISTINCT` benötigt PG15+, erfüllt) |
| Docker Compose | Integrierte Laufzeit/UAT | ✓ (CLAUDE.md) | — | Lokale npm/go-Runs für Teilarbeit möglich |

**Missing dependencies with no fallback:** Keine.
**Missing dependencies with fallback:** Keine.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Backend: Go `testing` + testify; Migrationen: `backend/internal/migrations/*_test.go` (string-contract); Frontend: Vitest 3 |
| Config file | `frontend/vitest.config.ts` (Path-Alias `@`); Backend: kein zentrales, `go test ./...` |
| Quick run command | `go test ./backend/internal/migrations/... ./backend/internal/repository/... -run Contribution -count=1` |
| Full suite command | `cd backend && go test ./... -count=1` ; `cd frontend && npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| P67-SC1 | Migration fügt `release_version_id` (nullable, FK SET NULL) + erweitert UNIQUE-Constraint | migration-contract | `go test ./backend/internal/migrations/... -run Phase67 -count=1` | ❌ Wave 0 |
| P67-SC1 | UNIQUE erlaubt anime-weit + versions-spezifisch für selben Member; verhindert exaktes Duplikat | unit (repo, DB-gestützt) | `go test ./backend/internal/repository/... -run ReleaseVersion -count=1` | ❌ Wave 0 |
| P67-SC1 | D-03: Create/Update mit gruppen-fremder Version → 422 | unit/handler | `go test ./backend/internal/handlers/... -run ReleaseVersion -count=1` | ❌ Wave 0 |
| P67-SC2 | Public-Query: anime-weite + versions-spezifische Ebene getrennt, keine Doppelanzeige, sortiert Episode→Version | unit (repo) | `go test ./backend/internal/repository/... -run PublicAnimeContributions -count=1` | ❌ Wave 0 |
| P67-SC2 | Frontend: aufklappbare Versions-Detailebene rendert Episode·Version-Gruppen | component | `npm run test -- GroupContributionBlock` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `go test ./backend/internal/migrations/... -count=1` (+ betroffene repo/handler-Pakete)
- **Per wave merge:** `cd backend && go test ./... -count=1` und `cd frontend && npm run test`
- **Phase gate:** Volle Suite grün + Docker-Rebuild + Browser-UAT (Anime-Seite Aufschlüsselung, beide Formulare).

### Wave 0 Gaps
- [ ] `backend/internal/migrations/phase67_release_version_credits_test.go` — Migration-Contract für P67-SC1 (Spalte, FK SET NULL, erweiterter UNIQUE, Index, idempotente up/down). Muster: `phase61_contributions_model_test.go`.
- [ ] `backend/internal/repository/anime_contributions_release_lookup_repository_test.go` — `GroupParticipatesInReleaseVersion` + Dropdown-Query.
- [ ] Repo-Test für erweiterte Public-Query (Ebene-Trennung, Sortierung) — bisher existiert KEIN `*contribution*_test.go` für Repo/Handler (verifiziert: nur `phase61_contributions_model_test.go`).
- [ ] `frontend/src/components/anime/GroupContributionBlock.test.tsx` (+ ggf. `ReleaseVersionBreakdown.test.tsx`) — bisher KEINE Frontend-Tests für den Contributions-Bereich (verifiziert).
- [ ] Framework-Install: keiner — Go-testing/testify/Vitest bereits vorhanden.

## Security Domain

> `security_enforcement` ist in `.planning/config.json` **nicht gesetzt** → als enabled behandelt.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Bestehend: `authMiddleware` (me-Routen), Keycloak-Access-Token (Phase 51). Unverändert. |
| V3 Session Management | no | Keine Session-Änderung. |
| V4 Access Control | yes | Leader-CRUD: `permissionSvc.CanForFansubGroup(...MembersManage)` (verifiziert im Handler). Member-Proposal: Ownership über `resolveVerifiedMemberID` + eigene-Gruppen-Bindung (Phase 65 D-01). Neue Version darf nur gesetzt werden, wenn Gruppe beteiligt (D-03) — verhindert Privilege-/Daten-Confusion. |
| V5 Input Validation | yes | `release_version_id` als `int64`/positiv validieren; Existenz + Gruppen-Zugehörigkeit serverseitig prüfen (nie Client vertrauen). Status-/Role-Validierung bleibt bestehend. |
| V6 Cryptography | no | Keine Krypto. |

### Known Threat Patterns für Go/Gin + pgx + PostgreSQL

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL Injection über `release_version_id` | Tampering | Parametrisierte pgx-Queries (`$1`/`$2`) — durchgängig im bestehenden Code (verifiziert). Nie String-Konkatenation. |
| Cross-Group-Daten-Tampering (fremde Version setzen) | Tampering / Elevation | D-03-Handler-Validierung (`GroupParticipatesInReleaseVersion`) + erweiterter UNIQUE. |
| IDOR auf Contribution beim Bearbeiten | Elevation | Bestehender `CanForFansubGroup`-Check (Leader) bzw. `authorizeAnimeContributionOwner` (me) — auf neuen PATCH-Pfad mit `release_version_id` ausweiten. |
| Information Disclosure: nicht-öffentliche Beiträge in Versions-Ebene | Info Disclosure | Ebene-2-Query MUSS dieselben Public-Filter führen (`is_public_on_anime_page = true AND hfgm.visibility = 'public'`) wie Ebene 1 (verifiziert im bestehenden Query). |
| German strings / Umlaut-Korrektheit | (Compliance) | CLAUDE.md-Regel: korrekte Umlaute in allen user-facing Go-Response-Strings + JSX. |

## Project Constraints (from CLAUDE.md)

- **Max. 450 Zeilen** pro Produktcode-Datei → Auslagerung zwingend (Pitfall 3; betroffene Dateien bereits bei 447/435/390 Zeilen).
- **Korrekte deutsche Umlaute** in allen user-facing Strings (JSX-Text, Button-Labels, Fehlermeldungen, Placeholder, aria-labels, Toasts, Go-Response-Strings). ASCII-Ersatz (ae/oe/ue/ss) verboten. Code-Bezeichner ausgenommen.
- **Brownfield/Kompatibilität:** Bestehende Routen, DB-Evolution (append-only Migrationen), Stack intakt lassen. Erweitern, nicht ersetzen.
- **Append-only Migrationen** unter `database/migrations/*.sql` mit up/down.
- **Observability:** Admin-Aktionen mit Audit-Attribution (`auditLogRepo.Write`, bestehend); operative Fehler im UI sichtbar.
- **Handler-Verdrahtung explizit** in `backend/cmd/server/main.go` (keine DI-Container).
- **API-Aufrufe zentral** über `frontend/src/lib/api.ts`; Domain-Typen in `frontend/src/types/`.
- **Shared Contracts** in `shared/contracts/openapi.yaml` mitpflegen.
- **GSD-Workflow:** Edits nur über GSD-Command.

## Sources

### Primary (HIGH confidence)
- `database/migrations/0035_add_release_tables.up.sql` — release_versions/fansub_releases/release_version_groups Schema, episode_id NOT NULL bestätigt.
- `database/migrations/0086_anime_contributions.up.sql` — Zieltabelle, "historisches Faktenregister", FK-ON-DELETE-Muster.
- `database/migrations/0087_anime_contribution_roles_and_badges.up.sql` — Rollen-CASCADE.
- `database/migrations/0088_anime_contributions_constraints.up.sql` — `uq_anime_contribution_member` (kritisch für Pitfall 1).
- `backend/internal/repository/anime_contributions_public_repository.go` — Ebene-1-Query, attachHiddenCounts-Muster (390 Z.).
- `backend/internal/repository/anime_contributions_repository.go` — Create/Update, MemberBelongsToFansub-Muster (447 Z.).
- `backend/internal/repository/anime_contributions_upsert_repository.go` — ON CONFLICT-Target.
- `backend/internal/repository/admin_content_fansub_releases.go` — ListFansubAnimeReleases (Dropdown-Muster).
- `backend/internal/handlers/fansub_anime_contributions_handler.go` — Leader-CRUD, Permission/Audit/Validierung (435 Z.).
- `backend/internal/handlers/contributions_me_handler.go` — Me-/Ownership-Muster.
- `backend/internal/migrations/phase61_contributions_model_test.go` — Migration-Contract-Test-Muster.
- `frontend/src/components/anime/AnimeContributionsSection.tsx`, `GroupContributionBlock.tsx`, `frontend/src/types/contributions.ts` — Anzeige + Typen.
- `.planning/phases/67-release-episode-credits/67-CONTEXT.md` + Discussion-Log; `.planning/phases/65-*/65-01-PLAN.md` (0089-Reservierung); `.planning/REQUIREMENTS.md` (P67-SC1/SC2); `.planning/STATE.md`.
- `git log` + `ls database/migrations/` — höchste Migration = 0088 verifiziert; Phasen 65/66/67/70 nur geplant.

### Secondary (MEDIUM confidence)
- `CLAUDE.md` — Stack/Constraints/Conventions.
- `.planning/config.json` — nyquist_validation=true; security_enforcement nicht gesetzt.

### Tertiary (LOW confidence)
- Keine. Alle Befunde aus direktem Codebase-Read.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — keine neuen Pakete, alle aus bestehenden Imports verifiziert.
- Architecture: HIGH — alle Muster im Repo gelesen und referenziert.
- Pitfalls: HIGH — UNIQUE-Constraint-Kollision direkt aus Migration 0088 + Upsert-Code verifiziert; Migrationsnummer aus Filesystem + Phase-65-Plan.

**Research date:** 2026-06-02
**Valid until:** 2026-07-02 (stabiler Brownfield-Stack; Hauptrisiko ist die Ausführungsreihenfolge Phase 65/66/67 → Migrationsnummer zur Planungszeit erneut prüfen).
