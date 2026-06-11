---
status: partial
phase: 83-pro-release-mitwirkenden-zuordnung-release-version-id-im-coc
source: [83-VERIFICATION.md]
started: 2026-06-12T00:55:00+02:00
updated: 2026-06-12T00:55:00+02:00
---

## Current Test

[awaiting human testing]

## Tests

### 1. Drawer Live-Browser-Test
expected: Der „Mitwirkende"-Button pro Release-Zeile öffnet den `ReleaseContributionDrawer`; der Drawer lädt den aufgelösten Projektteam-Satz (Default) oder zeigt einen EmptyState, wenn kein Mitwirkender aufgelöst wird.
result: [pending]

### 2. Status-Badge beim initialen Load
expected: Das Status-Badge pro Release-Zeile (Projektteam / Eigene Besetzung / Mitwirkende fehlen) erscheint korrekt aus dem `has_override`-Feld beim ersten Laden der Seite — ohne dass der Drawer geöffnet werden muss.
result: [pending]

### 3. D-04 Permission live
expected: Ein Member ohne Contribution auf der Release-Version erhält beim Zugriff auf `GET /admin/release-versions/:versionId/contributions/effective` eine 403-Antwort (IDOR-Mitigation greift vor der Datenabfrage).
result: [pending]

### 4. D-05 Leader-Bypass live
expected: Ein `fansub_lead` (bzw. `project_lead`) ohne eigene Contribution erhält trotzdem 200 und sieht den aufgelösten Mitwirkenden-Satz (Leader-Bypass vor Contribution-Check).
result: [pending]

### 5. Override speichern + Persistenz
expected: Eine Entfernung („dieser User war hier nicht dabei") bzw. ein Rollen-Override persistiert pro Release; nach Reload bleibt die Ausnahme erhalten und andere Releases desselben Anime bleiben unberührt.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps

### Getrackte Abweichung (kein Blocker) — Drawer-Add ist fire-and-forget
`ReleaseContributionDrawer.tsx` ruft `upsertAnimeContribution` in `handleAddConfirm` direkt auf (fire-and-forget), statt neue Rows wie Entfernungen erst in `handleSave` zu sammeln. Neue Mitwirkende werden also sofort beim Hinzufügen persistiert, nicht erst beim „Speichern". Entfernungen bleiben korrekt staged. UX-Inkonsistenz — live bestätigen, ob das für Admins akzeptabel ist oder in einer Folge-Iteration auf vollständig staged umgestellt werden soll.
