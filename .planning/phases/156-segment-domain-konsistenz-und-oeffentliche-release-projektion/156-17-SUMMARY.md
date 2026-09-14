---
phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
plan: 17
subsystem: api
tags: [go, permissions, repository, openapi, nextjs, react, typescript, vitest]

# Dependency graph
requires:
  - phase: 156 (Plans 156-07/156-08/156-09/156-12/156-13)
    provides: permissions.SegmentCreditRoleCodes (segment-relevant role-code filter), applySegmentOriginCredits' two-condition segment-credit projection, PublicReleaseContributor DTO
provides:
  - Central Rollen-Code -> Segment-Beschriftung mapping (permissions.SegmentCreditLabelForRoles), paired one-to-one with SegmentCreditRoleCodes in a dedicated file
  - Additive PublicReleaseContributor.SegmentRoleLabel field, populated only for segment participants
  - Public release-detail page now shows the confirmed German segment-specific label (e.g. "Karaoke-Übersetzung") instead of the unrelated release role at each segment credit
affects: [156-UAT.md GAP-06 closure, future segment-credit or role-label work]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Paired role-filter + label-lookup co-located in one file with a bidirectional coverage test (ElementsMatch)", "Additive, omitempty DTO field wired through exactly one call site in an existing projection loop"]

key-files:
  created:
    - backend/internal/permissions/segment_credit_roles.go
  modified:
    - backend/internal/permissions/permissions.go
    - backend/internal/permissions/segment_credit_roles_test.go
    - backend/internal/repository/release_detail_public_repository.go
    - backend/internal/repository/release_detail_public_repository_segment_credits.go
    - backend/internal/repository/release_detail_public_repository_segment_credits_test.go
    - shared/contracts/openapi.yaml
    - frontend/src/types/releaseDetail.ts
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimelineSegmentDetails.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.test.tsx

key-decisions:
  - "Relocated SegmentCreditRoleCodes verbatim into the new segment_credit_roles.go instead of duplicating it, so permissions.go shrinks (950 -> 933 lines) instead of growing further past its 450-line-file-size discipline"
  - "SegmentRoleLabel is computed inline inside applySegmentOriginCredits's existing filter loop (one call site) rather than as a separate pass, keeping the two-condition filter and the label derivation co-located"
  - "loadContributors (normal contributor list) is deliberately never touched -- proven by a dedicated Test10 that calls it directly and asserts SegmentRoleLabel stays the Go zero value on every entry"

patterns-established:
  - "A role-code allow-list and its paired display-label map live in the same file with a test asserting ElementsMatch coverage in both directions, so a future unlabeled code addition fails a test instead of silently rendering an empty label"

requirements-completed: [P156-08, P156-09]

# Metrics
duration: 20min
completed: 2026-09-14
---

# Phase 156 Plan 17: Segment Credit Labels (GAP-06) Summary

**Public release-detail segment credits now show the confirmed German segment-specific label (e.g. "Karaoke-Übersetzung") derived from stable role codes, via a new central `permissions.SegmentCreditLabelForRoles`, while the normal release contributor list keeps its unchanged release-role label on the same API response.**

## Performance

- **Duration:** ~20 min (2026-09-14T15:43Z – 2026-09-14T15:56Z, code work; container rebuilds ran concurrently)
- **Started:** 2026-09-14T15:43:00Z
- **Completed:** 2026-09-14T15:55:58Z
- **Tasks:** 3
- **Files modified:** 9 (1 created, 8 modified)

## Accomplishments
- `backend/internal/permissions/segment_credit_roles.go` is now the single, dedicated, sub-450-line file holding both `SegmentCreditRoleCodes` (relocated verbatim) and the paired `segmentCreditLabels`/`SegmentCreditLabelForRoles`; `permissions.go` is strictly shorter than before (950 -> 933 lines)
- `PublicReleaseContributor.SegmentRoleLabel` is an additive, `omitempty` field populated only inside `applySegmentOriginCredits`'s existing participant-filter loop, never touching `loadContributors`'s normal contributor path
- `openapi.yaml` and the TS `PublicReleaseContributor` interface both carry `segment_role_label` as a non-required, additive property; `required` stays exactly `[fansub_group_id, member_id, name, role_label, avatar_url]`
- `ThemeTimelineSegmentDetails.tsx` renders `participant.segment_role_label` exclusively for segment participants; `ContributorsRow.tsx`/`.test.tsx` are byte-identical to before this plan (confirmed via empty `git diff --stat`)
- Live `curl` against the confirmed fixture (release 40 / segment 3 "op" / member 8 "Qc") proves the fix end-to-end on the running system after both containers were rebuilt

## Task Commits

Each task was committed test-first (RED) then implementation (GREEN):

1. **Task 1: Central label mapping in `permissions` package**
   - `c8b789e0` test(156-17): add failing tests for segment credit label mapping (RED)
   - `1d4082b5` feat(156-17): add central segment credit label mapping (GAP-06) (GREEN)
2. **Task 2: SegmentRoleLabel field + wiring into applySegmentOriginCredits**
   - `fb9b8f4d` test(156-17): add failing tests for SegmentRoleLabel wiring (RED)
   - `b19d595f` feat(156-17): wire SegmentRoleLabel into applySegmentOriginCredits (GAP-06) (GREEN)
3. **Task 3: Contract parity, frontend rendering swap, and live verification**
   - `8e8a57c8` test(156-17): add failing ThemeTimeline tests for segment_role_label rendering (RED, bundled with the additive openapi.yaml/TS contract prerequisites)
   - `f304d66c` feat(156-17): render segment_role_label instead of role_label in segment participants (GAP-06) (GREEN)

**Plan metadata:** committed separately below after STATE.md/ROADMAP.md updates.

## Files Created/Modified
- `backend/internal/permissions/segment_credit_roles.go` - new file: relocated `SegmentCreditRoleCodes`, new `segmentCreditLabels` map, `SegmentCreditLabelForRoles(roleCodes []string) string`
- `backend/internal/permissions/permissions.go` - `SegmentCreditRoleCodes` block removed (950 -> 933 lines)
- `backend/internal/permissions/segment_credit_roles_test.go` - 5 new top-level test functions: per-code labels, fixed order, encoder exclusion, empty input, bidirectional coverage
- `backend/internal/repository/release_detail_public_repository.go` - `PublicReleaseContributor.SegmentRoleLabel string \`json:"segment_role_label,omitempty"\`` added below `RoleCodes`
- `backend/internal/repository/release_detail_public_repository_segment_credits.go` - one call site: `contributor.SegmentRoleLabel = permissions.SegmentCreditLabelForRoles(contributor.RoleCodes)` before append, after the existing two filters
- `backend/internal/repository/release_detail_public_repository_segment_credits_test.go` - Test8/Test9/Test10: label value, live role-correction, `loadContributors` unaffected
- `shared/contracts/openapi.yaml` - `segment_role_label` property added to `PublicReleaseContributor`, not in `required`
- `frontend/src/types/releaseDetail.ts` - `segment_role_label?: string;` added with a matching doc-comment
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimelineSegmentDetails.tsx` - line 57's interpolation switched from `participant.role_label` to `participant.segment_role_label`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.test.tsx` - Mia/Noah fixtures gained `segment_role_label`; four assertions updated to match the new label text

## Decisions Made
- Bundled the additive `openapi.yaml`/TS-interface contract changes into the Task 3 RED commit (test prerequisites for the fixtures to type-check), keeping the component rendering swap as the isolated GREEN commit — see key-decisions in frontmatter for the rationale on file relocation and call-site placement.

## Deviations from Plan

None - plan executed exactly as written. `contributor.SegmentRoleLabel = permissions.SegmentCreditLabelForRoles(contributor.RoleCodes)` was inserted at the exact point specified in `<interfaces>`/`<action>` (after both existing filters, before append), and the relocated `SegmentCreditRoleCodes` block matches the confirmed byte-identical block from the plan.

## Issues Encountered
- `TEAM4S_PHASE117_TEST_DSN` was not exported in the shell. Created a throwaway Postgres database `team4s_phase117_test_p15617` on `team4sv30-db` (matching the required `^team4s_phase117_test_[a-z0-9]+$` pattern) via `docker exec team4sv30-db psql`, ran Task 2's real-Postgres subtests against it, then dropped it after verification (`DROP DATABASE team4s_phase117_test_p15617`) — no persistent schema/data left behind.
- The full `internal/repository` suite (run with the new DSN) shows exactly 50 pre-existing, environment-dependent failures (missing `TEAM4S_PHASE128_TEST_DSN`, Phase-134 Keycloak/port-18093 dependency) — the same count and names as the 156-16 baseline documented in `STATE.md`. 0 new failures introduced by this plan.

## User Setup Required

None - no external service configuration required.

## Live Verification (non-UAT, scripted)

After rebuilding both `team4sv30-backend` and `team4sv30-frontend` (`docker compose up -d --build`), a real `curl -s http://192.168.235.196:18092/api/v1/anime/1/group/1/releases/40` against the running `team4s_v2` database returned, in the SAME JSON response:

- Segment participant (`segments[]` where `theme_segment_id: 3`, name `"op"`, `member_id: 8`, "Qc"): `"segment_role_label": "Karaoke-Übersetzung"`, `"role_label": "Übersetzung"` — both present, both correct.
- Top-level contributor (`contributors[]`, same `member_id: 8`): `"role_label": "Übersetzung"`, `segment_role_label` key absent entirely (JSON `omitempty` — never `"Karaoke-Übersetzung"`, never present with any value).

This matches the plan's confirmed live fixture exactly and proves the fix end-to-end on the running system.

**Explicit non-claim:** `156-UAT.md`'s bundled live-UAT human checkpoint (browser-based Auftraggeber sign-off, GAP-02's 14 Origin/Segment-Contributor points plus the 3 still-open `156-HUMAN-UAT.md` items) is NOT run or marked passed by this plan. GAP-06 itself has no separate live-UAT checkpoint in `156-UAT.md` beyond the automated matrix and the operator's 2026-09-14 confirmation of the label table already recorded in `156-UAT.md`; this plan's scripted `curl` above is the only live-system proof performed, not a substitute for any outstanding human sign-off elsewhere in Phase 156.

## Next Phase Readiness
- GAP-06 is closed: the confirmed Rollen-Code -> Segment-Beschriftung table now renders correctly on the public release-detail page, additively and without regressing the normal contributor list, project-member page, or admin "Mitwirkende am Segment" candidate list (none of which read `SegmentRoleLabel`).
- Phase 156's remaining open item is unchanged by this plan: the bundled `156-UAT.md` live-UAT human checkpoint (GAP-02, 14 points, 3 still outstanding per `156-HUMAN-UAT.md`) — see `deferred-items.md`.

---
*Phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion*
*Completed: 2026-09-14*
