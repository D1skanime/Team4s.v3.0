# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Phase:** Public Group/Release Experience (EPIC 0-6 complete)
- **Completion:** ~40% (Public EPICs 0-6 of 16)

## Current State

### Done (Today 2026-03-03)
- EPIC 0: Group Routes (`/anime/:id/group/:groupId`, `/releases`), Breadcrumbs, GroupEdgeNavigation
- EPIC 1: Anime-Detail CTA to Group pages
- EPIC 2: Group Story page (CollapsibleStory, Header, Stats)
- EPIC 3: Releases page (Filter chips, Search, Episode Cards, Badges)
- EPIC 4: Episode Expanded (MediaAssetsSection with OP/ED/Kara/Insert tiles)
- EPIC 5: Public Playback (VideoPlayerModal, Stream Proxy, Error states)
- EPIC 6: Screenshot Gallery (Lightbox, Infinite Loading, DB migration 0018)

### New Backend Components
- `group_handler.go`, `group_repository.go` (Group Detail + Releases APIs)
- `asset_stream_handler.go` (Video stream proxy)
- `episode_version_images_handler.go` + migration 0018

### New Frontend Components
- `components/navigation/Breadcrumbs.tsx`
- `components/groups/GroupEdgeNavigation.tsx`, `CollapsibleStory.tsx`
- `app/anime/[id]/group/[groupId]/page.tsx` + `/releases/page.tsx`
- `app/episodes/[id]/components/MediaAssetsSection/`, `VideoPlayerModal/`, `ScreenshotGallery/`

### Pending
- EPIC 7-10: Comments, APIs, UX Polish, Permissions
- EPIC 11-15: Admin Group/Release Curation

## Key Decisions
- Multi-agent orchestration: UX → Design → Backend/Frontend parallel
- Contract-first: OpenAPI specs before implementation
- 400 char story collapse threshold
- Database-backed images (not provider-proxied)
- Native HTML5 video player (no custom library)

## Quality Bar
- `go build ./...` must pass
- `npm run build` must pass
- All tests green before merge
