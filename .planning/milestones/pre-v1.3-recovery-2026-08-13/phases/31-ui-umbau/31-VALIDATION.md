---
phase: 31
created: 2026-04-30
status: validation_strategy
---

# Phase 31 Validation Strategy

## Must-Prove Scenarios

1. Fansub `17` displays real Anime/Releases from the backend, including `11eyes`, `11eyes: Pink Phantasmagoria`, and `Release #92`.
2. Release rows are expandable inline; no global `ReleaseDrawer` is required for the first implementation.
3. Expanded release content shows Theme-/Segment context, not release logo/banner controls.
4. Segment status copy includes `Global gesetzt`, `Release-spezifisch`, and `Fehlt noch`.
5. Generic `release_media` remains separate from OP/ED/Karaoke/Insert Theme-/Segment assets.

## Commands

```powershell
cd backend; go test ./internal/handlers ./internal/repository ./internal/services -count=1
cd frontend; npx tsc --noEmit
cd frontend; npm.cmd run build
curl.exe -I --max-time 20 http://127.0.0.1:3002/admin/fansubs/17/edit
```

## UAT Data

- Fansub: `17` / `Strawhat`
- Anime: `13` / `11eyes`
- Anime: `14` / `11eyes: Pink Phantasmagoria`
- Release: `92` / `11 eyes OVA.Bonus.S00E01-strawhat.mp4`
