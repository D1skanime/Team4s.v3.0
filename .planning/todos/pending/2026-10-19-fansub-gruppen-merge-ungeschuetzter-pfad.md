---
created: 2026-10-19T00:00:00+00:00
title: Fansub-Gruppen-Merge ändert release_version_groups ohne Credit-/Crew-Guard
area: admin-fansubs
files:
  - backend/internal/repository/fansub_repository_merge_core.go
---

## Befund (aus Phase-187-Ist-Analyse, 2026-10-18/19, siehe 187-CONTEXT.md Abschnitt 3 Zeile #6 und Abschnitt 6)

Beim Zusammenführen zweier Fansub-Gruppen läuft in
`backend/internal/repository/fansub_repository_merge_core.go:61-69`:

```sql
UPDATE release_version_groups
SET fansub_group_id = $1
WHERE fansub_group_id = ANY($2)
```

Das ändert effektiv die Gruppenzuordnung aller bestehenden Releases der Quellgruppe(n) — dieselbe
Composite-Key-Spalte, die Phase 187 für den direkten Gruppenwechsel am einzelnen Release mit einem
Guard versieht (siehe `.planning/phases/187-gruppenwechsel-bei-bestehenden-releases-release-versions-rel/187-CONTEXT.md`).

Die vorgelagerte Prüfung `countMergeVersionConflicts` prüft nur auf **doppelte**
`(release_version_id, group)`-Zuordnungen (Ziel- und Quellgruppe gleichzeitig an derselben
Version), **nicht** auf abhängige `release_role_credit_lifecycles`/`release_crew_snapshots`. Da für
diese FK kein `ON UPDATE CASCADE` definiert ist (nur `ON DELETE`), würde ein `UPDATE` auf den
referenzierten Composite-Key bei vorhandenen Kind-Zeilen mit dem Postgres-Standardverhalten
(RESTRICT bei `release_role_credit_lifecycles`) vermutlich fehlschlagen — nicht live getestet, da
außerhalb des Phase-187-Szenarios.

## Nutzerentscheidung

Explizit NICHT Teil von Phase 187 (Nutzerantwort auf Offene Frage 9, 2026-10-19). Gleiche
Wurzelursache, aber anderer Auslöser (Gruppen-Zusammenführung statt Release-Bearbeitung) — eigenes
Vorhaben.

## Wann

Später, eigene Ist-Analyse/Diskussion nötig (gleiche Fragen wie in Phase 187: was zählt als
„hängt dran", welche Fehlermeldung beim Merge-Konflikt, Sperre vs. Teil-Ausführung).
