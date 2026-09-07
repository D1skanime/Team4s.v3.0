# Team4s Phase 151 — Task 151-05-01 Gallery Handoff

Status: review corrections implemented and scoped gates pass. No staging, commit, push, DB, env, media, asset, script, runtime, agent, or configuration changes were made. Final visual approval remains blocked on the external Karaoke asset gap and collector QA.

## Route and inventory

- Gallery: `http://127.0.0.1:3000/dev/ui-system/achievements`
- Linked once from `/dev/ui-system` via `href="/dev/ui-system/achievements"`.
- The route performs server-side `readdir` against the fixed `public/member-achievement-badges` directory only, filters `.png`, and sorts filenames. It accepts no path input and adds no API/auth/product link.
- Current source count: **110 PNG files**.
- Eventual count after the external Karaoke artwork gap closes: **113 PNG files**. All three Karaoke assets are still missing externally: `role_entry_karaoke_fx.png`, `role-karaoke_fx-motif.png`, and `rank-frame-karaoke_fx-bronze.png`. The gallery does not bypass this gate.

## Exact gallery counts

- Productive composition cases: **84 unique codes**.
- Role cases: **60** = 12 roles × 5 stages.
- Non-role resolver cases: **24**.
  - **22** ordinary progress/points/contribution/membership-duration cases render the real production family stage with that case code selected as its current hero and present in its real stage track.
  - `founding_member` renders a complete production `MembershipStage` with its independent founding panel plus a clearly labeled standalone artwork-geometry reference.
  - `historical_leader` renders a production `MemberBadgeChain` generic single-catalog/earned case without `badgeProgress`, plus a clearly labeled standalone portrait-geometry reference. It does not define a new historical product surface.
- Production family-stage examples: **6** (`progress`, `points`, three contribution families, `membership`).
- Live `MemberBadgeChain` examples: **2** (`locked`, `preview`).
- Same-props role state comparisons: **3** (`active`, `inactive`, `expanded`).
- Width-controllable production card probes: **1**, initial embedded width 390 px.
- Stress carousels: **2**, with **100** and **200** mounted items (**300 total**).
- Raw source cases: **110 current**, automatically **113** when the missing files arrive.

The 24 exact non-role codes are:

`contribution_archivist_bronze`, `contribution_archivist_gold`, `contribution_archivist_silver`, `contribution_chronicle_bronze`, `contribution_chronicle_gold`, `contribution_chronicle_silver`, `contribution_projects_bronze`, `contribution_projects_gold`, `contribution_projects_silver`, `first_contribution`, `founding_member`, `historical_leader`, `long_term_member`, `membership_10_years`, `membership_7_years`, `point_milestone_active`, `point_milestone_engaged`, `point_milestone_experienced`, `point_milestone_first`, `point_milestone_legend`, `point_milestone_veteran`, `productive_bronze`, `productive_gold`, `productive_silver`.

## Collector selectors

- Ready root after hydration: `[data-achievement-gallery][data-gallery-ready="true"]`.
  - Server HTML intentionally starts as `[data-achievement-gallery][data-gallery-ready="false"]`.
  - A client layout effect changes only that dataset value to `true`; collectors must wait for the `true` selector before mutating the DOM.
  - `data-source-count="110"` currently.
  - `data-composition-count="84"`.
- All productive cases: `[data-composition-case]`.
- Role cases: `[data-composition-case][data-case-kind="role"]`.
- Non-role cases: `[data-composition-case][data-case-kind="non-role"]`.
- Ordinary non-role actual-card root: `[data-composition-case="<code>"] [data-actual-card="<code>"]` (**22** exact cases).
  - Each contains one real production family marker: `[data-anime-project-stage]`, `[data-points-achievement-stage]`, `[data-contribution-achievement-stage]`, or `[data-membership-stage]`, always together with `[data-family]`.
  - Selected production hero: `[data-actual-card="<code>"] [data-achievement-size="hero"][data-badge-code="<code>"]`.
  - Real stage-track marker: `[data-actual-card="<code>"] [data-achievement-size="stage"][data-badge-code="<code>"]`.
- Founding composition: `[data-composition-case="founding_member"]` contains `[data-actual-card="membership-with-founding"]`, `[data-family="membership"][data-membership-stage]`, `[data-founding-member]`, and `[data-artwork-reference="founding_member"]`.
- Historical composition: `[data-composition-case="historical_leader"]` contains `[data-historical-product-panel] [data-badge-group="special"]` and `[data-artwork-reference="historical_leader"]`.
- Production role card inside a role case: `[data-role-card-container]`, then `[data-role-code]`.
- Hero/stage slots: `[data-achievement-slot][data-achievement-size="hero"]` and `[data-achievement-slot][data-achievement-size="stage"]`.
- Resolved artwork image: `[data-achievement-art]`.
- Family stages: `[data-family-stage-case]`.
- Live chains: `[data-chain-case="locked"]`, `[data-chain-case="preview"]`.
- Same-width state cards: `[data-state-case="active"]`, `[data-state-case="inactive"]`, `[data-state-case="expanded"]`.
- Width probe root: `[data-container-probe="role-stage"]`. It is the unpadded direct wrapper around a production `RoleAchievementCard`; its label is a sibling outside the measured root. Set this element's inline width to 561/562/657/658 px and back to 390 px.
- Stress roots: `[data-stress-count="100"]` and `[data-stress-count="200"]`.
  - Current committed render count: each root exposes `data-render-count`; it is updated from item layout commits without React state.
  - Mounted items: `[data-stress-item]`, whose value is the zero-based index within that root.
  - Production carousel track/items: `[data-focal-carousel-items]` and `[data-focal-carousel-item]`.
  - Expand control: `button[aria-expanded="false"]`; collapse becomes `button[aria-expanded="true"]`.
- Raw source cases: `[data-source-case="filename.png"]`; each contains one high-resolution `ResponsiveImage` and a visible `figcaption` filename.

Obsolete/superseded PNG revisions appear only under `[data-source-case]`; they are never added as `[data-composition-case]`.

## Scoped checks

1. Focused correction TDD red run:
   - `docker compose exec -T team4sv30-frontend npx vitest run src/app/dev/ui-system/showcase/AchievementBadgeShowcase.test.tsx --reporter=dot`
   - Expected two failures observed: ordinary non-role wrappers had no production family marker, and server markup advertised `data-gallery-ready="true"` before hydration.

2. Required focused suite:
   - `docker compose exec -T team4sv30-frontend npx vitest run src/app/dev/ui-system/showcase/AchievementBadgeShowcase.test.tsx src/components/profile/AchievementArtwork.test.tsx src/components/profile/MemberBadgeChain.test.tsx --reporter=dot`
   - **PASS: 3 files, 105 tests.**

3. Scoped ESLint:
   - `docker compose exec -T team4sv30-frontend npx eslint src/app/dev/ui-system/page.tsx src/app/dev/ui-system/achievements/page.tsx src/app/dev/ui-system/showcase/AchievementBadgeShowcase.tsx src/app/dev/ui-system/showcase/AchievementBadgeNonRoleCases.tsx src/app/dev/ui-system/showcase/AchievementBadgeShowcase.test.tsx src/app/dev/ui-system/showcase/achievementBadgeGalleryFixtures.ts`
   - **PASS: zero errors and zero warnings.**

4. Full TypeScript observation:
   - `docker compose exec -T team4sv30-frontend npx tsc --noEmit --pretty false`
   - **Known baseline failure outside ownership only:** `.next/dev/types/app/anime/[id]/group/[groupId]/releases/page.ts(36,29)` rejects the existing `GroupReleasesPageProps.params` union. No gallery/assigned file was reported.

5. Server route smoke after corrections:
   - `curl http://127.0.0.1:3000/dev/ui-system/achievements`
   - **HTTP 200**, server HTML contained exactly **84** `data-composition-case`, **110** `data-source-case`, **300** `data-stress-item`, and one `data-gallery-ready="false"` root.
   - Runtime Testing Library render observed the same root as `data-gallery-ready="true"` after layout effects.
   - `/dev/ui-system` server HTML contained the achievement route link exactly once.

6. Scoped diff hygiene:
   - Tracked and new owned files checked for whitespace errors; **PASS**.

## Files owned and changed

- `frontend/src/app/dev/ui-system/page.tsx` — one dev-gallery link.
- `frontend/src/app/dev/ui-system/achievements/page.tsx` — fixed-directory server inventory and route.
- `frontend/src/app/dev/ui-system/showcase/AchievementBadgeShowcase.tsx` — production-component gallery.
- `frontend/src/app/dev/ui-system/showcase/AchievementBadgeNonRoleCases.tsx` — small gallery-only renderer for the 22 real family cases and the two explicitly independent cases.
- `frontend/src/app/dev/ui-system/showcase/AchievementBadgeShowcase.test.tsx` — focused observable contract tests.
- `frontend/src/app/dev/ui-system/showcase/achievementBadgeGalleryFixtures.ts` — private, explicitly non-authoritative server-shaped visual fixtures.
- `frontend/src/app/dev/ui-system/showcase/AchievementBadgeShowcase.module.css` — gallery-only review layout; no profile CSS touched.

No collector or phase-wide QA/evidence implementation was performed.
