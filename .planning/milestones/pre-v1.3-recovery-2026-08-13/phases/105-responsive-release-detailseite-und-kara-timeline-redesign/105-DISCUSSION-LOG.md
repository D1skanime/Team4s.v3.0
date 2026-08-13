# Phase 105: Responsive Release-Detailseite und Kara-Timeline-Redesign - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-19
**Phase:** 105-responsive-release-detailseite-und-kara-timeline-redesign
**Areas discussed:** Seitendramaturgie, Desktop-Timeline, Tablet-Timeline, Mobile-Karas, Bilder und Texte, Rechtezustände, Hero und Navigation

---

## Position der Kara-Sektion

| Option | Description | Selected |
|--------|-------------|----------|
| Nach Hero | Karas sind der erste Inhaltsblock der Release-Seite. | ✓ |
| Nach Bildern und Texten | Bestehende Reihenfolge bleibt erhalten. | |
| Nur über Sprungnavigation | Kara-Bereich bleibt weiter unten und wird verlinkt. | |

**User's choice:** Direkt nach dem Hero.
**Notes:** Die aktuelle Position wurde auf allen Breakpoints als zu spät und die Kara-Funktion als zu versteckt bewertet.

---

## Desktop-Timeline

| Option | Description | Selected |
|--------|-------------|----------|
| Episodenweite Timeline mit Karten | Volle Breite, echte Zeitachse, Type-Farben, Segmentkarten und Inline-Player. | ✓ |
| Aktuelle Pillenleiste polieren | Struktur bleibt, nur Farben und Abstände ändern. | |
| Nur Segmentkarten | Timeline vollständig entfernen. | |

**User's choice:** Ausgebaute episodenweite Timeline.
**Notes:** Die aktuelle beige Spur, die kleinen runden Marker, die schmale Inhaltsspalte und native Buttons wurden ausdrücklich als extrem unschön bewertet.

---

## Mobile-Karas

| Option | Description | Selected |
|--------|-------------|----------|
| Vertikale Kara-Karten | Type-Farbleiste, Zeiten, Beteiligte und große Abspielaktion. | ✓ |
| Horizontale Timeline scrollen | Desktop-Zeitleiste wird horizontal scrollbar. | |
| Kleine Vorschaubilder | Miniaturbilder tragen die Segmentauswahl. | |

**User's choice:** Vertikale Kara-Karten ohne kleine unlesbare Segmentbilder.
**Notes:** Mobile braucht touchfreundliche Controls und keine zusammengedrückte Timeline.

---

## Bilder und Teamtexte

| Option | Description | Selected |
|--------|-------------|----------|
| Gemeinsames Raster und responsives Rollenlayout | Bilder mit Kategorie-/Uploader-Metadaten; Texte auf Desktop raumnutzend und auf Mobile einspaltig. | ✓ |
| Vier getrennte Bilderkapitel | Jede Kategorie erhält erneut einen eigenen Block. | |
| Unterseiten | Bilder und Texte verlassen die Release-Seite. | |

**User's choice:** Alles bleibt auf der Release-Seite; Bilder in einem gemeinsamen Raster.
**Notes:** Originalbilder bleiben anklickbar, lange Beschreibungen und Texte werden in-place gekürzt/aufgeklappt.

---

## Wiedergabezustände

| Option | Description | Selected |
|--------|-------------|----------|
| Phase-103-Vertrag bewahren | Gäste sehen Informationen ohne Aktion; eingeloggte Nutzer spielen bereite Karas ab. | ✓ |
| Login-Werbebutton für Gäste | Gäste sehen eine gesperrte Abspielaktion. | |
| Kara-Bereich für Gäste verstecken | Nur eingeloggte Nutzer sehen Segmente. | |

**User's choice:** Bestehenden Phase-103-Vertrag bewahren.
**Notes:** Episoden-Playback bleibt sekundär und nur bei vorhandenem Recht sichtbar.

---

## Hero und Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Konsistente Public-UI | Fansub-Maximalbreite, globale Primitives, Navigation im normalen Seitenfluss. | ✓ |
| Eigenständiges Release-Design | Release-Seite erhält eine abweichende Designsprache. | |
| Floating-Navigation | Vorher/Nächster schwebt über Hero oder Inhalt. | |

**User's choice:** Release-Seite folgt der bestehenden öffentlichen Fansub-/Projekt-UI.
**Notes:** Primäre Hero-Fakten bleiben sichtbar; sekundäre Details dürfen klar aufklappbar sein.

---

## the agent's Discretion

- Exakte Type-Farben innerhalb vorhandener Tokens.
- Anzahl der Zeitmarken und subtile Auswahlübergänge.
- Ob eine kompakte Abschnittsnavigation nach den Karas erhalten bleibt.

## Deferred Ideas

- Eigenständige Media-Rechte-Verwaltungsoberfläche.
- Neue Segment-Renderdiagnosen oder parallele Player-/Galerie-Seams.
