---
phase: 181-release-bearbeitung-zusammenf-hren-f-13-eine-rechtebasierte-
plan: 07
subsystem: ui
tags: [typescript, nextjs, react, vitest, release-editor, tabs, navigation, capabilities]

# Dependency graph
requires:
  - phase: 181-02
    provides: "buildReleaseEditorTabIds() (D-02 tab matrix), releaseEditorRouting.ts (getSafeReturnPath/getProjectReturnPath/parsePositiveInt/resolveNavigationContext/formatEpisodeNumber/formatEpisodeLabel)"
  - phase: 181-04
    provides: "frontend/src/components/releaseEditor/ as the single import source for SegmenteTab/ReleaseVersionMediaSection/ReleaseVersionNotesTab"
  - phase: 181-05
    provides: "useReleaseEditorData() (ported useEpisodeVersionEditor), useReleaseEditorNavigation() (D-03 context-selecting facade), AdjacentNavigation's centerLabel slot"
  - phase: 181-06
    provides: "ReleaseEditorMetadataTab/ReleaseEditorFilesTab/ReleaseEditorChangelogTab tab-content components"
provides:
  - "/releases/[versionId]/edit -- the one merged, role/capability-gated release editor page (D-01/D-02/D-03/D-05), composing all four prior plans into a single orchestrator component"
  - "ReleaseEditorPage.tsx (387 lines): own generation-guarded admin/contributor scope load (getCurrentUser+getOwnProfile+getReleaseVersionCapabilities), D-02 tab assembly, D-03 single-navigation-source wiring, D-05 graceful-empty-state rendering"
  - "ReleaseEditorPage.module.css: .page/.shell/.breadcrumb/.headerActions/.badgeRow/.releaseNavigation/.navigationStatus wrapper classes, values ported verbatim from workspace.module.css per UI-SPEC Spacing Scale"
affects: [181-08, 181-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Key-tracked async state instead of synchronous setState-in-effect resets (react-hooks/set-state-in-effect, eslint-plugin-react-hooks v7's React Compiler-backed rule): every setter in this page's own effects runs only inside a .then()/.catch() callback, never synchronously in the effect body, mirroring the key-tracking pattern useEpisodeNeighborNavigation/useProjectNeighborNavigation already established in this folder (Plan 05)"
    - "Early-return-after-all-hooks: every hook (useReleaseEditorData, both scope/timeline effects, useReleaseEditorNavigation, useState for activeTab) runs unconditionally at the top of the component; loading/error/no-access branches return only after all hooks have executed, exactly mirroring the two legacy pages this replaces"

key-files:
  created:
    - "frontend/src/app/releases/[versionId]/edit/ReleaseEditorPage.tsx"
    - "frontend/src/app/releases/[versionId]/edit/ReleaseEditorPage.test.tsx"
    - "frontend/src/app/releases/[versionId]/edit/ReleaseEditorPage.module.css"
    - "frontend/src/app/releases/[versionId]/edit/page.tsx"
  modified: []

key-decisions:
  - "Dropped the per-page useAuthSession() gate the old workspace page had: useReleaseEditorData() already owns hasAuthSession internally and surfaces 'Anmeldung erforderlich...' via editor.errorMessage, so a second independent auth check at the page level would have been redundant dead code, not a missing feature."
  - "Tab-active-tab is one-directional (state -> URL via router.replace on click), not continuously re-synced from searchParams after mount -- avoids both the set-state-in-effect lint violation and a worse latent bug (an effect that re-syncs activeTab from the URL on every render would fight the optimistic local update immediately after a user click, since router.replace's URL update lands on a later render, causing a visible flicker back to the old tab). The initial tab is still read once from ?tab= at mount via lazy useState init."
  - "Action-button copy for the generic route/load-error state (editor.errorMessage case, before role is known) was not verbatim-specified in the plan's <interfaces> block (truncated with '...'); chose 'Meine Projekte' (member fallback, verbatim from the old workspace pattern) and 'Zur Anime-Verwaltung' (admin fallback, new -- no UI-SPEC-listed precedent existed for this exact state since the old admin page never showed this error shape)."

patterns-established:
  - "Tab-content composition purely via buildReleaseEditorTabIds(...).includes(id) checks building a TabItem[] array in RELEASE_EDITOR_TAB_IDS's fixed order -- no duplicated role-branching JSX blocks (the exact anti-pattern this whole phase exists to remove, RESEARCH.md 'Don't Hand-Roll')"

requirements-completed: [D-01, D-02, D-03, D-05]

# Metrics
duration: ~55min
completed: 2026-10-13
---

# Phase 181 Plan 07: Release-Editor-Seite zusammensetzen (Orchestrator) Summary

**`/releases/[versionId]/edit` ist jetzt eine vollstaendige, 387-Zeilen-ReleaseEditorPage.tsx-Komponente, die alle vier Vorplaene (02/04/05/06) zu einer einzigen rollen-/capability-gesteuerten Release-Bearbeitungsseite zusammensetzt -- 6 Tabs fuer Plattform-Admins, bis zu 4 fuer Mitwirkende, genau eine Navigationsleiste je Einstiegskontext, kein Fehlerbanner im D-05-Leerzustand.**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-10-13T16:40:00Z (geschaetzt)
- **Completed:** 2026-10-13T17:35:00Z
- **Tasks:** 2/2
- **Files modified:** 4 (alle neu)

## Accomplishments
- `ReleaseEditorPage.tsx` laedt `useReleaseEditorData()` (Plan 05) als einzige Daten-/Aktionsquelle, dazu einen eigenen generation-guarded `Promise.all([getCurrentUser(), getOwnProfile(), getReleaseVersionCapabilities(id)])`-Ladepfad fuer `isPlatformAdmin`/Capabilities/`memberId`, sobald `editor.contextData?.version.id` vorliegt -- unabhaengig vom internen Race-Guard des Editor-Hooks.
- Tab-Sichtbarkeit laeuft ausschliesslich ueber `buildReleaseEditorTabIds(...)` (Plan 02): Plattform-Admins sehen alle 6 Tabs (`metadata/files/segments/media/changelog/notes`) in kanonischer Reihenfolge, Nicht-Admins ausschliesslich die durch ihre `ReleaseVersionCapabilities` freigeschalteten unter den 4 gemeinsamen Tabs -- bewiesen durch 2 der 5 Verhaltenstests.
- Navigationskontext wird einmal pro Render ueber `resolveNavigationContext(...)` aufgeloest und treibt `useReleaseEditorNavigation(...)` (Plan 05) -- genau eine `AdjacentNavigation`-Leiste wird gerendert, nie eine Vermischung aus Projekt- und Episoden-Datenquelle (bewiesen durch 2 weitere Verhaltenstests: `return_to=/me/projects/.../group/...` ruft ausschliesslich `getMyProjectDetail`, `return_to=/admin/fansubs/.../edit` ausschliesslich `getGroupedEpisodes`).
- D-05-Graceful-Leerzustand verifiziert: wenn `getMyProjectDetail` keine passende Release-Version liefert, rendert `AdjacentNavigation` dank seiner bereits in Plan 05 erweiterten Guard-Logik (`previous=null, next=null, centerLabel=undefined`) gar nichts -- kein Fehlerbanner, keine neue EmptyState-Karte, die restliche Seite (Tabs, Header) bleibt voll nutzbar.
- Header/Breadcrumb/Aktionsleiste (`PageHeader`) vereinheitlicht beide Alt-Muster kontextabhaengig: Eyebrow "Administrator"/"Release-Projektbereich", Breadcrumb "Anime/.../Episode N" (Episoden-Kontext) vs. "Meine Projekte/.../Episode N" (Projekt-Kontext), inkl. portierter "Zur Fansubgruppe"-, "Oeffentliche Release-Seite"- und admin-exklusiver "Version loeschen"-Aktionen (alle als `Button`-Primitive, nicht mehr als rohe `<button>`/`<Link className=...>`).
- Volle Regression gruen: `npx tsc --noEmit` 0 Fehler, `npx vitest run "src/app/releases/[versionId]/edit"` 10/10 Dateien / 96 Tests gruen, voller Suite-Lauf 394/395 Dateien / 3622/3623 Tests gruen (1 isoliert nachweislich gruener, unter Volllast flockiger Timeout in einer unbeteiligten Dev-Showcase-Datei -- siehe Issues Encountered), `npx eslint` auf allen 4 neuen Dateien 0 Befunde, `npm run lint` reposweit keine neuen Befunde (6 vorbestehende Fehler/228 Warnungen, alle ausserhalb dieses Plans).
- `/releases/42/edit` live im Docker-Frontend geprueft (`curl` 200, Next.js kompiliert die Route fehlerfrei).

## Task Commits

1. **Task 1: ReleaseEditorPage.tsx orchestrator** - `d2eeedb8` (feat, inkl. Test + CSS-Modul)
2. **Task 2: Thin page.tsx entry + full new-route regression** - `8ec74600` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `frontend/src/app/releases/[versionId]/edit/ReleaseEditorPage.tsx` - Orchestrator-Client-Komponente (387 Zeilen, Plan-Zielkorridor ~250-300 leicht ueberschritten, aber weit unter der 450-Zeilen-CLAUDE.md-Grenze)
- `frontend/src/app/releases/[versionId]/edit/ReleaseEditorPage.test.tsx` - 5 Verhaltenstests (Admin-6-Tabs, Nicht-Admin-1-Tab, Projekt-Kontext-Routing, Episoden-Kontext-Routing, D-05-Leerzustand)
- `frontend/src/app/releases/[versionId]/edit/ReleaseEditorPage.module.css` - `.page`/`.shell`/`.breadcrumb`/`.headerActions`/`.badgeRow`/`.releaseNavigation`/`.navigationStatus`, Werte wortgetreu aus `workspace.module.css` uebernommen
- `frontend/src/app/releases/[versionId]/edit/page.tsx` - 5-Zeilen Thin-Entry-Point, re-exportiert `ReleaseEditorPage`

## Decisions Made
- Siehe `key-decisions` im Frontmatter: (1) kein zweiter `useAuthSession()`-Gate auf Seitenebene, (2) `activeTab` einseitig state->URL statt kontinuierlich URL->state resynchronisiert, (3) Action-Button-Beschriftungen fuer den generischen Ladefehler-Zustand selbst gewaehlt, da die Plan-Skizze dort mit "..." abgekuerzt war.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] `ReleaseEditorPage.module.css` ergaenzt (nicht in `files_modified` gelistet)**
- **Found during:** Task 1 (UI-SPEC-Abgleich vor dem ersten Verify-Lauf)
- **Issue:** Die Plan-`files_modified`-Liste nennt nur `page.tsx`/`ReleaseEditorPage.tsx`/`ReleaseEditorPage.test.tsx`, aber UI-SPEC's Spacing-Scale-Abschnitt verlangt explizit: "Die neue Seite uebernimmt exakt die vorhandenen `.page`/`.shell`-Wrapper-Werte aus `workspace.module.css`" -- ohne ein eigenes CSS-Modul waere die Seite entweder ungestylt oder haette `workspace.module.css` aus der zum Loeschen vorgesehenen Nachbar-Route importieren muessen (Pitfall-3-Risiko aus RESEARCH.md: verwaiste Altdatei als versteckte Abhaengigkeit).
- **Fix:** Neues `ReleaseEditorPage.module.css` mit denselben 7 Klassen/Werten wie `workspace.module.css`, keine neuen Ad-hoc-Pixelwerte.
- **Files modified:** `frontend/src/app/releases/[versionId]/edit/ReleaseEditorPage.module.css`
- **Commit:** `d2eeedb8`

**2. [Rule 1 - Bug] `react-hooks/set-state-in-effect`-Lint-Fehler in 3 Effekten behoben**
- **Found during:** Task 1 (erster `npx eslint`-Lauf)
- **Issue:** Die initiale Implementierung rief (wie die alte Workspace-Seite) synchron `setState(...)` direkt im Effekt-Koerper auf (Scope-Error-Reset, Projekt-Timeline-Reset-auf-null, URL->State-Tab-Sync) -- 3 Fehler der neueren `eslint-plugin-react-hooks@7`-React-Compiler-Regel `set-state-in-effect`. Die alte Workspace-Seite selbst loest diese Regel nicht aus, weil der React-Compiler bei ihrer komplexeren Effekt-Form sichtbar stillschweigend abbricht (keine Diagnose, keine Garantie) -- kein Vorbild zum Kopieren.
- **Fix:** Scope-Lade-Effekt setzt `scopeError` nur noch innerhalb der `.then()`/`.catch()`-Callbacks; Projekt-Timeline nutzt jetzt dieselbe Key-Tracking-Struktur (`{key, data}` + abgeleiteter Render-Wert) wie `useEpisodeNeighborNavigation`/`useProjectNeighborNavigation` (Plan 05); der Tab-URL-Sync-Effekt entfaellt vollstaendig zugunsten einer einmaligen Lazy-`useState`-Initialisierung plus einseitigem `handleTabChange` (State -> URL via `router.replace`, nicht zurueck).
- **Files modified:** `frontend/src/app/releases/[versionId]/edit/ReleaseEditorPage.tsx`
- **Verification:** `npx eslint ... --no-cache` 0 Fehler/0 Warnungen (ausser der in Punkt 3 behobenen unbenutzten Variable); alle 5 Verhaltenstests weiterhin gruen.
- **Commit:** `d2eeedb8`

**3. [Rule 1 - Bug] Unbenutzte `versionId`-Variable entfernt**
- **Found during:** Task 1 (`npx eslint`-Lauf)
- **Issue:** Ein anfangs aus der Plan-Skizze uebernommener `const versionId = parsePositiveInt(params.versionId)` wurde nirgends gelesen, da `useReleaseEditorData()` seine eigene `versionID`-Ableitung intern via `useParams()` traegt.
- **Fix:** `useParams`-Import und die tote Variable entfernt.
- **Files modified:** `frontend/src/app/releases/[versionId]/edit/ReleaseEditorPage.tsx`
- **Commit:** `d2eeedb8`

---

**Total deviations:** 3 auto-fixed (1 Rule 2, 2 Rule 1)
**Impact on plan:** Keine Scope-Erweiterung. (1) ist eine CLAUDE.md-/UI-SPEC-Pflichtergaenzung (notwendige Styling-Datei), (2) und (3) sind reine Korrektheits-/Sauberkeits-Fixes ohne Verhaltensaenderung an den 5 geforderten Testfaellen.

## Issues Encountered
- Ein voller `npx vitest run` ohne Pfadfilter zeigte 1 fehlgeschlagenen Test (`AchievementBadgeShowcase.test.tsx`, Timeout bei 5000ms) -- unbeteiligt an dieser Phase (Dev-Showcase-Galerie fuer Achievement-Badges). Isoliert erneut ausgefuehrt lief die Datei in 8,17s mit allen 7 Tests gruen (1,1s fuer den zuvor timeoutenden Test) -- bestaetigt als Last-/Parallelitaets-Flackern des Gesamtlaufs, keine echte Regression durch diesen Plan.

## User Setup Required

None - keine externe Service-Konfiguration noetig.

## Next Phase Readiness
- `/releases/[versionId]/edit` ist eine vollstaendige, getestete Next.js-Route, bereit fuer Plan 08 (Umstellung aller 11 externen Einstiegspunkte auf diese Adresse).
- Die beiden Altseiten (`EpisodeVersionEditorPage.tsx`, `workspace/page.tsx`) bleiben unveraendert und weiterhin live erreichbar -- Plan 09 aktiviert die Redirects und loescht sie.
- Keine Blocker fuer nachfolgende Plaene dieser Phase.

---
*Phase: 181-release-bearbeitung-zusammenf-hren-f-13-eine-rechtebasierte-*
*Completed: 2026-10-13*

## Self-Check: PASSED

Alle 4 erstellten Dateien (`ReleaseEditorPage.tsx`, `ReleaseEditorPage.test.tsx`,
`ReleaseEditorPage.module.css`, `page.tsx`) unter
`frontend/src/app/releases/[versionId]/edit/` auf der Festplatte gefunden; beide
Task-Commits (`d2eeedb8`, `8ec74600`) im Git-Log gefunden.
