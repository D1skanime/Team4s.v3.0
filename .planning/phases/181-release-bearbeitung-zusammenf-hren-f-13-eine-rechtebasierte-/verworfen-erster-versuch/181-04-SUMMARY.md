---
phase: 181-release-bearbeitung-zusammenf-hren-f-13-eine-rechtebasierte-
plan: 04
subsystem: ui
tags: [typescript, nextjs, vitest, release-editor, relocation, pitfall-4]

# Dependency graph
requires:
  - phase: 181-03
    provides: "frontend/src/components/releaseEditor/ as the stable relocation target plus the established pure-git-mv pattern and the vi.mock()-path pitfall discovered during that plan's regression"
provides:
  - "frontend/src/components/releaseEditor/ now also hosts the complete Segmente family (SegmenteTab + 9 sub-components + 4 hooks + helpers, 23 files) and ReleaseVersionNotesTab -- all 6 shared content families (Media/Metadata/Classification/JellyfinNotice/Segmente/Notes) referenced by both old pages now live exclusively at this one neutral location"
  - "Both old pages (admin editor, member workspace) import SegmenteTab and ReleaseVersionNotesTab from @/components/releaseEditor/ instead of from each other's old relative/absolute route-folder path"
affects: [181-05, 181-06, 181-07, 181-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure git-mv relocation of an entire related-file family in one shot, preserving all internal relative imports untouched since the whole group moves together"
    - "Before declaring a relocation done, grep not just import statements but also vi.mock() path-string literals in ALL test files (including ones outside the plan's files_modified) referencing the moved module -- these break silently (mock becomes a no-op, real module runs instead) without any compile error"

key-files:
  created: []
  modified:
    - frontend/src/components/releaseEditor/SegmenteTab.tsx (relocated, unchanged)
    - frontend/src/components/releaseEditor/SegmenteTab.helpers.tsx (relocated, unchanged)
    - frontend/src/components/releaseEditor/SegmenteTab.formHelpers.ts (relocated, unchanged)
    - frontend/src/components/releaseEditor/SegmenteTab.module.css (relocated, unchanged)
    - frontend/src/components/releaseEditor/SegmenteTab.test.tsx (relocated, unchanged)
    - frontend/src/components/releaseEditor/SegmenteTab.assignment-conflicts.test.tsx (relocated, unchanged)
    - frontend/src/components/releaseEditor/SegmentAssetSection.tsx (relocated, unchanged)
    - frontend/src/components/releaseEditor/SegmentAssignmentsRow.tsx (relocated, unchanged)
    - frontend/src/components/releaseEditor/SegmentBasicFieldsSection.tsx (relocated, unchanged)
    - frontend/src/components/releaseEditor/SegmentContributorsField.tsx (relocated, unchanged)
    - frontend/src/components/releaseEditor/SegmentEditPanel.tsx (relocated, unchanged)
    - frontend/src/components/releaseEditor/SegmentOverrideField.tsx (relocated, unchanged)
    - frontend/src/components/releaseEditor/SegmentPlaybackPreviewSection.tsx (relocated, unchanged)
    - frontend/src/components/releaseEditor/SegmentPreviewImagePicker.tsx (relocated, unchanged)
    - frontend/src/components/releaseEditor/SegmentPreviewImageSection.tsx (relocated, unchanged)
    - frontend/src/components/releaseEditor/SegmentPreviewImageSection.module.css (relocated, unchanged)
    - frontend/src/components/releaseEditor/SegmentPreviewImageSection.test.tsx (relocated, unchanged)
    - frontend/src/components/releaseEditor/SegmentsListSection.tsx (relocated, unchanged)
    - frontend/src/components/releaseEditor/useReleaseSegments.ts (relocated, unchanged)
    - frontend/src/components/releaseEditor/useSegmentAssetHandlers.ts (relocated, unchanged)
    - frontend/src/components/releaseEditor/useSegmentContributors.ts (relocated, unchanged)
    - frontend/src/components/releaseEditor/useSegmentPreviewImageHandlers.ts (relocated, unchanged)
    - frontend/src/components/releaseEditor/useSegmentPreviewImageHandlers.test.ts (relocated, unchanged)
    - frontend/src/components/releaseEditor/ReleaseVersionNotesTab.tsx (relocated, 1 import-depth line fixed)
    - frontend/src/components/releaseEditor/ReleaseVersionNotesTab.module.css (relocated, unchanged)
    - frontend/src/components/releaseEditor/ReleaseVersionNotesTab.test.tsx (relocated, unchanged)
    - frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx (2 import lines updated)
    - frontend/src/app/me/releases/[versionId]/workspace/page.tsx (2 import lines updated)
    - frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx (2 vi.mock() path strings fixed, not in plan's files_modified)
    - frontend/src/app/me/releases/[versionId]/workspace/page.test.tsx (2 vi.mock() path strings fixed, not in plan's files_modified)

key-decisions:
  - "2 vi.mock() path strings in page.test.tsx (admin editor) and workspace/page.test.tsx -- neither listed in this plan's files_modified -- still referenced SegmenteTab/ReleaseVersionNotesTab at their old paths after the move and would have silently stopped matching, causing the tests to exercise the real (un-mocked) components instead of the intended fakes. Fixed in the same wave as the move, mirroring the exact class of issue 181-03 already found and documented."
  - "ReleaseVersionNotesTab.tsx's single relative import depth (EditorScaffold.module.css) was recalculated from '../../../../../components/editor/...' to '../editor/...' per the plan's pre-verified interfaces block; the rest of the 743-line file is untouched -- its pre-existing over-450-line size is explicitly out of this phase's scope per RESEARCH.md."
  - "A pre-existing ESLint finding (native <textarea> inside ReleaseVersionNotesTab.test.tsx's own RichTextEditor mock) surfaced during Task 3's full lint run; confirmed via git show (100% rename, 0 content diff) to be byte-identical to the pre-move file and logged to deferred-items.md rather than auto-fixed, consistent with the deviation rules' scope boundary and the same precedent 181-03 already set for 2 other pre-existing findings."

patterns-established: []

requirements-completed: [D-01]

# Metrics
duration: ~8min
completed: 2026-10-13
---

# Phase 181 Plan 04: Segmente-Familie und Notizen-Tab verschieben (Abschluss Pitfall-4-Relokation) Summary

**23 Dateien der Segmente-Familie (SegmenteTab + 9 Subkomponenten + 4 Hooks + Helpers) plus ReleaseVersionNotesTab wortgetreu nach `frontend/src/components/releaseEditor/` verschoben -- damit importieren beide alten Seiten alle 6 geteilten Inhalts-Familien ausschliesslich von dort, inklusive Korrektur von 2 nicht im Plan dokumentierten vi.mock()-Pfad-Strings.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-10-13T16:03:00Z (geschaetzt)
- **Completed:** 2026-10-13T16:11:00Z
- **Tasks:** 3/3
- **Files modified:** 30 (26 verschoben/angepasst, 4 Importer/Tests aktualisiert)

## Accomplishments
- Segmente-Familie (23 Dateien: `SegmenteTab.tsx` + Helpers/FormHelpers/CSS/2 Tests, 9 Subkomponenten, 4 Hooks inkl. je 1 Test) liegt jetzt vollstaendig unter `frontend/src/components/releaseEditor/`; alle internen `./X`-Relativimporte blieben unveraendert gueltig, da die gesamte Gruppe in einem Zug verschoben wurde.
- `ReleaseVersionNotesTab.tsx` (743 Zeilen, bewusst NICHT aufgeteilt laut RESEARCH.md) folgt ins selbe Verzeichnis; die einzige betroffene relative Import-Tiefe (`EditorScaffold.module.css`) wurde korrekt auf die neue Verzeichnistiefe angepasst, der Rest der Datei blieb bytegleich.
- Beide alten Seiten (`EpisodeVersionEditorPage.tsx`, `workspace/page.tsx`) importieren `SegmenteTab` und `ReleaseVersionNotesTab` jetzt ausschliesslich von `@/components/releaseEditor/...` -- zusammen mit Plan 03 importieren beide Seiten damit alle 6 geteilten Inhalts-Familien (Media/Metadata/Classification/JellyfinNotice/Segmente/Notizen) von genau diesem einen neutralen Ort.
- 2 zusaetzliche `vi.mock()`-Pfad-Strings in `page.test.tsx` (Admin) und `workspace/page.test.tsx` -- beide NICHT in der Plan-`files_modified`-Liste -- zeigten noch auf die alten Pfade und wurden waehrend der Vollregression gefunden und korrigiert (siehe Deviations), exakt dieselbe Fundklasse, die 181-03 bereits dokumentiert hatte.
- Vollstaendige Regression gruen: `npm run typecheck` 0 Fehler, 16 Testdateien/337 Tests gruen (`src/app/admin/episode-versions`, `src/app/me/releases`, `src/components/releaseEditor`), `npm run lint` 0 neue Befunde in von diesem Plan beruehrten Dateien (1 vorbestehender Befund bytegleich verifiziert und in `deferred-items.md` protokolliert statt automatisch gefixt).

## Task Commits

1. **Task 1: Segmente-Familie verschieben** - `70eb8483`
2. **Task 2: ReleaseVersionNotesTab verschieben + beide alten Seiten-Importe aktualisieren** - `b66bac17`
3. **Task 3: Vollregression + Deferred-Items-Protokoll** - `844fe594`

**Plan metadata:** (this commit)

## Files Created/Modified
- `frontend/src/components/releaseEditor/` (26 Dateien verschoben) -- komplette relozierte Segmente-Familie + `ReleaseVersionNotesTab`, siehe `key-files.modified` oben
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx` -- 2 Import-Zeilen (`SegmenteTab`, `ReleaseVersionNotesTab`) auf `@/components/releaseEditor/...` umgestellt
- `frontend/src/app/me/releases/[versionId]/workspace/page.tsx` -- 2 Import-Zeilen (`SegmenteTab`, `ReleaseVersionNotesTab`) auf `@/components/releaseEditor/...` umgestellt
- `frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx` -- 2 `vi.mock()`-Pfad-Strings korrigiert (nicht im Plan gelistet, Deviation)
- `frontend/src/app/me/releases/[versionId]/workspace/page.test.tsx` -- 2 `vi.mock()`-Pfad-Strings korrigiert (nicht im Plan gelistet, Deviation)
- `.planning/phases/181-.../deferred-items.md` -- 1 weiterer vorbestehender Lint-Befund protokolliert (181-04-Abschnitt ergaenzt)

## Decisions Made
- `ReleaseVersionNotesTab.tsx`s einzige relative Import-Tiefe (`EditorScaffold.module.css`) wurde von `'../../../../../components/editor/...'` auf `'../editor/...'` angepasst, exakt wie im Plan-Interfaces-Block vorab verifiziert -- der Rest der 743-Zeilen-Datei bleibt unveraendert, ihre Aufteilung ist laut RESEARCH.md explizit nicht Teil dieser Phase.
- 2 zusaetzliche Testdateien ausserhalb der Plan-`files_modified`-Liste (`page.test.tsx` im Admin-Editor-Ordner, `workspace/page.test.tsx`) referenzierten die verschobene Familie ueber `vi.mock()`-Pfad-Strings und wurden in derselben Welle korrigiert -- sonst haetten ihre Mocks den echten Importpfad nicht mehr getroffen und die Tests haetten ab sofort das echte (ungemockte) Modul statt der vorgesehenen Fake-Implementierung ausgefuehrt.
- 1 vorbestehender Lint-Befund (natives `<textarea>` in `ReleaseVersionNotesTab.test.tsx`s eigenem `RichTextEditor`-Testmock) wurde per `git show` (100%-Rename, 0 Inhalts-Diff) als bytegleich zum Vor-Verschiebung-Stand bestaetigt und bewusst nicht angefasst -- vorbestehende Altlast ausserhalb des Scopes dieser reinen Verschiebung, protokolliert in `deferred-items.md`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 2 Testdateien mit toten vi.mock()-Pfaden nach dem Verschieben**
- **Found during:** Task 3 (Vollregressions-Testlauf nach beiden `git mv`-Batches)
- **Issue:** `app/admin/episode-versions/[versionId]/edit/page.test.tsx` mockte `./ReleaseVersionNotesTab` und `./SegmenteTab` relativ zur alten Admin-Ordner-Tiefe; `app/me/releases/[versionId]/workspace/page.test.tsx` mockte beide Komponenten unter ihrem alten absoluten `@/app/admin/episode-versions/...`-Pfad. Beide Dateien waren nicht in der Plan-`files_modified`-Liste enthalten. Nach dem Verschieben haetten beide Mocks lautlos ins Leere gezeigt und die Tests gegen die echten (ungemockten) Komponenten statt der Fakes laufen lassen.
- **Fix:** Alle 4 `vi.mock()`-Aufrufe auf `@/components/releaseEditor/ReleaseVersionNotesTab` bzw. `@/components/releaseEditor/SegmenteTab` umgestellt.
- **Files modified:** `frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx`, `frontend/src/app/me/releases/[versionId]/workspace/page.test.tsx`
- **Verification:** Beide Testdateien liefen danach gruen (17 bzw. 20 Tests).
- **Committed in:** `b66bac17` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1, 2 betroffene Dateien)
**Impact on plan:** Notwendig, um stillschweigend wirkungslose Test-Mocks zu verhindern. Keine Scope-Ausweitung -- exakt dieselbe Fundklasse, die 181-03 bereits dokumentiert hat.

## Issues Encountered
None, die den Fortschritt blockiert haetten -- der oben genannte Fund wurde inline behoben, bevor er den Verify-Lauf beeintraechtigen konnte.

## User Setup Required
None.

## Next Phase Readiness
- `frontend/src/components/releaseEditor/` enthaelt jetzt alle 6 geteilten Inhalts-Familien (Media/Metadata/Classification/JellyfinNotice aus Plan 03, Segmente/Notizen aus diesem Plan) -- die vollstaendige Grundlage fuer die Orchestrator-Seiten-Plaene (05-07).
- Die alte Admin-Routen-Mappe `app/admin/episode-versions/[versionId]/edit/` enthaelt keine der verschobenen Dateien mehr unter ihrem alten Namen; sie wird erst in Plan 09 vollstaendig geloescht.
- `deferred-items.md` dokumentiert insgesamt 3 vorbestehende, nicht plan-verursachte Lint-/Compiler-Befunde ueber beide Pitfall-4-Plaene (03+04) fuer spaetere Aufraeumarbeiten ausserhalb dieser Phase.
- Keine Blocker fuer nachfolgende Plaene dieser Phase.

---
*Phase: 181-release-bearbeitung-zusammenf-hren-f-13-eine-rechtebasierte-*
*Completed: 2026-10-13*

## Self-Check: PASSED

Alle relozierten Dateien (`SegmenteTab.tsx`, `ReleaseVersionNotesTab.tsx`, `SegmentEditPanel.tsx`,
`useReleaseSegments.ts` stellvertretend geprueft) unter `frontend/src/components/releaseEditor/`
auf der Festplatte gefunden; die alten Pfade unter
`app/admin/episode-versions/[versionId]/edit/` bestaetigt nicht mehr vorhanden. Alle 3
Task-Commits (`70eb8483`, `b66bac17`, `844fe594`) im Git-Log gefunden.
