---
phase: 81-release-version-mehrfach-fansubgruppen-ohne-kombigruppe
plan: "04"
subsystem: api
tags: [go, postgres, json_agg, repository, read-path, collaboration-removal, openapi]

requires:
  - phase: 81-release-version-mehrfach-fansubgruppen-ohne-kombigruppe
    plan: 03
    provides: FansubGroups []FansubGroupSummary in models, write-path N-junction, collaboration types removed

provides:
  - json_agg Aggregation im Lesepfad (GetByID + listReleaseVariantsByAnimeID)
  - scanReleaseVariantAsEpisodeVersion nutzt json.Unmarshal auf FansubGroups (kein LIMIT 1 mehr)
  - Kollaborations-Routen aus main.go entfernt; fansub_collaborations.go gelöscht
  - OpenAPI-Contracts: fansub_groups als Array in episode-versions.yaml; collaboration-Schemas aus fansubs.yaml entfernt

affects:
  - 81-05 (Frontend: fansub_groups[] Display)
  - 81-06 (Tests + Cleanup)

tech-stack:
  added: []
  patterns:
    - "json_agg(json_build_object(...)) FILTER (WHERE fg.id IS NOT NULL) ORDER BY fg.name ASC, fg.id ASC"
    - "json.Unmarshal(fansubGroupsJSON, &item.FansubGroups) fuer aggregierte Gruppen-Liste"
    - "db.Query statt db.QueryRow fuer GetByID mit Aggregation (kein LIMIT 1)"

key-files:
  modified:
    - backend/internal/repository/episode_version_repository_read_helpers.go
    - backend/internal/repository/episode_version_repository.go
    - backend/cmd/server/main.go
    - shared/contracts/episode-versions.yaml
    - shared/contracts/fansubs.yaml
  deleted:
    - backend/internal/handlers/fansub_collaborations.go

key-decisions:
  - "db.Query statt db.QueryRow in GetByID: Aggregation liefert eine Zeile pro rv.id; kein LIMIT 1 noetig; rows.Next() als ErrNoRows-Ersatz"
  - "fansub_collaborations.go vollstaendig geloescht: Methoden waren in Plan 03 bereits auf 410 Gone gestellt, Route-Deregistrierung schliesst den Kreis"
  - "admin-content.yaml unveraendert: kein fansub_group-Singular-Feld oder collaboration_group_id in diesem Contract (nur in episode-versions.yaml)"
  - "FansubGroupType enum: collaboration-Wert aus fansubs.yaml entfernt (nur 'group' verbleibt)"

requirements-completed:
  - P81-SC2
  - P81-SC3

duration: 12min
completed: 2026-06-09
---

# Phase 81 Plan 04: Backend-Lesepfad json_agg + Kollaborations-Routen entfernt + Contracts aktualisiert

**Lesepfad auf json_agg umgestellt (LIMIT 1 entfernt), fansub_collaborations.go geloescht, Collaboration-Routen aus main.go entfernt, OpenAPI-Contracts auf fansub_groups[] aktualisiert**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-09T10:00:00Z
- **Completed:** 2026-06-09T10:12:00Z
- **Tasks:** 2
- **Files modified:** 5 (inkl. 1 geloescht)

## Accomplishments

- `listReleaseVariantsByAnimeID`: `fg.id, fg.slug, fg.name, fg.logo_url` im SELECT durch `json_agg(json_build_object(...)) FILTER (WHERE fg.id IS NOT NULL) ORDER BY fg.name ASC, fg.id ASC` ersetzt; `GROUP BY fg.*` entfernt
- `scanReleaseVariantAsEpisodeVersion`: `var groupID/Slug/Name/LogoURL` durch `var fansubGroupsJSON []byte` ersetzt; `json.Unmarshal(fansubGroupsJSON, &item.FansubGroups)` nach dem Scan
- `GetByID`: `db.QueryRow` → `db.Query`; `LIMIT 1` entfernt; `fg.id, fg.slug, fg.name, fg.logo_url` durch `json_agg`-Ausdruck ersetzt; `GROUP BY fg.*` entfernt
- `fansub_collaborations.go` vollstaendig geloescht (drei Handler waren bereits 410 Gone aus Plan 03)
- `main.go`: `GET/POST/DELETE /fansubs/:id/collaboration-members` Routen entfernt
- `episode-versions.yaml`: `fansub_group: FansubGroupShort | null` → `fansub_groups: FansubGroupShort[]`; `collaboration_group_id` aus `EpisodeVersionEditorContext` entfernt
- `fansubs.yaml`: alle drei collaboration-members Endpunkte entfernt; `CollaborationMemberListResponse`, `CollaborationMemberResponse`, `AddCollaborationMemberRequest`, `CollaborationMember`-Schema entfernt; `FansubGroupType` enum auf `[group]` reduziert
- `TestScanEpisodeVersion_ReturnsGroupsList` GREEN
- `go build ./backend/...` gruene Build

## Task Commits

1. **Task 1: Lesepfad auf json_agg umstellen** - `fe8b8b60` (feat)
2. **Task 2: Kollaborations-Routen + Contracts** - `5ac3fb3f` (feat)

## Files Created/Modified

- `backend/internal/repository/episode_version_repository_read_helpers.go` — encoding/json Import; json_agg in SELECT + scanner auf []byte + json.Unmarshal (413 Zeilen, <= 450)
- `backend/internal/repository/episode_version_repository.go` — GetByID: QueryRow -> Query, LIMIT 1 entfernt, json_agg eingesetzt (450 Zeilen)
- `backend/cmd/server/main.go` — 3 Kollaborations-Routen entfernt
- `shared/contracts/episode-versions.yaml` — fansub_group -> fansub_groups[]; collaboration_group_id entfernt
- `shared/contracts/fansubs.yaml` — 3 Endpunkte + 4 Schemas + enum-Wert entfernt
- `backend/internal/handlers/fansub_collaborations.go` — GELOESCHT

## Decisions Made

- `db.Query` statt `db.QueryRow` in `GetByID`: json_agg liefert genau eine Zeile pro `rv.id`. `QueryRow.Scan` kann LIMIT 1 nicht korrekt ersetzen wenn die Aggregation eine echte Zeile zurueckgibt (pgx.ErrNoRows wird korrekt gesetzt); `rows.Next()` ergibt denselben ErrNoRows-Effekt ohne LIMIT.
- `fansub_collaborations.go` loeschen statt leeren: Datei hatte nur 3 Handler-Methoden (alle 410 Gone), kein weiterer Code; Loeschen ist sauberer als Leerstub.
- `admin-content.yaml` unveraendert: Das EpisodeVersion-Schema lebt in `episode-versions.yaml`. `admin-content.yaml` enthaelt kein `fansub_group`-Feld oder `collaboration_group_id` im Scope dieser Phase.

## Deviations from Plan

### Auto-fixed Issues

Keine. Plan wurde exakt wie beschrieben ausgefuehrt.

---

**Total deviations:** 0

## Technical Debt

**Technische Schuld: `fansub_repository.go` (~2323 Zeilen vor Phase 81, nach Bereinigung durch Plan 03 ~2200+ Zeilen) ueberschreitet das CLAUDE.md-450-Zeilen-Limit.**

Der CLAUDE.md-konforme Split von `fansub_repository.go` in mehrere <= 450-Zeilen-Dateien ist eine Aufgabe fuer eine Folge-Phase. Die Kollaborations-Funktionen wurden in Plan 03 entfernt, aber die Datei bleibt weit ueber dem Limit. Dieser Split ist als Out-of-Scope fuer Phase 81 klassifiziert (RESEARCH Q8).

Verweis: 81-RESEARCH.md §"Forschungsfrage 8: File-Size-Risiko" — `fansub_repository.go` als "Sehr hoch", "Split ist eine separate Aufgabe (Out-of-Scope fuer Phase 81, ausser dem Entfernen der Kollaborations-Funktionen)".

## Known Stubs

Keine. Alle Aenderungen vollstaendig verdrahtet.

## Threat Surface Scan

Keine neuen sicherheitsrelevanten Flaechen eingefuehrt. Kollaborations-Endpunkte aus main.go entfernt (T-81-READ-03 mitigiert, kein HTTP-Response mehr moeglich).

---
*Phase: 81-release-version-mehrfach-fansubgruppen-ohne-kombigruppe*
*Completed: 2026-06-09*
