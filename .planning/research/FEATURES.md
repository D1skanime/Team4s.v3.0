# Feature Landscape: Public Member Profile Hardening

**Domain:** Existing public fansub-member profile (`/members/[slug]`)
**Project:** Team4s v1.3 Public Member Profile Hardening
**Researched:** 2026-08-13
**Confidence:** HIGH for project behavior and accessibility; MEDIUM for production performance targets until field data exists

## Product Position

This milestone should make the existing profile dependable, not make it larger. A visitor should immediately understand who the member is, what history is confirmed, which groups and projects are relevant, and which achievements are public. A profile owner should be able to preview a non-public profile without that privileged representation leaking to another viewer or a shared cache.

The established hierarchy remains: identity and headline facts first; story and real memberships second; current public projects third; public achievements fourth; recent and previous contributions last. Hardening should remove contradictory counts, nickname-derived URL churn, hidden-data leaks, unbounded lists, layout instability, and duplicated loading paths without redesigning this hierarchy.

The core trust rule is: public UI only states what the canonical domain can prove. Membership comes from membership records, contributions come from confirmed public contribution/release-role records, badge progress comes from authoritative server projections, and unverified historical material must be labeled or omitted rather than silently promoted to fact.

## Table Stakes

Missing any of these makes the existing profile unsafe, misleading, broken, or materially incomplete.

| Capability | Expected, testable behavior | Complexity | Depends on |
|---|---|---:|---|
| Visibility gate before detail access | Anonymous and unrelated viewers never receive hidden profile fields, section counts, image URLs, badges, memberships, projects, or contribution metadata. The visibility decision occurs before expensive/detail projections. Test the same hidden slug as anonymous, another signed-in member, the verified owner, and an administrator/trustee where policy permits. | High | Viewer identity; canonical owner relation; minimal public DTO |
| Privacy-safe owner preview | The verified owner can open the same public composition while the profile is non-public. A persistent, plain-language banner states that only the owner can see the preview and links to profile settings. Preview data is private/no-store and never reused for anonymous or other-member requests. A refresh-only session must still reach preview/edit through the central auth client. | High | Visibility gate; auth refresh seam; cache partitioning |
| Non-enumerating hidden state | For an unauthorized viewer, a hidden profile reveals no more than a missing/unavailable public profile. The page must not expose the nickname, member ID, reason code, counts, media, or whether an account has claimed it. Automated tests compare response bodies and rendered states for hidden and non-existent slugs, allowing only the intentionally documented public distinction. | Medium | Visibility gate; error contract |
| Stable canonical public slug | A member has one normalized, unique public slug that is not recomputed when display name or nickname changes. Internal member links always emit the canonical slug. If a canonical slug must change after publication, the old URL permanently redirects directly to the new URL and the new page declares itself canonical; do not build legacy-row compatibility merely for disposable test data. | High | Schema/identity decision; slug uniqueness; routing and OpenAPI |
| Explicit minimal public contract | Visible responses use an allow-listed public DTO. They exclude ownership/auth/audit fields, private media metadata, source-original URLs, unpublished items, internal workflow states, and unused legacy arrays. Hidden responses do not serialize the visible DTO. OpenAPI, Go DTOs, handler behavior, TypeScript types, and central API helpers agree exactly. | High | Visibility gate; projection inventory; contract tests |
| Correct identity and status | Hero name, avatar, background, verification marker, active/historical/memorial status, dates, total points, and “Bekannt für” all describe the same member row and authoritative projections. Missing dates remain unknown; the UI never invents “active” from recent content. Memorial uses the approved memorial language and never presents normal activity or quantity gamification. | High | Minimal DTO; status rules; badge/points authority |
| Correct membership semantics | “Gruppenzugehörigkeit” contains only current or historical membership records and roles from the canonical membership tables. A contribution alone never creates membership. Active, former, historical, and memorial context is represented honestly; duplicate current/history joins collapse to one intentional presentation. | High | Complete joins; group/member projection rules |
| Correct project and contribution semantics | Current projects require confirmed, public member involvement in the correct anime/fansub/release-version context. Previous contributions and latest text/media items come from their canonical sources, use correct release links, and never attach release data to neutral episode or anime ownership. Unreviewed or private items do not affect public lists or totals. | High | Release-native domain joins; visibility filters; stable ordering |
| Counts match visible facts | Every count equals the same filtered public dataset shown by the UI. `total`, `limit`, and `offset` have literal meanings; a “more” control appears only when more public rows exist. `sheppert` and `csubs-leader` fixtures assert exact expected counts, unique row keys, and no duplicates across pages. | High | Correct projections; pagination contract; reproducible seed |
| Server-authoritative achievements | Public badges and progress are derived once from authoritative badge/points/contribution data behind the visibility gate. Owner-hidden badges and locked artwork are not exposed as public achievements. The browser may format values but does not recalculate canonical state or create a second badge engine. Memorial rules override normal gamification. | High | Visibility gate; badge service; minimal DTO |
| Durable content hierarchy | DOM and visual order is toolbar/breadcrumb → hero → profile and membership → current projects → achievements → contributions. There is one page `h1`; major sections use `h2`; card/collection titles use `h3`. Empty conditional sections do not leave orphan headings or blank decorative bands. | Medium | Existing composition; complete data states |
| Deliberate empty states | A real zero is not treated as a load failure. Story/membership/project/history areas either show a concise, truthful empty message where absence matters or omit the entire nonessential section. “No public entries” must not imply “the member never did this.” No `0`, “unknown”, placeholder badge, or broken-image tile is fabricated from missing data. | Medium | Explicit null/empty contract; section policy |
| Distinct loading, empty, hidden, not-found, and error states | Initial loading reserves the final hero/section geometry. Hidden/missing is privacy-safe and has no retry loop. A full profile failure gets a page-level error with retry/navigation. Failure of later project pagination stays inside that section, preserves already rendered content, announces the error, and offers retry. Errors are never converted into empty arrays. | Medium | Typed error envelope; shared UI states; progressive loading |
| Honest pagination and incremental loading | Long project/contribution collections render an initial useful slice and retrieve additional stable pages. Loading disables duplicate requests; retry repeats the same cursor/offset; appended items keep deterministic order and do not repeat. Reaching the end removes/disables the control and announces the new result count. | Medium | Counts; stable sort/tie-breaker; section state |
| Safe cache behavior | Anonymous public results may be cached with deliberate invalidation. Owner preview, authenticated variants, and hidden decisions are never put in shared public cache. Metadata and page render deduplicate the same viewer-scoped request, while different viewer identities cannot share a key. A privacy regression test runs anonymous → owner → anonymous in one suite. | High | Visibility gate; auth/session identity; cache policy |
| Efficient first render | Toolbar, hero, story, and memberships are server-rendered and readable on first response with no client data waterfall. Below-fold carousels may delay expensive interaction but their content remains in SSR HTML. The page does not issue per-card/per-badge requests or duplicate metadata/page profile reads. | High | Consolidated loader; bounded DTO; batch projections |
| Responsive image delivery | Background and avatar reserve dimensions and are discovered early; project and badge art load lazily with truthful `sizes`. The browser receives a suitable cached derivative rather than an original far larger than the rendered slot, with a safe fallback. Private/source-original URLs never appear in public markup. | Medium | Media visibility; image URL normalization; fixed geometry |
| Mobile-first reflow | At narrow width the page is one column, actions wrap, the hero remains readable, long German content wraps naturally, carousels/collections remain operable, and the document has no horizontal overflow. At intermediate widths pairs stack before their minimum geometry fails. Test 320/390 CSS px, the actual transition immediately below/above, 768-ish width, and browser zoom/reflow. | Medium | Existing CSS boundaries; component container queries |
| Deliberate widescreen density | The existing shared shell remains capped/aligned (currently 1480 px); sections use consistent edges and readable line lengths. Story/membership and recent/previous contributions use balanced pairs only when content and minimum geometry fit; projects and achievements stay full-width. Widescreen adds useful density, not oversized whitespace or stretched text. | Medium | Mobile base; content geometry; existing page rhythm |
| Keyboard and assistive-technology operation | Every link/button/carousel control is reachable in logical order, has an accessible name and visible focus, and exposes pressed/current/expanded/disabled state. Progress bars expose name/value/max; decorative art has empty alt while meaningful identity/project images have useful alternatives. Dynamic load/error/result messages are announced without stealing focus. | Medium | Semantic components; focus/status patterns |
| Perceivable status and controls | Status, earned/locked/current badge state, errors, and verification are not communicated by color or artwork alone. Text meets WCAG AA contrast, controls have at least 24×24 CSS px targets or sufficient spacing, and reduced-motion users do not receive necessary information only through animation. | Medium | UI tokens; accessible labels; motion policy |
| Reproducible public UAT | Seed/reset produces stable `sheppert` and `csubs-leader` profiles with documented expected sections, counts, membership/history shapes, badge families, media, and long-content cases. UAT covers anonymous, owner preview, another signed-in viewer, missing slug, narrow/intermediate/wide/zoom, keyboard, network error, pagination, image waterfall, and no horizontal overflow. | Medium | Disposable deterministic seed; acceptance manifest; live Compose app |

## Content Hierarchy and Section Policy

| Order | Surface | Must communicate | Empty/hidden behavior |
|---:|---|---|---|
| 1 | Breadcrumb and quiet actions | Current member context; owner edit when authorized; secondary “Korrektur melden” | Owner-only actions are absent, not disabled, for other viewers. Hidden pages expose no member breadcrumb label. |
| 2 | Hero | Public identity, status, verification, activity period, points, concise “Bekannt für”, avatar/background | Missing optional image uses a stable neutral fallback. Unknown activity data is omitted or labeled unknown, never guessed. Memorial replaces normal activity/gamification language. |
| 3 | Profil und Mitgliedschaft | Moderated story plus canonical current/historical group relationships | Keep the major section only if policy calls for a meaningful public-empty explanation; do not show “no memberships” when membership data is merely private or unavailable. |
| 4 | Fansub-Projekte | Current confirmed public anime/fansub work with roles and release-version context | Show a concise public-empty state if this is an expected anchor. Paginate only when `total > initial items`. |
| 5 | Auszeichnungen | Earned/public badge families and authoritative progress presentation | Omit empty earned-only families; do not reveal private badges or substitute locked art for an earned fact. Memorial suppresses disallowed gamification. |
| 6 | Beiträge | Latest public text/media and collapsed prior contribution periods | Omit the whole band when both sources are truly empty. A secondary fetch failure is an error, not “no contributions.” |

Content should preserve a factual reading even with CSS, images, and JavaScript unavailable: identity and headings remain coherent; interactive enhancement never becomes the only path to the information.

## State Contract

| State | Visitor sees | Must not happen | Verification |
|---|---|---|---|
| Loading | Stable, section-shaped placeholders or server content; reserved hero/media dimensions | Blank page, spinner-only layout, skeleton size jump, duplicate accessible skeleton/content | Slow-network trace; CLS check; screen-reader tree |
| Visible, complete | Full ordered public composition and accurate controls/counts | Private/unreviewed fields, contradictory totals, per-card waterfalls | API snapshot + DOM assertions for both fixtures |
| Visible, sparse | Identity plus only relevant sections; concise qualified empty copy | Empty card grids, orphan headers, statements stronger than evidence | Sparse seeded fixture/component cases |
| Hidden, unauthorized | Generic unavailable public state and safe navigation | Member name, ID, owner status, hidden reason, counts, media URL, distinct cache trace | Compare anonymous/other viewer against missing slug |
| Hidden, owner preview | Same public composition with persistent private-preview banner and settings action | Shared caching, admin fields, preview mistaken for published state | Owner/anonymous cache-isolation test; refresh-only session UAT |
| Not found | Generic member-not-available state with correct HTTP/metadata behavior | HTTP 200 with an empty profile/timeline, irrelevant redirect | Unknown slug API/page tests |
| Primary error | Scoped page error, retry and safe navigation | “not found” for server outage; partial identity assembled from stale fragments | Forced API 5xx/timeout test |
| Secondary page error | Existing profile remains; affected list shows local error and retry | Whole-page teardown; silently shortened total; duplicate append after retry | Fail next-page request then retry |

## Differentiators

These are valuable because Team4s presents historical community facts, but they come after the safety and correctness table stakes.

| Feature | Value proposition | Testable behavior | Complexity | Depends on |
|---|---|---|---:|---|
| Trust-aware historical language | Makes incomplete fansub history credible without pretending uncertainty is fact | Confirmed memberships/contributions have normal prominence; unverified historical mentions are explicitly qualified or absent; unknown dates do not become synthetic ranges | Medium | Review/status projection |
| Preview exactly what the public will see | Gives owners confidence without introducing a second preview page | Hidden owner preview uses the same public DTO and section composition as published view, differing only in preview banner/cache policy; publishing removes the banner without changing layout | Medium | Visibility gate; shared composition |
| Canonical-link durability | Lets profiles be shared in archives, group pages, and external references without nickname churn | Change nickname/display name and prove all internal links still resolve one canonical profile; any authorized slug change is a direct permanent redirect | High | Stable slug identity |
| Density that follows content geometry | Preserves the highly visual profile on both compact and widescreen layouts | A component placed in a narrow container uses its narrow composition even in a wide viewport; wide pairs activate only when measured minimum geometry fits | Medium | Container-responsive components |
| Progressive depth without content loss | Heavy badges and historical collections feel fast while remaining indexable and accessible | Initial HTML contains names, values, and section headings; expensive carousel behavior activates near view; no layout shift or duplicate accessible tree occurs | High | SSR composition; reserved geometry |
| Fixture-backed data confidence | Turns two known real-world profiles into repeatable release evidence | A checked acceptance manifest documents why each fixture exists and asserts expected identity, counts, roles, memberships, badges, media, pagination, and responsive edge cases after every reset | Medium | Deterministic disposable seed |

## Anti-Features

| Anti-feature | Why avoid | What to do instead |
|---|---|---|
| Broad visual redesign | Hides correctness work inside subjective churn and risks the already validated profile language | Preserve the established hero, section order, bands, badge collections, and global UI patterns; change only what hardening requires |
| Nickname-derived runtime slug | Renaming identity breaks bookmarks and creates inconsistent links across joins | Persist one canonical public slug independent of display values |
| Legacy alias/backfill machinery for synthetic rows | Existing data is disposable and compatibility code would outlive its value | Change schema if needed, then reset/reseed test data; retain redirects only for URLs intentionally published after the new contract |
| Client-side privacy filtering | Sensitive detail has already crossed the trust boundary | Authorize and project on the server before serializing any detail |
| Distinct rich “private profile” disclosure | Enables profile enumeration and leaks existence/ownership clues | Use a generic unavailable state for unauthorized viewers; show detail only to the verified owner preview |
| Shared caching of viewer-sensitive responses | Can leak an owner preview or hidden decision to another viewer | Partition by visibility/auth identity and keep private responses out of shared caches |
| Full internal member object as public DTO | Encourages accidental exposure and makes every internal change a public contract change | Maintain a minimal allow-listed public projection |
| Browser-derived memberships, points, or badges | Creates contradictory “truth” and repeats canonical domain logic | Return authoritative server projections and format only in the UI |
| Contribution-as-membership inference | Misrepresents helpers as group members | Keep membership and contribution sources and labels separate |
| Release media attached to anime/episode/member shortcuts | Breaks canonical ownership and produces false project history | Follow release/release-version/group/member media ownership seams |
| Memorial gamification or normal activity copy | Conflicts with the locked memorial product policy | Use memorial-specific status language and suppress disallowed quantity progress |
| Load-everything profile payload | Inflates response, query count, render work, and image traffic | Return bounded initial slices plus truthful counts and incremental pagination |
| Fake pagination | A “more” button over a fully loaded array or a total from another filter breaks user trust | Page the authoritative query with deterministic sort and matching total |
| Error-as-empty fallback | Tells users there is no history when the system actually failed | Model error separately and provide scoped retry |
| Client-only below-fold content | Removes history from first HTML and makes access depend on hydration | SSR the content; defer only expensive interaction and noncritical images |
| Device-name breakpoints and horizontal-scroll repair | Components fail in side columns/zoom and overflow bugs remain hidden | Derive transitions from minimum geometry; use container queries for reusable components and fix the owning layout |
| Profile-local copies of generic cards, states, pagination, or carousel | Adds another maintenance seam and inconsistent accessibility | Reuse/extend global UI primitives while keeping member-domain composition local |
| New profile route, profile model, badge engine, or auth client | Parallel systems drift and violate the brownfield milestone | Consolidate the existing route, projections, components, and central client |

## Feature Dependencies

```text
Canonical member identity + stable slug
                |
Viewer identity -> visibility gate -> minimal public DTO
                                  |
                    correct canonical joins/status
                                  |
           ordered content + truthful counts/states
                      /                       \
       pagination/cache/query bounds      responsive images/SSR
                      \                       /
                 accessible responsive composition
                                  |
                  deterministic fixture UAT
```

Dependency rules:

1. Do not optimize or cache a projection whose visibility boundary is not settled.
2. Do not tune pagination or UI counts before the public filters and joins produce one authoritative dataset.
3. Do not consolidate frontend types before the minimal public DTO is agreed across database, Go, OpenAPI, helper, and TypeScript layers.
4. Do not mark responsive polish complete before sparse, dense, error, pagination, and owner-preview states have stable DOM/content policy.
5. Do not preserve compatibility for disposable rows; reset/reseed after the canonical slug/projection decisions.

## MVP Recommendation for v1.3

Prioritize in this order:

1. **Identity, slug, and privacy boundary** — canonical slug, server-side visibility gate, owner preview, safe hidden/not-found behavior, cache isolation.
2. **Public truth contract** — minimal DTO, correct joins/statuses, matching counts, canonical badge/points sources, contract alignment.
3. **Bounded delivery and states** — stable pagination, no duplicate request fan-out, scoped empty/loading/error behavior, safe cache/invalidation, responsive images.
4. **Accessible responsive composition** — preserve hierarchy, fix narrow/intermediate/wide geometry, keyboard/focus/status semantics, reduced motion and no overflow.
5. **Reproducible release proof** — deterministic `sheppert` and `csubs-leader` seed expectations plus automated and live UAT.

Defer:

- New profile customization, social/follow features, comments, public editing, new achievement families, new content sections, or general navigation redesign: none is necessary to prove the hardening goal.
- Production-data slug backfill/alias migration: test rows are disposable; only design the forward-stable canonical behavior now.
- Advanced infinite scrolling or personalization: explicit incremental loading is easier to understand, test, and make accessible.

## Acceptance Baseline

The milestone is product-complete only when all of the following are reproducible:

- Anonymous public views of both fixtures show the documented identity, memberships, projects, achievements, and contributions with exact matching totals.
- A hidden profile reveals no detail to anonymous or unrelated authenticated viewers, while its verified owner gets a clearly marked preview through a valid access-token or refresh-only session.
- Changing a display name does not change the canonical public URL or links generated elsewhere.
- Unknown slug, hidden slug, primary failure, sparse data, and next-page failure render the intended distinct/safe states.
- At narrow, transition, intermediate, and wide geometry plus zoom, there is no document-level horizontal overflow, focus remains visible, content order remains logical, and controls remain operable.
- The first response includes meaningful profile content; additional list requests are bounded; there is no per-item waterfall; images reserve space and use appropriate variants.
- Core Web Vitals use the current “good” targets as a production objective at the 75th percentile: LCP at or below 2.5 s, INP at or below 200 ms, and CLS at or below 0.1. Until field traffic is available, record lab evidence and treat the confidence as MEDIUM rather than claiming a production pass.

## Sources

### Project sources (HIGH confidence)

- `.planning/PROJECT.md` — active v1.3 goal, constraints, disposable-data policy, and fixture decision.
- `.planning/milestones/v1.2-DISCUSSION.md` — locked member/membership/contribution/memorial/media/API domain decisions.
- `AGENTS.md` — privacy-first loading, central auth refresh, canonical ownership, responsive and UAT rules.
- `docs/frontend/ui-system.md` — mobile-first geometry, container-query ownership, global components, and established public UI patterns.
- `docs/agent-guidelines-ui.md` — narrow/transition/wide/zoom/no-overflow verification requirements.
- `frontend/src/app/members/[slug]/page.tsx`, `frontend/src/types/profile.ts`, `frontend/src/lib/api.ts` — current hierarchy, response shape, request/cache behavior, and pagination seams.
- `backend/internal/handlers/app_public_profile_test.go` and `backend/internal/repository/*member*` — existing owner-preview boundary and nickname-derived slug evidence.
- Archived Phase 120 research — validated SSR, image, geometry, cache-isolation, and live fixture observations from 2026-08-04.

### External authoritative sources

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) — AA contrast, resize, reflow, keyboard, and status requirements. HIGH confidence.
- [W3C: Understanding Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow) — readable reflow without two-dimensional scrolling and interaction with zoom. HIGH confidence.
- [W3C: Understanding Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible) and [Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value) — keyboard focus and programmatic control semantics. HIGH confidence.
- [W3C: Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) — 24×24 CSS px minimum or spacing exception. HIGH confidence.
- [web.dev: Core Web Vitals thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds) — LCP/INP/CLS “good” thresholds and 75th-percentile assessment. HIGH confidence for thresholds; MEDIUM for Team4s attainment until field measurement.
- [OWASP API1:2023 Broken Object Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/) — object-level authorization must be enforced for every requested object. HIGH confidence.
- [Google Search Central: URL changes](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes) — direct permanent redirects, canonical URLs, internal-link updates, and avoidance of redirect chains. HIGH confidence.

## Confidence and Open Product Decisions

| Area | Confidence | Remaining decision |
|---|---|---|
| Existing content hierarchy and domain ownership | HIGH | None; preserve it |
| Visibility/owner-preview principle | HIGH | Decide whether hidden and missing are byte/status-identical or only equally non-disclosing, then lock the contract |
| Stable slug product behavior | HIGH | Choose canonical slug generation and who, if anyone, may change it after publication |
| Exact public DTO fields and list bounds | MEDIUM | Inventory actual consumers before removal; set initial/page sizes from fixture volume |
| Accessibility behavior | HIGH | Automated coverage must still be supplemented by keyboard/screen-reader/live review |
| Responsive composition | HIGH | Record minimum viable geometry for each touched component rather than adopting universal breakpoints |
| Core Web Vitals attainment | MEDIUM | Needs representative lab traces now and field monitoring after deployment |
| Fixture coverage | MEDIUM | Document the exact seeded facts each fixture is intended to exercise before roadmap requirements are frozen |
