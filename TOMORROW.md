# TOMORROW

## Top 3 Priorities
1. Entscheiden welche Phase als nächstes kommt — mögliche Kandidaten: Segment-Playback-Verbesserungen, Fansub Group Media, oder weitere Asset-Lifecycle-Arbeit.
2. `fansub_groups.closed_year` und `history_description` — entscheiden ob Felder sauber gedroppt werden können.
3. Alte manual-vs-Jellyfin Entry-Choice-Seite formal als deprecated markieren oder entfernen.

## First 15-Minute Task
- `git log --oneline origin/main..HEAD` durchsehen und prüfen ob alle 28 Commits push-ready sind (keine Scratch/Debug-Einträge). Dann `git push origin main`.

## Dependencies To Unblock Early
- Docker DB/Redis/backend/frontend laufen lassen.
- Work only from `C:\Users\admin\Documents\Team4s`.
- Temporärer lokaler Jellyfin-Host: `http://192.168.235.100:8098`.
