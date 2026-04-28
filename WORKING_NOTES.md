# WORKING_NOTES

## Current Workflow Phase
- Phase 25 is effectively complete/UAT-backed.
- Phase 26 is the active thread: segment source assets as Team4s-owned files, plus clear operator visibility for file/segment state.

## Useful Facts To Keep
- Segment work now lives on the episode-version edit route, not on a separate anime themes admin page.
- Segment types are generic (`OP`, `ED`, `Insert`, `Outro`); naming like `OP1` or `Final OP` belongs in the free title field.
- `release_asset` is the real storage path for segment files; Jellyfin should not become the primary segment upload model.
- Operators needed visible proof both in the segment row and in the episode overview that files/segments already exist; the UI now carries that status.
- The `.codex/agents` startup issue was worked around by removing the stale `.toml` registrations from the active folder and keeping the repo-local markdown skills usable.

## Verification Memory
- `cd frontend && npm.cmd run build` passed on 2026-04-24.
- `cd backend && go build ./...` passed on 2026-04-28.
- `cd frontend && npm.cmd run build` passed on 2026-04-28.
- Docker backend/frontend are up and the segment editor plus anime episodes routes returned `200`.

## Mental Unload
- The important UX shift today was not more theme complexity, but making existing segment/file state visible at the places operators already work.
- Tomorrow should not reopen broad theme-management ideas again before the new Phase-26 status surfaces are judged live.
