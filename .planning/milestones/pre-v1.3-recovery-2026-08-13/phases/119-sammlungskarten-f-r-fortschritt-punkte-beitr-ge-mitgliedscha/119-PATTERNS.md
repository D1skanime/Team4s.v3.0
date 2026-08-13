# Phase 119: Sammlungskarten für Fortschritt, Punkte, Beiträge, Mitgliedschaft und besondere Auszeichnungen - Pattern Map

**Mapped:** 2026-08-03
**Files analyzed:** 20
**Analogs found:** 20 / 20

## Ownership Verdict

Phase 119 extends the Phase-118 public-member-profile badge flow. It does not warrant a new endpoint, page, badge chain, carousel, API helper, persistence path, migration, or global domain component.

```text
GET /api/v1/members/:slug
 -> existing public/members_only gate
 -> MemberProfileRepository
 -> PublicMemberProfile DTO + OpenAPI + TypeScript mirror
 -> existing getMemberProfile helper
 -> /members/[slug] SSR page
 -> MemberBadgeChain -> memberBadgeLabels -> global FocalCarousel
```

Earned/public badge visibility and exact progress metrics are separate truths. Keep `public_badges` filtered to active public awards; carry raw family progress in the existing gated profile DTO so below-threshold values never masquerade as earned badges.

## Mandatory read_first

- `.planning/phases/119-sammlungskarten-f-r-fortschritt-punkte-beitr-ge-mitgliedscha/119-CONTEXT.md`, `119-UI-SPEC.md`, `119-RESEARCH.md`, `119-VALIDATION.md`
- `.planning/phases/118-rollenfortschritt-als-eigene-card-je-tats-chlich-ausge-bter-/118-PATTERNS.md`, `118-VERIFICATION.md`, and all four `118-0*-SUMMARY.md` files
- `.planning/quick/260803-be5-rollenbadges-visuell-vereinheitlichen-ka/260803-be5-SUMMARY.md`
- `docs/engineering/implementation-contract.md`, `docs/frontend/ui-system.md`, `docs/agent-guidelines-ui.md`
- `docs/api/api-contracts.md`, `docs/frontend/auth-api-client.md`
- Every owner/analog named for the task below.

## File Classification

| New/Modified File | Role | Data Flow | Closest live analog | Action |
|---|---|---|---|---|
| `backend/internal/models/member_profile.go` | model/DTO | request-response | `PublicMemberBadge`, `PublicMemberProfile` | extend |
| `backend/internal/repository/member_profile_repository.go` | repository | read projection | profile composition lines 493-577 | extend |
| `backend/internal/repository/member_profile_contribution_badges_repository.go` | repository utility | read projection | `loadContrib*Count` | reuse/extend |
| `backend/internal/repository/member_profile_*progress*_repository.go` (optional) | repository utility | read projection | contribution/role-volume repositories | create only for line-limit extraction |
| repository/service/handler `*_test.go` files named in VALIDATION | tests | read/request-response | existing boundary/visibility fixtures | extend |
| `shared/contracts/openapi.yaml` | contract | request-response | `PublicMemberBadge`, `PublicMemberProfileData` | extend |
| `frontend/src/types/profile.ts` | model/DTO | request-response | public profile interfaces | extend |
| `frontend/src/types/__tests__/v12-projection-contract.test.ts` | contract test | transform | badge parity block | extend |
| `frontend/src/lib/api.ts` | API service | request-response | `getMemberProfile` lines 3167-3195 | preserve; no helper |
| `frontend/src/app/members/[slug]/page.tsx` + test | server route/test | request-response | lines 88-95,144-148 | narrow pass-through |
| `frontend/src/components/profile/memberBadgeLabels.ts` + test | registry/utility/test | transform | role registry/resolver | extend/generalize |
| `frontend/src/components/profile/MemberBadgeChain.tsx` + CSS + test | domain component | transform/event-driven | Phase-118 role collection card | extend/generalize |
| `frontend/src/components/ui/FocalCarousel.tsx` + CSS + test | global UI | event-driven | same canonical seam | narrow quiet-item/motion extension |
| `frontend/src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx` | consumer regression | event-driven | second production carousel consumer | preserve/run |

## Pattern Assignments

### Public profile DTO and projection

**Read first:** `backend/internal/models/member_profile.go:185-196,257-282`; `backend/internal/repository/member_profile_repository.go:493-577`.

Copy the additive DTO style:

```go
type PublicMemberBadge struct {
    ID int64 `json:"id"`
    BadgeCode string `json:"badge_code"`
    BadgeCategory string `json:"badge_category"`
    CurrentCount *int64 `json:"current_count,omitempty"`
    CurrentTier *string `json:"current_tier,omitempty"`
    NextThreshold *int64 `json:"next_threshold,omitempty"`
    RemainingCount *int64 `json:"remaining_count,omitempty"`
    NextTier *string `json:"next_tier,omitempty"`
}
```

Add a distinct non-earned family-progress collection to `PublicMemberProfile` (research proposes `badge_progress`; planner locks the exact name). Follow the assembler pattern at `member_profile_repository.go:526-548`:

```go
profile.PublicBadges, loadErr = r.loadPublicBadges(ctx, row.memberID)
if loadErr != nil { return nil, loadErr }
contributionBadges, loadErr := r.loadContributionBadges(ctx, row.memberID)
if loadErr != nil { return nil, loadErr }
profile.PublicBadges = append(profile.PublicBadges, contributionBadges...)
profile.TotalPoints, loadErr = r.loadTotalPoints(ctx, row.memberID)
if loadErr != nil { return nil, loadErr }
```

Load exact metrics in this same gated read. Preserve non-nil empty slices and contextual wrapped errors.

### Exact metric loaders

**Read first:** `backend/internal/repository/member_profile_contribution_badges_repository.go:83-233`; `backend/internal/services/badge_service.go:44-67,188-223`.

Reuse `loadContribProjectsCount`, `loadContribChronicleCount`, and `loadContribArchivistCount`. Existing earned projection emits nothing below tier one:

```go
projectsCount, err := r.loadContribProjectsCount(ctx, memberID)
if err != nil { return nil, err }
if tier := highestContribProjectsTier(int(projectsCount)); tier != "" {
    progress := buildContribCategoryProgress("contribution_projects", projectsCount)
    items = append(items, models.PublicMemberBadge{/* earned carrier */})
}
```

Project progress reuses the badge-service semantic:

```sql
SELECT COUNT(DISTINCT ac.anime_id)
FROM anime_contributions ac
WHERE ac.member_id = $1 AND ac.status = 'confirmed'
```

Membership mirrors `COALESCE(left_date, CURRENT_DATE) >= joined_date + make_interval(...)` for one membership. Never sum memberships or use profile `active_from_date`.

A new repository file is acceptable only as a line-limit extraction on the existing `MemberProfileRepository`; no new handler, endpoint, repository type, or duplicate SQL.

### Contract and transport

**Read first:** `shared/contracts/openapi.yaml:11192-11229,11314+`; `frontend/src/types/profile.ts:144-153,207-254`; `frontend/src/types/__tests__/v12-projection-contract.test.ts:249-276`; `frontend/src/lib/api.ts:3167-3195`.

Update Go, OpenAPI, TypeScript, and exact-key parity tests atomically. Preserve `PublicMemberProfileResponse = {data} | {visible:false}`.

The existing helper remains the only transport:

```ts
const response = await authorizedFetch(
  `${API_BASE_URL}/api/v1/members/${encodeURIComponent(slug)}`,
  { cache: "no-store", authToken },
)
if (!response.ok) {
  const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
  throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
}
return response.json() as Promise<PublicMemberProfileResponse>
```

Do not add `getBadgeProgress`, ad hoc fetch, or another DTO family.

### Canonical family registry

**Read first:** `frontend/src/components/profile/memberBadgeLabels.ts:35-58,60-144,153-170,231-267,293-337`.

Extend catalog items with stable family identity, numeric threshold/order, and stage kind. Do not parse localized labels. Build one badge-code ownership map, handle duplicates deterministically, and sort stages numerically. Use `POINT_MILESTONES` as points SSOT.

Generalize Phase 118:

```ts
const stages = [
  { tier: 'entry', threshold: 1, label: 'Einstieg' },
  ...ROLE_VOLUME_TIERS.map((tier) => ({
    tier,
    threshold: ROLE_VOLUME_TIER_THRESHOLDS[tier],
    label: ROLE_VOLUME_TIER_LABELS[tier],
  })),
]
const current = [...stages].reverse().find((stage) => safeCount >= stage.threshold)
```

Unknown earned codes become one-stage special cards. `founding_member` belongs only to membership; `all_rounder` remains special. A non-founder’s next attainable membership target is 5 years, not founding-member status.

### MemberBadgeChain collection cards

**Read first:** `frontend/src/components/profile/MemberBadgeChain.tsx:96-181,215-459`.

Generalize the Phase-118 role branch at lines 307-361. A helper/component may be extracted inside `components/profile`; keep domain semantics out of `components/ui`.

```tsx
<Card className={styles.roleBadgeRow}>
  {/* existing layered artwork or catalog Icon fallback */}
  <Badge>{progress.rankLabel}</Badge>
  <div className={styles.roleProgressBlock}>
    <div role="progressbar" aria-valuemin={0}
      aria-valuenow={progress.progressValue}
      aria-valuemax={progress.progressMax}
      className={styles.roleProgressTrack}>
      <span style={{ width: `${progress.progressPercent}%` }} />
    </div>
    <p className={styles.roleProgressCopy}>{progress.progressCopy}</p>
  </div>
  <span className={styles.roleProgression} role="list">{/* stages */}</span>
</Card>
```

Only reached miniatures are buttons. Future stages remain non-interactive/non-tabbable. Temporary selection changes the hero and adds `Ausgewählt`; highest reached retains `Aktuell`. Reset by stable family key on data/family change. Scope `scrollIntoView({inline:'center', block:'nearest'})` to the inner strip; use non-smooth behavior under Reduced Motion.

Reuse `resolveBadgeArtwork`, layered helpers, and catalog icon fallback; no second asset resolver.

### FocalCarousel

**Read first:** `frontend/src/components/ui/FocalCarousel.tsx:27-80,86-200,266-381`; CSS/tests; `frontend/src/components/fansubs/FansubProjectsGrid.tsx` + test.

Whole families are items. `FocalCarousel` owns arrows, physical-center index, pointer/wheel, snap, keyboard, grid expansion, and focus restoration. No consumer-local carousel state/listener/physics.

Its independent disclosure pattern is already instance-local:

```tsx
const [expanded, setExpanded] = useState(false)
const restoreFocusRef = useRef(false)
// close:
restoreFocusRef.current = true
setExpanded(false)
```

Narrow generic extension: one item renders as a quiet centered card without arrows/dots/counter. Preserve optional inline grid toggle.

`118-VERIFICATION.md:7-40` still flags pointer proximity and Reduced Motion gaps. Add deterministic pointer/touch proximity, endpoint wheel, cancellation, and Reduced Motion tests before claiming completion. Test that carousel Arrow/Home/End handling does not steal intended nested stage-button interaction.

### CSS modules

**Read first:** `frontend/src/components/profile/MemberBadgeChain.module.css:819-1004`; `frontend/src/components/ui/FocalCarousel.module.css`.

Copy Phase-118 geometry:

```css
.group[data-badge-group="roles"] .chain { --focal-item-size: min(60%, 720px); }
.roleBadgeRow {
  display: grid;
  place-items: center;
  gap: 16px;
  padding: 32px 24px;
  overflow: hidden;
}
.roleProgressTrack { width: 100%; height: 8px; overflow: hidden; }
```

Generalize rather than duplicating category blocks. Use 320/280/248 px heroes and 60%/74%/88% card widths. Long stages use an internal one-line `overflow-x:auto` + `scroll-snap-type:x proximity` strip. Keep the 1480 px profile shell and prevent page overflow. Extend `MemberBadgeChain.module.css` by default; a new module needs a genuine extracted domain component.

### Public route ownership

**Read first:** `frontend/src/app/members/[slug]/page.tsx:54-99,144-148` and test.

The page remains typed pass-through. Pass `total_points`/family metrics into the existing chain, but do not reconstruct repository semantics or render category UI. Preserve anonymous public and hidden owner-preview behavior. This belongs only to public `/members/[slug]`, not admin/private profile, anime, fansub, release, episode, or media surfaces.

## Test and UAT Seams

- `memberBadgeLabels.test.ts`: family ownership, threshold sorting, automatic stage insertion, exactly-once, unknown earned-special fallback.
- `MemberBadgeChain.test.tsx`: no-earned/intermediate/exact/terminal values for progress, points, three contribution families, membership; 0/1/multiple specials; selection/reset; `Aktuell` vs `Ausgewählt`; locked stages not tabbable; two grids; singular/plural; progressbar ARIA.
- `FocalCarousel.test.tsx`: quiet one-item, independent instances, pointer/touch proximity, endpoint wheel pass-through, deterministic Reduced Motion/cleanup, nested-button keyboard boundary.
- Always run `FansubProjectsGrid.test.tsx`: preview/show-all/links intact, no badge counter.
- Repository tests: project counts 0/1/9/10/24/25/49/50; each contribution family below Bronze/exact/terminal; membership 5/7/10-year boundaries, ended rows, separate memberships not summed.
- `app_public_profile_test.go` + page tests: anonymous public; anonymous/non-owner hidden; owner-visible `members_only`; metrics only in authorized response.
- `v12-projection-contract.test.ts`: exact Go/OpenAPI/TS keys/nullability.

Live UAT: navigate visibly to `http://127.0.0.1:3300/members/{slug}`; verify exact category order; 1440x900/1024x768/390x844; no page overflow; internal long-point strip; all contribution families/endpoints; pointer/Enter/Space stage choice; auto-centering/Reduced Motion; two independently open grids/focus return; 0/1/multiple specials; exact metrics; non-summed memberships/non-founder semantics; roles and public `FansubProjectsGrid`. Headless tests do not replace this.

## Shared Safety Patterns

- Keep `loadPublicBadges` at `member_profile_repository.go:580-632` filtered by `status='active' AND visibility='public'`. Metrics do not expose private badge rows.
- Repository errors use contextual `fmt.Errorf(... %w)`; assembler returns load errors. API helper creates `ApiError`; SSR maps 404 separately and otherwise shows `Profil konnte nicht geladen werden.`.
- No new refresh-session test is needed unless `getMemberProfile`, `authorizedFetch`, cookies, `OwnHiddenProfilePreview`, or a protected branch changes. Never add browser token reads/token props to badge components.

## Parallel Seams / Wrong Ownership to Reject

- New badge-progress endpoint/helper/DTO family.
- Second badge chain/category renderer/carousel hook/library/local snap-index logic.
- Domain-aware logic in generic `components/ui`.
- Frontend reconstruction from `current_projects_count`, recent contributions, dates, badge lower bounds, or labels.
- New persistence/migration; summed memberships; unearned specials; duplicate cross-category badges.
- Attaching public member progress to anime, episode, release, release-version, fansub-admin, or media ownership seams.

## No Analog Found

None. The only potentially new file is a line-limit extraction for family-progress methods on the existing `MemberProfileRepository`.

## Metadata

**Analog search scope:** Phase 118 artifacts; backend public-profile model/repositories/badge service/handler tests; OpenAPI; frontend DTO/API/page; badge registry/component/CSS/tests; global carousel and second consumer.
**Strong analog groups:** 5
**Pattern extraction date:** 2026-08-03
