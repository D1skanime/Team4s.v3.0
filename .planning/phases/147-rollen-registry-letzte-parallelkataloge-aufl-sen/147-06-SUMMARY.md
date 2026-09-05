---
phase: 147-rollen-registry-letzte-parallelkataloge-aufl-sen
plan: 06
subsystem: auth
tags: [go, typescript, postgres, integration-gate, live-uat, role-registry]

# Dependency graph
requires:
  - phase: 147-01
    provides: "role_code on PublicReleaseNote/ProjectMemberNote + OpenAPI contract + real-Postgres proof"
  - phase: 147-02
    provides: "role_code typed and threaded into PublicNoteCard + consumers, roleColors.ts removed"
  - phase: 147-03
    provides: "useGroupMembersTab.ts migrated onto the catalog-driven labelForRole path"
  - phase: 147-04
    provides: "models.AppGlobalRoles single Go source + 4 derived consumers + source-contract test"
  - phase: 147-05
    provides: "Four unreferenced role constants removed from permissions.go"
provides:
  - "Full green regression sweep across backend (build/vet/test), frontend (typecheck/lint/test/build), and the OpenAPI contract, confirming no cross-plan interaction broke after HC-01/HC-02/HC-03/HC-09 landed"
  - "Live UAT sign-off on :3000 confirming public note rendering (release-detail and project-member notes) is visually unchanged, and that the role_code plumbing fixes a real pre-existing regression (label_de='Typesetting' no longer falls back to 'other')"
  - "Two out-of-scope named-debt findings documented (undefined --role-accent-* CSS tokens; ProjectMemberHero's categoryForRole() emitting a raw hex color_key as data-role-code) — explicitly not fixed, per phase scope boundary"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified: []

key-decisions:
  - "Verification read the current tip of main (commit d0830c64), not the state after 147-02, because a review pass landed additional corrections before the live UAT: real role_code fixtures in ReleaseNotesList.test.tsx (were display labels), KeycloakManagedGlobalRoles reverted from an AppGlobalRoles alias to its own independently-authoritative list (Keycloak JIT whitelist vs. DB CHECK have different authority), AssignableRoles now returns slices.Clone(models.AppGlobalRoles) so the canonical slice can't be mutated via the response, the source-contract test now binds to the chk_app_user_global_roles_role constraint name and asserts NotEmpty instead of a hardcoded 3-value expectation, and a permissions.go comment umlaut fix"
  - "51 backend test failures in the full go test ./... run are pre-existing baseline noise (missing TEAM4S_PHASE117/128/134-DSN env vars causing hard failures instead of skips, plus a couple of already-red tests unrelated to this phase) — confirmed identical against a baseline checkout of commit c09d23c8 via git archive, so Phase 147 introduced zero new backend test failures"
  - "The two CSS/color findings below are explicitly out of this phase's scope (HC-01/HC-02/HC-03/HC-09 only) and are recorded here as named debt rather than fixed"

patterns-established: []

requirements-completed: [HC-01, HC-02, HC-03, HC-09]

# Metrics
duration: external (orchestrator review pass + VM test run + live UAT, not tracked as a single session)
completed: 2026-09-05
---

# Phase 147 Plan 06: Full Regression Gate + Live UAT Sign-Off Summary

**Full backend/frontend/contract regression sweep is green (zero new failures vs. baseline) and a live UAT on `:3000` confirms public note rendering is unchanged and a pre-existing role-label regression is fixed — HC-01, HC-02, HC-03, and HC-09 are closed.**

## Performance

- **Tasks:** 2/2 completed
- **Files modified:** 0 (this plan is verification-only, `files_modified: []` per its own frontmatter)
- **Completed:** 2026-09-05

## Task 1: Full automated regression sweep — Result: PASS

Executed on the VM against the current tip of `main` (commit `d0830c64`, which includes a review-fix
pass on top of 147-02's tip — see Deviations below):

| Command | Result |
|---|---|
| `go build ./...` | green |
| `go vet ./...` | green |
| `go test ./...` (full suite) | 51 failing tests — **identical set** to the baseline measured against a separate `git archive` checkout of commit `c09d23c8` (pre-Phase-147). All 51 are pre-existing: tests that fail instead of skip without `TEAM4S_PHASE117`/`128`/`134` DSNs, plus a small number of tests already red before this phase (memorial guard, last-active-manager). **Zero new backend test failures from Phase 147.** |
| `go test ./internal/migrations/ -run TestPhase147` | PASS |
| `go test ./internal/permissions/ ./internal/models/ ./internal/handlers/` | all green |
| `go test ./internal/repository/...` with real Postgres (`TEAM4S_PHASE117_TEST_DSN` → `team4s_phase117_test_p147`) | `TestPublicNoteRoleCode` PASS (both sub-cases); all pre-existing Phase-117/segment tests still PASS despite the extended stub schema |
| `npx tsc --noEmit` (frontend, in container) | exit 0 |
| `npx vitest run` (frontend, in container) | 290 files / 2199 tests passed, 1 skipped, 3 todo, 0 failures |
| `npx eslint src` (frontend, in container) | 11 errors + 329 warnings, **all pre-existing** in files untouched by Phase 147 (`react-hooks/set-state-in-effect` etc.) |
| `docker compose build team4sv30-frontend` | succeeded (production build is authoritative) |

Acceptance-criteria greps also re-confirmed repo-wide: no remaining `roleColorCode`/`ROLE_CODE_BY_LABEL` references in `frontend/src`, and no remaining `RoleTranslator`/`RoleTypesetter`/`RoleTechadmin`/`RoleGfxler` references in `backend/internal` Go code outside the pre-existing inert comment block.

## Task 2: Live UAT — Result: APPROVED

Backend rebuilt, frontend restarted on the VM. All four `<how-to-verify>` steps from the plan confirmed:

1. **API — release-detail notes** (`GET /api/v1/anime/1/group/1/releases/27/notes`): response now carries `role_code` (`timer`/`encoder`/`translator`) alongside the existing `role_label`.
2. **API — project-member notes** (`GET /api/v1/anime/1/group/1/members/type/notes`): `role_code: "typesetter"` returned alongside `role_label: "Typesetting"`.
3. **SSR HTML** (`/anime/1/group/1/releases/46`): contains `data-role-code="typesetter"`. Before this phase, the now-deleted label map had no entry for `label_de="Typesetting"` and would have fallen back to `"other"` — this is a live-confirmed regression fix, not just parity.
4. **Browser via the `127.0.0.1:3300` tunnel**: `/fansubs/new-subs/fansubprojekt/buddy-complex/mitwirkende/type` renders 12 note cards, all with `data-role-code="typesetter"`; visual rendering unchanged and correct.

**Resume-signal:** approved (all four checks render/behave identically to before this phase, per the results supplied for this SUMMARY).

## Files Created/Modified

None from this plan directly — it is the integration/verification gate (`files_modified: []`). The review-fix commit `d0830c64` (authored before this plan's regression sweep, part of the "current tip of main" this sweep validated) touched:
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.test.tsx`
- `backend/internal/models/app_auth.go`
- `backend/internal/permissions/permissions.go`
- `backend/internal/repository/admin_users_repository.go`
- `backend/internal/migrations/phase147_app_global_roles_source_contract_test.go`

## Decisions Made

See `key-decisions` in frontmatter above.

## Deviations from Plan

**Not a deviation from this plan's own tasks, but a material precondition:** a review pass (commit
`d0830c64`, authored after 147-02 and before this plan's regression sweep/UAT) applied five corrections
found during a post-hoc diff review of the whole phase:

1. `ReleaseNotesList.test.tsx` — role_code test fixtures had carried *display labels* ('Timing',
   'Übersetzung', 'Karaoke', 'Editing') as the code value — exactly the label/code confusion this
   phase exists to eliminate. Replaced with real codes (`timer`, `translator`, `karaoke_fx`, `editor`);
   formatting restored.
2. `models/app_auth.go` — `KeycloakManagedGlobalRoles` is no longer a plain alias of `AppGlobalRoles`.
   Both lists share the same three values today, but they carry different authority (Keycloak JIT
   whitelist vs. DB CHECK constraint); an alias would have made a future global role that the DB allows
   but Keycloak must not auto-provision inexpressible.
3. `admin_users_repository.go` — `AssignableRoles` now returns `slices.Clone(models.AppGlobalRoles)`
   so the canonical slice cannot be mutated by a caller holding the response value.
4. `phase147_app_global_roles_source_contract_test.go` — now binds to the constraint name
   `chk_app_user_global_roles_role` specifically (requiring exactly one match) instead of a generic
   `CHECK (role IN (...))` pattern, and asserts `NotEmpty` instead of a hardcoded three-value
   expectation — a future fourth global role no longer fails this test spuriously.
5. `permissions.go` — comment umlaut correction.

This sweep and the live UAT ran against `main` **including** this review-fix commit, per explicit
instruction, rather than against the state immediately after 147-02.

## Issues Encountered

None — no new backend or frontend regressions found. The 51 backend test failures observed are a
pre-existing baseline condition, not introduced by this phase (confirmed via baseline comparison
against commit `c09d23c8`).

## Out-of-Scope Findings (Named Debt — Documented Only, NOT Fixed)

Per this phase's explicit scope boundary (HC-01/HC-02/HC-03/HC-09 only), the following two findings
surfaced during live UAT are recorded here as debt and were deliberately left untouched:

1. **Undefined `--role-accent-*` CSS custom properties.** `--role-accent-<code>` and
   `--role-accent-default` are referenced by `PublicNoteCard.module.css` and related modules but are
   defined nowhere in the repo (not in `frontend/src/styles/globals.css` or elsewhere). Confirmed live
   via `getComputedStyle` in the browser: both resolve to an empty string. Consequence: the public note
   card's role-based accent color is inert today, independent of this phase — Phase 147 only
   establishes the correct `data-role-code` attribute value; it does not (and was never scoped to)
   restore the missing color tokens.
2. **`ProjectMemberHero`'s `data-role-code` is a raw hex value, not a role code.** Since a prior,
   unrelated change bound this component to a hex color palette, `categoryForRole()` now returns the
   raw `color_key` — live-measured as `data-role-code="#7b3c4e"`. This also matches no CSS selector and
   is unrelated to the HC-01/HC-02/HC-03/HC-09 findings this phase closes.

Both items are out of scope for any plan in Phase 147 and require separate, dedicated follow-up work
if the role-accent coloring is ever to become visually functional again.

## User Setup Required

None.

## Next Phase Readiness

Phase 147 is functionally complete: all four hardcoding findings (HC-01, HC-02, HC-03, HC-09) are
closed, verified by real-invocation tests, and confirmed unchanged/regression-fixed in a live
environment. Phase 147 is the last phase in the v1.4 "Coverage" milestone's execution order
(136 → 147). Formal goal verification (`147-VERIFICATION.md`) follows this summary.

---
*Phase: 147-rollen-registry-letzte-parallelkataloge-aufl-sen*
*Completed: 2026-09-05*
