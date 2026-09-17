---
phase: 162-oeffentliche-anime-seite-fansub-gruppenauswahl-kurzgeschichte-navigation
plan: 01
subsystem: api
tags: [go, postgres, lateral-join, openapi, typescript, fansub]

# Dependency graph
requires: []
provides:
  - "FansubGroupSummary.StoryPreview: additive Go/OpenAPI/TS field carrying a rune-safe truncated preview of a fansub group's first public, published story"
  - "ListAnimeFansubs returns story_preview in a single bundled query (LEFT JOIN LATERAL), no N+1"
  - "truncateStoryPreviewRunes: reusable rune-safe truncation helper in the repository package"
affects: [162-02, 162-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "LEFT JOIN LATERAL ... ON true for bundling a per-row 'first matching child row' subquery without N+1"
    - "Rune-based (not byte-based) string truncation for user-facing multi-byte text via []rune slicing"

key-files:
  created:
    - backend/internal/repository/fansub_story_preview_postgres_test.go
  modified:
    - backend/internal/models/fansub.go
    - backend/internal/repository/fansub_repository.go
    - backend/internal/repository/fansub_repository_test.go
    - shared/contracts/openapi.yaml
    - frontend/src/types/fansub.ts

key-decisions:
  - "story_preview additive, optional (omitempty/nullable) in Go/OpenAPI/TS — not added to any required list, since FansubGroupSummary is shared by other unrelated endpoints that never populate it"
  - "Truncation limit fixed at 500 runes (fansubStoryPreviewRuneLimit), matching D-06's 'sinnvolle Obergrenze' guidance"
  - "Whitespace-only body_text is treated as 'no story' (returns nil), matching D-05/§7 semantics"

patterns-established:
  - "Rune-safe preview truncation ([]rune slicing, never byte slicing) for any future user-facing text truncation on multi-byte content"

requirements-completed: [REQ-162-10, REQ-162-16, REQ-162-17]

# Metrics
duration: 35min
completed: 2026-09-17
---

# Phase 162 Plan 01: Rune-sichere Fansub-Kurzgeschichten-Vorschau (Backend/Contract) Summary

**`ListAnimeFansubs` liefert `story_preview` jetzt gebündelt über einen additiven `LEFT JOIN LATERAL` auf `fansub_group_notes`, rune-sicher auf 500 Zeichen gekürzt, ohne zusätzlichen Request pro Gruppe.**

## Performance

- **Duration:** ca. 35 Minuten
- **Started:** 2026-09-17T08:24:00Z (ca.)
- **Completed:** 2026-09-17T08:35:00Z (ca.)
- **Tasks:** 3/3 abgeschlossen
- **Files modified:** 6 (5 geändert, 1 neu)

## Accomplishments
- `ListAnimeFansubs` liefert die erste öffentliche, veröffentlichte Geschichte jeder Gruppe (`body_text`, rune-sicher gekürzt) in derselben Query — bewiesen kein N+1 (eine SQL-Query, ein Roundtrip)
- Rune-sichere Kürzung (`truncateStoryPreviewRunes`) durch 5 echte Unit-Test-Fälle bewiesen, inklusive eines 600-Rune-Umlauttexts, der exakt auf 500 gültige UTF-8-Runes gekürzt wird
- Neuer, echt gegen Postgres laufender Integrationstest beweist Filterung (`visibility='public'`, `status='published'`, `deleted_at IS NULL`), Sortierung (`sort_order ASC, id ASC`) und die unveränderte äußere Gruppenreihenfolge (`is_primary DESC, name ASC`) end-to-end — inklusive eines echten Laufs gegen eine temporäre, danach wieder gelöschte Testdatenbank (nicht nur der SKIP-Pfad)
- OpenAPI-Schema und TS-Typ additiv synchron erweitert, Typecheck grün

## Task Commits

Each task was committed atomically:

1. **Task 1: Rune-sichere Story-Vorschau — Go-Model, SQL-Erweiterung, Scan** - `028fe6cc` (feat)
2. **Task 2: OpenAPI- und TS-Contract-Sync für story_preview** - `70074828` (docs)
3. **Task 3: Postgres-Integrationstest für die LATERAL-Join-Erweiterung** - `83e17d22` (test)

**Plan metadata:** siehe finaler docs-Commit dieses Plans

## Files Created/Modified
- `backend/internal/models/fansub.go` - `FansubGroupSummary.StoryPreview *string` additiv angehängt
- `backend/internal/repository/fansub_repository.go` - `fansubStoryPreviewRuneLimit`-Konstante, `truncateStoryPreviewRunes`-Funktion, `ListAnimeFansubs` um `LEFT JOIN LATERAL` auf `fansub_group_notes` erweitert
- `backend/internal/repository/fansub_repository_test.go` - `TestTruncateStoryPreviewRunes` (5 Verhaltensfälle) ergänzt; bestehender Pin-Test unangetastet
- `backend/internal/repository/fansub_story_preview_postgres_test.go` - neuer, env-DSN-gateter Postgres-Integrationstest `TestListAnimeFansubs_StoryPreview`
- `shared/contracts/openapi.yaml` - `FansubGroupSummary.story_preview` (optional, nullable) additiv
- `frontend/src/types/fansub.ts` - `FansubGroupSummary.story_preview?: string | null` additiv

## Decisions Made
- Kürzungsgrenze fest auf 500 Runes (`fansubStoryPreviewRuneLimit`) gesetzt, wie in Task-Vorgabe/RESEARCH.md spezifiziert
- Nur-Whitespace-Text gilt als "keine Geschichte" (`nil`), analog zu D-05/§7 ("Ist `body_text` leer, gilt die Gruppe als „ohne Geschichte"")
- `story_preview` bewusst NICHT in `required` aufgenommen (OpenAPI/TS), da `FansubGroupSummary` auch von `PublicEpisodeVersion.fansub_groups[]`/`FansubProjectResolution` genutzt wird, die das Feld nie befüllen

## Deviations from Plan

### Auto-fixed Issues

None — keine Abweichungen im engeren Sinn (Rule 1-4). Ein bereits vorbestehender, planfremder Test-Fehlschlag wurde entdeckt, aber NICHT behoben (siehe unten).

### Out-of-Scope Discovery (nicht behoben, dokumentiert)

Beim Verifikationslauf `go test ./internal/repository -run 'Fansub'` schlägt
`TestFansubRepository_PublicProfileSourceInvariants` fehl (erwartet den String `"FROM anime_media am"`
im Quelltext von `fansub_repository.go`, der dort nicht mehr vorkommt). Per `git diff b6320e14 HEAD --
backend/internal/repository/fansub_repository.go` bestätigt: dieser Fehlschlag existierte bereits VOR
Beginn von Plan 162-01 (mein Diff berührt ausschließlich `ListAnimeFansubs`, nicht
`GetPublicProfileBySlug`). Außerhalb des Scopes (Deviation-Regeln, "Scope Boundary") — nicht
gefixt, dokumentiert in `.planning/phases/162-oeffentliche-anime-seite-fansub-gruppenauswahl-kurzgeschichte-navigation/deferred-items.md`.

## Self-Check Preview

Alle Task-Acceptance-Criteria per `grep`/Testlauf bestätigt:
- `LEFT JOIN LATERAL` genau 1x, `story.body_text` ≥1x, `StoryPreview` in Go-Model ≥1x
- bestehender Pin-Fragment-String `fg.founded_year, fg.dissolved_year, fg.country, fg.status` weiterhin vorhanden
- `story_preview` in OpenAPI und TS genau 1x, in keiner `required`-Liste
- `npm run typecheck`: 0 Fehler
- neuer Postgres-Test: SKIP ohne DSN, PASS mit echter (temporärer, danach gelöschter) `team4s_fansub_test`-Datenbank

## Verification Results

```
docker exec -w /app team4sv30-backend go test ./internal/repository -run 'TestTruncateStoryPreviewRunes|TestListAnimeFansubs_SummaryIncludesFansubStoryFacts' -count=1 -v
--- PASS: TestListAnimeFansubs_SummaryIncludesFansubStoryFacts
--- PASS: TestTruncateStoryPreviewRunes (5/5 Unterfälle)

docker exec -w /app team4sv30-backend go vet ./internal/repository
(keine Ausgabe = sauber)

docker exec -w /app team4sv30-backend go test ./internal/repository -run TestListAnimeFansubs_StoryPreview -count=1 -v
(ohne DSN) --- SKIP mit expliziter Meldung
(mit DSN gegen temporäre team4s_fansub_test-DB) --- PASS

docker compose exec -T team4sv30-frontend npm run typecheck
0 Fehler
```

## Success Criteria Assessment

- `ListAnimeFansubs` liefert `story_preview` gebündelt in einer Query, kein zusätzlicher Request pro Gruppe — **erfüllt**
- Rune-sichere Kürzung bewiesen durch echten Unit-Test (Task 1) und Postgres-Integrationstest (Task 3) — **erfüllt**
- OpenAPI/Go/TS synchron additiv erweitert, keine bestehende Property als `required` markiert — **erfüllt**
- Bestehender Pin-Test `TestListAnimeFansubs_SummaryIncludesFansubStoryFacts` bleibt unverändert grün — **erfüllt**

## Issues Encountered

Kein Blocker. Ein vorbestehender, planfremder Testfehlschlag wurde identifiziert und dokumentiert (siehe oben), nicht behoben.

## User Setup Required

Keine — reine additive Backend-/Contract-Erweiterung ohne neue Umgebungsvariablen, Migrationen oder externe Abhängigkeiten. Nachfolgende Frontend-Pläne (162-02 ff.) können `story_preview` direkt aus `GET /api/v1/anime/{id}/fansubs` konsumieren.

## Self-Check: PASSED

Alle 6 erwähnten Dateien vorhanden, alle 3 Task-Commit-Hashes (`028fe6cc`, `70074828`, `83e17d22`) in `git log` gefunden.
