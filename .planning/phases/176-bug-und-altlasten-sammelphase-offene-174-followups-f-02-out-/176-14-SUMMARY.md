---
phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-
plan: 14
subsystem: frontend-admin-fansub-edit
tags: [css-modules, proxy-merge, flaky-test, vitest, refactor]

# Dependency graph
requires:
  - phase: 176-05
    provides: earlier wave groundwork this plan's depends_on references
  - phase: 176-06
    provides: earlier wave groundwork this plan's depends_on references
provides:
  - "All 16 admin/fansubs/[id]/edit files now use the canonical Proxy-based style merge (new Proxy({}, { get: ... })) instead of the fragile { ...sharedStyles, ...ownStyles } object-spread, matching components/ui/Select.tsx's established pattern"
  - "A regression test proving the Proxy merge resolves a class living only in a non-base style module (fansubEditAnimeToggle), where the old spread silently returned undefined under Vitest/jsdom's CSS-module Proxy mock"
  - "AnimeProjectNotesSection.test.tsx's previously suite-load-flaky assertion is now deterministic in both isolated and full-suite runs"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Proxy-merge for combined shared+own CSS Modules: new Proxy({} as Record<string, string>, { get: (_t, p) => own[p] ?? shared[p] }) preserving each file's original spread-order precedence (last-spread-wins becomes first-checked-in-get)"
    - "3-way precedence files (editorScaffoldStyles > fansubEditStyles > sharedStyles) chain the ?? fallback in that exact order to match the original { ...sharedStyles, ...fansubEditStyles, ...editorScaffoldStyles } spread semantics"
    - "Deflaking a suite-load-sensitive assertion by moving it to after the test's final await waitFor(...) instead of removing it, preserving original test intent while removing timing dependence"

key-files:
  created: []
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNoteForm.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersOverview.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberAddModal.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubOpEdSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberEditorPanel.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubEditClient.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMemberFormModals.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMemberRequestsTable.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/NotesTab.helpers.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/NotesTab.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeAssetsSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.test.tsx

key-decisions:
  - "Re-ran grep at execution time (as instructed) rather than trusting the plan's cached file/variable list verbatim; confirmed exactly 16 files and found 3 distinct precedence shapes (12 files: sharedStyles/fansubEditStyles 2-way; 2 files: sharedStyles/opEdStyles 2-way; 3 files: sharedStyles/fansubEditStyles/editorScaffoldStyles 3-way) rather than one uniform shape, and preserved each file's own last-spread-wins override order exactly in the corresponding Proxy get-trap fallback chain."
  - "Placed the 'merged-only class' regression test (acceptance criterion for Task 1) inside AnimeProjectNotesSection.test.tsx rather than creating a new test file, since that component already uses the 3-way merge and already has styles.fansubEditAnimeToggle rendered from the merged (non-ownStyles) Proxy -- no artificial test fixture needed."
  - "For the D-11 deflake, read AnimeProjectNotesSection.tsx first and confirmed getAdminFansubAnime is only ever called from the AnimeProjectNotesSectionRemote variant, which is structurally unreachable when an animes prop is supplied (the exact condition under test) -- so moving the assertion to the end of the test's lifecycle does not weaken its correctness, it only removes the suite-load timing dependency."
  - "Verified during development (not left in the final commit) that the restructured assertion still catches a real regression: temporarily added an unconditional getAdminFansubAnime call to AnimeProjectNotesSectionBody, confirmed the test failed with the expected assertion error, then reverted the component to its exact post-Task-1 state (verified via git diff showing zero changes) before committing Task 2."
  - "npm run build's pre-existing /_not-found Turbopack prerender failure (TypeError: Cannot read properties of null (reading 'useEffect')) was confirmed via scripts/phase134-green-gate.sh's own documented BUILD_KNOWN_DEFERRED citation as a framework-level, pre-existing, non-blocking issue predating this plan -- not a regression from this plan's changes. tsc --noEmit and the full vitest suite (both run inside the team4sv30-frontend container, since no frontend/node_modules exists on the host) are the authoritative gates here and both passed clean."

requirements-completed: []

# Metrics
duration: ~20min
completed: 2026-10-08
---

# Phase 176 Plan 14: Proxy-Merge-Reparatur + Flaky-Test-Fix im Fansub-Editor Summary

**Alle 16 `admin/fansubs/[id]/edit`-Dateien nutzen jetzt den robusten Proxy-Style-Merge statt des fehleranfälligen Objekt-Spreads (D-12), und die zuvor last-abhängig flackernde `AnimeProjectNotesSection`-Testassertion ist jetzt deterministisch (D-11).**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-10-08
- **Tasks:** 2 (Proxy-Merge-Konvertierung aller 16 Dateien inkl. Beweistest; Deflaking der suite-load-sensitiven Assertion)
- **Files modified:** 17 (16 `.tsx`-Komponentendateien + 1 Testdatei, die von beiden Tasks betroffen ist)

## Accomplishments

- Alle 16 Dateien im Verzeichnis `admin/fansubs/[id]/edit` wurden per re-ausgeführtem Grep (nicht aus dem Plan-Cache übernommen) exakt identifiziert und in drei unterschiedliche Präzedenzformen eingeteilt: 12 Dateien mit 2-Wege-Merge (`sharedStyles`/`fansubEditStyles`), 2 Dateien mit 2-Wege-Merge (`sharedStyles`/`opEdStyles`), 3 Dateien mit 3-Wege-Merge (`sharedStyles`/`fansubEditStyles`/`editorScaffoldStyles`) — jede Datei erhielt den `new Proxy({}, { get: ... })`-Merge mit exakt derselben Override-Reihenfolge wie ihr ursprünglicher Spread.
- Ein neuer Regressionstest in `AnimeProjectNotesSection.test.tsx` beweist, dass der Proxy-Merge eine Klasse (`fansubEditAnimeToggle`), die ausschließlich in `FansubEdit.module.css` existiert (nicht in `admin.module.css` oder `EditorScaffold.module.css`), unter Vitest/jsdom korrekt auflöst — wo der alte Objekt-Spread laut 174-23-SUMMARY.md lautlos `undefined` geliefert hätte.
- Die zuvor nur im vollen Vitest-Lauf flackernde Assertion (`getAdminFansubAnimeMock` darf nicht aufgerufen werden) wurde vom Zeitpunkt direkt nach `render()` an das Ende der Testlebensdauer (nach dem bestehenden Speicher-`await waitFor(...)`) verschoben — ohne die geprüfte Verhaltensabsicht zu verändern.
- Verifiziert, dass die verschobene Assertion weiterhin echte Regressionen erkennt (temporärer unbedingter Aufruf von `getAdminFansubAnime` in der Komponente während der Entwicklung eingebaut, Testfehlschlag bestätigt, Komponente danach exakt auf den Task-1-Stand zurückgesetzt — per `git diff` verifiziert als Null-Änderung).

## Task Commits

1. **Task 1: Convert all 16 files' style-merge to the Proxy pattern (D-12)** - `41031c52` (refactor)
2. **Task 2: Deflake AnimeProjectNotesSection.test.tsx (D-11)** - `d6e99290` (test)

**Plan metadata:** folgt (docs: complete plan)

## Files Created/Modified

### Geändert (16 Komponentendateien, Style-Merge auf Proxy umgestellt)
`AnimeProjectNoteForm.tsx` · `AnimeProjectNotesSection.tsx` · `FansubAppMembersOverview.tsx` · `FansubAppMembersSection.tsx` · `FansubAppMemberAddModal.tsx` · `FansubOpEdSection.tsx` · `FansubAppMemberEditorPanel.tsx` · `FansubEditClient.tsx` · `GroupHistRoleDialog.tsx` · `GroupMemberFormModals.tsx` · `GroupMemberRequestsTable.tsx` · `GroupMembersTab.tsx` · `GroupMembersHistTable.tsx` · `NotesTab.helpers.tsx` · `NotesTab.tsx` · `ReleaseThemeAssetsSection.tsx`

### Geändert (1 Testdatei, von beiden Tasks berührt)
- `AnimeProjectNotesSection.test.tsx` — Task 1: neuer Beweistest für die Proxy-Merge-Korrektheit; Task 2: verschobene Assertion für Determinismus.

## Decisions Made

Siehe `key-decisions` im Frontmatter für die vollständige, einzeln begründete Liste. Zusammengefasst:

- Grep wurde zur Ausführungszeit erneut gelaufen (wie im Plan vorgeschrieben) statt die geplante Dateiliste blind zu übernehmen — ergab 3 unterschiedliche Präzedenzformen statt einer einheitlichen.
- Der Proxy-Merge-Beweistest wurde in der bereits vorhandenen `AnimeProjectNotesSection.test.tsx` platziert statt in einer neuen Datei, da diese Komponente den 3-Wege-Merge bereits nutzt.
- Die Lesung der Komponente vor dem Deflaking bestätigte, dass `getAdminFansubAnime` bei gesetztem `animes`-Prop strukturell unerreichbar ist — das Verschieben der Assertion ans Testende schwächt die Prüfung nicht.
- Der bekannte `/_not-found`-Build-Fehler wurde gegen `scripts/phase134-green-gate.sh`s eigene dokumentierte Pre-Existing-Liste verifiziert, nicht als neue Regression behandelt.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `npm run build`/`npx vitest` auf dem Host nicht ausführbar (fehlendes `frontend/node_modules`)**
- **Found during:** Task 1 Verifikation
- **Issue:** Der Host hat kein installiertes `frontend/node_modules`; `npx vitest`/`npx tsc` auf dem Host versuchten, Pakete frisch über npx herunterzuladen und scheiterten am Auflösen von `vitest/config`.
- **Fix:** Alle Verifikationsbefehle (`vitest run`, `tsc --noEmit`, `npm run build`) wurden stattdessen im laufenden `team4sv30-frontend`-Docker-Container ausgeführt (`docker compose exec team4sv30-frontend sh -c "cd /app && ..."`), wo `node_modules` bereits vollständig installiert ist — konsistent mit `CLAUDE.md`s Vorgabe, alle Builds/Tests auf dem Linux-Host via Docker Compose laufen zu lassen.
- **Files modified:** keine (reine Verifikationsmethodik)
- **Verification:** Alle nachfolgenden `vitest run`/`tsc --noEmit`-Läufe liefen erfolgreich im Container.

**2. [Rule 1 - Bug, scope cleanup] `frontend/next-env.d.ts` wurde durch den Build-Lauf im Container auf den Produktions-Typpfad umgeschrieben**
- **Found during:** Task 1 Verifikation (nach `npm run build`)
- **Issue:** Next.js' automatisch generierte `next-env.d.ts` wechselte von `./.next/dev/types/routes.d.ts` auf `./.next/types/routes.d.ts` als Nebeneffekt des Produktions-Builds — eine autogenerierte, plan-fremde Änderung ohne Bezug zu D-12/D-11.
- **Fix:** Datei per `git checkout --` auf den ursprünglichen Stand zurückgesetzt, bevor Task 1 committet wurde.
- **Files modified:** `frontend/next-env.d.ts` (reverted, nicht committet)
- **Verification:** `git status --short frontend/next-env.d.ts` zeigt keine Änderung mehr vor dem Commit.

**Total deviations:** 2 (beide reine Verifikations-/Tooling-Anpassungen ohne Code- oder Verhaltensänderung)
**Impact on plan:** Keiner — beide Abweichungen betreffen ausschließlich die Verifikationsmethodik, nicht den gelieferten Code.

## Known Stubs

None.

## Threat Flags

None — threat_model's einzige `mitigate`-Disposition (T-176-14-01, CSS-Merge-Präzedenz) wurde pro Datei individuell verifiziert, nicht pauschal angenommen; keine neue Netzwerk-/Auth-/Schema-Oberfläche eingeführt.

## Issues Encountered

Siehe Deviations oben. Kein ungelöstes Problem innerhalb des Scopes dieses Plans.

## User Setup Required

None — keine externe Service-Konfiguration erforderlich.

## Next Phase Readiness

- D-12 und D-11 (aus `176-CONTEXT.md` F-12/F-24) sind vollständig geschlossen; keine bekannte Nachfolgearbeit innerhalb dieses Plans.
- Volle Vitest-Suite (364/365 Testdateien, 1 vorbestehender Skip, 3250/3253 Tests, 3 vorbestehende `todo`) lief zweimal hintereinander grün — keine neuen Fehlschläge, kein verbleibendes Flackern beobachtet.
- `tsc --noEmit` liefert keine neuen Fehler (0 Ausgabe).
- `npm run build`s vorbestehender `/_not-found`-Turbopack-Fehler bleibt unverändert und ist in `scripts/phase134-green-gate.sh` als bekannt/nicht-blockierend dokumentiert.

---
*Phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-*
*Completed: 2026-10-08*

## Self-Check: PASSED

- All 16 modified component files + 1 test file + this SUMMARY.md verified present on disk.
- Both task commits (`41031c52`, `d6e99290`) found in `git log --oneline --all`.
