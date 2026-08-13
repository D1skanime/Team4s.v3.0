# Phase 57-01 Summary

## Result

Backend, database, and OpenAPI are aligned on date-backed profile activity fields.

## Changes

- Added migration `0079_member_profile_activity_dates` with nullable `members.active_from_date` and `members.active_until_date` `DATE` columns.
- Backfilled valid legacy years into normalized January 1 dates.
- Added DB constraints for year-limited dates, 1970-2100 bounds, and `active_until_date >= active_from_date`.
- Updated member profile models, handler request mapping, repository persistence, and OpenAPI schemas for `active_from_date` / `active_until_date`.
- Kept legacy year fields as deprecated compatibility mirrors.

## Verification

- `cd backend && go test ./internal/migrations ./internal/handlers ./internal/repository`
- `git diff --check`

## Notes

The date fields are the new source of truth. Legacy year fields remain only for compatibility/backfill and are mirrored from the date values on profile update.
