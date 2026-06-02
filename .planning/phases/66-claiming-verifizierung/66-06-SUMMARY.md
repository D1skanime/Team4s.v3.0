---
phase: 66-claiming-verifizierung
plan: 06
status: complete
completed: 2026-06-02
---

# 66-06 Summary - Member Claiming UI Flows

## Implemented

- Added `/claim-invitations/accept` with token handling, login `return_to`, specific invitation error messages, and redirect to `/me/profile` after acceptance.
- Added `MemberClaimSection` on `/me/profile` with historical nick search, claim submission, and new-member request submission.
- Added `ClaimManagementPanel` to `/admin/my-groups/[id]` with:
  - claim invitation generation per historical group member
  - clipboard copy feedback for generated links
  - pending claim verify/reject actions
  - new-member request approve/reject actions
- Kept the group detail page small by placing the new queue/link logic in a local component next to the page.

## Commits

- `238c0dd5` - `feat(66-06): add member claiming ui flows`

## Verification

- `npx tsc --noEmit` - green
- `npm run build` - green
- `git diff --check` on changed 66-06 files - green; only CRLF normalization warnings
- `rg -n "router\.replace|return_to" frontend/src/app/claim-invitations/accept/page.tsx` - verified
- `rg -n "searchHistoricalMembers|submitMemberClaim|submitMemberRequest" frontend/src/app/me/profile/components/MemberClaimSection.tsx` - verified
- `rg -n "generateClaimInvitation|listPendingMemberClaims|listMemberRequests|Kopiert!|Neuanlage-Anträge" frontend/src/app/admin/my-groups/[id]/ClaimManagementPanel.tsx frontend/src/app/admin/my-groups/[id]/page.tsx` - verified

## Notes

- `listMemberRequests()` can be admin-scoped on the backend; the panel treats a failed request-list load as an empty queue so contributor group pages still render for leaders.
- `frontend/src/lib/api.ts` still has an unrelated pre-existing dirty hunk for `searchAnimeForProposal`; it remains uncommitted.
- Build refreshed already-dirty generated frontend files (`next-env.d.ts`, `tsconfig.tsbuildinfo`), which remain uncommitted.
