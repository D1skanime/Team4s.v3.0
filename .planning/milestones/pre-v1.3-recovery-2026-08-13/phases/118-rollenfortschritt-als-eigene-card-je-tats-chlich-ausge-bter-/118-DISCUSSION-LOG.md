# Phase 118: Rollenfortschritt als eigene Card je Fansubrolle - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-02
**Phase:** 118-rollenfortschritt-cards-und-globales-focal-carousel
**Areas discussed:** Fortschrittsberechnung, Rollen-Card, Karussell und Responsive-Verhalten, Sonderzustände

---

## Fortschrittsberechnung

| Entscheidung | Gewählt | Verworfen |
|---|---|---|
| Ziel der Leiste | Nächste Stufe | Immer bis Platin; doppelte Anzeige |
| Zahlenbasis | Gesamtwert bis zur Schwelle | Zurückgesetzter Stufenabschnitt |
| Beschriftung | Stand und Restmenge gemeinsam | Nur Stand; nur Restmenge |
| Schwellenwechsel | Sofort nächstes Ziel | Erreichten Rang zunächst festhalten |

**User's choice:** `50 von 108 Mitwirkungen · Noch 58 bis Silber`; bei 108 sofort Ziel Gold.

---

## Rollen-Card

| Entscheidung | Gewählt | Verworfen |
|---|---|---|
| Große Medaille | Höchste erreichte Medaille | Immer Einstieg; nächstes gesperrtes Ziel |
| Entwicklungsreihe | Alle fünf echten Badge-Bilder | Nur erreichte Bilder; Text-Chips |
| Aktuelle Medaille | In Reihe wiederholen und markieren | Lücke/Platzhalter; keine Markierung |
| Ranglabel | Chip `Gold · 320+` | Tatsächlicher Stand im Chip; nur Rangname |

**User's choice:** Sketch 001 Variante A „Vollständige Sammlung“.
**Notes:** Die Variante wurde zusätzlich für Mobile geprüft; vollständige Fünferreihe bleibt ohne inneres Scrollen erhalten.

---

## Karussell und Responsive-Verhalten

| Entscheidung | Gewählt | Verworfen |
|---|---|---|
| Mehrere Rollen | Eine eigene Card pro Rolle in einem horizontalen Focal-Carousel | Untereinander; Raster |
| Bewegung | Kontinuierlich, skalierend, Momentum und weiches Snap | Statisches Durchklicken; harte Einzelschritte |
| Eingabe | Touch, Drag, Trackpad, Mausrad, Pfeile, Tastatur | Eingeschränkte Einzelsteuerung |
| Responsive | Abgestufte Randkarten, mobil kleiner Anschnitt | Überall symmetrisch; mobil ohne Nachbar |
| Reduced Motion | Kurze ruhige Einrastbewegung ohne Schwung/Skalierung | Volle Bewegung; nur Momentum entfernen |
| Tastatur | Fokus/Pfeile aktivieren ganze Card | Jede Medaille als Tabstopp; nur Pfeilbuttons |
| Orientierung | Nur kompakter Zähler | Punkte; Zähler und Punkte |
| Wiederverwendung | Globale Interaktion, flexibler Inhalt | Vollständig identisches Aussehen; nur minimale Basis |

**User's choice:** Sketch 002 Variante A „Ein Rollen-Karussell“.
**Notes:** Im Mockup war die letzte Card nicht zentriert. Ursache war eine transformierte Messbreite; der Sketch wurde korrigiert. Die Implementierung muss erste und letzte Card auf allen Viewports vollständig zentrieren. Vor Umsetzung ist ein Inventar aller globalen und lokalen Carousel-Pfade Pflicht.

---

## Sonderzustände

| Entscheidung | Gewählt | Verworfen |
|---|---|---|
| Vor Bronze | Einstiegs-Badge groß | Bronze gesperrt groß; neutrales Zusatzmotiv |
| Bei Platin | Volle Leiste und Abschlussmeldung | Leiste ausblenden; unbegrenztes Weiterzählen als Ziel |
| Unter Schwelle | Sofortige Live-Rückstufung | Rang behalten; historischen Rang speichern |
| Bei null | Ganze Rollen-Card ausblenden | Leere gesperrte Card; Hinweis-Card |

**User's choice:** Das Earned-only- und Live-Projektionsprinzip bleibt ohne Ausnahmen bestehen.

---

## the agent's Discretion

- Exakte responsive Maße und Momentumparameter innerhalb der festgelegten Wirkung.
- Interne API der globalen Carousel-Komponente nach Bestandsinventar.

## Deferred Ideas

None.
