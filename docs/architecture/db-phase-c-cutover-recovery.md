# DB Phase C Cutover Recovery Brief

**Date:** 2026-03-22  
**Basis:** Phase 05.1 Plan 01 validation baseline and runtime authority map  
**Scope:** Post-Phase-C migration posture for the committed A-C DB brief work

## Decision

**Repair before cutover**

Phase C release decomposition is not ready to become the primary runtime authority yet.
The evidence from Plan 01 shows that the normalized release tables exist, but the live runtime still resolves release and stream behavior through `episode_versions`-backed seams.
That is enough to keep the lane honest, but not enough to claim cutover readiness.

## Evidence Summary

- The validation baseline confirms the committed A-C migration slices exist and are structurally sound enough to inspect.
- The runtime authority map classifies anime/admin metadata reads as **legacy-first**.
- Episode/group composition is still **adapter-backed**.
- Release streaming and release-assets handling remain **legacy-first** through `episode_versions`.
- Phase C normalized release tables are present, but they are **blocked** for primary runtime authority until a reconciliation pass proves parity.
- No committed reconciliation report yet proves the backfilled release tables preserve representative `episode_versions` facts without unintended collapse or loss.

## Blockers

1. No row-level reconciliation exists for representative `episode_versions` records versus `fansub_releases`, `release_versions`, `release_variants`, and `streams`.
2. The runtime path for `/api/v1/releases/*` still depends on `episode_versions` for existence and stream source resolution.
3. The current evidence does not prove that normalized release tables can safely replace the legacy release/runtime seam.
4. Phase C backfill behavior includes collapse points that are documented, but not yet accepted by a reconciliation report as intentional and lossless enough for cutover.

## Assumptions

- The committed A-C migration set is the correct baseline and should not be rewritten as part of this recovery step.
- Existing adapter-backed behavior may remain in place while repair evidence is gathered.
- No destructive cleanup of legacy release/runtime structures should begin until the missing reconciliation evidence exists.
- The Phase C schema is not being rejected; only its cutover readiness is being deferred.

## Next Actions

1. Produce a committed reconciliation report comparing representative `episode_versions` rows with the normalized release tables.
2. Add or extend a focused regression that proves the current `/api/v1/releases/*` authority path remains stable during repair.
3. Keep release-stream and release-assets handling adapter-backed until parity is proven.
4. Block any future schema-expansion work that assumes Phase C is already normalized-first.
5. Re-evaluate cutover only after the repair evidence closes the parity gap.

## What This Means

The migration lane should not proceed with guarded cutover yet.
It should continue in repair mode, with the explicit goal of converting Phase C from "schema exists" to "runtime parity proven".

That is the narrowest honest posture supported by the current evidence.
