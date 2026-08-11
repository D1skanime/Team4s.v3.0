# Phase 126: Mitgliedschaftsbadges fachlich trennen und als responsive Membership Stage darstellen - Research

**Researched:** 2026-08-11
**Domain:** Public-profile membership badge presentation, derived duration progress, responsive accessible Stage UI
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
All D-01 through D-58 in `126-CONTEXT.md` are locked verbatim from the numbered PRD sections. In particular: presentation-only frontend work; independent founding and duration states; exactly 5/7/10 duration stages; no outer membership carousel; no backend/API/DB/FocalCarousel changes; preserve the dirty Phase 121/123/124/125 baseline; blocking human approval before the final report. [VERIFIED: `126-CONTEXT.md`; `126-PRD.md`]

### the agent's Discretion
- Exact profile-local component split and CSS class names, provided established Stage seams are reused.
- Mobile ordering of duration and founding panels, subject to UAT.
- Decorative styling within existing tokens and Phase 121–125 visual language.

### Deferred Ideas (OUT OF SCOPE)
- Special-award grid redesign.
- Backend/API/database/DTO extensions.
- General `FocalCarousel` or universal Stage-engine changes.
- A new zero/<5 membership visibility product rule.
</user_constraints>

## Summary

Phase 126 has all data it needs today. The public profile projection always includes a `membership` progress row whose `current_count` is the maximum whole-year duration of one valid `hist_fansub_group_members` row, with thresholds 5/7/10. The badge service independently derives `founding_member` from joined year versus group founded year and derives each duration badge from one membership row meeting its threshold. This proves the two axes are already independent in backend semantics and that no backend/API/DB work is justified. [VERIFIED: `backend/internal/repository/member_profile_progress_repository.go`; `backend/internal/services/badge_service.go`; `backend/internal/models/member_profile.go`]

The presentation bug is localized. `memberBadgeLabels.ts` currently puts founding and the three duration codes into one `membership` definition, while special-case conditions merely prevent authoritative duration from auto-earning founding. `currentStage` can still become founding for a founder under five, so the existing family model can incorrectly promote founding into the hero/current progression. `MemberBadgeChain.tsx` then sends the one membership family through the generic outer `FocalCarousel`/`FamilyCollectionCard` branch. The correct plan is to split founding from duration in the presentation resolver, keep one membership group, and route it to a profile-local `MembershipStage` that reuses the Stage composition and resolver-based artwork seams already present for anime projects, points, and contributions. [VERIFIED: `frontend/src/components/profile/memberBadgeLabels.ts`; `frontend/src/components/profile/MemberBadgeChain.tsx`]

The shared worktree is materially dirty in the exact four profile files Phase 126 will need, plus `FocalCarousel.*` and contribution assets. Planning must therefore use a baseline manifest/patch-isolation gate and must not commit by whole-file staging. Phase 125’s current uncommitted Stage is the latest source-of-truth seam. [VERIFIED: `git status --short`; `git diff` on 2026-08-11; Phase 125 context/research/plan]

**Primary recommendation:** Implement a presentation-only `MembershipStage` by splitting founding from duration in the existing resolver, consuming the unchanged authoritative `membership` progress DTO, and protecting all edits with per-file dirty-baseline diff isolation. [VERIFIED: codebase and locked PRD]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Longest single membership duration | Database / Storage | API / Backend | Existing SQL computes `MAX` of individual valid membership durations; frontend consumes it unchanged. [VERIFIED: repository code] |
| Founder eligibility and earned duration badges | API / Backend | Database / Storage | Existing service owns badge derivation and codes; it is read-only for Phase 126. [VERIFIED: badge service] |
| Founder/duration presentation split | Browser / Client | Frontend Server (SSR) | Pure resolver/render semantics over the already projected payload. [VERIFIED: profile page and resolver] |
| SSR visibility | Frontend Server (SSR) | Browser / Client | Server page passes `public_badges` and `badge_progress` directly into `MemberBadgeChain`; no client fetch gates content. [VERIFIED: `frontend/src/app/members/[slug]/page.tsx`] |
| Preview interaction | Browser / Client | — | Local `selectedCode` changes only the hero presentation. [VERIFIED: Phase 123–125 Stage implementations] |
| Responsive geometry and accessibility | Browser / Client | — | CSS and semantic controls live in profile-local component/styles/tests. [VERIFIED: MemberBadgeChain files] |

## Project Constraints (from AGENTS.md)

- Work only in `/home/d1sk/team4s` through `ssh team4s-linux`; Docker Compose is the runtime and GSD uses `./scripts/gsd-linux.sh`. [VERIFIED: `AGENTS.md`]
- Inspect status and Compose before editing; preserve `.env`, media, volumes, DB contents, and all unrelated dirty work. [VERIFIED: `AGENTS.md`]
- Search first and extend existing seams; plans must name direct analog files in `read_first`. [VERIFIED: `AGENTS.md`; implementation contract]
- Use correct German umlauts in all UI strings. [VERIFIED: `AGENTS.md`]
- Reuse global UI tokens/components, keep responsive/accessibility behavior, and avoid unrelated redesign. [VERIFIED: `AGENTS.md`; UI docs]
- This is planning-only; do not implement. [VERIFIED: assigned scope; `AGENTS.md`]
- Phase 126 must not change backend/API/DB/FocalCarousel and must preserve domain ownership. [VERIFIED: PRD §§52,55]
- Validation planning includes typecheck, lint, focused tests, build if feasible, and `git diff --check`; live shared-flow UAT is required for public UI. [VERIFIED: `AGENTS.md`]

## Standard Stack

### Core

| Library / seam | Version | Purpose | Why Standard |
|---|---:|---|---|
| React | 18.3.1 | Local preview state and semantic rendering | Existing pinned frontend runtime. [VERIFIED: `frontend/package.json`] |
| Next.js | ^16.1.6 | SSR public profile route | Existing project framework; the route already composes the badge chain server-side. [VERIFIED: package and page source] |
| TypeScript | ^5.7.2 | Typed presentation resolver/components | Existing project compiler. [VERIFIED: `frontend/package.json`] |
| Vitest | ^3.2.4 | Focused resolver/component regressions | Existing test runner and scripts. [VERIFIED: package and vitest config] |
| Testing Library React | ^16.3.0 | Accessibility/interaction-oriented component tests | Existing dependency used by current badge tests. [VERIFIED: package and tests] |
| `ResponsiveImage` + central badge resolver | project-local | Active artwork URL and responsive image rendering | Already owns membership asset resolution; prevents a second filename seam. [VERIFIED: MemberBadgeChain source/tests] |
| `Card`, `Badge`, `SectionHeader` | project-local | Stage composition | Existing UI-system primitives already used by all Stage analogs. [VERIFIED: MemberBadgeChain source; UI docs] |

### Supporting

| Seam | Version | Purpose | When to Use |
|---|---:|---|---|
| `MemberBadgeFamilyPresentation` | project-local | Authoritative progress plus presentation stages | Preserve for duration; add a narrow membership presentation view rather than a second domain model. [VERIFIED: resolver source] |
| CSS Modules | project-local | Responsive Stage geometry | Extend `MemberBadgeChain.module.css` with stable, scoped membership slots. [VERIFIED: current profile styles] |
| Playwright | 1.55.0 | Supporting viewport evidence | Use after focused tests/build; live in-app browser remains the human UAT authority. [VERIFIED: package; `AGENTS.md`] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|---|---|---|
| Presentation-layer split | Backend DTO/schema split | Rejected by locked scope; existing payload already carries independent earned codes and duration progress. [VERIFIED: PRD; projection] |
| Profile-local Membership Stage | Universal badge engine | Rejected because only one new consumer is needed and Phase 123–125 patterns are intentionally profile-local. [VERIFIED: PRD §26; predecessor artifacts] |
| Three-column/tap track | Another carousel/scroll engine | Rejected: only three nodes, all should fit at 390 px, and PRD explicitly forbids the engine. [VERIFIED: PRD §§31,33,51] |

**Installation:** None. No dependency changes are needed. [VERIFIED: existing stack provides all required primitives]

## Architecture Patterns

### System Architecture Diagram

```text
hist_fansub_group_members ──> existing backend projection ──> badge_progress[family=membership]
         │                              │                         │
         └──> existing badge service ──> public_badges codes ─────┤
                                                                  v
SSR /members/[slug] ──> MemberBadgeChain ──> membership presentation split
                                               ├── duration: 5 → 7 → 10
                                               │      └── MembershipStage hero/progress/track
                                               └── founding: independent earned flag
                                                      └── optional FoundingMemberPanel
```

[VERIFIED: repository, service, page, resolver, and render sources]

### Recommended Project Structure

```text
frontend/src/components/profile/
├── memberBadgeLabels.ts          # extend the canonical presentation resolver
├── memberBadgeLabels.test.ts     # independent founder/duration resolver matrix
├── MemberBadgeChain.tsx          # MembershipStage composition and group routing
├── MemberBadgeChain.module.css   # stable responsive membership slots
└── MemberBadgeChain.test.tsx     # Stage, a11y, carousel-removal, asset, SSR-visible DOM
```

Do not add files unless the 450-line/local cohesion constraints make a focused extraction necessary; if extracted, keep it in this profile directory. [VERIFIED: implementation contract and predecessor pattern]

### Pattern 1: Independent axes over one payload

**What:** Derive `foundingStage` only from earned `founding_member`; derive `durationFamily` from the same authoritative `membership` progress but only codes 5/7/10. Never let founding participate in duration `currentStage`, `nextStage`, `heroStage`, ordering, or preview selection. [VERIFIED: current bug seam and PRD]

**When to use:** Always for the membership group.

### Pattern 2: Preview changes presentation, not facts

**What:** Follow the Phase 123–125 local-state pattern: `selectedCode` may select only an earlier earned duration stage; hero artwork/status read the selection, while actual years, progressbar values, remainder, `complete`, and current marker continue to read the authoritative family. [VERIFIED: existing Stage implementations]

### Pattern 3: Zero/<5 remains visible

**What:** The existing public projection always returns a membership progress entry, even at zero, and the resolver retains a family whenever progress exists. Therefore the current behavior is to show membership below 5 with the 5-year milestone locked; Phase 126 must preserve that visibility, while changing its presentation from generic carousel/card to the dedicated Stage. [VERIFIED: `loadBadgeProgress`; resolver `if (!progress && !currentStage) continue`]

### Pattern 4: Longest single membership is backend-authoritative

**What:** `membership.current_count` comes from `MAX(EXTRACT(YEAR FROM age(...)))` over valid individual membership rows. The duration badge service also asks whether one row reaches each threshold. The client must not inspect `profile.memberships`, sum periods, or recalculate years. [VERIFIED: repository and service SQL]

### Anti-Patterns to Avoid

- **Treating founder as threshold zero:** This makes founder current/hero below five and creates the false timeline the phase exists to remove. [VERIFIED: current resolver behavior]
- **Filtering the whole membership group by earned badges:** This would hide zero/<5 users despite the existing authoritative progress row. [VERIFIED: resolver/projection]
- **Clamping displayed years:** Clamp only progress fill/target; display the actual 24/50-year value. [VERIFIED: PRD §§17,44]
- **Whole-file staging in the dirty tree:** It would mix Phase 121/124/125 changes with Phase 126. [VERIFIED: current status/diff]
- **Editing `FocalCarousel.*`:** Membership removal is a consumer-routing change; shared carousel behavior is explicitly out of scope. [VERIFIED: PRD §§39,47,55]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Membership years | Date arithmetic in React | `badge_progress` membership row | Backend already owns longest-single-membership and boundaries. [VERIFIED: projection] |
| Earned founder/duration | New client rules | `public_badges` plus existing resolver semantics | Prevents divergence from persisted badge derivation. [VERIFIED: service and page payload] |
| Asset paths | New filename map/callsite conditions | Existing central `resolveBadgeArtwork` seam | It already resolves all four active v4 assets and is regression-tested. [VERIFIED: MemberBadgeChain source/tests] |
| Responsive images | Raw `<img>` variations | Existing `ResponsiveImage` pattern | Preserves responsive image behavior and central geometry conventions. [VERIFIED: Stage analogs] |
| Carousel/scroll interaction | New gestures, timers, observers | Three-node CSS grid plus native buttons | Locked requirement and smaller accessible interaction surface. [VERIFIED: PRD] |

**Key insight:** Phase 126 is a presentation normalization, not a domain or transport problem. [VERIFIED: complete data flow audit]

## Common Pitfalls

### Pitfall 1: Founder-under-five becomes duration-current
**What goes wrong:** Reverse earned-stage search selects threshold-zero founding as `currentStage`.
**Why it happens:** Founding lives inside `FAMILY_DEFINITIONS.membership.stages` today.
**How to avoid:** Exclude founding before building duration stage state; model it separately.
**Warning signs:** Hero says “Gründungsmitglied” while duration track claims a current time tier. [VERIFIED: resolver source]

### Pitfall 2: Terminal progress replaces real duration
**What goes wrong:** 24 years renders as 10/10.
**Why it happens:** UI reuses clamped progress value as the factual count.
**How to avoid:** Display `currentCount`; clamp only bar fill/target text and show terminal copy. [VERIFIED: PRD]

### Pitfall 3: Interval math becomes 6/10
**What goes wrong:** Progress is calculated against the overall maximum rather than the next authoritative threshold.
**Why it happens:** A component recomputes instead of consuming `next_threshold`/`remaining_count`.
**How to avoid:** Mirror the existing Stage calculation using the projected next threshold; test 6→7 and 8→10. [VERIFIED: projection and PRD]

### Pitfall 4: Founding duplicates in special awards
**What goes wrong:** Splitting the resolver releases founding into the generic unknown/special fallback loop.
**Why it happens:** `ownedCodes` no longer claims it as membership-owned.
**How to avoid:** Mark founding as consumed by the membership presentation even though it is excluded from duration. [VERIFIED: resolver fallback loop; PRD §25]

### Pitfall 5: Dirty-tree loss or mixed commit
**What goes wrong:** Phase 126 overwrites or commits current Phase 121/124/125 changes.
**Why it happens:** Whole-file rewrite/staging against HEAD rather than current worktree.
**How to avoid:** Capture status, unstaged/cached/binary diffs and hashes before editing; create a Phase-126-only patch; compare staged diff to that patch; do not commit if isolation is uncertain. [VERIFIED: status and Phase 125 plan precedent]

## Code Examples

Verified project-local target pattern (illustrative, not a new API):

```ts
// Source: frontend/src/components/profile/memberBadgeLabels.ts
const durationCodes = new Set([
  'long_term_member',
  'membership_7_years',
  'membership_10_years',
])

// founding_member must be claimed by membership presentation,
// but never enter duration stages/current/next/hero.
```

```tsx
// Source analogs: AnimeProjectAchievementStage / PointsAchievementStage /
// ContributionAchievementStage in MemberBadgeChain.tsx
const selectedStage = family.stages.find(
  (stage) => stage.badge_code === selectedCode && stage.earned && !stage.locked,
)
const heroStage = selectedStage ?? family.heroStage
// Facts and ARIA continue to read family.currentCount / nextThreshold / complete.
```

## State of the Art

| Old Approach | Current Phase-126 Approach | When Changed | Impact |
|---|---|---|---|
| One generic membership family with founding threshold 0 | Independent founding panel plus 5/7/10 duration family | Phase 126 | Correct domain semantics without payload changes. [VERIFIED: PRD] |
| Outer carousel for a single membership family | Direct single Membership Stage | Phase 126 | Removes irrelevant navigation/drag/counter. [VERIFIED: PRD] |
| Generic family card | Reused Phase 123–125 achievement composition | Phase 123 onward | Preserves established hero/progress/track behavior. [VERIFIED: predecessor artifacts and current code] |

**Deprecated/outdated:** Treating `founding_member` as the first duration stage is explicitly deprecated by this phase. [VERIFIED: PRD]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| — | None. All implementation-driving claims were verified against the PRD or current canonical code/worktree. | — | — |

## RESOLVED Questions (no open implementation questions)

1. **RESOLVED — Should membership appear for a non-founder below five years?**
   - What we know: The backend always emits membership progress, including zero; the resolver keeps any family with progress. [VERIFIED: code]
   - Resolution: Preserve the current visible Stage with zero/actual years and a locked 5/7/10 track. This is not a new product decision; it is current behavior. [VERIFIED: code; PRD §§13,38]
2. **RESOLVED — Does the client need membership-row data to find the longest membership?**
   - What we know: `badge_progress.membership.current_count` is already the backend `MAX` across individual rows. [VERIFIED: SQL]
   - Resolution: No. Do not read/sum memberships client-side.
3. **RESOLVED — Does founder require backend separation?**
   - What we know: It is already independently earned and appears in `public_badges`; duration progress excludes it. [VERIFIED: service/projection]
   - Resolution: No. Presentation-only split.
4. **RESOLVED — Can Phase 126 safely commit application changes from the current tree?**
   - What we know: target files and `FocalCarousel.*` contain active uncommitted predecessor work. [VERIFIED: status/diff]
   - Resolution: Plan explicit patch isolation and default to no commit if exact hunk ownership cannot be proven.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---:|---|---|
| SSH `team4s-linux` | Canonical repository | ✓ | reachable | none |
| Docker Compose frontend/backend | tests/live UAT | ✓ | services running | none |
| Node toolchain in frontend container | typecheck/lint/test/build | ✓ | project container | use documented Compose commands |
| In-app browser tunnel | live UAT | ✓ documented | `127.0.0.1:3300` | Linux URL for supporting checks only |

**Missing dependencies with no fallback:** None found. [VERIFIED: `docker compose ps`; `AGENTS.md`]

## Validation Architecture

### Test Framework

| Property | Value |
|---|---|
| Framework | Vitest ^3.2.4 + Testing Library React ^16.3.0 [VERIFIED: package] |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `docker compose exec -T team4sv30-frontend npm test -- --run frontend/src/components/profile/memberBadgeLabels.test.ts frontend/src/components/profile/MemberBadgeChain.test.tsx` (adjust container cwd paths if required) |
| Full suite command | `docker compose exec -T team4sv30-frontend npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| D-01–D-28 | Resolver split, Stage composition, authoritative facts | unit/component | focused two-file Vitest run | ✅ extend |
| D-34–D-46 | A11y, boundary matrix, preview, assets, geometry | component/source-contract | focused `MemberBadgeChain.test.tsx` | ✅ extend |
| D-39/D-47 | no membership carousel; shared regressions | component regression | focused tests then full suite | ✅ extend |
| D-48–D-50 | live/responsive/evidence | manual UAT | in-app browser at required viewports | ❌ Wave 0 evidence checklist |
| D-57/D-58 | blocking approval and post-approval report | manual checkpoint/document | `approved` gate | ❌ planned checkpoint |

### Sampling Rate
- **Per task commit:** focused resolver and chain tests.
- **Per wave merge:** frontend typecheck, lint, and full Vitest suite.
- **Phase gate:** full suite/build where feasible, six-viewport live UAT, evidence set, then human `approved`.

### Wave 0 Gaps
- [ ] Add explicit founder/non-founder × 3/6/24 matrix tests.
- [ ] Add 0/1/4/5/6/7/8/9/10/11/24 duration matrix tests.
- [ ] Add no-outer-carousel and no-duplicate-founding assertions scoped to membership.
- [ ] Add stable-slot/contain CSS source contracts and evidence checklist.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---|---:|---|
| V2 Authentication | no | Public read-only route; no auth change. [VERIFIED: route scope] |
| V3 Session Management | no | No session code touched. [VERIFIED: scope] |
| V4 Access Control | yes, regression-only | Preserve existing public-profile visibility/404 handling; no new fetch. [VERIFIED: SSR page] |
| V5 Input Validation | yes, local state | Only permit `selectedCode` from earned duration stages. [VERIFIED: analog pattern] |
| V6 Cryptography | no | No cryptographic operation. [VERIFIED: scope] |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---|---|---|
| Hidden/future badge selection via crafted state | Elevation / spoofed presentation | Resolve selection only against `family.stages` with `earned=true`; locked entries are static and unfocusable. [VERIFIED: existing pattern; PRD] |
| Visibility leakage through a new client fetch | Information disclosure | Keep existing SSR projection and do not add API calls. [VERIFIED: locked scope] |
| Misleading achievement status | Spoofing | Keep actual years/progress/current stage authoritative during preview and separate founding semantics. [VERIFIED: PRD] |

## Sources

### Primary (HIGH confidence)
- `126-PRD.md` — all 58 locked product, architecture, test, UAT, and report sections.
- `AGENTS.md` and project contract/UI docs — canonical environment and reuse rules.
- `backend/internal/repository/member_profile_progress_repository.go` — authoritative membership projection.
- `backend/internal/services/badge_service.go` — founder and duration earned rules.
- `frontend/src/components/profile/memberBadgeLabels.ts` — family resolver and current semantic defect.
- `frontend/src/components/profile/MemberBadgeChain.tsx` and related CSS/tests — rendering/asset/Stage seams.
- Phase 121/124/125 context, research, plans, summaries, and validation artifacts — predecessor contracts and dirty-tree precedent.

### Secondary (MEDIUM confidence)
- None required; this phase is codebase-only research.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from package/config and current imports.
- Architecture: HIGH — traced end-to-end from SQL projection through SSR to resolver/render.
- Pitfalls: HIGH — demonstrated by current resolver shape, dirty diff, and locked PRD matrices.

**Research date:** 2026-08-11
**Valid until:** 2026-08-18 (fast-moving dirty predecessor worktree)
