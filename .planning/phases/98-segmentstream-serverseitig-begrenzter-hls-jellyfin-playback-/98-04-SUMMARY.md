---
phase: 98-segmentstream-serverseitig-begrenzter-hls-jellyfin-playback
plan: 04
subsystem: ui
tags: [react, nextjs, typescript, admin, segment-editor, render-status]

requires:
  - phase: 98-03
    provides: /api/segments/:id/stream Relay und Renderstatus-DTOs
provides:
  - Admin/Leader Segment-Editor mit Renderstatus-Anzeige und Segmentstream-Preview
  - Capability-gesteuerte "vorbereiten"-Aktion; Upload-Fallback-Flow erhalten
affects: [98-05]

tech-stack:
  added: []
  patterns:
    - "Segment-Preview laeuft ueber serverseitig begrenzten Clip, kein clientseitiges Stoppen"

key-files:
  created: []
  modified:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.module.css
    - frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseSegments.ts
    - frontend/src/types/admin.ts

key-decisions:
  - "buildSegmentPreviewStreamHref mit startTimeTicks entfernt zugunsten /api/segments/:id/stream"
  - "Statuslabels Bereit/Wird vorbereitet/Fehlgeschlagen/Veraltet/Nicht vorbereitet direkt am Segment"
  - "Retry/Vorbereiten nur sichtbar wenn Backend (can_retry_render / Status) es erlaubt"

patterns-established:
  - "UI liest keine Tokens; Auth laeuft ausschliesslich ueber das Next-Relay"

requirements-completed:
  - "Segment-Preview ueber Segmentstream statt Release-Stream mit clientseitigem Stoppen"
  - "Renderstatus queued/rendering/ready/failed sichtbar; Speichern bei >4min deaktiviert"
  - "Segment-Aktionen ueber App-User-Capabilities, kein Rollen-Hardcode"
  - "Deutsche UI-Texte mit korrekten Umlauten; bestehender Upload-Fallback erhalten"

duration: reconciled
completed: 2026-07-05
---

# Phase 98 / Plan 04: Admin/Leader Segment-UI — Summary

**Der bestehende Segment-Editor zeigt jetzt den Renderstatus, spielt Segmente ueber den serverseitig begrenzten `/api/segments/:id/stream`-Clip ab und ersetzt den frueheren Release-Stream mit clientseitigem Stoppen — Upload-Fallbacks und Capability-Gating bleiben erhalten.**

> **Reconciliation-Hinweis:** Als uncommittete Vorarbeit vorgefunden; beim Recovery-Reconciliation am 2026-07-05 als `feat(phase-98): wire segment render status into admin editor` (`04f74f29`) committet und gegen `tsc --noEmit` (gruen) verifiziert.

## Accomplishments
- `SegmenteTab.tsx`: Preview-URL auf `/api/segments/${id}/stream` umgestellt, `startTimeTicks`-Pfad entfernt
- Renderstatus-Labels (`renderStatusLabel`) + scoped Fehlerhinweis; capability-gegatete "vorbereiten"-Aktion (`handleRenderSegment` → `render(id)`)
- DTO-Erweiterung in `types/admin.ts` (`render_status`, `render_error_message`, `render_duration_seconds`, `can_retry_render`, `AdminThemeSegmentRenderCache`)
- Preview-Zustaende ready/queued/rendering/failed ohne kaputten Player; Upload-Fallback klar als Quelle

## Task Commits
- Admin-Editor Renderstatus + Preview-Umbau — `04f74f29`

## Deviations from Plan
None — UI folgt den geplanten Statuslabels und Capability-Feldern.

## Verification
- `tsc --noEmit` → PASS
- Playwright-/Live-UAT im Segment-Editor: Teil von Plan 98-05

## Next Phase Readiness
UI steht; E2E/UAT (98-05) verifiziert Live-Playback inkl. Kara/ASS und Sicherheitsgrenzen.

---
*Phase: 98-segmentstream-serverseitig-begrenzter-hls-jellyfin-playback*
*Completed: 2026-07-05 (reconciled)*
