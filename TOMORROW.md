# TOMORROW

## Top 3 Priorities
1. Audit the Phase-27 migration mismatch so `0052` cannot appear applied while `segment_library_*` tables are missing.
2. Decide whether upload-time segment assets should be inserted into the library immediately or only on delete-detach.
3. Close the next smallest verified slice without reopening broad theme-management redesign.

## First 15-Minute Task
- Run `docker exec team4sv30-db psql -U team4s -d team4s_v2 -c "SELECT schemaname, tablename FROM pg_tables WHERE tablename LIKE 'segment_library_%' ORDER BY tablename;"` and compare it with `docker exec team4sv30-backend ./migrate status` to explain why migration `52` once showed applied before the tables existed.

## Dependencies To Unblock Early
- Keep Docker DB/Redis/backend/frontend running.
- Work only from `C:\Users\admin\Documents\Team4s`.
