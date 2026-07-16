---
phase: 103
uat_test: 1
status: root_cause_found
investigated: 2026-07-16
scope: diagnosis_only
---

# Phase 103 UAT 1 — Release visual language

## Symptom

The public release detail is functionally complete, but visually reads as a generic light detail page: a bare two-column image/content grid followed by sections on the canvas. It does not inherit the atmosphere, glass surfaces, typography scale, radii, shadows, spacing rhythm, or blue accent treatment established by the public Fansub and Fansub-project surfaces. The release hero must remain its own composition and must not copy the project banner layout.

## Root cause

The Phase 103 implementation reused individual global primitives and color tokens, but did **not reuse or adapt the public Fansub/project page-level composition contract**. The release route has neither the data projection nor the structural wrappers needed for that visual language. Its local CSS therefore falls back to a plain constrained grid and muted flat surfaces.

This is not a missing single token. It is a three-layer composition gap:

1. **The release loader does not obtain public atmosphere inputs.**
   - `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.tsx:43-53` loads only anime title, `cover_image`, and group name.
   - It passes only `fallbackPosterUrl` to the hero at `page.tsx:88-91`.
   - By contrast, the public project loader/composition passes `heroBackdropUrl`, `pageStyle`, `heroStyle`, and `infoPanelStyle` into the page and hero at `frontend/src/app/anime/[id]/group/[groupId]/ProjectPage.tsx:15-29`.
   - Consequently, the release page cannot render a scoped atmospheric backdrop or project-consistent themed surface even though the reference surface has an established data/style seam.

2. **The release page has no atmospheric or glass structural shell.**
   - `page.module.css:1-7` defines `.page` only as a centered `1180px` grid with padding and gap. It lacks the project page's `position: relative` and `isolation: isolate` (`frontend/src/app/anime/[id]/group/[groupId]/page.module.css:1-9`).
   - The public project establishes the visual atmosphere through a full-bleed, blurred, darkened backdrop and canvas fade at project CSS lines `44-63`, then places content in a foreground layer at lines `65-71`.
   - Its primary surface is a translucent, blurred glass card with an 18px radius, luminous border, and layered shadow at project CSS lines `73-85`. The public Fansub profile independently uses the same contract at `frontend/src/app/fansubs/[slug]/page.module.css:41-92`.
   - No equivalent release-specific shell exists. Thus all later sections sit directly on the default canvas and visually detach from the source project.

3. **The hero is a generic grid rather than an adapted public editorial surface.**
   - `ReleaseDetailHero.tsx:35-52` renders a bare `<section>` with an image next to generic `SectionHeader`, badges, a technical definition list, and a nested flat card.
   - Its CSS at `page.module.css:32-72` supplies only the two-column grid, a standard `var(--radius-md)` image border, and muted rectangular fact cells. It defines no containing surface background, backdrop-filter, outer radius, shadow, foreground layering, or editorial title scale.
   - The project reference instead uses a deliberate large title hierarchy (`page.module.css:144-157`), 12–18px media radii and strong media shadows (`93-117`), a translucent outer card (`73-85`), and blue accent emphasis (`132-149`, `181-183`, `207-209`).
   - Using `SectionHeader`, `Badge`, and `Card` was contract-compliant at the primitive level, but insufficient for the explicitly required public visual composition.

## Why planning/tests did not catch it

- The locked decision explicitly required the public Fansub page as the visual language (`103-CONTEXT.md`, D-06, line 22).
- Plan 103-03 repeated that requirement (`103-03-PLAN.md:31`, task action at line 51, success criterion at line 83), but translated it into “global UI primitives and public Fansub spacing/tokens.”
- Component tests asserted content, selected preview, and text-only behavior. They did not assert the presence of a release atmosphere shell, themed backdrop input, glass surface wrapper, or reference-composition classes. The implementation could therefore pass all automated tests while satisfying only the information hierarchy.

## Suggested fix direction

Create a **release-specific adaptation** of the established public composition, without copying the project banner:

- Extend the release page-data seam to resolve the already established public atmosphere/theming inputs (appropriate group/anime backdrop and relevant style variables) instead of passing only the anime poster.
- Add a scoped, full-bleed blurred backdrop/fade and foreground layer using the same public Fansub/project mechanics and tokens.
- Wrap the independent Release hero in a translucent glass/editorial surface with the established radius, border, shadow, spacing, typography, and blue accent language.
- Keep the Release hero's own content model: selected release preview or text-safe fallback, episode/release identity, cooperation groups, technical facts, subtitle tracks, counts, and secondary playback action. Do **not** add or duplicate the project banner/header composition.
- Apply the same surface and spacing rhythm to downstream release sections where needed so the fix is page-coherent, not only a decorated hero.
- Add a focused composition test for the atmospheric shell and independent Release hero, then verify visually against both supplied UAT screenshots at desktop and mobile widths.

## Files implicated

- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.module.css`
- Public reference: `frontend/src/app/anime/[id]/group/[groupId]/ProjectPage.tsx`
- Public reference: `frontend/src/app/anime/[id]/group/[groupId]/page.module.css`
- Public reference: `frontend/src/app/fansubs/[slug]/page.module.css`

No product implementation was changed during this diagnosis.
