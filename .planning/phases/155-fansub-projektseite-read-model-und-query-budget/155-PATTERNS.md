# Phase 155: Public-Fansub-Projektseite: Read-Model, Drill-down-Navigation und Query-Budget - Pattern Map

**Mapped:** 2026-09-11
**Files analyzed:** 15 (create/modify) + 3 shared-pattern sources
**Analogs found:** 15 / 15

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/internal/repository/fansub_project_resolver_repository.go` (NEW) | repository | request-response (CRUD-read, single-row + list) | `backend/internal/repository/group_repository_cursor.go` | exact (same "split out of oversized sibling file" precedent) |
| `backend/internal/repository/fansub_project_resolver_repository_test.go` (NEW, query-budget) | test | request-response | `backend/internal/repository/fansub_public_profile_query_budget_test.go` + `query_counter.go` | exact |
| `backend/internal/handlers/*` resolver handler (NEW — likely a new method on `FansubHandler` or a small new handler type in the `fansub-slugs` neighborhood) | handler | request-response | `backend/internal/handlers/fansub_groups.go` (`GetFansubPublicProfileBySlug`) for not-found/validation shape; `backend/internal/handlers/project_member_public_handler.go` (`resolve()`) for the "resolve-before-detail, one neutral 404" shape | exact (route neighborhood) / role-match (resolve pattern) |
| `backend/internal/handlers/*_test.go` for the resolver (NEW) | test | request-response | `backend/internal/handlers/project_member_public_handler_test.go` — copy `TestProjectMemberNoDetailLoadBeforeAccess`-style (httptest + fake repo) tests ONLY; do NOT copy `TestProjectMemberHandler_MethodsExist`/`TestProjectMemberHandler_RoutesRegistered` (os.ReadFile + strings.Contains) | role-match (mixed-quality analog — see Anti-Pattern Warning) |
| `backend/internal/repository/group_repository.go` (MODIFIED — possible new standalone `COUNT(DISTINCT rev.id)` helper) | repository | CRUD (aggregate/count) | same file, `GetGroupReleases`'s internal `countQuery` (lines 165-178) | exact (extract existing inline query into a standalone method) |
| `backend/cmd/server/main.go` (MODIFIED — wiring) | config/bootstrap | request-response (route registration) | same file: `groupPublicHandler := handlers.NewGroupPublicHandler(...).WithReleaseDetailRepo(...).WithGroupReleasesRepo(...)` (lines 291-304) + route block (lines 380-394) | exact |
| `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts` (MODIFIED, split required) | hook/loader (Next.js server data composition) | request-response, aggregation | same file (self-analog — apply the file's own `withFallback` degradation pattern to whatever replaces the removed branches) | exact |
| `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.releasePreview.ts` (NEW, split candidate per RESEARCH.md) | utility (pure transform functions) | transform | extracted directly from `projectPageData.ts` lines 110-223 (`stripHtmlExcerpt`, `formatDuration`, `formatEpisodeLabel`, `parseTimelineTime`, `buildTimelineSegment`, `buildPublicReleasePreview`) | exact (mechanical extraction, not a new pattern) |
| `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.tsx` (MODIFIED) | route (Next.js Server Component) | request-response | same file (self-analog); structurally identical to the other two routes below | exact |
| `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.tsx` (MODIFIED) | route | request-response | same three-route family, mutually analogous | exact |
| `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/releases/[releaseVersionId]/page.tsx` (MODIFIED) | route | request-response | same three-route family | exact |
| `frontend/src/lib/api.ts` (MODIFIED — new resolver client fn; remove `per_page:100` usage) | service (API client) | request-response | same file: `getPublicFansubProfileBySlug` (lines 1760-1787, `authorizedFetch` + `ApiError` shape) and `getGroupReleaseListCursor` (lines 6727-6748, `fetch` + `CursorQueryOpts` shape) | exact |
| `frontend/src/types/group.ts` and/or new types file (resolver response type, `LatestReleasePreview`/`ReleaseHistoryItem`) | model (TS types) | transform | same file: `GroupDetail`/`GroupStats`/`EpisodeReleaseSummary` (lines 10-58) | exact |
| `shared/contracts/openapi.yaml` (MODIFIED) | config (API contract) | request-response | same file: `/api/v1/fansub-slugs/{slug}/public-profile` path block (lines 3327-3358) + `PublicFansubProject` schema (lines 12893-12919) | exact |
| `docs/audits/2026-09-11-fansub-project-performance/REPORT.md` (NEW) | docs (audit) | batch/report | `docs/audits/2026-09-09-public-member-performance/REPORT.md` (+ sibling `TABLES.md`, `REPRODUCE.md`, `VALIDATION.md`, `ASSETS.md`) | exact |

## Pattern Assignments

### `backend/internal/repository/fansub_project_resolver_repository.go` (repository, request-response)

**Analog:** `backend/internal/repository/group_repository_cursor.go`

**Why this file, not `fansub_repository.go`:** `fansub_repository.go` is 2462 lines (already 5x the 450-line CLAUDE.md ceiling). The project's own precedent for "new method belongs with an existing oversized file's domain but must not physically land inside it" is `group_repository_cursor.go`, split out of `group_repository.go` for exactly this reason. Header comment pattern to copy (lines 1-7 of the analog):

```go
package repository

// GetGroupReleasesCursor (AO4-03/AO4-24) ist die additive Seek-Cursor-Variante der
// vollstaendigen Release-Liste, ausgelagert aus group_repository.go wegen des
// 450-Zeilen-Limits. Die Offset-Methode GetGroupReleases in group_repository.go
// bleibt unveraendert — beide Modi teilen sich buildReleasesWhere; der Cursor
// verwendet einen stabilen, gemischten Sortierschluessel.
```

Adapt to: "ausgelagert, weil fansub_repository.go bereits 2462 Zeilen umfasst; gehoert fachlich in die fansub-slugs-Nachbarschaft."

**Existing query to build the resolver from** (the exact narrow, parameterized SQL shape to follow — from `fansub_repository.go` lines 432-480, `listPublicFansubProjects`, which does a wasteful full-group scan just to find one project by slug):

```go
// Source: backend/internal/repository/fansub_repository.go:432-480 (listPublicFansubProjects)
// The resolver must NOT reuse this whole-group-scan query. Instead, narrow the WHERE to
// `afg.fansub_group_id = $1 AND <anime_slug expr> = $2` using the same publicAnimeSlugSQL("a")
// helper and the same `a.status <> 'disabled'` predicate (security requirement — do not drop it).
WHERE afg.fansub_group_id = $1
  AND a.status <> 'disabled'
ORDER BY a.title ASC, a.id ASC
```

**Slug-base lookup pattern to mirror** (getPublicGroupBase, `fansub_repository.go:323-360`) — parameterized, `pgx.ErrNoRows -> ErrNotFound`:

```go
// Source: backend/internal/repository/fansub_repository.go:333-357
var item models.FansubGroup
if err := r.db.QueryRow(ctx, query, slug).Scan(
    &item.ID, &item.Slug, /* ... */
); errors.Is(err, pgx.ErrNoRows) {
    return nil, ErrNotFound
} else if err != nil {
    return nil, fmt.Errorf("get fansub group %q: %w", slug, err)
}
```

**Locked decision constraints to encode directly in this file:**
- Previous/Next stay a narrow SQL projection only (`id, title, anime_slug`) — do NOT port the German `localeCompare` sort into SQL; return an unordered/naturally-ordered small set and let the frontend keep using `buildFansubProjectNavigation`'s existing comparator (`frontend/src/lib/fansubProjectNavigation.ts:28-32`).
- Must return `canonicalProjectPath`-sufficient fields: `groupID`, `animeID`, `animeSlug`, and enough to call `buildPublicFansubProjectPath(groupSlug, animeSlug)` (already in `frontend/src/lib/fansubProjectRoutes.ts`) — do not duplicate that path-building logic in Go.

---

### `backend/internal/repository/fansub_project_resolver_repository_test.go` (test, query-budget)

**Analog:** `backend/internal/repository/fansub_public_profile_query_budget_test.go` + `backend/internal/repository/query_counter.go` + `backend/internal/repository/fansub_public_profile_load_path_test.go` (DSN scaffold)

**Query-budget test skeleton to copy verbatim in shape** (adapt constant name/value; this is real-Postgres, DSN-gated, fail-closed):

```go
// Source: backend/internal/repository/fansub_public_profile_query_budget_test.go:98-143
func TestFansubProjectResolverQueryBudgetIsConstant(t *testing.T) {
    pool, counter := openPhase152Postgres(t) // OR a new phase155-scoped variant — confirm DSN reuse with operator first
    repo := NewFansubProjectResolverRepository(pool)

    // seed small (1 project) and large (6 projects) groups, namespaced IDs (groupID*1000 + N)

    counter.reset()
    small, err := repo.ResolveProject(context.Background(), smallGroupSlug, animeSlug)
    require.NoError(t, err)
    smallCount := counter.count()

    counter.reset()
    large, err := repo.ResolveProject(context.Background(), largeGroupSlug, animeSlug)
    require.NoError(t, err)
    largeCount := counter.count()

    require.Equalf(t, smallCount, largeCount, "constant query budget violated: ...")
    require.Equalf(t, phase155ProjectResolverConstantQueryBudget, largeCount, "...drifted from the enforced constant...")
}
```

**DSN scaffold to reuse or clone** (`fansub_public_profile_load_path_test.go:28-69`):

```go
const phase152DSNEnv = "TEAM4S_PHASE152_TEST_DSN"
var phase152DatabasePattern = regexp.MustCompile(`^team4s_phase152_test(?:_[a-z0-9]+)?$`)

func openPhase152Postgres(t *testing.T) (*pgxpool.Pool, *queryCounter) {
    // skip-if-unset, fail-closed DB-name guard, wires queryCounter as pgx.ConnConfig.Tracer
}
```
RESEARCH.md flags this decision explicitly: either add a phase-155-specific env var following the same naming convention (`TEAM4S_PHASE155_TEST_DSN` / `team4s_phase155_test`), or confirm reuse of the Phase-152 test DB with the operator. Do not silently reuse without confirming, and do not invent a third pattern.

**`queryCounter` itself needs no changes** — it is a generic `pgx.QueryTracer`, already package-shared (`query_counter.go:31-58`).

---

### `backend/internal/handlers/*` resolver handler (handler, request-response)

**Analog A (not-found/validation shape):** `backend/internal/handlers/fansub_groups.go:213-241` (`GetFansubPublicProfileBySlug`)

```go
// Source: backend/internal/handlers/fansub_groups.go:213-241
func (h *FansubHandler) GetFansubPublicProfileBySlug(c *gin.Context) {
    slug := strings.TrimSpace(c.Param("slug"))
    if slug == "" || len([]rune(slug)) > 120 {
        badRequest(c, "ungültiger fansub slug")
        return
    }
    item, err := h.fansubRepo.GetPublicProfileBySlug(c.Request.Context(), slug)
    if errors.Is(err, repository.ErrNotFound) {
        c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "fansubgruppe nicht gefunden"}})
        return
    }
    if err != nil {
        log.Printf("fansub public profile by slug: repo error (slug=%q): %v", slug, err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
        return
    }
    c.JSON(http.StatusOK, gin.H{"data": item})
}
```
Mirror the exact slug validation (`== "" || len([]rune(slug)) > 120`) for both `groupSlug` and `animeSlug` path params (P155-13 / ASVS V5 requirement from RESEARCH.md).

**Analog B (resolve-before-detail, single neutral 404 for ALL negative branches):** `backend/internal/handlers/project_member_public_handler.go:68-94` (`resolve()`)

```go
// Source: backend/internal/handlers/project_member_public_handler.go:68-94
func (h *ProjectMemberPublicHandler) resolve(c *gin.Context) (animeID, groupID, memberID int64, ok bool) {
    animeID, err := parseAnimeID(c.Param("id"))
    if err != nil { badRequest(c, "ungültige anime-id"); return 0, 0, 0, false }
    groupID, err = parseGroupID(c.Param("groupId"))
    if err != nil { badRequest(c, "ungültige group-id"); return 0, 0, 0, false }
    // ... access resolution, THEN a single relation-existence check before any detail load
}
```
Apply this shape to the resolver: unknown `groupSlug` and unknown `animeSlug`-within-that-group must produce the **same** not-found response body/status — do not let the response distinguish "group doesn't exist" from "project doesn't exist in this group" (ASVS V4/Information-Disclosure requirement, RESEARCH.md Security Domain).

**Shared helpers already available** (do not reimplement): `parseAnimeID` (`backend/internal/handlers/anime.go:262`), `parseGroupID` (`backend/internal/handlers/group_handler.go:89`), `badRequest`/`notFound`/`internalError` (`anime.go:299`, `group_handler.go:179,188`).

**Constructor-attachment pattern if the resolver hangs off `GroupPublicHandler` or `FansubHandler` instead of a brand-new type** (Pattern 1 from RESEARCH.md, verified in `group_contributors_handler.go:39-53`):

```go
// Source: backend/internal/handlers/group_contributors_handler.go:39-53
func (h *GroupPublicHandler) WithReleaseDetailRepo(repo *repository.ReleaseDetailPublicRepository) *GroupPublicHandler {
    h.releaseDetailRepo = repo
    return h
}
```
Use exactly this `WithXRepo(...) *T { h.xRepo = repo; return h }` shape — do not widen the existing constructor signature (avoids call-site churn at every `NewGroupPublicHandler`/`NewFansubHandler` invocation).

**Route registration wiring pattern** (`backend/cmd/server/main.go:291-304`, chained builder):

```go
// Source: backend/cmd/server/main.go:291-304
groupRepo := repository.NewGroupRepository(dbPool)
groupContributorsRepo := repository.NewGroupContributorsRepository(dbPool)
releaseDetailPublicRepo := repository.NewReleaseDetailPublicRepository(dbPool, cfg.MediaStorageDir)
groupPublicHandler := handlers.NewGroupPublicHandler(
    groupContributorsRepo, groupThemesRepo, groupReleaseMediaRepo,
    repository.NewFansubNotesRepository(dbPool),
).WithReleaseDetailRepo(releaseDetailPublicRepo).WithGroupReleasesRepo(groupRepo)
```
Route registration block to extend (`main.go:380-394` and `432-433`):
```go
v1.GET("/fansub-slugs/:slug/public-profile", fansubHandler.GetFansubPublicProfileBySlug)
// new resolver route belongs in this same block, e.g.:
// v1.GET("/fansub-slugs/:slug/projects/:animeSlug/resolve", fansubHandler.ResolveFansubProject)
```

---

### `backend/internal/handlers/*_test.go` for the resolver (test)

**Analog to COPY:** `backend/internal/handlers/project_member_public_handler_test.go` — specifically `TestProjectMemberNoDetailLoadBeforeAccess` (lines 113-132) and the `recordingProjectMemberLoader` fake (lines 21-63):

```go
// Source: backend/internal/handlers/project_member_public_handler_test.go:113-132 (PATTERN TO COPY)
func TestProjectMemberNoDetailLoadBeforeAccess(t *testing.T) {
    gin.SetMode(gin.TestMode)
    for _, route := range projectMemberTestRoutes() {
        t.Run(route.name, func(t *testing.T) {
            events := []string{}
            resolver := &recordingPublicMemberAccessResolver{err: repository.ErrNotFound, events: &events}
            loader := &recordingProjectMemberLoader{events: &events}
            handler := NewProjectMemberPublicHandler(resolver, loader, "/media")
            recorder, c := projectMemberRequestContext()
            route.call(handler, c)
            require.Equal(t, http.StatusNotFound, recorder.Code)
            require.Equal(t, []string{"resolve"}, events)
            require.Zero(t, loader.relationCalls)
        })
    }
}
```
This is `httptest.NewRecorder()` + `gin.CreateTestContext` + a hand-rolled fake repository implementing the handler's narrow interface, asserting real `recorder.Code`/`recorder.Body` — exactly the CLAUDE.md Teststil requirement ("Verhaltens-Assertions... müssen den geprüften Code tatsächlich AUSFÜHREN").

**Analog to NOT COPY (explicitly forbidden by CLAUDE.md Teststil and called out in RESEARCH.md's State of the Art table):** the same file's `TestProjectMemberHandler_MethodsExist` (lines 83-95) and `TestProjectMemberHandler_RoutesRegistered` (lines 227-239):

```go
// Source: backend/internal/handlers/project_member_public_handler_test.go:65-95 (ANTI-PATTERN — DO NOT COPY)
func pmHandlerSource(t *testing.T) string {
    raw, err := os.ReadFile("project_member_public_handler.go")
    // ...
}
func TestProjectMemberHandler_MethodsExist(t *testing.T) {
    src := pmHandlerSource(t)
    for _, frag := range []string{"func (h *projectmemberpublichandler) getsummary("} {
        if !strings.Contains(src, frag) { t.Fatalf(...) }
    }
}
```
This is the exact `os.ReadFile` + `strings.Contains` anti-pattern CLAUDE.md's Teststil section forbids for new tests ("Lokale Datei-Konsistenz mit Nachbar-Tests rechtfertigt KEIN Übernehmen dieses Musters"). New resolver tests must exercise the handler via `httptest` against a fake repo and assert on `recorder.Code`/`recorder.Body`, never on the handler's own source text. Route-registration coverage, if desired, should assert against a real `httptest` server or the actual `gin.Engine`, not `main.go`'s source string.

---

### `backend/internal/repository/group_repository.go` (MODIFIED — standalone Releases count)

**Analog:** same file, `GetGroupReleases`'s existing internal count query (lines 165-178) — this is the exact query the locked decision says to expose standalone:

```go
// Source: backend/internal/repository/group_repository.go:165-178
countQuery := fmt.Sprintf(`
    SELECT COUNT(DISTINCT rev.id)
    FROM release_versions rev
    JOIN fansub_releases fr ON fr.id = rev.release_id
    JOIN episodes e ON e.id = fr.episode_id
    JOIN release_version_groups rvg ON rvg.release_version_id = rev.id
    JOIN fansub_groups fg ON fg.id = rvg.fansub_group_id
    %s
`, whereSQL)

var total int64
if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
    return nil, 0, fmt.Errorf("count group releases (%d,%d): %w", animeID, groupID, err)
}
```
Extract this into a new standalone method (e.g., `GetGroupReleaseVersionCount(ctx, animeID, groupID, filter) (int64, error)`) reusing `buildReleasesWhere` (line 268) exactly as-is — do NOT reuse `getGroupStats`'s `EpisodeCount` query (lines 131-143), which counts `COUNT(DISTINCT e.id)` (distinct episodes), a **different, smaller** number for anime with multi-version episodes. This distinction is the operator-locked decision (155-CONTEXT.md "Releases-Zahl") — a test must assert the old (`releaseEpisodes.length` from `GetGroupReleases`) and new (standalone count) numbers are byte-identical for a seeded case with 2+ release versions on one episode.

---

### `backend/cmd/server/main.go` (route registration + wiring)

**Analog:** same file, existing group-public wiring block (see handler section above) and adjacent route block:

```go
// Source: backend/cmd/server/main.go:380-394
v1.GET("/anime/:id/group/:groupId", groupHandler.GetGroupDetail)
v1.GET("/anime/:id/group/:groupId/release-list", groupPublicHandler.GetGroupReleaseListCursor)
v1.GET("/anime/:id/group/:groupId/contributors", groupPublicHandler.GetGroupContributors)
```
New resolver route belongs next to `fansub-slugs/:slug/public-profile` (line 433), consistent with CONTEXT.md's explicit "bevorzugt ... dieselbe Nachbarschaft" instruction — NOT inside the `/anime/:id/group/:groupId/...` block, since the resolver's whole purpose is to run *before* those numeric IDs are known.

---

### `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts` (loader, split required)

**Analog:** itself. Key excerpts to preserve/adapt:

**`withFallback` degradation helper (MUST preserve this exact independent-failure semantics — Pitfall 5):**
```typescript
// Source: frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts:246-253
async function withFallback<T>(fetcher: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fetcher();
  } catch {
    return fallback;
  }
}
```
Every removed/replaced branch in the `Promise.all` array (lines 309-387) must either keep its own `withFallback` wrapper or an equivalent try/catch — do not let a new resolver-consuming branch propagate a rejection into the shared `Promise.all` and break unrelated sections.

**Branches to DELETE entirely** (Workstream E, P155-10) — grep every downstream usage first (`hasThemes`, `hasMedia`, `themesData`, `releaseMediaData`; confirm `hasTeamContent` truly has zero render consumers before deleting, per Pitfall 5):
```typescript
// Source: projectPageData.ts:315-316, 384-385, 397-398 (DELETE)
withFallback<GroupThemesResponse>(() => getGroupThemes(animeID, groupID), { themes: [] }),
withFallback<GroupReleaseMediaResponse>(() => getGroupReleaseMedia(animeID, groupID), { items: [] }),
// ...
const hasThemes = themesData.themes.length > 0;
const hasMedia = releaseMediaData.items.length > 0;
```

**Branch to REPLACE** (Workstream D, P155-07/08) — the `per_page:100` call plus its nested try/catch:
```typescript
// Source: projectPageData.ts:320-339 (REPLACE — remove per_page:100, remove nested catch-retry)
(async () => {
  let releaseEpisodes: ... = [];
  try {
    const [releasesData, fansubsData] = await Promise.all([
      getGroupReleases(animeID, groupID, { per_page: 100 }), getAnimeFansubs(animeID),
    ]);
    releaseEpisodes = releasesData.data.episodes;
  } catch {
    try {
      const releasesData = await getGroupReleases(animeID, groupID, { per_page: 100 }); // duplicate retry — remove
    } catch { /* ... */ }
  }
})(),
```
Replace with a call to the already-existing `getGroupReleaseListCursor` (used elsewhere in this same file at line 364 for the latest-release preview) for history, plus the new standalone release-version-count call for the `episodes.length === 0` gate and `ProjectStats` "Releases" metric.

**Branch to REUSE AS-IS** (already the correct target shape, Latest Preview):
```typescript
// Source: projectPageData.ts:360-382
const activityPage = await getGroupReleaseListCursor(animeID, groupID, { limit: RELEASE_PREVIEW_LIMIT, sort: "release_date" });
```

**Resolver integration point:** `resolvePublicFansubProjectCanonicalPath` (lines 225-244) and `resolveCanonicalProjectPath` (lines 256-269) are the two functions the new resolver replaces/simplifies — both currently do a full `getPublicFansubProfileBySlug` call. Per Pitfall 4, do NOT change `loadPublicFansubProjectPageData`'s own signature (still `{animeID, groupID}` — the numeric legacy route at `frontend/src/app/anime/[id]/group/[groupId]/page.tsx` has no slug and must keep working unmodified). The resolver call belongs only in the three pretty-route `page.tsx` files, not inside this shared loader.

---

### `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.releasePreview.ts` (NEW split file)

**Analog:** mechanical extraction from `projectPageData.ts` lines 110-223 — these are pure functions with no dependency on the orchestration function (`stripHtmlExcerpt`, `formatDuration`, `formatEpisodeLabel`, `parseTimelineTime`, `buildTimelineSegment`, `buildPublicReleasePreview`). Only do this extraction if line count after removing dead themes/media/per_page:100 code still exceeds 450 (RESEARCH.md's exact split-point analysis, "Recommended Project Structure" section). Import shape to preserve: these functions currently import `CATEGORY_LABELS`/`ReleaseVersionMediaCategory` from `@/types/releaseVersionMedia`, `resolvePublicApiUrl` from `@/lib/publicApiUrl`, and the `PublicReleasePreview`/`PublicReleaseTimelineSegment` types from `@/components/fansubs/PublicReleaseBlock` — carry these imports into the new file, do not re-derive.

---

### `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.tsx` + the two sibling drill-down routes (MODIFIED)

**Analog:** the three routes are mutually analogous (RESEARCH.md's "Code Examples" section documents the identical waste pattern in all three). Current shared shape to replace:

```typescript
// Source: frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.tsx:20-35 (project page)
let profileResponse: Awaited<ReturnType<typeof getPublicFansubProfileBySlug>>;
try {
  profileResponse = await getPublicFansubProfileBySlug(fansubSlug);
} catch (error) {
  if (error instanceof ApiError && error.status === 404) return notFound();
  throw error;
}
const profile = profileResponse.data;
const project = profile.projects.find((item) => item.anime_slug?.trim() === animeSlug);
if (!project) return notFound();
const result = await loadPublicFansubProjectPageData({ animeID: project.id, groupID: profile.group.id });
```
```typescript
// Source: .../mitwirkende/[memberSlug]/page.tsx:26-40 — IDENTICAL pattern, then:
summary = await getProjectMemberSummary(project.id, profile.group.id, memberSlug)
```
```typescript
// Source: .../releases/[releaseVersionId]/page.tsx:18-32 — IDENTICAL pattern, then:
canonicalProjectPath={buildPublicFansubProjectPath(profile.data.group.slug, project.anime_slug)}
```
**Locked scope decision:** replace this `try/catch getPublicFansubProfileBySlug + .find()` block with a single call to the new resolver client function (`frontend/src/lib/api.ts`) in **all three** files, preserving the identical `ApiError.status === 404 -> notFound()` error-handling shape and preserving each route's own downstream call (`loadPublicFansubProjectPageData`, `getProjectMemberSummary`, `buildPublicFansubProjectPath`) unchanged. Do not touch anything else in the Project-Member or Release-Detail pages — only the resolution call.

---

### `frontend/src/lib/api.ts` (MODIFIED — new resolver client fn)

**Analog A (authorizedFetch + ApiError shape, ID-resolution-style call):**
```typescript
// Source: frontend/src/lib/api.ts:1760-1787
export async function getPublicFansubProfileBySlug(slug: string): Promise<PublicFansubProfileResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const encodedSlug = encodeURIComponent(slug);
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/fansub-slugs/${encodedSlug}/public-profile`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`);
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  return response.json() as Promise<PublicFansubProfileResponse>;
}
```
**Analog B (unauthenticated `fetch`, bounded cursor-style call, for reference on removing `per_page:100`):**
```typescript
// Source: frontend/src/lib/api.ts:6727-6748
export async function getGroupReleaseListCursor(
  animeID: number, groupID: number, opts: CursorQueryOpts = {},
): Promise<CursorPage<EpisodeReleaseSummary>> {
  const url = `${API_BASE_URL}/api/v1/anime/${animeID}/group/${groupID}/release-list${query ? `?${query}` : ""}`;
  const response = await fetch(url, { cache: "no-store" });
  // ... same ApiError shape
}
```
New resolver client function should follow Analog A's URL/encoding pattern (double `encodeURIComponent` for both `groupSlug` and `animeSlug` path segments) and either shape's error handling (both are equally valid in this file; `authorizedFetch` is used for slug-family calls, plain `fetch` for anime/group-numeric-ID calls — since the resolver takes slugs, prefer `authorizedFetch` to match `getPublicFansubProfileBySlug`). Remove the `per_page: 100` literal from any surviving `getGroupReleases(...)` call site in `projectPageData.ts` per the locked decision — `getGroupReleases` itself (`api.ts:6554-6575`) stays unchanged as a function (other unaffected consumers may still use it).

---

### `frontend/src/types/group.ts` / new types file (resolver response type, `LatestReleasePreview`/`ReleaseHistoryItem`)

**Analog:** same file's existing `GroupDetail`/`GroupStats`/`EpisodeReleaseSummary` (lines 10-58) — snake_case JSON field convention, explicit nullable unions, inline doc comments for "populated only by X" caveats:

```typescript
// Source: frontend/src/types/group.ts:10-58
export interface GroupStats {
  member_count: number
  project_contributor_count: number
  episode_count: number
}

export interface EpisodeReleaseSummary {
  id: number
  episode_id?: number | null
  episode_number: number
  /** Originales Episodenlabel, z. B. "12", "OVA" oder "SP1". */
  episode_number_label: string
  // ...
  /** AO4-11/AO4-12: nur vom Cursor-Endpunkt (getGroupReleaseListCursor) populiert. */
  images_count?: number
}
```
P155-09 explicitly permits and encourages separate `LatestReleasePreview`/`ReleaseHistoryItem` types instead of deepening `EpisodeReleaseSummary`'s existing "populated in some call sites, not others" overloading (RESEARCH.md Anti-Patterns). New resolver response type should follow `GroupDetailResponse`'s `{ data: GroupDetail }` envelope convention (line 30-32).

---

### `shared/contracts/openapi.yaml` (MODIFIED)

**Analog A (path block for a slug-keyed resolver GET):**
```yaml
# Source: shared/contracts/openapi.yaml:3327-3358
/api/v1/fansub-slugs/{slug}/public-profile:
  get:
    tags: [Fansubs]
    summary: Get public fansub profile data by slug
    operationId: getPublicFansubProfileBySlug
    parameters:
      - name: slug
        in: path
        required: true
        schema:
          type: string
          minLength: 1
          maxLength: 120
    responses:
      "200": { description: ..., content: { application/json: { schema: { $ref: "#/components/schemas/PublicFansubProfileResponse" } } } }
      "400": { ... ErrorResponse }
      "404": { ... ErrorResponse }
```
**Analog B (lean project schema shape):**
```yaml
# Source: shared/contracts/openapi.yaml:12893-12919
PublicFansubProject:
  type: object
  required: [id, anime_slug, title, type, status]
  properties:
    id: { type: integer, format: int64 }
    anime_slug: { type: string }
    title: { type: string }
```
New resolver path/schema should follow both shapes exactly: `minLength: 1, maxLength: 120` on both `groupSlug`/`animeSlug` path params (matching the Go handler's `len([]rune(slug)) > 120` validation), and a narrow `required` field list on the new response schema — do not make previous/next required (they are optional per the locked "no meaningful extra cost" framing).

---

### `docs/audits/2026-09-11-fansub-project-performance/REPORT.md` (NEW, audit)

**Analog:** `docs/audits/2026-09-09-public-member-performance/` — full directory structure to mirror:

| File | Purpose | Phase 155 equivalent |
|---|---|---|
| `REPORT.md` | narrative findings, comparison table, critical path | before/after project-page load narrative |
| `TABLES.md` | exact measured numbers | requests/queries/payload/TTFB before-vs-after table |
| `REPRODUCE.md` | how to rerun the measurement | reuse `frontend/scripts/audit-public-member-performance.mjs` with new `AUDIT_ROUTES` |
| `VALIDATION.md` | what was/wasn't verified | contributor-load-test (30-50), multi-version-episode count test results |
| `ASSETS.md` | screenshot/image inventory (if applicable) | optional, only if visual evidence is captured |
| `*.json` raw artifacts (`backend.json`, `http.json`, `navigation.json`, etc.) | raw CDP/Playwright trace data | reuse the same JSON shapes the existing scripts already emit |

**Report structure excerpt to mirror (opening framing, measured-numbers-first, explicit non-claims):**
```markdown
<!-- Source: docs/audits/2026-09-09-public-member-performance/REPORT.md:1-13 -->
# Public Member: technische Ursachenanalyse

9. September 2026 · /home/d1sk/team4s · Ausgangsstand a5557720 · team4s-linux, Docker Compose.

**[Bold one-line finding].** [N] Mechanismen sind zu trennen: ...
```
Follow the same disciplined pattern: measured numbers in tables, explicit "not claimed" caveats (e.g., "Beschleunigungsversprechen ohne Messbeleg" is out of scope per 155-CONTEXT.md's Scope Fence), and a `¹`-footnote style for any composite/derived metric.

**Reusable measurement tooling** (per CONTEXT.md's "check and reuse before writing new" instruction): `frontend/scripts/audit-public-member-performance.mjs` is already fully route-parameterized via an `AUDIT_ROUTES` env var — point it at the project page route rather than writing a new script.

## Shared Patterns

### Not-found / access resolution before detail load
**Source:** `backend/internal/handlers/project_member_public_handler.go:68-94` (`resolve()`)
**Apply to:** The new resolver handler — single neutral 404 for every negative branch (unknown group slug, unknown anime slug within that group), no information leak about which lookup failed.

### Handler builder pattern (`WithXRepo(...)`)
**Source:** `backend/internal/handlers/group_contributors_handler.go:39-53`
```go
func (h *GroupPublicHandler) WithGroupReleasesRepo(repo *repository.GroupRepository) *GroupPublicHandler {
	h.groupReleasesRepo = repo
	return h
}
```
**Apply to:** Any handler the resolver repository gets attached to, if not built as a fully independent handler type — avoids widening existing constructors and touching every existing call site.

### `withFallback()` independent-degradation semantics
**Source:** `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts:246-253`
**Apply to:** Every surviving/replacing branch in `loadPublicFansubProjectPageData`'s `Promise.all` array — a failure in one branch (e.g., the new release-count query) must not propagate and break sibling branches (contributors, story, hero).

### Constant-query-budget test scaffold
**Source:** `backend/internal/repository/query_counter.go` + `backend/internal/repository/fansub_public_profile_load_path_test.go` (DSN/guard) + `backend/internal/repository/fansub_public_profile_query_budget_test.go` (assertion shape)
**Apply to:** P155-02 (resolver), P155-04 (contributor regression-lock), and any other "must not grow with row volume" requirement in this phase.

### Slug parameter validation
**Source:** `backend/internal/handlers/fansub_groups.go:214-218` (`slug == "" || len([]rune(slug)) > 120`)
**Apply to:** Both `groupSlug` and `animeSlug` path parameters on the new resolver route.

### Behavioral httptest+fake-repo test style (CLAUDE.md Teststil, mandatory for ALL new tests)
**Source:** `backend/internal/handlers/project_member_public_handler_test.go:113-132` (`TestProjectMemberNoDetailLoadBeforeAccess`)
**Apply to:** Every new Go handler test in this phase.
**Explicitly forbidden for new tests:** the same file's `os.ReadFile` + `strings.Contains` source-matching tests (`TestProjectMemberHandler_MethodsExist`, `TestProjectMemberHandler_RoutesRegistered`) — legacy pattern, not to be extended, per CLAUDE.md Teststil section and RESEARCH.md's State of the Art table.

## No Analog Found

None. Every file in scope has at least a role-match analog already in the codebase; this phase is explicitly framed by RESEARCH.md as "composition and removal, not net-new infrastructure."

## Metadata

**Analog search scope:** `backend/internal/repository/`, `backend/internal/handlers/`, `backend/cmd/server/main.go`, `frontend/src/app/anime/[id]/group/[groupId]/`, `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/`, `frontend/src/lib/api.ts`, `frontend/src/types/`, `shared/contracts/openapi.yaml`, `docs/audits/2026-09-09-public-member-performance/`
**Files scanned (Read in full or targeted):** `group_repository_cursor.go`, `group_repository.go`, `group_contributors_repository.go`, `group_contributors_handler.go`, `project_member_public_handler.go`, `project_member_public_handler_test.go`, `fansub_repository.go` (targeted 269-513), `fansub_groups.go` (targeted 181-241), `query_counter.go`, `fansub_public_profile_query_budget_test.go`, `fansub_public_profile_load_path_test.go`, `main.go` (targeted 260-390, 420-480), `projectPageData.ts` (full), 3x pretty-route `page.tsx`, `ProjectMemberRows.tsx`, `api.ts` (targeted ~1760-1810, 6516-6820, 10676-10720), `types/group.ts`, `types/groupContributors.ts`, `openapi.yaml` (targeted 3289-3360, 12893-12945), `docs/audits/2026-09-09-public-member-performance/REPORT.md` (targeted 1-80)
**Pattern extraction date:** 2026-09-11
