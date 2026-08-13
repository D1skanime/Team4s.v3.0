---
phase: 117-kara-segment-zeit-override-anzeige
plan: 08
subsystem: api
tags: [postgresql, go, repository, nextjs, react, theme-segments, kara-segments, public-release-detail, tdd]

# Dependency graph
requires:
  - phase: 117-01
    provides: "theme_segment_assignments-Schema (Migration 0141) inkl. Rueckwaerts-Index idx_theme_segment_assignments_release_version, explizit fuer diese Plan-08-Entdopplung vorbereitet"
  - phase: 117-02
    provides: "testsupport.OpenPhase117Postgres(t) Wave-0-Fixture fuer den Integrationstest"
provides:
  - "loadReleaseSegments liest ueber theme_segment_assignments statt (wie zuvor) ausschliesslich theme_segment_playback_sources; Readiness-Feld bleibt ueber LEFT JOIN auf theme_segment_playback_sources erreichbar"
  - "suppressSegmentsAlreadyVisibleOnPreviousEpisode -- serverseitige Entdopplung (D-02): unterdrueckt jedes Segment, dessen theme_segment_id bereits der direkten Vorfolge (loadAdjacentReleases) zugewiesen war; Span-Start-Fallback ohne Sonderfall-Code, wenn keine Vorfolge existiert"
  - "applyAppliesThroughEpisode -- befuellt PublicReleaseSegment.AppliesThroughEpisode mit der hoechsten zugewiesenen Episodennummer eines geteilten Segments (nur bei >1 Zuweisung und Abweichung von der aktuellen Folge)"
  - "ThemeTimeline.tsx rendert Badge variant=\"muted\" \"Gilt auch fuer Folge {von}-{bis}\" auf der Span-Start-Folge (UI-SPEC Surface 3), neuer episodeNumber-Prop, durchgereicht via releaseDetailPageData.tsx aus detail.episode_number"
  - "TestReleaseDetailPublicSegments -- Live-DB-Beweis fuer Span-Start/Unterdrueckung/echten-Wechsel, zwei neue ThemeTimeline.test.tsx-Faelle fuer den Badge"
affects: [117-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "loadReleaseSegments ruft die bestehende loadAdjacentReleases-Funktion fuer die Vorfolgen-Diff-Logik auf, statt eine eigene Adjazenz-Query zu schreiben (Wiederverwendung statt Duplikat, wie im Plan vorgegeben)"
    - "applyAppliesThroughEpisode nutzt dasselbe release_versions -> fansub_releases -> episodes Join-Muster wie hydrateSegmentAssignmentMetadataList (117-03, theme_segment_playback_resolution.go) fuer echte Episodennummern"

key-files:
  created:
    - backend/internal/repository/release_detail_public_segments_integration_test.go
  modified:
    - backend/internal/repository/release_detail_public_repository_helpers.go
    - backend/internal/repository/release_detail_public_repository.go
    - frontend/src/types/releaseDetail.ts
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.test.tsx
    - backend/internal/testsupport/phase117_postgres.go

key-decisions:
  - "loadReleaseSegments ruft loadAdjacentReleases innerhalb der eigenen Ausfuehrung erneut auf (zusaetzliche, aber indexierte Query), statt das bereits in GetPublicReleaseDetail spaeter berechnete previous/next-Paar vorzuziehen und durchzureichen -- exakt wie im Plan-Text vorgegeben (\"rufe r.loadAdjacentReleases(...) auf\"), um keine Reihenfolge-Abhaengigkeit im Aggregat-Read zu erzeugen."
  - "ThemeTimeline erhielt einen neuen episodeNumber-Prop (vorher nicht vorhanden), gespeist aus detail.episode_number in releaseDetailPageData.tsx -- der Plan-Text ging von einer bereits vorhandenen Prop aus, per Grep war aber keine vorhanden; die Ergaenzung ist fuer den Badge-Text zwingend noetig (Rule 2/3)."
  - "Backend-Integrationstest lebt in package repository (nicht repository_test) -- analog zu theme_segment_assignments_integration_test.go, da kein Import von services benoetigt wird; ruft die unexportierte loadReleaseSegments direkt auf statt ueber den vollen GetPublicReleaseDetail-Aggregat-Read, der zusaetzliche, hier nicht relevante Tabellen (release_version_media, release_version_notes, Contributor-Aufloesung) voraussetzen wuerde."

patterns-established:
  - "Server-seitige Entdopplung ist explizit als eigene, benannte Hilfsfunktion (suppressSegmentsAlreadyVisibleOnPreviousEpisode) statt inline in loadReleaseSegments implementiert -- haelt die 450-Zeilen-Konvention der Datei ein und macht den D-02-Vertrag isoliert testbar."

requirements-completed: [D-02]

# Metrics
duration: ~55min
completed: 2026-07-29
---

# Phase 117 Plan 08: Öffentliche Timeline-Entdopplung (D-02) Summary

**Ein geteiltes Kara erscheint auf der öffentlichen Release-Detailseite nur noch am Beginn seines Geltungsbereichs — server-seitig entdoppelt über `theme_segment_assignments` + Vorfolgen-Diff, mit einer „Gilt auch für Folge X–Y"-Badge auf der Span-Start-Folge.**

## Performance

- **Duration:** ~55 min
- **Tasks:** 3/3 completed
- **Files modified:** 7 (1 neue Testdatei, 6 modifiziert)

## Accomplishments

- `loadReleaseSegments` liest jetzt strukturell über `theme_segment_assignments` (nicht mehr ausschließlich `theme_segment_playback_sources`) — ein geteiltes Kara mit mehreren Zuweisungen wird korrekt als mehrere Kandidaten-Zeilen erkannt, die konkrete Playback-Quelle für das Readiness-Feld bleibt über einen zusätzlichen `LEFT JOIN` erreichbar.
- Neue `suppressSegmentsAlreadyVisibleOnPreviousEpisode`-Funktion entfernt aus dem Ergebnis jedes Segment, dessen `theme_segment_id` bereits der direkten Vorfolge zugewiesen war — nutzt dafür die bestehende `loadAdjacentReleases`-Funktion (kein Duplikat-Code), live bewiesen: ein reiner Zeit-Offset auf derselben Vorfolge erzeugt keinen neuen Timeline-Eintrag mehr (D-02).
- Ein echter Segment-Wechsel (andere `theme_segment_id` auf der Folgeepisode) wird explizit NICHT unterdrückt — eigener Testfall beweist das getrennt vom Unterdrückungsfall.
- Fehlt die Vorfolge (Anime-Anfang, Lücke in der Episodennummerierung), gilt die aktuelle Folge automatisch als Span-Start — kein Sonderfall-Code nötig, `loadAdjacentReleases` liefert bereits `nil` für diesen Fall.
- Neues `PublicReleaseSegment.AppliesThroughEpisode`-Feld (Go+TS, `applies_through_episode`) trägt die höchste zugewiesene Episodennummer eines geteilten Segments; `ThemeTimeline.tsx` rendert dafür bedingt `Badge variant="muted"` „Gilt auch für Folge {von}–{bis}" (UI-SPEC Surface 3, `@/components/ui`-Primitive, korrekte Umlaute).
- Live gegen eine temporäre, isolierte Postgres-Datenbank (`team4s_phase117_test_c`, danach gedroppt) verifiziert: Span-Start-Folge ohne Vorfolge zeigt das Segment inkl. korrekt befüllter Span-Reichweite, die Folgeepisode mit reinem Zeit-Offset zeigt gar nichts, die Episode mit echtem Segment-Wechsel zeigt das neue Segment ohne Badge.

## Task Commits

Each task was committed atomically:

1. **Task 1: Serverseitige Entdopplung in loadReleaseSegments** - `1a9ca610` (feat)
2. **Task 2: "Gilt auch für Folge X–Y"-Badge (Surface 3) + Typ-Erweiterung** - `2845bc2c` (feat)
3. **Task 3: Integrationstest (Backend) + Komponententest (Frontend) für Entdopplung** - `239bdc78` (test)

## Files Created/Modified

- `backend/internal/repository/release_detail_public_repository_helpers.go` - `loadReleaseSegments` umgebaut auf `theme_segment_assignments`; neue Funktionen `suppressSegmentsAlreadyVisibleOnPreviousEpisode`, `applyAppliesThroughEpisode`
- `backend/internal/repository/release_detail_public_repository.go` - `PublicReleaseSegment.AppliesThroughEpisode`-Feld; Aufrufer reicht `animeID`/`groupID`/`header.Version`/`header.EpisodeNumber` an `loadReleaseSegments` durch
- `backend/internal/repository/release_detail_public_segments_integration_test.go` - NEU, `TestReleaseDetailPublicSegments`, drei `t.Run`-Subtests live gegen echte Postgres
- `backend/internal/testsupport/phase117_postgres.go` - `episodes`-Stub um `number_decimal`/`title` ergänzt (Rule-3-Fix, siehe Deviations)
- `frontend/src/types/releaseDetail.ts` - `PublicReleaseSegment.applies_through_episode`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.tsx` - neuer `episodeNumber`-Prop; `SegmentDetails`/`SelectionSurface` rendern bedingt den Span-Badge
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData.tsx` - reicht `detail.episode_number` an `ThemeTimeline` durch
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.test.tsx` - zwei neue Testfälle für den Span-Badge

## Decisions Made

Siehe `key-decisions` im Frontmatter. Zusammengefasst: `loadAdjacentReleases` wird aus `loadReleaseSegments` erneut aufgerufen (statt das in `GetPublicReleaseDetail` ohnehin berechnete `previous`/`next`-Paar vorzuziehen), exakt wie im Plan-Text vorgegeben — ein zusätzlicher, aber indexierter Query-Aufruf, keine neue Adjazenz-Logik. Der `episodeNumber`-Prop auf `ThemeTimeline` ist neu (nicht wiederverwendet, da keine vorhandene Prop per Grep auffindbar war) und wird für den Badge-Text zwingend benötigt.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Phase-117-Test-Fixture fehlten zwei von `loadAdjacentReleases` referenzierte Spalten**
- **Found during:** Task 3 (Live-Verifikation gegen die temporäre isolierte Postgres-Datenbank)
- **Issue:** `loadAdjacentReleases` (bestehende, wiederverwendete Funktion) selektiert `e.number_decimal` und `NULLIF(TRIM(e.title), '')`. Der `episodes`-Stub in `testsupport/phase117_postgres.go` hatte nur `id, anime_id, sort_index, episode_number` — beide Spalten fehlten, da `loadAdjacentReleases` bisher von keinem Phase-117-Live-Test aufgerufen wurde. Ohne Fix schlug jeder Testfall mit „column e.number_decimal/e.title does not exist" fehl.
- **Fix:** `number_decimal DECIMAL(5,1)` und `title TEXT` zum `episodes`-Stub ergänzt, exakt die Typen aus der echten Produktionsmigration 0033.
- **Files modified:** `backend/internal/testsupport/phase117_postgres.go`
- **Verification:** Alle drei Subtests von `TestReleaseDetailPublicSegments` liefen danach live grün gegen eine echte, isolierte Postgres-Instanz; kompletter `go test ./internal/repository/...`-Lauf regressionsfrei.
- **Committed in:** `239bdc78`

---

**Total deviations:** 1 auto-fixed (1 Rule 3 fixture-gap fix)
**Impact on plan:** Notwendig, damit der Live-DB-Integrationstest (wie von der Plan-Verifikation gefordert) tatsächlich lief statt nur "sauber übersprungen" zu werden. Kein Scope-Creep über die Plan-Absicht hinaus.

## Issues Encountered

Ein stale `.git/index.lock` blockierte kurzzeitig den zweiten Task-Commit — nach Prüfung, dass kein aktiver `git.exe`-Prozess lief (`tasklist`, kein Treffer) und der Reflog/Log-Stand konsistent war, wurde die Lock-Datei manuell entfernt (keine destruktive Git-Operation, reines Lock-Cleanup nach Live-Writer-Check gemäß Projekt-Konvention für parallele GSD-Agenten auf `main`).

## Verification Evidence (live, gegen lokales Docker-Postgres)

- `cd backend && go build ./...` und `go vet ./...` liefen nach jedem Task fehlerfrei.
- `cd backend && go test ./internal/...` — alle Pakete grün (repository, handlers, services, testsupport, migrations, middleware, permissions, models, config, auth, observability), keine Regression.
- Temporäre, isolierte Datenbank `team4s_phase117_test_c` auf `team4sv30-db` (Port 5433) angelegt, `TEAM4S_PHASE117_TEST_DSN` darauf gesetzt: `go test ./internal/repository/... -run TestReleaseDetailPublicSegments -v` — alle drei Subtests grün:
  - `span-start Folge (keine Vorfolge) zeigt das Segment und traegt die Span-Reichweite` — PASS
  - `reiner Zeit-Offset ohne echten Wechsel erzeugt keinen neuen Eintrag (D-02)` — PASS
  - `echter Segment-Wechsel wird NICHT unterdrueckt` — PASS
- Temporäre Test-DB danach gedroppt (`DROP DATABASE team4s_phase117_test_c`) — kein Rückstand, `team4s_v2` (Dev-DB) wurde zu keinem Zeitpunkt mit Testdaten beschrieben.
- `cd frontend && npm run typecheck` — fehlerfrei (`tsc --noEmit`, Exit 0).
- `cd frontend && npm test -- ThemeTimeline` — 19/19 grün (17 bestehende + 2 neue Fälle für den Span-Badge).
- `cd frontend && npm test -- releaseDetailPageData` — 8/8 grün (Regressionscheck für den neuen `episodeNumber`-Prop-Durchgriff).

## User Setup Required

None — alle Verifikationsschritte liefen gegen lokale Ressourcen (Docker-Postgres, isolierte Wegwerf-Datenbank).

## Next Phase Readiness

- Die öffentliche Entdopplung (D-02) ist vollständig, unabhängig von den Admin-Wellen 117-04 bis 117-07 implementiert und live verifiziert — dieser Plan hatte laut Objective bewusst keine Abhängigkeit zu den Admin-Zuweisungs-/Override-Plänen.
- `AppliesThroughEpisode` nutzt bereits real existierende `theme_segment_assignments`-Daten; sobald Admin-Zuweisung/-Entfernung (117-04/117-07) live produktiv genutzt wird, zeigt die öffentliche Seite die entdoppelte Ansicht ohne weitere Backend-Änderung.
- **Live-UAT ausstehend:** Wie bei den übrigen Phase-117-Plänen (siehe STATE.md/Memory „Live-UAT 114–116 gebündelt") ist dieser Plan code-fertig und mit echter DB-Integrationstest-Suite verifiziert, aber noch nicht im laufenden Dev-Server (`:3000`) mit echten Browser-Daten gegengeprüft — sollte zusammen mit den übrigen offenen Phase-117-Plänen gebündelt live abgenommen werden, bevor Phase 117 als vollständig verifiziert markiert wird.
- Kein Blocker für nachfolgende Pläne.

---
*Phase: 117-kara-segment-zeit-override-anzeige*
*Completed: 2026-07-29*

## Self-Check: PASSED

Alle erstellten/modifizierten Dateien auf Disk verifiziert (`release_detail_public_segments_integration_test.go`,
`release_detail_public_repository_helpers.go`, `release_detail_public_repository.go`, `phase117_postgres.go`,
`releaseDetail.ts`, `ThemeTimeline.tsx`, `releaseDetailPageData.tsx`, `ThemeTimeline.test.tsx`). Task-Commits
`1a9ca610`, `2845bc2c`, `239bdc78` im `git log` verifiziert.
