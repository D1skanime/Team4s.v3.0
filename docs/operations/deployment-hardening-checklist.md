# Deployment Hardening Checklist

## Scope
Checklist for safe rollout of Team4s.v3.0 with explicit rollback and smoke verification.

## 1) Pre-Rollout Gate
- [ ] `main` is up to date and branch/commit to deploy is fixed.
- [ ] Working tree is clean.
- [ ] Backend tests green: `cd backend && go test ./...`
- [ ] Frontend tests green: `cd frontend && npm test`
- [ ] Frontend build green: `cd frontend && npm run build`
- [ ] Migration status reviewed:
  - `docker compose exec -T team4sv30-backend ./migrate status`
- [ ] Required env values verified (`.env`, secrets not changed unexpectedly).

## 2) Rollout Steps
1. Pull/build release images (or rebuild from pinned commit).
2. Start backend + frontend with dependency health checks:
   - `docker compose up -d --build team4sv30-backend team4sv30-frontend`
3. Validate service health:
   - `curl http://localhost:8092/health`
4. Validate migration state again:
   - `docker compose exec -T team4sv30-backend ./migrate status`

## 3) Post-Rollout Smoke Pack
Run targeted smoke scripts from repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-auth-comments-watchlist.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-fansubs.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-episode-playback.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-anime-media.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-admin-content.ps1
```

Also verify key UI routes:
- `http://localhost:3002/admin/anime/25/episodes`
- `http://localhost:3002/anime/25`

## 4) Rollback Plan
Trigger rollback immediately on failed health checks, migration errors, or smoke failures.

1. Revert to last known-good commit/image tag.
2. Redeploy previous backend/frontend release.
3. If current release applied a bad migration, roll back safely:
   - `docker compose exec -T team4sv30-backend ./migrate down -steps 1`
4. Re-run health + minimal smoke:
   - `/health`
   - admin content smoke
   - playback smoke
5. Document incident and root cause before next rollout attempt.

## 5) Release Record Template
- Release date/time:
- Commit/image:
- Operator:
- Migration versions before/after:
- Smoke suite result:
- Issues detected:
- Rollback needed: yes/no
- Follow-up tasks:
