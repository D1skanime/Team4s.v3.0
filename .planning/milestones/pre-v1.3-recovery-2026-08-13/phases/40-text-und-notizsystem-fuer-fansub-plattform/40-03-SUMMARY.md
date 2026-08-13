---
phase: 40-text-und-notizsystem-fuer-fansub-plattform
plan: 40-03
subsystem: backend-services
tags: [markdown, sanitization, goldmark, bluemonday, services]
dependency_graph:
  requires: [40-01]
  provides: [RenderMarkdown service for 40-05, 40-06]
  affects: [backend/internal/services]
tech_stack:
  added: [github.com/yuin/goldmark v1.8.2, github.com/microcosm-cc/bluemonday v1.0.27]
  patterns: [Go service struct, explicit constructor]
key_files:
  created:
    - backend/internal/services/markdown_service.go
  modified:
    - backend/go.mod
    - backend/go.sum
decisions:
  - goldmark with GFM extensions for GitHub-Flavored Markdown (tables, strikethrough, linkify)
  - bluemonday UGCPolicy as sanitization baseline for user-generated content
  - RenderMarkdown returns (string, error) signature per plan must_haves
metrics:
  duration: ~8min
  completed: 2026-05-11
  tasks_completed: 2
  files_modified: 3
---

# Phase 40 Plan 03: Backend — Markdown-Service (goldmark + bluemonday) Summary

**One-liner:** Wiederverwendbarer MarkdownService mit goldmark (GFM) und bluemonday (UGCPolicy) für sichere Markdown-zu-HTML-Konvertierung aller Note-Handler.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Dependencies hinzufügen (goldmark, bluemonday) | 7946fc63 | backend/go.mod, backend/go.sum |
| 2 | markdown_service.go erstellen | b9dccfea | backend/internal/services/markdown_service.go |

## What Was Built

`backend/internal/services/markdown_service.go` — neuer Service mit:
- `NewMarkdownService()` — erstellt Service mit GFM-Extensions und UGCPolicy-Sanitizer
- `RenderMarkdown(input string) (string, error)` — Markdown → sanitisiertes HTML
- Leerer Input gibt `""` zurück (kein Absturz)
- Gefährliche Tags (`<script>`, `<iframe>`, Event-Handler) werden vom bluemonday-Sanitizer entfernt

Verifikation bestanden:
- `go build ./...` — kompiliert ohne Fehler
- Leerer Input → `""`
- `**bold**` → `"<p><strong>bold</strong></p>\n"`
- `<script>alert(1)</script>` → `""` (vollständig sanitisiert)

## Deviations from Plan

None — Plan wurde exakt wie beschrieben umgesetzt.

## Known Stubs

None — der Service ist vollständig implementiert und liefert korrekte Ergebnisse. Die Verdrahtung mit Handlern erfolgt planmäßig in Plan 40-05 und 40-06.

## Self-Check: PASSED

- backend/internal/services/markdown_service.go: FOUND
- Commit 7946fc63 (go.mod/go.sum): FOUND
- Commit b9dccfea (markdown_service.go): FOUND
- go build ./... passed without errors
