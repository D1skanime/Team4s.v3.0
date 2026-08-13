---
status: partial
phase: 32-fansub-release-side-drawer
started: 2026-05-01
updated: 2026-05-01
---

# Phase 32 UAT

## Automated Checks

- `cd backend && go test ./internal/handlers ./internal/repository -count=1` - passed
- `cd frontend && npx tsc --noEmit` - passed
- `docker compose build --progress=plain team4sv30-backend team4sv30-frontend` - passed
- `docker compose up -d team4sv30-backend team4sv30-frontend` - passed
- `Invoke-WebRequest http://127.0.0.1:3002/admin/fansubs/17/edit` - returned status code `200`

## Browser UAT

URL: `http://127.0.0.1:3002/admin/fansubs/17/edit`

Pending manual checks:

- Open `Anime & Releases`.
- Expand `11eyes`.
- Confirm row chevron opens inline timeline preview.
- Click `Edit` and confirm the right Side Drawer opens.
- Confirm Drawer has `Details`, `Theme Assets`, and `Historie`.
- Confirm `Theme Assets` allows selecting OP/ED/IN without editing timeline timings.
- Confirm locked Global/Jellyfin slots do not offer upload override.
- Confirm missing/release-specific slots show upload and release-specific assets show `Asset entfernen`.

Upload was not manually tested in browser during execution.
