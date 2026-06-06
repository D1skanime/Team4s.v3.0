---
status: partial
phase: 78-leader-workspace-review-pflege
source: [78-VERIFICATION.md, 78-04-SUMMARY.md]
started: 2026-06-06
updated: 2026-06-06
---

## Current Test

[awaiting human testing — Dev-Server :3000, NICHT Docker :3002]

## Tests

### 1. SC2 Reuse-Trennschärfe (D-02)
expected: Im `mitglieder`- und `rollen`-Tab erscheinen ausschließlich historische Member/Rollen; externe Mitwirkende sind nur im `vorschlaege`-Tab (ContributionsReviewSection) pflegbar, niemals als Gruppenmitglied vermischt.
result: [pending]

### 2. SC5-Negativnachweis live (Lock F)
expected: `/admin/my-groups/<gruppe>` zeigt KEINE Review-Flächen (ContributionsReviewSection, GroupMediaReviewSection, UserSuggestionsInbox). Review/Pflege existiert ausschließlich in `/admin/fansubs/[id]/edit`.
result: [pending]

### 3. D-08 serverseitiges Gating
expected: Account ohne `can_edit_group`/`can_manage_members` → Review-Flächen unsichtbar UND Server antwortet auf GET/PATCH mit HTTP 403 + Deny-Audit (kein Client-only-Gate).
result: [pending]

### 4. Sichtbarkeit/Prüfstatus-Persistenz
expected: Im `media`-Tab (GroupMediaReviewSection) und im Release-Drawer (ReleaseVersionMediaReviewSection) Selektor ändern → „Änderungen speichern" → Toast „Prüfstatus aktualisiert."; bei `owner_consistent=false` Badge „Owner-Zuordnung prüfen" ohne Owner-Edit-Feld.
result: [pending]

### 5. Umlaut-Rendering
expected: Alle sichtbaren Strings rendern korrekte Umlaute (ä/ö/ü/ß) im Browser — keine Mojibake/ASCII-Ersetzungen.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
