# Phase 30 UAT

**Status:** ready for live operator testing  
**Updated:** 2026-04-30 (Phase 30 Plan 03 closeout)

## Overview

Phase 30 makes `fansub_releases` an explicit admin API resource. These UAT scenarios prove the three core cases: release discovery through the new explicit seam, honest behavior when no release exists, and theme-asset continuity after the frontend stops using theme-asset responses as hidden release-identity sources.

---

## Scenario 1: Existing canonical release is discoverable

**Goal:** Confirm release context loads through the explicit release API before any theme-asset mutation is needed.

**Pre-condition:** A fansub group has at least one anime that already has episode-version history (and therefore a canonical `fansub_releases` anchor).

**Steps:**

1. Open `/admin/fansubs/:id/edit` for the target fansub group.
2. Select one anime entry that has existing release activity.
3. Navigate to the theme-assets section.
4. Open browser DevTools network tab and watch the API calls.

**Expected:**

- `GET /admin/fansubs/:id/anime/:animeId/releases/canonical` fires before any theme-asset request.
- The response includes `release_id`, `anime_title`, `fansub_name`, and at minimum `version_count`.
- The UI does not need the theme-asset list response to know `release_id`.
- No errors or empty-state fallback for a fansub-anime pair that has real release history.

**Pass signal:** Release context is visible before the theme-asset section renders. The network calls appear in the correct order: canonical-release first, then theme assets.

---

## Scenario 2: Missing canonical release returns an honest state

**Goal:** Confirm the API and UI handle a fansub-anime pair with no release anchor without pretending theme assets are just empty.

**Pre-condition:** A fansub group has at least one anime that has never had an episode-version row (or all versions have been deleted) — so no `fansub_releases` row exists for that pair.

**Steps:**

1. Open `/admin/fansubs/:id/edit` for a fansub group.
2. Navigate to a fansub-anime pair that has no release history.
3. Trigger the release-aware section (or call the canonical-release API directly via DevTools or curl).

**Expected:**

- `GET /admin/fansubs/:id/anime/:animeId/releases/canonical` returns HTTP 200 with body `{"release": null}`.
- The UI renders a clear "no release anchor" state (e.g., a message explaining that releases are created through episode-version operations).
- The UI does not show a generic empty theme-assets list without explaining why.
- No 404, 500, or opaque error.

**Pass signal:** The response clearly distinguishes "no release yet" from "no theme assets for this release." The operator knows at a glance that a release anchor must be created through the episode-version workflow first.

---

## Scenario 3: Theme-asset flow still works on explicit release context

**Goal:** Prove that the theme-asset upload/list/delete round-trip continues to work correctly after the frontend stopped using the theme-asset helper response as a hidden release-identity source.

**Pre-condition:** A fansub-anime pair with a canonical release anchor and at least one theme (OP/ED) available for asset association.

**Steps:**

1. Open `/admin/fansubs/:id/edit` for the fansub group.
2. Navigate to the theme-assets section for an anime with a known canonical release.
3. Confirm `release_id` is resolved through the canonical-release endpoint (Scenario 1 already proved this).
4. Upload one release theme asset (e.g., a short test video or image for an OP theme).
5. Reload the page.
6. Confirm the uploaded asset is still listed under the correct release and theme.
7. Delete the asset using the delete action.
8. Confirm the release context (release name, ID, anime context) is still visible after deletion — the release anchor must not disappear just because assets were removed.

**Expected:**

- Upload succeeds and returns a valid asset record.
- After reload, the asset is listed correctly under the right theme and release.
- Delete succeeds and the theme-asset list becomes empty again.
- The release context panel still shows the canonical release identity after deletion.
- `release_id` is consistent throughout all steps (same ID in canonical-release response, upload context, and delete target).

**Pass signal:** Full upload → reload → delete round-trip completes without errors. Release identity is stable and does not depend on re-loading theme assets to stay known.

---

## Residual Write-Boundary Awareness

Operators and future developers should be aware of these explicit non-goals:

| What is NOT available in Phase 30 | Why |
|-----------------------------------|-----|
| `POST /admin/releases` (create blank release) | Releases must be created through episode-version operations so they always have a valid episode anchor. |
| `DELETE /admin/releases/:releaseId` (direct release delete) | Release deletion is controlled through the episode-version lifecycle; deleting the last version/variant removes the release automatically. |
| Writing release media through `fansub_group_media` | `media_assets` is the active seam for all release-adjacent media. `fansub_group_media` is not an authoritative product path. |

These constraints are intentional and must be preserved in any follow-up phase that extends release management.

---

## UAT Sign-Off Checklist

- [ ] Scenario 1 passed (release context explicit before theme assets)
- [ ] Scenario 2 passed (nil-release state is honest, not a silent empty list)
- [ ] Scenario 3 passed (theme-asset upload/reload/delete round-trip intact with stable release context)
- [ ] No unexpected regressions in episode-version or theme-asset flows that previously worked
