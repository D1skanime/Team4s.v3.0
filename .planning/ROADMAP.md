# Roadmap: Team4s v1.3 Public Member Profile Hardening

**Milestone Status: COMPLETE (2026-08-20, tag `v1.3`)** — all 8 phases below (128-135) done, all 65
v1.3 requirements verified complete (`.planning/REQUIREMENTS.md`). See
`.planning/v1.3-MILESTONE-AUDIT.md` for the closing scorecard and tracked debt, and
`.planning/archive/v1.3/` for a copied snapshot of this file, `REQUIREMENTS.md`, `PROJECT.md`, and
`STATE.md` at close time. This roadmap remains live in place for any future v1.4+ phases.

## Overview

Milestone v1.3 hardens the existing public member profile as one privacy-sensitive vertical slice. Work proceeds from immutable public identity and deny-first access, through canonical projections and one aligned public contract, into bounded delivery, shared SSR/frontend composition, responsive and accessible presentation, and reproducible fixture-backed release evidence. The roadmap deliberately extends existing Team4s seams and does not preserve compatibility for disposable test rows.

## Milestone Constraints

- Resolve profile visibility and verified owner access before any membership, contribution, badge, point, media, project, or story detail read.
- Keep protected browser reads and owner preview behind the central refresh-capable auth/API seam; a refresh-only session remains active.
- Preserve canonical member, membership, contribution, badge, point, release-version, and media ownership; never attach release media to episodes or revive `release_version_groups.fansubgroup_id`.
- Keep SQL projections, Go DTOs/handlers, `shared/contracts/openapi.yaml`, frontend types, and `frontend/src/lib/api.ts` in parity.
- Search existing models, repositories, handlers, helpers, components, and styles before adding a seam; no parallel domain models or duplicated request/auth logic.
- Add no framework, library, service, cache layer, or index without repository evidence and measured need.
- Use only new, reversibly numbered schema migrations. Reset and reseed disposable rows; do not add backfill, row-preservation, alias, or compatibility work.
- Reset, seed, cleanup, and verification must preserve canonical media ownership and tracked badge assets, including `frontend/public/history-event-badges-transparent/`.

## Phases

- [x] **Phase 128: Canonical Public Identity & Visibility Foundation** - Make stored immutable slugs and deny-first access authoritative across every public member route.
- [x] **Phase 129: Canonical Public Projections & Data Correctness** - Make every visible membership, contribution, release, badge, point, date, role, and count come from the correct public source.
- [x] **Phase 130: Public DTO & Cross-Layer Contract Alignment** - Establish one minimal allow-listed public profile contract across backend, OpenAPI, TypeScript, and API helpers.
- [x] **Phase 131: Set-Based Delivery, Pagination & Performance Budgets** - Bound payloads and page reads, remove query fan-out, and prove performance against both milestone fixtures.
- [x] **Phase 132: Shared SSR Composition & Race-Safe Frontend State** - Render public and owner views through one composition and one refresh-capable request boundary with localized state. (completed 2026-08-15)
- [x] **Phase 133: Responsive, Accessible & Efficient Visual Delivery** - Make the final profile composition mobile-first, container-responsive, keyboard accessible, and image-budgeted. (completed 2026-08-20 — 133-12's deferred D-06/D-12 manual UAT resolved-by-134-06, see 133-12-SUMMARY.md)
- [x] **Phase 134: Fixture-Backed Verification & Rollout** - Reproduce both reference profiles from a clean state and close the milestone with automated and live evidence. (completed 2026-08-20)

## Phase Details

### Phase 128: Canonical Public Identity & Visibility Foundation

**Goal**: Every public member request resolves one immutable stored slug and reaches detail data only after a shared, privacy-safe visibility decision.
**Depends on**: Nothing (first v1.3 phase; Phase 127 is the preserved historical baseline)
**Requirements**: PMID-01, PMID-02, PMID-03, PMPR-01, PMPR-02, PMPR-03, PMPR-04, PMPR-05
**Deliverables**: Reversible canonical-slug schema/allocator; creation and inbound-link coverage; shared public-member access resolver; profile/projects/contributions route matrix; private owner-preview cache policy.
**Success Criteria** (what must be TRUE):

  1. A public profile keeps the same canonical URL after its nickname changes, and every public member link uses that stored slug without numeric or generated fallbacks.
  2. Anonymous users receive the same non-disclosing outcome for hidden and missing profiles, and hidden requests execute no profile-detail loaders.
  3. Profile, project, contribution, media, and retained member subresources apply the same visibility-first decision before returning detail.
  4. A verified owner with only a valid refresh session can open the authoritative hidden-profile preview through the central auth/API client.
  5. Owner- or viewer-specific responses remain private and cannot be served from a shared public cache.

**Plans**: 22 plans
**Plan-time read first**: `docs/engineering/implementation-contract.md`, `docs/frontend/auth-api-client.md`, `docs/architecture/db-schema-fansub-domain.md`, the latest files in `database/migrations/`, `backend/internal/handlers/app_public_profile.go`, `backend/internal/handlers/contributions_public_handler.go`, `backend/internal/repository/member_profile_repository.go`, `backend/internal/repository/anime_contributions_public_repository.go`, relevant member-creation repositories, and `backend/cmd/server/main.go`.

Plans:
**Wave 0**

- [x] 128-01-PLAN.md - Establish guarded PostgreSQL slug, migration, and allocator test contracts.
- [x] 128-03-PLAN.md - Establish canonical-link, owner-preview, and refresh-only frontend test contracts.

**Wave 1** *(blocked on Wave 0 completion)*

- [x] 128-02-PLAN.md - Establish the visibility resolver, privacy matrix, loader-spy, and cache test contracts.
- [x] 128-14-PLAN.md - Canonicalize public member paths at the Next.js proxy boundary.

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 128-04-PLAN.md - Add the immutable canonical public-slug schema and runtime member fields.

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 128-05-PLAN.md - Implement the shared transactional slug allocator across all member-creation repositories.
- [x] 128-06-PLAN.md - Project stored member slugs through contribution data.
- [x] 128-07-PLAN.md - Project stored member slugs through group and domain-member data.
- [x] 128-08-PLAN.md - Replace archive and ranking member-link fallbacks with stored slugs.
- [x] 128-09-PLAN.md - Add the deny-first public-member access repository and ID-based profile loaders.

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 128-10-PLAN.md - Convert project and contribution detail loaders to resolved member identity.
- [x] 128-11-PLAN.md - Enforce shared access resolution and cache policy in public profile handlers.

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 128-12-PLAN.md - Apply the shared visibility gate to projects, contributions, and retained subresources.

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 128-13-PLAN.md - Align OpenAPI, frontend types, and central API helpers with the canonical public contract.

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 128-15-PLAN.md - Render the authoritative public profile composition at its canonical route.
- [x] 128-17-PLAN.md - Remove numeric member-link fallbacks from own-profile projections.
- [x] 128-18-PLAN.md - Reuse the shared profile hero for stored-slug member links.

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 128-16-PLAN.md - Add the private-owner contextual preface and no-flash refresh-only behavior.
- [x] 128-19-PLAN.md - Keep visibility editing session-safe and synchronized with the canonical preview.

**Wave 9** *(blocked on Wave 8 completion)*

- [x] 128-20-PLAN.md - Obtain explicit approval for the disposable member-row reset procedure.

**Wave 10** *(blocked on Wave 9 completion)*

- [x] 128-21-PLAN.md - Reset, migrate, reseed, and run the full Phase 128 automated gate.

**Wave 11** *(blocked on Wave 10 completion)*

- [x] 128-22-PLAN.md - Capture live browser evidence across visibility, refresh, and responsive states.

### Phase 129: Canonical Public Projections & Data Correctness

**Goal**: Users see only correct, publicly permissible profile facts assembled from existing canonical domain and release-native ownership seams.
**Depends on**: Phase 128
**Requirements**: PMPR-06, PMDA-01, PMDA-02, PMDA-03, PMDA-04, PMDA-05, PMDA-06, PMDA-07, PMDA-08, PMDA-09, PMDA-10, PMDA-11
**Deliverables**: Public source/predicate matrix; corrected status/date/membership/contribution/release projections; stable role codes and labels; authoritative badge/point progress; domain-key dedupe; matching visible totals and activity-feed continuation.
**Success Criteria** (what must be TRUE):

  1. Status, memorial state, partial dates, active periods, current membership, and historical membership are presented as distinct and trustworthy facts.
  2. Projects, contributions, release texts, and release-version media appear only when their confirmation, profile visibility, review, readiness, and deletion rules permit them.
  3. Memberships expose all approved public roles by stable code and label while internal memberships, permissions, source facts, and private media remain absent.
  4. Roles, projects, contributions, and badges appear once by domain identity, and every displayed total matches the visible filtered rows.
  5. Points, badge tiers, and exact progress remain server-authoritative and use only publicly permissible facts; activity heading, filters, count, and "Mehr anzeigen" share the same dataset.

**Plans**: 11 plans across 5 waves

  - Wave 1: 129-01 (reusable API seed fixture), 129-02 (RED PostgreSQL projection contracts)
  - Wave 2: 129-03 (behavior-preserving repository split, <=450 lines/file)
  - Wave 3: 129-04 (count/rows parity), 129-05 (public-facts progress), 129-06 (drop recent_* from public DTO), 129-07 (remove dead /contributions surface)
  - Wave 4: 129-08 (structured role code+label pairs), 129-09 (year-only precision), 129-10 (canonical membership projection)
  - Wave 5: 129-11 (full automated gate + seed-backed check)

**Plan-time read first**: `docs/architecture/db-schema-fansub-domain.md`, `backend/internal/repository/member_profile_repository.go`, `backend/internal/repository/member_profile_progress_repository.go`, `backend/internal/repository/member_profile_contribution_badges_repository.go`, `backend/internal/repository/member_profile_role_volume_repository.go`, `backend/internal/repository/anime_contributions_public_repository.go`, and their PostgreSQL-focused tests. Reuse canonical `hist_fansub_group_members`, `hist_group_member_roles`, `anime_contributions`, `release_version_notes`, `release_version_media`, `member_badges`, and point-total/lifecycle seams; do not create parallel projections.

### Phase 130: Public DTO & Cross-Layer Contract Alignment

**Goal**: Every public member consumer receives one minimal, explicitly typed response whose runtime, OpenAPI, and frontend definitions agree.
**Depends on**: Phase 129
**Requirements**: PMCT-01, PMCT-02, PMCT-03, PMCT-04, PMCT-05, PMCT-07, PMCT-08
**Deliverables**: Dedicated public allow-list DTO/media shapes; typed visible/hidden/missing/error branches; complete enums; OpenAPI/Go/TypeScript/`api.ts` parity; removal of unused recent fields/endpoints; forbidden-field contract tests.
**Success Criteria** (what must be TRUE):

  1. Public profile responses contain only the documented allow-listed identity, presentation, membership, project, contribution, badge, point, and public media fields.
  2. Private IDs, permissions, storage/source-original data, internal status, and unapproved media are absent from both JSON responses and the public schema.
  3. Visible, hidden, missing, and failure outcomes are documented and parsed identically by handlers, OpenAPI, TypeScript, and the central API helper.
  4. Role, status, and badge-tier enums, including platinum, are complete and consistent in every contract layer.
  5. The Next.js route, metadata, and public profile components compile against the real route and API contracts without fallback fields or duplicate recent-data paths.

**Plans**: 7 plans across 4 waves

  - Wave 1: 130-01 (OpenAPI canonical public contract: dedicated allow-list schemas + complete enums)
  - Wave 2: 130-02 (fork Go public DTO structs, decoupled from edit structs), 130-04 (dedicated public TS types + enum unions)
  - Wave 3: 130-03 (Go handler status branches + one envelope + enum-value parity), 130-05 (api.ts helper + Next.js route parse three branches)
  - Wave 4: 130-06 (finish recent-* cleanup: sweep orphans, retain internal edit surface), 130-07 (contract-test lock: forbidden-field + OpenAPI schema parity)

**Plan-time read first**: `docs/api/api-contracts.md`, `backend/internal/models/member_profile.go`, `backend/internal/handlers/app_public_profile.go`, `backend/internal/handlers/contributions_public_handler.go`, `shared/contracts/openapi.yaml`, `frontend/src/types/profile.ts`, `frontend/src/lib/api.ts`, `frontend/src/app/members/[slug]/page.tsx`, and the existing handler/helper/page contract tests.
**UI hint**: yes

### Phase 131: Set-Based Delivery, Pagination & Performance Budgets

**Goal**: Public profiles and their continuation requests stay bounded, stable, and measurably efficient as project and contribution volume grows.
**Depends on**: Phase 130
**Requirements**: PMCT-06, PMPF-01, PMPF-02, PMPF-03, PMPF-04, PMPF-05, PMPF-07
**Deliverables**: Constant query budget; projection-specific page loaders; bounded payloads; deterministic honest pagination; representative query/payload/latency baselines; evidence-backed indexes only; explicit cache-class decision.
**Success Criteria** (what must be TRUE):

  1. Profile query count stays constant as project count grows, with no per-project or per-card database reads.
  2. Loading another project or contribution page fetches only that bounded page and never rebuilds the complete profile.
  3. Initial and continuation payloads obey documented limits, stable tie-broken ordering, and truthful total/continuation semantics without unused child collections.
  4. Both `sheppert` and `csubs-leader` have reproducible query-count, payload, latency, image-waterfall, and Web-Vitals measurements checked against fixed acceptance budgets.
  5. Every added index has representative `EXPLAIN (ANALYZE, BUFFERS)` evidence, while viewer-specific responses stay separate and shared caching remains absent unless measurement plus complete invalidation justify it.

**Plans**: 8 plans across 4 waves

  - Wave 1: 131-01 (query-count tracer + characterization), 131-02 (evidence harness + both-profile baseline)
  - Wave 2: 131-03 (batch per-card N+1 -> constant query budget), 131-04 (tie-broken ordering + honest total), 131-05 (documented enforced page bounds; LIMIT 3 + unbounded previous -> bounded pages)
  - Wave 3: 131-06 (OpenAPI offset-pagination contract + TS/api parity), 131-07 (viewer/anonymous cache-class separation lock)
  - Wave 4: 131-08 (re-measure + lock budgets baseline+~20% + evidence-backed indexes only)

**Plan-time read first**: `backend/internal/repository/member_profile_repository.go`, its PostgreSQL tests, public project/contribution repositories and handlers, `frontend/scripts/collect-member-profile-evidence.mjs`, `shared/contracts/openapi.yaml`, and current API consumers before selecting list bounds or pagination. Inspect existing indexes and both fixture query plans before proposing a migration.

### Phase 132: Shared SSR Composition & Race-Safe Frontend State

**Goal**: Public and owner-preview profiles render the same authoritative composition while request, session, paging, and interaction state remain centralized and race-safe.
**Depends on**: Phase 131
**Requirements**: PMFE-01, PMFE-02, PMFE-03, PMFE-04, PMFE-05, PMFE-06, PMFE-07, PMFE-08, PMFE-09, PMFE-10, PMFE-11
**Deliverables**: Shared public profile view; anonymous SSR plus central-client owner upgrade; consolidated owner/correction request path; slug-keyed cancellable local state; scoped state presentations; shared badge/formatting seams; stable metadata/date rendering; progressive disclosure.
**Success Criteria** (what must be TRUE):

  1. Anonymous public rendering and authorized owner preview use the same backend DTO and the same visible profile composition.
  2. Profile, owner, preview, and correction actions use one central refresh-capable session/request path and fail closed without duplicate own-profile lookups.
  3. Rapid slug changes, paging, carousel use, and expansion cannot append stale or duplicate data, and loading/error state remains scoped to the affected section.
  4. Loading, empty, hidden, missing, and failure states remain distinct; long stories and achievement collections use progressive disclosure without losing accessible content.
  5. Member-specific metadata and relative dates are SSR/hydration-stable, while top roles, known groups, and totals derive from the complete approved dataset rather than the first page.

**Plans**: 4 plans across 3 waves

  - Wave 1: 132-01 (backend known_for full-set aggregate + OpenAPI/TS contract parity), 132-02 (shared useCancellableSlugState hook + current-projects paging + progressive-disclosure lock)
  - Wave 2: 132-03 (central useMemberViewer seam consolidating 3 owner/viewer call sites)
  - Wave 3: 132-04 (known_for consumption in MemberProfileHero, member-specific metadata, referenceNow hydration-stable dates)

**Plan-time read first**: `docs/frontend/auth-api-client.md`, `frontend/src/lib/api.ts`, `frontend/src/app/members/[slug]/page.tsx`, `OwnHiddenProfilePreview.tsx`, `OwnProfileEditLink.tsx`, `frontend/src/components/profile/MemberCurrentProjectsSection.tsx`, `MemberBadgeChain.tsx`, `memberBadgeLabels.ts`, nearby profile section components/tests, and generic primitives in `frontend/src/components/ui`. Extend existing `RichTextRenderer`, `FocalCarousel`, request, and formatting seams when ownership fits.
**UI hint**: yes

### Phase 133: Responsive, Accessible & Efficient Visual Delivery

**Goal**: The final profile composition remains compact, readable, operable, and bandwidth-conscious from narrow containers through widescreen and high zoom.
**Depends on**: Phase 132
**Requirements**: PMPF-06, PMPF-08, PMUI-01, PMUI-02, PMUI-03, PMUI-04, PMUI-05, PMUI-06, PMUI-07, PMA11Y-01, PMA11Y-02, PMA11Y-03, PMA11Y-04
**Deliverables**: Mobile-first page geometry; container-responsive reusable components; bounded CSS-module ownership; removal of conflicting selectors/listeners; semantic heading/interaction treatment; WCAG 2.2 evidence; optimized profile/badge image delivery and asset budgets.
**Success Criteria** (what must be TRUE):

  1. The profile has no document-level horizontal overflow or clipped controls at narrow, intermediate, transition, and wide layouts, and widescreen uses space compactly without oversized cards or empty bands.
  2. Reusable profile, achievement, hero, and membership components respond to their container geometry, while page composition uses only purpose-based viewport transitions.
  3. Long German content and correct umlauts remain usable at 400% zoom, with clean component-owned CSS and no contradictory patches, broad descendant rules, unnecessary resize listeners, or avoidable `!important`.
  4. Headings, carousel, paging, preview, and disclosure controls are keyboard operable with visible focus, correct names/state/status relationships, logical DOM order, compliant targets/contrast, and reduced motion.
  5. Avatars, badges, and profile media reserve geometry, request suitable variants with truthful `sizes` and bounded quality, meet asset/transfer budgets, and restrict local-IP optimization to development/test.

**Plans**: 12 plans across 7 waves

  - Wave 1: 133-01 (axe-core/jest-axe setup), 133-02 (next.config image quality/SSRF gate), 133-03 (hero container-query conversion), 133-04 (badge-chain CSS split: shared artwork + locked-stage)
  - Wave 2: 133-05 (FocalCarousel a11y hardening), 133-06 (memorial-hero single-h1 fix), 133-07 (badge-chain CSS split: anime/points/contribution/membership stages)
  - Wave 3: 133-08 (badge-chain CSS split: family card + badge chip + 820px constant)
  - Wave 4: 133-09 (badge-chain CSS split: role card de-duplication + shell shrink + !important removal)
  - Wave 5: 133-10 (image-byte budget measurement + lock)
  - Wave 6: 133-11 (overflow hard gate + full regression suite)
  - Wave 7: 133-12 (manual D-06/D-12 evidence checkpoints)

**Plan-time read first**: `docs/frontend/ui-system.md`, `docs/agent-guidelines-ui.md`, `frontend/src/app/members/[slug]/page.module.css`, `frontend/src/components/profile/profile.module.css`, profile-owned CSS modules, `MemberBadgeChain.module.css`, `frontend/src/components/ui/FocalCarousel.tsx`, `ResponsiveImage.tsx`, their tests/styles, `frontend/next.config.mjs`, and `frontend/scripts/verify-profile-image-delivery.mjs`. Reuse or extend global primitives before adding local generic styles.
**UI hint**: yes

Plans:
**Wave 1**

- [x] 133-01-PLAN.md — Install axe-core/jest-axe and wire shared Vitest a11y setup.
- [x] 133-02-PLAN.md — Gate next.config.mjs local-IP image optimization + explicit quality allow-list.
- [x] 133-03-PLAN.md — Convert the profile hero's responsive rules to @container.
- [x] 133-04-PLAN.md — Split MemberBadgeChain CSS: shared artwork + locked-stage layer.

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 133-05-PLAN.md — Harden FocalCarousel keyboard/focus/inert behavior + axe coverage.
- [x] 133-06-PLAN.md — Fix the memorial hero's duplicate heading to a single h1.
- [x] 133-07-PLAN.md — Split MemberBadgeChain CSS: anime/points/contribution/membership stages.

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 133-08-PLAN.md — Split MemberBadgeChain CSS: family card + badge chip + 820px constant.

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 133-09-PLAN.md — Split MemberBadgeChain CSS: role card de-duplication + shrink shell.

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 133-10-PLAN.md — Measure and lock the image-byte delivery budget.

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 133-11-PLAN.md — Harden the overflow gate and green the full regression suite.

**Wave 7** *(blocked on Wave 6 completion)*

- [ ] 133-12-PLAN.md — Manual D-06/D-12 visual and keyboard/zoom evidence checkpoints. **DEFERRED** — batched into a live-UAT pass scheduled after Phase 135; not run, not approved. See `133-12-SUMMARY.md`.

### Phase 134: Fixture-Backed Verification & Rollout

**Goal**: A clean, repeatable environment proves the complete v1.3 profile behavior, performance, ownership, migration, and visual experience before milestone closure.
**Depends on**: Phase 133
**Requirements**: PMQA-01, PMQA-02, PMQA-03, PMQA-04, PMQA-05, PMQA-06, PMQA-07
**Deliverables**: Versioned idempotent `sheppert`/`csubs-leader` fixture contract and manifest; clean reset/seed workflow; migration up/down/fresh proof; automated viewer/data/error/pagination matrix; responsive live-UAT evidence; final quality and protected-asset gates.
**Success Criteria** (what must be TRUE):

  1. One versioned idempotent reset/seed contract recreates `sheppert` and `csubs-leader` with the documented identity, visibility, roles, memberships, projects, badges, media, and content-length expectations.
  2. The new migration chain passes fresh-database, up, and down checks without preserving synthetic rows or adding compatibility behavior.
  3. Automated tests cover anonymous public, hidden, owner, refresh-only, missing, sparse, dense, error, and pagination cases, and typecheck, lint, focused backend/frontend tests, build, and `git diff --check` are green.
  4. Live browser UAT proves both profiles at mobile, intermediate, and widescreen layouts, including keyboard, 400% zoom, images, loading behavior, and the actual user-visible route.
  5. Reset, seed, and media verification leave canonical ownership and tracked badge assets unchanged while the recorded query, payload, image, overflow, and Web-Vitals evidence meets Phase 131/133 budgets.

**Plans**: 6 plans across 5 waves

  - Wave 1: 134-01 (fixture manifest + seed media extension), 134-02 (migration fresh/up/down proof)
  - Wave 2: 134-03 (verification matrix: 9-case fixture-backed suite)
  - Wave 3: 134-04 (green gate + ROADMAP/STATE doc reconciliation)
  - Wave 4: 134-05 (protected-asset hash guard + targeted shared-DB reset)
  - Wave 5: 134-06 (live UAT evidence + human sign-off)

**Plan-time read first**: `backend/internal/migrations/runner.go`, migration tests, existing project reset/seed/Compose tooling, `frontend/scripts/collect-member-profile-evidence.mjs`, `frontend/scripts/verify-profile-image-delivery.mjs`, profile API/component tests, and prior UAT formats as read-only analogs. Record hashes/status for `frontend/public/history-event-badges-transparent/` and other protected tracked badge sources before any reset or media cleanup.
**UI hint**: yes

Plans:
**Wave 1**

- [x] 134-01-PLAN.md — Extend the seed with a media step and build the versioned fixture manifest.
- [x] 134-02-PLAN.md — Build migration fresh/up/down proof tooling on an ephemeral database.

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 134-03-PLAN.md — Build the 9-case verification matrix against the versioned fixture.

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 134-04-PLAN.md — Scoped green gate + ROADMAP/STATE tracking reconciliation.

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 134-05-PLAN.md — Protected-asset hash guard + targeted shared-DB reset/reseed.

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 134-06-PLAN.md — Live UAT evidence capture + human sign-off checkpoint.

## Coverage

| Phase | Requirement Count | Requirement IDs |
|-------|-------------------|-----------------|
| 128. Canonical Public Identity & Visibility Foundation | 8 | PMID-01-03, PMPR-01-05 |
| 129. Canonical Public Projections & Data Correctness | 12 | PMPR-06, PMDA-01-11 |
| 130. Public DTO & Cross-Layer Contract Alignment | 7 | PMCT-01-05, PMCT-07-08 |
| 131. Set-Based Delivery, Pagination & Performance Budgets | 7 | PMCT-06, PMPF-01-05, PMPF-07 |
| 132. Shared SSR Composition & Race-Safe Frontend State | 11 | PMFE-01-11 |
| 133. Responsive, Accessible & Efficient Visual Delivery | 13 | PMPF-06, PMPF-08, PMUI-01-07, PMA11Y-01-04 |
| 134. Fixture-Backed Verification & Rollout | 7 | PMQA-01-07 |
| 135. Einladungs- und Onboarding-Flow fuer eingeladene Fansub-Mitglieder haerten | 9 | D-01 - D-09 (Decision-Coverage, kein REQUIREMENTS.md-Mapping) |
| **Total** | **65 (+9 additiv)** | **65 unique v1.3 requirements; no duplicates or orphans; Phase 135 additiv per D-01..D-09** |

## Progress

**Execution Order:** 128 - 129 - 130 - 131 - 132 - 133 - 134 - 135

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 128. Canonical Public Identity & Visibility Foundation | 22/22 | Complete | 2026-08-14 |
| 129. Canonical Public Projections & Data Correctness | 11/11 | Complete | 2026-08-15 |
| 130. Public DTO & Cross-Layer Contract Alignment | 7/7 | Complete | 2026-08-15 |
| 131. Set-Based Delivery, Pagination & Performance Budgets | 8/8 | Complete | 2026-08-15 |
| 132. Shared SSR Composition & Race-Safe Frontend State | 4/4 | Complete | 2026-08-15 |
| 133. Responsive, Accessible & Efficient Visual Delivery | 12/12 | Complete — 133-12 resolved-by-134-06 | 2026-08-20 |
| 134. Fixture-Backed Verification & Rollout | 6/6 | Complete | 2026-08-20 |
| 135. Einladungs- und Onboarding-Flow fuer eingeladene Fansub-Mitglieder haerten | 10/10 | Complete | 2026-08-19 |

### Phase 135: Einladungs- und Onboarding-Flow fuer eingeladene Fansub-Mitglieder haerten

**Goal:** Ein kalt eingeladener Fansubber kann eine Einladung end-to-end annehmen -- mit Kontext-Mail, Registrieren-ODER-Anmelden-Pfad auf der Accept-Seite (returnTo + E-Mail-Vorbelegung + Auto-Accept), verdrahtetem Claim-Button fuer historische Mitglieder und einem Rollen-Picker, der nur zuweisbare Gruppenrollen zeigt. Niemand landet mehr in einer Sackgasse.
**Depends on:** Phase 134
**Requirements**: TBD (Quelle: .planning/notes/live-uat-ux-findings.md, Findings #6-#10) -- Decision-Coverage via D-01 bis D-09 in `135-CONTEXT.md` (kein REQUIREMENTS.md-Mapping vorhanden; jede Plan-Datei traegt die zutreffenden D-IDs im `requirements`-Frontmatter-Feld).
**Scope (aus Live-UAT-Findings #6-#10):**

- #10 (BLOCKER): Cold-Invite-Registrierungspfad -- Accept-Seite bietet BEIDE Wege (Registrieren UND Anmelden), reicht die Einladung durch (returnTo + E-Mail-Vorbelegung fuer den email_match), danach Auto-Accept + Bestaetigung. Pruefen ob Keycloak Self-Registration / registrationAllowed aktiv ist.
- #10: Einladungs-Mail mit Kontext (wer laedt ein, welche Gruppe, 1 Zeile "Team4s ist...", was Annehmen bewirkt) statt spam-artiger Blindmail.
- #8: Accept-Seite gibt returnTo an /login mit -> Auto-Redirect zurueck + Auto-Accept nach Login.
- #9: Accept-Text endnutzerfreundlich (keine Keycloak-/Architektur-Interna im UI).
- #6: Claim-Generieren-Button + Invite-Link-Anzeige in HistoricalMemberCard verdrahten (Backend member_claim_invitations_handler.go + Hook useGroupMembersClaimActions.ts existieren, UI rendert ihn nie).
- #7: Rollen-Picker (Einladung/Mitglied-hinzufuegen) auf assignable=true filtern -- Credit-/Contribution-Rollen (Administration) und platform_admin (jetzt via KC-JIT) ausblenden.
- D-08 (Locked, 2026-08-17): Registrierung ist invite-scoped -- E-Mail auf die eingeladene Adresse vorbefuellt/gelockt (mediiert via Mail-Link-Query-Param + serverseitigem email_match, kein KC-Theme-Umbau).
- D-09 (Locked, 2026-08-17): EIN gemeinsamer Onboarding-/Accept-Flow (`InviteAcceptFlow`-Komponente) fuer beide Invite-Typen (App-Member-Invite UND Historical-Claim-Invite).

**Betroffene Bereiche:** frontend/src/app/invitations/accept/page.tsx; frontend/src/app/claim-invitations/accept/page.tsx; frontend/src/components/auth/InviteAcceptFlow.tsx (NEU); frontend/src/lib/keycloakAuth.ts; frontend/src/app/login/page.tsx; Einladungs-Mail-Template (backend services/mailer.go + app_auth.go); frontend/src/app/admin/fansubs/[id]/edit/ (GroupMembersHistTable.tsx HistoricalMemberCard, Rollen-Picker, useGroupMembersClaimActions.ts); backend/internal/repository/hist_group_member_roles_repository.go; infra/keycloak/realm-team4s.json (registrationAllowed, live-verifiziert).
**Plans:** 10/10 plans complete

  - Wave 1: 135-01 (frontend auth foundation: keycloakAuth.ts returnPath/loginHint + login page), 135-02 (backend D-06 role-picker SQL fix + live-DB test), 135-03 (backend D-03/D-01 mail context + email-hint link), 135-04 (frontend D-05 claim button wiring)
  - Wave 2: 135-05 (shared InviteAcceptFlow component + /invitations/accept BLOCKER rewrite)
  - Wave 3: 135-06 (claim-invitations/accept rewrite onto the shared flow, completes D-09)
  - Wave 4: 135-07 (full automated gate + live UAT checkpoints: D-02 KC live check, cold-invite round trip + Mailpit content)

**Plan-time read first**: `frontend/src/lib/keycloakAuth.ts`, `frontend/src/app/login/page.tsx`, `frontend/src/app/claim-invitations/accept/page.tsx`, `frontend/src/app/invitations/accept/page.tsx`, `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.tsx`, `frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx`, `frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersClaimActions.ts`, `backend/internal/handlers/app_auth.go`, `backend/internal/repository/hist_group_member_roles_repository.go`, `backend/internal/repository/fansub_repository.go`, `backend/cmd/server/main.go`, and `.planning/phases/135-.../135-RESEARCH.md`/`135-PATTERNS.md` as read-only analogs.
**UI hint**: yes

Plans:
**Wave 1**

- [x] 135-01-PLAN.md — keycloakAuth.ts returnPath/loginHint foundation + login page consumption (D-01, D-04).
- [x] 135-02-PLAN.md — Backend role-picker SQL fix (assignable = true only) + live-DB regression test (D-06).
- [x] 135-03-PLAN.md — Backend context-rich invitation mail + email-hint link (D-03, D-01, D-08).
- [x] 135-04-PLAN.md — Wire the claim-invite generate/copy/cancel UI into HistoricalMemberCard (D-05, D-07).

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 135-05-PLAN.md — Shared InviteAcceptFlow component + /invitations/accept BLOCKER rewrite (D-01, D-04, D-07, D-08, D-09).

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 135-06-PLAN.md — claim-invitations/accept rewrite onto the shared InviteAcceptFlow (D-09, D-07).

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 135-07-PLAN.md — Full automated gate + live UAT checkpoints: D-02 Keycloak live check, cold-invite end-to-end round trip + Mailpit content sign-off.
- [x] 135-08-PLAN.md — Keycloak-Theme register.ftl: E-Mail vorbefuellt+gesperrt + generischer Invite-Kontext (D-12, D-13, D-07).
- [x] 135-09-PLAN.md — Keycloak-Registrierung auf Fansubname umbauen; First/Last optional; KC autoritativ + JIT-Sync (D-14).
- [x] 135-10-PLAN.md — Case-preserved Fansubname (Anzeige, KC) + Historisch-Selbst-Claim Approval-Render (D-15, D-16, Finding #25).

# Milestone v1.4: Capability-, Review- und Benutzerverwaltung

## Overview

Milestone v1.4 closes Live-UAT Findings #29-#32 by making effective group rights explainable and safely editable, turning existing review delegation into a usable product seam, reducing user-admin projections to meaningful grouped data, and showing reviewers only work they can actually decide. It extends the existing DB-driven capability registry, central `permissions.Service`, specialized review delegation, canonical domain ownership, Keycloak-owned global roles, and refresh-capable browser API client. Finding #33 (platform documents) and Finding #34 (badge UI) remain future work.

## Milestone Constraints

- Policy, scope, precedence, schema, and contracts precede resolver and UI work; authorization remains centralized in `permissions.Service`.
- Keycloak remains authoritative for global roles; the platform-admin bypass is read-only in group tooling and cannot be negated by group overrides.
- Review delegation remains a specialized membership seam and is not folded into generic user overrides.
- User-admin projections group canonical contribution and media ownership without changing release, release-version, media, or contribution ownership.
- Protected browser flows use the central refresh-capable API client; no component reads tokens or constructs bearer headers.
- UI extends existing global components and the existing user/group admin surfaces, remains desktop-first for the back office, and degrades without overflow at narrow widths.
- Schema work uses new reversible migrations and reproducible disposable-data fixtures; no compatibility or backfill work is introduced.

## Phases

- [x] **Phase 136: Capability Policy, Catalog & Schema Contract** - Lock one enforceable precedence/scope model, canonical metadata, override schema, indexes, and cross-layer contracts. (completed 2026-08-20)
- [x] **Phase 137: Central Effective-Rights Resolver & Overrides** - Make canonical enforcement and inspection resolve the same provenance-aware effective rights and safe per-user overrides. (completed 2026-08-21)
- [x] **Phase 138: Effective-Rights Administration & Impact UX** - Turn the existing user rights and role-capability surfaces into explainable revoke, impact, and cache-state workflows. (completed 2026-08-23)
- [x] **Phase 139: Scalable User-Admin Projections** - Replace noisy flat contribution and media data with meaningful grouped, filtered, and stable projections. (completed 2026-08-24)
- [x] **Phase 140: Review Delegation Management** - Expose the existing specialized delegation service through documented APIs and the canonical group-member editor. (completed 2026-08-26)
- [x] **Phase 141: Actor-Decidable Review Queue** - Make every queue lane, count, detail, and next action reflect what the current reviewer may actually decide. (completed 2026-08-26)
- [x] **Phase 142: Integrated Security, Fixtures & Live Release Gate** - Prove the complete milestone across contracts, auth refresh, fixtures, security, responsive UI, and canonical ownership. (completed 2026-09-01)
- [x] **Phase 143: Phase-142-Nacharbeit und Dashboard-Lane für abgelehnte Notizen** - Die in der externen Codeprüfung vom 2026-09-01 belegten Defekte schließen und abgelehnte eigene Release-Notizen im persönlichen Dashboard sichtbar machen. (completed 2026-09-01)
- [x] **Phase 144: Überarbeitungs-Kreislauf für Release-Medien vervollständigen** - Abgelehnte Release-Medien lassen sich an Ort und Stelle ersetzen statt nur den Text daneben zu ändern, mit Revisionssprung statt Neu-Upload. (completed 2026-09-02, Live-UAT abgenommen 2026-09-03, siehe 144-UAT.md)
- [x] **Phase 145: Mitgliedschafts-Grundausstattung in die Rechte-Registry überführen** - Die drei rollenunabhängigen Mitgliedsrechte kommen nicht mehr aus einem Go-Slice, sondern als reservierte, nicht zuweisbare Pseudo-Rolle aus der Datenbank-Registry. (completed 2026-09-04, Live-UAT abgenommen 2026-09-04, siehe 145-UAT.md)
- [ ] **Phase 146: Registry-Selbstschutz und Sanierung der Quelltext-Substring-Tests** - Kein Admin kann über die Capability-Matrix einen Zustand erzeugen, der den nächsten Backend-Start scheitern lässt, und sicherheitsrelevante Tests belegen Verhalten durch echte Aufrufe statt durch Quelltextsuche.

## Phase Details

### Phase 136: Capability Policy, Catalog & Schema Contract

**Goal**: Team4s has one documented, enforceable capability policy and one canonical data/contract foundation for scoped user overrides, provenance, impact, and reliable catalog behavior.
**Depends on**: Phase 135 (completed historical baseline)
**Requirements**: CAP-04, CAP-11, CAP-12, CAP-13, CAP-14, QUAL-01, QUAL-04
**Success Criteria** (what must be TRUE):

  1. The same documented precedence and scope matrix defines normal group decisions everywhere, while the IdP-owned platform-admin bypass is explicitly non-deniable by group controls.
  2. Role assignability and capability category, order, label, and help text each come from one canonical catalog, including every review capability and an explicit state for roles without operative rights.
  3. A fresh disposable database can apply and reverse the scoped-override schema with its ownership constraints and reverse-lookup indexes without editing historical migrations or requiring compatibility data.
  4. OpenAPI, backend DTOs, frontend types, and central API-helper contracts describe the same effective-rights, override, impact, and mutation-status shapes before consumers are built.

**Plans**: 31 plans

Plans:
**Wave 1**

- [x] 136-01-PLAN.md — Reversible capability-policy catalog, scoped override/audit schema, confirmed role defaults and indexes

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 136-09-PLAN.md — Exact narrow media/page/history handler enforcement for confirmed role defaults
- [x] 136-10-PLAN.md — Public presentation-only role catalog repository, handler and exact unauthenticated router contract

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 136-02-PLAN.md — Protected admin/member catalog projections and fail-closed permission cache

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 136-03-PLAN.md — Synchronized contracts and pure catalog-backed frontend role adapter

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 136-11-PLAN.md — Root-loaded role catalog provider and app-layout integration proof

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 136-04-PLAN.md — Catalog-driven group-member selectors and shared label/color compatibility
- [x] 136-05-PLAN.md — Pure catalog-driven contribution-role transforms
- [x] 136-06-PLAN.md — Catalog-context historical roles and archive/search filters
- [x] 136-07-PLAN.md — Catalog-driven member profile and project/release presentation

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 136-12-PLAN.md — Catalog-driven contribution and release-credit cards
- [x] 136-13-PLAN.md — Catalog-driven admin contribution selector and user projection

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 136-08-PLAN.md — Generic role badges/points and whole-inventory hardcode gate

**Gap closure — Wave 9**

- [x] 136-14-PLAN.md — Event-type-aware founder history and lifecycle-safe co-leader patch authorization
- [x] 136-15-PLAN.md — Successful-transition-only link audit ordering
- [x] 136-16-PLAN.md — Complete capability metadata, aligned Karaoke-FX semantics and fresh migration proof
- [x] 136-19-PLAN.md — Runtime-valid public catalog responses with compact provider errors

**Gap closure — Wave 10**

- [x] 136-17-PLAN.md — Complete focused/root OpenAPI and TypeScript policy contract family
- [x] 136-20-PLAN.md — Catalog-metadata-driven role artwork registry without a role-code allowlist

**Gap closure — Wave 11**

- [x] 136-18-PLAN.md — Go policy DTOs and semantic cross-layer parity gate

**UAT gap closure — Wave 12**

- [x] 136-21-PLAN.md — Assignable work-role catalog and Karaoke-FX notes-source correction
- [x] 136-22-PLAN.md — Catalog-ordered semantic role presentation on active project surfaces
- [x] 136-24-PLAN.md — Contributor segment tab and project-scoped adjacent release navigation
- [x] 136-25-PLAN.md — Narrow group-capability API and cross-layer contract projection

**UAT gap closure — Wave 13**

- [x] 136-23-PLAN.md — Catalog-driven release-note role presentation
- [x] 136-26-PLAN.md — Narrow-role workspace and media-list admission

**UAT gap closure — Wave 14**

- [x] 136-27-PLAN.md — Founder/Co-Leader field- and event-scoped workspace controls

**UAT gap closure — Wave 15**

- [x] 136-28-PLAN.md — Focused live UAT and approval evidence for all repaired gaps

**Residual UAT gap closure — Wave 16**

- [x] 136-29-PLAN.md — Reversible canonical Typesetting label and exact catalog-backed 15-role palette

**Residual UAT gap closure — Wave 17**

- [x] 136-30-PLAN.md — Shared semantic presentation on the four failed active role surfaces

**Residual UAT gap closure — Wave 18**

- [x] 136-31-PLAN.md — Focused live role-presentation proof and resumption of the 136-28 checkpoint

### Phase 137: Central Effective-Rights Resolver & Overrides

**Goal**: Authorized decisions and administrative explanations use one central resolver that safely applies group-scoped user denies/allows and exposes complete provenance.
**Depends on**: Phase 136
**Requirements**: CAP-01, CAP-02, CAP-03, CAP-05, CAP-06, CAP-07, QUAL-03
**Success Criteria** (what must be TRUE):

  1. An authorized caller can inspect every effective capability for a real user/group pair and see all granting roles, direct allows, direct denies, and the decisive reason.
  2. Runtime authorization and the inspector produce the same answer for role OR, deny-over-allow precedence, scoped overrides, disabled actors, and platform-admin bypass.
  3. An authorized admin can idempotently grant or deny one allowed capability for an active member in exactly one group, while foreign memberships, invalid scopes, and unknown actions fail neutrally.
  4. Every override mutation commits atomically with an immutable actor/target/context/before/after audit record, and forced audit or concurrency failures cannot leave partial authorization state.
  5. Automated negative coverage proves deny precedence, cross-group BOLA/IDOR resistance, invalid capability rejection, and protected direct-access enforcement.

**Plans**: 13/13 plans complete

### Phase 138: Effective-Rights Administration & Impact UX

**Goal**: Admins can understand and change a user's effective group rights from the existing canonical surfaces without guessing which role grants access or receiving false mutation success.
**Depends on**: Phase 137
**Requirements**: CAP-08, CAP-09, CAP-10, UADM-01
**Success Criteria** (what must be TRUE):

  1. The existing user-detail group-rights tab shows the complete effective capability set and its provenance, and is the canonical place for scoped user allow/deny changes.
  2. A guided "user must not do this" flow lists every granting source and recommends a scoped user deny before offering broader membership or role-matrix changes.
  3. Before changing a role-capability mapping, an admin sees affected role holders and which users actually gain, lose, or retain the capability through another source.
  4. After a role-matrix mutation, the UI distinguishes persisted, cache-active, pending, and failed activation states and never reports stale enforcement as final success.

**Plans**: 18 plans complete across 4 waves plus 2 post-hoc UAT gap-closure plans

Plans:
**Wave 1**

- [x] 138-01-PLAN.md — Role-holder query + handler (D-07/R-03)
- [x] 138-02-PLAN.md — CAP-10 activation-status contract extension + ActivationStatusIndicator primitive
- [x] 138-03-PLAN.md — D-29 release-version-label display-bug fix
- [x] 138-04-PLAN.md — D-22 role-assignment impact-preview endpoint
- [x] 138-05-PLAN.md — Claims + Änderungen cross-group filtered list endpoints (D-23/D-25/D-28)
- [x] 138-06-PLAN.md — UADM-01 foundation: api.ts wiring + canonical multi-group effective-rights inspection tab

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 138-07-PLAN.md — CAP-09 batch impact-preview endpoint for role-capability changes
- [x] 138-08-PLAN.md — CAP-08 guided revoke/grant flows + inline capability history
- [x] 138-09-PLAN.md — D-22 role-assignment impact preview UI
- [x] 138-10-PLAN.md — Claims top-level workspace (D-23)
- [x] 138-11-PLAN.md — Änderungen top-level workspace (D-25/D-26/D-27)
- [x] 138-12-PLAN.md — Rollen top-level workspace (D-07)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 138-13-PLAN.md — Impact-preview-gated role-capability matrix mutation (CAP-09 frontend)
- [x] 138-14-PLAN.md — D-24 claim-activation impact preview

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 138-15-PLAN.md — Admin main navigation (D-01/D-02) + user-detail Tabs rewrite (D-03) + user list/overview cleanup (D-04/D-05)
- [x] 138-16-PLAN.md — Gruppenansicht Rollen/Änderungen tabs (D-06)

**Post-hoc UAT gap-closure**

- [x] 138-17-PLAN.md — GAP-01 (negative relative-time clamp) + GAP-03 (WR-01 non_deniable+user_deny regression test)
- [x] 138-18-PLAN.md — GAP-02 (RoleCapabilityImpactPreviewModal narrow-viewport metrics/table/height fix, CAP-09)

**UI hint**: yes

### Phase 139: Scalable User-Admin Projections

**Goal**: Admins can understand large user contribution and media histories as bounded domain-correct groups instead of release-version noise.
**Depends on**: Phase 137
**Requirements**: UADM-02, UADM-03, UADM-04, UADM-05, UADM-06, UADM-07, UADM-08, QUAL-06
**Success Criteria** (what must be TRUE):

  1. Contributions are grouped server-side by anime and project, show the project default once, and label only real release-version deviations as overrides.
  2. Identical version assignments collapse into understandable ranges, while filters, counts, and stable pagination all describe the same server-side dataset.
  3. User media is grouped by anime, project, and release context and each item links to its existing canonical ownership-specific workspace.
  4. Every affected user tab explains whether it is actionable or informational and offers the relevant next action without unbounded flat lists or client-side regrouping.
  5. The shared admin layout remains keyboard-operable and usable at narrow widths without page overflow, while query-count and high-volume gates prevent N+1 behavior and pagination drift.

**Plans**: 10 plans across 7 waves

Plans:
**Wave 1**

- [x] 139-01-PLAN.md — Backend DTO foundation (grouped contributions/media/rights-summary shapes) + disposable Phase-139 Postgres test harness
- [x] 139-02-PLAN.md — Frontend TS type mirrors + URL-synced contributions/media filter hooks

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 139-03-PLAN.md — Contributions grouping/range-collapse/override-diff query (TDD, D02-D10)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 139-04-PLAN.md — Media grouping query + real PublicURL/FileSizeBytes derivation (D11-D14/D17-D19)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 139-05-PLAN.md — F-01 batched rights-summary endpoint (Overview-tab fan-out fix) + GetUserGroupMemberships pagination (D21/D22)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 139-06-PLAN.md — QUAL-06 query-budget + pagination-drift gate + F-03 live seed-data script
- [x] 139-07-PLAN.md — api.ts wiring + Rights-tab lazy-fetch fix (D22) + Overview-tab batched-summary consumption (F-01)

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 139-08-PLAN.md — Contributions tab UI rewrite: grouped-card projection + container-query CSS
- [x] 139-09-PLAN.md — Media tab UI rewrite: grouped release/episode-block projection + container-query CSS

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 139-10-PLAN.md — Full regression gate + D01/D27 scope check + live UAT checkpoint

**UI hint**: yes

### Phase 140: Review Delegation Management

**Goal**: Group leaders can safely manage specialized review authority for individual active members without granting a broader leadership role.
**Depends on**: Phase 137
**Requirements**: RDEL-01, RDEL-02, RDEL-03, RDEL-04
**Success Criteria** (what must be TRUE):

  1. An authorized group leader can read a real member's current media/image, note/text, and contribution review delegations through the documented central API contract.
  2. The leader can independently grant or revoke each delegable review right in the existing member editor under a distinct "Prüf-/Freigabe-Rechte" section.
  3. Delegation controls remain visibly and technically separate from roles and generic user overrides, so granting review authority does not grant broader leader capabilities.
  4. Every mutation reuses the existing transactional review service and audit seam, is idempotent, and rejects foreign, inactive, disabled, pending, or otherwise ineligible targets server-side.

**Plans**: 3 plans

Plans:
**Wave 1**

- [ ] 140-01-PLAN.md — Non-locking delegation-state read + AdminReviewDelegationHandler (GET/PUT), stub-tested
- [ ] 140-03-PLAN.md — ReviewDelegationSection UI + asymmetric grant-removal in the generic override view

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 140-02-PLAN.md — Route registration, main.go wiring, OpenAPI contract sync

**UI hint**: yes

### Phase 141: Actor-Decidable Review Queue

**Goal**: Reviewers see and navigate only work they can decide, while their own submissions remain clearly separated and protected by the same server-side policy.
**Depends on**: Phase 140
**Requirements**: RDEL-05, RQUE-01, RQUE-02, RQUE-03, RQUE-04, RQUE-05, RQUE-06
**Success Criteria** (what must be TRUE):

  1. The actionable queue contains only review kinds the current actor may decide for the relevant group, including immediately granted or revoked specialized delegations.
  2. A reviewer's own submissions do not appear in or increment actionable work; when shown, they occupy a separate "wartet auf Fremdprüfung" lane without decision actions.
  3. Actionable list rows, type counts, stable cursors, detail access, and "next" navigation use the same actor, group, capability, and self-review predicates.
  4. Manipulated URLs and stale clients cannot enumerate or decide forbidden entries, and the final transactional decision guard remains authoritative.
  5. Contribution reviews remain in their existing canonical workflow rather than being moved into the text/image release queue.

**Plans**: 7 plans

Plans:
**Wave 1**

- [x] 141-01-PLAN.md — Single-resolution review authorization (Pattern 1) + decision-guard concurrency regression

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 141-02-PLAN.md — Self-exclusion predicate, own-view scope, D15 sort direction fix, allowed_types field, RDEL-05/RQUE-06 tests

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 141-03-PLAN.md — Detail/Next existence-then-authorize (D04 403, Pitfall 3 shared predicate builder)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 141-04-PLAN.md — Frontend type/hook contracts (useReleaseReviewLane extraction)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 141-05-PLAN.md — Own-pending lane + Tabs wrapper (Component Contract 1)
- [x] 141-06-PLAN.md — Queue tab D10/D13/D06 filter, empty-state, and badge honesty
- [x] 141-07-PLAN.md — Review-detail page 403/409/Next handling (Component Contract 3)

**UI hint**: yes

### Phase 142: Integrated Security, Fixtures & Live Release Gate

**Goal**: The complete v1.4 capability, user-admin, delegation, and review workflows are reproducibly proven safe, contract-aligned, responsive, and ready for milestone closure.
**Depends on**: Phase 141
**Requirements**: QUAL-02, QUAL-05, QUAL-07, QUAL-08
**Success Criteria** (what must be TRUE):

  1. Reproducible fixtures cover two groups, multiple-role OR, allow/deny conflict, platform admin, cache failure, review grant/revoke, own/foreign submissions, and high-volume user projections from a clean disposable state.
  2. Every protected v1.4 view and mutation proceeds through the central browser refresh seam when the access token is absent or expired but the refresh session remains valid, without showing logged-out UI.
  3. Live UAT passes on the real user-detail, group-member, capability, and review routes at 390×844, 768×1024, and 1440×900, plus keyboard operation and 400% zoom.
  4. The final gate proves Keycloak-owned global roles, platform-admin bypass, canonical media/contribution ownership, specialized review audit, contracts, migrations, tests, lint/typecheck/build, and protected badge assets remain intact without parallel systems.

**Plans**: 1/1 complete
**UI hint**: yes

### Phase 143: Phase-142-Nacharbeit und Dashboard-Lane für abgelehnte Notizen

**Goal:** Die in der externen Codeprüfung vom 2026-09-01 belegten Defekte der Phase-142-Nacharbeit sind geschlossen, und abgelehnte eigene Release-Notizen sind gruppiert im persönlichen Dashboard sichtbar.
**Requirements**: TBD (Remediation-Phase, keine v1.4-Requirement-IDs)
**Depends on:** Phase 142
**Success Criteria** (what must be TRUE):

  1. Alle 17 roten Frontend-Testdateien aus `npx vitest run` (59 Tests, 11 Errors) sind grün oder als benannte Schuld dokumentiert — inklusive Fix der Contract-Drift PublicMemberBadge.next_tier (openapi.yaml `[bronze, silver, gold, platinum]` vs. v12-projection-contract.test.ts `[bronze, silver, gold]`) und des fehlenden RoleCatalogProvider im Fansub-Editor-Testbaum.
  2. Migration 0154 ist durch eine neue idempotente Migration mit funktionierendem down ersetzt (statt `DELETE FROM role_capabilities`), die Migration 0153 auflöst statt deren techadmin-Rechte sofort wieder zu löschen.
  3. Die drei Roh-SQL-Methoden aus `dashboard_me_handler.go` sind in den Repository-Layer gezogen (bevorzugt als Methoden auf `ReleaseReviewQueryRepository`, sodass die Selbstausschluss-Regel aus Phase 141 nur einmal existiert), die Permission-Prüfung für Gruppenmedien-Review ist von `fansub_group.edit` auf eine Review-Action korrigiert, und N+1-Permission-Calls sind memoisiert. Die drei verschobenen Methoden sind durch Tests abgedeckt — heute hat keine von ihnen einen.
  4. Fokus-Tests decken `ReleaseMetadataCreditService.AwardIfCompleted` (inkl. mehrdeutiger ID-Auflösung `WHERE rv.id = $1 OR rev.id = $1`) und die Datumsvalidierung in `FansubNotesRepository.UpdateAnimeFansubProjectTimeline` ab.
  5. `has_own_notes` in `anime_contributions_member_project_repository.go` filtert nach Review-State, sodass eine abgelehnte Notiz nicht mehr als erledigt zählt; `isDone()` im Frontend zeigt den korrigierten Zustand.
  6. `ReleaseVersionMetadataFields.tsx`, `AnimeProjectTimelineSection.tsx` und `workspace.module.css` nutzen Design-System-Primitives/CSS-Module/Design-Tokens statt nativer Elemente/Inline-Styles/roher Hex-Werte; ESLint `no-restricted-syntax` steht auf `error` mit einer eingefrorenen, nur schrumpfenden Legacy-Ausnahmeliste (`LEGACY_NO_RESTRICTED_SYNTAX_FILES` in `frontend/eslint.config.mjs`, gemessen 2026-09-01: 264 Verstoesse in 67 Dateien) statt einer unqualifizierten repo-weiten Durchsetzung — volle Migration dieser Altfaelle ist als Backlog-Item getrackt (`.planning/todos/pending/2026-09-01-no-restricted-syntax-legacy-datei-migration.md`).
  7. Abgelehnte eigene Release-Notizen erscheinen unter „Braucht deine Aufmerksamkeit" im persönlichen Dashboard, gruppiert pro Anime-Projekt und Fansubgruppe (statt als Einzelkarten) mit erkennbarer Folge, Notiztitel und Direktlink auf `/me/releases/{versionId}/workspace?tab=notes` — nur `review_state = rejected` gilt als überarbeitbar, nie `tombstoned`; diese Welle nutzt die Repository-Aggregation aus Kriterium 3 ohne eigene Handler-Query, mit synchronisiertem Backend-DTO, Frontend-Type und `shared/contracts/openapi.yaml`.

**Randbedingungen:** Keine parallelen Systeme, keine neuen Auth- oder Fixture-Wege, atomare Commits pro Task, Produktionsdateien bleiben bei maximal 450 Zeilen. Reihenfolge der Kriterien 1-7 ist verbindlich (Kriterium 7 baut auf der Repository-Aggregation aus Kriterium 3 auf). Vier Dateien haben die 450-Zeilen-Grenze im Phase-142-Zeitraum überschritten und werden in dieser Phase darunter zurückgeführt: `backend/internal/repository/member_claims_repository.go` (516), `frontend/src/app/me/releases/[versionId]/workspace/page.tsx` (469), `backend/internal/repository/anime_contributions_proposal_repository.go` (461), `backend/internal/repository/member_profile_projects_repository.go` (458). Kriterium 7 darf `workspace/page.tsx` nicht weiter wachsen lassen. Zusätzlich wird `backend/internal/handlers/app_auth.go` (1308 Zeilen, im Zeitraum von 1254 gewachsen) in vier Dateien desselben Pakets aufgeteilt — reine Dateiverschiebung ohne Signatur-, Routen- oder Verhaltensänderung, `app_auth_test.go` bleibt unverändert lauffähig: `app_auth.go` behält Handler-Struct, Konstruktor, Store-Interfaces, `GetCurrentUser`, `ListAppUsers` und `HandleKeycloakBackchannelLogout` (~220 Zeilen); `app_auth_invitations.go` bekommt die Invitation-Request-Typen sowie `ListFansubGroupInvitations`, `CreateFansubGroupInvitation`, `CancelFansubGroupInvitation` und `AcceptFansubInvitation` (~455); `app_auth_group_members.go` die Member-Request-Typen sowie `ListFansubGroupAppMembers`, `SearchFansubGroupAppMemberCandidates`, `CreateFansubGroupAppMember`, `SetFansubGroupMemberRole`, `SetFansubLead`, `setFansubGroupMemberRole`, `UpdateFansubGroupMemberStatus`, `SetFansubGroupMemberMediaPermissions` und `normalizeRequestedFansubRoles` (~400); `app_auth_capabilities.go` den Response-Typ und `GetFansubGroupCapabilities` (~230). Die beiden überlangen Funktionen `GetFansubGroupCapabilities` (229 Zeilen) und `CreateFansubGroupInvitation` (185) werden dabei nicht zerlegt — das ist eine eigene Entscheidung ausserhalb dieser Phase.

**Plans:** 19/19 plans complete

Plans:
**Wave 1**

- [x] 143-01-PLAN.md — Split backend/internal/handlers/app_auth.go into four files (450-line remediation)
- [x] 143-02-PLAN.md — Split backend/internal/repository/member_claims_repository.go (450-line remediation)
- [x] 143-03-PLAN.md — Split anime_contributions_proposal_repository.go + member_profile_projects_repository.go (450-line remediation)
- [x] 143-04-PLAN.md — Extract workspace/page.tsx helpers into workspaceHelpers.ts (450-line remediation, pre-Criterion-7)
- [x] 143-05-PLAN.md — Criterion 1: contract drift, RoleCatalogProvider mocks, episode-versions api mock fix (5 files)
- [x] 143-06-PLAN.md — Criterion 1: role-color/role-label regression cluster (6 files)
- [x] 143-07-PLAN.md — Criterion 1: remaining individually-triaged red test files (6 files)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 143-08-PLAN.md — Criterion 2: migration 0159 replaces 0154's reset pattern (idempotent + reversible)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 143-09-PLAN.md — Criterion 3: move raw SQL from dashboard_me_handler.go into ReleaseReviewQueryRepository

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 143-10-PLAN.md — Criterion 4: focus tests for ReleaseMetadataCreditService and project-timeline date validation

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 143-11-PLAN.md — Criterion 5: has_own_notes excludes rejected notes

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 143-12-PLAN.md — Criterion 6: design-system retrofit + no-restricted-syntax to error

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 143-13-PLAN.md — Criterion 7: backend aggregation for rejected-own-notes dashboard lane

**Wave 8** *(blocked on Wave 7 completion)*

- [x] 143-14-PLAN.md — Criterion 7: frontend AttentionSection lane + dashboard wiring

**UAT gap closure — Wave 9** *(post-closure live UAT, 2026-09-02, see 143-UAT.md)*

- [x] 143-15-PLAN.md — UAT-03/UAT-04: AttentionSection single-entry card height + color-token fallback cleanup
- [x] 143-16-PLAN.md — UAT-01: fix stale review-detail status Badge after decision
- [x] 143-17-PLAN.md — UAT-02: has_own_rejected_notes backend field + contract chain (repository/openapi.yaml/TS type)

**UAT gap closure — Wave 10** *(blocked on 143-17 completion)*

- [x] 143-18-PLAN.md — UAT-02: render third "Überarbeitung nötig" badge state + button prominence fix

**UAT gap closure — Wave 11** *(blocked on 143-18 completion, see 143-UAT.md UAT-05)*

- [x] 143-19-PLAN.md — UAT-05: has_own_media excludes rejected media + has_own_rejected_media contract chain + unified needsRework badge/button logic (notes+media)

### Phase 144: Überarbeitungs-Kreislauf für Release-Medien vervollständigen

**Goal:** Ein abgelehntes Release-Medium lässt sich in derselben Zeile korrigieren — Datei ersetzen und/oder Kategorie ändern, statt neu hochzuladen — und der Prüfer sieht beim erneuten Vorlegen, dass es sich um die überarbeitete Fassung seiner eigenen Ablehnung handelt, nicht um eine fremde neue Einreichung.
**Requirements**: TBD (UAT-06, 143-UAT.md — kein v1.4-Requirement-Mapping)
**Depends on:** Phase 143
**Plans:** 8/8 plans complete
**Live-UAT:** Abgenommen 2026-09-03 durch den Nutzer im Browser, siehe `144-UAT.md`. Drei während der UAT gefundene Altlasten (Endlosschleife im RVM-Cleanup, has_own_release_work, Dashboard-Ablehnungssignal) lagen außerhalb der Phase-144-Arbeit und sind bereits als Quick-Tasks behoben.

Plans:
**Wave 1**

- [x] 144-01-PLAN.md — Kategorie im bestehenden PATCH-Endpunkt änderbar machen (Zielbild 2)
- [x] 144-02-PLAN.md — Neues Replace-Repository: Identität erhalten, Revision springt, alte Datei in die Cleanup-Outbox (Zielbild 1, 4)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 144-03-PLAN.md — Prior-Rejection-DTO für die Prüfer-Detailseite (Zielbild 3, Backend)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 144-04-PLAN.md — Neuer PUT-Endpunkt für Datei-Ersatz inkl. Route + OpenAPI (Zielbild 1)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 144-05-PLAN.md — Frontend-Contracts: API-Client + geteilte Review-Präsentationshelfer

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 144-06-PLAN.md — Einreicher-UI: Datei-ersetzen-Kontrolle + Kategoriefeld im Bearbeiten-Formular
- [x] 144-07-PLAN.md — Prüfer-UI: Überarbeitet-Badge + Kontextzeile auf Detail- und Listenansicht

### Phase 145: Mitgliedschafts-Grundausstattung in die Rechte-Registry überführen

**Goal:** Die drei Rechte, die heute jedes aktive Gruppenmitglied unabhängig von seiner Rolle aus dem Go-Slice `membershipBaselineActions` erhält, stammen aus der Datenbank-Registry — dargestellt als reservierte, nicht zuweisbare Pseudo-Rolle — bei unverändertem Laufzeitverhalten und in der Capability-Matrix bearbeitbar.
**Requirements**: TBD (Folgearbeit an der Capability-Registry, kein v1.4-Requirement-Mapping)
**Depends on:** Phase 144
**Vorbedingung Planung:** `/gsd-ui-phase 145` vor `plan-phase` laufen lassen — die Capability-Matrix wird berührt, sonst blockt das UI-Gate.

**Getroffene Entscheidung (nicht erneut zur Diskussion stellen):** Darstellung als reservierte Pseudo-Rolle in `role_definitions` plus `role_capabilities`-Zeilen (z. B. `group_member`). Begründung: nutzt Lade-, Cache- und Startup-Prüfmaschinerie vollständig und macht die Grundausstattung in der Capability-Matrix im Admin bearbeitbar. Alternative Darstellungen (eigene Baseline-Tabelle, Beibehaltung des Hardcodes) sind verworfen.

**Ausgangsbefund** (am Code verifiziert 2026-09-03):

  - `membershipBaselineActions` in `backend/internal/permissions/effective_rights.go:74` hält drei Actions: `fansub_group.members.view`, `fansub_group_media.view`, `fansub_group_media.upload`. Ausgewertet an genau einer Stelle — `IsMembershipBaselineAction` im Precedence-`switch`, `effective_rights.go:356`.
  - `RoleCapabilityDetail.tsx:9` hält einen ZWEITEN Hardcode: `membershipBaselineCodes` filtert dieselben drei Actions aus der Capability-Matrix JEDER Rolle heraus und zeigt stattdessen einen statischen Satz (verifiziert 2026-09-03 durch den UI-Researcher). Die Überführung ist damit nicht auf eine Go-Stelle begrenzt — dieser Filter muss für normale Rollen bleiben und für die Pseudo-Rolle abgeschaltet werden, siehe `145-UI-SPEC.md`.
  - Alle drei Actions stehen bereits in `action_definitions` und sind dort 15 Rollen über `role_capabilities` zugeordnet; in SQL ist die rollenunabhängige Baseline nirgends nachgebaut.
  - Die Registry ist produktiv: `LoadRoleCapabilities` (`authz_permissions.go:400`), Startup bricht ab, wenn eine Action weder in `role_capabilities` steht noch standalone ist (`permissions.go:399`).

**Success Criteria** (what must be TRUE):

  1. `membershipBaselineActions` existiert nicht mehr als Rechte-Quelle im Go-Code; die Baseline-Entscheidung im Precedence-`switch` (`effective_rights.go:356`) speist sich aus den geladenen `role_capabilities` der reservierten Pseudo-Rolle.
  2. Eine neue reversible Migration seedet den Ist-Zustand exakt — genau diese drei Actions, kein Recht mehr und keines weniger. Ein Test gegen echtes Postgres belegt, dass die effektiven Rechte eines aktiven Mitglieds vor und nach der Migration identisch sind.
  3. Die Provenance-Stufe `membership_baseline` bleibt erhalten: die Baseline darf nicht als `group_role` durchschlagen. Die Precedence-Kette `no_active_membership > user_deny > user_allow > membership_baseline > role_grant > specialized_grant > no_grant` und ihre Contract-Enums (`shared/contracts/admin-capabilities.yaml`, `openapi.yaml`, `frontend/src/types/admin-capability.ts`) bleiben unverändert; `GuidedRevokeFlow.tsx` und `userGroupRightsHelpers.ts` erklären die Herkunft weiterhin als Grundausstattung.
  4. Ein `user_deny` entzieht ein Baseline-Recht weiterhin, und die Baseline gilt weiterhin nur bei aktiver Mitgliedschaft — beides durch Tests belegt.
  5. Die Pseudo-Rolle erscheint in keiner Rollen-Auswahlliste (nicht zuweisbar), ist aber in der Capability-Matrix im Admin sichtbar und bearbeitbar — über die bestehende Unterscheidung `fansubGroupRoleCatalog` (zuweisbar) vs. `capabilityRoleCatalog` (capability-editierbar) in `permissions.go`.
  6. Fehlen die `role_capabilities`-Zeilen der Pseudo-Rolle, bricht der Start fail-closed ab — analog zum bestehenden Startup-Check (`permissions.go:399`) — statt Mitglieder still ihre Rechte verlieren zu lassen.

**Plans**: 4 plans across 4 waves

  - Wave 1: 145-01 (migration 0160 + cache-driven IsMembershipBaselineAction + fail-closed startup gate + assignable-catalog exclusion)
  - Wave 2: 145-02 (real-Postgres proof: migration idempotency/rollback + effective-rights snapshot + role_kind emission + remaining role-picker/catalog exclusions)
  - Wave 3: 145-03 (Capability Matrix frontend: role rail label, tab defaults, RoleCapabilityDetail hardcode-filter split, Inhaber-tab explanation)
  - Wave 4: 145-04 (full regression gate + live UAT checkpoint)

**UI hint**: yes — `145-UI-SPEC.md` liegt vor (2026-09-03, gsd-ui-checker 6/6 approved)

Plans:
**Wave 1**

- [x] 145-01-PLAN.md — Migration 0160 + cache-driven IsMembershipBaselineAction + fail-closed startup gate + assignable-catalog exclusion.

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 145-02-PLAN.md — Real-Postgres proof (migration idempotency/rollback + effective-rights snapshot) + role_kind emission + remaining role-picker/catalog exclusions.

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 145-03-PLAN.md — Capability Matrix frontend: role rail label, tab defaults, RoleCapabilityDetail hardcode-filter split, Inhaber-tab explanation.

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 145-04-PLAN.md — Full regression gate + live UAT checkpoint.

### Phase 146: Registry-Selbstschutz und Sanierung der Quelltext-Substring-Tests

**Goal:** Die in der Phase-145-Codeprüfung gefundenen Registry-Schwächen sind geschlossen — vor allem kann kein Admin über die ausgelieferte Capability-Matrix einen Zustand herstellen, der den nächsten Backend-Start in eine Absturzschleife schickt — und die sicherheitsrelevanten Tests belegen Verhalten durch echte Aufrufe statt durch Quelltextsuche.
**Requirements**: TBD (Nacharbeit aus `145-REVIEW.md` und Altlast WR-02 aus `144-REVIEW.md`, kein v1.4-Requirement-Mapping)
**Depends on:** Phase 145
**Zuschnitt:** Zwei Blöcke in einer Phase, in dieser Reihenfolge — erst der Registry-Selbstschutz (Kriterien 1–4, kleiner und dringender, betrifft live ausgelieferten Code), dann die Testsanierung (Kriterien 5–8).

**Ausgangsbefund** (selbst gemessen 2026-09-04, nicht aus Berichten übernommen):

  - `CountRolesWithAction` (`backend/internal/repository/authz_capability_mutations.go:334`) zählt mit `SELECT COUNT(DISTINCT role_code) ... WHERE action_code = $1` die Rollen INSGESAMT, die eine Action gewähren. Da rund 15 weitere Rollen dieselben drei Baseline-Rechte tragen, feuert der Lockout-Guard beim Entfernen an `group_member` nie.
  - Der laufende Prozess bleibt korrekt fail-closed (`validateMembershipBaselineRegistryPresence` lässt den alten Cache stehen), aber der nächste Start bricht in `LoadCache` ab und `cmd/server/main.go:138` beendet mit `log.Fatalf` — Container-Absturzschleife, bis jemand die Zeile von Hand nachträgt. Auslösbar mit zwei Klicks in der regulären Admin-Oberfläche, ohne Datenbankzugriff.
  - `ListGroupHistoryRoleDefinitions` fehlt der `NOT reserved`-Filter, den seine drei Geschwisterabfragen bekommen haben (derzeit folgenlos, weil der Kontext nicht passt — aber genau die Art Inkonsistenz, die später zum Fehler wird).
  - Die drei Baseline-Action-Codes stehen an drei Stellen hartkodiert: Migration, Go-Validator, TS-Filter.
  - Quelltext-Substring-Tests: **53 Testdateien** lesen per `os.ReadFile` eine `.go`-Quelldatei ein und belegen Verhalten mit `strings.Contains` — **357** solcher Aufrufe in 302 Testfunktionen. Verteilung: `internal/repository` 34, `internal/handlers` 15, `internal/services` 3, `cmd/server` 1. Spitzenreiter: `member_profile_repository_test.go` mit 117 Aufrufen. **17 dieser Dateien** berühren Sicherheitszusicherungen (Permission, Authz, Capability, Preview-Sperre, 403). Die ältere Schätzung aus `.planning/notes/2026-09-02-altlasten-cr01-wr02.md` (49 Dateien / 236 Behauptungen) ist damit überholt.

**Success Criteria** (what must be TRUE):

  1. Das Entfernen einer der drei Pflicht-Actions von der reservierten Pseudo-Rolle wird im Mutationspfad serverseitig abgelehnt — nicht nur in der Oberfläche — und ein Test spielt genau diesen Pfad durch, statt die Ablehnung aus dem Quelltext zu erschließen. Der bestehende Lockout-Guard bleibt für alle anderen Rollen unverändert.
  2. Die Capability-Matrix weist diese drei Rechte sichtbar als geschützt aus und zeigt bei einem Versuch eine sprechende deutsche Meldung mit korrekten Umlauten — kein stiller Fehlschlag und kein roher Serverfehler.
  3. `ListGroupHistoryRoleDefinitions` trägt denselben `NOT reserved`-Filter wie seine drei Geschwisterabfragen; ein Test belegt gegen echtes Postgres, dass die Pseudo-Rolle in keiner der vier Abfragen auftaucht.
  4. Die drei Baseline-Action-Codes haben eine einzige autoritative Quelle; die verbleibenden Verwendungen leiten sich davon ab oder sind durch einen Test gegen Auseinanderdriften gesichert.
  5. Alle 17 sicherheitsrelevanten Testdateien belegen ihre Verhaltensbehauptungen durch echte Aufrufe des geprüften Codes. Quelltextsuche bleibt nur für Abwesenheitsprüfungen und für Dateien, die selbst Prüfgegenstand sind — die Konvention aus `CLAUDE.md`.
  6. Messbar am Ende: höchstens 36 Testdateien lesen noch eine `.go`-Quelldatei ein (von 53), und keine der 17 sicherheitsrelevanten ist darunter.
  7. Ein automatischer Guard verhindert Neuzugänge — eingefrorene, nur schrumpfende Ausnahmeliste nach dem Vorbild von `LEGACY_NO_RESTRICTED_SYNTAX_FILES` in `frontend/eslint.config.mjs`. Die `CLAUDE.md`-Konvention ist damit durchgesetzt statt nur beschrieben.
  8. Der bewusst stehen gelassene Restbestand ist als benannte Schuld dokumentiert, mit dem Grund je Datei — nicht als stillschweigende Lücke.

**Plans:** 6/13 plans executed

Plans:
**Wave 1**

- [x] 146-01-PLAN.md — Criterion 3+4: NOT reserved filter fix, single-source baseline action codes
- [x] 146-02-PLAN.md — Criterion 2: capability-matrix badge/lock/aria-describedby + 38-vs-3 filter fix (D-15/D-19)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 146-03-PLAN.md — Criterion 1+D-16: unconditional revoke guard + action-specific grant guard

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 146-04-PLAN.md — Criteria 5/6/7: lock security-relevant file list (D-08) + remediate 3 files
- [x] 146-05-PLAN.md — Criteria 5/6: remediate hist_group_member_roles_whitelist_test.go + member_claims_repository_claim_activation_test.go
- [x] 146-06-PLAN.md — Criteria 5/6: remediate member_archive_repository_test.go + member_point_totals_repository_test.go
- [ ] 146-07-PLAN.md — Criteria 5/6: remediate fansub_test.go + point_ledger_repository_test.go
- [ ] 146-08-PLAN.md — Criteria 5/6: remediate 3 admin_content_* handler test files
- [ ] 146-09-PLAN.md — Criteria 5/6: remediate dashboard_me_handler_test.go
- [ ] 146-10-PLAN.md — Criteria 5/6: remediate public_member_access_matrix_test.go
- [ ] 146-11-PLAN.md — Criteria 5/6: remediate release_version_media_repository_test.go
- [ ] 146-12-PLAN.md — Criteria 5/6: remediate admin_content_release_version_media_test.go

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 146-13-PLAN.md — Criteria 6/7/8: ratchet guard + named remainder documentation

**UI hint**: ja — Kriterium 2 berührt die Capability-Matrix; vor `plan-phase` `/gsd-ui-phase 146` laufen lassen. (erledigt, 146-UI-SPEC.md abgenommen)

## v1.4 Coverage

| Phase | Requirement Count | Requirement IDs |
|-------|-------------------|-----------------|
| 136. Capability Policy, Catalog & Schema Contract | 7 | CAP-04, CAP-11-14, QUAL-01, QUAL-04 |
| 137. Central Effective-Rights Resolver & Overrides | 6 | CAP-01, CAP-02, CAP-05-07, QUAL-03 |
| 138. Effective-Rights Administration & Impact UX | 4 | CAP-08-10, UADM-01 |
| 139. Scalable User-Admin Projections | 8 | UADM-02-08, QUAL-06 |
| 140. Review Delegation Management | 4 | RDEL-01-04 |
| 141. Actor-Decidable Review Queue | 7 | RDEL-05, RQUE-01-06 |
| 142. Integrated Security, Fixtures & Live Release Gate | 4 | QUAL-02, QUAL-05, QUAL-07, QUAL-08 |
| **Total v1.4** | **41** | **41 unique requirements; no duplicates or orphans** |

## v1.4 Progress

**Execution Order:** 136 - 137 - 138 - 139 - 140 - 141 - 142 - 143 - 144 - 145 - 146

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 136. Capability Policy, Catalog & Schema Contract | 31/31 | Complete | 2026-08-21 |
| 137. Central Effective-Rights Resolver & Overrides | 14/14 | Complete | 2026-08-21 |
| 138. Effective-Rights Administration & Impact UX | 18/18 | Complete | 2026-08-24 |
| 139. Scalable User-Admin Projections | 10/10 | Complete | 2026-08-24 |
| 140. Review Delegation Management | 3/3 | Complete | 2026-08-26 |
| 141. Actor-Decidable Review Queue | 7/7 | Complete | 2026-08-26 |
| 142. Integrated Security, Fixtures & Live Release Gate | 1/1 | Complete | 2026-09-01 |
| 143. Phase-142-Nacharbeit und Dashboard-Lane für abgelehnte Notizen | 19/19 | Complete | 2026-09-02 |
| 144. Überarbeitungs-Kreislauf für Release-Medien vervollständigen | 8/8 | Complete | 2026-09-03 |
| 145. Mitgliedschafts-Grundausstattung in die Rechte-Registry überführen | 4/4 | Complete | 2026-09-04 |
| 146. Registry-Selbstschutz und Sanierung der Quelltext-Substring-Tests | 6/13 | In Progress|  |
