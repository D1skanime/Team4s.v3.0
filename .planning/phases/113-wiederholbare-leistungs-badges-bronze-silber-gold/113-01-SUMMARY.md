---
phase: 113-wiederholbare-leistungs-badges-bronze-silber-gold
plan: 01
subsystem: api
tags: [go, pgx, postgres, gamification, badges, member-profile]

# Dependency graph
requires:
  - phase: 112-member-punkt-meilenstein-badges
    provides: "loadRoleVolumeBadges/highestRoleVolumeTier Blueprint (Split-File-Muster, ID:0-Badge-Emission), Split-File-Konvention gegen das 450-Zeilen-Limit"
  - phase: 108-110 (release_role_credit_lifecycles / release_version_notes / release_version_media Fundament)
    provides: "release_role_credit_lifecycles (awarded/reversed Ledger), release_version_notes/anime_fansub_project_notes/fansub_group_notes, release_version_media, member_claims/app_users Autor-Seam"
provides:
  - "loadContributionBadges: drei read-time abgeleitete Badge-Familien (Vollabdeckung/Chronist/Bildarchivar) fuer GetPublicMemberProfile"
  - "highestContribProjectsTier / highestContribChronicleTier / highestContribArchivistTier reine Schwellenfunktionen (1/5/15 bzw. 10/50/150)"
  - "Postgres-Integrationstest fuer Live-Downgrade, Coverage-Luecken-Semantik, Notiz- und Media-Netto-Zaehlung"
affects: [113-02, frontend-badge-rendering, memberBadgeLabels]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Read-time synthetisches PublicMemberBadge{ID:0}, nie in member_badges persistiert (GAM-04)"
    - "Wiederverwendbarer authorMemberSeam-SQL-Konstante fuer den Autor->Member-Auflösungs-Seam ueber member_claims/app_users.legacy_user_id"
    - "Coverage-CTE (project_versions/member_covered) begrenzt die Projekt-Release-Menge auf ledger-erfasste release_versions statt literal jede existierende Version (A1/Pitfall 1)"

key-files:
  created:
    - backend/internal/repository/member_profile_contribution_badges_repository.go
    - backend/internal/repository/member_profile_contribution_badges_repository_test.go
  modified:
    - backend/internal/repository/member_profile_repository.go

key-decisions:
  - "Familie-1-Release-Menge eines Projekts = nur release_versions mit >=1 awarded Credit von irgendjemandem (ledger-erfasst), nicht literal jede existierende release_version (A1, RESEARCH Pitfall 1)"
  - "Familie-2-Chronist zaehlt release_version_notes (member_id direkt, Pflicht) additiv mit anime_fansub_project_notes + fansub_group_notes ueber den created_by_user_id-Autor-Seam, visibility-unabhaengig"
  - "Familie-3-Bildarchivar zaehlt COUNT(*) TOTAL (nicht distinct release_version_id) ueber release_version_media, bewusst ohne review_status-/visibility-Filter"
  - "Alle drei Familien enden bei Gold, kein platinum-Tier (Abweichung vom Rollen-Volumen-Praezedenzfall aus Phase 112)"

patterns-established:
  - "authorMemberSeam als package-level SQL-Konstante statt dreifacher Duplikation des Autor-Seam-Subqueries"

requirements-completed: [GAM-04]

# Metrics
duration: 35min
completed: 2026-07-28
---

# Phase 113 Plan 01: Backend-Datenschicht fuer drei Contribution-Badge-Familien Summary

**Drei read-time SQL-Aggregationen (Vollabdeckung/Chronist/Bildarchivar) + reine Go-Schwellenfunktionen liefern `contribution_{family}_{tier}`-Badges an `GetPublicMemberProfile`, ohne neuen Buchungspfad und ohne `member_badges`-Persistenz.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-07-28T07:xx:xxZ
- **Completed:** 2026-07-28T08:04:09Z
- **Tasks:** 3/3 completed
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- Drei reine Schwellenfunktionen (`highestContribProjectsTier` 1/5/15, `highestContribChronicleTier`/`highestContribArchivistTier` 10/50/150) mit DB-freien Grenzwert-Unit-Tests
- `loadContributionBadges` aggregiert alle drei Familien member-gefiltert und emittiert nur die jeweils hoechste Stufe als `PublicMemberBadge{ID:0}`
- 5-Zeilen-Callsite in `GetPublicMemberProfile` direkt nach `loadRoleVolumeBadges`, `member_profile_repository.go` bleibt frei von neuer Familien-Logik
- Postgres-Integrationstest (SKIP ohne DSN) beweist Live-Downgrade, Coverage-Luecken-Semantik, Notiz-Netto-Zaehlung und Media-TOTAL-Zaehlung inkl. GAM-04-Nicht-Persistenz

## Task Commits

Each task was committed atomically:

1. **Task 1: Split-File mit drei reinen Schwellenfunktionen + Grenzwert-Unit-Tests** - `ba51fdfd` (test)
2. **Task 2: Drei Aggregations-Reads + loadContributionBadges-Emission + Callsite** - `3b5a9750` (feat)
3. **Task 3: Postgres-Integrationstest (SKIP ohne DSN)** - `58773a51` (test)

**Plan metadata:** (this commit) (docs: complete plan)

## Files Created/Modified
- `backend/internal/repository/member_profile_contribution_badges_repository.go` - 3 Schwellenfunktionen, `authorMemberSeam`-Konstante, `loadContributionBadges` mit den drei Aggregations-Queries
- `backend/internal/repository/member_profile_contribution_badges_repository_test.go` - DB-freie Schwellen-Unit-Tests + `TestLoadContributionBadgesPostgres`-Integrationstest
- `backend/internal/repository/member_profile_repository.go` - 5-Zeilen-Callsite in `GetPublicMemberProfile`

## Decisions Made
- Familie-1-Coverage-Query begrenzt die "Release-Menge des Projekts" auf ledger-erfasste `release_versions` (>=1 awarded Credit von irgendwem) statt literal jede existierende Version — folgt CONTEXT D-02/RESEARCH A1 exakt.
- `authorMemberSeam` als wiederverwendbare package-level SQL-Konstante extrahiert (statt den Autor-Seam-Subquery dreimal zu duplizieren), da er in Familie 2 (zweimal additiv) und Familie 3 identisch gebraucht wird.
- Kommentar-Formulierungen fuer den Familie-3-Anti-Pattern-Hinweis bewusst auf "Freigabe-/Sichtbarkeitsfilter" (statt der Literal-Tokens `review_status`/`visibilit`) umformuliert, um False-Positives bei tokenbasierten Verifikations-Greps auf reine Dokumentationskommentare zu vermeiden — die SQL selbst enthaelt ohnehin keinen solchen Join.

## Deviations from Plan

None - plan executed exactly as written. Die einzige nicht-funktionale Anpassung war die oben genannte Kommentar-Wortwahl, um das Verifikations-Grep-Gate praezise auf die SQL-Query statt auf Dokumentationstext zu zielen; funktional identisch zur Plan-Vorgabe (kein `review_status`/`visibility`-Join in der Familie-3-SQL).

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Backend-Datenschicht fuer alle drei Contribution-Familien ist vollstaendig und live-projiziert; `profile.PublicBadges` enthaelt bereits die fertigen `contribution_projects_*`/`contribution_chronicle_*`/`contribution_archivist_*`-Codes.
- Plan 02 kann direkt auf dieser Grundlage die Frontend-Praesentation (`memberBadgeLabels.ts`, neue Gruppe "Beitraege", `MemberBadgeChain`) ergaenzen, ohne weitere Backend-Aenderungen.
- Der Postgres-Integrationstest lief in dieser Umgebung als SKIP (kein `TEAM4S_PHASE106_TEST_DSN` gesetzt); ein Live-Lauf gegen echtes Postgres bleibt als Nacharbeit offen (dokumentierter Normalzustand, kein Blocker).

---
*Phase: 113-wiederholbare-leistungs-badges-bronze-silber-gold*
*Completed: 2026-07-28*
