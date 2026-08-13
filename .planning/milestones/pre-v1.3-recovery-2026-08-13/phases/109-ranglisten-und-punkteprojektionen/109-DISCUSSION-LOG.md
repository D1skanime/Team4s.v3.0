# Phase 109: Ranglisten und Punkteprojektionen - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-26
**Phase:** 109-ranglisten-und-punkteprojektionen
**Areas discussed:** Berechnung/Umfang der Rangliste, Scope-Reduktion

---

## Umfang der Rangliste (global vs. vier Schnitte)

| Option | Description | Selected |
|--------|-------------|----------|
| Nur globales Allzeit-Total | Netto-Punktsumme pro Member, absteigend. Keine weiteren Schnitte. | ✓ |
| Alle vier Schnitte (global/Gruppe/Kategorie/Zeit) | Wie im Roadmap-Zieltext. | |

**User's choice:** Nur das globale Allzeit-Total.
**Notes:** „das braucht es sicher noch nicht. wozu diese Unterscheidung." Nutzer will keine
Gruppen-/Kategorie-/Zeit-Ranglisten und keine Aufschlüsselung, wofür Punkte kamen. Die
Rohdaten stehen im Ledger und können bei Bedarf später aus der DB gezogen werden.

---

## Berechnungsart (live vs. Aggregat vs. Materialized View)

| Option | Description | Selected |
|--------|-------------|----------|
| Live aus dem Ledger | SUM(point_value) GROUP BY member je Anfrage. | |
| Inkrementelles Aggregat | Persistierte Summe pro Member, transaktional bei Buchung/Storno fortgeschrieben; Anzeige liest nur den gespeicherten Betrag. | ✓ |
| Materialized View | Periodischer Refresh, eventual consistency. | |

**User's choice:** Persistierte, mitgeführte Summe (inkrementelles Aggregat).
**Notes:** „wichtig ist das die gesamt summe pro user in die db geschrieben werden muss und
updatet wird. nicht so das es bei der anzeige das berechnet sondern nur direkt den betrag
aus der db verwenden kann." → D-05/D-06 in CONTEXT.md. Überstimmt die zuvor an Claude
delegierte Wahl. Mechanik (Trigger vs. gleiche Transaktion) bleibt Bauentscheidung.

---

## Claude's Discretion

- Fortschreibungs-Mechanik der persistierten Summe (DB-Trigger vs. service-seitig in der Buchungstransaktion).
- Tabellen-/Spalten- sowie Endpunkt-/DTO-Benennung und Repository-Aufteilung.
- Query so bauen, dass spätere Filter ohne Umbau ergänzt werden können (Bauhygiene, kein Feature).

## Deferred Ideas

Vom Nutzer aufgeworfen, gehören aber in **Phase 110** (Ranglisten-UI + Badges):

- Wie kommt ein normaler User auf die Ranglisten-Ansicht (Einstieg/Navigation)?
- Wo werden die Punkte beim Member selbst angezeigt (Profil)?
- Wofür gibt es Badges/Auszeichnungen (z. B. „X Punkte auf Beiträge")?
- Zusätzliche Ranglisten-Schnitte (Gruppe/Kategorie/Zeitraum) inkl. `effective_at`-vs-
  `recorded_at`-Zeitsemantik — erst wenn die UI sie braucht.
