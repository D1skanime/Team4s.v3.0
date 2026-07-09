---
phase: 99-ffentliches-fansub-member-profil-redesign
plan: "19"
subsystem: api
tags: [go, gin, pgx, openapi, typescript, fansub]

# Dependency graph
requires:
  - phase: 99 (Add-on 5)
    provides: bestehende PublicFansubProfileResponse/listPublicFansubMedia/listPublicFansubProjects Basis
provides:
  - PublicFansubProfileResponse.Stories ([]PublicFansubStory) statt Einzel-Story
  - PublicFansubProject.BannerURL (aufgeloest aus anime.banner_resolved_url/banner_asset_id)
  - listPublicFansubMedia respektiert fgm.sort_order vor created_at/id
affects: [99-20]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - backend/internal/models/fansub.go
    - backend/internal/repository/fansub_repository.go
    - backend/internal/repository/fansub_repository_test.go
    - shared/contracts/openapi.yaml
    - frontend/src/types/fansub.ts

key-decisions:
  - "banner_url wird ueber publicMediaURLForPath normalisiert (nicht direkt aus SQL uebernommen), da banner_resolved_url sowohl bereits aufgeloeste http(s)-URLs als auch rohe media_files.path-Werte liefern kann"
  - "TS PublicFansubProfile.story bleibt in diesem Plan bewusst unveraendert (Migration auf stories[] folgt in 99-20), damit npm run typecheck gruen bleibt"
  - "openapi.yaml + frontend/src/types/fansub.ts wurden durch einen parallelen main-Commit (33b8a164) mit-persistiert, bevor der eigene Task-2-Commit erstellt werden konnte; Inhalt wurde gegen PLAN.md geprueft und ist korrekt (kein Datenverlust, siehe Deviations)"

patterns-established: []

requirements-completed: ["AO6-01", "AO6-02", "AO6-03"]

# Metrics
duration: 35min
completed: 2026-07-09
---

# Phase 99 Plan 19: Public-DTO stories[] + banner_url + sort_order-Order Summary

**Backend-Public-DTO fuer /fansubs/[slug] additiv erweitert: PublicFansubProfileResponse liefert jetzt stories[] (alle veroeffentlichten Geschichts-Bloecke statt nur des ersten), Projekt-Karten tragen banner_url (aus Anime-Banner aufgeloest), und die Medien-Reihenfolge folgt dem im Admin gesetzten sort_order.**

## Performance

- **Duration:** ca. 35 min
- **Started:** 2026-07-09T~10:30:00Z
- **Completed:** 2026-07-09T~11:05:00Z
- **Tasks:** 2/2 completed
- **Files modified:** 5

## Accomplishments

- **AO6-03 (mehrere Geschichts-Bloecke):** `PublicFansubProfileResponse.Story *PublicFansubStory` wurde durch `Stories []PublicFansubStory` ersetzt. Der Single-Story-Loader `getPublicFansubStory` (mit `LIMIT 1`) wurde zu `listPublicFansubStories` umgebaut, der ALLE Zeilen mit `visibility='public' AND status='published' AND deleted_at IS NULL`, sortiert `ORDER BY sort_order ASC, id ASC`, zurueckgibt (leerer Slice statt nil). Kein Go-Konsument referenziert mehr `resp.Story`/`.Story` auf diesem Struct (per Grep bestaetigt).
- **AO6-01 (Anime-Banner in Projekt-Karten):** `PublicFansubProject.BannerURL *string` ergaenzt. `listPublicFansubProjects` selektiert zusaetzlich `COALESCE(NULLIF(BTRIM(a.banner_resolved_url), ''), (SELECT bmf.path FROM media_files bmf WHERE bmf.media_id = a.banner_asset_id AND (bmf.variant='original' OR bmf.variant IS NULL) AND bmf.status='ready' ORDER BY bmf.id ASC LIMIT 1))` per Subquery (keine Join-Zeilen-Vervielfachung) und normalisiert das Ergebnis ueber die bestehende `publicMediaURLForPath`-Hilfsfunktion (analog zu Thumbnail/Original in `listPublicFansubMedia`), damit sowohl bereits aufgeloeste http(s)-URLs als auch rohe Storage-Pfade konsistent behandelt werden.
- **AO6-02 (Medien-Reihenfolge):** `listPublicFansubMedia` sortiert jetzt `ORDER BY fgm.sort_order ASC, ma.created_at ASC, ma.id ASC` statt nur nach `created_at`/`id` — die im Admin gesetzte Reihenfolge wird oeffentlich uebernommen.
- OpenAPI-Contract (`PublicFansubProject.banner_url`, `PublicFansubProfile.stories[]` inkl. angepasstem `required`-Array) und additives TS-Feld (`PublicFansubProject.banner_url`) konsistent nachgezogen. `PublicFansubProfile.story` in TS bleibt bewusst unveraendert — die breaking Migration auf `stories[]` inkl. aller Frontend-Konsumenten erfolgt planmaessig erst in 99-20.
- `TestFansubRepository_PublicProfileSourceInvariants` pinnt die neuen Fragmente (`listPublicFansubStories`, `ORDER BY fgm.sort_order ASC`, `banner_resolved_url`) und bleibt gruen.

## Task Commits

Each task was committed atomically:

1. **Task 1: Go-Model + Repository (banner_url, sort_order-Order, stories[])** - `86ce8d57` (feat)
2. **Task 2: Repo-Source-Invarianten-Test aktualisiert** - `a86436ee` (test)
   - Die OpenAPI- und TS-Aenderungen aus Task 2 (`shared/contracts/openapi.yaml`, `frontend/src/types/fansub.ts`) wurden durch einen zeitgleichen main-Commit eines parallelen Quick-Task-Agenten (`33b8a164 fix(quick): default contribution visibility and project counts`) mit-committet, bevor der eigene atomare Commit dafuer erstellt werden konnte (siehe Deviations unten).

**Plan metadata:** (folgt in separatem Metadaten-Commit)

## Files Created/Modified

- `backend/internal/models/fansub.go` - `PublicFansubProfileResponse.Stories []PublicFansubStory` (statt `Story *PublicFansubStory`), `PublicFansubProject.BannerURL *string` ergaenzt
- `backend/internal/repository/fansub_repository.go` - `GetPublicProfileBySlug` befuellt `resp.Stories`; `getPublicFansubStory` -> `listPublicFansubStories` (alle Bloecke, kein `LIMIT 1`); `listPublicFansubProjects` SELECT/Scan um `banner_url`-Subquery + `publicMediaURLForPath`-Normalisierung erweitert; `listPublicFansubMedia` `ORDER BY` um `fgm.sort_order ASC` vorangestellt
- `backend/internal/repository/fansub_repository_test.go` - Fragmentliste um `listPublicFansubStories`, `"ORDER BY fgm.sort_order ASC"`, `banner_resolved_url` erweitert
- `shared/contracts/openapi.yaml` - `PublicFansubProject.banner_url` (nullable string) ergaenzt; `PublicFansubProfile.story` (oneOf, nullable) durch `stories` (array von `PublicFansubStory`) ersetzt, `required`-Array angepasst
- `frontend/src/types/fansub.ts` - `PublicFansubProject.banner_url?: string | null` additiv ergaenzt; `PublicFansubProfile.story` bewusst unveraendert gelassen (Migration folgt 99-20)

## Decisions Made

- `banner_url` wird nicht direkt aus dem SQL-Resultat gescannt, sondern ueber `publicMediaURLForPath` normalisiert (gleiches Muster wie `ThumbnailURL`/`OriginalURL` in `listPublicFansubMedia`), da `anime.banner_resolved_url` je nach Provider entweder bereits eine vollstaendige http(s)-URL oder ein roher Storage-Pfad sein kann; nur letzterer muss auf `/media/...` umgeschrieben werden.
- TS `PublicFansubProfile.story` bleibt in diesem Plan unveraendert (`story: PublicFansubStory | null`) — die vollstaendige Frontend-Migration auf `stories[]` inkl. aller Konsumenten in `page.tsx` erfolgt bewusst erst in Plan 99-20, damit `npm run typecheck` in diesem Plan gruen bleibt.

## Deviations from Plan

### Auto-fixed Issues

None — Task 1 und Task 2 wurden wie geplant umgesetzt, keine Bugfixes/Erweiterungen ueber den Plan hinaus noetig.

### Sonstige Beobachtung (kein Rule-1/2/3-Fix, aber dokumentationswuerdig)

**1. Paralleler main-Commit hat unfertige Task-2-Aenderungen mit-persistiert**
- **Gefunden waehrend:** Vorbereitung des Task-2-Commits (`git status`/`git diff` zeigte, dass `shared/contracts/openapi.yaml` und `frontend/src/types/fansub.ts` bereits "clean" waren, obwohl der Executor sie gerade erst editiert hatte).
- **Ursache:** Ein zeitgleich auf demselben Working Tree laufender Quick-Task-Agent hat zwischen den beiden Executor-Tasks einen eigenen Commit (`33b8a164 fix(quick): default contribution visibility and project counts`) erstellt und dabei offenbar breiter als noetig gestaged, wodurch die zu diesem Zeitpunkt unstaged liegenden AO6-01/AO6-03-Aenderungen dieses Plans (banner_url in openapi.yaml/fansub.ts, stories[]-Schema) mit in seinen Commit gerutscht sind.
- **Pruefung:** `git show 33b8a164 -- shared/contracts/openapi.yaml` und `git show 33b8a164 -- frontend/src/types/fansub.ts` bestaetigen, dass genau die von diesem Plan vorgesehenen Hunks (banner_url-Property, stories-Array-Schema/required-Array, additives TS-Feld) unveraendert und korrekt enthalten sind — kein Datenverlust, keine inhaltliche Abweichung vom Plan.
- **Massnahme:** Kein Revert/Recommit noetig, da der Inhalt korrekt ist. Der eigene Task-2-Commit (`a86436ee`) enthaelt nur noch die verbleibende, tatsaechlich noch unstaged/eigene Aenderung (`fansub_repository_test.go`) und dokumentiert im Commit-Body den Zusammenhang mit `33b8a164`.
- **Files betroffen:** `shared/contracts/openapi.yaml`, `frontend/src/types/fansub.ts` (Inhalt korrekt, nur Commit-Zuordnung abweichend vom Plan-Task-Schnitt).

---

**Total deviations:** 0 Rule-1/2/3-Fixes; 1 dokumentierte Beobachtung zu parallelem main-Commit (kein Code-Risiko).
**Impact on plan:** Keiner — alle Acceptance-Criteria sind inhaltlich erfuellt, nur die Commit-Granularitaet von Task 2 weicht geringfuegig vom Plan ab (zwei separate main-Commits statt einem statt einem Task-2-Commit fuer alle drei Dateien).

## Issues Encountered

- Docker-Daemon war zum Ausfuehrungszeitpunkt nicht erreichbar (`docker compose up -d --build team4sv30-backend` schlug mit "failed to connect to the docker API ... npipe" fehl). Live-Verifikation des Endpunkts `/api/v1/fansub-slugs/c-subs/public-profile` (stories[]/banner_url im echten JSON) konnte daher **nicht** durchgefuehrt werden. Stattdessen wurde vollstaendig code-seitig verifiziert: `go build ./...` (gruen), `go test ./...` (alle Pakete gruen, inkl. `TestFansubRepository_PublicProfileSourceInvariants`), `npm run typecheck` (gruen). Diese Live-Verifikation sollte vor/mit Plan 99-20 nachgeholt werden, sobald Docker verfuegbar ist.
- Hinweis (nicht-blockierend, laut Planvorgabe): Zwischen diesem Plan und 99-20 kann die Live-Seite `/fansubs/[slug]` bei Gruppen mit mehreren Geschichts-Bloecken kurzzeitig nur den ersten Block zeigen (Frontend liest weiterhin `profile.story` einzeln, bis 99-20 auf `stories[]` migriert) — Live-UAT der vollstaendigen Geschichte ist erst nach 99-20 sinnvoll.

## User Setup Required

None - keine externe Service-Konfiguration noetig. Docker-Neubau/Live-Check des Backends steht als Nachtrag aus (siehe Issues Encountered).

## Next Phase Readiness

- Backend-DTO-Basis fuer AO6-01/02/03 ist vollstaendig: `Stories[]`, `BannerURL`, sort_order-Medien-Order sind implementiert, getestet (Go build+test gruen) und Contract-seitig (OpenAPI) dokumentiert.
- Additives TS-Feld `banner_url` ist verfuegbar; `npm run typecheck` bleibt gruen, da `PublicFansubProfile.story` bewusst noch nicht auf `stories[]` migriert wurde.
- Plan 99-20 kann direkt auf `stories[]` migrieren (TS-Typ + alle Frontend-Konsumenten in `page.tsx`/`FansubStorySection.tsx`) sowie `banner_url` in den Projekt-Karten/Karussell (AO6-06) konsumieren.
- Offener Nachtrag: Docker-Backend-Rebuild + Live-Check von `/api/v1/fansub-slugs/c-subs/public-profile` (stories als Array, banner_url null/gesetzt) sollte nachgeholt werden, sobald der Docker-Daemon laeuft — kein Blocker fuer 99-20, da code-seitig vollstaendig verifiziert.

---
*Phase: 99-ffentliches-fansub-member-profil-redesign*
*Completed: 2026-07-09*

## Self-Check: PASSED

- FOUND: backend/internal/models/fansub.go
- FOUND: backend/internal/repository/fansub_repository.go
- FOUND: backend/internal/repository/fansub_repository_test.go
- FOUND: shared/contracts/openapi.yaml
- FOUND: frontend/src/types/fansub.ts
- FOUND: .planning/phases/99-ffentliches-fansub-member-profil-redesign/99-19-SUMMARY.md
- FOUND commit: 86ce8d57 (feat, Task 1)
- FOUND commit: a86436ee (test, Task 2)
- FOUND commit: 33b8a164 (parallel main commit that co-persisted openapi.yaml/fansub.ts changes for Task 2, content verified correct)
