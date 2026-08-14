# Phase 129: Canonical Public Projections & Data Correctness - Context

**Gathered:** 2026-08-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 129 makes every visible public member fact correct and sourced from its canonical
domain/release seam: status, memorial state, partial dates, active periods, current vs
historical membership, projects, contributions, release texts and release-version media,
stable roles, authoritative points/badges, domain-key dedupe, matching totals, and a
single-dataset activity feed with a working "Mehr anzeigen" continuation.

This phase does NOT: minimize or re-type the public DTO/cross-layer contract (Phase 130),
bound payloads or add pagination/performance budgets (Phase 131), consolidate the shared
SSR composition or race-safe frontend state (Phase 132), perform responsive/accessible/
image-budget visual work (Phase 133), or run the final clean-state reproduction and rollout
(Phase 134). Much correctness infrastructure already exists (confirmed/public filters,
`DISTINCT ON` dedupe, server-authoritative badge/point computation) and is REUSED and
audited, not rebuilt.

</domain>

<decisions>
## Implementation Decisions

### Verification & data strategy (milestone-level; applies to Phases 129-134)
- **V-01:** v1.3 correctness is proven by PostgreSQL integration tests using the Phase-128
  pattern (dedicated test DSN, e.g. a `TEAM4S_PHASE129_TEST_DSN`); each test self-seeds its
  own fixture rows and never depends on live database contents.
- **V-02:** Phases 129-133 are NOT gated by isolated per-phase live UAT. Instead one bundled
  cross-phase live UAT runs after the full reset in Phase 134. Per-phase live checks remain
  possible because of the reusable seed (V-03), but the authoritative live sign-off is the
  Phase-134 bundle.
- **V-03:** Phase 129 **Wave 1** builds a reusable, idempotent, API-driven seed script that
  populates the two reference profiles (`sheppert`, `csubs-leader`) with the full scenario
  matrix (see Specific Ideas). The same seed IS the Phase-134 fixture — build once, re-run on
  the final clean reset.
- **V-04:** The seed uses the real creation/admin API paths with a Keycloak direct-grant
  token (documented pattern). Facts that turn out to be unreachable via API MUST be verified
  during seed construction, not assumed. Known verification targets: year-only active dates
  (`active_from_year`/`active_until_year` without a full date) and
  `release_role_credit_lifecycles` awarded states. Any API gap gets a minimal, documented SQL
  supplement rather than a silent workaround.

### Scope
- **S-01:** Audit-and-fix against the seeded reference profiles. Reuse existing
  confirmed/public filters, `DISTINCT ON` dedupe, and server-authoritative badge/point
  computation; do not re-derive code that the audit confirms is already correct.
- **S-02:** `backend/internal/repository/member_profile_repository.go` is 1810 lines. When a
  correction touches it, split it to satisfy the 450-line production-file limit. The split is
  behavior-preserving; identity/access seams from Phase 128 are not crossed.

### Content correctness
- **D-01 (Memorial):** `profile_status='memorial'` is a distinct, trustworthy PUBLIC fact.
  Phase 129 projects it correctly and separately from `active`/`historical`. The dignified
  VISUAL treatment is deferred to UI Phase 133; 129 owns only the correct, distinct value.
- **D-02 (Status / dates / active periods):** status (active/historical/memorial), current
  membership, historical membership, active periods, and partial dates are distinct facts.
  Partial dates carry machine-readable precision (year-only via `active_from_year`/
  `active_until_year` vs a full `active_from_date`/`active_until_date`) so the frontend never
  fabricates a full date. Visual formatting (e.g. "2018-2021") is deferred to Phase 133.
- **D-03 (Current vs historical membership):** loaded as separate facts from the canonical
  `hist_fansub_group_members` / `hist_group_member_roles` seams; distinguished by
  `is_currently_active` / `left_date IS NULL`. The two are never merged into one line.
- **D-04 (Approved public role set):** every `role_code` recorded in the canonical historical
  role tables is public, gated ONLY by the existing membership visibility. Phase 129
  introduces NO new `is_public` flag or role registry — the paused role-model rework stays out
  of scope. If internal permission-like codes are found leaking into the role projection, they
  are excluded minimally; a registry is NOT built here.
- **D-05 (All roles, not first):** a membership exposes ALL its approved roles (array), not
  only the first. Internal permissions/capabilities never appear (PMDA-10, PMPR-06).
- **D-06 (Role label authority):** the server delivers stable role CODE plus LABEL via
  `role_definitions.label_de`; the frontend renders only and never derives a code from a
  translated label (PMDA-04). The role-label map in
  `frontend/src/components/profile/memberBadgeLabels.ts` becomes a fallback or is removed.
  Badge/tier presentation labels may remain client-side — this decision covers ROLE labels
  only.
- **D-07 (Dedupe by domain identity):** roles, projects, contributions, and badges appear once
  by domain identity, reusing the existing `DISTINCT ON (anime_id, release_id, role_id,
  fansub_group_id)` and `GROUP BY` seams (PMDA-05).
- **D-08 (Totals match visible rows):** every displayed total/count is computed from the same
  filtered, visible set it heads — no total derived from an unfiltered or differently filtered
  query (PMDA-08).
- **D-09 (Contribution / project / release filters):** reuse the existing predicates and
  verify completeness against PMDA-03/07:
  - contributions/projects: `status='confirmed' AND is_public_on_member_profile=true`
  - release notes: `visibility='public' AND status='published' AND deleted_at IS NULL`
  - release-version media: public visibility + `approved` review status + `media_files.status='ready'`
  A missing predicate is added only when a concrete gap is proven by a failing fixture test.
- **D-10 (Activity feed continuation):** the activity heading, filters, count, and
  "Mehr anzeigen" share ONE dataset, and "Mehr anzeigen" actually loads further rows
  (PMDA-11). Bounded/performant pagination is Phase 131; Phase 129 guarantees same-dataset
  correctness and a functional continuation only.
- **D-11 (Legacy removal):** genuinely unused legacy projections and redundant `Recent*`
  paths (`RecentMedia` / `RecentContributions`) are removed in Phase 129 (PMDA-09). If a live
  consumer still depends on one, its removal is coordinated with the Phase-130 DTO cleanup
  rather than breaking the consumer.
- **D-12 (No internal leakage):** internal memberships, permissions, source-original facts,
  and private media are absent from public projections and aggregates (PMPR-06).

### Agent's Discretion
- Exact split boundaries and file names when dividing `member_profile_repository.go`, provided
  every resulting production file is <=450 lines and Phase-128 identity/access seams are
  preserved.
- Seed script language and location (shell or node), provided it is idempotent and reusable as
  the Phase-134 fixture.
- Test organization, provided each Phase-129 requirement is backed by a fixture-driven RED
  test.
- Exact corrected SQL, provided sources stay canonical and filters match the decided
  predicates.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone scope and requirements
- `.planning/PROJECT.md` - v1.3 goal, brownfield/privacy/test-data constraints, out-of-scope boundaries.
- `.planning/ROADMAP.md` - Phase 129 goal, deliverables, success criteria, and downstream phase separation.
- `.planning/REQUIREMENTS.md` - locked Phase 129 requirements PMPR-06 and PMDA-01 through PMDA-11.
- `.planning/DECISIONS.md` - milestone verification-strategy entry (2026-08-14).
- `.planning/phases/128-canonical-public-identity-visibility-foundation/128-CONTEXT.md` - the identity/visibility foundation this phase builds on (must not be re-litigated).

### Domain, engineering, and contract rules
- `docs/architecture/db-schema-fansub-domain.md` - canonical member/fansub/release ownership rules.
- `docs/engineering/implementation-contract.md` - reuse-first workflow; no parallel projections.
- `docs/api/api-contracts.md` - cross-layer contract workflow (relevant when a projection changes a response shape).

### Projection seams (reuse; do not fork)
- `backend/internal/repository/member_profile_repository.go` - main projection/fan-out (SPLIT per S-02).
- `backend/internal/repository/member_profile_progress_repository.go` - server-authoritative badge/point progress.
- `backend/internal/repository/member_profile_contribution_badges_repository.go` - contribution badge counts.
- `backend/internal/repository/member_profile_role_volume_repository.go` - live role-volume tiers (bronze/silver/gold/platinum).
- `backend/internal/repository/anime_contributions_public_repository.go` - public contribution projection.
- Canonical tables: `hist_fansub_group_members`, `hist_group_member_roles`, `anime_contributions`,
  `release_version_notes`, `release_version_media`, `member_badges`, `release_role_credit_lifecycles`,
  and the point-total/lifecycle seams. Do NOT create parallel projections.

### Role/label + seed surfaces
- `role_definitions` (server `label_de`) - authoritative role labels (D-06).
- `frontend/src/components/profile/memberBadgeLabels.ts` - role-label map to demote to fallback/remove.
- `backend/internal/handlers/member_memorial_handler.go` + `POST /admin/members/:id/memorial` - memorial seed path.
- Contribution proposal/confirm/reject/visibility endpoints - confirmed + unconfirmed contribution seed paths.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (already correct - audit, do not rebuild)
- Contribution/project filter `status='confirmed' AND is_public_on_member_profile=true` (PMDA-03).
- Release-note filter `visibility='public' AND status='published' AND deleted_at IS NULL` and
  release-media filter (public visibility + approved review + ready media file) (PMDA-07).
- `DISTINCT ON (anime_id, release_id, role_id, fansub_group_id)` + `GROUP BY` dedupe (PMDA-05).
- Server-side badge/point progress computed in Go (`buildBadgeProgress`, `loadBadgeProgress`,
  `roleVolumeProgressBadge`), tiers include `platinum` (PMDA-06).
- Stable DB `role_code` values already flow through the projection (PMDA-04 code half).

### Established Patterns
- PostgreSQL-backed repository tests with a dedicated test DSN (Phase-128 pattern).
- New reversible up/down migrations; disposable data is reset/reseeded, never backfilled.
- Cross-surface changes stay synchronized across Go, `shared/contracts/openapi.yaml`,
  `frontend/src/types/*`, `frontend/src/lib/api.ts` (deeper alignment is Phase 130).
- Keycloak direct-grant token for scripted API access (documented ops pattern).

### Integration Points / Known Gaps to Audit
- Two role-label sources exist (`role_definitions.label_de` server-side and
  `memberBadgeLabels.ts` client-side) - consolidate to server authority (D-06).
- `RecentMedia` / `RecentContributions` legacy projection paths exist - remove if unused (D-11).
- Membership current-vs-historical separation and "all roles not first" must be verified once
  the seed provides multi-group / multi-role members (D-03/D-05).
- Activity-feed heading/count vs "Mehr anzeigen" dataset parity must be verified with a seeded
  member that has more rows than the initial page (D-10).

</code_context>

<specifics>
## Specific Ideas

### Scenario matrix the Wave-1 seed MUST cover (across sheppert + csubs-leader)
- A member in TWO fansub groups: one CURRENT membership, one HISTORICAL membership.
- A membership carrying MULTIPLE roles (e.g. Uebersetzer + Typesetter) to prove "all roles".
- At least one member/membership with YEAR-ONLY active dates (no full date).
- A `memorial` profile_status member (via the memorial admin endpoint).
- Contributions in BOTH states: confirmed+public AND unconfirmed/not-public (to prove filtering + total parity).
- A duplicate-generating case: the same anime across two release versions (to prove dedupe).
- Enough confirmed contributions / role credits to cross a badge/point threshold (to prove server-authoritative progress).
- An activity set larger than the initial page so "Mehr anzeigen" has real further rows to load.

### Seed reuse
- The seed script is idempotent (safe to re-run) and is the Phase-134 clean-reset fixture.

</specifics>

<deferred>
## Deferred Ideas

- Public DTO minimization, explicit typed branches, complete enums, and OpenAPI/Go/TS/`api.ts`
  parity remain Phase 130.
- Constant query budget, projection-specific page loaders, bounded payloads, and honest
  pagination remain Phase 131 (Phase 129 only makes "Mehr anzeigen" functional on one dataset).
- Shared SSR composition and race-safe frontend state remain Phase 132.
- Responsive/accessible/image-budget visual delivery, including memorial and date visual
  formatting, remain Phase 133.
- The role-model rework (data-driven `is_public` roles / capability registry) stays paused and
  out of Phase 129.
- Full clean-state reproduction of both reference profiles and the bundled cross-phase live UAT
  run remain Phase 134 (reusing the Wave-1 seed).

</deferred>

---

*Phase: 129-canonical-public-projections-data-correctness*
*Context gathered: 2026-08-14*
