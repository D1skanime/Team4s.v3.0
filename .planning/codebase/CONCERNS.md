# Concerns

## Current Explicit Risks
- `RISKS.md` lists a broken cover upload button as a high-impact active issue; API upload works, but the admin UI path is not reliable.
- `RISKS.md` also flags missing rollback documentation for the cover/media migration as a production-readiness blocker.
- `RISKS.md` notes schema/documentation drift around media table design.
- `TODO.md` calls out repo-wide frontend lint debt and outdated UX handoff docs.

## Architectural Concerns
- `backend/internal/handlers/` is large and contains many adjacent feature files; growth is manageable now but risks becoming the primary bottleneck for discoverability and change safety.
- Project truth is split across code, `shared/contracts/`, top-level planning docs, and `docs/architecture/`; without maintenance this can drift.
- There are two migration locations:
  - `database/migrations/`
  - `backend/database/migrations/`
  This may confuse future contributors about what is current vs legacy/supporting migration material.

## Operational Concerns
- Compose startup can race Postgres readiness; earlier local startup showed backend exiting once while DB was still coming up, then succeeding on restart.
- Media upload depends on FFmpeg availability; startup only warns when missing, which is helpful for boot but may hide partial feature disablement if not monitored.
- The repo includes generated/local artifacts such as `frontend/node_modules/`, media directories, and historical status docs, which increase workspace noise.

## Quality Concerns
- Lint is currently not a clean repository gate per `RISKS.md`.
- Some planned testing work remains open in `TODO.md`, especially for upload handler validation and end-to-end media upload flows.
- The broad file-level test scan can overstate frontend test maturity because dependency trees exist locally under `frontend/node_modules`.

## Documentation Concerns
- The repository has many handoff/daylog/status markdown files; they are useful, but stale guidance can mislead future GSD planning if not curated.
- `TODO.md` explicitly notes outdated UX handoff content and missing rollback documentation.

## Recommended Watchlist
- Normalize source-of-truth rules between contracts, schema docs, and implementation.
- Reduce handler/package sprawl by tracking especially hot feature areas.
- Fix upload UI flow and document rollback before relying on the media subsystem for production changes.
- Re-establish a trustworthy lint/test baseline for frontend changes.
