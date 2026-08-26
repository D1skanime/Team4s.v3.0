# Phase 141: Actor-Decidable Review Queue - Research

**Researched:** 2026-08-26
**Domain:** Go/Gin backend authorization + query-layer refactor; Next.js admin queue UI
**Confidence:** HIGH (all core claims verified by direct code reading, not inference)

## Summary

Phase 141 hardens the existing text/image release-review queue
(`backend/internal/handlers/release_review_handler.go`,
`backend/internal/repository/release_review_query_repository.go`,
`backend/internal/services/review_service.go`) so every read surface (list, counts, detail,
next) and the decision mutation share one actor-decidable definition. The two
decision-blocking questions this research exists to resolve are answered with code-level
evidence, not restated hypotheses, in the **L-01** and **L-02** sections immediately below.

**Primary recommendation:** Do not build a new authorization mechanism. RDEL-05's immediacy
requirement (L-01) is already structurally satisfied by the existing live-resolving
`ResolveGroupRights`/`ResolveActorReviewGrantContext` chain — Phase 141's job is to (a) stop
calling that chain redundantly (a real N+1 pattern found during this research, see Pitfall
1), (b) route the currently-missing self-review exclusion (L-02) through the *same*
resolution instead of adding a second, parallel check, and (c) lock all of this behavior down
with real regression tests, since none exist today for either L-01 or L-02.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Actor-decidable kind resolution (text/image capability) | API/Backend (`permissions.Service.ResolveGroupRights`) | — | Central resolver already the canonical, live-resolving source (Phase 137/140) |
| Self-review exclusion (own submission not actionable) | API/Backend (`repository.ReleaseReviewQueryRepository` SQL predicate) | Database/Storage (submitter columns already indexed via `review_sources` view) | Must be enforced in the same SQL WHERE clause as the capability filter to guarantee RQUE-04 parity; cannot be a frontend filter (D03) |
| "Wartet auf Fremdprüfung" own-pending projection | API/Backend (new `view=own` query scope) | Browser/Client (separate lane rendering only) | D03 requires a backend-exposed mode; frontend may only render what the backend already scoped |
| Decision-time revalidation (capability, self-review, pending-state) | API/Backend (`services.ReviewService.Decide`, inside the DB transaction) | — | Already implemented and transaction-scoped (see L-01); must not regress |
| 403 vs 409 vs 404 response shaping | API/Backend (`ReleaseReviewHandler.writeReadError`/`writeDecisionError`) | — | Existing error-mapping pattern; D04's new 403-on-forbidden-detail case extends it |
| Filter/lane UI (only actor-usable filters, separate own-pending lane) | Browser/Client (`ReleaseReviewsSection.tsx` and a new own-pending sibling) | — | Pure rendering of already-authorized backend data (D03); zero new authorization logic client-side |
| Contribution Review workflow | API/Backend (`ContributionReviewHandler`, unrelated tables) | — | Already structurally separate (see Success-Criterion-5 section below); must stay untouched |

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (D01–D15, verbatim from 141-CONTEXT.md)

**D01 — Own submissions are not actionable reviews.** A user's own pending submissions must
never appear inside that user's actor-decidable review queue. Own pending submissions are
shown separately under **„Wartet auf Fremdprüfung"**. These entries are informational only
and do not offer Approve/Reject actions. They do not count as open review work for the actor.

**D02 — Review rights are evaluated per review type.** No review right → sees no actionable
reviews. Text-review right only → sees only actionable text reviews. Image-review right only
→ sees only actionable image reviews. Both rights → sees both. Own submission → never
actionable through the normal review queue. Self-Review prohibition overrides normal review
rights, including global/admin rights. A future explicit audited admin override remains a
separate mechanism, not part of Phase-141 queue behavior.

**D03 — Actor-decidability is a backend rule.** The backend is the canonical source. Queue,
count, cursor/pagination, detail and "Next" must all derive from the same effective
actor/capability/Self-Review rules. The frontend must not recreate authorization logic as a
security or consistency mechanism; it may only filter within data already authorized and
returned by the backend. "Wartet auf Fremdprüfung" is semantically separate and should be
exposed through a clearly separated backend mode/query/endpoint as appropriate to the
existing architecture.

**D04 — Direct access to non-decidable review details returns 403 Forbidden.** Includes
lacking capability or the item being the actor's own submission. UI must not render
Approve/Reject actions for such a result.

**D05 — "Next" stays inside the actor-decidable set.** Never jumps to the actor's own
submission, an unreviewable type, or any other non-decidable review. If none remain,
navigation ends cleanly.

**D06 — No leakage of unavailable review work.** No total/global pending counts, no "X of Y",
no counts of reviews the actor cannot decide, no disabled/greyed items, no signal that other
users have more work.

**D07 — "Wartet auf Fremdprüfung" reveals no reviewer information.** Only the actor's own
pending submissions and neutral status; never who can review them, who has them queued, or
how many reviewers could review them.

**D08 — Behavior after Approve/Reject and concurrent decisions.** After a decision: item
disappears from the actor-decidable queue, count updates from the same backend logic, "Next"
is resolved again from the current set. No reliance on optimistic local removal only.
Concurrent decisions: first completed decision wins; a later attempt on an
already-decided/non-pending review returns a conflict, not an overwrite.

**D09 — Contribution Reviews are out of scope.** No new Contribution Review UI, queue
semantics, permission rules, or behavior. Shared technical helpers may be reused only if this
does not change Contribution Review behavior.

**D10 — Filters only expose review types the actor can use.** E.g. image-only reviewer never
sees a "Texte 0" filter. Actionable filters operate only within the actor-decidable set.
Filters inside "Wartet auf Fremdprüfung" are independent of review capability (contains only
the actor's own submissions).

**D11 — Revalidate authorization and state at decision time.** Approve/Reject must
revalidate immediately before committing: current review status, current actor capability,
Self-Review rule. Outcomes: capability revoked → 403; already decided → 409; no longer
pending → 409; Self-Review violation → 403; otherwise → proceed. A stale detail page must
never be sufficient authority for a later decision.

**D12 — Audit only real review state changes.** Use the existing audit model for actual
decisions/state changes (actor, target/review, timestamp, decision, group/release-version
context, reason/comment where supported). Normal reads (queue reads, Fremdprüfung, normal 403
attempts) do not create a business audit entry. Technical security/request logging is outside
this rule.

**D13 — Neutral empty state.** "Aktuell keine Prüfungen für dich offen." Do not imply other
reviews exist, that the actor lacks rights for more, or how much work exists globally. Own
pending submissions remain visible separately if present.

**D14 — Own pending entry disappears after external decision.** Once another authorized
reviewer decides one of the actor's own pending submissions, it disappears from "Wartet auf
Fremdprüfung". No new submission-history feature is introduced. Resulting status remains
visible through the existing contribution/status model.

**D15 — Sorting.** Newest first, descending. No additional prioritization/weighting. Sorting
only orders the actor-decidable visible set; it does not determine visibility.

### Explicit Non-Goals (out of scope, verbatim)

Contribution Review redesign; new admin override workflow; new review history; reviewer
assignment; reviewer visibility; queue prioritization; global review workload dashboards;
broader permission-system redesign; unrelated UI modernization.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description (REQUIREMENTS.md) | Research Support |
|----|-------------------------------|-------------------|
| RDEL-05 | Eine entzogene Delegation verliert unmittelbar und konsistent ihre Wirkung auf Entscheidung, Review-Liste und Zähler, ohne dem Mitglied eine breitere Leiterrolle zu entziehen. | See **L-01**: mechanism identified (`ResolveGroupRights` → `reviewGrantProvider` → `ResolveActorReviewGrantContext`, all live, no cache), applies today to decision/list/counter alike. Gap is test coverage + eliminating a redundant double-resolution (Pitfall 1), not a missing mechanism. |
| RQUE-01 | Offene Review-Liste enthält serverseitig nur Einträge, deren Review-Art der aktuelle Benutzer entscheiden darf. | Already implemented via `authorizedKinds()` (`release_review_handler.go:299-338`) feeding `AllowedKinds` into `releaseReviewQueuePredicates` (`release_review_query_repository.go:264-304`). No change needed beyond consolidating the resolution call (Pitfall 1). |
| RQUE-02 | Eigene Einreichungen erscheinen nicht in der entscheidbaren Liste und erhöhen den Zähler nicht. | See **L-02**: confirmed NOT implemented today. Concrete predicate and file locations specified below. |
| RQUE-03 | Eigene offene Einreichungen können getrennt als „wartet auf Fremdprüfung" angezeigt werden, ohne Entscheidungsaktion. | See "Wartet auf Fremdprüfung" architecture pattern below — new `view=own` scope value, reusing the existing `View`-based scope/cursor mechanism. |
| RQUE-04 | Liste, Typ-Zähler, Detailzugriff und „Nächster Eintrag" verwenden dieselben Prädikate. | List/Counts already share `releaseReviewQueuePredicates` (confirmed: `Counts()` calls the same function with `includeCursor=false`, `release_review_query_repository.go:142-176`). Detail/Next currently do **not** share the self-review or (for Detail) even the same SQL shape — see Pitfalls 2 and 3. |
| RQUE-05 | Direkter Zugriff und Entscheidungsversuche bleiben serverseitig geschützt, auch bei manipulierter URL oder veraltetem Client. | Decision-time path already independently re-authorizes and re-checks self-review and pending-state inside the transaction (`review_service.go:147-248`, confirmed). Detail-access-only path (no decision attempted) currently returns 200 for an own/forbidden item instead of 403 — this is D04's concrete gap, see Pitfall 2. |
| RQUE-06 | Mitwirkungsprüfungen bleiben im bestehenden kanonischen Workflow, nicht in der Text-/Bild-Queue. | Confirmed structurally separate — see "Contribution Reviews stay separate" section. |
</phase_requirements>

---

## L-01: RDEL-05's Mechanism — Evidence-Backed Conclusion (RESOLVED, not open)

**Conclusion up front: immediacy already holds today, end to end, for decision, list, and
counter alike, because all three paths resolve the specialized delegation grant through the
same live, uncached call chain. There is no cache, materialized view, or TTL map anywhere in
this chain. The only real gaps are (1) zero automated test proves this today, and (2) the
chain is called redundantly (4x per list/count request), which Phase 141 should fix while it
is already touching this code — not because it threatens correctness, but because it is a
real, evidence-found N+1 pattern the phase's own must-not-regress bar (QUAL-06) already
prohibits.**

### The exact call chain, traced end to end

1. **Decision time** (`backend/internal/services/review_service.go:147-248`, `Decide`):
   Inside the DB transaction (`tx`), a **fresh** `repository.NewAuthzRepository(tx)` is
   constructed (line 175) and passed to a **fresh**
   `permissions.NewService(authz).CanReviewForFansubGroup(ctx, cmd.Actor, action,
   target.FansubGroupID)` (line 180-182). Nothing here is cached across requests — a new
   `AuthzRepository`/`Service` pair is built per call, scoped to the transaction.

2. **`CanReviewForFansubGroup`** (`backend/internal/permissions/permissions.go:480-553`)
   calls `s.ResolveGroupRights(ctx, actor, fansubGroupID)` (line 536) — the central,
   provenance-capable resolver introduced in Phase 137 and reused unchanged.

3. **`ResolveGroupRights`** (`backend/internal/permissions/effective_rights.go:177-196`)
   calls `s.loadGroupRightsSources(ctx, actor, fansubGroupID)` (line 188), which in turn
   calls `s.specializedGrantProviders()` (line 250) and, for each provider,
   `provider.ResolveGroupGrants(ctx, actor.AppUserID, fansubGroupID)` (line 251).

4. **`reviewGrantProvider.ResolveGroupGrants`**
   (`backend/internal/permissions/review_grant_provider.go:45-61`) calls
   `p.resolver.ResolveActorReviewGrantContext(ctx, actorAppUserID, fansubGroupID)` (line 49).

5. **`AuthzRepository.ResolveActorReviewGrantContext`**
   (`backend/internal/repository/authz_permissions.go:197-276`) is a single, direct SQL
   query against `fansub_group_members`/`app_users`/`member_claims`/
   `fansub_group_member_review_capabilities` (lines 208-252), executed fresh via
   `r.db.QueryRow(...)` on every call — **no cache, no Redis, no materialized view refresh
   job**. The `WITH locked_membership AS MATERIALIZED (...)` clause (line 209) is a
   **PostgreSQL query-planner hint** telling Postgres to fully materialize that CTE
   *within this single query execution* (so the join doesn't get inlined/re-evaluated
   per output row) — it is **not** a persistent cache, cross-request cache, or
   materialized view. This is a common false-positive signal and was checked explicitly:
   confirmed by reading the CTE (a plain `WITH ... AS MATERIALIZED`, not `CREATE
   MATERIALIZED VIEW`) and by confirming no `REFRESH MATERIALIZED VIEW` job exists
   anywhere in the codebase (`grep -r "MATERIALIZED VIEW" database/ backend/` returns only
   this one query-hint use and the unrelated `release_review_lifecycle_sources`
   **plain** `CREATE VIEW`, migration `0135_release_review_lifecycle.up.sql:85`, which is
   also not materialized — a plain view is re-evaluated on every query, not cached).

6. **List/Counts/Detail/Next** (`backend/internal/handlers/release_review_handler.go`) all
   route through `h.authorizedKinds(c, actor, groupID, requested)` (lines 299-338), which
   loops over `{ActionReviewTextDecide, ActionReviewImageDecide}` and calls
   `h.permissions.CanReviewForFansubGroup(...)` (line 315-317) for **each** action, **fresh,
   on every single HTTP request** — i.e. exactly the same call chain as step 1-5 above, run
   twice per request (once per review kind).

### What was explicitly searched and found absent

- **`sync.Map` / in-memory TTL maps in the review-authorization path:** none. The only
  process-wide cache in `backend/internal/permissions/permissions.go` is `loadedCache`
  (line 377, guarded by `cacheMu`), which holds the **role → action** matrix loaded via
  `LoadCache`/`LoadFansubGroupCatalog` at startup and refreshed only by explicit admin
  role-capability mutations (Phase 137/138). This cache is consulted by `roleAllows()` for
  **role-grant** provenance only. It is never consulted for **specialized-grant**
  provenance (the review-delegation path) — `evaluateGroupRights`
  (`effective_rights.go:280+`) evaluates `sources.SpecializedGrants` as data already
  batch-loaded fresh per request (step 3-5 above), completely independent of `loadedCache`.
  Confirmed by reading `evaluateGroupRights`'s use of `sources.SpecializedGrants` versus
  its separate use of `roleAllows(role, action)` for `sources.Roles` — two distinct code
  paths, only one of which touches the process cache, and it is not the delegation one.
- **Redis:** `backend/internal/repository/authz_permissions.go` and
  `review_grant_provider.go` import no Redis client. Redis (`github.com/redis/go-redis/v9`,
  per CLAUDE.md's stack doc) is used elsewhere in the codebase (rate limiting, sessions) but
  not in this authorization chain.
  - Verification command run: `grep -rn "redis\|sync.Map\|time.Duration.*[Cc]ache\|TTL" backend/internal/permissions/*.go backend/internal/repository/authz_permissions.go backend/internal/repository/review_delegation_repository.go` — zero matches relevant to the review-grant path.
- **A denormalized/cached column on `fansub_group_members` or elsewhere reflecting granted
  review actions:** none — `fansub_group_member_review_capabilities` (the grant-storage
  table itself, mutated directly by `review_delegation_repository.go`'s
  `GrantAction`/`RevokeAction`, confirmed via 140-VERIFICATION.md) is read live by the same
  query in step 5 on every call. Grant and read share the same table with no intermediate
  projection.

### Why this matters for planning

Because immediacy already holds structurally, Phase 141 plans must NOT introduce a
mechanism (e.g. "cache the actor's allowed kinds for the request" beyond a single
request-scoped variable, or any cross-request cache) that would silently reintroduce a
staleness window. The one legitimate optimization — collapsing the redundant double/quadruple
resolution described above into a single `ResolveGroupRights` call per request — must stay
**request-scoped only** (a local variable passed through the handler call, never persisted
between requests). See Pitfall 1 below for the concrete refactor recommendation.

**Required planning deliverable:** a real Postgres-backed regression test proving RDEL-05 end
to end — grant a specialized delegation, observe it in list/counts/detail, revoke it via
`ReviewDelegationRepository.RevokeAction`, and in the **same test, without restarting any
process or clearing any cache**, re-issue the list/counts/detail/decide calls and assert the
item is gone / the decision is now denied. This did not exist before Phase 140 (140-VERIFICATION.md's own scope fence explicitly deferred it) and does not exist now — grep of
`release_review_handler_test.go` and `release_review_query_repository_test.go` (function
lists captured above) shows no test with "Delegation," "Revoke," or "Immediate" in its name.

---

## L-02: RQUE-02's Self-Exclusion — Evidence-Backed Conclusion (CONFIRMED GAP, concrete fix specified)

**Conclusion up front: self-exclusion does NOT exist today, in any form, in the list query,
the counts query, or the detail query. It exists ONLY at decision-commit time
(`review_service.go:189-190` and `validateReviewIntent`), which blocks an actor from
approving/rejecting their own item but does nothing to prevent it from being listed, counted,
or read via detail with a 200. This is new logic, not a gap-filling tweak.**

### Where "own submission" data already lives (reusable, no schema change needed)

Every row already carries `submitter_app_user_id` and `submitter_member_id`
(`release_review_query_repository.go:34-36`, populated from the `review_sources` CTE at
`release_review_query_repository.go:370-371`, itself sourced from the
`release_review_lifecycle_sources` view, migration `0135_release_review_lifecycle.up.sql:85-115`).
The decision-time self-check
(`review_service.go:189-190`) uses **two** signals:

```go
self := cmd.Actor.AppUserID == *target.SubmitterAppUserID ||
    containsReviewMemberID(actorMembers, *target.BeneficiaryMemberID)
```

`actorMembers` comes from `authz.ResolveVerifiedActorMemberIDs(ctx, cmd.Actor.AppUserID)`
(`review_service.go:176`, backed by `authz_permissions.go:278-...`, a query over
`member_claims WHERE app_user_id = $1 AND claim_status = 'verified'`). `BeneficiaryMemberID`
is confirmed (by reading `release_review_adapters.go:47-70`) to be scanned directly from
`lifecycle.submitter_member_id` — i.e. it is the *same* value as the queue row's
`SubmitterMemberID`. The second signal exists to cover the case where the current actor
holds a **verified claim on the submitter's member identity** even under a **different**
`app_user_id` (e.g. a historical account merge/claim scenario) — a real, already-modeled edge
case in this codebase, not a hypothetical.

**Consequence for the list/counts predicate:** for full RQUE-04 parity with the decision-time
check, the exclusion predicate needs both signals, not just `submitter_app_user_id <>
$actor`:

```sql
AND source.submitter_app_user_id <> $actorAppUserID
AND NOT (source.submitter_member_id = ANY($actorVerifiedMemberIDs::bigint[]))
```

### Exactly what is missing and where

1. **List** (`ReleaseReviewQueryRepository.List`, `release_review_query_repository.go:87-140`)
   calls `releaseReviewQueuePredicates(options, true)` (line 96) — this function
   (`release_review_query_repository.go:264-304`) builds `WHERE` clauses only from
   `fansub_group_id`, `review_kind`, `review_state`, and optional `anime_id` /
   `release_version_id` / `review_kind` / `category` / `search` filters. **No submitter
   predicate exists at all.** Today, an actor with text-review capability sees their own
   submitted text reviews in the "open" queue, mixed in with others'.
2. **Counts** (`ReleaseReviewQueryRepository.Counts`, lines 142-176) calls the **same**
   `releaseReviewQueuePredicates` function (line 152) — so the count is inflated by the
   actor's own pending submissions today, directly violating RQUE-02's "erhöhen deren
   Actionable-Zähler nicht."
3. **Detail** (`ReleaseReviewQueryRepository.Detail`, lines 178-223) has its own, separate,
   hand-rolled `WHERE` clause (lines 197-202: `fansub_group_id`, `source_type`,
   `source_id`, `review_kind = ANY($4)`) — it does **not** call
   `releaseReviewQueuePredicates` at all (confirmed by reading the full function body: it
   builds its own inline SQL string, not a shared predicate builder). This is itself a
   **pre-existing RQUE-04 violation independent of L-02** — Detail and List/Counts do not
   share one predicate builder today even for the *existing* capability filter, let alone
   the new self-exclusion one. See Pitfall 3.
4. **Next** (`ReleaseReviewQueryRepository.Next`, lines 225-262) loads the current item's
   sort key with its own third hand-rolled `WHERE` (lines 236-243, structurally identical
   to Detail's), then calls `r.List(...)` (line 255) to get the actual next item — so Next
   correctly inherits whatever List's predicate builder does, but only for the "find current
   item's cursor position" half of its logic; the "which item counts as current" half again
   does not share the builder.

### Concrete required change

- **New field on `ReleaseReviewQueueOptions`** (or `ReleaseReviewQueueScope` — scope is the
  cleaner fit since it already flows through the cursor, see below): actor identity for
  exclusion purposes, e.g. `ActorAppUserID int64` and `ActorMemberIDs []int64`, populated by
  the handler from `permissions.Actor.AppUserID` and a **new** call to
  `AuthzRepository.ResolveVerifiedActorMemberIDs` (reuse the existing method — it is already
  exported and used by `review_service.go`; the query repository does not currently have
  access to an `AuthzRepository`, so this must be threaded through the handler, not queried
  a second time inside the query repository).
- **`releaseReviewQueuePredicates`** (`release_review_query_repository.go:264-304`) gains
  the two-signal exclusion clause above, applied unconditionally for `view=open` /
  `view=history` (never for the new `view=own` — see the "Wartet auf Fremdprüfung" pattern
  below, where the polarity inverts: only the actor's own rows are included, not excluded).
- **`Detail` and `Next`'s hand-rolled `WHERE` clauses** must gain the identical exclusion (or,
  better — see Pitfall 3 — be refactored to share one predicate builder with `List`/`Counts`,
  which directly satisfies RQUE-04's "same predicates" wording rather than requiring the
  same logic to be hand-copied into four places).
- **D04's 403 requirement**: today `Detail()` returns `ErrNotFound` → 404 when no row
  matches (`release_review_query_repository.go:203-205`), and there is no row-found-but-forbidden
  branch at all. Implementing D04 correctly means `Detail()` (or the handler layer around it)
  must **first** confirm the row exists in the fansub group (ignoring the self/capability
  predicate), and **only then** apply the self/capability check to decide between returning
  data (200) and denying (403) — collapsing straight to a capability-filtered query (making a
  self-submission indistinguishable from "genuinely does not exist") would produce 404, not
  403, and violate D04. This requires either two queries (existence, then
  authorization-shaped projection) or one query that returns enough information to
  distinguish the three outcomes (not found / found-but-forbidden / found-and-allowed) in the
  handler, mirroring the existing `writeReadError`/`writeDecisionError` three-way switch
  pattern already used elsewhere in this handler.

### Required test deliverables (concrete names, not "add tests")

- `backend/internal/repository/release_review_query_repository_test.go`:
  `TestReleaseReviewQueueRepositoryExcludesActorsOwnSubmissionFromListAndCounts` (Postgres
  fixture test, real DB via `testsupport.OpenPhase107Postgres`, mirroring the existing
  `TestReleaseReviewQueueRepositoryFiltersCountsDetailAndStablePages` pattern at line 126).
- `backend/internal/repository/release_review_query_repository_test.go`:
  `TestReleaseReviewQueueDetailReturnsForbiddenNotNotFoundForOwnSubmission` (or equivalent at
  the handler layer — see below — depending on where the plan puts the existence-vs-forbidden
  distinction).
- `backend/internal/handlers/release_review_handler_test.go`:
  `TestReleaseReviewDetailOwnSubmissionReturns403` (stub-based, mirrors the existing
  `TestReleaseReviewDetailCrossGroupIsScopedNotFound` pattern at line 261, which already
  proves the *cross-group* 404 case — Phase 141 needs the sibling *same-group,
  own-submission* 403 case).
- `backend/internal/handlers/release_review_handler_test.go`:
  `TestReleaseReviewNextNeverReturnsActorsOwnSubmission`.

---

## Standard Stack

No new external packages are required. This phase extends existing, already-standard
project infrastructure: Gin handlers, pgx-backed repositories, the Phase-137
`permissions.Service` resolver, and the existing Next.js/`@/components/ui` frontend stack.

**Version verification:** not applicable — zero new dependencies. `go.mod`/`package.json`
are not expected to change for this phase.

## Package Legitimacy Audit

**Not applicable.** This phase installs no new packages (backend or frontend). No slopcheck
run was needed; nothing to audit.

## Architecture Patterns

### System Architecture Diagram

```
                         ┌─────────────────────────────────────────┐
                         │      Browser: ReleaseReviewsSection      │
                         │  (existing "open"/"history" view lanes)  │
                         │  + NEW: own-pending "Fremdprüfung" lane  │
                         └───────────────┬───────────────────────┬─┘
                                         GET .../release-reviews  │ GET .../release-reviews?view=own
                                         GET .../counts           │ (no decision actions rendered)
                                         GET .../:id              │
                                         GET .../:id/next         │
                                         POST .../:id/decision    │
                                         ▼                        ▼
                         ┌─────────────────────────────────────────┐
                         │        ReleaseReviewHandler (Gin)        │
                         │  requestContext -> queueOptions/         │
                         │  authorizedKinds -> query.* / decisions  │
                         └───────────────┬───────────────────────┬─┘
                                         │                        │
                     ONE per-request     │                        │ Decide() also independently
                     ResolveGroupRights  │                        │ re-authorizes INSIDE the tx
                     call (Pitfall 1     ▼                        ▼
                     fix target)   ┌─────────────────┐   ┌──────────────────────┐
                                   │ permissions.     │   │ services.ReviewService │
                                   │ Service          │   │  .Decide (tx-scoped)   │
                                   │ .ResolveGroupRights│  │  - re-check capability │
                                   │  -> role grants   │  │  - re-check self-review│
                                   │  -> user overrides│  │  - InsertDecision      │
                                   │  -> specialized   │  │    (unique-conflict =  │
                                   │     grants (live, │  │    D08 "first wins")   │
                                   │     see L-01)      │  │  - ApplyDecision       │
                                   └─────────┬──────────┘  │    (state CAS = D08)   │
                                             │              └───────────┬───────────┘
                                             ▼                          ▼
                         ┌─────────────────────────────────────────────┐
                         │  ReleaseReviewQueryRepository (pgx)          │
                         │  releaseReviewQueuePredicates (shared today  │
                         │  by List+Counts only; Detail/Next need to    │
                         │  join this sharing per RQUE-04 -- Pitfall 3) │
                         │  NEW: + self-exclusion (view=open/history)   │
                         │       OR self-inclusion-only (view=own)      │
                         └───────────────┬───────────────────────────────┘
                                         ▼
                         ┌─────────────────────────────────────────┐
                         │  review_sources CTE (release_review_     │
                         │  lifecycle_sources VIEW, migration 0135) │
                         │  UNION of release_version_note +         │
                         │  release_version_media lifecycles only   │
                         │  -- Contribution reviews never flow here │
                         └───────────────────────────────────────────┘

           (Contribution Reviews are a fully separate tree, not shown above:
            ContributionReviewHandler -> ReviewRepository.ListProposedByGroup/
            Confirm/Reject, authorized via ActionFansubGroupMembersManage,
            reading proposal-status rows -- zero shared query surface.)
```

### Recommended Project Structure (files touched/added, respecting the 450-line cap)

`release_review_handler.go` is **already 444/450 lines** and `review_service.go` is
**already 448/450 lines** (both measured this session). Per CLAUDE.md's hard cap and
Phase 140's own precedent ("already at 448/450 lines — do not add to this file"), **any**
addition to either file requires extraction to a new sibling file, not incremental growth.

```
backend/internal/handlers/
├── release_review_handler.go              # existing (444 lines) -- do not grow
├── release_review_handler_authz.go         # NEW -- extracted authorizedKinds() + a new
│                                            #   ResolveGroupRights-once-per-request helper,
│                                            #   replacing the current 2x/4x-call pattern
├── release_review_own_pending_handler.go   # NEW (optional split) -- OwnPending() route
│                                            #   handler if the plan adds a dedicated endpoint
│                                            #   instead of a `view=own` query param
backend/internal/repository/
├── release_review_query_repository.go      # existing (410 lines) -- has headroom but adding
│                                            #   self-exclusion + Detail/Next predicate sharing
│                                            #   will likely push past 450; plan for a split
├── release_review_query_predicates.go      # NEW (recommended) -- extract
│                                            #   releaseReviewQueuePredicates + a shared
│                                            #   existence-vs-forbidden lookup used by both
│                                            #   Detail and List, closing Pitfall 3
backend/internal/services/
├── review_service.go                       # existing (448 lines) -- do not grow; self-review
│                                            #   logic here is ALREADY correct (L-02 confirms
│                                            #   no change needed to this file's own logic)
frontend/src/app/admin/fansubs/[id]/edit/
├── ReleaseReviewsSection.tsx               # existing -- gains a 3rd view tab/lane, filter
│                                            #   options driven by backend-returned allowed
│                                            #   kinds only (D10), removal of the always-zero
│                                            #   "Mitwirkungen" badge (see Pitfall 4)
├── OwnPendingReviewsSection.tsx            # NEW -- "Wartet auf Fremdprüfung" lane, read-only,
│                                            #   no decision actions, reuses @/components/ui
│                                            #   Table/Badge exactly like the existing lane
frontend/src/types/releaseReviews.ts
├── (extend) ReleaseReviewView               # 'open' | 'history' -> add 'own'
frontend/src/lib/api.ts
├── (extend) listReleaseReviews/getReleaseReviewCounts params to accept view: 'own'
```

### Pattern 1: Request-scoped single resolution (fixes Pitfall 1, satisfies RQUE-04)

**What:** Resolve `permissions.Service.ResolveGroupRights` exactly once per HTTP request in
the handler, then derive `allowedKinds` from `.Can(ActionReviewTextDecide)`/
`.Can(ActionReviewImageDecide)` instead of calling `CanReviewForFansubGroup` twice.
**When to use:** Every route on `ReleaseReviewHandler` that currently calls
`authorizedKinds()` (List, Counts, Detail, Next, Decide's pre-check).
**Example (illustrative, not literal code to paste):**
```go
// Source: derived from permissions/effective_rights.go:177-196 (existing exported method)
groupRights, err := h.permissionsService.ResolveGroupRights(ctx, actor, groupID)
// groupRights.Can(permissions.ActionReviewTextDecide).Allowed
// groupRights.Can(permissions.ActionReviewImageDecide).Allowed
// -- both derived from ONE batch-loaded resolution, not two independent
// CanReviewForFansubGroup calls that each re-run the full source load.
```

### Pattern 2: Own-pending as a third `view` value, not a parallel endpoint

**What:** Reuse the existing `ReleaseReviewQueueScope.View` mechanism
(`release_review_query_cursor.go:14-27`, currently `"open"`/`"history"`) by adding
`ReleaseReviewQueueViewOwn = "own"`, rather than inventing a second endpoint/DTO shape.
**When to use:** For RQUE-03/D01/D03's "Wartet auf Fremdprüfung" lane.
**Why this fits the existing architecture:** `View` is already part of both
`ReleaseReviewQueueScope` and the opaque cursor payload (`releaseReviewCursor.View`,
`release_review_query_cursor.go:45`), so cursor stability and cross-view replay prevention
(`DecodeReleaseReviewQueueCursor`'s `decoded.View != scope.View` check, line 101) already
generalizes to a third value with no structural change — only `validateReleaseReviewScope`
(line 156) needs to accept `"own"` alongside `"open"`/`"history"`.
**Polarity note:** For `view=own`, the submitter predicate **inverts** (include only the
actor's own rows) and, per D10, the capability-derived `AllowedKinds` gate must be
**bypassed** — the actor sees their own pending text+image submissions regardless of whether
they personally hold `review.text.decide`/`review.image.decide`. This means
`ValidateReleaseReviewQueueOptions`'s current `len(options.AllowedKinds) == 0 → error`
gate (line 122) needs a `view=="own"` branch that forces `AllowedKinds = [text, image]`
unconditionally rather than deriving it from capability.

### Pattern 3: Existence-then-authorize for the 403/404 distinction (D04)

**What:** Two-step resolution for `Detail()`: first confirm the row exists in the requested
fansub group (any submitter, any kind), then apply the self/capability predicate to decide
200 vs 403.
**When to use:** `Detail()` and any future single-item lookup (`Next()`'s "resolve current
item" half).
**Why:** Collapsing straight to a capability+self-filtered query makes "exists but forbidden"
indistinguishable from "does not exist," which would silently produce 404 and violate D04's
explicit 403 requirement. Team4s already has this pattern (contrast, not to be confused): the
Phase-128 public-member surface deliberately returns a **neutral 404** for forbidden access
(privacy-oracle prevention) — that is the **opposite**, deliberate convention for a different
domain (public member privacy). Phase 141's D04 is explicit that existing-but-forbidden
reviews are 403, not neutral-404 — do not import the Phase-128 pattern here.

### Anti-Patterns to Avoid

- **Caching the actor's resolved review grants/allowed-kinds across requests:** would
  reintroduce the exact staleness window RDEL-05 forbids. Any per-request memoization
  introduced to fix Pitfall 1 must be a local variable inside one request's handler
  invocation, never a package-level or longer-lived cache.
- **Frontend-side self-submission filtering as the only mechanism:** violates D03 directly.
  The backend must exclude/separate; the frontend may only render what it receives.
- **Reusing `releaseReviewQueuePredicates`'s capability-filtered query for the
  existence-check half of Detail's 403/404 decision:** collapses "forbidden" into "not
  found," violating D04 (see Pattern 3).
- **Merging Contribution Review rows into `review_sources`:** the CTE is a hard boundary
  (only two `LEFT JOIN`s, both non-contribution) — do not add a third source type here, per
  D09/RQUE-06.

## Contribution Reviews Stay Separate (Success Criterion 5 / RQUE-06 / D09)

Confirmed structurally distinct today, independent of anything Phase 141 touches:

- **Handler:** `backend/internal/handlers/contribution_review_handler.go` —
  `ContributionReviewHandler.ListProposals`/`ConfirmProposal`/`RejectProposal`, authorized via
  `CanForFansubGroup(ctx, actor, permissions.ActionFansubGroupMembersManage, fansubID)` (a
  **different** action than `review.contribution.decide`, per the in-code comment at line
  77-78: "Autorisierung: CanForFansubGroup mit ActionFansubGroupMembersManage (deckt
  Fansub-Lead und Plattform-Admin ab)").
- **Repository:** `ReviewRepository.ListProposedByGroup`/`Confirm`/`Reject` — reads
  proposal-status rows (`status='proposed'`), not the `review_sources` view.
- **Data source:** `release_review_lifecycle_sources` (migration
  `0135_release_review_lifecycle.up.sql:85-115`) is a `UNION ALL` of exactly two source
  types — `release_version_note` and `release_version_media` — via
  `release_version_note_review_lifecycle`/`release_version_media_review_lifecycle`
  underlying tables. `ReviewKindContribution` (declared in
  `repository/review_decision_repository.go:18` and mapped by
  `reviewActionForKind`/`services/review_service.go:276-287` for the *generic* review-service
  decision path used by delegation eligibility checks) **never actually appears** in this
  view — there is no third `UNION ALL` branch for it. Confirmed by reading the full view
  definition.
- **Counts DTO:** `ReleaseReviewQueueCounts.Contribution` (`release_review_query_repository.go:58`)
  is hardcoded to literal `0` in the SQL (`release_review_query_repository.go:161`:
  `0,` as a literal column in the `COUNT(*) FILTER` list) — the release-review counts
  endpoint has never actually computed a real contribution count; it is a vestigial always-zero
  field. Recommendation: do not remove the field (contract stability), but see Pitfall 4 for
  the frontend badge that currently renders it as if it were real.

**No architectural guard is needed beyond what already exists** — the two systems do not
share a query, a table read, or an authorization action. The one recommended addition (not
required, but consistent with D06's "no leakage" spirit) is documented in Pitfall 4: stop
rendering the always-zero "Mitwirkungen" counter inside the text/image queue UI, since it
currently implies contribution review state the text/image queue has no real knowledge of.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Actor capability resolution for review kinds | A second, queue-specific capability check | `permissions.Service.ResolveGroupRights` (already the canonical, live-resolving D01 precedence engine) | L-01 proves this is already correct and live; a second mechanism would only create a second thing to keep in sync |
| Self-review identity comparison | A new "is this my item" helper in the query layer | The existing two-signal pattern from `review_service.go:189-190` (`AppUserID` match OR verified member-ID match via `ResolveVerifiedActorMemberIDs`) | Decision-time already encodes the correct, edge-case-aware definition of "own"; the queue must match it exactly for RQUE-04, not invent a simpler one-signal version |
| Cursor/pagination stability across a new "own" view | A new cursor format for the own-pending lane | The existing `View`-scoped opaque cursor (`release_review_query_cursor.go`) | Already generalizes to a third `View` value with no structural change (Pattern 2) |
| 403-vs-404 response shaping | A new generic "forbidden" middleware | The handler's existing `writeReadError`/`writeDecisionError` switch-on-sentinel-error pattern (`release_review_handler.go:340-377`) | Matches the codebase's established error-mapping convention; just needs a new sentinel/branch for "found but forbidden" |

**Key insight:** every piece Phase 141 needs already has a canonical implementation
somewhere in this codebase (decision-time self-check, the central resolver, the
View-scoped cursor). The work is almost entirely about **propagating** existing correct
logic into the read paths that currently skip it, not inventing new logic.

## Common Pitfalls

### Pitfall 1: Redundant `ResolveGroupRights` resolution (real N+1, found this session)

**What goes wrong:** `authorizedKinds()` (`release_review_handler.go:299-338`) calls
`CanReviewForFansubGroup` once per review kind (2x), and each call independently re-runs the
**entire** `loadGroupRightsSources` batch load (role list, membership, overrides,
specialized-grant resolution — 3-4 DB round trips) from scratch. `List`, `Counts`, `Detail`,
`Next`, and the pre-check inside `Decide` each call `authorizedKinds()` once — meaning a
single "load the queue" page view (List + Counts fired in parallel by the frontend, per
`ReleaseReviewsSection.tsx:124-133`'s `Promise.all`) triggers roughly 2 (kinds) × 2 (routes)
× 3-4 (sources) = 12-16 authorization-related DB round trips today, before Phase 141 adds
anything.
**Why it happens:** `ResolveGroupRights` already computes the state for **every** known
action in one pass (`evaluateGroupRights(actor, fansubGroupID, sources, allKnownActions)`,
`effective_rights.go:193/195`) but `CanReviewForFansubGroup` is invoked per-action instead of
once-and-projected.
**How to avoid:** Call `ResolveGroupRights` once per request (Pattern 1) and project both
review actions from the single result via `.Can(action)`.
**Warning signs:** If a Phase 141 plan adds *more* per-item or per-action authorization calls
(e.g. checking self-review by looping rows individually against a live query) instead of
folding the check into the existing single SQL predicate, the N+1 problem gets worse, not
better — and directly conflicts with QUAL-06 ("Query- und UI-Gates verhindern
N+1-Abfragen"), which is a locked, already-`[x]`-complete v1.4 requirement Phase 141 must not
regress.

### Pitfall 2: Detail returns 200 (not 403) for the actor's own submission today

**What goes wrong:** `ReleaseReviewQueryRepository.Detail` (lines 178-223) has no submitter
predicate at all — an actor with text-review capability who submitted a text note
themselves can `GET .../release-reviews/:id` on their own item and receive a full 200 with
`can_edit_release` populated, today, in production.
**Why it happens:** Detail was built to answer "does this ID exist, in this group, with an
allowed kind" — self-review was never in scope for it because self-review was, until now,
enforced only at the point of decision (D11's pre-existing half).
**How to avoid:** Implement Pattern 3 (existence-then-authorize) explicitly; do not assume
adding the List/Counts self-exclusion predicate to Detail "for free" is sufficient — Detail's
correctness requirement is different (403, not silent exclusion) and needs its own explicit
branch.
**Warning signs:** A plan that only touches `releaseReviewQueuePredicates` and assumes
Detail/Next "inherit" the fix (they do not — see L-02, item 3-4) will ship RQUE-02 for
List/Counts but leave D04 unimplemented.

### Pitfall 3: Detail/Next do not share a predicate builder with List/Counts (pre-existing, independent of L-02)

**What goes wrong:** `Detail()` and `Next()` each hand-roll their own `WHERE` clause
(`release_review_query_repository.go:197-202` and `:236-243`) instead of calling
`releaseReviewQueuePredicates`. Today this is a latent RQUE-04 violation even before Phase
141: if a future change alters the capability filter in one place (e.g.
`releaseReviewQueuePredicates`), Detail/Next would silently drift out of sync unless someone
remembers to update three call sites by hand.
**Why it happens:** Detail/Next need a single-row lookup by ID, not a paginated list, so they
were written as separate simple queries rather than reusing the list predicate builder
directly.
**How to avoid:** Extract a shared predicate-building function (Pattern 3's existence check
plus the capability/self filter) used by all four methods, closing RQUE-04 structurally
rather than by convention.
**Warning signs:** Any plan that "adds the self-exclusion clause" to `Detail`/`Next` by
literally copy-pasting the new SQL fragment into three places (rather than extracting a
shared builder) reproduces this drift risk for the *next* phase that touches this file.

### Pitfall 4: The frontend's "Mitwirkungen {counts.contribution}" badge is always 0 today

**What goes wrong:** `ReleaseReviewsSection.tsx:261` renders `<Badge
variant="muted">Mitwirkungen {counts.contribution}</Badge>` inside the text/image queue,
where `counts.contribution` is a literal SQL `0` (see "Contribution Reviews stay separate"
above) — i.e. this badge has never reflected real data and currently always shows
"Mitwirkungen 0" regardless of how many contribution reviews actually exist.
**Why it happens:** Likely a placeholder from before Contribution Review's separate workflow
was fully split out (predates Phase 141).
**How to avoid:** Not a hard Phase 141 requirement (D09 forbids *new* Contribution Review UI,
but this is *removal* of a misleading always-zero badge, arguably required by D06's spirit —
"no leakage of unavailable review work" extends naturally to "no fabricated-zero work
either"). Flag for the plan/UI-SPEC to decide explicitly rather than silently leaving it, since
a reviewer could reasonably read "Mitwirkungen 0" as "there are zero contribution reviews
right now," which is not something this endpoint has ever actually verified.
**Warning signs:** If Phase 141's UI-SPEC does not mention this badge at all, it will ship
unchanged and continue being a silently-wrong (always-zero) UI element, which is exactly the
class of bug D06 exists to prevent for the *actionable* counters phase 141 IS building.

## Code Examples

### Existing decision-time self-review check (reuse this exact definition, do not simplify)

```go
// Source: backend/internal/services/review_service.go:171-190 (already shipped, do not modify)
if target.SubmitterAppUserID == nil || *target.SubmitterAppUserID <= 0 ||
    target.BeneficiaryMemberID == nil || *target.BeneficiaryMemberID <= 0 {
    return nil, ErrReviewTargetAttributionInvalid
}
authz := repository.NewAuthzRepository(tx)
actorMembers, err := authz.ResolveVerifiedActorMemberIDs(ctx, cmd.Actor.AppUserID)
// ...
self := cmd.Actor.AppUserID == *target.SubmitterAppUserID ||
    containsReviewMemberID(actorMembers, *target.BeneficiaryMemberID)
```

### Existing shared predicate builder to extend, not replace (List/Counts today)

```go
// Source: backend/internal/repository/release_review_query_repository.go:264-304
func releaseReviewQueuePredicates(options ReleaseReviewQueueOptions, includeCursor bool) ([]string, []any, error) {
    scope := options.Scope
    args := []any{scope.FansubGroupID, options.AllowedKinds}
    where := []string{"source.fansub_group_id = $1", "source.review_kind = ANY($2::text[])"}
    if scope.View == ReleaseReviewQueueViewOpen {
        where = append(where, "source.review_state = 'pending'")
    } else {
        where = append(where, "source.review_state <> 'pending'")
    }
    // ... existing optional filters (anime_id, release_version_id, kind, category, search)
    // NEW (view=open/history only): submitter exclusion using ActorAppUserID + ActorMemberIDs
    // NEW (view=own only, separate branch): submitter INCLUSION, AllowedKinds bypass per D10
}
```

### Existing error-mapping pattern to extend for D04's new 403 branch

```go
// Source: backend/internal/handlers/release_review_handler.go:340-349 (writeReadError)
func (h *ReleaseReviewHandler) writeReadError(c *gin.Context, err error) {
    switch {
    case errors.Is(err, repository.ErrValidation):
        c.JSON(http.StatusBadRequest, reviewError("REVIEW_BAD_REQUEST", "..."))
    case errors.Is(err, repository.ErrNotFound):
        c.JSON(http.StatusNotFound, reviewError("REVIEW_NOT_FOUND", "..."))
    // NEW: case errors.Is(err, repository.ErrForbidden-or-new-sentinel):
    //     c.JSON(http.StatusForbidden, reviewError("REVIEW_FORBIDDEN", "..."))
    default:
        writeInternalErrorResponse(c, "interner serverfehler", err, "...")
    }
}
```

## State of the Art

Not applicable in the "library upgrade" sense — this is an internal architecture
consolidation of code shipped across Phases 107/134/135/137/138/140 within the same
milestone. The relevant "old approach → current approach" shift is internal to this phase
itself:

| Old (current production behavior) | New (Phase 141 target) | Why Changed | Impact |
|---|---|---|---|
| Self-review blocked only at decision commit | Self-review excluded from list/count, 403 on direct detail, blocked at decision commit (unchanged) | RQUE-02/D01/D04 | Own items never appear as actionable work in the first place, not just rejected if attempted |
| `authorizedKinds()` re-resolves `ResolveGroupRights` per action (2-4x per request) | One `ResolveGroupRights` call per request, projected per action | QUAL-06 (N+1 prevention), found as Pitfall 1 | Fewer DB round trips per queue page load |
| Detail/Next hand-roll their own predicate, diverging from List/Counts | Detail/Next/List/Counts share one predicate builder | RQUE-04 | Structural guarantee instead of copy-paste convention |
| `view` is `"open"` \| `"history"` | `view` gains `"own"` | RQUE-03/D01/D03 | Reuses existing cursor/scope machinery, no new endpoint shape |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Adding a third `view=own` value (rather than a fully separate endpoint) is the right shape for "Wartet auf Fremdprüfung," per D03's "backend mode/query/endpoint as appropriate to the existing architecture." | Architecture Patterns, Pattern 2 | If the planner/user prefers a fully separate endpoint (e.g. `GET .../release-reviews/own`) for clearer API-contract separation, the recommended file split still mostly holds, but the cursor-reuse argument would need to be redone for a new endpoint's own cursor scheme. This is a legitimate implementation-detail choice, not a correctness question — flagging as ASSUMED because CONTEXT.md leaves the exact mechanism to the research/plan. |
| A2 | Detail's existence-then-authorize split (Pattern 3) is best implemented as two SQL calls (or one query returning enough columns to distinguish outcomes) rather than a single query with a computed `is_forbidden` boolean column. | Architecture Patterns, Pattern 3 | Low risk either way — this is a query-shape choice with no behavioral difference. Flagged only because this research did not test-drive both shapes against the real schema. |
| A3 | Removing/hiding the always-zero "Mitwirkungen" badge (Pitfall 4) is desirable but not mandatory for Phase 141's must-haves. | Pitfall 4 | If left unchanged, it is pre-existing behavior, not a Phase 141 regression — but the planner should make an explicit choice rather than an implicit one, since it directly abuts D06's "no leakage" language. |

## Open Questions

1. **Should "Wartet auf Fremdprüfung" support the existing `type`/`category`/`search` filters, or only view/pagination?**
   - What we know: D10 says "Filters inside Wartet auf Fremdprüfung are independent of review capability" — implying filters DO exist there, just not capability-gated.
   - What's unclear: Whether "independent of review capability" means all existing filter dimensions (anime, release, type, category, search) apply unchanged, or whether the own-pending lane is meant to be a simpler, unfiltered list given it is inherently already scoped to one actor's own small submission set.
   - Recommendation: Default to reusing the full existing filter set (minimal new surface, consistent UX with the open/history lanes) unless the plan-checker or user narrows this; the backend mechanism (Pattern 2) supports either choice equally well since it is just another `View` value flowing through the same predicate builder.

2. **Does D08's "first completed decision wins" 409 already fully cover the case where the *capability* (not just pending-state) changes between detail-load and decide?**
   - What we know: `InsertDecision`'s conflict handling and `ApplyDecision`'s state check already produce 409 for a double-decision race (confirmed via `writeDecisionError`'s existing `ErrReviewAlreadyDecided`/`ErrReviewTargetNotPending` → 409 mapping). Capability revocation between detail-load and decide is separately covered by `Decide()`'s own fresh `CanReviewForFansubGroup` call (L-01) → 403.
   - What's unclear: Whether a regression test already proves the *combination* (concurrent revoke + concurrent decide racing each other) resolves deterministically to one of {403, 409} rather than a rare double-apply. This is very likely already safe given `LockMembership`'s row lock pattern and `ApplyDecision`'s CAS, but this research did not trace `adapter.ApplyDecision`'s exact SQL for both adapters to confirm the lock scope covers this race.
   - Recommendation: The planner should require a concurrency test mirroring the existing `TestReleaseReviewDecisionMapsStableConflictWithoutRetry` (`release_review_handler_test.go:328`) pattern, extended with a revoke-mid-flight variant, as part of closing L-01's "required planning deliverable."

## Environment Availability

Skipped — this phase is a pure backend/frontend code change against the existing Team4s
Docker Compose stack (Postgres, Go backend, Next.js frontend), all already running per
CLAUDE.md's canonical environment. No new external dependency is introduced.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Backend framework | Go `testing` + `testify` (`github.com/stretchr/testify`), real-Postgres integration tests via `testsupport.OpenPhase107Postgres(t)` |
| Backend config file | none (env-var gated: `TEAM4S_PHASE107_TEST_DSN`, following the existing convention this package already uses for review-domain tests — never falls back to `DATABASE_URL`, per the Phase-128 precedent recorded in STATE.md) |
| Frontend framework | Vitest 3 (`frontend/vitest.config.ts`) |
| Quick run command (backend) | `docker compose exec -T team4sv30-backend sh -c "cd /app && go test ./internal/handlers ./internal/repository ./internal/services -run 'ReleaseReview' -count=1 -v"` |
| Quick run command (frontend) | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin/fansubs --reporter=basic"` |
| Full suite command (backend) | `go test ./... -count=1` (from within the backend container) |
| Full suite command (frontend) | `npx vitest run --reporter=basic` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RDEL-05 | Revoked delegation immediately loses effect on list/counts/decide | integration (real Postgres) | `go test ./internal/... -run TestPhase141RevokedDelegationImmediateEffect` | ❌ Wave 0 |
| RQUE-01 | List only contains actor-decidable kinds | integration | `go test ./internal/repository -run TestReleaseReviewQueueRepositoryFiltersCountsDetailAndStablePages` | ✅ (existing, extend) |
| RQUE-02 | Own submissions excluded from list + counts | integration | `go test ./internal/repository -run TestReleaseReviewQueueRepositoryExcludesActorsOwnSubmissionFromListAndCounts` | ❌ Wave 0 |
| RQUE-03 | Own pending shown separately, no decision actions | unit (handler stub) + component (frontend) | `go test ./internal/handlers -run TestReleaseReviewOwnPending` / `npx vitest run OwnPendingReviewsSection.test.tsx` | ❌ Wave 0 |
| RQUE-04 | List/counts/detail/next share predicates | integration (shared-builder regression) | `go test ./internal/repository -run TestReleaseReviewDetailNextShareListPredicateBuilder` | ❌ Wave 0 |
| RQUE-05 | Manipulated URL / stale client blocked server-side | handler stub tests | `go test ./internal/handlers -run TestReleaseReviewDetailOwnSubmissionReturns403` | ❌ Wave 0 |
| RQUE-06 | Contribution reviews stay in their own workflow | negative/regression (no shared query surface) | `go test ./internal/repository -run TestReleaseReviewQueueNeverIncludesContributionSourceType` | ❌ Wave 0 (new explicit guard test recommended even though architecturally already true) |

### Sampling Rate

- **Per task commit:** the relevant quick-run subset above (`-run 'ReleaseReview'` filter).
- **Per wave merge:** full backend + frontend suite, cross-checked against the pre-existing
  baseline noted below (do not chase pre-existing failures).
- **Phase gate:** full suite green (modulo documented pre-existing baseline) before
  `/gsd:verify-work`.

### Wave 0 Gaps

- [ ] `TestPhase141RevokedDelegationImmediateEffect` (or equivalent name) — real-Postgres,
      grant → observe in list/counts/decide-allowed → revoke → observe gone from
      list/counts/decide-denied, all in one test, no restart — closes RDEL-05/L-01's
      required deliverable.
- [ ] `TestReleaseReviewQueueRepositoryExcludesActorsOwnSubmissionFromListAndCounts` — closes
      RQUE-02/L-02.
- [ ] `TestReleaseReviewDetailOwnSubmissionReturns403` — closes RQUE-02/D04.
- [ ] `TestReleaseReviewNextNeverReturnsActorsOwnSubmission` — closes RQUE-02/D05 combination.
- [ ] `TestReleaseReviewQueueNeverIncludesContributionSourceType` — explicit regression guard
      for RQUE-06, even though architecturally already true (belt-and-suspenders, cheap to
      write, prevents silent future drift if someone adds a third CTE branch).
- [ ] Frontend `OwnPendingReviewsSection.test.tsx` — new component, zero existing coverage.
- [ ] Frontend `ReleaseReviewsSection.test.tsx` extension — filter options limited to
      backend-returned allowed kinds (D10), neutral empty state (D13) copy exact match
      ("Aktuell keine Prüfungen für dich offen.").

**Pre-existing baseline note (do not scope-creep into fixing):** per
`.planning/phases/139-scalable-user-admin-projections/139-BASELINE.md` and STATE.md's Phase-140
re-verification entries, there are ~43 pre-existing frontend test failures (15 files) and
~24-29 pre-existing backend `internal/handlers` failures (nil `permissions.Service.LoadCache`
in `testmain_test.go`, Phase-137 debt). These are not Phase 141's to fix; the plan should
confirm the failure count is unchanged (not zero) as its regression baseline check, exactly as
Phase 140's own plans did.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V4 Access Control | yes | Server-side, transaction-scoped re-authorization at decision time (already implemented, `review_service.go:175-188`); this phase closes the read-path gaps (L-02, D04) using the same central resolver, not a new mechanism |
| V5 Input Validation | yes | Existing strict-JSON decoder (`decodeStrictReleaseReviewJSON`, disallows unknown fields + trailing JSON) and opaque, tamper-checked cursor/ID encoding (`release_review_query_cursor.go`) — unchanged, reused as-is for any new `view=own` parameter |
| V6 Cryptography | no | Not applicable — no new cryptographic operation introduced |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| BOLA/IDOR via manipulated `reviewId` on `/release-reviews/:id` for an out-of-scope or own item | Elevation of Privilege | Server-side existence+authorization check on every read (Pattern 3), not just at decision time — this is precisely RQUE-05/D04's requirement, and the existing `TestReleaseReviewDetailCrossGroupIsScopedNotFound` test (`release_review_handler_test.go:261`) already proves the cross-group half; Phase 141 must add the same-group-but-forbidden half |
| Stale-client race on decision (client holds an outdated `expected_revision` or capability snapshot) | Tampering | Already mitigated: `ExpectedRevision` optimistic check at the handler (`release_review_handler.go:187-193`) plus the authoritative transaction-scoped re-check inside `services.ReviewService.Decide` (D08/D11, already implemented) |
| Self-review escalation via a second identity (verified member claim under a different app_user account) | Elevation of Privilege | Already modeled at decision time via `ResolveVerifiedActorMemberIDs` + `containsReviewMemberID` (`review_service.go:176,189-190`) — L-02 requires the *same* two-signal check, not a weaker one-signal version, in the list/count/detail predicates |
| Delegation-revocation race (actor was mid-session with a since-revoked specialized grant) | Elevation of Privilege | Already immediate per L-01 (live-resolving, no cache) — Phase 141 must not introduce caching while optimizing the redundant-call pattern (Pitfall 1) |

## Sources

### Primary (HIGH confidence — direct code reading this session)

- `backend/internal/handlers/release_review_handler.go` (full file read)
- `backend/internal/repository/release_review_query_repository.go` (full file read)
- `backend/internal/repository/release_review_query_cursor.go` (full file read)
- `backend/internal/services/review_service.go` (full file read)
- `backend/internal/permissions/permissions.go` (lines 1-120, 270-892 key sections read)
- `backend/internal/permissions/effective_rights.go` (lines 1-290 read)
- `backend/internal/permissions/review_grant_provider.go` (full file read)
- `backend/internal/repository/authz_permissions.go` (lines 180-300 read)
- `backend/internal/handlers/contribution_review_handler.go` (lines 1-80 read)
- `backend/internal/services/release_review_adapters.go` (relevant excerpt read)
- `database/migrations/0135_release_review_lifecycle.up.sql` (relevant excerpt read)
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseReviewsSection.tsx` (full file read)
- `frontend/src/types/releaseReviews.ts` (full file read)
- `.planning/phases/140-review-delegation-management/140-CONTEXT.md`,
  `140-VERIFICATION.md` (full read — confirmed shipped seams, RDEL-05 scope fence)
- `.planning/phases/141-actor-decidable-review-queue/141-CONTEXT.md` (full read — D01-D15)
- `.planning/REQUIREMENTS.md`, `.planning/STATE.md` (relevant sections read)
- `backend/cmd/server/admin_routes.go` (route registration lines read)

### Secondary (MEDIUM confidence)

- `.planning/phases/141-actor-decidable-review-queue/external-review/ext-141-research.md` —
  used only as a pointer to prior file-location guesses (explicitly instructed not to be
  treated as prescriptive); several of its named files/types (`ReleaseReviewQueueOptions`
  location, `ReleaseReviewsSection.tsx`) were independently re-verified against the current
  codebase and confirmed still accurate; its proposed mechanism ("one predicate/query scope")
  is affirmed by this research's own independent tracing, not merely copied from it.

### Tertiary (LOW confidence)

- None — every claim in this document was checked against the actual repository state this
  session; no unverified WebSearch or training-data claims were needed since this is a
  pure internal-codebase research task with no external library involved.

## Metadata

**Confidence breakdown:**
- Standard stack: N/A — no new dependencies
- Architecture (L-01/L-02 findings): HIGH — every claim traced to specific file:line
  evidence read this session, cross-referenced across handler → service → permissions →
  repository layers
- Pitfalls: HIGH for Pitfalls 1-3 (directly observed in code); MEDIUM for Pitfall 4 (correctly
  observed as always-zero, but whether it's in-scope for Phase 141 to fix is a product
  decision, not a code fact)

**Research date:** 2026-08-26
**Valid until:** Until this phase's plans are executed (internal-codebase research on
actively-changing code; do not reuse for a later phase without re-verification)
