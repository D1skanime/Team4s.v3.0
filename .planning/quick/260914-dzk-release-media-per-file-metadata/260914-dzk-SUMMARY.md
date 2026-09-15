---
phase: quick-260914-dzk
plan: 01
status: complete
completed: 2026-09-14
human_uat: passed
human_uat_signed_off: 2026-09-15
---
# Release-Mehrfachupload: eigene Titel/Texte und eindeutige Vorschau

Ausgang: `6cd178d0c5d48895af6a2edeaa9782dc9a24545a`. Codeabschluss: `2f2d964fed9e74f323ac40a520850fe17edc499f`.

## Ergebnis

Der bestehende Kategorie-Uploaddialog zeigt genau eine editierbare Zeile pro ausgewählter Datei: Bild, Dateiname, optionaler Titel, eigene Beschreibung, Entfernen und später Status/Fehler/Retry. Globale Beschreibung und globale Vorschaucheckbox sowie doppelte Thumbnail-/Queuelisten entfallen. Mobil stehen Felder unter dem Bild, ab ausreichender Containerbreite daneben. Gemeinsame Button/Input/Textarea/FormField/Drawer-Primitives und vorhandene Tokens werden verwendet; keine neue Uploadengine oder Medienregistry.

Die explizite Radioauswahl erlaubt keine neue Vorschau oder genau ein ausgewähltes Bild. Ohne Auswahl bleibt die bestehende Vorschau; Entfernen der gewählten Datei hebt ihre Auswahl auf. Scheitert ihr Upload/Metadatenrequest, springt die Auswahl nicht zu einer anderen Datei. Pro-Datei-Angaben sind beim Upload eingefroren. Erfolgreich hochgeladene Binärdateien werden bei Metadaten-Retry nicht dupliziert: dieselbe Relation-ID und Source-Revision bleiben erhalten. Batchzuordnung erfolgt über die zugesicherte Eingabereihenfolge, nicht Dateinamen.

Titel ist ein eigenständiges nullable Feld auf `release_version_media`, max.200 Unicodezeichen, unabhängig von caption. PATCH: missing unverändert, null/trimmed empty löscht. Multipart-Replace verwendet denselben Parser. Migration0163 wurde nach isoliertem Up/Down/Up und alleiniger Pending-Prüfung angewendet. Keine neuen Tabellen, Backfills oder Datenzuordnungen. Bestehende Vorschau-Clear/Set-Transaktion sperrt zuerst die Release-Version, damit konkurrierende Wahlen nicht zwei Vorschaubilder erzeugen.

Titel/Text bleiben auch in späterer Bearbeitung, Releasegalerie, Projektpreview, Projekt-Member-Karte/Viewer und eigener Medienvorschau getrennt. Alle sechs direkten Backend-Leseprojektionen sind erweitert; ungenutzte Legacyanzeigen bleiben unverändert. Consumer-Matrizen wurden vor Änderungen erstellt. Titel in „Letzte Beiträge“ war bereits vorgesehen und wird nun aus der Medienrelation projiziert.

## Verifikation

| Prüfung | Ergebnis |
|---|---|
| Frontend |128/128 Tests in9 Dateien, letzter Lauf mit einem Worker |
| Backend |6 fokussierte Tests mit13 Unterfällen;0 Fehler/Skips, echter isolierter PostgreSQL |
| Migration |0163 Up/Down/Up isoliert grün; Laufzeit163 applied,0 pending |
| Typecheck |Finaler `npm run typecheck` grün; früherer generierter Anime-Cachefehler dokumentiert |
| Globales Lint |13 bekannte Fehler/329 Warnungen; Ausgang13/331; keine neue Diagnose |
| Produktionsbuild |Compile grün; bekannter ungültiger `formatEditLoadError`-Pageexport blockiert Gesamtabnahme |
| Uploadbrowser |390x844 Touch,768x1024 Tastatur,1440x900 Maus; Rootbreite exakt Viewport |
| Öffentliche Galerie |390/1440, HTTP200, getrennte Texte,3erNavigation/Fallback/Escape/Fokus grün |
| Live API |Health200, Release28/49 jeweils200, geschützte Media-API ohne Session401 |
| Diff |`git diff --check` grün |

Gezielte Fälle: drei unterschiedliche Titel/Texte, gleiche Dateinamen, Auswahl entfernen und wieder hinzufügen, alte Vorschau bei gewähltem Fehler behalten, gezielter Retry ohne zweiten Binaryupload, Reload und unabhängige Nachbearbeitung, fehlender/abgelaufener Access mit gültigem Refresh über zentralen API-Client, Revision409, Titeltyp/Länge/null/empty/missing, parallele Previewwahlen und alle direkten öffentlichen SQL-Projektionen.

## Request-/SQL-Auswirkung

Vorhandener Batch-POST plus vorhandener PATCH je Bild mit Metadaten bleiben der Transport. Keine neuen Readrequests durch Texteingabe/Auswahl und keine neue Abfrage pro öffentlichem Bild; title ergänzt bestehende SELECT/Scan-Projektionen. Browserfixture pro Viewport:1 BatchPOST für3 Dateien,3 individuelle PATCHes,1 gezielter PATCH-Retry nach simuliertem500,1 späterer Edit-PATCH. Erfolgreiche Binärdatei wird nicht erneut übertragen. Öffentlicher Viewer erzeugt0 weitere API-Reads. Previewmutation erhält genau eine schmale `SELECT ... FOR UPDATE` auf die Version vor bestehendem Clear/Set. Kein ungemessener Durchsatzgewinn behauptet. XHR-Prozentanzeige bezieht sich weiterhin auf den gesamten Multiparttransfer; Status/Fehler/Retry sind individuell.

## Belege und Dateien

- Vollständige geänderte Dateien: [CHANGED-FILES.md](CHANGED-FILES.md).
- Consumer: [UI](UI-CONSUMERS.md), [Hook/Transport](HOOK-CONSUMERS.md), [öffentliche Frontends](FRONTEND-CONSUMERS.md), [Backend/Vertrag](BACKEND-CONSUMERS.md).
- [Frontend-Verifikation](FRONTEND-VERIFICATION.md), [Backend-Verifikation](BACKEND-VERIFICATION.md), [Runtime-Aktivierung](RUNTIME-VERIFICATION.md).
- Repro: `browser-check.cjs`, `browser-public-check.cjs`, `run_backend_focused.py`, `build-check.cjs`, `frontend-test-command.json`.
- Ergebnisse: `browser-results.json`, `backend-focused-final.json`, `runtime-smoke.json`, `public-browser-evidence/browser-public-results.json`.
- Lokale Browserbilder: `{390,768,1440}-upload-{drafts,retry}.png`, `public-browser-evidence/{390,1440}-public-{gallery,viewer}.png`.

## Grenzen und verbleibende Risiken

Angemeldete Human-UAT mit echten Uploads und Review/Freigabe bleibt offen. Der In-App-Browser hat keine Session und zeigt den korrekten Loginhinweis; API-Fixtures ersetzen keinen menschlichen Sign-off. Frühere Human-UAT-Punkte156/157/158/159 unverändert. Desktop-Public-Viewerbild im ersten Screenshot noch im Ladezustand; Text und DOM-Prüfungen bestanden.

Die breite Backend-Regressionssuite wurde beim vorübergehenden VM-Ressourcenmangel unterbrochen und wird nicht als bestanden bezeichnet. Finale fokussierte Tests wurden danach mit RAM-/Workerlimits vollständig wiederholt. Eigene isolierte Testcontainer/-prozesse sind entfernt; Frontend-Devserver zum Freigeben seines angewachsenen Heaps einmal kontrolliert neugestartet. Der isolierte Build ließ die laufende .next-Ausgabe unangetastet. Für weitere breite Prüfungen auf dieser8GB-VM Workerzahl begrenzen.

Bestehender eigener Recent-Media-Reader vergleicht App-/Legacy-Uploader-IDs anders als neuere Projektionen; dokumentiert, fachliche Ownership nicht nebenbei verändert. Ein Jellyfin401/Asset502 im Laufzeitlog ist vorbestehend und hier nicht behoben. Alte Anime-/Admin-Build-/Lintthemen bleiben außerhalb des Fixes.

Keine echten Medienuploads, Änderungen vorhandener Datenzeilen, Resets/Re-Seeds, .env-/Medienoriginal-/Volumenänderungen oder zusätzlichen Produktentscheidungen. Einzige Runtime-Schemaänderung ist die ausdrücklich genehmigte additive Titelspalte. Fremde `frontend/scripts/shot2.mjs` bleibt unangetastet. Kein Push, keine Roadmap- oder Phasenschließung.
