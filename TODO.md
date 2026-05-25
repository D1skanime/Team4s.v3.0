# TODO

## Current Active Work
- [x] Verify `/admin/fansubs/create` and `/admin/fansubs/merge` are wrapped in `PlatformAdminGate`.
- [x] Add direct-access frontend tests for non-platform visits to `/admin/fansubs/create` and `/admin/fansubs/merge`.
- [x] Update `EpisodeVersionEditorPage` so admin tabs wait for current user plus release capabilities.
- [x] Add release-version editor tests for loading, media-only, notes-only, and no-capability contributor states.
- [x] Confirm backend contributor editor context is already narrowed through `loadEpisodeVersionContributorContext`.
- [x] Run targeted Vitest, ESLint, TypeScript, diff-check, and frontend build for the editor/direct-access slice.
- [ ] Inspect `frontend/src/components/auth/PlatformAdminGate.test.tsx` and decide whether it belongs in the same Phase 50 commit.
- [ ] Decide whether `frontend/tsconfig.tsbuildinfo` should remain unstaged or be included.
- [ ] Stage/commit the exact Phase 50 frontend boundary slice by explicit path.

## Parking Lot
- [ ] Rest of dirty worktree: split `.codex/`, `.planning/`, backend media, frontend media/detail, screenshots, temp folders, and generated artifacts into deliberate slices.
- [ ] Live-domain checklist for reverse proxy, Keycloak, `API_INTERNAL_URL`, `NEXT_PUBLIC_API_URL`, HTTPS/cookies, and streaming routes.
- [ ] Full authenticated Docker-live admin click-through when browser credential entry is available.
- [ ] Phase 48 UI follow-up: long release lists, capability badge wording, and media fallbacks.
- [ ] Phase 42 collaboration remains parked until auth/member/capability baseline stays stable.
