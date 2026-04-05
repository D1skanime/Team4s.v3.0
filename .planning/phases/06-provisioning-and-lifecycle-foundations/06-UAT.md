---
phase: 06
slug: provisioning-and-lifecycle-foundations
status: passed
verified_on: 2026-04-03
---

# Phase 06 UAT

## Verdict

**PASS**

Phase 06 was re-tested through the real browser flow after fixing the remaining integration gaps between manual create/edit, the V2 media seam, and delete cleanup.

## Completed Checks

1. Manual anime create uploads the cover into the canonical anime media tree.
2. Re-upload on the edit screen reuses the existing anime folder structure instead of falling back to `frontend/public/covers`.
3. `Cover entfernen` removes the poster link and concrete asset payload while keeping the reusable folder skeleton.
4. Invalid upload attempts surface a clear operator-facing error instead of silently failing.
5. Full anime delete removes the anime, associated media ownership, and the current run's canonical `media/anime/{id}` tree.

## Bugs Found And Closed During UAT

- Manual create initially still used the old `frontend/public/covers` path before switching to the V2 upload seam.
- Edit re-upload initially still used the legacy `/api/admin/upload-cover` path.
- `Cover entfernen` initially cleared only visible legacy state and left V2 media rows plus files behind.
- Anime delete initially removed the anime row but left V2 media rows and filesystem artifacts behind in the hybrid schema state.

## Notes

- Historical test debris from earlier broken runs was cleaned after the successful retest.
- The current verified scope remains anime-first and non-Jellyfin manual upload/edit/delete behavior.

