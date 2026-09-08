# Phase 152: Public-Fansub-Gruppenseite — Pattern Map

**Mapped:** 2026-09-08
**Files analyzed:** 17 (all modified; 3 net-new)
**Analogs found:** 17 / 17 (this phase is consolidation-only — every touched file is itself the
primary artifact; analogs below are sibling patterns to copy *into* each file, per CONTEXT.md D02/D03
"reuse existing seams, no new architecture")

> **Reading note for the planner:** unlike a greenfield phase, most rows below do not need a
> "different file to imitate" — the target file already exists and the fix is narrow. Where CONTEXT.md/
> RESEARCH.md/UI-SPEC.md already pinned an exact code shape (Migration Contract, Emphasis Contract,
> Code Examples), this document does not re-derive it — it points at the authoritative section and adds
> the concrete analog excerpt the planner needs to implement it correctly.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `frontend/next.config.mjs` | config | request-response (image proxy) | itself, `localPatterns` array (existing entries) | exact — additive array entry |
| `frontend/src/components/fansubs/FansubHistorySection.tsx` | component | transform (SSR data → client render) | `frontend/src/components/profile/RoleAchievementCard.tsx` (artwork slot embedding) | exact — same Phase-151 consumer pattern |
| `frontend/src/components/fansubs/FansubPublicSections.module.css` | config (CSS module) | transform | itself + `frontend/src/components/profile/AchievementArtwork.module.css` (token/size authority) | exact — token-source swap only |
| `frontend/src/lib/group-history-events.ts` | utility (registry) | CRUD (static lookup) | itself — additive fields on existing shape | exact |
| `frontend/src/components/fansubs/__tests__/FansubHistorySection.test.tsx` | test | request-response (render assertions) | `frontend/src/components/profile/AchievementArtwork.test.tsx` (next/image mock) + `MemberProfileHero.test.tsx` (axe) | exact |
| `frontend/src/components/fansubs/FansubGroupMediaBlock.tsx` | component | transform | itself — a11y/type fix only | exact |
| `frontend/src/components/fansubs/__tests__/FansubGroupMediaBlock.test.tsx` | test | request-response | `MemberProfileHero.test.tsx` (axe pattern), `FansubHistorySection.test.tsx` (existing sibling component test shape) | role-match, NEW FILE |
| `frontend/src/components/fansubs/FansubHeroSection.tsx` | component | transform | `frontend/src/components/fansubs/fansubTeamInitials.ts` (documented divergent sibling, NOT to merge into) | partial — documentation-only change |
| `frontend/src/app/fansubs/[slug]/page.tsx` | route (Server Component) | request-response | itself — simplification of existing `Promise.allSettled([single])` | exact |
| `frontend/src/app/fansubs/[slug]/page.test.tsx` | test | request-response | itself + `FansubHistorySection.test.tsx` (mocking shape) | exact |
| `frontend/src/components/editor/RichTextEditor.tsx` | component (client editor) | event-driven | itself — one-line `StarterKit.configure` addition | exact |
| `frontend/src/components/editor/RichTextEditor.test.tsx` | test | request-response | itself — existing `vi.mock('@tiptap/starter-kit', ...)` scaffold | exact |
| `backend/internal/repository/fansub_repository.go` | repository | CRUD | itself — additive `getPublicGroupBase`/`attachPublicReleaseVersionsCount`, reusing `populateCountMap`/`ListGroupLinks`/`applyLegacyLinkProjection` | exact |
| `backend/internal/repository/domain_projection_repository.go` | repository | CRUD | itself — remove one call site | exact |
| `backend/internal/repository/fansub_public_profile_query_budget_test.go` | test (integration, Go) | batch/CRUD | `backend/internal/repository/member_profile_query_budget_test.go` (Phase 131 template) | exact, NEW FILE |
| `backend/internal/services/tiptap_service.go` | service | transform (validate/sanitize) | itself — extend `allowedTipTapMarks`... **no**, per D1 preferred fix `link` stays OUT of the allowlist; extend `newTipTapSanitizerPolicy`'s existing `Matching()` idiom (own `img` rule) for D2 | exact |
| `backend/internal/services/tiptap_service_test.go` | test (Go) | request-response | itself — existing `TestTipTapValidateJSON_invalidMark`-shaped sibling test | exact |

## Pattern Assignments

### `frontend/src/components/fansubs/FansubHistorySection.tsx` (component, transform)

**Binding shape:** already fully specified in `152-UI-SPEC.md` → "Migration Contract — Artwork Slot
Embedding" (section, lines ~128-226) and "Emphasis Contract" (lines ~229-280). Implement exactly what
those sections show — do not re-derive the slot/emphasis shape independently.

**Analog for the container-query wrapper convention:** `frontend/src/components/profile/RoleAchievementCard.tsx:55-75`
```tsx
import { AchievementArtwork } from './AchievementArtwork'
import artworkStyles from './AchievementArtwork.module.css'
// ...
<div className={artworkStyles.container} data-role-card-container>
  <Card ...>
    {artworkItem && descriptor ? (
      <AchievementArtwork
        descriptor={descriptor}
        badgeCode={artworkItem.badge_code}
        alt={heroAlt}
        size="hero"
        className={roleBadgeCardStyles.roleHeroArtwork}
      />
    ) : null}
    ...
```
For History: `artworkStyles.container` wraps `.historyTimelinePair` (the full grid row), **not**
`.historyTimelineBadge` alone — UI-SPEC explains why (container-query width floor). Descriptor is
always `{ kind: 'direct', src: presentation.imageSrc }`, `size="hero"`, `decorative`, `alt=""`.

**Current file to be replaced (read in full, 139 lines):**
- `achievementStyle()` (lines 18-29) — tone→class if-chain — **keep** (data-driven, not a hardcode per
  CONTEXT audit finding, only mechanically clunky; UI-SPEC does not ask to remove it).
- `achievementEventStyle()` (lines 31-38) — 5-code hard if-chain — **replace** with the Emphasis
  Contract's single `emphasis`-driven selector (`presentation.emphasis === 'legendary' ? styles.historyTimelineEmphasisLegendary : null`).
- `publicDomainTerms()` (lines 44-59) + `publicHistoryLabel()`/`publicHistoryTitle()` (61-71) —
  **delete**; replace with `presentation.publicLabel` read directly from the registry (Copywriting
  Contract table in UI-SPEC has the exact 23 values). Admin `item.title` free text renders byte-for-byte
  unchanged (no `publicDomainTerms(title)` call at all).
- Raw `<img>` block (line 117) — **replace** per Migration Contract code block above.
- `INITIAL_VISIBLE_HISTORY = 6` (line 16) — **keep unchanged**.
- Axis-year span (line 115) — add `aria-hidden="true"` per UI-SPEC Accessibility Contract.

**Error handling:** none needed — this is pure client render, no I/O in this file.

---

### `frontend/src/components/fansubs/FansubPublicSections.module.css` (CSS module, transform)

**Analog for the token idiom to copy into the emphasis blocks:** `.achLegendary` tone class already in
this same file (verified at CONTEXT.md audit line ~247-251):
```css
.achLegendary {
  --ach-color: #a16207;
  --ach-grad: linear-gradient(135deg, #fef3c7, #c4b5fd 52%, #67e8f9);
  --ach-soft: #fef3c7;
}
```
Replace `#7c3aed`, `#facc15`, and their `rgba(...)` derivatives in the two emphasis glow blocks
(`.historyTimelineEventProjects500`/`.historyTimelineEventReleases10000`, lines ~572-648) with
`color-mix(in srgb, var(--ach-color) N%, transparent)` / `var(--ach-grad)` / `var(--ach-soft)`, per
UI-SPEC's "Emphasis tokens" section — collapse both into one `.historyTimelineEmphasisLegendary`
selector.

**Grid-track fix (exact values locked in UI-SPEC "Migration Contract" §2):**
```css
/* before (line ~291) */
.historyTimelinePair { grid-template-columns: minmax(0,1fr) var(--history-badge-size) minmax(0,1fr); }
/* after */
.historyTimelinePair { grid-template-columns: minmax(0,1fr) 240px minmax(0,1fr); }

/* before (lines ~302-303) */
.historyTimelineBadge { width: var(--history-badge-size); height: var(--history-badge-size); }
/* after: remove the width/height declarations entirely — size comes from AchievementArtwork's
   own container-query slot; .historyTimelineBadge keeps display:grid; place-items:center */
```
Delete all 9 `--history-badge-size` declaration sites (lines 281, 485, 496, 512, 562, 614, 652, 658,
664, 670 per RESEARCH.md Pitfall 2) plus the 4 `releases_10000`-specific size/pixel-shift overrides
(614, 652, 658, 664, 670) and `--history-image-x/y` (598-616) per D08 (remove, don't relocate).

**Dead-class removal:** the 11 confirmed-dead classes (`ach`, `achGrid`, `achImage`, `achBody`,
`achNote`, `achType`, `achYear`, `historyEntry`, `medal`, `milestoneEntry`, `projectYear`) plus their
media-query blocks (CONTEXT.md lines 428-460) — grep-verify no `styles[...]` dynamic reference exists
(CONTEXT.md already lists the tone/event/tag classes that ARE dynamically referenced and must NOT be
touched).

---

### `frontend/src/lib/group-history-events.ts` (utility/registry, CRUD)

**Analog:** the file itself — this is a pure additive-field extension of an existing exported
interface, the canonical "extend, don't replace" pattern this whole phase follows (D03/D06).

**Current shape (51 lines, full file read):**
```ts
export interface GroupHistoryEventPresentation {
  value: string
  label: string
  category: GroupHistoryEventCategory
  imageSrc: string
  tone: 'gold' | 'accent' | 'green' | 'pink' | 'muted' | 'blue' | 'violet' | 'red' | 'legendary'
}
```
**Add exactly two fields** (per UI-SPEC "Emphasis Contract" + "Copywriting Contract" — locked, do not
invent additional fields):
```ts
export interface GroupHistoryEventPresentation {
  // ...existing fields unchanged...
  emphasis: 'none' | 'legendary'
  publicLabel: string
}
```
Set `emphasis: 'legendary'` on exactly `projects_500` and `releases_10000` (both already `tone:
'legendary'`); `'none'` on the other 21. Set `publicLabel` per the exact 23-row table in UI-SPEC's
Copywriting Contract (14 unchanged, 9 gain "Fansub-" prefix). **Before editing, grep for other
consumers** — `GroupHistoryForm.tsx`/`GroupHistorySection.tsx` (admin forms) read this registry too;
additive fields are safe, but confirm no consumer does an exhaustive object-shape check that would
break on new keys.

---

### `frontend/src/components/fansubs/FansubGroupMediaBlock.tsx` (component, transform)

**A11y fix (UI-SPEC "Accessibility Contract" → Media thumbnail double-labeling, binding):**
```tsx
// line 98 — keep as-is (Button is the accessible-name owner)
aria-label={title}
// line 104 — change alt={title} to alt=""
<Image
  src={resolvedImageUrl}
  alt=""              // NEW — was alt={title}; Button's aria-label is now the sole accessible name
  fill
  sizes={MEDIA_IMAGE_SIZES}
  loading="lazy"
  className={styles.mediaImage}
  unoptimized
/>
```

**C4 type fix — exact code already given in RESEARCH.md "Code Examples → C4":**
```ts
// before (line 24)
const CATEGORY_TAG_CLASS: Record<string, string> = { /* ... */ }
// after — union type mirrors backend allowlist (fansub_media_review_handler.go:38-44)
type FansubMediaCategory =
  | 'gallery' | 'history_screenshot' | 'old_website' | 'forum'
  | 'irc_chat' | 'event_meeting' | 'artwork_fanart' | 'other'
const CATEGORY_TAG_CLASS: Record<FansubMediaCategory, string> = { gallery: 'tagGallery', /* ... */ }
function categoryTagClass(category: string): string {
  return CATEGORY_TAG_CLASS[category as FansubMediaCategory] || 'tagOther'
}
```
`PublicFansubMediaItem.category` stays `string` (server JSON) — only the lookup table gets the union.

---

### `frontend/src/components/fansubs/__tests__/FansubHistorySection.test.tsx` (test)

**Analog 1 — `next/image` mock (needed because `AchievementArtwork` renders via `ResponsiveImage` →
`next/image`):** `frontend/src/components/profile/AchievementArtwork.test.tsx:10-22`
```tsx
vi.mock('next/image', () => ({
  default: ({ alt, priority, unoptimized, ...props }: ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean; unoptimized?: boolean }) => {
    void priority
    void unoptimized
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} {...props} />
  },
}))
```
Then assert via `data-achievement-art`/`data-achievement-slot` attributes (same file, lines 38-45),
**not** `AchievementArtwork.module.css` class names — Phase 151's own test surface owns those.

**Analog 2 — axe coverage:** `frontend/src/components/profile/MemberProfileHero.test.tsx:165-174`
```tsx
it('hat keine Axe-Verstöße ...', async () => {
  const { container } = render(<Component ... />)
  expect(await axe(container)).toHaveNoViolations()
})
```

**Existing file to rewrite (full file read, 167 lines) — exactly which assertions break, per
RESEARCH.md Pitfall 3:**
- Line 48 `toMatch(/achGold/)` — breaks (class string moves) → replace with accessible-text/order
  assertion via `screen.getAllByRole('listitem')`.
- Lines 47/52/53 `historyTimeline`/`historyTimelinePair`/`historyTimelineAxisYear` substring checks —
  these class names still exist post-migration (only the badge internals change) — **verify before
  deleting**, may not need rewriting.
- Lines 133-137 (`historyTimelineEventReleases500/1000/5000/10000`/`Projects500`) — breaks entirely
  (Emphasis Contract collapses these 5 to one shared class on 2 entries only) → replace with
  `data-emphasis="legendary"` presence/absence assertions.
- Lines 140-160 (expand/collapse) — **already behavior-based, no rewrite needed** (uses
  `screen.getByRole('button', ...)` + `fireEvent.click`).
- Lines 162-166 (empty state) — **already fine, no rewrite needed**.
- **New test required (A5 regression guard, does not exist today):** admin-authored title
  `"Projektor gekauft"` renders byte-for-byte unchanged, not `"Fansub-Projektor gekauft"`.

---

### `frontend/src/components/fansubs/__tests__/FansubGroupMediaBlock.test.tsx` (test, NEW FILE)

**Analog for overall shape:** `FansubHistorySection.test.tsx` (sibling component in the same
directory, same `renderToStaticMarkup`/`render`+`screen` mix) combined with the axe pattern from
`MemberProfileHero.test.tsx:165-174` shown above. Cover: (1) `Button`'s `aria-label` carries the title,
(2) inner `<Image>` has `alt=""`, (3) `expect(await axe(container)).toHaveNoViolations()`.

---

### `frontend/src/app/fansubs/[slug]/page.tsx` (route, request-response)

**C5 simplification — exact before/after already given in RESEARCH.md "Code Examples → C5"** (lines
65-69 today):
```tsx
// before
const domainProjectionResult = await Promise.allSettled([getFansubGroupDomainProjection(group.id)])
const domainProjection: DomainProjectionResponse =
  domainProjectionResult[0].status === 'fulfilled' ? domainProjectionResult[0].value : { members: [], historical: [], contributors: [] }
// after
let domainProjection: DomainProjectionResponse = { members: [], historical: [], contributors: [] }
try {
  domainProjection = await getFansubGroupDomainProjection(group.id)
} catch {
  // Domain projection is best-effort; page still renders without a Team section on failure.
}
```

---

### `frontend/src/components/fansubs/FansubHeroSection.tsx` (component, transform)

**Analog (deliberately NOT to merge into, per RESEARCH.md Pitfall 5 / C3):**
`frontend/src/components/fansubs/fansubTeamInitials.ts`'s `getMemberInitials` — behaviorally different
truncation rules (single-word: 1 vs 2 chars; 3+-word: first-two vs first+last). Per C3, add a code
comment on `buildInitials` (line 28) documenting the deliberate divergence — do not consolidate onto
`getMemberInitials`'s behavior (that is a visible rendering change requiring explicit sign-off, not a
default action this phase takes).

---

### `frontend/src/components/editor/RichTextEditor.tsx` (component, event-driven)

**Exact fix, RESEARCH.md "Architecture Pattern 4":**
```tsx
// line 446
StarterKit.configure({
  codeBlock: false,
  code: false,
  strike: false,
  hardBreak: false,
  link: false,   // NEW — prevents autolink from producing a mark the backend allowlist rejects
}),
```

**Test analog — existing mock scaffold already in file** (`RichTextEditor.test.tsx:17`):
```tsx
vi.mock('@tiptap/starter-kit', () => ({ default: { configure: vi.fn(() => ({})) } }))
```
Add assertion:
```tsx
import StarterKit from '@tiptap/starter-kit'
it('deaktiviert die Link-Extension (Tiptap-Contract-Fix)', () => {
  renderToStaticMarkup(<RichTextEditor value={null} onChange={() => {}} />)
  expect(vi.mocked(StarterKit.configure)).toHaveBeenCalledWith(expect.objectContaining({ link: false }))
})
```

---

### `backend/internal/repository/fansub_repository.go` (repository, CRUD)

**Current `GetPublicProfileBySlug` (full function read, lines 259-305) — the exact target to refactor:**
```go
func (r *FansubRepository) GetPublicProfileBySlug(ctx context.Context, slug string) (*models.PublicFansubProfileResponse, error) {
	group, err := r.GetGroupBySlug(ctx, slug)   // <- calls hydrateFansubGroup: 5 counts + 1 link query
	if err != nil {
		return nil, err
	}
	// ... stories/projects/history/media (4 queries, unchanged) ...
	links, err := r.ListGroupLinks(ctx, group.ID)   // <- DUPLICATE of attachGroupLinks' query
	if err != nil {
		return nil, err
	}
	resp.CommunityLinks = links
	return resp, nil
}
```
**Reusable private helpers already in this file** (lines 1695-1920, full read) — do NOT rewrite these,
call them additively from a new `getPublicGroupBase`:
- `populateCountMap(ctx, query, ids, assign, indexByID)` (1862-1892) — generic single-count-column
  batch loader; reuse for the ONE needed count (`release_versions_count`), following the exact call
  shape used inside `attachGroupCounts` (1739-1755) for that count today.
- `applyLegacyLinkProjection(item *models.FansubGroup)` (1894-1908) — takes a single group pointer, no
  extra query; call this directly after the single `ListGroupLinks` call (per RESEARCH.md Pitfall 1 —
  do NOT skip this or `website_url`/`discord_url`/`irc_url` go stale).
- `ListGroupLinks` (line 695, not shown here — read directly if further detail needed) — already the
  correct single query; the fix is removing `attachGroupLinks`' internal duplicate call, not this one.

**Target shape (from RESEARCH.md "Recommended Public Group Load Path", already fully worked out):**
```go
func (r *FansubRepository) GetPublicProfileBySlug(ctx context.Context, slug string) (*models.PublicFansubProfileResponse, error) {
	group, err := r.getPublicGroupBase(ctx, slug)                    // NEW: base SELECT, no hydration
	// ...
	if err := r.attachPublicReleaseVersionsCount(ctx, group); err != nil { ... }  // NEW: 1 populateCountMap call
	// ... stories/projects/history/media unchanged ...
	links, err := r.ListGroupLinks(ctx, group.ID)                    // now the ONLY link query
	group.Links = links
	applyLegacyLinkProjection(group)                                 // reuse, zero extra queries
	resp.CommunityLinks = links
	return resp, nil
}
```
**Critical constraint (verified caller graph, do not break):** `GetGroupBySlug`/`GetGroupByID`/
`hydrateFansubGroup`/`attachGroupCounts`/`attachGroupLinks` MUST stay unchanged — they serve
`fansub_groups.go:134/188`, `fansub_merge.go:80`, `app_auth_invitations.go:129`. The new functions are
additive siblings, not replacements. Re-run `grep -rn "GetGroupBySlug\|GetGroupByID\|hydrateFansubGroup"
backend/internal/ --include='*.go'` (excluding `_test.go`) immediately before implementing, per
RESEARCH.md Assumption A4.

---

### `backend/internal/repository/domain_projection_repository.go` (repository, CRUD)

**Current `GetFansubGroupDomainProjection` (full function read, lines 74-98):**
```go
func (r *DomainProjectionRepository) GetFansubGroupDomainProjection(ctx context.Context, groupID int64) (*DomainProjectionResponse, error) {
	resp := &DomainProjectionResponse{Members: []DomainProjectionMemberRow{}, Historical: []DomainProjectionHistoricalRow{}, Contributors: []DomainProjectionContributorRow{}}
	members, err := r.listProjectionMembers(ctx, groupID)
	// ...
	historical, err := r.listProjectionHistorical(ctx, groupID)
	// ...
	contributors, err := r.listProjectionContributors(ctx, groupID)   // <- REMOVE this call (B3)
	// ...
	resp.Members = members
	resp.Historical = historical
	resp.Contributors = contributors    // <- and this assignment (or leave empty slice, per resp init)
	return resp, nil
}
```
Fix is a one-function, ~4-line removal: drop the `listProjectionContributors` call and the
`resp.Contributors = contributors` assignment (the struct init already defaults it to an empty slice,
so the response shape/JSON contract for `contributors: []` is preserved for any future consumer).
`listProjectionContributors` itself (line 274) can stay defined-but-unused-by-this-path, or be removed
entirely if `go vet`/linters flag it as dead — confirm no other caller first (RESEARCH.md confirms
`DomainProjectionRepository` has exactly one caller: this route).

---

### `backend/internal/repository/fansub_public_profile_query_budget_test.go` (test, Go, NEW FILE)

**Analog — copy the exact template from `member_profile_query_budget_test.go` (full file read, 214
lines), substituting `131`→`152`, `MemberProfileRepository`→`FansubRepository`, and the member seed
helpers → group/story/project/history/media seed helpers:**

```go
const phase152DSNEnv = "TEAM4S_PHASE152_TEST_DSN"
var phase152DatabasePattern = regexp.MustCompile(`^team4s_phase152_test(?:_[a-z0-9]+)?$`)

func openPhase152Postgres(t *testing.T) (*pgxpool.Pool, *queryCounter) {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv(phase152DSNEnv))
	if dsn == "" {
		t.Skipf("%s is not set; skipping Phase-152 query-budget test", phase152DSNEnv)
	}
	config, err := pgxpool.ParseConfig(dsn)
	require.NoErrorf(t, err, "parse %s", phase152DSNEnv)
	dbName := config.ConnConfig.Database
	require.Truef(t, phase152DatabasePattern.MatchString(dbName),
		"unsafe %s: database name %q must match %s (never run against team4s_v2)", phase152DSNEnv, dbName, phase152DatabasePattern)
	counter := &queryCounter{}
	config.ConnConfig.Tracer = counter
	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	require.NoErrorf(t, err, "open %s pool", phase152DSNEnv)
	t.Cleanup(pool.Close)
	// ... runtime-db self-check identical to member_profile_query_budget_test.go:74-76 ...
	return pool, counter
}
```

**Constant-budget assertion shape** (mirrors `TestPhase131PublicProfileQueryBudgetIsConstant`,
lines 176-213 of the analog): seed one group with few history/project/media rows and one with many,
assert `GetPublicProfileBySlug` issues the SAME query count for both (proves no N+1 growth — this
phase's target, per RESEARCH.md, is 12→7 static queries, a fixed constant either way), and pin the
exact new constant with a named `const phase152ConstantQueryBudget = N` (comment documenting what
changed vs. today, same convention as `phase131ConstantQueryBudget` at analog line 168). This same test
file also covers P152-08 (assert contributor query is absent from the public path — the domain-
projection endpoint is a separate call, so this is naturally verified by the budget count itself
staying at the new lower constant, not growing back to include it).

**Tracer/harness dependency (do not reimplement):** `backend/internal/repository/query_counter.go` —
read directly if the `queryCounter` struct's `reset()`/`count()` API needs confirming; it is the
shared, already-existing `pgx.QueryTracer` both this test and the Phase-131 analog attach via
`config.ConnConfig.Tracer`.

---

### `backend/internal/services/tiptap_service.go` (service, transform/validate)

**D2 sanitizer hardening — exact before/after, RESEARCH.md "Architecture Pattern 5", confirmed at file
lines 427-451 (full function read):**
```go
// line 434 — before
p.AllowAttrs("class").OnElements("span", "td", "th")
// after — mirrors this file's OWN established idiom at lines 447-449 (the img class rule)
p.AllowAttrs("class").Matching(
	regexp.MustCompile(`^color-token-[a-z]+$`),
).OnElements("span", "td", "th")
```
**`h1` removal:** drop `"h1"` from the `AllowElements(...)` call at line 429 (public page has exactly
one `<h1>` — the group name in Hero; rich-text `h1` would break that hierarchy). Add a rejection test
mirroring the existing `TestTipTapSanitizeImage_Blocks*` pattern (confirmed present, lines 390-399+ per
RESEARCH.md Sources).

**D1 — this file needs NO change for the link-mark fix itself** (`allowedTipTapMarks`, lines 47-49,
correctly has no `link` entry already — confirmed: `{"bold": true, "italic": true, "textStyle": true}`).
The fix lives entirely in the frontend (`RichTextEditor.tsx`); this file's role is to gain a pinning
regression test proving today's correct-deny behavior, per Pattern 4 in `tiptap_service_test.go` below.

---

### `backend/internal/services/tiptap_service_test.go` (test, Go)

**Analog — existing sibling test `TestTipTapValidateJSON_invalidMark` (confirmed present at line 34,
same file/package):** follow its exact shape for the new reproduction test:
```go
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
This test passes today, unmodified — it documents/pins current backend-deny behavior. Land it in the
SAME plan/commit as the frontend `link: false` fix (matched contract-closure pair, per RESEARCH.md).

---

### `frontend/next.config.mjs` (config, request-response/image proxy)

**Exact fix, RESEARCH.md "Code Examples → A1", inside the existing `images.localPatterns` array (file
lines 27-39, full array read above):**
```js
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
Follows the file's own established idiom (comment at line 31-35, `T-143-07-01`): explicit narrow
`pathname` globs, never a blanket `/**`. Verify via `curl -I` per the audit's documented command; dev
mode requires a container restart to pick up `next.config.mjs` changes (does not hot-reload).

---

## Shared Patterns

### Phase-151 Artwork Slot (governs A2/A3/A4 together)
**Source:** `frontend/src/components/profile/AchievementArtwork.tsx` (full file, 93 lines) +
`AchievementArtwork.module.css` + the embedding convention in `RoleAchievementCard.tsx:55-76`.
**Apply to:** `FansubHistorySection.tsx` only (D05 explicitly scopes this to History; do not propagate
to any other component this phase).
**Binding constraint:** sizes (192/216/240 hero, 64/80 stage, 8px inset, container-query steps 562/658)
are declared exclusively in `AchievementArtwork.module.css` — Phase 152 must not add a size/breakpoint
override anywhere, per the UI-SPEC's explicit restatement of Phase 151's verification record.

### `color-mix(... var(--ach-color) ...)` token idiom
**Source:** `FansubPublicSections.module.css`'s own tone-class block (`.achLegendary` and siblings,
~lines 199-251) — already the file's dominant, correct pattern.
**Apply to:** the two emphasis glow blocks being detokenized (A4/C2), and nowhere else — do not touch
the other tone classes (`achBlue`, `achViolet`, etc.), which intentionally keep their own hardcoded hex
per their existing established pattern (UI-SPEC is explicit on this scope boundary).

### `Matching(regexp.MustCompile(...))` sanitizer idiom
**Source:** `tiptap_service.go`'s own `img` attribute rules, lines 439-449 (`src`, `style`, `class` all
already use this pattern).
**Apply to:** the `span/td/th` `class` rule (D2) — this is not a new mechanism, it is applying the
file's existing idiom to an under-constrained rule.

### Query-budget test harness (`pgx.QueryTracer`, skip-if-unset, DB-name guard)
**Source:** `backend/internal/repository/query_counter.go` (shared tracer) +
`backend/internal/repository/member_profile_query_budget_test.go` (full template, Phase 131) +
`admin_users_query_budget_test.go` (second confirming precedent, not separately excerpted here — same
shape).
**Apply to:** `fansub_public_profile_query_budget_test.go` (new, B4/P152-09) — copy the DSN-env,
DB-name-regex-guard, `openPhaseNNNPostgres`/`resetPhaseNNNFixtures` scaffold verbatim with `131`→`152`.

### `jest-axe` accessibility assertion
**Source:** `frontend/src/components/profile/MemberProfileHero.test.tsx:165-174` (and
`FocalCarousel.test.tsx`, same shape, not separately excerpted — confirmed via RESEARCH.md Sources).
**Apply to:** `FansubHistorySection.test.tsx` (extend existing file) and
`FansubGroupMediaBlock.test.tsx` (new file) — both need `expect(await axe(container)).toHaveNoViolations()`.
Global wiring (`vitest.config.ts` → `src/test/axeSetup.ts`) is already in place; no setup work needed.

### `@/components/ui` primitive mandate (CLAUDE.md global rule, restated binding in UI-SPEC)
**Source:** `Button`/`SectionHeader`/`EmptyState` already used correctly in both
`FansubHistorySection.tsx` and `FansubGroupMediaBlock.tsx` today.
**Apply to:** every touched file this phase — no hand-built native `<button>`/`<select>`/`<input>`/
`<textarea>` may be introduced. The current code already complies; this phase must not regress it.

## No Analog Found

None — every file in scope either has a direct sibling analog in the same directory/domain, or (for the
3 net-new files) an exact structural template from an adjacent, already-verified phase (Phase 131 for
the query-budget test, Phase 150/151 for the axe/next-image mock pattern reused in the new media-block
test).

## Metadata

**Analog search scope:** `frontend/src/components/fansubs/`, `frontend/src/components/profile/`,
`frontend/src/components/editor/`, `frontend/src/app/fansubs/[slug]/`, `frontend/src/lib/`,
`backend/internal/repository/`, `backend/internal/services/`, `frontend/next.config.mjs`.
**Files read directly for this pattern map (beyond CONTEXT.md/RESEARCH.md/UI-SPEC.md citations):**
`RoleAchievementCard.tsx`, `AchievementArtwork.tsx`, `AchievementArtwork.test.tsx`,
`MemberProfileHero.test.tsx` (targeted), `FansubHistorySection.tsx` (full), `group-history-events.ts`
(full), `FansubGroupMediaBlock.tsx` (full), `FansubHistorySection.test.tsx` (full),
`fansub_repository.go` (targeted: `GetGroupBySlug`/`GetPublicProfileBySlug`/`attachGroupCounts`/
`attachGroupLinks`/`hydrateFansubGroup`/`populateCountMap`/`applyLegacyLinkProjection`),
`domain_projection_repository.go` (targeted: `GetFansubGroupDomainProjection`),
`member_profile_query_budget_test.go` (full), `tiptap_service.go` (targeted: mark/node allowlists +
`newTipTapSanitizerPolicy`), `next.config.mjs` (targeted: `images` block), `RichTextEditor.tsx`
(targeted: `StarterKit.configure`), `RichTextEditor.test.tsx` (targeted: mock scaffold),
`FansubHeroSection.tsx` (targeted: `buildInitials`/`website_url`), `page.tsx` (targeted:
`Promise.allSettled`).
**Pattern extraction date:** 2026-09-08
