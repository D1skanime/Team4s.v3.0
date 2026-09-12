# Phase 157 — Deferred Items

## 2026-09-12 — Pre-existing `tsc --noEmit` failures unrelated to Plan 04's scope

While running the full frontend `tsc --noEmit` as part of Plan 157-04 verification, three
pre-existing type errors were observed, all caused by Plan 157-01 (which added the additive
`episodes: number` field to `ProjectMemberCounts`) without updating every test fixture that
constructs a literal `ProjectMemberCounts` object:

- `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx:43`
- `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx:84`
- ~~`frontend/src/components/fansubs/projectMember/ProjectMemberReleasesSection.test.tsx:60`~~ —
  **closed by Plan 157-05** (added `episodes: 0` to the `ProjectMemberHero` fixture in that file;
  `tsc --noEmit` is now clean for `ProjectMemberReleasesSection.test.tsx`).

None of these files are in Plan 157-04's `files_modified` list (`ProjectMemberMediaGallery.tsx`,
`ProjectMemberMediaGallery.module.css`, `ProjectMemberMediaGallery.test.tsx`), and the errors are
not caused by Plan 04's changes — `tsc` reports zero errors for any file Plan 04 touched. Per the
executor's scope-boundary rule, these are logged here rather than fixed inline.

Remaining candidate to close: whichever later plan in this phase touches `page.test.tsx` (per
157-CONTEXT.md's Workstream I test list) should add `episodes: <n>` to the two remaining fixture
literals there.
