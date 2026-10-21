---
phase: 190
slug: ffentliche-fansub-gruppenseite-berarbeiten-fansubs-slug
status: draft
shadcn_initialized: false
preset: none
created: 2026-10-21
---

# Phase 190 — UI Design Contract

> Visual and interaction contract for `/fansubs/<slug>`. This phase is a **CSS/markup consolidation
> and de-duplication phase**, not a greenfield redesign — all 21 decisions (D-a through D-u) are
> already locked in `190-CONTEXT.md`, and `190-RESEARCH.md`/`190-PATTERNS.md` already pinpoint
> exact file:line targets. This document does not re-ask any of those decisions. It translates them
> into the prescriptive visual/typographic/color/copy values the checker, planner and executor need,
> reusing only tokens and components that already exist in the codebase today. Two decisions (D-p,
> D-u) are deliberately left as **interaction/workflow contracts** rather than fixed values — see
> "Live Checkpoint Contracts" below.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — this project's canonical design system is the in-house `@/components/ui` primitive library (mandated by `CLAUDE.md`), not shadcn. shadcn is not installed (`components.json` absent) and must not be introduced by this phase. |
| Preset | not applicable |
| Component library | custom, in-repo: `Badge`, `Button`, `SectionHeader`, `HeroMetrics`, `Modal`, `EmptyState`, `FocalCarousel`, `ResponsiveImage` (all already imported by the files this phase touches) |
| Icon library | `lucide-react` (already in use: `ChevronRight`, `Maximize2`) |
| Font | Inter via `--font-sans` (`frontend/src/styles/globals.css:2`), body default `16px` / `line-height: 1.5` |

No new component, icon, or font dependency is introduced by this phase. Every visual change below
is either a CSS-token-only edit on existing CSS Modules or a prop addition to an existing shared
primitive (`FocalCarousel`, `HeroMetrics`).

---

## Spacing Scale

This phase does not introduce a new spacing scale — it reuses the sitewide tokens already declared
in `frontend/src/styles/globals.css:117-125`:

| Token | Value | Usage in this phase |
|-------|-------|----------------------|
| `--space-1` | 4px | `HeroMetrics` inline gap (D-u fix stays within this family) |
| `--space-2` | 8px | existing hero chip/link gaps (unchanged) |
| `--space-3` | 12px | existing `HeroMetrics` inline gap (pre-existing sitewide exception to strict 4/8-multiples — not introduced by this phase, do not "fix" it as part of D-u) |
| `--space-4` | 16px | `.heroBody` padding, `.heroBannerWrap` padding (unchanged by D-a; D-a only removes `.heroCard` background/border/shadow, not its padding/margin values) |
| `--space-5` | 24px | `.heroBody` right/left padding, `.heroFacts` margin |
| `--space-6` | 32px | not directly touched this phase |
| `--space-7` | 48px | `--public-page-gutter` |
| `--space-8` | 64px | `.page` bottom padding |

Exceptions: none new. **Do not invent new spacing values** for the team-card quote clamp (D-f),
media card grouping (D-k), or hero adjustments (D-a/D-b) — reuse the paddings/margins already present
in `page.module.css`, `FansubTeamSection.module.css`, and `FansubPublicSections.module.css` (see
Decision-to-Contract Mapping below for the exact rules to keep vs. remove).

---

## Typography

This phase reuses existing typographic roles verbatim. No new font-size/weight/line-height
combination is introduced anywhere in scope.

| Role | Size | Weight | Line Height | Source (reuse, do not re-declare) |
|------|------|--------|-------------|------------------------------------|
| Body / prose (subtitle, member roles, descriptions) | 14px | 500 | 1.5 | `.subtitle` (`page.module.css:111-118`) |
| Label / subheading (member subgroup headings, **new media category subheadings for D-k**) | 13px | 600 | ~1.3 | `.subgroupTitle` (`FansubTeamSection.module.css:6-11`) — **D-k's per-category media subheadings must use this exact class/pattern, not a new one** |
| Heading (hero `<h1>` group name) | `calc(var(--logo, 92px) * 0.4)` → ≈25.6–38.4px, scales with `--logo: clamp(64px, 6vw, 96px)` | 700 (browser default bold on `<h1>`, no override) | 1.1 | `.title` (`page.module.css:104-109`) — unaffected by D-a (D-a only touches `.heroCard` background/border/shadow) |
| Display (hero metric values, `HeroMetrics` `dd`) | 24px desktop / 20px ≤767px | 700 | 1 | `HeroMetrics.module.css:21-26,74-76` — **D-u must only adjust layout/wrap properties (`flex-basis`, `min-width`, `gap`) inside the existing `@media (max-width: 767px)` block; these size/weight values are locked and must not change** |

**D-c note:** changing the metric *label* text from "Release-Versionen" to "Releases" is a copy
change on the `dt` text content, not a typography-role change — `HeroMetrics.module.css:15-19`
(`dt` = 12px/600, 11px ≤767px) stays exactly as-is.

---

## Color

This phase reuses existing color tokens only — no new hex values, no new CSS custom property names.

| Role | Value | Usage in this phase |
|------|-------|----------------------|
| Dominant (page background) | `var(--surface-canvas)` (`#f6f4ef`) | Page background behind the hero backdrop gradient fade (`page.module.css:62`); **after D-a removes the `.heroCard` glass fill, the hero content sits directly against this canvas color inside the blurred backdrop — verify text contrast still holds against the backdrop's gradient overlay, not just against white** |
| Secondary (cards/surfaces) | `var(--surface-card)` (`#ffffff`) / `var(--surface-sunken)` (`#f0ece5`) | Member-row hover background (`.memberRowLink:hover`, `FansubTeamSection.module.css:41`), collaboration panel background (`.collaborationPanel`, `page.module.css:225`), media thumb skeleton |
| Accent (10%) | `var(--accent-primary)` (`#5f84dd`) / `var(--accent-deep)` (`#185fa5`) | Reserved for: hero logo glow ring (`.heroLogo` box-shadow), hero metric values (`dd` color, `HeroMetrics.module.css:23`), link chip dot colors, "Mehr anzeigen"/subtle-button text/hover state. **Do not extend accent usage to new elements introduced by this phase** (e.g. media category tags keep their existing per-category tag colors — `--tag-*-bg/-fg` tokens, `FansubPublicSections.module.css` — not accent) |
| Destructive | `var(--color-error)` (`#dc3545`) | Not used by this phase — no destructive user-facing action exists on this page (D-t's migration is an admin-only, non-interactive data correction, not a UI affordance) |

**D-o note (status, no longer doubled):** the status `Badge` keeps its existing semantic variant
mapping (`success`/`warning`/`muted` → green/amber/gray via `Badge`'s own internal tokens, unchanged
by this phase) — D-o removes the *duplicate plain-text* status segment from the meta line
(`buildFansubFactSummary`'s `parts` array), it does not change the Badge's color.

Accent reserved for: hero logo ring/glow, `HeroMetrics` value text, link-chip dots, subtle/ghost
button text on hover (`Mehr anzeigen`, `Weniger anzeigen`, `+N weitere`) — never for body text,
card backgrounds, or the media category tags (those keep their own dedicated `--tag-*` tokens).

---

## Copywriting Contract

This phase changes a small, enumerable set of German UI strings. All other copy (empty states,
errors) is explicitly **unchanged** per D-s.

| Element | Copy |
|---------|------|
| Primary CTA (media, D-j — exactly one of the two existing affordances survives) | Keep `"Alle {N} anzeigen"` (existing `Button variant="subtle"`, `FansubGroupMediaBlock.tsx:156-158`) as the single remaining "show more" affordance; remove the `"+{N} weitere"` overflow tile (`FansubGroupMediaBlock.tsx:149-151`). Rationale: D-k's per-category grouping makes a single, predictable "show all" action clearer than a batching overflow tile once media is split across multiple category subsections. |
| Metric label (D-c) | `"Releases"` — replaces `"Release-Versionen"` as the `HeroMetrics` item label fed from `page.tsx`'s stats-building code; exact label string only, no change to the `dt`/`dd` markup |
| Member-section heading (D-q) | `active` → `"Aktive Mitglieder · {count}"` (unchanged). `inactive` and `dissolved` → `"Mitglieder · {count}"` (both non-active statuses collapse to the identical string — do not special-case `dissolved` further, per D-q) |
| Historical-nennungen heading (D-g) | `"Historische Nennungen (unbestätigt) · {count}"` — replaces the per-card `Badge variant="muted"` "unbestätigt" with a single mention in the existing `.subgroupTitle` heading (`FansubTeamHistoricalGroup.tsx:112`); `"Ehemalige Mitglieder · {count}"` heading is unchanged |
| Quote clamp toggle (D-f) | Reuse the exact existing strings verbatim: `"Mehr anzeigen"` / `"Weniger anzeigen"` (`FansubStoryBlock.tsx` pattern) — no new wording |
| Role label (D-t) | `"Editing"` — `role_definitions.label_de` for code `editor`, via append-only migration `0186_role_catalog_editor_label_correction`; no frontend string change (fixtures already expect `"Editing"`) |
| Media category subheadings (D-k) | Reuse existing `getFansubMediaCategoryLabel()` output strings verbatim for all 8 category values (`frontend/src/lib/fansub-labels.ts:39-41`) — no new label text |
| Empty state (media, D-s — unchanged) | Heading: `"Noch keine Medien hinterlegt"`. Body: `"Diese Gruppe hat bisher keine öffentlichen Kontextmedien bereitgestellt."` (`FansubGroupMediaBlock.tsx:72-73`) — do not add empty-state copy to any other section (Geschichte/Team/Historie); those keep rendering `null` when empty, per D-s |
| Error state | Not applicable — this phase introduces no new error-producing interaction; `.errorBox` (`page.module.css:263-269`) is unchanged |
| Destructive confirmation | Not applicable — no destructive action in scope |

---

## Decision-to-Contract Mapping (D-a through D-u)

This table is the executor's primary checklist. Each row states the prescriptive visual rule, not
just the intent. Full code excerpts are in `190-PATTERNS.md`; this table is the "what must be true
when done" summary.

| D-ID | Prescriptive visual contract |
|------|-------------------------------|
| D-a | `.heroCard` (`page.module.css:74-83`) must end up with **exactly** this rule set, copied verbatim from the project page (`frontend/src/app/anime/[id]/group/[groupId]/page.module.css:83-89`): `position: relative; display: grid; margin-top: 18px; overflow: hidden;` — no `background`, no `backdrop-filter`, no `border`, no `box-shadow`. The `isCollaboration` panel (`.collaborationPanel`, group-page-only, `page.module.css:219-226`) must render unchanged — it has no project-page equivalent and must not be deleted while aligning `.heroCard`. |
| D-b / D-p | **No fixed value in this spec.** See "Live Checkpoint Contracts" below — the executor must pause after D-a/D-o land, demo live, and only then adjust `.heroBannerImg`'s `max-height: clamp(140px, 17vw, 200px)` per the user's in-session decision. |
| D-c | `HeroMetrics` item label text `"Release-Versionen"` → `"Releases"`. No markup/CSS change. |
| D-o | Status renders **exactly once** per group, for **all three** `FansubStatus` values (`active`/`inactive`/`dissolved`). Keep the `Badge` in `.heroTitleRow` (already styled via `statusVariant`); remove the plain-text status segment from `buildFansubFactSummary`'s joined `parts` (`fansub-summary.ts:36`). Delete the now-duplicate local `statusLabel()` in `FansubHeroSection.tsx:47-51`; import the exported one from `fansub-summary.ts` instead. |
| D-q | Member-section heading text resolves by `group.status`: `active` → `"Aktive Mitglieder · {n}"`, `inactive`/`dissolved` → `"Mitglieder · {n}"`. Visual style of the heading is unchanged — same element/class as today (`FansubTeamActiveGroup.tsx:41`), only the label string becomes status-dependent via a new pure function (home: `frontend/src/lib/fansub-team-labels.ts`). |
| D-f | Each team-card quote (`member_slogan`) renders inside a clamp wrapper reusing `useClampedOverflow` + the `FansubStoryBlock.tsx` consumer pattern 1:1. Visual target: clamp to roughly **2–3 lines** (tune `max-height` against the quote's own `line-height: 1.4` and `font-size: 13px` from `.memberSlogan`, `FansubTeamSection.module.css:146-153` — do not copy `FansubStoryBlock`'s `8.5rem` literal verbatim, it is sized for body prose, not a 13px italic quote). Toggle button: `"Mehr anzeigen"` / `"Weniger anzeigen"`, same `Button variant="subtle" size="sm"` as the story block. Mask-fade on clamp (`mask-image: linear-gradient(...)`) reused identically from `FansubStoryBlock.module.css`. |
| D-g | Remove `<Badge variant="muted">unbestätigt</Badge>` from every historical-row card (`FansubTeamHistoricalGroup.tsx:48`). Heading text for that subgroup becomes `"Historische Nennungen (unbestätigt) · {n}"` (same `.subgroupTitle` class, no new style). |
| D-h / D-r | `FocalCarousel` gets a new optional prop `singleItemLayout?: 'quiet' | 'grid'` (default `'quiet'`, preserves current behavior everywhere). `quiet` boolean becomes `visibleItems.length === 1 && singleItemLayout !== 'grid'`. Only `FansubProjectsGrid.tsx` passes `singleItemLayout="grid"`. Visual result for a single project: renders as a normal, left-aligned grid card — same size/style as any card in a multi-project grid, **not** the carousel's centered "quiet" treatment (no `.quietTrack` styling, no suppressed nav chrome needed since there's nothing to navigate). All other `FocalCarousel` consumers (`MemberBadgeChain`, `RoleAchievementCard`, `ThumbnailStrip`, `AchievementBadgeShowcase`) must render pixel-identical to before — zero visual diff permitted there. |
| D-i | Media card title falls back `title → caption → (nothing)`. **Must never render `item.media_type`** (near-always the generic string `"image"` in live data) as a visible title. When both `title` and `caption` are empty, the title line is omitted entirely from the card (no placeholder text, no empty `<strong>`). |
| D-j | Exactly one "show more" affordance remains when `media.length > PREVIEW_LIMIT`. Per the Copywriting Contract: keep `"Alle {N} anzeigen"` (`Button variant="subtle"`), remove the `"+{N} weitere"` overflow tile. |
| D-k | Media grid is grouped by `item.category`, iterated in the fixed order `gallery, history_screenshot, old_website, forum, irc_chat, event_meeting, artwork_fanart, other` (matching `FANSUB_MEDIA_CATEGORY_LABELS` declaration order in `fansub-labels.ts:5-13`). Each non-empty category group gets one subheading using the existing `.subgroupTitle` style (13px/600, see Typography table) with text from `getFansubMediaCategoryLabel(category)`. Empty categories render no subheading and no section (consistent with D-s). The grid cell layout *within* each category group is unchanged (`.mediaItemGrid`, `FansubPublicSections.module.css`) — only the grouping/heading wrapper is new. |
| D-l | `.storyStack` (`FansubStorySection.module.css:1-8`) gets `margin: 0 auto;` added so the block centers within the full-width `.gridSection` parent. `max-width` may be adjusted from `68ch` toward the 70–80ch target range stated in D-l. **Do not add `text-align: center`** — paragraph text inside the block stays left-aligned. `SectionHeader` (`FansubStorySection.tsx:101`) stays a sibling outside `.storyStack`, full width, unchanged — no structural change needed there. |
| D-m | No visual change — section order (Kopf → Geschichte → Projekte → Team → Historie → Medien) stays exactly as today. Listed here only so the checker can confirm no reorder slipped in. |
| D-n | No visual change — "Mitglieder" counting rule and "Historie & Erfolge" timeline presentation are explicitly out of scope. |
| D-t | Database-only: `role_definitions.label_de` for code `editor` becomes `"Editing"` via migration `0186`. **No frontend visual/CSS change expected** — existing role-chip rendering (`.role-catalog-chip`, `globals.css:314-323`) and `data-color-key` accent derivation are untouched; verify via a repo grep that no code branches on the literal string `'Edit'` before closing this decision. |
| D-u | `HeroMetrics.module.css`'s existing `@media (max-width: 767px)` block (lines 65-77) must be adjusted (e.g. `flex-basis`/`min-width` on `.heroMetricItem`) so that **3 metric items at 375px viewport width wrap evenly (2+1 balanced, or stay on one row if it fits) and never leave a single orphaned third value visually isolated on its own line**. Font-size/color/weight values in that media query (11px `dt`, 20px `dd`) are locked — this is a wrap-layout fix only, not a restyle. Must be verified live at 375px on **all six** call sites listed in the Live Checkpoint Contracts section below, not just the fansub group page. |

---

## Live Checkpoint Contracts (D-p, D-u)

These two decisions are **interaction/workflow contracts**, not fixed visual values — the plan must
encode them as explicit pause points, and the checker should verify the *mechanism* exists in the
plan, not a pixel number.

### D-p — Banner-size live checkpoint (mandatory, blocking)

1. Implement D-a (`.heroCard` frame removal) and D-o (status de-duplication) first, as a complete,
   demoable unit.
2. **Plan must pause here.** Show the live result to the user (desktop 1440px, against
   `new-subs`/`strawhat-subs`/`dragon-subs`) before proceeding to any other task in the phase.
3. Only after the user has seen the live D-a/D-o result does the user decide whether/how
   `.heroBannerImg`'s `max-height: clamp(140px, 17vw, 200px)` (identical today on both the group and
   project pages) should change. **No clamp value is pre-approved by this spec.**
4. If the user requests a change, apply it to `page.module.css:91-98` only (the group page's own
   rule) — do not touch the project page's identical rule unless the user explicitly extends the
   decision there too.
5. Resume the rest of the phase only after this checkpoint is explicitly closed.

### D-u — HeroMetrics mobile-wrap live sweep (mandatory, non-negotiable, siteweite scope)

After the `HeroMetrics.module.css` mobile media-query fix lands, verify **live at 375px viewport
width** on every one of these six call sites — not just the fansub group page:

1. `frontend/src/app/anime/[id]/group/[groupId]/sections/ProjectStats.tsx` (project page)
2. `frontend/src/components/fansubs/FansubHeroSection.tsx` (this phase's primary driver)
3. `frontend/src/components/profile/MemberProfileHero.tsx`
4. `frontend/src/components/fansubs/projectMember/ProjectMemberHero.tsx`
5. `frontend/src/app/me/dashboard/components/DashboardMetrics.tsx`
6. `frontend/src/app/dev/ui-system/page.tsx` (showcase — acceptance aid, not a production surface,
   but still required for sign-off visibility)

Pass condition: on every site above, the metric row either stays on one line or wraps to a
**balanced** arrangement — no single value left orphaned alone on its own line. Fail condition:
any of the six sites still shows the pre-fix orphaned-third-value wrap bug.

---

## File-Size Watch (CLAUDE.md ≤450-line rule)

| File | Current lines | Risk this phase |
|------|---------------|------------------|
| `frontend/src/app/fansubs/[slug]/page.module.css` | 328 | D-a/D-b/D-l all edit this file. Edits are net-neutral-to-smaller (removing `.heroCard` background/border/shadow declarations, adding a `margin: 0 auto` line to the imported story CSS file, not this one) — unlikely to push past 450, but re-check line count after the D-a/D-b/D-l edits land before closing those tasks. |
| `frontend/src/app/anime/[id]/group/[groupId]/page.module.css` | 596 (**already over the 450-line limit**) | This phase should only **read** this file as the D-a copy-source — it does not need to be edited to satisfy D-a (the group page copies the project page's existing `.heroCard` rule; the project page's own file is untouched). **If any task in the plan does end up editing this file for any reason, that task must split it in the same commit per CLAUDE.md** — do not silently grow an already-oversized file. |
| `frontend/src/components/ui/HeroMetrics.module.css` | 77 | D-u edit stays well under 450. |
| `frontend/src/components/fansubs/FansubTeamSection.module.css` | 193 | D-f's new clamp CSS rules (2 small rules, mirroring `FansubStoryBlock.module.css`) keep this well under 450. |
| `frontend/src/components/fansubs/FansubGroupMediaBlock.tsx` | 169 | D-i/D-j/D-k add grouping logic; if the component grows past ~250-300 lines after adding category-group iteration, consider extracting the grouping/title-fallback pure functions to `frontend/src/lib/fansubMediaPresentation.ts` (already planned per `190-PATTERNS.md`) to keep this component file lean — not required by the 450-line rule yet, but good hygiene given the new logic. |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|--------------|
| shadcn official | none — shadcn is not used in this project | not applicable |
| third-party | none | not applicable |

No registry vetting gate applies to this phase — all components are first-party, already in the
repository, already reviewed in prior phases.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS — verify the Copywriting Contract table above (D-c, D-g, D-q,
  D-j, D-t) matches implementation exactly, including the member-section status-dependent string
  and the single surviving media "show more" affordance.
- [ ] Dimension 2 Visuals: PASS — verify D-a's `.heroCard` matches the project page's rule verbatim
  (no background/border/shadow survives), D-l's story block is centered with left-aligned text, D-k's
  category subheadings render only for non-empty groups, D-h/D-r's single-project card is a normal
  grid card not a carousel "quiet" layout.
- [ ] Dimension 3 Color: PASS — verify no new hex/token is introduced; accent usage stays scoped to
  the reserved-for list; D-o's Badge color is unchanged (only the duplicate text segment is removed).
- [ ] Dimension 4 Typography: PASS — verify D-k's media category subheadings reuse `.subgroupTitle`
  (13px/600) rather than introducing a new heading style; verify D-u's mobile fix changes only
  layout/wrap properties, not font-size/weight in `HeroMetrics.module.css`'s mobile media query.
- [ ] Dimension 5 Spacing: PASS — verify no new spacing token/value is introduced; D-a/D-f/D-k reuse
  existing `--space-*` tokens and existing padding/margin values.
- [ ] Dimension 6 Registry Safety: PASS (trivially — no registry in scope).

**Additional non-standard gates for this phase (beyond the six dimensions):**
- [ ] D-p live checkpoint is present as an explicit, blocking pause step in the execution plan
  (not merely mentioned in passing).
- [ ] D-u's six-call-site live mobile sweep is present as an explicit, non-skippable verification
  checklist in the execution plan.

**Approval:** pending
