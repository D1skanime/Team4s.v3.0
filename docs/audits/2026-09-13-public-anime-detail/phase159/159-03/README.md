# 159-03 targeted technical evidence

Authoritative final checks and source hashes: [verification.json](verification.json).

| Check | Log | Result |
|---|---|---|
| Task 1 RED | [task1-red.log](task1-red.log) | 17 failed / 10 passed before implementation |
| Task 1 GREEN | [task1-green.log](task1-green.log) | 27 passed; transient act warning subsequently corrected in test |
| Task 2 RED | [task2-red.log](task2-red.log) | 6 failed / 44 passed before implementation |
| Task 2 GREEN | [task2-green.log](task2-green.log) | 50 passed |
| Task 3 RED | [task3-red.log](task3-red.log) | 12 failed / 7 passed before implementation |
| Task 3 GREEN | [task3-green.log](task3-green.log) | 19 passed |
| Final relevant suite | [tests.log](tests.log) | 78 passed, no warnings |
| Full TypeScript | [typecheck.log](typecheck.log) | exit 0 |
| All changed source/test lint | [lint.log](lint.log) | exit 0, no warnings |
| Final diffcheck | [diffcheck.log](diffcheck.log) | exit 0 |

Tests use jsdom/API mocks only. No live request, account cookie, database mutation, dependency installation, production build or backend restart was performed by this executor. Root owns its separate live observations. All commands run from the canonical Linux repo through the existing frontend Compose service.

The public fixture contains 125 variants with overlapping cursor slices, a neutral episode with the same number but another ID, and separate canonical versions whose variant IDs collide with other canonical version IDs. Explicit requests use limit 24; five clicks follow the initial slice. A separate merge case retains a shared variant ID across different episode IDs.

Plan 159-05 remains responsible for the full production/browser/SQL gate. Human UAT remains open.
