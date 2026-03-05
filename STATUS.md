# STATUS

## Project
- Team4s.v3.0
- Milestone: Public Group/Release Experience stabilization
- Rough completion: ~45%

## What Works Now
- Core platform stack runs locally (Go backend, Next.js frontend, Postgres, Redis).
- Public group/release experience baseline (routes, story, releases feed, playback base) is in place.
- Active feature work is present in working tree:
  - release filter logic + UI polish
  - other-group chips on releases page
  - breadcrumb addition on anime detail
- Developer environment baseline validated:
  - VS Code settings reviewed
  - extension baseline installed

## How To Run / Verify
```bash
docker compose up -d
curl http://localhost:8092/health
cd backend && go test ./...
cd ../frontend && npm test
cd ../frontend && npm run build
```

## Next (Top 3)
1. Ship one-click server-side folder provisioning for anime/group assets.
2. Finalize release-page filter behavior and UX consistency.
3. Add explicit error handling for folder-create failures (permission/path conflicts).

## Known Risks / Blockers
- No direct Jellyfin/Emby REST mkdir endpoint for media roots.
- Folder schema is not yet formalized.
- Media host write permissions for automation path still need confirmation.

## Owner / Roles
- Product/implementation owner: Team4s core dev workflow in this repo.
- Immediate focus owner: backend + frontend integration for media-folder automation.
