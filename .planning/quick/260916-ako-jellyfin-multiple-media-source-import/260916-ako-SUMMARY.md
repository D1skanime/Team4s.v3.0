---
phase: quick
plan: 260916-ako
status: complete
completed: 2026-09-16
baseline_commit: 44268512
implementation_commit: c61459bc
followup_commit: 0cda1dd7
human_uat: partial_delete_fix_approved_2026-09-16
---
# Quick 260916-ako — Jellyfin-MediaSources vollständig importieren

## Ergebnis

Ursache war eine durchgehende Gleichsetzung von Item und Datei: Auswahl einer einzigen MediaSource, Item-basierte Vorschau-/Formularschlüssel, Item-basierte Duplikatprüfung und eine Datenbank-Eindeutigkeit pro Provider/Item. Mehrere physische Dateien eines Items konnten deshalb weder vollständig ausgewählt noch getrennt gespeichert werden.

Jetzt ist das geprüfte Paar aus tatsächlicher Item-ID und MediaSource-ID die Kandidaten-/Command-Identität. Der Server lädt die echten Items erneut, prüft die ausgewählte Mitgliedschaft und den Animekontext und ersetzt vom Browser kommende technische Angaben. Die private vorhandene Source-Projektion bleibt die einzige gespeicherte Quelle für technische Metadaten. Aliasdarstellungen werden anhand gleicher Source-ID und übereinstimmender autoritativer Pfad-/Episodenevidenz zusammengeführt; gleiche Pfade mit unterschiedlichen IDs werden nicht zusammengelegt.

## Beleg am tatsächlichen 11eyes-Bestand

27 echte Items enthalten 52 Source-Darstellungen. Nach Entfernung von 14 Aliasdarstellungen bleiben **38 eigenständige Sources**, davon zwei OVA-Quellen. Der Regressionstest prüft das exakte ID-Set und die Dateinamen von Folge 2/3; 38 ist eine Eigenschaft dieses Datensatzes, keine allgemeine Zählregel.

Die aktuelle Animekonfiguration begrenzt den Import auf den Serienordner. Beide OVAs liegen außerhalb dieses Ordners und bleiben durch die unveränderte Ownership-Prüfung ausgeschlossen. Deshalb bietet die konkrete Vorschau **36 Ordnerquellen minus drei bestehende Folge-1-Importe = 33 Dateien** an. Die anfängliche Planannahme von 35 war vor der Live-Ordnerprüfung zu weit gefasst und wird hier ausdrücklich korrigiert.

Bei Folge 2 und Folge 3 wurden jeweils B-SH, FlameHazeSubs und Strawhat separat im gemeinsamen Browser angezeigt. Anschließend wurden genau zwei Folge-2-Dateien gemeinsam über den normalen Importflow gespeichert; alle 31 übrigen Kandidaten wurden für diesen Vorgang übersprungen.

| Datei | Release-Version | Variante | stream_source | Container / Audio / Untertitel |
|---|---:|---:|---:|---|
| 11eyes.S01E02-B-SH.mkv | 53 | 53 | 54 | MKV / FLAC / ASS de |
| 11eyes.S01E02-FlameHazeSubs.mp4 | 54 | 54 | 55 | MP4 / AAC / keine separate Untertitelspur |

Beide verwenden Item `8ecfdc1bef67653980da6e070c46b8a5`, aber unterschiedliche Source-IDs: `8ecfdc1bef67653980da6e070c46b8a5` und `040f9c01d009765bc105b50e8150ae91`. Gruppen sind getrennt B-SH beziehungsweise FlameHazeSubs. Der reguläre Editor öffnet die richtige Datei samt eigener Größe/Auflösung/Laufzeit: 2.3 GB/1080p/24:56 und 197 MB/720p/25:29.

Eine neue Vorschau enthält **31 Dateien**: Die beiden importierten Quellen fehlen korrekt, Strawhat für Folge 2 bleibt verfügbar und Folge 3 zeigt weiterhin drei Kandidaten. Keine weitere Datei wurde importiert. Rohbeleg ohne Credentials oder private Dateipfade: `260916-ako-LIVE-EVIDENCE.json`.

## Umsetzung und Commits

1. `48e31cf9`: Backend-RED für verlorene Geschwisterquellen und abgewiesenen gemeinsamen Import.
2. `52e34e5b`: Frontend-RED für Item-basierte Auswahl-/Review-/Pending-/Entfernungskollisionen.
3. `dfc548a5`: Frontend und Verträge auf die geprüften Paare umgestellt.
4. `c61459bc`: Backend, bestehende Source-Persistenz, Migration 0166 und Regressionen.
5. Separater Abschlusscommit enthält ausschließlich diese GSD-Belege, STATE und DECISIONS.

Alle drei Plan-Tasks wurden ausgeführt. Genau ein Quick, keine neue Phase, kein ROADMAP-Umbau. Keine Übernahme unzusammenhängender Änderungen, kein Push.

Backend: gemeinsame MediaSource-Projektion/Enumeration, Import-DTO/-Validierung/-Hydration, Source-Bindings/Importrepository und vorhandene Editor-Lese-/Schreibauswahl. Frontend: Mappinghelper, Builder, Zeilen/Keys/Actions, Seite und Dateiauswahl des bestehenden Editors. Ein kleiner gemeinsamer JSON-Paar-Key ersetzt doppelte Identitätslogik; keine Pfadidentität. Verträge: openapi.yaml, admin-content.yaml, episode-versions.yaml und TypeScript. Vollständige Dateilisten und Tests stehen in den getrennten BACKEND-/FRONTEND-SUMMARY-Dateien sowie im Git-Diff `44268512..c61459bc`.

## Schema und Laufzeit

Migration 0166 ersetzt die bisherige Provider-/Item-Unique-Constraint durch getrennte Schranken für ausgewählte Jellyfin-Sources und unaufgelöste beziehungsweise andere Providerquellen. Der vorhandene private JSONB-Snapshot bleibt maßgeblich; keine neue Tabelle/Registry und kein Backfill. Vorherige Live-Prüfung: 16 Sources, vier Snapshots, null fehlerhafte Snapshots, null doppelte Source-IDs. Der Runner zeigte ausschließlich 0166 als ausstehend.

Backend-Image aus dem vollständigen geprüften Stand gebaut und nur den Backendservice neu erstellt. Der bestehende Startmechanismus wandte 0166 vor dem Serverstart an. Danach: 166 Migrationen angewendet, null ausstehend. Kein Reset, keine Änderung von .env, Medien, NAS oder Jellyfin; kein Rescan. Der begrenzte Zwei-Dateien-Liveimport war Bestandteil des ausdrücklich angeforderten Abnahmefalls.

## Checks

- Backend relevant: **348 bestandene Testereignisse, null Fehler/Skips**; reale PostgreSQL-Persistenz, Migration Up/Down/Verweigerung, Wiederholung/Aliase, Konkurrenz, Source-/Stream-/Kapitelkohärenz.
- Backend vollständig handlers/repository/models: 1.970 Pass-, 224 Skip-, 60 Fail-Ereignisse. **Exakt dieselbe Fehlermenge** wie im eingefrorenen Ausgangscommit (dort 1.944 Pass); null neue Fehler. Keine Behauptung einer vollständig grünen Gesamtsuite.
- Go build/vet: bestanden.
- Frontend: **124 Tests in sechs Dateien bestanden**, einschließlich zentraler Auth-Refresh-Grenze. Typecheck bestanden.
- Global ESLint unverändert: **3 Fehler / 319 Warnungen**. Berührte Frontenddateien: null Fehler, zwölf vorhandene Warnungen.
- Voller Produktionsbuild vor/nachher scheitert am gleichen bestehenden `buildCreateSuccessMessage`-Pageexport unter anime/create; Kompilierung jeweils erfolgreich. Isolierter Produktionsbuild der beiden betroffenen Routen bestanden; Dev-.next unberührt.
- Kanonisches OpenAPI vollständig parsebar. Zwei unveränderte globale Syntaxfehler in den fokussierten YAML-Dateien separat belegt; betroffene Vertragsabschnitte parsebar.
- Git-Diffprüfung bestanden. Browser bei 1062×980 und 390×844 ohne horizontalen Dokumentüberlauf; Override zurückgesetzt und ungespeicherte Prüfauswahl durch Neuladen verworfen.

## Grenzen / offene Entscheidungen

Fehlende/doppelte Source-IDs, widersprüchliche Aliasdaten, fremde Animezuordnung und mehrdeutige alte Verknüpfungen werden abgewiesen. Im echten Datensatz gab es keine fehlenden IDs; Negativfälle sind durch Fixtures geprüft. Kein spekulativer Pfad-Fallback. Die physische Source-ID gilt innerhalb des derzeit einzelnen konfigurierten Jellyfin-Servers; ein Mehrservermodell ist nicht Teil dieses Auftrags. Source-/Pfadwechsel sind keine Erlaubnis für automatische Zusammenlegung.

Ein Schema-Rollback auf die frühere Item-Eindeutigkeit ist nach dem Import mehrerer Geschwisterquellen bewusst gesperrt. Er löscht oder vereinigt keine Daten. Die bestehenden globalen Prüfprobleme bleiben außerhalb des Scopes. Vorherige Phasen-/Human-UAT-Einträge bleiben unverändert; Liveprüfung durch den Agenten ist kein menschlicher Sign-off. Weitere Phase-161-Relink-/Rescan-/Kaltstart-UAT wird nicht pauschal geschlossen.

Zusätzlicher beobachteter Bestandsbefund: Im Basisdatenformular heißt das separate redaktionelle Feld Untertitel-Typ nach neuem Import weiterhin „keiner“, obwohl der technische Source-Snapshot ASS enthält. Der vorliegende Fix ändert dieses bisherige Importfeldverhalten nicht; technische Tracks wurden korrekt gespeichert. Kein technischer Sourceverlust und keine unbelegte Hardsub-Ableitung.

## Nachtrag 16.09.2026 — Löschregression behoben

Live-UAT fand einen im vorherigen Testumfang nicht ausgeführten Delete-Pfad: c61459bc hatte dessen Zielsortierung versehentlich um nicht verbundene ss/rs-Aliase erweitert. HTTP500/SQLSTATE42P01 bestätigt. Fix 0cda1dd7 stellt ausschließlich die ursprüngliche Varianten-Zielsortierung wieder her; drei neue echte PostgreSQL-Regressionen wurden zuerst rot und dann grün nachgewiesen. Frische relevante Suite: 351 bestanden, null Fehler/Skips; Go build/vet und Typecheck bestanden, globaler Lint unverändert. Backend neu aktiviert, reale Zielabfrage für Versionen53/54 rein lesend erfolgreich. Keine Löschung von Nutzerdaten durch den Agenten. Vollständiger Nachweis: 260916-ako-DELETE-GAP.md.

Nutzerabnahme am 16.09.2026: „approved“ für den aktivierten Löschfix 0cda1dd7. Diese gezielte Abnahme schließt keine weiteren UAT-Punkte des Multi-Source-Imports oder anderer Phasen.
