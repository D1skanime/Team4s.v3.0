# Live-UAT-Nachtrag: HTTP 500 beim Löschen einer Release-Version

Datum: 16.09.2026. Ausgangsstand: 2b4c9606. Fix: 0cda1dd7. Technisch korrigiert und aktiviert; Löschfix am 16.09.2026 durch den Nutzer mit „approved“ abgenommen.

## Ursache und Beleg

Der Nutzer meldete den Fehler auf /admin/episode-versions/53/edit. Backendlogs vom 16.09.2026 09:24:39 und 09:25:47 UTC belegen DELETE /api/v1/episode-versions/53 → 500 mit `missing FROM-clause entry for table "ss" (SQLSTATE 42P01)` beim Auflösen des Löschziels.

In c61459bc wurde die richtige Quellensortierung des Schreib-/Lesepfads zusätzlich und versehentlich in die unabhängige Delete-Zielabfrage übernommen. Diese Abfrage verbindet nur release_variants/release_versions, nicht release_streams oder stream_sources. Deshalb sind ihre neuen Sortierreferenzen ss/rs ungültig. Die bisherigen 348 relevanten Tests führten diesen echten Delete-Repositorypfad nicht aus: eine belegte Testlücke trotz vorheriger grüner Teilmenge.

## Enger Plan / Umsetzung

1. Produktionsabfrage unverändert lassen und echte PostgreSQL-Löschregressionen ergänzen.
2. Genau die Delete-Zielsortierung auf die bisherige Variantenreihenfolge zurücksetzen. Kein zusätzlicher Join, keine neue Source-Auswahl, keine neue Löschsemantik.
3. Nachbarfunktionen testen, Backend kohärent aktivieren und die reale Zielabfrage ausschließlich lesend prüfen.

Geänderter Produktionsabschnitt in backend/internal/repository/episode_version_repository_write_helpers.go:

    ORDER BY rv.id ASC

Die Source-Sortierung von loadEpisodeVersionStateForUpdate bleibt unverändert. Endpoint, Adminrecht, 204 bei erfolgreichem Löschen, 404 bei unbekanntem Ziel und Fehlervertrag bleiben wie in shared/contracts/openapi.yaml dokumentiert; kein Vertrags-/DTO-/Frontendwechsel erforderlich. Frontend nutzt weiterhin deleteEpisodeVersion im zentralen API-Client.

## RED → GREEN / Grenzen

Neue Datei backend/internal/repository/episode_version_delete_integration_test.go, bestehende guarded PostgreSQL- und Importfixtures wiederverwendet, keine neue Testinfrastruktur im Anwendungscode:

- TestEpisodeVersionDeletePreservesSiblingSource: realer gemeinsamer Import zweier Sources desselben Items, eine Version löschen, vollständiger Geschwister-Graph bytegleich erhalten, nur verwaiste eigene Source entfernt; zweite Löschung bereinigt den leeren Release-Graph und erhält die neutrale Episode; wiederholtes Löschen meldet ErrNotFound.
- TestEpisodeVersionDeleteKeepsReferencedStreamSource: eine noch durch eine zweite Variante verwendete Source und deren beide Streamverknüpfungen bleiben bestehen.
- TestEpisodeVersionDeleteUnknownIsNotFound: unbekanntes Ziel ergibt ErrNotFound statt SQL-500.

Alle drei scheiterten vor der Korrektur mit exakt SQLSTATE 42P01; danach alle bestanden. Datenmutationen nur in privaten Schemas der gesonderten Fixture-DB team4s_phase117_test_161; normale Fixturebereinigung ausgeführt. Kein tatsächlicher DELETE gegen die Anwendungsdatenbank oder den Browser ausgeführt.

## Frische Prüfungen

- Isolierter Dockerlauf: go test ./internal/handlers ./internal/repository ./internal/models -run 'Test.*(EpisodeImport|11eyes|JellyfinSource|EpisodeVersion|ReleaseStream|ReleaseDetail|ThemeSegmentPlayback)' -count=1 -timeout=120s -json: **351 Tests/Untertests bestanden, 0 Fehler, 0 Skips**.
- go build ./... und go vet ./...: bestanden.
- Frontend npm run typecheck: bestanden.
- Global ESLint: unverändert 3 Fehler/319 Warnungen; capture-responsive.cjs und src/app/admin/users/tabs/CapabilityDetailRow.tsx. Keine Frontendänderung. Frontend-Produktionsbuild nicht erneut ausgeführt; unveränderter bekannter anime/create-Pageexportfehler ist im Hauptbericht belegt. Backend-Dockerbuild erfolgreich.
- git diff --check: bestanden. Produktionsänderung genau eine SQL-Zeile.
- Backendservice aus dem geprüften Stand neu gebaut/erstellt; Serverstart 09:31:17 UTC, 0 zusätzliche Migrationen. Bytevergleich bestätigt die korrigierte Datei im aktiven Container.
- Die exakt aus der aktiven Implementierung entnommene SELECT-Zielabfrage wurde in BEGIN READ ONLY für IDs 53 und 54 ausgeführt: beide liefern ihre jeweilige Variante/Version/Release 53 beziehungsweise 54. Abschluss ROLLBACK; keine Datenmutation.

Der Benutzer kann nun im bestehenden Editor erneut löschen. Ein erfolgreicher Löschklick an seinen Daten wird nicht vorgetäuscht. Keine neue Migration, kein NAS-/Jellyfin-Eingriff, kein Push und keine Veränderung fremder UAT-Status. Der isolierte eigene Testcontainer wurde nach Abschluss entfernt.

## Nutzerabnahme — 16.09.2026

Der Nutzer bestätigte den aktivierten Löschfix ausdrücklich mit „approved“. Diese Abnahme gilt ausschließlich für die oben beschriebene Löschregression auf Stand 0cda1dd7. Der Agent hat keinen weiteren Löschversuch ausgeführt; ein konkreter HTTP-Erfolg oder eine bestimmte Datenlöschung wird aus der kurzen Bestätigung nicht zusätzlich abgeleitet. Andere offene UAT-Punkte bleiben unverändert.
