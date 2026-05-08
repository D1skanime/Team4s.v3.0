# Phase 38: Release-Version Media — Gallery UX: Hover-Preview und Drag-and-Drop-Reorder — Context

**Gathered:** 2026-05-08
**Status:** Ready for planning
**Source:** User discussion + codebase analysis

<domain>
## Phase Boundary

Diese Phase verbessert die bestehende Galerie-UX im Release-Version-Media-Editor (Phase 36). Kein neues Backend-Schema, keine neuen API-Endpunkte — nur Frontend-UX-Verbesserungen auf dem bereits vorhandenen Backend.

Liefert:
- Floating Preview Card beim Hover über Galerie-Karten (grosses Bild + Caption)
- Animated GIF src-swap beim Hover (thumbnail_url → original_url)
- Drag-and-Drop-Reorder innerhalb einer Kategorie (ersetzt das sort_order-Zahlenfeld)
- Live-Re-Sort-Bug-Fix: nach `patchItem` wird die `items`-Liste sofort neu sortiert

</domain>

<decisions>
## Implementation Decisions

### D-01: Hover-Preview — Floating Preview Card (Option A)
- Beim Hover über eine Galerie-Karte erscheint eine Floating Preview Card
- Inhalt: grosses Bild (aus thumbnail_url / original_url) + Caption-Text
- Keine Edit-Controls in der Preview Card — rein read-only (Phase 38)
- Positionierung: floating neben der Karte, nicht als Modal/Overlay
- Bevorzugte Implementierung: Radix UI HoverCard oder floating-ui (was im Projekt bereits vorhanden ist oder minimal zu ergänzen ist)
- Kein click-to-open nötig — Hover reicht aus

### D-02: GIF Animation via src-Swap
- Galerie-Karten zeigen standardmäßig `thumbnail_url` (statisches JPEG, Frame 0)
- Bei `mouseenter`: src wechselt zu `original_url` (animated GIF)
- Bei `mouseleave`: src wechselt zurück zu `thumbnail_url`
- Nur für GIF-Items relevant (wenn original_url auf .gif endet oder mime_type = image/gif)
- Für nicht-GIF-Items: keine src-Änderung, Hover-Preview zeigt weiterhin thumbnail_url

### D-03: Drag-and-Drop-Reorder ersetzt sort_order-Zahlenfeld
- Das sort_order-Zahlenfeld (Input) wird aus der Detail-Panel entfernt
- Neu: Drag-and-Drop innerhalb einer Kategorie zum Umsortieren
- Nach Drop: PATCH /media/{id} mit neuem sort_order ODER POST /reorder (bestehender Endpunkt)
- Reorder bleibt category-scoped: Bilder können nicht zwischen Kategorien gezogen werden
- Visuelles Feedback während Drag (Ghost-Element, Zielposition-Indikator)
- Bevorzugte Library: @hello-pangea/dnd oder dnd-kit (was in Next.js-Projekten verbreitet ist; prüfe package.json zuerst)

### D-04: Live-Re-Sort-Bug-Fix
- Bug: `patchItem` in `useReleaseVersionMedia.ts` aktualisiert sort_order im Item-Objekt, sortiert aber die `items`-Liste nicht neu
- Fix: Nach `setItems(current.map(...))` sofort neu sortieren:
  ```ts
  setItems(prev => prev
    .map(i => i.id === id ? { ...i, ...patch } : i)
    .sort((a, b) => a.sort_order - b.sort_order)
  );
  ```
- Alternativ: `reload()` aufrufen nach sort_order-Patch — aber direktes Re-Sort ist responsiver

### D-05: Hover Preview ist read-only in Phase 38
- Die Preview Card zeigt keine Edit-Controls
- Edit-Controls bleiben im Detail-Panel (bereits in Phase 36 gebaut)
- Ein späteres Phase kann Edit-in-Hover ergänzen

### D-06: Thumbnail-Grösse passt für Preview Card
- Thumbnails sind bereits 400px breit (proportional, Höhe auto) — direkt nutzbar in der Preview Card
- Kein zusätzliches Resizing oder neue Bildvariante nötig
- Preview Card kann thumbnail_url direkt als `<img src>` verwenden

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Bestehende Implementierung (Phase 36)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts` — `patchItem`, `setItems`, `reload()` Logik
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaDetailPanel.tsx` — Detail-Panel mit sort_order Input (wird in Phase 38 entfernt)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx` — Editor-Shell, Media-Tab Integration
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaDrawerSummary.tsx` — Drawer-Zusammenfassung (nicht in Phase 38 betroffen)

### Backend (unveränderlich in Phase 38)
- `backend/internal/handlers/admin_content_release_version_media.go` — PATCH und POST /reorder Endpunkte bereits vorhanden
- `backend/internal/repository/release_version_media_repository.go` — Reorder-Repository-Methode

### Paket-Inventar
- `frontend/package.json` — prüfe auf dnd-kit / @hello-pangea/dnd / @radix-ui/react-hover-card vor Installation neuer Pakete

</canonical_refs>

<specifics>
## Specific Implementation Notes

- GIF-Erkennung: prüfe `item.original_url` auf `.gif`-Endung oder `item.mime_type === 'image/gif'`
- Hover-Preview-Delay: ~200ms Debounce empfohlen, damit schnelles Durchfahren keine Flicker erzeugt
- Drag-and-Drop muss mit Touch-Events kompatibel sein (zukünftige Mobile-Unterstützung)
- sort_order nach Drop: Gaps von 10 beibehalten (bestehende Backend-Logik)
- Reorder-Scope: kategorie-übergreifendes Drag ist gesperrt (Backend-Constraint bleibt, Frontend verhindert es zusätzlich)

</specifics>

<deferred>
## Deferred Ideas

- Edit-Controls im Hover-Preview (Caption-Edit direkt in Card) — spätere Phase
- Keyboard-Navigation durch Galerie (Pfeiltasten) — spätere Phase
- Zoom/Lightbox beim Klick auf Preview Card — spätere Phase
- Cross-Category Drag (mit Kategorie-Wechsel über PATCH) — spätere Phase
- Touch-optimierte Drag-Handles für Mobile — spätere Phase

</deferred>

---

*Phase: 38-release-version-media-gallery-ux-hover-preview-und-drag-and-drop-reorder*
*Context gathered: 2026-05-08 via User Discussion*
