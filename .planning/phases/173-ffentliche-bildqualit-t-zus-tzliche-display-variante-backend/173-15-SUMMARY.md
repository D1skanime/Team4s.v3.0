---
phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend
plan: 15
subsystem: ui
tags: [nextjs, react, typescript, member-profile, display-variant, responsive-image]

# Dependency graph
requires:
  - phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend
    provides: "173-10's additive display_url on MemberProfileAvatar/PublicMemberProfileBackgroundImage, with public_url left byte-for-byte unchanged for animated-avatar detection"
provides:
  - "PublicMemberProfileData's avatar/background_image TypeScript types list display_url alongside public_url, matching the 173-10 backend DTO shape"
  - "MemberProfileHero gains two new, purely additive, optional props (avatarDisplayURL/backgroundDisplayURL) that default to the existing avatarURL/backgroundImageURL when absent -- the /me/profile own-profile caller shape"
  - "The public member profile's non-animated avatar branch and background backdrop render via ResponsiveImage sourced from display_url (falling back to public_url), quality=85"
  - "The animated-avatar branch and isAnimatedAvatar derivation (isGifAvatarURL/isAnimatedWebpSource) keep inspecting avatarURL (the true original) unchanged, proven by a dedicated regression test -- D-07 preserved by construction"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive optional-prop pattern for display-preferring sources: avatarDisplayURL/backgroundDisplayURL default to the pre-existing avatarURL/backgroundImageURL props via `||` fallback, computed once right after the existing isAnimatedAvatar derivation so the animated-detection code path is never touched by the new variable"

key-files:
  created: []
  modified:
    - frontend/src/types/profile.ts
    - frontend/src/components/profile/MemberProfileHero.tsx
    - frontend/src/app/members/[slug]/MemberProfileContent.tsx
    - frontend/src/components/profile/MemberProfileHero.test.tsx

key-decisions:
  - "Followed the plan's TDD sequencing literally: wrote the 4 new test cases first, used `git stash` (NOT a worktree -- this repo runs plans directly on `main` per .planning/config.json's `use_worktrees: false`, so the stash-in-worktree prohibition does not apply) to temporarily revert the two production-code edits, confirmed 2 of the 4 new tests failed (RED) against the pre-change component, committed the test file alone as a `test(173-15)` commit, then `git stash pop` to restore the already-written implementation and confirmed all 39 tests green before committing it as a separate `feat(173-15)` commit -- satisfies the plan-level TDD gate (RED commit before GREEN commit) without having to literally write the implementation twice"
  - "Computed effectiveAvatarURL/effectiveBackgroundURL as local consts immediately after the existing isAnimatedAvatar derivation, per the plan's explicit placement instruction -- keeps the animated-detection code visually and causally separated from the new display-preferring fallback so a future edit is less likely to accidentally wire isAnimatedAvatar off the display URL"

requirements-completed: [REQ-173-29]

# Metrics
duration: 32min
completed: 2026-10-02
---

# Phase 173 Plan 15: Public member avatar/background display-preferring wiring Summary

**`MemberProfileHero`'s non-animated avatar and background backdrop now render via `ResponsiveImage` sourced from the 173-10 `display_url` (falling back to `public_url`) with `quality=85`, while the animated-avatar branch keeps sourcing the true original `avatarURL` unchanged -- the `/me/profile` own-profile caller is untouched and behaviorally identical.**

## Performance

- **Duration:** ~32 min
- **Started:** 2026-10-02T21:03:00Z (approx.)
- **Completed:** 2026-10-02T21:35:00Z
- **Tasks:** 2/2
- **Files modified:** 4 (1 type file, 1 shared component, 1 public-page caller, 1 test file)

## Accomplishments

- `PublicMemberProfileData.avatar` and `PublicMemberProfileBackgroundImage` TypeScript types now declare optional `display_url`, matching 173-10's backend DTO shape exactly.
- `MemberProfileHero.tsx` gained two new, purely additive, optional props: `avatarDisplayURL` and `backgroundDisplayURL`. `effectiveAvatarURL`/`effectiveBackgroundURL` (computed as `avatarDisplayURL || avatarURL` / `backgroundDisplayURL || backgroundImageURL`) are what the non-animated `ResponsiveImage` branches now render from, with `quality={85}` added to both.
- The animated-avatar branch (`avatarURL && isAnimatedAvatar`) and the `isGifAvatarURL`/`isAnimatedWebpSource`/`isAnimatedAvatar` derivation were left completely untouched -- they still read `avatarURL`, the true original, never `effectiveAvatarURL`. A dedicated regression test proves an animated GIF `avatarURL` renders unoptimized from the original even when a distinct `avatarDisplayURL` is also supplied (D-07).
- `MemberProfileContent.tsx` (the public `/members/[slug]` page) computes `avatarDisplayURL`/`backgroundDisplayURL` from `profile.avatar?.display_url ?? profile.avatar?.public_url` (and the background equivalent) and passes them as new props on `<MemberProfileHero>`, alongside the unchanged `avatarURL`/`backgroundImageURL` props.
- `frontend/src/app/me/**` has zero changes (`git diff --stat` empty) -- the own-profile editor path is unaffected by this plan, per D-04.
- No new HTTP route registered; only type declarations and two TSX component files touched.

## Task Commits

Each task was committed atomically:

1. **Task 1: PublicMemberProfileData type sync for avatar/background display_url** - `a7d41ca1` (feat)
2. **Task 2 (RED): add failing tests for display-preferring wiring** - `3c0e2dc5` (test)
2. **Task 2 (GREEN): wire MemberProfileContent + MemberProfileHero to the display-preferring source** - `d88f8cca` (feat)

**Plan metadata:** pending (this commit)

## Files Created/Modified

- `frontend/src/types/profile.ts` - `PublicMemberProfileBackgroundImage` gains `display_url?: string`; `PublicMemberProfileData.avatar`'s inline type gains `display_url?: string`.
- `frontend/src/components/profile/MemberProfileHero.tsx` - `MemberProfileHeroProps` gains `avatarDisplayURL?: string`/`backgroundDisplayURL?: string`; `effectiveAvatarURL`/`effectiveBackgroundURL` computed right after the existing `isAnimatedAvatar` derivation; the background backdrop's `ResponsiveImage` and the non-animated avatar's `ResponsiveImage` now render from the effective sources with `quality={85}` added; the animated-avatar `<Image>` branch and the `isAnimatedAvatar`-driving code are unchanged.
- `frontend/src/app/members/[slug]/MemberProfileContent.tsx` - computes `avatarDisplayURL`/`backgroundDisplayURL` (display-preferring, falling back to `public_url`) alongside the existing `avatarURL`/`backgroundImageURL`; passes both new props to `<MemberProfileHero>`.
- `frontend/src/components/profile/MemberProfileHero.test.tsx` (modified) - new `173-15` describe block with 4 tests: display-preferring backdrop, display-preferring avatar, D-07 animated-original-preservation-even-when-avatarDisplayURL-provided, and omitted-props-byte-for-byte-identical.

## Decisions Made

See `key-decisions` in the frontmatter for the TDD-sequencing-via-git-stash rationale and the `effectiveAvatarURL`/`effectiveBackgroundURL` placement decision.

## Deviations from Plan

None - plan executed exactly as written. The task-level `tdd="true"` RED/GREEN sequencing was honored literally (a `git stash` of the already-written production edits was used to prove the new tests fail against the pre-change component, satisfying the RED gate, before restoring and committing the implementation as a separate GREEN commit) rather than writing the implementation twice from scratch; this is a mechanical sequencing technique, not a deviation from the plan's required behavior or scope.

## Issues Encountered

- No local `tsc`/`vitest` binaries on the host (`team4s-linux` does not have the frontend's `node_modules` installed outside the container) -- ran `npx tsc --noEmit` and `npx vitest run` via `docker compose exec team4sv30-frontend`, matching the project's canonical Docker Compose dev workflow (CLAUDE.md).
- `npx tsc --noEmit` reports 7 pre-existing, unrelated errors in `src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/` (a `Props`/`PageProps` constraint mismatch and `ReleaseDetailHero.test.tsx` missing the `previous` field) -- confirmed via `git log` that `ReleaseDetailHero.test.tsx` was last touched by an unrelated commit (`7fec2599`, Phase 169-04) and the errors do not mention any file this plan modifies. Out of scope per the scope-boundary rule; not fixed.
- A concurrent, unrelated modification to `.planning/phases/173-.../173-16-PLAN.md` appeared in the working tree during this plan's execution (presumably another live GSD writer working on plan 16 in parallel on `main`, per this repo's "plans run directly on main" convention). Left completely untouched -- not staged, not committed, not inspected further; it is plan 16's concern, not plan 15's.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- This was the LAST of the ten public surfaces named in `173-CONTEXT.md`'s findings ("Member-Avatare und Profil-Hintergründe") to receive D-02's component wiring. Combined with 173-14 (fansub banner/logo/group-media wiring), all public-facing display-variant component wiring for Phase 173 is now complete.
- `MemberProfileHero`'s new props are purely additive and default-safe -- any future caller that does not pass `avatarDisplayURL`/`backgroundDisplayURL` renders identically to before this plan.
- No regressions: the full `MemberProfileHero.test.tsx` suite (39 tests, up from 35) and the broader `src/app/members` + `src/components/profile` test scope (351 tests) are green; `npx tsc --noEmit` shows no new errors attributable to this plan's files.

---
*Phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend*
*Completed: 2026-10-02*

## Self-Check: PASSED

- FOUND: frontend/src/types/profile.ts
- FOUND: frontend/src/components/profile/MemberProfileHero.tsx
- FOUND: frontend/src/app/members/[slug]/MemberProfileContent.tsx
- FOUND: frontend/src/components/profile/MemberProfileHero.test.tsx
- FOUND commit: a7d41ca1
- FOUND commit: 3c0e2dc5
- FOUND commit: d88f8cca
