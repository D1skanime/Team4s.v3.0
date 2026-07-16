---
status: root_cause_found
phase: 103
uat_test: 7
created: 2026-07-16
scope: diagnosis_only
---

# Phase 103 UAT 7 — Pretty public release route diagnosis

## Reported behavior

The public project is opened at `/fansubs/[fansubSlug]/fansubprojekt/[animeSlug]`, but release links leave that public namespace and navigate to `/anime/{animeID}/group/{groupID}/releases/{releaseVersionID}`. The slug route should be canonical; the ID route should remain compatibility-only.

## Root cause

Phase 103 implemented only the technical ID-based release page and never added a nested Pretty release route or a slug-aware release-link builder.

There are two connected breaks in the routing seam:

1. **The Next route does not exist.** The route tree contains `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.tsx`, but no `releases/[releaseVersionId]/page.tsx` beneath it. The only release-detail page is `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.tsx`.
2. **Pretty route context is discarded before release previews are built.** The Pretty project page successfully resolves `fansubSlug` and `animeSlug`, then calls `loadPublicFansubProjectPageData` with only `animeID` and `groupID`. `PublicFansubProjectPageData` has no canonical project path/slugs. `buildPublicReleasePreview` consequently hardcodes the technical href, and other release entry/navigation components do the same.

This is not a backend contract problem. The public aggregate already requires canonical numeric ownership identifiers, which the Pretty route can resolve internally. The missing seam is a frontend route adapter plus canonical path propagation.

## Evidence

- `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.tsx` resolves both slugs and the matching project, but passes only `{ animeID: project.id, groupID: profile.group.id }` to the shared project loader.
- `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts` defines `PublicFansubProjectPageData` with numeric IDs but no `fansubSlug`, `animeSlug`, or canonical project base path.
- `projectPageData.ts:169` constructs each public release preview as:

  ```ts
  `/anime/${animeID}/group/${groupID}/releases/${release.id}`
  ```

- `frontend/src/app/anime/[id]/group/[groupId]/sections/LatestReleaseSection.tsx:51` independently hardcodes the same technical route.
- `frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.tsx:106,204` independently hardcodes the technical route for release detail and timeline segment links.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNavigation.tsx:7` hardcodes the technical route for previous/next navigation, so even a Pretty entry page would leave the Pretty namespace after adjacent navigation.
- Existing tests encode the technical URL as desired behavior (`PublicReleaseBlock.test.tsx`, `ReleasesSection.test.tsx`, and `ReleaseNavigation.test.tsx`), so the regression was not detectable by the current suite.
- `frontend/src/lib/fansubProjectRoutes.ts` provides only project-level `buildPublicFansubProjectPath`/`buildPublicFansubProjectHref`; there is no equivalent release-detail helper. This is the exact missing reusable routing contract.

## Constraints

- The backend public detail request must continue to use the real `animeID`, `fansubGroupID`, and `releaseVersionID` so release-version ownership remains server-enforced.
- Cooperation navigation must retain the current route-group context; the Pretty adapter must resolve the route Fansub slug to that same group and must not select another cooperation group.
- The existing technical page should remain a compatibility surface, not become a second independently maintained release UI.
- Release presentation, playback, gallery, and notes logic should be shared between Pretty and technical routes; copying the page/component tree would create contract and behavior drift.
- Previous/next links and timeline links must receive the same canonical base as the initial release entry, otherwise navigation silently falls back to the technical namespace.
- Invalid or mismatched `fansubSlug`/`animeSlug`/release ownership should resolve to `notFound`, using the existing public profile/project lookup plus canonical aggregate ownership check.

## Suggested fix direction

1. Add a canonical helper alongside `fansubProjectRoutes.ts`, for example a project-base builder plus `releaseVersionID`, rather than interpolating URLs in components.
2. Preserve canonical route context (`fansubSlug`, `animeSlug`, or a prebuilt project path) in `PublicFansubProjectPageData` and use it for all project release preview/timeline links.
3. Add `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/releases/[releaseVersionId]/page.tsx` as a thin route adapter: resolve slugs to numeric anime/group IDs, validate the project, then render the existing shared release-detail composition with those IDs and the canonical route context.
4. Extract the current ID-route data loading/composition into a shared server component/loader so the Pretty route and compatibility route cannot drift.
5. Make adjacent release navigation accept/build canonical Pretty paths when Pretty context is present; keep the technical builder only as the compatibility fallback.
6. Update route/link tests to make Pretty URLs canonical and add explicit compatibility-route coverage separately.

## Files involved

- `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.tsx`
- missing: `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/releases/[releaseVersionId]/page.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts`
- `frontend/src/app/anime/[id]/group/[groupId]/sections/LatestReleaseSection.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNavigation.tsx`
- `frontend/src/lib/fansubProjectRoutes.ts`
- corresponding project/release route tests

No production files were modified during diagnosis.
