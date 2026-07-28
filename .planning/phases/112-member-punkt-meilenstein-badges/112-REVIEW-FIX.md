---
phase: 112-member-punkt-meilenstein-badges
fixed_at: 2026-07-28T07:35:58Z
review_path: .planning/phases/112-member-punkt-meilenstein-badges/112-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 2
skipped: 1
status: partial
---

# Phase 112: Code Review Fix Report

**Fixed at:** 2026-07-28T07:35:58Z
**Source review:** .planning/phases/112-member-punkt-meilenstein-badges/112-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope (Critical + Warning): 3
- Fixed: 2
- Skipped: 1

## Fixed Issues

### CR-01: `role_entry_*` badges for non-catalogued roles render raw internal codes and land in the wrong group

**Files modified:** `frontend/src/components/profile/memberBadgeLabels.ts`, `frontend/src/components/profile/MemberBadgeChain.test.tsx`
**Commit:** 296cac5e
**Applied fix:** Added the missing static `role_entry_*` presentation entries (`role_entry_designer`,
`role_entry_admin`, `role_entry_other`) to `MEMBER_BADGE_PRESENTATIONS` and
`PUBLIC_MEMBER_BADGE_CATALOG`, following the exact convention of the existing 8 entries
(`variant: 'info'`, `palette: 'indigo'`, `group: 'roles'`, `roleCode` set for the same-roleCode
merge with the Typ-3 role-volume badges). Labels use the `role_definitions.label_de` values from
the domain source of truth (`Design`, `Administration`, `Sonstiges`) phrased in the same
"Erste(s) …" pattern as the existing entries, with correct umlauts. Updated the two existing tests
in `MemberBadgeChain.test.tsx` that hardcoded the previous 8-code list to the correct 11-code list
so they assert the completed catalog rather than the pre-fix gap.

**Correction to the review's finding:** The review listed 4 missing codes (`designer`, `admin`,
`other`, `project_manager`), citing migration `0085_role_definitions_seed.up.sql` as the domain
source of truth. Cross-checking against the full migration history (as instructed) shows migration
`0112_role_model_cleanup.up.sql` **deletes** `project_manager` from `role_definitions` and migrates
its historical usages to `project_lead` (`DELETE FROM role_definitions WHERE code IN ('leader',
'project_manager')`), and this runs before `release_role_credit_lifecycles` even exists
(introduced later in `0137_phase108_contribution_sources.up.sql`). `RoleCodeExistsForContext`
queries the live `role_definitions` table, and the handler
(`fansub_anime_contributions_handler.go:235,365`) validates new `anime_contribution` role
assignments against it — so `project_manager` is no longer an assignable/reachable role code for
new contribution credits today. Adding a `role_entry_project_manager` presentation would therefore
be dead code for a code path that database constraints and application-level validation both make
unreachable going forward. Only 3 static entries were added (`designer`, `admin`, `other`), not 4.
This is documented here rather than silently deviating from the review without explanation.

**Verification:** `npx vitest run src/components/profile/memberBadgeLabels.test.ts
src/components/profile/MemberBadgeChain.test.tsx` — 29/29 tests pass (including the updated
11-code assertions). `npx tsc --noEmit` on the modified files — no errors.

### WR-02: `MemberBadgeChain.module.css` gives the "silver" tier the exact same accent color as the unstyled default

**Files modified:** `frontend/src/components/profile/MemberBadgeChain.module.css`
**Commit:** 8fef9feb
**Applied fix:** Changed the `[data-palette="silver"]` `--badge-accent` declaration from the
literal `var(--text-secondary)` (identical to the CSS default state) to
`color-mix(in srgb, var(--text-secondary) 70%, white 30%)`, giving Silver a distinct light steel
tone consistent with how Bronze and Platinum already derive their own `color-mix` accents, so the
Bronze -> Silver -> Gold -> Platinum tier progression is visually distinguishable again.

**Verification:** Re-read the modified CSS block to confirm the change is present and the
surrounding rule blocks (bronze/platinum) are unchanged. No CSS syntax checker is available in the
project tooling for this file type, so Tier 1 (re-read) was the applicable verification per the
3-tier strategy's fallback path; the change is a single custom-property value swap with no
selector/syntax risk.

## Skipped Issues

### WR-01: `member_profile_repository.go` is 1880 lines — nearly 4x the project's 450-line limit

**File:** `backend/internal/repository/member_profile_repository.go:535-543`
**Reason:** Confirmed the file is still 1880 lines. Per explicit scoping instructions for this
fix pass, this is pre-existing debt (not introduced by Phase 112) and the suggested remediation is
a full extraction of the `GetPublicMemberProfile` badge/points assembly block and/or the
`loadPublicBadges`/`loadTotalPoints` helpers into a new or existing repository file — a
multi-hundred-line structural refactor touching a heavily-used repository. This is too large and
risky to perform safely and atomically within a single review-fix pass (verification would require
much more than a syntax check to be confident no behavior regressed). Skipped intentionally rather
than attempting a partial/unsafe split; left for a dedicated follow-up task with full test-suite
coverage and manual review.

**Original issue:** `CLAUDE.md` requires production files to stay at or below 450 lines. This
phase added `loadRoleVolumeBadges`/`loadTotalPoints` wiring directly into
`member_profile_repository.go` instead of extracting the badge/points assembly path into the new
`member_profile_role_volume_repository.go`, growing the pre-existing over-limit file further
instead of helping bring it back under the ceiling.

---

_Fixed: 2026-07-28T07:35:58Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
