# Quick Plan

## Read first

- `AGENTS.md`
- `frontend/src/app/admin/anime/[id]/episodes/page.tsx`
- `frontend/src/components/episodes/EpisodesOverview/EpisodeAccordion.tsx`
- `frontend/src/components/episodes/EpisodesOverview/EpisodeAccordion.module.css`
- `frontend/src/components/episodes/EpisodeClassificationFields/EpisodeClassificationFields.tsx`

## Actions

1. Remove the descriptive paragraph above the episode accordion list.
2. Move the classification controls into the accordion header beside the title row.
3. Keep the controls compact and stack them below the header on small screens; run focused checks and push.

## Acceptance criteria

- The explanatory section text is no longer rendered.
- Canon/Filler and episode type are visible on the same desktop level as episode number/title.
- The interactive selects remain accessible and usable on narrow screens.
