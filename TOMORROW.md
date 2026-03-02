# TOMORROW

## Top 3 Priorities
1. Smoke-test single-episode sync with live Jellyfin configuration
2. Add frontend tests for Jellyfin feedback states and sync-dialog behavior
3. Update STATUS.md and WORKING_NOTES.md to reflect completed UX overhaul

## First 15-Minute Task
```bash
cd Team4s.v3.0
docker compose up -d
# Test single-episode sync via UI
# 1) Navigate to /admin/anime/[id]/episodes
# 2) Click Sync button on an episode accordion
# 3) Verify loading state, success feedback, error handling
```

## Dependencies To Unblock
- Live Jellyfin instance configured for testing
- Valid admin token for API calls

## Nice-To-Have
- Replace `img` with Next.js Image in older admin routes
- Handler modularization (jellyfin_sync.go is now 600+ lines)
- Add pg_trgm index for anime search at scale
