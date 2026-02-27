# TOMORROW

## Top 3 Priorities
1. Genre-Dropdown in `/admin/anime/[id]/edit` live im Browser pruefen und den letzten sichtbaren UI-Fehler schliessen
2. Den neuen Admin-Anime-Step-Flow auf Desktop und Mobile manuell pruefen und verbleibende Legacy-Links bereinigen
3. Playback abuse-control hardening for `/api/v1/episodes/:id/play`

## First 15-Minute Task
```bash
cd Team4s.v3.0
docker compose ps
curl http://localhost:8092/health
start http://localhost:3002/admin/anime/25/edit
# Hard refresh the page in the browser
# Type "act" into the Genres field
# Confirm the browser calls /api/v1/genres?query=act
# If data returns but no list is visible, inspect dropdown render/z-index/clipping
```

## Dependencies To Unblock
- Restore Docker Desktop if unavailable
- Use a hard reload so the latest frontend bundle is active before debugging the genre field

## Nice-To-Have
- Replace remaining `img` tags in the new admin UI slices to clear the current Next warnings
- Continue handler modularization after the admin UI stabilization pass
