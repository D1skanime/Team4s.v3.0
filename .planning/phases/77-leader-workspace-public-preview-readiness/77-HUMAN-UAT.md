---
status: partial
phase: 77-leader-workspace-public-preview-readiness
source: [77-VERIFICATION.md]
started: "2026-06-05T20:46:26Z"
updated: "2026-06-05T20:46:26Z"
---

## Current Test

[awaiting human testing — Live-UAT auf Dev-Server :3000]

## Tests

### 1. Tab "Veröffentlichung" sichtbar bei Berechtigung
expected: Auf /admin/fansubs/[id]/edit einer Gruppe mit can_edit_group=true (oder can_edit_notes=true) erscheint der Tab "Veröffentlichung" in der Tab-Leiste.
result: [pending]

### 2. Tab-Gating bei reiner Mitgliedschaft
expected: Als Nutzer ohne can_edit_group und ohne can_edit_notes ist der Tab NICHT sichtbar; direkter Aufruf ?tab=readiness fällt via resolveMainTabForAccess auf einen erlaubten Tab zurück.
result: [pending]

### 3. Badge-Farbgebung & Umlaute
expected: Readiness-Checkliste zeigt korrekte deutsche Labels mit Umlauten; "Gruppengeschichte prüfen" trägt ein blaues info-Badge (KEIN warning-Bernstein, kein "fehlt"-Urteil); fehlendes Logo zeigt warning (kein danger/rot).
result: [pending]

### 4. Sprungmarken-Navigation
expected: Klick auf eine Sprungmarke (z. B. "Im Medien-Tab ergänzen →") wechselt den Workspace-Tab ohne Seitenneuladen (router.replace mit ?tab=).
result: [pending]

### 5. Öffentliche Vorschau (read-only)
expected: PublicPreviewPanel zeigt FansubProfileTabs + GroupLeaderTimeline mit Fallback-Badge "Vorschau im Übergangsmodus"; keine Schreib-Buttons.
result: [pending]

### 6. Informativer Claims-Zähler
expected: "Offene Claims: {n}" trägt Badge variant=info (blaue Tönung, keine warning-Färbung).
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
