---
phase: quick-260620-qog
plan: "01"
subsystem: backend-repository
tags: [go, repository, openapi, contributions, episodes]
dependency_graph:
  requires: []
  provides: [ListByMemberIDWithProposalFields-episode-fields, contributions-yaml-get-endpoint]
  affects: [contributions_me_handler, frontend-MeAnimeContribution-type]
tech_stack:
  added: []
  patterns: [LEFT JOIN chain rv→fr→ep, nullable struct fields, GROUP BY extension]
key_files:
  created: []
  modified:
    - backend/internal/repository/anime_contributions_proposal_repository.go
    - shared/contracts/contributions.yaml
decisions:
  - "ep.episode_number und ep.sort_index in GROUP BY aufgenommen (1:1 Join pro ac.id via rv→fr→ep — keine Zeilen-Vervielfachung)"
  - "$ref: #/components/responses/Unauthorized durch inlines 401-Response ersetzt (kein components/responses-Abschnitt in der Datei vorhanden)"
metrics:
  duration: "~10 Minuten"
  completed: "2026-06-20"
  tasks_completed: 1
  files_modified: 2
---

# Phase quick-260620-qog Plan 01: Query-Erweiterung + OpenAPI-Contract Summary

**One-liner:** ListByMemberIDWithProposalFields um LEFT JOIN release_versions→fansub_releases→episodes erweitert; ep.episode_number und ep.sort_index AS episode_sort_index im SELECT, GROUP BY und Scan; OpenAPI-Contract GET /api/v1/me/anime-contributions + MeAnimeContribution-Schema eingetragen.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| T1 | Query-Erweiterung + DTO + OpenAPI-Contract | adf467d6 | anime_contributions_proposal_repository.go, contributions.yaml |

## What Was Built

### Backend — anime_contributions_proposal_repository.go

`MemberContributionWithProposalRow` um zwei neue Felder erweitert:

```go
EpisodeNumber    *string `json:"episode_number"`
EpisodeSortIndex *int    `json:"episode_sort_index"`
```

SQL-Query in `ListByMemberIDWithProposalFields` um drei LEFT JOINs nach dem bestehenden `LEFT JOIN fansub_groups fg` ergänzt:

```sql
LEFT JOIN release_versions rv ON rv.id = ac.release_version_id
LEFT JOIN fansub_releases  fr ON fr.id = rv.release_id
LEFT JOIN episodes         ep ON ep.id = fr.episode_id
```

SELECT um `ep.episode_number` und `ep.sort_index AS episode_sort_index` ergänzt (nach `is_own_proposal`).

GROUP BY von `GROUP BY ac.id, a.title_de, a.title_en, a.title, fg.name` auf `GROUP BY ac.id, a.title_de, a.title_en, a.title, fg.name, ep.episode_number, ep.sort_index` erweitert.

Scan()-Aufruf um `&row.EpisodeNumber, &row.EpisodeSortIndex` am Ende ergänzt.

Zeilenzahl: 380 Zeilen (unter 450-Limit).

### OpenAPI-Contract — shared/contracts/contributions.yaml

Neuer GET-Endpunkt `/api/v1/me/anime-contributions` eingetragen (vor dem bestehenden `/{contributionId}/self-publish`-Pfad).

Neue Schemas `MeAnimeContribution` und `MeAnimeContributionsResponse` unter `components/schemas` eingetragen. `MeAnimeContribution` enthält alle Felder des Frontend-Typs inklusive `episode_number` (string, nullable) und `episode_sort_index` (integer, nullable).

## Verification

- `go build ./internal/repository/...`: fehlerfrei
- `go vet ./internal/repository/...`: fehlerfrei
- Struct-Felder `EpisodeNumber *string` und `EpisodeSortIndex *int` vorhanden
- SELECT enthält `ep.episode_number` und `ep.sort_index AS episode_sort_index`
- GROUP BY enthält `ep.episode_number, ep.sort_index`
- contributions.yaml hat GET /api/v1/me/anime-contributions mit beiden Feldern im Schema

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] $ref-Auflösung für components/responses/Unauthorized**
- **Found during:** T1 (OpenAPI-Contract)
- **Issue:** Der Plan verwendete `$ref: "#/components/responses/Unauthorized"`, aber in contributions.yaml existiert kein `components/responses`-Abschnitt.
- **Fix:** 401-Response inline definiert (gleicher Stil wie alle anderen 401-Antworten in der Datei).
- **Files modified:** shared/contracts/contributions.yaml

## Known Stubs

Keine. Die Backend-Query liefert echte Datenbankwerte.

## Self-Check: PASSED

- [x] `backend/internal/repository/anime_contributions_proposal_repository.go` existiert und enthält `ep.episode_number`
- [x] `shared/contracts/contributions.yaml` enthält `episode_sort_index` im Schema
- [x] Commit adf467d6 vorhanden
