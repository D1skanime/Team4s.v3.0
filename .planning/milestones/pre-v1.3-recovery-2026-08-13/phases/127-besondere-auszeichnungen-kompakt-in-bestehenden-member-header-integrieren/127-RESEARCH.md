# Phase 127: Besondere Auszeichnungen kompakt in den bestehenden Member-Header integrieren - Research

**Researched:** 2026-08-11
**Domain:** Next.js SSR profile composition and responsive achievement presentation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
D-01–D-49 in `127-CONTEXT.md` are locked verbatim from PRD sections 1–49; the planner must map every decision to tasks/verification. [VERIFIED: `127-CONTEXT.md`]

### the agent's Discretion
Exact profile-local component/class names and CSS values are discretionary within the locked compact, contrast, responsive and no-new-engine boundaries. [VERIFIED: `127-CONTEXT.md`]

### Deferred Ideas (OUT OF SCOPE)
New special types/assets, backend/API/DB/DTO work, fetches, FocalCarousel changes, progress/carousel semantics, Membership relocation and broad hero redesign are out of scope. [VERIFIED: `127-CONTEXT.md`]
</user_constraints>

## Summary

The public route already performs one cached SSR `getMemberProfile(slug, viewerToken)` call and derives `publicBadges` before rendering both `MemberProfileHero` and `MemberBadgeChain`; the safest design is to pass that already-loaded array into the hero and filter it locally. [VERIFIED: `frontend/src/app/members/[slug]/page.tsx`] The hero already owns avatar, background, title, one `VerifiedBadge`, status, points, bio and activity in a stable grid with 140/120/100-px avatar breakpoints and a contrast overlay. [VERIFIED: `frontend/src/components/profile/MemberProfileHero.tsx`; `frontend/src/components/profile/profile.module.css`]

The existing special projection classifies `historical_leader`, `all_rounder`, and `verified` as `special`; earned unowned codes become one-item special families and are rendered after Membership by an outer `FocalCarousel`. [VERIFIED: `frontend/src/components/profile/memberBadgeLabels.ts`; `frontend/src/components/profile/MemberBadgeChain.tsx`] Phase 127 must therefore split presentation ownership: header allow-list only Historical Leader/Allrounder; existing Verified remains title status; Founding remains Membership; the collection chain suppresses the `special` group entirely. [VERIFIED: `127-PRD.md` §§4–18, 41–46]

**Primary recommendation:** Extend `MemberProfileHero` with the already-loaded badges, render a small semantic `MemberSpecialAwards` list in `heroCopy`, reuse the existing presentation/artwork resolver, and exclude `special` from `MemberBadgeChain` collection rendering without modifying its other five groups. [VERIFIED: codebase inspection]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| SSR badge availability | Frontend Server (SSR) | API / Backend | Route already receives `public_badges`; no new request is needed. [VERIFIED: page.tsx] |
| Header special filtering/rendering | Browser / Client presentation | Frontend Server (SSR) | Static props produce SSR markup; no client interaction is required. [VERIFIED: PRD §§15–16, 27] |
| Verified ownership | Browser / Client presentation | — | Existing hero status surface renders it once. [VERIFIED: MemberProfileHero.tsx] |
| Founding ownership | Browser / Client presentation | — | Phase-126 MembershipStage owns it. [VERIFIED: dirty MemberBadgeChain.tsx; 126-CONTEXT.md] |
| Badge persistence/contracts | API / Backend | Database / Storage | Explicitly unchanged. [VERIFIED: PRD §§44–46] |

## Project Constraints (from AGENTS.md)

- Work only in `/home/d1sk/team4s`; preserve dirty work and run repository/Docker checks there. [VERIFIED: `AGENTS.md`]
- Planning-only means no application edits. [VERIFIED: `AGENTS.md`]
- Search existing seams first; plans name exact files/functions and avoid parallel logic. [VERIFIED: `AGENTS.md`; `docs/engineering/implementation-contract.md`]
- Use existing UI tokens/patterns; keep diffs scoped and German UI strings correctly umlauted. [VERIFIED: `AGENTS.md`; `docs/frontend/ui-system.md`]
- Run focused tests, typecheck, lint, feasible build and `git diff --check`; document unrelated failures. [VERIFIED: `AGENTS.md`]
- Live UAT must use the visible public route through the shared in-app browser, with Playwright only supporting. [VERIFIED: `AGENTS.md`]

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---|---:|---|---|
| Next.js | repository lockfile | SSR route/component composition | Existing route stack; no dependency change. [VERIFIED: `frontend/package.json`; page.tsx] |
| React | repository lockfile | presentational component/list rendering | Existing component stack. [VERIFIED: `frontend/package.json`] |
| CSS Modules | built in | local hero layout and breakpoints | Current hero uses `profile.module.css`. [VERIFIED: MemberProfileHero.tsx] |
| Vitest + Testing Library | repository lockfile | DOM/SSR/a11y contracts | Existing page/hero/chain tests use this stack. [VERIFIED: test files] |

### Supporting
| Library | Version | Purpose | When to Use |
|---|---:|---|---|
| `ResponsiveImage` | project-local | Historical Leader artwork | Reuse for approved image and responsive sizes. [VERIFIED: existing hero/chain] |
| lucide-react | repository lockfile | Allrounder icon fallback | Existing `Hexagon` presentation already maps Allrounder. [VERIFIED: memberBadgeLabels.ts] |

**Installation:** None. [VERIFIED: phase boundary]

## Architecture Patterns

### System Architecture Diagram

```text
GET /members/[slug]
  -> cached getMemberProfile(slug, viewerToken)
  -> PublicMemberProfileData.public_badges
      -> MemberProfileHero
          -> existing Verified status (is_verified)
          -> allow-list [historical_leader, all_rounder]
          -> compact SSR list (0 / 1 / 2 items)
      -> MemberBadgeChain
          -> roles / projects / points / contributions / membership
          -> special group suppressed
```

### Recommended Project Structure

```text
frontend/src/app/members/[slug]/page.tsx              # pass existing publicBadges
frontend/src/components/profile/MemberProfileHero.tsx # header integration seam
frontend/src/components/profile/MemberSpecialAwards.tsx # optional small local presenter
frontend/src/components/profile/profile.module.css    # compact slot/layout styles
frontend/src/components/profile/MemberBadgeChain.tsx  # suppress old special group
frontend/src/components/profile/memberBadgeLabels.ts  # catalog/order; avoid duplicating map
```

### Pattern 1: Exact allow-list projection

Filter earned badges against `['historical_leader', 'all_rounder']`, then map in catalog order; do not accept every badge currently classified `special`, because `verified` is also in that group. [VERIFIED: memberBadgeLabels.ts]

### Pattern 2: SSR-first noninteractive list

Render `<ul aria-label="Besondere Auszeichnungen">` only when nonempty, with decorative artwork/icon plus visible label; do not add buttons, carousel roles or client state. [CITED: https://www.w3.org/WAI/tutorials/images/decorative/]

### Anti-Patterns to Avoid
- Passing `is_verified` through the special catalog: duplicates Verified. [VERIFIED: current catalog grouping]
- Moving resolver logic into page JSX: duplicates approved-asset ownership. [VERIFIED: implementation contract]
- Filtering all `group === 'special'`: includes Verified and future unapproved specials. [VERIFIED: memberBadgeLabels.ts]
- Editing `FocalCarousel`: Phase 127 removes one consumer; the shared engine is protected. [VERIFIED: PRD §46]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Badge label/icon/palette | second lookup object | `getMemberBadgePresentation` | Existing catalog is authoritative. [VERIFIED: memberBadgeLabels.ts] |
| Historical image URL | raw JSX path | central `resolveBadgeArtwork` seam | Existing approved mapping is `special-historical_leader-v1.png`. [VERIFIED: MemberBadgeChain.tsx; asset tree] |
| Responsive image | raw image transport | `ResponsiveImage` | Existing optimized project seam. [VERIFIED: current components] |
| New carousel/grid engine | gestures/counter/state | compact list/grid | Specials are non-progressive/noninteractive. [VERIFIED: PRD §§15–16] |

## Common Pitfalls

### Pitfall 1: Resolver is file-local
`resolveBadgeArtwork` is currently not exported from `MemberBadgeChain.tsx`; importing it into a new hero child requires a focused extraction/export without changing mappings. [VERIFIED: MemberBadgeChain.tsx] Prefer a small shared profile-local resolver module only if needed by both consumers.

### Pitfall 2: Allrounder has no approved raster asset
Only `special-historical_leader-v1.png` is present and the approved-special map contains only Historical Leader; Allrounder currently resolves to its `Hexagon` icon. [VERIFIED: asset listing; MemberBadgeChain.tsx; memberBadgeLabels.ts] Do not invent a filename.

### Pitfall 3: Old section survives through derived families
Removing JSX for one card is insufficient: `resolveMemberBadgeFamilies` produces one special family per earned unowned code, and collectionGroups includes `special`. [VERIFIED: memberBadgeLabels.ts; MemberBadgeChain.tsx] Suppress the group at collection-group construction/rendering and test absence.

### Pitfall 4: Phase 126 overlap is not committed
`MemberBadgeChain.tsx` and `.module.css` contain substantial unstaged Phase 123–126 changes; Phase-126 summary explicitly says TSX/CSS patches remain unstaged and predecessor-owned anchors prevent clean index reconstruction. [VERIFIED: `git status`; `git diff`; `126-03-SUMMARY.md`] Capture before/after binary patches and per-file hashes, stage only an exact Phase-127 patch if provable, otherwise leave app changes uncommitted.

### Pitfall 5: Predecessor regression truth is not fully green
Phase 125 remains unapproved with screenshot/device/lint/build/full-suite gaps; Phase 126 approval accepted missing screenshots and known predecessor failures. [VERIFIED: `125-03-SUMMARY.md`; `126-03-SUMMARY.md`] Plans must distinguish Phase-127 regressions from inherited failures and must not claim those phases complete.

## Code Examples

```tsx
// Project pattern, based on existing SSR data flow.
const HEADER_SPECIAL_CODES = ['historical_leader', 'all_rounder'] as const
const earned = HEADER_SPECIAL_CODES.flatMap((code) =>
  publicBadges.some((badge) => badge.badge_code === code) ? [code] : [],
)
return earned.length ? <ul aria-label="Besondere Auszeichnungen">…</ul> : null
```

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---:|---|---|
| SSH canonical repo | all planning | ✓ | host `team4s-linux` | — |
| Docker Compose frontend | later validation | ✓ running at preflight | repository image | no direct Ubuntu install |
| Node/GSD host install | GSD tooling | intentionally not required | — | `./scripts/gsd-linux.sh` |
| In-app browser tunnel | live UAT | runtime-dependent | `127.0.0.1:3300` | stop at checkpoint; do not fabricate evidence |

## Validation Architecture

### Test Framework
| Property | Value |
|---|---|
| Framework | Vitest + Testing Library [VERIFIED: repository tests] |
| Config file | `frontend/vitest.config.ts` |
| Quick run command | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/MemberProfileHero.test.tsx src/app/members/[slug]/page.test.tsx src/components/profile/MemberBadgeChain.test.tsx` |
| Full suite command | `docker compose exec -T team4sv30-frontend npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| D-19–D-21 | no/one/both specials | component | focused hero/page tests | ❌ Wave 0 |
| D-04/D-18 | Verified exactly once | integration | page test | ✅ extend |
| D-06/D-35 | Founding Membership-only | integration | page + chain tests | ✅ extend |
| D-30 | accessible list/images/order | component | hero test | ❌ Wave 0 |
| D-37 | responsive CSS/overflow contracts | source/component | hero test | ✅ extend |
| D-41–D-43 | old special absent; Phase121–126 stable | regression | focused + full suite | ✅ extend |

### Sampling Rate
- **Per task commit:** focused hero/page/chain tests.
- **Per wave merge:** typecheck, lint and full tests.
- **Phase gate:** feasible build, `git diff --check`, live UAT/evidence and explicit approval.

### Wave 0 Gaps
- Add exact no/one/both and allow-list tests to `MemberProfileHero.test.tsx` and/or `page.test.tsx`.
- Add old-special-group absence and five unaffected-group assertions to `MemberBadgeChain.test.tsx`.
- Record inherited baseline failures before implementation.

## Security Domain

This phase has no auth, API, input, persistence or cryptographic change. [VERIFIED: PRD §§44–46] V5 input validation remains not applicable because no input is introduced; the security regression is that public visibility and SSR request behavior remain unchanged. [VERIFIED: page.tsx]

## State of the Art

| Old Approach | Current Approach | Impact |
|---|---|---|
| Separate one-item special FocalCarousel families | compact earned-only header list | removes inappropriate carousel/progression semantics. [VERIFIED: PRD] |
| `special` group also contains Verified | explicit header allow-list | prevents duplicate status rendering. [VERIFIED: catalog] |

## Assumptions Log

All implementation claims were verified from repository files or the locked PRD; no `[ASSUMED]` claims are used.

## Open Questions

1. **Where should the shared artwork resolver live? — RESOLVED.** Keep the mapping unchanged and extract the smallest profile-local reusable resolver only if the hero and chain both consume it; otherwise pass resolved presentation data from the existing owner. [VERIFIED: implementation contract]
2. **Does Allrounder have artwork? — RESOLVED.** No approved raster is present; use the existing Hexagon icon fallback in the normalized slot. [VERIFIED: asset tree/catalog]
3. **Can the old special family generation remain? — RESOLVED.** Yes internally if useful, but `MemberBadgeChain` must not include/render the `special` collection group; avoid broad resolver refactoring. [VERIFIED: minimal-diff rule]
4. **Are backend/API/DB/fetch/FocalCarousel changes needed? — RESOLVED.** No; explicitly forbidden and unnecessary because data already exists on the SSR payload. [VERIFIED: PRD; page.tsx]

## Sources

### Primary (HIGH confidence)
- `127-PRD.md`, `127-CONTEXT.md`
- `frontend/src/app/members/[slug]/page.tsx`
- `frontend/src/components/profile/MemberProfileHero.tsx`, `profile.module.css`
- `frontend/src/components/profile/MemberBadgeChain.tsx`, `memberBadgeLabels.ts`
- Phase 121–126 planning/UAT/summary artifacts
- `AGENTS.md`, Team4s implementation/UI docs

### Secondary (MEDIUM confidence)
- WAI decorative image tutorial: https://www.w3.org/WAI/tutorials/images/decorative/

## Metadata

**Confidence breakdown:** Standard stack HIGH; architecture HIGH; pitfalls HIGH — all derived from current canonical source and dirty diff.
**Research date:** 2026-08-11
**Valid until:** 2026-08-18 because the overlapping frontend worktree is actively changing.
