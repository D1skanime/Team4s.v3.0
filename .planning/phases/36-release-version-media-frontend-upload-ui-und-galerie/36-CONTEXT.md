# Phase 36: Release-Version Media — Frontend Upload UI und Galerie — Context

**Gathered:** 2026-05-07
**Status:** Ready for planning (after Phase 35 complete)
**Source:** User discussion

<domain>
## Phase Boundary

Media/Assets-Bereich im Fansub-Edit-Workflow. Kein neuer Admin-Bereich — Erweiterung des bestehenden Fansub-Workflows.

</domain>

<decisions>
## Implementation Decisions

### Navigation-Flow (LOCKED)

```
/admin/fansubs/88/edit
  └── Tab: Anime & Releases
        └── Episode anklicken → Versionen erscheinen
              └── [Detail] auf einer Version
                    └── Version-Detail-Ansicht
                          └── Bereich: Media / Assets
```

Der "Detail"-Klick auf eine Version öffnet eine detaillierte Ansicht dieser Release-Version. Dort ist der Media/Assets-Bereich eingebettet.

### Wo lebt der Version-Detail-View? (OFFEN — in Phase 36 zu entscheiden)

Optionen:
- A) Erweiterung des bestehenden Release-Side-Drawers (Drawer wird zu einem Version-Detail-Drawer mit Sub-Tabs: Theme | Media)
- B) Ein eigener Sub-Screen der innerhalb des Drawers navigiert (Drawer-Stack)
- C) Neue Seite `/admin/release-versions/[versionId]/` (separate Route)

**Empfehlung für Phase 36:** Option A — den bestehenden Phase-32-Drawer um einen zweiten Tab "Media" erweitern. Fansubber kennen bereits den Drawer aus Phase 32 (Theme-Assets). Minimale UI-Änderung, maximale Kohärenz.

**Muss in Phase 36 mit dem User bestätigt werden.**

### Upload-Flow (LOCKED)

1. Kategorie-Dropdown zuerst (screenshot / Typesetting-Karaoke / Spaßbild / Sonstiges)
2. Datei-Auswahl oder Drag & Drop (mehrere Dateien erlaubt)
3. Upload-Button
4. Pro Datei: Fortschritt, Status, Retry bei Fehler

### Preview-Schalter (LOCKED)
- Nur sichtbar/aktiv bei screenshot und typesetting_karaoke
- Bei fun_outtake und other ausgeblendet oder deaktiviert

### Galerie (LOCKED)
Nach Upload: Thumbnail-Galerie, Klick → Original.
Inline editierbar: Caption, Sortierung, Preview-Flag, Delete.

### Authentifizierung (LOCKED)
Vorerst Admin-only. Kein Fansub-Member-Berechtigungscheck in Phase 36.
`uploaded_by_user_id` = Admin-Session-User-ID aus Phase 35.

### Fehlerbehandlung (LOCKED)
Backend-Fehlercodes werden verständlich angezeigt.
Keine Business-Regeln ausschliesslich im Frontend erzwingen.

### Claude's Discretion
- Genaue Drawer-Implementierung (Tab vs. Sub-Screen)
- CSS-Module oder Inline-Styles (bestehendes Projekt-Muster verwenden)
- Drag-and-Drop-Implementierung (vorhandene Komponenten prüfen, sonst native HTML5)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Bestehender Fansub-Edit-Drawer (Phase 32 Baseline)
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` — Fansub-Edit-Seite mit Anime & Releases Tab
- `backend/internal/handlers/admin_content_release_theme_assets.go` — Theme-Asset-Handler (Pattern-Referenz für Phase 35/36)

### Bestehende Upload-Komponenten
- `frontend/src/components/` — nach Upload-Komponenten suchen die wiederverwendbar sind

</canonical_refs>

<deferred>
## Deferred Ideas

- Fansub-Member-Upload ohne Admin-Rechte (spätere Phase)
- Responsive Varianten / WebP-Konvertierung der Thumbnails
- Quotas pro Nutzer/Gruppe
- Reorder via Drag & Drop (vorerst manuelle Sortierreihenfolge via Eingabefeld oder Buttons)

</deferred>

---

*Phase: 36-release-version-media-frontend-upload-ui-und-galerie*
*Context gathered: 2026-05-07 via User Discussion*
