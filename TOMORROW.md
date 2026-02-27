# TOMORROW

## Top 3 Priorities
1. Episode-Versionen Route manuell pruefen und responsive polishen
2. `/admin/anime/[id]/versions/page.tsx` in kleinere Komponenten splitten
3. Playback abuse-control hardening for /api/v1/episodes/:id/play

## First 15-Minute Task
```bash
cd Team4s.v3.0
docker compose ps
curl http://localhost:8092/health
start http://localhost:3002/admin/anime/25/versions
# Check desktop and mobile widths for layout regressions
# Pick the first subcomponent to extract from the page route
```

## Dependencies To Unblock
- Restore Docker Desktop if unavailable
- Decide the first extraction boundary for the oversized page route

## Nice-To-Have
- Add focused UI regression coverage for the redesigned episode versions route
- Continue handler modularization after the frontend cleanup
