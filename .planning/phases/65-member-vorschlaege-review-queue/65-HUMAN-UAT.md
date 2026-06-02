---
status: partial
phase: 65-member-vorschlaege-review-queue
source: [65-VERIFICATION.md]
started: 2026-06-02T17:18:00Z
updated: 2026-06-02T17:18:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Anime-Typeahead im ProposalForm im Browser testen
expected: Eingabe ab 2 Zeichen liefert tatsächlich Ergebnisse für reale Anime aus der Datenbank; kein leerer Dropdown bei vorhandenen Titeln. (CR-01: `searchAnimeForProposal` routet auf den öffentlichen Endpunkt `/api/v1/anime` — Produktentscheid klären, ob Member nur veröffentlichte Anime vorschlagen können sollen.)
result: [pending]

### 2. SelfPublish-Sichtbarkeit auf Anime-Seite prüfen
expected: Nach 90-Tage-Selbstschaltung erscheint der Beitrag auf der öffentlichen Anime-Seite mit `is_verified=false` (z. B. „(historisch)"-Kennzeichnung). Er sollte NICHT identisch wie ein Leader-bestätigter Beitrag erscheinen.
result: [pending]

### 3. Review-Queue-UX als Leader testen
expected: `admin/my-groups/[id]` zeigt die Sektion „Offene Vorschläge" mit Bestätigen/Ablehnen-Aktionen. Aktionen aktualisieren die Liste optimistisch; bestätigte/abgelehnte Einträge verschwinden ohne Seitenwechsel; Inline-Ablehnen-Expansion funktioniert.
result: [pending]

### 4. me/contributions Modal-Flow als Member testen
expected: Sektion sichtbar; „+ Beitrag vorschlagen"-Button öffnet Modal ohne Seitenwechsel; Gruppen-Dropdown befüllt; 90-Tage-Hinweis sichtbar; Duplikat ergibt 409 mit deutschem Fehlertext; Status-Gruppierung (In Prüfung / Bestätigt / Abgelehnt) sichtbar; neuer Vorschlag erscheint in „In Prüfung".
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
