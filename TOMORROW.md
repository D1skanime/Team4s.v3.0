# TOMORROW

## Top 3 Priorities
1. Jellyfin: run a real preview on a representative anime, compare duplicate candidates, and lock down the correct series/path choice before first sync
2. Frontend Episodes Overview: integrate the new accordion, version counts, and fansub badges into `/admin/anime/{id}/episodes`
3. Add focused regression coverage for the new Jellyfin error and confirm-state flows

## First 15-Minute Task
```bash
cd Team4s.v3.0
# Start with one real anime and compare the available Jellyfin candidates before any write action
curl -H "Authorization: Bearer <admin-token>" "http://localhost:8092/api/v1/admin/jellyfin/series?q=<anime-title>&limit=5"
```

## Dependencies To Unblock
- None (live Jellyfin search is working; the next step is validating preview selection on real data)

## Nice-To-Have
- Wire the new `EpisodesOverview` component with play actions
- Resume handler modularization for oversized files
- Replace remaining `img` tags with `next/image`
