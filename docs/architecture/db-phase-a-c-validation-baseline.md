# DB Phase A-C Validation Baseline

**Date:** 2026-03-22  
**Purpose:** Reproducible evidence baseline for the committed DB brief Phase A, B, and C work  
**Status:** Partial evidence captured, further cutover judgment required

## Scope Under Review

This baseline reviews the already committed migration work for:

- **Phase A:** metadata normalization (`0019`-`0023`)
- **Phase B:** episode identity groundwork (`0031`-`0033`)
- **Phase C:** release decomposition (`0034`-`0036`)

The goal is not to re-plan the schema. The goal is to record what can currently be proven from committed migrations, repository code, and focused regression coverage.

## Evidence Sources

- Migration files in `database/migrations/0019` through `0036`
- Repository code in `backend/internal/repository`
- Existing review artifact: `docs/reviews/2026-03-14-phase-a-migrations-backfill-critical-review.md`
- Focused authority/regression tests:
  - `backend/internal/migrations/phase5_metadata_scope_test.go`
  - `backend/internal/migrations/phase_ac_recovery_test.go`
  - `backend/internal/services/anime_metadata_backfill_test.go`
  - `backend/internal/repository/runtime_authority_test.go`

## Commands

### Focused backend regression command

```powershell
cd Team4s.v3.0/backend
go test ./internal/migrations ./internal/repository/... ./internal/services/...
```

### Why this command matters

- `internal/migrations` proves the committed migration files still encode the intended Phase A-C seams.
- `internal/repository/...` proves the current runtime authority remains where the recovery phase believes it is.
- `internal/services/...` preserves the title/genre backfill behavior relied on by Phase A.

## Phase A Assessment

### Confirmed

- Metadata normalization tables exist in the migration set: `genres`, `title_types`, `languages`, `relation_types`, `anime_titles`, `anime_relations`, `anime_genres`.
- Existing focused tests still confirm the intended narrowed Phase A scope.
- Title backfill helper behavior remains deterministic:
  - `anime.title` -> `ja/main`
  - `anime.title_de` -> `de/main`
  - `anime.title_en` -> `en/official`

### Partial

- The 2026-03-14 critical review documented timeout risk in backfill execution and recommended explicit verification SQL.
- Current repository runtime still appears largely flat-column backed for anime/admin reads, which means normalized metadata exists but is not yet the dominant read authority.

### Open

- No committed reconciliation report yet proves full `anime_titles` / `anime_genres` coverage against live data counts.

## Phase B Assessment

### Confirmed

- Episode identity groundwork exists in the migration set:
  - `episode_types`
  - `episode_titles`
  - `episodes.episode_type_id`, `number`, `number_decimal`, `sort_index`
- The migrations preserve the legacy `episodes` table while extending it, rather than replacing it.

### Partial

- Current repository behavior still joins episode metadata primarily through `episodes` and numeric matching logic rather than a broader normalized episode-title authority layer.
- No dedicated Phase B reconciliation artifact currently proves that normalized episode identity is the runtime source of truth.

### Open

- Adapter parity between old episode-number joins and any normalized episode-title/episode-type consumers remains under-documented.

## Phase C Assessment

### Confirmed

- Release decomposition tables exist in the migration set:
  - `release_sources`
  - `stream_types`
  - `visibility_levels`
  - `fansub_releases`
  - `release_versions`
  - `release_variants`
  - `streams`
  - `release_version_groups`
- Migration `0036_backfill_releases_from_episode_versions.up.sql` explicitly keeps a transition link by adding `episode_versions.fansub_release_id`.

### Partial

- The same migration uses `DISTINCT ON` collapse points while backfilling releases, variants, and streams.
- Those collapse points are now covered by focused regression tests, but that only proves the migration contains the current lossy-risk seam; it does not prove the resulting data is lossless.
- Release runtime handlers still validate streamability through `episode_versions`-backed lookups rather than through normalized `fansub_releases` / `streams` tables.

### Open

- There is still no committed reconciliation report comparing representative `episode_versions` rows to the normalized release tables after backfill.
- The current codebase does not yet prove that normalized release tables can safely replace the legacy release/runtime path.

## Reconciliation Checks

### Metadata coverage

- **Current evidence:** helper-level tests and prior review evidence exist.
- **Confirmed:** mapping and tokenization behavior.
- **Missing:** committed row-count reconciliation output for:
  - anime vs `anime_titles`
  - distinct legacy genre tokens vs `genres`
  - anime/genre associations vs `anime_genres`

### Episode identity alignment

- **Current evidence:** migration definitions show additive extension to `episodes`.
- **Confirmed:** the schema keeps legacy episode identity intact while adding normalized columns/tables.
- **Missing:** a committed report proving downstream repositories prefer or even consume the new Phase B structures in core runtime paths.

### Release decomposition preservation

- **Current evidence:** migration `0036` backfills new release tables and preserves a transition column on `episode_versions`.
- **Confirmed:** the migration still treats `episode_versions` as the source during transition.
- **Missing:** committed data reconciliation proving one-to-one or intentionally accepted many-to-one collapse behavior for releases, variants, and streams.

## Current Recovery Reading

### Confirmed

- Phase A-C schema artifacts are present in the repo.
- Focused regression coverage now exists for the main migration/authority seams named by the audit.
- The runtime authority for anime/admin/release remains mostly legacy-first or adapter-backed, not normalized-first.

### Partial

- The migration lane has enough evidence to stop pretending A-C are fully validated.
- The migration lane does not yet have enough evidence to claim Phase C cutover readiness.

### Open

- A post-Phase-C decision still requires a cutover brief based on explicit acceptance or repair of the remaining reconciliation gaps.

## Recommended Next Step

Use this baseline together with `db-runtime-authority-map.md` to produce the Phase C cutover-recovery decision:

- **proceed with guarded cutover**
- **repair before cutover**
- **stop and defer**

At the current evidence level, the baseline supports **repair-focused review**, not automatic cutover confidence.
