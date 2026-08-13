---
phase: 105-responsive-release-detailseite-und-kara-timeline-redesign
plan: "01"
subsystem: testing
tags: [vitest, react-testing-library, release-detail, kara, responsive-ui, auth-session]

requires:
  - phase: 103-ffentliche-release-detailseite-als-fansub-story-mit-rechte-g
    provides: Release-Version-Detailseite, Segment-Relay und gruppentreue Navigation
  - phase: 102-fansubprojekte-ui-schrittweise-verbessern
    provides: Öffentliche Fansub-Projekt-Sprache und responsive UI-Seams
provides:
  - Ausführbarer DOM-Kompositionsvertrag für die sieben Release-Abschnitte
  - Auth-, Geometrie-, Auswahl-, Relay- und Cleanup-Verträge für Kara-Segmente
  - Responsive Content-Verträge für Hero, Gallery, Teamtexte, Beteiligte, Vollfolge und Navigation
affects: [105-02, 105-03, 105-04, 105-05, release-detail, theme-timeline]

tech-stack:
  added: []
  patterns: [intentional-red-wave-zero, token-free-session-matrix, stable-id-ui-state-tests]

key-files:
  created:
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData.composition.test.tsx
  modified:
    - frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/releases/[releaseVersionId]/page.test.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.test.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.test.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.test.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.test.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ContributorsRow.test.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseEpisodePlayer.test.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNavigation.test.tsx

key-decisions:
  - "Wave 0 bleibt test-only: Neue Phase-105-Verträge sind bis zu den Plänen 02 bis 04 gezielt RED, während Harness, Typecheck und Lint grün bleiben."
  - "Eine aktive Browser-Session wird in den Playback-Verträgen ausschließlich als hasAccessToken || hasRefreshToken modelliert; Gäste erhalten weder CTA noch Autoplay."

patterns-established:
  - "Kompositionsvertrag: Sichtbare Release-Abschnitte werden über compareDocumentPosition in echter DOM-Reihenfolge geprüft."
  - "Kara-Sicherheitsvertrag: Öffentliche Informationen bleiben gastlesbar, Playback und Cleanup werden getrennt über Session- und Streamzustand geprüft."

requirements-completed:
  - D-01
  - D-02
  - D-03
  - D-05
  - D-07
  - D-09
  - D-14
  - D-15
  - D-16
  - D-17
  - D-18
  - D-21
  - D-22
  - D-23
  - D-24
  - D-26
  - D-28
  - P103-D-01
  - P103-D-06
  - P103-D-15
  - P103-D-16
  - P103-D-17
  - P103-D-18
  - P103-D-19
  - P103-D-20
  - P103-D-21
  - P103-D-22
  - P103-D-33
  - P103-D-34
  - P103-D-35
  - P103-D-36
  - P102-D-03
  - P102-D-04
  - P102-D-07

duration: 11min
completed: 2026-07-19
---

# Phase 105 Plan 01: Wave-0-Regressionsverträge Summary

**Ausführbare Wave-0-Regressionsverträge für Release-Komposition, session-sichere Kara-Wiedergabe und alle responsiven Content-Seams der Release-Detailseite.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-07-19T12:19:41Z
- **Completed:** 2026-07-19T12:30:42Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Die Pretty-Route leitet `kara=7` und `autoplay=1` unverändert an denselben kanonischen Release-Composer weiter; der neue SSR-Test fixiert die vollständige Abschnittsreihenfolge und Leerauslassung.
- Die Kara-Suite unterscheidet Gast, Access-Session, Refresh-only und unavailable, prüft exakte Geometrie, getrennte Hit-Zone, Ticks, Auswahl, Live-Region, Deep-Link, Relay-URL, Fehler/Retry und Stream-Cleanup.
- Hero, gemeinsames Bilderraster, Rollen-/Expansionstexte, release-spezifische Contributor-Aggregation, Vollfolgen-Gating und gruppentreue Inline-Navigation besitzen fokussierte Verträge.

## Task Commits

Each task was committed atomically:

1. **Task 1: Kompositions- und Pretty-Route-Verträge** - `5869cdb5` (test)
2. **Task 2: Kara-Session-, Geometrie-, Auswahl- und Cleanup-Verträge** - `27f7f0a2` (test)
3. **Rule-3-Fix: Wave-0-Fixtures typsicher halten** - `88aa6fac` (fix)
4. **Task 3: Hero-, Content-, Beteiligten-, Vollfolgen- und Navigationsverträge** - `8ec7eac7` (test)

## Files Created/Modified

- `releaseDetailPageData.composition.test.tsx` - Prüft sieben Abschnitte in echter DOM-Reihenfolge sowie vollständige Leerauslassung.
- `page.test.tsx` - Fixiert Kara-Deep-Link-Forwarding der Pretty-Route.
- `ThemeTimeline.test.tsx` - Deckt Sessionmatrix, Timeline-Geometrie, Auswahl, Relay und Cleanup ab.
- `ReleaseDetailHero.test.tsx` - Trennt sichtbare Primärfakten, technische Details und Top-Level-Beteiligte.
- `ReleaseGallery.test.tsx` - Erzwingt ein gemeinsames Release-Bilderraster bei mehreren Gruppen.
- `ReleaseNotesList.test.tsx` - Erzwingt Rollenbuckets, stabile per-ID-Expansion, Cursor-Merge und lokalen Fehlerzustand.
- `ContributorsRow.test.tsx` - Erzwingt Personen-/Gruppenaggregation und eindeutige Rollen.
- `ReleaseEpisodePlayer.test.tsx` - Erzwingt vollständige Unsichtbarkeit ohne aktives Recht und Heading plus Aktion im Erfolgsfall.
- `ReleaseNavigation.test.tsx` - Prüft beide/eine/keine Kante, Pretty-/technische Hrefs und explizite Inline-Komposition.

## Verification

- Task 1 Vitest: erwartetes RED — 1 neuer Kompositionsbefund, 4 Tests grün; Pretty-Route vollständig grün.
- Task 2 Vitest: erwartetes RED — 11 benannte Phase-105-Lücken, 2 bestehende Stream-/Wechselverträge grün.
- Task 3 Vitest: erwartetes RED — 8 benannte Phase-105-Lücken, 21 Baselines grün.
- `npm run typecheck`: PASS.
- Gezielter ESLint-Lauf über alle neun Testdateien: PASS.
- `git diff --check`: PASS für alle Plan-Dateien.

Die RED-Befunde sind der beabsichtigte Output dieses Wave-0-Plans. Es traten keine Import-, Syntax-, Mock- oder Environmentfehler auf.

## Decisions Made

- Der Testvertrag modelliert Auswahl und Playback getrennt: Ein Deep-Link darf hervorheben, ohne Gast-Autoplay auszulösen.
- Streamtests bleiben servergebunden und erwarten ausschließlich `theme_segment_id` plus reale `release_version_id`; freie Bounds, Grants oder Tokenlogik wurden nicht eingeführt.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Neue Test-Fixtures und Matcher typsicher gemacht**
- **Found during:** Abschluss-Typecheck nach Task 3
- **Issue:** Contributor-Fixtures fehlte `avatar_url`; DOM-Matcher-Erweiterungen waren im TypeScript-Setup nicht deklariert; der Pretty-Route-Mock inferierte `initialKaraSegmentID` zu eng als `null`.
- **Fix:** Fixtures gegen `PublicReleaseSegment` typisiert, DOM-Eigenschaften direkt geprüft und den Mock-Rückgabetyp explizit als `number | null` angegeben.
- **Files modified:** `ThemeTimeline.test.tsx`, Pretty-Route `page.test.tsx`
- **Verification:** `npm run typecheck` ist grün.
- **Committed in:** `88aa6fac`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Keine Verhaltens- oder Scope-Erweiterung; ausschließlich der ausführbare Testvertrag wurde typsicher gehalten.

## Issues Encountered

- React meldet im absichtlich roten Contributor-Dedupe-Test den bestehenden doppelten Key `1-Karaoke`. Der Befund gehört zur geplanten Aggregationslücke und wird in Plan 02 geschlossen.

## Known Stubs

None. Leere und `null`-Werte in den geänderten Dateien sind ausschließlich gezielte Test-Fixtures für optionale Public-Daten und Leerauslassung.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 kann Composer, Hero, Contributors, Vollfolge und Navigation direkt gegen die neuen RED-Verträge implementieren.
- Plan 03 kann die Kara-Darstellung und Session-/Cleanup-Logik schließen; Plan 04 kann Gallery und Notes unabhängig umstellen.
- Keine API-, DB-, Media-Ownership- oder Auth-Vertragsänderung wurde eingeführt.

## Self-Check: PASSED

- Alle neun Plan-Testdateien und diese Summary sind vorhanden.
- Alle vier aufgeführten Ausführungscommits sind im Repository vorhanden.
- Die dokumentierten Verifikationsresultate wurden nach dem letzten Test-Edit erneut bestätigt.

---
*Phase: 105-responsive-release-detailseite-und-kara-timeline-redesign*
*Completed: 2026-07-19*
