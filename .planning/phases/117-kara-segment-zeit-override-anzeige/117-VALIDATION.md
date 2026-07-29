---
phase: 117
slug: kara-segment-zeit-override-anzeige
status: draft
nyquist_compliant: false
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

> Wird beim Planen / durch die Nyquist-Validierung pro Task befüllt. Platzhalterzeile zeigt das Format.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 117-01-01 | 01 | 1 | D-01 | T-117-01 / — | Override-Schreibpfad nur mit `release_version.segments.manage` (requireSegmentManage) | integration | `go test ./internal/handlers/... -run Segment` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Aus 117-RESEARCH.md § Wave 0 Gaps (echte DB-Integrationstests fehlen heute):

- [ ] Backend-Integrationstest für Variantenauflösung (`resolved_variant` / `GetSegmentReleaseDuration`) bei Mehr-Folgen-Bereichen / pro-Release-Version zugewiesenem Kara — heute nur String-Pattern-Tests.
- [ ] Backend-Test für Entdopplungs-Logik: Vorfolge inhaltlich identisch (gleiches geteiltes Kara, gleiche/Offset-Zeit) → keine erneute öffentliche Anzeige; echter Segment-Wechsel → neuer Eintrag.
- [ ] Backend-Test für Per-Folge-Zeit-Override: abweichende Zeit für eine Folge → bleibt dasselbe (geteilte) Kara, kein neues Segment; Render-Cache wird pro aufgelöster Folge korrekt invalidiert (kein Kollidieren des `theme_segment_id`-gebundenen Cache-Schlüssels).
- [ ] Frontend-Test (`SegmenteTab.test.tsx`): geteiltes Kara wird EINMAL mit Indikator gezeigt, nicht pro Folge dupliziert; Override-Badge erscheint nur bei abweichender Zeit.
- [ ] Frontend-Test (`ThemeTimeline.test.tsx`): entdoppelte Timeline zeigt Segment nur am Span-Beginn + „Gilt auch für Folge {von}–{bis}"-Badge.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Kein Re-Encode der Quelldatei bei Zeit-Override | D-01 | Negativnachweis (etwas darf NICHT passieren) an ffmpeg/Dateisystem-Grenze schwer als Unit zu fassen | Live: Zeit-Override für eine Folge setzen → prüfen, dass nur `theme_segment_render_cache`-Clip neu erzeugt wird, `release_variants`/Episoden-Videodatei unverändert (mtime/Größe). Siehe Live-UAT-Konvention (:3000). |
| Öffentliche Entdopplung am echten Datensatz | D-02 | Abhängig von realer Nachbar-Folgen-Konstellation im Datenbestand | Live: Release-Detailseite mit geteiltem OP über mehrere Folgen öffnen → OP einmal am Span-Beginn, nicht pro Folge; erst bei echtem Segment-Wechsel erneut. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
