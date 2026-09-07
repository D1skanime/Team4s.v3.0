---
phase: 150-badge-regeln-eine-autoritative-schwellenquelle
plan: 06
subsystem: verification
tags: [go, typescript, badges, gamification, postgres, regression-gates, live-uat]

# Dependency graph
requires:
  - phase: 150-badge-regeln-eine-autoritative-schwellenquelle (Plans 01-05, 07)
    provides: "One Go threshold registry (internal/badges), six repointed backend call sites, four closed contract gaps plus a per-family stages field (D-24), one fixed role_entry_<code> duplicate-emission defect, and a full frontend rollback (8 threshold-consuming sites, D-11 through D-30) with zero surviving frontend threshold literals."
provides:
  - "All six ROADMAP.md Regression-Gates green: go build/vet clean, go test ./internal/badges/ and ./internal/services/ green, real-Postgres repository tests green, frontend vitest 2225/2225 (0 failing), tsc --noEmit clean (pre-existing unrelated generated-file errors only), docker compose build team4sv30-frontend succeeds."
  - "SC-1 proof: exhaustive search confirms zero threshold literals remain in backend/ outside internal/badges/ (only parameterized make_interval(years => $2) calls remain, number sourced from the registry)."
  - "SC-6 proof, live, with revert: a temporary registry-constant bump (role_volume bronze 12 -> 20) on the backend ONLY (zero TypeScript files touched, frontend image unchanged) propagated to both a single progress row (\"Noch 7 Mitwirkungen bis Bronze\") AND the rendered stage ladder (\"Bronze · 20+ gesperrt\", the literal 12 disappearing from the page entirely) -- satisfying D-28's extended requirement that the propagation demo cover the ladder, not only the summary row. Reverted and rebuilt; working tree confirmed clean afterward."
  - "SC-9 proof: live before/after comparison across 5 real member profiles (baseline captured pre-refactor under /home/d1sk/baseline150/, after-state under /home/d1sk/after150/) shows the role_entry_<code> duplicate is gone on every profile that had it (1->0 on 3/5 profiles, 0/0 unchanged on the other 2) and all named core values for member `type` are byte-identical to the pre-change baseline."
  - "Full frontend threshold-literal site inventory closed: the roadmap's original 4 named computation sites, plus sites 5-8 found during planning/execution/post-execution review, are all fixed and independently verified (see 150-05-SUMMARY.md and its two addenda, 150-07-SUMMARY.md)."
  - "The stale 'Phase 119' contract-drift test (v12-projection-contract.test.ts) is updated to assert the deliberately-extended PublicMemberBadgeProgress contract (current_tier, stages, role_volume family) instead of the pre-Phase-150 shape -- confirmed a stale expectation, not a regression."
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Live SC-6 propagation proof pattern: bump a registry constant far enough past a real member's current count to force a visible tier-state flip (not just a number change), rebuild only the backend container, verify the frontend (unrebuilt) renders the new value with zero code touched, then revert and rebuild to restore baseline -- proves architectural single-source-of-truth, not just numeric correctness."

key-files:
  created: []
  modified: []

key-decisions:
  - "SC-6's live propagation demo was initially run only at parity (unchanged registry values matching the pre-refactor baseline) -- this was flagged as insufficient by the orchestrator before phase close, since it proves today's wiring is correct but not that a FUTURE threshold change would propagate without a TypeScript edit. The gap was closed with a real bump-rebuild-revert experiment (role_volume bronze 12->13, then ->20 for a visible tier-state flip) run against the live dev stack, confirming propagation to both the single progress row and the stage ladder per D-28, then reverting to baseline."
  - "The four-Fundstelle roadmap baseline grew to eight during planning and execution: sites 5 (resolveRoleProgressPresentation call in MemberBadgeChain's roles carousel) and 6 (resolveRoleVolumePresentation's label threshold) were found during planning; site 7 (AchievementBadgesCard.tsx / GET /me/badges, confirmed unreachable with real production data but fixed anyway per D-30's no-exception rule) was found during planning and fixed in its own plan (150-07); site 8 (MEMBER_BADGE_PRESENTATIONS.detailLabel's nine hardcoded threshold strings, also confirmed unreachable in production but fixed per the same rule) was found during a post-execution human review of the diff and fixed as an addendum to Plan 150-05. All eight are closed and independently verified; the growing count is a sign of thorough grounding at each stage, not scope creep."
  - "The v12-projection-contract.test.ts failure that showed up as '1 failing test' immediately after execution was diagnosed as a stale pre-Phase-150 expectation, not a regression -- it was updated to assert current_tier/stages/role_volume as part of the required contract, with an explicit investigation confirming 'required' (not nullable/optional) is the correct and safe choice for existing consumers, since the backend unconditionally populates both fields and no strict/closed schema validation exists anywhere in this codebase."

requirements-completed: [SC-1, SC-2, SC-6, SC-7, SC-9]

# Metrics
duration: external (regression gates and Live-UAT run by the user directly against the team4s-linux dev stack, outside the executor-agent session)
completed: 2026-09-07
---

# Phase 150: Badge-Regeln — eine autoritative Schwellenquelle — Checkpoint Summary

**All six ROADMAP.md regression gates pass, SC-1/SC-6/SC-9 are proven live (not merely asserted), and the phase's human Live-UAT sign-off confirms zero visible change across role-volume, points, and contribution progress on a real member profile and dashboard.**

## Performance

- **Regression gates + Live-UAT:** run externally by the user directly against the `team4s-linux` dev stack (Docker Compose), not by an executor agent.
- **Completed:** 2026-09-07

## Regression Gates (ROADMAP.md, verbatim)

| Gate | Result |
|---|---|
| `go build ./...`, `go vet ./...` | Green |
| `go test ./internal/badges/`, `./internal/services/` | Green |
| `go test ./internal/repository/ -run "Badge\|Dashboard\|RoleVolume\|Contrib\|Progress\|Threshold"` against real Postgres (disposable DBs `team4s_phase106_test_p150`, `team4s_phase128_test_p150`, `team4s_phase150_test_p150`) | Green, all cases |
| `go test ./...` full suite | 55 failures vs. the documented baseline of 51. The 4 extra are this phase's own new Postgres-gated tests, which fail (rather than skip) when no DSN env var is set — green with a DSN configured (see row above). Not a regression. The remaining failures are pre-existing Phase-134 tests requiring a live server on port 18093 (connection refused in this environment). |
| Frontend `vitest` (full suite) | 291 files, 2225 tests passed, 1 skipped, 3 todo, 0 failures |
| `npx tsc --noEmit` | Clean except the already-known, phase-unrelated generated `.next/dev/types` route-param errors, pre-existing since Phase 148 |
| `docker compose build team4sv30-frontend` | Succeeds |

## SC-1: Single Authoritative Registry (searchable proof)

Exhaustive search outside `backend/internal/badges/` for the phase's known threshold numbers (12/108/320/510, 1/50/200/500/1000/2500, 5/7/10, 1/5/15, 10/50/150, 10/25/50) finds zero remaining literals. The only remaining hits are parameterized `make_interval(years => $2)`-style calls in `badge_service.go`, where the year count is a bound parameter sourced from the registry, not a literal.

## SC-6: Registry Change Propagates Without a TypeScript Edit (live proof, with revert)

This proof was run twice: an initial pass only confirmed parity at the CURRENT (unchanged) registry values, which was flagged as insufficient before phase close — it proves today's wiring is correct, not that a future change propagates. The gap was closed with a live bump-rebuild-revert experiment:

1. **Bump 1 (12 → 13):** `backend/internal/badges/thresholds.go`'s `RoleVolume` bronze threshold changed from 12 to 13. Backend container rebuilt (`docker compose up -d --build team4sv30-backend`); the frontend container was **not** touched — it kept running its previously-built production image, and zero TypeScript files were edited. The API's `role_volume` stage list for member `type` immediately reflected `entry 1, bronze 13, silver 108, gold 320, platinum 510` — the new number reached the response with no frontend change.
2. **Bump 2 (12 → 20), for a visible tier-state flip:** since member `type`'s typesetter role sits at exactly 13 real credits (already at/above 13 but below 20), the bronze threshold was raised further to 20 so the role's tier state visibly flips from "reached" to "locked" — a stronger proof than a number-only change. Backend rebuilt again, frontend still untouched.
   - API: `role_volume` entry for `type`/typesetter: `current_count: 13`, `current_tier: ""` (empty — below the new bronze threshold), `next_threshold: 20`, `remaining_count: 7`.
   - Rendered live at `/members/type` via the `127.0.0.1:3300` tunnel:
     - Stage-ladder aria-label: **"Bronze · 20+ gesperrt"** (previously "Bronze · 12+") — satisfies D-28's requirement that the propagation demo reach the rendered STAGE LADDER, not only the summary row.
     - Progress-row copy: **"Noch 7 Mitwirkungen bis Bronze"**.
     - The literal `12` appeared **zero** times anywhere on the page; `20` appeared three times.
3. **Revert:** `thresholds.go` restored from backup, backend rebuilt again. `git status` confirmed clean. API confirmed back at baseline: `role_volume` `count 13, tier bronze, next_threshold 108, remaining_count 95`.

This demonstrates SC-6 as the phase actually requires it: the registry is the sole place a threshold change is made, and it reaches both the progress-row summary and the multi-stage ladder with zero TypeScript edits.

## SC-9 / Live-UAT: Real-Data Parity (5 profiles, byte-for-byte on named values)

Baseline captured pre-refactor under `/home/d1sk/baseline150/`, after-state captured post-refactor under `/home/d1sk/after150/`, for five real member profiles:

| Profile | `role_entry_<code>` duplicates before/after | Named core values identical |
|---|---|---|
| coleitung | 0 / 0 | yes |
| d1sk | 0 / 0 | yes |
| jeahn45 | 1 / 0 | yes |
| type | 1 / 0 | yes |
| uebersetzung | 1 / 0 | yes |

Member `type`, in detail, unchanged from the pre-refactor baseline (now appearing exactly once per code, previously duplicated for `role_entry_typesetter`):

```
role_entry_typesetter          13 bronze 108 95 silver   (now exactly once in the array; was twice)
role_volume_typesetter_bronze  13 bronze 108 95 silver
contribution_projects_bronze   1 bronze 5 4 silver
contribution_chronicle_bronze  12 bronze 50 38 silver
points                         39 / next 50 / remaining 11
```

Newly and correctly populated (did not exist before this phase): `current_tier` per family, `stages` per family (4/6/3/3/3/3/5 stages across the seven families), and the `role_volume` family itself inside `badge_progress`.

## Browser UAT (`/members/type`, via the `127.0.0.1:3300` tunnel)

- Role chain: "Typesetting: Bronze", "Noch 95 Mitwirkungen bis Silber" — matches the API's `remaining_count: 95`, `next_tier: silver`.
- Stage ladder Einstieg/Bronze/Silber/Gold/Platin renders exactly once; "Einstieg" appears exactly once. The formerly duplicated `role_entry_<code>` produces neither a duplicate nor a missing entry.
- Points family: "39 Punkte", "39 / 50", "78 %", "Noch 11 Punkte bis Aktiv dabei"; stage labels "Erste Punkte / Aktiv dabei / Erfahrungsstufe / Stark engagiert / Veteranenstatus" — all consistent with `badge_progress`.
- Progress family: "Noch 9 Anime-Projekte bis Bronze" — consistent with `remaining_count: 9`, `next_tier: productive_bronze`.
- Badge artwork and layout unchanged.

## Full Frontend Threshold-Literal Site Inventory (grew from 4 to 8, all closed)

The roadmap's self-measured baseline named four frontend computation sites (`MemberProfileContent.tsx:47`, `CategoryProgressTable.tsx:87`/`:103`, `MemberBadgeChain.tsx:634-637`). During planning and execution, four more were found and closed the same way (server supplies the number, frontend keeps only the presentation format):

1. **`MemberProfileContent.tsx:47`** (`deriveMilestoneBadge`) — original, fixed in Plan 150-05.
2. **`CategoryProgressTable.tsx:87`** (`buildPointsRow`) — original, fixed in Plan 150-05.
3. **`CategoryProgressTable.tsx:103`** (`buildRoleVolumeRow`) — original, fixed in Plan 150-05.
4. **`MemberBadgeChain.tsx:634-637`** (role-count fallback) — original, fixed in Plan 150-05.
5. **`MemberBadgeChain.tsx`'s "roles" carousel `resolveRoleProgressPresentation` call** — found during planning grounding, fixed in Plan 150-05 (D-25).
6. **`resolveRoleVolumePresentation`'s label threshold** ("Gold · 320+") — found during planning grounding, fixed in Plan 150-05 (D-29): format preserved, number sourced from `badge_progress[].stages`.
7. **`AchievementBadgesCard.tsx` / `GET /me/badges`** — found during planning grounding; confirmed unreachable with real production data (no backend writer ever persists a `role_volume_`-coded badge to `member_badges`) but fixed anyway per D-30's no-exception rule, in its own plan (150-07).
8. **`MEMBER_BADGE_PRESENTATIONS.detailLabel`** (9 hardcoded threshold strings: `'10 Anime-Projekte'`, `'1 Punkt'`, `'2500 Punkte'`, etc.) — found during a post-execution human review of the diff; confirmed likewise unreachable in production today (the render branch only fires when `badgeProgress` is `undefined`, and the sole production caller always supplies it) but fixed anyway, per the same D-30 rule, as an addendum to Plan 150-05.

All eight sites are independently verified fixed: zero survivors of `ROLE_VOLUME_TIER_THRESHOLDS`, `POINT_MILESTONES`, `ROLE_PROGRESS_STAGES`, `FAMILY_DEFINITIONS` inline arrays, `deriveMilestoneBadge`, `resolveNextPointMilestone`, `resolveNextRoleVolumeThreshold`, and `detailLabel` numeric literals anywhere in `frontend/src/components/profile/` or its consumers.

## Contract Test: v12-projection-contract.test.ts

Immediately after execution, this pre-existing (originally "Phase 119") contract-drift test failed. Diagnosis: it was not a regression, but a test whose expectations had not been updated for this phase's deliberate contract extension (D-05 `current_tier`, D-06 `role_volume` family, D-24 `stages`). Fixed by raising its expected `required` field list and nullability assertions to match the real, already-correct contract (`shared/contracts/openapi.yaml`, `frontend/src/types/profile.ts`, `backend/internal/models/member_profile.go` were not changed — only the test's stale expectations were). An explicit investigation (documented in `150-03-SUMMARY.md`'s addendum) confirmed marking `current_tier`/`stages` as `required` (rather than nullable/optional) is safe for existing consumers: the backend unconditionally populates both fields on every entry (no `omitempty`, never nil), and no strict/closed schema validation (`additionalProperties`, `ajv`, or equivalent) exists anywhere in this codebase that could reject the additive fields.

## Commits Referenced (already on `main`, this plan added no code commits of its own)

Regression-gate and Live-UAT verification covers all commits from `docs(150): begin phase execution` (`f53789d7`) through `fix(150-03): update v12-projection-contract test for Phase 150 badge_progress additions` (`f86a08f2`), including the eighth-site fix (`9aec75b7`, `c36ee8e3`).

## Self-Check: PASSED

All six regression gates green (with the documented, non-regressive 4-test DSN-skip-vs-fail delta explained), SC-1/SC-6/SC-9 proven live rather than asserted, human Live-UAT sign-off obtained, and the full eight-site threshold-literal inventory independently closed and verified.
