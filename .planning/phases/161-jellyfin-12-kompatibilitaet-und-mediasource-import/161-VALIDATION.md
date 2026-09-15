---
phase: 161
status: draft
nyquist_compliant: false
wave_0_complete: false
---
# Validation strategy

The initial focused handler baseline passed with:
`docker exec -w /app team4sv30-backend go test ./internal/handlers -run 'Test.*(Jellyfin|MediaProxy|GroupAssets|Subtitle|EpisodeImport)' -count=1`.
Full baseline results are recorded in `docs/audits/2026-09-15-jellyfin12/checks-baseline.json`.

## Required gates

- Auth, proxy and GetItems httptest assertions, including errors and secret handling.
- Pure source selection fixtures and the sanitized live 11eyes Episode 1 response.
- Guarded isolated PostgreSQL persistence/update/read round trips; no application database writes.
- Public and import contracts, frontend serialization and refresh-only session regressions.
- Relevant backend tests, build and vet; frontend typecheck, scoped/full lint, tests and isolated build; git diff --check.
- Read-only live API, semantic GetItems, image, video Range and subtitle checks; shared browser review.

## Critical fixtures

Contrast source A/B and poison item-level streams. Reorder sources; preserve stored binding across ID churn with a unique stable path. Reject vanished or ambiguous bindings. Preserve unknown-language subtitle tracks. Cover files without audio/subtitles, more than 200 group children, mismatched returned IDs, secret-bearing errors/redirects and unaffected Fanart/Emby.

11eyes Episode 1 must yield three own-source candidates without duplicates. The full live inventory has 27 items and 38 sources; 11 source IDs are not independently addressable items. Do not represent those source IDs as item IDs.

## Budgets and evidence limits

No HTTP request per source or stream. Revalidate submitted imports with a bounded batch and document the additional request. Public metadata remains DB-only. Database fixture assertions must execute; skipped tests do not establish persistence correctness.

No real provider rescan or live import is authorized. Simulated source-ID churn with stable paths tests the recovery rule but does not prove every possible scan/move. Preserve unrelated human UAT records. Record any remaining human verification separately from technical completion.
