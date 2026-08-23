---
status: partial
phase: 138-effective-rights-administration-impact-ux
source: [138-VERIFICATION.md]
started: 2026-08-23T20:10:00Z
updated: 2026-08-23T20:10:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. GuidedRevokeFlow — removing a dormant deny-override on a non-deniable actor
expected: Find (or create) a user who is a platform admin (or otherwise `non_deniable`) for some group capability, and who also has a stale personal `user_deny` override on that same capability recorded against them. Open their `UserGroupRightsTab`, click "Abweichung entfernen" on that row — the modal must proceed straight to the confirm step ("Die persönliche Abweichung … wird entfernt") and, after confirming, show the honest override-path activation status. It must NOT show only "Dieses Recht kann für … nicht persönlich entzogen werden."
result: [pending]

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
