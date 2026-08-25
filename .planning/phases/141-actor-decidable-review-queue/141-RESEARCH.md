# Phase 141 Research: Actor-Decidable Review Queue

## Existing seams

- `backend/internal/handlers/release_review_handler.go` already derives typed text/image permissions and exposes list, counts, detail, next, and decision routes.
- `backend/internal/repository` owns `ReleaseReviewQueueOptions`, cursor validation, and queue projections.
- `backend/internal/services/review_service.go` is the transactional decision seam and maps review kinds to canonical capability actions.
- `permissions.CanForFansubGroup` and the Phase-140 specialized delegation provider are the canonical effective-rights seam. Contribution reviews use their separate handler and remain excluded.

## Required direction

Create one backend actor-decidability predicate/query scope that combines actor identity, group, typed effective capability, pending state, and self-review exclusion. Reuse it for actionable list, counts, cursor, detail, next, and final decision revalidation. Expose own pending entries through a separate, neutral mode. Do not recreate authorization in the frontend.

## Risks

- Detail reads must distinguish absent IDs from existing but forbidden IDs: forbidden is 403.
- Cursor and next must use the same newest-first authorized ordering as list.
- Decision-time authorization/state checks must occur in the transaction; stale UI is not authority.
- No total/global count or reviewer metadata may enter DTOs or UI.

## Test focus

Backend negative matrix: no capability, text-only, image-only, both, own submission, revoked delegation, direct detail, stale/concurrent decision. Frontend: only returned filters and actionable controls; separate own-pending lane; neutral empty state.