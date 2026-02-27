# TOMORROW

## Top 3 Priorities
1. Anime Page Design verbessern
2. Continue handler modularization (fansub_admin.go, remaining files)
3. Playback abuse-control hardening for /api/v1/episodes/:id/play

## First 15-Minute Task
```bash
cd Team4s.v3.0
docker compose ps
curl http://localhost:8092/health
# Review current Anime page design in browser
# Identify specific UI/UX improvements needed
```

## Dependencies To Unblock
- Restore Docker Desktop if unavailable
- Confirm alias strategy for legacy import tags

## Nice-To-Have
- Split remaining test files >150 lines
- Add UI regression for episode selection flow
