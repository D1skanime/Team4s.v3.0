---
phase: 184-aufr-umpunkte-aus-phase-174-abschlie-en-tote-css-klassen-in-
plan: 06
subsystem: ui
tags: [nextjs, react, css-modules, refactor, fansubs]

# Dependency graph
requires:
  - phase: 184-03
    provides: "mergeCssModules(own, shared)-Helfer in frontend/src/lib/mergeCssModules.ts"
  - phase: 184-05
    provides: "admin/fansubs/page.tsx und admin/fansubs/merge/page.tsx bereits auf <=450 Zeilen aufgeteilt (Voraussetzung, kein weiterer Split in diesem Plan noetig)"
provides:
  - "Letzte 7 Fansub-Umfeld-Dateien (Liste, Create-Flow, Merge-Wizard) nutzen mergeCssModules statt des latent kaputten Spread-Musters { ...sharedStyles, ...X }"
affects: []

tech-stack:
  added: []
  patterns:
    - "mergeCssModules(own, shared) statt { ...sharedStyles, ...own } fuer CSS-Modul-Merges (gleiches Muster wie 184-07/08/09)"

key-files:
  created: []
  modified:
    - frontend/src/app/admin/fansubs/page.tsx
    - frontend/src/app/admin/fansubs/create/page.tsx
    - frontend/src/app/admin/fansubs/create/AdminFansubCreateAliasesSection.tsx
    - frontend/src/app/admin/fansubs/create/AdminFansubCreateBasicInfoSection.tsx
    - frontend/src/app/admin/fansubs/create/AdminFansubCreateLinksSection.tsx
    - frontend/src/app/admin/fansubs/create/AdminFansubCreateMediaSection.tsx
    - frontend/src/app/admin/fansubs/merge/page.tsx

key-decisions:
  - "Kein weiterer Datei-Split noetig: 184-05 hatte page.tsx (370 Zeilen) und merge/page.tsx (424 Zeilen) bereits unter die 450-Zeilen-Grenze gebracht; nach diesem Plan liegen beide bei 371 bzw. 425 Zeilen (je +1 Zeile fuer den neuen Import), weiterhin konform."

requirements-completed: [D-01]

# Metrics
duration: ~20min
completed: 2026-10-15
---

# Phase 184 Plan 06: F-12 (D-01) Teil 2 — Fansub-Umfeld auf mergeCssModules Summary

Letzte 7 Fansub-Umfeld-Dateien (Liste, Create-Flow mit 5 Unterkomponenten, Merge-Wizard) rufen jetzt `mergeCssModules(X, sharedStyles)` statt des latent kaputten `{ ...sharedStyles, ...X }`-Spreads — Vorrang eigener Klassen vor geteilten bleibt exakt erhalten, keine sichtbare Verhaltensaenderung.

## Performance

- **Duration:** ~20 min
- **Started:** 2026-10-15T17:05:00Z (geschaetzt)
- **Completed:** 2026-10-15T17:24:05Z
- **Tasks:** 2/2 completed
- **Files modified:** 7 (+ 1 Doku-Datei `deferred-items.md`)

## Accomplishments

- `admin/fansubs/page.tsx`: `{ ...sharedStyles, ...fansubStyles }` → `mergeCssModules(fansubStyles, sharedStyles)`.
- `admin/fansubs/create/page.tsx` + 4 Unterkomponenten (`AdminFansubCreateAliasesSection.tsx`, `AdminFansubCreateBasicInfoSection.tsx`, `AdminFansubCreateLinksSection.tsx`, `AdminFansubCreateMediaSection.tsx`): `{ ...sharedStyles, ...fansubEditStyles }` → `mergeCssModules(fansubEditStyles, sharedStyles)`.
- `admin/fansubs/merge/page.tsx`: `{ ...sharedStyles, ...mergeStyles }` → `mergeCssModules(mergeStyles, sharedStyles)`.
- Damit sind alle 7 der in `184-CONTEXT.md` benannten "Fansub-Umfeld"-Dateien auf den zentralen Helfer aus 184-03 umgestellt — zusammen mit den bereits in 184-07/08/09 umgestellten Clustern (AnimeBrowser, AnimeContext, EpisodeManager, ReleaseVersionNotesTab) ist F-12/D-01 fuer den gesamten in `184-CONTEXT.md` ermittelten 38-Dateien-Umfang abgeschlossen.
- Kein weiterer Datei-Split noetig: `admin/fansubs/page.tsx` (371 Zeilen) und `admin/fansubs/merge/page.tsx` (425 Zeilen) bleiben nach dem jeweils einen zusaetzlichen Import unter der 450-Zeilen-Grenze.
- Volles Gate im Frontend-Container gruen: `npx tsc --noEmit` clean, `npx eslint .` 4 vorbestehende, unabhaengige Fehler (unveraendert, ausserhalb des Scopes) + Warnungen, `npx vitest run` 385 passed/1 skipped (4 Dateien mit vorbestehenden, unabhaengigen Fehlern — siehe Deviations), alle Fansub-Testdateien gruen.
- `docker restart team4sv30-frontend` nach allen Frontend-Edits ausgefuehrt; Container danach gesund (`/`, `/admin/fansubs`, `/admin/fansubs/create`, `/admin/fansubs/merge` je `curl -sI` → 200).

## Task Commits

Beide Tasks wurden gemeinsam in einem einzigen inhaltlichen Commit umgesetzt (wie im Plan unter Task 2 vorgegeben: "ein einziger inhaltlicher Commit fuer alle 7"):

1. **Task 1 + Task 2: Fansub-Liste, Create-Flow (6 Dateien) und Merge-Wizard (1 Datei) auf mergeCssModules umstellen** - `2d2342f32` (refactor)

## Files Created/Modified

- `frontend/src/app/admin/fansubs/page.tsx` - `mergeCssModules(fansubStyles, sharedStyles)` statt Spread
- `frontend/src/app/admin/fansubs/create/page.tsx` - `mergeCssModules(fansubEditStyles, sharedStyles)` statt Spread
- `frontend/src/app/admin/fansubs/create/AdminFansubCreateAliasesSection.tsx` - dito
- `frontend/src/app/admin/fansubs/create/AdminFansubCreateBasicInfoSection.tsx` - dito
- `frontend/src/app/admin/fansubs/create/AdminFansubCreateLinksSection.tsx` - dito
- `frontend/src/app/admin/fansubs/create/AdminFansubCreateMediaSection.tsx` - dito
- `frontend/src/app/admin/fansubs/merge/page.tsx` - `mergeCssModules(mergeStyles, sharedStyles)` statt Spread
- `.planning/phases/184-.../deferred-items.md` - 184-06-Eintrag fuer die 4 bereits aus 184-09 bekannten, unabhaengigen Vitest-Vorbestandsfaelle ergaenzt

## Decisions Made

- Keine zusaetzliche Datei-Aufteilung vorgenommen: 184-05 hatte `page.tsx` und `merge/page.tsx` bereits auf 370 bzw. 424 Zeilen gebracht; der jeweils eine zusaetzliche Import-Zeile dieses Plans (371/425 Zeilen) bleibt unter der 450-Zeilen-Grenze aus CLAUDE.md/D-05.

## Deviations from Plan

None — Plan exakt wie geschrieben ausgefuehrt. Alle 7 Ersetzungen entsprechen 1:1 der Tabelle in `<interfaces>` des Plans.

## Auth Gates Encountered

None.

## Stub Tracking

Keine neuen Stubs. Reiner Helferaufruf-Tausch, keine Daten-/API-Aenderung.

## Threat Flags

None - reine clientseitige Styling-Konsolidierung, keine neue Netzwerk-/Auth-/Dateizugriffs-Flaeche (siehe `<threat_model>` im Plan, Disposition "accept").

## Known Stubs

None.

## Deferred Issues (out of scope, pre-existing)

Voller `npx vitest run` zeigt dieselben 4 bereits unter 184-09 dokumentierten vorbestehenden Fehler, unveraendert durch diesen Plan und ausserhalb seines Scopes:
- `src/components/profile/badgeArtwork.test.ts` (Suite-Fehler, fehlende `API_INTERNAL_URL` in dieser Shell-Umgebung)
- `src/components/ui/ResponsiveImage.config.test.ts` (Assertion zu erlaubten Remote-Hosts, unabhaengig von CSS-Modul-Merges)
- `src/types/__tests__/anime-detail-contract.test.ts` (bereits seit 184-02 bekannter OpenAPI-Schema-Mismatch)
- `src/app/admin/roles/RoleCapabilityDetail.membershipBaselineDrift.test.ts` (ENOENT beim Lesen von `/backend/internal/permissions/permissions.go`, Pfad nur im Docker-Container vorhanden)

Alle Fansub-bezogenen Testdateien (u. a. `admin/fansubs/page.test.tsx`, `admin/fansubs/create/page.test.tsx`, `admin/fansubs/create/useAdminFansubCreateActions.test.ts`, `admin/fansubs/merge/fansubMergeScoring.test.ts`) sind gruen. Siehe `deferred-items.md` fuer den vollen 184-06-Eintrag.

## User Setup Required

None - keine externe Service-Konfiguration erforderlich.

## Next Phase Readiness

- F-12/D-01 ist fuer den gesamten in `184-CONTEXT.md` ermittelten Umfang (38 Dateien: 16 bereits in Phase 176 gefixte + 22 neu gefundene, davon 7 in diesem Plan) abgeschlossen.
- Keine Blocker fuer nachfolgende Plaene dieser Phase (F-07, F-20).

## Self-Check: PASSED

- FOUND: `frontend/src/app/admin/fansubs/page.tsx`
- FOUND: `frontend/src/app/admin/fansubs/create/page.tsx`
- FOUND: `frontend/src/app/admin/fansubs/create/AdminFansubCreateAliasesSection.tsx`
- FOUND: `frontend/src/app/admin/fansubs/create/AdminFansubCreateBasicInfoSection.tsx`
- FOUND: `frontend/src/app/admin/fansubs/create/AdminFansubCreateLinksSection.tsx`
- FOUND: `frontend/src/app/admin/fansubs/create/AdminFansubCreateMediaSection.tsx`
- FOUND: `frontend/src/app/admin/fansubs/merge/page.tsx`
- FOUND: commit `2d2342f32`

---
*Phase: 184-aufr-umpunkte-aus-phase-174-abschlie-en-tote-css-klassen-in-*
*Completed: 2026-10-15*
