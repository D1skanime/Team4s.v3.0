# Deferred Items

## From Plan 132-02, Task 3 (2026-08-15)

Pre-existing, unrelated failures discovered in `frontend/src/components/profile/MemberBadgeChain.test.tsx`
while extending it for the PMFE-06 full-mount contract lock. These predate plan 132-02 entirely
(introduced by `e034b53c wip(profile): in-flight carousel keyboard-nav + achievement heading
polish`, committed 2026-08-15 21:11 UTC, before 132-02 execution started) and are out of scope
per the executor's SCOPE BOUNDARY rule (only auto-fix issues directly caused by the current
task's changes).

- `npx tsc --noEmit` reports 9x `TS2552: Cannot find name 'containe'. Did you mean 'container'?`
  at lines 207/212/217/222/227/232/237/242/247 (test: "renders the generated contribution
  artwork without a fallback icon") - a typo (`containe` vs `container`) that predates this plan.
- `npx tsc --noEmit` reports 1x `TS2322` at the `badgeProgress` prop passed to `MemberBadgeChain`
  in "preserves a real value above Gold while rendering a full terminal bar" - the component's
  prop type does not (yet) declare `badgeProgress`, or the test's usage is stale.
- `npx vitest run` reports 5 pre-existing failing tests, all unrelated to progressive-disclosure/
  full-mount behavior:
  - `MemberBadgeChain > renders the generated contribution artwork without a fallback icon`
    (blocked by the `containe` typo above)
  - `MemberBadgeChain Phase 119 collection cards > renders independent family cards with
    authoritative progressbar values and exact copy`
  - `MemberBadgeChain Phase 119 collection cards > keeps category order, a non-founder founding
    stage locked and the next year target reachable` (missing `getByLabelText('Gründungsmitglied
    · Gesperrt')`)
  - `MemberBadgeChain Phase 119 collection cards > Phase 127 RED chain suppresses legacy Special
    while preserving five retained groups` (missing `[data-contribution-family-stage="..."]`
    elements)
  - `Phase 120 Task 2: keeps SSR carousel content while expensive listeners remain dormant`
    (expects a `Besondere Auszeichnungen` heading that the component no longer renders, per
    `f92aca78`/`8c2c6f8e` "remove duplicate achievement headings" / "remove aggregate achievement
    summary" quick-fix commits)

None of these touch progressive-disclosure/full-mount behavior (story clamp, carousel expand,
badge-group `items` prop). The 3 new PMFE-06 assertions added by plan 132-02 Task 3 all pass
cleanly; only the pre-existing, unrelated failures remain red. Recommend a follow-up `/gsd:quick`
or dedicated plan to reconcile `MemberBadgeChain.tsx`/`.test.tsx` drift from the WIP commit.

## From Plan 132-04 (2026-08-15)

Two additional pre-existing, unrelated failures discovered while running the full
`src/components/profile` + `src/app/members` suite as part of Plan 132-04's own verification
(none of the plan's three tasks touch `MemberBadgeChain.tsx`/`.test.tsx` or
`MembershipsSection.tsx`/`.test.tsx`/`profile.module.css`):

- `MemberBadgeChain.test.tsx > Phase 120 Task 2: keeps SSR carousel content while expensive
  listeners remain dormant` now also asserts a `Besondere Auszeichnungen` heading is present
  among the level-2 headings, but the component no longer renders it (consistent with the
  132-02 note that this exact assertion was already broken by the pre-`e034b53c` WIP drift and
  the later "remove aggregate achievement summary" quick-fix commits `f92aca78`/`8c2c6f8e`).
- `MembershipsSection.test.tsx > keeps membership cards bounded in a responsive overflow-safe
  grid` expects `grid-template-columns: repeat(3, minmax(0, 360px))` in `.membershipsList`, but
  the live `profile.module.css` rule is
  `grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr))` — a CSS/test drift
  predating this plan (`profile.module.css` is not in this plan's `files_modified`).

Also unchanged from prior plans: `npx tsc --noEmit` still reports the same `MemberBadgeChain.test.tsx`
`containe`/`badgeProgress` errors and the same two unrelated `.next/dev/types` generated-route-type
errors on `fansubs/[slug]` pages. The latter also blocks a full `npm run build` (pre-existing,
confirmed unrelated to any file this plan touches — `frontend/src/app/fansubs/[slug]/fansubprojekt/
[animeSlug]/page.tsx` was last touched by an unrelated revert commit `3b1e7346`, long before this
phase). Recommend a follow-up `/gsd:quick` to reconcile both the `MembershipsSection.tsx` grid-CSS
drift and the `fansubs/[slug]` typed-route generation issue.
