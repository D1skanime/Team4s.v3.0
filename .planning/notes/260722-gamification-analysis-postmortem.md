# Post-mortem — Warum aus dem Gamification-Analyseauftrag ein Medien-Neubau wurde

**Datum:** 2026-07-22
**Ergebnis:** Der Analyseauftrag war im Kern korrekt. Die Fehlentwicklung entstand in der Analyse- und Entscheidungsübergabe danach.

## 1. Was der Auftrag richtig vorgab

Der ursprüngliche Auftrag verlangte ausdrücklich:

- zuerst Codebasis, Datenbank und UI untersuchen
- bestehende Daten und Komponenten wiederverwenden
- historische Fansub-Leistung von Plattformarbeit trennen
- keine vorschnelle Implementierung oder Migration
- keine Tabellen oder APIs auf Verdacht
- mindestens Minimal-, Mittel- und Vollausbau vergleichen
- alle Empfehlungen mit konkreten Fundstellen belegen

Damit verbot der Auftrag genau den später entstandenen Big-Bang-Umbau.

## 2. Kleine Schwächen des Auftrags

Der Auftrag war sehr breit und umfasste Profile, Beiträge, Rollen, Medien, Reviews, Badges, Ranglisten, UI, Performance und technische Architektur in einem Durchlauf. Außerdem verlangte der Ergebnisabschnitt Listen „fehlender Felder“, „notwendiger Migrationen“ und möglicher neuer Tabellen. Das konnte einen lösungsorientierten Agenten in Richtung Schemaentwurf lenken.

Diese Punkte erklären eine gewisse Tendenz, rechtfertigen aber nicht das Ergebnis. Die Leitplanken „keine Tabellen auf Verdacht“, „Bestand zuerst“ und „Varianten vergleichen“ waren eindeutig.

## 3. Der eigentliche Fehlschluss

Aus korrekten Gamification-Fragen wurden falsche technische Gleichsetzungen:

| Fachliche Frage | Falsche Ableitung | Richtige Ebene |
|---|---|---|
| Wer erhält Punkte? | Jeder Medienpfad braucht ein neues einheitliches Owner-Modell. | Punkte gehören zu `members`; der Account ist optionaler Akteur. |
| Wie verhindert man Doppelpunkte? | Dateien müssen per SHA-Hash global dedupliziert werden. | Das Punktebuch dedupliziert fachliche Quellen und Regelversionen. |
| Wann zählt ein Beitrag? | Jede Medienrelation braucht denselben Review-Feldsatz. | Bestehende kontextspezifische Reviews werden adaptiert; fehlende Review-Seams werden gezielt ergänzt. |
| Wie misst man Qualität? | Textmenge, Metadatenvollständigkeit und mögliche Kopien technisch bewerten. | Berechtigte Vier-Augen-Prüfung entscheidet; Punktwerte bleiben fest. |
| Wie zählt Mehrfachverwendung? | Eine globale Medienverwendungstabelle beziehungsweise ein neuer Medienkern ist nötig. | Beitrag, Urheberschaft, Upload und Verwendung sind getrennte fachliche Ereignisse. |

## 4. Nachweisbare Eskalationskette

1. Eine nicht mehr als kanonischer Bericht vorhandene „Deep-Analyse“ schlug laut späterem Entscheid zunächst ein polymorphes `media_usage` vor.
2. Der folgende Architekturentscheid verwarf dieses Modell, führte aber stattdessen neue Tabellen `media` und `media_variant` sowie einen universellen Feld-Contract ein.
3. Ein gewünschtes Gamification-System wurde dadurch zu einem „Medienmodell-Neubau“ mit fünf Phasen.
4. Die Planung versuchte anschließend Uploads, Storage, Validierung, Relationen, Frontendtypen, Seeds und E2E gemeinsam umzustellen.
5. Erst die erneute Consumer-/Codeprüfung zeigte, dass `media_assets` und `media_files` bereits der aktive, breit verwendete Kern sind und `media_files` die Variantenfunktion erfüllt.

Der entscheidende Scope-Bruch war somit der Übergang von einer **Gamification-Fit-Gap-Analyse** zu einem **bindenden Medien-Architekturentscheid**. Der ursprüngliche Auftrag verlangte diesen Entscheid nicht.

## 5. Methodische Fehler

### 5.1 Schema-Inventar statt Laufzeit- und Consumer-Kette

Ähnliche, alte oder unterschiedlich geformte Tabellen wurden als Inkonsistenz gewertet. Es wurde nicht zuverlässig für jeden angeblich toten Pfad vom Backend über API und Frontend bis zum Dateisystem-/Cleanup-Consumer geprüft. Dadurch wurden aktive Pfade als entfernbar eingestuft.

### 5.2 Unterschiedliche Domains wurden als Duplikation missverstanden

Anime-Stammdaten, Gruppenmedien, Release-Version-Medien und Profilmedien besitzen absichtlich unterschiedliche Ownership-, Rechte-, Crop- und Review-Regeln. Aus technischer Ähnlichkeit wurde fälschlich die Pflicht zu einem gemeinsamen Fachservice und einem gemeinsamen Relationscontract abgeleitet.

### 5.3 Minimalvariante wurde nicht als Gegenbeweis erzwungen

Vor dem Großumbau wurde nicht bewiesen, warum ein separates Punktebuch plus schmale Quellenadapter unzureichend wäre. Hätte die Analyse zuerst den kleinsten vertikalen Slice modelliert, wäre sichtbar geworden, dass Gamification keine neue Dateiablage benötigt.

### 5.4 Wegwerfbare Testdaten wurden mit wegwerfbarer Architektur verwechselt

Die Erlaubnis, Testdaten später zurückzusetzen, beseitigt keine aktiven Code-Consumer, API-Verträge, Uploadlogik oder Dateisystem-Lifecycles. Sie wurde dennoch als Risikosenkung für einen strukturellen Cutover behandelt.

### 5.5 Planung konsumierte Korrekturen nicht zuverlässig

Selbst nachdem `media`/`media_variant` ausdrücklich verworfen worden waren, referenzierten spätere Phase-107-Pläne diese Zielstruktur weiterhin. Das zeigt einen fehlenden harten Source-of-Truth- und Drift-Gate zwischen Entscheidung, Research und Plan.

## 6. Folgen, wenn ausgeführt

Der Umbau hätte funktionierende Upload-, Lese-, Crop-, Preview-, Cleanup- und Relationspfade gleichzeitig verändert. Mehrere aktive Consumer wären entfernt oder still entkoppelt worden. Der Aufwand hätte Monate betragen und zunächst keine neue Gamification-Funktion geliefert.

## 7. Verbindliche Schutzregeln für die Neuplanung

1. Jede Phase muss einen sichtbaren Gamification-Nutzen liefern; reine Medien-Neuordnung ist kein Ziel.
2. Vor jeder neuen Tabelle oder API muss ein bestehender fachlicher Anker samt Producer-/Consumer-Kette dokumentiert werden.
3. Deduplizierung erfolgt auf Punkte-/Quellenebene, nicht automatisch auf Datei-Hash-Ebene.
4. Domain-Flows bleiben getrennt; nur kleine technische Primitives dürfen geteilt werden.
5. Der Minimalansatz muss als Baseline geplant und widerlegt werden, bevor ein größerer Umbau zulässig ist.
6. Keine Entfernung eines Pfads ohne nachgewiesene Laufzeit-Unerreichbarkeit und vollständige Consumer-Kette.
7. Research, Context, Roadmap und Plans müssen denselben aktuellen Architekturentscheid referenzieren; widersprüchliche Zieltabellen sind ein BLOCKER.
