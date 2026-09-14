---
phase: 159-public-anime-detail-konsolidierung
plan: "05"
subsystem: verification
tags: [anime, production, postgres, browser, media, security]
requires:
  - phase: 159-01
    provides: Public projection and canonical contracts
  - phase: 159-02
    provides: Explicit stream identity
  - phase: 159-03
    provides: Shared selection and bounded browser paging
  - phase: 159-04
    provides: Bounded media delivery and manifest lifecycle
provides:
  - Coherent 91-case production verification with real media cache and SQL budgets
  - Strict public RawQuery security correction
  - Valid anime fallback and real Next cover-routing correction
  - Scoped results, cleanup evidence and pending human UAT
affects: [phase159-final-review]
tech-stack:
  added: []
  patterns: [existing isolated harness, GET-only loopback proxy, actual Sharp decoding, guarded ephemeral PostgreSQL]
key-files:
  created:
    - frontend/scripts/anime-detail-phase159-probe.mjs
    - frontend/public/covers/placeholder.png
    - docs/audits/2026-09-13-public-anime-detail/phase159/RESULTS.md
    - .planning/phases/159-public-anime-detail-konsolidierung/159-VERIFICATION.md
    - .planning/phases/159-public-anime-detail-konsolidierung/159-UAT.md
  modified:
    - backend/internal/handlers/episode_version_grants.go
    - backend/internal/handlers/episode_version_reads.go
    - shared/contracts/openapi.yaml
    - frontend/src/lib/animeBackdrops.ts
    - frontend/scripts/anime-detail-phase158-probe.mjs
    - frontend/scripts/fixtures/anime-detail-fixture-server.mjs
    - scripts/verify-anime-detail-phase.sh
key-decisions:
  - Preserve full/default and unrelated malformed-query compatibility through one reused parser.
  - Keep the corrupt historical JPG unchanged and supply a valid anime-only display fallback.
  - Place the display adapter outside descendants of a real public file.
  - Separate image transfers, cache reuse and tiny non-cacheable error responses.
requirements-addressed: [P159-01, P159-02, P159-03, P159-04, P159-05, P159-06, P159-07, P159-08]
requirements-completed: [P159-01, P159-02, P159-03, P159-04, P159-05, P159-06, P159-07, P159-08]
completed: 2026-09-14
---

# Phase 159 Plan 05: Production, browser and SQL verification

**The existing harness now verifies bounded public inventory, shared state, manifest lifecycle and real image delivery in one 91/91 production run; three narrow security/runtime defects were corrected with RED/GREEN evidence.**

Both tasks are complete. Plan start194649cba38115fa493de39262f55cb3ce77c209; final product6ebfebf7, harness c1bd215c and Task2 evidence0df4fb26. The work spanned an explicitly recorded usage-limit interruption; no active-time duration is invented. Phase baseline remains c3bfcb23781addca1ccd3931592535416f706787 and original audit baseline7c7e1c7d02ac870e7c68c02b66fd7f4b33f36b85.

| Work | Commits |
|---|---|
| Strict RawQuery RED/GREEN | 8eaca4bf →157f318f |
| Real corrupt fallback RED/GREEN | 7459db5f →26faac70 |
| Public-file descendant route RED/GREEN | 80d74474 →6ebfebf7 |
| Root-owned test expectation/type corrections | d22da611, a76d9a8e |
| Task1 final harness | c1bd215c |
| Task2 results/evidence/verification/UAT | 0df4fb26 |

[RESULTS](../../../docs/audits/2026-09-13-public-anime-detail/phase159/RESULTS.md) holds the full finding/commit/limit matrix; [file inventory](../../../docs/audits/2026-09-13-public-anime-detail/phase159/file-inventory.json) groups the phase delta into backend, frontend, contracts, tests and harness. [Final run hashes](../../../docs/audits/2026-09-13-public-anime-detail/phase159/159-05/final-run.json) bind the 91 checks and exact scripts; no passing result was assembled from separate failed runs.

## Verification

- All 33 Phase158 regressions pass; five widths and closed/open geometry, HTTP/metadata/Pretty and central session/error handling remain intact.
- New group/Grid/125-variant/neutral/manifest cases pass. Two native tabs share selection without API calls; three grid pages and slow/retry/stale handling pass; 25 anime IDs and 48 SPA navigations verify retention with frozen TTL.
- 48 media configurations yield 96 cold/warm observations with all four cover URLs, every CDP source response and actual Sharp decoding. Cold successful sources transfer one image body; public warm cache transfers zero; private no-store warm transfers one. Failed sources return 1–2 tiny error texts, zero image bodies and no original retry.
- Fresh isolated SQL: first public24 rows uses2 statements/7522 bytes versus same-fixture baseline full125 variants at4 statements/57773 bytes. All126 variant/neutral rows are reachable without truncation; limit100 and identity/assignment/grant collisions pass. Relations remain2 data statements and detail7 total.
- Root full frontend:2616 PASS, exactly2 baseline CSS failures,3 todo. Typecheck/scoped lint0; global lint13/331 exactly matches baseline. Harness syntax/scoped lint, Go build/vet and final whole-audit diff check pass.
- Full production build reproduces the old invalid admin Page export. Selective build includes Anime/Pretty, stream, APIv1, media and covers. Actual production HTTP passes; unselected routes/later full-build blockers are not claimed verified.

## Deviations and limits

**Rule2 — security:** Go URL.Query silently dropped malformed named public options. The existing selector RawQuery loop was extracted once and reused; malformed projection/cursor/limit now return400 before repository access, with full/default/unrelated compatibility tested. Root synchronized only the two product Go files and confirmed live400/valid200 without restarting the container.

**Rule1 — fallback/runtime:** The historical 352-byte JPG is corrupt baseline content. A valid neutral64×96 PNG now serves only the anime display fallback. Next's real public-file lookup rejected the original child adapter with ENOTDIR500; the final route is /covers/display/[file]. Original media bytes/routes and global getCoverUrl consumers remain.

**Harness corrections:** Retained intermediate evidence records unselected RSC prefetches preventing networkidle, a detached final Load-more button, cached-neighbor retry setup and a too-broad error-response count. Final assertions wait for actual UI/image completion and distinguish successful image bytes from tiny error text. Log-only whitespace/indent normalization has before/after hashes; result values and statuses are unchanged.

F08 remains partial outside the bounded public seam; full/admin/AnimeDetail neutral data is intentionally retained. F14 retains legacy no-selector stream ambiguity while the explicit canonical path is verified. A512px bound is not a universal byte reduction; tiny synthetic animated WebP can grow after static encoding. Existing global CSS/lint/admin-build issues were not repaired. No goal-blocking production stubs were found; synthetic data belongs exclusively to the isolated fixtures.

## Cleanup and handoff

[Resources](../../../docs/audits/2026-09-13-public-anime-detail/phase159/159-05/resources.json) records exact container/process IDs, source/build hashes and resolved cleanup paths. Own PostgreSQL containers are removed, five owned scratch/production/media/evidence tmp paths are absent and ports3158/3159/3160 are closed. No live database, media, env, volumes, migrations, backend restart, Dev.next build, real playback/auth writes or push.

Root owns global tracking and independent final review/security/verification. Human UAT156-GAP02(14),157-06 Task4,158 and159 remains OPEN; requirements are addressed here, with global completion reserved for Root's final gate.

## Self-Check: PASSED

All listed artifacts and commits exist; evidence links resolve, no mandatory case is NOT_RUN, and cleanup is recorded. Only the intentional cover-adapter/test rename removed old tracked paths. Global tracking and foreign review/security files were not staged.

## Orchestrator closeout — 2026-09-14

All eight requirements are independently technically verified (159-INDEPENDENT-VERIFICATION.md). Final review is clean across 57 changed file identities; all 12 planned security mitigations are verified. ROADMAP, STATE, REQUIREMENTS and both validation documents now distinguish the technical completion from unchanged human UAT and global baseline exceptions. No additional product change was required after the final harness.
