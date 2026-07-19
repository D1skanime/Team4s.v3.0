---
phase: 105-responsive-release-detailseite-und-kara-timeline-redesign
plan: "02"
subsystem: ui
tags: [react, nextjs, release-detail, responsive-ui, auth-session, adjacent-navigation]

requires:
  - phase: 105-responsive-release-detailseite-und-kara-timeline-redesign
    plan: "01"
    provides: Wave-0-Regressionsverträge für Release-Komposition, Hero, Beteiligte, Vollfolge und Navigation
  - phase: 103-ffentliche-release-detailseite-als-fansub-story-mit-rechte-g
    provides: Release-Version-Aggregat, zentraler Playback-Resolver und gruppentreue Navigation
provides:
  - Kanonische SSR-Reihenfolge von Hero bis Inline-Navigation ohne Sprungnavigation
  - Responsiver Release-Hero mit sichtbaren Primärfakten und progressiven Technikdetails
  - Release-Version-spezifische Beteiligtenaggregation und zentral gegatete sekundäre Vollfolge
  - Public-Page-Shell mit vier Breakpoint-Bereichen und mobiler Inline-Navigation
affects: [105-03, 105-04, 105-05, release-detail, theme-timeline]

tech-stack:
  added: []
  patterns: [server-owned-document-order, token-free-refresh-session-gate, inline-adjacent-navigation]

key-files:
  created: []
  modified:
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ContributorsRow.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseEpisodePlayer.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNavigation.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.module.css

key-decisions:
  - "Beteiligte werden ausschließlich top-level aus detail.contributors nach fansub_group_id/member_id aggregiert; der Hero besitzt keine Contributor- oder Sprungnavigationslogik mehr."
  - "Eine Refresh-only-Session bleibt aktiv; die Vollfolgen-Sektion erscheint nur nach can_play && stream_ready aus getReleasePlaybackAccess."
  - "ReleaseNavigation nutzt den vorhandenen buildFansubReleaseHref-Seam explizit als AdjacentNavigation inline und behält den öffnenden Gruppenkontext."

patterns-established:
  - "Release-Story-Komposition: Die sichtbare Reihenfolge wird durch echte Server-JSX-Reihenfolge statt CSS order bestimmt."
  - "Sekundäres Playback: Heading und Aktion werden als gemeinsamer positiver Zustand gerendert; alle negativen Zustände bleiben vollständig unsichtbar."

requirements-completed:
  - D-01
  - D-02
  - D-03
  - D-04
  - D-17
  - D-23
  - D-24
  - D-25
  - D-26
  - D-27
  - D-28
  - P103-D-01
  - P103-D-06
  - P103-D-33
  - P103-D-34
  - P103-D-35
  - P103-D-36
  - P102-D-03
  - P102-D-04
  - P102-D-07

duration: 17min
completed: 2026-07-19
---

# Phase 105 Plan 02: Release-Seitenkomposition Summary

**Release-Detailseite mit gelockter Story-Reihenfolge, sichtbaren Hero-Primärfakten, deduplizierten Beteiligten, refresh-sicherer Vollfolge und responsiver Inline-Navigation.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-07-19T12:38:41Z
- **Completed:** 2026-07-19T12:54:57Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Der SSR-Composer rendert Hero → Karas → Bilder → Teamtexte → Beteiligte → optionale Vollfolge → Navigation und lässt leere Sektionen vollständig aus.
- Der Hero priorisiert Release-Preview vor Anime-Logo, bleibt ohne Medien bewusst text-only und zeigt Version, Veröffentlichung, Dauer und Auflösung vor dem Details-Accordion.
- Beteiligte werden pro Fansubgruppe und Member stabil aggregiert; eindeutige Rollen erscheinen gemeinsam in einer flachen Karte.
- Die vollständige Episode bleibt bei Refresh-only-Sessions erreichbar, erscheint aber ausschließlich bei `can_play && stream_ready` gemeinsam mit Heading und sekundärer Aktion.
- Die Shell verwendet die Public-Breitenvariablen, vier responsive Bereiche und eine mobile, vollbreite Inline-Navigation mit mindestens 48px hohen Touchzielen; alte Timeline-Regeln wurden entfernt.

## Task Commits

Each task was committed atomically:

1. **Task 1: SSR-Komposition und Hero-Hierarchie** - `e281554e` (feat)
2. **Task 2: Beteiligtenaggregation und zentral gegatete Vollfolge** - `aa037c1b` (feat)
3. **Task 3: Public-Page-Shell und gruppentreue Inline-Navigation** - `50d381ca` (feat)

## Files Created/Modified

- `releaseDetailPageData.tsx` - Besitzt die kanonische DOM-Reihenfolge, Top-Level-Beteiligte sowie exakte Backlink-/Fehlercopy.
- `releaseDetailPageData.composition.test.tsx` - Isoliert den Composer mit einem Top-Level-Contributor-Mock und prüft Reihenfolge/Leerauslassung.
- `ReleaseDetailHero.tsx` - Trennt sichtbare Primärfakten von Codec, Untertiteltyp und einzelnen Spuren im Accordion.
- `ReleaseDetailHero.test.tsx` - Prüft Preview-/Logo-/text-only-Fallback und die Hero-Grenze ohne Beteiligtensektion.
- `ContributorsRow.tsx` - Aggregiert Personen nach Gruppen-/Member-Tuple und dedupliziert Rollen.
- `ReleaseEpisodePlayer.tsx` - Komponiert den positiven Resolverzustand als sekundäre Section mit globalen Primitives.
- `ReleaseNavigation.tsx` - Nutzt Pretty-/Fallback-Hrefs über `buildFansubReleaseHref` und explizite Inline-Komposition.
- `page.module.css` - Definiert Public-Shell, Hero, Beteiligtenraster und lokale responsive Navigation; enthält keine Timeline-Ownership mehr.

## Verification

- Planweite Vitest-Ausführung: PASS, 6 Dateien / 38 Tests.
- `npm run typecheck`: PASS.
- Gezielter ESLint-Lauf über alle zehn planlokalen TS/TSX-Dateien: PASS.
- `git diff --check HEAD~3 HEAD`: PASS.
- Auth/API/Media-Seam-Scan: PASS; keine neuen Fetch-, Bearer-, Cookie-, Keycloak-, DTO-, Contract-, DB- oder Media-Ownership-Seams.
- Selektor-/Breakpoint-Scan: PASS; keine alten Timeline-Klassen, vier Responsive-Bereiche und 16px Mobile-Gutter/48px Navigation vorhanden.

## Decisions Made

- Vorhandene globale Primitives (`Accordion`, `Card nestedFlat`, `SectionHeader`, `Button secondary`, `Modal`, `AdjacentNavigation inline`) bleiben die einzige Standard-UI-Sprache; es entstand keine parallele Komponente.
- `groups` liefert Beteiligtenkarten höchstens Namensmetadaten. Personen und Rollen stammen ausschließlich aus `detail.contributors` der konkreten Release-Version.
- Navigation bildet nur bereits zentral aufgelöste Kanten ab und konstruiert deren Ziel mit dem aktuellen `groupID`; fehlende Kanten bleiben ausgelassen.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Veralteten Hero-Test-Prop nach der Entkopplung entfernt**
- **Found during:** Task 3 Abschluss-Typecheck
- **Issue:** Der Wave-0-Hero-Test übergab weiterhin den in Task 1 planmäßig entfernten `contributors`-Prop und blockierte dadurch TypeScript.
- **Fix:** Der Test prüft die fehlende Beteiligtensektion über die DOM-Grenze und übergibt keine nicht mehr unterstützte Hero-Eigenschaft.
- **Files modified:** `ReleaseDetailHero.test.tsx`
- **Verification:** Hero-Suite, planweite 38 Tests und `npm run typecheck` bestehen.
- **Committed in:** `50d381ca`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Keine Scope- oder Verhaltensänderung; der Testvertrag wurde an die ausdrücklich entfernte Hero-Schnittstelle angepasst.

## Issues Encountered

- Ein zunächst falsch über PowerShell umgebrochener ESLint-Aufruf startete versehentlich den breiten Projektlint und traf den bestehenden `react-hooks/set-state-in-effect`-Fehler in `frontend/src/components/fansubs/FansubStorySection.tsx`. Der korrekt gezielte Plan-Lint ist vollständig grün; der Befund liegt außerhalb dieses Plans.

## Known Stubs

None. Optionale `null`-Werte und leere Test-Fixtures bilden ausschließlich reale Public-Fallback-/Leerauslassungszustände ab und fließen nicht als Platzhalter in die UI.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03 kann die vollständig entfernte Timeline-CSS-Ownership in `ThemeTimeline.module.css` übernehmen.
- Plan 04 kann Gallery und Teamtexte parallel auf derselben vollbreiten Shell weiterentwickeln.
- Plan 05 kann die zusammengeführte Suite und Live-UAT für 390/768/1024/1440 px ausführen.
- Keine API-, DB-, Auth-, Contract- oder Media-Ownership-Änderung blockiert die Folgetasks.

## Self-Check: PASSED

- Alle sechs wesentlichen Implementierungsdateien und diese Summary sind vorhanden.
- Alle drei Task-Commits sind im Repository vorhanden.
- Die dokumentierten Test-, Typecheck-, Lint-, Diff-, Stub- und Threat-Scan-Ergebnisse wurden auf dem finalen Task-Stand bestätigt.

---
*Phase: 105-responsive-release-detailseite-und-kara-timeline-redesign*
*Completed: 2026-07-19*
