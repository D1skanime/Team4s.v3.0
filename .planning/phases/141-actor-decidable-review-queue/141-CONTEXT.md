# Phase 141 Context — Actor-Decidable Review Queue

## Purpose

Phase 141 hardens the existing text/image review queue so that every user sees and can navigate only the reviews they are actually allowed to decide at that moment.

This phase is a focused refinement of the existing review system. It does **not** introduce a new review workflow and it does **not** change Contribution Reviews.

## Scope

Phase 141 applies to the existing text/image review queue and must make the following views and behaviors consistently actor-decidable:

- Review queue/list
- Counts
- Filters
- Cursor/pagination
- Review detail
- “Next” navigation
- Decision execution
- Own pending submissions shown separately as “Wartet auf Fremdprüfung”

Actor-decidability is determined by the current actor’s actual review capability for the specific review type plus the Self-Review rule.

## Binding Decisions

### D01 — Own submissions are not actionable reviews

A user’s own pending submissions must never appear inside that user’s actor-decidable review queue.

Own pending submissions are shown separately under:

**„Wartet auf Fremdprüfung“**

These entries are informational only and do not offer Approve/Reject actions.

They do not count as open review work for the actor.

### D02 — Review rights are evaluated per review type

Review capability is applied strictly per review type.

Examples:

- no review right → sees no actionable reviews
- text-review right only → sees only actionable text reviews
- image-review right only → sees only actionable image reviews
- both rights → sees both actionable text and image reviews
- own submission → never actionable through the normal review queue

Self-Review prohibition overrides normal review rights, including global/admin rights.

If Team4s has or later introduces an explicit audited admin override, that remains a separate mechanism and is not part of the normal Phase-141 queue behavior.

### D03 — Actor-decidability is a backend rule

The backend must be the canonical source of actor-decidability.

Queue, count, cursor/pagination, detail and “Next” must all derive from the same effective actor/capability/Self-Review rules.

The frontend must not recreate authorization logic as a security or consistency mechanism.

Frontend filtering may only operate within data already authorized and returned by the backend.

“Wartet auf Fremdprüfung” is semantically separate from the actionable review queue and should be exposed through a clearly separated backend mode/query/endpoint as appropriate to the existing architecture.

### D04 — Direct access to non-decidable review details returns 403

If a user directly requests a review detail that exists but is not decidable by that actor, the backend returns:

**403 Forbidden**

This includes cases where the actor lacks the required review capability or the item is their own submission.

The UI must not render Approve/Reject actions for such a result.

### D05 — “Next” stays inside the actor-decidable set

“Next” must navigate only within the same actor-decidable result set as the queue.

It must never jump to:

- the actor’s own submission
- a review type the actor cannot review
- any other non-decidable review

If no further actor-decidable review exists, navigation ends cleanly.

### D06 — No leakage of unavailable review work

A user sees only reviews and counts that are relevant to their own effective permissions.

Do not expose:

- total global pending review counts
- “X of Y reviews”
- counts of reviews the actor cannot decide
- disabled/greyed-out review items the actor cannot access
- information that other users have additional review work

If a user has no actionable review capability or currently no actionable items, the UI must not imply that inaccessible review work exists.

### D07 — “Wartet auf Fremdprüfung” reveals no reviewer information

The “Wartet auf Fremdprüfung” area shows only the current actor’s own pending submissions and their status.

It must not reveal:

- which users are allowed to review them
- who currently has them in a queue
- how many reviewers could review them

Only neutral status information is shown.

### D08 — Behavior after Approve/Reject and concurrent decisions

After a successful Approve or Reject:

- the item disappears from the actor-decidable queue
- actionable count is updated from the same backend logic
- “Next” is resolved again from the current actor-decidable set

Do not rely only on optimistic local frontend removal.

Concurrent decisions must preserve the existing rule:

**the first completed decision wins**

A later attempt on an already decided/non-pending review must not overwrite the result and must return a conflict response.

### D09 — Contribution Reviews are out of scope

Phase 141 does not change the existing Contribution Review workflow.

No new Contribution Review UI, queue semantics, permission rules or behavior are introduced in this phase.

Shared technical helpers may be reused only if this does not change Contribution Review behavior.

### D10 — Filters only expose review types the actor can use

Filters in the actionable review area are shown only for review types the actor can actually review.

Example:

If the actor can review images only, do not show a useless “Texte 0” filter.

The actionable filters operate only within the actor-decidable set.

Filters inside “Wartet auf Fremdprüfung” are independent of review capability because that area contains only the actor’s own pending submissions.

### D11 — Revalidate authorization and state at decision time

Approve/Reject must revalidate immediately before committing the decision:

- current review status
- current actor capability
- Self-Review rule

Expected outcomes:

- capability revoked → 403
- item already decided → 409 Conflict
- item no longer pending → 409 Conflict
- Self-Review violation → 403
- otherwise → decision may proceed

A stale detail page must never be sufficient authority for a later decision.

### D12 — Audit only real review state changes

Use the existing audit model consistently for actual review decisions/state changes.

Audit should capture the existing relevant decision metadata such as:

- actor
- target/review
- timestamp
- decision
- relevant group/release-version context
- reason/comment where already supported

Normal reads do not create a business audit entry.

This includes:

- queue reads
- “Wartet auf Fremdprüfung”
- normal 403 read attempts

Technical security/request logging is outside this business-audit rule.

### D13 — Neutral empty state

If no actor-decidable reviews are currently open, show a neutral empty state such as:

**„Aktuell keine Prüfungen für dich offen.“**

Do not state or imply:

- that other reviews exist
- that the actor lacks rights for additional reviews
- how much work exists globally

If the actor has own pending submissions, “Wartet auf Fremdprüfung” remains visible separately.

### D14 — Own pending entry disappears after external decision

Once another authorized reviewer decides one of the actor’s own pending submissions, that item disappears from “Wartet auf Fremdprüfung”.

Phase 141 does not introduce a new submission-history/review-history feature for submitters.

The resulting status remains visible through the existing Team4s contribution/status model.

### D15 — Sorting

Sorting is simple and must not be expanded.

The actor-decidable queue is sorted:

**newest first, descending**

No additional prioritization, weighting or special ordering is introduced.

Actor-decidability determines which records are visible; sorting only determines the order of that allowed set.

## Explicit Non-Goals

Do not expand Phase 141 into adjacent review functionality.

Out of scope:

- Contribution Review redesign
- new admin override workflow
- new review history
- reviewer assignment
- reviewer visibility
- queue prioritization
- global review workload dashboards
- broader permission-system redesign
- unrelated UI modernization

## Agent Handoff

This file is the binding Discuss-Phase context for Phase 141.

The agent should:

1. Use this context together with the current repository state.
2. Run the normal GSD **research-phase 141** process.
3. Derive the technical implementation approach from the actual existing code and architecture.
4. Create the Phase-141 implementation plans from the research and this context.
5. Preserve all decisions D01–D15.
6. Avoid adding scope not required by Phase 141.

At this point, do **not** treat this context as an implementation plan.

Research and planning are intentionally left to the agent.

Do not execute Phase 141 until the resulting research/plans have been reviewed and execution is explicitly requested.
