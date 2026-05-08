# Phase 36: Release-Version Media - Frontend Upload UI und Galerie - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Frontend-Oberfläche für Release-Version-Media im bestehenden Admin-Produktfluss: kompakter Einstieg im Fansub-Release-Drawer und vollständige Upload-/Verwaltungsansicht im bestehenden Episode-Version-Editor. Kein neuer separater Admin-Bereich und keine doppelte Upload-/Galerie-Implementierung.

</domain>

<decisions>
## Implementation Decisions

### Einstieg und Navigationsfluss
- **D-01:** Der bestehende Fansub-Release-Drawer in `/admin/fansubs/[id]/edit` bleibt der primäre Einstiegspunkt für Release-Version-Media im Gruppen-/Fansub-Kontext.
- **D-02:** Der Drawer ist bewusst **nicht** die Vollverwaltung. Er zeigt nur kompakte Übersicht, Mini-Vorschau und einen klaren Einstieg `Media verwalten`.
- **D-03:** Die vollständige Arbeitsfläche für Upload, Galerie und Bearbeitung lebt im bestehenden Episode-Version-Editor unter `/admin/episode-versions/[versionId]/edit/`.
- **D-04:** Der Editor muss den Fansub-/Release-Kontext sichtbar mittragen, damit der Sprung aus dem Fansub-Drawer nicht wie ein global entkoppelter Admin-Screen wirkt.

### Wiederverwendung und UI-Architektur
- **D-05:** Upload-, Galerie-, Fehler- und Mutationslogik werden nur einmal gebaut und als wiederverwendbare Release-Version-Media-Sektion strukturiert.
- **D-06:** Drawer und Episode-Version-Editor sind zwei Host-Oberflächen für denselben inneren Media-Baustein; es darf kein zweiter paralleler Upload-Codepfad entstehen.

### Große Verwaltungsansicht
- **D-07:** Die vollständige Media-Verwaltung im Episode-Version-Editor wird in drei klar getrennte Bereiche geschnitten:
  - Kontextkarte
  - Upload-Card
  - Galerie-/Verwaltungsfläche
- **D-08:** Die Galerie wird nicht über Kategorie-Tabs organisiert, sondern als untereinander angeordnete Kategorien-Abschnitte.
- **D-09:** Kategorien bleiben getrennt sichtbar: `Release-Screenshot`, `Typesetting-/Karaoke-Beispiel`, `Spaßbild / Outtake`, `Sonstiges`.

### Bearbeitung und Feedback
- **D-10:** Bildbearbeitung erfolgt nicht direkt voll inline auf jeder Karte; die Kartenansicht bleibt kompakt und öffnet für Bearbeitung eine Detailfläche bzw. ein kleines Panel.
- **D-11:** Uploads werden erst sichtbar, wenn das Backend den Asset-Zustand bestätigt hat (`ready` per Antwort/Refetch). Kein optimistisches Sofort-Einblenden vor bestätigtem Serverzustand.

### the agent's Discretion
- Konkrete Ausgestaltung der kompakten Drawer-Zusammenfassung: Counts, Preview-Status, leere Zustände und Mini-Thumbnails.
- Ob die Detailbearbeitung pro Asset als Inline-Expander, Side-Panel innerhalb der Seite oder kompakte Formularfläche unter der Galerie umgesetzt wird.
- Ob Kategorie-Abschnitte als einfache Cards, Accordions oder flache Section-Container dargestellt werden, solange alle Kategorien gleichzeitig auffindbar bleiben.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Produkt- und Phasenquellen
- `.planning/ROADMAP.md` - Phase-36-Scope, Abhängigkeiten und Success Criteria.
- `.planning/phases/36-release-version-media-frontend-upload-ui-und-galerie/36-01-PLAN.md` - bestehender Planentwurf für Media-Tab und Foundations; nach diesem Context zu revalidieren.
- `.planning/phases/36-release-version-media-frontend-upload-ui-und-galerie/36-02-PLAN.md` - bestehender Planentwurf für Upload-Flow; nach diesem Context zu revalidieren.
- `.planning/phases/36-release-version-media-frontend-upload-ui-und-galerie/36-03-PLAN.md` - bestehender Planentwurf für Galerie und Bearbeitung; nach diesem Context zu revalidieren.
- `.planning/phases/36-release-version-media-frontend-upload-ui-und-galerie/36-04-PLAN.md` - bestehender Planentwurf für Frontend-Verifikation; nach diesem Context zu revalidieren.

### Domain-Regeln
- `docs/architecture/db-schema-fansub-domain.md` - fachliche Source of Truth für Fansub-, Release- und Release-Version-Zuordnung; Release-Version-Media darf nicht an Episode oder allgemeines Release gehängt werden.

### Bestehende Frontend-Hosts
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` - bestehender Fansub-Edit-Flow mit Release-Drawer; primärer Einstieg für Phase 36.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx` - bestehender Episode-Version-Editor; Host der vollständigen Media-Verwaltungsansicht.

### Bestehende Release-/Theme-Patterns
- `backend/internal/handlers/admin_content_release_theme_assets.go` - bestehender release-spezifischer Asset-Handler als Pattern-Referenz für UI-Verhalten und Rückmeldungen.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx`: vorhandener Release-Drawer mit Tab-Struktur, Kontextdarstellung und Release-spezifischem Einstieg.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx`: bestehender Editor mit Tab-Navigation und genügend Fläche für eine vollständige Media-Sektion.
- `backend/internal/handlers/admin_content_release_theme_assets.go`: existierendes release-spezifisches Asset-Muster, das zeigt, wie gruppen-/release-nahe Medien im Admin bereits bedient werden.

### Established Patterns
- Fansub-nahe Release-Arbeit startet auf `/admin/fansubs/[id]/edit` und nutzt dort Drawer/Detail-Einstiege statt globaler Listen.
- Der Episode-Version-Editor ist die bereits etablierte größere Arbeitsfläche für release-version-nahe Pflege mit mehreren Tabs.
- Release-spezifische Medien und Theme-Assets wurden in früheren Phasen bewusst nicht an Episode oder Fansub-Gruppe allgemein angehängt; Phase 36 muss diese Trennung auch im UI sichtbar respektieren.

### Integration Points
- Der Drawer braucht eine kompakte Summary-Komponente für Counts, Preview-Status und Mini-Thumbnails plus klaren Link in den Episode-Version-Editor.
- Der Episode-Version-Editor braucht eine neue vollständige Media-Sektion bzw. einen Media-Tab als Host für Upload, Galerie und Detailbearbeitung.
- Beide Hosts sollen denselben inneren Frontend-Baustein für Datenladen, Fehlerdarstellung und Mutationen wiederverwenden.

</code_context>

<specifics>
## Specific Ideas

- Der Nutzer erwartet, dass viele Bilder pro Kategorie möglich sind; ein enger Drawer wird bei mehreren Kategorien, dutzenden Uploads und zusätzlichen Bildbeschreibungen schnell unübersichtlich.
- Der Drawer soll deshalb eher den Zustand der Release-Version zeigen als die vollständige Asset-Pflege aufnehmen.
- Die vollständige Verwaltungsansicht soll mehrere Kategorien gleichzeitig sichtbar machen statt per Tabs zu verstecken.

</specifics>

<deferred>
## Deferred Ideas

- Eine eigenständige dedizierte Route wie `/admin/release-versions/[versionId]/media` wurde nicht gewählt; der bestehende Episode-Version-Editor bleibt die große Host-Fläche.
- Vollständige Asset-Verwaltung direkt im Drawer wurde bewusst verworfen, weil sie bei mehreren Kategorien und vielen Bildern unübersichtlich würde.

</deferred>

---

*Phase: 36-release-version-media-frontend-upload-ui-und-galerie*
*Context gathered: 2026-05-08*
