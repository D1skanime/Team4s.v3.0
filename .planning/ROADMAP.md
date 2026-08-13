# Roadmap: Team4s v1.3 Public Member Profile Hardening

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

- [ ] **Phase 128: Canonical Public Identity & Visibility Foundation** - Make stored immutable slugs and deny-first access authoritative across every public member route.
- [ ] **Phase 129: Canonical Public Projections & Data Correctness** - Make every visible membership, contribution, release, badge, point, date, role, and count come from the correct public source.
- [ ] **Phase 130: Public DTO & Cross-Layer Contract Alignment** - Establish one minimal allow-listed public profile contract across backend, OpenAPI, TypeScript, and API helpers.
- [ ] **Phase 131: Set-Based Delivery, Pagination & Performance Budgets** - Bound payloads and page reads, remove query fan-out, and prove performance against both milestone fixtures.
- [ ] **Phase 132: Shared SSR Composition & Race-Safe Frontend State** - Render public and owner views through one composition and one refresh-capable request boundary with localized state.
- [ ] **Phase 133: Responsive, Accessible & Efficient Visual Delivery** - Make the final profile composition mobile-first, container-responsive, keyboard accessible, and image-budgeted.
- [ ] **Phase 134: Fixture-Backed Verification & Rollout** - Reproduce both reference profiles from a clean state and close the milestone with automated and live evidence.

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
- [ ] 128-04-PLAN.md - Add the immutable canonical public-slug schema and runtime member fields.

**Wave 3** *(blocked on Wave 2 completion)*
- [ ] 128-05-PLAN.md - Implement the shared transactional slug allocator across all member-creation repositories.
- [ ] 128-06-PLAN.md - Project stored member slugs through contribution data.
- [ ] 128-07-PLAN.md - Project stored member slugs through group and domain-member data.
- [ ] 128-08-PLAN.md - Replace archive and ranking member-link fallbacks with stored slugs.
- [ ] 128-09-PLAN.md - Add the deny-first public-member access repository and ID-based profile loaders.

**Wave 4** *(blocked on Wave 3 completion)*
- [ ] 128-10-PLAN.md - Convert project and contribution detail loaders to resolved member identity.
- [ ] 128-11-PLAN.md - Enforce shared access resolution and cache policy in public profile handlers.

**Wave 5** *(blocked on Wave 4 completion)*
- [ ] 128-12-PLAN.md - Apply the shared visibility gate to projects, contributions, and retained subresources.

**Wave 6** *(blocked on Wave 5 completion)*
- [ ] 128-13-PLAN.md - Align OpenAPI, frontend types, and central API helpers with the canonical public contract.

**Wave 7** *(blocked on Wave 6 completion)*
- [ ] 128-15-PLAN.md - Render the authoritative public profile composition at its canonical route.
- [ ] 128-17-PLAN.md - Remove numeric member-link fallbacks from own-profile projections.
- [ ] 128-18-PLAN.md - Reuse the shared profile hero for stored-slug member links.

**Wave 8** *(blocked on Wave 7 completion)*
- [ ] 128-16-PLAN.md - Add the private-owner contextual preface and no-flash refresh-only behavior.
- [ ] 128-19-PLAN.md - Keep visibility editing session-safe and synchronized with the canonical preview.

**Wave 9** *(blocked on Wave 8 completion)*
- [ ] 128-20-PLAN.md - Obtain explicit approval for the disposable member-row reset procedure.

**Wave 10** *(blocked on Wave 9 completion)*
- [ ] 128-21-PLAN.md - Reset, migrate, reseed, and run the full Phase 128 automated gate.

**Wave 11** *(blocked on Wave 10 completion)*
- [ ] 128-22-PLAN.md - Capture live browser evidence across visibility, refresh, and responsive states.

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
**Plans**: TBD
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
**Plans**: TBD
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
**Plans**: TBD
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
**Plans**: TBD
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
**Plans**: TBD
**Plan-time read first**: `docs/frontend/ui-system.md`, `docs/agent-guidelines-ui.md`, `frontend/src/app/members/[slug]/page.module.css`, `frontend/src/components/profile/profile.module.css`, profile-owned CSS modules, `MemberBadgeChain.module.css`, `frontend/src/components/ui/FocalCarousel.tsx`, `ResponsiveImage.tsx`, their tests/styles, `frontend/next.config.mjs`, and `frontend/scripts/verify-profile-image-delivery.mjs`. Reuse or extend global primitives before adding local generic styles.
**UI hint**: yes

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
**Plans**: TBD
**Plan-time read first**: `backend/internal/migrations/runner.go`, migration tests, existing project reset/seed/Compose tooling, `frontend/scripts/collect-member-profile-evidence.mjs`, `frontend/scripts/verify-profile-image-delivery.mjs`, profile API/component tests, and prior UAT formats as read-only analogs. Record hashes/status for `frontend/public/history-event-badges-transparent/` and other protected tracked badge sources before any reset or media cleanup.
**UI hint**: yes

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
| **Total** | **65** | **65 unique v1.3 requirements; no duplicates or orphans** |

## Progress

**Execution Order:** 128 - 129 - 130 - 131 - 132 - 133 - 134

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 128. Canonical Public Identity & Visibility Foundation | 1/22 | In Progress | - |
| 129. Canonical Public Projections & Data Correctness | 0/TBD | Not started | - |
| 130. Public DTO & Cross-Layer Contract Alignment | 0/TBD | Not started | - |
| 131. Set-Based Delivery, Pagination & Performance Budgets | 0/TBD | Not started | - |
| 132. Shared SSR Composition & Race-Safe Frontend State | 0/TBD | Not started | - |
| 133. Responsive, Accessible & Efficient Visual Delivery | 0/TBD | Not started | - |
| 134. Fixture-Backed Verification & Rollout | 0/TBD | Not started | - |

---
*Created: 2026-08-13 for milestone v1.3 Public Member Profile Hardening*
