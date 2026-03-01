# TOMORROW

## Top 3 Priorities
1. Jellyfin: run a real preview+sync on representative anime, document operator flow
2. Wire EpisodesOverview play actions to version editor route
3. Resume handler modularization for remaining oversized files

## First 15-Minute Task
```bash
cd Team4s.v3.0
# Test Jellyfin preview on a real anime with known duplicates
curl -H "Authorization: Bearer <token>" "http://localhost:8080/api/v1/admin/jellyfin/series?q=<anime>&limit=5"
# Then run preview and verify path disambiguation works
```

## Dependencies To Unblock
- None

## Nice-To-Have
- Replace remaining `img` tags with `next/image`
- Add operator documentation for Jellyfin sync workflow
