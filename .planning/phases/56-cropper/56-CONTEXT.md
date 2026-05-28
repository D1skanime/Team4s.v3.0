# Phase 56: Cropper - Context

**Gathered:** 2026-05-28
**Status:** Ready for planning
**Source:** Phase 55 deferred item plus pending todo `2026-05-28-global-cropper-library-replacement.md`

<domain>
## Phase Boundary

Phase 56 replaces the fragile in-house cropper math with one shared Team4s cropper foundation backed by a maintained React cropper library.

This phase delivers:
- a documented cropper-library choice and dependency introduction
- a shared Team4s cropper component/adapter outside profile-only or admin-only ownership
- migration of `/me/profile` avatar crop and recrop to the shared component
- migration of fansub group logo crop in `MediaUpload` to the same component
- removal or clear retirement of duplicate in-house crop math when no longer needed
- focused regression and browser UAT for preview/export parity, mobile/touch, keyboard, and upload error paths

This phase does not deliver:
- no new upload endpoint
- no new media table or ownership model
- no release, release-version, anime, or episode media changes
- no avatar remove endpoint
- no public-profile page
- no broad visual redesign of `/me/profile` or `/admin/fansubs/:id/edit`
- no server-side crop-coordinate contract unless explicitly proven smaller and safer than client Blob export

</domain>

<decisions>
## Implementation Decisions

### Cropper Ownership
- **D-01:** The shared cropper is a UI/client export primitive, not a media ownership layer.
- **D-02:** Profile avatar upload remains owned by `uploadOwnProfileAvatar` and `POST /api/v1/me/profile/avatar`.
- **D-03:** Fansub group media remains owned by `MediaUpload`, `uploadFansubMedia`, `deleteFansubMedia`, `fansub_group_media`, and `fansub_groups.logo_id`/`banner_id`.
- **D-04:** The phase must not combine profile media and fansub group media into one domain flow.
- **D-05:** The new shared cropper must live under a neutral media/component location, not under `/me/profile` or `components/admin`.

### Library Direction
- **D-06:** The in-house cropper should not receive another geometry patch as the primary fix; the phase exists to replace it with a maintained library.
- **D-07:** `react-advanced-cropper` is the initial candidate because its docs cover mobile support, fixed/controlled cropper patterns, stencil customization, and canvas/coordinate output.
- **D-08:** The final dependency decision must compare at least `react-advanced-cropper`, `react-easy-crop`, and `react-image-crop` against Team4s needs before changing `frontend/package.json`.
- **D-09:** If the chosen library cannot satisfy parity, keyboard/touch, and responsive requirements, planning must stop or document a different candidate rather than reimplementing custom geometry.

### Avatar Crop Contract
- **D-10:** Avatar upload keeps the Phase 53 source-original plus cropped-display contract.
- **D-11:** The UI sends `sourceFile` and `croppedFile`; backend remains authoritative for type/dimension validation and storage.
- **D-12:** Profile/public avatar display must use the cropped display URL, never the retained source original.
- **D-13:** Existing-avatar recrop must continue loading the retained source original when available.

### Fansub Group Crop Contract
- **D-14:** Fansub group logo crop sends only the cropped logo file through the existing fansub media upload helper.
- **D-15:** Banner upload stays unchanged unless there is already a real crop contract for it; this phase must not invent banner crop semantics.
- **D-16:** SVG logo handling must be explicit: if the chosen raster cropper cannot crop SVG safely, SVG keeps the existing non-crop path or is rejected with documented behavior according to the current fansub media contract.

### Accessibility and UX
- **D-17:** Cropper controls must work with mouse, touch/pointer, keyboard, zoom control, cancel/ESC, and apply.
- **D-18:** Dialog focus must be trapped or handled through existing modal primitives, with visible focus states.
- **D-19:** German user-facing strings introduced by this phase must use proper umlauts.
- **D-20:** The implementation must avoid broad visual redesign; only cropper surfaces and their immediate controls are in scope.

### the agent's Discretion
- The planner/executor may choose whether the shared component exposes a high-level `onApply(File)` API or a lower-level canvas/coordinates adapter, as long as domain callers remain responsible for their own upload helper.
- The planner/executor may retain tiny generic test helpers for cropper mocks if the real library depends on browser APIs that are awkward in jsdom.
- The planner/executor may defer banner cropping and avatar derivative variants if no existing contract requires them.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Workflow and Scope
- `AGENTS.md` - project workflow, validation, UI text, media ownership, and stop conditions.
- `.planning/ROADMAP.md` - Phase 56 goal, plans, constraints, and success criteria.
- `.planning/REQUIREMENTS.md` - `MEDIA-CROPPER-01`.
- `.planning/STATE.md` - pending Cropper todo and current profile/avatar baseline.
- `.planning/todos/pending/2026-05-28-global-cropper-library-replacement.md` - source problem statement.
- `.planning/quick/260528-uat-2-avatar-crop-recrop-fix/PLAN.md` - last attempted in-house crop fix.
- `.planning/quick/260528-uat-2-avatar-crop-recrop-fix/SUMMARY.md` - evidence that the stopgap was not the long-term direction.
- `.planning/phases/53-rollenuebergreifendes-mein-profil-als-member-identity-hub/53-02-PLAN.md` - avatar crop/source-original contract and deferred cropper concerns.
- `.planning/phases/55-sichere-tiptap-persistenz-fuer-profilgeschichte/55-CONTEXT.md` - explicitly defers Cropper to Phase 56.

### Contracts and Architecture
- `docs/engineering/implementation-contract.md` - search-first and no duplicate seam rules.
- `docs/frontend/auth-api-client.md` - token-free protected UI/API boundary.
- `docs/frontend/ui-system.md` - UI component/control mapping.
- `docs/agent-guidelines-ui.md` - local UI guidance.
- `docs/architecture/db-schema-fansub-domain.md` - group media and release/media ownership boundaries.

### Existing Runtime Seams
- `frontend/src/components/media/crop/AvatarCropDialog.tsx` - current profile avatar cropper to replace.
- `frontend/src/components/media/crop/AvatarCropDialog.test.tsx` - current avatar crop tests.
- `frontend/src/components/media/crop/mediaCropMath.ts` - in-house crop geometry to retire if unused.
- `frontend/src/components/media/crop/mediaCropMath.test.ts` - current math tests.
- `frontend/src/components/media/crop/mediaCropA11y.ts` - in-house keyboard/focus helpers to retire if unused.
- `frontend/src/components/admin/MediaUpload.tsx` - fansub group logo/banner upload and current inline logo cropper.
- `frontend/src/components/admin/MediaUpload.test.tsx` - fansub media upload tests.
- `frontend/src/app/me/profile/components/MemberAvatarCard.tsx` - avatar image selection and recrop entry.
- `frontend/src/app/me/profile/page.tsx` - avatar upload handler and profile page integration.
- `frontend/src/app/me/profile/page.test.tsx` - profile avatar upload/recrop regressions.
- `frontend/src/lib/api.ts` - `uploadOwnProfileAvatar`, `uploadFansubMedia`, auth-aware upload helpers.
- `frontend/src/types/profile.ts` - avatar response shape.
- `frontend/package.json` - dependency addition if a library is selected.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `uploadOwnProfileAvatar` already sends both source and cropped files; keep it.
- `uploadFansubMedia` already owns fansub group upload progress/auth; keep it.
- `MemberAvatarCard` already knows how to load `source_original_url` for recrop.
- `MediaUpload` already distinguishes logo vs banner and owns group-media validation/progress/error state.

### Established Patterns
- Protected browser uploads use central API helpers and must not manually construct bearer headers.
- Shared UI primitives should live under neutral component paths and be consumed by domain-specific callers.
- Domain upload flows remain separate even when they share dropzone/cropper/progress primitives.

### Integration Points
- The shared cropper should return a deterministic PNG/WebP Blob/File for avatar/logo flows, or provide a canvas that domain callers convert.
- Avatar crop must keep circular/1:1 UI semantics and source-original retention.
- Fansub logo crop should preserve the existing group-media helper and only replace the cropper UI/export mechanics.

</code_context>

<specifics>
## Specific Ideas

- Evaluate `react-advanced-cropper` first, because its documentation explicitly mentions mobile support and canvas/coordinate output.
- Keep the Phase 56 first implementation narrow: profile avatar and fansub logo only.
- Use browser UAT with an obvious asymmetric test image so preview/export parity can be judged visually.
- If SVG logo crop is awkward, keep SVG upload as a direct non-crop path and document that only raster logos open the cropper.

</specifics>

<deferred>
## Deferred Ideas

- Server-side crop-coordinate persistence and derivative variant generation.
- Banner cropping, unless an existing contract is found during implementation.
- Public profile crop display changes.
- Any release-version, release, anime, or episode media cropping behavior.

</deferred>

---

*Phase: 56-cropper*
*Context gathered: 2026-05-28*
