# TOMORROW

## Top 3 Priorities
1. Do one short human smoke of `/admin/anime/create` on the pushed Docker build.
2. Confirm the next narrow v1.1 slice now that Anime Create is closed.
3. Keep any remaining visual tweaks small and separate from lifecycle-critical code.

## First 15-Minute Task
- Open `http://127.0.0.1:3002/admin/anime/create`, create one disposable test anime with AniSearch, Jellyfin, at least one background, and one background video, then confirm the created record shows the expected assets and `Ordnerpfad`.

## Dependencies To Unblock Early
- Keep Docker DB/Redis/frontend/backend running or restart with `docker compose up -d --build team4sv30-frontend`.
- Use `http://127.0.0.1:8092/api/v1/anime` as the quick backend smoke endpoint.
- Work only from `C:\Users\admin\Documents\Team4s`.
