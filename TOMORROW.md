# TOMORROW

## Top 3 Priorities
1. Confirm Phase 51 commit/push is present on `codex/phase-51-keycloak-auth-boundary`.
2. Restore or separately process the stashed unrelated dirty work if more audit/UI work should continue.
3. Plan or implement a small `domain-guardrail-tests` follow-up for release-version media and fansub-group column rules.

## First 15-Minute Task
- Run `git status --short --branch` and `git stash list`, then confirm the pushed Phase 51 branch is clean and unrelated work is recoverable from stash or a separate slice.

## Dependencies To Unblock Early
- Decide whether the audit should become one commit or be split into docs/domain, route cleanup, UI cleanup, and race-hardening commits.
- Keep unrelated backend/auth/infra/generated changes out of the audit slice unless explicitly reviewed.
- Do not stage `frontend/tsconfig.tsbuildinfo` casually.
- Re-run targeted tests for whichever slice is staged.
