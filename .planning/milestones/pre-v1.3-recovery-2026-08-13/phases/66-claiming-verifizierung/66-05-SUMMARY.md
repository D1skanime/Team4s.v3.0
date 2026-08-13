---
phase: 66-claiming-verifizierung
plan: 05
status: complete
completed: 2026-06-02
---

# 66-05 Summary - Profile Verification UI

## Implemented

- Added `VerifiedBadge` with `CheckCircle` and `aria-label="Verifiziertes Mitglied"`.
- Extended `MemberProfileHero` to render the verified badge when `isVerified` is true.
- Extended `MemberRoleTimeline` so `(historisch)` is hidden for verified profiles.
- Added `ClaimStatusCard` to `/me/profile` with:
  - noindex/search-engine checkbox using `patchNoindex()`
  - empty, pending, verified, and rejected claim states
- Added `generateMetadata()` to `/members/[slug]` so `profile.noindex` emits `robots: { index: false, follow: false }`.

## Commits

- `386fd20a` - `feat(66-05): add verified profile badge`
- `4b311656` - `feat(66-05): add claim status profile controls`

## Verification

- `npm test -- --run VerifiedBadge` - green; Wave-0 todos are reported as skipped/todo
- `npx tsc --noEmit` - green
- `npm run build` - green
- `git diff --check` on the changed 66-05 frontend files - green; only CRLF normalization warnings

## Notes

- `frontend/src/lib/api.ts` still has an unrelated pre-existing dirty hunk for `searchAnimeForProposal`; it remains uncommitted.
- Build refreshed already-dirty generated frontend files (`next-env.d.ts`, `tsconfig.tsbuildinfo`), which remain uncommitted.
