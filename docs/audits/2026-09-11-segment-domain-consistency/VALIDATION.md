# Validierung und Grenzen

Begleitdokument zu [REPORT.md](REPORT.md). Zusammenfassung der in Plan 156-10 real ausgeführten
Tests und der in den vorangehenden zehn Plänen (156-01 bis 156-09, 156-11) bereits real
ausgeführten und hier erneut bestätigten Tests, als Belegkette für die Phase-156-Abnahmekriterien
(`156-USER-REQUEST.md` §§25-28 und „Abnahmekriterien"). Jeder Eintrag verweist auf einen
tatsächlich gelaufenen Befehl (siehe [REPRODUCE.md](REPRODUCE.md)) oder einen direkten Codebeleg
(Datei:Zeile) — keine Behauptung ohne eine dieser beiden Belegarten.

## §25 — Tests: Segment Lifecycle

| Geforderter Fall | Beleg | Ergebnis |
| --- | --- | --- |
| Segment 1–10 anlegen bei vorhandenen Releases 1–3 | `TestAssignThemeSegmentToEpisodeRange/assigns_all_release_versions_in_range...` | PASS (re-run 156-10) |
| Release 4 später hinzufügen -> Assignment entsteht automatisch | `TestUpsertReleaseVersionGroupAutoAssign_SegmentFirst` | PASS (re-run 156-10) |
| Range 1–10 -> 1–5 verkürzen | `TestAssignThemeSegmentToEpisodeRange/shrink:_a_narrower_range_removes...` | PASS (re-run 156-10) |
| Range 1–5 -> 1–10 erweitern | `TestAssignThemeSegmentToEpisodeRange/grow:_a_wider_range_adds...` | PASS (re-run 156-10) |
| Segment löschen | `ON DELETE CASCADE` auf `theme_segment_assignments.theme_segment_id` (Codebeleg: `database/migrations/0141_theme_segment_assignments.up.sql:14`, unverändert durch diese Phase, referenziert in 156-04-SUMMARY.md's Validierungsreihenfolge-Begründung) | Codebeleg, nicht neu getestet in 156-10 |
| Neue Release-Version innerhalb bestehender Range | `TestUpsertReleaseVersionGroupAutoAssign_SegmentFirst`/`_ReleaseFirstThenSegment` | PASS (re-run 156-10) |
| Release außerhalb Range | `TestUpsertReleaseVersionGroupAutoAssign_OutOfRangeGetsNoAssignment` | PASS (re-run 156-10) |
| Mehrere Segmente | `TestAttachReleaseTimelineSegments/zwei_tatsaechlich_verschiedene_Segmente...` | PASS (re-run 156-10) |
| Segmentwechsel | `TestAttachReleaseTimelineSegments` (dieselbe Subtest-Familie) + `TestReleaseDetailPublicSegments/echter_Segment-Wechsel_wird_NICHT_unterdrueckt` | PASS (re-run 156-10) |
| Segment mit gleicher Range, aber anderer ID | `TestAssignThemeSegmentToEpisodeRange/cross-domain_safety:...` (beweist Domain-Isolation, die dieselbe Range unter anderer Segment-ID nicht verwechselt) | PASS (re-run 156-10) |

## §26 — Tests: Projektseite

| Geforderter Fall | Beleg | Ergebnis |
| --- | --- | --- |
| Segment A gilt 1–10, Folge 1 sichtbar, Folge 2–10 nicht erneut | `TestAttachReleaseTimelineSegments/erscheint_nur_bei_erster_Zuweisung,_beide_Folgen_auf_derselben_Seite_geladen` | PASS (re-run 156-10) |
| Global erste Zuweisung bleibt korrekt auch über Seitenwechsel | `TestAttachReleaseTimelineSegments/globale_First-Occurrence_bleibt_korrekt_auch_wenn_die_fruehere_Folge_auf_einer_anderen_Seite_liegt` | PASS (re-run 156-10) |
| Segment B beginnt Folge 11, dort sichtbar | `TestAttachReleaseTimelineSegments/zwei_tatsaechlich_verschiedene_Segmente_erscheinen_je_auf_eigener_First-Occurrence-Folge` | PASS (re-run 156-10) |
| Creditänderung innerhalb Segment A erzeugt KEINEN neuen Timeline-Eintrag | Strukturbeweis: `attachReleaseTimelineSegments`'s Existenz-/First-Occurrence-Logik liest ausschließlich `theme_segment_assignments`/`theme_segments`, nie Credit-/Contributor-Tabellen (Codebeleg: `backend/internal/repository/group_repository_cursor_timeline.go`, kein Contributor-Join in der Timeline-Query) | Codebeleg, kein separater Live-Test in dieser Phase (Struktur macht die Kopplung unmöglich, nicht nur unwahrscheinlich) |

## §27 — Tests: Release-Seite

| Geforderter Fall | Beleg | Ergebnis |
| --- | --- | --- |
| Release 5 verwendet Segment A, Segment A sichtbar | `TestReleaseDetailPublicSegments/Folge_ohne_Vorfolge_zeigt_das_Segment_und_traegt_die_Span-Reichweite` + `.../geteiltes_Segment_wird_auf_der_Folgeepisode_NICHT_unterdrueckt_(D-02_aufgehoben)` | PASS (re-run 156-10) |
| Kennzeichnung Range/Origin sinnvoll | `applyAppliesThroughEpisode` unverändert (Range-Label), `origin_release_version_id`-Feld auf `AdminThemeSegment`/`PublicReleaseSegment` (Codebeleg: `theme_segment_origin.go`, `release_detail_public_repository_helpers.go`) | Codebeleg + PASS (obige Tests prüfen `AppliesThroughEpisode`-Werte explizit) |
| Aktuelle Credits der Origin sichtbar | `TestReleaseDetailPublicSegmentOriginCredits/Test2:_Origin_mit_Uebersetzer+Timer...`, `Test3:_Rollenkorrektur...(live)`, `Test4:_neu_hinzugefuegter_Beteiligter...` | PASS (re-run 156-10) |
| Release 11 verwendet Segment B, Segment A nicht sichtbar falls nicht zugewiesen | `TestReleaseDetailPublicSegments/echter_Segment-Wechsel_wird_NICHT_unterdrueckt` (beweist die Kehrseite: nur tatsächlich zugewiesene Segmente erscheinen) | PASS (re-run 156-10) |

## §28 — Tests: Credits

| Geforderter Fall | Beleg | Ergebnis |
| --- | --- | --- |
| Translation korrekt projiziert | `TestSegmentCreditRoleFilter/allow-listed_role_(translator)_is_included` + `TestReleaseDetailPublicSegmentOriginCredits/Test2` | PASS (re-run 156-10) |
| Timing korrekt projiziert | `TestReleaseDetailPublicSegmentOriginCredits/Test2:_Origin_mit_Uebersetzer+Timer_liefert_beide_inkl._RoleCodes` | PASS (re-run 156-10) |
| Karaoke FX korrekt projiziert | `permissions.SegmentCreditRoleCodes` enthält `RoleKaraokeFX` (Codebeleg: `backend/internal/permissions/permissions.go:93`); Filterlogik identisch zu Translation/Timing getestet über `TestSegmentCreditRoleFilter`'s generisches Allow-List-Prinzip | Codebeleg + generischer Testbeweis (kein dediziertes Karaoke-FX-Fixture in den Origin-Credit-Tests, aber derselbe Filterpfad wie translator/timer) |
| Typesetting korrekt projiziert | `permissions.SegmentCreditRoleCodes` enthält `RoleTypesetter` (Codebeleg: `backend/internal/permissions/permissions.go:93`) | Codebeleg, gleicher Filterpfad |
| Encoding wird NICHT als Segmentcredit angezeigt | `TestSegmentCreditRoleFilter/encoder-only_is_excluded` + `TestReleaseDetailPublicSegmentOriginCredits/Test5:_Encoder_und_Quality-Checker_erscheinen_NIE_als_Segment-Credit` | PASS (re-run 156-10) |
| QC wird NICHT als Segmentcredit angezeigt | `TestSegmentCreditRoleFilter/quality_checker-only_is_excluded_exactly_like_encoder` + dieselbe `Test5` | PASS (re-run 156-10) |
| Creditänderung live sichtbar | `TestReleaseDetailPublicSegmentOriginCredits/Test3:_Rollenkorrektur_auf_der_Origin_wirkt_sich_sofort_auf_den_naechsten_Aufruf_aus_(live)` | PASS (re-run 156-10) |
| Keine Label-Substring-Heuristik | `grep -rn "strings.Contains(label" backend/internal/repository/release_detail_public_repository_helpers.go` -> 0 Treffer (Codebeleg) + `TestSegmentCreditRoleFilter/mixed_encoder+translator_is_included` beweist die Allow-List-Logik funktioniert über Rollen-Codes, nicht Strings | Codebeleg + PASS |

## Task 1 (dieser Plan, 156-10): Vollständiger Backend-/Frontend-Testlauf, Migrations-Rundlauf

Siehe [REPRODUCE.md](REPRODUCE.md) für die exakten Befehle.

### Backend

`go build ./... && go vet ./...`: **grün, exit 0.**

`go test ./internal/repository/... ./internal/handlers/... ./internal/permissions/... -count=1`
mit `TEAM4S_PHASE117_TEST_DSN` gesetzt: `internal/handlers` und `internal/permissions` beide
**`ok`**. `internal/repository` meldet **49 Einzeltest-Fehlschläge**, alle vorbestehend, keiner
durch Phase 156 verursacht — siehe TABLES.md Tabelle 8 für die vollständige Kategorisierung.
Bestätigt per gezieltem `-run`-Filter über alle Phase-156-spezifischen Testnamen (siehe
REPRODUCE.md): jeder einzelne PASS, keiner unter den 49 Fehlschlägen.

Migration 0161: `status` (161 applied, 0 pending) -> `down -steps 1` (Spalte entfernt, Head 160)
-> `up` (Spalte+Index+Backfill wiederhergestellt, Head 161) -> Backfill-Werte vor/nach
byte-identisch (`27/27/29`). Backend nach `docker compose up -d --build` `/health` -> 200/`ok`.

### Frontend

`npx tsc --noEmit`: **grün, exit 0.**

`npx vitest run`: **298 Testdateien bestanden, 1 übersprungen (299 gesamt); 2.305 Tests bestanden,
3 Todo (2.308 gesamt); 0 Fehlschläge.** Enthält alle elf Phase-156-Pläne's neue/geänderte
Testdateien.

`npx eslint .`: **13 Errors / 331 Warnings**, ausnahmslos in Dateien außerhalb jeder
Phase-156-`files_modified`-Liste (`capture-responsive.cjs`,
`admin/episode-versions/[versionId]/edit/useEpisodeNeighborNavigation.ts`,
`admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts`,
`admin/fansubs/[id]/edit/GroupMemberFormModals.tsx`, `admin/fansubs/[id]/edit/GroupRolesTab.tsx`,
`admin/groups/AdminGroupsClient.tsx`, `admin/roles/RoleCapabilityDetail.tsx`,
`admin/users/tabs/CapabilityDetailRow.tsx`, `admin/users/tabs/CapabilityHistoryPanel.tsx`,
`tmp-playwright-phase4/cover-ui-smoke.mjs`). Identisch zur bereits in Phase 155s Audit
(`docs/audits/2026-09-11-fansub-project-performance/VALIDATION.md`) dokumentierten vorbestehenden
Baseline (13 Errors / 331 Warnings).

### Produktions-Builds

`docker compose build team4sv30-frontend` und `docker compose build team4sv30-backend`: beide
erfolgreich.

`git status --short` nach allen Läufen: **leer** — keine unbeabsichtigten Dateien durch den
Testlauf zurückgelassen.

## `156-VALIDATION.md`: Per-Task Verification Map

Jede Zeile der phaseninternen `156-VALIDATION.md`'s "Per-Task Verification Map" wurde in 156-10
erneut gegen ihren genannten Automated Command geprüft und von `⬜ pending` auf `✅ green`
umgestellt — mit EINER expliziten Ausnahme: die Zeile für P156-18 (`156-04-T2 + 156-11-T1`) bleibt
auf `⚠️ PARTIAL`, weil ihr manueller Anteil (156-11 Task 2, `checkpoint:human-verify`) nicht
automatisierbar ist und in keiner Ausführungsumgebung dieser Phase durchgeführt werden konnte.
Siehe `.planning/phases/156-segment-domain-konsistenz-und-oeffentliche-release-projektion/156-VALIDATION.md`
für die vollständige, aktualisierte Tabelle.

## Bekannte, nicht in dieser Phase behobene Befunde (Querverweis)

- Der pre-existing Test-Order-Dependency-Befund (vier `RangeAutoAssign`-Handlertests scheitern bei
  isoliertem `-run`-Filter, sind aber im vollen Paket-Lauf grün) ist in `deferred-items.md`
  dokumentiert und wurde in 156-10 NICHT erneut isoliert reproduziert — der volle Paket-Lauf
  (`go test ./internal/handlers/... -count=1`) ist die tatsächlich verwendete
  Korrektheitsverifikation, und dieser ist grün.
- Alle in TABLES.md Tabelle 8 aufgeführten 49 Backend-Testfehlschläge sind vorbestehend und
  außerhalb dieser Phase — nicht behoben (Scope-Boundary-Regel).
- Die 13 ESLint-Errors sind vorbestehend (identisch zu Phase 155s dokumentierter Baseline) — nicht
  behoben.

## Der EINE offene Punkt: P156-18 / Plan 156-11 Task 2

Dies ist die einzige Zeile in diesem gesamten Dokument, die NICHT als grün/bestanden markiert wird.
`checkpoint:human-verify` (Plan 156-11, Task 2) erfordert eine echte, authentifizierte
Platform-Admin-Browsersession über `http://127.0.0.1:3300`, die in keiner Ausführungsumgebung
dieser Phase — inklusive dieser (156-10) — verfügbar war. Der automatisierbare Anteil (Task 1:
Type-Feld, API-Client, Select-Steuerelement, Backend-Endpunkt-Handler-Test) ist vollständig grün
(siehe oben, `TestSetAnimeSegmentOrigin_*` PASS). Der manuelle Anteil bleibt **offen**, nicht
bestanden und nicht fehlgeschlagen. Konkrete Prüfanweisung und Testdatensatz
(`theme_segment_id 3`, 3 Zuweisungen) stehen in
`.planning/phases/156-segment-domain-konsistenz-und-oeffentliche-release-projektion/deferred-items.md`.

**Phase 156 wird auf Basis dieses Dokuments als funktional und automatisiert abgeschlossen
behandelt — NICHT als vollständig verifiziert/abgenommen**, solange dieser eine Punkt offen bleibt.
