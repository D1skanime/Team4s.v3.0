# Phase 120: Öffentliches Memberprofil visuell harmonisieren und Ladeperformance optimieren - Pattern Map

**Mapped:** 2026-08-04
**Files analyzed:** 24 likely new/modified files
**Analogs found:** 22 / 24

## Scope and Ownership Boundary

Phase 120 refactors the existing public profile; it does not change badge thresholds, order, earned/locked semantics, visibility rules, or media ownership. Dirty Phase-119 work in `MemberBadgeChain`, `FocalCarousel`, `LatestContributionsSection`, CSS/tests, and badge assets is input, not Phase-120-owned semantics. Extend only its final state. `119-05-SUMMARY.md` is blocked and contains no live-UAT approval.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `frontend/src/app/members/[slug]/page.tsx`, CSS, test | server page/layout/test | request-response SSR | same files | exact |
| `MemberProfileHero.tsx`, `profile.module.css`, test | component/styles/test | SSR transform | same files | exact |
| `MemberCurrentProjectsSection.tsx`, CSS, test | component/styles/test | request-response + lazy image | same files | exact |
| `MembershipsSection.tsx`, test | domain component | SSR transform | same files | exact |
| `MemberStorySection.tsx`, CSS, test | client component | SSR + measured disclosure | same files | exact |
| `LatestContributionsSection.tsx`, CSS, test | client component | SSR + disclosure | same files | exact; Phase-119 |
| `PreviousContributionsSection.tsx`, CSS, test | client component | SSR + disclosure | same files | exact |
| `MemberBadgeChain.tsx`, CSS, test | domain component | SSR + event-driven | same files | exact; Phase-119 |
| `FocalCarousel.tsx`, CSS, test | global UI component | event-driven | same files | exact; Phase-119 |
| new near-viewport hook/component | hook/utility | event-driven | `frontend/src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.tsx:65-89` | role-match |
| `frontend/next.config.mjs` | config | image transform | same file | exact |
| profile DTO/OpenAPI/backend media files (conditional) | contract/service/repository | request-response + file-I/O | current variant seams | exact/role |
| new React cached loader | server utility | request-response | none | no analog |
| shared image fallback, if justified | utility/component | event-driven | ordered URL selection only | partial |

## Pattern Assignments

### Public route — `frontend/src/app/members/[slug]/page.tsx`

**Visibility/error pattern** (lines 58-86):

```tsx
const cookieStore = await cookies()
const token = (
  cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value ||
  cookieStore.get('access_token')?.value || ''
).trim()

try {
  const response = await getMemberProfile(slug, token || undefined)
  if ('visible' in response && !response.visible) isHidden = true
  else if ('data' in response) profile = response.data
} catch (error) {
  message = error instanceof ApiError && error.status === 404
    ? 'Mitglied nicht gefunden.'
    : 'Profil konnte nicht geladen werden.'
}
```

Keep backend-owned public/hidden/owner-preview behavior. Metadata currently fetches anonymously at lines 35-41; page render uses request identity at 58-70.

Add one module-level React `cache()` wrapper keyed by primitive slug and normalized token. Both metadata and page read the same cookie. Keep `getMemberProfile` `no-store` (`frontend/src/lib/api.ts:3167-3195`). No global Map or token-less key.

```tsx
import { cache } from 'react'
const getMemberProfileForRequest = cache(
  (slug: string, token: string) => getMemberProfile(slug, token || undefined),
)
```

No existing project `cache()` analog exists; this is the verified research pattern. The route stays section-order owner: toolbar → hero → story/membership pair → projects → badge categories → latest/previous pair.

`page.test.tsx:14-23,162-175,190-233` shows hoisted API mocks, cookie mock, async page render, DOM-order, and hidden-profile assertions. Extend with same-key dedupe and different-token isolation.

### H2/H3 and wine line

**Analog:** `frontend/src/components/ui/SectionHeader.tsx:5-24`.

```tsx
<div className={underline ? `${styles.sectionHeader} ${styles.sectionHeaderUnderline}` : styles.sectionHeader}>
  <div className={styles.sectionHeaderContent}>
    <h2 className={styles.sectionTitle}>{title}</h2>
  </div>
</div>
```

**Wine source:** `frontend/src/components/ui/ui.module.css:955-960`.

```css
.sectionHeaderUnderline {
  padding-bottom: 14px;
  margin-bottom: 18px;
  border-bottom: 2px solid var(--ui-line);
}
```

Use `<SectionHeader title="…" underline />` once per visible H2; card titles are H3. Never duplicate `#82122c`; `globals.css:75` owns `--ui-line`.

The existing page shell (`page.module.css:1-5`) uses `--public-page-max-width` and `--public-page-gutter`. Add token-based band/pair wrappers with `minmax(0,1fr)`, `min-width:0`, and mobile one-column fallback. No `100vw` or negative margins.

### Hero B — `MemberProfileHero.tsx` / `profile.module.css`

Preserve name/status/known-for/points derivation and memorial branch (`MemberProfileHero.tsx:90-107`).

**Media seam** (lines 144-167):

```tsx
{backgroundImageURL ? (
  <div className={styles.heroBackdrop} aria-hidden="true">
    <img src={backgroundImageURL} alt="" />
  </div>
) : null}
<div className={styles.heroAvatar}>
  {avatarURL
    ? <Image src={avatarURL} alt={`${avatarLabel} Avatar`} width={132} height={132} unoptimized />
    : <span aria-hidden="true">{/* initial */}</span>}
</div>
```

Change delivery, not ownership: render `background_image.public_url` and `avatar.public_url`; never `source_original_url`.

Current CSS uses `object-position:center 42%` (`profile.module.css:40-46`), mobile `center 34%` (368-370), and clamps bio (90-97). Keep `object-fit:cover`, use symmetric centering, remove biased positions/clamp, reserve final geometry, and add only Hero B's local copy-zone gradient.

Use truthful sizes: avatar 100/120/140px; hero based on public shell. Avatar/background retain priority per LCP measurement. Fallback changes source once without changing geometry.

### Existing sections

**Projects** (`MemberCurrentProjectsSection.tsx:42-59`) uses scoped `try/catch/finally`, `getMemberProjects`, and a local error. Keep it. Cover props are 96×136 (`tsx:78-86`); CSS reserves 90px/2:3/136px desktop and 68px/102px mobile (`module.css:27-63,150-167`). Skeleton and final image use those dimensions. Add `sizes="(max-width:720px) 68px, 90px"` and lazy optimized delivery after probe.

**Memberships** (`MembershipsSection.tsx:58-73`) uses a 52×52 image and `Users` icon fallback. `profile.module.css:295-315` fixes geometry. Prefer variant/optimized delivery without changing group ownership.

**Story** (`MemberStorySection.tsx:20-40`) uses `ResizeObserver` and cleanup; preserve it and rich-text rendering. Within the paired H2 area, card title becomes H3.

**Contributions:** preserve Phase-119's `LatestContributionsSection` `useId`/list relationship. Its media branch (`tsx:125-162`) resolves URLs, lazy-loads and reserves 16:9. Hide the overall H2 only if both latest and previous are empty.

### Badge categories — `MemberBadgeChain.tsx`

Preserve lines 443-499: earned codes, role tier/count derivation, `resolveMemberBadgeFamilies`, canonical order and empty filtering. Domain rules stay outside global UI.

**Carousel seam** (lines 698-716):

```tsx
<FocalCarousel
  items={group.families}
  getItemKey={(family) => `${family.key}:${family.heroStage.badge_code}`}
  regionLabel={`${group.label}-Karussell`}
  itemSingularLabel="Sammlung"
  itemPluralLabel="Sammlungen"
  showCounter={group.families.length > 1}
  formatCounter={(position, total) => `${position} von ${total} Sammlungen`}
  renderItem={(family) => <FamilyCollectionCard family={family} />}
/>
```

Each category becomes page-level H2 + wine line; collection title remains H3. Keep the counter, quiet one-card mode, earned/locked/current/selected semantics.

Phase 119 owns `FamilyCollectionCard` selection, centering, ResizeObserver and scroll-settle work (`tsx:219-439`). Add activation only after its final state. `MemberBadgeChain.module.css:591-606,760-778` transitions artwork dimensions; reserve maximum/final geometry and remove size transitions. Skeletons match each category's actual minimum height.

### Global carousel — `FocalCarousel.tsx`

This is the only carousel. Extend generic props at lines 28-49; no profile-specific props.

Gate only expensive behavior: reduced-motion listener (102-115), wheel listener (132-151), geometry (165-212), drag/momentum (215-278), and track handlers (330-345). Before activation render identical items, counters, labels, and reserved controls; skip measurement/listeners/momentum/snap. Never use `ssr:false`.

`FocalCarousel.test.tsx:30-174` covers navigation/endpoints/drag/settle/Home/End; 177-276 covers Phase-119 quiet cards, independent expansion, nested keyboard ownership, wheel passthrough and reduced-motion cleanup. Add disabled→enabled-once, no-observer fallback, and unchanged SSR-content tests.

### Near-viewport activation

**Closest analog:** `frontend/src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.tsx:65-89`; also `frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.tsx:55-63`.

```tsx
useEffect(() => {
  const callback: IntersectionObserverCallback = ([entry]) => {
    if (entry.isIntersecting) {
      // activate once
    }
  }
  observerRef.current = new IntersectionObserver(callback, { rootMargin: '200px' })
  if (targetRef.current) observerRef.current.observe(targetRef.current)
  return () => observerRef.current?.disconnect()
}, [])
```

Adapt to once-only activation with `rootMargin:'600px 0px'`; disconnect after first intersection and activate immediately without `IntersectionObserver`. Keep generic, with no API/badge semantics. No exact SSR-content-plus-skeleton overlay exists; keep a new shell profile-local unless reuse is proven.

### Responsive images and fallback

**Variant-first analog:** `LatestReleaseSection.tsx:70-89`.

```tsx
<img
  src={image.thumbnail_url}
  srcSet={image.original_url ? `${image.thumbnail_url} 320w, ${image.original_url} 960w` : undefined}
  sizes="(max-width:640px) 45vw, (max-width:1024px) 22vw, 200px"
  loading="lazy"
/>
```

`ReleaseDetailHero.tsx:64-67` selects `thumbnail_url ?? original_url ?? animeLogoFallbackUrl`; `ReleaseGallery.tsx:90-99` uses thumbnail then original in a fixed shell. Apply derivative → display original → fixed placeholder/initial. Never `source_original_url`.

Badge images currently use `unoptimized`. Remove only after a representative `/_next/image` smoke test. Existing role sizes at `MemberBadgeChain.tsx:569-573` model 248/280/320px; compact stages need truthful 56-96px sizes and 128/160-class output. Preserve PNG/Alpha.

`frontend/next.config.mjs:7-15` has `remotePatterns:[]`. Allow only known Team4s origins/paths; no wildcard proxy. No shared one-shot optimizer fallback exists. Extract only to remove real duplication; guard loops and preserve geometry.

### Upload renderer and variants (conditional backend slice)

Use existing seams if upload-time WebP variants are selected; no second profile pipeline.

**Renderer:** `backend/internal/handlers/admin_content_release_version_media.go:113-143`.

```go
func generateRVMThumbnail(data []byte, mimeType string) ([]byte, int, int, error) {
    // GIF frame 0 or image.Decode
    thumb := imaging.Resize(src, rvmThumbnailWidth, 0, imaging.Lanczos)
    buf := new(bytes.Buffer)
    if err := jpeg.Encode(buf, thumb, &jpeg.Options{Quality: 85}); err != nil {
        return nil, 0, 0, fmt.Errorf("thumbnail exportieren: %w", err)
    }
    bounds := thumb.Bounds()
    return buf.Bytes(), bounds.Dx(), bounds.Dy(), nil
}
```

`fansub_media_upload.go:440-459` calls `MediaService.SaveUpload`, reuses the renderer, writes thumbnail, and cleans files on failure. It proves shared decode/resize but produces JPEG, not WebP.

`app_profile.go:605-673` stores cropped display `original`, preserves `source_original`, and legacy backgrounds use centered Lanczos `imaging.Fill`.

**Persistence:** avatar `member_profile_repository.go:249-273`; background 341-364:

```sql
INSERT INTO media_assets (...);
INSERT INTO media_files (media_id, variant, path, width, height, size)
VALUES ($1, 'original', ...);
INSERT INTO media_files (media_id, variant, path, width, height, size)
VALUES ($1, 'source_original', ...);
```

Replacement deletes prior variants transactionally (avatar 284-290; background 375-381). Derivatives are additional `media_files.variant` rows on the same asset and share cleanup.

Repository 883-887 joins original/source separately; 1012-1040 maps display `PublicURL` and edit-source `SourceOriginalURL`. Latest media prefers `thumb` then original at 1405-1441.

`media_service.go:84-143` owns upload validation/storage; 146-192 owns source originals. Extend/extract there or one focused renderer service, never public GET.

**Suitability gate:** current renderer guarantees JPEG only. Before naming WebP, add a Docker test asserting real WebP MIME/signature, Alpha, dimensions and acceptable edges. Do not assume `imaging.Save` encodes WebP.

If public response variants are exposed, update OpenAPI, backend model/repository, `frontend/src/types/profile.ts`, and existing `getMemberProfile` consumer together. No new endpoint/DTO. If Next optimizer alone supplies derivatives, backend/contract changes are unnecessary.

### Media cache and auth refresh

`frontend/src/app/media/[...path]/route.ts:27-59` prevents traversal, maps WebP MIME and returns `Cache-Control: public, max-age=31536000, immutable`. Preserve it; never generate derivatives per profile request.

**Refresh-safe action:** `OwnProfileEditLink.tsx:16-38`.

```tsx
const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
const hasAuthSession = hasAccessToken || hasRefreshToken

useEffect(() => {
  if (!isClientInitialized || !hasAuthSession) return
  let active = true
  getOwnProfile()
    .then((response) => { if (active) setOwnMemberId(response.data.member_id) })
    .catch(() => { if (active) setOwnMemberId(null) })
  return () => { active = false }
}, [hasAuthSession, isClientInitialized])
```

`CorrectionReportModal.tsx:16-47` uses the same gate. Keep token-free central helpers; no client cookies, bearer construction or direct Keycloak refresh. Test missing/expired access token with valid refresh token.

## Shared Patterns

- **Errors:** server 404 vs generic (`page.tsx:68-76`); scoped client `try/catch/finally`; failed media writes clean their files.
- **Security:** visibility stays backend-owned/auth-keyed; optimizer allowlists narrow; existing MIME/size/decompression limits remain.
- **Ownership:** derivatives stay on the same `media_assets` owner; never substitute release media across episode/profile/group domains.
- **A11y/CLS:** SSR retains content; skeletons are `aria-hidden`; DOM order equals visual order; placeholder/final geometry matches; no size animation.
- **Motion:** retain FocalCarousel keyboard, labels, 44px controls and reduced-motion behavior.
- **Verification:** route cache isolation; carousel activation/no-observer; image sizes/priority/lazy/WebP/cache/fallback; backend signature/Alpha/cleanup if used; CLS/network at 390/768/1440; JS-off SSR; refresh-only actions; live in-app-browser `/members/{slug}`.

## No Analog Found

| Concern | Role | Data Flow | Direction |
|---|---|---|---|
| React cached member loader | server utility | request-response | No existing `cache()`; use research pattern keyed by slug + token. |
| Shared responsive fallback | utility/component | event-driven | Ordered selection exists, generic one-shot optimizer fallback does not; extract only for real duplication. |

## Metadata

**Search scope:** member/profile/UI files, public release image surfaces, profile/media backend handlers/services/repositories, contracts, Phase 118/119/120 artifacts.

**Strong analogs:** public member route; global FocalCarousel; release responsive-image surfaces; media renderer/persistence; profile auth-action seam.

**Pattern extraction date:** 2026-08-04
