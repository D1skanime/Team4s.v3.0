# Phase 132: Shared SSR Composition & Race-Safe Frontend State - Pattern Map

**Mapped:** 2026-08-15
**Files analyzed:** 15 (13 frontend, 2 backend/contract)
**Analogs found:** 15 / 15

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|---------------|
| `frontend/src/hooks/useCancellableSlugState.ts` (NEW) | hook | request-response (cancellable, keyed) | `frontend/src/app/suche/useDebouncedSearch.ts` + `frontend/src/components/fansubs/projectMember/useProjectMemberCollection.ts` | exact (two-source synthesis) |
| `frontend/src/lib/useMemberViewer.ts` (NEW) | hook / provider | request-response (dedup, fail-closed) | `frontend/src/app/members/[slug]/OwnHiddenProfilePreview.tsx` (requestKey/active pattern) | role-match, upgrade target |
| `frontend/src/app/members/[slug]/OwnHiddenProfilePreview.tsx` (MODIFY) | component (client) | request-response | itself (refactor in place) — pattern donor for the two new hooks above | exact |
| `frontend/src/app/members/[slug]/OwnProfileEditLink.tsx` (MODIFY) | component (client) | request-response | `frontend/src/lib/useMemberViewer.ts` (new, once built) | role-match |
| `frontend/src/components/profile/CorrectionReportModal.tsx` (MODIFY) | component (client, modal) | request-response | `frontend/src/lib/useMemberViewer.ts` (new, once built) | role-match |
| `frontend/src/components/profile/MemberCurrentProjectsSection.tsx` (MODIFY) | component (client, paging) | CRUD (paginated read) | `frontend/src/components/fansubs/projectMember/useProjectMemberCollection.ts` (consumer pattern) | exact |
| `frontend/src/components/profile/LatestContributionsSection.tsx` (MODIFY) | component (client, render) | transform (formatting) | `frontend/src/app/members/[slug]/page.tsx` (SSR-captured timestamp source) | role-match |
| `frontend/src/app/members/[slug]/page.tsx` (MODIFY) | route (SSR entry + metadata) | request-response | itself (`generateMetadata` gap) | exact |
| `frontend/src/app/members/[slug]/MemberProfileContent.tsx` (MODIFY) | component (composition) | transform (prop threading) | itself (extend prop surface only) | exact |
| `frontend/src/components/profile/MemberProfileHero.tsx` (MODIFY) | component (render) | transform | `frontend/src/components/profile/deriveKnownFor.ts` (target shape) | role-match |
| `frontend/src/components/profile/deriveKnownFor.ts` (MODIFY/REMOVE) | utility | transform | n/a (becomes thin renderer or deleted) | exact (self) |
| `frontend/src/lib/api.ts` — `getMemberProjects` (MODIFY) | utility (API client fn) | request-response | `frontend/src/lib/api.ts` — `getSearch`/`getSearchSuggestions` (already accept `signal`) | exact |
| `backend/internal/repository/member_profile_public_repository.go` (MODIFY) | repository | CRUD (full-set aggregate) | `backend/internal/repository/member_profile_projects_repository.go` — `countCurrentProjects` | exact |
| `shared/contracts/openapi.yaml` (MODIFY) | config/contract | schema | existing `PublicMemberProfile` schema block | exact |
| `backend/internal/handlers/public_member_profile_contract_test.go` (MODIFY) | test | schema/contract | itself (`forbiddenPublicProfileFields` + `TestPublicMemberProfileMatchesOpenAPIAllowList`) | exact |

## Pattern Assignments

### `frontend/src/hooks/useCancellableSlugState.ts` (NEW — hook, request-response)

**Analogs (synthesize both — do not pick one over the other):**
- `frontend/src/app/suche/useDebouncedSearch.ts` — real `AbortController` cancellation
- `frontend/src/components/fansubs/projectMember/useProjectMemberCollection.ts` — pure-updater dedup-by-key
- (Weak precedent to upgrade FROM, not copy: `frontend/src/app/members/[slug]/OwnHiddenProfilePreview.tsx` lines 75-100 — `active`-flag only, no real abort)

**Precedent A — real cancellation via AbortController + `signal.aborted` guard** (`frontend/src/app/suche/useDebouncedSearch.ts` lines 181-238):
```typescript
const searchAbortRef = useRef<AbortController | null>(null)
// ...
searchAbortRef.current?.abort()               // cancel the superseded request
const searchController = new AbortController()
searchAbortRef.current = searchController
setIsLoading(true)
setError(null)
getSearch(stateToSearchParams(state), searchController.signal)
  .then((response) => {
    if (searchController.signal.aborted) return   // last-write-wins guard
    setResults(response.data)
    setMeta(response.meta)
    setIsLoading(false)
  })
  .catch((err) => {
    if (searchController.signal.aborted || isAbortError(err)) return
    setError(err)
    setIsLoading(false)
  })
```
Cleanup on unmount (lines 264-270):
```typescript
useEffect(
  () => () => {
    searchAbortRef.current?.abort()
    suggestAbortRef.current?.abort()
  },
  [],
)
```
`isAbortError` helper (lines 136-138):
```typescript
function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
```

**Precedent B — pure updater + dedup-by-key + effect-scoped AbortController** (`frontend/src/components/fansubs/projectMember/useProjectMemberCollection.ts` lines 67-91):
```typescript
// append ist REIN (Dedup aus prev, kein externer Ref) — StrictMode-sicher (siehe Bugfix).
const append = useCallback(
  (incoming: T[]) => {
    setItems((prev) => {
      const existing = new Set(prev.map(key))
      const additions = incoming.filter((item) => !existing.has(key(item)))
      return additions.length > 0 ? [...prev, ...additions] : prev
    })
  },
  [key],
)

useEffect(() => {
  const controller = new AbortController()
  fetchPage({ limit: initialLimit, signal: controller.signal })
    .then((page) => {
      append(page.items)
      setCursor(page.next_cursor)
      setHasMore(page.has_more)
    })
    .catch((err: unknown) => {
      if ((err as Error)?.name !== 'AbortError') setError(true)
    })
    .finally(() => setLoading(false))
  return () => controller.abort()
}, [initialLimit, fetchPage, append])
```

**Slug-keyed request-match guard (fail-closed shape to preserve)** — `OwnHiddenProfilePreview.tsx` lines 66-100:
```typescript
const requestKey = [slug ?? '', isClientInitialized, hasAuthSession, retryKey].join(':')

useEffect(() => {
  if (!isClientInitialized || !slug || !hasAuthSession) return
  let active = true
  void getMemberProfile(slug)
    .then((response) => {
      if (!active) return
      setState(/* uses requestKey as state.key */)
    })
  return () => { active = false }
}, [hasAuthSession, isClientInitialized, requestKey, slug])
// ...
if (state.key !== requestKey || state.status === 'loading') {
  return <LoadingProfile />   // fail-closed: unresolved/stale key never renders stale data
}
```

**Design directive for the new hook:** combine Precedent A's `AbortController`/`signal.aborted` cancellation with Precedent B's pure `append`-style updater and effect-scoped controller, generalized over a compound key (slug + whatever else varies, e.g. offset/expansion state) so it composes with `getMemberProjects`'s new `signal` param (see `api.ts` entry below) and any future FocalCarousel/story continuation state. Do NOT port `OwnHiddenProfilePreview`'s `active`-boolean literally — only its "ignore stale result via key match" mental model.

**Anti-pattern warning (from RESEARCH.md, explicit):** never mutate a ref inside a `setState` updater — React 18 StrictMode double-invokes updaters and this silently corrupts dedup while tests stay green. `append` in Precedent B is the correct, pure reference implementation.

---

### `frontend/src/lib/useMemberViewer.ts` (NEW — hook/seam, request-response, fail-closed)

**Analog:** `frontend/src/app/members/[slug]/OwnHiddenProfilePreview.tsx` (existing owner-resolution logic to extract) + `frontend/src/app/members/[slug]/OwnProfileEditLink.tsx` (second call site to fold in) + `frontend/src/components/profile/CorrectionReportModal.tsx` (third, previously-undocumented call site — PMFE-02 requires all three consolidated)

**Auth/session pattern** (`OwnHiddenProfilePreview.tsx` lines 1-8, 66-73 — reuse verbatim):
```typescript
import { useAuthSession } from '@/lib/useAuthSession'
// ...
const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
const hasAuthSession = hasAccessToken || hasRefreshToken
```

**Three call sites to consolidate onto the new hook (current independent implementations):**

1. `OwnHiddenProfilePreview.tsx` lines 75-100 — full `getMemberProfile(slug)` + owner determination (shown above under the D-03 hook section; this is ALSO the D-02 donor).

2. `OwnProfileEditLink.tsx` lines 22-73 — second independent resolver:
```typescript
type ViewerResolution =
  | { key: string; status: 'resolved'; viewer: PublicMemberViewer }
  | { key: string; status: 'unavailable' }

const requestKey = [storedSlug, hasAuthSession].join(':')

useEffect(() => {
  if (!isClientInitialized || viewerResolved || !hasAuthSession) return
  let active = true
  void getMemberProfile(storedSlug)
    .then((response) => {
      if (active) setResolution({ key: requestKey, status: 'resolved', viewer: response.viewer })
    })
    .catch(() => {
      if (active) setResolution({ key: requestKey, status: 'unavailable' })
    })
  return () => { active = false }
}, [hasAuthSession, isClientInitialized, requestKey, storedSlug, viewerResolved])
```

3. `CorrectionReportModal.tsx` lines 3-44 — THIRD, undocumented independent resolver using a DIFFERENT function (`getOwnProfile`, not `getMemberProfile`) for a similar purpose (hide "Korrektur melden" on own profile):
```typescript
import { getOwnProfile, submitMemberCorrection } from '@/lib/api'
// ...
const [ownMemberId, setOwnMemberId] = useState<number | null>(null)

// Eigenen Member ermitteln, um „Korrektur melden" auf dem eigenen Profil auszublenden.
useEffect(() => {
  if (!isClientInitialized || !isLoggedIn) return
  let active = true
  getOwnProfile()
    .then((response) => {
      if (active) setOwnMemberId(response.data.member_id)
    })
    .catch(() => {
      if (active) setOwnMemberId(null)
    })
  return () => { active = false }
}, [isLoggedIn, isClientInitialized])

// Nicht eingeloggt oder eigenes Profil: keine Korrektur-Meldung anbieten.
if (!isLoggedIn || ownMemberId === memberId) return null
```

**Fail-closed contract to preserve exactly** (`OwnHiddenProfilePreview.tsx` line 110):
```typescript
if (state.key !== requestKey || state.status === 'loading') {
  return <LoadingProfile />   // never optimistically render an owner-only affordance
}
```

**Design directive:** build `useMemberViewer(slug)` around the D-03 `useCancellableSlugState` hook internally (so it gets real `AbortController` cancellation "for free"), expose `{ viewer, status: 'loading' | 'resolved' | 'unavailable' | 'error', requestKey }`, and have all THREE existing call sites consume it instead of independently calling `getMemberProfile`/`getOwnProfile`. `CorrectionReportModal`'s "is this my own profile" check becomes `viewer?.is_owner` (or equivalent) from the shared hook rather than a fourth parallel `getOwnProfile()` call — this removes the currently-inconsistent use of two DIFFERENT API functions (`getMemberProfile` vs `getOwnProfile`) for what is conceptually the same "who is viewing" question.

---

### `frontend/src/components/profile/MemberCurrentProjectsSection.tsx` (MODIFY — component, CRUD/paginated read)

**Analog:** `frontend/src/components/fansubs/projectMember/useProjectMemberCollection.ts` (consumer pattern to adopt) + itself (current ad hoc paging to replace)

**Current ad hoc paging state to replace** (lines 42-72 — no cancellation, no AbortController, plain `useState`):
```typescript
const [sourceProjects, setSourceProjects] = useState(projects)
const [visibleProjects, setVisibleProjects] = useState(projects)
const [isLoading, setIsLoading] = useState(false)
const [loadError, setLoadError] = useState('')

if (sourceProjects !== projects) {
  setSourceProjects(projects)
  setVisibleProjects(projects)
}
const hasMore = visibleProjects.length < totalCount

async function loadMoreProjects() {
  if (!interactionEnabled || isLoading || !hasMore) return
  setIsLoading(true)
  setLoadError('')
  try {
    const response = await getMemberProjects(memberSlug, PROJECT_PAGE_SIZE, visibleProjects.length)
    if (!('data' in response)) throw new Error('Profil ist nicht sichtbar.')
    setVisibleProjects((current) => [...current, ...response.data.items])
  } catch {
    setLoadError('Weitere Projekte konnten nicht geladen werden. Bitte versuche es erneut.')
  } finally {
    setIsLoading(false)
  }
}
```
**Stable-key convention already correct here — preserve it** (line 103, do NOT regress to `key={index}`):
```typescript
<li key={`${project.anime_id}:${project.fansub_group_id}`}>
```

**Current local error rendering — MUST migrate to `ErrorState` primitive per UI-SPEC (PMFE-04)** (line 175):
```typescript
{loadError ? <p className={styles.loadError} role="alert">{loadError}</p> : null}
```
Replace with the `ErrorState` pattern (see Shared Patterns below) rather than a bespoke `<p role="alert">`.

**Design directive:** rewire `loadMoreProjects`'s manual `useState`/`try`/`catch` onto the new `useCancellableSlugState` hook (D-03), passing `getMemberProjects(memberSlug, limit, offset, signal)` once `signal` support is added to `api.ts` (see below). Keep the existing `${project.anime_id}:${project.fansub_group_id}` composite key.

---

### `frontend/src/lib/api.ts` — `getMemberProjects` (MODIFY — add `signal` param)

**Analog (target shape, already correct elsewhere in the same file):** `getSearch` (lines 571-595) and `getSearchSuggestions` (lines 602-...) — both already accept and forward `signal?: AbortSignal`.

**Current signature — NO signal param (the concrete blocker RESEARCH.md flags):**
```typescript
export async function getMemberProjects(
  slug: string,
  limit = 6,
  offset = 0,
): Promise<PublicMemberProjectsResponse> {
  const encodedSlug = encodeURIComponent(slug);
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const response = await apiClientFetch(
    `/api/v1/members/${encodedSlug}/projects?${params.toString()}`,
    { cache: "no-store" },
  );
  // ...
}
```
**Target shape to copy (`getSearch`, lines 571-578):**
```typescript
export async function getSearch(
  params: SearchParams,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const query = buildSearchQuery(params);
  const url = `${API_BASE_URL}/api/v1/search${query ? `?${query}` : ""}`;
  const response = await fetch(url, { cache: "no-store", signal });
  // ...
}
```
`apiClientFetch`'s `AuthorizedRequestOptions` (line 436-441) already extends `Omit<RequestInit, "headers">`, which includes `signal` — so `{ cache: "no-store", signal }` is a drop-in addition to the existing `apiClientFetch` call, no new plumbing needed:
```typescript
interface AuthorizedRequestOptions extends Omit<RequestInit, "headers"> {
  authToken?: string;
  headers?: Record<string, string>;
  skipAuthPreflight?: boolean;
  retryAuth401?: boolean;
}
```

---

### `frontend/src/components/profile/LatestContributionsSection.tsx` (MODIFY — fix Date.now())

**Analog:** itself (concrete defect location) — fix direction per RESEARCH.md Code Examples section.

**Current defect** (lines 59-63):
```typescript
function relativeTimeLabel(occurredAt: string): string {
  const timestamp = new Date(occurredAt).getTime()
  if (!Number.isFinite(timestamp)) return ''
  const diffMs = Date.now() - timestamp   // uncontrolled clock read during render
  // ... bucketing logic (correct, keep as-is) ...
}
```
**Fix direction (signature change, keep bucketing logic unchanged):**
```typescript
function relativeTimeLabel(occurredAt: string, referenceNow: number): string {
  const timestamp = new Date(occurredAt).getTime()
  if (!Number.isFinite(timestamp)) return ''
  const diffMs = referenceNow - timestamp
  // ... unchanged bucketing logic ...
}
```
`ContextLine` (lines 93-103) must receive and forward `referenceNow` as a prop; `LatestContributionsSection`'s own props (lines 23-26) must accept `referenceNow: number` from `MemberProfileContent`.

---

### `frontend/src/app/members/[slug]/page.tsx` (MODIFY — generateMetadata fix + reference timestamp capture)

**Analog:** itself (the concrete gap) — `getMemberProfileForRequest` is already `cache()`-wrapped so no extra request is incurred when both `generateMetadata` and the page body call it.

**Current gap** (lines 46-62):
```typescript
const getMemberProfileForRequest = cache((slug: string) => getMemberProfile(slug))

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
Fix composes `title`/`description`/OG tags from `response.data.fansub_name` plus (once D-06 lands) server-authoritative top roles/known groups/active years — publicly-permissible DTO fields only (D-08), preserving the existing `NEUTRAL_UNAVAILABLE_METADATA` / hidden-noindex branches unchanged.

**Reference-timestamp capture point (D-10, Claude's discretion on exact mechanism; RESEARCH.md recommends prop-threading, no DTO touch):** capture `const referenceNow = Date.now()` once inside the page's server-component body (around line 92, alongside the existing `response = await getMemberProfileForRequest(slug)` call) and pass it into `<MemberProfileContent ... referenceNow={referenceNow} />`. `OwnHiddenProfilePreview.tsx`'s client owner-upgrade path must supply an equivalent value (`Date.now()` at first render) at the same prop position so both paths stay hydration-consistent per Pattern 3 in RESEARCH.md.

---

### `frontend/src/app/members/[slug]/MemberProfileContent.tsx` (MODIFY — thread new props only)

**Analog:** itself — this file's existing prop-threading convention is the pattern to extend, not restructure.

**Existing single-composition contract to preserve exactly** (lines 21-33, both SSR and owner-upgrade callers converge here):
```typescript
type MemberProfileContentProps = {
  profile: PublicMemberProfileData
  storedSlug: string
  viewer: PublicMemberViewer
  viewerResolved?: boolean
}

export function MemberProfileContent({
  profile,
  storedSlug,
  viewer,
  viewerResolved = false,
}: MemberProfileContentProps) {
```
Add `referenceNow: number` to this prop type and thread it down to `LatestContributionsSection` (currently invoked at line 155: `<LatestContributionsSection items={latestContributions} headingLevel={3} />`). Both callers (`page.tsx` SSR path, `OwnHiddenProfilePreview.tsx` owner-upgrade path — see Pattern 3 excerpt in RESEARCH.md lines 282-300) must supply this prop identically. Do not introduce a second composition path or duplicate rendering branch — this is the PMFE-01 invariant this file already satisfies.

---

### `frontend/src/components/profile/MemberProfileHero.tsx` + `deriveKnownFor.ts` (MODIFY — D-06 consolidation)

**Analog:** `deriveKnownFor.ts` (the correct, currently-unused shape) vs. the live, DIVERGENT, paginated-data bug in `MemberProfileHero.tsx`.

**Bug source — client aggregates from ONLY the first paginated page** (`MemberProfileHero.tsx` lines 76-94):
```typescript
function deriveKnownForFromPublicProfile(profile: MemberProfileData | PublicMemberProfileData): KnownForResult {
  if (!('current_projects' in profile)) return { activeYears: '', topRoles: [], knownGroups: [] }

  const roles = new Map<string, number>()
  for (const project of profile.current_projects ?? []) {   // BUG: current_projects is only the FIRST page (initial size 6)
    for (const role of project.roles ?? []) {
      const label = role.label_de.trim()
      if (!label) continue
      roles.set(label, (roles.get(label) ?? 0) + 1)
    }
  }
  const topRoles = Array.from(roles.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de'))
    .slice(0, 3)
    .map(([role]) => role)

  return { activeYears: '', topRoles, knownGroups: [] }
}
```
**Existing target shape (`deriveKnownFor.ts` lines 23-27, currently unused except for its exported type):**
```typescript
export interface KnownForResult {
  activeYears: string
  topRoles: string[]
  knownGroups: string[]
}
```
**Consumption site to redirect** (`MemberProfileHero.tsx` line 112 — `const knownFor = deriveKnownForFromPublicProfile(profile)`) — once D-06's server-authoritative aggregate DTO field lands, this becomes `const knownFor = profile.known_for` (or equivalent field name chosen at plan time) — a pure read, no client aggregation. `deriveKnownFor.ts` either becomes a thin renderer over that server field (if any client-side shaping is still needed) or is deleted outright once `MemberProfileHero.tsx`'s local function is removed — per D-11, both implementations must not survive.

---

### `backend/internal/repository/member_profile_public_repository.go` (MODIFY — D-06 backend aggregate)

**Analog:** `backend/internal/repository/member_profile_projects_repository.go` — `countCurrentProjects` (lines 146-169), the existing full-set (non-paginated) aggregate pattern over the SAME approved-project population `current_projects`/`current_projects_count` uses.

```go
func (r *MemberProfileRepository) countCurrentProjects(ctx context.Context, memberID int64) (int, error) {
	var total int
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM (
			SELECT ac.anime_id, ac.fansub_group_id
			FROM anime_contributions ac
			LEFT JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
			WHERE COALESCE(ac.member_id, hfgm.member_id) = $1
			  AND ac.status = 'confirmed'
			  AND ac.is_public_on_member_profile = true
			  AND ac.ended_year IS NULL
			  AND EXISTS (
				SELECT 1 FROM anime_contribution_roles acr
				WHERE acr.anime_contribution_id = ac.id
			  )
			GROUP BY ac.anime_id, ac.fansub_group_id
		) projects
	`, memberID).Scan(&total)
	if err != nil {
		return 0, fmt.Errorf("count current projects for member %d: %w", memberID, err)
	}
	return total, nil
}
```
**Security-critical constraint (from RESEARCH.md Security Domain):** the new D-06 aggregate query MUST reuse this EXACT SAME WHERE-clause filter set (`status = 'confirmed'`, `is_public_on_member_profile = true`, `ended_year IS NULL`, role-exists) — a parallel, looser-filtered query would leak non-public role/group data. Model the new query as a `GROUP BY role_code` / `GROUP BY fansub_group_id` sibling of this exact query, not a new data source.

**Where it plugs in** (`member_profile_projects_repository.go` lines 188-203 — `GetPublicMemberProjectsByID`, itself called from the public profile assembly) shows the existing call-and-attach pattern to mirror for wiring the new aggregate into `GetPublicMemberProfile`'s response assembly.

---

### `backend/internal/handlers/public_member_profile_contract_test.go` (MODIFY — D-07 allow-list discipline)

**Analog:** itself — this IS the Phase-130 forbidden-field/schema-parity contract test D-07 requires new D-06 fields to be covered by.

```go
// forbiddenPublicProfileFields is the authoritative negative list (130-D-08): internal
// ...
var forbiddenPublicProfileFields = []string{ /* ... */ }

func TestPublicMemberProfileForbiddenFieldsAbsent(t *testing.T) {
	// ...
	for _, f := range forbiddenPublicProfileFields {
		require.Falsef(t, keys[f], "forbidden field %q leaked into the public member profile JSON", f)
	}
}

func TestPublicMemberProfileMatchesOpenAPIAllowList(t *testing.T) {
	// asserts every JSON key on the fully-populated PublicMemberProfile struct
	// is DECLARED in the OpenAPI schema — the mechanism D-07 requires new
	// aggregate fields (top_roles/known_groups/active_years-equivalent) to pass.
}
```
Any new D-06 field added to the Go `PublicMemberProfile` model must be added to `shared/contracts/openapi.yaml`'s `PublicMemberProfile` schema in the SAME change, or `TestPublicMemberProfileMatchesOpenAPIAllowList` fails — this is the enforcement mechanism, not just documentation.

---

## Shared Patterns

### Cancellable, slug-keyed client fetch (applies to: `useCancellableSlugState`, `MemberCurrentProjectsSection`, any badge/story continuation state)
**Source:** `frontend/src/app/suche/useDebouncedSearch.ts` (AbortController) + `frontend/src/components/fansubs/projectMember/useProjectMemberCollection.ts` (pure updater)
**Apply to:** `useCancellableSlugState.ts`, `useMemberViewer.ts`, refactored `MemberCurrentProjectsSection.tsx`
```typescript
const controller = new AbortController()
fetchFn({ ...params, signal: controller.signal })
  .then((result) => {
    if (controller.signal.aborted) return
    setState((prev) => /* pure merge, no ref mutation */)
  })
  .catch((err) => {
    if (controller.signal.aborted || (err as Error)?.name === 'AbortError') return
    setError(err)
  })
return () => controller.abort()
```

### Fail-closed owner/viewer resolution
**Source:** `frontend/src/app/members/[slug]/OwnHiddenProfilePreview.tsx` lines 66-116
**Apply to:** `useMemberViewer.ts`, `OwnProfileEditLink.tsx`, `CorrectionReportModal.tsx`
```typescript
const requestKey = [slug, isClientInitialized, hasAuthSession, retryKey].join(':')
// ...
if (state.key !== requestKey || state.status === 'loading') {
  return <LoadingProfile />   // never render owner-only affordances on unresolved/stale state
}
```

### Local section error state via `ErrorState` primitive (PMFE-04, UI-SPEC-mandated)
**Source:** `frontend/src/app/members/[slug]/OwnHiddenProfilePreview.tsx` lines 118-133 (already uses `ErrorState` correctly) vs. `MemberCurrentProjectsSection.tsx` line 175 (still a bespoke `<p role="alert">` — needs migration)
**Apply to:** `MemberCurrentProjectsSection.tsx`'s `loadError` rendering, any new D-03-hook-driven section error
```tsx
<ErrorState
  title="Weitere Projekte konnten nicht geladen werden"
  description="Bitte versuche es erneut."
  action={(
    <Button variant="secondary" onClick={() => void loadMoreProjects()}>
      Erneut versuchen
    </Button>
  )}
/>
```
Copy contract (UI-SPEC.md): title `"{Bereich} konnte nicht geladen werden"`, body `"Bitte versuche es erneut."`, retry label `"Erneut versuchen"` — a LOCAL error, never escalated to the whole-page `ErrorState` in `page.tsx`/`OwnHiddenProfilePreview.tsx`.

### Progressive disclosure (clamp + expand, full content stays mounted)
**Source:** `frontend/src/components/profile/MemberStorySection.tsx` lines 28-48, 63-88
**Apply to:** any badge/achievement collection that needs D-09 treatment
```typescript
const measureOverflow = useCallback(() => {
  const element = contentRef.current
  if (!element) return
  const nextIsOverflowing = element.scrollHeight > element.clientHeight
  setIsOverflowing((current) => isExpanded ? current || nextIsOverflowing : nextIsOverflowing)
}, [isExpanded])
// ResizeObserver + window resize listener call measureOverflow; content div className
// swaps between storyContentClamped/storyContentExpanded — never display:none / unmount.
```
Button copy: `"Mehr lesen"` / `"Weniger anzeigen"` (exact strings, per UI-SPEC Copywriting Contract).

### Stable list keys (never array index)
**Source:** `frontend/src/components/profile/MemberCurrentProjectsSection.tsx` line 103
```typescript
<li key={`${project.anime_id}:${project.fansub_group_id}`}>
```
**Apply to:** any list rendered from D-03-hook-driven state.

### Backend full-set aggregate query, filter parity required
**Source:** `backend/internal/repository/member_profile_projects_repository.go` `countCurrentProjects` (lines 146-169)
**Apply to:** the new D-06 repository method — MUST reuse the identical `status='confirmed' AND is_public_on_member_profile=true AND ended_year IS NULL AND EXISTS(...anime_contribution_roles...)` filter set.

### OpenAPI allow-list contract test parity
**Source:** `backend/internal/handlers/public_member_profile_contract_test.go` (`forbiddenPublicProfileFields`, `TestPublicMemberProfileMatchesOpenAPIAllowList`)
**Apply to:** any new D-06/D-07 DTO field — must be added to `shared/contracts/openapi.yaml`'s `PublicMemberProfile` schema AND to the Go struct in the same change, or the contract test fails.

## No Analog Found

None. Every file in this phase's scope has a concrete, directly-read in-repo precedent (frontend hooks, component state patterns, or backend aggregate/contract-test patterns). This phase is explicitly a consolidation/hardening phase per RESEARCH.md — no net-new architectural shape is being introduced.

One note of caution rather than a gap: `frontend/src/components/profile/MemberBadgeChain.tsx` and `frontend/src/components/ui/FocalCarousel.tsx` currently hold ONLY local expand/collapse state (no async fetch) — if the planner decides badge/achievement continuation needs an actual server round-trip (vs. the current fully-client-side FocalCarousel expand), that fetch should also route through `useCancellableSlugState`, but as of this research pass no such fetch exists yet in `MemberBadgeChain.tsx`, so it is listed as a candidate consumer, not a required change.

## Metadata

**Analog search scope:** `frontend/src/app/members/[slug]/`, `frontend/src/app/suche/`, `frontend/src/components/profile/`, `frontend/src/components/fansubs/projectMember/`, `frontend/src/components/ui/`, `frontend/src/lib/api.ts`, `backend/internal/repository/`, `backend/internal/handlers/`, `shared/contracts/`
**Files scanned:** 19 read directly (14 frontend, 3 backend, 1 contract-relevant search), plus targeted greps for `getMemberProfile`/`getOwnProfile` call sites, `countCurrentProjects` usages, and the OpenAPI/contract-test allow-list mechanism
**Pattern extraction date:** 2026-08-15
