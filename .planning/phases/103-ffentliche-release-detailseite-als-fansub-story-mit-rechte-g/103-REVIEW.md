---
phase: 103
reviewed: 2026-07-16
status: clean
scope: live-uat-fixes
commits: [0610ae63, 9f34f887]
files_reviewed: 5
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
---

# Phase 103 Final Live-UAT Fix Review

## Result

The targeted live-UAT fixes are clean. No actionable security, ownership, cache, hydration, API-contract, or interaction regression was found.

## UTC release-note date

- `formatReleaseNoteDate` parses the documented ISO timestamp and formats its calendar date explicitly in `UTC`.
- This is semantically appropriate for persisted `created_at`: it displays the canonical creation date rather than allowing the server or browser timezone to shift a near-midnight timestamp into another day.
- Invalid timestamps retain the original value instead of producing an invalid localized string.
- Server and browser execute the same timezone-explicit formatter, so the rendered text is hydration-stable.
- The regression uses `renderToString` followed by `hydrateRoot` with a timezone-sensitive timestamp and different server/client timezone settings; it asserts `6. Juli 2026` and no hydration diagnostic.

## Immediate gallery expansion

- `revealAll` calls the existing expand state before network work, so images already supplied by the public aggregate become visible immediately.
- When `items.length >= total`, it returns without setting loading state or issuing a cursor request.
- Otherwise it computes loaded counts per canonical category and fetches only categories whose loaded count is below the server-projected category total.
- Incomplete categories still use the existing category-scoped cursor endpoint, follow `has_more/next_cursor`, and merge through the existing ID deduplication seam.
- Expansion remains active if a gap fetch fails; the local error is displayed and the still-visible remaining action permits a retry.
- Focused coverage asserts the complete aggregate case expands from six to eight synchronously and makes no API call, while existing tests retain incomplete-category fanout, deduplication, responsive limits and lightbox behavior.

## Public cursor fetch boundary

- `getGroupReleaseImages` now uses a token-free `fetch(..., {cache: 'no-store'})`, matching the already-public release aggregate and the requirement that gallery availability not depend on login state.
- URL, query serialization, response DTO, non-2xx parsing, and `ApiError` behavior are unchanged.
- Backend ownership and visibility remain authoritative: the endpoint still validates the concrete anime/group/release-version combination and returns only public, approved, ready `release_version_media` rows.
- Removing auth preflight does not broaden backend data visibility and avoids sending credentials to a public read. `no-store` prevents shared or browser cache reuse of cursor responses.
- No upload, mutation, episode-media, release-level legacy media, entitlement, or stream seam changed.

## Evidence

- Commits reviewed: `0610ae63`, `9f34f887`.
- Changed source/tests reviewed: `ReleaseNotesList.tsx`, `ReleaseNotesList.test.tsx`, `ReleaseGallery.tsx`, `ReleaseGallery.test.tsx`, `frontend/src/lib/api.ts`.
- Current focused tests and build are reported passing; existing hydration, 6/4/2 resize/expanded, cursor dedupe, lightbox and public ownership coverage remains intact.

## Review conclusion

`clean` — both live-UAT fixes implement the intended contract without introducing a new defect.
