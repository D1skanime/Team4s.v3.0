# Phase 171: Kara-Segmente in Release-Media und Public Story integrieren - Context

**Gathered:** 2026-09-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Kara-Segmente werden in die bestehende release-version-scoped Media-/Story-Fachlichkeit integriert, ohne Kara zu einem Media-Asset umzubauen oder eine parallele Ownership-Struktur zu schaffen. In der bestehenden Release-Version-Media-Editseite erscheinen normale Release-Bilder und Kara in einer gemeinsamen, veränderbaren Story-Reihenfolge. Die Public Release Story rendert diese Reihenfolge mit vorhandenen Timeline-, Galerie-, Highlight- und Segment-Primitiven so, dass Kara direkt aus der Timeline angesprungen und berechtigtes Playback ausgelöst werden kann.
</domain>

<decisions>
## Implementation Decisions

### Gemeinsame Admin-Reihenfolge
- **D-01:** Normale Release-Bilder, Highlights und Kara-Segmente werden in einer gemeinsamen Reihenfolge verwaltet.
- **D-02:** Die Public Story übernimmt diese Reihenfolge exakt. Highlights bleiben an ihrer Position und behalten ihre visuelle Hervorhebung.
- **D-03:** Kara bleibt fachlich ein Theme-/Kara-Segment. Es wird nicht als `release_version_media` gespeichert und nicht an Episode oder Release-Media als Ersatzrelation angehängt.
- **D-04:** Die bestehende Release-27-Media-Editseite bleibt die UI-Grundlage; sie wird um Kara-Einträge in derselben Liste ergänzt, nicht durch eine neue parallele Oberfläche ersetzt.

### Erstellung und Admin-Darstellung
- **D-05:** Ein neu erstelltes Kara-Segment erscheint nach erfolgreicher Erstellung sofort in der gemeinsamen Media-Liste.
- **D-06:** Kara zeigt vorhandenes Preview-Material; fehlt ein Preview-Bild, wird der bestehende passende Default-/Release-Fallback verwendet.
- **D-07:** Kara erhält in der Admin-Liste Kategorie, Titel, Dauer, vorhandene Bereichs-/Folgehinweise und die relevanten Mitwirkenden-/Statusinformationen.
- **D-08:** Für Kara werden in der Admin-Media-Liste keine Play- oder Preview-Aktionen ergänzt. Die Karte dient dort der Orientierung und der gemeinsamen Reihenfolge.

### Public Story und Timeline
- **D-09:** Der separate Kara-Bereich auf der Public-Seite entfällt. Kara fließt vollständig in den bestehenden Bilder-/Story-Flow ein.
- **D-10:** Die bestehende Timeline wird nicht neu entwickelt. Sie wird nur an die neue Darstellung/Position angepasst.
- **D-11:** Die Timeline bleibt der zeitliche Einstieg oberhalb des Story-Flows. Ein Kara-Eintrag in der Timeline ist anklickbar und springt direkt zur passenden Kara-Karte im gemeinsamen Flow.
- **D-12:** Dafür erhält jede Kara-Karte einen stabilen Zielanker bzw. eine eindeutige ID; Timeline-Sprung und Kartenreihenfolge müssen dieselbe Kara-Identität verwenden.
- **D-13:** Normale Bilder behalten das bestehende Galerie-Verhalten. Highlights bleiben normale Story-Einträge mit zusätzlicher Hervorhebung; es wird kein zweiter separater Highlight-Feed eingeführt.

### Playback und Berechtigungen
- **D-14:** Das Play-Symbol auf Kara-Karten ist für alle Besucher sichtbar.
- **D-15:** Playback wird nicht allein durch die Sichtbarkeit des Symbols gewährt. Die bestehende Authentifizierungs-/Berechtigungslogik entscheidet beim Start:
  - nicht angemeldet: Login-Hinweis,
  - angemeldet, aber nicht berechtigt: Berechtigungshinweis,
  - angemeldet und berechtigt: Kara wird abgespielt.
- **D-16:** Protected UI und Playback nutzen die zentrale Auth-/API-Grenze; UI-Sichtbarkeit ersetzt keine Backend-Prüfung.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architektur und Verträge
- `AGENTS.md` — Team4s-Domain-, API-, Auth-, UI- und Arbeitsregeln.
- `docs/architecture/db-schema-fansub-domain.md` — kanonische Ownership-Grenzen für Anime, Episoden, Releases, Release-Versionen und Release-Medien.
- `docs/engineering/implementation-contract.md` — Wiederverwendung bestehender Seams und Contract-Synchronisation.
- `docs/api/api-contracts.md` — OpenAPI-/DTO-/Frontend-Vertragsworkflow.
- `docs/frontend/auth-api-client.md` — zentrale Session-Refresh- und Protected-UI-Grenze.

### Vorherige Release-Media-Entscheidungen
- `.planning/phases/169-release-medienrechte-projektleiter-preview-highlights-und-bi/169-CONTEXT.md` — Preview-, Highlight-, Reihenfolge- und projektbezogene Rechteentscheidungen.
- `.planning/ROADMAP.md` — Phase 170-Stabilisierungen und aktuelle Phase-171-Grenze.

### Bestehende Admin- und Kara-Seams
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGallery.tsx` — bestehende Media-Galerie und Karten-/Aktionsstruktur.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx` — Media-Edit-Integration, Mutationen und Reload-Verhalten.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts` — bestehender Media-Read-/Mutation-Hook.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGallery.module.css` — bestehende Media-Darstellung.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.module.css` — bestehende Abschnitts- und Responsive-Regeln.
- `backend/internal/handlers/admin_content_anime_theme_segments.go` — vorhandener Kara-/Theme-Segment-Adminpfad.
- `backend/internal/repository/theme_segment_assignments.go` — vorhandene Segment-Zuordnung.
- `backend/internal/repository/theme_segment_playback_resolution.go` — vorhandene Playback-Auflösung.
- `backend/internal/handlers/admin_content_anime_theme_segment_origin.go` — vorhandene Herkunfts-/Ownership-Logik.

### Design- und Sketch-Referenzen
- `.planning/sketches/MANIFEST.md` — Release-Story- und Admin-Order-Richtung.
- `.planning/sketches/008-public-release-story/index.html` — bestätigte Public-Story-Darstellung und Timeline-Sprungidee.
- `.planning/sketches/009-admin-release-story-order/index.html` — bestätigte Admin-Darstellung der gemeinsamen Media-/Kara-Liste.
- `.planning/sketches/008-public-release-story/README.md` — Sketch-Annahmen und Testdaten.
- `.planning/sketches/009-admin-release-story-order/README.md` — Sketch-Annahmen und Testdaten.
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Die bestehende `ReleaseVersionMediaGallery` und `useReleaseVersionMedia` bilden den kanonischen Release-Media-Read-/Mutationspfad.
- Die vorhandenen Theme-Segment-Handler, Repositories und Playback-Resolution-Seams bleiben die Grundlage für Kara; ein neuer paralleler Segmentpfad ist nicht vorgesehen.
- Die bestehende Public-Release-Story-Timeline und Galerie sollen verschoben bzw. erweitert werden, nicht als neue Timeline-/Galerie-Komponenten dupliziert werden.

### Established Patterns
- Backend-Handler, Repository und Services sind explizit verdrahtet; neue Verträge müssen OpenAPI, DTOs, Frontend-Typen und `api.ts` synchron halten.
- Release-Media-Reihenfolge, Preview und Highlights haben getrennte Rechte-/Contract-Semantik aus Phase 169.
- Authentifizierte Aktionen laufen über den zentralen API-Client mit Refresh-Unterstützung; UI-Gates sind Komfort und keine Autorisierung.

### Integration Points
- Release-Version-Media-Adminseite und bestehender Kara-Edit-/Segmentpfad.
- Gemeinsame Reihenfolge-/Reorder-API und deren OpenAPI-/Frontend-Verträge.
- Public Release-Story-Route, Timeline, Galerie und Kara-Playback-Resolver.
- Preview-/Default-Fallback-Auflösung für Kara-Karten.
</code_context>

<specifics>
## Specific Ideas

- Die Karten sollen visuell in den bestehenden Release-Flow passen; Kara-Karten verwenden die vorhandenen Kategorie-Farben und das Preview-/Fallback-Bild.
- Die Timeline soll wie im Sketch als Einstieg funktionieren: Klick auf einen Kara-Timeline-Eintrag springt direkt zur entsprechenden Kara-Karte.
- Der frühere separate Kara-Abschnitt auf der Public-Seite soll nicht sichtbar bleiben; Kara wird wie ein weiterer Story-Eintrag behandelt.
- Die echte Release-27-Media-Editseite ist die Referenz und soll nicht durch ein komplett neues Admin-Layout ersetzt werden.
</specifics>

<deferred>
## Deferred Ideas

Keine — die Diskussion blieb innerhalb der Phase.
</deferred>

---

*Phase: 171-Kara-Segmente in Release-Media und Public Story integrieren*
*Context gathered: 2026-09-30*
