# Phase 160: Öffentliche Anime-Detailseite nachschärfen - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-16
**Phase:** 160-oeffentliche-anime-detailseite-nachschaerfen-tags-anzeigen-g
**Areas discussed:** Suchziel ohne Suchbegriff, Position und Trennlinie, Überschrift und Beschriftung (inkl. Mehrsprachigkeit), Reihenfolge und viele Tags (inkl. Genres)

---

## Suchziel ohne Suchbegriff

| Option | Description | Selected |
|--------|-------------|----------|
| Nur-Filter-Suche erlauben | Suche läuft ohne q, wenn tag gesetzt ist | ✓ |
| Workaround mit q=Tagname | Kein Backend-Umbau, Suchfeld zeigt Tag als Begriff | |

| Option | Description | Selected |
|--------|-------------|----------|
| Nur tag | Andere Filter unverändert | ✓ (später um genre erweitert) |
| Alle bestehenden Filter | Einheitlich, mehr Prüfaufwand | |

| Option | Description | Selected |
|--------|-------------|----------|
| Ja, type=anime | Anime-Tab direkt | ✓ |
| Nein, Standard „alle“ | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Wie bestehender Filter | Vorbelegtes Tag-Feld | ✓ |
| Zusätzlicher entfernbarer Hinweis | Neue UI | |

**User's choice:** Nur-Filter-Suche für tag, type=anime, bestehende Filteranzeige.

---

## Position und Trennlinie

| Option | Description | Selected |
|--------|-------------|----------|
| Beschreibung → Tags → Linie → Banner | Löst Entscheidung 15.09. ab | ✓ |
| Beschreibung → Linie → Tags → Banner | Entscheidung 15.09. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Emby-Link nach den Tags | | |
| Emby-Link vor den Tags | | |

**User's choice (Emby):** Freitext „welcher Emby-Link? da gibt es doch gar keinen Emby-Link“.
**Notes:** Geprüft: Emby-Link nur über fest eingetragene Test-Zuordnung in `frontend/src/lib/emby.ts`, im aktuellen Bestand nicht sichtbar. Als Randnotiz im CONTEXT.

| Option | Description | Selected |
|--------|-------------|----------|
| Ohne Banner: nur Abstand | Linie bleibt an Banner gebunden | ✓ |
| Immer Linie nach Tags | | |

---

## Überschrift und Beschriftung

| Option | Description | Selected |
|--------|-------------|----------|
| Tags | Gleicher Begriff wie Suchfilter | ✓ |
| Schlagwörter | | |
| Keine Überschrift | | |

| Option | Description | Selected |
|--------|-------------|----------|
| So wie gespeichert | | |
| Übersetzen | Bräuchte Übersetzungstabelle | ✓ (Freitext) |

**Notes:** Freitext: „in Zukunft sollen weitere Sprachen hinzukommen, darum muss die DB für Tags mehrere Sprachen hinterlegen können, jetzt mal Deutsch“.

| Option | Description | Selected |
|--------|-------------|----------|
| Nur Tag-Name, Liste mit Überschrift | | ✓ |
| Ausführlicher Linktext | aria-label „Anime mit Tag … suchen“ | |

### Folgefragen Mehrsprachigkeit

| Frage | Optionen | Auswahl |
|-------|----------|---------|
| Umfang | Eigener Teilschritt davor / In diesen Teilschritt / Anzeige jetzt, Sprachen später | Eigener Teilschritt davor |
| Datenmodell | Wie Anime-Titel über languages / Feste Spalten je Sprache | Wie Anime-Titel über languages |
| Bestand | Als Ausgangsname behalten, Deutsch ergänzen / Einmalig Sprache zuordnen | Ausgangsname behalten |
| Suche | Angezeigter Name, Treffer über alle Sprachen / Stabile Tag-ID | Angezeigter Name, alle Sprachen |
| Pflegeort | Neue Admin-Seite „Tags“ / Im Anime-Editor | Neue Admin-Seite |
| Import | Nur Grundname wie bisher / Automatisch als Deutsch | Nur Grundname |
| Anzeige | Deutsch, sonst Grundname / Nur Tags mit deutschem Namen | Deutsch, sonst Grundname |

---

## Reihenfolge und viele Tags

| Frage | Optionen | Auswahl |
|-------|----------|---------|
| Reihenfolge | Alphabetisch nach angezeigtem Namen / Wie gespeichert | Alphabetisch |
| Viele Tags | Alle anzeigen, umbrechen / Ab 12 einklappen | Alle anzeigen |
| Genres | Unverändert lassen / Genres ebenfalls verlinken | Genres ebenfalls verlinken |
| Genre-Suche | Nur-Filter-Suche für tag und genre / Alle Filter | tag und genre |
| Genre-Sprachen | Nein, nur Tags / Ja, gleiches Modell | Ja, gleiches Modell |
| Genre-Stil | Heutiger Chip-Stil + Hover/Fokus / Gleich wie Tags | Heutiger Chip-Stil + Hover/Fokus |

---

## Claude's Discretion

- Ergebnis-Sortierung ohne Suchbegriff; Verhalten von type=alle/fansub bei reiner Filtersuche.
- Platzhalter-Chip „Anime“ nicht verlinken.
- Tabellen-/Spaltennamen, Constraints, API-Form der Sprachnamen; Admin-Menüplatzierung.

## Deferred Ideas

- Sprachumschalter / weitere Sprachen öffentlich.
- Nur-Filter-Suche für Format/Status/Jahre/Fansubgruppe.
- Übrige Phase-160-Themen (Gruppen, Coop, Episoden) — nächster Discuss-Schritt.
- 5 Todo-Stichworttreffer geprüft, keiner übernommen.
