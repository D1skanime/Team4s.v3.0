---
title: "Phase 106 vollständig neu recherchieren und planen"
date: 2026-07-22
priority: high
area: media-architecture
status: pending
---

# Phase 106 vollständig neu recherchieren und planen

## Ziel

Die vorhandenen Phase-106-Pläne nicht flicken, sondern aus dem aktuellen Code
und den verbindlichen Architekturentscheidungen vollständig neu erstellen.

## Verbindliche Eingaben

- `.planning/notes/260721-medienmodell-neubau-architektur-DECISION.md`
- `.planning/notes/260722-phasen-106-110-ausfuehrungsstrategie-DECISION.md`
- aktueller Code und kanonische Domain-/API-/Auth-Dokumentation
- sieben bestätigte Plan-Blocker und die zusätzliche Diff-Gate-Warnung
- bestätigter fünfter D-09-Fall um `deleteUploadedCoverFile`
- noch zu verifizierende HIGH-Befunde zu Schema-Beweis, Unique-Guard,
  isolierter Leer-DB-Prüfung und globalen Wave-Diff-Gates

## Mindestanforderungen

- vollständige Producer-/Consumer-/Storage-/Cleanup-Inventur über Backend- und
  Frontend-Grenzen hinweg
- keine Klassifizierung als Legacy oder tot ohne nachgewiesene vollständige
  Caller-Kette
- PostgreSQL-Katalogabfragen für Schema- und Constraint-Gates
- isolierte Testdatenbank für destruktive Migrationstests
- planbezogene Gates und sequenzielle Executor-Schreibzugriffe
- Phase 106 bleibt nach Abschluss eigenständig funktionsfähig und verifiziert
- Phase 107 wird erst danach neu recherchiert und geplant

## Abschluss

Phase 106 besitzt neue, adversarial geprüfte PLAN-Dateien ohne HIGH/BLOCKER und
ohne Abhängigkeit von einer späteren Phase zur Wiederherstellung aktiven
Verhaltens.
