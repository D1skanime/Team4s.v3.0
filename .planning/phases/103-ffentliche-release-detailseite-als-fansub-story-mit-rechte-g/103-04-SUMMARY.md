---
phase: 103
plan: "04"
status: complete
completed: 2026-07-16
commits:
  - 8f092811
  - 3dd1a1c3
---

# Plan 103-04 Summary

## Delivered

- Separated ordinary authenticated Kara playback from `release_version.segments.manage`; render and source management remain capability-protected.
- Bound grant issuance to the persisted segment source and the requested real `release_version_id`, while retaining short-lived segment/cache grants and rejecting caller-controlled time bounds.
- Required a ready derived cache (or an existing curated uploaded fallback) before issuing a public playback grant.
- Replaced the project-wide preview list with a release-bound horizontal episode timeline, mobile cards, exact times, segment type, participants, preview, and quiet unavailable state.
- Guests see all segment information without playback/login affordances. Access-token and refresh-only sessions both receive playback affordances through the existing server relay.
- The player autoplays the selected ready segment and unloads the previous source when switching or unmounting.

## Verification

- `go test ./internal/handlers ./internal/auth` — passed.
- Focused `ThemeTimeline.test.tsx` and segment relay tests — 6 tests passed.
- `npm run typecheck` — passed.
- `npm run lint` — blocked by the pre-existing `react-hooks/set-state-in-effect` error in `frontend/src/components/fansubs/FansubStorySection.tsx:49`; 329 existing warnings were also reported. No plan-owned lint error was reported.
- `git diff --check` — passed.

## Coordination

- `page.tsx` and `page.module.css` were concurrently owned by Plan 103-03. The required `ThemeTimeline` prop integration and timeline CSS were handed to that executor and intentionally not included in the 103-04 commits.

## Remaining Risks

- Browser autoplay with audio can be rejected by browser policy; the selected player remains visible with native controls so the user can start it manually.
- Live browser UAT still requires a release containing a ready segment and an authenticated session.
