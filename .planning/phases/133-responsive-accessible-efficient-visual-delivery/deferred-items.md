# Deferred Items — Phase 133

## Pre-existing failing assertion in ResponsiveImage.config.test.ts (found during 133-02)

- **File:** `frontend/src/components/ui/ResponsiveImage.config.test.ts`
- **Test:** `ResponsiveImage profile-media configuration > allows public release-version contribution media without opening all media paths`
- **Assertion:** `expect(hasLocalMatch(localPatterns, '/media/admin/private/original.jpg')).toBe(false)` — currently receives `true`.
- **Root cause:** `next.config.mjs`'s `images.localPatterns` includes `{ pathname: '/media/**', search: '' }`, an unrestricted wildcard under `/media/`, so `hasLocalMatch` correctly (per the current pattern) also matches `/media/admin/private/original.jpg`. The test's intent (excluding an `/media/admin/` namespace) was never backed by a narrower pattern.
- **Confirmed pre-existing:** Verified via `git show 5640624f:frontend/src/components/ui/ResponsiveImage.config.test.ts` that this exact assertion existed unchanged before Plan 133-02, and Plan 133-02 does not modify `localPatterns` (only `dangerouslyAllowLocalIP` and `qualities`) — the failure is unrelated to 133-02's own edits.
- **Scope decision:** Out of scope for 133-02 (which is scoped to `dangerouslyAllowLocalIP` env-gating and `images.qualities`). Not auto-fixed per SCOPE BOUNDARY — fixing would require either narrowing `localPatterns` (an architectural change to an allow-list Task 1 was explicitly told not to touch) or removing the assertion, both out of this plan's authority.
- **Suggested follow-up:** A future plan touching `next.config.mjs`'s `localPatterns` should either narrow the `/media/**` pattern to exclude `/media/admin/**` or update/remove this stale assertion, whichever matches actual admin-media access requirements.

## Pre-existing failing tests found during 133-03 full profile-directory suite run

Running `npx vitest run src/components/profile/` (broader than this plan's own scoped target) surfaced 6 failures across 2 files that are unrelated to Plan 133-03's scope (`.heroPanel`/`.heroAvatar` `@container` conversion only). Confirmed pre-existing: `.membershipsList`'s `grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr))` (the value the failing test expects to NOT be present) already existed at `HEAD~2` (`git show HEAD~2:frontend/src/components/profile/profile.module.css`), i.e. before either of this plan's two task commits; neither failing test file (`MemberBadgeChain.test.tsx`, `MembershipsSection.test.tsx`) was touched by this plan.

- **File:** `frontend/src/components/profile/MembershipsSection.test.tsx`
  - **Test:** `MembershipsSection > keeps membership cards bounded in a responsive overflow-safe grid`
  - **Assertion:** expects `.membershipsList`'s `grid-template-columns` to be `repeat(3, minmax(0, 360px))` and to NOT contain `auto-fit`; actual CSS already uses `repeat(auto-fit, minmax(min(100%, 18rem), 1fr))`. Test appears to lock a grid strategy that predates or was superseded by a later CSS change (unrelated to Plan 133-03, which never touches `.membershipsList`).
- **File:** `frontend/src/components/profile/MemberBadgeChain.test.tsx`
  - **Tests:** `Phase 119 collection cards > ...` (2 cases), `Phase 120 Task 2: keeps SSR carousel content while expensive listeners remain dormant`, plus the pre-existing `TS2552`/`TS2322` typecheck errors already logged in `.planning/phases/132-shared-ssr-composition-race-safe-frontend-state/deferred-items.md`. Runtime assertions expect headings/labels (`Besondere Auszeichnungen`, `Gründungsmitglied · Gesperrt`, `data-contribution-family-stage="c..."`) and DOM structure this component's current render output no longer produces. Unrelated to CSS `@container` conversion; this plan does not import, render, or modify `MemberBadgeChain.tsx`/`.test.tsx`.
- **Scope decision:** Out of scope for 133-03 per SCOPE BOUNDARY — neither file is in this plan's `files_modified`, and this plan's own target test (`MemberProfileHero.test.tsx`, 28/28) is fully green. Not auto-fixed.
- **Suggested follow-up:** Whichever later Phase 133 plan next touches `MembershipsSection.tsx`/`.module.css` or `MemberBadgeChain.tsx`/`.test.tsx` (133-04/07/08/09 per STATE.md's Phase-133 decisions) should reconcile these locked-test expectations against current render/CSS output.

## Pre-existing failing tests confirmed still present after 133-04 (CSS module split)

Plan 133-04 (extracting `LockedStageArtwork.module.css`/`LayeredBadgeArtwork.module.css`) touched `MemberBadgeChain.tsx`/`.module.css`/`.test.tsx` directly and confirmed, via `git show 3696adb0:frontend/src/components/profile/MemberBadgeChain.test.tsx` (the pre-133-04 file), that the same 5 tests already failed before this plan's changes:

- `MemberBadgeChain > renders the generated contribution artwork without a fallback icon` — fails due to the already-documented `containe`/`container` TS2552 typo (lines 209-249 post-133-04; same typo present pre-133-04), which throws a runtime `ReferenceError` in that test.
- `MemberBadgeChain Phase 119 collection cards > renders independent family cards with authoritative progressbar values and exact copy`
- `MemberBadgeChain Phase 119 collection cards > keeps category order, a non-founder founding stage locked and the next year target reachable`
- `MemberBadgeChain Phase 119 collection cards > Phase 127 RED chain suppresses legacy Special while preserving five retained groups`
- `Phase 120 Task 2: keeps SSR carousel content while expensive listeners remain dormant`

None of these assert CSS selectors moved by 133-04; all assert unrelated DOM structure, heading text, or the typo-induced runtime error. Not auto-fixed per SCOPE BOUNDARY. Whichever later plan next touches `MemberBadgeChain.tsx`'s rendered DOM structure (133-07/08/09, or a dedicated cleanup plan) should reconcile the `containe` typo (trivial rename) and the 3 DOM/heading-content assertions against current render output.
