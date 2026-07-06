---
phase: quick-260706-x0v
plan: 01
subsystem: frontend-fansub-cockpit
tags: [frontend, api-client, segments, fansub-cockpit, bugfix]
dependency-graph:
  requires: []
  provides:
    - "getAdminAnimeThemeSegments releaseVariantId query passthrough"
  affects:
    - "frontend/src/app/admin/fansubs/[id]/edit"
tech-stack:
  added: []
  patterns:
    - "URLSearchParams query-building pattern (mirrors getAnimeSegments) reused for getAdminAnimeThemeSegments"
key-files:
  created: []
  modified:
    - frontend/src/lib/api.ts
    - "frontend/src/app/admin/fansubs/[id]/edit/useFansubReleaseData.ts"
    - "frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx"
decisions:
  - "getAdminAnimeThemeSegments signature extended with a 4th optional releaseVariantId param (after authToken), matching getAnimeSegments' parameter ordering pattern, to preserve backward compatibility for the existing useAdminAnimeThemes.ts caller (2-arg call)"
metrics:
  duration: "~20min"
  completed: "2026-07-06"
---

# Quick Task 260706-x0v: Fix 400 release_variant_id Fehler beim Laden

Behebt den 400-Fehler "release_variant_id ist erforderlich" im Fansub-Gruppen-Cockpit fuer Nicht-Plattform-Admins (z.B. CSubs-Leader mit `segments.manage`-Capability), indem `getAdminAnimeThemeSegments` einen optionalen `releaseVariantId`-Parameter erhaelt und `useFansubReleaseData.ts` die bereits verfuegbare `release.release_version_id` durchreicht.

## Was wurde gebaut

**Task 1 — `releaseVariantId`-Parameter ergaenzen und durchreichen** (Commit `5bd95f2e`)
- `frontend/src/lib/api.ts`: `getAdminAnimeThemeSegments` bekommt einen vierten optionalen Parameter `releaseVariantId?: number | null` (nach `authToken`, analog zu `getAnimeSegments`). Ein `URLSearchParams`-Query-String wird gebaut und `release_variant_id` nur gesetzt, wenn der Wert vorhanden ist — bestehende Aufrufe ohne diesen Parameter bleiben unveraendert (keine Query-Param).
- `frontend/src/app/admin/fansubs/[id]/edit/useFansubReleaseData.ts`: Der Aufruf in `loadReleaseSegmentCards` reicht jetzt `release.release_version_id` als viertes Argument durch (`authToken` bleibt `undefined`, identisch zum bisherigen Verhalten).
- Der zweite Aufrufer `useAdminAnimeThemes.ts` bleibt unveraendert (2-Argument-Aufruf, kein Query-Param, kein Regressionsrisiko).

**Task 2 — Regressionstest ergaenzt** (Commit `8c7d0526`)
- `frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx`: Neuer Testfall `passes release_version_id as releaseVariantId when loading theme segments in the fansub cockpit` klappt einen Release mit `release_version_id: 6201` aus und prueft per `toHaveBeenCalledWith(release.anime_id, 7, undefined, release.release_version_id)`, dass `getAdminAnimeThemeSegments` die ID korrekt durchreicht.

## Testergebnisse

- `npx vitest run src/lib/api.test.ts` — 3/3 gruen (keine dedizierten Tests fuer diese Funktion vorhanden; Abdeckung erfolgt ueber `page.test.tsx`, wie im Plan vorgesehen).
- `npx vitest run "src/app/admin/fansubs/[id]/edit/page.test.tsx"` — 33/34 gruen. Der neue Regressionstest ist gruen. 1 Test schlaegt fehl (`refreshes anime coverage after saving contribution roles`), siehe "Deferred Issues" — **vorbestehender Defekt, nicht durch diesen Task verursacht**.
- `npx tsc --noEmit` — keine neuen Typfehler.

## Deviations from Plan

None - plan executed exactly as written.

## Deferred Issues (out of scope)

**`refreshes anime coverage after saving contribution roles` schlaegt fehl (vorbestehend)**
- Verifiziert durch Vergleich mit dem unveraenderten `HEAD`-Stand von `page.test.tsx` (vor allen Aenderungen dieses Tasks): der Test schlaegt dort identisch fehl (`getByRole('button', { name: 'Timer' })` findet das Element nicht innerhalb des Dialogs).
- Nicht durch diesen Fix verursacht (betrifft Contribution-Rollen-Dialog, nicht Segment-Ladepfad) — bleibt unangetastet gemaess Scope-Boundary-Regel.
- Nicht in `deferred-items.md` dupliziert, da nur dieser eine Fund vorliegt und hier dokumentiert ist.

## Verification gegen Plan

1. `npx vitest run "src/app/admin/fansubs/[id]/edit/page.test.tsx"` — neuer Test gruen; 1 vorbestehender, unabhaengiger Fehlschlag (siehe oben).
2. `npx tsc --noEmit` — keine neuen Typfehler durch die erweiterte Signatur.
3. Manuell/live (Docker-Prod-Build auf :3000): **noch offen** — sollte nach Rebuild von `team4sv30-frontend` durch einen CSubs-Leader (nicht Plattform-Admin) verifiziert werden: Release im Fansub-Cockpit ausklappen, kein 400-Fehler mehr, Segment-Karten erscheinen.
4. Manuell/live: Plattform-Admin-Verhalten unveraendert — ebenfalls noch als Live-Check offen.

## Self-Check: PASSED

- FOUND: frontend/src/lib/api.ts (releaseVariantId-Parameter vorhanden)
- FOUND: frontend/src/app/admin/fansubs/[id]/edit/useFansubReleaseData.ts (release.release_version_id durchgereicht)
- FOUND: frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx (neuer Testfall vorhanden)
- FOUND commit 5bd95f2e
- FOUND commit 8c7d0526
