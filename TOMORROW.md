# TOMORROW

## Top 3 Priorities
1. Run the `team4s-design` agent to review UX/design on `/admin/anime/{id}/episodes/{episodeId}/edit` and `/admin/anime/{id}/episodes/{episodeId}/versions`
2. Rework the public anime detail so exactly one fansub group is active at a time and users can switch groups explicitly
3. Show only the active fansub group's public episode versions in the episode list, with one initial group preselected by the system

## First 15-Minute Task
```bash
cd Team4s.v3.0
# Inspect the current public anime rendering before changing behavior
# 1) open frontend/src/app/anime/[id]/page.tsx
# 2) find where fansub descriptions/history and episode versions are rendered
# 3) note the state shape needed for one active fansub group
```

## Dependencies To Unblock
- UX review pass from the `team4s-design` agent
- Finalize how the "random" initial fansub group is chosen without introducing unstable UI behavior

## Nice-To-Have
- Add explicit UI copy that clarifies full Jellyfin sync is season-wide and single-episode sync is corrective
- Extract `SyncEpisodeFromJellyfin` out of `jellyfin_sync.go`
- Replace `img` with Next.js Image in older admin routes
