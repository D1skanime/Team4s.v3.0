# Phase 152: Public-Fansub-Gruppenseite — Konsolidierung und Modernisierung — Research

**Researched:** 2026-09-08
**Domain:** Next.js 16 App Router public page consolidation + Go/pgx backend query trimming + Tiptap contract fix, on an existing brownfield Team4s codebase
**Confidence:** HIGH (all claims below were re-verified against the live repository at HEAD `4cce330f` — one commit past the audit's `5e896cd2`, docs-only, no code drift)

## Summary

This is a verification-and-refinement pass over an already-excellent audit in `152-CONTEXT.md`, not a
from-scratch investigation. I re-read every file the audit cites, confirmed every line number,
confirmed the dead/not-dead CSS class list, and traced every caller of the shared backend hydration
functions. Everything in `152-CONTEXT.md`'s "Verifizierte Audit-Befunde" section still holds exactly
as written at current HEAD — no drift, no stale line numbers. Beyond confirming the audit, this
research surfaces four load-bearing findings the audit did not fully spell out, all of which change
how the planner should sequence B1/B2 and A3/A4:

1. **`attachGroupLinks` is not just a duplicate query — it is the only place that overwrites the
   legacy `group.website_url/discord_url/irc_url` columns with fresher `fansub_group_links` data**
   (via `applyLegacyLinkProjection`), and `FansubHeroSection`/`FansubDeepDiveSection` both read
   `group.website_url` directly (not only `community_links`). B1/B2 must not simply delete the call —
   it must fuse `applyLegacyLinkProjection` with the single already-needed `ListGroupLinks` call.
2. **`--history-badge-size` is not purely a size cosmetic — it is a CSS Grid track**
   (`grid-template-columns: minmax(0,1fr) var(--history-badge-size) minmax(0,1fr)` on
   `.historyTimelinePair`). A3 cannot just delete the custom property; the grid track needs a
   replacement value once `AchievementArtwork` owns sizing.
3. **`FansubContributorsSection` is fully built but never rendered anywhere** (not just "the
   contributors field is unread" — the whole component has zero call sites). B3's query removal is
   even safer than the audit implies, but deleting the orphaned component is out of scope (not named
   in any workstream) and should not be attempted opportunistically.
4. **The `.achLegendary` tone class already exists and both `legendary`-tone events
   (`releases_10000`, `projects_500`) already share a token-driven color identity** (`--ach-color`,
   `--ach-grad`, `--ach-soft`). The hardcoded per-event "sparkle" glow blocks A4 must replace are a
   near-duplicate of what tone already provides — collapsing them into one generic
   `emphasis: 'legendary'` treatment is the natural, DRY resolution of A4+C2 together, not two
   separate tasks.

**Primary recommendation:** Follow the wave shape already sketched in `152-USER-REQUEST.md` almost
verbatim, but merge "Wave 2: History Artwork + Registry + CSS" into a strict internal order
(A1 → A2 → A4/A5 registry extension → A3 CSS deletion → D6 test rewrite, all touching
`FansubHistorySection.tsx`/`.module.css`/`group-history-events.ts` and therefore all owned by a single
executor/wave to satisfy D09's "no two agents on the same file" rule), and keep Wave 3 (B1-B4,
backend-only, different files) fully parallel-safe against Wave 2.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D01** Everything on the Linux VM `/home/d1sk/team4s`, branch `main`. Windows is control-only.
  No history rewrites, no force-pushes, no overwriting others' changes.
- **D02** No rewrite. Targeted consolidation of proven problems. Respect the existing working
  architecture.
- **D03** Phase 150 (threshold authority) and Phase 151 (shared artwork slot) are **reused, not
  bypassed**. No second badge architecture, no second registry.
- **D04** No new library (UI, state, data-fetching, carousel, modal, rich-text, CSS framework).
  Modernization = using existing Team4s/React/Next functions more consistently.
- **D05** Timeline stays timeline. Group history is its **own domain**: own assets, own registry
  (`GROUP_HISTORY_EVENT_OPTIONS`), own tone mechanism. Only the artwork/presentation layer
  (`AchievementArtwork` + its CSS) is shared. The member badge code resolver (`profile/badgeArtwork.ts`)
  is **not** adopted.
- **D06** Admin free text is **never** rewritten. Static public labels belong in the registry.
- **D07** `public-profile` and `domain-projection` stay technically **separate** endpoints. No
  endpoint merging, no monster query. Only demonstrably unused data is avoided.
- **D08** Pixel shifts are **removed, not relocated**. Only for an objectively mis-centered asset
  (after visual inspection) is a clean root-cause fix justified.
- **D09** Backend/query changes and UI changes run in **separate waves/plans**. Tiptap is secured
  separately. Visual QA is its own closing block. No two agents on the same file simultaneously.
- **D10** Explicitly excluded: repo-wide `useMediaQuery`; removing `marked` (if that would require
  investigating backend Markdown paths); a full CSS breakpoint reset of the public page; the media
  pipeline of all Team4s pages; new large performance fixture infrastructure; UI redesign;
  public/edit comparison or alignment.
- **D11** Flow: Plan → Waves → Execute → Tests → Visual QA → Gaps → independent final verification →
  Commit/Push to `origin/main`. No discussion pause requested.

### Claude's Discretion

The concrete slot embedding into the timeline, the exact shape of the registry extension, the cut of
the public-specific load path, and the test cut follow the findings on the real code and live
verification. No new product/domain decisions.

**This research resolves all four discretion items with concrete, code-grounded recommendations —
see "Architecture Patterns" and "Common Pitfalls" below.**

### Deferred Ideas (OUT OF SCOPE)

None enumerated separately in CONTEXT.md beyond D10's explicit exclusion list above and
USER-REQUEST's "Nicht in Phase 152" list (repo-wide `useMediaQuery`, `marked` removal requiring
backend Markdown investigation, full CSS breakpoint reset, full media pipeline, new large fixture
infra, UI redesign, public/edit comparison, public/edit alignment).

## Phase Requirements

Source: `.planning/ROADMAP.md` lines 1239-1258 (the only place the P152-01..14 definitions exist —
`.planning/REQUIREMENTS.md` does not yet carry a "Phase 152" section; this mirrors how Phase 151's
`P151-*` IDs were added additively after that phase's roadmap entry, per `REQUIREMENTS.md`'s
"Phase 151 — Additive scope" section. The planner should add an equivalent "Phase 152 — Additive
scope" block to `REQUIREMENTS.md` following that precedent).

| ID | Workstream | Description | Research Support |
|----|-----------|-------------|-------------------|
| P152-01 | A1 | Free `/history-event-badges-transparent/**` for the Next Image pipeline; `/_next/image` returns 200 not 400, WebP, srcset, lazy loading; master PNGs unchanged | Confirmed absent from `next.config.mjs` `images.localPatterns`; exact insertion point and syntax identified below |
| P152-02 | A2 | `FansubHistorySection` renders artwork through the Phase-151 `AchievementArtwork` slot; timeline, own assets, own registry stay; no member badge resolver | Confirmed `AchievementArtwork`'s `direct` descriptor variant and the mandatory `artworkStyles.container` wrapper pattern (traced from `RoleAchievementCard.tsx`) |
| P152-03 | A3 | `--history-badge-size`, its breakpoints, the `releases_10000` special size, achievement-specific size logic, and unneeded pixel shifts are removed | Confirmed `--history-badge-size` is a CSS Grid track, not just a size var — replacement value identified |
| P152-04 | A4 | `achievementEventStyle`/hard `eventType` if-chains replaced by additive fields on `GROUP_HISTORY_EVENT_OPTIONS`; no second registry | Confirmed other registry consumers (`GroupHistoryForm.tsx`, `GroupHistorySection.tsx`) only read `.value/.category/.tone/.imageSrc/.label` — additive fields are safe |
| P152-05 | A5 | `publicDomainTerms` removed; static public labels in the registry; admin free text demonstrably unchanged | Confirmed the exact function and its unsafe application to `item.title` via `publicHistoryTitle` |
| P152-06 | A6, E | Image performance documented before/after (History; Hero if changed), incl. initial payload delta and percentage reduction | Confirmed hero image URLs resolve through `resolveApiUrl`/`resolvePublicApiUrl`, plausibly already matching the existing `/api/v1/media/**` remotePattern |
| P152-07 | B1, B2 | Public-specific group load path hydrates only needed fields; duplicate link loading removed; other consumers undamaged; no monster query | Confirmed exact caller graph of `GetGroupBySlug`/`hydrateFansubGroup`/`attachGroupCounts`/`attachGroupLinks`; confirmed the legacy-URL-projection trap |
| P152-08 | B3 | Unused contributors projection checked and decision documented; `public-profile` and `domain-projection` stay technically separate | Confirmed `DomainProjectionRepository` has exactly one caller (this route) and `FansubContributorsSection` is never rendered |
| P152-09 | B4 | Query-budget test built on the existing query-counter infra; constant budget, no growth with projects/members/history/media; new target value documented | Confirmed exact template files and DSN/DB-name convention to follow |
| P152-10 | C1-C5 | Dead History CSS removed, touched breakpoints/hex colors consolidated, initials logic decided, `CATEGORY_TAG_CLASS` typed, `Promise.allSettled([single])` simplified | Confirmed exact dead-class list, exact behavioral difference between the two initials functions, exact backend category allowlist for the union type |
| P152-11 | D1, D2 | Tiptap link contract consistent between editor and backend, with regression test; sanitizer hardening (`class` pattern, `h1`) checked and applied where side-effect-free | Confirmed exact reproduction mechanism and exact fix locations in both frontend and backend |
| P152-12 | D3, D4 | Accessibility findings fixed (no duplicate year in the a11y tree, no double-labeled media thumbnails); axe coverage added via existing infra | Confirmed exact lines and exact existing axe usage pattern to replicate |
| P152-13 | D5, D6 | Page composition tests for section conditions, empty states, projection fallback, and error state; History tests behavior-based instead of class-name assertions | Confirmed exact existing test mocking pattern to extend; confirmed exactly which assertions will break and why |
| P152-14 | QA | Viewport visual acceptance 320/390/520/768/1024/1440/1920/2560 across Hero, Story, Projects, Team, History, Media; build and relevant front-/backend tests PASS; independent final verification | No new findings — operational, see CONTEXT.md's "Betriebliche Randbedingungen" |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| History badge image delivery/optimization | Frontend Server (SSR)/Next Image | CDN (Next `/_next/image` cache) | `next.config.mjs` `images.localPatterns` gates which local paths the built-in optimizer may serve; this is a Next.js config concern, not a component concern |
| History badge presentation (artwork slot) | Browser/Client (`'use client'` component) | — | `FansubHistorySection.tsx` and `AchievementArtwork.tsx` are both `'use client'`; sizing is CSS container-query driven, not server-computed |
| Achievement metadata (labels, tone, emphasis) | Frontend Server/shared lib | Browser (admin form + public page both import it) | `group-history-events.ts` is a plain TS module imported by both a Server Component tree (public page) and Client Components (admin form, history section) — no runtime boundary |
| Public group profile hydration | API/Backend (Go repository) | Database | `FansubRepository.GetPublicProfileBySlug` orchestrates all public-page SQL; must not leak into or duplicate the shared admin hydration path (`GetGroupBySlug`) |
| Query-count discipline | API/Backend (Go repository + test harness) | Database | `query_counter.go`'s `pgx.QueryTracer` observes at the connection level — this is a backend/test-infra concern, not app logic |
| Rich-text validation/sanitization contract | API/Backend (Go service) | Frontend Server (`RichTextRenderer`, Server Component) | `TipTapService.ValidateJSON`/`newTipTapSanitizerPolicy` are the sole authority; the frontend editor must never diverge from what the backend accepts |
| Rich-text authoring contract (StarterKit config) | Browser/Client (`RichTextEditor.tsx`) | — | TipTap editor extensions run entirely client-side; the contract drift originates here |
| Accessibility (aria-hidden, alt text, labels) | Browser/Client | — | All findings are DOM/ARIA-tree issues in client-rendered markup |
| Visual/CSS geometry (badge sizing, breakpoints) | Browser/Client (CSS Modules + container queries) | — | No SSR-computed layout; everything is CSS |

## Standard Stack

No new packages. D04 explicitly forbids introducing any new library. All work reuses libraries
already in `frontend/package.json` and `backend/go.mod`.

### Core (already installed, versions confirmed via `package.json`/`go.mod` at HEAD)

| Library | Version | Purpose | Why Standard (here) |
|---------|---------|---------|--------------|
| `next` | ^16.1.6 | App Router SSR, `next/image` optimizer | Already the page's framework; A1/A2/E1/E2 only touch its `images` config and existing `Image`/`ResponsiveImage` usage |
| `react` | 18.3.1 | Component runtime | No change |
| `@tiptap/starter-kit` | ^3.23.1 | Rich-text editor extensions (incl. default `link`) | Root of the D1 contract drift — see Common Pitfalls |
| `github.com/microcosm-cc/bluemonday` | v1.0.27 | HTML sanitizer, backend | Root of the D2 sanitizer-hardening target |
| `github.com/jackc/pgx/v5` | v5.7.1 | Postgres driver, also backs `query_counter.go`'s `pgx.QueryTracer` | B4's query-budget test harness dependency |
| `github.com/stretchr/testify` | v1.9.0 | Go test assertions | Used by every existing repository/service test, including the D1 reproduction test |
| `vitest` | ^3.2.4 | Frontend test runner | All new/rewritten frontend tests |
| `@testing-library/react` | ^16.3.0 | Component testing | D5/D6/D4 test rewrites |
| `jest-axe` | ^11.0.0 | Accessibility assertions (`toHaveNoViolations`) | D4 axe coverage — global setup already wired via `vitest.config.ts` → `src/test/axeSetup.ts` |
| `axe-core` | ^4.13.0 | Underlying a11y engine (transitive via `jest-axe`) | Same |

### Alternatives Considered

None — D04 forbids evaluating alternative libraries. This phase is exclusively "use what's already
there, more consistently."

**Installation:** None required. No `npm install`/`go get` needed for any in-scope task.

## Package Legitimacy Audit

Not applicable — this phase installs zero new packages (confirmed: D04 explicitly forbids new
libraries; every dependency named above is already present in `frontend/package.json` /
`backend/go.mod` at HEAD). Skip the Package Legitimacy Gate entirely.

## Architecture Patterns

### System Architecture Diagram (current data flow, confirmed at HEAD)

```
Browser GET /fansubs/[slug]
        |
        v
Next.js Server Component  app/fansubs/[slug]/page.tsx
        |
        |-- await getPublicFansubProfileBySlug(slug)  (cache: 'no-store')
        |         |
        |         v
        |   GET /api/v1/fansub-slugs/:slug/public-profile   (Gin handler)
        |         |
        |         v
        |   FansubRepository.GetPublicProfileBySlug(slug)
        |         |-- GetGroupBySlug(slug)              -- 1 base SELECT
        |         |     `-- hydrateFansubGroup()
        |         |           |-- attachGroupCounts()   -- 5 populateCountMap queries
        |         |           |     (anime_relations, projects, release_versions,
        |         |           |      members, aliases -- only release_versions is read publicly)
        |         |           `-- attachGroupLinks()    -- 1 query (fansub_group_links)
        |         |                 `-- applyLegacyLinkProjection() overwrites
        |         |                     group.website_url/discord_url/irc_url
        |         |                     IF a matching link row exists
        |         |-- listPublicFansubStories/Projects/History/Media()  -- 4 queries, no N+1
        |         `-- ListGroupLinks(group.id)           -- 1 query (DUPLICATE of attachGroupLinks' query)
        |
        |  == 12 static queries total (measured live: ~13.01/request) ==
        |
        |-- (sequential, needs group.id from above) await getFansubGroupDomainProjection(group.id)
        |         |
        |         v
        |   GET /api/v1/fansubs/:id/domain-projection   (Gin handler, DIFFERENT repository)
        |         |
        |         v
        |   DomainProjectionRepository.GetFansubGroupDomainProjection(groupID)
        |         |-- listProjectionMembers()      -- 1 query, rendered (FansubTeamSection)
        |         |-- listProjectionHistorical()    -- 1 query, rendered (FansubTeamSection)
        |         `-- listProjectionContributors()  -- 1 query, NEVER RENDERED
        |                                              (FansubContributorsSection has zero call sites)
        |
        |  == 3 static queries total (measured live: ~3.15/request) ==
        |
        v
Render sections conditionally (storyAvailable / hasTeam / hasHistory / hasMedia)
        |
        v
FansubHistorySection ('use client')
        |-- raw <img src={presentation.imageSrc}> per timeline entry (NOT next/image)
        `-- CSS module: FansubPublicSections.module.css (883 lines, shared by 6 components)
```

### Recommended Public Group Load Path (target shape for B1/B2)

```
FansubRepository.GetPublicProfileBySlug(slug)
  |-- getPublicGroupBase(slug)                  -- NEW: 1 base SELECT, no hydration
  |     (same columns as GetGroupBySlug's own SELECT, reuse scanFansubGroup-style scan)
  |-- attachPublicReleaseVersionsCount(&group)  -- NEW: 1 populateCountMap call
  |     (the ONE of attachGroupCounts' 5 queries actually read: profile.release_versions_count)
  |-- listPublicFansubStories/Projects/History/Media()  -- UNCHANGED, 4 queries
  `-- links, _ := ListGroupLinks(group.id)      -- UNCHANGED, 1 query (now the ONLY link query)
        group.Links = links
        applyLegacyLinkProjection(&group)        -- reuse existing private fn, NO extra query
        resp.CommunityLinks = links

  == 7 static queries total (12 -> 7, a 5-query / ~42% reduction) ==
  == matches "5 unnecessary/duplicate queries" language in the Ausgangslage section verbatim ==
```

**Critical constraint:** `GetGroupBySlug` is also called directly by the ADMIN handler
`FansubHandler.GetFansubBySlug` (`backend/internal/handlers/fansub_groups.go:188`, route
`GET /fansubs/:slug` — no route prefix collision with the public
`/fansub-slugs/:slug/public-profile`). `GetGroupByID` is called by `fansub_groups.go:134`,
`fansub_merge.go:80`, and `app_auth_invitations.go:129`. None of these may lose hydration — the new
`getPublicGroupBase`/`attachPublicReleaseVersionsCount` functions must be **additive**, sitting
alongside (not replacing) `GetGroupBySlug`/`attachGroupCounts`/`attachGroupLinks`, which keep serving
every other caller unchanged.

### Pattern 1: Slot embedding for the artwork container-query context

**What:** `AchievementArtwork`'s hero size steps (192/216/240px) only activate at container widths
562px and 658px if the immediate ancestor establishes a CSS `container: achievement-card / inline-size`
context. `AchievementArtwork.module.css`'s own root span uses `.slot` (not `.container`) — the
container context must be provided by the **consumer**.

**When to use:** Every place `<AchievementArtwork>` is embedded (this is not History-specific; it is
the established convention across `RoleAchievementCard.tsx`).

**Example (the exact pattern to replicate in the History timeline badge slot):**
```tsx
// Source: frontend/src/components/profile/RoleAchievementCard.tsx:55-76 (existing convention)
import { AchievementArtwork } from '@/components/profile/AchievementArtwork'
import artworkStyles from '@/components/profile/AchievementArtwork.module.css'

<div className={artworkStyles.container} data-role-card-container>
  <AchievementArtwork
    descriptor={{ kind: 'direct', src: presentation.imageSrc }}
    badgeCode={item.event_type}
    alt=""            // decorative — the card's own <strong>/<span> already carry the accessible text
    size="hero"
    decorative
  />
</div>
```
For History, `descriptor` is always `{ kind: 'direct', src: presentation.imageSrc }` — history badges
are single-layer PNGs (confirmed: `GROUP_HISTORY_EVENT_OPTIONS` has one `imageSrc` per entry, no
motif/frame pair), so the `layered` branch of `AchievementArtworkDescriptor` is never used here. This
directly satisfies D05 ("Member-spezifischer Badge-Code-Resolver wird nicht übernommen") — no
`resolveBadgeArtwork`/`resolveLayeredRoleArtwork` import needed; `presentation.imageSrc` from the
group-history registry is already a ready-to-use `src` string.

`badgeCode` is a free-form string used only for `data-badge-code`/`data-achievement-art` test hooks
and the profile-only role-family CSS selectors at `AchievementArtwork.module.css:95-111`
(`[data-badge-code*="_designer_"]` etc.) — those selectors will simply never match history event codes
(`founding`, `releases_10000`, ...), which is safe and requires no change.

### Pattern 2: Grid-track replacement for `--history-badge-size`

**What:** `.historyTimelinePair { grid-template-columns: minmax(0,1fr) var(--history-badge-size)
minmax(0,1fr); }` (line 291) and `.historyTimelineBadge { width/height: var(--history-badge-size) }`
(lines 302-303) both consume the variable being deleted in A3.

**When to use:** Once `AchievementArtwork` owns the badge's actual pixel size (192/216/240px via its
own container queries), the grid track must be given a fixed or `min-content`-based value instead of
being deleted outright — deleting the custom property without replacing its consumers collapses the
grid's center column to `0` width (a genuine regression, not present in the current CSS).

**Recommendation:** Replace the middle track with a fixed value matching `AchievementArtwork`'s
largest hero step (`240px`) or `min-content`/`auto` sized to the slot's actual rendered width — verify
visually at the two container-query breakpoints (562px, 658px) during Visual QA rather than guessing;
this is exactly the kind of "verify after visual inspection" judgment call D08 asks for, but applied
to layout rather than pixel-shift centering.

### Pattern 3: Emphasis-driven tone reuse instead of hardcoded per-event glow

**What:** `.historyTimelineEventProjects500`/`.historyTimelineEventReleases10000` (lines 572-648)
each hardcode a bespoke hex-based "sparkle" glow (`rgba(124,58,237,...)`, `rgba(250,204,21,...)`,
conic-gradients). Both underlying events already carry `tone: 'legendary'` in the registry, and
`.achLegendary` (line 247) already defines `--ach-color: #a16207`, `--ach-grad: linear-gradient(135deg,
#fef3c7, #c4b5fd 52%, #67e8f9)`, `--ach-soft: #fef3c7` — a gold→violet→cyan gradient conceptually
identical to what the hardcoded blocks reinvent.

**When to use:** When implementing A4's `emphasis` field and C2's hex→token conversion together.

**Recommendation:** Introduce `emphasis: 'none' | 'rare' | 'legendary'` on
`GroupHistoryEventPresentation`, set it on the 5 emphasis-worthy entries (`projects_500`,
`releases_500`, `releases_1000`, `releases_5000`, `releases_10000`), and drive ONE generic
`.historyTimelineEmphasisLegendary` (and optionally `...Rare`) selector from `var(--ach-color)`/
`var(--ach-grad)` rather than two bespoke selectors with independent hardcoded palettes. **Flag for
Visual QA sign-off:** this measurably changes the rendered glow on `releases_10000` and `projects_500`
from two visually distinct bespoke treatments to one shared treatment — call this out explicitly in
the plan's acceptance criteria so the visual regression is expected, not accidental.

### Pattern 4: Tiptap link-contract closure

**What:** `RichTextEditor.tsx:446` configures `StarterKit.configure({ codeBlock:false, code:false,
strike:false, hardBreak:false })` — `link` is left at its StarterKit v3 default (registered,
`autolink` active). `tiptap_service.go:47-49`'s `allowedTipTapMarks` has no `link` entry, so
`ValidateJSON` rejects any `link`-marked text node with `"nicht erlaubter Mark-Typ: \"link\""`
(confirmed at `tiptap_service.go:130-132`). `newTipTapSanitizerPolicy()` never calls
`AllowElements("a")`, so even a hand-crafted `<a>` would be stripped.

**Preferred fix (per USER-REQUEST D1, "Bevorzugt `link: false`"):**
```tsx
// frontend/src/components/editor/RichTextEditor.tsx:446
StarterKit.configure({
  codeBlock: false,
  code: false,
  strike: false,
  hardBreak: false,
  link: false,   // NEW — group-history notes/stories do not support links; prevents autolink
                 // from ever producing a mark the backend allowlist rejects (contract drift fix)
}),
```

**Reproduction test (no admin UI session needed — exact shape, ready to write in
`backend/internal/services/tiptap_service_test.go`, following the existing sibling test
`TestTipTapValidateJSON_invalidMark` at line 34):**
```go
// New test, same file/package (services_test), same pattern as line 34
func TestTipTapValidateJSON_linkMarkRejected(t *testing.T) {
	svc := newTestTipTapService(t)
	input := `{"type":"doc","content":[{"type":"paragraph","content":[
		{"type":"text","text":"https://example.com","marks":[{"type":"link","attrs":{"href":"https://example.com"}}]}
	]}]}`
	err := svc.ValidateJSON(input)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "nicht erlaubter Mark-Typ")
	assert.Contains(t, err.Error(), "link")
}
```
This test passes **today, unmodified** — it documents/pins the current (correct) backend-deny
behavior, proving the defect is entirely on the frontend side (autolink silently produces a mark the
backend was always going to reject). Add it in the SAME plan as the `link: false` frontend fix so the
two land together as a matched contract-closure commit.

**Frontend regression coverage:** `RichTextEditor.test.tsx` already mocks `@tiptap/starter-kit` at
module level (`vi.mock('@tiptap/starter-kit', () => ({ default: { configure: vi.fn(() => ({})) } }))`,
line 17). Add an assertion against the mock's call args:
```tsx
// frontend/src/components/editor/RichTextEditor.test.tsx — new test in the existing describe block
import StarterKit from '@tiptap/starter-kit'
// ...
it('deaktiviert die Link-Extension (Tiptap-Contract-Fix)', () => {
  renderToStaticMarkup(<RichTextEditor value={null} onChange={() => {}} />)
  expect(vi.mocked(StarterKit.configure)).toHaveBeenCalledWith(
    expect.objectContaining({ link: false }),
  )
})
```

### Pattern 5: Sanitizer hardening (D2) — reuse the existing `Matching()` convention

**What:** `newTipTapSanitizerPolicy()` (`tiptap_service.go:427-451`) already demonstrates the exact
fix pattern needed at line 447-449 for `img` class (`Matching(regexp.MustCompile(...))`), but the
`span/td/th` class rule at line 434 (`p.AllowAttrs("class").OnElements("span", "td", "th")`) has no
such guard.

**Fix (mirrors the file's own established idiom, not a new pattern):**
```go
// tiptap_service.go:434 — before
p.AllowAttrs("class").OnElements("span", "td", "th")
// after
p.AllowAttrs("class").Matching(
	regexp.MustCompile(`^color-token-[a-z]+$`),
).OnElements("span", "td", "th")
```
The only legitimate producer of a `class` attribute on these elements is `applyMarks`'s own
`color-token-<token>` output (line 383), where `<token>` is already constrained to
`allowedColorTokens` (line 51-54: `default, gray, red, orange, yellow, green, blue, purple` — all
lowercase alpha). The regex is a pure tightening with no known legitimate case it would reject.

`h1` removal from `AllowElements` (line 429): the public page already renders exactly one `<h1>`
(the group name in `FansubHeroSection.tsx:135`), and Story titles render as `<h3>`
(confirmed via `SectionHeader`/Story components' heading level convention). Allowing rich-text-authored
`h1` breaks that hierarchy. Remove `"h1"` from the `AllowElements` call; add a rejection test mirroring
the existing `TestTipTapSanitizeImage_Blocks*` pattern (lines 390-399+) for an `h1` node.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Badge/achievement artwork rendering | A second `next/image` wrapper or bespoke lazy-load logic in `FansubHistorySection` | `AchievementArtwork` + `ResponsiveImage` (Phase 151) | Already handles the optimizer-failure retry (`unoptimized` fallback on `onError`), `sizes` with native `auto` lazy-sizing, and `decorative`/`alt` semantics — reinventing any of this duplicates Phase 151 exactly, which D03 forbids |
| Achievement metadata resolution | A second lookup table keyed by event code | Additive fields on `GROUP_HISTORY_EVENT_OPTIONS` (`emphasis`, `publicLabel`) | D03/A4 explicitly forbid a second registry; the existing `getGroupHistoryEventPresentation()` accessor already has the right shape (single source, `milestone` fallback) |
| Query-count regression protection | A bespoke query-logging middleware or manual `EXPLAIN` script | `backend/internal/repository/query_counter.go`'s `pgx.QueryTracer`, following `member_profile_query_budget_test.go`/`admin_users_query_budget_test.go` | Purpose-built, test-only, already has the fail-closed DB-name guard convention (`team4s_phaseNNN_test` regex) — reuse the template verbatim with `152` substituted |
| Accessibility verification | Manual ARIA audits or a new a11y test helper | `jest-axe` + `src/test/axeSetup.ts` (already globally wired in `vitest.config.ts`) | `FocalCarousel.test.tsx`/`MemberProfileHero.test.tsx` already establish `expect(await axe(container)).toHaveNoViolations()` as the house pattern |
| Rich-text link support (if ever added later, NOT this phase) | A custom URL-policy regex from scratch | N/A — out of scope this phase (D1 prefers `link: false`) | If links become a real future requirement, the existing `img` `src`-pattern `Matching()` convention (`tiptap_service.go:439-441`) is the template to extend, not a new sanitizer mechanism |

**Key insight:** Every "modernization" target in this phase already has a canonical, working analog
somewhere else in the codebase (Phase 151's artwork slot, the query-counter harness, the axe setup,
the sanitizer's own `Matching()` idiom). The work is consistently "find the existing seam and extend
it," never "design something new."

## Common Pitfalls

### Pitfall 1: Deleting `attachGroupLinks` from the public path silently breaks `website_url`

**What goes wrong:** `FansubHeroSection.tsx:59` reads `group.website_url` as its *primary* source for
the hero "Webseite" link chip (falling back to `community_links` only if empty), and
`FansubDeepDiveSection.tsx:17-19` reads `group.website_url` as its *only* source with no fallback at
all. If B1/B2 simply stops calling `attachGroupLinks` (to kill the duplicate query) without also
calling `applyLegacyLinkProjection`, `group.website_url` stays at whatever the raw `fansub_groups`
table column holds — which can be **stale** relative to `fansub_group_links`, since
`applyLegacyLinkProjection` exists specifically to let the links table override the legacy column.

**Why it happens:** The base `SELECT` in `GetGroupBySlug`'s query already includes `website_url`/
`discord_url`/`irc_url` as raw table columns, so removing `attachGroupLinks` doesn't produce an
obviously-broken `nil` — it produces a subtly stale value that only diverges once an admin edits a
link through the newer `fansub_group_links` table without also touching the legacy column.

**How to avoid:** After the single `ListGroupLinks(group.ID)` call, assign `group.Links = links` and
call the existing private `applyLegacyLinkProjection(&group)` (already correctly scoped, takes a
single `*models.FansubGroup`) — zero extra queries, same correctness as today.

**Warning signs:** A page-composition test that seeds `fansub_group_links` with a website URL
different from the `fansub_groups.website_url` column and asserts the *links table* value wins is the
right regression guard — add this alongside B1/B2's implementation, not as an afterthought.

### Pitfall 2: `--history-badge-size` deletion collapses the timeline grid

Covered in detail under Architecture Pattern 2. Concretely: `git grep -n "history-badge-size"` inside
`FansubPublicSections.module.css` before deleting anything — there are 9 declaration sites (confirmed:
lines 281, 485, 496, 512, 562, 614, 652, 658, 664, 670) plus 2 **consumption** sites (lines 291, 303)
that are easy to miss if only searching for `--history-badge-size:` (declarations) and not
`var(--history-badge-size)` (consumption).

### Pitfall 3: The old History test file WILL fail after A2/A3, and D6 must land in the same wave

Confirmed exact assertions that break: `FansubHistorySection.test.tsx` lines 48 (`achGold` regex
match against the `<li>` class attribute), 47/52/53 (`historyTimeline`/`historyTimelinePair`/
`historyTimelineAxisYear` substring checks), and 133-137 (`historyTimelineEventReleases500/1000/5000/
10000`/`historyTimelineEventProjects500` substring checks — these specific class names are exactly
what Architecture Pattern 3 replaces with a generic emphasis class, so they will not exist as strings
in the output at all post-A4). The 5th test (expand/collapse, lines 140-160) is **already
behavior-based** (`screen.getByRole('button', ...)`, `fireEvent.click`) and needs no rewrite — call
this out in the plan so the executor doesn't waste effort rewriting a test that's already correct.
The 6th test (empty state, lines 162-166) also needs no rewrite.

**Concrete replacement assertions for the 4 tests that DO need rewriting**, following the exact house
pattern already used in `AchievementArtwork.test.tsx` (`vi.mock('next/image', ...)` returning a plain
`<img>`, then asserting on `data-achievement-art`/`getAttribute`) and `MemberProfileHero.test.tsx`
(`axe(container)`):
- Order/title/public-label (replaces the `achGold`/`historyTimeline*` string checks): assert DOM order
  via `screen.getAllByRole('listitem')` and check the accessible text content per item, not the
  wrapping `<li>`'s class string.
- Artwork (replaces the emphasis class-name checks and implicitly re-covers A2): render with
  `vi.mock('next/image', ...)` (same mock as `AchievementArtwork.test.tsx`), then assert
  `screen.getByRole('img', { hidden: true })` (decorative) or query by
  `[data-achievement-art="releases_10000"]` for the `src`/presence of the expected badge — do NOT
  assert on `AchievementArtwork.module.css`'s own class names (that's Phase 151's test surface, not
  this phase's).
- Emphasis: assert the new `emphasis`-driven wrapper class or `data-emphasis="legendary"` attribute is
  present on the 5 emphasis-worthy entries and absent on plain `milestone`/`founding` entries —
  behavior (presence of a semantic hook), not the specific CSS module class string.
- Freitext unverändert (NEW test, required by A5): render an admin-authored title like
  `"Projektor gekauft"` and assert the rendered `<strong>` text is **exactly**
  `"Projektor gekauft"`, not `"Fansub-Projektor gekauft"` — this is the direct behavioral proof A5's
  DoD item requires and does not exist in the current test file at all.
- Accessibility: `expect(await axe(container)).toHaveNoViolations()` (same global setup as
  `FocalCarousel.test.tsx`/`MemberProfileHero.test.tsx`), plus an explicit assertion that only ONE of
  the two year spans is present in the accessible tree (e.g. query by role/text and assert
  `historyTimelineAxisYear`'s span has `aria-hidden="true"` via `getAttribute`, not a class check).

### Pitfall 4: `FansubContributorsSection` looks like B3 has UI blast radius — it doesn't

**What goes wrong:** A cursory read of B3 ("ungenutzte Contributors-Projektion") might lead an
executor to also touch `FansubContributorsSection.tsx` (delete it, wire it in, etc.) since it's
sitting right there unused.

**Why it happens:** The component is fully implemented (filters by `visibility === 'public' &&
review_status === 'approved'`, has empty-state handling, has an "auch Mitglied" badge) — it looks
finished, not abandoned, which invites "finishing the job."

**How to avoid:** B3 is scoped to the backend query only (per its DoD line: "ungenutzte Projektion
geprüft"). Neither wiring the component into `page.tsx` nor deleting it is named in any workstream —
doing either would be scope creep against D02 ("no rewrite," targeted fixes only) and risks an
undocumented UI change slipping past Visual QA's checklist (which enumerates Hero/Story/Projects/
Team/History/Media — not a new Contributors section). Leave the component file untouched; only trim
`DomainProjectionRepository.GetFansubGroupDomainProjection`'s `listProjectionContributors` call (its
only caller is this one route, confirmed no other consumer exists).

### Pitfall 5: `buildInitials` vs `getMemberInitials` — genuinely different, not accidentally duplicated

**What goes wrong:** Naively "consolidating" `FansubHeroSection.tsx:28`'s `buildInitials` onto
`fansubTeamInitials.ts`'s `getMemberInitials` changes the Hero's group-name-initials fallback avatar
for two concrete input shapes:
- **Single-word names** (e.g. group name "Coalguys"): `buildInitials` → `"C"` (one letter — its
  `.map(part => part[0])` only ever takes one char per word). `getMemberInitials` → `"CO"` (its
  `parts.length === 1` branch explicitly takes `.slice(0, 2)`).
- **Three-or-more-word names** (e.g. "Foo Bar Baz"): `buildInitials` → first two words' first letters
  = `"FB"`. `getMemberInitials` → first word + **last** word first letters = `"FB"`... but only
  coincidentally for exactly 3 words starting with F/B/B-not-B; for e.g. "Alpha Beta Gamma Delta",
  `buildInitials` → `"AB"` (first two words), `getMemberInitials` → `"AD"` (first + last word).

**Why it happens:** Both functions look superficially identical (split on whitespace, take initials,
uppercase) but encode different truncation rules never reconciled since they were written for
different domains (group display name vs. person name).

**How to avoid:** Per USER-REQUEST C3 ("Wenn fachlich unterschiedlich: Unterschied dokumentieren und
belassen"), the correct resolution is a code comment on `buildInitials` explaining the deliberate
divergence, not a merge. Consolidating onto `getMemberInitials`'s behavior for group names is a
possible product improvement (arguably `"CO"` looks better than `"C"` as a fallback avatar) but is a
visible rendering change that needs explicit Visual QA sign-off, not a silent "cleanup."

## Code Examples

### A1 — the exact `next.config.mjs` fix

```js
// frontend/next.config.mjs — inside images.localPatterns array, alongside the existing
// /member-achievement-badges/** entry (same image class per the audit's reference measurement)
localPatterns: [
  { pathname: '/__phase120-image-probe/alpha-badge.png', search: '' },
  { pathname: '/member-achievement-badges/**', search: '' },
  { pathname: '/history-event-badges-transparent/**', search: '' },  // NEW — Phase 152 A1
  { pathname: '/covers/**', search: '' },
  { pathname: '/media/anime/**', search: '' },
  { pathname: '/media/profile/**', search: '' },
  { pathname: '/media/release-version/**', search: '' },
],
```
Verify per the audit's own commands: `curl -I 'http://192.168.235.196:3000/_next/image?url=%2Fhistory-event-badges-transparent%2Ffounding.png&w=256&q=75'` must return `200` with `content-type: image/webp` after a container restart (dev mode doesn't hot-reload `next.config.mjs`).

### C4 — `CATEGORY_TAG_CLASS` union type

```ts
// frontend/src/components/fansubs/FansubGroupMediaBlock.tsx:24 — before
const CATEGORY_TAG_CLASS: Record<string, string> = { /* ... */ }

// after — mirrors the backend's own authoritative allowlist at
// backend/internal/handlers/fansub_media_review_handler.go:38-44
type FansubMediaCategory =
  | 'gallery' | 'history_screenshot' | 'old_website' | 'forum'
  | 'irc_chat' | 'event_meeting' | 'artwork_fanart' | 'other'

const CATEGORY_TAG_CLASS: Record<FansubMediaCategory, string> = {
  gallery: 'tagGallery',
  history_screenshot: 'tagHistory',
  old_website: 'tagOldweb',
  forum: 'tagForum',
  irc_chat: 'tagIrc',
  event_meeting: 'tagEvent',
  artwork_fanart: 'tagArtwork',
  other: 'tagOther',
}

// categoryTagClass keeps accepting `string` at the call boundary (API data is untyped JSON) and
// still falls back safely for unknown values — only the lookup table gains compile-time exhaustiveness:
function categoryTagClass(category: string): string {
  return CATEGORY_TAG_CLASS[category as FansubMediaCategory] || 'tagOther'
}
```
Note: `PublicFansubMediaItem.category` in `frontend/src/types/fansub.ts:187` stays `category: string`
(it's server-sourced JSON, not a literal type the compiler can narrow) — only the lookup table gets
the union, so a new backend category value fails to compile *at the lookup table* (forcing a
deliberate `| 'new_value'` addition) while still degrading gracefully at runtime via the `|| 'tagOther'`
fallback. This satisfies C4's "neue Kategorien sollen compilezeit-sichtbar werden" without changing
runtime behavior for unknown values.

### C5 — `Promise.allSettled([single])` simplification

```tsx
// frontend/src/app/fansubs/[slug]/page.tsx:65-69 — before
const domainProjectionResult = await Promise.allSettled([getFansubGroupDomainProjection(group.id)])
const domainProjection: DomainProjectionResponse =
  domainProjectionResult[0].status === 'fulfilled'
    ? domainProjectionResult[0].value
    : { members: [], historical: [], contributors: [] }

// after
let domainProjection: DomainProjectionResponse = { members: [], historical: [], contributors: [] }
try {
  domainProjection = await getFansubGroupDomainProjection(group.id)
} catch {
  // Domain projection is best-effort; the page still renders Hero/Story/Projects/History/Media
  // without a Team section if this fails (unchanged fallback behavior, now explicit).
}
```

## State of the Art

Not applicable in the usual "library X replaced by Y" sense — this phase's "state of the art" is
entirely internal: Phase 151 (2026-09-07, this repository) established the artwork-slot pattern that
Phase 152 now needs to adopt for a second consumer.

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Raw `<img>` for achievement/badge artwork, per-family bespoke CSS sizing | `AchievementArtwork` + `ResponsiveImage`, container-query sizing, single size vocabulary | Phase 151 (2026-09-07) | Phase 150/151 already migrated the member-profile badge surfaces; Phase 152 A2/A3 is the second (and per D05, deliberately final for this domain — group history is its own domain) adopter, not a further generalization |

**Deprecated/outdated (within this codebase, as of Phase 152):**
- `FansubHistorySection`'s raw `<img>` + `achievementEventStyle`/`--history-badge-size` combo: superseded by the Phase-151 artwork slot pattern once A2/A3/A4 land.
- `publicDomainTerms`'s runtime string-rewrite: superseded by static `publicLabel` registry fields once A5 lands.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The grid-track replacement value for `--history-badge-size` should be a fixed pixel value or `min-content`/`auto` matching `AchievementArtwork`'s hero step sizes — the exact value needs visual confirmation at 562px/658px container breakpoints, not just code reasoning | Architecture Pattern 2 | Wrong track sizing could visually misalign the timeline's left/right card columns even though no functional bug results — Visual QA (already a mandatory closing block per D09/D11) will catch this before merge |
| A2 | Collapsing the two bespoke emphasis "sparkle" glows (`historyTimelineEventProjects500`/`Releases10000`) into one generic `emphasis: 'legendary'` treatment is the correct resolution of A4+C2 together, rather than keeping two visually distinct hardcoded treatments under a more granular emphasis vocabulary | Architecture Pattern 3 | This is a genuine visible design simplification, not a pure refactor — if the visual distinction between the two events was intentional (not just legacy accretion), this recommendation would need to be revisited with the user before Visual QA sign-off |
| A3 | `getMemberInitials`'s behavior ("CO" for single-word, first+last for 3+ words) is not silently "more correct" than `buildInitials` and the two should stay separate with a documenting comment, rather than one replacing the other | Pitfall 5 | If a reviewer decides consolidation IS wanted, the Hero's single-word-group-name avatar rendering changes visibly — needs explicit sign-off either way |
| A4 | No caller of `GetGroupBySlug`/`GetGroupByID`/`hydrateFansubGroup` exists outside the 5 call sites enumerated in this document (`fansub_repository.go` internal uses, `fansub_groups.go:134/188`, `fansub_merge.go:80`, `app_auth_invitations.go:129`) | Architecture Patterns (Recommended Public Group Load Path) | Verified via `grep -rn` across `backend/internal/` excluding `_test.go` files — high confidence, but a rename/wrapper added after this research would not be caught; re-run the grep immediately before implementing B1/B2 |

**All four items above are reasoning/design-judgment calls built on code that WAS directly verified
(file/line confirmed) — none are unverified factual claims about library behavior or package
existence. They are flagged because they involve a visible-behavior tradeoff the planner/user should
consciously accept, not because the underlying code facts are uncertain.**

## Open Questions

1. **Should the P152-01..14 requirement IDs be added to `.planning/REQUIREMENTS.md` before or during
   planning?**
   - What we know: The IDs and their full descriptions already exist in `.planning/ROADMAP.md` (lines
     1239-1258, added alongside the Phase 152 roadmap entry). `REQUIREMENTS.md` does not yet have a
     "Phase 152" section, but `REQUIREMENTS.md` already has a precedent for this exact situation — a
     "## Phase 151 — Additive scope" section appended after the main v1.4 table, with its own
     Requirement/Phase/Status traceability rows.
   - What's unclear: Whether the planner or a separate GSD step is expected to append this block.
   - Recommendation: The planner should add an equivalent "## Phase 152 — Additive scope" block to
     `REQUIREMENTS.md`, copying the 14 rows from `ROADMAP.md` verbatim, following the Phase 151
     precedent exactly (checkbox list + traceability table, status "Pending").

2. **Exact grid-track replacement value for `--history-badge-size` (Pattern 2 / Assumption A1).**
   - What we know: The variable is consumed at 2 sites (grid track width, badge box width/height) and
     declared at 9 sites (5 responsive breakpoints + 4 `releases_10000`-specific overrides being
     deleted).
   - What's unclear: Whether a single fixed value (e.g. `240px`, `AchievementArtwork`'s largest hero
     step) or a `min-content`/`auto` track reads better visually across all 8 QA viewports.
   - Recommendation: Defer to implementation + immediate visual check at 320/390/768/1024/1440px
     rather than deciding in research; this is a one-line CSS value with a fast visual feedback loop.

3. **Are the Hero logo/banner URLs (`group.logo_url`/`banner_url`) actually shaped as
   `/api/v1/media/**`, matching the already-configured `configuredApiMediaPatterns()` remotePattern
   (E1/E2)?**
   - What we know: `resolveApiUrl` routes any value starting with `/api/` through
     `resolvePublicApiUrl` (which prefixes `NEXT_PUBLIC_API_URL`), and `next.config.mjs` already
     declares a `remotePatterns` entry for `${NEXT_PUBLIC_API_URL}/api/v1/media/**`. If `logo_url`/
     `banner_url` values from the DB are already under that path shape, E1/E2 might be a
     config-already-sufficient swap (`unoptimized` → drop the flag) with no `next.config.mjs` change
     at all.
   - What's unclear: The actual DB-stored value shape for `logo_url`/`banner_url` on the live
     `new-subs` group — not queried in this research pass (E-workstream is explicitly lower priority,
     "only if clean and low-risk").
   - Recommendation: First Wave-5 task should be `docker compose exec -T team4sv30-db psql ... -c
     "SELECT logo_url, banner_url FROM fansub_groups WHERE slug='new-subs';"` to settle this before
     writing any E1/E2 code.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker Compose stack (backend/frontend/db/keycloak/redis/mailpit) | All waves | ✓ (per CONTEXT.md's documented running state) | — | — |
| `golang:1.25-alpine` container for host-Go-less Go test runs | B4, D1 backend tests | ✓ (documented pattern already in use, per CONTEXT.md "Betriebliche Randbedingungen") | 1.25 (matches `go.mod`) | — |
| Dedicated throwaway Postgres DB `team4s_phase152_test` (schema-only dump of `team4s_v2`) | B4 query-budget test | Must be created fresh this phase (not yet existing) | — | None — B4's test is `skip-if-unset` via `TEAM4S_PHASE152_TEST_DSN`, so its absence degrades to "test skipped," not a blocker, but the DoD item "Query-Budget-Test vorhanden" requires it to actually run at least once before phase close |
| Frontend container `vitest`/`typecheck`/`eslint` execution path | All frontend test/lint work | ✓ (`docker compose exec -T team4sv30-frontend sh -c "cd /app && ..."`) | — | — |
| Frontend prod build via `docker compose build team4sv30-frontend` | Final verification (P152-14) | ✓ | — | `npm run build` inside the running container is explicitly documented as unreliable (stale `.next` volume) — do not use as a substitute |
| Playwright/browser evidence collector for Visual QA | P152-14 | ✓, with the documented zombie-Chromium caveat (`docker restart` + image-cache warm before each run) | — | — |

**Missing dependencies with no fallback:** None — all required tooling is already documented as
present and working in `152-CONTEXT.md`'s operational-constraints section.

**Missing dependencies with fallback:** The `team4s_phase152_test` DB doesn't exist yet but has a
documented, low-effort creation path (schema-only `pg_dump` from `team4s_v2`, matching the
`member_profile_query_budget_test.go`/`admin_users_query_budget_test.go` precedent exactly) — this is
setup work for the B4 plan, not a blocked dependency.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Frontend framework | Vitest ^3.2.4, `@testing-library/react` ^16.3.0, `jest-axe` ^11.0.0 |
| Frontend config file | `frontend/vitest.config.ts` (setupFiles includes `src/test/axeSetup.ts`) |
| Backend framework | Go 1.25 stdlib `testing` + `testify` v1.9.0 (`assert`/`require`) |
| Backend config file | none — standard `go test ./...` |
| Quick run command (frontend) | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run <path>"` |
| Quick run command (backend) | Go container run against `team4s_phase152_test` DSN, per the documented Phase-131 pattern |
| Full suite command (frontend) | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run test && npm run typecheck && npm run lint"` |
| Full suite command (backend) | `go test ./...` inside the `golang:1.25-alpine` container, network `team4s_default` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|--------------------|-------------|
| P152-01 | `/_next/image` for history badges returns 200/WebP/srcset | manual + smoke (curl) | `curl -sI '.../_next/image?url=...history-event-badges-transparent...'` | ❌ new smoke step, no existing test file target |
| P152-02 | History badges render via `AchievementArtwork` | unit (component) | `vitest run FansubHistorySection.test.tsx` | ✅ existing file, rewritten per Pitfall 3 |
| P152-03 | No `--history-badge-size`/`releases_10000` special sizing/unexplained pixel shifts | unit (grep-based CI-lite check optional) + visual | Visual QA viewport matrix; no automated CSS-absence test recommended (low value, brittle) | — |
| P152-04 | `achievementEventStyle` replaced by registry fields | unit (component) | `vitest run FansubHistorySection.test.tsx` (Emphasis assertions) | ✅ same file as P152-02 |
| P152-05 | `publicDomainTerms` removed, admin free text unchanged | unit (component) | `vitest run FansubHistorySection.test.tsx` (new Freitext test) | ✅ same file |
| P152-06 | Image performance documented | manual (measurement, not a test) | curl + byte-size capture, same methodology as the audit's reference measurement | — |
| P152-07 | Public load path query reduction, other consumers intact | integration (Go query-budget) + existing repo tests | new `fansub_public_profile_query_budget_test.go` + `go test ./internal/repository/... ./internal/handlers/...` | ❌ Wave 0 gap |
| P152-08 | Contributors projection decision | integration (Go) | Same query-budget test as P152-07/09 (assert contributor query absent from the public path) | ❌ Wave 0 gap |
| P152-09 | Query-budget gate | integration (Go), following `member_profile_query_budget_test.go` template | `TEAM4S_PHASE152_TEST_DSN=... go test ./internal/repository/... -run QueryBudget` | ❌ Wave 0 gap — new file needed |
| P152-10 | Dead CSS removed, C3/C4/C5 resolved | unit (existing component tests must still pass) + typecheck | `vitest run` + `npm run typecheck` | ✅ existing suite, no new file strictly required beyond C4's type addition |
| P152-11 | Tiptap contract closure | unit (Go) + unit (frontend) | `go test ./internal/services/... -run TipTap` + `vitest run RichTextEditor.test.tsx` | ✅ both files exist, add tests per Pattern 4 |
| P152-12 | Accessibility fixes + axe coverage | unit (jest-axe) | `vitest run FansubHistorySection.test.tsx FansubGroupMediaBlock.test.tsx` | ❌ `FansubGroupMediaBlock.test.tsx` does not yet exist — Wave 0 gap |
| P152-13 | Page composition tests, History tests behavior-based | unit | `vitest run page.test.tsx FansubHistorySection.test.tsx` | ✅ both exist, both need substantial additions/rewrite |
| P152-14 | Visual QA, build, independent verification | manual + full suite | Full suite commands above + Playwright evidence collection | — |

### Sampling Rate

- **Per task commit:** targeted `vitest run <file>` / `go test ./internal/<package>/...` for the files touched.
- **Per wave merge:** full frontend suite (`test && typecheck && lint`) + full backend suite (`go test ./...`).
- **Phase gate:** Full suite green before `/gsd:verify-work`, plus the Playwright visual matrix (P152-14) and the query-budget test (P152-09) both green.

### Wave 0 Gaps

- [ ] `backend/internal/repository/fansub_public_profile_query_budget_test.go` — new file, follows `member_profile_query_budget_test.go`/`admin_users_query_budget_test.go` template, `TEAM4S_PHASE152_TEST_DSN` env var, `team4s_phase152_test(?:_[a-z0-9]+)?` DB-name guard regex — covers P152-07/08/09
- [ ] `frontend/src/components/fansubs/__tests__/FansubGroupMediaBlock.test.tsx` — does not exist yet; needed for P152-12's axe coverage and the media-thumbnail double-labeling fix (D3)
- [ ] `team4s_phase152_test` throwaway DB — schema-only `pg_dump` from `team4s_v2`, one-time setup, documented pattern
- [ ] No new test framework/config needed — Vitest, jest-axe, testify, and the query-counter harness are all already wired

## Security Domain

`security_enforcement` is not explicitly disabled in `.planning/config.json` (absent = enabled), so
this section is included, scoped to what actually applies. `/fansubs/[slug]` is an unauthenticated
public read page — most ASVS categories (auth, session, access control) are structurally out of scope
for this phase; the one live surface is rich-text input validation (Tiptap), which this phase touches
directly via D1/D2.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Public page has no auth surface; the admin-authenticated write path (group history creation) is unchanged by this phase except for the Tiptap contract fix, and that fix does not touch auth |
| V3 Session Management | No | No session state touched |
| V4 Access Control | No | No new endpoints, no permission changes; `public-profile`/`domain-projection` remain unauthenticated-readable as today |
| V5 Input Validation | Yes | `TipTapService.ValidateJSON` allowlist (nodes/marks/color tokens) — D1 tightens the mark allowlist story via `link: false`, D2 tightens the sanitizer's `class`/`h1` allowances |
| V6 Cryptography | No | Not touched |
| V12 File/Resource Handling | Marginal | `next.config.mjs` `localPatterns`/`remotePatterns` gate which local paths the image optimizer will serve — A1 adds one narrowly-scoped `pathname` glob (`/history-event-badges-transparent/**`), following the exact narrowing precedent already documented in the file's own T-143-07-01 comment (explicit allowlist, not a blanket `/**`) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stored XSS via rich-text `<a href="javascript:...">` or unconstrained `class` attributes | Tampering/Elevation of Privilege | bluemonday allowlist-based sanitization (`newTipTapSanitizerPolicy`) — D2 tightens the one under-constrained rule (`class` on `span/td/th`) using the file's own established `Matching(regexp...)` idiom |
| Contract drift enabling a client to produce markup the server didn't intend to allow | Tampering | Backend `ValidateJSON` allowlist is authoritative and independent of frontend editor config — D1's fix keeps the two in sync (frontend stops producing what backend already rejects) rather than loosening the backend to match the frontend, which is the safer direction |
| Local-path image optimizer abuse (serving arbitrary filesystem paths through `/_next/image`) | Information Disclosure | `next.config.mjs`'s `localPatterns` is already an explicit allowlist (not `dangerouslyAllowLocalIP`-style wildcarding) — A1 adds one more narrow entry, does not weaken the mechanism |

## Sources

### Primary (HIGH confidence — direct code inspection at HEAD `4cce330f`, one docs-only commit past the audited `5e896cd2`)

- `frontend/src/components/fansubs/FansubHistorySection.tsx` (full read)
- `frontend/src/components/fansubs/FansubPublicSections.module.css` (targeted reads: lines 1-70, 190-320, 427-473, 560-680, 879-883)
- `frontend/src/lib/group-history-events.ts` (full read)
- `frontend/src/components/profile/AchievementArtwork.tsx`, `AchievementArtwork.module.css`, `AchievementArtwork.test.tsx` (full/targeted reads)
- `frontend/src/components/profile/RoleAchievementCard.tsx` (full read — the `artworkStyles.container` embedding convention)
- `frontend/src/components/ui/ResponsiveImage.tsx` (full read)
- `frontend/src/components/fansubs/FansubGroupMediaBlock.tsx`, `FansubHeroSection.tsx`, `FansubDeepDiveSection.tsx`, `FansubContributorsSection.tsx` (full reads)
- `frontend/src/components/fansubs/fansubTeamInitials.ts` (full read)
- `frontend/src/app/fansubs/[slug]/page.tsx`, `page.test.tsx`, `pageHelpers.ts` (full reads)
- `frontend/src/components/fansubs/__tests__/FansubHistorySection.test.tsx` (full read)
- `frontend/src/components/editor/RichTextEditor.tsx` (targeted, lines 420-469), `RichTextEditor.test.tsx` (targeted, lines 1-60)
- `frontend/src/types/fansub.ts` (targeted, lines 1-60, 187, 292-311)
- `frontend/next.config.mjs` (full read)
- `frontend/vitest.config.ts` (targeted, setupFiles)
- `frontend/src/test/axeSetup.ts` (full read)
- `frontend/src/components/ui/FocalCarousel.test.tsx`, `frontend/src/components/profile/MemberProfileHero.test.tsx` (targeted, axe usage)
- `backend/internal/repository/fansub_repository.go` (targeted, lines 60-330, 690-700, 1690-1920)
- `backend/internal/handlers/fansub_groups.go` (targeted, lines 130-245)
- `backend/internal/handlers/fansub_group_links.go`, `fansub_merge.go`, `app_auth.go`, `app_auth_invitations.go` (grep-confirmed call sites)
- `backend/internal/repository/domain_projection_repository.go` (targeted, lines 1-100)
- `backend/internal/handlers/domain_projection_handler.go` (full read)
- `backend/cmd/server/main.go` (grep-confirmed route registrations, lines 432, 584-601)
- `backend/internal/models/fansub.go` (targeted, lines 36-90)
- `backend/internal/services/tiptap_service.go` (full read)
- `backend/internal/services/tiptap_service_test.go` (targeted, lines 1-60, test name list)
- `backend/internal/repository/query_counter.go`, `member_profile_query_budget_test.go` (targeted, header/setup)
- `backend/internal/handlers/fansub_media_review_handler.go` (grep-confirmed category allowlist)
- `frontend/src/lib/fansub-labels.ts` (targeted, category label map)
- `frontend/src/components/groups/GroupHistoryForm.tsx`, `GroupHistorySection.tsx` (grep-confirmed registry consumption shape)
- `frontend/package.json`, `backend/go.mod` (version confirmation)
- `.planning/config.json`, `.planning/ROADMAP.md` (lines 1220-1265), `.planning/REQUIREMENTS.md`, `CLAUDE.md`, `.codex/skills/team4s-implementation-contract/SKILL.md`
- `git log`/`git status` (confirmed zero code drift since the audit's HEAD; only a docs-scaffolding commit landed)

### Secondary (MEDIUM confidence)

None used — every claim in this document traces to a directly-read file at current HEAD.

### Tertiary (LOW confidence)

None — this research performed zero WebSearch/external lookups; the entire task was internal
codebase verification (no external library behavior needed investigation, per D04's "no new
library" constraint).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all versions read directly from `package.json`/`go.mod`
- Architecture: HIGH — every referenced function/line was read directly at current HEAD; caller graphs for shared backend functions were exhaustively grepped
- Pitfalls: HIGH — all five pitfalls trace to specific, quoted code (not inferred from naming or comments alone)
- Visual/design judgment calls (Assumptions A1-A3): MEDIUM — code-grounded but involve a rendered-appearance tradeoff that benefits from human visual confirmation during the mandatory Visual QA block

**Research date:** 2026-09-08
**Valid until:** Effectively unbounded for the code-fact claims (this is a closed, non-externally-dependent codebase snapshot) — but re-verify file/line numbers if any other GSD phase or manual commit lands on `main` between this research and Wave 1 execution, since the entire value of this document is its exact-line-number precision.
