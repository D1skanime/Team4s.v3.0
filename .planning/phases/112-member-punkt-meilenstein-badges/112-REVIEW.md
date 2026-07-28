---
phase: 112-member-punkt-meilenstein-badges
reviewed: 2026-07-28T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - backend/internal/repository/member_profile_role_volume_repository.go
  - backend/internal/repository/member_profile_repository.go
  - backend/internal/repository/member_profile_repository_postgres_test.go
  - frontend/src/components/profile/memberBadgeLabels.ts
  - frontend/src/components/profile/memberBadgeLabels.test.ts
  - frontend/src/components/profile/MemberBadgeChain.tsx
  - frontend/src/components/profile/MemberBadgeChain.module.css
  - frontend/src/components/profile/MemberBadgeChain.test.tsx
  - frontend/src/app/members/[slug]/page.tsx
findings:
  critical: 1
  warning: 2
  info: 2
  total: 5
status: issues_found
---

# Phase 112: Code Review Report

**Reviewed:** 2026-07-28T00:00:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Reviewed the Typ-2 (Punkt-Meilenstein) and Typ-3 (Rollen-Volumen) badge additions across the
Go repository layer and the React/TS badge presentation layer. The threshold logic
(`highestRoleVolumeTier` / `deriveMilestoneBadge` / `ROLE_VOLUME_TIER_THRESHOLDS`) is correct
and well covered by boundary tests on both sides of the stack, and the live-projection design
(never persisting synthetic badges, recomputing on every read) is implemented consistently with
its own stated invariants.

The main defect found is a real, data-reachable gap between the **statically hardcoded**
`role_entry_*` presentation map (8 codes) and the **fully dynamic** `role_volume_*` resolver
added by this phase. `role_definitions` (the actual domain source of truth for
`anime_contribution` role codes) contains 12 codes, 4 of which (`designer`, `admin`, `other`,
`project_manager`) have no static `role_entry_*` entry. Because Phase 112 is exactly the point
where the two badge families (Typ 1 role-entry and Typ 3 role-volume) are merged into a single
UI row by `roleCode`, this asymmetry produces visibly broken output — raw internal codes shown
to end users and a badge quietly dropped into the wrong section — for any member credited in one
of those four roles. This was reachable prior to this phase too (the static map dates to Phase
110), but this phase's own `resolveRoleVolumePresentation` proves the fully-dynamic approach was
available and already used for the sibling badge family, making the omission on the `role_entry_*`
side a clear regression opportunity introduced by not applying the same fix uniformly.

## Critical Issues

### CR-01: `role_entry_*` badges for non-catalogued roles render raw internal codes and land in the wrong group

**File:** `frontend/src/components/profile/memberBadgeLabels.ts:53-80` (via `getMemberBadgePresentation`, line 180-193)
**File:** `backend/internal/repository/member_profile_repository.go:597-624` (`loadPublicBadges` role-entry query)

**Issue:**
`loadPublicBadges` (Go) builds `role_entry_<role_code>` for *every* distinct `role_code` that has
an `awarded` row in `release_role_credit_lifecycles`, with no restriction to a fixed role set —
confirmed by the `role_code TEXT NOT NULL CHECK (btrim(role_code) <> '')` constraint in
`database/migrations/0137_phase108_contribution_sources.up.sql:20` (no enum/FK constraint).

The actual domain of valid `anime_contribution` role codes is `role_definitions` (seeded in
`database/migrations/0085_role_definitions_seed.up.sql`), which contains 12 codes for that
context: `translator, editor, timer, typesetter, encoder, raw_provider, quality_checker,
project_lead, designer, admin, other, project_manager`. Role assignment is validated against this
same table via `RoleCodeExistsForContext` (`backend/internal/repository/hist_group_member_roles_repository.go:358`),
so all 12 are legitimately assignable to a contribution today, not merely theoretical.

On the frontend, `MEMBER_BADGE_PRESENTATIONS` in `memberBadgeLabels.ts` only defines
`role_entry_*` for 8 of the 12 codes (missing `designer`, `admin`, `other`, `project_manager`).
`getMemberBadgePresentation` falls back for unknown codes to:
```ts
{ label: badgeCode, variant: 'neutral', Icon: Sparkles, palette: 'mint', group: 'special' }
```
So a member credited (and confirmed) in, e.g., the `designer` role will have their earned badge
rendered with `label: 'role_entry_designer'` — a raw, un-translated snake_case identifier shown
directly in the public member profile UI — and it will appear in the "Besondere Auszeichnungen"
group instead of "Rollen".

This directly violates the project's mandatory German-language convention
(`CLAUDE.md` → Sprachqualität: user-facing strings must not leak raw/ASCII internal
identifiers), and it breaks the Phase 112 "merge role_entry + role_volume into one Rollen row by
roleCode" UX: if the same member also crosses the `role_volume_designer_bronze` threshold (12+
awarded `designer` credits), that badge — thanks to the fully dynamic
`resolveRoleVolumePresentation` — correctly resolves `group: 'roles', roleCode: 'designer'` and
renders under "Rollen", while the sibling `role_entry_designer` badge for the *same* role sits
disconnected under "Besondere Auszeichnungen" with a broken label. The two badges that are
supposed to be presented as one row for one role end up split and one of them is unreadable.

**Fix:** Apply the same dynamic-resolution approach already used for `role_volume_*` to
`role_entry_*`, instead of relying solely on a hand-maintained static map:
```ts
// in getMemberBadgePresentation, before falling back to the generic default:
if (badgeCode.startsWith('role_entry_')) {
  const roleCode = badgeCode.slice('role_entry_'.length)
  const roleOption = FANSUB_GROUP_ROLE_OPTIONS.find((o) => o.code === roleCode)
  if (roleOption) {
    return {
      label: `Erste ${roleOption.label}`, // or a dedicated per-role copy table
      variant: 'info',
      Icon: Sparkles,
      palette: 'indigo',
      group: 'roles',
      roleCode,
    }
  }
}
```
At minimum, add the 4 missing static entries (`role_entry_designer`, `role_entry_admin`,
`role_entry_other`, `role_entry_project_manager`) to `MEMBER_BADGE_PRESENTATIONS` and
`PUBLIC_MEMBER_BADGE_CATALOG` so the catalog stays complete as new roles are added, and consider
sourcing the role-code list from `role_definitions`/`FANSUB_GROUP_ROLE_OPTIONS` instead of
duplicating it by hand in three places (Go DB seed, `FANSUB_GROUP_ROLE_OPTIONS`,
`MEMBER_BADGE_PRESENTATIONS`).

## Warnings

### WR-01: `member_profile_repository.go` is 1880 lines — nearly 4x the project's 450-line limit, and this phase added to it instead of extracting further

**File:** `backend/internal/repository/member_profile_repository.go:535-543`
**Issue:** `CLAUDE.md` states production code files must stay at or below 450 lines and be split
before becoming monolithic. `member_profile_repository.go` is already 1880 lines before this
phase (pre-existing debt, not newly introduced), but this phase's own commit (`3419d53a`) chose
to wire `loadRoleVolumeBadges`/`loadTotalPoints` calls directly into `GetPublicMemberProfile` in
this file rather than extracting the whole public-profile-badge-assembly path into the new
`member_profile_role_volume_repository.go` (which was correctly created for the tier-computation
logic itself, showing the pattern was already known and available).
**Fix:** When touching this file again, extract `GetPublicMemberProfile`'s badge/points
assembly block (lines ~526-566) and/or the `loadPublicBadges`/`loadTotalPoints` helpers into the
existing `member_profile_role_volume_repository.go` (or a new `member_profile_badges_repository.go`)
to start bringing the file back under the 450-line ceiling instead of only extracting new code.

### WR-02: `MemberBadgeChain.module.css` gives the "silver" tier the exact same accent color as the unstyled default, making Silver visually indistinguishable from a generic/fallback badge

**File:** `frontend/src/components/profile/MemberBadgeChain.module.css:86-90` and `:122-125`
**Issue:**
```css
.badgeStep,
.badgeStepLocked {
  --badge-accent: var(--text-secondary);   /* base/default */
  ...
}
...
.badgeStep[data-palette="silver"],
.badgeStepLocked[data-palette="silver"] {
  --badge-accent: var(--text-secondary);   /* identical value */
}
```
Every other palette (gold, indigo, orange, mint, red, bronze, platinum) gets a distinct
`color-mix`/theme-color accent, but `silver` re-declares the exact same base value, so a
role-volume Silver badge (`role_volume_<role>_silver`) is visually identical to a badge that
matched no known palette at all. This weakens the visual tier progression
(Bronze → Silver → Gold → Platinum) the feature is meant to communicate, since Silver reads as
"no special color" rather than a distinct metallic tone.
**Fix:** Give silver its own distinguishable accent, e.g.
`--badge-accent: color-mix(in srgb, var(--text-secondary) 70%, white 30%)` or a light steel-blue
tone, so it's visually distinct from the CSS default state.

## Info

### IN-01: Bronze/Silver/Gold role-volume tiers all reuse the same `Medal` icon

**File:** `frontend/src/components/profile/memberBadgeLabels.ts:143-148`
**Issue:** `ROLE_VOLUME_TIER_ICONS` maps `bronze`, `silver`, and `gold` all to `Medal`, with only
`platinum` getting a distinct `Gem` icon. Combined with WR-02 (Silver's accent color also being
indistinct), Bronze/Silver/Gold rows are differentiated only by the `Medal · N+` label text, not
by any icon shape difference, which is a minor discoverability/glanceability regression for a
tiered-badge UI.
**Fix:** Consider distinct icons per tier (e.g., `Medal` for bronze, `Award` for silver, `Trophy`
for gold, `Gem` for platinum) to reinforce the tier hierarchy at a glance, consistent with how
`point_milestone_*` already uses progressively "bigger" icons (`Flag → Flame → Award → Medal →
Trophy → Gem`).

### IN-02: Threshold constants (`12/108/320/510`) are duplicated by hand across Go and TypeScript with no shared source of truth

**File:** `backend/internal/repository/member_profile_role_volume_repository.go:15-28`
**File:** `frontend/src/components/profile/memberBadgeLabels.ts:129-134`
**Issue:** The tier thresholds are intentionally duplicated per the code comments (Go computes
which tier is *earned*, TS only needs the thresholds for *display*), and both sides have solid
boundary-value test coverage, so this is not a functional bug today. It is, however, a magic-number
duplication that will silently drift if one side's thresholds are ever tuned without updating the
other — there's no shared contract (e.g., a generated constant or a value returned from the API)
enforcing them staying in sync.
**Fix:** Low priority given current test coverage; if thresholds change, consider exposing them
from the API (e.g., alongside the tier badge itself) or a codegen'd shared contract instead of
hand-syncing two files.

---

_Reviewed: 2026-07-28T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
