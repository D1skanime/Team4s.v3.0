# Phase 46: Fansub Group Invitations & Join Requests MVP - Research

**Researched:** 2026-05-13
**Domain:** Team4s invitation tokens, app-user membership acceptance, permission-driven group self-service
**Confidence:** Medium; visible branch analysis strongly suggests invitations are not implemented yet, but Phase-43/44/45 runtime seams remain only partially visible in the current branch

---

## Existing Team4s Seams

### 1. No visible invitation or join-request runtime seam was found

Current inspection did not show:
- invitation tables
- invitation handlers
- join-request tables
- join-request handlers
- invitation-specific frontend routes or DTOs

Implication:
- Phase 46 likely needs a new minimal data model for invitations
- but it must still start by re-checking whether the executing branch already contains hidden or newer invitation seams

### 2. Acceptance must plug into the app-user membership model from Phase 45

Phase 46 is not a standalone system.

Its acceptance path must end in:
- app-user-based group membership
- assigned role rows
- permission-aware active membership state

Implication:
- invitation acceptance must reuse the same repository/service seams that Phase 45 established for add-member and role assignment
- it must never fall back to writing legacy `fansub_members`

### 3. The permission engine is the right place for invitation capabilities

Phase 44 already defined the pattern:
- central actions
- central role matrix
- central capability mapping

Implication:
- invitation permissions should be added there, not invented inside new handlers
- the frontend should consume `canViewInvitations`, `canCreateInvitations`, `canCancelInvitations` or equivalent booleans mapped from those actions

### 4. The visible frontend already has a natural anchor: the fansub members/admin surface

The visible route:
- `frontend/src/app/admin/fansubs/[id]/members/page.tsx`

is the obvious MVP anchor for:
- open invitations list
- create invitation action
- optional request-prep section

Implication:
- Phase 46 can likely extend the same fansub admin member-management area rather than adding a separate disconnected screen

### 5. Existing modal/dialog patterns can be reused for invite creation and cancellation confirms

The repo already contains multiple modal/dialog implementations in admin surfaces and shared components.

Implication:
- Phase 46 can add a focused invitation create dialog or inline panel without inventing a new design system
- confirmation for cancellation can stay lightweight and consistent with current project patterns

### 6. Audit should stay unified

Phase 44/45 already push toward a reusable audit seam.

Implication:
- invitation events should reuse that seam
- do not build a separate invitation-history system for the MVP

---

## Architecture Recommendation

### Recommendation 1: Treat invitations as a pre-membership grant, not as a second membership system

The clean MVP model is:
- one invitation row
- one hashed token
- a status machine
- role intent captured on the invitation
- acceptance path that delegates to membership creation/activation

Not:
- a parallel pending-member table
- role grants living separately from membership logic forever

### Recommendation 2: Store only the token hash and return the raw token once at creation time

Recommended flow:
- generate cryptographically secure random token
- hash it server-side
- store only the hash
- return the raw token only in the create response so the operator can copy/share it manually

Why:
- reduces risk if DB contents leak
- aligns with secure-token project conventions
- matches the requested operator flow where a copy/share link is shown once immediately after creation

### Recommendation 3: Keep invitation status transitions explicit and append audit events

MVP status transitions:
- `pending` -> `accepted`
- `pending` -> `cancelled`
- `pending` -> `expired`

Important rules:
- `accepted`, `cancelled`, and `expired` are terminal
- terminal invitations cannot be accepted again
- expiry should be checked at read and accept time, and may be lazily materialized if no cleanup job exists yet

### Recommendation 4: Acceptance should be identity-aware and conflict-aware

When a logged-in app user accepts:
- the system resolves the current app user from the authenticated request
- normalizes and compares the invitation email where that is part of the chosen MVP constraint
- checks for existing active or inactive membership
- creates or reactivates membership and assigns invited roles

Potential conflict cases:
- invitation already accepted/cancelled/expired
- actor already has an active membership with incompatible state
- invited roles are no longer valid in the central role list
- invitation email mismatches the authenticated app user's email when that field is available

These should be expressed cleanly as `409`, `404`, or `400` depending on the exact case.

### Recommendation 5: Join requests should be preparatory unless they are nearly free

The phase brief explicitly marks join requests as optional/preparatory.

Best MVP approach:
- fully implement invitations
- optionally add central permission codes and a data-model placeholder or planning-ready seam for join requests
- avoid dragging Phase 46 into a second lifecycle with separate moderation UI unless it is genuinely small

### Recommendation 6: Reuse fansub-group capabilities and member-management surface

Likely capability additions:
- `canViewInvitations`
- `canCreateInvitations`
- `canCancelInvitations`

Maybe later:
- `canCreateJoinRequest`
- `canViewJoinRequests`

These should extend the same fansub-group capability response rather than creating a second unrelated capability payload.

---

## Recommended Backend Surface

### Core reads

- list invitations for one fansub group
- fetch invitation-by-token preview or acceptance target, if the chosen UX needs confirmation before accept

### Core mutations

- create invitation
- cancel invitation
- accept invitation

Expected create invariants:
- actor must have `fansub_group.invitations.create`
- at least one role code is required
- all role codes must come from the central role list
- duplicate pending invitation for the same group + normalized email is rejected
- already-active group members are not invited again

### Optional/preparatory join-request seam

- maybe create/list request DTOs or central permission constants only
- do not overbuild unless the repository/runtime shape makes it almost free

---

## Error and Status Semantics

Recommended semantics:
- `401` when unauthenticated
- `403` when authenticated but lacking invitation-management permission
- `404` when group or invitation token/resource does not exist
- `409` when invitation is already accepted/cancelled/expired or acceptance conflicts with existing membership state
- `400` for malformed payloads or invalid role codes
- `410 Gone` is also acceptable for expired invitations if that matches the project convention better than `409`

Important:
- expired invitation should not look like a generic permission failure
- terminal-state acceptance failures are business conflicts, not authz failures

---

## Testing Recommendation

Backend tests should cover at least:
- user without permission cannot view invitations
- group manager can create invitation for own group
- same actor cannot create/cancel invitations for another group
- `designer` cannot create invitation
- unknown role codes are rejected
- at least one role code is required
- duplicate pending invitation is rejected
- already-active member cannot be invited again
- token is not stored in plaintext
- expired invitation cannot be accepted
- cancelled invitation cannot be accepted
- accepted invitation cannot be accepted twice
- valid invitation creates or activates membership with invited roles
- email mismatch is rejected
- duplicate or conflicting membership acceptance is handled cleanly

Frontend tests should stay thin:
- invitation controls are capability-gated
- open invitations list loads only when allowed
- create flow shows the returned copy/share token once
- `401`, `403`, `404`, `409`, and `410` show understandable messages when used

---

## Risks

### Biggest security risk: mishandling token storage

If raw invitation tokens are stored in the database:
- invitation compromise risk increases
- later cleanup becomes harder

Mitigation:
- store only token hashes
- return the raw token only once on creation

### Biggest integration risk: acceptance bypassing Phase-45 membership invariants

If invitation acceptance writes membership directly without reusing member-management rules:
- duplicate memberships may appear
- role validation may diverge
- disabled/inactive state handling may drift

Mitigation:
- route acceptance through the same canonical membership creation/activation seam where possible

### Biggest scope risk: join requests bloating the phase

If join requests are fully implemented in parallel:
- Phase 46 may become too large

Mitigation:
- keep join requests optional/preparatory
- prioritize the invitation lifecycle fully first

### Recommendation 7: Keep Join Requests as a documented fallback, not a silent second MVP

The user explicitly prefers:
- Invitations fully implemented now
- Join Requests only when the public/user context is already solid

Planning implication:
- Phase 46 should treat Join Requests as optional preparation only
- if they are not nearly free, defer them cleanly to Phase 47

---

## Recommended Plan Shape

1. Pre-analysis and minimal invitation data model
2. Backend invitation lifecycle, permissions, capabilities, audit
3. Thin frontend wiring for invite management and acceptance
4. Tests, docs, verification, and Phase-47 handoff
