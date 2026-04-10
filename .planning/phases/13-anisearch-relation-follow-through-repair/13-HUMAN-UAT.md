---
status: pending
phase: 13-anisearch-relation-follow-through-repair
source: [13-VERIFICATION.md]
started: 2026-04-11T01:40:00Z
updated: 2026-04-11T01:40:00Z
---

## Current Test

Phase 13 browser verification focuses only on persisted AniSearch relations after create save.

## Tests

### 1. Existing relation target vorbereiten
expected: Es existiert bereits ein Anime, der als lokales Relationsziel aufgeloest werden kann, zum Beispiel der Hauptanime einer OVA.
result: pending - vor dem Test sicherstellen, dass der Ziel-Anime bereits gespeichert ist und eine passende AniSearch-Quelle oder ein passender lokaler Titel-Match vorhanden ist.

### 2. AniSearch-Draft im Create-Flow laden
expected: Auf `/admin/anime/create` eine AniSearch-ID fuer den neuen Anime eingeben, `AniSearch laden` ausfuehren, und im Entwurf eine Relation-Zuordnung sehen, ohne dass schon etwas gespeichert wird.
result: pending - die Zusammenfassung soll weiterhin `Noch nichts gespeichert.` anzeigen.

### 3. Neuen Anime speichern
expected: Normales `Anime erstellen` fuehrt erfolgreich nach `/admin/anime?created={id}#anime-{id}` weiter, ohne Runtime-Fehler und ohne falsche AniSearch-Warnung, wenn nur `relations_skipped_existing` anfaellt.
result: pending - Erfolgsmeldung und Redirect pruefen.

### 4. Persistierte Relation nach dem Save pruefen
expected: Den neu erstellten Anime oeffnen und bestaetigen, dass die von AniSearch geladene gerichtete Relation wirklich vorhanden ist.
result: pending - entweder im Edit-Modus die Relationsliste pruefen oder ueber eine backendgestuetzte Admin-Ansicht/API bestaetigen, dass genau die erwartete gerichtete Relation gespeichert wurde.

### 5. Idempotenten Wiederholungsfall pruefen
expected: Ein erneuter Save oder erneutes Anwenden darf keine doppelte Relation erzeugen; bestehende Relationen zaehlen nur als `relations_skipped_existing`.
result: pending - nur noetig, wenn Schritt 4 erfolgreich war.

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Notes

- Phase 13 testet bewusst den Save-Follow-through, nicht nur die Draft-Zusammenfassung.
- Es wird keine automatische Rueckrelation erwartet; gespeichert wird nur die von AniSearch gelieferte gerichtete Relation.
