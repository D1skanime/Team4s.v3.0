---
phase: 188-ux-abgleich-rest-korrektheits-und-robustheitsfixes-vor-neuen
plan: 01
subsystem: database
tags: [postgres, sql, badges, member-profile, gamification]

# Dependency graph
requires:
  - phase: 188-ux-abgleich-rest-korrektheits-und-robustheitsfixes-vor-neuen
    provides: "Befund #18 aus 2026-10-17-ux-findings-abgleich.md + 188-RESEARCH.md Zielform der SQL"
provides:
  - "loadContribProjectsCount mit anime.max_episodes-Nenner (D-04), NULL-Rueckfall auf COUNT(*) (D-05) und COUNT(DISTINCT episode_id)-Zaehler (D-06)"
  - "Drei neue Postgres-Verhaltenstests, die den Vor-Fix-Bug beweisen (RED) und den Fix bestaetigen (GREEN)"
affects: [member-profile-badges, public-member-profile]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Nenner-Ableitung ueber COALESCE(MAX(anime.max_episodes), COUNT(*)) als Fallback-Pattern fuer optionale Domaenen-Metadaten bei read-time Badge-Aggregation"

key-files:
  created: []
  modified:
    - backend/internal/repository/member_profile_contribution_badges_repository.go
    - backend/internal/repository/member_profile_contribution_badges_repository_test.go

key-decisions:
  - "Nenner = anime.max_episodes, Rueckfall auf COUNT(*) (ledger-erfasste Release-Version-Zeilen) bei NULL -- exakt die 188-RESEARCH.md-Zielform, keine Abweichung"
  - "Zaehler-Dedup (COUNT DISTINCT episode_id) gilt ausschliesslich fuer den Zaehler, niemals fuer den NULL-Rueckfall-Nenner (D-05 bliebe sonst verletzt)"
  - "WHERE numerator >= denominator AND denominator > 0 schuetzt explizit gegen den theoretischen Randfall anime.max_episodes = 0"

requirements-completed: [D-04, D-05, D-06]

# Metrics
duration: 35min
completed: 2026-10-19
---

# Phase 188 Plan 01: Badge-Nenner-Korrektheitsfix (Befund #18) Summary

**`loadContribProjectsCount` nutzt jetzt `anime.max_episodes` statt der Anzahl jemals vergebener Release-Versionen als Nenner, mit dokumentiertem NULL-Rueckfall und episodenbasiertem (statt release-version-basiertem) Zaehler.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-10-19T22:50:00Z (approx.)
- **Completed:** 2026-10-19T23:06:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Fixture `openContributionBadgesPostgres` um eine minimale `anime`-Stand-in-Tabelle (`id`, `max_episodes`) erweitert; `anime_id=100` seeded mit `max_episodes=NULL`, um D-05 fuer alle Bestandstests unveraendert zu halten
- Drei neue Postgres-Verhaltenstests geschrieben, die gegen den unveraenderten Code bewusst ROT liefen (dokumentiert, siehe unten) und nach dem SQL-Fix GRUEN sind
- `loadContribProjectsCount`-SQL auf `anime.max_episodes`-Nenner (D-04) mit `COUNT(*)`-NULL-Rueckfall (D-05) und `COUNT(DISTINCT episode_id)`-Zaehler (D-06) umgestellt
- Alle Bestandstests der Datei bleiben gruen; `go build ./...` und `go vet ./internal/repository/...` clean
- `docker compose up -d --build team4sv30-backend` ausgefuehrt; `scripts/test-backend.sh` vollstaendig gruen (GATE: GREEN, exit code 0)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fixture erweitern + rote Tests fuer D-04/D-05/D-06 schreiben** - `2fc3e5ab8` (test)
2. **Task 2: loadContribProjectsCount auf max_episodes-Nenner + DISTINCT-episode_id-Zaehler umstellen** - `f1581b3fa` (fix)

**Plan metadata:** (siehe finaler Commit nach diesem Dokument)

## Files Created/Modified
- `backend/internal/repository/member_profile_contribution_badges_repository_test.go` - `anime`-Stand-in-Tabelle + Seed, `seedContribMaxEpisodesProject`-Helfer, drei neue Verhaltenstests (D-04/D-05/D-06)
- `backend/internal/repository/member_profile_contribution_badges_repository.go` - `loadContribProjectsCount`-SQL (Nenner/Zaehler) + Doc-Kommentar aktualisiert

## Decisions Made
- Nenner-Formel exakt nach `188-RESEARCH.md` ("#18 — Zielform der SQL") umgesetzt: `COALESCE(MAX(pv.max_episodes), COUNT(*))` als Nenner, `COUNT(DISTINCT pv.episode_id) FILTER (...)` als Zaehler, explizites `WHERE numerator >= denominator AND denominator > 0` statt impliziter `HAVING`-Bedingung
- Tier-Schwellen (`highestContribProjectsTier`), `loadContributionBadges` und `backend/internal/badges/thresholds.go` bewusst unveraendert gelassen (ausserhalb des Fix-Scopes)

## Deviations from Plan

**1. [Rule 3 - Blocking] Verify-Kommando-DSN im Plan (`TEAM4S_PHASE106_TEST_DSN`) traf nicht den tatsaechlich benoetigten Fixture-Pfad**
- **Found during:** Task 1 (erster Testlauf)
- **Issue:** Die im Plan genannten `<verify>`-Kommandos setzen `TEAM4S_PHASE106_TEST_DSN`, aber `openContributionBadgesPostgres` haengt ueber `openMemberProfileBadgeLifecyclePostgres -> openMemberPointTotalsPostgres -> testsupport.OpenPhase128Postgres` tatsaechlich an `TEAM4S_PHASE128_TEST_DSN` (phase106 wird in dieser Test-Kette gar nicht referenziert). Mit nur der phase106-DSN gesetzt schlugen alle drei neuen Tests mit `TEAM4S_PHASE128_TEST_DSN is required for Phase-128 PostgreSQL tests` fehl, nicht mit der erwarteten Verhaltens-Assertion.
- **Fix:** Zusaetzlich `TEAM4S_PHASE128_TEST_DSN` auf eine frische, eigens angelegte Wegwerf-Datenbank (`team4s_phase128_test_p18801`, Namensmuster `^team4s_phase128_test(?:_[a-z0-9]+)?$` erfuellt) gesetzt; danach liefen alle drei Tests wie im Plan beschrieben (Test 1 ROT, Test 2 ROT, Test 3 ROT gegen unveraenderten Code).
- **Files modified:** keine Produktionsdatei -- reine Testumgebungs-Konfiguration beim Ausfuehren
- **Verification:** Tests liefen nach DSN-Korrektur durch (RED vor Task 2, GREEN nach Task 2); beide Wegwerf-Datenbanken (`team4s_phase106_test_p18801`, `team4s_phase128_test_p18801`) nach Abschluss wieder gedroppt
- **Committed in:** n/a (keine Code-Aenderung noetig)

**2. [Rule 3 - Blocking] Test 2 war gegen den unveraenderten Code ebenfalls ROT (nicht wie im Plan als "GRUEN oder ROT, beides moeglich" offengelassen)**
- **Found during:** Task 1 (Testlauf)
- **Issue:** Der Plan liess offen, ob `TestLoadContribProjectsCountDistinctEpisodeDedupesMultipleVersionsOfSameEpisode` gegen den unveraenderten Code zufaellig schon gruen sein koennte. Tatsaechliches Ergebnis: ROT (erwartet 1, alter Code lieferte 0) -- der alte Nenner (`COUNT(*)` = 2 ledger-erfasste Zeilen) uebersteigt den alten Zaehler (1 abgedeckte Release-Version), also "nicht vollstaendig", waehrend die neue Episoden-basierte Logik dasselbe Szenario korrekt als vollstaendig (1 Episode von `max_episodes=1`) erkennt.
- **Fix:** Keine Code-Aenderung noetig -- das tatsaechliche Ergebnis wurde wie vom Plan verlangt dokumentiert (hier und in der Taskausfuehrung), Task 2 macht den Test wie geplant gruen.
- **Files modified:** keine
- **Verification:** `go test -run TestLoadContribProjectsCountDistinctEpisodeDedupesMultipleVersionsOfSameEpisode` vor Task 2 FAIL (erwartet 1, actual 0), nach Task 2 PASS
- **Committed in:** `f1581b3fa` (Task 2 Commit macht den Test gruen)

---

**Total deviations:** 2 auto-fixed (beide Rule 3, Testumgebungs-/Dokumentationsklaerung, keine Produktionscode-Abweichung vom Plan)
**Impact on plan:** Kein Scope-Creep -- beide Abweichungen betreffen ausschliesslich die Testausfuehrungsumgebung bzw. die im Plan selbst als offen markierte Dokumentationspflicht fuer Test 2.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Badge-Familie 1 ("Mitgetragene Projekte") zaehlt jetzt korrekt gegen die tatsaechliche Episodenzahl, keine Live-Daten-Aenderung noetig (das einzige Bestandsprojekt hat 13 Release-Versionen == 13 max_episodes, siehe Plan-Objective)
- `docker compose up -d --build team4sv30-backend` und `scripts/test-backend.sh` (voller Backend-Suite-Lauf, GATE: GREEN) nach den Code-Aenderungen ausgefuehrt -- keine Regressionen in anderen Paketen
- Keine Blocker fuer nachfolgende 188-xx-Plaene dieser Phase

---
*Phase: 188-ux-abgleich-rest-korrektheits-und-robustheitsfixes-vor-neuen*
*Completed: 2026-10-19*

## Self-Check: PASSED
- FOUND: .planning/phases/188-ux-abgleich-rest-korrektheits-und-robustheitsfixes-vor-neuen/188-01-SUMMARY.md
- FOUND: commit 2fc3e5ab8 (Task 1)
- FOUND: commit f1581b3fa (Task 2)
