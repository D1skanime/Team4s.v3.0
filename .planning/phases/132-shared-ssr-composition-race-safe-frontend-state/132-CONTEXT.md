# Phase 132: Shared SSR Composition & Race-Safe Frontend State - Context

**Gathered:** 2026-08-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 132 makes the public profile and the owner preview render the SAME authoritative
composition off the SAME Phase-130 DTO, while request, session, paging, and interaction
state become centralized and race-safe. It consolidates the scattered client owner/viewer
resolution into one central seam, extracts one reusable slug-keyed cancellable state hook,
moves summary aggregates to server authority over the full dataset, and adds member-specific
privacy-safe metadata, progressive disclosure, and hydration-stable relative dates.

This phase is FRONTEND composition/state only. It does NOT: re-shape the DTO/enums/typed
branches (Phase 130); change pagination bounds or performance budgets (Phase 131, whose
set-based full-set computation this phase's aggregates depend on); do responsive/accessible/
image-budget VISUAL delivery (Phase 133); or run the bundled clean-state live UAT (Phase 134).
A separate `/gsd:ui-phase 132` (UI-SPEC.md) may follow for the visual design contract.

</domain>

<decisions>
## Implementation Decisions

### SSR composition & central session path (PMFE-01, PMFE-02, PMFE-10)
- **D-01 (Keep anonymous SSR + client owner-upgrade):** The existing shape stays - page.tsx
  SSRs MemberProfileContent for public profiles; a hidden profile yields neutral 404 ->
  not-found.tsx -> OwnHiddenProfilePreview (client) re-fetches with the owner token and upgrades
  to the SAME MemberProfileContent preview when is_owner. PMFE-01 (same composition + same
  Phase-130 DTO) is preserved. No move to pure client rendering (it would sacrifice SSR/SEO).
- **D-02 (One central viewer/session seam):** All client-side owner/viewer resolution
  consolidates into ONE central hook/seam (e.g. useMemberViewer) shared by
  OwnHiddenProfilePreview and OwnProfileEditLink - a single deduplicated getMemberProfile
  request, NO duplicate getOwnProfile logic (PMFE-02), race-safe and fail-closed (uncertain =>
  not owner) (PMFE-10).

### Race-safe, slug-keyed state (PMFE-03, PMFE-04, PMFE-10)
- **D-03 (Shared slug-keyed cancellable hook):** Extract the requestKey + active-flag +
  last-write-wins pattern already proven in OwnHiddenProfilePreview into ONE reusable hook
  (slug-keyed request key, AbortController/active guard, dedup by unique backend row id,
  last-write-wins). Apply it to every interactive section: current-projects paging,
  FocalCarousel, story/badge expansion.
- **D-04 (Pure updaters, stable keys):** State updaters MUST be pure - never mutate a ref inside
  a setState updater (React StrictMode double-invokes; ref mutation breaks dedup while tests
  stay green). List items key on a unique backend row id, never the array index.
- **D-05 (Distinct, correctly-scoped states):** hidden and missing are whole-profile outcomes at
  the PAGE level and stay non-distinguishable (Phase-128 lock). loading, empty, and error render
  LOCALLY per section - a failed continuation load in one section shows an in-section error, not
  a broken whole page (PMFE-04).

### Server-authoritative aggregates (PMFE-11)
- **D-06 (Full-set server aggregates):** Top roles, known groups, active-year span, and totals
  are computed SERVER-SIDE from the complete approved dataset and delivered authoritatively in
  the DTO (like total_points), so Phase-131 pagination can never corrupt them. deriveKnownFor
  becomes a thin renderer or is removed; the client renders, it does not aggregate.
- **D-07 (New aggregate fields follow the 130 contract):** Any DTO field added for these
  aggregates follows the Phase-130 allow-list discipline - typed in parity across Go, OpenAPI,
  TS, and api.ts, and covered by the forbidden-field/schema contract test. Cross-phase
  coordination note for the planner.

### Metadata, progressive disclosure & stable dates (PMFE-07, PMFE-08, PMFE-09)
- **D-08 (Member-specific, privacy-safe metadata):** generateMetadata produces a member-specific
  title and description from PUBLICLY-permissible facts only (fansub name, top roles/groups/
  active years) plus OG tags. Hidden/noindex profiles KEEP the existing neutral noindex metadata
  (PMFE-07) - the non-distinguishability and privacy locks are preserved.
- **D-09 (Progressive disclosure, content stays accessible):** Long member stories and large
  badge/achievement collections use progressive disclosure (visually clamped with a "mehr
  anzeigen" expand) via the shared @/components/ui primitives, but the FULL content stays in the
  DOM (only visually bounded) so accessibility and SEO lose nothing (PMFE-08).
- **D-10 (Hydration-stable relative dates):** Relative dates are computed against ONE
  server-provided reference timestamp threaded down as a prop, so SSR and hydration produce
  identical output; render never depends on an uncontrolled Date.now() (PMFE-09).

### Consolidation & comments (PMFE-05, PMFE-06)
- **D-11 (Consolidate repeated seams, comment invariants only):** Repeated badge configuration,
  derivations, formatting, and UI controls consolidate onto existing shared seams
  (memberBadgeLabels, badgeArtwork, the D-03 hook, shared formatters) rather than being
  duplicated (PMFE-05). Non-obvious privacy/aggregation/state invariants get short purpose
  comments; self-explanatory JSX is not over-commented (PMFE-06).

### Claude's Discretion
- Exact hook name/signature and file location; exact central viewer-seam API.
- Clamp thresholds for progressive disclosure; exact metadata description composition.
- Whether the server reference timestamp rides in the DTO or a layout/context provider.
- Which components move to shared formatters and their naming.
- Reuse of existing primitives (RichTextRenderer, FocalCarousel) per ROADMAP.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone scope, requirements, and prior decisions
- .planning/PROJECT.md - v1.3 goal, brownfield/privacy constraints, global UI-primitives mandate.
- .planning/ROADMAP.md - Phase 132 goal, deliverables, success criteria, downstream separation.
- .planning/REQUIREMENTS.md - locked Phase 132 requirements PMFE-01 through PMFE-11.
- .planning/DECISIONS.md - v1.3 fixture-driven verification + bundled Phase-134 live UAT (2026-08-14).
- .planning/phases/130-public-dto-cross-layer-contract-alignment/130-CONTEXT.md - the single DTO both public + preview consume (PMFE-01); allow-list discipline for D-07 aggregate fields.
- .planning/phases/131-set-based-delivery-pagination-performance-budgets/131-CONTEXT.md - pagination + full-set computation that D-06 aggregates must derive from (PMFE-11).
- .planning/phases/128-... /128-CONTEXT.md - hidden/missing non-distinguishability lock (D-05, D-08).

### Frontend rules & seams (Plan-time read first, from ROADMAP)
- docs/frontend/auth-api-client.md - central refresh-capable session/request client (the seam behind D-02).
- frontend/src/lib/api.ts - getMemberProfile / PublicMemberProfileResponse; central client.
- frontend/src/lib/useAuthSession.ts - client auth/session hook used by OwnHiddenProfilePreview.
- frontend/src/app/members/[slug]/page.tsx - SSR entry + generateMetadata (empty today; D-08).
- frontend/src/app/members/[slug]/not-found.tsx - hidden-profile owner-upgrade entry.
- frontend/src/app/members/[slug]/OwnHiddenProfilePreview.tsx - proven requestKey/active pattern (source for D-03) + client owner resolution (D-02).
- frontend/src/app/members/[slug]/OwnProfileEditLink.tsx - second viewer resolver to consolidate (D-02).
- frontend/src/app/members/[slug]/MemberProfileContent.tsx - the shared composition (PMFE-01).
- frontend/src/components/profile/deriveKnownFor.ts - client aggregation to move server-side (D-06).
- frontend/src/components/profile/MemberCurrentProjectsSection.tsx, MemberBadgeChain.tsx,
  LatestContributionsSection.tsx, PreviousContributionsSection.tsx, MemberStorySection.tsx,
  memberBadgeLabels.ts, badgeArtwork.ts - interactive/formatting sections for D-03/D-09/D-11.
- frontend/src/components/ui - global primitives (mandatory; D-09) + FocalCarousel, RichTextRenderer.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- MemberProfileContent is ALREADY the single shared composition rendered by both SSR (page.tsx)
  and owner preview (OwnHiddenProfilePreview) - PMFE-01 is largely met; this phase hardens it.
- OwnHiddenProfilePreview already implements slug-keyed + cancellable + last-write-wins
  (requestKey = [slug, isClientInitialized, hasAuthSession, retryKey]; active flag; state.key
  guard) - the exact pattern D-03 extracts into a shared hook.
- deriveKnownFor.ts (TOP_ROLES_LIMIT = 3) is the client aggregation D-06 moves server-side.
- @/components/ui primitives + design tokens are mandated project-wide (Button/SectionHeader/
  LoadingState/ErrorState already used) - D-09 builds on them.

### Established Patterns
- Anonymous SSR + client owner-upgrade via not-found.tsx (already the intended shape - D-01).
- React StrictMode: setState updaters must be pure; list items need a unique backend row id
  (D-04) - prior regressions came from ref mutation in updaters.
- Central refresh-capable browser client keeps UI token-free (docs/frontend/auth-api-client.md).

### Integration Points / Known Gaps to Fix
- Duplicate viewer resolution: OwnHiddenProfilePreview and OwnProfileEditLink each resolve
  owner/viewer independently -> consolidate (D-02).
- generateMetadata returns mostly {} -> member-specific metadata missing (D-08).
- Relative-date rendering must not depend on uncontrolled Date.now() (hydration mismatch) (D-10).
- RecentContributionsSection.tsx / RecentMediaSection.tsx still exist but are no longer composed
  by MemberProfileContent -> dead components; coordinate their removal with the Phase-130 Recent*
  cleanup rather than leaving orphans.

</code_context>

<specifics>
## Specific Ideas

- Concrete seam to generalize: OwnHiddenProfilePreview requestKey =
  [slug, isClientInitialized, hasAuthSession, retryKey] with an active-flag cleanup.
- Concrete gap: generateMetadata in page.tsx returns {} for visible profiles (no title/desc).
- Concrete aggregation to relocate: deriveKnownFor (top roles / known groups / active years),
  which must reflect the COMPLETE approved dataset, never the first paginated project page.

</specifics>

<deferred>
## Deferred Ideas

- Responsive layout, accessibility polish, image variants/sizes/compression, and visual rhythm
  are Phase 133 (PMPF-06, PMPF-08, PMUI-*, PMA11Y-*) - this phase is composition/state, not pixels.
- The visual design contract (UI-SPEC.md) is a separate optional `/gsd:ui-phase 132` artifact.
- Introducing shared public caching stays a Phase-131 measurement-gated decision, not here.
- Bundled cross-phase live UAT is Phase 134.

</deferred>

---

*Phase: 132-shared-ssr-composition-race-safe-frontend-state*
*Context gathered: 2026-08-14*
