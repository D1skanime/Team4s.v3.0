# Phase 71 Research: UI-Politur Contributions und Member-Profil

**Date:** 2026-06-22
**Mode:** Current-code analysis after later phases 82, 83, and 88.
**Question:** What remains to plan for Phase 71 now that later phases have already carried parts of the scope forward?

## Artifact State

Phase 71 has planning inputs but no execution plan:

- `71-CONTEXT.md` exists and contains D-01 through D-17.
- `71-UI-SPEC.md` exists and is approved as a brownfield custom-design-system contract.
- `71-DISCUSSION-LOG.md` exists and is audit-only.
- No `71-*-PLAN.md` files exist.
- No `71-*-SUMMARY.md` files exist.
- `gsd-sdk query init.plan-phase 71` reports `status: Pending`, `has_context: true`, `has_research: false`, `has_plans: false`, `plan_count: 0`.

## Cross-Phase Reality Check

Some original Phase 71 work was later implemented by newer phases:

- Phase 82 integrated Mitwirkende into the releases/project cockpit and introduced `ProjectCockpitBadges`.
- Phase 83 Plan 07 explicitly folded in the old Phase 71 UI primitive todo:
  - `AnimeContributionModal.tsx` imports `FormField` and `Select` from `@/components/ui`.
  - `AnimeContributionModal.tsx` uses `Select` in a `FormField` wrapper for the focused role member picker.
  - `ReleaseVersionBreakdown.tsx` uses the global `Button` primitive and no native form controls.
- Phase 88 changed `patchMyBadgeVisibility` to support token-free normal callers, but did not remove public/display badge mutation controls from `MemberBadgeChips`.

This means Phase 71 should not re-implement the admin cockpit from scratch. It should close the remaining gaps and document the cross-phase evidence.

## Success Criteria Status

| Criterion | Current Status | Evidence |
|---|---|---|
| P71-SC1: `AnimeContributionModal` Select/FormField and `ReleaseVersionBreakdown` primitives | Mostly satisfied by Phase 83 | `AnimeContributionModal.tsx` imports and renders `FormField` + `Select`; `ReleaseVersionBreakdown.tsx` uses `Button`. Need focused regression evidence and summary, not a rewrite. |
| P71-SC2: Mitwirkende consolidation and permission bridge decision | Partially satisfied | Admin releases cockpit uses Mitwirkende; `mainTabRouting.ts` has no `anime-beitraege` tab. Permission bridge is only in `71-CONTEXT.md`; `.planning/DECISIONS.md` is absent, so the durable product decision still needs a home. Public/member labels still contain `Beiträge`. |
| P71-SC3: Member profile params, badge edit separation, timeline, media image | Partially open | `/admin/my-groups/[id]/page.tsx` reads `params?.id` synchronously in a client page; `MemberBadgeChips.tsx` still imports `patchMyBadgeVisibility` and renders `Ausblenden`; `MemberRoleTimeline.tsx` still renders an empty role section; media CSS already has fixed ratio/object-fit but should be verified. |
| P71-SC4: Display/edit separation and phase-limited primitive migration | Partially open | `/me/profile` already owns badge visibility through `AchievementBadgesCard`; public/display chips still mutate. Native controls outside the Phase 71 surfaces remain intentionally out of scope. |

## Current Code Findings

### Admin Contribution Surfaces

- `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx`
  - Uses `Button`, `EmptyState`, `FormField`, `Modal`, and `Select`.
  - Still contains checkbox `<input>` elements for role chips. These are not the original Phase 71 dropdown target and should not be broadened unless executor finds they are user-facing primitive violations in touched scope.
- `frontend/src/components/anime/ReleaseVersionBreakdown.tsx`
  - Uses `Button`.
  - Has no native `<select>`, `<input>`, or `<textarea>`.
  - Comments still say "Beiträge"; this is not user-facing, but touched copy should move toward "Mitwirkende".
- `frontend/src/app/admin/fansubs/[id]/edit/mainTabRouting.ts`
  - `MAIN_TABS` has no `anime-beitraege` tab.
  - It does have a later legacy redirect for `anime-projekte` to `releases`. Phase 71 originally wanted no redirect for the old tab, but this later decision belongs to Phase 82 and should not be undone.

### Member/Profile Surfaces

- `frontend/src/components/profile/MemberBadgeChips.tsx`
  - Still imports `patchMyBadgeVisibility`.
  - Still renders an `Ausblenden` button when `isOwnProfile`.
  - This violates D-10: public/display badge chips should be read-only; badge visibility management belongs in `/me/profile`.
- `frontend/src/app/me/profile/components/AchievementBadgesCard.tsx`
  - Already provides edit-context badge visibility management with `FormField` and `Select`.
  - Uses `formatMemberBadgeLabel`, which still embeds text glyph prefixes instead of lucide icons.
- `frontend/src/components/profile/memberBadgeLabels.ts`
  - Current labels include glyph prefixes such as star/diamond/check and mojibake in PowerShell output.
  - Phase 71 wants lucide icons plus Badge variants per badge code. Best implementation is to split label text from presentation metadata rather than keep glyphs in strings.
- `frontend/src/components/profile/MemberBadgeHighlights.tsx`
  - Public badge highlights render custom spans, not the global `Badge` primitive.
  - Should reuse a shared badge presentation map.
- `frontend/src/components/profile/MemberRoleTimeline.tsx`
  - Still renders a section with "Noch keine Rollen oder Beiträge öffentlich sichtbar." for an empty list.
  - D-17 wants the section hidden entirely when there are no roles.
- `frontend/src/components/profile/RecentMediaSection.tsx`
  - Component still uses a raw `<img>`, but `profile.module.css` already gives `.recentMediaThumb` a `16 / 9` ratio and the image `width: 100%`, `height: 100%`, `object-fit: cover`.
  - A focused test should assert the card structure and image box rather than rewrite media ownership.
- `frontend/src/app/members/[slug]/page.tsx`
  - Correctly awaits `params`.
  - Still labels the public contribution section as "Beiträge"; Phase 71 copy wants "Mitwirkende".
- `frontend/src/app/admin/my-groups/[id]/page.tsx`
  - Uses a client component and reads `params?.id` synchronously.
  - It should use `useParams` or an equivalent stable route param seam to avoid sync dynamic API errors.

## Scope Guardrails

Do not broaden Phase 71 into:

- a project-wide native input/select/textarea migration;
- a redesign of public member profile pages;
- implementation of the permission bridge grant UI or backend grants;
- custom badge artwork upload;
- release-version contribution model changes already owned by Phase 83;
- public/admin user-management copy not explicitly in Phase 71.

## Recommended Plan Shape

1. **Plan 01: Cross-phase consolidation and permission bridge documentation**
   - Verify and document which Phase 71 admin/cockpit items were satisfied by Phase 82/83.
   - Create the durable permission bridge decision artifact because `.planning/DECISIONS.md` is absent.
   - Keep phase-limited scope clear.

2. **Plan 02: Badge display/edit separation and badge presentation**
   - Make `MemberBadgeChips` display-only.
   - Keep `/me/profile` as the edit surface through `AchievementBadgesCard`.
   - Introduce shared badge presentation metadata with labels, icons, and Badge variants.
   - Update tests around public/display badges and edit badge management.

3. **Plan 03: Public member profile polish and params correctness**
   - Rename Phase 71 profile-facing "Beiträge" labels in touched public/member surfaces to "Mitwirkende" where appropriate.
   - Hide empty role timelines.
   - Verify/finalize recent media image aspect behavior.
   - Fix `/admin/my-groups/[id]` client params handling.

4. **Plan 04: Verification and handoff**
   - Run focused tests, typecheck/lint where feasible, `git diff --check`.
   - Write the summary.
   - Record deliberately deferred items: global native-control cleanup, permission-bridge implementation, custom badge artwork.

## Focused Checks To Use

- `npm --prefix frontend run test -- src/app/admin/fansubs/[id]/edit/AnimeContributionModal.test.tsx src/components/profile/MemberRoleTimeline.test.tsx src/components/profile/RecentMediaSection.test.tsx src/app/me/profile/components/AchievementBadgesCard.test.tsx src/app/admin/my-groups/[id]/page.test.tsx`
- `npm --prefix frontend run typecheck`
- `npm --prefix frontend run lint`
- `git diff --check`
- Targeted `rg` checks for:
  - `patchMyBadgeVisibility` in `frontend/src/components/profile/MemberBadgeChips.tsx`
  - `Ausblenden` in public/display badge chips
  - `params?.id` or `params.id` in `frontend/src/app/admin/my-groups/[id]/page.tsx`
  - `anime-beitraege|Anime-Beitraege|Anime-Beiträge` in admin fansub edit runtime files
