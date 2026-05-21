# RISKS

## 2026-05-21 Top Risks

### 1. Full lint can be misread as a Phase 49 failure
- **Impact:** Medium
- **Likelihood:** Medium
- **Why it matters:** Phase 49 targeted lint/static/type/build verification passed, but full lint still fails on unrelated existing files/scripts.
- **Mitigation:** Keep reports explicit: unrelated failures are in `ReleaseVersionMediaSection.test.tsx`, `app/dev/ui-system/page.tsx`, and `tmp-live-full-flow*.js`.

### 2. Normal auth cleanup could accidentally absorb SSR or streaming boundaries
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** Phase 49 intentionally separates normal browser API calls from SSR pages and Jellyfin/streaming server routes.
- **Mitigation:** Reuse the documented boundary in `docs/frontend/streaming-auth-handoff.md`; create a separate stream-grant/relay phase for any future redesign.

### 3. Page/component token ownership could creep back in
- **Impact:** High
- **Likelihood:** Medium
- **Why it matters:** The central client now owns token lifecycle; bypassing it would reintroduce stale-session and wrong-user mutation risk.
- **Mitigation:** Keep `api.no-token-boundary.test.ts` strict and add allowlist entries only for explicit boundaries.

### 4. Dirty worktree can blur commit boundaries
- **Impact:** Medium
- **Likelihood:** High
- **Why it matters:** The workspace contains unrelated product, planning, scratch, and `.codex` tooling changes.
- **Mitigation:** Before any commit, inspect `git status --short` and stage only the intended slice.

## Current Blockers
- No blocking Phase 49 product gap remains.
- Full global lint remains blocked by unrelated existing errors.
- Cross-AI review remains unavailable locally unless an independent reviewer CLI is installed.
