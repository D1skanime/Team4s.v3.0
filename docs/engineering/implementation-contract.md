# Team4s Implementation-Vertrag

## Zweck

Dieses Dokument verhindert drei wiederkehrende Drift-Probleme:

- Die UI wird pro Seite neu interpretiert, statt dem globalen UI-System zu folgen.
- API-Request-/Response-Verhalten driftet zwischen Backend, Frontend-Helfern, DTOs und geteilten Contracts.
- Ähnlicher Code wird an mehreren Stellen neu gebaut, statt eine bestehende Nahtstelle zu nutzen oder zu erweitern.

Dieses Dokument vor der Planung oder Umsetzung von Implementierungsarbeiten verwenden.

## Vertrag zu nicht dauerhaften Testdaten

Team4s arbeitet aktuell mit nicht dauerhaften Testdaten. Bestehende Datenbankzeilen unterliegen keiner Aufbewahrungspflicht.

- Keine Pläne oder Implementierungsarbeiten für Datenmigration, Backfill, Abgleich oder Kompatibilität/Weiterführung anlegen, außer der Nutzer fordert diese Arbeit für die aktuelle Aufgabe ausdrücklich an.
- Neue Schema-Migrationen bleiben der Standardmechanismus für Schemaänderungen; diese Regel verbietet keine Migrationen, die das Schema erzeugen oder ändern.
- Zurücksetzen und erneutes Befüllen der Testdatenbank wird dem Erhalt alter Zeilendaten oder dem Hinzufügen von Übergangs-Kompatibilitätscode vorgezogen.
- Historische Personen, Mitgliedschaften, Releases und Beiträge werden über den aktuellen kanonischen Produktablauf erfasst. Ihre reale Historie macht bestehende Testzeilen nicht dauerhaft.
- Roadmap-Formulierungen wie „historischer Import", „Backfill" oder „bestehende Daten" setzen diesen Vertrag nicht außer Kraft. Vor der Behandlung persistierter Daten als produktionsähnlich oder dauerhaft ist die Rücksprache mit dem Nutzer erforderlich.

## Verbindliches Search-First-Gate

Vor dem Hinzufügen neuen Implementierungscodes nach bestehenden Entsprechungen suchen:

- UI-Komponenten: `frontend/src/components/ui`, benachbarte Seitenkomponenten, Domänenkomponenten.
- API-Helfer und DTOs: `frontend/src/lib/api.ts`, `frontend/src/lib/api/*`, `frontend/src/types/*`.
- Backend-Handler/-Services/-Repositories: `backend/internal/handlers`, `backend/internal/services`, `backend/internal/repository`.
- Contracts: `shared/contracts/openapi.yaml`, `shared/contracts/admin-content.yaml`.
- Domänen-Dokumentation: `docs/archiv/db-schema-fansub-domain.md`, `docs/archiv/db-runtime-authority-map.md`.

Passt eine bestehende Nahtstelle, wird sie genutzt oder erweitert. Passt sie nicht, ist vor der Erstellung einer parallelen Nahtstelle zu begründen, warum.

## Regeln für Wiederverwendungsentscheidungen

Wiederverwendung bevorzugen, wenn:

- der bestehende Code dieselbe Domänenentität besitzt.
- der bestehende Code bereits Auth, Validierung, Transport, Medien-Eigentümerschaft oder Fehlerverhalten übernimmt.
- das neue Verhalten eine Variante eines bestehenden Musters ist.
- ein geteiltes Primitiv wiederholte Steuerungs-/Fortschritts-/Fehler-/Formatierungslogik entfernen würde.

Keine Wiederverwendung, wenn:

- die Wiederverwendung Daten an die falsche Domänenentität anhängen würde.
- die Wiederverwendung Medien-Eigentümerschaft auf Release-Ebene, Release-Versions-Ebene, Gruppen-Ebene oder Anime-Ebene vermischen würde.
- der bestehende Code eine Kompatibilitäts-Nahtstelle ist und die Aufgabe ausdrücklich eine neuere kanonische Nahtstelle aufbaut.
- die Abstraktion wichtige Domänenentscheidungen verdecken würde.

## Duplikations-Gate

Neuer Code sollte keine zweite Kopie von Folgendem einführen:

- API-Request-Konstruktion oder Response-Parsing.
- Auth-Token- oder Bearer-Handling.
- Upload-Transport, Fortschritt, Retry oder Medien-Eigentümerschaftslogik.
- DTO-Mapping zwischen Backend- und Frontend-Formen.
- Nachschlagelogik für Release-/Fansub-/Anime-Eigentümerschaft.
- UI-Steuerelemente für denselben persistierten Datentyp.
- Lade-/Fehler-/Leer-Zustandsmuster für denselben UI-Oberflächentyp.

Würde dieselbe Logik an zwei oder mehr Stellen auftreten, ist ein fokussierter Helfer oder eine Komponente zu extrahieren, außer dies würde eine Domänengrenze überschreiten.

## Verweis auf den UI-Vertrag

Für UI-Arbeiten gilt:

- `docs/frontend/ui-system.md`
- `docs/agent-guidelines-ui.md`

Persistierte oder API-gestützte Felder müssen vor dem Codieren auf semantische Steuerelemente abgebildet werden. Keine Platzhalter-Texteingaben für Jahre, Enums, Booleans, Relationen, Medien oder beschränkte numerische Werte verwenden.

## Verweis auf den API-Vertrag

Für API-Arbeiten gilt:

- `docs/api/api-contracts.md`
- `shared/contracts/openapi.yaml`
- `shared/contracts/admin-content.yaml`
- `docs/frontend/auth-api-client.md`

Endpoint-Verhalten, DTOs, Frontend-Helfer, Status-Zweige und geteilte Contracts müssen gemeinsam fortgeschrieben werden.

## GSD-Planungsanforderungen

Pläne müssen in `read_first` enthalten:

- die zu bearbeitenden Dateien.
- bestehende Analog-Dateien, die durch das Search-First-Gate gefunden wurden.
- relevante Dokumente aus dieser Datei, aus der UI-Vertrags-Dokumentation, der API-Vertrags-Dokumentation oder der Domänen-Dokumentation.

Plan-Aktionen müssen exakte Dateien, Helfer, Komponenten, Endpoint-Pfade, DTO-Namen und Steuerelemente benennen. Vage Anweisungen wie „das konsistent machen" ohne Angabe des Zielmusters sind zu vermeiden.

Abnahmekriterien sollten, wo relevant, mindestens eine Wiederverwendungs-/Vertragsprüfung enthalten, zum Beispiel:

- Für einen geschützten API-Aufruf wird kein neuer Ad-hoc-`fetch` eingeführt.
- Der bestehende Upload-Wrapper bleibt der einzige bearer-besitzende Upload-Transport.
- Das Feld `year` wird über ein beschränktes Jahres-Steuerelement dargestellt, nicht über eine freie Texteingabe.
- Das geteilte Contract-YAML und das Frontend-DTO enthalten beide das neue Response-Feld.

## Ausführungsanforderungen

Ausführende müssen stoppen oder eine Abweichung dokumentieren, wenn die Implementierung Folgendes erfordert:

- eine neue doppelte Nahtstelle, obwohl eine bestehende Nahtstelle nutzbar erschien.
- einen neuen API-Vertrag, der vom Plan nicht abgedeckt ist.
- ein neues UI-Steuerelement für ein persistiertes Feld, obwohl das globale UI-System bereits ein passendes Primitiv besitzt.
- eine unklare Domänen-Eigentümerschaftsentscheidung.

Kleine geteilte Helfer werden ermutigt, wenn sie echte Duplikation reduzieren und die Eigentümerschaft klar halten.
