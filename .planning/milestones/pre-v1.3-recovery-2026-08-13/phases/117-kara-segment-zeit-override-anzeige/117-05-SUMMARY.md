---
phase: 117-kara-segment-zeit-override-anzeige
plan: 05
subsystem: api
tags: [go, gin, rest, theme-segments, kara-segments, release-versions, permissions, openapi, tdd]

# Dependency graph
requires:
  - phase: 117-02
    provides: "AssignThemeSegmentToReleaseVersion/UnassignThemeSegmentFromReleaseVersion/ListThemeSegmentAssignments und UpsertThemeSegmentEpisodeOverride/DeleteThemeSegmentEpisodeOverride/GetThemeSegmentEpisodeOverride repository CRUD"
  - phase: 117-04
    provides: "GetAnimeSegmentByID/GetSegmentReleaseDuration mit currentReleaseVersionID/Episoden-Parametern, resetAndQueueSegmentRenderAfterChange(ctx, segmentID, releaseVersionID) fuer die release-version-scoped Render-Invalidierung"
provides:
  - "POST /api/v1/admin/anime/:id/segments/:segmentId/assignments -- Kara-Segment einer weiteren Release-Version zuweisen (D-03)"
  - "DELETE .../assignments/:releaseVersionId -- Zuweisung entziehen (D-03)"
  - "PUT .../assignments/:releaseVersionId/override -- Per-Release-Version-Zeit-Override setzen (D-01)"
  - "DELETE .../assignments/:releaseVersionId/override -- Override entfernen, Basis-Zeit greift wieder (D-01)"
  - "adminThemeRepository-Interface um die vier Plan-117-02-Repository-Methoden erweitert"
  - "shared/contracts/admin-content.yaml: vier neue Endpunkte + AdminThemeSegmentAssignmentRequest/AdminThemeSegmentEpisodeOverrideRequest/AdminAnimeSegmentResponse/AdminThemeSegment/AdminThemeSegmentAssignmentEpisode Types"
affects: [117-06, 117-07, 117-09]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Neue, fokussierte Handler-Datei (admin_content_anime_theme_segment_assignments.go) statt Erweiterung der bereits 906-Zeilen-grossen admin_content_anime_theme_segments.go -- gleiche Split-Konvention wie segment_stream.go/segment_render_fanout.go", "requireSegmentManage bleibt der einzige Autorisierungspfad -- kein neues Capability-Gate erfunden", "OpenAPI-Response-Type AdminAnimeSegmentResponse/AdminThemeSegment additiv im admin-content.yaml types:-Block ergaenzt, weil die vier neuen Endpunkte diese Form direkt zurueckgeben (schliesst NICHT rueckwirkend die vorbestehende Doku-Luecke der bestehenden GET/POST/PATCH/DELETE-Segment-CRUD-Endpunkte, Nyquist-Fix W3)"]

key-files:
  created:
    - backend/internal/handlers/admin_content_anime_theme_segment_assignments.go
    - backend/internal/handlers/admin_content_anime_theme_segment_assignments_test.go
  modified:
    - backend/cmd/server/admin_routes.go
    - backend/internal/handlers/admin_content_handler.go
    - backend/internal/handlers/admin_content_fansub_releases_test.go
    - shared/contracts/admin-content.yaml

key-decisions:
  - "adminThemeRepository-Interface um AssignThemeSegmentToReleaseVersion/UnassignThemeSegmentFromReleaseVersion/UpsertThemeSegmentEpisodeOverride/DeleteThemeSegmentEpisodeOverride erweitert (Rule 3, Blocking Issue) -- fansubReleaseThemeRepoStub in admin_content_fansub_releases_test.go musste entsprechend nachgezogen werden, da dieser Stub die volle Schnittstelle ohne Embedding implementiert."
  - "OpenAPI-Response-Typen AdminAnimeSegmentResponse/AdminThemeSegment/AdminThemeSegmentAssignmentEpisode wurden zusaetzlich zu den zwei im Plan explizit geforderten Request-Types ergaenzt, weil die vier neuen Endpunkte diese Form direkt zurueckgeben und ein dangling Type-Verweis (response.type ohne Definition) vermieden werden sollte; das schliesst NICHT die vorbestehende Doku-Luecke der bestehenden Segment-CRUD-Endpunkte (die bleiben laut Plan-Text bewusst undokumentiert)."
  - "String-Felder mit Klammer-Constraint-Text, die einen zweiten Doppelpunkt enthalten (z. B. 'int64 (required, minimum: 1)'), wurden in Anführungszeichen gesetzt (bestehende Konvention an anderer Stelle der Datei, z. B. source_revision), weil unquotierte Varianten bei einem strengen YAML-Parser (js-yaml) an genau dieser Stelle brechen -- live gegen js-yaml verifiziert."
  - "Fuer die Upsert-/Delete-Override-Handler wird requireSegmentManage SOFORT nach dem Parsen der Pfad-Parameter aufgerufen (vor dem Laden des Segments), fuer Assign nach dem Body-Binding (da release_version_id erst aus dem Body bekannt ist) -- exakt wie im Plan-Text vorgegeben, in allen vier Handlern strikt vor jeder Repository-Mutation."

requirements-completed: [D-01, D-03]

# Metrics
duration: ~30min
completed: 2026-07-29
---

# Phase 117 Plan 05: Kara-Zuweisungs- und Zeit-Override-Admin-Endpunkte Summary

**Vier neue, capability-gated Admin-Endpunkte (Zuweisen/Entziehen einer Release-Version, Setzen/Entfernen eines Per-Version-Zeit-Overrides) machen die Backend-Wellen 117-01 bis 117-04 fuer die Admin-UI erreichbar, ohne neue Autorisierungs- oder Validierungslogik einzufuehren.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-07-29T16:08:00Z (approx., nach Abschluss 117-04)
- **Completed:** 2026-07-29T16:38:42Z
- **Tasks:** 2/2 completed
- **Files modified:** 6 (2 neu, 4 geaendert)

## Accomplishments

- `AssignAnimeSegment`/`UnassignAnimeSegment` (D-03) und `UpsertAnimeSegmentEpisodeOverride`/`DeleteAnimeSegmentEpisodeOverride` (D-01) in einer neuen, fokussierten Datei `admin_content_anime_theme_segment_assignments.go` implementiert; jede der vier Funktionen ruft `h.requireSegmentManage` als erste Autorisierungspruefung auf, bevor irgendeine Repository-Mutation stattfindet.
- Override-Validierung nutzt `validateSegmentTimes`/`parseClockToSeconds` 1:1 wieder, mit der Laufzeit DIESER spezifischen Release-Version aus `GetSegmentReleaseDuration` (Episoden-Bereichsfilter aus dem geladenen Segment) -- identische deutsche Fehlermeldung wie beim Basis-Zeitbereich, keine Parallel-Validierung.
- Override gegen eine nicht zugewiesene Release-Version wird ueber die DB-seitige composite FK (`errors.Is(err, repository.ErrConflict)`) als 409 abgelehnt, kein stiller Erfolg.
- Vier neue Routen unter den bestehenden Segment-Routen in `admin_routes.go` registriert, gleiches `auth`-Middleware-Muster.
- `adminThemeRepository`-Interface um die vier Plan-117-02-Repository-Methoden erweitert; der einzige Vollstaendig-implementierende Test-Stub (`fansubReleaseThemeRepoStub`) entsprechend nachgezogen (Rule 3).
- `shared/contracts/admin-content.yaml` additiv um vier Endpunkte (`admin-segment-assign`/`-unassign`/`-episode-override-upsert`/`-episode-override-delete`) im Format von `admin-anime-theme-create` ergaenzt -- in `admin-content.yaml`, NICHT in `episode-versions.yaml` (Nyquist-Fix W3); die Response-Form (`AdminThemeSegment`) wurde als eigener Type ergaenzt, damit kein dangling Type-Verweis entsteht.
- Vier Handler-Verhaltensfaelle live gruen: Assign ohne Capability -> 403, mit Capability -> 201; Override `end_time` vor `start_time` -> 400 mit identischer Meldung wie `validateSegmentTimes`; Override gegen nicht zugewiesene Release-Version -> 409; Delete-Override ohne vorhandenen Override -> 404.

## Task Commits

Each task was committed atomically:

1. **Task 1: Assignment- und Override-Endpunkte + Routing** - `791c65c8` (feat)
2. **Task 2: Handler-Tests + OpenAPI-Contract-Eintrag in admin-content.yaml** - `47eb5a1e` (test)

## Files Created/Modified

- `backend/internal/handlers/admin_content_anime_theme_segment_assignments.go` - NEU: `AssignAnimeSegment`/`UnassignAnimeSegment`/`UpsertAnimeSegmentEpisodeOverride`/`DeleteAnimeSegmentEpisodeOverride` (274 Zeilen)
- `backend/internal/handlers/admin_content_anime_theme_segment_assignments_test.go` - NEU: vier Verhaltensfaelle als eigene Testfunktionen/Subtests
- `backend/cmd/server/admin_routes.go` - vier neue Routen unter den bestehenden Segment-Routen registriert
- `backend/internal/handlers/admin_content_handler.go` - `adminThemeRepository`-Interface um vier Methoden erweitert
- `backend/internal/handlers/admin_content_fansub_releases_test.go` - `fansubReleaseThemeRepoStub` um die vier neuen Interface-Methoden ergaenzt (Rule 3, Blocking Issue)
- `shared/contracts/admin-content.yaml` - vier neue Endpunkte + fuenf neue Types (`AdminThemeSegmentAssignmentRequest`, `AdminThemeSegmentEpisodeOverrideRequest`, `AdminAnimeSegmentResponse`, `AdminThemeSegment`, `AdminThemeSegmentAssignmentEpisode`)

## Decisions Made

Siehe `key-decisions` im Frontmatter. Zusammengefasst: Interface-Erweiterung erzwang einen Stub-Nachzug in einer bestehenden Testdatei (Rule 3); OpenAPI-Response-Typen wurden ueber die zwei plan-geforderten Request-Types hinaus ergaenzt, um einen dangling Type-Verweis zu vermeiden, ohne die bewusst offene Vor-Luecke der bestehenden Segment-CRUD-Endpunkte rueckwirkend zu schliessen; YAML-Werte mit zweitem Doppelpunkt wurden quotiert (bestehende Dateikonvention).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] `fansubReleaseThemeRepoStub` implementierte die erweiterte `adminThemeRepository`-Schnittstelle nicht**
- **Found during:** Task 1 (`go build ./...` nach der Interface-Erweiterung)
- **Issue:** `admin_content_fansub_releases_test.go` deklariert `fansubReleaseThemeRepoStub` als vollstaendige, eigenstaendige Implementierung von `adminThemeRepository` (kein `adminThemeRepository`-Embedding wie bei den neueren Fake-Repos aus Plan 117-04). Nach Erweiterung des Interfaces um die vier neuen Zuweisungs-/Override-Methoden erfuellte dieser bestehende Stub die Schnittstelle nicht mehr -- der Build war rot, bevor irgendein neuer Handler-Code lief.
- **Fix:** Vier No-op-Methoden (`AssignThemeSegmentToReleaseVersion`/`UnassignThemeSegmentFromReleaseVersion`/`UpsertThemeSegmentEpisodeOverride`/`DeleteThemeSegmentEpisodeOverride`) analog zum bestehenden `GetThemeSegmentEpisodeOverride`-Stub-Muster ergaenzt.
- **Files modified:** `backend/internal/handlers/admin_content_fansub_releases_test.go`
- **Verification:** `go build ./...` und die bestehende Testsuite in dieser Datei bleiben gruen.
- **Committed in:** `791c65c8` (Task 1 commit)

**2. [Rule 1 - Bug] Zwei geplante Request-Type-Werte mit unquotiertem zweitem Doppelpunkt haetten einen strengen YAML-Parser gebrochen**
- **Found during:** Task 2 (Verifikation der OpenAPI-Ergaenzung gegen `js-yaml`)
- **Issue:** Die urspruengliche Formulierung `release_version_id: int64 (required, minimum: 1)` (unquotiert) enthaelt einen zweiten `": "`-Sequenz-Indikator innerhalb eines Plain-Scalars, den ein strenger YAML-1.2-Parser als verschachtelte Mapping-Einleitung fehlinterpretiert -- gegen `js-yaml` (bereits im Frontend-`node_modules` vorhanden) live reproduziert (`bad indentation of a mapping entry`). Eine bestehende, aehnliche Stelle in derselben Datei (`source_revision: "int64 (optional, minimum: 1)"`) verwendet bereits Anfuehrungszeichen als Konvention fuer genau diesen Fall.
- **Fix:** Die beiden neuen Felder in `AdminThemeSegmentAssignmentRequest`/`AdminThemeSegmentEpisodeOverrideRequest` in Anfuehrungszeichen gesetzt; anschliessend isolierte Node/js-yaml-Verifikation der neuen `types:`-Sektion bestand.
- **Files modified:** `shared/contracts/admin-content.yaml`
- **Verification:** Isolierte `js-yaml`-Parse-Probe der neuen `endpoints:`- und `types:`-Abschnitte lief fehlerfrei (siehe Verification Evidence); die Datei als Ganzes hat einen vorbestehenden, unveraenderten Parse-Fehler an anderer Stelle (Zeile ~1031, ausserhalb dieses Plans, siehe Issues Encountered).
- **Committed in:** `47eb5a1e` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 Rule 3 blocking-issue fix, 1 Rule 1 bug-fix)
**Impact on plan:** Beide Fixes waren notwendig, damit `go build`/die Testsuite gruen sind bzw. die neue OpenAPI-Ergaenzung selbst nicht denselben Parse-Fehler-Typ reproduziert, den der Rest der Datei bereits hat. Kein Scope-Creep ueber die Plan-Absicht hinaus.

## Issues Encountered

`shared/contracts/admin-content.yaml` hat bereits VOR diesem Plan einen Parse-Fehler fuer strenge YAML-1.2-Parser wie `js-yaml` (verifiziert gegen `git show HEAD~2` -- derselbe Fehlertyp existierte bereits, an einer anderen, von diesem Plan nicht beruehrten Stelle bei Zeile ~928/1031). Das ist kein von diesem Plan eingefuehrter Regressionsfehler; die Datei wird offenbar nicht durch einen strengen YAML-Parser validiert, sondern als informelle, menschenlesbare Contract-Dokumentation gefuehrt. Meine eigenen Ergaenzungen wurden isoliert (per Datei-Ausschnitt) gegen `js-yaml` verifiziert und sind selbst parse-sauber (siehe Verification Evidence).

## Verification Evidence

- `go build ./...` und `go vet ./...` liefen nach jedem Task fehlerfrei (Backend-Repo-Root).
- `go test ./internal/handlers/... -run AnimeSegmentAssignment -v` -- alle vier neuen Testfaelle (inkl. zwei Subtests im ersten) gruen.
- `go test ./internal/handlers/... -run Segment -v` -- alle bestehenden Segment-Tests weiterhin gruen (keine Regression durch die Interface-Erweiterung oder die neuen Routen).
- `go test ./internal/...` -- vollstaendige Backend-Testsuite gruen (alle Pakete `ok`).
- Isolierte `js-yaml`-Parse-Probe (Node, `frontend/node_modules/js-yaml`) der neuen `endpoints:`-Eintraege (18 Endpunkte inkl. der vier neuen) und der neuen `types:`-Eintraege lief jeweils fehlerfrei; derselbe Parser bestaetigte, dass der vorbestehende Parse-Fehler an anderer Stelle der Datei bereits vor diesem Plan existierte (`git show HEAD~2`).

## User Setup Required

Keine. Alle Verifikationsschritte liefen gegen lokale Ressourcen (Go-Toolchain, Node/js-yaml aus `frontend/node_modules`). Der Hinweis im Prompt, dass neue Go-Routen erst nach einem Backend-Container-Rebuild live erreichbar sind, bleibt fuer die spaetere gebuendelte Live-UAT der Phase 117 bestehen (nicht Teil der Build/Test-Abnahme dieses Plans).

## Next Phase Readiness

- Alle vier fachlich benoetigten Admin-Endpunkte fuer D-01/D-03 existieren, sind capability-gated und wiederverwenden bestehende Validierung/Autorisierung vollstaendig -- Plan 117-06 (Admin-UI) kann direkt gegen diese Endpunkte verdrahten.
- OpenAPI-Contract dokumentiert die vier neuen Endpunkte konsistent mit PATTERNS.md/Nyquist-Fix W3 in `admin-content.yaml`; `episode-versions.yaml` bleibt unveraendert.
- Kein Blocker fuer Plan 117-06. Die Backend-Container-Rebuild-Notwendigkeit fuer Live-Erreichbarkeit bleibt fuer die gebuendelte Phase-117-Live-UAT dokumentiert (siehe `project_phase_117_execution_pending.md`-Memory).

---
*Phase: 117-kara-segment-zeit-override-anzeige*
*Completed: 2026-07-29*

## Self-Check: PASSED

All created files verified present on disk (`admin_content_anime_theme_segment_assignments.go`,
`admin_content_anime_theme_segment_assignments_test.go`, `117-05-SUMMARY.md`). Task commits
`791c65c8` and `47eb5a1e` verified present in `git log`.
