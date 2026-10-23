---
phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
plan: 06
subsystem: api
tags: [typescript, vitest, api-client, openapi, fansub-group-hints]

requires:
  - phase: 191-05
    provides: "shared/contracts/fansub-group-hints.yaml (vollstaendiger OpenAPI-Contract fuer alle sieben Hinweis-Endpunkte), alle sieben Backend-Routen live"
provides:
  - "frontend/src/types/fansub-group-hints.ts — getypter 1:1-Spiegel des Backend-Contracts (FansubGroupHint, CreateFansubGroupHintRequest, List-/Admin-Params)"
  - "frontend/src/lib/api/fansub-group-hints.ts — sieben API-Client-Funktionen (createFansubGroupHint, listGroupHints, confirmGroupHint, rejectGroupHint, listAdminFansubGroupHints, confirmAdminFansubGroupHint, rejectAdminFansubGroupHint)"
  - "Barrel-Re-Export in frontend/src/lib/api.ts"
affects: [191-07, 191-08, 191-09]

tech-stack:
  added: []
  patterns:
    - "Getypter Contract-Spiegel vor UI-Konsum (interface-first ordering) — drei unabhaengige UI-Konsumenten (Member-Formular, Leader-Review, Plattform-Admin-Liste) teilen sich eine einzige Typquelle statt je eigener Ad-hoc-Form"
    - "authorizedFetch + parseApiErrorPayload + ApiError-Muster identisch zu allen 36 bestehenden api/*.ts-Modulen, keine neue fetch-Variante"

key-files:
  created:
    - frontend/src/types/fansub-group-hints.ts
    - frontend/src/lib/api/fansub-group-hints.ts
    - frontend/src/lib/api/fansub-group-hints.test.ts
  modified:
    - frontend/src/lib/api.ts

key-decisions:
  - "Task 2 folgte strikt RED->GREEN (test(...)-Commit vor feat(...)-Commit): der Test-Import von ./fansub-group-hints schlug vor der Implementierung erwartungsgemaess mit einem Modul-Aufloesungsfehler fehl (RED bestaetigt, kein false-positive Pass), danach wurden alle acht Tests gruen (GREEN)."
  - "Feldnamen in FansubGroupHint/CreateFansubGroupHintRequest wurden gegen shared/contracts/fansub-group-hints.yaml (der tatsaechlich ausgelieferte Contract aus Plan 191-05) verifiziert statt gegen die urspruengliche Planannahme — keine Abweichung gefunden, alle 17 Felder stimmen 1:1 (inkl. sender_own_group_name, das der Contract zusaetzlich zum Plan-Tasktext fuehrt und das hier mit uebernommen wurde, da es Teil des reellen Response-Envelopes ist)."
  - "rejectGroupHint/rejectAdminFansubGroupHint senden decision_note immer explizit als { decision_note: decisionNote ?? null } statt das Feld bei fehlendem Parameter wegzulassen — passt zum Contract-Beispiel (optionaler Body, Feld nullable) und vermeidet eine Sonderbehandlung gegenueber den anderen sechs Funktionen."

requirements-completed: [D-06, D-07, D-08]

duration: ~20min
completed: 2026-10-23
---

# Phase 191 Plan 06: Frontend-Contract fuer Hinweis-Endpunkte Summary

**Getypter Single-Source-Contract (`fansub-group-hints.ts` Typen + API-Client) fuer alle sieben bereits implementierten Backend-Hinweis-Endpunkte, mit Vitest-Behaviorabdeckung der ApiError-Uebersetzung (409/429/403/404) — bereit fuer die drei UI-Konsumenten der Plaene 191-07/08/09.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2 completed
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments

- `frontend/src/types/fansub-group-hints.ts` exportiert `FansubGroupHintType`, `FansubGroupHintStatus`, `FansubGroupHint`, `CreateFansubGroupHintRequest`, `FansubGroupHintListResponse`, `AdminFansubGroupHintListResponse`, `AdminFansubGroupHintListParams` — jedes Feld 1:1 gegen `shared/contracts/fansub-group-hints.yaml` verifiziert, kein `any`.
- `frontend/src/lib/api/fansub-group-hints.ts` implementiert alle sieben Funktionen exakt auf den in Plan 191-05 tatsaechlich verdrahteten Pfaden (`/api/v1/me/fansub-group-hints`, drei Leader-Routen unter `/api/v1/admin/fansubs/:id/group-hints*`, drei Plattform-Admin-Routen unter `/api/v1/admin/fansub-group-hints*`) — jede Funktion importiert `authorizedFetch`/`ApiError`/`parseApiErrorPayload`/`getApiBaseUrl` aus `./client`, keine eigene Fetch-Variante.
- Acht Vitest-Tests (`fansub-group-hints.test.ts`) beweisen per gemocktem `fetch`, dass 409 (Doppel-Hinweis), 429 (Tageslimit), 403 (fehlende Berechtigung) und 404 (bereits bearbeitet) jeweils als `ApiError` mit korrektem `status` ankommen, sowie dass `listAdminFansubGroupHints` nur gesetzte Filter in den Query-String serialisiert (ungesetzte Felder — `fansub_group_id`, `offset`, `from`, `to` — fehlen im Query-String).
- Barrel-Re-Export `export * from "./api/fansub-group-hints"` in `frontend/src/lib/api.ts` bei den `contributions-*`-Modulen platziert (`grep -c "fansub-group-hints" frontend/src/lib/api.ts` = 1).
- TDD-Zyklus eingehalten: RED-Commit (`test(...)`, Modul-Import schlaegt fehl) vor GREEN-Commit (`feat(...)`, alle 8 Tests gruen).

## Task Commits

Each task was committed atomically:

1. **Task 1: Types** - `f5c5a3f1e` (feat)
2. **Task 2a: API-client functions (RED)** - `b4087ea9b` (test)
2. **Task 2b: API-client functions + barrel export (GREEN)** - `37a5a79f1` (feat)

## TDD Gate Compliance

RED-Gate-Commit `b4087ea9b` (test) existiert vor GREEN-Gate-Commit `37a5a79f1` (feat) im Git-Log — Reihenfolge verifiziert per `git log --oneline -4`. Kein REFACTOR-Commit nötig, da die Implementierung im ersten Durchgang alle Tests ohne Nacharbeit erfüllte.

## Files Created/Modified

- `frontend/src/types/fansub-group-hints.ts` - getypter Contract-Spiegel (NEU)
- `frontend/src/lib/api/fansub-group-hints.ts` - sieben API-Client-Funktionen (NEU)
- `frontend/src/lib/api/fansub-group-hints.test.ts` - 8 Behaviorstests gegen gemockten fetch (NEU)
- `frontend/src/lib/api.ts` - Barrel-Re-Export ergaenzt (1 Zeile)

## Decisions Made

Siehe `key-decisions` im Frontmatter.

## Deviations from Plan

None - plan executed exactly as written (inkl. optionaler TDD-Task-Struktur).

## Issues Encountered

None.

## User Setup Required

None - keine externe Service-Konfiguration nötig.

## Next Phase Readiness

- Plaene 191-07 (Member-Formular), 191-08 (Leader-Review) und 191-09 (Plattform-Admin-Liste) können die sieben Funktionen und alle Typen direkt importieren, ohne Endpunkt-Formen selbst herzuleiten.
- `npm --prefix frontend run test -- fansub-group-hints` und `npm --prefix frontend run typecheck` sind grün; die bestehenden Barrel-Canary-Tests (`canary.barrel.*.test.ts`) bleiben unverändert grün.
- Frontend-Container wurde für diesen Plan NICHT neu gestartet — reine Typen-/Client-Dateien ohne Laufzeit-Verhaltensänderung im laufenden Dev-Server; UI-Konsumenten-Plaene (191-07/08/09) lösen den nächsten Restart aus, sobald tatsächlich UI darauf aufbaut.

## Self-Check: PASSED

Alle drei neu erstellten Dateien existieren auf der Festplatte und alle drei genannten Commit-Hashes sind im Git-Verlauf auffindbar (geprüft per `[ -f ... ]` und `git log --oneline --all | grep`).

---
*Phase: 191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen*
*Completed: 2026-10-23*
