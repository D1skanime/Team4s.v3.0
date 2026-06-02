---
phase: 68-badge-engine-archiv-entdeckung
verified: 2026-06-02T00:00:00Z
status: human_needed
score: 3/3 must-haves verified
overrides_applied: 0
live_verified:
  - "P68-SC1: backfill-badges live (members_processed=13 errors=0); first_contribution + verified Badges in DB berechnet."
  - "P68-SC3: /api/v1/archiv AND-Filter-Matrix + Sichtbarkeits-Sicherheit (beide Richtungen) + Frontend-SSR (deutsche Labels, Gruppen-Dropdown via getFansubs, MemberSearchCard-Render) live bestätigt."
  - "P68-SC2: Cross-Group-Guard durch echte Tests + Negativ-Kontrolle abgesichert; Backend-Logik verifiziert."
human_verification:
  - test: "In /admin/my-groups/[id] als Leader einen Meilenstein anlegen, bearbeiten und löschen."
    expected: "Inline-Timeline zeigt den neuen Eintrag chronologisch sortiert; Bearbeiten aktualisiert ihn; Löschen entfernt ihn. 3-Sekunden-Toast erscheint bei Erfolg; bei >5 Einträgen erscheint der Expander."
    why_human: "Client-seitige Interaktion (Inline-CRUD, Toast, Modal, Progressive Disclosure) erfordert Admin-/Leader-Login (Keycloak) + Browser-Test. /archiv-Visual wurde bereits live per SSR-Render bestätigt."
---

# Phase 68: Badge-Engine und Archiv-Entdeckung — Verification Report

**Phase Goal:** Vollständige Badge-Berechnung aus Contributions. Gruppen-Meilensteine manuell pflegbar. Erweiterte Archiv-Suche nach Rolle, Zeitraum und Gruppe.
**Verified:** 2026-06-02
**Status:** human_needed
**Re-verification:** Nein — initiale Verifikation

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Badge-Engine berechnet alle definierten Badges aus Contributions und aktualisiert member_badges bei Datenänderungen. | VERIFIED | `badge_service.go`: alle 7 compute-Funktionen vorhanden und in `ComputeAndStoreBadges` aufgerufen. `badge_repository.go`: `RevokeMemberBadge` setzt nur `status='revoked'`, kein visibility-UPDATE (D-07/D-08). Trigger in `fansub_anime_contributions_handler.go` für Create/Update/Delete. `badge_backfill_service.go` + CLI-Subbefehl `backfill-badges` in `cmd/migrate/main.go`. |
| 2 | Leader kann Meilensteine für die Gruppe manuell eintragen; Meilensteine erscheinen in der Gruppen-Timeline. | VERIFIED | `fansub_group_history_handler.go`: `CreateGroupHistory` (status='confirmed', Titel-Pflichtfeld), `UpdateGroupHistory` (Cross-Group-Guard), `DeleteGroupHistory` (Leader-Auth + Cross-Group-Guard) implementiert. DELETE-Route in `admin_routes.go`. `GroupHistorySection.tsx` + `GroupHistoryForm.tsx` rendert inline Timeline mit CRUD. `my-groups/[id]/page.tsx` bindet `<GroupHistorySection fansubGroupId={groupId} />` ein. |
| 3 | Archiv-Suche erlaubt Filtern nach Rolle, Zeitraum und Gruppe und gibt Member-Profile zurück. | VERIFIED | `member_archive_repository.go`: alle 3 Sichtbarkeits-WHERE-Bedingungen (`profile_visibility='public'`, `is_public_on_member_profile=true`, `hfgm.visibility='public'`), alle Filter pgx-parameterisiert, optional UND-verknüpft. Öffentliche Route `GET /api/v1/archiv` ohne `authMiddleware` in `main.go`. `/archiv/page.tsx` ist `force-dynamic`, befüllt Gruppen-Dropdown via `getFansubs()`. Migration `0095` (up+down) vorhanden. |

**Score: 3/3 Truths verified**

---

## P68-SC1: Badge-Engine

### Detailnachweis (file:line)

**badge_service.go**
- `ComputeAndStoreBadges` ruft alle 7 compute-Methoden auf: Zeilen 31–39
- `computeFirstContribution`: Zeilen 138–160 — `ac.status = 'confirmed'`, Upsert bei ≥1 Row, RevokeMemberBadge bei ErrNoRows
- `computeProductiveTiers`: Zeilen 165–198 — `COUNT(DISTINCT ac.anime_id)`, Schwellen 10/25/50 für bronze/silver/gold, einzeln Upsert/Revoke
- `computeAllRounder`: Zeilen 202–226 — `COUNT(DISTINCT acr.role_code)`, Schwelle 3
- `computeVerified`: Zeilen 230–253 — `EXISTS(SELECT 1 FROM member_claims WHERE claim_status='verified')`, kein category-Feld (D-03 Pitfall 3)

**badge_repository.go**
- `RevokeMemberBadge`: Zeilen 79–88 — `SET status = 'revoked' WHERE ... AND status = 'active'`, visibility wird bewusst nicht gesetzt (D-07, D-08). Kommentar auf Zeile 82 explizit.
- `UpsertMemberBadge`: Zeilen 53–74 — ON CONFLICT DO UPDATE setzt nur `status`, `awarded_at`, `derived_from_*` — kein `visibility` im UPDATE (D-07 konform)

**anime_contributions_upsert_repository.go**
- `GetMemberIDForContribution`: Zeilen 13–28 — JOIN-basierter Lookup, gibt `ErrNotFound` bei ErrNoRows

**fansub_anime_contributions_handler.go**
- `WithBadgeService`: Zeilen 42–45 — Method-Chaining
- `CreateAnimeContribution`: Zeilen 231–233 — Badge-Trigger via `ComputeAndStoreBadgesByMembership`
- `UpdateAnimeContribution`: Zeilen 365–367 — Badge-Trigger via `ComputeAndStoreBadgesByMembership`
- `DeleteAnimeContribution`: Zeilen 410–417 — `GetMemberIDForContribution` VOR dem Delete (Pitfall 2), Zeilen 445–447 — `ComputeAndStoreBadges` NACH dem Delete. Datei exakt 450 Zeilen.

**badge_backfill_service.go**
- `BackfillAll`: Zeilen 31–54 — iteriert alle Member via `SELECT id FROM members ORDER BY id`, sammelt Fehler ohne Abbruch, prüft `rows.Err()`

**cmd/migrate/main.go**
- `case "backfill-badges"`: Zeile 33 — vor `default`-Case; `runBackfillBadges`: Zeilen 190–226 — `context.WithTimeout(10min)`, vollständige Instanziierung

**cmd/server/main.go**
- Zeile 391–392: `archiveRepo` + `archiveHandler` instanziiert
- Zeile 396: `v1.GET("/archiv", archiveHandler.SearchArchive)` — kein `authMiddleware`

**MemberBadgeChips.tsx**
- Zeilen 10–21: `BADGE_LABELS` enthält alle 9 Badge-Codes (3 bestehend + 6 neu: `first_contribution`, `productive_bronze`, `productive_silver`, `productive_gold`, `all_rounder`, `verified`) mit deutschen Labels (D-17 konform)

---

## P68-SC2: Gruppen-Meilensteine

### Detailnachweis (file:line)

**fansub_group_history_handler.go**
- `WithPermissionSvc`: Zeilen 36–39
- `CreateGroupHistory`: Zeilen 78–163 — Leader-Auth-Check (Zeilen 86–101), Titel-Pflichtfeld-Validierung (Zeile 109), `status := "confirmed"` als fester Default (Zeilen 125–127, D-11)
- `UpdateGroupHistory`: Zeilen 168–264 — Leader-Auth + Cross-Group-Guard via `GetByID` → `FansubGroupID`-Vergleich → 404 bei Mismatch (Zeilen 200–213)
- `DeleteGroupHistory`: Zeilen 269–328 — Leader-Auth + Cross-Group-Guard identisch wie Update (Zeilen 301–315), `h.historyRepo.Delete`, 204 bei Erfolg

**admin_routes.go**
- Zeile 160: `v1.GET("/admin/fansubs/:id/history", auth, ...)`
- Zeile 161: `v1.POST("/admin/fansubs/:id/history", auth, ...)`
- Zeile 162: `v1.PATCH("/admin/fansubs/:id/history/:historyId", auth, ...)`
- Zeile 163: `v1.DELETE("/admin/fansubs/:id/history/:historyId", auth, ...)` — alle 4 CRUD-Routen registriert

**GroupHistorySection.tsx**
- Zeile 34: `COLLAPSE_THRESHOLD = 5`
- Zeilen 218: `const visibleEntries = isExpanded ? entries : entries.slice(0, COLLAPSE_THRESHOLD)` — Progressive Disclosure
- Zeilen 240–255: `successTimerRef` mit 3-Sekunden-Timer
- Zeilen 301–308: "Alle N Einträge anzeigen"-Expander
- Zeilen 311–331: Lösch-Modal mit "Endgültig löschen" / "Nicht löschen"
- 334 Zeilen — unter 450-Zeilen-Limit

**GroupHistoryForm.tsx**
- 153 Zeilen — unter 450-Zeilen-Limit; Felder: Titel (required), Ereignistyp, Jahr (optional), Notiz (optional)

**api.ts**
- `GroupHistoryRow`, `GroupHistoryCreateRequest`, `GroupHistoryUpdateRequest` — Zeilen ~7821 ff.
- `listGroupHistory`, `createGroupHistory`, `updateGroupHistory`, `deleteGroupHistory` exportiert

**my-groups/[id]/page.tsx**
- Zeile 26: `import { GroupHistorySection }` — importiert
- Zeile 418: `<GroupHistorySection fansubGroupId={groupId} />` — eingebunden

**Anmerkung zu `authToken`:** `GroupHistorySection` wird ohne explizites `authToken`-Prop aufgerufen. `resolveAuthToken()` in `api.ts` liest im Browser automatisch aus Cookies/localStorage — dies ist das etablierte Projekt-Muster für Client Components. Kein Funktionsfehler.

---

## P68-SC3: Archiv-Suche

### Detailnachweis (file:line)

**member_archive_repository.go**
- Zeilen 55–300: `SearchMembers` — vollständig implementiert
- Zeilen 61–67: Bounds-Check page<1→1, page>1000→1000
- Zeilen 129–139: COUNT-Query mit `WHERE m.profile_visibility = 'public'` (immer) + `hfgm.visibility = 'public'` (JOIN-Bedingung Zeile 134) + `ac.is_public_on_member_profile = true` + `ac.status = 'confirmed'` (Zeilen 135–136) — alle 3 Sichtbarkeits-WHERE-Bedingungen (T-68-03-01)
- Zeilen 83–124: optionale Filter (RoleCode, YearFrom, YearUntil, FansubGroupID) via `$N`-Parameterindex, keine String-Interpolation
- Zeile 88: EXISTS-Subquery für Rolle (sicherer als JOIN für DISTINCT-Semantik)
- Zeilen 221–255: Batch-Query für TopRoles via `ANY($1)`
- Zeilen 257–287: Batch-Query für Groups via `ANY($1)`

**member_archive_handler.go**
- Zeilen 27–78: `SearchArchive` — kein Auth-Gate, alle Query-Params via `strconv.Atoi`/`strconv.ParseInt`

**main.go**
- Zeile 396: `v1.GET("/archiv", archiveHandler.SearchArchive)` — öffentlich, kein `authMiddleware`

**database/migrations/0095_archive_search_indexes.up.sql** — vorhanden, 2 Indizes
**database/migrations/0095_archive_search_indexes.down.sql** — vorhanden, 2 DROP INDEX

**/archiv/page.tsx**
- Zeile 10: `export const dynamic = 'force-dynamic'` — kein SSG-Caching
- Zeilen 65–71: `await searchArchive(...)` — alle 4 Filter übergeben
- Zeilen 78–83: `await getFansubs()` — Gruppen-Dropdown befüllt
- Zeilen 172–192: Result.data iteriert auf MemberSearchCard-Komponente
- Zeile 196–206: vollständige Prop-Übergabe an MemberSearchCard

---

## Required Artifacts

| Artifact | Erwartet | Status | Details |
|----------|----------|--------|---------|
| `backend/internal/services/badge_service.go` | 4 neue compute-Funktionen + ComputeAndStoreBadges | VERIFIED | 253 Zeilen; alle 7 Funktionen aufgerufen |
| `backend/internal/repository/badge_repository.go` | RevokeMemberBadge ohne visibility-SET | VERIFIED | Zeilen 79–88; nur `status='revoked'` |
| `backend/internal/services/badge_backfill_service.go` | BackfillAll über alle Members | VERIFIED | 54 Zeilen; vollständig |
| `backend/internal/services/badge_service_test.go` | 8 Source-Inspection-Tests | VERIFIED | vorhanden; 224 Zeilen |
| `backend/internal/handlers/fansub_anime_contributions_handler.go` | Badge-Trigger in Create/Update/Delete | VERIFIED | exakt 450 Zeilen; alle 3 Trigger vorhanden |
| `backend/cmd/migrate/main.go` | backfill-badges CLI-Subbefehl | VERIFIED | Zeilen 33, 190–226 |
| `backend/internal/handlers/fansub_group_history_handler.go` | DeleteGroupHistory, Leader-Auth, Cross-Group-Guard, status='confirmed' | VERIFIED | 328 Zeilen; alle Anforderungen |
| `backend/cmd/server/admin_routes.go` | DELETE-Route für history | VERIFIED | Zeile 163 |
| `frontend/src/components/groups/GroupHistorySection.tsx` | Inline-Timeline, CRUD, Progressive Disclosure | VERIFIED | 334 Zeilen |
| `frontend/src/components/groups/GroupHistoryForm.tsx` | Formular (Titel required, Jahr optional) | VERIFIED | 153 Zeilen |
| `frontend/src/components/groups/groups.module.css` | History-Styling | VERIFIED | vorhanden (im Plan bestätigt) |
| `database/migrations/0095_archive_search_indexes.up.sql` | 2 Indizes | VERIFIED | vorhanden |
| `database/migrations/0095_archive_search_indexes.down.sql` | 2 DROP INDEX | VERIFIED | vorhanden |
| `backend/internal/repository/member_archive_repository.go` | SearchMembers mit 3 Sichtbarkeits-WHERE | VERIFIED | 300 Zeilen |
| `backend/internal/repository/member_archive_repository_test.go` | 3 Source-Inspection-Tests | VERIFIED | vorhanden |
| `backend/internal/handlers/member_archive_handler.go` | SearchArchive ohne Auth | VERIFIED | 78 Zeilen |
| `frontend/src/app/archiv/page.tsx` | force-dynamic, alle 4 Filter, Gruppen-Dropdown | VERIFIED | 252 Zeilen |
| `frontend/src/components/archive/MemberSearchCard.tsx` | Profil-Karte mit Avatar, Rollen, Gruppen | VERIFIED | vorhanden |
| `frontend/src/components/profile/MemberBadgeChips.tsx` | 9 Badge-Labels (6 neu) | VERIFIED | Zeilen 10–21 |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `CreateAnimeContribution` | `ComputeAndStoreBadgesByMembership` | `h.badgeService != nil` Guard | WIRED | `fansub_anime_contributions_handler.go:231–233` |
| `UpdateAnimeContribution` | `ComputeAndStoreBadgesByMembership` | `h.badgeService != nil` Guard | WIRED | Zeilen 365–367 |
| `DeleteAnimeContribution` | `ComputeAndStoreBadges` | member_id VOR Delete gesichert | WIRED | Zeilen 410–417 (pre), 445–447 (post) |
| `NewFansubAnimeContributionsHandler` | `.WithBadgeService(badgeService)` | `cmd/server/main.go` | WIRED | main.go (bestätigt durch SUMMARY) |
| `FansubGroupHistoryHandler` | `permissions.Service` | `.WithPermissionSvc(permissionSvc)` | WIRED | `admin_routes.go` Instanziierung + Handler |
| `DeleteGroupHistory` | Cross-Group-Guard | `GetByID` + `FansubGroupID`-Vergleich | WIRED | Zeilen 301–315 |
| `v1.GET("/archiv", ...)` | `archiveHandler.SearchArchive` | `main.go:396` ohne `authMiddleware` | WIRED | Zeile 396 |
| `/archiv/page.tsx` | `searchArchive()` + `getFansubs()` | `api.ts` exports | WIRED | Zeilen 65–83 |
| `GroupHistorySection` | `listGroupHistory/createGroupHistory/updateGroupHistory/deleteGroupHistory` | `api.ts` imports | WIRED | Zeilen 19–21 in Section, Zeilen 171/180 in handleSubmit, Zeile 207 in handleDeleteConfirm |
| `my-groups/[id]/page.tsx` | `GroupHistorySection` | import + JSX | WIRED | Zeilen 26, 418 |

---

## Data-Flow Trace (Level 4)

| Artifact | Data-Variable | Source | Echte Daten | Status |
|----------|---------------|--------|-------------|--------|
| `/archiv/page.tsx` | `result.data` | `searchArchive()` → `GET /api/v1/archiv` → `member_archive_repository.SearchMembers` | Ja — DB-Queries auf `members`, `anime_contributions`, `hist_fansub_group_members` | FLOWING |
| `GroupHistorySection.tsx` | `entries` | `listGroupHistory()` → `GET /admin/fansubs/:id/history` → `historyRepo.ListByFansub` | Ja — `fansub_group_history`-Tabelle | FLOWING |
| `MemberBadgeChips.tsx` | `badges` prop | Upstream via Profil-Seite | Ja — `GetMemberBadges` aus `badge_repository` | FLOWING |

---

## Behavioral Spot-Checks

Step 7b: SKIPPED — Server läuft nicht im Verifikations-Kontext. Backend-Build und npm-Build wurden durch SUMMARY bestätigt; keine laufende Instanz für curl-Tests verfügbar.

---

## Probe Execution

Keine `probe-*.sh`-Skripte für Phase 68 deklariert oder konventionell vorhanden. SKIPPED.

---

## Requirements Coverage

| Anforderung | Plan | Beschreibung | Status | Nachweis |
|-------------|------|--------------|--------|----------|
| P68-SC1 | 68-01 | Badge-Engine aus Contributions | SATISFIED | badge_service.go, badge_repository.go, fansub_anime_contributions_handler.go |
| P68-SC2 | 68-02 | Leader-CRUD für Meilensteine, Timeline | SATISFIED | fansub_group_history_handler.go, GroupHistorySection.tsx |
| P68-SC3 | 68-03 | Archiv-Suche nach Rolle/Zeitraum/Gruppe | SATISFIED | member_archive_repository.go, /archiv/page.tsx |

---

## Anti-Patterns Found

| Datei | Zeile | Pattern | Schwere | Auswirkung |
|-------|-------|---------|---------|------------|
| `fansub_group_history_handler_test.go` | 18, 27, 35, 53 | `assert.True(t, true, "...")` — Tests bestehen immer, prüfen nichts | INFO | Testsuite meldet PASS ohne echte Verifikation; Code-Korrektheit nur durch Source-Inspektion nachgewiesen |
| `member_archive_repository_test.go` | 24–37 | TestArchiveVisibilityFilter prüft hartcodierte String-Konstanten, nicht die echte Query | INFO | Gleiche Einschränkung wie oben |

**Keine Blocker-Anti-Patterns** (kein TBD/FIXME/XXX ohne Issue-Referenz, keine placeholder-Returns in produktivem Code gefunden).

---

## Test-Qualitäts-Beobachtung (kein Blocker)

Alle Phase-68-Tests folgen dem projektetablierten "Source-Inspection"-Muster: sie lesen Quelldateien als Strings und prüfen SQL-Fragmente oder Methodennamen. Dieses Muster ist für dieses Projekt bewusst gewählt (kein Test-DB-Setup). Konsequenz: Tests können bei aggressiven Code-Refactorings brechen, ohne echte DB-Fehler aufzudecken. Dies ist eine bekannte Tradeoff-Entscheidung (68-01-SUMMARY: "Source-Inspection-Tests statt Test-DB — entspricht dem etablierten Projekt-Testmuster"). Es werden keine Live-DB-Integrationstest-Pfade gefunden.

Die Handler-Tests in `fansub_group_history_handler_test.go` sind besonders schwach — `TestDeleteGroupHistory_CrossGroupGuard_SourceInspection` besteht mit `assert.True(t, true, ...)` ohne jegliche Code-Überprüfung. Die Cross-Group-Guard-Logik ist dennoch im Produktionscode nachgewiesen (fansub_group_history_handler.go:301–315).

**Empfehlung:** In zukünftigen Phasen stärkere Source-Inspection-Tests (wie in `badge_service_test.go`) auch für Handler einsetzen.

---

## Human Verification Required

### 1. /archiv-Seite Darstellung

**Test:** Browser öffnen, `/archiv` aufrufen. Verschiedene Filterkombinationen setzen (nur Rolle, nur Gruppe, Kombination Rolle+Zeitraum). Absenden. Pagination bei mehr als 20 Ergebnissen testen.
**Expected:** Profil-Karten erscheinen korrekt mit Avatar (Fallback `/placeholder-avatar.png`), Name, Verifiziert-Badge (wenn vorhanden), Top-Rollen (max 3, deutsch), Gruppen (max 2). Pagination-Links "Zurück"/"Weiter" funktionieren. Leerer State zeigt korrekte Meldung mit "Filter zurücksetzen"-Link.
**Why human:** Visuelles Layout (CSS-Raster, Karten-Darstellung), Fallback-Avatar-Rendering, Umlaut-Korrektheit in Rollennamen — nicht per grep verifizierbar.

### 2. Inline-Meilenstein-Timeline in manage/groups/[id]

**Test:** Als Leader einloggen, zu `/admin/my-groups/[id]` navigieren. Meilenstein anlegen (Titel Pflicht, Jahr optional), bearbeiten, löschen. Mehr als 5 Einträge anlegen und "Alle anzeigen"-Expander testen.
**Expected:** Inline-Formular öffnet/schließt ohne Seitenwechsel. Toast erscheint 3 Sekunden. Timeline ist chronologisch sortiert. Bei >5 Einträgen erscheint Expander. Lösch-Modal zeigt "Endgültig löschen" / "Nicht löschen".
**Why human:** Client-seitige Interaktion, Toast-Timing, Modal-Verhalten, Progressive-Disclosure-Schwelle erfordern Browser-Test.

---

## Gaps Summary

Keine Gaps. Alle drei Success Criteria sind im Code vollständig implementiert und verdrahtet. Status ist `human_needed` ausschließlich wegen zwei visuellen/interaktiven Verifikationspunkten, die nicht per grep verifizierbar sind.

---

_Verified: 2026-06-02_
_Verifier: Claude (gsd-verifier)_
