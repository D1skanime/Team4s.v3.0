---
status: diagnosed — fix pending
trigger: >
  Regression nach Review-Fix 389bd52a2 ("Ab-hier-Baseline live statt eingefrorener
  Preview-Snapshot"). Live-UAT auf /admin/anime/13/episodes/import (Freezing):
  Dateien *-M-L.mkv haben den Freitext-Chip "M-L". Nutzer aendert bei
  Freezing.S01E01-M-L.mkv den Chip auf die bestehende Gruppe "MelonSubs" und
  klickt "Ab hier" -> nichts passiert, S01E02-M-L/S01E03-M-L... behalten "M-L".
created: 2026-10-18
updated: 2026-10-18
---

# Debug Session: ab-hier-two-step-chip-change-regression

## Symptoms

- **Expected (D-01):** Nach Aendern des Chips einer Zeile von "M-L" auf "MelonSubs"
  und Klick auf "Ab hier" sollen alle Zeilen ab hier mit dem alten Wert "M-L" (und
  leere Zeilen) "MelonSubs" bekommen; Zeilen mit anderen Gruppen (Bloody-Shadow,
  LazySubs) bleiben unveraendert.
- **Actual:** Nichts passiert, alle M-L-Folgezeilen bleiben bei "M-L".
- **Reproduktion:** `/admin/anime/13/episodes/import`, Zeile mit Freitext-Chip
  "M-L": Chip anklicken (entfernt ihn), "MelonSubs" suchen und aus den
  Suchergebnissen waehlen (fuegt ihn hinzu), dann "Ab hier" klicken.

## Evidence

### UI-Mechanik bestaetigt: Chip-Wechsel ist IMMER ein Zwei-Schritt-Vorgang

`EpisodeImportMappingRowGroupField.tsx`: jeder bestehende Chip ist selbst der
Entfernen-Button (`onClick={() => onRemoveSelectedFansubGroup(sourceKey, group)}`,
Zeile 172). Ein Suchergebnis anklicken ruft `handleSelectExistingGroup` ->
`onAddSelectedFansubGroup(sourceKey, {...})` (Zeile 136-137) -- eine reine ADD-
Operation, kein Replace. Es gibt in dieser UI KEINEN Einzelschritt-"Ersetzen"-Weg
fuer einen bereits vorhandenen Chip -- jede Aenderung eines bestehenden Chips auf
eine andere Gruppe ist technisch zwingend: (1) alten Chip anklicken = entfernen,
dann (2) neue Gruppe suchen+anklicken ODER Freitext tippen+Enter = hinzufuegen.

### Root Cause bestaetigt (Hypothese a): der Vor-Edit-Ref wird beim ZWEITEN Schritt ueberschrieben

`useEpisodeImportBuilder.ts` (seit Review-Fix 389bd52a2): `rowGroupsBeforeLastEditRef`
wird von ALLEN DREI Mutator-Funktionen (`setSelectedFansubGroups`,
`addSelectedFansubGroup`, `removeSelectedFansubGroup`) bei JEDEM Aufruf
BEDINGUNGSLOS neu gesetzt (`rowGroupsBeforeLastEditRef.current.set(sourceKey,
existing.fansub_groups ?? [])`, Zeilen 369/375/381), unabhaengig davon, ob fuer
diese Zeile bereits ein Vor-Edit-Wert aus einem vorherigen Schritt im SELBEN
logischen Bedienvorgang gespeichert ist.

Ablauf bei "M-L" -> "MelonSubs" (zwei Schritte):
1. Chip "M-L" anklicken -> `removeSelectedFansubGroup` -> Ref wird auf `["M-L"]`
   gesetzt (korrekt, das IST der Wert vor diesem Schritt) -> Zeile wird `[]`.
2. "MelonSubs" aus Suchergebnissen waehlen -> `addSelectedFansubGroup` -> Ref wird
   auf `[]` **ueberschrieben** (das ist der Zeilenwert direkt VOR diesem zweiten
   Schritt -- der ist aber durch Schritt 1 bereits leer, NICHT mehr "M-L")! Der
   echte Ausgangswert "M-L" geht damit verloren. Zeile wird `["MelonSubs"]`.
3. "Ab hier" klicken -> `applyFansubGroupFromEpisode(sourceKey, [MelonSubs])` liest
   `oldFansubGroups = ref.get(sourceKey) = []` (leer, FALSCH, sollte "M-L" sein).
   `fansubGroupsValueKey([])` ist der leere String `""`. `applyGroupFromHere` prueft
   pro Folgezeile `value === oldValue || value === ''` — mit `oldValue = ""`
   bedeutet das: NUR tatsaechlich leere Zeilen wuerden matchen. Die M-L-Folgezeilen
   sind aber NICHT leer (haben "M-L"), matchen also nicht gegen `oldValue=""` UND
   sind selbst nicht leer -> **keine Zeile wird ersetzt.** Exakt das beobachtete
   Symptom.

Das betrifft NICHT nur den Suchergebnis-Weg, sondern symmetrisch auch den
Freitext-Weg (`handleAddFreeTextChips` -> `onSetSelectedFansubGroups`, Zeile
127-130) als zweiter Schritt nach einem Entfernen -- derselbe Ref-Ueberschreib-Fehler
greift bei JEDEM zweiten Mutator-Aufruf auf dieselbe Zeile, unabhaengig vom
konkreten Bedienweg.

### Zusatzbefund — "MelonSubs"-Alias: keine DB-Evidenz gefunden

Nur-lesende Pruefung von `fansub_groups`/`fansub_group_aliases` (Live-DB
`team4s_v2`): **kein** Eintrag fuer eine Gruppe "MelonSubs" und **kein** Alias
"M-L" existiert in der Datenbank. Es gibt daher keinen Beleg fuer eine
Backend-seitige Alias-Aufloesung "M-L" -> "MelonSubs", die durch die
anitogo-/Parser-Aenderungen (Phase 186) verloren gegangen waere -- eine solche
Zuordnung war in der Datenbank nie hinterlegt. Die wahrscheinlichste Erklaerung:
"MelonSubs" wurde in einer fruehreren Sitzung bereits manuell als Chip gesetzt
(nicht durch Alias-Automatik), und das eigentliche, hier bereits vollstaendig
erklaerte "Ab hier"-Problem liess diese manuelle Zuordnung dann nicht auf die
Folgezeilen durch. Keine zusaetzliche, separate Backend-Regression gefunden;
falls der Nutzer sich an eine ECHTE automatische Alias-Anzeige erinnert, bitte
gegebenenfalls mit einem konkreten, reproduzierbaren Beispiel nachliefern --
diese Untersuchung kann aus den vorhandenen Daten keine solche Automatik
belegen.

## Eliminated

- hypothesis (b): Vergleich laeuft ueber Gruppen-IDs, Freitext-Chips ohne ID
  matchen nie / werden anders normalisiert. Eliminiert durch Code-Lektuere von
  `fansubGroupsValueKey`/`getFansubGroupKey` (unveraendert seit dem urspruenglichen
  D-01-Fix) -- der Normalisierungsschluessel ist name-basiert (klein geschrieben,
  getrimmt) fuer Freitext-Eintraege, nicht ID-basiert; zwei unabhaengig erzeugte
  "M-L"-Freitext-Chips erzeugen denselben Schluessel. Der tatsaechliche Fehler
  liegt ausschliesslich im Ref-Ueberschreiben (Hypothese a), nicht im
  Vergleichsschluessel selbst.

## Resolution

**Root Cause:** `rowGroupsBeforeLastEditRef` wird bei jedem der drei
Mutator-Aufrufe bedingungslos ueberschrieben, statt nur beim ERSTEN Mutator-Aufruf
seit dem letzten "Ab hier"/"Ab hier entfernen"-Klick auf dieser Zeile gesetzt zu
werden. Ein Chip-Wechsel ist in dieser UI strukturell immer mindestens zwei
Mutator-Aufrufe (entfernen + hinzufuegen) -- der zweite Aufruf ueberschreibt die
korrekte Baseline aus dem ersten mit einem bereits veraenderten Zwischenzustand.

**Fix (wird jetzt umgesetzt):** Ref nur setzen, wenn fuer den `sourceKey` noch
KEIN Eintrag vorhanden ist ("erster Mutator-Aufruf seit der letzten Konsumierung
gewinnt, nicht der letzte"); Ref-Eintrag nach Konsum durch
`applyFansubGroupFromEpisode` (beide Zweige, "Ab hier" UND "Ab hier entfernen")
wieder loeschen, damit die naechste unabhaengige Bearbeitung derselben Zeile neu
von ihrem dann aktuellen Wert aus startet. Das bewahrt gleichzeitig das aus dem
vorherigen Review-Fix bereits geforderte Verhalten bei mehreren GETRENNTEN
"Ab hier"-Klicks mit Zwischenbearbeitung (jeder Klick konsumiert+loescht seine
eigene Baseline, der naechste faengt sauber neu an).
