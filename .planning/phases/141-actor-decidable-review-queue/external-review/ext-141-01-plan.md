---
phase: 141
plan: 01
wave: 1
requirements: [RDEL-05, RQUE-01, RQUE-02, RQUE-04, RQUE-05, RQUE-06]
---

# 141-01: Canonical actor-decidable backend scope

## Objective

Make release-review list, counts, cursor, detail, next, and decision-time validation consume one canonical actor-decidability rule without changing contribution reviews.

## Tasks

1. Read `release_review_handler.go`, queue repository code, `review_service.go`, and Phase-140 delegation seams; add focused repository/service types only where the existing queue options cannot carry actor/self-review scope.
2. Apply the shared scope to list/count/detail/next and transaction-time decision revalidation. Return 403 for existing non-decidable details and 409 for non-pending/already-decided decisions.
3. Add backend tests for typed capability, own-item exclusion, delegation revoke, direct access, cursor/next consistency, and concurrency.

## Verification

Run focused Go handler/service/repository tests and contract checks. Confirm contribution-review handlers remain untouched.