---
phase: 67-release-episode-credits
plan: 02
subsystem: api
tags: [go, pgx, postgres, gin, anime_contributions, release_version, upsert, on-conflict]

# Dependency graph
requires:
  - phase: 67-01
    provides: "anime_contributions.release_version_id Spalte + vierspaltiger uq_anime_contribution_member (NULLS NOT DISTINCT) via Migration 0091"
provides:
  - "GroupParticipatesInReleaseVersion (D-03 Beteiligungs-EXISTS-Guard, parametrisiert)"
  - "ListGroupReleaseVersionsForAnime (gruppen-gefiltertes Dropdown-Lookup, NULL-safe Episode-Sortierung)"
  - "release_version_id durchgaengig in AnimeContributionInput/PatchInput/Row + Upsert (vierspaltiges ON CONFLICT) + Read-Roundtrip (GetByID/List) + ProposalInput/CreateProposal"
  - "Leader-Handler D-03-Validierung (422 bei gruppen-fremder Version) in Create + Update via gemeinsamem validateReleaseVersionParticipation-Helper"
affects: [67-03, 67-04, 67-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Parametrisierte EXISTS-Konsistenzpruefung gespiegelt von MemberBelongsToFansub"
    - "Vierspaltiges ON CONFLICT-Target mit release_version_id im Conflict-Key (NICHT im DO UPDATE SET)"
    - "Gemeinsamer Handler-Validierungs-Helper fuer beide Schreibpfade (Create + Update)"
    - "Struct-Auslagerung in *_inputs.go zur Einhaltung des 450-Zeilen-Limits"

key-files:
  created:
    - backend/internal/repository/anime_contributions_release_lookup_repository.go
    - backend/internal/repository/anime_contributions_release_lookup_repository_test.go
    - backend/internal/repository/anime_contributions_inputs.go
    - backend/internal/repository/anime_contributions_inputs_test.go
    - backend/internal/handlers/fansub_contributions_validation_test.go
  modified:
    - backend/internal/repository/anime_contributions_repository.go
    - backend/internal/repository/anime_contributions_upsert_repository.go
    - backend/internal/repository/anime_contributions_proposal_repository.go
    - backend/internal/handlers/fansub_anime_contributions_handler.go
    - backend/internal/handlers/fansub_contributions_validation.go

key-decisions:
  - "Request-Structs (animeContributionCreateRequest/PatchRequest) + validContributionStatuses nach fansub_contributions_validation.go ausgelagert, weil der Handler nach Hinzufuegen der Validierung 459 Zeilen erreichte (450-Limit)"
  - "Member-Proposal-Handler (contribution_proposals_me_handler.go) NICHT angefasst — er steht nicht in den files_modified dieses Plans; nur die Repository-Schicht (ProposalInput/CreateProposal) wurde additiv erweitert, Handler-Haertung folgt in 67-05"
  - "release_version_id additiv vor den ARRAY_AGG-Aggregaten in animeContributionSelectCols eingefuegt; Scan-Reihenfolge in scanAnimeContributionRow UND in der Member-Proposal-Listenabfrage entsprechend angepasst"

patterns-established:
  - "Lookup-Methoden auf bestehendem Receiver in neuer Datei (unter 450-Limit) statt Aufblaehen der Hauptdatei"
  - "Source-Inspection-Tests fuer konkrete (nicht-Interface) Repos/Handler, konsistent mit Phase-37-Entscheidung"

requirements-completed: [P67-SC1]

# Metrics
duration: 18min
completed: 2026-06-02
---

# Phase 67 Plan 02: Release- und Episode-Credits Backend-Schreibpfad Summary

**Optionales release_version_id durchgaengig im Contribution-Schreibpfad: gruppen-validierter Leader-Upsert (422 bei fremder Version), vierspaltiges ON CONFLICT ohne Overwrite des anime-weiten Eintrags und Read-Roundtrip im DTO.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-06-02T14:55:00Z
- **Completed:** 2026-06-02T15:13:00Z
- **Tasks:** 3
- **Files modified:** 10 (5 neu, 5 modifiziert)

## Accomplishments
- Neues Lookup-Repository: GroupParticipatesInReleaseVersion (D-03, parametrisierter EXISTS-Guard) + ListGroupReleaseVersionsForAnime (gruppen-gefiltertes Dropdown, NULL-safe Episode-Sortierung dann Version).
- release_version_id durchgaengig: AnimeContributionInput (*int64), AnimeContributionPatchInput (**int64), AnimeContributionRow (*int64, read roundtrip), ProposalInput (*int64).
- Vierspaltiges ON CONFLICT-Target (fansub_group_id, anime_id, fansub_group_member_id, release_version_id) im Upsert — versions-spezifischer Eintrag ueberschreibt nicht den anime-weiten (Pitfall 1).
- Leader-Handler D-03-Validierung in Create UND Update: 422 mit korrekter deutscher Umlaut-Meldung bei gruppen-fremder Version, Audit-Payload traegt release_version_id.
- anime_contributions_repository.go von 452 auf 413 Zeilen reduziert (Struct-Auslagerung), beide Handler-Dateien unter 450.

## Task Commits

Jeder Task wurde atomar committet (TDD: test -> feat):

1. **Task 1: Lookup-Repo + Test** - `9c991df` (test) -> `eda4927` (feat)
2. **Task 2: Input/Row/Upsert/Patch/Proposal release_version_id + 450-Auslagerung** - `d2c24b1` (test) -> `45540db` (feat)
3. **Task 3: Leader-Handler D-03-Validierung + Request-Structs + Audit** - `62dad28` (test) -> `e732171` (feat)

_TDD-Tasks haben je einen test- und einen feat-Commit (Source-Inspection-Tests)._

## Files Created/Modified
- `anime_contributions_release_lookup_repository.go` (neu) - GroupParticipatesInReleaseVersion + ListGroupReleaseVersionsForAnime + GroupReleaseVersionOption.
- `anime_contributions_release_lookup_repository_test.go` (neu) - Source-Contract-Tests (Signaturen, parametrisierte Queries, Dropdown-Form, JSON-Tags).
- `anime_contributions_inputs.go` (neu) - Ausgelagerte AnimeContributionRow/Input/PatchInput, jeweils um release_version_id erweitert.
- `anime_contributions_inputs_test.go` (neu) - Contract-Tests fuer Felder, vierspaltiges ON CONFLICT, Read-Selektion, Proposal-INSERT.
- `fansub_contributions_validation_test.go` (neu) - Contract-Tests fuer Request-Structs, beidseitige Helper-Aufrufe, Umlaut-Meldung, Audit-Payload.
- `anime_contributions_repository.go` - Structs entfernt (ausgelagert); release_version_id in SELECT-Spalten + Scan + Update-Patch (Doppelpointer).
- `anime_contributions_upsert_repository.go` - vierspaltiges ON CONFLICT + release_version_id in INSERT/VALUES.
- `anime_contributions_proposal_repository.go` - ProposalInput.ReleaseVersionID + CreateProposal-INSERT + Listen-Scan-Reihenfolge.
- `fansub_anime_contributions_handler.go` - Validierungsaufrufe in Create/Update, ReleaseVersionID-Durchreichung, Audit-Payload; Request-Structs ausgelagert.
- `fansub_contributions_validation.go` - validateReleaseVersionParticipation (gemeinsamer Helper, 422 + Umlaut) + verschobene Request-Structs/validContributionStatuses.

## Decisions Made
- Request-Structs in die Validierungsdatei ausgelagert, um das 450-Zeilen-Limit nach der neuen Validierung einzuhalten (Handler waere sonst 459 Zeilen).
- Member-Proposal-Handler bleibt unangetastet (nicht in files_modified dieses Plans); Repository-Schicht ist additiv vorbereitet, Handler-Haertung ist 67-05 zugeordnet.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 450-Zeilen-Limit-Verletzung im Handler nach Validierung**
- **Found during:** Task 3 (Leader-Handler D-03-Validierung)
- **Issue:** Nach Hinzufuegen der Validierungsaufrufe, ReleaseVersionID-Felder und Audit-Payload erreichte fansub_anime_contributions_handler.go 459 Zeilen — Verstoss gegen das CLAUDE.md 450-Zeilen-Limit.
- **Fix:** animeContributionCreateRequest, animeContributionPatchRequest und validContributionStatuses in die bereits angelegte fansub_contributions_validation.go verschoben (thematisch passend, keine Verhaltensaenderung). Handler danach 427 Zeilen, Validierungsdatei 112 Zeilen.
- **Files modified:** fansub_anime_contributions_handler.go, fansub_contributions_validation.go
- **Verification:** `wc -l` zeigt beide Dateien < 450; go build + go vet gruen; Tests gruen.
- **Committed in:** e732171 (Task 3 Commit)

**2. [Rule 1 - Bug] Test-Pattern zu strikt fuer gofmt-Tab-Ausrichtung**
- **Found during:** Task 2 + Task 3 (Contract-Tests)
- **Issue:** Die RED-Tests prueften "releaseversionid *int64" als exakten Substring, aber gofmt richtet Struct-Felder mit Tabs aus, sodass der Substring nie matchte (false negative).
- **Fix:** Test normalisiert den Quelltext via strings.Fields-Join (Whitespace kollabieren), bevor er die Fragmente prueft. Funktionale Aussage unveraendert.
- **Files modified:** anime_contributions_inputs_test.go, fansub_contributions_validation_test.go
- **Verification:** Tests gruen mit korrekter Implementierung.
- **Committed in:** 45540db, e732171 (jeweils Task-feat-Commit)

**3. [Rule 1 - Bug] Test verwies nach Auslagerung auf falsche Datei**
- **Found during:** Task 3
- **Issue:** TestReleaseVersionValidation_RequestStructsCarryField pruefte die Request-Structs in fansub_anime_contributions_handler.go, nachdem sie (Deviation 1) in die Validierungsdatei verschoben wurden.
- **Fix:** Test liest jetzt beide Quellen kombiniert.
- **Files modified:** fansub_contributions_validation_test.go
- **Verification:** Test gruen.
- **Committed in:** e732171 (Task 3 Commit)

---

**Total deviations:** 3 auto-fixed (1 blocking, 2 bug)
**Impact on plan:** Deviation 1 war noetig fuer die CLAUDE.md-Modularitaetsregel; Deviations 2-3 korrigierten Test-Mechanik ohne Funktionsaenderung. Kein Scope-Creep.

## Issues Encountered
- Die Datei fansub_contributions_validation.go existierte bereits (historische Contribution-Helfer aus einer fruehen Phase). Statt sie zu ueberschreiben, wurde die neue Validierungsfunktion additiv ergaenzt und die Imports erweitert.

## User Setup Required
None - keine externe Service-Konfiguration erforderlich. Migration 0091 ist laut Phase 67-01 bereits angewendet.

## Next Phase Readiness
- Backend-Schreibpfad (P67-SC1 Schreib-/Konsistenz-Anteil) vollstaendig: Annahme, D-03-Validierung und Overwrite-freie Persistenz stehen.
- ListGroupReleaseVersionsForAnime bereit als Datenquelle fuer das Leader-Dropdown (Frontend-Verdrahtung in spaeterem Plan).
- Member-Proposal-Handler-Haertung (Handler-seitiger Version-Check) ist 67-05 zugeordnet; Repository-Schicht ist dafuer additiv vorbereitet.

## Self-Check: PASSED

Alle erstellten Dateien existieren auf der Platte; alle 6 Task-Commits (3x test, 3x feat) sind im Git-Log auffindbar.

---
*Phase: 67-release-episode-credits*
*Completed: 2026-06-02*
