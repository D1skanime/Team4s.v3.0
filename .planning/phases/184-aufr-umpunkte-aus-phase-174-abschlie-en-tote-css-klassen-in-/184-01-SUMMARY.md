---
phase: 184-aufr-umpunkte-aus-phase-174-abschlie-en-tote-css-klassen-in-
plan: 01
subsystem: api
tags: [go, media-upload, refactor, dedup]

# Dependency graph
requires:
  - phase: 176
    provides: "services.DisplayVariantFileName als konsolidierter Helfer für die original→display-Namensregel"
provides:
  - "Vier verbliebene Literal-Duplikate der display-Namensregel im Upload-Pfad durch services.DisplayVariantFileName(originalPath, ext) ersetzt"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Upload-Handler rufen den zentralen Namens-Helfer services.DisplayVariantFileName statt String-Literale zu bauen"

key-files:
  created: []
  modified:
    - backend/internal/handlers/admin_content_release_version_media_upload_process.go
    - backend/internal/handlers/media_upload_image.go

key-decisions:
  - "D-04 (F-23-Nachzieh) umgesetzt: alle 4 Literal-Stellen auf services.DisplayVariantFileName umgestellt, da der Upload-Pfad immer von einem frischen original.<ext> ausgeht und der Helfer denselben Literalwert liefert"
  - "generateStaticDisplayVariant um den Parameter originalPath erweitert, da die Methode zuvor keinen Zugriff auf den Original-Dateinamen hatte"
  - "Animations-Display-Varianten (display.webp in generateAnimatedDisplayVariant/generateAnimatedWebPDisplayVariant) absichtlich nicht angefasst — fester Dateiname, nicht der Trivialfall der Regel, nicht Teil von D-04"

patterns-established: []

requirements-completed: [D-04]

# Metrics
duration: ~10min
completed: 2026-10-15
---

# Phase 184 Plan 01: F-23-Nachzieh (D-04) Summary

**Vier Literal-Duplikate von `"display."+ext` im Release-Version-Media- und generischen Media-Upload-Pfad durch `services.DisplayVariantFileName(originalPath, ext)`-Aufrufe ersetzt — ohne Verhaltensänderung.**

## Performance

- **Duration:** ~10 min
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments
- `processOneRVMFile` in `admin_content_release_version_media_upload_process.go` ruft an beiden Stellen (`displayPath`, `displayRelPath`) den zentralen Helfer statt das Literal selbst zu bauen
- `processImage` in `media_upload_image.go` ruft den Helfer für `displayPath` direkt; `generateStaticDisplayVariant` erhält `originalPath` als neuen Parameter und ruft den Helfer intern für `displayFilename`
- Alle vier verbliebenen Literal-Duplikate der `original→display`-Regel aus dem Upload-Pfad sind damit beseitigt — die Regel existiert jetzt nur noch an einer Stelle (`services.DisplayVariantFileName`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Release-Version-Media-Upload-Pfad auf DisplayVariantFileName umstellen** - `34d2d97` (refactor)
2. **Task 2: Generischen Media-Upload-Pfad auf DisplayVariantFileName umstellen (inkl. Signaturerweiterung)** - `8e9d583` (refactor)

**Plan metadata:** siehe finaler docs-Commit dieses Plans

## Files Created/Modified
- `backend/internal/handlers/admin_content_release_version_media_upload_process.go` - Beide Trivialfall-Literale in `processOneRVMFile` (`displayPath`, `displayRelPath`) rufen jetzt `services.DisplayVariantFileName(originalPath, displayExt)`
- `backend/internal/handlers/media_upload_image.go` - `processImage` ruft den Helfer für `displayPath`; `generateStaticDisplayVariant` nimmt `originalPath` als neuen Parameter entgegen und ruft den Helfer für `displayFilename`

## Decisions Made
- Upload-Pfad geht immer von einem frischen `original.<ext>` aus → der Helfer liefert für diesen Fall exakt denselben Wert wie das vorherige Literal (`stem == "original"` → `"display."+ext"`), daher keine Verhaltensänderung, nur bestätigt durch die weiterhin grünen Tests.
- `generateAnimatedDisplayVariant`/`generateAnimatedWebPDisplayVariant` (fester Dateiname `display.webp` für Animationen) bewusst nicht angefasst — das ist nicht der Trivialfall der Regel und nicht Teil von D-04 (so im Plan explizit ausgeschlossen).
- Keine der beiden Dateien liegt über 450 Zeilen (296 bzw. 365 nach Änderung) — keine Datei-Aufteilung nach D-05 nötig.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. `TestUploadReleaseVersionMediaHandlerExists` wird wie gewohnt übersprungen, weil `TEAM4S_PHASE107_TEST_DSN` lokal nicht gesetzt ist (keine Postgres-Testdatenbank verfügbar) — kein neuer Ausfall, dasselbe Verhalten wie vor dieser Änderung.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- F-23 (inkl. Nachzieh-Fund D-04) ist jetzt vollständig geschlossen.
- Nächste Plan-Schritte der Phase 184 (F-07, F-12, F-20 gemäß CONTEXT.md D-01/D-02/D-03) sind unabhängig von dieser Änderung und können unverändert folgen.

---
*Phase: 184-aufr-umpunkte-aus-phase-174-abschlie-en-tote-css-klassen-in-*
*Completed: 2026-10-15*
