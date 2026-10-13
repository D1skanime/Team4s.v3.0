---
phase: 181-release-bearbeitung-zusammenf-hren-f-13-eine-rechtebasierte-
plan: 03
subsystem: ui
tags: [typescript, nextjs, vitest, release-editor, relocation, pitfall-4]

# Dependency graph
requires:
  - phase: 181-02
    provides: "Framework-free Release-Editor-Hilfsmodule (releaseEditorRedirects/Routing/Tabs) that later plans will import alongside this plan's relocated components -- no direct file overlap, just a shared target folder"
provides:
  - "frontend/src/components/releaseEditor/ -- stable, routing-independent home for the Media/Metadata/Classification/JellyfinNotice/episodeVersionEditorUtils family, importable before the old admin route folder is deleted (Plan 09) and before the new /releases/[versionId]/edit page (Plans 05-07) needs them"
  - "ReleaseVersionMetadataFields.module.css and EpisodeClassificationSection.module.css -- self-contained CSS modules extracted from the (soon-to-be-deleted) admin page's EpisodeVersionEditor.module.css"
affects: [181-05, 181-06, 181-07, 181-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure git-mv relocation of a 'hidden component library' out of a route folder into a neutral components/ location, preserving all relative imports within the family untouched since the whole group moves together in one shot"

key-files:
  created:
    - frontend/src/components/releaseEditor/ReleaseVersionMediaSection.tsx
    - frontend/src/components/releaseEditor/ReleaseVersionMediaSection.helpers.tsx
    - frontend/src/components/releaseEditor/ReleaseVersionMediaSection.helpers.test.ts
    - frontend/src/components/releaseEditor/ReleaseVersionMediaSection.module.css
    - frontend/src/components/releaseEditor/ReleaseVersionMediaSection.test.tsx
    - frontend/src/components/releaseEditor/ReleaseVersionMediaGrid.tsx
    - frontend/src/components/releaseEditor/ReleaseVersionMediaEditDrawer.tsx
    - frontend/src/components/releaseEditor/ReleaseVersionMediaUploadDrawer.tsx
    - frontend/src/components/releaseEditor/ReleaseVersionMediaUploadDrawer.test.tsx
    - frontend/src/components/releaseEditor/ReleaseVersionMediaReplaceControls.tsx
    - frontend/src/components/releaseEditor/useReleaseVersionMedia.ts
    - frontend/src/components/releaseEditor/useReleaseVersionMedia.test.ts
    - frontend/src/components/releaseEditor/ReleaseVersionMetadataFields.tsx
    - frontend/src/components/releaseEditor/ReleaseVersionMetadataFields.module.css
    - frontend/src/components/releaseEditor/EpisodeClassificationSection.tsx
    - frontend/src/components/releaseEditor/EpisodeClassificationSection.module.css
    - frontend/src/components/releaseEditor/JellyfinEnrichmentNotice.tsx
    - frontend/src/components/releaseEditor/JellyfinEnrichmentNotice.module.css
    - frontend/src/components/releaseEditor/episodeVersionEditorUtils.ts
    - frontend/src/components/releaseEditor/episodeVersionEditorUtils.test.ts
  modified:
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx"
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts"
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx"
    - "frontend/src/app/me/releases/[versionId]/workspace/page.tsx"
    - "frontend/src/app/me/releases/[versionId]/workspace/page.test.tsx"
    - "frontend/src/app/admin/fansubs/[id]/edit/ReleaseMediaDrawer.tsx"
    - "frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaDrawerSummary.tsx"
    - "frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx"
    - "frontend/src/components/episodes/EpisodeClassificationFields/EpisodeClassificationFields.test.tsx"

key-decisions:
  - "ReleaseVersionMediaEditDrawer.tsx's relative cross-folder import of RELEASE_REVIEW_REJECTION_CATEGORY_LABELS ('../../../fansubs/releaseReviewPresentation') was switched to the absolute '@/app/admin/fansubs/releaseReviewPresentation' path -- the plan's interfaces block assumed the family only imports each other plus '@/...' absolute imports, but this one file had an undocumented relative escape outside the family that would have broken silently after the move"
  - "2 additional test files not listed in the plan's files_modified (app/admin/episode-versions/[versionId]/edit/page.test.tsx and app/me/releases/[versionId]/workspace/page.test.tsx) referenced the moved family via relative import / vi.mock path string and were fixed in the same wave -- otherwise their mocks would have silently stopped matching the real import path, making the tests exercise the real (un-mocked) module instead of the intended fake"
  - "2 lint/compiler findings surfaced inside relocated files (native <input> in ReleaseVersionMediaEditDrawer.tsx, React Compiler memoization skip in useReleaseVersionMedia.ts) were confirmed byte-identical to their pre-move content via diff and left untouched -- pre-existing debt unrelated to the relocation, logged to deferred-items.md per the deviation rules' scope boundary"

patterns-established:
  - "When relocating a 'hidden component library' out of a route folder, explicitly grep for ALL cross-references (not just the exact import lines a plan's research enumerated) before declaring done -- test files that reference a moved module purely via a vi.mock() path string are invisible to naive import-statement greps but break silently (mock becomes a no-op) once the real import path changes"

requirements-completed: [D-01]

# Metrics
duration: ~12min
completed: 2026-10-13
---

# Phase 181 Plan 03: Release-Editor-Dateifamilie verschieben (Media/Metadata/Classification/JellyfinNotice/Utils) Summary

**20 Dateien der Media/Metadata/Classification/JellyfinNotice/episodeVersionEditorUtils-Familie wortgetreu von der (bald gelöschten) Admin-Routen-Mappe nach `frontend/src/components/releaseEditor/` verschoben, inklusive 2 selbstständiger CSS-Module und Korrektur von 3 nicht im Plan dokumentierten Import-Referenzen.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-10-13T15:50:00Z (geschätzt)
- **Completed:** 2026-10-13T16:02:27Z
- **Tasks:** 3/3
- **Files modified:** 29 (20 verschoben/neu, 9 Importer aktualisiert)

## Accomplishments
- Media-Familie (12 Dateien: `ReleaseVersionMediaSection` + Helpers/Tests/CSS, `ReleaseVersionMediaGrid`, `ReleaseVersionMediaEditDrawer`, `ReleaseVersionMediaUploadDrawer` + Test, `ReleaseVersionMediaReplaceControls`, `useReleaseVersionMedia` + Test) liegt jetzt unter `frontend/src/components/releaseEditor/`; beide alten Seiten (Admin-Editor, Workspace) sowie die 2 externen Fansub-Edit-Drawer-Dateien und 1 externe Testdatei importieren vom neuen Pfad.
- Metadata/Classification/JellyfinNotice/episodeVersionEditorUtils (8 Dateien) folgen im selben Verzeichnis; `ReleaseVersionMetadataFields.tsx` und `EpisodeClassificationSection.tsx` bekommen je ein eigenes, selbstständiges CSS-Modul statt weiter in `EpisodeVersionEditor.module.css` der Admin-Seite zu greifen (die Originaldatei bleibt unverändert, da sie noch von der Admin-Seite selbst genutzt wird, bis Plan 09 sie löscht).
- 3 zusätzliche Import-Referenzen, die im Plan-Interfaces-Block NICHT aufgeführt waren, wurden während der Regression gefunden und korrigiert (siehe Deviations): eine relative Cross-Folder-Import in `ReleaseVersionMediaEditDrawer.tsx` sowie 2 Testdateien mit `vi.mock()`-Pfad-Strings auf die alte Adresse.
- Vollständige Regression grün: `npm run typecheck` 0 Fehler, 56 Testdateien/632 Tests grün, `npm run lint` 0 neue Befunde in berührten Dateien (2 vorbestehende Befunde in verschobenen Dateien bytegleich gegen den Vor-Verschiebung-Stand verifiziert und in `deferred-items.md` protokolliert statt automatisch gefixt).

## Task Commits

1. **Task 1: Media-Familie verschieben + Importer aktualisieren** - `3b293b17`
2. **Task 2: Metadata/Classification/JellyfinNotice/episodeVersionEditorUtils verschieben + CSS extrahieren** - `24aa2c9b`
3. **Task 3: Vollregression + Deferred-Items-Protokoll** - `7a0375f7`

**Plan metadata:** (this commit)

## Files Created/Modified
- `frontend/src/components/releaseEditor/` (neu, 20 Dateien) — komplette relozierte Familie, siehe `key-files.created` oben
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx` — 4 Import-Zeilen auf `@/components/releaseEditor/...` umgestellt
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts` — `episodeVersionEditorUtils`-Multi-Import auf neuen Pfad
- `frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx` — Typ-Import + `vi.mock()`-Pfad für `useReleaseVersionMedia` korrigiert (nicht im Plan gelistet, Deviation)
- `frontend/src/app/me/releases/[versionId]/workspace/page.tsx` — 3 Import-Zeilen (`ReleaseVersionMediaSection`, `ReleaseVersionMetadataFields`, `episodeVersionEditorUtils`) auf neuen Pfad
- `frontend/src/app/me/releases/[versionId]/workspace/page.test.tsx` — `vi.mock()`-Pfad für `ReleaseVersionMediaSection` korrigiert (nicht im Plan gelistet, Deviation)
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseMediaDrawer.tsx` — Import `ReleaseVersionMediaSection` auf neuen Pfad
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaDrawerSummary.tsx` — Import `useReleaseVersionMedia` auf neuen Pfad
- `frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx` — Typ-Import + `vi.mock()`-Pfad für `useReleaseVersionMedia` auf neuen Pfad
- `frontend/src/components/episodes/EpisodeClassificationFields/EpisodeClassificationFields.test.tsx` — Import `EpisodeClassificationSection` auf neuen Pfad
- `.planning/phases/181-.../deferred-items.md` (neu) — 2 vorbestehende Lint/Compiler-Befunde protokolliert

## Decisions Made
- `ReleaseVersionMediaEditDrawer.tsx`s relativer Cross-Folder-Import (`'../../../fansubs/releaseReviewPresentation'`) wurde auf den absoluten Pfad `@/app/admin/fansubs/releaseReviewPresentation` umgestellt — der Plan ging davon aus, die Familie importiere nur sich gegenseitig plus `@/...`-Absolutimporte, diese eine Datei hatte jedoch einen undokumentierten relativen Ausbruch aus der Familie, der nach dem Verschieben sonst still gebrochen wäre.
- 2 zusätzliche Testdateien außerhalb der Plan-`files_modified`-Liste (`page.test.tsx` im Admin-Editor-Ordner, `workspace/page.test.tsx`) referenzierten die verschobene Familie über relativen Import bzw. `vi.mock()`-Pfad-String und wurden in derselben Welle korrigiert — sonst hätten ihre Mocks den echten Importpfad nicht mehr getroffen und die Tests hätten ab sofort das echte (ungemockte) Modul statt der vorgesehenen Fake-Implementierung ausgeführt.
- 2 Lint-/Compiler-Befunde in verschobenen Dateien (natives `<input>` in `ReleaseVersionMediaEditDrawer.tsx`, React-Compiler-Memoization-Hinweis in `useReleaseVersionMedia.ts`) wurden per Diff gegen den Vor-Verschiebung-Stand als bytegleich bestätigt und bewusst nicht angefasst — vorbestehende Altlast außerhalb des Scopes dieser reinen Verschiebung, protokolliert in `deferred-items.md`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Relative Cross-Folder-Import in ReleaseVersionMediaEditDrawer.tsx**
- **Found during:** Task 1 (read_first-Phase, vor dem `git mv`)
- **Issue:** Die Datei importierte `RELEASE_REVIEW_REJECTION_CATEGORY_LABELS` relativ über `'../../../fansubs/releaseReviewPresentation'` — ein Pfad, der nur von der alten Admin-Ordner-Tiefe aus funktioniert und nach dem Verschieben nach `components/releaseEditor/` ins Leere gezeigt hätte. Der Plan-Interfaces-Block ging von "nur Familie + `@/...`" aus und listete diesen Fall nicht.
- **Fix:** Import auf absoluten Pfad `@/app/admin/fansubs/releaseReviewPresentation` umgestellt.
- **Files modified:** `frontend/src/components/releaseEditor/ReleaseVersionMediaEditDrawer.tsx`
- **Commit:** `3b293b17`

**2. [Rule 1 - Bug] 2 Testdateien mit toten vi.mock()-Pfaden nach dem Verschieben**
- **Found during:** Task 2 (typecheck-Lauf nach dem zweiten `git mv`-Batch)
- **Issue:** `app/admin/episode-versions/[versionId]/edit/page.test.tsx` importierte `UseReleaseVersionMediaResult` relativ (`./useReleaseVersionMedia`, brach den Typecheck) und mockte denselben relativen Pfad; `app/me/releases/[versionId]/workspace/page.test.tsx` mockte `useReleaseVersionMedia`-Konsument `ReleaseVersionMediaSection` unter dem alten absoluten Pfad — beides nicht in der Plan-`files_modified`-Liste enthalten, beide hätten nach dem Verschieben entweder einen Compile-Fehler (Typecheck) oder einen stillschweigend wirkungslosen Mock (Test rennt gegen die echte Komponente statt den Fake) erzeugt.
- **Fix:** Beide Dateien auf die neuen `@/components/releaseEditor/...`-Pfade umgestellt (Import + `vi.mock()`-Argument).
- **Files modified:** `frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx`, `frontend/src/app/me/releases/[versionId]/workspace/page.test.tsx`
- **Commit:** `24aa2c9b`

## Issues Encountered

None, die den Fortschritt blockiert hätten — beide oben genannten Funde wurden inline behoben, bevor sie den Verify-Lauf beeinträchtigen konnten.

## User Setup Required

None.

## Next Phase Readiness
- `frontend/src/components/releaseEditor/` enthält jetzt die vollständige relozierte Familie plus die bereits in Plan 02 abgelegten Hilfsmodule im benachbarten `app/releases/[versionId]/edit/`-Verzeichnis — beide zusammen bilden die Bausteine für die Orchestrator-Seiten-Pläne (05-07).
- Die Original-`EpisodeVersionEditor.module.css` bleibt unverändert und wird erst in Plan 09 zusammen mit dem gesamten alten Admin-Routen-Ordner gelöscht.
- `deferred-items.md` dokumentiert 2 vorbestehende, nicht plan-verursachte Lint-/Compiler-Befunde für spätere Aufräumarbeiten außerhalb dieser Phase.
- Keine Blocker für nachfolgende Pläne dieser Phase.

---
*Phase: 181-release-bearbeitung-zusammenf-hren-f-13-eine-rechtebasierte-*
*Completed: 2026-10-13*
