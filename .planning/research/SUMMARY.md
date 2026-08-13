# Project Research Summary

**Project:** Team4s v1.3 Public Member Profile Hardening
**Domain:** Brownfield public member identity and profile read surface
**Researched:** 2026-08-13
**Confidence:** HIGH overall; MEDIUM for unresolved product policy and production performance

## Executive Summary

Team4s v1.3 hardens the existing public member profile; it does not create a new profile product. Treat every `/members/:slug` route as one privacy-sensitive read boundary: resolve a stable persisted identity, decide visibility and verified owner access before loading detail, then build a minimal projection from the existing canonical member, membership, contribution, badge, point, media, and release-native data. Keep the page SSR-first and preserve its established hierarchy. Hidden owner preview must reuse the same backend-owned public projection and view through the central refresh-capable auth client.

No new runtime dependency or infrastructure product is justified. Keep PostgreSQL, Go/Gin/pgx, Next.js/React, CSS Modules, OpenAPI, Redis, Vitest/Testing Library, Playwright, and the current image/media pipeline. Add only a reversible canonical-slug migration, narrow access/projection/composition seams, set-based bounded queries, deterministic fixtures, and safe Next.js image configuration. Redis profile caching remains conditional until correctness and measured performance justify its invalidation cost.

The largest risks are leaks through late checks or sibling routes, false historical/aggregate claims, contract drift, N+1 and fake pagination, owner-preview cache/session errors, and CSS/image/accessibility shortcuts that hide defects. Build in dependency order: settle policy; establish identity and deny-first access; correct canonical projections; align contracts; bound and measure delivery; consolidate frontend composition/state; then complete responsive, accessible, image, and live-UAT hardening. Test rows are disposable: use proper schema migrations and reset/reseed, with no backfill, row-preservation, fallback, or compatibility burden unless explicitly requested.

## Consensus Findings and Open Decisions

### Consensus Findings

All four reports agree:

- Harden the existing profile vertical slice and all sibling public member routes; do not create a second domain.
- Persist one database-unique canonical slug and remove mutable-nickname and numeric route fallbacks.
- Decide visibility/owner access before querying memberships, badges, points, media, projects, or contributions.
- Reuse one backend access policy for profile, projects, contributions, metadata, and retained member subresources.
- Preserve canonical ownership: member identity, distinct current/historical membership facts, confirmed public contributions, authoritative badges/points, and release-version-native media.
- Use a minimal public-only DTO and synchronize SQL, Go, handlers, OpenAPI, TypeScript, `api.ts`, and tests.
- Remove unused fields, duplicate loaders, and dead public paths instead of retaining disposable-row compatibility.
- Replace per-row/full-profile reloads with a fixed small number of set-based, bounded queries and truthful pagination.
- Keep viewer-sensitive/owner responses `no-store`; anonymous caching is optional and must have measurement plus exact invalidation.
- Keep SSR-first composition, the central auth/refresh boundary, mobile-first CSS, component container queries, semantic accessibility, and fixture-backed live UAT.

### Open Product Decisions

1. **Hidden versus missing:** choose byte/status identity or merely equal non-disclosure. Neither may reveal identity, ownership, counts, or media.
2. **Achievement aggregates:** decide whether exact public progress may include non-public source facts. Omit ambiguous exact progress until approved.
3. **Slug mutation:** default to immutable. If post-publication changes are allowed, define authorization and direct permanent aliases separately; do not add aliases for disposable rows.
4. **Current membership:** define which current states, if any, are independently public; never present permission-bearing membership as historical fact.
5. **DTO/list bounds:** inventory consumers and choose initial/page sizes with both fixtures.
6. **Pagination:** prefer keyset for mutable/unbounded data; keep OFFSET only with stable tie-breakers and evidence.
7. **Anonymous caching:** default to no shared cache; revisit only after measured query/payload work and an owned invalidation matrix.
8. **Performance acceptance:** Core Web Vitals “good” thresholds are objectives, not production claims without field data.
9. **Fixture manifest:** lock the exact facts and edge cases reproduced by `sheppert` and `csubs-leader`.

## Key Findings

### Recommended Stack

The current stack is sufficient and validated; versions and sources are in [STACK.md](./STACK.md).

**Keep:**

- **PostgreSQL 16:** slug uniqueness, deny-first lookup, projections, pagination, and measured indexes.
- **Go 1.25, Gin 1.10, pgx/v5:** backend access authority, typed outcomes, orchestration, and SQL.
- **Next.js 16 and React 18:** SSR, request-local deduplication, shared composition, and image delivery.
- **CSS Modules/platform CSS:** mobile-first layout, container queries, focus, reflow, and reduced motion.
- **OpenAPI, TypeScript, central `api.ts`:** one public contract and refresh-capable browser boundary.
- **Vitest, Testing Library, Testify, Playwright:** repository through browser evidence.
- **Existing Redis and media pipeline:** available, but not expanded without measurement.

**Required additions or changes:**

- Add stored canonical `members.slug` with non-empty normalized case-insensitive uniqueness in the next reversible migration. The backend allocator handles collisions; nickname changes do not rewrite it.
- Add indexes only after `EXPLAIN (ANALYZE, BUFFERS)` proves value on both fixtures.
- Add `images.qualities: [75]` and scope local-IP optimization to private development/test runtime.
- Add narrow code seams for public-member read policy, public DTOs, shared view composition, and deterministic fixtures.

**Explicit non-additions:**

- No new framework, ORM/query builder, state/CSS/component library, E2E runner, image CDN, cache service, or Compose service.
- No new member/profile/badge/contribution/membership/release/media ownership model.
- No second auth client, BFF, badge engine, or client canonical-calculation path.
- No OpenAPI generator or platform major upgrade bundled into v1.3.
- No production-row backfill, alias compatibility, nickname/ID fallback, or preservation code for disposable data.
- No speculative profile cache; Redis is conditional after measurement.

### Expected Features

Full behavior is in [FEATURES.md](./FEATURES.md).

**Table stakes:**

- Visibility-first, non-enumerating access across every member route.
- Authoritative owner preview using the same DTO/view, private/no-store, including refresh-only sessions.
- Stable canonical slugs and links that survive nickname changes.
- Minimal allow-listed contracts with private/internal/source-original fields excluded.
- Correct identity, status, memorial, membership, project, contribution, release, point, badge, story, and media facts.
- Counts/pagination matching the visible filtered dataset with stable order and no duplicates.
- Deliberate loading, empty, hidden, missing, primary-error, and section-error states.
- SSR-first bounded delivery without per-card fan-out; responsive images with reserved geometry.
- Mobile-first reflow, compact widescreen density, no overflow, semantic headings, keyboard/focus/state/announcement/contrast/reduced-motion accessibility.
- Reproducible automated and live UAT across public, hidden, owner, missing, sparse/dense, error, paging, image, keyboard, zoom, and responsive states.

**Differentiators:**

- Trust-aware language for confirmed, unverified, unknown-date, current/former, and memorial history.
- Owner preview exactly matching public composition except for banner/cache policy.
- Durable canonical links across archive, group, ranking, contributor, and project surfaces.
- Component density driven by available geometry, not device-name breakpoints.
- Semantic SSR depth with only expensive interaction deferred.
- A checked fixture acceptance manifest as durable release evidence.

**Anti-features and deferrals:**

- Defer customization, follows/social, comments, public editing, new badge families/content sections, personalization, infinite scroll, and unrelated redesign/navigation.
- Reject client privacy filtering, contribution-as-membership inference, client badges/points, own/edit DTO reuse, viewer-sensitive shared cache, load-everything payloads, fake pagination, and error-as-empty.
- Reject ownership shortcuts: release-version media stays on `release_version_media -> media_assets -> media_files` with a real `release_version_id`; never attach it to anime/episodes or substitute `release_media`.
- Reject global overflow suppression, device-name breakpoints, and profile-local copies of generic primitives.
- Defer production slug backfill/legacy aliases; reset/reseed disposable rows.

### Architecture Approach

Use a visibility-first read service over existing repositories/tables, followed by small set-based projections and a dedicated public DTO. Keep one SSR-first view, with a client session-upgrade boundary only after anonymous SSR returns hidden. See [ARCHITECTURE.md](./ARCHITECTURE.md).

```text
/members/:slug request
  -> central API helper / optional-auth handler
  -> PublicMemberReadService
       1. indexed members.slug resolution
       2. NOT_FOUND / HIDDEN / VISIBLE_PUBLIC / VISIBLE_OWNER
       3. requested minimal projection by member ID
       4. fail-closed visibility recheck
  -> explicit public or hidden envelope
  -> one PublicMemberProfileView

Canonical sources:
members + verified claim
  -> explicit public current/historical membership facts
  -> confirmed/public anime_contributions
  -> canonical badges, point totals, lifecycle aggregates
  -> public/published release-version notes
  -> approved/public/ready release_version_media + assets/files
  -> anime -> episodes -> fansub_releases -> release_versions
     -> release_version_groups.fansub_group_id
```

**Major components:**

1. **Slug schema/allocator** — stable route identity, database uniqueness, creation/link coverage.
2. **Access resolver/read service** — viewer-aware decision for profile, projects, contributions, metadata.
3. **Focused public projections** — identity/media, membership, achievement, bounded project/contribution reads with O(1) query count.
4. **Public contracts** — separate from own/edit DTOs across Go, OpenAPI, TypeScript, helpers.
5. **SSR route/shared view** — one visible composition and central-client owner upgrade.
6. **Local interactions** — slug-keyed paging/carousel/expansion with abort/sequence and dedupe.
7. **Responsive component seams** — page viewport ownership; reusable component containment/container queries.
8. **Fixture seam** — idempotent named profiles outside runtime repositories.

**Ownership invariants:**

- Identity belongs to `members`; verified ownership remains internal.
- Historical memberships/roles use historical tables; current membership is a separate fact with explicit policy.
- Projects require confirmed, public-on-profile `anime_contributions`.
- Badge/point state remains server-authoritative; browser presentation never recalculates it.
- Story remains server-sanitized through `RichTextRenderer`.
- Public media is approved, public, ready, non-deleted, and exposes display variants only.
- Release ownership stays release-native with `release_version_groups.fansub_group_id`; never restore `fansubgroup_id` or episode-attached release media.

### Critical Pitfalls

See [PITFALLS.md](./PITFALLS.md).

1. **Late visibility:** authorize minimal identity first; hidden requests must execute zero detail loaders.
2. **Sibling bypass:** every retained subresource uses one resolver plus row-level public predicates.
3. **Mutable identity:** persist/uniquely allocate slug; remove scans, numeric fallbacks, and client slugification.
4. **False history/aggregates:** define sources, precedence, dedupe, reversals, and aggregate privacy before display.
5. **Contract/private-field drift:** change all layers together and assert forbidden fields are absent.
6. **N+1/fake pagination:** stabilize DTO, then use bounded set-based reads, deterministic order, measured indexes.
7. **Viewer/cache/session confusion:** authoritative no-store preview, central refresh seam, async state isolated by slug/viewer.
8. **CSS/image/a11y shortcuts:** fix containment locally, narrow image proxy rules, preserve semantics/keyboard/focus/motion, verify beyond screenshots.
9. **Unsafe rollout:** idempotent fixtures, reversible migrations, fresh-schema tests, scoped diffs, protected badge assets.

## Implications for Roadmap

### Phase 1: Identity, Stable Slug, and Visibility Foundation

**Rationale:** Every query, link, cache key, and preview depends on stable identity and deny-first access.

**Delivers:** Locked hidden/missing and slug policies; reversible slug migration/allocator; all creation/link paths; shared resolver across profile/projects/contributions/metadata; viewer/route privacy matrix; zero hidden detail calls.

**Addresses:** Stable slug, visibility-first access, non-enumeration, owner authority.

**Avoids:** Late gate, sibling bypass, nickname identity, compatibility debt, wrong ownership links.

### Phase 2: Public Projection and Historical Data Correctness

**Rationale:** Contract minimization requires agreed canonical facts, filters, precedence, dedupe, and aggregate privacy.

**Delivers:** Source matrix; correct status/dates/memorial/history/release joins/public predicates/counts/reversals; decision on exact aggregate privacy; fixtures for current/historical/disputed/overlap/private/reversed/deleted/restored cases.

**Addresses:** Membership, projects/contributions, counts, achievements, trust-aware history.

**Avoids:** Contribution-as-membership, double count, side-channel aggregates, client badge engine, ownership drift.

### Phase 3: Public DTO and Contract Alignment

**Rationale:** A minimal allow-listed response becomes authoritative only after projection meaning is stable.

**Delivers:** Dedicated public/media DTOs; typed visible/hidden/missing/error branches; aligned SQL, Go, handlers, OpenAPI, TypeScript, `api.ts`; unused path/field removal; forbidden-field negatives.

**Addresses:** Minimal contract, state/error contract, safe story/media output.

**Avoids:** Own DTO reuse, fallback values, optionality/status drift, stored XSS, media leakage.

### Phase 4: Set-Based Queries, Payload Bounds, and Pagination

**Rationale:** Optimize only correct, stable responses.

**Delivers:** Fixed query budget; no per-project reads or full-profile paging reload; bounded initial/lazy pages; stable keyset or proven OFFSET; query/bytes/latency plans for both fixtures; evidence-backed indexes and payload budgets.

**Addresses:** Honest pagination, efficient first render, matching counts.

**Avoids:** N+1, unbounded children, unstable pages, speculative indexes, premature cache.

### Phase 5: Server/Client Access, Cache, Composition, and State

**Rationale:** Frontend consolidation should consume the settled DTO/endpoints while preserving privacy and refresh behavior.

**Delivers:** Anonymous SSR without page token logic; one `PublicMemberProfileView`; central-client owner upgrade including refresh-only; request-local dedupe and no-store viewer variants; slug-keyed race-safe local state; deliberate sparse/hidden/missing/error compositions.

**Addresses:** Exact owner preview, cache safety, SSR hierarchy, scoped states, progressive depth.

**Avoids:** Client DTO fabrication, token logic outside boundary, cache leak, stale append, duplicated request/layout ownership, error-as-empty.

### Phase 6: Responsive CSS, Accessibility, and Image Delivery

**Rationale:** Refine the final semantic composition after data/state stabilize.

**Delivers:** Bounded component/style extraction; mobile-first/container-responsive geometry; compact widescreen/no overflow; headings/keyboard/focus/names/state/status/targets/contrast/motion; truthful image sizes and safe configuration; evidence at narrow, transition, intermediate, wide, nested, 400% zoom, long German text, keyboard, motion, and JS-off.

**Addresses:** Responsive/accessibility/image table stakes and geometry differentiator.

**Avoids:** Broad redesign, overflow hiding, viewport-coupled components, drag-only UI, obscured focus, SSRF config, source leaks, CLS, oversized images.

### Phase 7: Fixture-Backed UAT and Rollout

**Rationale:** Completion requires clean-state reproduction of every cross-layer claim.

**Delivers:** Versioned idempotent seed/manifest for both profiles; migration down/up/fresh proof; automated and live user-visible flows across viewers/states/viewports/errors; query/payload/image/overflow evidence; ownership and tracked-badge-asset regression checks.

**Addresses:** Reproducible public UAT and release confidence.

**Avoids:** Fixture drift, hidden-route validation, screenshot-only a11y, lab-only production claims, migration/asset damage.

### Phase Ordering Rationale

- Identity/access precede projections because they determine whether detail may be loaded.
- Domain semantics precede contract cleanup; contract stability precedes performance and frontend work.
- Query/payload work precedes caching; caching is never a substitute for correct reads.
- Composition precedes CSS/image/a11y so refinement targets final DOM/state ownership.
- Fixtures are specified early and become the final gate.
- Disposable rows remove compatibility burden, not migration discipline.

### Requirement Categories for the Next Workflow Step

1. **Public identity/routing:** slug lifecycle, links, rename stability, missing behavior.
2. **Privacy/authorization:** viewer matrix, visibility-first invariant, preview, route closure, cache class.
3. **Domain/data correctness:** status, membership/history, contributions/releases, badges/points, media/story, counts/dedupe.
4. **API/contract integrity:** DTO allowlist, branches/statuses, pagination, cross-layer parity, forbidden-field negatives.
5. **Performance/delivery:** query/payload budgets, bounded lists, stable pages, measured indexes, SSR/image/caching.
6. **Frontend composition/state:** shared view, all content states, local async ownership, progressive enhancement.
7. **Responsive CSS:** geometry, query ownership, mobile/intermediate/wide/zoom, no overflow.
8. **Accessibility:** headings, keyboard/focus, names/state/status, targets, contrast, motion, JS-off order.
9. **Verification/rollout:** fixture manifest, reset/seed, migrations, automated matrices, live UAT, metrics, asset safety.

### Research Flags

**Targeted research/discovery needed:**

- **Phase 2:** product decision on exact badge progress plus source/precedence work for current versus historical membership.
- **Phase 4:** fixture-specific plans, query counts, payload, mutation, and latency measurement before indexes/cursor complexity.
- **Phase 5 only if shared caching is proposed:** complete invalidation matrix across every projection-changing write; otherwise keep `no-store`.
- **Phase 7:** early fixture-manifest audit to prove sparse/dense, privacy, history, media, badge, and layout cases.

**Standard patterns; skip general research-phase:**

- **Phase 1:** PostgreSQL uniqueness/migrations and deny-first authorization are documented; resolve named product decisions and implement.
- **Phase 3:** use the established Team4s SQL/Go/OpenAPI/TypeScript/`api.ts` contract workflow.
- **Phase 6:** local responsive rules, WCAG 2.2, existing primitives, `next/image`, and current verifier are sufficient; use design/verification planning.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Repository/runtime versions and official PostgreSQL, Go, React, Next.js, Redis, Playwright, WCAG sources agree; no dependency gap. |
| Features | HIGH safety/correctness/a11y; MEDIUM performance | Product hierarchy/trust rules are evidenced; list bounds, fixture facts, and production targets need decisions/measurement. |
| Architecture | HIGH boundaries/order; MEDIUM cache/paging | Current gate, routes, N+1, DTO, auth, and CSS seams were traced; cache and cursor choices depend on evidence. |
| Pitfalls | HIGH code risks; MEDIUM policy risks | Risks map to concrete code paths; aggregate privacy and current-membership publication remain product choices. |

**Overall confidence:** HIGH in direction/build order; MEDIUM in unresolved policy and production metrics.

### Gaps to Address

- Lock hidden/missing response semantics across all member routes.
- Decide aggregate privacy and omit ambiguous exact values meanwhile.
- Confirm immutable slug or a separate forward-only change/redirect contract.
- Define public current-membership rules.
- Choose DTO/list/payload budgets from actual consumers and fixtures.
- Measure tie/mutation/volume behavior before pagination selection.
- Record query count, bytes, latency, image waterfall, and lab Web Vitals; field confidence waits for traffic.
- Do not cache until every mutation has a named invalidation path and viewer-isolation evidence.
- Document exact fixture data, credentials/session setup, expected counts/media/long-content/layout cases.
- Prove each candidate index with representative plans.

## Sources

### Research Reports

- [STACK.md](./STACK.md) — versions, non-additions, configuration/schema, official sources.
- [FEATURES.md](./FEATURES.md) — table stakes, differentiators, anti-features, states, hierarchy, acceptance.
- [ARCHITECTURE.md](./ARCHITECTURE.md) — flow, boundaries, joins, query/render/cache strategy, build order.
- [PITFALLS.md](./PITFALLS.md) — privacy, correctness, contract, performance, frontend, rollout risks.
- [PROJECT.md](../PROJECT.md) and repository `AGENTS.md` — goal, constraints, disposable data, ownership, auth, responsive/UAT rules.

### External Primary Sources

- [PostgreSQL unique indexes](https://www.postgresql.org/docs/16/indexes-unique.html) and [EXPLAIN](https://www.postgresql.org/docs/16/sql-explain.html).
- [React cache](https://react.dev/reference/react/cache).
- [Next.js cookies](https://nextjs.org/docs/app/api-reference/functions/cookies), [fetch](https://nextjs.org/docs/app/api-reference/functions/fetch), and [Image](https://nextjs.org/docs/app/api-reference/components/image).
- [OWASP API1:2023](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/).
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow), and [Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible).
- [Core Web Vitals thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds).
- [Google Search URL changes](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes).

---
*Research completed: 2026-08-13*
*Ready for requirements and roadmap: yes*
