# TOMORROW

## Top 3 Priorities
1. Extract `SyncEpisodeFromJellyfin` from `jellyfin_sync.go` to meet 150-line handler limit
2. Add explicit UI copy to distinguish bulk Jellyfin sync from corrective single-episode sync
3. Replace remaining `img` tags with Next.js Image component in older admin routes

## First 15-Minute Task
Open `backend/internal/handlers/jellyfin_sync.go` and identify the `SyncEpisodeFromJellyfin` function boundaries to prepare extraction into a new file `backend/internal/handlers/jellyfin_episode_sync.go`.

## Dependencies To Unblock
- None

## Nice-To-Have
- Full code/architecture/UX review across sync and admin surfaces
- Add deterministic test for cropper output parity
- Verify regression suite in CI
