# Phase 119: Sammlungskarten fuer Fortschritt, Punkte, Beitraege, Mitgliedschaft und besondere Auszeichnungen - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-03
**Phase:** 119-sammlungskarten-f-r-fortschritt-punkte-beitr-ge-mitgliedscha
**Areas discussed:** Aufteilung der Sammlungskarten, Hauptmotiv und Stufenleiste, Noch nicht erreichte Badges, Aufbau der Profilseite

---

## Aufteilung der Sammlungskarten

| Decision | Alternatives considered | Selected |
|----------|-------------------------|----------|
| Fortschritt | Eine Serie / vier Einzelkarten / Einstieg separat | Eine Serie |
| Beitraege | Drei Familien / eine gemeinsame Karte / einzelne Medaillen | Drei Familien |
| Punkte | Eine Serie / zwei Serien / nur aktueller Badge | Eine Serie |
| Mitgliedschaft | Eine Serie / Gruendung separat / alle einzeln | Eine Serie |
| Besondere | je erhaltene Einzelkarte / gemeinsame Karte / kompakte Medaillen | je erhaltene Einzelkarte |
| Erweiterung | anhaengen / feste Stufen / spaeter splitten | anhaengen |
| Duplikate | kanonisch einmal / mehrfach / sekundaerer Verweis | kanonisch einmal |
| Gruendungsmitglied | Startstufe / Zusatz neben Zeitlinie / hoechste Stufe | Startstufe |

**User's choice:** Durchgehend die jeweils empfohlene kanonische Serienstruktur.
**Notes:** Serien muessen spaeter um neue Stufen erweiterbar bleiben.

---

## Hauptmotiv und Stufenleiste

| Decision | Alternatives considered | Selected |
|----------|-------------------------|----------|
| Hauptmotiv | hoechste erreicht / naechstes Ziel / Lieblings-Badge | hoechste erreicht |
| Abschluss | voller Balken plus Text / nur Balken / kein Balken | voller Balken plus Text |
| Fortschrittstext | Wert+Ziel+Rest / Wert+Ziel / nur Rest | Wert+Ziel+Rest |
| Erreichte Stufen | alle farbig+Aktuell / nur aktuelle farbig / alle gleich | alle farbig+Aktuell |
| Noch nichts erreicht | erste Stufe ausgegraut / Schloss / keine Grafik | erste Stufe ausgegraut |
| Mobile Stufen | horizontal scrollen / alles verkleinern / nur drei zeigen | horizontal scrollen |
| Vorschau | erreichte anklickbar / statisch / nur im Raster | erreichte anklickbar |
| Kennzeichnung | Aktuell bleibt, Ausgewaehlt separat / Aktuell wandert / keine | Aktuell bleibt, Ausgewaehlt separat |

**User's choice:** Hoechste erreichte Stufe bleibt fachlicher Rang; andere erreichte Motive sind nur eine temporaere Vorschau.

---

## Noch nicht erreichte Badges

| Decision | Alternatives considered | Selected |
|----------|-------------------------|----------|
| Zukuenftige Stufen | Motiv grau+Schloss / leerer Rahmen / verborgen | Motiv grau+Schloss |
| Interaktion | anklickbare Vorschau / nicht anklickbar / Tooltip | nicht anklickbar |
| Nicht erhaltene Besondere | verbergen / gesperrt zeigen / nur Titel | verbergen |
| Leerer Sonderbereich | ausblenden / Hinweis / Platzhalter | ausblenden |

**User's choice:** Ziele zählbarer Serien bleiben sichtbar; nicht planbare Sonderauszeichnungen nicht.

---

## Aufbau der Profilseite

| Decision | Alternatives considered | Selected |
|----------|-------------------------|----------|
| Reihenfolge | Rollen zuerst / Punkte zuerst / Fortschritt zuerst | Rollen zuerst |
| Karussells | je Kategorie / ein Gesamtkarussell / nur Beitraege | je Kategorie |
| Alle anzeigen | Inline-Raster / Modal / Unterseite | Inline-Raster |
| Mehrfach offen | unabhaengig / nur eins / breakpoint-abhaengig | unabhaengig |

**User's choice:** Rollen → Fortschritt → Punkte → Beitraege → Mitgliedschaft → Besondere; globale Karussell- und Inline-Raster-Seams wiederverwenden.

## the agent's Discretion

- Exakte Abstaende, Breakpoints und interne Helper-Struktur innerhalb der bestehenden UI-Vertraege.

## Deferred Ideas

- None.
