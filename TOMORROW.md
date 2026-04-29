# TOMORROW

## Top 3 Priorities
1. Run the live Phase-28 browser/UAT pass on `/admin/episode-versions/47/edit` for runtime playback/fallback behavior and the new duration shorthand.
2. Capture the duration-input/browser evidence in the Phase-28 verification artifact.
3. Audit the Phase-27 migration mismatch so `0052` cannot appear applied while `segment_library_*` tables are missing.

## First 15-Minute Task
- Open `http://127.0.0.1:3002/admin/episode-versions/47/edit`, enter `90`, `24:10`, and `1m30s` into the duration field and confirm save/reload, then enter `abc` and confirm the UI blocks save with a validation error.

## Dependencies To Unblock Early
- Keep Docker DB/Redis/backend/frontend running.
- Work only from `C:\Users\admin\Documents\Team4s`.
