# Technische Verifikation — Quick 260916-ako

Datum: 16.09.2026. Codeabschluss c61459bc, Start 44268512. Technischer Auftrag bestanden, Human-UAT nicht behauptet.

## Pflichtmatrix

| Fall | Beleg | Ergebnis |
|---|---|---|
| Ein Item/eine Source | Handler- und Sourcefixture | bestanden |
| Ein Item/drei Sources | exaktes Fixture-Set, Live Folgen 2/3 | bestanden |
| Eigenständige Items derselben Folge | Enumeration-/Importtests | bestanden |
| Verschachtelte und eigenständige Aliase | 52 Darstellungen, 38 Source-IDs, 14 entfernte Aliase; Reihenfolgevariante | bestanden |
| Zwei Sources desselben Items gemeinsam | echter PostgreSQL-Test und gemeinsamer Live-Command mit zwei bestätigten Dateien | bestanden |
| Identisches Paar doppelt | Backend-Validierung, Repository, Frontendreview | abgewiesen |
| Dieselbe physische Source über Aliaspaare | Command-/Persistenz-/Konkurrenztests | keine Doppelanlage |
| Fremde/veraltete Source oder falscher Anime | serverseitige Rehydrations-/Ownershiptests | abgewiesen/atomarer Rollback |
| Fehlende/doppelte Source-ID | Enumeration-/Contracttests | expliziter Konflikt, keine erfundene Identität |
| Bereits importierte Source | Fixture sowie erneute Livevorschau | nur diese Source entfällt |
| Auswahl/Skip/Pending/Entfernen pro Paar | RED/GREEN Hook-/Zeilentests; separate Live-Reaktivierung | bestanden |
| Editor liest und schreibt denselben Stream | Multi-Stream-Read-/Relink-Regression; Editor 53/54 live | bestanden |
| Source-eigene Tracks/Größe/Kapitel | relevante Backend-/Editor-Regressionen, gespeicherte Live-JSON-Werte | bestanden |
| Konkurrenz und sortierte Locks | gegensätzliche Reihenfolge im PostgreSQL-Test | bestanden |
| Migration Up/Down und ungültige Bestände | echte SQL-Migrationsdateien in isolierten Schemas | bestanden; gefährlicher Down verweigert |
| Andere Provider/unaufgelöste NULL-Eindeutigkeit | Migration-/Repositorytests | erhalten |
| Access fehlt/abgelaufen, Refresh gültig | api.auth-refresh und api.no-token-boundary | bestanden; bestehende zentrale Auth-Seam |

## Tatsächlicher Browser-/Datenbanknachweis

Regulärer Weg: Episodenübersicht → Import & Mapping → Vorschau laden. Vorher nur B-SH bei Folge 2/3 und insgesamt 22 angebotene Dateien. Nach Aktivierung drei Dateinamen je Folge und 33 angebotene Dateien. 38 ist der vollständige Provider-/Fixturebestand; zwei OVAs außerhalb des konfigurierten Serienordners und drei vorhandene Folge-1-Versionen erklären 33. Autoritative GET-Prüfung der OVA-Pfadzugehörigkeit: beide tatsächlichen Source-IDs außerhalb des Ordners, keine Provideränderung.

Liveauswahl: alle Vorschläge übersprungen, nur B-SH und FlameHazeSubs für Folge 2 reaktiviert und bestätigt. Anzeige vor Apply: 2 bestätigt, 31 übersprungen, 0 Konflikte. Ein gemeinsames Apply liefert 2 Versionen erstellt, 0 aktualisiert, 2 Mappings, 0 neutrale Episoden erstellt. Datenbank belegt getrennte Versionen 53/54 und Sourcezeilen 54/55 mit gleicher echter Item-ID, unterschiedlicher Source-ID und korrekten Gruppen/Container/Tracks. UI öffnet beide Dateien korrekt. Neue Vorschau: 31 Vorschläge, 0 bestätigt; Strawhat für Folge 2 bleibt, Folge 3 unverändert dreifach.

Viewport 1062×980: document.scrollWidth 1047. Viewport 390×844: document.scrollWidth 375. Sourcefeld erreichbar und Dateinamen/Gruppen unterscheiden die Einträge. Screenshots der zweiten gespeicherten Datei und schmalen Mehrquellenansicht wurden im gemeinsamen Browser erzeugt. Kein vollständiger Geräte-/Zoom-/Screenreader-UAT behauptet. Browser-Override zurückgesetzt, Prüfentwürfe verworfen. Abschlusstab: /admin/anime/2/episodes/import.

DB-Lesebeleg in 260916-ako-LIVE-EVIDENCE.json. Der Prüflauf verwendet ausschließlich freigegebene Metadatenfelder; keine API-Schlüssel, Tokens oder vollständigen privaten Providerpfade im Artefakt. Live-Mutationen: ausschließlich Schema 0166 und die zwei ausdrücklich vorgesehenen Importquellen samt regulärer Domainverknüpfungen.

## Request-/SQL-Verhalten

Vorschau verwendet weiterhin die bestehenden paginierten Provider-Collection-Requests; neue Kandidaten entstehen lokal aus den gelieferten Sources. Keine Requestschleife pro Source. Rehydration zweier Geschwisterquellen: Test belegt einen echten Item-Batchrequest und einen Binding-Batchaufruf. 201 Items: ein Binding-SQL-Statement. GetByID liest den gewählten Snapshot aus derselben Hauptabfrage; die zusätzliche Item-globale Snapshotabfrage entfällt. Schreibvorgänge benötigen bewusst Source-Advisory-Locks und Evidenzprüfungen. Keine pauschale konstante SQL-Zahl oder gemessene Latenzverbesserung behauptet.

## Gates / Baselinevergleich

Ausführliche Kommandos und Ergebnisse: BACKEND-SUMMARY.md, FRONTEND-SUMMARY.md, BACKEND-BASELINE.json, BACKEND-FINAL-CHECKS.json, BACKEND-BUILD.json, FRONTEND-GATES.json. Alle Ausführungen auf Linux innerhalb Docker, keine Windows-Implementierung/Hostinstallation.

Backend relevante 348 Passereignisse ohne Pflicht-Skips; breiter finaler Lauf exakt dieselben 60 Fail-Ereignisse wie eingefrorener Start, inklusive dokumentierter paketweiter Ergebnisereignisse. Go build/vet erfolgreich. Frontend 124 Tests und Typecheck erfolgreich. Lint vorher/nachher drei Fehler und 319 Warnungen, fehlerhafte Dateien unverändert: capture-responsive.cjs und CapabilityDetailRow.tsx. Voller Next-Build scheitert vorher/nachher am gleichen ungültigen named export buildCreateSuccessMessage; Produktionsbuild nur der beiden berührten Routen erfolgreich. OpenAPI parsebar; bestehende fokussierte YAML-Syntaxfehler unverändert, geänderte Teilbäume parsebar.

## Nicht reproduzierbar / verbleibend

Fehlende IDs oder widersprüchliche Aliasdateien existieren nicht im aktuellen 11eyes-Bestand; durch isolierte Negativfixtures abgedeckt. Provider kann Identitäten/Pfade später ändern; solche Fälle verlangen eindeutige erneute Auswahl statt automatischer Vermischung. Mehrserver-Namespaces, NAS-Änderungen und Rescans bleiben außerhalb des Scopes. Keine automatische menschliche Abnahme, keine Änderung an ROADMAP oder Phasen-UAT. Die zusätzliche redaktionelle Untertitel-Typ-Anzeige bleibt separat dokumentiert, während technische ASS-Tracks nachweislich gespeichert sind.
