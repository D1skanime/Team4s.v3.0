---
phase: 181-release-bearbeitung-zusammenf-hren-f-13-eine-rechtebasierte-
plan: 02
subsystem: ui
tags: [typescript, nextjs, vitest, release-editor, redirects, capabilities]

# Dependency graph
requires:
  - phase: 181-01
    provides: "D-05 backend graceful GetMyProjectDetail (not directly consumed by this plan, but establishes the project-contextual navigation data source these utilities assume is reliable for a platform admin without a member profile)"
provides:
  - "buildReleaseEditorRedirects() -- RedirectRule[] for the 2 permanent old-address redirects (D-01/D-04), framework-free so next.config.mjs can consume it later without coupling Vitest to Next.js config loading"
  - "getSafeReturnPath/getProjectReturnPath/parsePositiveInt/resolveNavigationContext/readErrorMessage/formatEpisodeNumber/formatEpisodeLabel in releaseEditorRouting.ts -- merged, tested routing/navigation-context primitives (D-01/D-03)"
  - "buildReleaseEditorTabIds() -- pure capability-to-tab-id mapping covering the full D-02 tab-visibility matrix (4 tabs non-admin, 6 tabs admin)"
affects: [181-05, 181-06, 181-07, 181-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Framework-free utility modules co-located with a not-yet-existing route directory (app/releases/[versionId]/edit/) so later orchestrator-page plans can import ready-made, already-tested building blocks instead of inlining logic"

key-files:
  created:
    - frontend/src/lib/releaseEditorRedirects.ts
    - frontend/src/lib/releaseEditorRedirects.test.ts
    - "frontend/src/app/releases/[versionId]/edit/releaseEditorRouting.ts"
    - "frontend/src/app/releases/[versionId]/edit/releaseEditorRouting.test.ts"
    - "frontend/src/app/releases/[versionId]/edit/releaseEditorTabs.ts"
    - "frontend/src/app/releases/[versionId]/edit/releaseEditorTabs.test.ts"
  modified: []

key-decisions:
  - "buildReleaseEditorRedirects() has zero import from 'next' so it stays independently Vitest-testable; next.config.mjs wiring is explicitly deferred to Plan 09 (Wave 5), per RESEARCH.md Pitfall 3's ordering -- the redirects must not go live before /releases/[versionId]/edit's page.tsx exists"
  - "getSafeReturnPath (permissive 2-pattern) and getProjectReturnPath (strict exact-match) are both ported verbatim and coexist in releaseEditorRouting.ts -- the merge is additive, neither replaces the other, matching how the two source pages used them differently"
  - "resolveNavigationContext() defaults to 'project' when no context signal is present at all, per RESEARCH.md Assumption A1, now covered as an explicit regression test case rather than an implicit fallback"

patterns-established:
  - "Pure utility + co-located Vitest test with @vitest-environment node annotation and no DOM/jsdom, mirroring role-capabilities/page.test.tsx's plain describe/it style on a function's return value"

requirements-completed: [D-01, D-02, D-03, D-04]

# Metrics
duration: ~5min
completed: 2026-10-13
---

# Phase 181 Plan 02: Release-Editor-Hilfsmodule (Redirects, Routing, Tabs) Summary

**Drei neue, pure, unabhängig testbare Utility-Module (`releaseEditorRedirects.ts`, `releaseEditorRouting.ts`, `releaseEditorTabs.ts`) decken alle D-01 bis D-04 Entscheidungsregeln der zusammengeführten Release-Bearbeitungsseite ab, bevor die eigentliche Seite in späteren Wellen gebaut wird.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-10-13T15:51:00Z
- **Completed:** 2026-10-13T15:53:14Z
- **Tasks:** 3/3
- **Files modified:** 6 (alle neu)

## Accomplishments
- `buildReleaseEditorRedirects()` liefert genau die 2 geforderten permanenten Redirect-Regeln (alte Admin-Adresse + alte Workspace-Adresse → `/releases/:versionId/edit`), ohne Next.js-Abhängigkeit — bereit für die Verdrahtung in `next.config.mjs` in Plan 09.
- `releaseEditorRouting.ts` vereint `getSafeReturnPath` (permissiv, 2 Muster) und `getProjectReturnPath` (strikt, exakter Abgleich) additiv in einer Datei, plus `parsePositiveInt`, `readErrorMessage`, `formatEpisodeNumber`, `formatEpisodeLabel` (alle wortgetreu portiert) und die neue `resolveNavigationContext()` für D-03's kontextabhängige Vor/Zurück-Navigation.
- `releaseEditorTabs.ts` formalisiert die bisher inline verstreute Tab-Sichtbarkeits-Logik aus dem Workspace in eine reine Funktion `buildReleaseEditorTabIds()`, die D-02's komplette Matrix (4 Tabs für Nicht-Admins, 6 für Plattform-Admins, admin-exklusive Tabs nie für Nicht-Admins sichtbar) abdeckt.
- Alle drei Module liegen in einem brandneuen Verzeichnis (`app/releases/[versionId]/edit/`, noch ohne `page.tsx`, daher von Next.js nicht geroutet) bzw. einer neuen `lib/`-Datei — null Datei-Overlap mit jedem anderen Wave-1-Plan.

## Task Commits

Jede Aufgabe folgte dem RED→GREEN-TDD-Zyklus mit je 2 Commits:

1. **Task 1: releaseEditorRedirects.ts (D-01/D-04)** - `d5fab33e` (test, RED) → `1f3b6cbb` (feat, GREEN)
2. **Task 2: releaseEditorRouting.ts (D-01/D-03)** - `f6df6f71` (test, RED) → `e3e5bd3d` (feat, GREEN)
3. **Task 3: releaseEditorTabs.ts (D-02)** - `a1374ddc` (test, RED) → `8dd2af4a` (feat, GREEN)

**Plan metadata:** (this commit)

## Files Created/Modified
- `frontend/src/lib/releaseEditorRedirects.ts` - `RedirectRule` interface + `buildReleaseEditorRedirects()`, keine `next`-Imports
- `frontend/src/lib/releaseEditorRedirects.test.ts` - 3 Assertions (beide Regeln + exakte Array-Länge 2)
- `frontend/src/app/releases/[versionId]/edit/releaseEditorRouting.ts` - `getSafeReturnPath`, `getProjectReturnPath`, `parsePositiveInt`, `readErrorMessage`, `formatEpisodeNumber`, `formatEpisodeLabel`, `resolveNavigationContext`, `NavigationContext`
- `frontend/src/app/releases/[versionId]/edit/releaseEditorRouting.test.ts` - 22 Assertions über alle 7 exportierten Funktionen inkl. der expliziten Fallback-Regressionsfälle
- `frontend/src/app/releases/[versionId]/edit/releaseEditorTabs.ts` - `RELEASE_EDITOR_TAB_IDS`, `ReleaseEditorTabId`, `ReleaseEditorTabInputs`, `buildReleaseEditorTabIds()`
- `frontend/src/app/releases/[versionId]/edit/releaseEditorTabs.test.ts` - 4 Assertions (Media-only, 4-Tab-Nicht-Admin, 6-Tab-Admin, leere Liste)

## Decisions Made
- `buildReleaseEditorRedirects()` bleibt framework-frei (kein `next`-Import), damit Vitest das Modul ohne Next.js-Config-Ladevorgang testen kann — die eigentliche Verdrahtung in `next.config.mjs` ist bewusst Plan 09 (Wave 5) vorbehalten, da die Redirects laut RESEARCH.md Pitfall 3 erst live gehen dürfen, wenn die Zielseite existiert.
- Beide Return-Path-Validierungsfunktionen (permissiv vs. strikt) koexistieren unverändert nebeneinander statt eine die andere zu ersetzen — der heutige Admin-Editor und der heutige Workspace nutzten sie bewusst unterschiedlich.
- `resolveNavigationContext()` fällt ohne jeglichen Kontext-Hinweis konservativ auf `'project'` zurück (RESEARCH.md Assumption A1), jetzt als expliziter Regressionstestfall abgesichert statt nur implizit im Code zu stecken.

## Deviations from Plan

None - plan executed exactly as written. Alle drei Tasks' Akzeptanzkriterien und Verify-Kommandos liefen wie spezifiziert.

## Issues Encountered

None.

## User Setup Required

None - keine externe Service-Konfiguration nötig.

## Next Phase Readiness
- Die drei Module stehen bereit für die Orchestrator-Seite (Pläne 05, 06, 07), die diese Bausteine statt Ad-hoc-Logik konsumieren wird.
- `next.config.mjs`-Verdrahtung der Redirects bleibt bewusst für Plan 09 offen (Wave 5), nachdem die Zielseite existiert.
- Keine Blocker für nachfolgende Pläne dieser Phase.

---
*Phase: 181-release-bearbeitung-zusammenf-hren-f-13-eine-rechtebasierte-*
*Completed: 2026-10-13*

## Self-Check: PASSED

Alle 6 erstellten Dateien auf der Festplatte gefunden; alle 6 Task-Commits (`d5fab33e`, `1f3b6cbb`, `f6df6f71`, `e3e5bd3d`, `a1374ddc`, `8dd2af4a`) im Git-Log gefunden.
