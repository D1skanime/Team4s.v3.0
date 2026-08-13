---
phase: 66-claiming-verifizierung
plan: 04
status: complete
completed: 2026-06-02
---

# 66-04 Summary - Backend Wiring And Profile Metadata

## Implemented

- Added migration `0094_member_claim_requests_nullable_member` so `member_claims.member_id` can represent pending new-member requests with `NULL`.
- Added `MemberRequestsRepository` and `MemberRequestsHandler` for submit/list/approve/reject new-member requests.
- Wired Phase-66 routes in `main.go` and `admin_routes.go`:
  - `/me/member-search`, `/me/member-claim`, `/me/member-claims`
  - `/me/member-requests`, `/me/profile/noindex`, `/claim-invitations/accept`
  - admin member-claims, claim-invitations, and member-requests endpoints
- Extended member profile models and repository queries with `noindex` and `is_verified` for public and own profile responses.
- Added frontend profile types and API helpers for claims, claim invitations, noindex, and member requests.

## Commits

- `20b9949a` - `feat(66-04): add member request backend wiring`
- `afd2f556` - `feat(66-04): expose member profile verification metadata`
- `6db5bc08` - `feat(66-04): add claim frontend API helpers`

## Verification

- `go build ./internal/repository/... ./internal/models/...` - green
- `go build ./cmd/server/...` - green
- `npx tsc --noEmit` - green
- `go test ./internal/handlers/... -run "TestMemberClaim|TestNoindex|TestVerifyClaim|TestMemberRequest"` - green
- `go test ./internal/repository/... -run "TestMemberClaims|TestMemberClaimInvitation|TestMemberRequests"` - green
- `go run ./cmd/migrate up -dir ../database/migrations` - applied 0094 locally
- `go run ./cmd/migrate status -dir ../database/migrations` - 94 applied, 0 pending
- `docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -c "\d member_claims"` - verified nullable `member_id` and `uq_member_claim_requests_pending_user`

## Notes

- `frontend/src/lib/api.ts` still has an unrelated pre-existing dirty hunk for `searchAnimeForProposal`; it was intentionally not staged or committed.
- `.planning/STATE.md` remains uncommitted because it contains unrelated quick-task changes.
