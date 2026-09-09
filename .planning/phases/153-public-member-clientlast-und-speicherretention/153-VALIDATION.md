---
phase: 153
slug: public-member-clientlast-und-speicherretention
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-09
---

# Phase 153 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^3.2.4 [VERIFIED: frontend/package.json] |
| **Config file** | `frontend/vitest.config.ts` (alias `@` → `src`, setup file `src/test/axeSetup.ts`) |
| **Quick run command** | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run <path-to-test-file>"` |
| **Full suite command** | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm test"` |
| **Estimated runtime** | ~90 seconds (full suite, per prior phase norms) |

---

## Sampling Rate

- **After every task commit:** Run targeted `vitest run <touched-file>` plus a scoped `npx tsc --noEmit` check where feasible
- **After every plan wave:** Run full `npm test` + `npm run lint` + `npm run typecheck` inside the container
- **Before `/gsd:verify-work`:** Full suite green, `docker compose build` PASS, plus the three committed audit scripts (`audit-public-member-bundles.mjs`, `audit-public-member-navigation-retention.mjs`, `audit-public-member-visibility.mjs`) re-run under report conditions (1440×900, DPR 1, anonymous context, cold/warm separated, throttling as in the report)
- **Max feedback latency:** 90 seconds for the automated suite; Playwright audit scripts are manual/on-demand, not part of per-commit sampling

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| P153-01 | `sizes` string no longer contains `auto,` prefix, for lazy and priority images | unit | `vitest run src/components/profile/AchievementArtwork.test.tsx` | ✅ needs assertion updates | ⬜ pending |
| P153-01 | Badge-chain carousel images carry the corrected `sizes` string | unit | `vitest run src/components/profile/MemberBadgeChain.test.tsx` | ✅ needs assertion updates | ⬜ pending |
| P153-02 | Lazy loading / geometry / optimizer / srcset unchanged | unit + audit-script | existing `AchievementArtwork.test.tsx` coverage + `audit-public-member-images.mjs` | ✅ / ✅ | ⬜ pending |
| P153-03 | No linear DOM/listener growth over 12 and 50 SPA cycles | audit-script (Playwright) | `docker compose exec -T -e AUDIT_LABEL=post153 -e AUDIT_CYCLES=12 team4sv30-frontend node scripts/audit-public-member-navigation-retention.mjs` (repeat with `AUDIT_CYCLES=50`) | ✅ script exists | ⬜ pending |
| P153-04 | Four renderer-only consumers import `RichTextRenderer` directly, identical output | unit | existing per-component test files (`MemberStorySection.test.tsx` etc.) | ✅ existing, ⚠️ new static-guard test possible — Wave 0 gap | ⬜ pending |
| P153-05 | Barrel-structure decision documented and justified | manual/doc | N/A | N/A | ⬜ pending |
| P153-06 | Not-found preview still works for owner after loading-boundary change | unit | `vitest run src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx` | ✅ needs extension | ⬜ pending |
| P153-07 | No Tiptap/ProseMirror/editor modules in public DEV bundle | audit-script | `docker compose exec -T team4sv30-frontend node scripts/audit-public-member-bundles.mjs` | ✅ script exists | ⬜ pending |
| P153-08/09/10 | SSR content visible pre-hydration; empty sections server-decided; badge ladder unchanged | unit + audit-script | `MemberCurrentProjectsSection.test.tsx`, `LatestContributionsSection.test.tsx`, `PreviousContributionsSection.test.tsx`, `MemberBadgeChain.test.tsx` + `scripts/audit-public-member-visibility.mjs` | ✅ all exist (confirm exact names at plan time) | ⬜ pending |
| P153-11 | Before/after measurement document under report conditions | manual/doc | Reuse D1 script set per `REPRODUCE.md`; write to new audit document, do not overwrite existing report | N/A | ⬜ pending |
| P153-12 | Full suite green, prod build PASS via `docker compose build` | full-suite | `docker compose exec -T team4sv30-frontend npm test`, `npm run typecheck`, `npm run lint`; `docker compose build` (NOT `exec ... npm run build` — polluted `.next` volume gives false prerender errors) | ✅ all commands exist | ⬜ pending |
| P153-13 | RCA-04 stays documented-open, no "crash fixed" claim | manual/doc | N/A | N/A | ⬜ pending |
| P153-14 | Pre-existing, phase-foreign defects named with evidence, not silently fixed or hidden | manual/doc | N/A (evidence already captured in RESEARCH.md Pitfall 6) | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Confirm each of the four Workstream-B renderer-only consumers' existing `.test.tsx` files do not `vi.mock('@/components/editor', ...)` in a way that silently breaks after the import-path change — read-and-adjust pass, not a new file.
- [ ] If the planner adopts a "lightweight static guard" approach for D2's permanent regression protection, a new small vitest file asserting no `sizes="auto"` string and no barrel-wide `RichTextEditor` import exists in the four named public-consumer files — new-file work not covered by any existing test.
- [ ] `OwnHiddenProfilePreview.test.tsx` may need a `vi.mock('next/dynamic', ...)` addition depending on how B4 (real loading boundary) is implemented — verify empirically at the start of the B4 task, not assumed in advance.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| DOM/listener retention over 12 and 50 SPA navigation cycles | P153-03 | Requires real Chromium navigation cycles and heap/listener introspection; not expressible as a fast vitest unit assertion | Run `audit-public-member-navigation-retention.mjs` with `AUDIT_CYCLES=12` then `AUDIT_CYCLES=50` against the running dev container; compare node/listener counts pre/post fix |
| Public DEV/production bundle composition (no Tiptap/ProseMirror/editor modules) | P153-07 | Requires an actual compiled `.next` output to inspect real chunk contents | Run `audit-public-member-bundles.mjs` after `docker compose build`; compare against report baseline (353 kB / 1.155 kB member, 187/632 kB group) |
| Throttled visibility timing (content visible pre-hydration, shorter skeleton duration) | P153-08/09/10 | Requires network/CPU throttling (1.6 Mbit/s, CPU×4) and real browser paint timing, not reproducible in a unit test | Run `audit-public-member-visibility.mjs` against `timer`, `kara`, and the group page under report throttling conditions; compare against `visibility-members-timer.json`, `visibility-members-kara.json`, `visibility-fansubs-new-subs.json` |
| Before/after comparison document (D1) | P153-11 | Requires aggregating multiple audit-script runs into a new dated document, not a single automated check | Run the full audit-script set pre- and post-fix under identical conditions; write results to a new file under `docs/audits/`, do not overwrite the existing 2026-09-09 report |
| Production build correctness | P153-12 | `docker compose build` is the only authoritative production build path per operating constraints; `exec ... npm run build` gives false failures from a polluted `.next` volume | Run `docker compose build` and confirm exit 0 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all identified gaps (editor-mock breakage, optional static guard, optional next/dynamic mock)
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s for automated suite
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
