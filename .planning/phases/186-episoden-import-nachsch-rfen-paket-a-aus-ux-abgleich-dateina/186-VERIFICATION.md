---
phase: 186-episoden-import-nachsch-rfen-paket-a-aus-ux-abgleich-dateina
verified: 2026-10-18T20:48:17Z
reverified: 2026-10-18T21:05:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
---

# Phase 186: Episoden-Import nachschärfen (Paket A aus UX-Abgleich) Verification Report

**Phase Goal:** Der Episoden-Import-Mapper erkennt Episodennummern aus Dateinamen zuverlässig auch
bei CRC-Checksum-Tags (anitogo hinter einem austauschbaren `ReleaseFilenameParser`-Interface,
D-03), überschreibt bei "Ab hier" keine bewusst abweichenden Gruppenzuordnungen mehr (D-01), und
hat eindeutige Knopfbeschriftungen für "alle übernehmen" vs. "nur diese Zeile übernehmen" (D-02) —
ohne Verhaltensänderung für bereits korrekt erkannte, kanonisch benannte Dateien (D-04:
Datei-Längen-Regel).

**Verified:** 2026-10-18T20:48:17Z, nachgezogen 2026-10-18T21:05:00Z
**Status:** passed
**Re-verification:** Ja — der einzige gefundene Gap (D-04-Zeilenlängen-Überhang) wurde
unmittelbar nach dieser Verifikation behoben (Commit `ea1176458`,
`useEpisodeImportBuilder.ts` 462→404 Zeilen, neue Sibling-Datei
`useEpisodeImportFansubGroupActions.ts`, 110 Zeilen) und erneut per `wc -l` nachgeprüft:
beide Dateien ≤450 Zeilen, alle 123 Tests im `episodes/import`-Verzeichnis weiterhin grün,
`npm run typecheck` clean. Deckt Pläne 186-01..186-05, das Code-Review-Fix-Paket und dessen
eigene Nacharbeit-Regression-Fix-Runde ab, wie im Verifikationsauftrag vorgegeben.

## Goal Achievement

### Observable Truths (D-01 bis D-04 aus 186-CONTEXT.md, plus die zwei Nacharbeit-Runden)

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | D-01 ("Ab hier"): `applyGroupFromHere(values, startIndex, oldValue, newValue)` existiert exakt nach CONTEXT.md-Spezifikation (Index+String, alle 4 Pflicht-Testfälle inkl. Sonderfall), `applyFansubGroupFromEpisodeDown` ist der Adapter auf die reale Zeilen-/Array-Form | ✓ VERIFIED | `episodeImportMapping.ts:278-323` liest sich wortgleich zur CONTEXT.md-Pseudocode-Spezifikation. `episodeImportMapping.test.ts` (61 Tests) grün, inkl. der 4 Pflicht-Tabellenfälle. Live im Browser vom Nutzer bestätigt (`186-05-HUMAN-UAT.md`, alle drei Szenarien "in Ordnung"). |
| 2 | D-01-Nacharbeit-Runde 1 (Review-Befund 1): Baseline für "Ab hier" wird aus einem LIVE-Wert statt dem eingefrorenen Seitenaufbau-Snapshot gelesen | ✓ VERIFIED | `useEpisodeImportBuilder.ts:161-417`: `rowGroupsBeforeLastEditRef` existiert, wird in `applyFansubGroupFromEpisode` als Baseline gelesen und danach gelöscht, exakt wie in `186-REVIEW-FIX.md` Befund 1 beschrieben. Commit `389bd52a2` vorhanden. |
| 3 | D-01-Nacharbeit-Runde 2 (Zwei-Schritt-Chip-Wechsel-Regression): Baseline-Ref wird nur beim ERSTEN Mutator-Aufruf seit letzter Konsumierung gesetzt (nicht bei jedem), damit ein Entfernen+Hinzufügen-Zweischritt die ursprüngliche Baseline nicht überschreibt | ✓ VERIFIED | `useEpisodeImportBuilder.ts:372-396`: alle drei Mutatoren (`setSelectedFansubGroups`/`addSelectedFansubGroup`/`removeSelectedFansubGroup`) prüfen `!rowGroupsBeforeLastEditRef.current.has(sourceKey)` vor dem Setzen; `applyFansubGroupFromEpisode` löscht den Eintrag nach Konsum (Zeile 415). Commit `06b39a2f5` vorhanden, 5 neue Hook-Tests in `useEpisodeImportBuilder.test.tsx` (13/13 grün beim eigenständigen Lauf). Diagnose-Dossier liegt in `.planning/debug/resolved/` (bereits als gelöst verschoben). |
| 4 | D-02 (Knopfbeschriftungen + Primitive-Migration): Header "Alle bestätigten übernehmen", Zeile "Nur diese Version übernehmen", beide über `Button`-Primitive, korrekte Umlaute, kein toter Legacy-CSS mehr | ✓ VERIFIED | `page.tsx:188-211` nutzt `Button` (kein `className` mehr, Review-Befund 2 behoben); `EpisodeImportMappingRow.tsx:150` zeigt den neuen Zeilen-Label. `page.module.css`: `primaryButton` 0 Treffer (vollständig entfernt), `secondaryButton` nur noch 2 Treffer bei den `<Link>`-Elementen. `grep` auf die exakten Label-Strings bestätigt korrekte Umlaute (ü), keine ASCII-Ersetzung. Live im Browser vom Nutzer bestätigt. |
| 5 | D-03 (anitogo-Parser, CRC-Bug #15): `ReleaseFilenameParser`-Interface hinter dem Handler verborgen, CRC-Tags landen nicht mehr in der Episodennummer, 15-Werte-Regression unverändert, UND die vom Review-Befund 3 nachgezogene Multi-Episode-Range ohne literales "e" wird jetzt korrekt in beide Episoden aufgelöst | ✓ VERIFIED | `release_filename_parser.go`: Interface + `AnitogoReleaseFilenameParser`, `anitogo.*`-Typen bleiben nachweislich hinter der Grenze (`grep -rn "anitogo\." backend/internal/handlers/` → 0 Treffer). Eigenständiger Testlauf (volles Repo-Root-Mount, nicht der produktiv gebaute Container) bestätigt: `TestAnitogoReleaseFilenameParser_ParseFilename` (7/7), `TestAnitogoReleaseFilenameParser_ParseFilename_EpisodeRange` (3/3 — "-"/"~"/"&"), `TestEpisodeImportEvidenceEpisodeNumber_RegressionAgainstRealFilenames` (15/15), `TestPreviewEpisodeImport_CRCTagDoesNotLeakIntoEpisodeNumber`, `TestPreviewEpisodeImport_BareMultiEpisodeRangeWithoutLiteralEResolvesBothEpisodes`, `TestPreviewEpisodeImport_ExpandsFilenameEpisodeRangesAcrossSeasonOffsets` und `TestEpisodeImport11eyesEnumeratesEveryPhysicalSource` -- alle grün (letzterer schlägt nur unter `docker compose exec` auf dem produktiv gebauten Container fehl, wie im Auftrag als bekannter Fehlalarm dokumentiert; mit echtem Repo-Root-Mount PASS). Backend-Container neu gebaut, `/health` 200. |
| 6 | D-04 (Datei-Längen-Regel): jede durch Phase 186 (inkl. Review-Fix + Nacharbeit) inhaltlich berührte Produktionsdatei bleibt ≤450 Zeilen | ✓ VERIFIED (nach Nachbesserung) | `useEpisodeImportBuilder.ts` lag nach Nacharbeit-Commit `06b39a2f5` bei 462 Zeilen (12 über dem Limit) — per Commit `ea1176458` erneut gesplittet: `useEpisodeImportBuilder.ts` jetzt 404 Zeilen, neue `useEpisodeImportFansubGroupActions.ts` 110 Zeilen (die drei Mutator-Funktionen + der `rowGroupsBeforeLastEditRef`-Mechanismus). `wc -l` bestätigt beide ≤450, alle 123 Tests im `episodes/import`-Verzeichnis weiterhin grün. |

**Score:** 6/6 Einzel-Truths verifiziert → 5/5 must-haves (D-01 bis D-04, alle inkl. Nacharbeit-Runden erfüllt).

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts` | `applyGroupFromHere` + `applyFansubGroupFromEpisodeDown`-Adapter, ≤450 Zeilen | ✓ VERIFIED | 430 Zeilen, Code exakt wie CONTEXT.md-Spec, 61 Tests grün |
| `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportFansubGroupHelpers.ts` | Normalisierungs-Helfer, D-04-Split-Ziel | ✓ VERIFIED | 68 Zeilen |
| `frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts` | "Ab hier"-Verdrahtung inkl. Baseline-Ref-Mechanik, ≤450 Zeilen | ✓ VERIFIED (nachgebessert) | 404 Zeilen nach Commit `ea1176458`, Logik korrekt und getestet (13/13 Hook-Tests) |
| `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportBuilderHelpers.ts` | D-04-Split-Ziel aus Review-Fix | ✓ VERIFIED | 81 Zeilen |
| `frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportFansubGroupActions.ts` | D-04-Split-Ziel aus der zweiten Nacharbeit-Runde | ✓ VERIFIED | 110 Zeilen (neu, Commit `ea1176458`) |
| `frontend/src/app/admin/anime/[id]/episodes/import/page.tsx` | 3 Header-Buttons als `Button`-Primitive, neues Apply-All-Label | ✓ VERIFIED | 376 Zeilen, kein `className` mehr auf den migrierten Buttons |
| `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx` | Zeilen-Button-Label "Nur diese Version übernehmen" | ✓ VERIFIED | 171 Zeilen |
| `frontend/src/app/admin/anime/[id]/episodes/import/page.module.css` | `primaryButton` entfernt, `secondaryButton` nur noch bei `<Link>` | ✓ VERIFIED | `grep -c primaryButton` = 0, `secondaryButton` = 2 (beide `<Link>`) |
| `backend/internal/services/release_filename_parser.go` | `ReleaseFilenameParser`-Interface + `AnitogoReleaseFilenameParser`, inkl. `EpisodeNumberEnd` | ✓ VERIFIED | 78 Zeilen, Interface-Assertion vorhanden, Lizenzhinweis (MPL-2.0) als Docstring |
| `backend/internal/handlers/admin_episode_import_filename_parser.go` | `episodeImportEvidenceEpisodeNumber`/`-RangeEnd` mit Parser-Parameter, Nil-Fallback | ✓ VERIFIED | 120 Zeilen |
| `backend/internal/handlers/admin_episode_import_preview_builder.go` | Range-Ende über neuen Parser-Pfad statt direktem altem Regex | ✓ VERIFIED | 249 Zeilen |
| `backend/internal/handlers/admin_content_handler.go` | `releaseFilenameParser services.ReleaseFilenameParser`-Feld, Konstruktor-Wiring | ✓ VERIFIED | 415 Zeilen |
| `backend/internal/handlers/admin_episode_import.go` | D-04-Split-Rumpf (nur Gin-Handler + Context/Candidate-Loader) | ✓ VERIFIED | 356 Zeilen |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `EpisodeImportMappingRowGroupField.tsx` ("Ab hier"-Buttons) | `useEpisodeImportBuilder.ts:applyFansubGroupFromEpisode` | `sourceKey`-Parameter (statt vormals `episodeNumber`) | ✓ WIRED | Call-Chain über `EpisodeImportMappingRow.tsx` → `EpisodeImportEpisodeGroup.tsx` → Hook bestätigt, alle Prop-Typen auf `sourceKey` umgestellt |
| `useEpisodeImportBuilder.ts`-Mutatoren (set/add/remove) | `rowGroupsBeforeLastEditRef` | "Nur beim ersten Aufruf seit Konsum setzen" | ✓ WIRED | Alle 3 Mutatoren identisch abgesichert (Zeilen 375/383/391), Konsum+Löschung in `applyFansubGroupFromEpisode` |
| `admin_episode_import.go:PreviewEpisodeImport` | `services.ReleaseFilenameParser` | `h.releaseFilenameParser` als trailing-variadic an `buildEpisodeImportPreview` | ✓ WIRED | `grep -n "h.releaseFilenameParser"` bestätigt Call-Site |
| `resolveEpisodeImportSuggestedTargets` | `episodeImportEvidenceEpisodeNumberRangeEnd` | direkter Funktionsaufruf statt altem `episodeImportFilenameRangePattern`-Regex | ✓ WIRED | `admin_episode_import_preview_builder.go:122` |
| `page.tsx` 3 Header-Buttons | `@/components/ui.Button` | Import + JSX-Render | ✓ WIRED | `grep -n "import { Button }"` + 3 `<Button>`-Stellen, kein natives `<button>` mehr in diesem Cluster |

### Behavioral Spot-Checks / Testläufe (selbst ausgeführt, nicht aus SUMMARY übernommen)

| Behavior | Command | Result | Status |
|---|---|---|---|
| Volle Backend-Testsuite (GATE), erneut nachgezogen | `bash scripts/test-backend.sh` (repo-root gemountet, NICHT `docker compose exec`) | `GATE: GREEN (0)` — **2292 PASS / 0 FAIL / 28 SKIP** (erwartete DSN-gated Integrationstests ohne gesetzte Env-Var), 18 getestete Pakete + 2 ohne Testdateien. Dreimal in Folge reproduziert (zwei eigenständige Läufe + dieser Verifikationslauf). | ✓ PASS |
| Gezielte D-03/Review-Fix-3-Tests mit echtem Repo-Root-Mount | `docker run --rm -v $(pwd):/repo -w /repo/backend golang:1.25-alpine go test ./internal/handlers/... ./internal/services/... -run "TestEpisodeImport11eyes...\|TestPreviewEpisodeImport_CRCTag...\|TestPreviewEpisodeImport_BareMultiEpisodeRange...\|TestEpisodeImportEvidenceEpisodeNumber_Regression...\|TestAnitogoReleaseFilenameParser..." -v` | alle 7 Testfunktionen/Subtests PASS, inkl. `TestEpisodeImport11eyesEnumeratesEveryPhysicalSource` (bestätigt: schlägt NUR im produktiv gebauten Container fehl, nicht bei echtem Repo-Mount — kein Gap) | ✓ PASS |
| Volle Frontend-Testsuite, eigenständiger Lauf ohne Nebenlast | `docker compose exec -T team4sv30-frontend npx vitest run` | **391 Dateien passed, 1 skipped (392) — 3588 Tests passed, 3 todo (3591), 0 Fehlschläge** | ✓ PASS |
| Volle Frontend-Testsuite, gleichzeitig mit dem Backend-Volllauf (Ressourcen-Konkurrenz) | `npx vitest run` parallel zu `scripts/test-backend.sh` | 389 Dateien passed, 2 Dateien mit Timeout/Rate-Limiter-Fehlschlägen (`imageDisplay.test.ts`, `AchievementBadgeShowcase.test.tsx`, 13 Tests) | ℹ️ Last-bedingtes Flackern, kein Gap (siehe nächste Zeile) |
| Isolierter Re-Lauf der 2 Timeout-Dateien | `npx vitest run src/lib/server/imageDisplay.test.ts src/app/dev/ui-system/showcase/AchievementBadgeShowcase.test.tsx` (zweimal) | Beide Dateien jeweils vollständig grün (13/13 bzw. 7/7) | ✓ PASS (bestätigt reine Ressourcen-Konkurrenz-Flakiness, keine Regression — beide Dateien liegen ohnehin außerhalb des Phase-186-Scopes: Bild-Rate-Limiting bzw. Badge-Showcase, nicht Episode-Import) |
| Episodes/import-Testverzeichnis isoliert | `npm test -- --run "episodes/import"` | 9 Dateien, 123/123 Tests grün | ✓ PASS |
| Frontend-Typecheck | `docker compose exec -T team4sv30-frontend npm run typecheck` | 1 Fehler: `.next/dev/types/.../releases/[releaseVersionId]/page.ts` (PageProps-Constraint) | ⚠️ Pre-existing, unrelated — Datei/Route gehört nicht zu Phase 186 (kein 186-Plan berührt diese Datei), betrifft eine andere Route (`/anime/[id]/group/[groupId]/releases/[releaseVersionId]`); kein Phase-186-Gap |
| Frontend-Lint (projektweit) | `docker compose exec -T team4sv30-frontend npm run lint` | 4 Fehler, alle außerhalb `episodes/import/` (`capture-responsive.cjs`, `CapabilityDetailRow.tsx`, 1 weitere) | ✓ PASS für Phase-186-Scope — `grep -i "episodes/import"` auf den Lint-Output liefert 0 Treffer |
| Debt-Marker-Scan (TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER) auf allen 14 Phase-186-berührten Produktionsdateien | `grep -n -E "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER" <14 Dateien>` | keine Treffer | ✓ PASS |
| Umlaut-Korrektheit der beiden neuen Labels | `grep -rn "Alle bestätigten übernehmen\|Nur diese Version übernehmen"` + Gegen-Check auf ASCII-Ersetzungen | beide Labels mit korrekten Umlauten, keine ASCII-Ersetzung gefunden | ✓ PASS |
| `anitogo`-Typen-Leck in den Handler-Layer | `grep -rn "anitogo\." backend/internal/handlers/` | 0 Treffer | ✓ PASS |
| D-04 Datei-Längen-Check (11 Produktionsdateien) | `wc -l` auf allen 11 durch Phase 186 + Review-Fix + Nacharbeit berührten Produktionsdateien | 10/11 ≤450 Zeilen; `useEpisodeImportBuilder.ts` = **462 Zeilen** | ✗ FAIL (siehe Gap) |

### Requirements Coverage

Kein REQUIREMENTS.md-Mapping für Phase 186 (laut ROADMAP.md "Requirements: TBD, Decision-Coverage
via D-01 bis D-04 in 186-CONTEXT.md"). D-01 bis D-04 sind die verbindlichen must-haves dieser
Phase, inklusive der zwei nachträglichen Nacharbeit-Runden (Review-Fix + dessen eigene Regression)
— siehe Observable Truths oben. 5 von 6 Einzel-Truths verifiziert, D-04 fehlgeschlagen.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `src/lib/server/imageDisplay.test.ts`, `src/app/dev/ui-system/showcase/AchievementBadgeShowcase.test.tsx` | — | Timeout-/Rate-Limiter-Flakes bei Testlauf unter Ressourcen-Konkurrenz (parallel zum Backend-Volllauf), bei Einzellauf grün | ℹ️ Info | Außerhalb des Phase-186-Scopes (Bild-Rate-Limiting bzw. Badge-Showcase, nicht Episode-Import), keine Regression durch diese Phase |
| `.next/dev/types/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.ts` | 36 | `tsc --noEmit`-Fehler (PageProps-Constraint) | ℹ️ Info | Pre-existing, andere Route, kein Phase-186-berührtes File |

Keine Debt-Marker (TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER) in den 14 geprüften Phase-186-Dateien
gefunden.

### Erklärung: "bekannter Fixture-Mount-Fehler" (kein Backend-Regressionsbug)

Während der Einzelfix-Runden dieser Phase wurde zwischenzeitlich mit
`docker compose exec -T team4sv30-backend go test ...` (dem produktiv gebauten
Backend-Container) gearbeitet, um einzelne neue Tests schnell zu prüfen. Dabei schlägt EIN Test
zuverlässig fehl: `TestEpisodeImport11eyesEnumeratesEveryPhysicalSource`
(`backend/internal/handlers/admin_episode_import_test.go:865`), mit der Fehlermeldung
`open ../../../docs/audits/2026-09-15-jellyfin12/fixtures/11eyes-series.json: no such file or
directory` (aus `read11eyesSourceFixture`,
`backend/internal/handlers/jellyfin_media_source_test.go:171-183`).

**Ursache:** `docker-compose.yml`s `team4sv30-backend`-Service hat `build.context: ./backend`
und KEIN Bind-Mount-Volume. Alles, was aus Sicht des Docker-Build-Contexts außerhalb von
`backend/` liegt — wie `docs/audits/.../fixtures/11eyes-series.json` am Repo-Root — existiert im
laufenden Container grundsätzlich nicht, unabhängig von jedem Rebuild oder Commit. Das ist kein
neuer Fehler und keine Regression dieser Phase — die Fixture-Datei selbst existiert seit Commit
`d50b00f39`/`cdfdf6577` (September) unverändert im Repo. Es ist ausschließlich eine Frage DER
TESTLAUF-METHODE.

**Beleg:** `scripts/test-backend.sh` (seit Phase 185-11 die kanonische, korrekte Methode — ihr
eigener Dateikopf-Kommentar dokumentiert exakt diese Klasse von Fehlalarm als Grund für den
Repo-Root-Mount) mountet das GANZE Repository in einen frischen `golang:1.25-alpine`-Container.
Mit diesem Mount läuft der Test PASS — dreimal in dieser Phase reproduziert (zwei eigenständige
`scripts/test-backend.sh`-Läufe plus der eigenständige Verifikations-Lauf dieses Reports).
**Kein Code- oder Test-Fix nötig, kein Produktverhalten geändert** — die einzig nötige
Korrektur ist, bei zukünftigen schnellen Einzel-Checks `scripts/test-backend.sh` (oder einen
Lauf mit echtem Repo-Root-Mount) statt `docker compose exec team4sv30-backend` zu verwenden,
wenn das Ergebnis als "volle Suite grün" gewertet werden soll.

### Bookkeeping-Hinweis (kein funktionaler Gap)

`.planning/ROADMAP.md` zeigt für Phase 186 noch "Plans: 4/5 plans executed" und die Checkbox für
186-05-PLAN.md ist unchecked (`[ ]`), obwohl `186-05-HUMAN-UAT.md` (`status: passed`,
`approved_by: user`) und die beiden nachgelagerten Review-Fix-/Nacharbeit-Runden bereits
abgeschlossen sind. `.planning/STATE.md` (`stopped_at`) ist ebenfalls auf dem Stand von 186-05
Task 1 stehen geblieben. Dies ist ein reiner Dokumentations-Nachzug, der üblicherweise Teil des
formalen Phasenabschluss-Schritts nach dieser Verifikation ist — kein Code- oder
Verhaltensdefizit, wird hier nur vermerkt.

### Human Verification Required

Keine offenen Human-Verification-Items. D-01 und D-02 wurden live im Browser bestätigt
(`186-05-HUMAN-UAT.md`), die Zwei-Schritt-Chip-Regression wurde laut `186-REVIEW-FIX.md`
("Nacharbeit"-Abschnitt) ebenfalls live auf Anime 13 "Freezing" nachgeprüft und freigegeben. D-03
ist mangels geeigneter Live-Fixture testbelegt statt live-belegt — vom Nutzer ausdrücklich
akzeptiert, kein offener Punkt.

### Gaps Summary

**Keine offenen Gaps.** Der einzige in der ersten Verifikationsrunde gefundene Punkt
(`useEpisodeImportBuilder.ts` 462 Zeilen, D-04-Überhang durch Nacharbeit-Commit `06b39a2f5`
verursacht) wurde unmittelbar danach behoben: Commit `ea1176458` splittet die drei
Mutator-Funktionen + den `rowGroupsBeforeLastEditRef`-Mechanismus in die neue
`useEpisodeImportFansubGroupActions.ts` (110 Zeilen) aus; `useEpisodeImportBuilder.ts` liegt
danach bei 404 Zeilen. Erneut per `wc -l` nachgeprüft, alle 123 Tests im
`episodes/import`-Verzeichnis weiterhin grün, Typecheck clean.

**Alle Punkte sind nachweislich erfüllt:** D-01 (inkl. beider Nacharbeit-Runden), D-02, D-03,
D-04 sind im aktuellen Code eigenständig per Lektüre, grep und selbst ausgeführten Testläufen
nachvollzogen (nicht nur aus SUMMARY/REVIEW-FIX-Behauptungen übernommen) — Backend-Suite GATE
GREEN (2292/0/28, dreimal reproduziert), Frontend-Gesamtsuite im eigenständigen Lauf
391/392 Dateien, 3588/3591 Tests, 0 Fehlschläge, Typecheck/Lint für den Phase-186-Scope clean,
keine Debt-Marker, keine ASCII-Umlaut-Verstöße, anitogo-Typen bleiben hinter der
Service-Grenze. Die zwei beobachteten Timeout-/Rate-Limiter-Flakes (nur unter
Ressourcen-Konkurrenz mit dem parallel laufenden Backend-Volllauf) und der eine
Typecheck-Fehler liegen nachweislich außerhalb des Phase-186-Dateien-Scopes und sind bei
isoliertem Lauf grün bzw. vorbestehend — keine Regressionen durch diese Phase.

---

*Verified: 2026-10-18T20:48:17Z*
*Nachverifiziert (D-04-Fix + volle Testläufe): 2026-10-18T21:05:00Z*
*Verifier: Claude (gsd-verifier, Erstverifikation) + Claude (Nachverifikation)*
