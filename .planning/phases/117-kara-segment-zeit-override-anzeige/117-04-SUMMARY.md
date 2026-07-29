---
phase: 117-kara-segment-zeit-override-anzeige
plan: 04
subsystem: backend
tags: [postgresql, go, repository, handlers, theme-segments, release-versions, render-cache, tdd]

# Dependency graph
requires:
  - phase: 117-03
    provides: "release_version_id-scoped GetThemeSegmentRenderSource/render-cache lookups, resetAndQueueSegmentRenderAfterChange(ctx, segmentID, releaseVersionID) surface, syncThemeSegmentPlaybackSourceTx fan-out over all assignments"
  - phase: 117-02
    provides: "ListThemeSegmentAssignments(ctx, segmentID) / GetThemeSegmentEpisodeOverride(ctx, segmentID, releaseVersionID) repository methods"
provides:
  - "hydrateSegmentPlaybackMetadata(List)/loadSegmentByID/GetAnimeSegmentByID/ListAnimeSegments take currentReleaseVersionID -- deterministic per-(segment, release-version) playback hydration for the admin editor instead of an arbitrary theme_segment_playback_sources row"
  - "segmentRenderInputsChanged(before, after *models.ThemeSegmentRenderSource) bool -- release-version-scoped comparison (StreamExternalID/StartOffsetSeconds/EndOffsetSeconds/SourceKind/MediaAssetID), replacing the old *models.AdminThemeSegment comparison"
  - "nonOverriddenSegmentAssignments/filterAssignmentsWithoutOverride/resetAndQueueSegmentRenderForAssignments (segment_render_fanout.go) -- fan-out helper: UpdateAnimeSegment invalidates only non-overridden assignments after a real before/after change; AttachSegmentLibraryAsset invalidates ALL assignments unconditionally (RESEARCH.md Risk 5 fix)"
  - "CreateAnimeSegment handler now passes the resolved release_variant_id query param through as currentReleaseVersionID, so a segment created in an editor context is immediately assigned to that release version"
affects: [117-05, 117-06, 117-07, 117-09]

# Tech tracking
tech-stack:
  added: []
  patterns: ["segment_render_fanout.go: new focused handler file for fan-out orchestration (filterAssignmentsWithoutOverride, nonOverriddenSegmentAssignments, captureSegmentRenderSources, resetAndQueueSegmentRenderForAssignments) instead of growing admin_content_anime_theme_segments.go/segment_render_refresh.go further -- same split convention as segment_stream.go/segment_render_worker.go"]

key-files:
  created:
    - backend/internal/handlers/segment_render_fanout.go
    - backend/internal/handlers/segment_render_fanout_test.go
    - backend/internal/repository/admin_content_anime_theme_segments_hydration_integration_test.go
    - .planning/phases/117-kara-segment-zeit-override-anzeige/deferred-items.md
  modified:
    - backend/internal/repository/admin_content_anime_themes.go
    - backend/internal/handlers/admin_content_anime_theme_segments.go
    - backend/internal/handlers/admin_content_handler.go
    - backend/internal/handlers/segment_render_refresh.go
    - backend/internal/handlers/segment_render_refresh_test.go
    - backend/internal/handlers/segment_render_worker_test.go
    - backend/internal/handlers/admin_content_fansub_releases_test.go

key-decisions:
  - "AttachSegmentLibraryAsset's Risk-5 fix invalidates ALL currently assigned release versions unconditionally (ListThemeSegmentAssignments, no override filter) -- unlike UpdateAnimeSegment's base-time-change fan-out (which excludes overridden assignments via nonOverriddenSegmentAssignments), an asset/source swap changes the SHARED playback source for every assignment; an episode override only replaces the TIME, never the source, so an overridden release version is still affected by a source change and must be invalidated too."
  - "CreateAnimeSegment handler now passes the already-resolved release_variant_id query parameter through as currentReleaseVersionID (previously hardcoded 0 per a 117-03 TODO) -- a segment created from within a release-version-scoped editor context is immediately assigned to that release version, matching Plan 117-04 Task 1's explicit instruction to wire all four CRUD handlers through."
  - "releaseVariantID resolution was reordered to happen BEFORE the existingSegment/GetAnimeSegmentByID fetch in UpdateAnimeSegment/DeleteAnimeSegment/AttachSegmentLibraryAsset/UploadSegmentAsset/DeleteSegmentAsset -- otherwise the hydration-context parameter (currentReleaseVersionID) would not yet be known at the point GetAnimeSegmentByID is called, defeating Task 1's purpose. The existing releaseVariantID==0 fallback (segmentPlaybackVariantID(existingSegment)) is preserved unchanged for callers that never pass a release_variant_id query param."
  - "Task 1 and Task 2 were committed together (feat commit) because the adminThemeRepository interface change (ListAnimeSegments/GetAnimeSegmentByID new signature + the two new Task-2 methods ListThemeSegmentAssignments/GetThemeSegmentEpisodeOverride) and the handler call-site reordering are tightly interleaved in the same two files -- splitting them into two separately-buildable commits would have required substantial rework with no real review benefit (same pragmatic-combination pattern already used in 117-03-SUMMARY.md). Task 3 (all-new regression tests) stayed a separate, cleanly scoped test commit."

requirements-completed: [D-01, D-03]

# Metrics
duration: ~110min
completed: 2026-07-29
---

# Phase 117 Plan 04: Release-version-scoped Render-Invalidierung + Fan-Out + Risk-5-Fix Summary

**Macht die Render-Cache-Invalidierung release-version-bewusst statt segment-weit: eine Basis-Zeit-Änderung fan-outet jetzt korrekt über alle zugewiesenen, NICHT überschriebenen Release-Versionen, und `AttachSegmentLibraryAsset` löst endlich denselben Invalidierungspfad aus wie `UpdateAnimeSegment` (RESEARCH.md Risk 5).**

## Performance

- **Duration:** ~110 min
- **Tasks:** 3/3 completed
- **Files modified:** 10 (3 new production/test files, 1 new deferred-items doc, 6 modified)

## Accomplishments

- `hydrateSegmentPlaybackMetadata`/`hydrateSegmentPlaybackMetadataList`/`loadSegmentByID`/`GetAnimeSegmentByID`/`ListAnimeSegments` nehmen jetzt `currentReleaseVersionID` entgegen und wählen damit deterministisch die `theme_segment_playback_sources`-Zeile der aktuell im Admin-Editor geöffneten Release-Version, statt seit Plan 117-03 eine arbiträre Zeile über alle Zuweisungen hinweg zu liefern — live bewiesen: für ein Segment mit zwei Zuweisungen A/B liefert `GetAnimeSegmentByID(..., currentReleaseVersionID=B)` `playback_release_variant_id`, das zur Variante von B gehört, nicht zu A (und umgekehrt).
- Alle fünf Segment-CRUD-/Asset-Handler (`ListAnimeSegments`, `CreateAnimeSegment`, `UpdateAnimeSegment`, `DeleteAnimeSegment`, `AttachSegmentLibraryAsset`, `UploadSegmentAsset`, `DeleteSegmentAsset`) reichen den bereits über `parseReleaseVariantIDQuery(c)` vorliegenden Wert als `currentReleaseVersionID` durch; dafür wurde die Reihenfolge "erst Segment laden, dann Release-Variante auflösen" auf "erst Release-Variante auflösen, dann Segment laden" umgedreht (sonst wäre der Hydrations-Kontext beim Laden noch nicht bekannt gewesen).
- `segmentRenderInputsChanged` vergleicht jetzt zwei `*models.ThemeSegmentRenderSource` (release-version-scoped: `StreamExternalID`/`StartOffsetSeconds`/`EndOffsetSeconds`/`SourceKind`/`MediaAssetID`) statt zwei `*models.AdminThemeSegment`-Snapshots.
- Neue Datei `segment_render_fanout.go` bündelt die Fan-Out-Orchestrierung: `nonOverriddenSegmentAssignments` lädt alle Zuweisungen und filtert per `GetThemeSegmentEpisodeOverride`-`ErrNotFound`-Check diejenigen ohne aktiven Override heraus (`filterAssignmentsWithoutOverride` als isolierte, reine Funktion); `captureSegmentRenderSources` sammelt die "vorher"-Render-Quellen vor einer Änderung ein; `resetAndQueueSegmentRenderForAssignments` fan-outet mit optionalem Vor-/Nachher-Vergleich.
- `UpdateAnimeSegment` fan-outet eine Basis-Zeit-Änderung jetzt über ALLE nicht überschriebenen Zuweisungen (invalidiert nur bei tatsächlicher Render-Quellen-Abweichung), lässt überschriebene Release-Versionen unangetastet — live regressionsgetestet (drei Zuweisungen, eine mit Override → genau zwei Fan-Out-Kandidaten).
- `AttachSegmentLibraryAsset` (RESEARCH.md Risk 5) löst jetzt denselben Invalidierungspfad wie `UpdateAnimeSegment` aus — aber bewusst UNGEFILTERT über ALLE Zuweisungen (auch überschriebene), weil ein Quellenwechsel die geteilte Wiedergabequelle betrifft, die ein Zeit-Override nicht ersetzt. Regressionstest beweist: nach dem Attach existiert für JEDE zugewiesene Release-Version ein `queued`-Cache-Eintrag (vorher: keiner).
- `CreateAnimeSegment` weist ein neues Segment jetzt sofort der aktuellen Editor-Release-Version zu (vorher hartcodiert `0`), passend zum expliziten Plan-Auftrag, alle vier CRUD-Handler durchzuverdrahten.

## Task Commits

1. **Task 1 + Task 2 (pragmatisch kombiniert): release-version-scoped Hydration, Fan-Out-Invalidierung, Risk-5-Fix** — `2f9753a6` (feat)
2. **Task 3: Regressionstests für Fan-Out-Filterung, Risk-5-Fix und Hydration** — `16c0879f` (test)

## Files Created/Modified

- `backend/internal/handlers/segment_render_fanout.go` — NEU: `filterAssignmentsWithoutOverride`, `nonOverriddenSegmentAssignments`, `captureSegmentRenderSources`, `resetAndQueueSegmentRenderForAssignments`
- `backend/internal/handlers/segment_render_fanout_test.go` — NEU: pure-function-Tests für den Override-Ausschlussfilter
- `backend/internal/repository/admin_content_anime_theme_segments_hydration_integration_test.go` — NEU: Live-DB-Beweis für Task 1 (currentReleaseVersionID-Hydration)
- `backend/internal/repository/admin_content_anime_themes.go` — `ListAnimeSegments`/`GetAnimeSegmentByID`/`loadSegmentByID`/`hydrateSegmentPlaybackMetadata(List)` um `currentReleaseVersionID` erweitert; alle internen Aufrufer (CreateAnimeSegment, AttachSegmentLibraryAsset, BindUploadedSegmentAsset, ClearSegmentAsset, ListAnimeSegmentSuggestions) aktualisiert
- `backend/internal/handlers/admin_content_anime_theme_segments.go` — sieben Handler auf neue Signaturen umgestellt, `releaseVariantID`-Auflösung vor `GetAnimeSegmentByID` vorgezogen, `UpdateAnimeSegment`/`AttachSegmentLibraryAsset` nutzen den neuen Fan-Out
- `backend/internal/handlers/admin_content_handler.go` — `adminThemeRepository`-Interface: neue Signaturen + `ListThemeSegmentAssignments`/`GetThemeSegmentEpisodeOverride` ergänzt
- `backend/internal/handlers/segment_render_refresh.go` — `segmentRenderInputsChanged` auf `*models.ThemeSegmentRenderSource` umgestellt
- `backend/internal/handlers/segment_render_refresh_test.go` — bestehende Tests auf neue Signatur migriert + neue Fallfälle (StreamExternalID-Änderung, nil/nil, nil-vs-vorhanden)
- `backend/internal/handlers/segment_render_worker_test.go` — neuer Fake-Repo + Regressionstest für den Risk-5-Fix
- `backend/internal/handlers/admin_content_fansub_releases_test.go` — Stub-Repo an neue Interface-Signaturen angepasst
- `.planning/phases/117-kara-segment-zeit-override-anzeige/deferred-items.md` — NEU: dokumentiert die vorbestehende 450-Zeilen-Überschreitung von `admin_content_anime_theme_segments.go`

## Decisions Made

Siehe `key-decisions` im Frontmatter. Zusammengefasst: AttachSegmentLibraryAsset invalidiert ungefiltert (Quellenwechsel betrifft alle Zuweisungen unabhängig vom Override), während UpdateAnimeSegment den Override-Filter anwendet (Basis-Zeit-Änderung betrifft überschriebene Folgen nicht); `releaseVariantID` wird jetzt vor dem Laden des Segments aufgelöst, damit die Hydration korrekt scopen kann; CreateAnimeSegment weist sofort der aktuellen Editor-Release-Version zu.

## Deviations from Plan

### Auto-fixed Issues

Keine Bugs im eigentlichen Sinn — alle Abweichungen sind Ausführungsentscheidungen (s. u.).

### Pragmatic Task-Commit-Kombination (kein Auto-Fix, sondern Ausführungs-Entscheidung)

Task 1 und Task 2 wurden in EINEM Commit (`2f9753a6`) zusammengefasst statt in zwei separaten Commits. Grund: Die `adminThemeRepository`-Interface-Änderung (neue Signaturen für Task 1 + zwei neue Methoden für Task 2) und die Handler-Reorder-Logik liegen in denselben zwei Dateien und sind inhaltlich nicht sauber trennbar, ohne erheblichen Mehraufwand ohne Review-Mehrwert zu erzeugen (identisches Muster wie in 117-03-SUMMARY.md dokumentiert). Task 3 (ausschließlich neue Regressionstests) blieb als eigener, klar abgegrenzter Commit bestehen.

### Rule 2 (Auto-add missing critical functionality) — CreateAnimeSegment-Wiring

Der Plan-Text listet `CreateAnimeSegment` explizit unter den vier Handlern, die `currentReleaseVersionID` durchreichen sollen. Da `CreateAnimeSegment` (Handler) selbst keine `GetAnimeSegmentByID`/`ListAnimeSegments`-Aufrufe enthält, sondern seinen eigenen `currentReleaseVersionID`-Parameter direkt an `h.themeRepo.CreateAnimeSegment(...)` durchreicht, wurde der bisher hartcodierte `0`-Wert durch den bereits aufgelösten `releaseVariantID` ersetzt (vorher durch einen 117-03-TODO-Kommentar bewusst auf `0` belassen, mit dem expliziten Verweis "sobald der Admin-Editor eine echte Erstzuweisung mitgibt"). Das ist funktional korrekt und vom Plan-Text explizit verlangt, aber ein sichtbarer Verhaltenswechsel: ein neu angelegtes Segment wird jetzt sofort der aktuellen Editor-Release-Version zugewiesen, statt zuweisungslos zu bleiben.

**Total deviations:** 0 Bugs, 1 Commit-Struktur-Entscheidung, 1 explizit plan-geforderte Verhaltensänderung dokumentiert.
**Impact on plan:** Kein Scope-Creep — beide Punkte sind entweder plan-explizit gefordert oder rein organisatorisch.

## Known Stubs

Keine — kein UI-/Frontend-Anteil in diesem Plan; alle Änderungen sind Backend-Repository-/Handler-Logik mit vollständiger Datenanbindung.

## Threat Flags

Keine neue Angriffsfläche. Die bestehende `requireSegmentManage`-Autorisierung (unverändert) bleibt vor jedem der geänderten Handler-Aufrufe bestehen; die Reihenfolge-Umstellung (releaseVariantID vor GetAnimeSegmentByID) ändert NICHT, welche Berechtigungsprüfung greift, nur WANN der Hydrations-Kontext bekannt ist.

## Issues Encountered

Ein `.git/index.lock` (vermutlich Rest eines abgebrochenen parallelen GSD-Laufs, kein aktiver Git-Prozess gefunden) blockierte den ersten Commit-Versuch; nach Verifikation, dass kein `git.exe`-Prozess mehr lief und `git log`/`git status` konsistent mit dem erwarteten Stand waren, wurde die Lock-Datei entfernt und der Commit lief danach durch.

## Verification Evidence (live, gegen lokales Docker-Postgres)

- `go build ./...` und `go vet ./...` liefen nach der finalen Änderung fehlerfrei (voller Backend-Repo-Root, nicht nur die Segment-Pakete).
- `go test ./internal/...` — alle Pakete grün (`handlers` 10.99s, `repository` 3.89s, restliche Pakete gecacht grün), keine Regression in nicht-Segment-Paketen.
- `go test ./internal/handlers/... -run Segment -v` — alle ~35 Segment-Testfälle grün, inklusive der neuen `TestFilterAssignmentsWithoutOverrideExcludesOverriddenIDs`, `TestNonOverriddenSegmentAssignmentsExcludesOverriddenReleaseVersion`, `TestSegmentRenderInputsChangedDetects*`/`Ignores*`/`Nil*`, `TestAttachSegmentLibraryAsset_QueuesRenderForAllAssignedReleaseVersions`.
- Temporäre, isolierte Datenbanken (`team4s_phase117_test_p04`, `team4s_phase117_test_p04b`) auf `team4sv30-db` angelegt, `TEAM4S_PHASE117_TEST_DSN` darauf gesetzt, danach beide gelöscht (`team4s_v2` Dev-DB zu keinem Zeitpunkt mit Testdaten beschrieben):
  - `go test ./internal/repository/... -run 'TestThemeSegmentAssignmentsAndOverrides|TestThemeSegmentPlaybackResolution|TestReleaseDetailPublicSegments'` — alle bestehenden Phase-117-Integrationstests weiterhin grün (keine Regression durch die Hydration-Query-Änderung).
  - `go test ./internal/repository/... -run TestGetAnimeSegmentByID_HydratesPlaybackForRequestedReleaseVersion -v` — drei neue Subtests grün: `currentReleaseVersionID=B` liefert Variante B, `=A` liefert Variante A, `=0` liefert deterministisch eine Zeile.

## User Setup Required

None — alle Verifikationsschritte liefen gegen lokale Ressourcen (Docker-Postgres, isolierte Wegwerf-Datenbanken).

## Next Phase Readiness

- Backend-Invalidierungspfad ist vollständig release-version-scoped, fan-out-fähig und Override-bewusst; RESEARCH.md Risk 5 ist vollständig behoben (nicht nur für `UpdateAnimeSegment`, auch für `AttachSegmentLibraryAsset`).
- Plan 117-05 kann die im Handler bereits vorbereiteten `currentReleaseVersionID`/`startEpisode`/`endEpisode`-Wiring-Punkte direkt weiterverwenden (die dort verbliebenen `TODO(117-05)`-Kommentare in `admin_content_anime_theme_segments.go` betreffen ausschließlich die Episoden-Bereichsfilterung in `GetSegmentReleaseDuration`, nicht die in diesem Plan gelöste Playback-Hydration).
- Bekannte, dokumentierte Zwischenzustand-Lücke (unverändert seit 117-03, jetzt nicht mehr blockierend für 117-04): `RenderSegment`/`StreamSegment` akzeptieren `release_version_id` weiterhin nur als optionalen Query-Parameter — deren echte Frontend-Verdrahtung bleibt Plan 117-05/117-06.
- `admin_content_anime_theme_segments.go` (905 Zeilen) und `admin_content_anime_themes.go` (weiterhin >2000 Zeilen) bleiben über dem CLAUDE.md-450-Zeilen-Richtwert — vorbestehende, in `deferred-items.md` dokumentierte Schuld, kein Blocker für 117-05.
- Kein Blocker für Plan 117-05.

---
*Phase: 117-kara-segment-zeit-override-anzeige*
*Completed: 2026-07-29*

## Self-Check: PASSED

All created files verified present on disk (`segment_render_fanout.go`, `segment_render_fanout_test.go`,
`admin_content_anime_theme_segments_hydration_integration_test.go`, `deferred-items.md`,
`117-04-SUMMARY.md`). Commits `2f9753a6`, `16c0879f`, `b6b7b8a4` verified present in `git log`.
