---
phase: 140-review-delegation-management
type: context
status: ready-for-plan
depends_on: [137-central-effective-rights-resolver-overrides, 138-effective-rights-administration-impact-ux]
requirements: [RDEL-01, RDEL-02, RDEL-03, RDEL-04]
source: Manual decision capture (no separate discuss-phase session) — grounded in ROADMAP.md Phase 140 + REQUIREMENTS.md RDEL-01..04 + 140-RESEARCH.md
---

# Phase 140 Context — Review Delegation Management

## Roadmap goal

Group leaders can safely manage specialized review authority for individual active members
without granting a broader leadership role.

Phase 140 is limited to the roadmap scope:
- reading a target member's current review delegations through the central API contract,
- granting/revoking each delegable review right in the existing member editor under a
  distinct "Prüf-/Freigabe-Rechte" section,
- keeping delegation controls visibly and technically separate from roles and generic
  user overrides,
- reusing the existing transactional review service and audit seam for every mutation,
  idempotently, with server-side eligibility rejection.

## Explicit scope fence

RDEL-05 (a revoked delegation immediately losing effect on in-flight decisions, review
lists, and counters) belongs to **Phase 141**, not this phase. Do not implement, test, or
design around immediate-effect propagation here. If a plan's scope threatens to require
it, that is a signal the plan has drifted past this phase's boundary.

## Binding decision: asymmetric separation (Option d)

This decision was reached explicitly after 140-RESEARCH.md surfaced a contradiction: Phase
138's already-shipped generic capability-override UI (`UserGroupRightsTab` → `GroupSection`
→ Accordion, category `"review"`) already lets a `fansub_lead` grant/deny the same three
review actions today, via `mutateCapabilityOverride`/`GuidedGrantFlow`/`GuidedRevokeFlow` —
a parallel mechanism to the dedicated delegation section this phase adds. RDEL-03 requires
"visibly and technically separate from roles and generic user overrides." The options were
(a) leave both paths coexisting as-is, (b) hide the generic-override UI row for `review.*`
entirely, (c) close the backend capability via a reverting migration. The chosen resolution
is a fourth, asymmetric option:

### GEWÄHREN (grant) — delegation becomes the sole path
Review delegation becomes the **only** way to GRANT `review.text.decide`,
`review.image.decide`, and `review.contribution.decide`. These three actions are removed
from the **grant** path of the generic capability-override UI:
- `GuidedGrantFlow` must no longer offer these three actions, OR the `'review'` category
  must be excluded from whatever UI path leads to a grant-shaped override for these actions.
- This satisfies RDEL-03 on the side where confusion actually causes harm: an admin must
  not be able to grant broader-than-intended review authority through a second, competing
  mechanism.

### ENTZIEHEN (revoke/deny) — personal user-deny stays everywhere, unchanged
The personal user-deny (`user_group_capability_overrides` with a deny-shaped override) for
these three actions is **kept, everywhere, unchanged** — it is NOT removed from the generic
override UI and NOT filtered out.

**Why the deny path must survive (rationale for later traceability):**
- Live-verified: the `fansub_lead` role grants all three review actions via
  `role_capabilities` (role-level grant).
- Without a generic deny path, there would be no way to take review authority away from a
  single group leader without revoking their entire leadership role — precisely the
  scenario Phase 138's guided revoke (CAP-08) was built to handle safely.
- This coexistence is intentional per the existing resolver design: `review_grant_provider.go`
  (Phase 137) documents that a personal user-deny defeats any grant this provider produces —
  the precedence chain (`platform_admin > disabled > no-membership > user_deny > user_allow
  > role_grant > specialized_grant > no_grant`) already treats `user_deny` as authoritative
  over `specialized_grant`. Removing the deny UI would silently strand this by-design
  override capability without changing the resolver, since the resolver's `user_deny`
  short-circuit remains reachable via raw API regardless of what the UI offers.

### No schema change
`action_definitions.user_overridable` stays `true` for all three review actions. No
migration reverts this. The backend capability to store a deny override for these actions
is not removed — only the grant-shaped affordance is removed from the generic UI.

### Data-safety check (live-verified, no migration path needed)
Zero rows in `user_group_capability_overrides` with `action_code LIKE 'review.%'` and zero
rows in `fansub_group_member_review_capabilities` at decision time. No legacy data is
stranded by this change of grant surface.

### UI requirement: no silent loss of a control
When a review right shows as effectively allowed because a delegation granted it, the
source must be recognizable to the admin, and the path to the "Prüf-/Freigabe-Rechte"
section must be surfaced — the admin must not be left looking for a grant switch in the
generic override path that no longer exists there without explanation. This applies
wherever the generic capability-override UI still displays a `review.*` row (i.e., its
deny affordance) — that row's grant side must clearly point to the dedicated section
instead of silently disappearing or looking broken.

## Two smaller decisions (per research recommendation, adopted)

1. **RDEL-01 read response includes eligibility context** (not just the three granted-action
   booleans) — target's membership/app-user status and verified-claim flag, computed the
   same way `eligibleDelegationTarget` does, so the UI can pre-emptively grey out grant
   controls rather than surface ineligibility only via a 422 after the fact.
2. **Single PUT mutation endpoint** with an explicit boolean intent (`{action_code, grant:
   bool}`), matching the existing `.../capability-overrides` precedent, rather than two
   separate grant/revoke endpoints.

## Current canonical code seams

Backend:
- `backend/internal/services/review_service.go` — `GrantDelegation`/`RevokeDelegation`/
  `changeDelegation`/`eligibleDelegationTarget`/`isDelegableReviewAction` (reuse as-is,
  already at 448/450 lines — do not add to this file)
- `backend/internal/repository/review_delegation_repository.go` — `LockMembership`/
  `GrantAction`/`RevokeAction` (extend with a new non-locking read method for RDEL-01)
- `backend/internal/permissions/review_grant_provider.go`,
  `backend/internal/permissions/permissions.go:290-336` — actor-scoped
  `ResolveActorReviewGrantContext`/`ReviewGrantContext`; confirms resolver-side separation
  and the `user_deny`-beats-`specialized_grant` precedence this decision relies on
- `backend/internal/repository/authz_permissions.go:197-276` — `ResolveActorReviewGrantContext` SQL
- `backend/internal/handlers/admin_effective_rights_handler.go` — structural template for
  the new handler (already 624 lines — do not add to this file; new handler file required)
- `backend/internal/repository/authz_user_overrides.go:173-204` — `LockTargetMembership`
  pattern to mirror for resolving `fansub_group_member_id` from `(appUserId, groupId)`
- `database/migrations/0134_review_foundation.up.sql` — review tables, action namespace,
  audit-event contract triggers
- `database/migrations/0150_effective_rights_overrides.up.sql` — confirms
  `user_overridable=true` for the three review actions (left unchanged per this decision)

Frontend:
- `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx`, `GroupSection.tsx`,
  `GroupRolesSection.tsx` (structural pattern to mirror for the new section, NOT to embed
  the new section inside), `CategoryTable.tsx`, `userGroupRightsHelpers.ts` (`CATEGORY_ORDER`
  currently includes `'review'` with no grant/deny split — needs the grant-side removal
  described above)
- `GuidedGrantFlow.tsx` — must no longer offer the three review actions for grant
- `GuidedRevokeFlow.tsx` — unaffected; deny/revoke stays available for these actions
- `frontend/src/lib/api.ts:10152-10230` — `getEffectiveRights`/`mutateCapabilityOverride`
  client pattern to mirror for new `getReviewDelegations`/`mutateReviewDelegation`

## Do NOT expand this phase into

- RDEL-05 / immediate-effect propagation on revoke (Phase 141)
- Removing or filtering the generic override UI's **deny** path for review actions
- Any migration touching `action_definitions.user_overridable`
- Rebuilding `services.ReviewService`'s domain logic — it already satisfies RDEL-04

## Full research

See `140-RESEARCH.md` for the complete architecture map, patterns, pitfalls, security
analysis, and validation strategy this context builds on.
