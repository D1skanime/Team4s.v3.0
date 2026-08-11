# Phase 127: Besondere Auszeichnungen kompakt in den bestehenden Member-Header integrieren - Pattern Map

**Mapped:** 2026-08-11
**Files analyzed:** 9 new/modified files
**Analogs found:** 9 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `frontend/src/app/members/[slug]/page.tsx` | route / SSR composition | request-response | same file, cached profile-to-child prop flow lines 45-47, 79-106, 127-162 | exact |
| `frontend/src/components/profile/MemberProfileHero.tsx` | component | SSR props -> DOM | same file, hero copy/status composition lines 14-22, 82-100, 186-233 | exact |
| `frontend/src/components/profile/MemberSpecialAwards.tsx` (optional) | component | transform / SSR props -> DOM | `MemberBadgeChain.tsx` lines 100-140, 360-373 plus `memberBadgeLabels.ts` lines 90-101, 246-259 | role/data-flow match |
| `frontend/src/components/profile/badgeArtwork.ts` (optional extraction) | utility | transform | `MemberBadgeChain.tsx` lines 72-140 | exact extraction source |
| `frontend/src/components/profile/profile.module.css` | component styles | responsive transform | same file hero rules lines 8-165, 411-447, 492-504 | exact |
| `frontend/src/components/profile/MemberBadgeChain.tsx` | component | transform / event-driven collection UI | same file collection projection lines 724-737 and render lines 958-996 | exact |
| `frontend/src/components/profile/MemberProfileHero.test.tsx` | test | DOM / responsive source contract | same file lines 37-59, 135-176, 197-261 | exact |
| `frontend/src/app/members/[slug]/page.test.tsx` | test | SSR request-response | same file; existing public-profile fixtures and SSR render tests | exact |
| `frontend/src/components/profile/MemberBadgeChain.test.tsx` | test | DOM regression | same file special tests lines 1048-1054 and membership tests lines 1627-1730 | exact |

`memberBadgeLabels.ts` and `memberBadgeLabels.test.ts` are read-first catalog seams, but should remain unmodified unless a focused exported allow-list/order helper is deliberately placed there. The existing catalog values already express the needed labels, icon fallback, grouping, and deterministic catalog order.

## Pattern Assignments

### `frontend/src/app/members/[slug]/page.tsx` (route, request-response)

**Analog:** the existing route itself.

**Cached SSR request pattern** (lines 45-47, 73-82):

```tsx
const getMemberProfileForRequest = cache((slug: string, viewerToken: string) => (
  getMemberProfile(slug, viewerToken || undefined)
))

const viewerToken = await readViewerToken()
const response = await getMemberProfileForRequest(slug, viewerToken)
```

**Existing badge projection and composition pattern** (lines 99-106, 127-162):

```tsx
const publicBadges = profile.public_badges ?? []
const milestoneBadge = deriveMilestoneBadge(profile.total_points ?? 0)
const earnedBadges = milestoneBadge ? [...publicBadges, milestoneBadge] : publicBadges

<MemberProfileHero profile={profile} ... isVerified={profile.is_verified} />
<MemberBadgeChain earnedBadges={earnedBadges} ... />
```

Pass the already-derived `publicBadges` to the hero. Do not pass `earnedBadges`: point milestones are route-added presentation data and are not header specials. Do not add `fetch`, `useEffect`, another `getMemberProfile`, DTO, or contract change. Preserve the one cached request shared by metadata/page rendering.

### `frontend/src/components/profile/MemberProfileHero.tsx` (component, SSR props -> DOM)

**Imports and props pattern** (lines 1-22): use project aliases for shared UI/types, relative imports for profile-local seams, and add an optional `publicBadges?: PublicMemberBadge[]` prop so private/edit callers remain unchanged.

**Verified ownership pattern** (lines 188-200):

```tsx
<div className={styles.heroTitleRow}>
  <h1 className={styles.heroTitle}>{displayName}</h1>
  {isVerified ? (
    <span className={styles.heroStatusSurface}><VerifiedBadge /></span>
  ) : null}
  {isPublicView && profileStatus ? (
    <span className={styles.heroStatusSurface}><MemberStatusPill status={profileStatus} /></span>
  ) : null}
</div>
```

Keep this as the only Verified render. Never project `verified` from `publicBadges`.

**Placement pattern** (lines 208-233): insert the earned-only special list after the bio/activity/`knownForBlock`, inside `heroCopy`; do not add a page section or move identity/status/metrics. Memorial profiles return early at lines 101-110, so the standard special list stays out of that separate hero unless the locked requirements are later expanded.

**Conditional DOM pattern:** derive exact allow-listed codes first; return/render no wrapper for an empty list, one `<li>` for one award, and two in deterministic catalog order for both. Recommended semantic shape:

```tsx
<div className={styles.heroSpecialAwards}>
  <span className={styles.heroSpecialAwardsLabel}>Besondere Auszeichnungen</span>
  <ul aria-label="Besondere Auszeichnungen">...</ul>
</div>
```

Items are noninteractive. Artwork/icon is decorative (`alt=""`, `aria-hidden="true"`); the visible German label supplies the accessible name. No button, tab, live region, preview, counter, progress, or carousel role.

### `frontend/src/components/profile/MemberSpecialAwards.tsx` (optional component, transform)

Create only if it removes meaningful JSX/resolver duplication. Otherwise keep the small list in `MemberProfileHero.tsx`.

**Catalog/presentation pattern** (`memberBadgeLabels.ts` lines 90-101, 151-162, 246-259):

```tsx
const presentation = getMemberBadgePresentation(badgeCode)
const Icon = presentation.Icon
```

Use an explicit ordered allow-list `['historical_leader', 'all_rounder']`, preferably intersected with `PUBLIC_MEMBER_BADGE_CATALOG` order. Do not filter every `group === 'special'`: that includes `verified` and unknown/future codes. Do not use scattered string-label/icon maps.

**Artwork/icon fallback pattern** (`MemberBadgeChain.tsx` lines 100-140, 360-369): Historical Leader resolves to `/member-achievement-badges/special-historical_leader-v1.png`; Allrounder has no approved raster and falls back to `getMemberBadgePresentation('all_rounder').Icon` (`Hexagon`). Normalize both inside one square slot; use `ResponsiveImage` for raster, `object-fit: contain`, and center the icon.

### `frontend/src/components/profile/badgeArtwork.ts` (optional utility, transform)

`resolveBadgeArtwork` is currently file-local at `MemberBadgeChain.tsx:104-140`. If both hero and chain need it, extract the existing constants/resolver byte-for-byte to a profile-local module and import it in both consumers. Preserve every mapping and fallback branch; this is an ownership move, not a resolver redesign. If extraction would enlarge the dirty overlap unjustifiably, expose only the existing resolver with the smallest provable hunk. Never hard-code the Historical URL independently in hero JSX.

### `frontend/src/components/profile/profile.module.css` (responsive component styles)

**Foundation** (lines 8-23, 78-85, 110-127): preserve the two-column hero grid, `min-width: 0`, compact 8px copy rhythm, wrapping title row, status surface, contrast overlay, and existing max copy width.

**Responsive pattern** (lines 411-447): retain 140/120/100px avatar geometry and the `1099px`/`760px` breakpoints. New list rules should use `display:flex` or a content-sized grid, `flex-wrap:wrap`, `min-width:0`, small gaps, and no fixed two-column width. Include new selectors in the mobile max-width contract only as needed; never add horizontal scrolling.

**Nearby analog** (`knownForBlock`, lines 492-504):

```css
.knownForBlock { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
.knownForItem { font-size: .85rem; overflow-wrap: anywhere; }
```

Special items may reuse this compact rhythm but need a stronger contrast surface and normalized square artwork slot. Use existing CSS variables/color-mix; do not create a new theme. Preserve `heroPanel::after` lines 26-40 so background art remains visible and copy remains readable.

### `frontend/src/components/profile/MemberBadgeChain.tsx` (component, collection projection)

**Suppression seam** (lines 724-737): exclude `special` while building `collectionGroups`, alongside the existing `roles` exclusion, rather than deleting catalog data or changing `resolveMemberBadgeFamilies`.

```tsx
.filter((group): group is Exclude<MemberBadgeGroup, 'roles' | 'special'> =>
  group !== 'roles' && group !== 'special'
)
```

This prevents the old heading, wrapper, skeleton, carousel, arrows, counter, and special cards from reaching render lines 958-996 while leaving roles, progress/projects, points, contributions, and membership unchanged. Do not edit `FocalCarousel` or the group render switch. Do not remove special catalog/presentation records.

Founding ownership is the dirty Phase-126 `MembershipStage` seam (`MemberBadgeChain.tsx` current lines 595-642; tests 1627-1730). Preserve it exactly; the Phase-127 hunk should be confined to collection-group filtering unless resolver extraction is separately proven.

## Test Pattern Assignments

### `MemberProfileHero.test.tsx`

Reuse `makePublicProfile` lines 37-59 and the public hero semantic-order test lines 209-261. Add a compact fixture helper for `PublicMemberBadge` and cover:

- no approved specials: no labeled list/wrapper/gap;
- Historical only: exact visible label and approved image URL;
- Allrounder only: visible label, icon fallback, no invented image;
- both: exactly two list items in deterministic order;
- `verified` and `founding_member` in `publicBadges`: neither becomes a hero special;
- `isVerified=true` crossed with both specials: exactly one `Verifiziert`;
- decorative raster/icon semantics, list accessible name, no buttons/carousel/progress;
- extend the CSS source contract at lines 135-150 for wrap, square slot, `object-fit:contain`, mobile max-width/no overflow, while retaining all current geometry assertions.

### `frontend/src/app/members/[slug]/page.test.tsx`

Reuse existing public fixture seams (including `historical_leader` near lines 121 and 382) and SSR render pattern. Assert `public_badges` reaches the hero without an additional API call; anonymous and token-present cases still call the cached profile helper only through the existing request seam. Cross-case assertions: Verified once, Historical/Allrounder once, Founding absent from header but once in Membership, and no `[data-badge-group="special"]`/old `Besondere Auszeichnungen` collection heading. Avoid brittle whole-page text counts when the hero’s accessible label repeats its visible heading; scope assertions to hero and chain containers.

### `MemberBadgeChain.test.tsx`

Replace the obsolete positive special-section expectation at lines 1048-1054 with suppression assertions: no `data-badge-group="special"`, no special skeleton/carousel/counter/arrows, while exact representative selectors for all five retained presentation families remain present. Preserve the current membership/founding matrix at lines 1627-1730 and Phase 121–126 role/project/point/contribution assertions. The catalog/resolver unit behavior may still classify/derive specials; only public collection rendering is suppressed.

### `memberBadgeLabels.test.ts`

Keep catalog classification/order tests around lines 345-349 and 436-462 unless a new exported allow-list helper is added. If added, test exact accepted codes, catalog order, duplicate input deduplication, and rejection of `verified`, `founding_member`, unknown codes, and role codes. Do not change the underlying `special` catalog group merely to hide presentation.

## Shared Patterns

### SSR and request ownership

**Source:** `page.tsx:45-47,69-106`. Apply to route/hero work. One cached server request owns `profile.public_badges`; Phase 127 is pure prop projection. No client hydration dependency, effect, protected fetch, endpoint, contract, DTO, auth, backend, or database change.

### Presentation/catalog ownership

**Source:** `memberBadgeLabels.ts:90-101,139-162,246-259`. Apply to hero special labels/icons/order. `getMemberBadgePresentation` is authoritative; explicit header admission prevents Verified/future specials from leaking in.

### Artwork ownership

**Source:** `MemberBadgeChain.tsx:72-140`. Apply to every badge image. Preserve central approved mappings, `ResponsiveImage`, and icon fallback; no asset generation.

### Deduplication ownership

- Verified: `MemberProfileHero.tsx:188-200`, driven only by `profile.is_verified`.
- Founding: `memberBadgeLabels.ts:468-478` plus dirty `MembershipStage`; never admitted to header specials.
- Historical/Allrounder: header allow-list only; old `special` collection suppressed at `MemberBadgeChain.tsx:730-737`.

### Accessibility and responsive behavior

Static SSR list, visible labels, decorative art, stable catalog order, no focusable elements. Preserve hero geometry tests at `MemberProfileHero.test.tsx:135-150` and validate 390/768/1024/1440 viewports in live UAT; source regex tests support but do not replace browser evidence.

## Anti-Patterns / Protected Seams

- No new fetch, API helper, endpoint, DTO, backend handler, schema, migration, or dependency.
- No `useEffect`, client-only badge discovery, or duplicate `public_badges` transformation in the route.
- No new carousel, arrows, counter, swipe, drag, progress, locked/current/tier semantics, modal, or drawer.
- No `FocalCarousel.tsx`, `FocalCarousel.module.css`, or FocalCarousel test changes for Phase 127.
- No second Verified or Founding representation; do not use all `special`-group badges as the hero input.
- No raw artwork URL duplicated in hero code and no invented Allrounder asset.
- No broad hero redesign, fixed two-slot grid, empty placeholder, or material height increase.

## Dirty-Worktree / Patch-Isolation Strategy

Preflight on 2026-08-11 found unstaged Phase 121–126 overlap in `MemberBadgeChain.tsx`, `.module.css`, `.test.tsx`, and `memberBadgeLabels.ts`; unrelated modified contribution PNGs and `FocalCarousel*`; planning state/artifacts; and untracked role-volume artwork. `MemberProfileHero.tsx`, `profile.module.css`, `page.tsx`, `page.test.tsx`, and `MemberProfileHero.test.tsx` were clean.

Before each implementation task:

1. Save `git status --short`, `git diff`, `git diff --cached`, `git diff --binary`, SHA-256, and exact file copies for every authorized file.
2. Treat hero/page files as clean anchors but re-check immediately before editing. Treat chain/labels files as overlap-owned; never reconstruct them from `HEAD`, reset, broad-format, or replace whole files.
3. Make only targeted hunks: hero prop/DOM, local CSS selectors, route prop, focused tests, and the minimal `collectionGroups` exclusion. If resolver extraction is chosen, isolate it as a separate exact move.
4. Produce the Phase-127 patch by diffing exact before/after snapshots, not by using the repository-wide dirty diff. Inspect every hunk and binary boundary.
5. Stage only with an exact patch if byte ownership is provable. If a hunk shares a predecessor anchor and cannot be isolated, leave it unstaged/uncommitted and report it.
6. Never stage `.planning/STATE.md`, ROADMAP predecessor changes, Phase 121–126 artifacts, contribution/role assets, FocalCarousel files, debug files, or unrelated untracked files as Phase 127.
7. Run `git diff --check` and `git diff --cached --check`; verify `git diff -- backend shared/contracts frontend/src/lib/api.ts frontend/src/types` has no Phase-127 change and FocalCarousel production files have zero Phase-127 source diff.

## No Analog Found

None. Every proposed file has an exact in-place seam or a close profile-local analog. Prefer no new file unless the optional presentational component or resolver extraction demonstrably reduces duplication.

## Metadata

**Analog search scope:** `frontend/src/app/members/[slug]`, `frontend/src/components/profile`, `frontend/src/components/ui`, Phase 121–127 artifacts, Team4s implementation/UI/API/auth docs.
**Files scanned:** 20+ source/test/planning files; 9 implementation targets classified.
**Pattern extraction date:** 2026-08-11
**Dirty baseline:** unstaged Phase 121–126/profile and unrelated FocalCarousel/artwork changes; no cached changes.
