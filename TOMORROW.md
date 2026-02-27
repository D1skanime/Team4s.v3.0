# TOMORROW

## Top 3 Priorities
1. Continue handler modularization (fansub_admin.go, remaining files)
2. Playback abuse-control hardening for /api/v1/episodes/:id/play
3. Alias backfill for unmapped release tags (B-SH etc.)

## First 15-Minute Task
```bash
cd Team4s.v3.0
docker compose ps
docker compose exec -T team4sv30-backend ./migrate status
curl http://localhost:8092/health
cd backend && go test ./internal/handlers/...
```

## Dependencies To Unblock
- Restore Docker Desktop if unavailable
- Confirm alias strategy for legacy import tags

## Nice-To-Have
- Split remaining test files >150 lines
- Add UI regression for episode selection flow
