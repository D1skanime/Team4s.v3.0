# Phase 171: Kara-Segmente in Release-Media und Public Story integrieren - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-30
**Phase:** 171-Kara-Segmente in Release-Media und Public Story integrieren
**Areas discussed:** Gemeinsame Reihenfolge, Sichtbarkeit nach dem Erstellen, Public-Story-Darstellung, Kara-Playback und Berechtigungen, Timeline-Integration

---

## Gemeinsame Reihenfolge

| Option | Beschreibung | Selected |
|--------|-------------|----------|
| 1 | Eine gemeinsame Reihenfolge für normale Bilder, Highlights und Kara | ✓ |
| 2 | Medien und Kara getrennt speichern und nur gemeinsam anzeigen | |
| 3 | Kara anhand von Zeitinformationen zwischen Bildern einsortieren | |

**User's choice:** 1  
**Notes:** Die Public Story soll dieselbe Reihenfolge übernehmen.

## Sichtbarkeit nach dem Erstellen

| Option | Beschreibung | Selected |
|--------|-------------|----------|
| 1 | Nach erfolgreicher Erstellung sofort in der gemeinsamen Liste anzeigen | ✓ |
| 2 | Erst nach Reload oder erneutem Öffnen anzeigen | |
| 3 | Erst nach zusätzlichem Speichern der Reihenfolge aufnehmen | |

**User's choice:** 1  
**Notes:** Der neue Kara-Eintrag soll direkt erscheinen.

## Public-Story-Darstellung

| Option | Beschreibung | Selected |
|--------|-------------|----------|
| 1 | Exakt dieselbe Reihenfolge wie im Admin übernehmen | ✓ |
| 2 | Highlights unabhängig davon zuerst hervorheben | |
| 3 | Highlights zusätzlich wiederholen | |

**User's choice:** 1  
**Notes:** Highlights bleiben an ihrer Position und behalten ihre Hervorhebung.

## Kara-Playback und Berechtigungen

| Option | Beschreibung | Selected |
|--------|-------------|----------|
| 1 | Play nur für berechtigte Nutzer anzeigen | |
| 2 | Play für alle anzeigen und Playback serverseitig entscheiden | ✓ |
| 3 | Play für alle anzeigen, Playback nur für eingeloggte Nutzer | |

**User's choice:** 2  
**Notes:** Login- und Berechtigungshinweise werden von der bestehenden Auth-/Playback-Logik getragen.

## Timeline-Integration

**User's choice:** Freitext  
**Notes:** Wie im Sketch: kein separater Kara-Bereich; die bestehende Timeline bleibt erhalten, wird nur verschoben/dargestellt, und ein Klick auf einen Kara-Timeline-Eintrag springt direkt zur zugehörigen Kara-Karte.

## the agent's Discretion

- Konkrete gemeinsame Persistenzrepräsentation, sofern sie die kanonische Domain-Ownership und Phase-169-Verträge respektiert.
- Konkrete CSS-/Responsive-Anpassungen innerhalb der bestehenden Komponenten.
- Exakte Formulierung der Login-/Berechtigungshinweise, sofern sie den bestehenden UI- und API-Konventionen entsprechen.

## Deferred Ideas

Keine.

