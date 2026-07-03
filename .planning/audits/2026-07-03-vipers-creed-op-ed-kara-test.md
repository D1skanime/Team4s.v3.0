# 2026-07-03 - Viper's Creed OP/ED Kara UI Test

Status: completed
Mode: Playwright UI-first, no API-created OP/ED domain data

## Scope

Create Opening and Ending karaoke/theme segments for Viper's Creed as platform admin through the real episode-version segment UI.

## Source Notes

- Opening: `R.O.C.K.` by iLL.
- Ending: `AINOOTO (Ai no Oto ~English ver.~)` / `Ai no Oto` by moumoon.
- Exact in-episode timestamps were not found in a reliable public source during the test.
- Timing used for the UI test:
  - OP: `00:00:00` - `00:02:00`, based on the surfaced OP length reference and because Episode 1 starts with the OP in this test context.
  - ED: `00:21:57` - `00:23:45`, derived from the UI release-version duration `00:23:45` minus the publicly visible ED clip length `01:48`.

## Setup Finding

The segment create panel initially could not be used because the global theme type lookup was empty:

- `GET /api/v1/admin/theme-types` returned `{"data":[]}`.
- `scripts/reset-local-schema-cutover-data.ps1` truncated `theme_types` but did not restore the reference rows.

Fix applied:

- `scripts/reset-local-schema-cutover-data.ps1` now reseeds `OP Kara`, `ED Kara`, `Insert Kara`, and `Outro` after the local reset truncation.
- The current local test database was repaired with the same reference rows only; the actual OP/ED segments were then created manually through the UI.

## UI Steps

1. Logged in as `admin` with password `123`.
2. Opened `/admin/episode-versions/2/edit`.
3. Switched to the `Segmente` tab.
4. Created OP Kara manually:
   - Type: `OP Kara`
   - Name: `R.O.C.K. - iLL`
   - Episodes: `1` to `12`
   - Time: `00:00:00` to `00:02:00`
   - Source: `Episode-Version / Jellyfin-Stream (Standard)`
5. Created ED Kara manually:
   - Type: `ED Kara`
   - Name: `AINOOTO (Ai no Oto ~English ver.~) - moumoon`
   - Episodes: `1` to `12`
   - Time: `00:21:57` to `00:23:45`
   - Source: `Episode-Version / Jellyfin-Stream (Standard)`

## Verification

Playwright table text after save:

```text
OP R.O.C.K. - iLL 1-12 00:00:00 - 00:02:00 (00:02:00) Episode-Version / Jellyfin-Stream
ED AINOOTO (Ai no Oto ~English ver.~) - moumoon 1-12 00:21:57 - 00:23:45 (00:01:48) Episode-Version / Jellyfin-Stream
```

Screenshots:

- `screenshots-2026-07-03-vipers-creed-fresh-rerun/31-segments-tab-initial.png`
- `screenshots-2026-07-03-vipers-creed-fresh-rerun/32-segment-create-panel.png`
- `screenshots-2026-07-03-vipers-creed-fresh-rerun/33-op-segment-filled.png`
- `screenshots-2026-07-03-vipers-creed-fresh-rerun/34-ed-segment-filled.png`
- `screenshots-2026-07-03-vipers-creed-fresh-rerun/35-segments-op-ed-created.png`

## Remaining Risk

The exact OP in-episode end time is still a best available test timing, not independently verified from a timestamped episode source.
