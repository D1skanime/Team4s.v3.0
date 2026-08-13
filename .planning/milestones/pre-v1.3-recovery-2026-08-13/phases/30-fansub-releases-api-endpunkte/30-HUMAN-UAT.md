---
status: partial
phase: 30-fansub-releases-api-endpunkte
source: [30-VERIFICATION.md]
started: 2026-04-30T08:30:00.000Z
updated: 2026-04-30T08:30:00.000Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Canonical Release wird vor Theme-Asset-Requests geladen
expected: Im Browser DevTools-Netzwerk-Tab feuert der Canonical-Release-Request (/releases/canonical) bevor Theme-Assets geladen werden. Release-ID kommt nicht mehr aus der Theme-Asset-Antwort.
result: [pending]

### 2. Nil-State bei fehlendem Release-Anker
expected: Für eine Fansub-Anime-Kombination ohne Release-Anker antwortet /releases/canonical mit `{"release": null}` (200, kein 404). UI zeigt ehrlichen Nil-State.
result: [pending]

### 3. Upload → Reload → Delete Round-Trip mit stabiler release_id
expected: Upload eines Theme-Assets, Seiten-Reload, dann Delete — die release_id bleibt über alle drei Aktionen identisch (wird nicht neu erraten aus Theme-Asset-Responses).
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
