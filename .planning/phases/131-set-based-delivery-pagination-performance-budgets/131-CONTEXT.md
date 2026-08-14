# Phase 131: Set-Based Delivery, Pagination & Performance Budgets - Context

**Gathered:** 2026-08-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 131 makes the public member profile and its "Mehr anzeigen" continuation requests
bounded, stable, and measurably efficient as project/contribution volume grows: a constant
query budget (no N+1), documented and enforced list bounds, honest offset pagination with
stable ordering, baseline-anchored performance budgets measured on both seed profiles,
evidence-backed indexes only, and a conservative cache-class policy.

This phase does NOT: re-shape the public DTO/enums/typed branches (Phase 130, done as its
contract); consolidate shared SSR composition or race-safe frontend state (Phase 132); do
image-variant/sizes/compression or responsive/accessible visual work (Phase 133, which owns
PMPF-06 and PMPF-08); or run the bundled clean-state live UAT (Phase 134). It builds directly
on the Phase-129 projections (which already make "Mehr anzeigen" functional on one dataset,
129-D-10) and the Phase-130 minimal DTO.

</domain>

<decisions>
## Implementation Decisions

### Pagination mechanism & honest contract (PMCT-06, PMPF-02)
- **D-01 (Offset-based, kept):** Keep offset/limit pagination (as in GetPublicMemberProjectsByID
  today). Do NOT switch to keyset/cursor - the data is append-mostly fansub history with modest
  per-member lists, so offset is sufficient and simpler.
- **D-02 (Stable, fully tie-broken ordering):** Every paginated list uses a deterministic
  ORDER BY that breaks ties down to a unique key (domain sort keys then a stable id, e.g.
  anime_id/row id DESC) so page contents do not wobble between loads.
- **D-03 (Honest total & continuation):** total is computed from the SAME filtered/visible set
  that yields the rows - never a separately-filtered count - and limit/offset/total continuation
  semantics are truthful and documented in OpenAPI (PMCT-06).

### Documented list bounds (PMPF-03)
- **D-04 (Contracted page sizes):** Initial sizes match today's behavior and become the
  documented, enforced contract; each list gets a documented max page size. Starting contract
  (initials fixed; max numbers may be tuned after baseline measurement):
  - current_projects: initial 6, max 24 (matches current 6 / max 24)
  - latest_contributions: initial 3, max 20 (replaces hardcoded LIMIT 3)
  - previous_contributions: initial 6, max 24
  - contributions endpoint: initial 20, max 50
- **D-05 (No UI-unused child data):** Bounded payloads transfer no UI-unused child collections
  (aligns with the Phase-130 Recent* removal); each list page carries only what its card renders.

### Acceptance budgets & measurement (PMPF-07, PMPF-01)
- **D-06 (Baseline-anchored budgets):** A first 131 wave measures a reproducible baseline on
  BOTH seed profiles (sheppert, csubs-leader) via
  frontend/scripts/collect-member-profile-evidence.mjs (extended as needed), capturing query
  count, payload size, latency, image waterfall, and Web Vitals. Payload/latency budgets are
  then locked as baseline + a defined margin (~20%).
- **D-07 (Absolute, baseline-independent ceilings):**
  - Profile query count MUST be constant regardless of project/contribution count - no
    per-project/per-card reads, no N+1 (PMPF-01, SC1). This is a structural ceiling, not a
    baseline value.
  - Web Vitals in the "good" band: LCP <= 2.5s, CLS <= 0.1, INP <= 200ms.
- **D-08 (Measurement is the fixture-driven gate):** the evidence capture is reproducible and
  committed with the phase; both profiles must pass the fixed budgets. Authoritative live
  sign-off remains the bundled Phase-134 UAT (milestone V-02).

### Cache classes & index policy (PMPF-04, PMPF-05)
- **D-09 (No shared cache in 131; viewer classes separate):** Public (anonymous) and
  viewer-specific (owner / private-preview; is_owner / is_private_preview) responses stay in
  SEPARATE cache classes to prevent preview leakage. No shared/public cache is introduced in
  131 unless measurement proves a real bottleneck AND a complete invalidation story exists.
- **D-10 (Evidence-backed indexes only):** No index is added without representative
  EXPLAIN(ANALYZE, BUFFERS) evidence on BOTH seed profiles showing it helps. No speculative
  indexes.

### Claude's Discretion
- The concrete set-based query rewrite that achieves the constant query budget (single query
  with JSON aggregation vs a fixed small number of batched queries), provided the query count
  is provably constant (D-07).
- The exact max page-size numbers within the D-04 starting contract, pending baseline
  measurement; initial sizes are fixed.
- Measurement-harness extensions and where evidence artifacts live under the phase dir.
- The split of member_profile_repository.go (~1810 lines) into <=450-line files when touched,
  per 129-S-02 - behavior-preserving, not crossing Phase-128 identity/access seams.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone scope, requirements, and prior decisions
- .planning/PROJECT.md - v1.3 goal, brownfield/privacy/test-data constraints.
- .planning/ROADMAP.md - Phase 131 goal, deliverables, success criteria, downstream separation.
- .planning/REQUIREMENTS.md - locked Phase 131 requirements PMCT-06, PMPF-01..05, PMPF-07.
- .planning/DECISIONS.md - v1.3 fixture-driven verification + bundled Phase-134 live UAT (2026-08-14).
- .planning/phases/130-public-dto-cross-layer-contract-alignment/130-CONTEXT.md - the minimal DTO + no-unused-child-collections contract this phase paginates.
- .planning/phases/129-canonical-public-projections-data-correctness/129-CONTEXT.md - 129-D-10 (functional "Mehr anzeigen" on one dataset), 129-S-02 (repo split), the seed/fixture (V-03).

### Engineering rules
- docs/engineering/implementation-contract.md - reuse-first; no parallel projections.
- docs/api/api-contracts.md - cross-layer contract workflow (pagination contract lands in OpenAPI).

### Data, pagination, and evidence surfaces (Plan-time read first, from ROADMAP)
- backend/internal/repository/member_profile_repository.go - offset loaders (loadCurrentProjects,
  GetPublicMemberProjectsByID), hardcoded LIMIT 3 slices; ~1810 lines (split per 129-S-02).
- backend/internal/repository/project_member_public_repository.go - public project projection.
- backend/internal/repository/anime_contributions_public_repository.go - public contributions projection.
- backend/internal/handlers/app_public_profile.go - GetPublicMemberProjects bounds
  (parseBoundedProjectPageValue: default 6, max 24, offset 0..10000).
- backend/internal/handlers/contributions_public_handler.go - contributions continuation endpoint.
- Their PostgreSQL tests (member_profile_repository_postgres_test.go, project_member_public_repository_test.go).
- shared/contracts/openapi.yaml - PublicMemberProjectsPage/Envelope, contribution schemas (pagination contract, PMCT-06).
- frontend/scripts/collect-member-profile-evidence.mjs - reproducible evidence capture harness (PMPF-07).
- frontend/src/lib/api.ts - getMemberProfile / member projects+contributions helpers and current API consumers.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Offset pagination already exists: GetPublicMemberProjectsByID + PublicMemberProjectsPage
  { items, total, limit, offset } - D-01/D-03 harden it, do not rebuild it.
- parseBoundedProjectPageValue already clamps limit (default 6, max 24) and offset (0..10000) -
  the bound-enforcement seam D-04 needs already exists.
- frontend/scripts/collect-member-profile-evidence.mjs already exists as the evidence harness -
  extend it for D-06 rather than writing a new one.
- Two reference seed profiles (sheppert, csubs-leader) from the Phase-129 seed (V-03) are the
  measurement fixtures - reused, not re-created.

### Established Patterns
- Fixture-driven PostgreSQL repository tests with a dedicated test DSN (Phase-128 pattern).
- New reversible migrations; disposable data reset/reseeded (needed only if an index migration lands).

### Integration Points / Known Gaps to Fix
- Hardcoded LIMIT 3 slices for latest/previous contributions inside the main profile query ->
  turn into documented, bounded, separately-loadable pages (D-04).
- Constant-query-budget audit: verify no per-project/per-card reads or N+1 as project count
  grows (D-07); the ~1810-line repository is the prime audit target.
- Ordering must be verified fully tie-broken so offset pages are stable (D-02).

</code_context>

<specifics>
## Specific Ideas

- Concrete current bounds: projects limit default 6 / max 24 / offset 0..10000
  (parseBoundedProjectPageValue); latest/previous contributions via hardcoded LIMIT 3.
- Evidence harness already present: frontend/scripts/collect-member-profile-evidence.mjs.
- Measurement targets are the two Phase-129 seed profiles; budgets are baseline + ~20% plus the
  absolute Web-Vitals good-band ceilings (LCP<=2.5s, CLS<=0.1, INP<=200ms) and constant query count.

</specifics>

<deferred>
## Deferred Ideas

- Image variants, correct sizes, reserved geometry, quality caps, source compression, and
  asset/transfer budgets are Phase 133 (PMPF-06 and PMPF-08 are Phase-133 requirements, NOT 131).
- Shared SSR composition and race-safe frontend state (incl. slug-keyed cancellable paging
  state) are Phase 132.
- Introducing a shared public cache stays out of 131 unless a measured bottleneck plus complete
  invalidation justify it (D-09) - a future, measurement-gated decision.
- Bundled cross-phase live UAT of the budgets on a clean reset is Phase 134.

</deferred>

---

*Phase: 131-set-based-delivery-pagination-performance-budgets*
*Context gathered: 2026-08-14*
