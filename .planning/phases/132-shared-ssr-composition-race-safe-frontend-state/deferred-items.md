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
