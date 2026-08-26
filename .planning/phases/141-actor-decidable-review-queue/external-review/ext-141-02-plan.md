---
phase: 141
plan: 02
wave: 2
requirements: [RQUE-03, RQUE-04, RQUE-05]
---

# 141-02: Authorized review queue UI

## Objective

Present only backend-authorized actionable work and a separate informational own-pending lane.

## Tasks

1. Inspect the existing release-review frontend and API types; extend the documented contract, types, and central API helper for the authorized queue and own-pending mode.
2. Render only returned typed filters/counts, neutral empty copy, and the `Wartet auf Fremdprüfung` lane without decision controls or reviewer metadata.
3. Revalidate after decisions by refetching authorized queue state; ensure next navigation ends cleanly.

## Verification

Add focused frontend tests for visible filters, own-pending separation, 403 detail handling, post-decision refresh, and no inaccessible-work disclosure. Run typecheck and relevant Vitest tests.