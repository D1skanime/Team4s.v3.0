# Phase 187: Gruppenwechsel bei bestehenden Releases (release_versions / release_version_groups) — CONTEXT

**Quelle des Auftrags:** Nutzerauftrag vom 2026-10-18 (additiv an ROADMAP angehängt, kein neues
Milestone). Dieses Dokument ist reine Ist-Analyse + offene Fragen — **nicht geplant, nicht
ausgeführt, keine Produktcode-Änderung.**

## Problem (laut Auftrag)

Ändert ein Admin die Fansub-Gruppe eines bestehenden Releases, gibt es heute entweder einen
FK-RESTRICT-Fehler (über `release_role_credit_lifecycles`) oder es werden still per CASCADE
`release_crew_snapshots` gelöscht. Beides ist live reproduziert worden (Abschnitt "Live-Reproduktion"
unten) — mit einer wichtigen Präzisierung gegenüber der ursprünglichen Problembeschreibung: Medien
und Notizen werden **nicht** per CASCADE gelöscht (es gibt dafür gar keine FK-Beziehung zu
`release_version_groups`), sondern **verwaisen still** (sie zeigen danach auf eine Gruppe, die am
Release nicht mehr hängt). Siehe Case C unten.

## Nutzerentscheidungen (final gesetzt — nicht neu verhandeln)

### D-01 — Stufe 1: frei änderbar ohne Anhang
Die Gruppe eines Releases ist frei änderbar, solange am Release nichts hängt (keine
Mitglieder/Crew, keine Medien, keine Notizen/Beiträge, keine Punkte/Credits).

### D-02 — Stufe 2: serverseitige Sperre mit Anhangs-Auskunft
Sobald etwas an der Gruppe hängt, ist das Gruppenfeld gesperrt, mit einer klaren deutschen
Meldung, WAS dranhängt (Anzahl je Art) — statt des heutigen FK-Fehlers bzw. stillen
CASCADE-Löschens. Das Backend muss dies serverseitig erzwingen (kein reiner UI-Schutz).

### D-03 — Partnergruppe hinzufügen statt Wechsel
Eigener Knopf „Partnergruppe hinzufügen": `release_version_groups` kann N Gruppen; eine
zusätzliche Gruppe hinzufügen statt zu wechseln. **Wichtiger Ist-Befund dazu in Abschnitt 4 unten
— vermutlich bereits teilweise vorhanden, siehe Offene Frage 1.**

### D-04 — Kein Umzugs-Assistent (Stufe 3) in dieser Phase
Explizit nicht Teil dieser Phase.

## Verbindliche Vorgaben für alle späteren Schritte (Planung + Ausführung)

- **Bestehenden Editor wiederverwenden:** Der Admin-Release-Editor
  `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx`
  (Abschnitt „Fansub Gruppen") ist die einzige Oberfläche für diese Änderung — **keine neue
  Parallelseite.**
- **Globale UI-Primitives:** Jede neue/geänderte UI MUSS `@/components/ui` nutzen (`Button`,
  `Input`, …). Der bestehende Abschnitt „Fansub Gruppen" nutzt heute native `<input>`/`<button>`
  (Design-System-Abweichung) — wird dieser Abschnitt inhaltlich angefasst, zieht das laut
  `CLAUDE.md` eine Migration auf die Primitives nach sich (gleiches Muster wie in Phase 186 bei
  den Import-Mapper-Buttons).
- **Produktverhalten nie ändern, nur um Tests grün zu machen.**
- **Dateien ≤ 450 Zeilen:** Mehrere der hier betroffenen Dateien liegen bereits heute über dem
  Limit (Inventur in Abschnitt 8) — wer sie inhaltlich anfasst, teilt sie im selben Auftrag auf
  (reiner Umbau-Commit zuerst, Verhalten unverändert, Tests/Typecheck grün, danach erst die
  inhaltliche Änderung).
- **Deutsche UI-Texte mit echten Umlauten** (ä/ö/ü/ß), keine ASCII-Ersetzungen — gilt für die neue
  Sperr-Meldung, Knopf-Beschriftungen, Fehlertexte.
- **Teststil:** Verhaltens-Assertions für den neuen Guard müssen den Code echt ausführen
  (`httptest` gegen Fake-Repository mit Statuscode/Body-Prüfung), kein Quelltext-Grep-Test.

## Ist-Zustand (Code- und Schema-Inventur, Stand 2026-10-18)

### 1. Schema: Composite-Key mit zwei unterschiedlichen FK-Verhalten

`release_version_groups` ist eine Junction-Tabelle mit zusammengesetztem Primärschlüssel
`(release_version_id, fansub_group_id)` (`database/migrations/0035_add_release_tables.up.sql:74-82`).
Zwei Kind-Tabellen referenzieren genau diesen Composite-Key, mit unterschiedlichem
`ON DELETE`-Verhalten (`database/migrations/0137_phase108_contribution_sources.up.sql:3-33`):

| Kind-Tabelle | ON DELETE | Bedeutung |
|---|---|---|
| `release_crew_snapshots` (`snapshot_mode`: inherited/independent) | `CASCADE` | stilles Löschen |
| `release_role_credit_lifecycles` (Mitglieder/Crew + `award_entry_id → point_ledger_entries`, also Punkte/Credits) | `RESTRICT` | harter FK-Fehler |

**Wichtig — Medien/Notizen hängen NICHT per FK an `release_version_groups`:**
`release_version_media` und `release_version_notes` haben jeweils eine eigene, nullable
`fansub_group_id`-Spalte, die direkt auf `fansub_groups(id)` zeigt (`ON DELETE SET NULL`) — **keine**
Beziehung zu `release_version_groups`. Entfernt man eine Gruppe aus einem Release, werden
zugehörige Medien/Notizen also weder gelöscht noch blockiert, sondern **verwaisen still** (sie
zeigen weiter auf eine Gruppe, die am Release nicht mehr hängt). Live bestätigt, siehe Case C.

**„Entitlements" sind DB-seitig entkoppelt:** `release_playback_entitlement_rules` referenziert
`release_version_id` und `fansub_group_id` als unabhängige, nullable Spalten (keine Composite-FK zu
`release_version_groups`). Aktuell **0 Zeilen** im System (nicht produktiv genutzt) — die in der
Auftragsbeschreibung genannte „CASCADE-Löschung von Entitlements" lässt sich auf DB-Ebene nicht
nachweisen; falls gemeint ist, dass Anwendungscode sie verwaltet, wurde dafür kein Schreibpfad
gefunden.

Keine Trigger auf `release_version_groups`, `release_crew_snapshots`,
`release_role_credit_lifecycles`, `release_playback_entitlement_rules`, `release_version_media`
oder `release_version_notes` — alles beobachtete Verhalten ist reines FK-Verhalten bzw.
Anwendungscode.

### 2. Live-Reproduktion (Testdaten nur innerhalb einer Transaktion, danach `ROLLBACK` — keine
Bestandsdaten verändert)

**Case A — leeres Release wechseln** (`release_version_id=50`, Gruppe 24→25, keine
Credits/Crew/Medien/Notizen an diesem Paar):
```sql
DELETE FROM release_version_groups WHERE release_version_id=50 AND fansub_group_id=24;
INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES (50, 25);
```
Läuft fehlerfrei durch. Nebenbefund: Der (leere, `snapshot_mode='inherited'`)
`release_crew_snapshots`-Eintrag der alten Zuordnung wird dabei lautlos per CASCADE mitgelöscht; für
die neue Zuordnung existiert danach **kein** `release_crew_snapshots`-Eintrag mehr, bis die
Anwendung ihn neu anlegt (nicht geprüft, ob/wo das aktuell geschieht).

**Case B — Release mit Crew/Credits wechseln** (`release_version_id=27`, Gruppe 1, 12
`release_role_credit_lifecycles`-Zeilen):
```sql
DELETE FROM release_version_groups WHERE release_version_id=27 AND fansub_group_id=1;
```
Reale, live erzeugte Fehlermeldung:
```
ERROR:  update or delete on table "release_version_groups" violates foreign key constraint
"release_role_credit_lifecycle_release_version_id_fansub_gr_fkey" on table
"release_role_credit_lifecycles"
DETAIL:  Key (release_version_id, fansub_group_id)=(27, 1) is still referenced from table
"release_role_credit_lifecycles".
```

**Case C — Release mit Medien/Notizen, aber ohne Credits** (kein Bestandsfall mit dieser exakten
Kombination vorhanden — Testdaten in derselben Transaktion künstlich angelegt, dann `ROLLBACK`):
```sql
INSERT INTO release_version_media (release_version_id, media_asset_id, category, fansub_group_id)
  VALUES (50, 1, 'screenshot', 24);
INSERT INTO release_version_notes (release_version_id, member_id, role_id, fansub_group_id, ...)
  VALUES (50, 3, 7, 24, ...);
DELETE FROM release_version_groups WHERE release_version_id=50 AND fansub_group_id=24;
INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES (50, 26);
```
Läuft fehlerfrei durch, **ohne** die Medien-/Notiz-Zeilen zu berühren. Nachweis per Query direkt
danach: Medien-/Notiz-Zeile existiert weiterhin mit `fansub_group_id=24`, obwohl `(50, 24)` nicht
mehr in `release_version_groups` steht (`gruppe_noch_am_release = false`) — **verwaist, nicht
gelöscht, kein Fehler.**

**Bestandsdaten-Übersicht (Stand 2026-10-18):** 175 `release_version_groups`-Zeilen (darunter
bereits echte Mehrgruppen-Releases: `release_version_id` 60 und 64 mit je 2 Gruppen — die
Datenmodell-Grundlage für D-03 existiert also bereits produktiv). 174× `snapshot_mode='inherited'`,
1× `'independent'`. 162 von 175 Paaren haben **keine** `release_role_credit_lifecycles`-Zeile
(= heutige Stufe-1-Kandidaten), 13 Paare haben welche. Kein Bestandspaar mit Medien/Notizen aber
ohne Credits (daher künstliche Testdaten für Case C nötig).

### 3. Backend-Code-Pfade: wo die Gruppe heute geändert wird (keine Guards vorhanden)

| # | Datei:Zeile | Was passiert | Guard? |
|---|---|---|---|
| 1 | `backend/internal/handlers/episode_version_update.go:16-99` | Admin-PATCH-Handler `UpdateEpisodeVersion`, ruft Repo-Update auf | Nein — nur Rollen-Gate (`IsPlatformAdmin` bzw. `isReleaseMetadataOnlyPatch`), kein Dependenz-Check |
| 2 | `backend/internal/repository/episode_version_repository.go:408-420` | Trigger für Gruppen-Sync bei Update | Nein |
| 3 | `backend/internal/repository/episode_version_repository_write_helpers.go:197-256` (`upsertReleaseVersionGroupsForSync`, `syncEpisodeVersionSelectedGroups`) | `DELETE`/`INSERT` auf `release_version_groups` im Editor-Pfad. Bei leerer neuer Gruppenliste: blanko `DELETE FROM release_version_groups WHERE release_version_id=$1` (auf 0 Gruppen möglich!) | Nein |
| 4 | `backend/internal/handlers/admin_episode_import.go:115` → `episode_import_repository_apply.go:100-123` | Import-„Übernehmen"-Apply-Loop, läuft auch für **bestehende** Releases (`VersionsUpdated`-Zweig) | Nein |
| 5 | `backend/internal/repository/episode_import_repository_release_helpers.go:210-269` (`upsertReleaseVersionGroup`) | Strukturell identisches `DELETE`/`INSERT` im Import-Pfad. Bei leerer Gruppenliste: früher Abbruch **ohne** Löschung (Abweichung zu #3!) | Nein |
| 6 | `backend/internal/repository/fansub_repository_merge_core.go:61-69` | `UPDATE release_version_groups SET fansub_group_id=$1 WHERE fansub_group_id=ANY($2)` beim Zusammenführen zweier Fansub-Gruppen — ändert ebenfalls Gruppenzuordnungen bestehender Releases | Nur Duplikat-Konflikt-Check (`countMergeVersionConflicts`), keine Credit/Crew-Prüfung. Kein `ON UPDATE CASCADE` definiert → würde bei vorhandenen Kind-Zeilen ebenfalls mit FK-Fehler scheitern (nicht live getestet, da außerhalb des beauftragten Szenarios) |

**Fehlerbehandlung im Editor-Pfad:** `episode_version_update.go` kennt nur
`ErrEpisodeVersionDateOrder`, `ErrNotFound`, `ErrConflict`. Ein Postgres-FK-Fehler (23503, Case B)
fällt durch bis zum generischen `500 "interner serverfehler"` — der Admin bekommt aktuell **keine**
Auskunft, was genau dranhängt.

**Zugriffsschutz heute:** Nur `IsPlatformAdmin` darf `FansubGroups`/`FansubGroupID` überhaupt
patchen — Nicht-Admins bekommen bei einem Versuch `403 "Nur Release-Metadaten dürfen bearbeitet
werden."` (`isReleaseMetadataOnlyPatch`, `episode_version_update.go:92-99`). Es gibt aktuell
**keinen** Gruppenleiter-Pfad für dieses Feld.

### 4. Frontend: Multi-Gruppen-UI existiert bereits — Lücke ist nur der fehlende Guard

`EpisodeVersionEditorPage.tsx` (981 Zeilen), Abschnitt „Fansub Gruppen" (~Z. 806–873):
- Suchfeld „Gruppe suchen" → Klick auf ein Suchergebnis ruft `editor.addGroup(group)` auf.
- Bestehende Gruppen werden als Chips mit „×" angezeigt; Klick ruft `editor.removeGroup(group.id)`
  auf.
- Helper-Text: „Suche nach Gruppenname oder Alias. Mehrere Gruppen werden als Kollaboration
  gespeichert."
- State/Diff: `useEpisodeVersionEditor.ts:243-309` — beim Speichern wird die **komplette** neue
  Gruppenliste als `fansub_groups` im PATCH mitgeschickt (kein granulares Add/Remove-Signal zum
  Backend), landet direkt in Pfad #3 oben.
- **Kein** Bestätigungsdialog, keine Warnung vor dem Entfernen einer Gruppe mit Anhang.
- **Keine** spezielle Fehlerbehandlung für FK-Konflikte im Save-Handler (generisches
  `formatError(err)`).
- Native `<input>`/`<button>`-Elemente statt `@/components/ui`-Primitives (Design-System-Abweichung,
  siehe „Verbindliche Vorgaben").

**Konsequenz für D-03:** Das Datenmodell (N Gruppen pro Release) und eine Hinzufügen-Funktion
(„Gruppe suchen" → anklicken → Chip erscheint) existieren bereits und werden von Admins heute schon
genutzt (siehe Mehrgruppen-Bestandsdaten oben). Es gibt **keine** separate Unterscheidung zwischen
„Gruppe wechseln" und „Partnergruppe hinzufügen" — beides ist technisch dieselbe flache Chip-Liste
(hinzufügen = add, wechseln = remove + add). Siehe Offene Frage 1.

### 5. Episoden-Import „Übernehmen" betrifft ebenfalls bestehende Releases

`admin_episode_import.go` → `ApplyEpisodeImport` → `episode_import_repository_apply.go` nutzt
denselben `upsertReleaseVersionGroup`-Helper für **sowohl neue als auch bereits existierende**
Release-Variants (`VersionsUpdated`-Zweig, wenn eine importierte Datei einem bestehenden
`release_variant` zugeordnet wird). Der Import-Mapper kann also ebenfalls Gruppen bestehender
Releases überschreiben — ohne Guard, und mit dem oben genannten abweichenden Leerlisten-Verhalten
gegenüber dem Editor-Pfad.

### 6. Bonus-Fund: Fansub-Gruppen-Merge — verwandter, ebenfalls ungeschützter Pfad

Siehe Zeile 6 der Tabelle in Abschnitt 3. Nicht Teil der ursprünglichen Problembeschreibung
(Gruppen-Merge ≠ Gruppenwechsel am einzelnen Release), aber dieselbe Wurzelursache (Composite-Key
ohne Dependenz-Guard). Siehe Offene Frage 9.

### 7. Keine Testabdeckung für dieses Szenario

`backend/internal/migrations/phase108_contribution_sources_test.go` deckt CHECK-Constraints und
Append-Only-Verhalten von `release_role_credit_lifecycles`/`release_crew_snapshots` ab, aber
**kein** Test simuliert einen Gruppenwechsel an einem bestehenden `release_version_groups`-Eintrag
(weder den RESTRICT-Fall noch den CASCADE-Fall). Keine Handler- oder Repository-Tests zu diesem
Szenario in `episode_version_repository_test.go`,
`episode_version_repository_write_helpers_test.go`, `episode_import_repository_apply_test.go` o. ä.

### 8. Datei-Längen-Inventur (`wc -l`, Stand 2026-10-18 — `CLAUDE.md`-Pflicht beim Anfassen)

| Datei | Zeilen | Wahrscheinlich betroffen durch Stufe-2-Guard | Status |
|---|---|---|---|
| `EpisodeVersionEditorPage.tsx` | 981 | Ja — Remove-Chip-Handler, Fehleranzeige, ggf. „Partnergruppe hinzufügen"-Knopf | weit über Limit |
| `episode_version_repository.go` | 565 | Ja — Guard-Aufruf vor Sync | über Limit |
| `episode_import_repository_release_helpers.go` | 525 | Ja — identisches Muster im Import-Pfad | über Limit |
| `episode_version_repository_write_helpers.go` | 459 | Ja — DELETE/INSERT-Stelle selbst | knapp über Limit |
| `useEpisodeVersionEditor.ts` | 416 | Ja — Fehlerbehandlung für PATCH-Antwort | unter Limit, aber knapp |
| `episode_version_update.go` | 99 | Ja — FK-Fehler-Mapping / neue Fehlerantwort | unkritisch |
| `admin_episode_import.go` | 356 | Eher nicht — der Guard säße im Import-Repository, nicht hier | unkritisch |
| `fansub_repository_merge_core.go` | 236 | Nur falls Merge-Pfad in Scope genommen wird (Frage 9) | unkritisch |

## Offene Fragen an den Nutzer

1. **„Partnergruppe hinzufügen" existiert im Datenmodell und in der UI bereits** (Suchfeld + Klick
   fügt eine weitere Gruppe als Chip hinzu, siehe Abschnitt 4) — reicht diese bestehende
   Hinzufügen-Funktion für D-03 aus (nur der fehlende Guard beim *Entfernen* muss noch gebaut
   werden), oder soll es einen zusätzlichen, konzeptionell eigenen Knopf/Call-to-Action geben, der
   sich von der heutigen „Gruppe suchen"-Leiste absetzt?
2. **Darf man die zuletzt verbleibende Gruppe entfernen?** Der heutige Editor-Pfad erlaubt es
   bereits technisch (blanko `DELETE` auf 0 Gruppen, siehe Abschnitt 3 #3). Soll das künftig
   grundsätzlich verboten werden (ein Release braucht immer mindestens eine Gruppe), unabhängig
   davon, ob Stufe 1 oder Stufe 2 greift?
3. **Was passiert beim Entfernen einer Partnergruppe, an der etwas hängt?** Gilt dieselbe
   Stufe-2-Sperrlogik 1:1 auch für das Entfernen einer von mehreren Gruppen, oder gibt es dort eine
   andere Regel (z. B. weil die andere Gruppe ja noch bleibt)?
4. **Soll der Guard auch das neu entdeckte Verwaisungsproblem (Case C) beheben?** Heute verwaisen
   Medien-/Notiz-Einträge beim Gruppenwechsel still (sie bleiben bestehen, zeigen aber auf eine
   Gruppe, die nicht mehr am Release hängt) — ohne Fehler, ohne Löschung. Soll „Medien/Notizen" im
   Sinne von D-01/D-02 ALS Anhang zählen und den Wechsel sperren (wie vom Auftrag „keine Medien,
   keine Notizen/Beiträge" bereits nahegelegt), oder ist das separat zu behandeln?
5. **Zählt ein leerer, `snapshot_mode='inherited'`-`release_crew_snapshots`-Eintrag selbst als
   „etwas hängt dran"?** 162 von 175 heutigen Paaren haben einen solchen Eintrag, aber keine
   echten Credit-/Crew-Zeilen. Diese Analyse geht davon aus, dass ein reiner `'inherited'`-Snapshot
   ohne zugehörige `release_role_credit_lifecycles`-Zeilen NICHT als Anhang zählt (Stufe 1 bliebe
   offen) — bitte bestätigen oder korrigieren.
6. **Wo genau soll der Guard greifen und wie soll die Sperr-Meldung angezeigt werden?** Serverseitig
   vor dem Speichern (Backend lehnt das PATCH mit einer strukturierten Fehlerantwort ab, Frontend
   zeigt sie an) ist laut D-02 Pflicht — zusätzlich auch client-seitig vorab deaktiviert/ausgegraut
   (z. B. das „×" am Chip deaktiviert, mit Tooltip), oder reicht eine Fehlermeldung nach
   Speichern-Klick?
7. **Gilt die Sperre auch für Gruppenleiter, oder nur für Admins?** Heute können ausschließlich
   Platform-Admins das Gruppenfeld überhaupt ändern (kein Gruppenleiter-Pfad existiert). Ist diese
   Frage rein zukunftssichernd gemeint (falls Gruppenleiter-Rechte für dieses Feld später erweitert
   werden), oder soll in dieser Phase bereits ein Gruppenleiter-Pfad mitbedacht werden?
8. **Soll der Guard an beiden Schreibstellen gleichzeitig eingebaut werden** — Editor-Pfad
   (`episode_version_repository_write_helpers.go`) UND Episoden-Import-„Übernehmen"-Pfad
   (`episode_import_repository_release_helpers.go`) — oder zunächst nur im Editor, mit dem
   Import-Pfad als Folgearbeit?
9. **Ist der Fansub-Gruppen-Merge-Pfad (Abschnitt 6, `fansub_repository_merge_core.go`) Teil dieser
   Phase?** Gleiche Wurzelursache (Composite-Key ohne Dependenz-Guard bei `UPDATE` statt `DELETE`),
   aber ein anderer Auslöser (Gruppen-Zusammenführung statt Release-Bearbeitung) und bisher nicht
   im Auftrag erwähnt.
10. **Soll die Inkonsistenz zwischen Editor-Pfad und Import-Pfad bei leerer Gruppenliste** (Editor:
    löscht alle Gruppen; Import: bricht früh ab, löscht nichts) im Zuge dieser Phase vereinheitlicht
    werden, oder ist das außerhalb des Scopes?
