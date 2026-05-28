# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Current workflow:** `v1.1 asset lifecycle hardening`
- **Current branch:** `main`
- **Current slice:** Phase 54, Phase 55, and Phase 56 are complete; next work should choose a new narrow slice from the verified baseline.

## Current State

### What Finished Today
- Phase 55 secure TipTap persistence for profile story was completed and committed.
- Phase 56 cropper replacement was executed, verified, UAT-approved, security-reviewed, and marked complete.
- `react-easy-crop` is now wrapped behind the shared `Team4sCropper` component.
- Profile avatar crop and fansub group raster logo crop use the shared cropper foundation.
- Old crop parity behavior was fixed by exporting from the natural-pixel crop area derived from the library percentage crop.
- Phase 56 security review found no open threats and confirmed existing auth/API and media ownership seams stayed intact.

### What Works
- Own-profile avatar crop preserves source original plus cropped display through `uploadOwnProfileAvatar`.
- Fansub group logo crop preserves group media ownership through `MediaUpload` and `uploadFansubMedia`.
- SVG group logos are not rasterized through canvas; they stay on the existing upload path.
- Profile story persistence now uses the Phase 55 TipTap JSON / sanitized HTML / plain text contract.
- Central auth/API upload behavior remains owned by the existing API client and authorized upload helpers.

### What Is Open
- Profile hub content/activity design remains a future product cleanup.
- Contributor-owned media/note edit-delete remains a future improvement.
- Older parking-lot cleanup and UI convergence ideas should remain small, scoped slices.

## Active Planning Context
- Phase 55 artifacts under `.planning/phases/55-*` document the TipTap profile-story persistence completion.
- Phase 56 artifacts under `.planning/phases/56-cropper` document plan execution, UAT, summary, and security review.
- Phase 54 artifacts under `.planning/phases/54-globale-nav-drawer-und-layout-verdrahtung` document the completed drawer/header work and browser evidence.

## Key Decisions In Force
- Anime and episodes are neutral.
- Fansub context belongs to fansub groups, releases, release versions, and release-version groups.
- Release-version media must use `release_version_id`.
- Do not reintroduce `release_version_groups.fansubgroup_id`; use `fansub_group_id`.
- Do not attach release media directly to episodes.
- Do not invent parallel media/upload flows before reusing or explicitly deciding against the existing domain flows.
- The shared cropper is UI/client export infrastructure only; it must not merge profile, group, release, release-version, anime, or episode media ownership.
- Profile avatars keep source-original plus cropped-display semantics.
- Fansub group logos remain group media, not release or anime media.
