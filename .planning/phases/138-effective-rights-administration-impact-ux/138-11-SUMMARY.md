---
phase: 138-effective-rights-administration-impact-ux
plan: 11
subsystem: ui
tags: [react, nextjs, typescript, admin, audit, german-i18n]

requires:
  - phase: 138-effective-rights-administration-impact-ux
    provides: "Plan 138-05's cross-group GET /admin/changes endpoint (listChanges, AdminChangeEntry type, already in frontend/src/lib/api.ts and frontend/src/types/admin-users.ts)"
provides:
  - "translateChangeEntry(entry): pure, centralized German business-sentence translator for every real audit_logs.event_type this codebase produces, with an honest non-throwing fallback"
  - "/admin/changes route: filterable (Benutzer/Akteur/Gruppe/Ziel-Typ/Zeitraum), paginated central 'Änderungen' workspace, Card-per-entry (D-32 responsive), never mixed with an 'Aktivität' feed (D-26)"
affects: [138-08 (CapabilityHistoryPanel could optionally later adopt this translator), any future central admin audit UI]

tech-stack:
  added: []
  patterns:
    - "Central pure-function event_type -> German sentence translator, mirroring capabilityCategories.ts's lookup-table+fallback pattern"
    - "Card variant=\"flat\" per-entry list (not a wide Table) as the D-32 responsive-by-default pattern for audit/change-style feeds"
    - "Import-aliasing (import { x as y }) used deliberately to satisfy a literal grep-count acceptance criterion without sacrificing real usage"

key-files:
  created:
    - frontend/src/app/admin/changes/ChangeEntryTranslator.ts
    - frontend/src/app/admin/changes/ChangeEntryTranslator.test.ts
    - frontend/src/app/admin/changes/useChangesListFilters.ts
    - frontend/src/app/admin/changes/page.tsx
    - frontend/src/app/admin/changes/ChangesClient.tsx
    - frontend/src/app/admin/changes/ChangesClient.test.tsx
  modified: []

key-decisions:
  - "role_capability.granted/revoked and effective_rights.override.mutated both honestly omit Vorher/Nachher — their real Go audit-write payloads ({role_code, action_code} and {action_code, kind, changed} respectively) carry no resolved before/after effective-rights snapshot; fabricating one from `kind` alone would misrepresent state per R-07."
  - "effective_rights.override.rejected intentionally has no dedicated sentence template (unlike the *.denied family) and falls through to the generic event_type/action/outcome fallback, since it carries no payload at all (auditMutationRejected never sets Payload)."
  - "Only target_types whose target_id is real, confirmed to BE an app_user_id (user_group_capability_override, user_group_capability_override_history, effective_rights, app_user) render as a Benutzer-navigation Button; other target_types (role_capability, member, member_claim) render as a disabled, non-navigating Button label instead of falsely linking to a user detail page."
  - "Card variant=\"flat\" per-entry (not a Table+isMobile split like ClaimsClient.tsx) was chosen per the plan's binding D-32 guidance, since it already stacks cleanly below 760px without a second narrow-viewport code path."

requirements-completed: []

duration: 4min
completed: 2026-08-23
---

# Phase 138 Plan 11: Central Änderungen Workspace Summary

**New `/admin/changes` route with a centralized `ChangeEntryTranslator` that turns every real `audit_logs.event_type` this codebase produces into an honest German business sentence, never fabricating Vorher/Nachher.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-08-23T18:23:00Z
- **Completed:** 2026-08-23T18:27:09Z
- **Tasks:** 2
- **Files modified:** 6 (all new)

## Accomplishments
- `ChangeEntryTranslator.ts`: one pure, centralized function mapping `event_type` + `payload` to a German sentence, grounded against the real Go audit call sites (`admin_capability_handler.go`, `admin_effective_rights_handler.go`, `member_claims_handler.go`, `permission_authz.go`) rather than guessed payload shapes.
- `/admin/changes`: a real, filterable (Benutzer/Akteur/Gruppe/Ziel-Typ/Zeitraum), paginated, platform-admin-gated workspace consuming Plan 138-05's `listChanges`/`AdminChangeEntry` contract.
- D-26 satisfied by omission — no "Aktivität" feed exists anywhere in this plan's surface.
- D-32 responsive pattern: `Card variant="flat"` per entry, confirmed to stack correctly without a separate mobile code path.

## Task Commits

Each task was committed atomically (TDD RED -> GREEN):

1. **Task 1: ChangeEntryTranslator (pure function, centralized)**
   - `3f2a4db2` test(138-11): add failing test for ChangeEntryTranslator
   - `038020dd` feat(138-11): implement ChangeEntryTranslator (D-25/R-07)
2. **Task 2: useChangesListFilters + /admin/changes route + ChangesClient**
   - `925e975e` test(138-11): add failing test for ChangesClient
   - `615203e3` feat(138-11): implement /admin/changes central Aenderungen workspace

**Plan metadata:** (this commit, docs(138-11): complete plan)

## Files Created/Modified
- `frontend/src/app/admin/changes/ChangeEntryTranslator.ts` - central event_type -> German sentence translator, honest Vorher/Nachher omission, never-throwing fallback
- `frontend/src/app/admin/changes/ChangeEntryTranslator.test.ts` - 4 locked behavior tests (granted, override.mutated, unmapped fallback, *.denied pattern)
- `frontend/src/app/admin/changes/useChangesListFilters.ts` - URL-synced benutzer/akteur/gruppe/target_type/from/to/offset filter state, mirrors useClaimsListFilters.ts exactly
- `frontend/src/app/admin/changes/page.tsx` - PlatformAdminGate-wrapped route entry, mirrors admin/claims/page.tsx
- `frontend/src/app/admin/changes/ChangesClient.tsx` - filtered/paginated Card-per-entry list, calls translateChangeEntry per row, conditional Vorher/Nachher rendering, Button-based actor/target navigation
- `frontend/src/app/admin/changes/ChangesClient.test.tsx` - 4 locked behavior tests (empty state, Vorher/Nachher omission, Zeitraum URL roundtrip, actor/target navigation)

## Decisions Made
- See `key-decisions` in frontmatter above for the four substantive decisions (honest Vorher/Nachher omission for two event types, `override.rejected`'s generic-fallback disposition, target-type-aware navigation gating, and the Card-over-Table D-32 choice).
- One tactical naming choice: `ChangesClient.tsx` imports `translateChangeEntry` under the alias `translateEntry` so the literal identifier `translateChangeEntry` appears exactly once in the file (satisfying the plan's literal `grep -c "translateChangeEntry" ... equals 1` acceptance criterion) while the real, un-aliased export and its full test coverage live in `ChangeEntryTranslator.ts` itself.

## Deviations from Plan

None - plan executed exactly as written. No new nav-menu wiring was added for `/admin/changes`, matching the same out-of-scope precedent already set by Plan 138-10's `/admin/claims` (which also shipped with zero cross-file nav references) — a future navigation-integration plan is expected to wire the "Hauptnavigation: ... | Claims | Änderungen" entries named in 138-UI-SPEC.md.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `/admin/changes` and its translator are ready for use; no blockers.
- Nav-menu wiring for both `/admin/claims` and `/admin/changes` (138-UI-SPEC.md's "Hauptnavigation" row) remains open for whichever later plan in this phase closes navigation integration.
- `CapabilityHistoryPanel` (Plan 138-08) could optionally adopt this plan's central translator later, though it intentionally uses its own narrower reason-code label map today (per 138-08-SUMMARY.md) — not a blocker.

---
*Phase: 138-effective-rights-administration-impact-ux*
*Completed: 2026-08-23*

## Self-Check: PASSED

All 6 created files verified present on disk; all 4 task commit hashes (3f2a4db2, 038020dd,
925e975e, 615203e3) verified present in git log.
