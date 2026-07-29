---
phase: 117
slug: kara-segment-zeit-override-anzeige
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-29
---

# Phase 117 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Quelle: 117-RESEARCH.md § Validation Architecture (Test-Infrastruktur direkt aus der Codebasis belegt).

---

## Test Infrastructure

Diese Phase berührt zwei Tiers (Go-Backend + Next.js/TS-Frontend) — beide Frameworks gelten.

| Property | Value (Backend) | Value (Frontend) |
|----------|-----------------|------------------|
| **Framework** | Go `testing` + `github.com/stretchr/testify` | Vitest 3 |
| **Config file** | `backend/go.mod` | `frontend/vitest.config.ts` |
| **Quick run command** | `go test ./internal/repository/... ./internal/handlers/...` (in `backend/`) | `npm test` (in `frontend/`) |
| **Full suite command** | `go test ./internal/...` (in `backend/`) | `npm test` (in `frontend/`) |
| **Estimated runtime** | ~30–90 s | ~20–60 s |

Bestehende Segment-Tests (Ausgangsbasis, laut Research):
- Backend: `backend/internal/handlers/segment_stream_test.go`, `segment_render_worker_test.go`, `segment_render_refresh_test.go`, `segment_validation_test.go`; `backend/internal/repository/theme_segment_render_cache_test.go`, `segment_playback_resolution_test.go` (**Achtung:** überwiegend String-Pattern-Checks gegen Quellcode, keine DB-Integrationstests — s. Wave-0-Lücken).
- Frontend: `SegmenteTab.test.tsx`, `ThemeTimeline.test.tsx`.

---

## Sampling Rate

- **After every task commit:** Run tier-passenden Quick-Befehl (`go test ./internal/repository/... ./internal/handlers/...` bzw. `npm test`)
- **After every plan wave:** Run vollständige Suite des betroffenen Tiers (`go test ./internal/...` und/oder `npm test`)
- **Before `/gsd:verify-work`:** Beide Suiten müssen grün sein
- **Max feedback latency:** ~90 s

---

## Per-Task Verification Map

> Befüllt aus den 9 Plänen (117-01 bis 117-09) nach der Nyquist-Revision. `File Exists` bezieht sich
> auf den Stand VOR Ausführung (Planungs-/Revisionszeitpunkt) — alle Testdateien sind Wave-0-Neubauten
> und existieren daher noch nicht (❌ W0). `Status` wird während der Ausführung (`/gsd:execute-phase`)
> aktualisiert.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 117-01-01 | 01 | 1 | D-03 | T-117-01-01 / T-117-01-02 | Migration 0141 additiv, kein Datenverlust bei Backfill/Umbau; alter 1:1-Index bewusst NICHT gedroppt (W1) | migration | `cd backend && go run ./cmd/migrate up && go run ./cmd/migrate down -steps=1 && go run ./cmd/migrate up` | ❌ W0 | ⬜ pending |
| 117-01-02 | 01 | 1 | D-01 | T-117-01-01 | Migration 0142/0143 additiv, composite FK erzwingt Zuweisung vor Override | migration | `cd backend && go run ./cmd/migrate up && go run ./cmd/migrate down -steps=2 && go run ./cmd/migrate up` | ❌ W0 | ⬜ pending |
| 117-02-01 | 02 | 2 | D-03 | T-117-02-01 | Wave-0-DB-Testfixture nutzt DSN-/Schema-Namens-Guard (kein Schreibzugriff auf Produktions-DB) | integration | `cd backend && go build ./... && go test ./internal/testsupport/... -run Phase117 -v` | ❌ W0 | ⬜ pending |
| 117-02-02 | 02 | 2 | D-01/D-03 | T-117-02-02 | Override-Upsert ohne Zuweisung liefert `ErrConflict` (DB-FK), kein stiller Erfolg | unit | `cd backend && go build ./... && go vet ./internal/models/... ./internal/repository/...` | ❌ W0 | ⬜ pending |
| 117-02-03 | 02 | 2 | D-01/D-03 | T-117-02-02 | Konflikt-Pfad (Override ohne Zuweisung) und Cascade-Pfad (Unassign löscht Override) sind gegen echte Postgres-Instanz bewiesen | integration | `cd backend && go test ./internal/repository/... -run TestThemeSegmentAssignments -v` | ❌ W0 | ⬜ pending |
| 117-03-01 | 03 | 3 | D-03 | T-117-03-02 / T-117-03-03 | Deterministische Pro-Release-Version-Auflösung; Drop des 1:1-Legacy-Index ATOMAR mit ON-CONFLICT-Umstellung (W1-Abschluss) | unit+migration | `cd backend && go build ./... && go vet ./internal/repository/... && go run ./cmd/migrate up` | ❌ W0 | ⬜ pending |
| 117-03-02 | 03 | 3 | D-01/D-03 | T-117-03-01 | Render-Cache-Lookups release_version_id-scoped, kein Cross-Episode-Leak; Zuweisungs-Hydration liefert echte Episodennummer (B3-Vorbereitung) | unit | `cd backend && go build ./... && go vet ./internal/repository/... ./internal/handlers/... ./internal/models/...` | ❌ W0 | ⬜ pending |
| 117-03-03 | 03 | 3 | D-01/D-03 | T-117-03-01 / T-117-03-02 | Mehr-Folgen-Auflösung, Override-Isolation, Cache-Nicht-Kollision UND Cache-Key-Differenz (SourceIdentity, W2) gegen echte Postgres-Instanz bewiesen | integration | `cd backend && go test ./internal/repository/... -run TestThemeSegmentPlaybackResolution -v` | ❌ W0 | ⬜ pending |
| 117-04-01 | 04 | 4 | D-03 | — | Playback-Hydration eindeutig auf aktuell geöffnete Release-Version bezogen (kein Cross-Episode-Leak im Editor-Kontext) | unit | `cd backend && go build ./... && go vet ./internal/repository/... ./internal/handlers/...` | ❌ W0 | ⬜ pending |
| 117-04-02 | 04 | 4 | D-01/D-03 | T-117-04-01 | Fan-Out invalidiert NUR nicht-überschriebene Zuweisungen; `AttachSegmentLibraryAsset` löst denselben Invalidierungspfad aus wie `UpdateAnimeSegment` (Risk-5-Fix) | integration | `cd backend && go build ./... && go test ./internal/handlers/... -run Segment -v` | ❌ W0 | ⬜ pending |
| 117-04-03 | 04 | 4 | D-01/D-03 | T-117-04-01 | Regressionstest beweist explizit, dass überschriebene Release-Version vom Fan-Out ausgenommen wird | unit | `cd backend && go test ./internal/handlers/... -run Segment -v` | ❌ W0 | ⬜ pending |
| 117-05-01 | 05 | 5 | D-01/D-03 | T-117-05-01 / T-117-05-02 / T-117-05-03 | Jeder neue Schreib-Endpunkt ruft `requireSegmentManage` vor jeder DB-Mutation auf | unit (build) | `cd backend && go build ./...` | ❌ W0 | ⬜ pending |
| 117-05-02 | 05 | 5 | D-01/D-03 | T-117-05-01 / T-117-05-02 / T-117-05-03 | Vier Handler-Verhaltensfälle (403/201/400/409/404) grün; OpenAPI-Contract additiv in admin-content.yaml (W3) | unit | `cd backend && go test ./internal/handlers/... -run AnimeSegmentAssignment -v` | ❌ W0 | ⬜ pending |
| 117-06-01 | 06 | 6 | D-01/D-03 | T-117-06-01 | Neue API-Client-Funktionen/Hook-Methoden typsicher, kein direkter `fetch` in der Hook-Datei | unit (typecheck) | `cd frontend && npm run typecheck` | ❌ W0 | ⬜ pending |
| 117-06-02 | 06 | 6 | D-01 | T-117-06-01 | Override-Block nur bei `is_shared`, ausschließlich `@/components/ui`-Primitives, Server-Validierung bleibt durchsetzende Instanz | unit (typecheck) | `cd frontend && npm run typecheck` | ❌ W0 | ⬜ pending |
| 117-06-03 | 06 | 6 | D-01 | T-117-06-01 | Bedingte Sichtbarkeit des Override-Blocks automatisiert bewiesen | unit | `cd frontend && npm test -- SegmenteTab` | ❌ W0 | ⬜ pending |
| 117-07-01 | 07 | 4 | D-02/D-03 | T-117-07-SC | `formatAssignmentChipLabel` akzeptiert Episodennummer, keine `release_version_id` mehr (B3-Regressionsschutz) | unit (typecheck) | `cd frontend && npm run typecheck` | ❌ W0 | ⬜ pending |
| 117-07-02 | 07 | 4 | D-02/D-03 | T-117-07-SC | Badges/Disclosure nur bei `is_shared`; Chip-Text zeigt echte Episodennummer, nicht `release_version_id` (B3) | unit | `cd frontend && npm test -- SegmenteTab` | ❌ W0 | ⬜ pending |
| 117-08-01 | 08 | 3 | D-02 | T-117-08-01 | Serverseitige Entdopplung via `theme_segment_assignments` + `loadAdjacentReleases`, kein neuer ungefilterter Query-Pfad | unit (build/vet) | `cd backend && go build ./... && go vet ./internal/repository/...` | ❌ W0 | ⬜ pending |
| 117-08-02 | 08 | 3 | D-02 | T-117-08-SC | Span-Badge nur bei echtem Mehr-Folgen-Geltungsbereich sichtbar | unit (typecheck) | `cd frontend && npm run typecheck` | ❌ W0 | ⬜ pending |
| 117-08-03 | 08 | 3 | D-02 | T-117-08-01 | Entdopplung, echter Wechsel und Span-Start-Fallback (fehlende Vorfolge) gegen echte Postgres-Instanz UND Komponententest bewiesen | integration+unit | `cd backend && go test ./internal/repository/... -run TestReleaseDetailPublicSegments -v && cd ../frontend && npm test -- ThemeTimeline` | ❌ W0 | ⬜ pending |
| 117-09-01 | 09 | 7 | D-01/D-02/D-03 | T-117-09-SC | Volle Backend- und Frontend-Regressionssuite grün nach allen acht Implementierungsplänen | integration (full suite) | `cd backend && go build ./... && go vet ./... && go test ./internal/... && cd ../frontend && npm run typecheck && npm test` | ❌ W0 | ⬜ pending |
| 117-09-02 | 09 | 7 | D-01/D-02/D-03 | T-117-09-01 | Kein-Re-Encode-Beweis, reale Mehr-Folgen-Entdopplung, alle drei UI-SPEC-Surfaces live bestätigt (VALIDATION.md Manual-Only) | manual (human-check) | — (Live-UAT via `checkpoint:human-verify`, kein CLI-Befehl) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Aus 117-RESEARCH.md § Wave 0 Gaps (echte DB-Integrationstests fehlen heute):

- [ ] Backend-Integrationstest für Variantenauflösung (`resolved_variant` / `GetSegmentReleaseDuration`) bei Mehr-Folgen-Bereichen / pro-Release-Version zugewiesenem Kara — heute nur String-Pattern-Tests. **Deckung:** 117-03-03.
- [ ] Backend-Test für Entdopplungs-Logik: Vorfolge inhaltlich identisch (gleiches geteiltes Kara, gleiche/Offset-Zeit) → keine erneute öffentliche Anzeige; echter Segment-Wechsel → neuer Eintrag. **Deckung:** 117-08-03.
- [ ] Backend-Test für Per-Folge-Zeit-Override: abweichende Zeit für eine Folge → bleibt dasselbe (geteilte) Kara, kein neues Segment; Render-Cache wird pro aufgelöster Folge korrekt invalidiert (kein Kollidieren des `theme_segment_id`-gebundenen Cache-Schlüssels), inklusive Beweis auf Ebene des tatsächlichen Cache-Key-Hashs (`services.BuildSegmentRenderCacheKey`, Nyquist-Fix W2). **Deckung:** 117-03-03, 117-02-03.
- [ ] Frontend-Test (`SegmenteTab.test.tsx`): geteiltes Kara wird EINMAL mit Indikator gezeigt, nicht pro Folge dupliziert; Override-Badge erscheint nur bei abweichender Zeit; Zuweisungs-Chips zeigen die echte Episodennummer, nicht die interne `release_version_id` (B3). **Deckung:** 117-07-02, 117-06-03.
- [ ] Frontend-Test (`ThemeTimeline.test.tsx`): entdoppelte Timeline zeigt Segment nur am Span-Beginn + „Gilt auch für Folge {von}–{bis}"-Badge. **Deckung:** 117-08-03.

Alle fünf Wave-0-Lücken sind auf mindestens einen Task in der obigen Verification Map gemappt.
`wave_0_complete` bleibt `false`, bis diese Tasks tatsächlich ausgeführt und grün sind
(`/gsd:execute-phase 117`) — die Zuordnung oben ist die Planungs-Deckung, kein Ausführungsnachweis.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Kein Re-Encode der Quelldatei bei Zeit-Override | D-01 | Negativnachweis (etwas darf NICHT passieren) an ffmpeg/Dateisystem-Grenze schwer als Unit zu fassen | Live: Zeit-Override für eine Folge setzen → prüfen, dass nur `theme_segment_render_cache`-Clip neu erzeugt wird, `release_variants`/Episoden-Videodatei unverändert (mtime/Größe). Siehe Live-UAT-Konvention (:3000). Deckung: 117-09-02. |
| Öffentliche Entdopplung am echten Datensatz | D-02 | Abhängig von realer Nachbar-Folgen-Konstellation im Datenbestand | Live: Release-Detailseite mit geteiltem OP über mehrere Folgen öffnen → OP einmal am Span-Beginn, nicht pro Folge; erst bei echtem Segment-Wechsel erneut. Deckung: 117-09-02. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (23 von 24 Tasks automatisiert; 117-09-02 ist laut VALIDATION.md explizit Manual-Only per `checkpoint:human-verify`/`<human-check>`, kein Nyquist-Verstoß)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (einziger manueller Task ist 117-09-02, der letzte Task der gesamten Phase — keine 3 aufeinanderfolgenden manuellen Tasks)
- [x] Wave 0 covers all MISSING references (alle fünf Wave-0-Lücken auf konkrete Tasks gemappt, siehe oben)
- [x] No watch-mode flags (alle Automated-Commands sind Einzel-Läufe, kein `--watch`)
- [x] Feedback latency < 90s (Backend-Suite ~30-90s, Frontend-Suite ~20-60s, laut Test Infrastructure oben)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
