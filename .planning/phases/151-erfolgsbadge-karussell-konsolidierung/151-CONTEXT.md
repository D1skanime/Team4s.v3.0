# Phase 151: Erfolgsbadge-/Karussell-Konsolidierung

Gathered: 2026-09-07. Source: `151-USER-REQUEST.md` (binding complete user brief).
Status: research in progress; no implementation before research, UI contract and verified wave plans.

## Locked decisions
- D01: Linux `/home/d1sk/team4s` on `team4s-linux`, existing `main`; preserve agent/tool/runtime configuration, runtime data and source artwork. Windows is communication/control only.
- D02: Reuse Phase150 backend threshold authority and aggregated query paths; no frontend business tiers, second registry, per-badge fetch or N+1. Preserve dedup regression tests.
- D03: One consistent presentation slot with centered contain artwork, proportional padding, smaller mobile-first sizing and a firm upper bound on wide screens. Preserve original image resolution and HiDPI quality.
- D04: Consolidate competing responsive rules. Current local UI contract requires component container queries; verify narrow, intermediate, boundary, wide, embedded, zoom and overflow cases.
- D05: Verify current carousel first. Smooth direct navigation, clear active card throughout motion, no pumping or larger neighbors, touch/mouse/trackpad/keyboard and reduced motion.
- D06: Complete Karaoke FX entry and bronze/silver/gold/platinum artwork using existing role catalog and presentation seams. Match existing role art. No rendering special case for Karaoke FX.
- D07: Explicit, testable shipped-artwork validation against all achievement-capable catalog roles; deliberate exceptions declared. Use naming conventions without speculative file-exists runtime behavior.
- D08: Audit every available achievement artwork and every role, special, historical and milestone family individually in cards/carousel, active/inactive states. Inspect source files as well as currently resolved variants; document superseded files explicitly.
- D09: Browser screenshots/structural regression in existing Linux Playwright infrastructure, all six requested viewport classes, all artwork, sharpened visible comparison; unit tests alone cannot close the phase.
- D10: Execute relevant frontend and backend tests, typecheck, lint, feasible build, diff check. Document baseline unrelated failures accurately. Fix phase gaps and verify again before completion.
- D11: GSD Research -> Plans/Waves -> Execute -> Tests -> Visual QA -> Gaps -> Final verification -> Commit/Push origin/main. No discussion or approval pause is requested. Do not advance to another phase.
- D12: No unrelated redesign, data schema changes, role-model rewrite, runtime/tool upgrade, history rewrite or force push.

## Canonical references
- `151-USER-REQUEST.md` in this directory: full original scope and Definition of Done.
- `AGENTS.md`, `AI-HANDOFF.md`, `docs/engineering/implementation-contract.md`.
- `docs/frontend/ui-system.md`, `docs/agent-guidelines-ui.md`.
- `docs/frontend/auth-api-client.md`, `docs/api/api-contracts.md`, `shared/contracts/openapi.yaml` for affected boundaries.
- `.planning/phases/150-badge-regeln-eine-autoritative-schwellenquelle/150-CONTEXT.md` and `150-VERIFICATION.md`.
- Current production code is the technical truth; researcher must establish exact seams before plans.

## Execution baseline
- Branch: `main`; working tree clean before phase documentation.
- HEAD: `052858dc48576024518c5c527ae82c9d2027ac7b`.
- Compose frontend/backend/Postgres/Redis/Keycloak/Keycloak DB/Mailpit running, both DBs and Keycloak healthy.
- GSD wrapper works; Phase151 appended with `./scripts/gsd-linux.sh phase add Erfolgsbadge-Karussell-Konsolidierung`.
- Linux Codex 0.152.0 rejects gpt-6-astra as requiring a CLI upgrade. Respecting D01, no upgrade/config change: Astra coordinates from the control surface; bounded Linux CLI agents use available gpt-5.6-sol with high reasoning. Stale Windows paths in installed agent metadata are mapped to Linux when reading, not rewritten.

## Discretion
Exact bounded slot geometry, CSS structure and small shared presentation primitives follow evidence from the current code, the approved existing visual language and live verification. No new product/domain decisions.

## Research disposition (coordinator, 2026-09-07)
- Research is complete. Preserve the measured **20-query** public-profile strategy; the suggested 20-to-16 aggregate reuse and inert backend initializer cleanup are optional follow-ups, not necessary for this presentation phase. Do not modify backend production code or active older collectors solely for those opportunities.
- Both guarded PostgreSQL tests have now actually passed using schema-only copies in dedicated throwaway databases: `TestPhase131PublicProfileQueryBudgetIsConstant` measured 2 projects -> 20 and 6 -> 20; `TestPhase150RoleEntryBadgeEmittedExactlyOnceWithProgress` passed. Databases were removed after the runs. Research's missing-DSN observation is resolved by this execution procedure; no credentials/runtime configuration changed. Reusable control script currently at `/tmp/team4s-151-pg-proof.py` on Linux.
- The existing Linux CLI exposes `image_gen.imagegen`, including `referenced_image_paths`; generate Karaoke assets there using existing art references and preserve alpha. No API fallback, new dependency, tool upgrade or Windows generation is needed.
- Fix a research path typo when creating plans: the existing visibility manager is `frontend/src/app/me/profile/components/AchievementBadgesCard.tsx`, not under `components/profile`. It is not an artwork surface and should remain unchanged.
- Proposed geometry for UI contract: hero 192px narrow / 216px intermediate / 240px maximum, compact markers 64/80px; use container geometry, with the same slot dimensions across active/inactive states.
