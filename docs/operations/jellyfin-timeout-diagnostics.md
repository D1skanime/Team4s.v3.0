# Jellyfin Timeout Diagnostics

## Purpose
Provide a repeatable triage path when operators see `server nicht erreichbar` in Jellyfin admin flows.

## Signals Added (2026-03-03)
Jellyfin HTTP calls now emit structured backend logs on failures:
- `admin_content jellyfin_http: request failed (...)`
- `admin_content jellyfin_http: upstream status (...)`
- `admin_content jellyfin_http: read response failed (...)`
- `admin_content jellyfin_http: decode response failed (...)`

Captured fields:
- `path`
- `elapsed_ms`
- `category` (`timeout`, `connectivity`, `transport`)

## Triage Workflow
1. Reproduce failing admin action:
   - search, preview, sync, or single-episode sync
2. Inspect backend logs for `jellyfin_http` entries.
3. Classify by category:
   - `timeout`: request exceeded allowed time budget
   - `connectivity`: host/DNS/port/reachability problem
   - `transport`: other request-layer failure
4. Correlate with response payload:
   - `error.code`
   - `error.details`
5. Apply targeted action:
   - timeout: check Jellyfin server load/network latency
   - connectivity: verify base URL, DNS, routing, firewall
   - auth failures (`401/403`): verify API key/permissions

## Quick Runtime Checks
```powershell
docker compose ps
Invoke-RestMethod -Method GET -Uri http://localhost:8092/health
docker compose exec -T team4sv30-backend ./migrate status
```

## Escalation Trigger
Escalate if either condition persists across repeated attempts:
- `timeout` category appears consistently for the same route/path.
- `connectivity` category appears despite confirmed network availability.

## Next Improvement
- Add dedicated integration fixture for timeout behavior to lock regression coverage on diagnostics mapping.
