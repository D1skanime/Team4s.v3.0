# Phase 151: Erfolgsbadge-/Karussell-Konsolidierung — Research

**Researched:** 2026-09-07

**Baseline:** `main` at `052858dc48576024518c5c527ae82c9d2027ac7b`

**Scope:** Research and implementation guidance only; no product, test, runtime, schema, or configuration changes

## User Constraints (from CONTEXT.md)

### Locked decisions

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

### Discretion

Exact bounded slot geometry, CSS structure and small shared presentation primitives follow evidence from the current code, the approved existing visual language and live verification. No new product/domain decisions.

### Deferred ideas

None recorded.

## Project Constraints (from AGENTS.md)

- All repository/Git/dependency/build/test/Docker work runs in `/home/d1sk/team4s`; application services stay in Docker Compose, GSD runs through `./scripts/gsd-linux.sh`, and live `.env`, `media/`, volumes, and database contents are not overwritten. [VERIFIED: `AGENTS.md:9-20`]
- Existing user/concurrent changes must be preserved, diffs kept scoped, and unrelated formatting or refactors avoided. [VERIFIED: `AGENTS.md:210-216`; user assignment]
- Search existing components/helpers/services/contracts first, reuse the fitting ownership seam, and document why any near-equivalent cannot be reused. [VERIFIED: `AGENTS.md:85-93`; `docs/engineering/implementation-contract.md:23-63`]
- Any API behavior change must update canonical OpenAPI/frontend/backend contracts together; Phase 151 should avoid an API change because current DTOs already contain badges, progress stages, and the role catalog. [VERIFIED: `AGENTS.md:95-104`; `frontend/src/types/profile.ts:148-176,299-305`]
- Reusable cards/stages/carousels use mobile-first container queries, `min-width: 0`, bounded media, local overflow ownership, and intentional verification at 390×844, 768×1024, and 1440×900 plus the phase's additional viewport classes. [VERIFIED: `AGENTS.md:134-164`; `docs/frontend/ui-system.md:16-48`]
- A non-trivial UI change requires a precise UI contract/prototype as appropriate and live responsive comparison; tests/build alone do not complete the phase. [VERIFIED: `AGENTS.md:134-158,203-208`]
- User-facing German strings require correct umlauts; no ASCII replacements are allowed. [VERIFIED: `AGENTS.md:166-170`]
- Relevant typecheck, lint, tests, feasible build, and `git diff --check` must run; pre-existing unrelated failures are reported separately. [VERIFIED: `AGENTS.md:210-227`]
- This research assignment authorizes only `151-RESEARCH.md` and `151-PATTERNS.md`; it overrides the later implementation/commit steps for this agent. [VERIFIED: user assignment; `AGENTS.md:33-45`]

## Executive Summary

1. The live achievement surface is one 959-line client component with five distinct stage compositions and twelve CSS modules; artwork geometry is therefore distributed, not centrally owned. [VERIFIED: `frontend/src/components/profile/MemberBadgeChain.tsx:1-39,429-638,640-959`]
2. Role artwork alone has four competing `max-width: 520px` blocks and desktop rules that grow from 320 to 360, 410, and 450 px; the role carousel width is also assigned twice at base scope and then expanded at three wide breakpoints. [VERIFIED: `frontend/src/components/profile/RoleBadgeCard.module.css:72-89,186-229,232-330`; `frontend/src/components/profile/MemberBadgeChain.module.css:134-170,305-308,391-405`]
3. Current hero-art maxima differ materially by family: role 450 px, points 560 px, membership 520 px, progress about 340 px, and contribution 300 px before outer-card overrides. Every current art wrapper already uses `object-fit: contain`, so source quality can be preserved while consolidating only layout geometry. [VERIFIED: `frontend/src/components/profile/RoleBadgeCard.module.css:78-96,320-329`; `frontend/src/components/profile/PointsAchievementStage.module.css:5-6`; `frontend/src/components/profile/MembershipStage.module.css:5-6`; `frontend/src/components/profile/AnimeProjectStage.module.css:3-6`; `frontend/src/components/profile/ContributionAchievementStage.module.css:3-6`]
4. The 107 shipped PNGs occupy 142 MiB and are predominantly high-resolution: 81 are 1254×1254, 12 are 627×627, three are 1024×1024, one is 1024×1536, one is 512×512, and nine legacy files are 418×418. The implementation should not rewrite these files. [VERIFIED: filesystem inventory under `frontend/public/member-achievement-badges/` using `file`, `find`, and `du` on 2026-09-07]
5. Karaoke-FX is already catalog-backed (`anime_contribution`, sort 45, `icon_key=image`) and the backend generically emits its badge codes; only the presentation asset gate is missing because `badgeArtwork.ts` currently trusts one `user` icon-key bucket containing 11 role entries and explicitly returns no Karaoke art. [VERIFIED: `database/migrations/0146_capability_policy_catalog.up.sql:107-130`; `database/migrations/0149_role_catalog_palette_correction.up.sql:5-16`; `frontend/src/components/profile/badgeArtwork.ts:12-30,41-67`; `backend/internal/repository/member_profile_role_volume_repository_test.go:237-245`]
6. The shared `FocalCarousel` has a coherent 210 ms adjacent-card animation, disables CSS snap during that animation, settles free scroll after 120 ms, preserves vertical wheel/touch intent, and supports keyboard/reduced motion. The old `FamilyCollectionCard` implements a second 140 ms scroll/settle/wheel engine, but it is unreachable in the current render graph and should be removed rather than repaired. [VERIFIED: `frontend/src/components/ui/FocalCarousel.tsx:22,165-236,242-354`; `frontend/src/components/ui/FocalCarousel.module.css:20-42,93-120,193-202`; `frontend/src/components/profile/MemberBadgeChain.tsx:184-319,683-697,916-952`]
7. A public profile load is constant at 20 SQL statements and is not badge-card-dependent. Role counts are queried twice and all three contribution aggregates are queried twice, but the Phase-151 UI contract explicitly preserves this backend/query baseline; record the repetition as a deferred optimization seam, not a Phase-151 code task. [VERIFIED: `backend/internal/repository/member_profile_public_repository.go:116-168`; `backend/internal/repository/member_profile_role_volume_repository.go:31-60,117-138`; `backend/internal/repository/member_profile_progress_repository.go:64-150`; `backend/internal/repository/member_profile_contribution_badges_repository.go:63-215`; `backend/internal/repository/member_profile_query_budget_test.go:158-212`; `.planning/phases/151-erfolgsbadge-karussell-konsolidierung/151-UI-SPEC.md:9-20`]
8. Playwright 1.55.0 and Chromium are installed in the running frontend container, but there is no Playwright test-runner configuration or pixel-baseline suite. Existing scripts already provide screenshot, DOM geometry, overflow, optimized-image, keyboard, and reduced-motion patterns; Phase 151 should extend those patterns with a deterministic badge gallery and manual image-by-image sign-off instead of inventing fragile golden-pixel assertions. [VERIFIED: `frontend/package.json:32-45`; `frontend/scripts/capture-phase134-uat-evidence.mjs:1-32,85-205`; `frontend/scripts/collect-member-profile-evidence.mjs:140-235`; live container probe on 2026-09-07]

A concurrent baseline source audit has already inspected all 107 PNGs in 208 px contain contact sheets. It reports the selected assets as sharp, several superseded unversioned contribution revisions as containing edge fragments, and the historical portrait as having greater transparent padding; that audit is source-only and explicitly leaves composed card/carousel acceptance pending. [VERIFIED: `.planning/phases/151-erfolgsbadge-karussell-konsolidierung/151-SOURCE-ARTWORK-REVIEW.md:1-12`]

## Current Architecture

### Public data and render flow

```text
role_definitions ── GET /api/v1/role-definitions?context=anime_contribution
       │                         │
       │                         └─ RootLayout → RoleCatalogProvider
       │                                           │
release_role_credit_lifecycles ─ loadRoleVolumeCounts ─┐
member_badges ────────────────── loadPublicBadges       ├─ PublicMemberProfile
contribution/media/note tables ─ contribution counts   │  public_badges + badge_progress
backend/internal/badges ──────── threshold stages ─────┘
                                                        │
MemberProfileContent → MemberBadgeChain → FocalCarousel/stages
                                      └→ badgeArtwork resolver → ResponsiveImage
```

The root layout loads the three public catalog contexts once in parallel and merges them into one provider; `MemberBadgeChain` reads the `anime_contribution` slice without a card-level request. [VERIFIED: `frontend/src/app/layout.tsx:22-48`; `frontend/src/providers/RoleCatalogProvider.tsx:22-69`; `frontend/src/components/profile/MemberBadgeChain.tsx:640-668`]

The public profile passes a defined `badge_progress` array on every response, so collection mode is the live path. In that mode the legacy Special collection is intentionally suppressed; historical awards are rendered compactly in the profile hero instead. [VERIFIED: `frontend/src/types/profile.ts:285-305`; `frontend/src/app/members/[slug]/MemberProfileContent.tsx:140-147`; `frontend/src/components/profile/MemberBadgeChain.tsx:683-697`; `frontend/src/components/profile/MemberBadgeChain.test.tsx:1306-1326`; `frontend/src/components/profile/MemberProfileHero.tsx:27,108-111,248-263`]

### Component and ownership inventory

| Current seam | Responsibility | Finding | Evidence |
|---|---|---|---|
| `MemberBadgeChain.tsx` | Catalog merge, grouping, stage rendering, carousel composition, role cards, five local stage components | Monolithic orchestration and presentation; repeated image JSX and local state make geometry hard to govern | [VERIFIED: `frontend/src/components/profile/MemberBadgeChain.tsx:76-181,184-638,640-959`] |
| `badgeArtwork.ts` | Badge-code → approved public asset path | Correct ownership for presentation assets, but icon-key gating and filename repetition obscure the actual role-art contract | [VERIFIED: `frontend/src/components/profile/badgeArtwork.ts:1-67`] |
| `memberBadgeLabels.ts` | Labels, palettes, presentation groups, dynamic role badge fallback | Presentation-only; dynamic `role_entry_*` and `role_volume_*` support already avoids a valid-role business list | [VERIFIED: `frontend/src/components/profile/memberBadgeLabels.ts:63-122,136-196`] |
| `memberBadgeFamilies.ts` | Maps server `badge_progress[].stages` to UI families | Correctly consumes server thresholds; owns order/labels only and prevents a stage code from being claimed twice | [VERIFIED: `frontend/src/components/profile/memberBadgeFamilies.ts:47-109,148-228,252-361`] |
| `FocalCarousel.tsx` | Generic carousel interaction, accessibility, expanded grid | Reusable canonical engine; full-mount behavior is intentional and protected by tests | [VERIFIED: `frontend/src/components/ui/FocalCarousel.tsx:32-54,79-138,363-523`; `frontend/src/components/ui/FocalCarousel.test.tsx:754-792`] |
| `ResponsiveImage.tsx` + `next.config.mjs` | Optimized image delivery with same-URL unoptimized retry | Existing delivery seam already allows the complete badge namespace and WebP output | [VERIFIED: `frontend/src/components/ui/ResponsiveImage.tsx:6-29`; `frontend/next.config.mjs:21-30,59-61`] |
| `AchievementBadgesCard.tsx` | Own-profile visibility management | Separate management surface, not an artwork/carousel analog; do not merge its ownership into the public stage | [VERIFIED: `frontend/src/components/profile/AchievementBadgesCard.tsx:1-88`] |

### Badge families and current special handling

| Family | Current live composition | Hero/source path | Special logic | Evidence |
|---|---|---|---|---|
| Roles | Outer `FocalCarousel`, one role card per earned catalog role, five textual stages | Direct entry or layered motif+rank frame; Timer volume uses complete direct PNGs | Role code/order from catalog; thresholds from `badge_progress`; Timer is an explicit art-strategy exception | [VERIFIED: `MemberBadgeChain.tsx:645-682,724-818`; `badgeArtwork.ts:51-67`] |
| Progress | One `AnimeProjectAchievementStage`, no outer carousel | Layered progress motif+frame | `first_contribution` uses its own motif geometry | [VERIFIED: `MemberBadgeChain.tsx:429-497,919-920`; `MemberBadgeChain.module.css:411-416`] |
| Points | One `PointsAchievementStage`, native horizontal tier list | Versioned complete PNG | Six-column inner list can scroll; no outer carousel | [VERIFIED: `MemberBadgeChain.tsx:601-638,921-922`; `PointsAchievementStage.module.css:14-30`] |
| Contributions | One outer `FocalCarousel` across three families; three-tier grid inside each card | Approved versioned complete PNGs | Inactive outer slides hide copy and render art at 144 px | [VERIFIED: `MemberBadgeChain.tsx:500-547,931-950`; `MemberBadgeChain.module.css:421-432`] |
| Membership | One `MembershipStage`, no outer carousel | Approved versioned complete PNGs | Founding award is an independent panel | [VERIFIED: `MemberBadgeChain.tsx:548-600,923-924`; `MembershipStage.module.css:16-40`] |
| Special/historical | Suppressed from live chain; compact profile-hero pill | One portrait 1024×1536 historical seal plus icon fallbacks | Separate hero placement is deliberate regression-tested behavior | [VERIFIED: `MemberBadgeChain.test.tsx:1306-1326`; `MemberProfileHero.tsx:248-263`; filesystem `special-historical_leader-v1.png`] |

## CSS and Geometry Findings

### Overlapping rules that currently win by cascade

| Target | Competing rules | Effective risk | Evidence |
|---|---|---|---|
| Role hero, ≤520 px | 248 px; then `clamp(204px,58vw,230px)`; then `min(248px,76vw)`; finally `min(232px,72vw)` | Four same-range blocks make the last declaration silently authoritative | [VERIFIED: `RoleBadgeCard.module.css:197-219,232-268`] |
| Role hero, wide | 320 px base; 360 at 1440; 410 at 1600; 450 at 2100 | Directly contradicts the Phase-151 wide-screen cap | [VERIFIED: `RoleBadgeCard.module.css:78-89,270-330`] |
| Role card columns | One 1440 layout is overwritten by a later 1440 layout; likewise at 1600 | Duplicate geometry is maintained by source order rather than one contract | [VERIFIED: `RoleBadgeCard.module.css:270-318,332-348`] |
| Role carousel item width | `min(68%,680px)` then later `min(60%,720px)` at base; 76/78/80% on wide screens; two ≤520 overrides end at `min(98%,340px)` | Card viewport and art size grow independently and obscure optical comparisons | [VERIFIED: `MemberBadgeChain.module.css:168-170,236-244,305-308,391-405`] |
| Generic image/card | `BadgeChip` declares 320/178–205/240 while `MemberBadgeChain` applies family-specific 310–380/210–240/310 overrides with compound selectors | Same element can receive declarations from two modules | [VERIFIED: `BadgeChip.module.css:131-197`; `MemberBadgeChain.module.css:185-207,246-287`] |
| Shared `sizes` hint | All hero images advertise 248/280/320 even when CSS renders 144, 200, 220, 280, 360, 410, 450, 520, or 560 px | Optimizer selection can be smaller or larger than the actual layout slot | [VERIFIED: `MemberBadgeChain.tsx:71-74,345-349,774-778,862-890`; stage CSS cited above] |

The profile carousel shell already establishes `container: member-badge-carousel / inline-size`, and the generic carousel also establishes its own named inline-size container. The consolidation should therefore use container queries for the embedded artwork/stage rather than adding more viewport media queries. [VERIFIED: `MemberBadgeChain.module.css:21-26`; `FocalCarousel.module.css:1-6`; `docs/frontend/ui-system.md:20-43`]

### Recommended shared visual contract

[RECOMMENDATION] Add a domain-specific `AchievementArtwork`/`AchievementArtworkSlot` under `frontend/src/components/profile`, not a generic component under `components/ui`. It should be the only owner of primary achievement-art geometry and should reuse `ResponsiveImage` and the existing layered CSS primitives.

[RECOMMENDATION] Use two presentation sizes only: `hero` for the primary/current art and `stage` for compact tier markers. A square reserved slot with `object-fit: contain` also safely contains the 1024×1536 historical portrait; no family-specific width is required.

[RECOMMENDATION] Implement the locked container geometry exactly: 192 px hero/64 px marker below 560 px available width, 216 px hero/80 px marker from 560 through 655 px, and 240 px hero/80 px marker from 656 px upward. Use the named `slot-with-copy` and `slot-roomy` transitions and never exceed 240 px. [VERIFIED: `.planning/phases/151-erfolgsbadge-karussell-konsolidierung/151-UI-SPEC.md:34-64`]

[RECOMMENDATION] Drive the `sizes` attribute from the same slot contract. Do not retain the current universal 248/280/320 string once CSS uses a smaller cap.

[RECOMMENDATION] Keep the locked 8 px optical padding inside the common slot; do not alter source resolution and do not scale or translate active cards/artwork. Active emphasis is limited to border, opacity/filter, and existing focus treatment so active and inactive outer geometry remains identical. [VERIFIED: `.planning/phases/151-erfolgsbadge-karussell-konsolidierung/151-UI-SPEC.md:34-75`]

## Artwork Resolver and Karaoke-FX

The current resolver has four independent complete-art maps plus an 11-entry role map. Role volume resolves a role entry first, then either loads a Timer complete image or constructs a motif/frame pair. [VERIFIED: `frontend/src/components/profile/badgeArtwork.ts:1-67`]

There are currently 11 role entry files, 11 role motifs, and 44 role rank frames; no filename containing `karaoke` exists. Normal layered Karaoke coverage therefore requires six new files: one entry, one motif, and four rank frames. [VERIFIED: filesystem inventory under `frontend/public/member-achievement-badges/` on 2026-09-07]

The correct resolver boundary is role-code artwork support, not catalog `icon_key`. `icon_key` is a bounded generic icon presentation value and Karaoke's valid value is `image`; treating it as an artwork-family selector is why the current `user` bucket excludes an otherwise valid role. [VERIFIED: `frontend/src/lib/roleCatalog.ts:28-30,54-58`; `database/migrations/0146_capability_policy_catalog.up.sql:116-122`; `badgeArtwork.ts:26-30,51-62`]

[RECOMMENDATION] Replace `ROLE_ARTWORK_BY_ICON_KEY` with one explicit presentation-only role artwork manifest keyed by role code, for example `{ admin: { strategy: 'layered' }, timer: { strategy: 'direct-volume' }, karaoke_fx: { strategy: 'layered' } }`. Construct entry/motif/frame filenames from the existing convention only after a role is present in that manifest. This is an asset allow-list, not a role/business registry: the database catalog still determines whether a role exists and the server still determines its stages.

[RECOMMENDATION] Export a pure `validateRoleArtworkCoverage(catalogRows)` helper for tests/tooling. It should require every non-reserved `anime_contribution` catalog role to be either present in the artwork manifest or in an explicit presentation-only exception set. The exception set should initially be empty for the 12 required roles.

[RECOMMENDATION] Add filesystem-backed tests that verify every manifest-derived direct path exists and that every layered role has Entry + motif + all four frames. Do not use runtime “try this URL and see whether it 404s” discovery.

[RECOMMENDATION] Preserve Timer as the sole current direct-volume art strategy; Karaoke follows the normal layered strategy and therefore needs no Karaoke branch in JSX or resolver control flow.

## Carousel, Nested Tracks, and Re-render Analysis

### Canonical interaction behavior to preserve

- `focusItem` updates the active index immediately, animates only adjacent moves for 210 ms, and performs non-adjacent/reduced-motion moves immediately. [VERIFIED: `FocalCarousel.tsx:165-215`]
- Programmatic animation applies a class that disables mandatory snap, so CSS snap and JavaScript do not compete during that movement. [VERIFIED: `FocalCarousel.tsx:175-214`; `FocalCarousel.module.css:32-42`]
- Free scroll/wheel settling uses 120 ms and chooses the nearest element from live geometry; vertical-dominant wheel and pointer gestures remain page-owned. [VERIFIED: `FocalCarousel.tsx:217-236,254-354`]
- Inactive slides remain mounted but receive `inert`; expanded mode also renders the full item set. [VERIFIED: `FocalCarousel.tsx:366-400,441-484`]

### Nested-track finding

`FamilyCollectionCard` owns a second `ResizeObserver`, media-query listener, 140 ms scroll timer, smooth `scrollTo`, and vertical-to-horizontal wheel conversion. [VERIFIED: `MemberBadgeChain.tsx:184-319`]

No live state reaches that component: without `badgeProgress`, `collectionGroups` is empty; with `badgeProgress`, progress/points/membership use dedicated branches, contributions use `ContributionAchievementStage`, and special is filtered out. [VERIFIED: `MemberBadgeChain.tsx:683-697,916-952`]

The CSS-source tests at `MemberBadgeChain.test.tsx:1330-1439` still describe this old inner engine; the only centering behavior test is skipped, and the live Anime-project list used by the wheel test has no `data-badge-stage-strip` listener. [VERIFIED: `MemberBadgeChain.test.tsx:1330-1439`; `MemberBadgeChain.tsx:375` is the only `data-badge-stage-strip` render site]

[RECOMMENDATION] Delete `FamilyCollectionCard` and its exclusive `BadgeFamilyCard.module.css` rules/tests. Do not transfer its wheel conversion or settle timer into current stages. Points may retain native horizontal overflow because it is not nested in an outer carousel.

### Re-render finding

Every active-index state update remaps every visible carousel item and invokes `renderItem`; all role cards stay mounted by contract. [VERIFIED: `FocalCarousel.tsx:79-101,441-484`]

The three single-family stages and each contribution stage carry keys derived from current count/current stage, forcing a full component remount when progress data changes. A test currently uses that remount to reset temporary preview selection. [VERIFIED: `MemberBadgeChain.tsx:919-950`; `MemberBadgeChain.test.tsx:1277-1295`]

The non-role fallback repeatedly calls `earnedBadges.find(...)` inside the item map, producing an avoidable in-memory O(catalog items × earned badges) lookup; it does not cause API or SQL requests. [VERIFIED: `MemberBadgeChain.tsx:823-840`]

[RECOMMENDATION] Extract memoizable `RoleAchievementCard` and stage components from the monolith. A memoized card lets unchanged inactive cards skip their subtree update while preserving full DOM mount and `inert` behavior.

[RECOMMENDATION] Replace remount keys with an explicit preview-reset effect keyed by the server metric/current badge. This preserves the tested reset semantics without reconstructing the full component tree.

[RECOMMENDATION] Build one `Map<badge_code, PublicMemberBadge>` beside `earnedCodes` and reuse it in item rendering. This is a CPU/clarity improvement only; do not describe it as an N+1 database fix.

## Phase-150 Threshold and Deduplication Contract

`backend/internal/badges/thresholds.go` is the one Go authority for RoleVolume, Points, Progress, three Contribution families, and Membership, with reusable `CurrentTier`, `NextTier`, and `Remaining` methods. [VERIFIED: `backend/internal/badges/thresholds.go:1-151`]

The frontend family resolver consumes `badge_progress[].stages`; it does not own numeric tier thresholds. Role code strings (`entry`, `bronze`, `silver`, `gold`, `platinum`) are presentation vocabulary, not threshold numbers. [VERIFIED: `frontend/src/types/profile.ts:159-176`; `frontend/src/components/profile/memberBadgeFamilies.ts:148-188,252-263`; `MemberBadgeChain.tsx:673-682`]

Phase 150 removed the duplicate progress-less role-entry emission from `loadPublicBadges`; `loadRoleVolumeBadges` is the sole synthetic role source and intentionally emits distinct Entry plus current Volume codes when above Entry. [VERIFIED: `member_profile_public_repository.go:172-208`; `member_profile_role_volume_repository.go:110-138`; `member_profile_public_repository_postgres_test.go:326-391`]

Frontend deduplication has three separate safeguards: catalog merge uses a `Set`, role rows use a `Map` keyed by role code, and family resolution uses an owned-code `Set`. [VERIFIED: `MemberBadgeChain.tsx:133-181,646-682`; `memberBadgeFamilies.ts:276-357`]

One obsolete default literal remains in `roleVolumeProgressBadge`: `nextThreshold := int64(12)` is always overwritten by `badges.RoleVolume.NextTier` or the terminal registry value. [VERIFIED: `member_profile_role_volume_repository.go:68-86`]

[RECOMMENDATION] Record the inert `12` for a later backend cleanup; do not change it in Phase 151 because the locked UI contract requires no backend source/query modification. It does not create a second effective threshold path because every branch overwrites it from the registry. [VERIFIED: `.planning/phases/151-erfolgsbadge-karussell-konsolidierung/151-UI-SPEC.md:9-20`]

## API and SQL Query Paths

### Current fixed 20-query profile load

| Segment | Statements | Notes | Evidence |
|---|---:|---|---|
| Base profile, memberships, persisted badges | 3 | Set-based reads | [VERIFIED: `member_profile_public_repository.go:47-121`] |
| Role-volume badges | 1 | One `GROUP BY role_code`, not per role | [VERIFIED: `member_profile_role_volume_repository.go:35-60,117-138`] |
| Contribution badges | 3 | Project coverage, published notes, approved media | [VERIFIED: `member_profile_contribution_badges_repository.go:68-148,158-215`] |
| Total points | 1 | Reads trigger-maintained total | [VERIFIED: `member_profile_public_repository.go:211-229`] |
| Badge progress | 6 | Project count + the same 3 contribution aggregates + membership + the same role aggregate | [VERIFIED: `member_profile_progress_repository.go:64-150`] |
| Current projects + batched versions | 2 | Set-based post-Phase-131 path | [VERIFIED: `member_profile_query_budget_test.go:158-175`] |
| Current-project count, Known For, latest, previous | 4 | Fixed tail | [VERIFIED: `member_profile_public_repository.go:143-168`] |
| **Total** | **20** | Constant for 2 versus 6 projects in the guarded integration test | [VERIFIED: `member_profile_query_budget_test.go:176-212`] |

There is no frontend badge-card fetch: public badges/progress arrive in the profile DTO, and the role catalog is loaded at root-layout scope. Increasing the number of badge cards therefore affects render/image work, not SQL statement count. [VERIFIED: `MemberProfileContent.tsx:140-147`; `layout.tsx:30-48`; `MemberBadgeChain.tsx:640-697`]

[RECOMMENDATION] Keep the backend repository implementations and the Go-enforced constant at 20 unchanged in Phase 151. Run the existing query-budget test before/after UI work to prove no growth with project, role, or badge count. [VERIFIED: `.planning/phases/151-erfolgsbadge-karussell-konsolidierung/151-UI-SPEC.md:9-20`; `.planning/phases/151-erfolgsbadge-karussell-konsolidierung/151-VALIDATION.md:14-27`]

[RECOMMENDATION] Correct only the active collector's stale query metadata from 19 to the current Go-enforced 20 if that collector is touched for Phase-151 evidence. Do not rewrite the historical Phase-131 `evidence/BUDGETS.md`. [VERIFIED: `member_profile_query_budget_test.go:165-168`; `frontend/scripts/collect-member-profile-evidence.mjs:727-734,917-923`; `.planning/phases/131-set-based-delivery-pagination-performance-budgets/evidence/BUDGETS.md:72`]

No endpoint, DTO, OpenAPI contract, auth seam, or database migration is required for this reuse. [RECOMMENDATION]

## Test and Linux Visual Infrastructure

### Existing automated coverage

- `badgeArtwork.test.ts` is one source-mapping test and currently asserts Karaoke has no art; it does not inspect filesystem completeness. [VERIFIED: `frontend/src/components/profile/badgeArtwork.test.ts:1-36`]
- `MemberBadgeChain.test.tsx` has 111 passing tests and one skipped test; its role-art matrix hard-codes 11 roles and its source assertions lock the obsolete 248/280/320 geometry. [VERIFIED: `MemberBadgeChain.test.tsx:1095-1101,1360-1418,1436-1459,1557-1635`; focused Vitest run on 2026-09-07]
- `FocalCarousel.test.tsx` covers buttons, keyboard, inert slides, drag, free scroll, endpoints, horizontal versus vertical wheel, rapid retargeting, reduced motion, full mount, responsive CSS, and axe. [VERIFIED: `frontend/src/components/ui/FocalCarousel.test.tsx:71-822`]
- Backend registry tests cover every family boundary, and repository tests cover generic Karaoke code generation plus Phase-150 single role-entry emission. [VERIFIED: `backend/internal/badges/thresholds_test.go:1-236`; `member_profile_role_volume_repository_test.go:219-245`; `member_profile_public_repository_postgres_test.go:326-391`]
- The concurrent full baseline run passed 291 frontend test files and 2225 tests, while baseline typecheck has one known generated `.next/dev/types` error and lint has 13 errors/332 warnings outside badge/carousel scope. [VERIFIED: `.planning/phases/151-erfolgsbadge-karussell-konsolidierung/151-BASELINE-CHECKS.md:1-12`]

### Current infrastructure gaps

- There is no `playwright.config.*` or checked-in pixel-baseline directory. Playwright is used through Node scripts, not `@playwright/test` screenshot assertions. [VERIFIED: repo file inventory; `frontend/package.json:32-45`]
- `capture-phase134-uat-evidence.mjs` has the correct Compose-container pattern and exact 390×844, 768×1024, 1440×900 viewports, but not the full Phase-151 six-class matrix. [VERIFIED: `frontend/scripts/capture-phase134-uat-evidence.mjs:1-32,175-205`]
- `capture-responsive.cjs` adds 1024 landscape and 1920 wide capture but hard-codes a Docker bridge URL and only targets two headings on one profile. [VERIFIED: `frontend/capture-responsive.cjs:1-29`]
- `collect-member-profile-evidence.mjs` already captures image `currentSrc`, optimizer width, CSS rectangle, page overflow, reduced motion, and performance metrics, but its `data-badge-stage-strip` exercise targets the now-unreachable legacy strip and its query metadata is stale. [VERIFIED: `frontend/scripts/collect-member-profile-evidence.mjs:140-235,727-734`]
- The existing `/dev/ui-system` route is explicitly intended for non-API visual/component/composition review and already hosts domain showcase modules. [VERIFIED: `docs/frontend/ui-system.md:198-217`; `frontend/src/app/dev/ui-system/page.tsx:92-139`; `frontend/src/app/dev/ui-system/showcase/PublicReleaseSurfacesShowcase.tsx:205`]

[RECOMMENDATION] Add an `AchievementBadgeShowcase` module to the existing dev playground. It should render the production artwork component against deterministic mock server shapes, derive role order from a nested mock `RoleCatalogProvider`, and expose every role × Entry/Bronze/Silber/Gold/Platin plus every non-role art path. It must not contain numeric threshold truth or make its own API call.

[RECOMMENDATION] Add a Phase-151 plain-Playwright collector patterned on the Phase-134 script, with at least 320×568, 520×900, 768×1024, 1024×768, 1440×900, and 1920×1080; optionally add 2560×1440 for the explicit upper wide bound. Save full-page and per-badge crops plus a JSON manifest recording code, title, natural dimensions, rendered rectangle, clipping/overflow, active state, `currentSrc`, optimized width, and screenshot path.

[RECOMMENDATION] Make the collector fail on missing images, duplicate codes, non-positive geometry, horizontal document overflow, rendered hero dimensions above the UI-spec cap, clipped artwork, or a neighboring primary slot larger than the active slot. Treat subjective centering, optical padding, sharpness, and relative visual weight as the mandatory manual sign-off columns.

## Validation Architecture

### Layer 1 — fast structural/unit gates

| Requirements | Contract | Test seam | Required assertion |
|---|---|---|---|
| P151-02 | No business-registry duplication | Existing backend threshold tests + frontend source/behavior tests | All numeric stages come from `badge_progress[].stages`; no frontend threshold array appears |
| P151-06/07 | Artwork coverage | `badgeArtwork.test.ts` plus manifest filesystem check | Every supported role has Entry + normal volume strategy files or an explicit exception; Karaoke resolves all five badge codes |
| P151-02/09 | Deduplication | Existing member family/chain tests | Badge code unique in merged catalog; one role row per role; Phase-150 entry badge exactly once |
| P151-03/04 | Stable slot | New slot component test and CSS contract | One hero-size owner; no family CSS writes primary artwork width/height; `object-fit: contain`; correct `sizes` |
| P151-05/09 | Carousel logic | Existing `FocalCarousel.test.tsx` | Active/inert, animation, free scroll, keyboard, pointer, horizontal wheel, reduced motion remain green |
| P151-05/09 | Render containment | Focused render-count test | Unchanged memoized cards do not rerender on one-step navigation; all remain mounted |

### Layer 2 — backend integration and query budget

Use the guarded dedicated Postgres tests; they refuse the live `team4s_v2` database by name. The Phase-131 and Phase-150 tests currently skip because their dedicated DSN variables are absent in the running backend container. [VERIFIED: `member_profile_query_budget_test.go:38-79`; `member_profile_public_repository_postgres_test.go:254-285`; research test run on 2026-09-07]

P151-08/10 proof is preservation: same public badge/progress payload behavior, one Karaoke role entry, and the existing constant 20-query result for few/many projects. [RECOMMENDATION]

### Layer 3 — browser structural evidence

For P151-04/05/09/11, run the production composition/gallery in Chromium at every required viewport, normal and reduced motion. Record no page overflow, slot dimensions, image load success, active-versus-neighbor geometry, focus visibility, keyboard navigation, touch/pointer drag, horizontal trackpad behavior, vertical page scroll, expansion/collapse, and no visual pumping during adjacent navigation. [RECOMMENDATION]

### Layer 4 — mandatory manual badge-by-badge sign-off

For P151-11, the generated manifest must contain one row per artwork code with reviewer fields for sharpness, optical centering, internal padding, crop, aspect ratio, title, card height, active/inactive appearance, and relative weight. Sign off all rows, not a sample, and attach screenshots for all six viewport classes. [RECOMMENDATION]

### Runnable Docker verification commands

```bash
# Frontend focused regression suite
docker compose exec -T team4sv30-frontend \
  npx vitest run \
  src/components/profile/badgeArtwork.test.ts \
  src/components/profile/memberBadgeLabels.test.ts \
  src/components/profile/MemberBadgeChain.test.tsx \
  src/components/ui/FocalCarousel.test.tsx \
  src/components/ui/ResponsiveImage.config.test.ts

# Frontend static gates
docker compose exec -T team4sv30-frontend npm run typecheck
docker compose exec -T team4sv30-frontend \
  npx eslint \
  src/components/profile/MemberBadgeChain.tsx \
  src/components/profile/badgeArtwork.ts \
  src/components/ui/FocalCarousel.tsx

# Backend registry and pure repository behavior
docker compose exec -T team4sv30-backend go test ./internal/badges
docker compose exec -T team4sv30-backend \
  go test ./internal/repository \
  -run 'Test(RoleVolumeProgressBadgeGeneratesKaraokeFXCodesGenerically|Phase131PublicProfileQueryBudgetIsConstant|Phase150RoleEntryBadgeEmittedExactlyOnceWithProgress)$' \
  -count=1 -v

# Guarded Postgres gates (DSNs must point to their dedicated throwaway DBs;
# the tests fail closed on the database name and otherwise skip when unset)
docker compose exec -T \
  -e TEAM4S_PHASE131_TEST_DSN="$TEAM4S_PHASE131_TEST_DSN" \
  team4sv30-backend \
  go test ./internal/repository -run TestPhase131PublicProfileQueryBudgetIsConstant -count=1 -v
docker compose exec -T \
  -e TEAM4S_PHASE150_04_TEST_DSN="$TEAM4S_PHASE150_04_TEST_DSN" \
  team4sv30-backend \
  go test ./internal/repository -run TestPhase150RoleEntryBadgeEmittedExactlyOnceWithProgress -count=1 -v

# Phase-151 browser evidence, after the planned collector exists
docker compose exec -T team4sv30-frontend node scripts/capture-phase151-badge-evidence.mjs \
  --base-url http://192.168.235.196:3000 \
  --out-dir /tmp/phase151-badge-evidence \
  --viewports 320x568,520x900,768x1024,1024x768,1440x900,1920x1080,2560x1440

# Full build/diff hygiene
docker compose exec -T team4sv30-frontend npm run build
docker compose exec -T team4sv30-backend go test ./...
git diff --check
```

The frontend focused suite passed 229 tests with one skipped test; three existing React `act(...)` warnings were emitted by carousel tests. Backend `internal/badges` passed, generic Karaoke generation passed, and the two DSN-gated repository tests skipped because the dedicated DSNs were unset. [VERIFIED: commands executed on 2026-09-07]

## Security Domain

The role catalog endpoint is intentionally public and returns only presentation metadata; capability grants and audit/IdP data are excluded from its DTO, and the handler accepts only three bounded contexts. [VERIFIED: `backend/internal/repository/role_catalog_repository.go:14-37,39-85`; `backend/internal/handlers/role_catalog_handler.go:25-51`]

Badge art is served only from the explicit `/member-achievement-badges/**` Next image local pattern; arbitrary runtime file probing would weaken that explicit allow-list model and is unnecessary. [VERIFIED: `frontend/next.config.mjs:21-39`; `ResponsiveImage.config.test.ts:25-28`]

[RECOMMENDATION] Keep Phase 151 additive to presentation only: no protected fetch, bearer handling, permission rule, upload path, HTML injection, endpoint contract, or DB schema change. The dev showcase must use static mock DTOs and the existing resolver so it cannot expose private profile data.

## Planning Guidance

1. **Artwork contract and Karaoke assets:** introduce the presentation-only role-art manifest, add six Karaoke files, centralize direct/layered JSX, and add filesystem/catalog coverage tests. [RECOMMENDATION]
2. **Shared slot and responsive CSS:** establish the domain slot, lock the mobile-first cap in a UI spec/prototype, route every primary stage through it, update `sizes`, and delete competing width/height blocks. [RECOMMENDATION]
3. **Carousel/render cleanup:** remove unreachable `FamilyCollectionCard`, preserve `FocalCarousel`, extract memoized cards/stages, replace remount keys with explicit selection reset, and add render/interaction regressions. [RECOMMENDATION]
4. **Backend/query preservation:** make no backend/API/DTO/SQL changes, rerun Phase-150 exact-once and Phase-131 constant-20 tests, and correct stale active evidence metadata only if the collector is touched. [RECOMMENDATION]
5. **Gallery and visual evidence:** add the dev showcase plus Phase-151 Playwright collector, run all automated gates, then complete manual row-by-row and six-viewport sign-off. [RECOMMENDATION]

Keep these work items in separate plans/waves because artwork files, shared slot CSS, carousel component structure, backend query validation, and evidence tooling have independent ownership and verification paths. [RECOMMENDATION]

## Pitfalls to Avoid

- Do not put threshold numbers in the role artwork manifest, showcase, CSS, or frontend tests except as server-shaped test fixtures sourced from the established family fixture. [RECOMMENDATION]
- Do not infer achievement capability from `icon_key`; the catalog context determines role eligibility and the manifest only proves presentation coverage. [RECOMMENDATION]
- Do not virtualize away inactive carousel cards: full mount plus `inert` is an existing accessibility/product contract. [RECOMMENDATION]
- Do not carry the dead family-strip wheel/settle engine into current stage components. [RECOMMENDATION]
- Do not resize/recompress the 142 MiB source asset set as part of UI consolidation. [RECOMMENDATION]
- Do not change the locked 20-query backend budget or historical Phase-131 evidence in this UI phase; only current collector metadata may be corrected from stale 19 to 20. [RECOMMENDATION]
- Do not declare visual completion from Vitest/build alone; the user explicitly requires badge-by-badge browser inspection. [VERIFIED: `151-USER-REQUEST.md:430-513,620-652`]

## Blockers and Known Gaps

- Six Karaoke artwork files do not exist at the research baseline; execution needs an approved artwork-generation/selection step before complete visual validation can pass. [VERIFIED: filesystem inventory on 2026-09-07]
- The dedicated Phase-131 and Phase-150-04 Postgres DSNs are not present in the running backend container, so the query-budget and real single-emission tests skipped during research. They must be provisioned against guarded throwaway databases for execution verification. [VERIFIED: research test output on 2026-09-07; `member_profile_query_budget_test.go:45-79`; `member_profile_public_repository_postgres_test.go:254-285`]
- No all-badge live gallery or screenshot-baseline suite exists yet; visual completeness cannot be demonstrated until the planned showcase/collector is implemented. [VERIFIED: repo file inventory and existing capture scripts]
- The existing focused frontend suite has one skipped legacy centering test and emits three `act(...)` warnings; these are test-harness debt, not observed production failures. [VERIFIED: focused Vitest run on 2026-09-07]
- Full baseline typecheck and lint are not clean for documented unrelated reasons; Phase 151 must compare final output to that baseline and must not “fix” those unrelated files. [VERIFIED: `.planning/phases/151-erfolgsbadge-karussell-konsolidierung/151-BASELINE-CHECKS.md:5-9`]

No contradictory source-of-truth or unresolved product decision was found. [VERIFIED: `151-USER-REQUEST.md`; current code and Phase-150 artifacts]

## Sources

### Primary project sources

- `.planning/phases/151-erfolgsbadge-karussell-konsolidierung/151-USER-REQUEST.md`
- `.planning/REQUIREMENTS.md` (P151-01 through P151-12) and `.planning/ROADMAP.md` (Phase 151)
- `AI-HANDOFF.md`, `AGENTS.md`
- `frontend/src/components/profile/MemberBadgeChain.tsx` and its CSS/test modules
- `frontend/src/components/profile/badgeArtwork.ts`, `memberBadgeLabels.ts`, `memberBadgeFamilies.ts`
- `frontend/src/components/ui/FocalCarousel.tsx`, `ResponsiveImage.tsx`, and tests
- `frontend/next.config.mjs`, `frontend/scripts/capture-phase134-uat-evidence.mjs`, `frontend/scripts/collect-member-profile-evidence.mjs`
- `backend/internal/badges/thresholds.go` and tests
- `backend/internal/repository/member_profile_*` loaders and query-budget/deduplication tests
- `backend/internal/repository/role_catalog_repository.go`, `backend/internal/handlers/role_catalog_handler.go`
- `database/migrations/0146_capability_policy_catalog.up.sql`, `0149_role_catalog_palette_correction.up.sql`, `0158_historical_role_contexts.up.sql`
- `.planning/phases/151-erfolgsbadge-karussell-konsolidierung/151-CONTEXT.md`, `151-BASELINE-CHECKS.md`, `151-SOURCE-ARTWORK-REVIEW.md`, `151-UI-SPEC.md`, `151-VALIDATION.md`

---

**Research status:** COMPLETE

**Research blockers:** Karaoke assets, dedicated test DSNs, and all-badge visual harness are execution inputs/gaps; none blocks planning.
