# Phase 67: Release- und Episode-Credits - Pattern Map

**Mapped:** 2026-06-02
**Files analyzed:** 14 (3 neu Backend-Repo, 1 neu Migration, 1 neu Migration-Test, 2 neu Frontend, 7 modifiziert)
**Analogs found:** 13 / 14 (1 ohne direkten Analog: erweiterter UNIQUE-Constraint-Form)

> **Wichtiger Befund zur Planungszeit (Pitfall 4 aktualisiert):** `0089_anime_contributions_review_note.{up,down}.sql` **existiert jetzt auf der Platte** (Phase 65 ist gelandet). Die nächste freie Migrationsnummer ist **`0090`** — wie im Research empfohlen. Verifiziert via `ls database/migrations/` (höchste = 0089).
>
> **Befund zum Leader-Frontend:** Das Leader-Eingabeformular ist **nicht** `manage/groups/page.tsx`, sondern die Modal-Komponente `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx` (verifiziert: einziger Aufrufer von `upsertAnimeContribution`). Der Upsert-Request-Typ liegt in `frontend/src/types/fansub.ts:604`, NICHT in `contributions.ts`.

## File Classification

| Neu/Modifiziert | Datei | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|---|
| NEU | `database/migrations/0090_anime_contributions_release_version.{up,down}.sql` | migration | transform (DDL) | `0088_anime_contributions_constraints.up.sql` + `0089_..._review_note.up.sql` | role-match (additive Spalte: 0089; UNIQUE-Drop/Add: 0088) |
| NEU | `backend/internal/migrations/phase67_release_version_credits_test.go` | test | request-response (string-contract) | `phase61_contributions_model_test.go` | exact |
| NEU | `backend/internal/repository/anime_contributions_release_lookup_repository.go` | repository | CRUD (read/EXISTS) | `MemberBelongsToFansub` (`anime_contributions_repository.go:89`) + `ListFansubAnimeReleases` (`admin_content_fansub_releases.go:15`) | exact |
| NEU | `backend/internal/repository/anime_contributions_public_versions_repository.go` | repository | CRUD (read/aggregate) | `attachHiddenCounts` (`anime_contributions_public_repository.go:176`) | exact |
| MOD | `backend/internal/repository/anime_contributions_upsert_repository.go` (104 Z.) | repository | CRUD (upsert) | sich selbst (`CreateOrUpdate`, Z. 32-70) | exact |
| MOD | `backend/internal/repository/anime_contributions_public_repository.go` (389 Z.) | repository | CRUD (read/aggregate) | `GetPublicAnimeContributions` (Z. 93-172) | exact |
| MOD | `backend/internal/handlers/fansub_anime_contributions_handler.go` (434 Z.) | handler | request-response | `MemberBelongsToFansub`-Guard (Z. 162-176) | exact |
| MOD | `backend/internal/handlers/contributions_me_handler.go` (329 Z.) | handler | request-response | `resolveVerifiedMemberID` + me-Ownership (Z. 39-54) | role-match |
| MOD | `shared/contracts/openapi.yaml` | config | — | bestehende contribution-DTOs | role-match |
| MOD | `frontend/src/types/contributions.ts` | model | — | `AnimeContributionGroup` (Z. 34-42) | exact |
| MOD | `frontend/src/types/fansub.ts` (`UpsertAnimeContributionRequest` Z. 604) | model | — | sich selbst | exact |
| NEU | `frontend/src/components/anime/ReleaseVersionBreakdown.tsx` | component | event-driven (Client-State) | `GroupContributionBlock.tsx` + `AnimeContributionsSection.tsx` (expandedGroupId) | exact |
| MOD | `frontend/src/components/anime/GroupContributionBlock.tsx` (68 Z.) | component | event-driven | sich selbst | exact |
| MOD | `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx` + `frontend/src/app/me/contributions/page.tsx` | component | event-driven | `AnimeContributionModal` (bestehendes Formular) | exact |
| MOD | `frontend/src/lib/api.ts` | service | request-response | `getAdminFansubAnimeReleases` (Z. 3857) + `upsertAnimeContribution` (Z. 6818) | exact |

> **450-Zeilen-Flag:** `anime_contributions_repository.go` (447 Z.) und `fansub_anime_contributions_handler.go` (434 Z.) sind hart am Limit. Neue Repo-Methoden (`GroupParticipatesInReleaseVersion`, Dropdown-Query, Ebene-2-Aggregation) MÜSSEN in die zwei NEUEN Repo-Dateien ausgelagert werden — nicht in die bestehenden. `anime_contributions_public_repository.go` (389 Z.) verträgt minimale Edits (nur den `AND ac.release_version_id IS NULL`-Filter), die Aggregation selbst gehört in die neue Versions-Datei.

## Pattern Assignments

### `database/migrations/0090_...release_version.up.sql` (migration, DDL)

**Analog (additive Spalte):** `0089_anime_contributions_review_note.up.sql` — `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`.
**Analog (UNIQUE-Drop/Add):** `0088_anime_contributions_constraints.up.sql:21-23` — dort wird `uq_anime_contribution_member` angelegt; in 0090 droppen + erweitern.

**Zielform (aus RESEARCH Pattern 1, ON DELETE SET NULL begründet im Tabellen-Kommentar 0086 "historisches Faktenregister"):**
```sql
ALTER TABLE anime_contributions
    ADD COLUMN IF NOT EXISTS release_version_id BIGINT NULL
    REFERENCES release_versions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_anime_contributions_release_version
    ON anime_contributions(release_version_id)
    WHERE release_version_id IS NOT NULL;

-- KRITISCH (Pitfall 1): bestehenden Constraint aus 0088 ersetzen
ALTER TABLE anime_contributions DROP CONSTRAINT IF EXISTS uq_anime_contribution_member;
ALTER TABLE anime_contributions
    ADD CONSTRAINT uq_anime_contribution_member
    UNIQUE NULLS NOT DISTINCT (fansub_group_id, anime_id, fansub_group_member_id, release_version_id);
```
**Down:** Constraint zurück auf 3-Spalten-Form (0088), Index droppen, Spalte droppen — analog reversibler Down-Stil von 0088/0089.

---

### `backend/internal/migrations/phase67_release_version_credits_test.go` (test, string-contract)

**Analog:** `phase61_contributions_model_test.go` (komplett, exakt). Nutzt `readMigrationFile(t, ...)` + `assertContainsAll(t, content, []string{...})` mit `strings.ToLower`.

**Struktur kopieren** (Z. 1-41, 138-146):
```go
func TestPhase67ReleaseVersionCreditsMigrationContract(t *testing.T) {
    up := strings.ToLower(readMigrationFile(t, "0090_anime_contributions_release_version.up.sql"))
    down := strings.ToLower(readMigrationFile(t, "0090_anime_contributions_release_version.down.sql"))

    assertContainsAll(t, up, []string{
        "add column if not exists release_version_id bigint null",
        "references release_versions(id) on delete set null",
        "drop constraint if exists uq_anime_contribution_member",
        "unique nulls not distinct (fansub_group_id, anime_id, fansub_group_member_id, release_version_id)",
        "idx_anime_contributions_release_version",
    })
    assertContainsAll(t, down, []string{
        "drop constraint if exists uq_anime_contribution_member",
        "drop column if exists release_version_id",
    })
}
```
`assertContainsAll` ist bereits in derselben Package definiert (Z. 138) — nicht neu anlegen.

---

### `backend/internal/repository/anime_contributions_release_lookup_repository.go` (repository, NEU) — D-03 + Dropdown

**Analog A (EXISTS-Guard):** `MemberBelongsToFansub` (`anime_contributions_repository.go:89-101`):
```go
func (r *AnimeContributionsRepository) MemberBelongsToFansub(ctx context.Context, memberID int64, fansubGroupID int64) (bool, error) {
    var exists bool
    err := r.db.QueryRow(ctx, `
        SELECT EXISTS(
            SELECT 1 FROM hist_fansub_group_members
            WHERE id = $1 AND fansub_group_id = $2
        )
    `, memberID, fansubGroupID).Scan(&exists)
    if err != nil {
        return false, fmt.Errorf("member belongs to fansub check: %w", err)
    }
    return exists, nil
}
```
→ Neue Methode `GroupParticipatesInReleaseVersion(ctx, fansubGroupID, releaseVersionID int64) (bool, error)` identisch aufbauen, Query gegen `release_version_groups WHERE release_version_id = $1 AND fansub_group_id = $2`. Receiver bleibt `*AnimeContributionsRepository` (gleicher Pool, neue Datei → unter 450-Limit).

**Analog B (Dropdown-Query):** `ListFansubAnimeReleases` (`admin_content_fansub_releases.go:15-77`). JOIN-Kette `release_versions → release_version_groups (Filter `fansub_group_id = $1`) → fansub_releases → episodes (Filter `anime_id = $2`)`, Sortierung `ORDER BY COALESCE(ep.sort_index, 2147483647), ep.id, rv.version` (NULL-safe Episode-Sortierung von dort übernehmen, dann Version → D-07). NICHT die volle `ListFansubAnimeReleases`-Query kopieren (release-zentriert, mit duration/theme_assets); nur das schlanke Versions-Lookup aus RESEARCH Pattern 3.

**Header-Konvention (deutscher Doc-Comment, package repository, pgx-Import):** wie `admin_content_fansub_releases.go:1-22`.

---

### `backend/internal/repository/anime_contributions_public_versions_repository.go` (repository, NEU) — Ebene-2-Aggregation

**Analog:** `attachHiddenCounts` (`anime_contributions_public_repository.go:176-204`) — exakt das Two-Query-Merge-Muster:
```go
func (r *AnimeContributionsRepository) attachHiddenCounts(ctx, animeID, groups, groupIndex) error {
    rows, err := r.db.Query(ctx, `SELECT ac.fansub_group_id, COUNT(...) ... GROUP BY ac.fansub_group_id`, animeID)
    ...
    for rows.Next() {
        ...
        if idx, ok := groupIndex[fgID]; ok {
            groups[idx].HiddenContributorCount = hidden  // merge by fansub_group_id
        }
    }
}
```
→ Neue Methode `attachVersionBreakdowns(ctx, animeID, groups, groupIndex)`: zweite Query NUR auf `ac.release_version_id IS NOT NULL`, mit denselben Public-Filtern wie Ebene 1 (`is_public_on_anime_page = true AND hfgm.visibility = 'public'`, Security-Domain V-Disclosure!), JOIN `release_versions → fansub_releases → episodes`, `ORDER BY COALESCE(ep.sort_index, 2147483647), ep.id, rv.version`. Ergebnis in `map[fgID][]ReleaseVersionBreakdownRow` einsammeln und an die Group-Structs hängen.

**DTO-Definitionen** (neue Felder am bestehenden `PublicAnimeContributionGroup`, `anime_contributions_public_repository.go:34-42`): `VersionBreakdown []ReleaseVersionBreakdownGroup` + neuer Struct `ReleaseVersionBreakdownGroup{ ReleaseVersionID int64; EpisodeNumber string; Version string; Contributors []PublicContributorRow }`. JSON-Tags snake_case (Spiegel zu `contributions.ts`).

---

### `backend/internal/repository/anime_contributions_public_repository.go` (MOD) — Ebene-1-Filter (Pitfall 2)

**Stelle:** `GetPublicAnimeContributions`, WHERE-Block Z. 115-117:
```go
WHERE ac.anime_id = $1
  AND ac.is_public_on_anime_page = true
  AND hfgm.visibility = 'public'
```
→ um `AND ac.release_version_id IS NULL` ergänzen, damit versions-spezifische Beiträge NICHT im "Allgemein"-Block doppelt erscheinen. Danach `r.attachVersionBreakdowns(...)` direkt nach `r.attachHiddenCounts(...)` (Z. 167) aufrufen. `attachHiddenCounts` bleibt gruppenweit (NICHT nach Ebene trennen — sonst Doppelzählung, Pitfall 2).

---

### `backend/internal/repository/anime_contributions_upsert_repository.go` (MOD) — ON CONFLICT-Target (Pitfall 1)

**Stelle:** `CreateOrUpdate`, Z. 33-58. Aktuell:
```go
INSERT INTO anime_contributions ( fansub_group_id, anime_id, fansub_group_member_id, status, ... )
VALUES ($1, $2, $3, ...)
ON CONFLICT (fansub_group_id, anime_id, fansub_group_member_id)
DO UPDATE SET status = EXCLUDED.status, ...
```
→ Änderungen:
1. `release_version_id` in INSERT-Spaltenliste + VALUES aufnehmen (neuer Parameter, `input.ReleaseVersionID *int64`).
2. `ON CONFLICT`-Target auf **vier** Spalten erweitern: `ON CONFLICT (fansub_group_id, anime_id, fansub_group_member_id, release_version_id)`.
3. `release_version_id` bleibt Teil des Conflict-Keys, NICHT im `DO UPDATE SET` (RESEARCH Code Example). FK-Violation-Mapping (`isForeignKeyViolation`, Z. 72) bleibt unverändert und fängt auch ungültige `release_version_id` ab.

`AnimeContributionInput` (in `anime_contributions_repository.go`) um `ReleaseVersionID *int64` erweitern.

---

### `backend/internal/handlers/fansub_anime_contributions_handler.go` (MOD) — D-03-Validierung

**Analog (Guard-Struktur):** `MemberBelongsToFansub`-Block in `CreateAnimeContribution` (Z. 162-176):
```go
belongs, err := h.contributionsRepo.MemberBelongsToFansub(c.Request.Context(), req.FansubGroupMemberID, fansubID)
if err != nil { ... internalError ... }
if !belongs {
    c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"message": "mitglied gehört nicht zu dieser fansubgruppe"}})
    return
}
```
→ Direkt darunter (nur wenn `req.ReleaseVersionID != nil`) analoger Block mit `GroupParticipatesInReleaseVersion`, HTTP 422, deutsche Meldung mit korrekten Umlauten: `"Gruppe war an dieser Release-Version nicht beteiligt"`.

**Request-Structs** (Z. 48-67): `animeContributionCreateRequest` + `animeContributionPatchRequest` um optionales `ReleaseVersionID *int64` / `**int64` (D-10: setzen/ändern/entfernen) erweitern. Patch nutzt `**`-Doppelpointer-Muster wie die bestehenden `StartedYear **int`-Felder (Z. 61-63).

**Audit-Payload** (Z. 244-254): `release_version_id` in `Payload map[string]any` aufnehmen — Observability-Constraint. `auditLogRepo.Write`-Aufruf unverändert übernehmen.

> Wegen 434 Z.: Validierungs-Helper kompakt halten (gemeinsame Funktion, die beide Handler nutzen — siehe Pitfall 5). Falls die Datei das Limit reißt, Validierung in eine neue `fansub_contributions_validation.go` auslagern (vom Orchestrator-Scope erwähnt) statt inline.

---

### `backend/internal/handlers/contributions_me_handler.go` (MOD) — Member-Proposal-Pfad (Pitfall 5)

**Analog:** me-Ownership-Muster `resolveVerifiedMemberID` (Z. 39-54) + `requireMeIdentity` (Z. 67-74). Member-Proposal-Persistenz (Phase 65 `CreateProposal`) muss dasselbe `GroupParticipatesInReleaseVersion` aufrufen, wenn `release_version_id` gesetzt ist — gemeinsamer Validierungs-Baustein mit dem Leader-Handler. Ownership/Eigengruppen-Bindung (Phase 65 D-01) bleibt; Version-Check ist additiv vorgelagert.

---

### `frontend/src/types/contributions.ts` (MOD) — DTO-Erweiterung

**Analog:** `AnimeContributionGroup` (Z. 34-42). Erweitern (RESEARCH Frontend-Typ):
```typescript
export interface ReleaseVersionBreakdown {
  release_version_id: number
  episode_number: string   // ep.episode_number ist VARCHAR (0035)
  version: string          // 'v1', 'v2', ...
  contributors: PublicAnimeContribution[]
}
// AnimeContributionGroup += version_breakdown: ReleaseVersionBreakdown[]
```
`MeAnimeContribution` (Z. 50-62) + `UpsertAnimeContributionRequest` (`fansub.ts:604`) um `release_version_id: number | null` erweitern.

---

### `frontend/src/components/anime/ReleaseVersionBreakdown.tsx` (component, NEU) + `GroupContributionBlock.tsx` (MOD)

**Analog (Block-Render + Chips):** `GroupContributionBlock.tsx` (Z. 11-67) — `roleChip`-Map, `contributorList`, deutsche Labels mit korrekten Umlauten ("Alle anzeigen" / "weitere nicht öffentlich").
**Analog (Progressive Disclosure / Client-State):** `AnimeContributionsSection.tsx` (Z. 18, 60-65) — `expandedGroupId`-State + `onToggle`. Für "▾ Nach Release-Version" denselben `useState<...|null>` + Toggle-Pattern verwenden (reiner Client-State, D-05).

**Layout (CONTEXT specifics):** In `GroupContributionBlock` zuerst die anime-weiten `contributors` ("Allgemein an der Serie beteiligt", D-06), darunter `<ReleaseVersionBreakdown>` (aufklappbar), gruppiert je `episode_number · version`, sortiert wie vom Backend geliefert (Episode → Version, D-07). Colocated CSS-Modul wie `GroupContributionBlock.module.css`.

---

### `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx` + `frontend/src/app/me/contributions/page.tsx` (MOD) — abhängiges Dropdown

**Analog (Formular-State pro Member):** `AnimeContributionModal.tsx` (Z. 55-70) — `rolesByMemberId`/`statusByMemberId`-Record-Pattern. Optionales `releaseVersionByMemberId: Record<number, number | null>` analog ergänzen.
**Datenquelle:** neuer api.ts-Fetch (gruppen-gefiltert, server-seitig — KEIN Client-Filter, Anti-Pattern). Dropdown-Default-Option "— anime-weit lassen —" (D-09).

---

### `frontend/src/lib/api.ts` (MOD) — neue API-Calls

**Analog (GET-Fetch):** `getAdminFansubAnimeReleases` (Z. 3857-3886) — `getApiBaseUrl()` + `authorizedFetch(... cache: "no-store")` + `parseApiErrorPayload`/`ApiError`-Block.
**Analog (POST mit Body):** `upsertAnimeContribution` (Z. 6818-6850) — `method: "POST"`, `headers: { "Content-Type": "application/json" }`, `JSON.stringify(body)`.
→ Neuer GET `getFansubAnimeReleaseVersions(fansubId, animeId, authToken?)` für das Dropdown (genau das `authorizedFetch`-Skelett von Z. 3857 kopieren); `upsertAnimeContribution`-Body um `release_version_id` erweitern (Typ via `fansub.ts`).

## Shared Patterns

### Parametrisierte EXISTS-Konsistenzprüfung (D-03)
**Source:** `backend/internal/repository/anime_contributions_repository.go:89-101` (`MemberBelongsToFansub`)
**Apply to:** Neue `GroupParticipatesInReleaseVersion` (neue Datei), aufgerufen in BEIDEN Handlern (Leader + Member-Proposal). Immer `$1/$2`-Parameter, nie String-Konkatenation (SQL-Injection-Mitigation, Security-Domain V5).

### Two-Query-Aggregation per map-Merge
**Source:** `backend/internal/repository/anime_contributions_public_repository.go:176-204` (`attachHiddenCounts`)
**Apply to:** Ebene-2-Versions-Aufschlüsselung. Zweite Query separat, Merge über `groupIndex map[int64]int`. Vermeidet komplexe UNION-Single-Query (Anti-Pattern).

### Audit-Logging mit Actor-Attribution
**Source:** `backend/internal/handlers/fansub_anime_contributions_handler.go:244-254` (`auditLogRepo.Write`)
**Apply to:** Alle mutierenden Contribution-Handler. `release_version_id` in `Payload` aufnehmen. `ActorAppUserID: &identity.AppUserID`.

### Permission-Guard vor Mutation
**Source:** `fansub_anime_contributions_handler.go:140-149` (`permissionSvc.CanForFansubGroup(... ActionFansubGroupMembersManage ...)`)
**Apply to:** Leader-CRUD-Pfade (Create/Update). Bei `denied`: `auditPermissionDenied` + `writePermissionDenied`. Member-Pfad nutzt stattdessen `resolveVerifiedMemberID`-Ownership (`contributions_me_handler.go:39`).

### Migration-Contract-Test
**Source:** `backend/internal/migrations/phase61_contributions_model_test.go` (`readMigrationFile` + `assertContainsAll`, lowercase)
**Apply to:** `phase67_release_version_credits_test.go`. Prüft Spalte, FK SET NULL, erweiterten UNIQUE (`nulls not distinct`), Index, idempotente up/down.

### Frontend Fetch-Skelett
**Source:** `frontend/src/lib/api.ts:3857` (GET) / `:6818` (POST)
**Apply to:** Alle neuen api.ts-Calls. `getApiBaseUrl()` + `authorizedFetch` + `parseApiErrorPayload`/`ApiError`. Domain-Typen in `frontend/src/types/`, korrekte Umlaute in user-facing Strings.

## No Analog Found

| Datei/Element | Role | Data Flow | Grund |
|---|---|---|---|
| `UNIQUE NULLS NOT DISTINCT (...)`-Constraint-Form | migration | DDL | Bestehende Migrationen nutzen nur einfaches `UNIQUE (...)` (0088). `NULLS NOT DISTINCT` (PG15+) ist ein neues Konstrukt im Repo — Form aus RESEARCH Pitfall 1 übernehmen, kein Repo-Analog. |

## Metadata

**Analog search scope:** `database/migrations/`, `backend/internal/repository/`, `backend/internal/handlers/`, `backend/internal/migrations/`, `frontend/src/components/anime/`, `frontend/src/app/{admin,me}/`, `frontend/src/lib/api.ts`, `frontend/src/types/`
**Files scanned/read:** 14 (Analoge vollständig oder gezielt gelesen)
**Pattern extraction date:** 2026-06-02
