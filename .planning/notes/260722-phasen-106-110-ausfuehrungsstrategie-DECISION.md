---
title: "Phasen 106–110: sequenzielle Ausführungsstrategie"
date: 2026-07-22
context: "Ergebnis aus $gsd-explore zur Neuplanung des Medienmodell-Umbaus"
status: LOCKED
---

# Phasen 106–110: sequenzielle Ausführungsstrategie

Diese Entscheidung ergänzt den verbindlichen Architekturentscheid
`260721-medienmodell-neubau-architektur-DECISION.md`. Sie ändert nicht das
fachliche Zielmodell, sondern legt die Ausführungs- und Prüfgrenzen fest.

## Verbindliche Reihenfolge

1. Phase 106 wird vollständig neu recherchiert und geplant.
2. Phase 106 muss eigenständig funktionsfähig, testbar und verifiziert sein.
3. Erst danach wird Phase 107 gegen den tatsächlich ausgeführten Stand von
   Phase 106 neu recherchiert und geplant.
4. Dieses sequenzielle Gate gilt entsprechend für die folgenden Phasen.

Ein Big-Bang-Umbau, bei dem erst Phase 110 wieder funktionieren muss, ist
ausdrücklich verworfen.

## Verhaltensschutz für Phase 106

- Entfernen einer Datei, Funktion, Route, DTO-Struktur oder DB-Relation ist nur
  erlaubt, nachdem die vollständige Kette aus Producer, Backend, Contract,
  API-Helfer, Frontend-Consumer, Storage und Cleanup nachgewiesen wurde.
- Aktives Verhalten wird entweder vollständig erhalten oder im selben
  ausführbaren Plan durch einen nachweislich gleichwertigen Ersatz abgelöst.
- Stille Verhaltensverluste und nur für spätere Phasen vorgemerkte Reparaturen
  sind nicht zulässig.
- `media_assets`, `media_files`, `release_media` und
  `release_version_media` gelten als aktive Laufzeitseams, solange ihre
  produktiven Leser und Schreiber nicht vollständig migriert wurden.
- `deleteUploadedCoverFile` und sein Backend-/Frontend-Cleanup-Vertrag dürfen
  nicht ersatzlos entfernt werden, solange kein gleichwertiger Cleanup-Pfad
  implementiert und getestet ist.

## Verifikationsregeln

- Zielschema, Spaltentypen, Nullability, Foreign Keys, Delete-Semantik,
  Constraints und Indizes werden semantisch über PostgreSQL-Kataloge geprüft;
  Substring-Suchen in SQL sind kein Schema-Beweis.
- Destruktive Migrations- und Leer-DB-Tests dürfen ausschließlich gegen eine
  eindeutig isolierte Testdatenbank laufen.
- Plan-Gates prüfen nur den eigenen Plan-/Commit-Umfang und dürfen nicht an
  bereits vorhandenen Änderungen anderer sequenzieller Pläne scheitern.
- Bei `use_worktrees: false` schreiben keine GSD-Executors parallel in denselben
  Arbeitsbaum.
- Der verpflichtende Auth-Regressionstest bleibt bestehen: fehlender oder
  abgelaufener Access-Token, gültige Refresh-Session, geschützter Upload läuft
  über den zentralen API-Client ohne direkte Token- oder Bearer-Logik.

## Konsequenz für vorhandene Planung

Die vorhandenen Phase-106-Pläne sind keine Ausführungsgrundlage. Phase 106 wird
aus aktuellem Code, dem Architekturentscheid und den oben genannten
Verifikationsregeln vollständig neu geplant. Die provisorischen Phase-107-Pläne
bleiben gesperrt, bis Phase 106 ausgeführt und verifiziert ist.
