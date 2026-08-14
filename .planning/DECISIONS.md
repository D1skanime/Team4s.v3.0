# Durable Decisions

## 2026-06-22: Phase 71 permission bridge is bridge-not-merge

Credit attribution is not a permission source. A confirmed credit, historical credit, or
`anime_contributions` row may describe attribution, but it must not directly grant
application rights.

The approved product model is an optional permission bridge: when a credit is created
for a linked app user, a future UI may suggest a separate permission grant. That grant
must be explicit, confirmed, revocable, and owned by the central permission engine.

Phase 71 documents this model only. It does not implement grant UI, backend grant
creation, schema changes, or permission-engine behavior.

Future implementation must use the central permission engine and must not infer rights
directly from `anime_contributions`, release credits, or historical credits.

## 2026-08-14: v1.3 verification is fixture-driven with a bundled Phase-134 live UAT

Milestone v1.3 (Phases 129-134) proves correctness through PostgreSQL integration tests
that self-seed their own fixtures (the Phase-128 dedicated-test-DSN pattern), not through
whatever the live database happens to contain. At discussion time both reference profiles
(sheppert, csubs-leader) were empty shells (0 memberships, 0 contributions, 0 badges, 0
anime), so a live audit of them would be meaningless.

Phases 129-133 are NOT gated by isolated per-phase live UAT. The authoritative live
sign-off is a single bundled cross-phase live UAT that runs after the full clean reset in
Phase 134.

Phase 129 Wave 1 builds a reusable, idempotent, API-driven seed script that populates the
two reference profiles with the full scenario matrix (multi-group current+historical
membership, multi-role memberships, year-only dates, memorial status, confirmed +
unconfirmed contributions, duplicate-generating releases, badge/point-crossing volume,
and an over-a-page activity set). That same seed IS the Phase-134 clean-reset fixture -
built once, re-run clean at rollout. Facts unreachable via the real creation/admin API
(verify: year-only active dates, release_role_credit_lifecycles awarded states) get a
minimal documented SQL supplement, never a silent workaround.

This decision applies to the whole v1.3 milestone and is inherited by every downstream
phase discussion/plan.
