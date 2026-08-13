---
phase: 66-claiming-verifizierung
plan: 03
status: complete
completed: 2026-06-02
---

# 66-03 Summary - Backend Handler

## Implemented

- Added `MemberClaimsHandler` with authenticated member search, self-service claim submit/get, leader-scoped pending queue, verify, and reject handlers.
- Added `MemberClaimInvitationsHandler` with leader-scoped invitation creation/cancel and authenticated invitation acceptance.
- Added `MemberProfileNoindexHandler` for `PATCH /me/profile/noindex`, guarded by verified-claim ownership through `MemberClaimsRepository.UpdateNoindex`.
- Hardened repository context checks:
  - claim verify/reject now bind `claim_id` to the route `fansub_group_id`.
  - claim invitation creation requires the historical member to belong to the route fansub group.
  - claim invitation cancel binds `invitation_id`, `member_id`, and `fansub_group_id`.

## Commits

- `a8ac644f` - `feat(66-03): add member claim handlers`
- `bc5b751c` - `feat(66-03): add claim invitation and noindex handlers`

## Verification

- `go test ./internal/handlers/... -run TestMemberClaim` - green
- `go test ./internal/handlers/... -run "TestNoindex|TestVerifyClaim"` - green
- `go test ./internal/repository/... -run "TestMemberClaims|TestMemberClaimInvitation"` - green
- `git diff --check -- backend/internal/repository/member_claims_repository.go backend/internal/repository/member_claim_invitations_repository.go backend/internal/handlers/member_claims_handler.go backend/internal/handlers/member_claim_invitations_handler.go backend/internal/handlers/member_profile_noindex_handler.go` - green; only CRLF normalization warnings on Go files
- Acceptance greps confirmed `requireMeIdentity`, `CanForFansubGroup`, `UpdateNoindex`, and no audit payload token field in the new invitation handler.

## Notes

- Routes and contract/frontend wiring are intentionally deferred to 66-04.
- `.planning/STATE.md` was not committed because it already contains unrelated quick-task changes from the active dirty workspace.
