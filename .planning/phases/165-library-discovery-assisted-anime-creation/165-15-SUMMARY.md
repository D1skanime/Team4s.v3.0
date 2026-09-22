---
phase: 165-library-discovery-assisted-anime-creation
plan: 15
subsystem: backend-jellyfin-discovery
tags: [jellyfin, discovery, search, cache, singleflight, gap-closure]
dependency-graph:
  requires: [165-01, 165-06]
  provides: [discovery-search-title-folder-scoped, discovery-snapshot-singleflight]
  affects: [backend/internal/handlers/jellyfin_discovery.go, backend/internal/handlers/jellyfin_discovery_cache.go]
tech-stack:
  added: []
  patterns: ["golang.org/x/sync/singleflight.Group for in-flight request de-duplication"]
key-files:
  created: []
  modified:
    - backend/internal/handlers/jellyfin_discovery.go
    - backend/internal/handlers/jellyfin_discovery_test.go
    - backend/internal/handlers/jellyfin_discovery_cache.go
    - backend/internal/handlers/jellyfin_discovery_cache_test.go
    - backend/internal/handlers/admin_content_handler.go
    - backend/go.mod
decisions:
  - "golang.org/x/sync promoted from indirect to direct dependency via go mod tidy (already transitively vetted, no new package install)."
  - "The shared singleflight fetch uses context.Background() instead of the triggering caller's request context, so one caller's cancellation cannot abort the fetch for other concurrent waiters sharing the same in-flight call."
metrics:
  duration: "~40min"
  completed: 2026-09-22
---

# Phase 165 Plan 15: Discovery search scope + concurrent snapshot rebuild dedup Summary

Discovery-Suche filtert jetzt nur noch auf Titel und den eigenen Jellyfin-Ordnernamen statt auf
den vollen Pfad (GAP-14); gleichzeitige Snapshot-Rebuilds werden per `singleflight.Group` auf
genau einen echten Jellyfin-Request gebündelt (GAP-15). GAP-09s bereits ausgelieferte
Filter-vor-Truncate-Logik wurde als weiterhin grün bestätigt, keine Codeänderung nötig.

## What Was Built

### Task 1 — GAP-14: Suche trifft Titel/Ordnername, nicht den vollen Pfad

`buildSortedJellyfinDiscoveryEntries` (`backend/internal/handlers/jellyfin_discovery.go`) prüfte
den Freitext-Query bisher gegen `item.Name` **und den vollen `item.Path`**. Da praktisch alle
Bibliothekseinträge unter demselben Präfix liegen (`/media/Anime/Serie/Anime.TV.Sub/…`), traf ein
Query wie `media` fast jeden Eintrag — die Suche war effektiv nutzlos.

Fix: der Pfad-Zweig prüft jetzt nur noch den **eigenen Ordnernamen** (letztes Pfadsegment),
extrahiert mit derselben Konvention wie `episodeImportFileName` in `admin_episode_import.go`
(`path.Base(strings.ReplaceAll(item.Path, "\\", "/"))`, lowercased). Titel-Match bleibt
unverändert; ein geteiltes Eltern-Präfix matcht nicht mehr.

Neuer Test `TestJellyfinDiscovery_SearchMatchesTitleOrFolderNameNotFullPath`:
- `q=media` (geteiltes Präfix-Segment) → 0 Treffer
- `q=naruto` → genau der Naruto-Eintrag (Titel-Match)
- `q=legacy` (nur im Ordnernamen `Bleach.Legacy.Sub`, nicht im Titel `Bleach`) → genau der
  Bleach-Eintrag, beweist den Ordnername-Zweig unabhängig vom Titel-Zweig

Alle bestehenden `TestJellyfinDiscovery_*`-Suchtests (u. a.
`TestJellyfinDiscovery_NoFuzzyMatchBetweenSimilarTitles`) bleiben unverändert grün.

### Task 2 — GAP-15: gleichzeitige Snapshot-Rebuilds werden gebündelt

`AdminContentHandler` bekommt ein neues Feld `discoverySnapshotGroup singleflight.Group`
(zero-value-ready, keine Konstruktor-Änderung nötig, `backend/internal/handlers/admin_content_handler.go`).

`buildJellyfinDiscoverySnapshot` (`backend/internal/handlers/jellyfin_discovery_cache.go`) ruft
`fetchJellyfinDiscoverySnapshot` jetzt über `h.discoverySnapshotGroup.Do(discoverySnapshotCacheKey, ...)`
auf. Eine TTL-Ablauf-Race oder zwei gleichzeitige "Aktualisieren"-Klicks lösen dadurch genau
**einen** echten Jellyfin-Request aus statt N überlappenden — alle wartenden Aufrufer teilen sich
dasselbe Ergebnis (Erfolg oder Fehler). Der geteilte Fetch läuft bewusst mit `context.Background()`
statt dem auslösenden Request-Kontext, damit die Stornierung eines Aufrufers den Fetch für die
übrigen wartenden Aufrufer nicht abbricht (per Kommentar im Code dokumentiert). Der Cache-Write
(`writeDiscoverySnapshotCache`) bleibt außerhalb des singleflight-Calls und läuft unverändert wie
zuvor nach jedem Aufruf (best-effort, idempotent).

Neuer Test `TestJellyfinDiscoveryCache_ConcurrentRebuildsSingleFlight`: 5 parallele Goroutinen
rufen `buildJellyfinDiscoverySnapshot` bei leerem Cache auf; der Fake-Jellyfin-Server verzögert
seine erste Antwort um 50ms, damit die Aufrufer echt überlappen. Assertion: genau 1 Upstream-Request
(`atomic`-Zähler), alle 5 Aufrufer erhalten dasselbe erfolgreiche Ergebnis. 20 Wiederholungsläufe
(`-count=20`) bestätigten die Zuverlässigkeit ohne Flakiness.

`golang.org/x/sync` war bereits transitiv vorhanden (`go.mod`/`go.sum`, keine neue Dependency);
`go mod tidy` (ausgeführt in einem `golang:1.25-alpine`-Container mit dem Host-`backend/`-Verzeichnis
gemountet, da der laufende Backend-Dev-Container das Quellverzeichnis nicht live mountet) hat den
Eintrag von `// indirect` auf direct promoted. `go.sum` blieb unverändert (keine neue Zeile, keine
neue Prüfsumme).

### GAP-09-Bestätigung (keine Codeänderung)

`buildJellyfinDiscoveryFilteredPage` löst laut Code bereits heute den Status für das GESAMTE
verbleibende Scan-Fenster auf, bevor auf `limit` gekürzt wird (kommt aus commit `bf6cc886`).
`TestJellyfinDiscovery_HasMoreReflectsGenuineFilterMatches` und
`TestJellyfinDiscovery_FilteredPaginationAdvancesAcrossRawWindow` laufen unverändert grün mit —
GAP-09s Backend-Hälfte ist bestätigt intakt, kein `<missing>`-Eintrag für GAP-09 in diesem Plan.

## Tests Run (tatsächlich ausgeführt, mit Ergebnis)

Alle Backend-Tests liefen im neu gebauten `team4sv30-backend`-Dev-Container
(`docker compose up -d --build team4sv30-backend`, wie von den operativen Vorgaben verlangt — kein
`docker cp`).

**Unit-/Handler-Tests (`go test ./internal/handlers/... -run "TestJellyfinDiscoveryCache|TestJellyfinDiscovery" -v -count=1`), Paket `team4s.v3/backend/internal/handlers`:**

| Test | Ergebnis |
|---|---|
| TestJellyfinDiscoveryCache_FilteredBranch_OneRequestPerLibrary | PASS |
| TestJellyfinDiscoveryCache_GlobalFallbackBranch_D27 | PASS |
| TestJellyfinDiscoveryCache_DedupAcrossLibraries | PASS |
| TestJellyfinDiscoveryCache_PaginationSafetyNetAtScale | PASS |
| TestJellyfinDiscoveryCache_CacheHitAndBypass | PASS |
| TestJellyfinDiscoveryCache_UpstreamFailureReturnsError | PASS |
| TestJellyfinDiscoveryCache_UpstreamFailureOnOneLibraryReturnsError | PASS |
| TestJellyfinDiscoveryCache_ConcurrentRebuildsSingleFlight (NEU, Task 2) | PASS (auch mit `-count=20`, 20/20 PASS) |
| TestJellyfinDiscoveryCache_GlobalFallbackExcludesNonAnimeLibraryTypes | PASS |
| TestJellyfinDiscoveryIgnore_Ignore_WritesAuditEntry | PASS |
| TestJellyfinDiscoveryIgnore_Unignore_WritesAuditEntry | PASS |
| TestJellyfinDiscoveryIgnore_Ignore_IsIdempotent | PASS |
| TestJellyfinDiscoveryIgnore_FailingAuditWriteDoesNotFailResponse | PASS |
| TestJellyfinDiscoveryIgnore_NilAuditLogRepoDoesNotPanic | PASS |
| TestJellyfinDiscoveryUnignore_NilAuditLogRepoDoesNotPanic | PASS |
| TestJellyfinDiscoveryIgnore_ZeroAppUserIDNilsActorPointer | PASS |
| TestJellyfinDiscoveryUnignore_ZeroAppUserIDNilsActorPointer | PASS |
| TestJellyfinDiscovery_OpenStatus | PASS |
| TestJellyfinDiscovery_ExistingStatus | PASS |
| TestJellyfinDiscovery_NoFuzzyMatchBetweenSimilarTitles | PASS |
| TestJellyfinDiscovery_SearchMatchesTitleOrFolderNameNotFullPath (NEU, Task 1) | PASS |
| TestJellyfinDiscovery_LibraryContext_D24 | PASS |
| TestJellyfinDiscovery_MovieTypeHintVisible | PASS |
| TestJellyfinDiscovery_PaginationNoFanOut | PASS |
| TestJellyfinDiscovery_ScalePaginationAndBudget_D29 | PASS |
| TestJellyfinDiscovery_FilterIgnored | PASS |
| TestJellyfinDiscovery_HasMoreReflectsGenuineFilterMatches (GAP-09-Regression) | PASS |
| TestJellyfinDiscovery_FilteredPaginationAdvancesAcrossRawWindow (GAP-09-Regression) | PASS |

27/27 PASS, 0 FAIL, 0 SKIP.

**`go build ./...`**: PASS (keine Fehler).
**`go vet ./...`**: PASS (clean, keine Warnungen).

**Go-Integrationstest gegen die echte Test-Datenbank (Pflicht laut operativen Vorgaben, DSN-Gate
tatsächlich erfüllt, keine Tests übersprungen):**

Dieser Plan ändert keinen Repository-/DB-Code (nur Handler-Schicht mit Fake-Repos). Um die
operative Vorgabe trotzdem zu erfüllen und die unveränderte Repository-Abhängigkeit dieses Plans
(`libraryDiscoveryIgnoreRepo`, verwendet in `buildJellyfinDiscoveryFilteredPage`) gegen die echte
DB zu bestätigen, lief die bestehende DSN-gegated Integrationssuite
`internal/repository/library_discovery_ignored_items_test.go` über einen `golang:1.25-alpine`-Container
im Docker-Netz `team4s_default`, DSN abgeleitet von der Backend-Container-`DATABASE_URL` mit
getauschtem Datenbanknamen auf die separate, bereits migrierte Test-DB `team4s_library_discovery_test`
(Migration 170 aktuell, keine Änderung an `team4s_v2`):

```
TEAM4S_LIBRARY_DISCOVERY_TEST_DSN=postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_library_discovery_test?sslmode=disable
```

| Test | Paket | Ergebnis |
|---|---|---|
| TestLibraryDiscoveryIgnoredItems_DatabaseNameGuardRejectsTeam4sV2 | internal/repository | PASS |
| TestLibraryDiscoveryIgnoredItems_InsertIsIdempotent | internal/repository | PASS |
| TestLibraryDiscoveryIgnoredItems_FindIssuesExactlyOneQueryAndReturnsIgnoredSubset | internal/repository | PASS |
| TestLibraryDiscoveryIgnoredItems_FindQueryCountStaysConstantAsInputGrows | internal/repository | PASS |
| TestLibraryDiscoveryIgnoredItems_RemoveUnignores | internal/repository | PASS |
| TestLibraryDiscoveryIgnoredItems_ServerKeyDefaultsToDefaultAtDBLevel | internal/repository | PASS |
| TestLibraryDiscoveryIgnoredItems_ActorAppUserIDIsStoredVerbatim | internal/repository | PASS |

7/7 PASS gegen die echte Postgres-Test-DB, DSN-Gate bestätigt erfüllt (kein Test übersprungen).
Keine dedizierte DB-Integrationssuite existiert im Repo für `FindExistingAnimeByJellyfinIntakeRefs`
(`admin_content_jellyfin_intake.go`) — diese Methode ist unverändert von diesem Plan und wird über
Handler-Fakes abgedeckt (`fakeDiscoveryExistingMatchRepo` in `jellyfin_discovery_test.go`).

## Deviations from Plan

None — plan executed exactly as written. Both tasks matched their `<action>`/`<behavior>` blocks;
`go.sum` required no changes (dependency was already fully resolved, only the `go.mod` require-block
comment changed from `// indirect` to direct).

### Operational note (not a deviation, documented for traceability)

The running `team4sv30-backend` dev container does not bind-mount `backend/` source live (compose
`develop.watch` requires an explicit `docker compose watch` process that was not running); code
edits only take effect after `docker compose up -d --build team4sv30-backend`. This plan rebuilt
the container after each edit (twice: once after Task 1 code+test changes, once after Task 2
code+test changes) before running verification — consistent with the operational constraint to
always rebuild via `docker compose up -d --build team4sv30-backend`, never `docker cp`.

## Known Stubs

None.

## Threat Flags

None. This plan's threat register (T-165-22 DoS mitigation via singleflight, T-165-23 accepted
narrowing of search scope) was already declared in the plan and both are addressed as designed —
no new undeclared surface introduced.

## Self-Check: PASSED

- FOUND: backend/internal/handlers/jellyfin_discovery.go (modified, path import + folder-basename search)
- FOUND: backend/internal/handlers/jellyfin_discovery_test.go (modified, new GAP-14 test)
- FOUND: backend/internal/handlers/jellyfin_discovery_cache.go (modified, singleflight wrap)
- FOUND: backend/internal/handlers/jellyfin_discovery_cache_test.go (modified, new GAP-15 test)
- FOUND: backend/internal/handlers/admin_content_handler.go (modified, discoverySnapshotGroup field + import)
- FOUND: backend/go.mod (modified, golang.org/x/sync promoted to direct)
- FOUND commit 5c9d962d (Task 1)
- FOUND commit c4e25836 (Task 2)
