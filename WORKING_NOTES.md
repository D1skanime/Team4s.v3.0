# WORKING_NOTES

## Current Workflow Phase
- Phase 28 follow-through is the active thread: runtime playback verification plus duration-input hardening on episode-version edit.

## Useful Facts To Keep
- Segment work now lives on the episode-version edit route, not on a separate anime themes admin page.
- Segment types are generic (`OP`, `ED`, `Insert`, `Outro`); naming like `OP1` or `Final OP` belongs in the free title field.
- `release_asset` is the real storage path for segment files; Jellyfin should not become the primary segment upload model.
- Duration input now accepts raw seconds, `m:ss`, `hh:mm:ss`, `2m`, `1m30`, and `1m30s`.
- Invalid duration text must fail validation in the UI and must not clear `duration_seconds` in the backend patch request.
- One `tsc` failure today came from stale `.next/types` generation, not from a durable source-code bug.
- The `.codex/agents` startup issue was worked around by removing the stale `.toml` registrations from the active folder and keeping the repo-local markdown skills usable.

## Verification Memory
- `cd backend && go test ./internal/repository ./internal/handlers -count=1` passed on 2026-04-29.
- `cd frontend && npx vitest run --reporter=verbose src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.test.ts` passed on 2026-04-29.
- `cd frontend && npm.cmd run build` passed on 2026-04-29.
- `cd frontend && npx tsc --noEmit` passed on 2026-04-29.
- Docker backend/frontend are up and `http://127.0.0.1:8092/health` plus `http://127.0.0.1:3002/admin/episode-versions/47/edit` returned `200`.

## Mental Unload
- The important correctness fix today was not just adding shorthand parsing, but preventing invalid text from silently erasing saved runtime metadata.
- Tomorrow should start with a quick real browser pass, not with another abstract parser discussion.
