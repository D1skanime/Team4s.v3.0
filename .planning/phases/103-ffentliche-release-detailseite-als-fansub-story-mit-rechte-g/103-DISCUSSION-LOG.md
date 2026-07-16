# Phase 103: Öffentliche Release-Detailseite - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-16
**Phase:** 103-ffentliche-release-detailseite-als-fansub-story-mit-rechte-g
**Areas discussed:** Seitendramaturgie, große Bild- und Textmengen, technische Release-Daten, Kara-Timeline, Episodenwiedergabe, Rechtehierarchie, Release-Navigation

---

## Seitendramaturgie

| Option | Description | Selected |
|--------|-------------|----------|
| Release-Story | Bilder, Texte und Karas dominieren; Episode ist Zusatzfunktion | ✓ |
| Player im Mittelpunkt | Videoplayer dominiert den Hero | |
| Dynamischer Hero | Hero wechselt abhängig von Wiedergaberecht | |

**User's choice:** Release-Story mit nicht zentraler Episodenwiedergabe.
**Notes:** Die Seite dokumentiert exakt eine Release-Version. Sie soll sich an globalem UI-System, Public-Fansubseite und Fansub-Projektseite orientieren.

## Bilder und Texte

| Option | Description | Selected |
|--------|-------------|----------|
| Kategorie-Kapitel | Vier Bildkategorien mit In-Page-Aufklappen | ✓ |
| Gesamtgalerie | Ein gemeinsames Raster mit Filtern | |
| Gemischter Feed | Bilder und Texte chronologisch mischen | |

**User's choice:** Vier Kategorie-Kapitel; Texte separat nach Rollen gruppiert.
**Notes:** Keine Bilder-/Text-Unterseiten. Responsive Initialmengen sind 6/4/2. Jedes Bild und jeder Text zeigt eindeutige Urheberschaft.

## Technische Release-Daten

| Option | Description | Selected |
|--------|-------------|----------|
| Teilweise aufklappbar | Basisdaten sichtbar, Technik verborgen | |
| Alles sichtbar | Vollständige Technikdaten direkt im Kopf | ✓ |
| Eigener Technikabschnitt | Technik als separate Karte | |

**User's choice:** Alle Daten direkt sichtbar; ASS-Spuren einzeln benennen.
**Notes:** Episode, Fansubgruppe, Folgen-/Release-Name, Version, Datum, Dauer, Auflösung, Codecs, Audio und Untertitel gehören in die direkte Übersicht.

## Kara-Timeline

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontale Episodenleiste | Ganze Laufzeit mit anklickbaren Segmentmarken | ✓ |
| Vertikale Timeline | Segmente chronologisch untereinander | |
| Leiste plus alle Karten | Leiste und dauerhafte große Karten | |

**User's choice:** Ausgebaute horizontale Episodenleiste mit großer Detailfläche darunter.
**Notes:** Gäste sehen keine Play-Aktion. Eingeloggte Nutzer starten per Segmentklick sofort. Nicht verfügbare Segmente bleiben sichtbar.

## Vollständige Episode

| Option | Description | Selected |
|--------|-------------|----------|
| Inline-Player | Player klappt unter dem Hero auf | |
| Player-Dialog | Großer fokussierter Dialog | ✓ |
| Eigene Player-Route | Separate Wiedergabeseite | |

**User's choice:** Sekundärer Button bei Technikdaten; Wiedergabe im Dialog.
**Notes:** Ohne effektives Recht oder technische Verfügbarkeit wird die Aktion vollständig ausgeblendet.

## Rechtehierarchie

| Option | Description | Selected |
|--------|-------------|----------|
| Projektstandard + Release-Override | Projektweit mit gezielten Ausnahmen | ✓ |
| Nur Release-Version | Jede Version einzeln pflegen | teilweise |
| Nur projektweit | Keine feinen Ausnahmen | |

**User's choice:** Mischung mit globalen, Gruppen-, Projekt- und Release-Scopes; rollen- und userbasierte Zuweisung.
**Notes:** Die spezifischste Regel gewinnt. Episode ist kein Scope. Vollständiges Media-Rechtemanagement wird als Folgephase geführt.

## Release-Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Nächste Episode derselben Gruppe | Gruppentreu im Fansub-Projekt | ✓ |
| Chronologisch nächster Release | Nach Release-Datum | |
| Listenreihenfolge | Abhängig vom Einstiegskontext | |

**User's choice:** Nächste Episode derselben Gruppe; gleiche Versionsnummer bevorzugen, sonst Standardversion.
**Notes:** Kooperationen bleiben im aktuellen Gruppenkontext und werden im Kopf genannt.

## the agent's Discretion

- Detailausgestaltung innerhalb der bestehenden Public-Fansub-UI-Sprache.
- Technische Umsetzung von Nachladen, Dialog und responsiver Anordnung.

## Deferred Ideas

- Eigenständige Media-Rechte-Verwaltungsoberfläche mit Scope-Vererbung, Rollen-/User-Grants, Massenvergabe und Ausnahmen.
