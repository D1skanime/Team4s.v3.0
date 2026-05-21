# TOMORROW

## First 15-Minute Task
- Open `.planning/phases/49-zentraler-auth-api-client-und-token-lifecycle-h-rtung/49-VERIFICATION.md` and `docs/frontend/auth-api-client.md`, then write down whether the next slice is Phase 49 metadata reconciliation or unrelated lint cleanup.

## Top 3 Priorities
1. Start from the verified Phase 49 boundary: central client owns normal token lifecycle; normal pages/components stay token-free.
2. Reconcile Phase 49 planning metadata drift if `.planning/ROADMAP.md`, `.planning/STATE.md`, or `.planning/REQUIREMENTS.md` still contradict the completed verification.
3. If choosing lint instead, isolate only the unrelated existing full-lint failures and keep auth/client boundaries unchanged.

## Dependencies To Unblock Early
- Use the Phase 49 verification record before changing auth code.
- Treat SSR and Jellyfin/streaming as documented separate server-side boundaries.
- Run targeted Phase 49 checks before and after any auth-adjacent edit.
