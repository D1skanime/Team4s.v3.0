# Pitfalls Research

**Domain:** Brownfield public member-profile hardening
**Project:** Team4s v1.3 Public Member Profile Hardening
**Researched:** 2026-08-13
**Confidence:** HIGH for codebase-specific risks; MEDIUM where public-visibility policy still requires a product decision

## Executive Risk Summary

The highest-risk mistake is treating `/members/[slug]` as one page instead of a public data boundary. The live code has several member-facing read paths, and they do not share one identity/visibility decision. The main handler loads the complete projection before checking `members_only`; the projects handler calls that complete loader and then loads projects again; the routable `/members/:slug/contributions` endpoint is anonymous, derives identity separately from nickname/ID, and does not enforce profile visibility. The public profile's `recent_media` query checks readiness but not public visibility or approval. Hardening only the page would leave sibling paths capable of disclosing or disagreeing about the same member.

The second risk cluster is correctness. Mutable nickname-derived slugs are computed in multiple SQL, Go, and TypeScript implementations. Membership, role, contribution, points, and badge projections use different sources and visibility axes. Exact badge progress can include activity that is not itself public. These can produce broken links, collisions, double counts, misleading history, or aggregate side-channel disclosure.

The third cluster is performance and integration. One profile executes many sequential queries, loads release versions once per project, embeds unbounded history, and repeats the complete profile load for pagination. Offset paging lacks an ID tie-breaker. Hidden-owner preview fabricates public fields from the own-profile DTO, while project pagination state can outlive a slug change. Cache, image, or CSS changes before access and projection contracts stabilize can make the wrong behavior faster and harder to see.

## Critical Pitfalls

### Pitfall 1: Visibility Is Checked After Detail Has Already Been Loaded

**What goes wrong:** A hidden profile returns the small `{"visible":false}` envelope only after memberships, badges, exact progress, points, media, projects, and contributions have been queried. This violates visibility-first access, wastes work, and expands the blast radius of logs, traces, errors, or future response changes.

**Current warning signs:**

- `AppPublicProfileHandler.GetPublicMemberProfile` calls `GetPublicMemberProfile` before comparing viewer identity with `profile.AppUserID`.
- `GetPublicMemberProjects` repeats the complete load before its visibility response.
- Current tests prove response filtering, not that protected loaders were never invoked.

**Prevention:** Add one minimal lookup returning stable slug, member ID, owner app-user ID, status, visibility, and `noindex`. Authorize immediately, then pass the resolved member ID to detail loaders. Make hidden/not-found semantics consistent across subresources.

**Detection and verification:** Spy/query-count tests must prove hidden anonymous and hidden other-user requests invoke zero detail loaders. Capture logs and bodies to prove no badge counts, groups, media paths, or internal IDs appear.

**Phase owner:** **1. Identity, Stable Slug, and Visibility Foundation**.

---

### Pitfall 2: Sibling Public Routes Bypass the Hardened Boundary

**What goes wrong:** Fixing only `GET /api/v1/members/:slug` leaves other routes with different identity, privacy, and not-found behavior. The contributions route is anonymous, derives nickname/numeric identity independently, returns 200-empty for unknown members, and omits profile visibility. It also exposes current app roles based on an assumption that membership is public. The public `recent_media` loader lacks canonical public-visibility and approved-review predicates.

**Prevention:**

- Inventory profile, projects, contributions, anime contributor links, fansub leader links, project-member links, ranking, search, and metadata.
- Route every retained member subresource through the same minimal resolver.
- Apply record-level predicates in addition to profile visibility: public historical membership/role, confirmed/public contribution, and ready + approved + public media.
- Remove unused duplicate paths instead of preserving disposable-row compatibility.
- Keep release media on `release_version_media -> media_assets -> media_files` with a real `release_version_id`; never substitute `release_media` or episode media.

**Warning signs:** A slug route has its own resolver; hidden-member subresources return rows; media SQL lacks `visibilities` or `review_statuses`; comments such as “already public elsewhere” replace an explicit predicate.

**Detection and verification:** Run a route matrix for public, hidden-owner, hidden-other, hidden-anonymous, and missing members. Seed ready-internal, public-unapproved, soft-deleted, and approved-public media. Keep source invariants excluding `release_media`, `episode_media`, and legacy `fansubgroup_id`.

**Phase owner:** **1. Identity, Stable Slug, and Visibility Foundation**.

---

### Pitfall 3: Mutable Nicknames Continue to Act as Identity

**What goes wrong:** Renaming changes the URL, normalization collisions select an arbitrary lower ID, Unicode handling differs across layers, numeric IDs remain enumerable aliases, and links emitted by other projections disagree with the profile route.

**Prevention:** Persist one canonical slug on `members`, enforce database uniqueness, allocate collisions transactionally in the backend identity flow, and resolve only exact stored slugs. Remove normalized-nickname scans and numeric-ID fallback after reset/reseed. Every public link projection must select the stored slug. Default to immutable slugs; redirects require a separate alias/history decision.

**Warning signs:** `REGEXP_REPLACE(nickname...)`, `deriveMemberSlug`, `normalizeMemberProfileSlug`, `slugifyMemberName`, or `/members/3` remains in a public identity path.

**Detection and verification:** Migration up/down and fresh-schema tests; collision/concurrency plus Unicode/punctuation fixtures; nickname rename preserves URL; repository-wide assertion that public member links use stored slug.

**Phase owner:** **1. Identity, Stable Slug, and Visibility Foundation**.

---

### Pitfall 4: Owner Preview Is Reconstructed Client-Side or Cached Under the Wrong Viewer

**What goes wrong:** Owners see a partial/misleading preview, another user receives owner data from a bad cache key, or a refresh-only session looks logged out. `OwnHiddenProfilePreview` currently guesses ownership using numeric/nickname slugs and fabricates `profile_status: active`, zero points, and empty badges. SSR reads only an access-token cookie, so an expired/missing access token with a valid refresh session can render hidden before hydration.

**Prevention:** The backend authorized public projection must be the only owner-preview representation. Do not infer ownership from route text or synthesize fields. Keep viewer-dependent profile/projects `no-store`. Use React `cache()` only for same-request dedupe keyed by stable slug plus viewer/auth context. Keep refresh and bearer handling in the central client/server boundary.

**Warning signs:** Cache key is slug-only; public DTO adapters fill `0` or `[]`; UI reads tokens or gates only on access token; hidden content changes after hydration.

**Detection and verification:** Same-request dedupe and different-viewer isolation tests; anonymous/other/owner-access-token/owner-refresh-only cases; owner preview equals the backend public projection; no token logic outside approved boundaries.

**Phase owner:** **5. Server/Client Access, Cache, Composition, and State**.

---

### Pitfall 5: Historical Membership, Roles, and Contributions Are Blended Without a Rule

**What goes wrong:** Current app membership is presented as historical fact, draft/disputed history looks confirmed, the same role appears twice through current and historical seams, or contribution data attaches to the wrong anime/group/release. Counts then measure a different population from visible cards.

**Prevention:** Define a projection-source matrix: identity from `members`; historical membership from `hist_fansub_group_members`; historical roles from `hist_group_member_roles`; current membership from `fansub_group_members`; public projects from confirmed/public `anime_contributions`; release-native credit from canonical release-version/lifecycle structures. Keep status, visibility, review state, and dates separate. Define precedence and dedupe keys. Preserve `release_version_groups.fansub_group_id` and real release-version ownership.

**Warning signs:** `OR fgm.id IS NOT NULL` publishes current membership without a documented predicate; same-year ended membership renders “seit”; counts and lists disagree; legacy group columns or episode media reappear.

**Detection and verification:** Fixtures for current-only, historical-only, linked, draft/disputed, same-year, open-ended, overlapping, and multi-group membership. Assert unique rows, German period labels, and real anime/group/release-version IDs end to end.

**Phase owner:** **2. Public Projection and Historical Data Correctness**.

---

### Pitfall 6: Badge and Aggregate Values Are Wrong or Too Revealing Publicly

**What goes wrong:** Reversed credits remain visible, private activity changes an exact public count, thresholds drift between Go and TypeScript, similarly named metrics count different things, or the browser becomes a second badge engine.

**Current warning signs:**

- Point milestones are derived in TypeScript while other families are repository-derived.
- `badge_progress.progress` counts confirmed contributions without the public-on-profile predicate.
- `loadContribArchivistCount` counts non-deleted media without approval/visibility filters.
- Exact progress is public whenever the profile is public even if source rows are hidden.
- Threshold/catalog definitions exist in several backend files and `memberBadgeLabels.ts`.

**Prevention:** Decide whether public achievement progress uses all canonical activity or public activity only; exact counts must not accidentally reveal hidden work. Keep lifecycle/ledger and `member_point_totals` authoritative. Return server-owned earned state, count, tier, next threshold, and reversal behavior. Frontend code stays presentation-only. Reuse the same named count functions across profile/dashboard/ranking.

**Detection and verification:** threshold-1/threshold/threshold+1 tests; award/reversal and publish/unpublish/delete/restore tests; hidden-source privacy cases; cross-surface total equality; unknown-code and tier-contract tests.

**Phase owner:** **2. Public Projection and Historical Data Correctness**, with an explicit aggregate-privacy decision.

---

### Pitfall 7: SQL, Go, OpenAPI, TypeScript, and UI Contracts Drift

**What goes wrong:** Required fields become optional, response branches are parsed ad hoc, edit-only media fields become public, or frontend defaults hide backend omissions.

**Current warning signs:**

- OpenAPI requires project/history fields that TypeScript marks optional.
- `PublicMemberBadge.next_tier` omits `platinum`, although role-volume progress can emit it.
- Public background reuses `MemberProfileBackgroundImage`, whose schema permits non-public `source_original_url`.
- Pagination coercion is not clearly contracted.
- Missing-member behavior differs between profile and contributions routes.

**Prevention:** Create a minimal dedicated public DTO; never reuse edit/owner media types. Update SQL scan, Go model, handler envelopes/statuses, `shared/contracts/openapi.yaml`, TypeScript, `api.ts`, and tests in one slice. Remove unused fields/routes. Make present-empty arrays and nullable/optional fields intentional.

**Detection and verification:** Validate OpenAPI against representative visible, hidden, missing, empty, and high-volume JSON fixtures. Compile TypeScript fixtures requiring runtime-required fields. Assert public JSON/schema excludes `source_original_url`, app-user/account fields, internal status, and storage paths. Test status/error/pagination in handler and helper owners.

**Phase owner:** **3. Public DTO and Contract Alignment**.

---

### Pitfall 8: Query Cleanup Leaves N+1 Reads and Fake Pagination

**What goes wrong:** Six cards trigger six release-version queries; “load more” rebuilds the full profile and then reloads projects; prior history is unbounded; cards embed every release version; and OFFSET pages skip/repeat rows when timestamps tie or data changes.

**Prevention:** Stabilize the public DTO first. Replace per-project reads with one set-based query for the page keys. Split identity/visibility from projection loads. Bound every collection and make total/limit/offset or cursor honest. Add unique ordering suffixes (`anime_id`, `fansub_group_id`) or use a keyset cursor if live mutation warrants it. Add indexes only after representative `EXPLAIN (ANALYZE, BUFFERS)`.

**Warning signs:** Query inside `for rows.Next()`; page 2 calls `GetPublicMemberProfile`; count equals `len(allRows)`; order lacks unique suffix; a paged object embeds unbounded children.

**Detection and verification:** Query count independent of card count; equal-timestamp and between-page insert tests; payload budgets and plans for both fixtures; before/after plan evidence for each index.

**Phase owner:** **4. Set-Based Queries, Payload Bounds, and Pagination**.

## Moderate Pitfalls

| Pitfall | Failure / warning signs | Prevention | Verification evidence | Phase owner |
|---------|-------------------------|------------|-----------------------|-------------|
| **Async project state survives a member change** | A delayed slug-A response appends to slug B; duplicates appear; setters run during render. | Key state by stable ID/slug, reset via effect/reducer, abort or sequence requests, dedupe composite project keys. | Rapid navigation with delayed responses; no render-update warning; duplicate-key test. | 5. Frontend State |
| **Persistent cache mixes projections** | Owner/hidden data crosses viewers or stale badges survive mutation. | Start `no-store`; if measured need exists, cache only a separate anonymous DTO by member ID + projection version with exact invalidation. | Viewer isolation, visibility toggle, reversal, invalidation, key inspection. | 5. Cache Separation |
| **CSS hides overflow instead of fixing it** | Global clipping/wrapping hides controls; reusable components use viewport assumptions in narrow columns. | Mobile-first base; page queries for pages, container queries for components; local `min-width:0`/`max-width:100%`. Split the 2,282-line badge CSS without changing domain logic. | 320px/400% reflow; below/above transitions; nested-column tests; zero document overflow. | 6. Responsive CSS |
| **Image optimization becomes SSRF or a quality regression** | Broad remote patterns/global local-IP proxy, 400 optimizer errors, 1920px art for 72px badges, source-original leaks. | Exact origin/path rules, production-safe local-IP config, Next 16 quality allowlist, truthful sizes, dimensions/aspect ratios, cropped public variants only. | Optimizer probes, request waterfall, LCP/CLS trace, negative source scan, production config test. | 6. Image Delivery |
| **Accessibility is judged by screenshots** | Drag-only carousel, obscured focus, duplicate skeleton announcements, bad heading/DOM order, motion despite preference. | Semantic SSR, inert aria-hidden skeletons, keyboard/non-drag alternatives, visible focus, scoped live regions, reduced motion. | Keyboard run, focus captures, accessibility-tree assertions, reduced-motion, JS-off, reflow. | 6. Accessibility |
| **Story rendering bypasses sanitization** | Stored HTML or editor/source JSON is rendered directly. | `RichTextRenderer` remains the only public story renderer; server sanitation is the trust boundary. | Malicious script/event/URL/style fixture and source scan. | 3. Public Contract |
| **Named users are not fixtures** | `sheppert` lives only in dev DB; `csubs-leader` exists mostly in mocks; tokens/rows drift. | Idempotent reset/seed creating exact slugs, visibility variants, memberships, roles, review states, high volume, and credentials/session setup. | Clean reset + seed + API/browser assertions; fixture version recorded. | 7. Fixture UAT |
| **Disposable rows imply disposable migration discipline** | Historical migrations edited, number collision, slug constraint fails, or compatibility code preserves synthetic rows. | Next numbered reversible migration after status/chain check; reset/reseed rows; prove up/down/fresh install. Never delete tracked badge assets in resets. | Migration-chain, up/down, fresh DB, tracked-asset status/hash. | 1 + 7 |
| **Broad cleanup overwrites active badge/carousel work** | Formatting/extraction destroys dirty work and obscures regressions. | Capture baseline, assign ownership, land narrow slices, avoid broad formatters. | Scoped diff, protected asset hashes, focused badge/carousel tests. | Every phase preflight |

## Technical Debt Patterns

| Shortcut | Immediate benefit | Long-term cost | Acceptable? |
|----------|-------------------|----------------|-------------|
| Nickname/ID slug fallbacks | Old links work | Multiple identities and table scans | **No**; rows are disposable |
| Reuse own-profile DTO publicly | Fewer types | Public schema represents private fields | **No** |
| Browser fallback values | UI renders | Contract defects and false preview | **No** |
| Cache full response by slug | Faster repeat | Cross-viewer leak | **Never** |
| Speculative indexes | Easy optimization | Write cost/wrong order | Only with plan evidence |
| Client-filter unbounded history | No endpoint work | Payload/hydration growth | Only for hard-bounded sets |
| Global overflow suppression | Quick screenshot fix | Hidden content/a11y failure | **No** |
| Preserve unused endpoints | Fewer deletions | Routable privacy drift | **No** |

## Performance Traps

| Trap | Symptoms | Prevention | When it breaks |
|------|----------|------------|----------------|
| Sequential profile loaders | Latency sums DB round trips | Minimal gate then few set-based projections | Every request |
| Per-project release query | Query count grows with cards | One query for all page keys | Several projects |
| Full reload on pagination | Repeats badges/history/media | Resolver + project page by member ID | Every page 2 |
| Unbounded history/versions | Large JSON/SSR HTML | Independent bounded pages/totals | Dense fixture |
| OFFSET without unique order | Duplicates/skips | Tie-breaker or keyset | First tie/mutation |
| Oversized images | Slow mobile LCP | Truthful sizes/width candidates | Immediately |
| Eager deep carousel hydration | Main-thread work | SSR content, defer interaction only | Badge-rich profile |

## Security and Privacy Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Treat `noindex` as privacy | It does not restrict access | Backend visibility gate before loading |
| Publish exact aggregates from hidden rows | Activity side channel | Explicit aggregate policy and privacy fixtures |
| Expose source originals/storage paths | Private assets leak | Dedicated public media DTO and negative tests |
| Trust client ownership/roles | Unauthorized preview/actions | Backend identity/capability authority |
| Cache viewer-sensitive responses | Cross-user leak | `no-store`; no tokens in cache keys/logs |
| Broaden image proxy | SSRF/internal network access | Exact production patterns; local IP only isolated |
| Render stored HTML directly | Stored XSS | Server sanitizer + `RichTextRenderer` |

## “Looks Done But Isn’t” Checklist

- [ ] **Visibility-first:** hidden requests return a small envelope and invoke no detail queries.
- [ ] **Route closure:** all member routes and inbound links share slug/visibility policy.
- [ ] **Slug stability:** nickname changes preserve URL; numeric/normalization fallbacks are gone.
- [ ] **Public media:** internal, unapproved, failed, deleted, and source-original assets never appear.
- [ ] **Owner preview:** access-token and refresh-only cases return authoritative values, not zeros.
- [ ] **History:** current/historical/disputed/same-year/overlap/multi-group cases dedupe and label correctly.
- [ ] **Aggregates:** thresholds, reversals, public/private policy, and cross-surface totals are proven.
- [ ] **Contract:** JSON/OpenAPI/TypeScript/helpers agree on fields, enums, errors, and pagination.
- [ ] **Performance:** fixed query count, bounded children, stable order, plans, payload budget.
- [ ] **State:** delayed paging cannot append to another member or duplicate items.
- [ ] **Responsive/a11y:** 320px/400%, long German text, nested width, keyboard, focus, motion, JS-off.
- [ ] **Images:** production-safe config, expected widths, intentional LCP priority, no CLS/source leak.
- [ ] **Fixtures:** clean reset reproduces `sheppert` and `csubs-leader`; fixture/git revisions recorded.
- [ ] **Rollout:** numbered migration passes up/down/fresh install; badge assets remain tracked.

## Recovery Strategies

| Failure | Cost | Recovery |
|---------|------|----------|
| Public leak | HIGH | Disable route/cache, purge cache, install deny-first resolver, audit evidence, restore after matrix tests |
| Slug collision/drift | MEDIUM pre-production | Reset/reseed, fix allocator/constraint, regenerate all link fixtures |
| Badge mismatch | MEDIUM | Select canonical count, remove client derivation, add reversal/boundary fixtures |
| N+1/payload excess | MEDIUM | Capture baseline, implement set-based bounded query, compare fixture results |
| CSS/a11y regression | LOW–MEDIUM | Revert narrow slice, restore semantic DOM, reapply with boundary evidence |
| Non-reproducible UAT | MEDIUM | Discard live-row claims, establish versioned fixtures, rerun API/browser |
| Migration-chain issue | HIGH | Stop; do not edit history. Resolve numbering/ownership and test a new migration |

## Pitfall-to-Phase Mapping

| Roadmap phase | Risks owned | Exit evidence |
|---------------|-------------|---------------|
| **1. Identity, Stable Slug, and Visibility Foundation** | Pitfalls 1–3; migration; route inventory | Unique slug, deny-first query invariant, privacy matrix, migration up/down |
| **2. Public Projection and Historical Data Correctness** | Pitfalls 5–6; ownership; aggregate privacy | Source matrix, period/dedupe, badge boundary/reversal/privacy tests |
| **3. Public DTO and Contract Alignment** | Pitfall 7; public media/story; duplicate removal | Runtime/OpenAPI/TS fixtures, forbidden-field negatives, status parity |
| **4. Set-Based Queries, Payload Bounds, and Pagination** | Pitfall 8 | Constant query count, stable pages, plans, payload budget |
| **5. Server/Client Access, Cache, Composition, and State** | Pitfall 4; async state | Viewer isolation, refresh-only owner, delayed-response tests |
| **6. Responsive CSS, Accessibility, and Image Delivery** | CSS/image/a11y | boundary captures, 400% reflow, keyboard/motion, optimizer/LCP/CLS |
| **7. Fixture-Backed UAT and Rollout** | integration/reproducibility | clean seed, two profiles, anonymous/owner, API/live browser evidence |

**Ordering rationale:** Privacy and stable identity constrain every query and cache key. Projection semantics constrain the DTO. The DTO constrains pagination and frontend composition. CSS/image work should target the final semantic DOM and payload. Fixture-backed UAT closes the milestone only after earlier invariants are reproducible.

## Sources

### Team4s primary sources (HIGH confidence)

- `.planning/PROJECT.md`, `.planning/research/STACK.md`, and `AGENTS.md`
- `docs/architecture/db-schema-fansub-domain.md`
- `docs/engineering/implementation-contract.md`
- `docs/api/api-contracts.md` and `docs/frontend/auth-api-client.md`
- `docs/frontend/ui-system.md` and `docs/agent-guidelines-ui.md`
- `backend/internal/handlers/app_public_profile.go`
- `backend/internal/repository/member_profile_repository.go`
- `backend/internal/repository/anime_contributions_public_repository.go`
- `backend/internal/repository/member_profile_progress_repository.go`
- `backend/internal/repository/member_profile_contribution_badges_repository.go`
- `backend/internal/models/member_profile.go`
- `shared/contracts/openapi.yaml`
- `frontend/src/types/profile.ts`, `frontend/src/lib/api.ts`
- `frontend/src/app/members/[slug]/page.tsx`, `OwnHiddenProfilePreview.tsx`
- `frontend/src/components/profile/MemberCurrentProjectsSection.tsx`
- `frontend/next.config.mjs`, `frontend/scripts/collect-member-profile-evidence.mjs`
- Focused tests and archived Phase 74/99/120 research/evidence

### External primary sources (HIGH confidence)

- React `cache`: https://react.dev/reference/react/cache
- Next.js image optimization: https://nextjs.org/docs/app/getting-started/images
- PostgreSQL `LIMIT/OFFSET`: https://www.postgresql.org/docs/17/queries-limit.html
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- WAI Focus Order: https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html

## Remaining Decisions / Research Flags

- **Aggregate privacy (MEDIUM):** Decide whether exact public badge progress may include non-public contributions/media. Current code includes some such activity by design comments, but silent continuation is unsafe under the milestone privacy goal.
- **Slug rename policy (MEDIUM):** Immutable is recommended. Redirect/alias history is a separate product/schema decision.
- **Pagination (MEDIUM):** Hardened OFFSET may suffice; choose keyset only if measured mutation/page depth warrants the contract cost.
- **Anonymous caching (MEDIUM):** Do not add by default. Revisit only after set-based queries are measured and invalidation has an owner.

---
*Pitfalls research for Team4s v1.3 Public Member Profile Hardening*
