---
phase: 67-release-episode-credits
plan: 04
subsystem: frontend
tags: [next, react, typescript, vitest, openapi, gin, anime_contributions, release_version, dropdown, progressive-disclosure]

# Dependency graph
requires:
  - phase: 67-02
    provides: "ListGroupReleaseVersionsForAnime (gruppen-gefiltertes Dropdown-Lookup) + release_version_id im Read-Roundtrip (AnimeContributionRow)"
  - phase: 67-03
    provides: "PublicAnimeContributionGroup.version_breakdown (ReleaseVersionBreakdownGroup) aus der Public-Query"
provides:
  - "GET /admin/fansubs/:id/anime/:animeId/release-versions (permission-geschuetzter Dropdown-Endpunkt, CanForFansubGroup(MembersView))"
  - "api.ts getFansubAnimeReleaseVersions + Typen (FansubAnimeReleaseVersionOption, ReleaseVersionBreakdown, version_breakdown)"
  - "ReleaseVersionBreakdown-Komponente (aufklappbare Versions-Detailebene) + GroupContributionBlock-Integration"
  - "AnimeContributionModal: optionales, gruppen-gefiltertes Release-Version-Dropdown mit 422-Feldfehler + D-10-Roundtrip"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lookup-Methode auf bestehendem Handler-Receiver in neuer Datei (450-Zeilen-Limit)"
    - "Progressive Disclosure als reiner Client-State (useState) mit aria-expanded/aria-controls"
    - "Per-Member 422-Feldfehler aus parallelem upsert-Promise.all via try/catch je Member"
    - "Wiederverwendung des roleChip/historicalLabel-Markups ueber import des GroupContributionBlock-CSS-Moduls"

key-files:
  created:
    - backend/internal/handlers/fansub_contributions_release_versions_handler.go
    - frontend/src/components/anime/ReleaseVersionBreakdown.tsx
    - frontend/src/components/anime/ReleaseVersionBreakdown.module.css
    - frontend/src/components/anime/GroupContributionBlock.test.tsx
  modified:
    - backend/cmd/server/admin_routes.go
    - shared/contracts/openapi.yaml
    - frontend/src/types/contributions.ts
    - frontend/src/types/fansub.ts
    - frontend/src/lib/api.ts
    - frontend/src/components/anime/GroupContributionBlock.tsx
    - frontend/src/components/anime/GroupContributionBlock.module.css
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx

key-decisions:
  - "Dropdown-Endpunkt als Methode am bestehenden FansubAnimeContributionsHandler in NEUER Datei (fansub_contributions_release_versions_handler.go), damit fansub_anime_contributions_handler.go (427 Z.) unter dem 450-Limit bleibt."
  - "Route in admin_routes.go (registerAdminRoutes) registriert, direkt nach den uebrigen contribution-Admin-Routen, mit authMiddleware."
  - "AnimeContributionModal nutzt das datei-eigene native <select>+Label-Muster (wie das bestehende Status-Dropdown) statt der ui-Primitives Select/FormField — die Datei verwendet diese Primitives nirgends; Konsistenz mit dem Bestand schlaegt das Plan-Soll 'Primitives wiederverwenden' (Deviation, Rule 1)."
  - "OpenAPI: neuer GET-Endpunkt + Schemas FansubAnimeReleaseVersionOption/UpsertAnimeContributionRequest/ReleaseVersionBreakdownGroup additiv ergaenzt; Contributor-Form inline statt dangling $ref auf nicht-existentes PublicAnimeContribution-Schema."

requirements-completed: [P67-SC1, P67-SC2]

# Metrics
duration: 18min
completed: 2026-06-02
---

# Phase 67 Plan 04: Release- und Episode-Credits Frontend-Verdrahtung + Dropdown-Endpunkt Summary

**Die Versions-Dimension ist frontend-seitig verdrahtet: ein neuer permission-geschuetzter GET-Endpunkt liefert die gruppen-gefilterten Release-Versionen, die Anime-Seite erhaelt eine aufklappbare Versions-Detailebene (anime-weit zuerst, dann Episode·Version), und das Leader-Modal bekommt pro Member ein optionales Release-Version-Dropdown mit Leeroption und 422-Feldfehler.**

## Performance

- **Duration:** ~18 min
- **Tasks:** 3 von 4 (Task 4 = Browser-UAT, an Orchestrator deferred)
- **Files modified:** 12 (4 neu, 8 modifiziert)

## Accomplishments
- **Task 1 (Backend + Typen + OpenAPI):** Neuer GET-Endpunkt `/admin/fansubs/:id/anime/:animeId/release-versions` als Methode `ListGroupReleaseVersions` am bestehenden `FansubAnimeContributionsHandler` (eigene Datei, 450-Limit), permission-geschuetzt via `CanForFansubGroup(MembersView)`, nutzt `ListGroupReleaseVersionsForAnime` (67-02). Route in `admin_routes.go` mit `authMiddleware`. OpenAPI um den Endpunkt + `FansubAnimeReleaseVersionOption`, `UpsertAnimeContributionRequest.release_version_id`, `ReleaseVersionBreakdownGroup` und die `version_breakdown`-Doku erweitert. Frontend-Typen: `ReleaseVersionBreakdown`, `AnimeContributionGroup.version_breakdown`, `MeAnimeContribution.release_version_id`, `FansubAnimeReleaseVersionOption`; `fansub.ts` `AnimeContribution` + `UpsertAnimeContributionRequest` += `release_version_id`. `api.ts` `getFansubAnimeReleaseVersions`.
- **Task 2 (Anzeige, TDD):** `ReleaseVersionBreakdown.tsx` (Progressive Disclosure, Trigger `▸/▾ Nach Release-Version`, `aria-expanded`/`aria-controls`, Episode·Version-Koepfe, identisches `roleChip`/`historicalLabel`-Markup) + colocated CSS (keine neuen Tokens). `GroupContributionBlock`: Label `Allgemein an der Serie beteiligt:` und die Versions-Ebene erscheinen **nur** bei nicht-leerem `version_breakdown`. Vitest green (2 Tests: ohne breakdown kein Trigger; mit breakdown Allgemein-Label + Aufklappen offenbart Episode·Version + Contributor).
- **Task 3 (Eingabe-UI):** `AnimeContributionModal` laedt die gruppen-gefilterten Versionen, bietet pro Member ein optionales Dropdown mit Default-Leeroption `— anime-weit lassen —`, Hint, Lade-Fehlertext; initialisiert aus `existingContributions.release_version_id` (D-10-Roundtrip), sendet `release_version_id` im Upsert und rendert das 422 als Feldfehler unter dem Select. Datei 410 Zeilen (< 450).

## Task Commits

1. **Task 1: Dropdown-Endpunkt + Route + OpenAPI + Typen + api.ts** — `d3b3c261` (feat)
2. **Task 2: ReleaseVersionBreakdown + GroupContributionBlock-Integration + Test** — `95e5f195` (test, RED) → `5fb5e9b9` (feat, GREEN)
3. **Task 3: Leader-Modal Release-Version-Dropdown** — `23de98ca` (feat)

## Verification
- `cd backend && go build ./...` — green.
- `cd frontend && npm run typecheck` — green (gesamtes Projekt).
- `npm run test -- GroupContributionBlock` — 2/2 green.
- Docker-Rebuild + Browser-UAT (Task 4) **NICHT** ausgefuehrt — siehe unten.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Konsistenz] Modal nutzt natives `<select>` statt ui-Primitives Select/FormField**
- **Found during:** Task 3
- **Issue:** Der Plan (Punkt 3) verlangt Wiederverwendung der ui-Primitives `Select`/`FormField`. `AnimeContributionModal.tsx` verwendet diese Primitives jedoch **nirgends** — alle Felder (inkl. des bestehenden Status-Dropdowns) sind native `<select>`/`<div>` mit Inline-Styles in einem hellen Modal-Theme.
- **Fix:** Das Release-Version-Dropdown folgt exakt dem datei-eigenen Status-Dropdown-Muster (natives `<select>`, Label-`<div>`, Inline-Styles, roter Rahmen + roter Hinweistext bei 422). Das vermeidet ein gemischtes Theming innerhalb des Modals.
- **Impact:** Funktional und visuell konsistent mit dem Bestand; Copywriting/Umlaute/422-Verhalten exakt wie UI-SPEC. Kein Scope-Creep.

**2. [Rule 3 - Blocking/Ordering] OpenAPI-`$ref` auf nicht-existentes Schema + Cross-Task-Typecheck**
- **Found during:** Task 1
- **Issue (a):** `PublicAnimeContribution` ist im OpenAPI gar nicht als Schema definiert — ein `$ref` darauf waere dangling.
- **Fix (a):** Contributor-Form im `ReleaseVersionBreakdownGroup`-Schema inline beschrieben (Spiegel zum TS-Typ).
- **Issue (b):** Nach Task 1 schlug `npm run typecheck` an genau einer Stelle fehl — `AnimeContributionModal` sendete noch kein `release_version_id` (jetzt Pflichtfeld in `UpsertAnimeContributionRequest`). Das ist die im Plan vorgesehene Cross-Task-Abhaengigkeit (Typ in Task 1, Aufrufer in Task 3), analog zur 67-03-Ordering-Deviation.
- **Fix (b):** `go build` (Task-1-Hauptgate) war sofort green; der einzige Typecheck-Fehler lag im Task-3-Zielfile und wurde mit Task 3 geschlossen. Nach Task 3 ist `npm run typecheck` vollstaendig green.
- **Impact:** Reine Commit-Granularitaet/Reihenfolge. Keine Funktionsabweichung.

---

**Total deviations:** 2 auto-fixed (1 Konsistenz, 1 blocking/ordering). Kein Scope-Creep.

## Deferred to Orchestrator (Task 4)

**Task 4 — Browser-UAT (`checkpoint:human-verify`, gate=blocking)** wurde NICHT ausgefuehrt.
Der Orchestrator uebernimmt:
1. `docker compose build team4sv30-backend team4sv30-frontend && docker compose up -d`
2. Live-Browser-Verifizierung: Anime-Seiten-Aufschluesselung (Allgemein zuerst, dann `▸ Nach Release-Version`, sortiert Episode → Version, kein Member doppelt), Leader-Dropdown (gruppen-gefiltert, `— anime-weit lassen —` → NULL, D-10-Roundtrip), 422-Negativfall.

Code-Stand fuer Task 4: vollstaendig (Tasks 1-3 committet, alle automatisierten Gates green). Die Phase bleibt bis zum bestandenen Browser-UAT offen.

## Threat Surface Scan
- Keine neue Trust-Boundary-Flaeche ausserhalb des `<threat_model>`. T-67-04-AUTH mitigiert (authMiddleware + `CanForFansubGroup(MembersView)` am neuen Endpunkt). T-67-04-CLIENTFILTER mitigiert (Optionen kommen serverseitig gefiltert aus `ListGroupReleaseVersionsForAnime`, kein Client-Filter). T-67-04-ID mitigiert (Anzeige rendert nur das von der Public-Query gelieferte `version_breakdown`). T-67-04-XSS: React-Escaping, kein `dangerouslySetInnerHTML`.

## Known Stubs
Keine. Alle gerenderten Daten sind an echte Datenquellen verdrahtet (Endpunkt → api.ts → Komponente/Modal).

## Self-Check: PASSED

Alle vier neuen Dateien existieren auf der Platte; alle vier Task-Commits (1× test, 3× feat) sind im Git-Log auffindbar (`d3b3c261`, `95e5f195`, `5fb5e9b9`, `23de98ca`).

---
*Phase: 67-release-episode-credits*
*Completed: 2026-06-02*
