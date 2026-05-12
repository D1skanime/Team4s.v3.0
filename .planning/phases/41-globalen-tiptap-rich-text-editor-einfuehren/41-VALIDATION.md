---
phase: 41
slug: globalen-tiptap-rich-text-editor-einfuehren
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-12
---

# Phase 41 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | go test (backend), vitest (frontend) |
| **Config file** | frontend/vitest.config.ts |
| **Quick run command** | `cd backend && go build ./... && cd ../frontend && npm run typecheck` |
| **Full suite command** | `cd backend && go test ./... && cd ../frontend && npm run typecheck && npm run lint` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && go build ./... && cd ../frontend && npm run typecheck`
- **After every plan wave:** Run `cd backend && go test ./... && cd ../frontend && npm run typecheck && npm run lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 41-01-01 | 01 | 1 | TIPTAP-EDITOR-01 | build | `cd backend && go build ./...` | ✅ | ⬜ pending |
| 41-02-01 | 02 | 1 | TIPTAP-EDITOR-01 | typecheck | `cd frontend && npm run typecheck` | ✅ | ⬜ pending |
| 41-03-01 | 03 | 2 | TIPTAP-EDITOR-01 | unit | `cd backend && go test ./internal/services/...` | ❌ W0 | ⬜ pending |
| 41-04-01 | 04 | 2 | TIPTAP-EDITOR-01 | typecheck | `cd frontend && npm run typecheck` | ✅ | ⬜ pending |
| 41-05-01 | 05 | 3 | TIPTAP-EDITOR-01 | unit | `cd backend && go test ./...` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/internal/services/tiptap_validator_test.go` — stubs for TipTap JSON validation
- [ ] `backend/internal/services/tiptap_renderer_test.go` — stubs for HTML rendering + sanitizing

*If no Wave 0 plan: Create test stubs as part of the service implementation plan.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RichTextEditor rendert im Browser | TIPTAP-EDITOR-01 | Browser-UI | Admin-Seite öffnen, Editor laden, Text eingeben |
| Farb-Palette zeigt nur Tokens | TIPTAP-EDITOR-01 | Browser-UI | Farbauswahl öffnen, prüfen dass keine Hex-Eingabe vorhanden |
| Shortnote-Modus zeigt Hinweistext | TIPTAP-EDITOR-01 | Browser-UI | release_version_notes-Editor öffnen |
| Tabelle im Browser bedienbar | TIPTAP-EDITOR-01 | Browser-UI | Tabelle einfügen, Zeilen/Spalten hinzufügen |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
