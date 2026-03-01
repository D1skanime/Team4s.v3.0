# TOMORROW

## Top 3 Priorities
1. Repair the Jellyfin/provider sync workflow so it always follows search -> preview -> confirm -> sync
2. Fix JellySync search logic and frontend result/error handling so candidate anime folders are visible and diagnosable
3. Refactor the episodes overview to expose versions and fansub groups, then run a full backend/frontend/UX gap review

## First 15-Minute Task
```bash
cd Team4s.v3.0
# Locate the current Jellyfin/provider sync wiring before changing behavior
rg -n "jelly|provider.*sync|Preview Sync|Suche" frontend backend
# Inspect the current search button handler and backend endpoints
# List the gaps needed for preview-first search/sync separation
```

## Dependencies To Unblock
- Verify `JELLYFIN_BASE_URL` and `JELLYFIN_API_KEY` are configured and the API is reachable
- Confirm current provider/Jellyfin folder mapping and path normalization assumptions (Windows vs Linux)
- Identify the current episode/version/fansub DTOs and joins before extending the overview route

## Nice-To-Have
- Add audit logs for sync actions, version edits, and fansub assignments
- Resume handler modularization after the sync and episodes visibility work
- Replace remaining `img` tags in admin routes after the higher-priority sync fixes
