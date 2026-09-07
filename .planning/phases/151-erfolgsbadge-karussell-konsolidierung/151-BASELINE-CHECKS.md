# Phase151 — Checks before implementation

Baseline: clean main `052858dc48576024518c5c527ae82c9d2027ac7b`, Linux Docker Compose.

| Check | Result |
|---|---|
| `docker exec team4sv30-frontend npm test -- --reporter=dot` | PASS: 291 files, 2225 tests, one skipped file/test, three todo; 84.19s. |
| `docker exec team4sv30-backend go test ./internal/badges/...` | PASS. |
| `docker exec team4sv30-frontend npm run typecheck` | Existing failure in generated `.next/dev/types/app/anime/[id]/group/[groupId]/releases/page.ts`: GroupReleasesPageProps.params permits a non-Promise value. Already documented in Phase150 verification. |
| `docker exec team4sv30-frontend npm run lint` | Existing 13 errors / 332 warnings. Error locations: capture-responsive.cjs (2), useEpisodeNeighborNavigation.ts, useReleaseVersionMedia.ts, GroupMemberFormModals.tsx, GroupRolesTab.tsx, AdminGroupsClient.tsx (4), RoleCapabilityDetail.tsx, CapabilityDetailRow.tsx, CapabilityHistoryPanel.tsx. None in the badge/carousel scope. |
| Linux Chromium public `/members/type` at 390x844, 768x1024, 1440x900, 2560x1440 | Four screenshots captured, no horizontal page overflow. Baseline snapshot only. |

Detailed command logs: `/tmp/team4s-151-baseline-{vitest,typecheck,lint,badges}.log` on Linux; final verification must repeat relevant checks and compare results. No unrelated source changes are authorized just to remove these pre-existing failures.

Fresh PostgreSQL baseline proof after research: both `TestPhase131PublicProfileQueryBudgetIsConstant` (2 and 6 projects each **20 queries**) and `TestPhase150RoleEntryBadgeEmittedExactlyOnceWithProgress` PASS, with DSNs supplied only to the test process. Each test ran in a new schema-only copy of the current application schema using guarded names `team4s_phase131_test_p151<timestamp>` / `team4s_phase150_test_p151<timestamp>`, then its database was dropped. The initial control-command attempt used an extra underscore and was correctly rejected by both test name guards before any fixture work; corrected names passed. Application data was never modified.
