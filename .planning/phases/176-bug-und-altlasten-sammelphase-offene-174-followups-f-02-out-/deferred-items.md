# Deferred Items (176-02)

Pre-existing, out-of-scope test failures observed while running the full frontend
`npx vitest run` suite during 176-02 execution. None of these touch files modified by
this plan (`frontend/src/types/admin.ts`, `SegmenteTab.helpers.tsx`,
`SegmentsListSection.tsx`, `SegmenteTab.test.tsx`, and 3 sibling `*.test.tsx`/`*.test.ts`
files adding `theme_type_kuerzel` to their local `AdminThemeSegment` test fixtures).
Logged per the Scope Boundary rule rather than fixed.

1. `src/lib/cssCustomProperties.guard.test.ts` -- 2 failing assertions: a dead
   `--surface-muted` CSS custom-property reference detected in
   `lib/roleCatalog.accessibility.test.ts:275` (no fallback), and the
   known-non-CSS-textual-mentions allow-list size check that depends on it.
2. `src/app/dev/ui-system/showcase/PublicReleaseSurfacesShowcase.test.tsx` -- "dokumentiert
   die produktive Release-Listenkarte mit Kara- und Leer-Timeline": cannot find an
   accessible link named "Release öffnen" in the showcase fixture.
3. `src/app/admin/anime/[id]/episodes/import/EpisodeImportEpisodeGroup.test.tsx` -- 2
   failing cases under "EpisodeGroup (GAP-13)" about header/row filename duplication.
4. `src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx`
   -- "renders roles, notes and media without a second release history": expects text
   "Vollständiges Memberprofil" but the rendered aria-label now reads "Vollständiges
   Fansubberprofil".

None of these relate to `theme_types.kuerzel`, segment badge derivation, or the deleted
`segmenteTabUtils.ts`. Not fixed as part of 176-02.
