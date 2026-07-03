---
status: complete
quick_id: 260703-crb
date: 2026-07-03
---

# Quick Summary: Fix Admin Anime Jellyfin Link Status And Episode Stat Source-Of-Truth

## Changed

- `AnimeEditWorkspace.tsx`: the readonly Jellyfin link status now derives from the same `hasJellyfinSource` source-of-truth that already recognizes a Jellyfin item ID or `jellyfin:` source tag.
- `admin/anime/[id]/episodes/page.tsx`: the episode summary count now uses `groupedEpisodes.length`, matching the release-native grouped episode list rendered on the page.

## Validation

- `cd frontend && npm run typecheck` passed.
- `cd frontend && npm run lint` passed with existing warnings only.
- `git diff --check` passed.
- `cd frontend && npm test` failed due unrelated existing tests outside this diff:
  - `src/components/profile/MembershipsSection.test.tsx`
  - `src/components/profile/MemberContributionFilters.test.tsx`
  - `src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.test.tsx`
  - `src/app/fansubs/__tests__/page.test.tsx`

## Notes

- No API, schema, contract, upload, media ownership, release, or fansub ownership behavior was changed.
- No focused existing test seam covered these two local UI derivations; coverage remains via typecheck, lint, diff check, and the next UI-first E2E retest.
