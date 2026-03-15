# TOMORROW

## Top 3 Priorities
1. Add `genres: string[]` to the backend anime detail contract and remove any remaining type workaround around genres on `/anime/[id]`.
2. Re-run targeted validation for the anime detail page after the contract change: build, page smoke-check, and any affected API response spot-checks.
3. Start a scoped lint-debt inventory for the frontend so future slice validation is not masked by unrelated errors.

## First 15-Minute Task
Open `backend/internal/handlers/anime.go` and the anime detail DTO/type definition, then trace where `genre` is serialized today. Write down the exact response shape change needed for `genres: string[]` and identify the smallest backend patch to produce it.

## Dependencies To Unblock Early
- Confirm the canonical backend response type for anime detail before touching frontend types
- Keep current unrelated worktree changes out of the first follow-up commit

## Nice To Have
- Decide whether the review follow-up should also normalize any remaining `Related` ARIA wording in the same slice or leave it for a separate accessibility pass
