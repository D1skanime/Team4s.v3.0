# TODO

## Completed (2026-03-14)
- [x] Reconcile Package 2 with `docs/architecture/db-schema-v2.md`
- [x] Re-scope Package 2 to canonical Phase A only
- [x] Rework migrations `0019-0022` to remove out-of-scope Phase A entities
- [x] Audit legacy anime source columns: `title`, `title_de`, `title_en`, `genre`
- [x] Fix title mapping rules for Phase A backfill
- [x] Add anime metadata repository support
- [x] Add anime metadata backfill service
- [x] Add CLI command `go run ./cmd/migrate backfill-phase-a-metadata`
- [x] Add focused migration/service tests

## Immediate
- [ ] Execute corrected migrations in local environment
- [ ] Execute Phase A metadata backfill locally
- [ ] Verify 10 sample anime rows against `anime_titles`
- [ ] Verify `genres` and `anime_genres` after backfill
- [ ] Recover the old source for anime-to-anime relations

## Short Term
- [ ] Add adapter parity tests for normalized anime metadata reads
- [ ] Add integration tests for migration/backfill flow
- [ ] Document reusable DB verification SQL snippets
- [ ] Capture local migration/backfill evidence in repo-local docs

## Medium Term
- [ ] Complete Package 2 backend verification gates
- [ ] Prepare Package 1 (TypeScript SDK) execution artifacts
- [ ] Plan Phase 6 handler consumption

## Long Term
- [ ] Complete Phase 5
- [ ] Execute Phase 6 with contract verification
- [ ] Production rollout and cleanup gates
