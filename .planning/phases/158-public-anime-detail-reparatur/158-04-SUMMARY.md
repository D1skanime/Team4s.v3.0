---
phase: 158-public-anime-detail-reparatur
plan: "04"
subsystem: testing
tags: [anime, playwright, postgres, nextjs, verification]
requires:
  - phase: 158-03
    provides: Completed public anime repairs
provides:
  - Reproducible isolated production HTTP/browser and PostgreSQL gates
  - Complete technical evidence with explicit global baseline exceptions
  - Pending human UAT preserved separately
affects: [159]
tech-stack:
  added: []
  patterns: [GET-only loopback SSR fixtures, isolated browser transport, guarded disposable production build]
key-files:
  created:
    - frontend/scripts/anime-detail-phase158-probe.mjs
    - frontend/scripts/fixtures/anime-detail-fixture-server.mjs
    - scripts/verify-anime-detail-phase.sh
    - docs/audits/2026-09-13-public-anime-detail/phase158/RESULTS.md
    - .planning/phases/158-public-anime-detail-reparatur/158-VERIFICATION.md
    - .planning/phases/158-public-anime-detail-reparatur/158-UAT.md
  modified: []
key-decisions:
  - "Keep the full production-build baseline failure visible; prove affected public routes with Next's selective production build."
  - "Preserve all human UAT approvals as pending; phase technical evidence is separate."
requirements-completed: [P158-01, P158-02, P158-03, P158-04, P158-05, P158-06, P158-07, P158-08, P158-09]
duration: approximately 30min
completed: 2026-09-13
---

# Phase 158 Plan 04: Technical Gate Summary

**Thirty-three isolated production HTTP/browser checks and fresh PostgreSQL statement counts verify all Phase158 repairs, with unchanged global failures explicitly separated.**

## Execution and commits

- Phase baseline: `7c7e1c7d02ac870e7c68c02b66fd7f4b33f36b85`; plan start `388a6e62`; product end `d0ae1f9b`.
- Task1: `feeeb125` — isolated fixtures, browser probe and shell gates (3 files).
- Task2: `ba3e598e` — RESULTS, verification, pending UAT and50 documentation/evidence files.
- This summary and deferred-items note are the final plan metadata commit. Tasks **2/2**.
- Global STATE/ROADMAP/REQUIREMENTS updates and independent review artifacts remain the orchestrator's assigned responsibility. No push.

## Results

| Check | Final result |
|---|---|
|Isolated production HTTP/browser|33/33 PASS; full wrapper exit0; normal browser UA; all5 widths closed/open, actual colors, scrollX0, focus ring/slider, real404/500+metadata, auth/error/navigation matrix.|
|Focused frontend|168/168 PASS across11 files.|
|Full frontend|2459 PASS, exactly2 existing CSS guard failures,3todo;308 files PASS/1fail/1skip.|
|Full typecheck|PASS0; old numeric-route TS2344 fixed in01.|
|Full lint|Exactly13 baseline errors/331 baseline warnings. Scoped harness lint0warnings.|
|Backend|Fresh public-anime/ID/contracts regression, build and vet PASS. Mandatory PostgreSQL cases actually executed; unrelated5skips excluded.|
|Full isolated production build|FAIL at unchanged admin `formatEditLoadError` Page export.|
|Selective public-route production build|PASS, complete affected route composition and generated types; no ignoreBuildErrors.|
|Whole-phase diff review/check|PASS; no product changes or tracked deletions in this plan.|

Fresh anonymous requests: **8 SSR +2 client =10**, including3 root role catalogs; no SSR watchlist and no additional client data request on episode/group interaction. Cold Page+Metadata issue exactly1Anime GET. Relations success/empty/licensed use2data SQL, unknown/disabled1, invalid0; technical500 branches attempt1/2. Detail stays7total statements. Overall SQL38->32 is an explicitly **static** path recomputation; relations/detail are measured. No latency promise.

[RESULTS](../../../docs/audits/2026-09-13-public-anime-detail/phase158/RESULTS.md) contains the full matrix, findings, changed-file categories, command boundary, screenshots and exact baseline comparison. [Final JSON](../../../docs/audits/2026-09-13-public-anime-detail/phase158/fixture-results.json) SHA256: `51958ed5631ccca7f0444419ebf7661213513537328f2f38244c0991c9d1f6d0`.

## Deviations and issues

1. **Baseline build blocker:** The full build cannot validate beyond the unchanged invalid admin export. Used installed `--debug-build-paths` with a disposable `app -> src/app` alias because Next16's selective categorizer ignores src/app prefixes. Route source/root layout unchanged; only the affected production-route build is PASS.
2. **Harness readiness:** Replaced networkidle with semantic readiness, positioned the cursor outside the hover-open shell rail, and supplied the complete existing Keycloak bundle/me/expiry fixture shape. No product workaround.
3. **Rejected-refresh race:** A repeat run exposed a test reading initial SSR login UI before refresh (0instead of1). The final test awaits actual401 then cookie removal before asserting logout/no writes. A subsequent full33-case rerun and final wrapper33-case run both pass. Intermediate failures were not accepted.
4. **Focus boundary:** Existing card overflow:hidden and body overflow-x:clip predate the phase. The old header's outward outline may clip; F03 verifies the actual Groups CTA ring and slider are not clipped by the repaired hero. No global CSS fix.
5. Captured text logs normalize only trailing whitespace/blank EOF lines for diff hygiene; values/messages/exits are retained.

## Boundaries and next readiness

No real account cookies, live comment/watchlist writes, database changes, seed, migration, backend restart, runtime .env/.next overwrite, dependency addition or push. GET-only SSR origin/port guards and all-browser API interception protect live data. SQL uses only the guarded Phase106 DSN in a separate tmpfs PostgreSQL container, cleaned by captured container ID. Production artifacts stay in the frontend container's own /tmp copy.

Test-only empty/media-absent fixtures intentionally exercise missing-data states; no product stub was introduced. Phase159 image/manifest/variant work and F15 remain unclaimed. The full build blocker, old header focus treatment and5unrelated SQL skips are listed in [deferred-items](deferred-items.md).

**technical_passed** applies to158's required scope. Independent code/security/verification and global tracking are finalized by the orchestrator. **156 GAP-02's14 checks,157-06 Task4 and158 human review remain OPEN/PENDING**.

## Self-Check: PASSED

Both task commits exist; all53 task files and final33-case result exist; the fixture JSON hash matches and every recorded evidence-manifest hash verifies. Phase links resolve to the canonical repository. No owned runtime fixture service is left running.
