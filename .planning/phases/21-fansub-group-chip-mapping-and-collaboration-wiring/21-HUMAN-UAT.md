---
status: partial
phase: 21-fansub-group-chip-mapping-and-collaboration-wiring
source: [21-VERIFICATION.md]
started: 2026-04-23T11:06:19.6628513+02:00
updated: 2026-04-23T11:31:00.0000000+02:00
---

## Current Test

[testing complete]

## Tests

### 1. Import existing group chip
expected: The same chip remains selected after apply and reload, and `release_version_groups` plus `anime_fansub_groups` match the persisted group.
result: blocked
blocked_by: other
reason: "Es scheint aktuell noch keine bestehende Fansub-Gruppe in der lokalen DB zu geben, daher ist der Wiederverwendungsfall noch nicht testbar."

### 2. Import new collaboration member set
expected: Applying `FlameHazeSubs + TestGruppe` creates or reuses one deterministic backend collaboration, stores the member rows exactly once, and aligns `anime_fansub_groups`.
result: pass

### 3. Manual editor save and reload
expected: The manual episode-version editor saves through `fansub_groups`, the effective collaboration stays backend-derived, and reload expands back into the member chips.
result: pass

## Summary

total: 3
passed: 2
issues: 0
pending: 0
skipped: 0
blocked: 1

## Gaps
