---
phase: 31-ui-umbau
plan: "03"
subsystem: frontend-admin-fansub
tags: [fansub, releases, segment-editor, media-boundary, deploy]
key_files:
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/page.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css
verification:
  - cd backend && go test ./internal/handlers ./internal/repository ./internal/services -count=1
  - cd frontend && npx tsc --noEmit
  - cd frontend && npm.cmd run build
  - docker compose build team4sv30-frontend
  - docker compose up -d team4sv30-frontend
  - curl.exe -I --max-time 20 http://127.0.0.1:3002/admin/fansubs/17/edit
completed_date: "2026-04-30"
---

# Phase 31 Plan 03 Summary

Klick auf eine Theme-/Segment-Karte oeffnet jetzt eine release-spezifische Editor-Flaeche in der ausgeklappten Release-Zeile.

Die Flaeche zeigt:

- `Segment bearbeiten`
- Release-ID
- Anime-Titel
- Theme-Typ
- Status
- Theme-Titel
- Quelle

Gebaut:

- `selectedReleaseSegment` State in der Fansub-Edit-Seite
- aktive Segmentkarte wird visuell markiert
- Inline-Editor unter den Segmentkarten
- Scope-Hinweis, dass diese Flaeche die bestehende Theme-/Segment-Asset-Seam verwendet und generisches `release_media` nicht fuer OP/ED/Karaoke/Insert missbraucht

Bewusste Grenze: Direkter Upload in genau diese Editor-Flaeche ist strukturell vorbereitet, aber noch nicht als neuer Schreibpfad umgesetzt. Der bestehende Uploadpfad fuer Release-Theme-Assets existiert bereits, loest aber aktuell ueber Fansub+Anime den kanonischen Release-Anker. Fuer nicht-kanonische konkrete Releases braucht der naechste schmale Backend-Slice einen direkten `release_id + theme_id` Uploadpfad.

Live-UAT-Daten:

- Fansub: `17` / `Strawhat`
- Anime: `13` / `11eyes`
- Anime: `14` / `11eyes: Pink Phantasmagoria`
- Release: `92` / `11 eyes OVA.Bonus.S00E01-strawhat.mp4`

## Self-Check: PASSED

Automatisierte Checks und Deploy waren erfolgreich. Browser-UAT bleibt: `http://127.0.0.1:3002/admin/fansubs/17/edit`, Tab `Anime & Releases`, `Release #92` aufklappen, Segmentkarte anklicken.
