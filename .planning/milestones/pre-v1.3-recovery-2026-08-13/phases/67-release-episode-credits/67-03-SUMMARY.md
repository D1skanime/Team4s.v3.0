---
phase: 67-release-episode-credits
plan: 03
subsystem: api
tags: [go, pgx, postgres, anime_contributions, release_version, public-query, aggregation, two-query-merge]

# Dependency graph
requires:
  - phase: 67-01
    provides: "anime_contributions.release_version_id Spalte (Migration 0091)"
  - phase: 67-02
    provides: "release_version_id durchgaengig im Schreibpfad (Row/Upsert)"
provides:
  - "attachVersionBreakdowns (Ebene-2-Aggregation, Two-Query-map-Merge) + ReleaseVersionBreakdownGroup-DTO"
  - "GetPublicAnimeContributions Ebene-1-Filter release_version_id IS NULL (keine Doppelanzeige)"
  - "PublicAnimeContributionGroup.VersionBreakdown []ReleaseVersionBreakdownGroup (version_breakdown JSON)"
affects: [67-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-Query-Aggregation per map-Merge (gespiegelt von attachHiddenCounts) fuer Ebene-2-Versions-Aufschluesselung"
    - "Pointer-auf-Slice (*[]PublicAnimeContributionGroup), damit nur-versions-spezifische Gruppen nachtraeglich eingefuegt werden koennen"
    - "Identische Public-Filter (is_public_on_anime_page=true AND hfgm.visibility='public') auf BEIDEN Ebenen (Information-Disclosure-Mitigation)"

key-files:
  created:
    - backend/internal/repository/anime_contributions_public_versions_repository.go
    - backend/internal/repository/anime_contributions_public_versions_repository_test.go
  modified:
    - backend/internal/repository/anime_contributions_public_repository.go

key-decisions:
  - "attachVersionBreakdowns nimmt *[]PublicAnimeContributionGroup statt []..., weil Gruppen mit ausschliesslich versions-spezifischen Beitraegen neu angehaengt werden muessen (sonst wuerden sie auf der Anime-Seite fehlen)."
  - "VersionBreakdown-Feld an PublicAnimeContributionGroup (in anime_contributions_public_repository.go) wurde im feat-Commit von Task 1 mitgeliefert, weil die neue Datei sonst nicht kompiliert; Task 2 fuegte nur Filter + Aufruf hinzu."
  - "Reihenfolge der Versions-Bloecke wird aus der ORDER-BY-Klausel der Query uebernommen (Go-Code haengt neue release_version_id-Bloecke am Ende an), statt im Go-Code nachzusortieren."

patterns-established:
  - "Ebene-2-Aggregation in eigener Datei (145 Z.), Ebene-1-Datei bleibt unter 450 (400 Z.) — nur additive Filter+Aufruf-Zeilen."

requirements-completed: [P67-SC2]

# Metrics
duration: 4min
completed: 2026-06-02
---

# Phase 67 Plan 03: Release- und Episode-Credits Public-Query Ebene 2 Summary

**Die oeffentliche Anime-Contributions-Query trennt jetzt anime-weite (release_version_id IS NULL) von versions-spezifischen Beitraegen: eine neue Two-Query-Aggregation attachVersionBreakdowns haengt pro Gruppe die nach Episode -> Version sortierte Versions-Aufschluesselung an, mit denselben Public-Filtern wie Ebene 1.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-06-02T15:08:58Z
- **Completed:** 2026-06-02T15:12:29Z
- **Tasks:** 2
- **Files modified:** 3 (2 neu, 1 modifiziert)

## Accomplishments
- Neue Datei `anime_contributions_public_versions_repository.go` (145 Z.): `attachVersionBreakdowns` (Two-Query-map-Merge wie `attachHiddenCounts`) + DTO `ReleaseVersionBreakdownGroup` (snake_case JSON, Spiegel zu `contributions.ts`).
- Ebene-2-Query filtert `ac.release_version_id IS NOT NULL`, fuehrt dieselben Public-Filter wie Ebene 1 (`is_public_on_anime_page = true AND hfgm.visibility = 'public'`, Information-Disclosure-Mitigation T-67-03-ID), JOIN-Kette `release_versions -> fansub_releases -> episodes`, `ORDER BY ac.fansub_group_id, COALESCE(ep.sort_index, 2147483647), ep.id, rv.version` (D-07).
- Ebene-1-Query (`GetPublicAnimeContributions`) um `AND ac.release_version_id IS NULL` ergaenzt — verhindert Doppelanzeige (Pitfall 2, T-67-03-DBL).
- `attachVersionBreakdowns` wird genau einmal direkt nach `attachHiddenCounts` aufgerufen; `attachHiddenCounts` bleibt unveraendert (gruppenweite Zaehlung, keine Ebenen-Trennung).
- Gruppen mit ausschliesslich versions-spezifischen Beitraegen werden via `ensureVersionGroup` neu in `groups` + `groupIndex` aufgenommen, sodass sie auf der Anime-Seite erscheinen.
- `PublicAnimeContributionGroup` um `VersionBreakdown []ReleaseVersionBreakdownGroup json:"version_breakdown"` erweitert.
- Ebene-1-Datei bleibt mit 400 Zeilen unter dem 450-Limit (nur additive Zeilen).

## Task Commits

Jeder Task wurde atomar committet (TDD: test -> feat):

1. **Task 1: Ebene-2-Aggregation (neue Datei) + DTOs** - `7a7eddac` (test) -> `ce70f685` (feat)
2. **Task 2: Ebene-1-Filter + Verdrahtung attachVersionBreakdowns** - `c05b0fb2` (test) -> `72fbb70d` (feat)

_TDD-Tasks haben je einen test- und einen feat-Commit (Source-Inspection-Tests, konsistent mit Phase-37/67-02-Entscheidung)._

## Files Created/Modified
- `anime_contributions_public_versions_repository.go` (neu) - `attachVersionBreakdowns` + `ensureVersionGroup` + `appendToVersionBreakdown` + `ReleaseVersionBreakdownGroup`-DTO.
- `anime_contributions_public_versions_repository_test.go` (neu) - Source-Contract-Tests: Methoden-Existenz, DTO-Form (snake_case Tags), Query-Filter/JOINs (Ebenen-Trennung + Public-Filter), D-07-Sortierung, Ebene-1-Filter, Verdrahtungs-Reihenfolge (attachVersionBreakdowns nach attachHiddenCounts).
- `anime_contributions_public_repository.go` (mod) - Ebene-1-WHERE um `AND ac.release_version_id IS NULL`; `r.attachVersionBreakdowns(ctx, animeID, &groups, groupIndex)`-Aufruf nach `attachHiddenCounts`; `VersionBreakdown`-Feld am Struct.

## Decisions Made
- `attachVersionBreakdowns` nimmt `*[]PublicAnimeContributionGroup`, weil nur-versions-spezifische Gruppen nachtraeglich eingefuegt werden muessen.
- Das `VersionBreakdown`-Struct-Feld (formal Task-2-Scope laut Plan) wurde im Task-1-feat-Commit mitgeliefert, weil die neue Ebene-2-Datei es referenziert und sonst nicht kompiliert haette; Task 2 fuegte ausschliesslich den Ebene-1-Filter und den Aufruf hinzu.
- Sortier-Reihenfolge der Versions-Bloecke wird aus der SQL ORDER-BY uebernommen (Go haengt neue `release_version_id`-Bloecke am Listenende an), kein Nachsortieren im Go-Code.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Build-Abhaengigkeit zwischen Task 1 und Task 2 (VersionBreakdown-Feld)**
- **Found during:** Task 1 (Ebene-2-Aggregation)
- **Issue:** Der Plan ordnet das Struct-Feld `VersionBreakdown` Task 2 zu, aber die neue Datei aus Task 1 referenziert es und kompiliert ohne das Feld nicht. Ein striktes Aufteilen haette einen nicht-kompilierenden Zwischen-Commit erzeugt.
- **Fix:** Das additive Struct-Feld wurde im feat-Commit von Task 1 mitgeliefert. Task 2 beschraenkte sich auf den Ebene-1-Filter und den Aufruf. Keine Funktionsaenderung gegenueber der Plan-Absicht.
- **Files modified:** anime_contributions_public_repository.go
- **Verification:** go build ./... gruen nach Task-1-feat-Commit.
- **Committed in:** ce70f685 (Task-1-feat)

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** Reine Commit-Granularitaet (kompilierbarer Zwischenstand). Kein Scope-Creep, keine Funktionsabweichung.

## Issues Encountered
- Keine. Build und Tests waren in beiden GREEN-Phasen direkt gruen.

## User Setup Required
None - keine externe Service-Konfiguration. Migration 0091 (release_version_id) ist laut Phase 67-01/67-02 bereits angewendet.

## Next Phase Readiness
- P67-SC2 Backend-Anteil (D-05/D-06/D-07) vollstaendig: getrennte Ebenen, keine Doppelanzeige, Sortierung Episode -> Version, gleiche Public-Filter auf beiden Ebenen.
- Das `version_breakdown`-Feld in der API-Antwort ist bereit fuer die Frontend-Verdrahtung (`ReleaseVersionBreakdown.tsx` + `GroupContributionBlock.tsx`) in einem spaeteren Plan (67-04).

## Threat Surface Scan
- Keine neue Trust-Boundary-Flaeche ausserhalb des `<threat_model>` eingefuehrt. Alle drei registrierten Threats sind mitigiert: T-67-03-ID (identische Public-Filter auf Ebene 2), T-67-03-DBL (Ebene-1-Filter IS NULL), T-67-03-SQLI (parametrisierte $1-Query).

## Self-Check: PASSED

Alle erstellten/geaenderten Dateien existieren auf der Platte; alle 4 Task-Commits (2x test, 2x feat) sind im Git-Log auffindbar.

---
*Phase: 67-release-episode-credits*
*Completed: 2026-06-02*
