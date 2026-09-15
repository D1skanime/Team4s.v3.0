---
quick_id: 260914-fc1
status: complete
technical_verification: passed_with_existing_global_baseline_exceptions
human_uat: passed
human_uat_signed_off: 2026-09-15
baseline: d06644a1
code_commit: 646433be3ecc193a392446dc6badde727c586c9a
date: 2026-09-14
---
# GSD Quick 260914-fc1 — OP-/ED-Zuordnungskonflikte

## Ergebnis und Abgrenzung

Der vom Auftraggeber in Phase 156 gemeldete Fehler ist technisch behoben. Pro echter Release-Version ist ein OP-Segment und unabhängig davon ein ED-Segment möglich. Ein zweites Segment derselben Familie wird nicht darübergelegt. Bereiche überspringen belegte Zielversionen; einzelne oder vollständig belegte Zielmengen werden mit verständlichem HTTP-409-Fehler abgewiesen. Das eigene Segment bleibt bearbeitbar.

Beispiel: ED von 1 bis 4 bei vorhandenem ED auf 2 ergibt tatsächliche Zuordnungen 1, 3, 4. Ein vorhandenes OP auf 4 beeinflusst dieses ED nicht. Die Anzeige verwendet tatsächliche Assignments und benennt übersprungene Folgen, statt aus dem eingetragenen Bereich eine lückenlose Zuordnung abzuleiten.

Ausgangscommit: `d06644a1` (`docs(gsd): verify release media gallery quick fix`). Commit des Konfliktschutzes: `58ea729de1551aa8664b793cf32d1efbc74425d3` (`fix(segments): prevent occupied OP and ED assignments atomically`). Der Live-UAT-Nachtrag zur Edit-Vorbelegung ist im Abschlusscommit `646433be3ecc193a392446dc6badde727c586c9a` (`fix(segments): reopen editor with assigned episode bounds`) enthalten. Die anschließende Dokumentation wird separat committet. Kein Push.

Dies ist eine Nacharbeit zu **Phase 156 GAP-04**, keine neue Phase und kein Human-UAT-Sign-off. GAP-02 mit 14 Origin-/Contributorprüfungen, Phase 157-06 Task 4 und Human-UAT 158/159 bleiben offen.

## Ausgeführter Plan

| Arbeitspaket | Ergebnis |
| --- | --- |
| Backend: alle Assignment-Schreiber und Typwechsel prüfen und absichern | Erledigt: Create, Update, Direktzuweisung, Bereichsabgleich, Theme-/Segmenttypwechsel und Reverse-Import teilen den Konfliktschutz. |
| Frontend: tatsächliche Zuordnungen, verständliche Konflikte und Teilerfolg | Erledigt: offene Form behält Eingaben bei 409; keine nachfolgende Override-Mutation bei gescheitertem Save; tatsächliche Folgen und übersprungene Ziele sichtbar. |
| Integration: Consumer, Verträge, isolierte Tests, Browser und GSD | Erledigt mit dokumentierten globalen Altfehlern. Unabhängiger begrenzter Backendreview abgeschlossen, beide Findings korrigiert. |

Wiederverwendung und Consumer sind in [CONSUMERS.md](CONSUMERS.md) dokumentiert. Die existierende `CanonicalSegmentType`-Klassifikation sowie die Assignment-, Hydration-, Origin- und zentrale Auth-/API-Infrastruktur bleiben maßgeblich. Keine hartcodierten Typ-, Anime-, Gruppen- oder Release-IDs im Produktcode.

## Geändertes Verhalten

- **Atomisches Speichern:** Segmentmetadaten und Bereichsabgleich laufen in derselben Transaktion. Bei vollständig belegten realen Zielen wird auch eine neue Segmentanlage zurückgerollt. Ein Bereich ohne bereits existierende Zielversionen bleibt für den bestehenden Segment-vor-Release-Ablauf zulässig.
- **Parallelität und Ownership:** Alle betroffenen Schreiber verwenden eine Sperre am bestehenden Anime-Datensatz. Andere Anime werden vor fremden Varianten-Locks abgewiesen; auch eine vollständige Bereichseingabe kann die Prüfung der Editor-Release-Version nicht umgehen.
- **Typänderungen:** Ein Wechsel des Themes oder seines Typs prüft die retained Assignments einschließlich bestehender geschützter Zuordnungen. OP/ED bleiben unabhängige Familien. Weitere Typen erhalten keine pauschale neue Einschränkung.
- **Bereiche und Bestandsdaten:** Eigenzuordnungen bleiben idempotent, belegte fremde Plätze erhalten ihren bisherigen Owner, vorhandene Overrides bleiben geschützt. Keine Bereinigung bestehender Konfliktzeilen und kein automatisches Umhängen von Origin oder Contributors.
- **Späterer Release-Import:** Ein eindeutiger freier OP-/ED-Kandidat kann zugewiesen werden. Mehrere passende Kandidaten lassen den betreffenden Platz zur ausdrücklichen Auswahl frei; keine unbelegte Vorrangregel nach ID, Name oder Reihenfolge. Ein unabhängiger eindeutiger Typ bleibt zuweisbar.
- **Editor:** HTTP 409 hält den Drawer und seine Eingaben offen. Eine erfolgreiche Teilzuordnung zeigt übersprungene Folgen. Origin-Optionen beruhen weiterhin auf tatsächlichen Zuordnungen. Noch nicht zugewiesene passende Bereichssegmente bleiben in der vorhandenen Vorschlagsliste erreichbar.
- **Mobile Anzeige:** Eine bestehende Tabellen-Mindestbreite ließ Werte trotz Kartenlayout rechts außerhalb des sichtbaren Bereichs liegen. Lokal in der vorhandenen mobilen Regel auf `min-width: 0` begrenzt; keine globale Overflow- oder Styleänderung.

## Live-UAT-Nachtrag: korrigierte Grenzen im Editor

Der Auftraggeber stellte nach dem Speichern fest: Nur Folge 6 ist zugewiesen, im erneut geöffneten Drawer steht aber noch Von 2/Bis 6. Der bestehende Helper `segmentFormFromExisting` wurde daraufhin gezielt erweitert. Er verwendet vollständig bekannte, positive ganzzahlige **tatsächliche Episodenlabels**, numerisch eingeordnet, für die erste und letzte Folge. Das ergibt bei einer Einzelzuordnung 6/6; bei Zuordnungen 6 und 10 ergibt es 6/10, ohne die Lücke als zugewiesen darzustellen.

Kein Extra-Request, keine lokale Speicherung und keine Datenmutation beim Öffnen. Erst ausdrückliches Speichern übernimmt die sichtbaren Grenzen über den bestehenden Patch-Vertrag. Das kann den vorher weiter gefassten Automatikbereich verkleinern; die Vorbelegung folgt der vom Auftraggeber gewünschten tatsächlichen Zuordnung. Nicht zugewiesene Planungen, unvollständige Metadaten und nicht als positive Ganzzahlen abbildbare Episodenlabels behalten ihre gespeicherte Vorgabe, statt Zahlen aus IDs oder Teilstrings zu erfinden.

Die neuen Regressionen waren vor der Korrektur nachweislich rot (2 statt 6; 2–15 statt 6–10), anschließend grün. Sie prüfen Wiederöffnung nach Teilerfolg, frischen Fetch, ausbleibende Schreibaufrufe beim Öffnen und die tatsächliche Übermittlung von 6/6 erst nach bewusstem Speichern. Angemeldete Live-Ansicht von Workspace 42 bestätigt ebenfalls **Von 6 / Bis 6** bei Segment „test“, ohne Speicherung durch den Agenten.

## API-Vertrag

Bestehende Erfolgsantwort `{data, range_sync}` beibehalten. Additiv liefert `range_sync.skipped_conflicts` eine Liste mit `release_version_id`, tatsächlichem `episode_number` und `existing_segment_id`. Listen sind auch leer als Arrays vorhanden. Belegte Plätze melden HTTP 409 mit `error.code = segment_assignment_conflict`; Ownershipfehler nutzen weiter den vorhandenen Fehlercode `invalid_theme_or_group`.

Die zuvor im kanonischen OpenAPI-Vertrag fehlenden bestehenden Segmentoperationen und ihre Antworten wurden gezielt dokumentiert; Runtime, Frontend-DTO und API-Helper sind angepasst. Keine neue Route und keine neue Authentifizierung. Mutation-Readbacks verwenden jetzt die bestehende Assignment-Hydration; ein abschließender Reload nach Render-Vorbereitung erhält den sichtbaren `queued`-Status.

## Prüfungen

| Prüfung | Ergebnis / Evidenz |
| --- | --- |
| Backend: reale isolierte PostgreSQL-Fixtures | **76 bestanden, 0 fehlgeschlagen, 0 übersprungen** (30 Top-Level-Tests und 46 Subtests). [backend-focused-final.json](backend-focused-final.json), vollständige Ereignisse in `backend-focused-final.jsonl`. |
| Frontend: Segmenteditor und zentraler Auth-Refresh | **138/138 bestanden**: 87 bestehende Editorfälle, 19 gezielte Konflikt-/Wiederöffnungsfälle, 32 Auth-Refreshfälle. [frontend-tests-reopen.log](frontend-tests-reopen.log). |
| Typecheck | Bestanden, `tsc --noEmit`. [typecheck-reopen.log](typecheck-reopen.log). |
| Scoped Lint | Initial 0 Fehler, 6 bereits bestehende Warnungen zu nativen Controls. [lint-scoped.json](lint-scoped.json). Die beiden Dateien des Wiederöffnungs-Nachtrags haben 0 Fehler und 0 Warnungen: [lint-reopen.log](lint-reopen.log). |
| Globales Lint | **13 bestehende Fehler, 328 Warnungen**, gleicher Stand wie vor diesem Quick Fix. Keine globale Lintfreigabe. [lint-global.json](lint-global.json). |
| Produktionsbuild | Produktcode kompiliert; Next-Page-Prüfung scheitert am unveränderten Export `formatEditLoadError` in `src/app/admin/anime/[id]/edit/page.tsx`. Kein erfolgreicher vollständiger Produktionsbuild behauptet. [build-reopen.log](build-reopen.log). |
| Kanonischer OpenAPI-Vertrag | Gesamtes YAML parsefähig; 9 neue Schemas geprüft, 40 neue interne Referenzen aufgelöst. [contract-check.json](contract-check.json). |
| Fokussierter Adminvertrag | Neue Blöcke separat parsefähig. Bereits im Ausgangsstand vorhandene globale YAML-Syntaxfehler unverändert; Details in CONSUMERS.md. |
| Browserfixtures | 5 Abläufe mit jeweils 10 Verhaltensprüfungen; alle bestanden. Reale Frontend-/API-Clientlogik mit abgefangenen API-Fixtures, keine Live-Schreibaufrufe. [browser-results.json](browser-results.json). |
| Gemeinsamer angemeldeter Browser | Sichtbarer Navigationsweg bis zum Segmenteditor geprüft und Drawer ohne Speicherung geschlossen. [LIVE-BROWSER.md](LIVE-BROWSER.md). |
| Laufender Dienst | 7 relevante Quelldateien im laufenden Backend-/Frontendcontainer entsprechen dem Commitstand. [runtime-source-check.json](runtime-source-check.json). |
| Format / Diff | Betroffene Go-Dateien gofmt-konform; `git diff --check` bestanden. |

Backendfälle enthalten Einzelkollisionen, Lücken mitten/im Ende des Bereichs, OP/ED-Unabhängigkeit, Selbstbearbeitung, vollständigen Rollback, gleichzeitige Schreiber, Typwechsel, Importmehrdeutigkeit, Anime-/Versionsgrenzen, bestehende Override-/Origin-/Playback-Regressionen und öffentlichen Query-Budget-Schutz. Die Testdaten existierten ausschließlich in einem eigens erzeugten temporären PostgreSQL-Container mit tmpfs; die genau identifizierten Testcontainer sind entfernt.

Reproduzierbare Backend-Prüfung: `python3 .planning/quick/260914-fc1-segment-assignment-slot-conflicts/run_backend_focused.py` aus dem kanonischen Linux-Repository. Der Runner verwendet Docker, begrenzten Speicher und Go-Parallelität. Frontend-Aufruf steht im Testlog; Build und Browser haben jeweils einen mitgelieferten Harness. Der Build lief in einer isolierten temporären Kopie, ohne die laufende Dev-`.next` zu überschreiben.

## Browserbelege

| Viewport / Session | Dokumentbreite | Tabelle / Container | Verhalten |
| --- | --- | --- | --- |
| 390 × 844, Access | 390 | 324 / 324 | Konfliktform bleibt offen, Werte bleiben erhalten; Teilzuordnung und tatsächliche Folgen sichtbar. |
| 768 × 1024, Access | 768 | 688 / 688 | Gleiche Prüfungen, kein horizontaler Rootscroll. |
| 1440 × 900, Access | 1440 | 1136 / 1136 | Gleiche Prüfungen im Desktoplayout. |
| 390 × 844, nur Refresh | 390 | 324 / 324 | Genau ein Refresh über den zentralen Client; geschützter Ablauf funktioniert. |
| 390 × 844, Access abgelaufen | 390 | 324 / 324 | 401 und danach genau ein zentraler Refresh; geschützter Ablauf funktioniert. |

Zusätzlich in allen fünf Abläufen: nach Save und erneutem Laden zeigt der Editierbereich 1–3 statt des ursprünglichen 1–4, ohne zusätzliche Schreibaufrufe. Belegbilder `*-reopen.png`. Je Ablauf zwei simulierte Segmentmutationen, insgesamt **0 Live-Schreibaufrufe**, keine Browser-JavaScriptfehler. Belegbilder: `390-access-conflict.png`, `390-access-range.png`, entsprechende `768`-/`1440`-Bilder sowie Refresh-only-/Expired-Access-Paare in diesem Verzeichnis. Mobile Werte nach der lokalen Tabellenkorrektur visuell geprüft; zusätzlich zur Rootbreite wird die Tabellenbreite gemessen.

Im echten, vom Benutzer angemeldeten In-App-Browser erfolgte die Navigation über dessen Projektbereich und den sichtbaren Folge-2-Eintrag „Notizen & Medien“ zur Release-Workspace-Seite, anschließend „Segmente“ → „Bearbeiten“. Buddy Opening 2 zeigte tatsächliche Folgen 2, 3 und dazu passende Origin-Optionen. Desktop-Screenshot 2204 × 1054 geprüft. Keine Eingaben oder Assignments gespeichert. Das belegt Navigation und Lesefluss; die menschliche Abnahme der Schreibfälle bleibt offen.

## Request- und SQLvergleich

| Bereich | Vorher | Nachher / Grenze |
| --- | --- | --- |
| Segment-Save im Browser | Bestehender Create-/Patch-Aufruf; Bereichsfehler konnten neben bereits gespeicherten Metadaten bestehen. | Derselbe fachliche Save-Aufruf mit atomischem Sync; Teilergebnis im bestehenden Umschlag. Bei 409 kein nachfolgender Override-Aufruf. Keine neue fachliche Datenabfrage für die Anzeige übersprungener Ziele. |
| Standalone Assignment-Abgleich | Einzel-INSERT pro Ziel; statischer einfacher Add-Pfad N+5 Statements, keine gemessene Gesamtlatenz. | Set-basierte Belegungsprüfung und INSERT: **10 Statements für 1 Ziel und 10 für 100 Ziele**, inklusive Transaktions-/Lock-Roundtrips. |
| Render-/Playback-/Hydration | Bestehende Schleifen je Assignment. | Weiterhin vorhanden; kein konstantes SQL-Budget für den gesamten Save oder unbelegtes Performanceversprechen. |
| Mutation-Readback | Einzelread ohne vollständige Assignment-Hydration; Renderstatus konnte vor der Vorbereitung stammen. | Gemeinsame Batch-Hydration und finales Reload nach Render-Vorbereitung; zusätzliche Korrektheitsarbeit, keine pauschale Requestreduktion behauptet. |

## Grenzen und weiterhin offene Punkte

- Die bestehende separate Theme-Auflösung kann vor einer später zurückgewiesenen Segmentanlage einen unbenutzten neutralen Theme-Anker erzeugen. Keine Segmentzuordnung, kein Origin und keine Credits werden dadurch angelegt. Kein neues zusammengesetztes API dafür erfunden.
- Bestehende konfliktbehaftete Daten werden nicht automatisch korrigiert. Mehrdeutige spätere Importkandidaten benötigen eine ausdrückliche Auswahl.
- Der Konfliktschutz umfasst die geprüften Repository-Schreibpfade; direkte externe SQL-Schreibzugriffe umgehen Anwendungssperren. Keine neue Datenbankconstraint/Migration eingeführt.
- Globale Lintfehler, der bekannte Next-Exportblocker und die bestehende Syntax des fokussierten Adminvertrags sind separat dokumentierte Altfehler.
- Keine Live-Schreibtests mit Benutzerdaten. Der funktionale Fehler ist durch Codepfade, isolierte PostgreSQL-Fixtures und Browser-API-Fixtures belegt; keine zusätzliche nicht reproduzierbare Einzelmeldung verschwiegen.
- Phase 156 GAP-04 enthält weiterhin offene menschliche Prüfpunkte für reale OP-/ED-Einzel-/Bereichsfälle, Selbstbearbeitung und Origin/Credits. Frühere offene Abnahmen wurden weder geschlossen noch überschrieben.

## Geänderte Dateien

### Backend (Laufzeit)

- `backend/internal/handlers/admin_content_anime_theme_segment_assignments.go`
- `backend/internal/handlers/admin_content_anime_theme_segments.go`
- `backend/internal/handlers/admin_content_anime_themes.go`
- `backend/internal/handlers/admin_content_handler.go`
- `backend/internal/models/admin_anime_themes.go`
- `backend/internal/repository/admin_content_anime_themes.go`
- `backend/internal/repository/episode_import_repository_apply.go`
- `backend/internal/repository/episode_import_repository_release_autoassign.go`
- `backend/internal/repository/episode_import_repository_release_helpers.go`
- `backend/internal/repository/theme_segment_assignment_slots.go`
- `backend/internal/repository/theme_segment_assignments.go`

### Frontend (Laufzeit)

- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.formHelpers.ts`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentBasicFieldsSection.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.module.css`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentsListSection.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseSegments.ts`
- `frontend/src/lib/api.ts`
- `frontend/src/types/admin.ts`

### Verträge

- `shared/contracts/admin-content.yaml`
- `shared/contracts/openapi.yaml`

### Tests

- `backend/internal/handlers/admin_content_anime_theme_segment_range_autoassign_test.go`
- `backend/internal/handlers/admin_content_anime_theme_segment_slot_conflict_test.go`
- `backend/internal/handlers/admin_content_fansub_releases_test.go`
- `backend/internal/handlers/admin_content_release_theme_assets_test.go`
- `backend/internal/repository/admin_content_anime_theme_segments_hydration_integration_test.go`
- `backend/internal/repository/episode_import_repository_autoassign_test.go`
- `backend/internal/repository/theme_segment_assignment_slots_integration_test.go`
- `backend/internal/repository/theme_segment_assignments_reconciliation_integration_test.go`
- `backend/internal/repository/theme_segment_playback_resolution_integration_test.go`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.assignment-conflicts.test.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx`

GSD/Entscheidungen: dieser Quick-Ordner einschließlich Plan, Consumer-/Review-/Prüfbelegen, `.planning/STATE.md`, Phase-156-`156-UAT.md` ausschließlich GAP-04 und der neue Eintrag in `DECISIONS.md`.

**Scopebestätigung:** Keine Live-Daten-, Schema-, Migrations-, Medien-, `.env`- oder Volumenänderung. Keine neue Produktbewertung, Route oder parallele Fachregistry. Keine unzusammenhängenden Working-Tree-Änderungen überschrieben; `frontend/scripts/shot2.mjs` bleibt unberührt.
