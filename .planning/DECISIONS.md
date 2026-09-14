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

## 2026-08-25: Phase 140 review delegation grant/deny surfaces split asymmetrically

Phase 140 research (140-RESEARCH.md) found that Phase 138's generic capability-override UI
already lets a `fansub_lead` grant/deny `review.text.decide`, `review.image.decide`, and
`review.contribution.decide` today, via `mutateCapabilityOverride`/`GuidedGrantFlow`/
`GuidedRevokeFlow` — a mechanism separate from the dedicated review-delegation section
Phase 140 adds. This put RDEL-03's "visibly and technically separate from generic user
overrides" success criterion at risk independent of Phase 140's own new code.

The resolution is an asymmetric split, not a symmetric close of the generic path:

- **Grant**: review delegation becomes the sole way to GRANT these three actions. They are
  removed from the generic override UI's grant affordance (`GuidedGrantFlow`, and the
  `'review'` category's grant row).
- **Deny**: the personal user-deny for these three actions is kept everywhere, unchanged,
  in the generic override UI. It is NOT removed or filtered.

The deny path must survive because the `fansub_lead` role grants all three review actions
via `role_capabilities`. Without a generic deny override, there would be no way to take
review authority from one group leader without revoking their entire leadership role — the
exact scenario Phase 138's guided revoke (CAP-08) was built for. This coexistence is also
structurally intentional: `review_grant_provider.go` (Phase 137) documents that a personal
user-deny defeats any grant the specialized-grant provider produces, per the resolver's
existing precedence chain (`user_deny` beats `specialized_grant`). Filtering the deny UI
would silently strand this by-design capability without changing the resolver itself, since
the `user_deny` short-circuit stays reachable via raw API regardless of what the UI offers.

No schema change: `action_definitions.user_overridable` stays `true` for all three review
actions. Live-verified at decision time: zero rows in `user_group_capability_overrides` with
`action_code LIKE 'review.%'` and zero rows in `fansub_group_member_review_capabilities`, so
no legacy data was stranded by narrowing the grant surface.

UI obligation: wherever the generic override UI still shows a `review.*` row (its deny
affordance), it must make the source of an effective allow (delegation vs. override)
recognizable and point the admin toward the "Prüf-/Freigabe-Rechte" section rather than
leaving them looking for a grant control that silently no longer exists there.

This decision applies to Phase 140 and constrains Phase 141 (which must not re-open the
grant path or assume delegation is the only source of an effective review allow — the
personal-deny override remains a second live source of `review_deny` regardless of
delegation state). Full context: `.planning/phases/140-review-delegation-management/140-CONTEXT.md`.

## 2026-09-14: Phase 157 Statistikleiste and Beitragszusammenfassung superseded by Hero-inline metrics; Releases-section removal recorded retroactively

The 2026-09-13 user order's binding starting point for Phase 157's stat surface was, verbatim,
"Kennzahlen direkt im Hero: Folgen / Beiträge / Medien" — metrics directly inside the hero rather
than a separate Statistikleiste card and a separate Beitragszusammenfassung band. Plan 157-07
implemented this by folding P157-02 (Statistikleiste) and P157-04 (Beitragszusammenfassung) into
`ProjectMemberHero`/`HeroMetrics`. The 2026-09-14 V6 decision (Plan 157-14) confirmed and extended
the same direction: the hero metrics became clickable in-page jump targets, and the separate
tab-card affordance was removed entirely. Neither P157-02 nor P157-04 is a functional regression;
both are superseded requirements whose intent now lives in the hero.

The resulting dead code is `ProjectMemberSummary.tsx` (export `ProjectMemberSummaryBar`) and
`ProjectMemberSummaryBand.tsx`, both confirmed via `grep` to have zero importers anywhere in
`frontend/src` outside their own test files, and both deleted by this same plan (157-16). The
`episodes` count added in Plan 157-01 is explicitly unaffected by this decision or the deletion —
it continues to feed the hero's "13 Folgen" figure exactly as before.

This entry is also, per a discrepancy found during the GAP-03 independent post-GAP-02 check
(157-UAT.md, F5), the FIRST durable log entry for the 2026-09-13 Releases-section removal
(Plan 157-08, P157-09). Both `157-UAT.md`'s F5 text and `157-VERIFICATION.md`'s P157-09 gap entry
cite "DECISIONS.md, Eintrag 2026-09-13" for that removal, but no such entry ever actually existed
in this file prior to today — it was cited by name in multiple places without ever being written.
This entry is dated honestly at its actual authorship time, 2026-09-14, and is an explicit
retroactive record of a user order first given 2026-09-13, not a backdated entry.

`157-VERIFICATION.md`'s 2026-09-13 `gaps_found` (10/13) snapshot predates this decision and is
superseded by the next `/gsd:verify-phase 157` run, which must regenerate it so the stale snapshot
stops being read as current truth.
