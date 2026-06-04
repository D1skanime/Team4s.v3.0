# Phase 72: Domänen-Projektionen & Status-Fundament - Research

**Researched:** 2026-06-04
**Domain:** Go/pgx Read-Projektionen + append-only SQL-Schema + OpenAPI/TypeScript-Contract-Abgleich (Brownfield, Team4s)
**Confidence:** HIGH (alle Kernbefunde direkt im Quellcode/Migrationen verifiziert)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Konflikt („Das war ich nicht") = **separate Dimension** (z. B. `dispute_state`: none/open/resolved) **neben** dem inhaltlichen Contribution-Status (draft/proposed/confirmed). Inhaltlicher Status bleibt beim Bestreiten erhalten. Genau **eine** aktive Konflikt-Dimension pro Eintrag (keine Dispute-Historien-Tabelle in v1.2).
- **D-02:** „Das war ich" = Contribution-Logik, NICHT Claim-Logik (Lock H). „Das war ich nicht" löscht nichts, setzt nur `dispute_state=open` (Lock E).
- **D-03:** **Zwei orthogonale Achsen**, einheitlich für Medien UND Contributions: Achse 1 **Sichtbarkeit** über `visibilities`-Lookup; Achse 2 **Review-/Lebenszyklus-Status** als separates Feld (in Prüfung / freigegeben / abgelehnt / archiviert / entfernt). „intern aber geprüft" und „öffentlich UND freigegeben" müssen ausdrückbar sein.
- **D-04:** Nur Fremd-Vorschläge und Konflikte landen automatisch „in Prüfung". Leader-/Admin-eigene Uploads/Einträge automatisch „freigegeben". Review-Queue (Phase 78) füllt sich nur aus registrierten Nicht-Berechtigten-Vorschlägen (Phase 76) und Konflikten.
- **D-05:** Phase 72 = **Schema (Migrationen) + Read-Projektionen + Contracts/Typen**. ALLE Schreib-Aktionen (memorial setzen, dispute öffnen/auflösen, Review freigeben, Sichtbarkeit ändern) baut die jeweils nutzende Phase. Keine endpunktlosen Writes in 72.
- **D-06:** In Phase 72 existiert nur der **Statuswert** `memorial` (kein Verhalten). Setter + Claim-Sperre landen gemeinsam in Phase 74.

### Claude's Discretion
- Konkrete Spaltennamen/Enum-Werte, Migrationsnummern, neue Lookup-Tabelle vs. Enum-Spalte je Statusfeld, Repository-/Projektions-Schichtung (eigener Query-Layer vs. Erweiterung bestehender Repos) — Researcher/Planner entscheiden, solange D-01..D-06 und Locks eingehalten.
- Wiederverwendung der vorhandenen `media_assets`/`media_files`-Status-Spalten (Phase 34/35) und `media_assets.owner_member_id` (Phase 70) vs. additive Felder — Planner-Entscheid.

### Deferred Ideas (OUT OF SCOPE)
- Schreib-Flows für memorial/dispute/review/visibility → Phasen 74/76/78/80.
- Memorial-Setter + Claim-Sperre → Phase 74 (D-06).
- Mehrfach-/parallele Anfechtungen mit eigener Historie (eigene Dispute-Tabelle, Option C) → NICHT in v1.2.
- Public-Darstellung der Trennung Mitglied/Mitwirkender und der Sichtbarkeitsregeln → Phasen 73/74/75.
</user_constraints>

<phase_requirements>
## Phase Requirements

Phasen-Requirement-IDs sind die Meilenstein-Entscheidungen A, G, H, I, J, K aus `.planning/milestones/v1.2-DISCUSSION.md`.

| ID | Beschreibung | Research Support |
|----|--------------|------------------|
| **A** | Keine Greenfield-Phase — bestehende Tabellen/Repos/Contracts erweitern, keine Parallelmodelle | Bestehende Projektions-Repos (`anime_contributions_public_repository.go`, `member_archive_repository.go`, `contributor_dashboard_repository.go`) sind die zu erweiternden Seams. Append-only Migrationen ergänzen Spalten, ersetzen keine Tabellen. Siehe `Architecture Patterns`. |
| **G** | Medien folgen strikt der Ownership-Matrix; Member-Medien über `media_assets.owner_member_id` | `owner_member_id` existiert seit 0090; `media_assets.status` ist TECHNISCH (processing/ready/failed/deleted), NICHT Review. Review+Visibility müssen additiv (Achse 2 / Achse 1). Siehe `Runtime State Inventory` + `Don't Hand-Roll`. |
| **H** | Claims, Requests, Contributions strikt getrennt | `member_claims` (claim_status pending/verified/rejected) ist separat von `anime_contributions.status`. Projektion liefert „claimed"/„unclaimed" derived aus `member_claims`, NICHT aus Contributions. Siehe `Membership vs. Contribution Separation`. |
| **I** | Rechte scoped; Daten für `/admin/users` vorbereiten | Phase-72-Projektionen liefern die Lese-Aggregate, die 80 konsumiert (Mitgliedschaften, Claims, Contributions, Medien je App-User). Keine Write-/Permission-Logik in 72 (D-05). |
| **J** | Gedenkprofile = eigener Status; nicht claimbar | `memorial` als reiner Statuswert (D-06). `members` hat HEUTE KEINE status-Spalte → additive Spalte nötig. Siehe `Runtime State Inventory` + `Open Questions`. |
| **K** | Contract/API-Disziplin Pflicht; kein ad-hoc-Fetch; keine undokumentierten Felder | OpenAPI (`openapi.yaml` + ggf. `admin-content.yaml`) + `frontend/src/lib/api.ts` + `frontend/src/types/*.ts` gemeinsam pflegen. Siehe `Contracts (Lock K)` + `Common Pitfalls`. |
</phase_requirements>

## Summary

Phase 72 ist eine reine **Backend-/Schema-/Contract-Fundamentphase** in einem reifen Brownfield-System. Das Team4s-Schema folgt einer append-only Migrationskonvention unter `database/migrations/` mit Paaren `.up.sql`/`.down.sql`. Die **nächste freie Migrationsnummer ist 0096** (höchste vorhandene: `0095_archive_search_indexes`). Die CONTEXT-Notiz „0089/0091 bereits vergeben" ist veraltet, aber harmlos — beide sind belegt, 0096+ sind frei.

Die Read-Projektionen sollten dem **bereits etablierten Projektions-Repository-Muster** folgen: dedizierte Repos mit `Public…Row`/`Public…Response`-DTOs (snake_case JSON-Tags, die exakt zu `frontend/src/types/*.ts` passen), reine SQL-Joins über pgx, ein Handler pro Domäne, der die DTO direkt als `c.JSON(http.StatusOK, response)` zurückgibt. Das kanonische Vorbild ist `anime_contributions_public_repository.go` — es zeigt bereits die saubere Trennung Mitglied (`hist_fansub_group_members`) vs. Mitwirkender (`anime_contributions`) und derived Slugs/Labels.

Drei Kernbefunde steuern die Planung: (1) **`anime_contributions.status` enthält bereits `disputed`** als inhaltlichen Statuswert — D-01 fordert aber eine **getrennte** Konflikt-Dimension; der `disputed`-Wert im Content-Status darf NICHT als Konflikt-Achse zweckentfremdet werden. (2) **`media_assets.status` ist ein technischer Verarbeitungs-Lifecycle** (processing/ready/failed/deleted), KEIN Review-Status — D-03 Achse 2 braucht additive Felder. (3) **`members` hat heute KEINE status-Spalte**; active/historical/claimed/unclaimed werden derived, `memorial` muss additiv ergänzt werden.

**Primary recommendation:** Eine einzige append-only Migration `0096` für alle additiven Statusfelder (memorial-fähiger member-status, `dispute_state` auf `anime_contributions`, Review-/Visibility-Felder auf Medien-/Contribution-Trägern); danach dedizierte Read-Projektions-Repos nach dem Muster von `anime_contributions_public_repository.go`; abschließend OpenAPI + `api.ts`-Typen im selben Slice. Keine Write-Endpunkte, keine Default-Wert-Verhalten außer DB-Defaults.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Statusfelder als Schema (memorial, dispute_state, review/visibility) | Database / Storage (`database/migrations/0096_*`) | — | Append-only Migrationen sind kanonisch; Felder müssen DB-seitig per CHECK validiert werden. |
| Trennung Mitglied/Mitwirkender/historisch als typisierte Mengen | API / Backend (Projektions-Repo + Handler) | Database (Joins) | Read-Projektion ist Backend-Verantwortung; Trennung entsteht durch Quell-Tabellen-Wahl im SQL. |
| Medien-Owner/Kategorie/Sichtbarkeit/Review-Metadaten in Projektion | API / Backend | Database | Konsumierbare DTO für UI-Surfaces 73–80; Felder liegen in `media_assets`/Junction-Tabellen. |
| Contract-/Typen-Abgleich (OpenAPI ↔ api.ts) | API / Backend (OpenAPI) | Frontend Server (`api.ts`-Typen) | Lock K: Contract zuerst, Backend-DTO + Frontend-Typ gemeinsam. |
| Schreib-Aktionen (memorial setzen, dispute öffnen, Review) | — (OUT OF SCOPE, Phasen 74/76/78/80) | — | D-05: keine Writes in 72. |

## Standard Stack

Keine neuen externen Pakete in dieser Phase. Es wird ausschließlich der bestehende, in `CLAUDE.md` festgelegte Stack genutzt.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Go | 1.25.0 | Backend-Sprache | `backend/go.mod` [VERIFIED: backend/go.mod] |
| Gin (`github.com/gin-gonic/gin`) | bestehend | HTTP-Handler | Etabliertes Framework, alle Handler nutzen `*gin.Context` [VERIFIED: handlers/contributions_public_handler.go] |
| pgx/v5 (`github.com/jackc/pgx/v5`) | bestehend | Postgres-Zugriff | Alle Repos nutzen `pgxpool.Pool` + `r.db.Query` [VERIFIED: repository/anime_contributions_public_repository.go] |
| PostgreSQL | 16 | DB-Runtime | `docker-compose.yml`; Migration 0091 nutzt PG15+ `NULLS NOT DISTINCT` [CITED: database/migrations/0091] |
| Vitest | ^3.2.4 | Frontend-Typ-/Unit-Tests | `frontend/package.json` script `"test": "vitest run"` [VERIFIED: frontend/package.json] |
| testify (`github.com/stretchr/testify`) | bestehend | Go-Tests | Bestehende `*_test.go` im Repository-Layer [VERIFIED: repository/*_test.go] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `golang.org/x/text/unicode/norm` | bestehend | Slug-/Unicode-Normalisierung | Falls Projektionen Member-Slugs ableiten (Vorbild in `member_profile_repository.go`) [VERIFIED] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Enum-CHECK-Spalte je Statusfeld | Eigene Lookup-Tabelle (wie `visibilities`/`role_definitions`) | Lookup ist erweiterbar ohne Migration und referenzierbar per FK; CHECK-Spalte ist einfacher, aber Wertänderung erfordert Migration. Siehe `Open Questions Q1`. Für `dispute_state` (3 stabile Werte) reicht CHECK; für Review-Status (5 Werte, evtl. erweiterbar) Lookup erwägen. |

**Installation:** Keine. (`Package Legitimacy Audit` entfällt — keine externen Pakete.)

## Architecture Patterns

### System Architecture Diagram

```
                       Phase 72 = Reads + Schema + Contracts (KEINE Writes)

  [DB: database/migrations/0096_*.up.sql]   <-- append-only, additive Spalten
        |  members.status (+ 'memorial')
        |  anime_contributions.dispute_state (none/open/resolved)
        |  Medien-/Contribution-Träger: visibility_id (FK -> visibilities) + review_status
        v
  [Repository / Projektions-Layer  backend/internal/repository/]
        |   dedizierte *_public/*_projection Repos
        |   reine SELECT-Joins (pgx), DTOs mit snake_case json-Tags
        |   Quellwahl ERZEUGT die Trennung:
        |     - Mitglied      <- fansub_group_members / hist_fansub_group_members
        |     - Mitwirkender  <- anime_contributions / anime_contribution_roles / release_member_roles
        |     - historisch    <- hist_* mit status='historical' / unbestätigt
        v
  [Handler-Layer  backend/internal/handlers/]
        |   1 Handler-Methode pro Read-Endpoint
        |   c.JSON(http.StatusOK, response)   (Envelope-Frage siehe unten)
        v
  [Route-Registration  main.go / admin_routes.go]
        v
  [Contract  shared/contracts/openapi.yaml (+ admin-content.yaml)]
        v
  [Frontend-Client  frontend/src/lib/api.ts]
        |   apiClientFetch (KEIN ad-hoc fetch, Lock K)
        v
  [Frontend-Typen  frontend/src/types/*.ts]   <-- snake_case spiegelt DTO 1:1

  Konsumenten (spätere Phasen, NICHT Teil von 72):
     73 Public Fansub | 74 Member+Memorial | 75 Anime-Group | 76 /me/contributions
     78 Leader-Review  | 80 /admin/users
```

### Recommended Project Structure
```
database/migrations/
  0096_v12_status_foundation.up.sql      # alle additiven Statusfelder (oder 1 Migration je Träger)
  0096_v12_status_foundation.down.sql    # exakte Rollbacks (DROP COLUMN/INDEX/CONSTRAINT)

backend/internal/repository/
  <domain>_projection_repository.go      # neue Read-Projektionen, < 450 Zeilen je Datei
  # Vorbild: anime_contributions_public_repository.go

backend/internal/handlers/
  <domain>_projection_handler.go         # dünne Handler, DTO direkt zurückgeben

shared/contracts/
  openapi.yaml                            # Pfade + Schemas ergänzen
  admin-content.yaml                      # nur falls admin-content-Projektion betroffen

frontend/src/
  lib/api.ts                              # Client-Funktionen
  types/<domain>.ts                       # Typen spiegeln DTO snake_case 1:1
```

### Pattern 1: Projektions-Repository mit Public-DTO
**What:** Dediziertes Repo mit `Public…Row`/`Public…Response`-Structs, snake_case JSON-Tags, reine SQL-Joins. DTO-Tags müssen exakt zu `frontend/src/types/*.ts` passen.
**When to use:** Für jede neue Lese-Projektion in Phase 72.
**Example:**
```go
// Source: backend/internal/repository/anime_contributions_public_repository.go (gekürzt)
type PublicContributorRow struct {
    MemberDisplayName string   `json:"member_display_name"`
    MemberSlug        *string  `json:"member_slug"`
    Roles             []string `json:"roles"`
    IsVerified        bool     `json:"is_verified"`
}
// Trennung entsteht durch Quell-Tabellen-Wahl:
//   JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id  -> Mitwirkender-Kontext
//   WHERE ac.is_public_on_anime_page = true AND hfgm.visibility = 'public'
```

### Pattern 2: Dünner Handler, DTO direkt zurückgeben
```go
// Source: backend/internal/handlers/contributions_public_handler.go
func (h *ContributionsPublicHandler) GetAnimeContributions(c *gin.Context) {
    animeID, err := parseAnimeID(c.Param("id"))
    if err != nil { badRequest(c, "ungültige anime-id"); return }
    response, err := h.repo.GetPublicAnimeContributions(c.Request.Context(), animeID)
    if err != nil { internalError(c, "interner serverfehler"); return }
    c.JSON(http.StatusOK, response) // KEIN {"data":...}-Envelope bei diesen Public-Reads
}
```

### Pattern 3: Append-only Migration (additiv, idempotent)
```sql
-- Source: database/migrations/0090_member_story_images.up.sql (Muster)
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS owner_member_id BIGINT
    REFERENCES members(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_media_assets_owner_member
    ON media_assets(owner_member_id) WHERE owner_member_id IS NOT NULL;
-- .down.sql spiegelt exakt: DROP INDEX ...; ALTER TABLE ... DROP COLUMN ...;
```

### Anti-Patterns to Avoid
- **`disputed` im Content-Status als Konflikt-Achse missbrauchen:** `anime_contributions.status` hat bereits `disputed` (Migration 0086). D-01 verlangt eine SEPARATE Dimension. Der Content-Status muss beim Bestreiten erhalten bleiben — also NICHT `status='confirmed'` → `status='disputed'`, sondern `dispute_state='open'` zusätzlich.
- **`media_assets.status` als Review-Status umdeuten:** Das ist ein technischer Lifecycle (processing/ready/failed/deleted). Review (in Prüfung/freigegeben/…) ist eine andere Achse → additiv.
- **Gruppenmitgliedschaft aus Contributions ableiten:** Verboten (Entscheidung 3, Lock A). Eine `anime_contributions`-Zeile erzeugt NIE einen Mitglieds-Eintrag.
- **`hist_*`-`visibility`-String mit `visibilities`-Lookup vermischen ohne Plan:** Heute nutzen `hist_fansub_group_members.visibility` / `hist_group_member_roles.visibility` einen freien VARCHAR ('internal'/'public'), NICHT die `visibilities`-Lookup-FK. D-03 Achse 1 fordert `visibilities`-Lookup. Inkonsistenz bewusst entscheiden (Open Questions Q2).
- **Write-Endpunkte oder Setter in 72:** D-05 — nichts dergleichen.
- **`{"data":...}`-Envelope inkonsistent einführen:** Bestehende Public-Contribution-Reads geben das DTO direkt zurück. Neue Reads sollten dem benachbarten Analog folgen, nicht ad hoc envelopen (Open Questions Q3).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sichtbarkeits-Werte | Neue Enum-Spalte mit eigenen Visibility-Strings | `visibilities`-Lookup (0037: public/registered/fansubber/staff/private) per FK | D-03 Achse 1 fordert genau diese Lookup-Tabelle; Neubau = Parallelmodell (Lock A). |
| Rollen-Labels | Hartkodierte deutsche Rollennamen | `role_definitions` (code → label_de, contexts[]) | Etablierte Lookup; Projektionen joinen `COALESCE(rd.label_de, code)`. |
| Member-Slug-Ableitung | Eigene Slug-Logik | `memberSlugExpr`/`memberDisplayExpr` aus `anime_contributions_public_repository.go` | Bereits konsistent etabliert; Doppelarbeit = Drift. |
| Audit-Attribution | Neue Audit-Tabelle | `audit_logs` / `admin_anime_mutation_audit` | Inventar warnt explizit: nicht nachbauen. (In 72 nur lesen/Felder bereitstellen, Writes später.) |
| Member-Medien-Owner | Neue Owner-Spalte | `media_assets.owner_member_id` (0090) | Existiert bereits; G fordert genau dieses Feld. |
| Technischer Media-Lifecycle | Neuen processing-Status | `media_assets.status` (0059) | Existiert; NUR der Review-Status (D-03 Achse 2) ist additiv. |

**Key insight:** Nahezu alle „Bausteine" existieren bereits. Phase 72 ergänzt punktuell additive Statusfelder und baut LESE-Projektionen darüber. Jeder Neubau eines existierenden Konzepts verstößt gegen Lock A.

## Runtime State Inventory

> Diese Phase ändert Schema und fügt Felder hinzu (kein Rename), enthält aber eine Bestandsaufnahme existierender Status-/Owner-Spalten, weil die Discretion-Frage „reuse vs. additiv" davon abhängt.

| Kategorie | Befund | Handlungsbedarf |
|-----------|--------|------------------|
| **`anime_contributions.status`** | CHECK: `draft, proposed, confirmed, disputed, hidden` (Migration 0086). Enthält bereits `disputed` als CONTENT-Wert. | **Additiv:** neue Spalte `dispute_state` (none/open/resolved) ergänzen (D-01). `disputed` im Content-Status NICHT als Konflikt-Achse nutzen. Planner-Entscheid: ob `hidden`/`disputed` Content-Werte bleiben. |
| **`media_assets.status`** | CHECK: `processing, ready, failed, deleted` (Migration 0059) — TECHNISCHER Lifecycle. | **Additiv:** Review-Status (D-03 Achse 2) als neue Spalte/Lookup. NICHT in `status` mischen. |
| **`media_files.status`** | CHECK: `processing, ready, failed, missing, deleted` (0059) — technisch. | Keine Review-Semantik; unverändert lassen. |
| **`media_assets.owner_member_id`** | Existiert seit Migration **0090** (nicht 0089, CONTEXT-Notiz ungenau), FK → `members(id)` ON DELETE SET NULL. | Wiederverwenden für Member-Medien-Owner (G). KEINE neue Spalte. Owner-TYP (group/anime/release/member) ist noch NICHT in `media_assets` modelliert — siehe Open Questions Q4. |
| **`members` (Status)** | KEINE `status`-Spalte. Vorhanden: `is_currently_active` (bool), `profile_visibility` (public/members_only), `active_from/until_date`. Claimed/unclaimed wird derived aus `member_claims`. | **Additiv:** Spalte für `memorial`-fähigen Member-Status (D-06/J). active/historical/unclaimed/claimed bleiben derived/projektiert; `memorial` als persistierter Wert. Siehe Open Questions Q1. |
| **`visibilities`-Lookup** | Migration 0037: Werte `public, registered, fansubber, staff, private`. NICHT nur „intern/öffentlich" wie CONTEXT annahm. Referenziert heute von `release_streams.visibility_id`. | D-03 Achse 1: neue Träger per `visibility_id BIGINT REFERENCES visibilities(id)` anbinden. Reuse, kein Neubau. |
| **`hist_*`.visibility** | `hist_fansub_group_members.visibility` / `hist_group_member_roles.visibility` = freier VARCHAR ('internal'/'public'), NICHT `visibilities`-FK. | Inkonsistenz zur `visibilities`-Lookup. Planner entscheidet, ob 72 angleicht oder nur dokumentiert (Open Questions Q2). |
| **`member_claims.claim_status`** | CHECK: `pending, verified, rejected` (0081). Getrennt von Contribution-Status. | Quelle für derived „claimed"/„unclaimed" in Member-Projektion (H). Unverändert. |
| **`fansub_group_members.status`** | CHECK: `active, disabled` (0073, app-user-backed). | Quelle „aktives Mitglied" in Member-/Gruppen-Projektion. Unverändert. |
| **`hist_fansub_group_members.status`** | CHECK: `draft, historical, confirmed, disputed` (0082). | Quelle „historisch/unbestätigt". Unverändert; `disputed` hier ist eigener Status pro hist-Eintrag. |
| **Build-Artefakte / Live-Service-Config / OS-State / Secrets** | Keine. Reine Schema-/Code-Phase, keine externen Runtime-Registrierungen, keine env-/Secret-Namen betroffen. | None — verifiziert: keine Rename-/Migrationsdaten-Operationen, nur additive Spalten mit DB-Defaults. |

**Migrations-Nummer:** Nächste freie = **0096** (höchste vorhandene: `0095_archive_search_indexes`). [VERIFIED: ls database/migrations]. Backend-lokale Migrationen unter `backend/database/migrations/` sind eine **Legacy-Parallelwelt** (nur `001_create_media_tables`) — NICHT kanonisch (Inventar-Warnung). Neue Migrationen ausschließlich unter `database/migrations/`.

## Membership vs. Contribution Separation

Die drei getrennten, typisierten Mengen (Lock A, Entscheidung 3) entstehen durch Quell-Tabellen-Wahl im SQL — nicht durch nachträgliche Filterung:

| Menge | Kanonische Quell-Tabellen | Join-Anker | Typische WHERE-Bedingung |
|-------|---------------------------|------------|--------------------------|
| **A. Gruppenmitglied (App)** | `fansub_group_members`, `fansub_group_member_roles` | `fansub_group_id`, `app_user_id` | `status='active'` |
| **A2. Historisches Mitglied** | `hist_fansub_group_members`, `hist_group_member_roles` | `fansub_group_id`, `member_id` | `status IN ('historical','confirmed')`, `visibility='public'` für public |
| **B. Externer/projektbez. Mitwirkender** | `anime_contributions`, `anime_contribution_roles`, `release_member_roles` | `fansub_group_id`+`anime_id`(+`release_version_id`), `fansub_group_member_id` → `hist_fansub_group_members` | `is_public_on_anime_page` / `is_public_on_member_profile` |

**Kritische Constraints (auf DB-Ebene bereits durchgesetzt):**
- `anime_contributions.fansub_group_member_id` ist **NOT NULL** und FK → `hist_fansub_group_members(id)` (0086). Ein Contributor ist also IMMER an eine (historische) Gruppenmitgliedschaft gebunden — aber das ist eine Faktenreferenz, KEINE App-Mitgliedschaft.
- Composite-FK `(fansub_group_id, fansub_group_member_id)` (0088) verhindert Cross-Group-Zuordnung.
- Member-Profil-Verknüpfung: `hist_fansub_group_members.member_id` → `members(id)`; App-User-Verknüpfung läuft separat über `member_claims` (member_id ↔ app_user_id).
- „claimed"/„unclaimed" eines Members = derived aus `member_claims.claim_status='verified'`, NICHT aus Contributions (Lock H).

**Query-Shape für drei separierte Sets (eine Gruppe):** drei UNION-freie, getrennte SELECTs (je eine DTO-Liste) — Vorbild ist die UNION ALL in `GetPublicMemberContributions`, aber für die Trennung sollten die drei Mengen als getrennte JSON-Arrays geliefert werden (`{ members: [], historical: [], contributors: [] }`), damit die UI sie unterschiedlich gewichten kann (Entscheidung 3: unbestätigte Nennungen schwächer darstellen).

## Contracts (Lock K)

**Contract-Dateien:** `shared/contracts/openapi.yaml` (Umbrella, 9616 Zeilen, OpenAPI 3.0.3) ist die maßgebliche Datei für Public-/App-Reads. `shared/contracts/admin-content.yaml` nur bei admin-content-Projektionen. Domänen-Splits existieren (`contributions.yaml`, `fansubs.yaml` …) als zusätzliche Referenzen.

**Pflicht-Reihenfolge (Entscheidung 14 / Lock K):**
1. `openapi.yaml` (Pfad + Schema) → 2. ggf. `admin-content.yaml` → 3. Route-Registration in `main.go` / `admin_routes.go` → 4. DTO/Handler/Repository → 5. `frontend/src/lib/api.ts` → 6. `frontend/src/types/*.ts` → 7. Tests.

**Typ-Spiegelung:** Frontend-Typen sind 1:1-Spiegel der Go-DTO mit snake_case-Feldnamen.
```ts
// Source: frontend/src/types/contributions.ts (Muster)
export interface PublicAnimeContribution {
  member_display_name: string
  member_slug: string | null
  roles: string[]
  is_verified: boolean
}
```

**Lock-K-Regeln:** `apiClientFetch`/Helpers verwenden; keine direkten Browser→Backend-Fetches; keine Token-/Cookie-Direktzugriffe; **keine undokumentierten Response-Felder voraussetzen** (jedes neue DTO-Feld muss in OpenAPI UND als Typ existieren).

**Envelope:** Gemischt im Code. Die benachbarten Public-Contribution-Reads geben das DTO direkt zurück (KEIN `{"data":...}`). CONTEXT verweist auf eine `{"data":...}`-Konvention (STATE Phase 62 D3). → Open Questions Q3: pro neuem Endpoint dem nächstgelegenen Analog folgen.

## Common Pitfalls

### Pitfall 1: Konflikt-Dimension mit Content-Status verwechseln
**What goes wrong:** Beim Bestreiten wird `anime_contributions.status` von `confirmed` auf `disputed` gesetzt → inhaltlicher Status zerstört.
**Why it happens:** `status` enthält bereits `disputed` (0086), was zur Wiederverwendung verleitet.
**How to avoid:** Additive Spalte `dispute_state` (none/open/resolved). Content-Status bleibt unangetastet (D-01/D-02). Genau eine aktive Konflikt-Dimension pro Eintrag.
**Warning signs:** Migration/Code, das `status='disputed'` schreibt; Projektion, die Konflikt aus `status` ableitet.

### Pitfall 2: Review-Status in `media_assets.status` mischen
**What goes wrong:** `media_assets.status` (technisch) wird um Review-Werte erweitert → vermischt „Datei fertig?" mit „freigegeben?".
**How to avoid:** Review-Status (D-03 Achse 2) als eigene Spalte/Lookup additiv. Visibility (Achse 1) per `visibilities`-FK.
**Warning signs:** CHECK-Constraint auf `media_assets.status` um 'in_review'/'approved' erweitert.

### Pitfall 3: `visibilities`-Werte falsch annehmen
**What goes wrong:** Annahme „intern/öffentlich" als die zwei Werte. Tatsächlich: `public/registered/fansubber/staff/private` (0037).
**How to avoid:** Vor Projektions-Logik die echten Werte prüfen; Mapping „intern" → welche der fünf? bewusst entscheiden.
**Warning signs:** Code, der nur 2 Visibility-Werte behandelt.

### Pitfall 4: 450-Zeilen-Limit bei Projektions-Repos
**What goes wrong:** Neue Projektionen in bestehende, schon große Dateien stopfen.
**Why it happens:** `member_profile_repository.go` (1225) und `contributor_dashboard_repository.go` (533) überschreiten das Limit BEREITS (Altlast).
**How to avoid:** NEUE Projektionen in NEUE, fokussierte Dateien (< 450 Zeilen). Bestehende Über-Limit-Dateien nicht weiter aufblähen.
**Warning signs:** Datei nähert sich 450 Zeilen.

### Pitfall 5: UNIQUE-Constraint-Falle bei additiven Spalten
**What goes wrong:** Neue nullable Statusfelder kollidieren mit bestehenden UNIQUE-Constraints (z. B. der 4-Spalten-UNIQUE auf `anime_contributions` mit `NULLS NOT DISTINCT`, 0091).
**How to avoid:** Bei jeder neuen Spalte prüfen, ob sie Teil eines UNIQUE sein muss; `dispute_state` ist KEIN Identitätsteil → nicht in UNIQUE.

## Code Examples

### Read-Projektion mit Statusfeldern (Schema-Erweiterung als Beispiel)
```go
// Source-Muster: backend/internal/repository/anime_contributions_public_repository.go
// Erweiterung um dispute_state (nach Migration 0096):
type ContributionProjectionRow struct {
    Status      string `json:"status"`        // Content: draft/proposed/confirmed
    DisputeState string `json:"dispute_state"` // Konflikt: none/open/resolved (separate Achse)
    VisibilityName string `json:"visibility"`  // aus visibilities-Lookup
    ReviewStatus   string `json:"review_status"`
}
// SQL: LEFT JOIN visibilities v ON v.id = <traeger>.visibility_id
//      SELECT ac.status, ac.dispute_state, v.name AS visibility, ...
```

### Append-only Migration für additive Statusfelder
```sql
-- Source-Muster: database/migrations/0086 + 0090 + 0059
-- 0096_v12_status_foundation.up.sql (Skizze, Werte sind Planner-Entscheid):
ALTER TABLE anime_contributions
    ADD COLUMN IF NOT EXISTS dispute_state VARCHAR(20) NOT NULL DEFAULT 'none';
ALTER TABLE anime_contributions
    ADD CONSTRAINT chk_anime_contributions_dispute_state
        CHECK (dispute_state IN ('none','open','resolved'));

ALTER TABLE members
    ADD COLUMN IF NOT EXISTS profile_status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE members
    ADD CONSTRAINT chk_members_profile_status
        CHECK (profile_status IN ('active','historical','memorial'));
-- claimed/unclaimed bleiben derived aus member_claims (NICHT in profile_status).
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Status als freier VARCHAR in `hist_*.visibility` | `visibilities`-Lookup-FK (Streams seit 0037) | 0037 | Neue Träger sollten Lookup-FK nutzen; Alt-Spalten bleiben (Drift). |
| Contribution-Identität 3-spaltig | 4-spaltig + `NULLS NOT DISTINCT` (Release-Version-Dimension) | 0091 | Neue Spalten dürfen UNIQUE nicht stören. |
| Member-Medien ohne Owner | `media_assets.owner_member_id` | 0090 | IDOR-/Owner-Validierung etabliert. |

**Deprecated/outdated:**
- `backend/database/migrations/` (Legacy-Parallel-Media-Tabellen) — NICHT kanonisch.
- Legacy `streams`, `release_media`, `episode_media`, `anime_media` — nur Kompatibilität, nicht als Ziel für neue Owner/Review-Felder.
- CONTEXT-Notiz „owner_member_id = Migration 0089" — tatsächlich **0090**; „nächste Nummer vgl. 0089/0091" — tatsächlich frei ab **0096**.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `dispute_state` mit Werten none/open/resolved als CHECK-Spalte ist angemessen (statt Lookup) | Code Examples | Gering — Werte stabil (D-01); spätere Erweiterung = Migration. |
| A2 | Member-Status `memorial` gehört als additive Spalte auf `members` (nicht eigene Tabelle) | Runtime State Inventory | Mittel — wenn pro-Gruppe-Memorial nötig wäre, andere Modellierung. Aber D-06/J: Profilstatus, also `members` korrekt. |
| A3 | Review-Status braucht eigenes Feld pro Medien-Träger statt zentral | Don't Hand-Roll | Mittel — Owner-Typ-Modell in `media_assets` ist heute nicht vorhanden (Q4); Träger-Wahl beeinflusst Feld-Platzierung. |
| A4 | Neue Public-Reads folgen dem No-Envelope-Muster der Contribution-Reads | Contracts | Gering — pro Endpoint am nächsten Analog ausrichten (Q3). |

## Open Questions

1. **Statuswerte-Trägerform: CHECK-Spalte vs. Lookup-Tabelle?**
   - Bekannt: `visibilities`/`role_definitions` sind Lookups; `*.status`/`*.dispute_state` sind CHECK-Spalten.
   - Unklar: Review-Status (5 Werte: in Prüfung/freigegeben/abgelehnt/archiviert/entfernt) — CHECK oder Lookup?
   - Empfehlung: `dispute_state` als CHECK (stabil); Review-Status als eigene **Lookup-Tabelle** erwägen (erweiterbar, FK-referenzierbar, konsistent mit `visibilities`). Planner-Entscheid (Discretion).

2. **`hist_*.visibility` (VARCHAR) vs. `visibilities`-Lookup angleichen?**
   - Bekannt: hist-Tabellen nutzen freien String 'internal'/'public', nicht den Lookup.
   - Empfehlung: In 72 NICHT migrieren (Risiko, Scope). Neue Träger nutzen `visibilities`-FK (D-03); Inkonsistenz dokumentieren, Angleich als deferred slice.

3. **Envelope `{"data":...}` für neue Reads?**
   - Bekannt: Public-Contribution-Reads ohne Envelope; CONTEXT verweist auf `{"data":...}` (STATE 62 D3).
   - Empfehlung: pro Endpoint dem nächstgelegenen bestehenden Analog folgen; im Plan explizit festlegen.

4. **Owner-Typ in `media_assets`?**
   - Bekannt: `owner_member_id` existiert; Owner-TYP (group/anime/release/member) wird heute über Junction-Tabellen (`fansub_group_media`, `release_version_media`, …) ausgedrückt, nicht als Spalte.
   - Unklar: Soll die Medien-Projektion Owner-Typ/Kategorie/Visibility/Review pro Asset zentral oder pro Junction liefern? Entscheidung 8 fordert Pflichtfelder Owner-Typ/-ID/Kategorie/Sichtbarkeit/Review.
   - Empfehlung: Projektion komponiert pro Junction-Kontext (kein neues zentrales Owner-Typ-Feld erzwingen → Lock A/G). Planner präzisiert je Surface (73–80 brauchen unterschiedliche Seams).

5. **`disputed`/`hidden` im Content-Status — bleiben oder migrieren?**
   - Mit `dispute_state` separat wird `status='disputed'` semantisch redundant. `hidden` überlappt mit Visibility/Review.
   - Empfehlung: In 72 Content-Status UNVERÄNDERT lassen (keine Daten-Migration, D-05/Scope); nur additive Felder. Bereinigung später, falls nötig.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Go-Toolchain | Backend-Build/Test | ✓ (vorausgesetzt) | 1.25.0 | — |
| PostgreSQL 16 | Migration 0096 + Repo-Tests | ✓ via docker-compose | 16 | — |
| Migrate-Tool | Migrationen anwenden | ✓ | `backend/cmd/migrate/main.go` | — |
| Node/Vitest | Frontend-Typ-Tests | ✓ | vitest ^3.2.4 | — |

**Missing dependencies with no fallback:** Keine.
**Missing dependencies with fallback:** Keine.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (Backend) | Go `testing` + testify; Repo-Tests `backend/internal/repository/*_test.go` |
| Framework (Frontend) | Vitest 3 |
| Config file | `frontend/vitest.config.ts`; Go-Tests benötigen keine Config |
| Quick run command (Go) | `go test ./internal/repository/... -run <TestName>` (in `backend/`) |
| Quick run command (FE) | `npx vitest run <pattern>` (in `frontend/`) |
| Full suite (Go) | `go test ./...` (in `backend/`) |
| Full suite (FE) | `npm test` (= `vitest run`, in `frontend/`) |

### Phase Requirements → Test Map
| Req | Behavior | Test Type | Automated Command | File Exists? |
|-----|----------|-----------|-------------------|-------------|
| A/Sep | Projektion liefert Mitglied/Mitwirkender/historisch als **getrennte** Mengen; Contribution erzeugt KEINEN Mitglieds-Eintrag | unit (Go, repo) | `go test ./internal/repository/... -run Projection` | ❌ Wave 0 |
| D-01 | `dispute_state` getrennt vom Content-`status`; confirmed+open gleichzeitig lesbar | unit (Go, repo) | `go test ./internal/repository/... -run DisputeState` | ❌ Wave 0 |
| D-03 | Visibility (Lookup) + Review-Status sind in Projektion getrennt abfragbar | unit (Go, repo) | `go test ./internal/repository/... -run VisibilityReview` | ❌ Wave 0 |
| J/D-06 | `memorial`-Statuswert lesbar in Member-Projektion (kein Setter/Verhalten) | unit (Go, repo) | `go test ./internal/repository/... -run MemorialStatus` | ❌ Wave 0 |
| K | DTO-Felder ↔ OpenAPI ↔ `api.ts`-Typen: keine undokumentierten Response-Felder | type/contract | `npx vitest run types` + manueller OpenAPI-Diff | teils — `frontend/src/types/*.ts` vorhanden |
| Schema | Migration 0096 up+down idempotent, keine UNIQUE-Kollision | integration | Migrate up→down→up gegen Test-DB | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** zielgerichteter Go-`-run`-Test der betroffenen Projektion + relevanter Vitest-Typ-Test.
- **Per wave merge:** `go test ./...` (backend) + `npm test` (frontend).
- **Phase gate:** beide Full-Suites grün + Migration up/down sauber vor `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `backend/internal/repository/<domain>_projection_repository_test.go` — Trennung der drei Mengen, dispute_state-Isolation, Visibility/Review-Achsen, memorial-Lesbarkeit.
- [ ] Migrations-Roundtrip-Check (up→down→up) — Muster: bestehende `runtime_authority_test.go` / Repo-Tests nutzen Test-DB-Setup (`test_helpers.go`).
- [ ] Contract-Abgleich: prüfen, dass jedes neue DTO-Feld in `openapi.yaml` UND `frontend/src/types/*.ts` existiert (Lock K). Kein automatisiertes OpenAPI-Diff-Tool im Repo gefunden → manueller Review-Schritt + Typ-Test.

## Security Domain

> `security_enforcement`-Key ist in `.planning/config.json` nicht gesetzt → als aktiviert behandelt. Phase 72 ist read-only, Schwerpunkt liegt auf Datensichtbarkeit/Zugriffslogik der Projektionen.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | nein (keine neuen Auth-Pfade) | bestehende Auth-Seam |
| V3 Session Management | nein | — |
| V4 Access Control | **ja** | Projektionen dürfen nur freigegebene/öffentliche Daten exponieren; Visibility/Review-Achse muss in WHERE-Klauseln durchgesetzt werden (Vorbild: `is_public_on_anime_page = true AND visibility='public'`). Member-Owner-Scope via `owner_member_id`. |
| V5 Input Validation | **ja** (begrenzt) | Slug-/ID-Parsing in Handlern (`parseAnimeID`, `badRequest`); CHECK-Constraints auf neuen Statusfeldern. |
| V6 Cryptography | nein | — |

### Known Threat Patterns for Go/pgx/Gin Read-Projektionen
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL Injection | Tampering | Ausschließlich parametrisierte pgx-Queries (`$1`); KEINE String-Konkatenation von User-Input (bestehende Repos befolgen das). |
| Information Disclosure via Projektion | Information Disclosure | Visibility/Review-Achse strikt in WHERE durchsetzen; unbestätigte/interne Daten dürfen nicht in Public-DTO gelangen (Entscheidung 3: unbestätigte Nennungen schwächer/gar nicht public). |
| IDOR auf Member-Medien | Elevation/Info Disclosure | `media_assets.owner_member_id`-Scope respektieren (etabliert seit 0090). |
| Undokumentierte Response-Felder | Info Disclosure | Lock K: jedes Feld in OpenAPI; keine versehentliche Exposition interner Spalten (`dispute_state`/Review nur wo fachlich gewollt). |

## Sources

### Primary (HIGH confidence)
- `database/migrations/0037,0044,0059,0073,0077,0079,0081,0082,0083,0085,0086,0087,0088,0090,0091` — Schema-Wahrheit (Status/Visibility/Owner/Member/Contribution).
- `backend/internal/repository/anime_contributions_public_repository.go` — kanonisches Projektions-Muster + Trennung Mitglied/Mitwirkender.
- `backend/internal/handlers/contributions_public_handler.go` — Handler-/Envelope-Muster.
- `frontend/src/types/contributions.ts` — Typ-Spiegelung snake_case.
- `docs/architecture/current-system-inventory.md`, `docs/architecture/db-runtime-authority-map.md` — Ownership/Authority/Duplication-Traps.
- `.planning/milestones/v1.2-DISCUSSION.md`, `72-CONTEXT.md` — Locks A–K, D-01..D-06.
- `.planning/config.json` — nyquist_validation=true, commit_docs=true.

### Secondary (MEDIUM confidence)
- `backend/go.mod`, `frontend/package.json` — Versionen/Test-Commands.

### Tertiary (LOW confidence)
- Keine. Alle Kernbefunde quellverifiziert; keine WebSearch nötig (internes Brownfield-Schema).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — keine neuen Pakete, alles aus go.mod/package.json verifiziert.
- Architecture/Projektion: HIGH — kanonisches Vorbild direkt gelesen.
- Schema/Statusfelder: HIGH — alle relevanten Migrationen gelesen; Korrekturen zu CONTEXT (0090 statt 0089, 0096 frei, visibilities-Werte, media_assets.status technisch) verifiziert.
- Pitfalls: HIGH — aus echten CHECK-Constraints/Constraints abgeleitet.
- Offene Modellierungs-Entscheidungen: bewusst als Open Questions/Discretion belassen.

**Research date:** 2026-06-04
**Valid until:** 2026-07-04 (stabiles internes Schema; bei neuen Migrationen Nummer erneut prüfen)
