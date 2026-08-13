---
phase: 61-fansub-contributions-datenmodell
plan: 03
subsystem: database
tags: [postgres, migrations, bigserial, fk, cascade, partial-index]

requires:
  - phase: 61-02
    provides: hist_group_member_roles, role_definitions, member_claims

provides:
  - anime_contributions Tabelle mit NOT NULL fansub_group_member_id FK
  - anime_contribution_roles Tabelle mit ON DELETE CASCADE
  - member_badges Tabelle mit UNIQUE(member_id, badge_code) und badge_category-Check

affects: [phase-62-api, phase-68-badge-engine]

tech-stack:
  added: []
  patterns:
    - "Partial Indexes für Boolean-Flags (WHERE = true) statt Full Scan"
    - "Polymorphe Referenz via derived_from_type/derived_from_id ohne FK (absichtlich)"

key-files:
  created:
    - database/migrations/0086_anime_contributions.up.sql
    - database/migrations/0086_anime_contributions.down.sql
    - database/migrations/0087_anime_contribution_roles_and_badges.up.sql
    - database/migrations/0087_anime_contribution_roles_and_badges.down.sql
  modified: []

key-decisions:
  - "fansub_group_member_id ist NOT NULL — kein Gastmitwirkender in Phase 61 (D-Locked)"
  - "anime_contribution_roles ON DELETE CASCADE — Contribution löschen entfernt automatisch Rollenzuordnungen"
  - "member_badges.derived_from_id hat keinen FK — polymorphe Referenz, Integrität durch Badge-Engine Phase 68"

patterns-established:
  - "Partial Index auf Boolean-Flags: WHERE is_public_on_anime_page = true"
  - "status CHECK IN (...) ohne Enum-Typ — einfacher zu migrieren"

requirements-completed: [P61-SC1, P61-SC3, P61-SC4, P61-SC5]

duration: 10min
completed: 2026-06-01
---

# Phase 61 Plan 03: anime_contributions, anime_contribution_roles und member_badges Summary

**Drei SQL-Migrationen (0086/0087) legen anime_contributions mit NOT NULL fansub_group_member_id FK, CASCADE-verknüpfte anime_contribution_roles und member_badges mit derived_from-Feldern an.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-06-01T00:00:00Z
- **Completed:** 2026-06-01T00:10:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- anime_contributions als historisches Faktenregister mit NOT NULL FK auf hist_fansub_group_members (P61-SC5 erfüllt)
- anime_contribution_roles mit ON DELETE CASCADE und UNIQUE(anime_contribution_id, role_code) (P61-SC3 erfüllt)
- member_badges mit UNIQUE(member_id, badge_code), badge_category CHECK, und polymorphen derived_from-Feldern
- Alle BIGSERIAL-IDs (P61-SC4 erfüllt), Migrationskette 0081–0087 vollständig (P61-SC1 erfüllt)

## Task Commits

1. **Task 1: Migration 0086 — anime_contributions** - `d8e679e8` (feat)
2. **Task 2: Migration 0087 — anime_contribution_roles und member_badges** - `daf9440b` (feat)

## Files Created/Modified

- `database/migrations/0086_anime_contributions.up.sql` — anime_contributions Tabelle mit 6 Indizes (inkl. 2 Partial Indexes)
- `database/migrations/0086_anime_contributions.down.sql` — DROP TABLE anime_contributions
- `database/migrations/0087_anime_contribution_roles_and_badges.up.sql` — anime_contribution_roles (CASCADE) und member_badges
- `database/migrations/0087_anime_contribution_roles_and_badges.down.sql` — DROP beide Tabellen

## Decisions Made

Keine neuen Entscheidungen — alle D-Locked Vorgaben aus 61-CONTEXT.md exakt umgesetzt.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - keine externen Services erforderlich.

## Next Phase Readiness

- Datenbankfundament Phase 61 vollständig: members, member_claims, hist_fansub_group_members, hist_group_member_roles, role_definitions, anime_contributions, anime_contribution_roles, member_badges
- Phase 62 (API) kann direkt auf anime_contributions und anime_contribution_roles aufbauen
- Phase 68 (Badge-Engine) kann member_badges.derived_from_type/derived_from_id nutzen

---
*Phase: 61-fansub-contributions-datenmodell*
*Completed: 2026-06-01*
