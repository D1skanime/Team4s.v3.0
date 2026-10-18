# Phase 186 — Review-Fix (2026-10-18)

Drei Code-Review-Befunde auf bereits ausgeliefertem Phase-186-Code (Commits `727d95114..9e9dfb9fd`)
behoben, je ein eigener atomarer Commit mit Tests. Bug-Fixing auf Shipped-Code, keine neue
Feature-Arbeit.

## Befund 1 — "Ab hier"/"Ab hier entfernen" verglichen gegen eingefrorenen Preview-Snapshot

**Vorher:** `applyFansubGroupFromEpisode` in `useEpisodeImportBuilder.ts` las `oldFansubGroups`
immer aus `preview?.mappings?.find(...)` — dem statischen Snapshot vom Seitenaufbau. Nach der
ersten Bearbeitung einer Zeile war dieser Wert veraltet:
- "Ab hier entfernen" auf einer gerade selbst bearbeiteten Zeile löschte die Zeile nicht mehr
  (der Live-Wert der Zeile stimmte nicht mehr mit dem alten Snapshot-Wert überein, gegen den
  `applyGroupFromHere` verglich).
- Aufeinanderfolgende "Ab hier"-Klicks mit Zwischenbearbeitungen blieben an einem stillschweigend
  veralteten Zwischenwert hängen, weil immer derselbe uralte Seitenaufbau-Wert als Baseline
  herangezogen wurde statt des tatsächlich zuletzt gültigen Zwischenwerts.

**Fix:** Ein neuer Ref `rowGroupsBeforeLastEditRef` merkt sich pro Zeile den Wert unmittelbar
VOR der letzten Chip-Bearbeitung (gesetzt in `setSelectedFansubGroups`/`addSelectedFansubGroup`/
`removeSelectedFansubGroup`, jeweils vor der eigentlichen Mutation). `applyFansubGroupFromEpisode`
unterscheidet jetzt zwei Fälle:
- "Ab hier" (`newFansubGroups` nicht leer): Baseline = Ref-Wert (One-Step-Back), Fallback auf den
  Live-Wert, falls der Ref noch keinen Eintrag hat (Zeile wurde noch nie bearbeitet).
- "Ab hier entfernen" (`newFansubGroups` leer): Baseline = aktueller Live-Wert der Zeile — korrekt
  per Konstruktion, da keine vorangehende Bearbeitung existiert.

`applyFansubGroupFromEpisodeDown`/`applyGroupFromHere` (die eigentliche D-01-Kernlogik) blieben
unangetastet — nur die Baseline-Ermittlung auf Aufrufer-Seite hat sich geändert.

**Tests:** 3 neue Hook-Level-Tests in `useEpisodeImportBuilder.test.tsx` (3 Zeilen-Fixture: R,
R1 mit gleichem Ursprungswert, R2 mit abweichendem Wert als Regressionswächter):
1. "Ab hier entfernen" direkt nach einer eigenen Bearbeitung derselben Zeile — Zeile wird jetzt
   korrekt geleert (vorher blieb sie am neuen Wert hängen).
2. Zwei aufeinanderfolgende "Ab hier"-Klicks mit Zwischenbearbeitung — der zweite Klick fegt
   korrekt den vom ERSTEN Klick gesetzten Wert mit, statt am Seitenaufbau-Wert hängen zu bleiben.
3. "Ab hier entfernen" auf einer nie bearbeiteten Zeile (Ref leer) — Fallback auf den Live-Wert
   funktioniert und propagiert korrekt auf Zeilen mit demselben Ursprungswert.
Alle 3 Tests prüfen zusätzlich, dass die bewusst abweichende R2-Zeile unangetastet bleibt
(Regressionswächter für die D-01-Kernregel). Alle 113 bestehenden Tests im
`episodes/import`-Verzeichnis bleiben grün.

**Datei-Längen-Regel:** Der Fix brachte `useEpisodeImportBuilder.ts` von 443 auf 465 Zeilen über
das 450-Zeilen-CLAUDE.md-Limit. In einem separaten, reinen Umbau-Commit (keine
Verhaltensänderung) wurden `buildEpisodeImportApplyInput`, `normalizePreviewResult` und
`formatEpisodeImportError` (keine React-Hook-Abhängigkeit) nach einer neuen
`episodeImportBuilderHelpers.ts` ausgelagert. `useEpisodeImportBuilder.ts` re-exportiert die zwei
extern importierten Funktionen, damit `episodeImportMapping.test.ts`s bestehender Importpfad
unverändert bleibt. Ergebnis: `useEpisodeImportBuilder.ts` 405 Zeilen,
`episodeImportBuilderHelpers.ts` 81 Zeilen.

**Commits:**
- `389bd52a2` — fix(186-review): Ab-hier-Baseline live statt eingefrorener Preview-Snapshot
- `df9175314` — refactor(186-review): useEpisodeImportBuilder.ts unter 450-Zeilen-Limit splitten

## Befund 2 — Toter Legacy-className an 3 migrierten Button-Primitives

**Vorher:** Die 3 bereits auf `<Button>` migrierten Elemente in `page.tsx` (zwei
"secondary"-Buttons für "Alle Vorschläge überspringen"/"bestätigen", ein "primary"-Button für
"Alle bestätigten übernehmen") trugen noch die alten lokalen CSS-Klassen
`styles.secondaryButton`/`styles.primaryButton` aus der Vor-Migration-Zeit — konkurrierend mit
dem Button-Primitiv-eigenen Variant-Styling.

**Fix:** Die 3 `className`-Props entfernt. `styles.secondaryButton` bleibt in
`page.module.css` erhalten, weil zwei `<Link>`-Elemente ("Zurück zur Übersicht") sie weiterhin
nutzen (verifiziert: `grep -n "styles.secondaryButton"` zeigt genau 2 verbleibende Treffer, beide
`<Link>`). `styles.primaryButton` wird dadurch vollständig ungenutzt und komplett aus
`page.module.css` entfernt (geteilte Selektor-Zeile, eigene Regel, `:disabled`-Regel, Eintrag im
Responsive-Media-Query-Block) — verifiziert per `grep -c "primaryButton" page.module.css` = 0.

**Tests:** Kein neuer Test nötig (reine CSS-/Markup-Bereinigung ohne neue Logik). Bestehende
Suite (113 Tests im `episodes/import`-Verzeichnis) bleibt grün, `tsc --noEmit` und `eslint`
clean für beide berührten Dateien (nur vorbestehende, unabhängige Warnungen/Fehler in anderen
Dateien).

**Commit:** `387bbf9db` — fix(186-review): entfernt toten Legacy-className von migrierten
Button-Primitives

## Befund 3 — Nur `EpisodeNumber[0]` statt anitogo-Episodenrange genutzt

**Vorher:** anitogo liefert bei Mehrfach-Episoden-Ranges (z. B. "01-02", "01~02", "01&02",
"01+02" — `matchMultiEpisodePattern` in `parser_number.go`, KEIN literales "e" nötig) beide
Grenzen in `elements.EpisodeNumber` (`["1","2"]`). `AnitogoReleaseFilenameParser.ParseFilename`
las aber nur `EpisodeNumber[0]` und verwarf die zweite Grenze. Separat griff
`resolveEpisodeImportSuggestedTargets` für das Range-Ende weiterhin das alte, unveränderte Regex
`e(\d{1,4})-(\d{1,4})`, das ein literales "e" voraussetzt — bei einem literalfreien "01-02" fand
dieses Regex nichts, und die zweite Episode fiel stillschweigend aus dem Mapping.

**Fix:**
- `ReleaseFilenameParseResult` bekommt ein neues Feld `EpisodeNumberEnd *int32`, nur gesetzt, wenn
  `elements.EpisodeNumber` mehr als einen Eintrag hat UND der letzte Eintrag größer als der erste
  ist (gleiche defensive Haltung wie beim bestehenden Single-Episode-Parsing).
- Neue Funktion `episodeImportEvidenceEpisodeNumberRangeEnd` spiegelt exakt das bestehende
  Nil-Parser-Fallback-Muster von `episodeImportEvidenceEpisodeNumber`: ohne konfigurierten Parser
  greift weiterhin das alte, literal-"e"-pflichtige `episodeImportFilenameRangePattern`
  (unverändert, bleibt als Fallback bestehen).
- `resolveEpisodeImportSuggestedTargets` ruft jetzt `episodeImportEvidenceEpisodeNumberRangeEnd`
  statt direkt das alte Regex.

**Tests:**
- `release_filename_parser_test.go`: 3 neue Range-Fälle ("-", "~", "&") mit `EpisodeNumber=1`,
  `EpisodeNumberEnd=2`, Checksum korrekt getrennt; zusätzlich ein expliziter Negativ-Check im
  bestehenden Single-Episode-Test, dass `EpisodeNumberEnd` dort überall `nil` bleibt
  (Regressionswächter).
- `admin_episode_import_test.go`: neuer End-to-End-Test
  `TestPreviewEpisodeImport_BareMultiEpisodeRangeWithoutLiteralEResolvesBothEpisodes` — ein
  literalfreier Range-Dateiname ("01-02") läuft durch die volle `buildEpisodeImportPreview`-Pipeline
  und liefert `SuggestedEpisodeNumbers == [1, 2]`, nicht nur `[1]`.
- Bestehender Test `TestPreviewEpisodeImport_ExpandsFilenameEpisodeRangesAcrossSeasonOffsets`
  (literal-"e"-Range über den Nil-Parser-Fallback-Pfad) bleibt unverändert grün. Die 15-Werte
  Real-Filename-Regression (`TestEpisodeImportEvidenceEpisodeNumber_RegressionAgainstRealFilenames`)
  bleibt unverändert grün.

**Pre-existing, unabhängiger Fund:** `TestEpisodeImport11eyesEnumeratesEveryPhysicalSource`
schlägt im `team4sv30-backend`-Container fehl (`docs/` ist nicht Teil des Docker-Build-Contexts
`./backend` und wird nicht in den Container gemountet, die Fixture existiert nur auf dem Host).
Vorbestehend (Commit `9cdef2b42`), außerhalb des Dateien-Scopes dieses Fixes, nicht angefasst —
dokumentiert in `deferred-items.md`.

**Commit:** `e914707cc` — fix(186-review): anitogo-Episodenrange statt nur EpisodeNumber[0] nutzen

## Verifikation (gesamt)

- Frontend: `npm run typecheck` clean, `npm run lint` clean für alle berührten Dateien (nur
  vorbestehende, unabhängige Warnungen/Fehler anderswo), `npm test -- --run
  "src/app/admin/anime/[id]/episodes/import"` — 9 Testdateien, 113/113 grün (3 neue D-01-Tests
  inklusive).
- Backend: `go build ./...` und `go vet ./...` clean. `go test ./internal/services/...
  ./internal/handlers/... -run "ReleaseFilenameParser|EpisodeImport" -v` — alle Tests grün außer
  dem oben dokumentierten, vorbestehenden, umgebungsbedingten `TestEpisodeImport11eyesEnumeratesEveryPhysicalSource`-Fehlschlag.
- Backend neu gebaut (`docker compose build team4sv30-backend && docker compose up -d
  team4sv30-backend`) — `/health` liefert `{"status":"ok"}`.
- Frontend neu gestartet (`docker restart team4sv30-frontend`, kein `npm run build` im laufenden
  Container) — `GET /` liefert HTTP 200, keine Fehler im Log außer dem erwarteten
  `SIGTERM`-Log des vorherigen Dev-Server-Prozesses.
- Datei-Längen-Regel geprüft: keine der berührten Dateien liegt über 450 Zeilen (größte:
  `useEpisodeImportBuilder.ts` 405, `admin_episode_import_preview_builder.go` 249).

## Commits (chronologisch)

1. `389bd52a2` — fix(186-review): Ab-hier-Baseline live statt eingefrorener Preview-Snapshot
2. `387bbf9db` — fix(186-review): entfernt toten Legacy-className von migrierten Button-Primitives
3. `e914707cc` — fix(186-review): anitogo-Episodenrange statt nur EpisodeNumber[0] nutzen
4. `df9175314` — refactor(186-review): useEpisodeImportBuilder.ts unter 450-Zeilen-Limit splitten
   (Deviation Rule 2/CLAUDE.md-Durchsetzung, ausgelöst durch Befund 1)
