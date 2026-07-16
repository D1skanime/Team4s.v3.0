---
phase: 103
verified: 2026-07-16
status: human_needed
score: 5/6
requirements:
  passed: [P103-SC1, P103-SC2, P103-SC3, P103-SC4, P103-SC5]
  human_needed: [P103-SC6]
uat_gaps:
  technically_closed: 9
  remaining_code_gaps: 0
review: clean
live_uat: partial_pass
---

# Phase 103 Final Verification

## Outcome

Phase 103 is technically complete against the current code, contracts, focused tests, gap plans 103-06 through 103-10, and the clean post-fix code review. All nine diagnosed HUMAN-UAT gaps have code-level closure and regression evidence.

The phase remains `human_needed`, not `passed`, because P103-SC6 explicitly requires responsive and authenticated live UAT. A post-fix in-app-browser rerun now passes the public Pretty route, Pretty previous/next navigation, guest Karaoke visibility, Anime-logo fallback, shared lightbox and immediate 6-to-8 gallery reveal without hydration errors. Entitled Platform-Admin full-episode streaming and signed-in Sheppert Kara playback also passed live UAT. Full desktop/tablet/mobile variant coverage still requires human acceptance.

## Success criteria

### P103-SC1 — Passed

- The canonical aggregate remains keyed by `animeID + fansubGroupID + releaseVersionID` and verifies ownership through `release_versions`, `fansub_releases`, neutral `episodes`, and canonical `release_version_groups.fansub_group_id`.
- OpenAPI, backend DTOs, and `frontend/src/types/releaseDetail.ts` cover selected public preview, technical and subtitle tracks, cooperation groups, exact contributors/authors/uploaders, release-bound segments, and adjacent navigation.
- Public visibility/approval/readiness gates remain server enforced.
- The Pretty route resolves slugs to numeric project context and then reuses the same aggregate, so slug presentation does not weaken release-version ownership.

### P103-SC2 — Passed against accepted UAT revision

- The original roadmap wording described four category chapters. HUMAN-UAT test 2 explicitly superseded that presentation with one common responsive grid while retaining category identity, uploader attribution, full descriptions, and release-version category pagination.
- `ReleaseGallery` now renders one deduplicated grid, uses semantic image buttons, shows category badges/uploader metadata, opens originals in the generalized existing `FansubMediaLightbox`, and exposes full captions there.
- `responsiveGalleryReveal` is the single 6/4/2 source. It uses `useSyncExternalStore` with a stable server snapshot, preserves expanded state on resize, and has real `renderToString`/`hydrateRoot` mobile and tablet coverage.
- Role groups, not their individual cards, form the desktop two-column text grid; tablet/mobile are one column. Empty sections and text-only hero behavior remain covered.

### P103-SC3 — Passed

- The public release aggregate now uses a session-neutral read, so Karaoke titles and metadata cannot disappear because auth preflight failed.
- Guest/access-token/refresh-only rerender tests preserve identical segment titles; guests get no playback action or login prompt.
- Authenticated public playback remains separate from segment management. Grant issuance binds the real release version, persisted segment and ready cache/uploaded fallback; stream grants remain short-lived and cache-bound.
- Free-form start/end/duration parameters remain rejected, and switching players stops the previous source.

### P103-SC4 — Passed

- Migration `0129_release_playback_entitlements` constrains one global/group/project/release scope and contains no episode scope.
- The central resolver implements most-specific-wins for role and direct-user subjects. Capability projection, release grant issuance, and protected stream authorization reuse that resolver; stream authorization re-evaluates effective entitlement.
- Personalized playback access is `private, no-store`; the public aggregate remains session-neutral and cache-safe.
- The obsolete JSON Next relay was intentionally deleted. Protected JSON access now uses the documented central browser `apiClientFetch` refresh seam. The release and segment byte-stream relays remain present for grant/stream cookie handoff and server enforcement.

### P103-SC5 — Passed

- `ReleaseEpisodePlayer` calls the typed private access helper only after client auth initialization and active access-or-refresh session detection.
- The secondary action renders only for `can_play && stream_ready`; guests, denial, unavailable source and access failures do not expose it.
- The shared Modal player pauses, removes and reloads the source on close.
- Refresh-only tests cover one central refresh/retry, rotated-session persistence, backend reachability and non-retried denial.

### P103-SC6 — Human verification needed

- Automated refresh-session, responsive layout, SSR hydration, route, player and relay regressions pass.
- Post-fix live browser smoke passed on `/fansubs/c-subs/fansubprojekt/vipers-creed/releases/1`: the route returned 200 after a controlled dev-server restart, the public release rendered with the Anime logo and atmospheric release surface, guest Karaoke remained visible, the lightbox opened, `Weitere 2 Bilder anzeigen` expanded six to eight images and disappeared, and no hydration error remained.
- Live previous/next navigation stayed in the Pretty namespace from Release 1 to Release 2 and back-links remained slug-based.
- Actual authenticated Platform-Admin full-episode playback passed live UAT: the action was visible and the episode streamed successfully. Signed-in Sheppert Kara playback also passed: the section remained visible and a segment played successfully. Refresh-only rotation, segment-switch cleanup, autoplay behavior, denied/unready full-episode variants and explicit desktop/tablet/mobile visual variants remain human checks.

## Nine diagnosed UAT gaps

1. **Pretty public release route — technically closed.** Nested `/fansubs/[fansubSlug]/fansubprojekt/[animeSlug]/releases/[releaseVersionId]` route exists; shared route builders cover project previews, timeline/detail links and adjacent navigation. Numeric route is a compatibility adapter to shared composition.
2. **Published image caption edit — technically closed.** PATCH reload now passes through the same actor-specific `can_update`/`can_delete` annotation as list reads; hook/UI regressions cover publish, reopen and edit.
3. **Preview selection/max-one — technically closed.** Eligible image cards expose a narrow preview-only PATCH action; unchanged review fields are not resent; local siblings reconcile false while the backend retains its atomic same-release max-one transaction.
4. **Karaoke disappearing after login — technically closed.** Public aggregate is session-neutral and timeline visibility derives only from public segments.
5. **Platform-admin episode action/refresh-only — technically closed.** Typed playback access uses central `apiClientFetch`; allow+ready, refresh-only retry/rotation and denial are tested. The backend central resolver/readiness contract is unchanged.
6. **Public visual composition — technically closed.** Shared release surface now uses the public Fansub/project atmosphere, glass/editorial surfaces and blue accents while retaining an independent release hero rather than copying the project banner.
7. **Role text density — technically closed.** Whole role groups are desktop grid siblings with full-width cards; tablet/mobile collapse to one column.
8. **Anime logo fallback — technically closed.** Fallback order is approved release preview -> Anime logo -> text-only. Logo comes from the Anime backdrop manifest for rendering only; it is never linked to release media.
9. **Unified gallery/lightbox — technically closed.** One grid, category/uploader metadata, full original/lightbox text, cursor fanout/deduplication, no zero action, exact hydration-safe 6/4/2 reveal and focus/keyboard behavior are covered.

## Ownership, auth and contract audit

- Release images still use `release_version_media` with `media_assets`/`media_files` and a real `release_version_id`; no episode-attached or parallel media seam was introduced.
- Anime logo remains Anime-owned presentation data.
- Public segment and contributor projections remain release-version-bound.
- No new endpoint/schema drift was introduced by gap closure; schema-drift check reports `false`.
- The playback-access JSON relay deletion is intentional and callers were removed; `/api/releases/[id]/stream` and `/api/segments/[id]/stream` relays remain.
- Post-gap code review is `clean`: 0 critical, 0 warning, 0 info findings. Its two earlier warnings were closed with desktop CSS and real hydration regressions.

## Automated evidence

- Backend handler/repository suites: passed.
- Frontend focused Phase-103 suite: 14 files, 58 tests passed.
- Additional review-fix verification: 2 files, 16 tests passed.
- Post-live-fix regression: 3 files, 10 tests passed; UTC note-date hydration and immediate gallery reveal are covered.
- `npm run typecheck`: passed.
- `npm run build`: passed; both Pretty and numeric compatibility release routes are emitted.
- Schema drift: `false`.
- Focused lint for Phase-103 files: passed.
- Full `npm run lint`: fails only on the pre-existing `react-hooks/set-state-in-effect` error in `frontend/src/components/fansubs/FansubStorySection.tsx:49`; it is outside this phase diff.
- `git diff --check`: passed in executor summaries.

## Exact live human checks required

Use the real public entry and remain in the Pretty namespace. Items 1 and the public portions of 2, 4 and 7 already passed a smoke rerun; complete the remaining variants below:

`/fansubs/c-subs/fansubprojekt/vipers-creed` -> `/fansubs/c-subs/fansubprojekt/vipers-creed/releases/1`

1. **Route/navigation:** passed for Release 1 -> Release 2 in live smoke. Retest the same-version preference and public-default fallback once suitable multi-version data exists; cooperation must stay in the entry group context.
2. **Visual composition:** compare desktop, tablet and mobile with the accepted public Fansub/project reference. Confirm atmospheric backdrop/glass language and an independent release hero, not a copied project banner.
3. **Fallbacks:** verify one approved preview release, one logo-only release and one preview/logo-free text-only release.
4. **Gallery:** live smoke passed immediate 6-to-8 expansion, disappearing reveal button and shared lightbox opening. At explicit desktop/tablet/mobile widths confirm 6/4/2, resize persistence, original/full description, arrows, Escape and focus return.
5. **Texts/people:** confirm exact release contributors and authors/uploaders. Desktop role blocks use two columns with full-width cards; tablet/mobile use one.
6. **Admin media:** as Sheppert publish an owned image, close/reopen, edit its description, select/switch an eligible preview and confirm only one remains selected and the public hero updates after approval.
7. **Kara:** guest visibility with disabled actions and signed-in Sheppert playback passed live UAT. Still confirm refresh-only restoration, unavailable segments staying informational and segment switching stopping the old stream.
8. **Full episode:** entitled Platform-Admin action visibility and successful streaming passed live UAT. Still confirm source cleanup on close and that denied/unready users see no action.
9. **Network/auth:** during refresh-only Karaoke and full-episode checks verify refresh rotation succeeds, the private backend access resolver is reached, and stream requests continue through the retained relays without shared caching.

## Final assessment

`human_needed` — no known technical gap remains; the public guest Pretty-route smoke, entitled Platform-Admin full-episode streaming and signed-in Sheppert Kara playback now pass. Final acceptance still needs the remaining Sheppert media and playback edge checks, denied/unready playback variants, explicit desktop/tablet/mobile visual variants and multi-version navigation data.
