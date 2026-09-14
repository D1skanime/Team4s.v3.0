# Consumer- und Wiederverwendungsprüfung

## Datumsfelder

| Feld / Naht | Tatsächlicher Consumer | Entscheidung |
|---|---|---|
| production_started_on | EpisodeVersion-Modell; Repository-Read/Write; API-Patch; buildInitialFormState/fromDateInputValue; Admin-/Contributorhook und Member-Workspace | Vorhandenes Datum/DatePicker behalten. Gemeinsame eigene Kalenderregel, keine Ersatzdaten. |
| release_date | Dieselben Editorseams; episode_version_public_query.go; Public-EpisodeVersion-/ReleaseDetail-Verträge | Bestehende Phase-143-Bezeichnung „Bearbeitung abgeschlossen am“ bleibt. Bestehende Veröffentlichung-/Releaseprojektion und COALESCE auf Fansubrelease nicht neu modellieren. |
| EpisodeVersionEditorContext | getEpisodeVersionEditorContext in lib/api.ts → useEpisodeVersionEditor und Member workspace/page.tsx | Ein begrenztes zusätzliches date_neighbors-Array am bereits abgerufenen Kontext. Kein neuer Endpoint, kein eigener Fetchhook. |
| date_neighbors | Backend ListDateNeighbors → beide Kontextloader → DTO/TypeScript → releaseDateOrderHints → gemeinsame ReleaseVersionMetadataFields | Nur Plausibilitätshinweise; max. vier Zeilen je persistierter Gruppe. Eigene Anfang-/Endprüfung bleibt davon unabhängig. |
| variant_id / release_version_id | Bestehendes EpisodeVersion-Modell und OpenAPI/TS, bereits getrennte Fachidentitäten | Contributor-Whitelist ließ sie aus und serialisierte 0. Ausschließlich bereits aufgelöste IDs durchreichen. Numerische Compatibility-Auflösung bleibt unverändert. |

Der Backendbericht dokumentiert die exakten SQL-/Ownership-/ID-Grenzen und Fixtures. Bestehende Quelldateien wurden vor Erweiterung gelesen; die bereits vorhandene Transaktionssperre, zentrale Auth-/API-Infrastruktur und Datumskonvertierung werden weiterverwendet. Der neue Repository-Read ergänzt die bestehende Editorprojektion; keine parallele Datums-/Releaseverwaltung. Eine eigene kleine Regel im bestehenden Frontend-Utils-Modul dient beiden Formularen, die Go-Regel beiden serverseitigen Validierungsstellen.

## UI-Zustand

Die beiden bestehenden Formulare nutzen denselben Metadatenfeldsatz. Eigene Datumsfehler bleiben feldnah sichtbar; folgenübergreifende Hinweise werden bei jeder Formänderung aus demselben Kontext berechnet. Entfernte Gruppen werden im Adminentwurf ausgeschlossen. Neu hinzugefügte Gruppen und Änderungen anderer Benutzer erhalten aktuelle Vergleichsanker beim nächsten Kontextladen; keine Live-Pollingwahrheit. Leerwerte werden nicht ergänzt. Bei Navigation werden alte Kontext-/Speicherantworten ignoriert; der Member-Workspace zeigt bis zum neuen Kontext den Ladezustand.

## Galerie

ReleaseVersionMediaSection wird sowohl vom Admin-/Contributor-Editor als auch vom Member-Workspace verwendet. Die bestehenden Media-/Upload-/Preview-APIs und berechtigungsabhängigen Aktionen bleiben vollständig erhalten. Die vorhandenen Button-, Badge-, Drawer- und Formprimitiven werden genutzt. Änderungen beschränken sich auf bestehende CSS-Komposition, lokale Klassen und semantische Datumsausgabe. Ganze Titel/Beschreibungen liegen unverändert im existierenden Detaildrawer. Galerieänderungen erzeugen keine zusätzlichen API-Abfragen. Details/Geometrie: GALLERY-NOTES.md.

## Vertrag und Altfehler

Kanonischer OpenAPI-Vertrag und Go-/TS-Projektion stimmen im neuen Array überein. Das bisher im EpisodeVersionPatchRequest fehlende, bereits implementierte production_started_on ist eng begrenzt nachgetragen. Partialpatch/null/gleiche UTC-Tage und die bestehende 400-Fehlerhülle sind dokumentiert. Der fokussierte admin-content.yaml erhält einen eigenen verständlichen Regelblock; dessen bestehender globaler YAML-Parserfehler (am Ausgangscommit bereits Zeile1136) bleibt unangetastet. contract-check.py belegt die unveränderte Fehlerstelle und den separat gültigen neuen Block.

Kein neues Schema, keine Migration, keine Datenkorrektur, kein verschobener Medienowner und keine zusätzlichen Produktregeln.
