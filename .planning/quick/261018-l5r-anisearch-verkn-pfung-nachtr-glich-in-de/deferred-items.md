# Deferred Items — quick-261018-l5r

## 1. `frontend/src/types/admin.ts` 450-Zeilen-Regel vs. Task-3-Umfang

**Fund:** Task 3 ergänzt `frontend/src/types/admin.ts` um zwei neue, kleine Interfaces
(`AdminAnimeAniSearchLinkRequest`, `AdminAnimeAniSearchLinkResult`, +17 Zeilen). Die Datei war
VOR dieser Änderung bereits 1173 Zeilen lang (danach 1190) — weit über der CLAUDE.md-450-Zeilen-
Grenze. `admin.ts` ist in CLAUDE.md namentlich als einer der ~80 bestehenden Altfälle gelistet
("Kein eigenes Großprojekt: Diese Dateien werden NICHT vorsorglich in einer separaten
Aufräum-Phase zerlegt"), ABER die Regel verlangt wörtlich: "Muss ein Agent eine Produktionsdatei
mit mehr als 450 Zeilen inhaltlich ändern, teilt er sie im selben Auftrag auf."

**Warum hier NICHT in diesem Auftrag gesplittet:** `admin.ts` ist eine zentrale, repo-weit
importierte Typdefinitions-Datei (Dutzende/Hunderte Importstellen über das gesamte
Admin-Frontend). Ein vollständiger, sauberer Modul-Split (wie bei den CSS-Modulen/Komponenten in
Task 2 dieses Plans) wäre eine eigenständige, risikobehaftete Architektur-Maßnahme mit breiter
Fehler-Oberfläche (jede Importstelle müsste geprüft werden) — das sprengt den engen, auf den
AniSearch-Verknüpfungs-Bug fokussierten Rahmen dieses Quick-Tasks bei Weitem und entspricht damit
Rule 4 der Executor-Deviation-Regeln ("Architectural changes -> ask, nicht automatisch
ausführen"). Eine Ergänzung von 17 Zeilen um zwei kleine, thematisch passende Interfaces direkt
neben den bereits bestehenden `AdminAnimeAniSearch*`-Typen ist demgegenüber eine triviale,
risikofreie Änderung.

**Status:** RESOLVED (2026-10-18). Option (a) wurde umgesetzt: `admin.ts` in drei thematische
Dateien gesplittet (`admin-anime-core.ts`, `admin-jellyfin.ts`, `admin-theme-segment.ts`, alle
≤450 Zeilen), `admin.ts` selbst ist jetzt ein reiner `export * from ...`-Barrel (7 Zeilen).
Zero Import-Änderungen außerhalb von `admin.ts` nötig (verifiziert per `grep`-Diff). Details
siehe Addendum "`frontend/src/types/admin.ts` CLAUDE.md-450-Zeilen-Split" in
`261018-l5r-SUMMARY.md`.
