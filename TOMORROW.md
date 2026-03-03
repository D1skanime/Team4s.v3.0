# TOMORROW

## Top 3 Priorities
1. Add timeout-simulation regression coverage for Jellyfin transport failures
2. Run one deployment rehearsal using `docs/operations/deployment-hardening-checklist.md`
3. Capture first weekly query-plan snapshot using `docs/performance/anime-search-query-plan-tracking.md`

## First 15-Minute Task
Run the selective `%nar%` query-plan command from `docs/performance/anime-search-query-plan-tracking.md` and append the result as today's first snapshot.

## Dependencies To Unblock
- Ensure the Jellyfin test instance is reachable before timeout simulation checks
- Confirm deployment rehearsal environment has valid auth secret available for smoke scripts

## Nice-To-Have
- Add one focused backend test for timeout classification/details mapping
- Attach a sample `jellyfin_http` timeout log excerpt into the diagnostics runbook
