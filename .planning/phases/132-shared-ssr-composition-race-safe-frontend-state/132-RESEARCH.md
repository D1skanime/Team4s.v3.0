# Phase 132: Shared SSR Composition & Race-Safe Frontend State - Research

**Researched:** 2026-08-15
**Domain:** Next.js 16 App Router SSR/CSR composition, React 18 race-safe client state, TypeScript
**Confidence:** HIGH (all findings grounded in direct codebase reading; no external library research needed — this phase adds zero new dependencies)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**SSR composition & central session path (PMFE-01, PMFE-02, PMFE-10)**
- D-01 (Keep anonymous SSR + client owner-upgrade): The existing shape stays — `page.tsx` SSRs `MemberProfileContent` for public profiles; a hidden profile yields neutral 404 → `not-found.tsx` → `OwnHiddenProfilePreview` (client) re-fetches with the owner token and upgrades to the SAME `MemberProfileContent` preview when `is_owner`. PMFE-01 (same composition + same Phase-130 DTO) is preserved. No move to pure client rendering (it would sacrifice SSR/SEO).
- D-02 (One central viewer/session seam): All client-side owner/viewer resolution consolidates into ONE central hook/seam (e.g. `useMemberViewer`) shared by `OwnHiddenProfilePreview` and `OwnProfileEditLink` — a single deduplicated `getMemberProfile` request, NO duplicate `getOwnProfile` logic (PMFE-02), race-safe and fail-closed (uncertain => not owner) (PMFE-10).

**Race-safe, slug-keyed state (PMFE-03, PMFE-04, PMFE-10)**
- D-03 (Shared slug-keyed cancellable hook): Extract the requestKey + active-flag + last-write-wins pattern already proven in `OwnHiddenProfilePreview` into ONE reusable hook (slug-keyed request key, AbortController/active guard, dedup by unique backend row id, last-write-wins). Apply it to every interactive section: current-projects paging, FocalCarousel, story/badge expansion.
- D-04 (Pure updaters, stable keys): State updaters MUST be pure — never mutate a ref inside a setState updater (React StrictMode double-invokes; ref mutation breaks dedup while tests stay green). List items key on a unique backend row id, never the array index.
- D-05 (Distinct, correctly-scoped states): `hidden` and `missing` are whole-profile outcomes at the PAGE level and stay non-distinguishable (Phase-128 lock). `loading`, `empty`, and `error` render LOCALLY per section — a failed continuation load in one section shows an in-section error, not a broken whole page (PMFE-04).

**Server-authoritative aggregates (PMFE-11)**
- D-06 (Full-set server aggregates): Top roles, known groups, active-year span, and totals are computed SERVER-SIDE from the complete approved dataset and delivered authoritatively in the DTO (like `total_points`), so Phase-131 pagination can never corrupt them. `deriveKnownFor` becomes a thin renderer or is removed; the client renders, it does not aggregate.
- D-07 (New aggregate fields follow the 130 contract): Any DTO field added for these aggregates follows the Phase-130 allow-list discipline — typed in parity across Go, OpenAPI, TS, and `api.ts`, and covered by the forbidden-field/schema contract test. Cross-phase coordination note for the planner.

**Metadata, progressive disclosure & stable dates (PMFE-07, PMFE-08, PMFE-09)**
- D-08 (Member-specific, privacy-safe metadata): `generateMetadata` produces a member-specific title and description from PUBLICLY-permissible facts only (fansub name, top roles/groups/active years) plus OG tags. Hidden/noindex profiles KEEP the existing neutral noindex metadata (PMFE-07) — the non-distinguishability and privacy locks are preserved.
- D-09 (Progressive disclosure, content stays accessible): Long member stories and large badge/achievement collections use progressive disclosure (visually clamped with a "mehr anzeigen" expand) via the shared `@/components/ui` primitives, but the FULL content stays in the DOM (only visually bounded) so accessibility and SEO lose nothing (PMFE-08).
- D-10 (Hydration-stable relative dates): Relative dates are computed against ONE server-provided reference timestamp threaded down as a prop, so SSR and hydration produce identical output; render never depends on an uncontrolled `Date.now()` (PMFE-09).

**Consolidation & comments (PMFE-05, PMFE-06)**
- D-11 (Consolidate repeated seams, comment invariants only): Repeated badge configuration, derivations, formatting, and UI controls consolidate onto existing shared seams (`memberBadgeLabels`, `badgeArtwork`, the D-03 hook, shared formatters) rather than being duplicated (PMFE-05). Non-obvious privacy/aggregation/state invariants get short purpose comments; self-explanatory JSX is not over-commented (PMFE-06).

### Claude's Discretion
- Exact hook name/signature and file location; exact central viewer-seam API.
- Clamp thresholds for progressive disclosure; exact metadata description composition.
- Whether the server reference timestamp rides in the DTO or a layout/context provider.
- Which components move to shared formatters and their naming.
- Reuse of existing primitives (`RichTextRenderer`, `FocalCarousel`) per ROADMAP.

### Deferred Ideas (OUT OF SCOPE)
- Responsive layout, accessibility polish, image variants/sizes/compression, and visual rhythm are Phase 133 (PMPF-06, PMPF-08, PMUI-*, PMA11Y-*) — this phase is composition/state, not pixels.
- The visual design contract (UI-SPEC.md) is a separate optional `/gsd:ui-phase 132` artifact (already produced, approved 2026-08-15 — see UI-SPEC below).
- Introducing shared public caching stays a Phase-131 measurement-gated decision, not here.
- Bundled cross-phase live UAT is Phase 134.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PMFE-01 | Öffentliches Profil und Owner-Vorschau verwenden dieselbe Profilkomposition und denselben Backend-DTO. | Confirmed already true: `MemberProfileContent.tsx` is the single component rendered by both `page.tsx` (SSR) and `OwnHiddenProfilePreview.tsx` (client), both fed by `PublicMemberProfileResponse` from `getMemberProfile`. Harden, don't rebuild. See Architecture Patterns. |
| PMFE-02 | Profil-, Owner- und Korrekturaktionen verwenden einen zentralen Request- und Session-Pfad ohne doppelte `getOwnProfile`-Logik. | Found THREE independent owner/viewer resolvers, not two: `OwnHiddenProfilePreview.tsx`, `OwnProfileEditLink.tsx`, AND `CorrectionReportModal.tsx` (calls `getOwnProfile()` independently to hide the correction button on one's own profile). See Don't Hand-Roll / Code Examples. |
| PMFE-03 | Paging, Carousel und Erweiterungszustände sind sluggebunden, abbrechbar, dedupliziert und gegen veraltete Antworten geschützt. | Two proven, reusable AbortController-based hook patterns already exist in the codebase (`useDebouncedSearch.ts`, `useProjectMemberCollection.ts`) that are stronger precedent than `OwnHiddenProfilePreview`'s active-flag pattern. `getMemberProjects` currently has NO `signal` parameter — must be added. See Code Examples. |
| PMFE-04 | Loading-, Empty-, Hidden-, Missing- und Fehlerzustände werden fachlich getrennt und lokal dargestellt. | `MemberCurrentProjectsSection.tsx` already renders a local `loadError` paragraph (not `ErrorState` primitive — UI-SPEC requires migrating to it). `hidden`/`missing` stay page-level (128 lock, unchanged). See UI-SPEC Interaction Contract. |
| PMFE-05 | Wiederholte Badge-Konfiguration, Ableitungen, Formatierung und UI-Kontrollen werden an vorhandenen gemeinsamen Seams konsolidiert. | `memberBadgeLabels.ts` / `badgeArtwork.ts` already are the shared seam; `deriveKnownFor.ts` exists but is UNUSED — a second, divergent "known for" implementation (`deriveKnownForFromPublicProfile` in `MemberProfileHero.tsx`) duplicates it against paginated data. Consolidate onto ONE, server-driven per D-06. |
| PMFE-06 | Nicht offensichtliche Privacy-, Aggregations- und Zustandsinvarianten erhalten kurze Zweckkommentare. | Existing style precedent: short `//` comments citing decision IDs (`D-06`, `Phase 112 D-04`) throughout `memberBadgeLabels.ts` and `MemberProfileContent.tsx`. Follow this convention. |
| PMFE-07 | Seitentitel und Metadaten beschreiben das konkrete Memberprofil sinnvoll. | `generateMetadata` in `page.tsx` returns `{}` for all visible profiles today (confirmed) — only sets `robots.noindex` for hidden ones. No title/description exists yet. See Code Examples. |
| PMFE-08 | Lange Inhalte und umfangreiche Auszeichnungen verwenden progressive Offenlegung statt ungebremster Seitenlänge. | `MemberStorySection.tsx` already implements the exact target pattern (`ResizeObserver` overflow detection + `storyContentClamped`/`storyContentExpanded` CSS classes + "Mehr lesen"/"Weniger anzeigen" `Button`) — mirror it for badge collections. `FocalCarousel`'s expanded grid view already keeps all items mounted (no `display:none`/unmount). |
| PMFE-09 | Relative Datumsanzeigen sind SSR- und Hydration-stabil und hängen während des Renderns nicht unkontrolliert von `Date.now()` ab. | Found the EXACT violation: `LatestContributionsSection.tsx`'s `relativeTimeLabel()` calls `Date.now()` directly during render (line 63) — an uncontrolled clock read inside an SSR'd component tree. This is the concrete fix target for D-10. |
| PMFE-10 | Owner-, Vorschau- und Korrekturaktionen arbeiten fail-closed, deduplizieren Profilanfragen und verhindern Request-Races. | `OwnHiddenProfilePreview` already fails closed correctly (`state.key !== requestKey` renders loading, never a stale owner view). The consolidated hook must preserve this fail-closed default across all 3 call sites. |
| PMFE-11 | Top-Rollen, bekannte Gruppen und Summen werden aus dem vollständigen freigegebenen Datensatz berechnet, nicht aus der ersten Projektseite. | Confirmed bug source: `MemberProfileHero.tsx`'s `deriveKnownForFromPublicProfile()` derives `topRoles` from `profile.current_projects` — which is ONLY the first embedded page (initial size 6, server max 24) per `PublicMemberProjectsPage`/`current_projects_count` contract. Requires a NEW backend aggregate query (cross-phase, see Open Questions). |
</phase_requirements>

## Summary

This phase is a **frontend consolidation/hardening phase on an already-mostly-correct foundation**, plus **one backend-touching exception (D-06/D-07)**. Direct codebase reading confirms nearly every CONTEXT.md decision maps onto a concrete, already-visible gap:

1. **PMFE-01 is already true** — `MemberProfileContent.tsx` is the single shared composition used by both SSR (`page.tsx`) and client owner-preview (`OwnHiddenProfilePreview.tsx`), both consuming the same `PublicMemberProfileResponse`. No structural change needed here; this phase hardens the surrounding request/state plumbing.

2. **PMFE-02/PMFE-10 (viewer consolidation) has THREE call sites, not two.** CONTEXT.md names `OwnHiddenProfilePreview.tsx` and `OwnProfileEditLink.tsx`, but `CorrectionReportModal.tsx` independently calls `getOwnProfile()` to determine whether to hide the "Korrektur melden" button on one's own profile — a third, undocumented duplicate of the same race-prone active-flag `useEffect` pattern. The planner must account for this third site.

3. **PMFE-03 (race-safe hook) has TWO existing gold-standard precedents already in the repo**, both stronger than `OwnHiddenProfilePreview`'s pattern: `frontend/src/app/suche/useDebouncedSearch.ts` (real `AbortController` + `signal.aborted` checks, not just an `active` boolean) and `frontend/src/components/fansubs/projectMember/useProjectMemberCollection.ts` (cursor pagination + pure-updater dedup-by-key, i.e. D-04 already implemented once). The shared D-03 hook should generalize from these two, not just from `OwnHiddenProfilePreview`. A concrete blocker: `getMemberProjects()` in `api.ts` has **no `signal` parameter today** — it must be added before the hook can cancel in-flight project-paging requests.

4. **PMFE-11 exposes a genuine cross-phase dependency.** The phase is framed as "frontend-only" in the roadmap's plan-time-read-first list, but D-06 explicitly requires **server-side** aggregate computation over the complete approved project set (not just the first page). The only existing full-set query is `countCurrentProjects` (an integer COUNT, already honest per Phase-131 D-03) — there is no existing query that aggregates role/group frequency or year span across the full set. Adding `top_roles`/`known_groups`/`active_years` (or similar) to the DTO requires touching `backend/internal/repository/member_profile_public_repository.go` (or a new repository method), the Go DTO, OpenAPI, and `api.ts`/`types/profile.ts` — a real backend task, not merely "frontend consolidation." The planner must schedule this explicitly, likely as an early wave, since the frontend rendering task (D-06's "thin renderer") is blocked on it.

5. **PMFE-09's target defect is concretely located**: `LatestContributionsSection.tsx`'s `relativeTimeLabel()` reads `Date.now()` mid-render inside an SSR-rendered tree — the canonical hydration-mismatch anti-pattern. `MemberProfileHero.tsx`/`page.tsx` do not yet thread a server reference timestamp; one must be added (DTO field or a lightweight prop threaded from `page.tsx`'s render time down through `MemberProfileContent`).

6. **PMFE-08's target pattern is already implemented once** (`MemberStorySection.tsx`'s clamp + `ResizeObserver` + expand button), and `FocalCarousel`'s already-existing "expand to grid" view already keeps all items mounted — both are strong precedent to mirror/reuse rather than reinvent.

**Primary recommendation:** Treat this phase as "extract 2 already-proven client hooks into shared seams + fix 2 concretely-located defects (metadata, Date.now()) + coordinate one backend aggregate addition" rather than a from-scratch design exercise. Every pattern this phase needs already has a working precedent somewhere in `frontend/src/`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Public profile SSR composition (`MemberProfileContent` render) | Frontend Server (SSR) | Browser/Client (re-rendered identically on owner-upgrade) | `page.tsx` is a Next.js Server Component; the SAME `MemberProfileContent` is reused client-side by `OwnHiddenProfilePreview` — this dual-tier reuse is the PMFE-01 contract itself. |
| Central viewer/session resolution (`useMemberViewer`) | Browser/Client | API/Backend (auth cookies, `/api/v1/members/:slug`) | Must run client-side (reads `useAuthSession`, browser cookies via `api.ts`); backend only supplies the `viewer` object already in the DTO. |
| Slug-keyed cancellable request/paging state (D-03 hook) | Browser/Client | — | Pure client concern: `AbortController`, React state, no server involvement beyond the existing paginated endpoints. |
| Server-authoritative aggregates (top roles / known groups / active years) | API / Backend | Database | MUST be computed server-side over the complete approved dataset (D-06) — this is a genuine backend responsibility, not a frontend one, despite the phase's frontend framing. Frontend becomes a "thin renderer" only. |
| Metadata generation (`generateMetadata`) | Frontend Server (SSR) | API/Backend (source data) | Runs exclusively at request time in `page.tsx`'s Server Component boundary; consumes already-fetched DTO fields, composes copy. |
| Progressive disclosure (story/badge clamp) | Browser/Client | — | Visual-only clamping via CSS + JS overflow measurement (`ResizeObserver`); DOM content originates from SSR but toggling is a pure client interaction. |
| Hydration-stable relative dates | Frontend Server (SSR) + Browser/Client | — | Reference timestamp must originate server-side (SSR render time) and be threaded as a prop/DTO field so client hydration reads the identical value — a dual-tier contract, not solely client or server. |
| Owner-preview/correction actions (consolidated request path) | Browser/Client | API/Backend (`getMemberProfile`, `submitMemberCorrection`) | All three current call sites (`OwnHiddenProfilePreview`, `OwnProfileEditLink`, `CorrectionReportModal`) are client components; consolidation stays entirely within the Browser/Client tier. |

## Standard Stack

This phase introduces **no new external dependencies**. It consolidates existing in-repo code onto existing in-repo seams. The relevant existing stack (already installed, versions confirmed from `frontend/package.json`):

| Library | Version | Purpose | Why Standard (existing project choice) |
|---------|---------|---------|--------------|
| next | ^16.1.6 | App Router SSR, Server Components, `generateMetadata`, async `params` | Already the project's framework; Phase 130 already handles async `Promise<{ slug }>` params correctly in `page.tsx`. |
| react / react-dom | 18.3.1 | Client hooks, StrictMode double-invoke semantics (relevant to D-04 pure-updater requirement) | Already the project's UI runtime. |
| typescript | ^5.7.2 | Static typing across `api.ts`, `types/profile.ts`, components | Already the project's language. |
| vitest | ^3.2.4 | Unit/component tests (`*.test.tsx` colocated with source) | Already the project's test runner; `npm run test` = `vitest run`. |
| lucide-react | (existing) | Icons used throughout profile components | Already in use; UI-SPEC confirms `^0.469.0`. |

**Installation:** None required — no `npm install` needed for this phase.

**Version verification:** Not applicable (no new packages). Existing versions read directly from `frontend/package.json` on 2026-08-15 `[VERIFIED: frontend/package.json]`.

## Package Legitimacy Audit

**Not applicable.** This phase installs zero new external packages — it exclusively extracts, consolidates, and hardens existing in-repo TypeScript/React code (hooks, components, DTO fields) using only already-installed dependencies. No `npm install`, no `slopcheck` run, no registry verification needed. If a planner later decides a new dependency is warranted (e.g., a date-formatting library), that decision must re-trigger this gate — but nothing in CONTEXT.md's decisions (D-01 through D-11) requires one; D-10's relative-date logic can reuse the existing hand-rolled `relativeTimeLabel`-style logic already proven in `LatestContributionsSection.tsx`, just parameterized by a threaded reference timestamp instead of `Date.now()`.

## Architecture Patterns

### System Architecture Diagram

```
Anonymous request                          Owner (logged in) request to hidden profile
       │                                                    │
       ▼                                                    ▼
GET /members/[slug]  (Next.js Server Component)      GET /members/[slug] → visibility=hidden
       │                                                    │
       ▼                                              404 from backend (neutral, D-03/128 lock)
getMemberProfile(slug)  ──┐                                 │
  (SSR, cookie-free,      │                                 ▼
   cache: 'no-store')     │                         not-found.tsx renders
       │                  │                         <OwnHiddenProfilePreview />  (Client Component)
       ▼                  │                                 │
  200 { data, viewer } ───┤                          useAuthSession() → hasAuthSession?
       │                  │                                 │  no  → UnavailableProfile
       ▼                  │                                 │  yes ▼
generateMetadata()        │                         [D-02] useMemberViewer(slug) — ONE central
  (member-specific copy,  │                          getMemberProfile(slug) request, slug-keyed,
   D-08)                  │                          cancellable, fail-closed
       │                  │                                 │
       ▼                  │                          response.viewer.is_owner?
<MemberProfileContent>  ◄─┘                                 │  no  → UnavailableProfile
  profile, storedSlug,                                      │  yes ▼
  viewer, viewerResolved                          <MemberProfileContent
       │                                             profile viewer viewerResolved />
       ├─► MemberProfileHero (D-06: server-authoritative           │
       │     top roles / known groups / active years,     (SAME component tree as
       │     no client-side re-aggregation)                 anonymous SSR path — PMFE-01)
       ├─► MemberStorySection (D-09 clamp pattern, reused
       │     for badge collections too)
       ├─► MemberCurrentProjectsSection
       │     └─► [D-03 hook] slug-keyed, AbortController,
       │           dedup-by-row-id, pure updater ──► getMemberProjects(slug, limit, offset, signal)
       ├─► MemberBadgeChain
       │     └─► FocalCarousel (expand/collapse — D-09,
       │           full content stays mounted)
       │     └─► [D-03 hook applies to any badge
       │           expansion/continuation state]
       ├─► LatestContributionsSection
       │     └─► relativeTimeLabel(occurredAt, referenceNow)
       │           [D-10: referenceNow threaded from SSR,
       │            NOT Date.now() at render time]
       └─► OwnProfileEditLink / CorrectionReportModal
             └─► [D-02] consolidated onto the SAME
                   useMemberViewer seam — no independent
                   getOwnProfile()/getMemberProfile() calls
```

### Recommended Project Structure

No new top-level directories are needed. Extend existing locations:

```
frontend/src/
├── app/members/[slug]/
│   ├── page.tsx                    # SSR entry; generateMetadata (D-08 fix here)
│   ├── not-found.tsx                # unchanged — hidden-profile entry
│   ├── OwnHiddenProfilePreview.tsx  # refactor to consume the new shared hook(s)
│   ├── OwnProfileEditLink.tsx       # refactor to consume useMemberViewer
│   └── MemberProfileContent.tsx     # unchanged shape; may thread referenceNow prop (D-10)
├── components/profile/
│   ├── CorrectionReportModal.tsx    # refactor to consume useMemberViewer (3rd call site, PMFE-02)
│   ├── MemberCurrentProjectsSection.tsx  # adopt D-03 hook for project paging
│   ├── MemberBadgeChain.tsx         # adopt D-03 hook for any badge continuation/expansion state
│   ├── LatestContributionsSection.tsx    # fix Date.now() → threaded reference timestamp (D-10)
│   ├── memberBadgeLabels.ts         # existing shared seam (D-11) — extend, don't fork
│   ├── badgeArtwork.ts              # existing shared seam (D-11) — extend, don't fork
│   └── deriveKnownFor.ts            # becomes thin renderer or removed (D-06) — decide + apply
├── lib/
│   ├── api.ts                       # add `signal` param to getMemberProjects; central client (D-02)
│   └── useMemberViewer.ts           # NEW — the D-02 central viewer/session seam (naming discretion)
└── hooks/
    ├── useNearViewportActivation.ts # existing, unrelated but adjacent pattern
    └── useCancellableSlugState.ts   # NEW — the D-03 shared hook (naming discretion)
```

### Pattern 1: Slug-keyed cancellable request (the D-03 target — TWO existing precedents)

**What:** A request keyed by a compound value (slug + other inputs), guarded so only the response matching the CURRENT key is applied, with in-flight cancellation of superseded requests.

**When to use:** Any client fetch whose inputs can change while a previous request is in flight (slug navigation, paging "load more," carousel-triggered continuation, story/badge expansion).

**Precedent A — AbortController + signal.aborted guard (stronger than the active-flag pattern):**
```typescript
// Source: frontend/src/app/suche/useDebouncedSearch.ts (existing, proven in this codebase)
const searchAbortRef = useRef<AbortController | null>(null)
// ...
searchAbortRef.current?.abort()               // cancel the superseded request
const searchController = new AbortController()
searchAbortRef.current = searchController
getSearch(params, searchController.signal)
  .then((response) => {
    if (searchController.signal.aborted) return   // last-write-wins guard
    setResults(response.data)
  })
  .catch((err) => {
    if (searchController.signal.aborted || isAbortError(err)) return
    setError(err)
  })
```

**Precedent B — pure updater + dedup-by-key (the D-04 requirement already implemented once):**
```typescript
// Source: frontend/src/components/fansubs/projectMember/useProjectMemberCollection.ts (existing)
const append = useCallback((incoming: T[]) => {
  setItems((prev) => {
    const existing = new Set(prev.map(key))              // pure: reads only `prev`, no ref mutation
    const additions = incoming.filter((item) => !existing.has(key(item)))
    return additions.length > 0 ? [...prev, ...additions] : prev
  })
}, [key])

useEffect(() => {
  const controller = new AbortController()
  fetchPage({ limit: initialLimit, signal: controller.signal })
    .then((page) => { append(page.items); /* ... */ })
    .catch((err) => { if (err?.name !== 'AbortError') setError(true) })
  return () => controller.abort()                          // cancel on unmount/re-run
}, [initialLimit, fetchPage, append])
```

**Weaker existing precedent (what CONTEXT.md's D-03 literally names, but should be upgraded, not copied verbatim):**
```typescript
// Source: frontend/src/app/members/[slug]/OwnHiddenProfilePreview.tsx (existing — active-flag only, NO AbortController)
let active = true
void getMemberProfile(slug).then((response) => {
  if (!active) return
  setState(/* ... */)
})
return () => { active = false }   // does NOT cancel the underlying fetch — just ignores the result
```
The `active`-flag pattern prevents STATE corruption but does not actually cancel the network request. Precedent A (`AbortController`) does both. The D-03 shared hook should generalize from Precedent A + B, using the `active`-flag idea only as the "ignore stale result" mental model, not as the literal implementation.

### Pattern 2: Progressive disclosure with fully-mounted content (the D-09 target — existing precedent)

**What:** Visually clamp long content with a "mehr lesen" expand toggle, while keeping the full content in the DOM at all times (measured via `ResizeObserver`, never `display: none` or conditional unmount).

**Example:**
```tsx
// Source: frontend/src/components/profile/MemberStorySection.tsx (existing, proven)
const measureOverflow = useCallback(() => {
  const element = contentRef.current
  if (!element) return
  const nextIsOverflowing = element.scrollHeight > element.clientHeight
  setIsOverflowing((current) => isExpanded ? current || nextIsOverflowing : nextIsOverflowing)
}, [isExpanded])

// ... ResizeObserver + window resize listener call measureOverflow ...

<div
  ref={contentRef}
  className={isClamped ? styles.storyContentClamped : styles.storyContentExpanded}
>
  <RichTextRenderer bodyHtml={normalizedStory} editorType="tiptap" contentSchemaVersion={1} />
</div>
{isOverflowing ? (
  <Button onClick={() => setIsExpanded((current) => !current)}>
    {isExpanded ? 'Weniger anzeigen' : 'Mehr lesen'}
  </Button>
) : null}
```
`FocalCarousel`'s `expanded` state (in `frontend/src/components/ui/FocalCarousel.tsx`) is a second working precedent: switching to the expanded grid view renders `items.map(...)` (the FULL array), never a subset — content is never removed from the DOM, only the layout/visibility changes.

### Pattern 3: SSR + client owner-upgrade sharing one composition (PMFE-01 — already correct, do not restructure)

```tsx
// Source: frontend/src/app/members/[slug]/page.tsx (SSR path)
return (
  <MemberProfileContent profile={response.data} storedSlug={slug} viewer={response.viewer} />
)

// Source: frontend/src/app/members/[slug]/OwnHiddenProfilePreview.tsx (client owner-upgrade path)
return (
  <MemberProfileContent
    profile={state.response.data}
    storedSlug={slug}
    viewer={state.response.viewer}
    viewerResolved
  />
)
```
Both paths already converge on the identical component with the identical DTO shape. This phase must NOT introduce a second composition path — any new prop (e.g., a threaded `referenceNow` for D-10) must be added to `MemberProfileContent`'s single prop surface, consumed identically by both callers.

### Anti-Patterns to Avoid

- **Ref mutation inside a `setState` updater (D-04 explicit prohibition):** React 18 StrictMode double-invokes updaters in development. Mutating a `ref` inside `setItems((prev) => { ref.current.push(x); return [...prev, x] })` corrupts dedup state on the phantom second invocation while unit tests (which often don't exercise StrictMode double-render) stay green. `useProjectMemberCollection.ts`'s `append` (Pattern 1B above) is the correct pure alternative — codebase comment explicitly documents this as a prior bugfix ("append ist REIN (Dedup aus prev, kein externer Ref) — StrictMode-sicher (siehe Bugfix)").
- **Keying list items by array index:** `MemberCurrentProjectsSection.tsx` already keys correctly (`key={`${project.anime_id}:${project.fansub_group_id}`}`) — preserve this convention in any new/refactored list; never introduce `key={index}`.
- **Reading `Date.now()` (or `new Date()`) during SSR-reachable render:** `LatestContributionsSection.tsx`'s `relativeTimeLabel()` is the concrete anti-pattern instance to fix (D-10) — it computes `Date.now() - timestamp` inline during render, which will differ between the server-render pass and the client hydration pass by however long the response takes to reach the browser, and will silently go stale on any client-only re-render without a refresh. The correct pattern threads one server-captured reference timestamp as a prop/DTO field and never reads the wall clock during render.
- **Independent `getOwnProfile()`/`getMemberProfile()` calls per component (PMFE-02 anti-pattern, three live instances found):** `OwnHiddenProfilePreview`, `OwnProfileEditLink`, and `CorrectionReportModal` each run their own `useEffect` + `active`-flag + `getMemberProfile`/`getOwnProfile` call today. This triples the request count on a hidden-profile owner-preview page load and triples the surface area for race bugs. Consolidate onto one hook whose result is shared (context, hook-with-cache, or lifting state up into `MemberProfileContent`/a wrapper) — Claude's Discretion on exact mechanism per CONTEXT.md.
- **Client-side re-aggregation of paginated data for "top roles"/"known groups" (PMFE-11 anti-pattern, live today):** `MemberProfileHero.tsx`'s `deriveKnownForFromPublicProfile()` computes `topRoles` from `profile.current_projects`, which is capped at the first page (initial size 6, server max 24 per Phase 131 D-04). A member with more than 6 current projects, or whose top role only appears on project #7+, gets a wrong/incomplete "Schwerpunkte" (top roles) display today. This is a genuine data-correctness bug, not just an architecture smell — D-06 fixes it by moving aggregation server-side over the COMPLETE approved set.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cancellable, slug-keyed, dedup-safe client fetch | A brand-new bespoke hook from scratch | Generalize `useDebouncedSearch.ts`'s `AbortController` pattern + `useProjectMemberCollection.ts`'s pure-updater dedup pattern into one shared hook | Both patterns are already tested, StrictMode-safe, and battle-proven in this exact codebase; reinventing risks reintroducing the ref-mutation bug the codebase comments explicitly warn about. |
| Progressive disclosure / clamp-and-expand | A new CSS-in-JS or JS-height-measurement library | `MemberStorySection.tsx`'s existing `ResizeObserver` + CSS-class-swap pattern, and/or `Accordion`/`DisclosureIndicator` primitives already in `@/components/ui` | CLAUDE.md mandates `@/components/ui` primitives for all user-facing UI; a new library would also violate the milestone's explicit "no new CSS/component libraries" out-of-scope constraint. |
| Relative time formatting ("vor 3 Minuten") | A date library (`date-fns`, `dayjs`, `luxon`) | The existing hand-rolled `relativeTimeLabel()` logic in `LatestContributionsSection.tsx`, parameterized by a threaded reference timestamp instead of `Date.now()` | The existing logic is already correct in its bucketing/German-language output; the only defect is the clock source, not the formatting algorithm. Introducing a new dependency for this would violate the milestone's "no new libraries" out-of-scope line and isn't needed to fix the actual bug. |
| Owner/viewer determination | Per-component ad hoc `getMemberProfile`/`getOwnProfile` + `useEffect` + local state (current state, 3 instances) | One central `useMemberViewer`-style hook/seam (D-02) | Deduplicates network requests, centralizes the fail-closed default, and removes the compounding race-condition surface area that exists today across 3 independent implementations. |
| Server-side "top roles"/"known groups" aggregation | A new client-side library or a client-computed aggregation over an artificially-fetched "all projects" list | A new backend repository method/query analogous to the existing `countCurrentProjects` (full-set, not paginated) | Fetching "all projects" client-side just to aggregate them client-side would defeat Phase 131's pagination/bounded-payload work and duplicate query logic; the backend already has the pattern for full-set aggregation (`countCurrentProjects`), extend it rather than routing around it. |

**Key insight:** This phase's `Don't Hand-Roll` risk is not "avoid an external library" (there are none to reach for) — it's "avoid re-deriving a pattern the codebase has already solved once, slightly differently, in 2-3 places." The dominant task is *generalization and consolidation of existing code*, not new invention.

## Common Pitfalls

### Pitfall 1: Treating the phase as "frontend-only" and missing the D-06 backend dependency
**What goes wrong:** The roadmap's "Plan-time read first" list for Phase 132 is entirely frontend files, and the additional context explicitly frames this as a "FRONTEND-only phase." A planner following that framing literally could plan D-06 ("thin renderer" for top roles/known groups) as a pure frontend task, then discover mid-implementation that no full-set aggregate data exists in the DTO to render.
**Why it happens:** CONTEXT.md's own D-06/D-07 explicitly says aggregates must be computed "SERVER-SIDE... delivered authoritatively in the DTO" and separately flags this as a "Cross-phase coordination note for the planner" — but that note is easy to read as advisory rather than a hard sequencing dependency.
**How to avoid:** Schedule a backend task (new/extended repository method in `member_profile_public_repository.go`, DTO field, OpenAPI schema update, `api.ts`/`types/profile.ts` mirror, contract test per Phase-130's forbidden-field/schema-parity discipline) EARLY, before the frontend "thin renderer" task that consumes it.
**Warning signs:** A plan wave that renders `top_roles`/`known_groups` fields that don't yet exist anywhere in `PublicMemberProfileData`.

### Pitfall 2: Missing the third viewer-resolution call site (`CorrectionReportModal.tsx`)
**What goes wrong:** CONTEXT.md D-02 names exactly two components (`OwnHiddenProfilePreview`, `OwnProfileEditLink`). A plan that consolidates only those two leaves `CorrectionReportModal.tsx`'s independent `getOwnProfile()` call (used to hide "Korrektur melden" on one's own profile) unconsolidated — PMFE-02's "ohne doppelte getOwnProfile-Logik" requirement would remain technically violated.
**Why it happens:** `CorrectionReportModal.tsx` is not in the ROADMAP's "Plan-time read first" list and its `getOwnProfile()` call is easy to miss since it's motivated by a UI-hiding concern ("don't show correction button on your own profile"), not an ownership-gating concern, so it doesn't look like "the same problem" at a glance.
**How to avoid:** Explicitly include `frontend/src/components/profile/CorrectionReportModal.tsx` in the plan's file list and route its owner-check through the same `useMemberViewer` seam.
**Warning signs:** Grep for `getOwnProfile\|getMemberProfile` inside `frontend/src/app/members/[slug]/` and `frontend/src/components/profile/` after "consolidation" — if more than one call site to either function remains outside the new shared hook's own implementation, consolidation is incomplete.

### Pitfall 3: `getMemberProjects` has no cancellation support today
**What goes wrong:** Applying the D-03 shared hook to `MemberCurrentProjectsSection.tsx`'s paging requires passing an `AbortSignal` through to the fetch, but `getMemberProjects(slug, limit, offset)` in `frontend/src/lib/api.ts` currently accepts no `signal` parameter (confirmed by reading its full signature) — unlike `getSearch`/`getSearchSuggestions`, which already do.
**Why it happens:** The function was written before this phase's race-safety requirement existed; it mirrors the pattern of `getMemberProfile` (also no signal) rather than the pattern of `getSearch` (has signal).
**How to avoid:** Add an optional `signal?: AbortSignal` parameter to `getMemberProjects` (and thread it into its internal `apiClientFetch` call, which already supports `signal` via `AuthorizedRequestOptions`) as part of the D-03 task, before wiring the shared hook into `MemberCurrentProjectsSection.tsx`.
**Warning signs:** A "cancellable" hook wired to a `getMemberProjects` call with no way to actually abort the in-flight HTTP request — the hook would only achieve "ignore stale result," not true cancellation, silently downgrading D-03's contract.

### Pitfall 4: Fixing `Date.now()` only in `LatestContributionsSection.tsx` and missing other implicit render-time clock reads
**What goes wrong:** The concrete, confirmed violation is in `relativeTimeLabel()` (`LatestContributionsSection.tsx`), but other profile-adjacent files also call `new Date().getFullYear()` (e.g., `frontend/src/app/me/profile/components/activityYears.ts`) which is a DIFFERENT, lower-risk pattern (year-only granularity rarely causes a visible hydration mismatch) — a plan should verify it is not also SSR-reachable inside the public member profile tree before deciding whether it needs the same fix, to avoid unnecessary scope creep into files this phase's requirements don't cover.
**Why it happens:** A broad grep for `Date.now()`/`new Date()` returns files well outside `frontend/src/app/members/` and `frontend/src/components/profile/` (own-profile edit forms, search filters, group history) that are NOT part of the public member profile SSR tree and are out of this phase's boundary.
**How to avoid:** Scope the D-10 fix specifically to files reachable from `MemberProfileContent`'s render tree (confirmed: `LatestContributionsSection.tsx` is the only one found in that tree during this research pass); re-verify with a targeted grep restricted to `frontend/src/components/profile/` and `frontend/src/app/members/[slug]/` at plan time, not the whole `frontend/src/` tree.
**Warning signs:** A plan task that touches unrelated non-profile date-picker/year-select components under the banner of "PMFE-09 fix."

### Pitfall 5: Reusing `OwnHiddenProfilePreview`'s active-flag pattern verbatim instead of upgrading to real cancellation
**What goes wrong:** CONTEXT.md's D-03 text literally says "the exact pattern D-03 extracts into a shared hook" referring to `OwnHiddenProfilePreview`'s `requestKey`/`active`-flag approach — but that pattern does NOT actually cancel the underlying `fetch` (it only ignores the result). A plan that extracts this pattern verbatim into the shared hook will satisfy the "no stale data appended" requirement but will not satisfy "abbrechbar" (cancellable) in the strict sense of an actually-aborted network request, and won't compose with `getMemberProjects` once a `signal` param is added (Pitfall 3) unless the hook is designed to pass a `signal` through.
**Why it happens:** `OwnHiddenProfilePreview` predates the `AbortController`-based `useDebouncedSearch.ts`/`useProjectMemberCollection.ts` patterns and was the most visible/recently-touched example in the profile directory, making it an easy (but not the best) template to copy.
**How to avoid:** Design the shared hook around `AbortController` (Pattern 1A/1B above) from the start; retrofit `OwnHiddenProfilePreview` to use the new hook (which will also naturally upgrade it to true cancellation) rather than copying its current implementation forward.
**Warning signs:** A new shared hook whose implementation has an `active` boolean ref but no `AbortController`/`signal` anywhere.

## Code Examples

### Current metadata gap (PMFE-07 target)
```typescript
// Source: frontend/src/app/members/[slug]/page.tsx (current state, confirmed by direct read)
export async function generateMetadata({ params }: MemberProfilePageProps): Promise<Metadata> {
  const slug = await resolveSlug(params)
  if (!isCanonicalStoredSlug(slug)) return NEUTRAL_UNAVAILABLE_METADATA

  try {
    const response = await getMemberProfileForRequest(slug)
    if (response.data.noindex) {
      return { robots: { index: false, follow: false } }
    }
  } catch (error) {
    if (isNotFoundError(error)) return NEUTRAL_UNAVAILABLE_METADATA
  }

  return {}   // <-- PMFE-07 gap: every visible profile gets NO title/description today
}
```
The fix composes `title`/`description`/OG tags from `response.data.fansub_name` plus (once D-06/D-07 land) the server-authoritative top roles/known groups/active years — using ONLY publicly-permissible DTO fields already present in `response.data` (no owner-only fields), per D-08. The `cache()`-wrapped `getMemberProfileForRequest` already exists and is reused by both `generateMetadata` and the page body, so no extra request is incurred.

### Current Date.now() defect (PMFE-09 target)
```typescript
// Source: frontend/src/components/profile/LatestContributionsSection.tsx (current state, confirmed by direct read)
function relativeTimeLabel(occurredAt: string): string {
  const timestamp = new Date(occurredAt).getTime()
  if (!Number.isFinite(timestamp)) return ''
  const diffMs = Date.now() - timestamp   // <-- PMFE-09 defect: uncontrolled clock read during render
  // ... bucketing logic (correct, keep as-is) ...
}
```
Fix direction (Claude's Discretion on exact mechanism per CONTEXT.md): change the signature to `relativeTimeLabel(occurredAt: string, referenceNow: number): string`, compute `referenceNow` once during SSR (`Date.now()` inside `page.tsx`'s Server Component body, which runs once per request server-side, not per-render), and thread it down as a prop through `MemberProfileContent` → `LatestContributionsSection`. Both the SSR path (`page.tsx`) and the client owner-upgrade path (`OwnHiddenProfilePreview`) must supply this value identically at the point they first render `MemberProfileContent`, so hydration matches.

### Current honest full-set total (existing correct precedent for D-06 to extend)
```go
// Source: backend/internal/repository/member_profile_projects_repository.go (existing, confirmed correct)
func (r *MemberProfileRepository) countCurrentProjects(ctx context.Context, memberID int64) (int, error) {
	var total int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM ... WHERE ...`, memberID).Scan(&total)
	// ...
	return total, nil
}
```
This is the backend's existing pattern for a full-set (non-paginated) aggregate over the same approved-project population that `current_projects`/`current_projects_count` uses. D-06's new top-roles/known-groups/active-years aggregate should be modeled as a sibling query against this same population (extend `member_profile_public_repository.go` or add a new repository method), not a new/parallel data source.

## State of the Art

| Old Approach | Current/Target Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-component independent owner/viewer `getOwnProfile`/`getMemberProfile` calls (3 live instances) | One central `useMemberViewer` seam (D-02) | This phase | Fewer duplicate network requests on hidden-profile owner-preview loads; one place to guarantee fail-closed semantics. |
| Active-flag-only cancellation (`OwnHiddenProfilePreview`) | `AbortController`-based cancellation (already proven in `useDebouncedSearch.ts`) | This phase, generalizing an existing better pattern | Superseded requests are actually aborted at the network layer, not just ignored after completion. |
| Client-side aggregation of `topRoles`/`knownGroups` from the first paginated project page (`MemberProfileHero.tsx`) | Server-side aggregation over the complete approved dataset, delivered as authoritative DTO fields (D-06) | This phase (with a backend-touching sub-task) | Fixes a real data-correctness bug: members with >6 current projects, or a project-heavy role beyond the first page, currently get wrong/incomplete "Schwerpunkte" display. |
| `Date.now()` read during SSR-reachable render (`LatestContributionsSection.tsx`) | One server-captured reference timestamp threaded as a prop (D-10) | This phase | Removes a hydration-mismatch risk and makes "vor X Minuten" values stable and reproducible in tests/SSR snapshots. |
| `generateMetadata` returning `{}` for all visible profiles | Member-specific `title`/`description`/OG tags from publicly-permissible facts (D-08) | This phase | Improves SEO/share-preview quality without exposing any private/owner-only data; hidden/noindex profiles remain unaffected (existing neutral metadata preserved). |

**Deprecated/outdated:** `deriveKnownFor.ts` (currently unused dead code except for its exported `KnownForResult` type, which `MemberProfileHero.tsx` still imports) either becomes a thin renderer over server-supplied aggregate fields or is removed outright per D-06 — the planner must decide which and update `MemberProfileHero.tsx`'s local `deriveKnownForFromPublicProfile` accordingly (it currently duplicates/diverges from `deriveKnownFor.ts`'s logic and both must not survive as separate implementations, per D-11).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The new D-06 aggregate DTO fields (`top_roles`/`known_groups`/`active_years`-equivalent) can be computed with a single additional SQL aggregate query modeled on the existing `countCurrentProjects` pattern, without materially changing the query-count budget Phase 131 locked (19 queries). | Summary point 4, Pitfall 1, Code Examples | If the aggregate genuinely requires per-role/per-group grouping across a large join, it could add meaningfully to query cost/latency, which would conflict with Phase 131's locked performance budget — this needs backend investigation/measurement at plan or implementation time, not assumed here. Tag: `[ASSUMED]`. |
| A2 | Exactly three client components independently resolve owner/viewer state today (`OwnHiddenProfilePreview.tsx`, `OwnProfileEditLink.tsx`, `CorrectionReportModal.tsx`). | Phase Requirements (PMFE-02), Pitfall 2 | Found via targeted reading of the ROADMAP-listed files plus one additional grep-guided file (`CorrectionReportModal.tsx`); a broader `grep -rn "getOwnProfile\|getMemberProfile"` across all of `frontend/src` was not exhaustively run against every consumer in this research pass. A missed fourth call site would leave PMFE-02 partially unmet. Tag: `[ASSUMED]` (high-confidence given targeted verification, but not exhaustively grepped). |
| A3 | No other component inside `MemberProfileContent`'s render tree reads `Date.now()`/`new Date()` during render besides `LatestContributionsSection.tsx`. | Pitfall 4 | A grep for `Date.now()\|new Date()` was run across `frontend/src` broadly and manually filtered to profile-relevant files; a plan-time re-verification scoped strictly to files imported by `MemberProfileContent.tsx` is recommended before finalizing D-10's blast radius. Tag: `[ASSUMED]`. |

## Open Questions (RESOLVED)

1. **Exactly which new DTO field(s) does D-06 add, and what is their precise shape?**
   - What we know: D-06 requires "top roles, known groups, active-year span, and totals" computed server-side over the complete approved dataset, following the Phase-130 allow-list contract discipline (D-07).
   - What's unclear: Whether this is one new object (mirroring `deriveKnownFor.ts`'s `KnownForResult` shape: `{ activeYears, topRoles, knownGroups }`) or several flat fields; whether "totals" here means something beyond the already-existing `current_projects_count`/`total_points`.
   - Recommendation: Planner should scope this as an explicit backend sub-task with its own field-naming decision, using `deriveKnownFor.ts`'s existing `KnownForResult` interface as the natural TS-side target shape, and confirm with the user/CONTEXT author if `active_years` needs to be a formatted string (`"2019–2023"`) or raw `{from, to}` years (raw is more D-01/D-07-consistent with the rest of the DTO, which prefers raw year integers like `active_from_year`).
   - **RESOLVED (Plan 132-01):** One new object, `PublicMemberKnownFor { active_years: string; top_roles: string[]; known_groups: string[] }`, added as a required `known_for` field on `PublicMemberProfileData` — directly mirroring `deriveKnownFor.ts`'s `KnownForResult` shape (snake_case field names per `profile.ts` convention). `active_years` is a formatted display string (`"min–max"` en-dash range, or just `minYear` when equal), not raw `{from, to}` years — chosen to match `deriveKnownFor.ts`'s existing display-string precedent and avoid a second date-formatting responsibility on the frontend. No new "totals" field beyond the existing `current_projects_count`/`total_points` was added; D-06's "totals" is satisfied by those pre-existing fields.

2. **Does the D-06 aggregate need its own new backend repository query, or can `countCurrentProjects`'s existing query be extended to also return roles/groups in the same round-trip?**
   - What we know: `countCurrentProjects` already does a full-set `COUNT(*)` over the same population; `loadCurrentProjects` (paginated) already selects `roles`/`fansub_group_name` per row.
   - What's unclear: Whether the aggregate can be computed with a `GROUP BY` variant of the existing full-set query (likely cheapest) or needs its own separate query.
   - Recommendation: Backend implementation detail for the planner/executor to resolve at plan time by reading `member_profile_projects_repository.go` and `member_profile_public_repository.go` in full; not resolvable from this frontend-focused research pass alone.
   - **RESOLVED (Plan 132-01):** A dedicated new query, `loadKnownFor`, was chosen over extending `countCurrentProjects` in place — `countCurrentProjects` returns a single scalar `COUNT(*)`, while `loadKnownFor` needs row-level `role_code`/`role_label`/`group_name`/`started_year` data to aggregate in Go (frequency-ranked top roles, distinct ordered groups, min/max active years), which a `GROUP BY` collapse on the counting query cannot produce without changing its return shape. `loadKnownFor` reuses the identical WHERE-clause filter set and join shape as `countCurrentProjects`/`loadCurrentProjects` (per the T-132-01 mitigation) and is called as a sibling loader step inside `GetPublicMemberProfileByID`, raising the locked query-budget constant from 19 to 20 (one new, documented, intentional query — not a Phase-131 budget regression).

3. **Where exactly should the D-10 reference timestamp live — DTO field or prop threaded from `page.tsx`?**
   - What we know: CONTEXT.md explicitly leaves this to Claude's Discretion ("Whether the server reference timestamp rides in the DTO or a layout/context provider").
   - What's unclear: A DTO field would need Phase-130 allow-list/contract-test treatment (same as D-06/D-07's new fields) even though it's not privacy-sensitive; a prop threaded purely within the Next.js render tree (captured via `Date.now()` once inside `page.tsx`'s server component body, or `OwnHiddenProfilePreview`'s equivalent client-side entry point) avoids touching the backend contract at all.
   - Recommendation: Prefer the prop-threading approach (no backend/DTO touch) unless the planner determines `OwnHiddenProfilePreview`'s client-fetched response also needs a server-authoritative "as of" timestamp for a reason beyond date display — in which case a DTO field becomes the more consistent choice. This avoids conflating D-10 with the D-06/D-07 backend-contract work already required elsewhere in this phase.
   - **RESOLVED (Plan 132-04, Task 3):** Prop-threading was chosen, exactly as the recommendation anticipated — no DTO/backend-contract touch. `page.tsx` captures `const referenceNow = Date.now()` once per request inside the server-component body (after the success-path fetch) and passes it as a `referenceNow` prop into `MemberProfileContent`; `OwnHiddenProfilePreview.tsx` captures an equivalent client-side value once via `useState(() => Date.now())` so it stays stable across re-renders of the same resolved state. Both paths thread `referenceNow` through `MemberProfileContent` → `LatestContributionsSection`, whose `relativeTimeLabel(occurredAt, referenceNow)` no longer reads `Date.now()` during render.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Frontend dev/build/test | ✓ | v24.19.0 | — |
| npm | Package scripts (`npm run test`, `typecheck`, `lint`, `build`) | ✓ | 11.17.0 | — |
| Docker Compose (`team4sv30-*` stack) | Live UAT / manual verification against `192.168.235.196:3000` | ✓ | All 7 services `Up` (backend, db, frontend, keycloak, keycloak-db, mailpit, redis) at research time | — |
| vitest | Component/unit tests (`*.test.tsx`) | ✓ | ^3.2.4 (from `package.json`) | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None — the full Docker Compose stack and local Node toolchain are already running/available on `team4s-linux`, consistent with CLAUDE.md's canonical-environment mandate.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^3.2.4 (`frontend/vitest.config.ts`) |
| Config file | `frontend/vitest.config.ts` (globals enabled, `@` alias to `src`, includes `src/**/*.test.{ts,tsx}`) |
| Quick run command | `cd frontend && npx vitest run <path/to/file>.test.tsx` |
| Full suite command | `cd frontend && npm run test` (runs `vitest run`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PMFE-01 | SSR and owner-preview render identical `MemberProfileContent` composition from the same DTO | unit/component | `npx vitest run src/app/members/[slug]/page.test.tsx src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx` | ✅ (both exist) |
| PMFE-02/PMFE-10 | Consolidated viewer hook: single dedup request, fail-closed on uncertain/error | unit | New test for the extracted hook, e.g. `src/lib/useMemberViewer.test.ts` | ❌ Wave 0 (new hook doesn't exist yet) |
| PMFE-03/PMFE-04 | Slug-keyed cancellable hook: no stale append, in-section error scoping | unit | New test for the extracted hook, e.g. `src/hooks/useCancellableSlugState.test.ts`; existing `src/components/profile/MemberCurrentProjectsSection.test.tsx` extended for cancellation | ❌ Wave 0 for the new hook; ✅ existing section test to extend |
| PMFE-05/PMFE-11 | Server-driven "known for" rendering, `deriveKnownFor` consolidation | unit | `npx vitest run src/components/profile/MemberProfileHero.test.tsx` (extend); backend Go test for new aggregate query (no existing file — new) | ✅ frontend test exists to extend; ❌ backend test is new |
| PMFE-07 | `generateMetadata` produces member-specific title/description for visible profiles, unchanged neutral metadata for hidden | unit | `npx vitest run src/app/members/[slug]/page.test.tsx` (extend existing) | ✅ exists, extend |
| PMFE-08 | Progressive disclosure keeps full content mounted, visually clamps | unit/component | `npx vitest run src/components/profile/MemberStorySection.test.tsx src/components/profile/MemberBadgeChain.test.tsx` (extend) | ✅ both exist |
| PMFE-09 | Relative dates stable across SSR/hydration (no `Date.now()` drift) | unit | `npx vitest run src/components/profile/LatestContributionsSection.test.tsx` (extend to pass explicit `referenceNow` and assert no wall-clock read) | ✅ exists, extend |

### Sampling Rate
- **Per task commit:** targeted `npx vitest run <changed test file>` (quick run command above)
- **Per wave merge:** `cd frontend && npm run test` plus `npm run typecheck` plus `npm run lint`
- **Phase gate:** Full suite green before `/gsd:verify-work`; also confirm `npm run build` succeeds (Next.js 16 App Router SSR/metadata changes are a common build-time failure source — `generateMetadata` signature/type errors surface here).

### Wave 0 Gaps
- [ ] `frontend/src/lib/useMemberViewer.test.ts` (or equivalent path per naming discretion) — covers PMFE-02/PMFE-10 for the new consolidated viewer hook
- [ ] `frontend/src/hooks/useCancellableSlugState.test.ts` (or equivalent path per naming discretion) — covers PMFE-03 for the new shared cancellable-state hook, including a StrictMode double-invoke regression test per D-04
- [ ] Backend Go test for the new D-06 full-set aggregate query/DTO fields (file TBD, likely alongside `backend/internal/repository/member_profile_public_repository_postgres_test.go`) — covers PMFE-11's server-side computation requirement; no existing file covers this today
- [ ] No new test framework/config install needed — Vitest is already fully configured for `frontend/src/**`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Indirect (no new auth) | Consolidated viewer hook must consume `useAuthSession()` exactly as today's three call sites do — no new token handling, per `docs/frontend/auth-api-client.md`'s token-free UI mandate. |
| V3 Session Management | Indirect (no new session code) | Central client (`api.ts`) already owns refresh/cookie logic; this phase must not introduce parallel session handling in the new hook(s). |
| V4 Access Control | Yes | Fail-closed is an explicit locked decision (PMFE-10, D-02): the consolidated `useMemberViewer` hook must default to "not owner" on any ambiguous/error/in-flight state, never optimistically show owner-only UI before resolution completes — mirroring `OwnHiddenProfilePreview`'s existing `state.key !== requestKey` guard. |
| V5 Input Validation | No new input surface | This phase adds no new user-input forms; `CorrectionReportModal`'s existing validation (`reasonText.trim()`) is untouched. |
| V6 Cryptography | No | Not applicable — no crypto work in this phase. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Owner-only UI flashing before viewer resolution completes (race condition) | Information Disclosure (transient) / Elevation of Privilege (transient) | Fail-closed default state (PMFE-10) — never render owner-only affordances (edit link, "Als Owner-Vorschau" notice) until the consolidated hook returns a POSITIVE, key-matched `is_owner: true`; loading/unresolved states must render as the anonymous/neutral view, not an optimistic owner view. |
| Stale response from a superseded request overwriting current-slug state (e.g., rapid slug navigation applying a previous member's data) | Tampering (data integrity, client-side) | The D-03 slug-keyed hook's requestKey-match guard, generalized from `OwnHiddenProfilePreview`'s existing `state.key !== requestKey` check and hardened with true `AbortController` cancellation (Pitfall 5). |
| Aggregate DTO fields (D-06) accidentally leaking non-public role/group data if the new backend query doesn't reapply the same visibility/approval filters as `loadCurrentProjects`/`countCurrentProjects` | Information Disclosure | The new aggregate query MUST reuse the identical WHERE-clause filters (confirmed-and-approved, visible) as the existing full-set `countCurrentProjects`/paginated `loadCurrentProjects` queries — do not introduce a parallel, potentially looser-filtered query path. This is exactly the class of bug Phase-130's forbidden-field/schema contract test framework (D-08 in Phase-130's CONTEXT) exists to catch; the new field(s) must be added to that same contract-test coverage per this phase's own D-07. |

## Sources

### Primary (HIGH confidence — direct codebase reads, this session)
- `frontend/src/app/members/[slug]/page.tsx` — SSR entry, `generateMetadata` current gap, canonical-slug handling
- `frontend/src/app/members/[slug]/not-found.tsx` — hidden-profile owner-upgrade entry
- `frontend/src/app/members/[slug]/OwnHiddenProfilePreview.tsx` — proven active-flag pattern (D-03 source, to be upgraded)
- `frontend/src/app/members/[slug]/OwnProfileEditLink.tsx` — second viewer-resolution call site
- `frontend/src/app/members/[slug]/MemberProfileContent.tsx` — the shared composition (PMFE-01)
- `frontend/src/components/profile/CorrectionReportModal.tsx` — third, undocumented viewer-resolution call site
- `frontend/src/components/profile/MemberCurrentProjectsSection.tsx` — current-projects paging (D-03 target)
- `frontend/src/components/profile/MemberStorySection.tsx` — existing progressive-disclosure precedent (D-09)
- `frontend/src/components/profile/MemberBadgeChain.tsx` — badge collection rendering + `FocalCarousel` usage
- `frontend/src/components/ui/FocalCarousel.tsx` — carousel/expand-to-grid, full-mount precedent
- `frontend/src/components/profile/memberBadgeLabels.ts` — existing shared badge seam (D-11)
- `frontend/src/components/profile/deriveKnownFor.ts` — unused, to-be-consolidated aggregation helper
- `frontend/src/components/profile/MemberProfileHero.tsx` — the LIVE `deriveKnownForFromPublicProfile` bug source (PMFE-11)
- `frontend/src/components/profile/LatestContributionsSection.tsx` — the LIVE `Date.now()` defect source (PMFE-09)
- `frontend/src/components/profile/PreviousContributionsSection.tsx` — expand/collapse-only pattern (no continuation fetch)
- `frontend/src/app/suche/useDebouncedSearch.ts` — proven `AbortController` cancellation precedent
- `frontend/src/components/fansubs/projectMember/useProjectMemberCollection.ts` — proven pure-updater dedup precedent
- `frontend/src/hooks/useNearViewportActivation.ts` — adjacent existing hook pattern
- `frontend/src/lib/api.ts` (`getMemberProfile`, `getMemberProjects`, `apiClientFetch`, `AuthorizedRequestOptions`) — central client, confirmed `getMemberProjects` lacks `signal`
- `frontend/src/lib/useAuthSession.ts` — client auth/session hook
- `frontend/src/types/profile.ts` — full `PublicMemberProfileData`/`PublicMemberProjectsPage`/`PublicMemberViewer` DTO shapes
- `docs/frontend/auth-api-client.md` — central refresh-capable session/request client contract
- `backend/internal/repository/member_profile_projects_repository.go` — `countCurrentProjects` full-set precedent
- `backend/internal/repository/member_profile_public_repository.go` — `GetPublicMemberProfile`, existing aggregate-loading structure
- `.planning/phases/130-public-dto-cross-layer-contract-alignment/130-CONTEXT.md` — DTO allow-list/contract-test discipline (D-07 dependency)
- `.planning/phases/131-set-based-delivery-pagination-performance-budgets/131-CONTEXT.md` — honest-total/pagination-bound precedent (D-03/D-04)
- `.planning/phases/132-shared-ssr-composition-race-safe-frontend-state/132-CONTEXT.md` — this phase's locked decisions
- `.planning/phases/132-shared-ssr-composition-race-safe-frontend-state/132-UI-SPEC.md` — approved visual/interaction contract
- `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/config.json` — requirement IDs, milestone history, workflow flags
- `frontend/package.json`, `frontend/vitest.config.ts` — confirmed dependency versions and test config
- Live `docker compose ps` output — confirmed running services

### Secondary (MEDIUM confidence)
- None used — no WebSearch/Context7 lookups were needed; this is a pure in-repo consolidation phase.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; versions read directly from `package.json`.
- Architecture: HIGH — every pattern cited is read directly from the current codebase, not inferred from training data.
- Pitfalls: HIGH for the 4 concretely-located defects (missing metadata, `Date.now()`, missing `signal` param, 3rd viewer call site); MEDIUM for the exact shape/cost of the new D-06 backend aggregate (flagged as Open Questions / Assumptions, not asserted as fact).

**Research date:** 2026-08-15
**Valid until:** ~14 days (fast-moving — Phase 131 just completed and this codebase area is under active development; re-verify file contents at plan time if significant time has passed or if Phase 131/130 follow-up commits have landed since this research).
