# STATUS

## Project Snapshot
- **Project:** Team4s.v3.0
- **Milestone:** `v1.1 Asset Lifecycle Hardening`
- **Branch:** `main`
- **Status:** Phase 54, Phase 55, and Phase 56 are complete. Phase 56 functional UAT and security review passed on 2026-05-29.
- **Current focus:** Leave `main` pushed and restartable; next work should choose the next narrow cleanup slice from the verified baseline.

## What Works Now
- Keycloak/API token boundary from Phase 51 remains the auth truth: API bearer is Keycloak `access_token`, not `id_token`.
- Phase 52 profile account-return flow was live-tested during Phase 53 UAT and passed for the member flow.
- Phase 53 profile page saves Team4s-owned fields and keeps account-owned display data read-only.
- Phase 55 persists profile story content as TipTap JSON plus server-rendered sanitized HTML and derived plain text.
- Phase 56 uses `react-easy-crop` behind a shared `Team4sCropper` component.
- Profile avatar crop uses the shared cropper and still uploads source original plus cropped display through `uploadOwnProfileAvatar`.
- Fansub group raster logo crop uses the shared cropper and still uploads through `uploadFansubMedia`.
- SVG group logos bypass canvas cropping and remain on the existing upload path.
- Release-version media domain guardrails remain in force: use `release_version_media.release_version_id`, not `release_media` or `release_id` substitutes.

## What Is Not Done Yet
- Profile hub content/activity design remains open.
- Contributor-owned media upload text edit/delete remains open.
- Older parking-lot cleanup and broad UI convergence ideas should stay as small tested slices.

## Valid Commands
- `cd backend && go test ./...`
- `cd backend && go test ./internal/handlers ./internal/repository`
- `cd frontend && npm run test -- --run "src/app/me/profile/page.test.tsx" "src/components/editor/RichTextEditor.test.tsx"`
- `cd frontend && npx vitest run src/components/media/crop/Team4sCropper.test.tsx src/components/media/crop/AvatarCropDialog.test.tsx --reporter verbose`
- `cd frontend && npx vitest run src/components/admin/MediaUpload.test.tsx src/app/me/profile/page.test.tsx --reporter verbose`
- `cd frontend && npm run typecheck`
- `cd frontend && npm run lint`
- `cd frontend && npm run build`
- `git diff --check`
- `git status --short --branch`

## Verification Evidence
- Phase 51 live smoke passed: access token accepted, ID token rejected.
- Phase 52 targeted auth/profile checks passed during its implementation slice.
- Phase 53 profile/AppShell tests passed after validation expansion.
- Phase 55 backend, frontend, typecheck, and validation evidence is recorded in Phase 55 artifacts.
- Phase 56 targeted cropper/avatar/media/profile tests passed.
- Phase 56 `npm run typecheck`, focused ESLint, `npm run build`, and functional UAT passed.
- Phase 56 security review passed with `threats_open: 0`.
- `git diff --check` passed during closeout.

## Top 3 Next
1. Run a 15-minute roadmap/requirements reconcile after push and confirm Phase 54-56 remain marked complete.
2. Check that no stale Phase 56 pending-gate marker remains in planning files.
3. Pick the next narrow cleanup slice from the verified baseline.

## Risks / Blockers
- Do not collapse versioned release media back onto `release_media`.
- Do not create a new upload flow unless the reuse guardrail has been checked and a decision is documented.
- Do not change profile story persistence back to plain-text-only save behavior.
- Phase 54 browser screenshots are planning evidence; keep them with the Phase 54 artifacts unless a later cleanup explicitly archives them.
