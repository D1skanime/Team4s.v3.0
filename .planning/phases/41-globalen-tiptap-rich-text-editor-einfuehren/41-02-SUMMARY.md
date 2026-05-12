---
phase: 41-globalen-tiptap-rich-text-editor-einfuehren
plan: "02"
subsystem: api
tags: [go, tiptap, bluemonday, json-validation, html-sanitizing, tdd]

# Dependency graph
requires: []
provides:
  - TipTapService mit ValidateJSON, RenderHTML, ExtractText, IsEmpty
  - Allowlist-Validator fuer TipTap-JSON (Nodes, Marks, Farb-Tokens)
  - Tabellen-Struktur-Limits (max 30 Zeilen, max 6 Spalten, keine verschachtelten Tabellen)
  - Sanitisiertes HTML-Rendering via Custom Walker + bluemonday
  - bluemonday als direct dependency in go.mod
affects:
  - 41-03 (DB Migration fuer body_json/body_html/body_text)
  - 41-04 (Handler-Integration TipTapService)
  - 41-05 (Frontend RichTextEditor)

# Tech tracking
tech-stack:
  added:
    - "github.com/microcosm-cc/bluemonday v1.0.27 (von indirect auf direct)"
  patterns:
    - "TDD (RED→GREEN) fuer Go-Service: Tests zuerst, dann Implementierung"
    - "Rekursiver Walker fuer TipTap-JSON: validateNode + renderNode"
    - "Custom bluemonday Policy mit engen Allowlists (kein UGCPolicy)"
    - "Tabellen-Struktur-Pruefung vor rekursivem Abstieg"

key-files:
  created:
    - backend/internal/services/tiptap_service.go
    - backend/internal/services/tiptap_service_test.go
  modified:
    - backend/go.mod
    - backend/go.sum

key-decisions:
  - "Eigener rekursiver Walker statt externer Go-TipTap-Bibliothek (keine geeignete existiert)"
  - "bluemonday Custom Policy statt UGCPolicy fuer maximale Kontrolle ueber erlaubte Tags"
  - "Tabellen-Struktur-Limits per switch-case vor rekursivem Abstieg gecheckt"
  - "thead-Erkennung: erste Zeile mit tableHeader-Zellen → thead; Rest → tbody"
  - "IsEmpty delegiert an ExtractText; Fehler → true (defensiv)"

patterns-established:
  - "TipTapService als services.TipTapService mit NewTipTapService() Konstruktor"
  - "Fehlertexte auf Deutsch entsprechend Umlaute-Regel in CLAUDE.md"

requirements-completed:
  - TIPTAP-EDITOR-01

# Metrics
duration: 4min
completed: 2026-05-12
---

# Phase 41 Plan 02: TipTap Service Summary

**Go TipTapService mit rekursivem JSON-Walker, bluemonday-Sanitizing und Tabellen-Struktur-Limits — alle 19 TDD-Tests gruen**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-12T10:30:36Z
- **Completed:** 2026-05-12T10:34:08Z
- **Tasks:** 2 (TDD RED + GREEN)
- **Files modified:** 4

## Accomplishments

- TipTapService mit ValidateJSON (Allowlist + Tabellen-Limits), RenderHTML (Custom Walker), ExtractText, IsEmpty
- TDD-Workflow: 19 Tests in tiptap_service_test.go zuerst RED (Compile-Fehler), dann alle GREEN
- bluemonday Custom Policy mit engen Allowlists (p, h1-h3, strong, em, ul, ol, li, blockquote, table, thead, tbody, tr, th, td, hr, span)
- bluemonday von indirect auf direct hochgestuft (go mod tidy)
- tiptap_service.go mit 370 Zeilen (unter 450-Zeilen-Limit)

## Task Commits

1. **Task 1: TipTap Service Tests (TDD RED)** - `49ae3fa2` (test)
2. **Task 2: TipTapService Implementierung** - `ccd9d10c` (feat)

## Files Created/Modified

- `backend/internal/services/tiptap_service.go` — TipTapService mit ValidateJSON, RenderHTML, ExtractText, IsEmpty, Custom Walker, bluemonday Policy (370 Zeilen)
- `backend/internal/services/tiptap_service_test.go` — 19 Unit-Tests fuer alle vier Methoden inkl. Tabellen-Struktur-Limits
- `backend/go.mod` — bluemonday von indirect auf direct
- `backend/go.sum` — aktualisiert nach go mod tidy

## Decisions Made

- Eigener rekursiver Walker: Keine geeignete Go-Bibliothek fuer TipTap JSON → HTML existiert; ein schlanker Walker ist die richtige Loesung.
- thead/tbody-Erkennung: Erste Zeile mit tableHeader-Zellen → thead-Wrapper; alle anderen Zeilen → tbody. Kein thead wenn erste Zeile nur tableCell hat.
- bluemonday Custom Policy statt UGCPolicy, da UGCPolicy zu permissiv ist (erlaubt Links, a-Tags etc.).
- Fehlertexte auf Deutsch gemaess Umlaute-Regel aus CLAUDE.md.

## Deviations from Plan

None — Plan wurde exakt wie geschrieben ausgefuehrt.

## Issues Encountered

- `go get github.com/microcosm-cc/bluemonday@v1.0.27` allein stufte bluemonday nicht auf direct hoch, da es bereits in go.sum registriert war. Loesung: `go mod tidy` hat den indirect-Marker korrekt entfernt.

## Next Phase Readiness

- TipTapService ist bereit fuer Plan 41-03 (DB Migration) und Plan 41-04 (Handler-Integration)
- Alle vier Methoden exportiert und getestet: keine offenen Stubs

---
*Phase: 41-globalen-tiptap-rich-text-editor-einfuehren*
*Completed: 2026-05-12*
