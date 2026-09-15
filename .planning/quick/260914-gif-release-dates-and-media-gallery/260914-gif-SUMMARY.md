---
quick_id: 260914-gif
status: complete
technical_verification: passed_with_existing_global_baseline_exceptions
human_uat: passed
human_uat_signed_off: 2026-09-15
baseline: cbfec666b25c1b12f0ade4f6f9f0693820c0e2a7
gallery_commit: 619bb147058b5fb333259077f41b347c633c3614
code_commit: b62e777e6380a866a8fdb6c2927ed436c6a55bf3
date: 2026-09-14
---
# GSD Quick 260914-gif – Release-Datum und Mediengalerie

## Ergebnis

Beide bestätigten Arbeiten sind implementiert. Die Galerie zeigt maximal vier breite Desktopkarten, abhängig vom eigenen Container zwei bis drei Tabletspalten und weiterhin zwei Spalten mobil. Bildflächen sind stabil im 4:3-Format; Titel sind auf zwei und Beschreibungen auf drei Vorschauzeilen begrenzt. Ganze Texte bleiben im bestehenden Detaildrawer. Kategorie, Status und Datum umbrechen; Vorschauaktionen bleiben am Kartenfuß kompakt.

Beginn und Abschluss derselben echten Release-Version müssen nach UTC-Kalendertagen zueinander passen. Gleiches Datum und leere Werte sind erlaubt. Auch Teilpatches werden nach Zusammenführung mit gespeicherten Werten unter der bereits vorhandenen Sperre geprüft. Abweichende Reihenfolgen zwischen Folgen liefern ausschließlich Hinweise, keine Speichersperre. Beispiel: Folge 2 beginnt 18.07., Folge 6 beginnt 19.07., dazwischen fehlen Daten. Eingaben 18./19.07. erzeugen keinen Hinweis; davor/danach wird der reale Vergleich erklärt. Parallel begonnene Arbeit darf trotzdem gespeichert werden. Keine Dateninterpolation und keine Vermischung von Beginn/Abschluss.

Ausgangscommit: `cbfec666b25c1b12f0ade4f6f9f0693820c0e2a7`. Galeriecommit: `619bb147058b5fb333259077f41b347c633c3614`. Datums-/technischer Abschlusscommit: `b62e777e6380a866a8fdb6c2927ed436c6a55bf3`. Anschließend separater GSD-Dokumentationscommit; kein Push. Kein neuer Milestone und keine neue Phase. Human-UAT156/157/158/159 bleiben ausdrücklich offen.

## Ausgeführte Arbeitspakete

1. Bestehende Galerie/CSS berichtigt; Uploads, Medienownership und Berechtigungen bleiben erhalten.
2. Gemeinsame Metadatenfelder, Validierung und begrenzte Ankerprojektion über bestehenden Editor-Kontext ergänzt; Vertrag/Go/TypeScript gemeinsam aktualisiert.
3. Fehler-/Navigationszustände geprüft und abgesichert. Verspätete Antworten überschreiben kein anderes Formular. Auch ein fehlgeschlagener Admin-Kontextwechsel entfernt die vorherige Folge und blockiert deren irrtümliches Speichern unter der neuen Route.
4. Gezielte Tests, isolierte Datenfixtures, Browser, Vertragsabgleich und Review abgeschlossen; globale Altfehler getrennt dokumentiert.

Wiederverwendungs- und Consumerbegründung: [CONSUMERS.md](CONSUMERS.md). Daten-/SQLdetails: [BACKEND-DATES.md](BACKEND-DATES.md). Zwei Reviewfindings wurden korrigiert: alte Adminform nach fehlgeschlagenem Folgenwechsel und widersprüchlicher Hinweistext bei zugleich eigener ungültiger Datumsreihenfolge. [INTEGRATION-REVIEW.md](INTEGRATION-REVIEW.md).

## Prüfungen

| Prüfung | Ergebnis |
|---|---|
| Frontend, fünf betroffene Testsuiten | **103/103 bestanden**: Galerie38, Editorpage15, Workspace19, Hook5, Datum-/Editorhelpers26. [frontend-tests-final.log](frontend-tests-final.log). Bestehende React-act-Warnungen im Galeriehook dokumentiert. |
| Backend, isolierter PostgreSQL-Container | **84 Prüffälle bestanden,0 fail / 0 skip** einschließlich Unterfällen;19 Top-Level-Tests. [backend-focused-final.json](backend-focused-final.json). |
| Typecheck | **Bestanden**. [typecheck-final.log](typecheck-final.log). |
| Scoped Lint | **0 Fehler**,13 bestehende Warnungen. [scoped-lint-final.log](scoped-lint-final.log). |
| Globales Lint | **13 bestehende Fehler/328 Warnungen**, gleicher Ausgangsstand; keine globale Freigabe. [frontend-global-lint.json](frontend-global-lint.json). |
| Produktionsbuild | Änderungen kompilieren in isolierter temporärer Kopie. Danach unveränderter `formatEditLoadError`-Exportfehler der Anime-Adminpage. Vollbuild nicht bestanden. [build-final.log](build-final.log). Devserver/.next bleiben unberührt. |
| Vertrag | Ganzes kanonisches OpenAPI parsefähig; neuer Go/TS/OpenAPI-Ankervertrag und fokussierter Zusatzblock stimmen. Vorhandener globaler Admin-YAML-Syntaxfehler unverändert. [contract-check.json](contract-check.json). |
| Galerie-Browser | **10/10 Fälle bestanden**,110 Bildrahmen im 4:3-Format. [gallery-browser-results.json](gallery-browser-results.json). |
| Datum-Browser | **5/5 Fälle bestanden**, realer DatePicker,400/500/Netzwerkfehler, leere/gleiche Tage, eigener Fehler und Hinweise. [date-browser-results.json](date-browser-results.json). |
| Live-Browser | Angemeldeter Lesefluss Basisdaten→Bilder&Medien mit echten Hinweisen und kompakter Karte geprüft; keine Live-Schreibaktion. [LIVE-BROWSER.md](LIVE-BROWSER.md). |
| Runtime / Diff |15 betroffene Runtimequelldateien stimmen mit laufenden Containern überein; gofmt und `git diff --check` bestanden. [runtime-source-check.json](runtime-source-check.json). |

Backendfälle umfassen volle/partiellePATCHes, explizites Leeren, UTC-Grenzen, gleiche Tage, konkurrierende Updates, Scopegrenzen, reale/Varianten-ID-Kollision, Gruppen-/Versiontrennung, fehlende Zwischenfolgen, begrenzte Ergebnismenge sowie beide realen Editorhandler mit 500 bei Ankerfehler. Keine Live-Daten angefasst. Vorläufige Backendläufe hatten ausschließlich unvollständige isolierte Authfixtures; diese wurden korrigiert und der finale Lauf besteht vollständig.

## Browsergeometrie und Requests

| Ansicht | Galeriecontainer / Spalten | Datum-Dokumentbreite |
|---|---|---|
|390×844|324px /2|390px|
|768×1024|690px /2|768px|
|1440×900|1138px /4|1440px|
|Container703→704px|2→3Spalten|separate Containerprüfung|
|Container943→944px|3→4Spalten|separate Containerprüfung|
|Schmale Einbettung340px|2Spalten|Galerieprüfung|

Vorschauaktionen maximal 36px in der geprüften Matrix; kein gestrecktes Gridfeld. Alle elf Medien bleiben sichtbar, die ganzen Originaltexte sind in den bestehenden Detailfeldern vorhanden. Datum-Browser nutzt zusätzlich390px mit nur Refresh sowie mit abgelaufenem Access: jeweils **genau ein zentraler Refresh**, kein lokaler Token-/Refreshpfad. Pro Datumfall sechs bewusst abgefangene Fixturemutationen, insgesamt 30, **0 Livewrites**, keine unerwarteten Schreibaufrufe und keine JS-Fehler. Eigene ungültige Reihenfolge erzeugt0 Save-Requests.

| Naht | Vorher → Nachher |
|---|---|
| Eigene Datumsmutation | Bestehender PATCH/Transaktionsread; jetzt Prüfung des zusammengeführten Zustands. **0 zusätzlicheSQL-Statements** für diese Prüfung. |
| Editor-Kontext | Bestehender Browserrequest bleibt einer; **1 zusätzliches set-basiertesSQL** mit höchstens 4Ankern je persistierter Gruppe. Auch bei 100 zusätzlichen Releases1 Statement und gleiches Ergebnisbudget. |
| Datumswahl / Hinweisanzeige | **0 zusätzlicheContextrequests**. Frontend verarbeitet vorhandenen Snapshot. |
| Galerie / Detailöffnung | **0 zusätzlicheMedienrequests** durch die Style-/Previewänderung; keine neue API. |

Die begrenzte Ergebnismenge ist keine Behauptung konstanter SQL-Laufzeit oder vollständiger Gesamtabfragekosten. Die Projektion durchsucht passende Daten im vorhandenen Modell. Keine N+1-Abfrage eingeführt.

## Grenzen / offene Human-UAT

- Anker sind Snapshots beim Kontextladen. Fremde gleichzeitige Änderungen und neu hinzugefügte Gruppen werden nach erneutem Kontextabruf sichtbar; kein Polling.
- Nicht numerische Specials bekommen keine erfundene Reihenfolge. Kalenderdaten werden nicht aus IDs abgeleitet.
- Die bestehende Phase-143-Zuordnung von `release_date` zum Editorlabel „Bearbeitung abgeschlossen am“ sowie Release-/Public-Consumer bleiben erhalten; keine neue Veröffentlichungsdatumsmodellierung. Contributor-Kontext reicht lediglich bereits aufgelöste reale IDs korrekt durch.
- CSSzoom2 belegt Galerie-Reflow, keinen nativen Browser-Chrome-Zoom. Native Zoomabnahme sowie menschliche visuelle/Schreib-UAT bleiben offen. Der bekannte globale Drawer außerhalb eines CSS-gezoomten Viewports wurde nicht fachfremd umgebaut.
- Auth-/Mutationsbrowserfälle sind isolierte Responses auf realem Frontend; Liveprüfung war lesend. Keine Benutzerwerte zu Testzwecken gespeichert.
- Globales Lint, vollständiger Build und globale Syntax des fokussierten Adminvertrags haben oben genannte Altfehler. Keine sonstigen nicht reproduzierbaren Produktfälle verschwiegen.

## Geänderte Dateien

### Backend
- `backend/internal/handlers/admin_content_episode_version_editor_helpers.go`
- `backend/internal/handlers/episode_version_update.go`
- `backend/internal/handlers/episode_version_validation.go`
- `backend/internal/models/episode_version.go`
- `backend/internal/repository/episode_version_date_neighbors.go`
- `backend/internal/repository/episode_version_repository.go`

### Frontend
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditor.module.css`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.module.css`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMetadataFields.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.ts`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts`
- `frontend/src/app/me/releases/[versionId]/workspace/page.tsx`
- `frontend/src/types/episodeVersion.ts`

### Verträge
- `shared/contracts/admin-content.yaml`
- `shared/contracts/openapi.yaml`

### Tests
- `backend/internal/models/episode_version_dates_test.go`
- `backend/internal/repository/episode_version_dates_integration_test.go`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.test.ts`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.test.tsx`
- `frontend/src/app/me/releases/[versionId]/workspace/page.test.tsx`

GSD: dieser Quickordner, `.planning/STATE.md`, `DECISIONS.md`. Reproduktion über `run_backend_dates.py`, `contract-check.py`, `build-check.cjs` und die beiden Browserharnesses; Frontendaufrufe stehen in den Logs. Docker-only, begrenzte Tests seriell.

**Scopebestätigung:** Keine Live-/produktiven oder bestehenden Testdaten verändert; ausschließlich isolierte Fixtures. Keine Migration, Datenbank-/Schema-, `.env`-, Medienoriginal- oder Volumenänderung, keine neue Produktregel außerhalb des bestätigten Umfangs. Keine unzusammenhängenden Änderungen überschrieben; `frontend/scripts/shot2.mjs` bleibt unangetastet. Kein Human-UAT-Sign-off behauptet.
