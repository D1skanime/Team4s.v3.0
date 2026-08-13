---
phase: 27
verified: "2026-04-28"
status: verified_with_notes
score: 4/5
re_verification: false
---

# Phase 27 Verification Report

## Automated Checks

- `cd backend && go test ./internal/repository -run 'DeleteAnimeSource|SegmentLibrary' -count=1` passed on 2026-04-28.
- `cd backend && go test ./internal/handlers -count=1` passed on 2026-04-28.
- `cd backend && go build ./...` passed on 2026-04-28.
- `cd frontend && npm.cmd run build` passed on 2026-04-28.
- `docker compose up -d --build team4sv30-backend team4sv30-frontend` passed on 2026-04-28.

## Live UAT

Scenario run on 2026-04-28 against the local Docker stack:

1. Seed anime `8` (`11eyes-phase27-a`) created with AniSearch link `anisearch:5468`.
2. Theme `OP / 11 eyes B-SH` and segment `7` created for fansub group `94`, version `v1`.
3. Segment asset upload succeeded:
   - `source_ref = segments/anime_8/group_94/v1/op/theme_video_1777168847456_ba4f4e1590317549.mp4`
4. Seed anime `8` deleted after the new detach path was fixed.
5. Recreated anime `11` (`11eyes-phase27-b`) with the same AniSearch identity `5468`.
6. Recreated the matching theme/segment on anime `11`.
7. Library candidate lookup succeeded:
   - `GET /api/v1/admin/anime/11/segments/library-candidates?group_id=94&kind=op&name=11%20eyes%20B-SH`
   - returned `candidate_count = 1`
8. Library attach succeeded:
   - segment `8` on anime `11`
   - `library_attach_source = reuse_attach`
   - `library_anime_source_provider = anisearch`
   - `library_anime_source_external_id = 5468`
9. Preserved file still exists on disk:
   - `C:\Users\admin\Documents\Team4s\media\segments\anime_8\group_94\v1\op\theme_video_1777168847456_ba4f4e1590317549.mp4`

## Verified Outcomes

- Stable reusable identity is anchored on `AniSearch + fansub_group_id + segment kind/name`.
- Anime delete now preserves reusable segment-library definitions/assets and detaches the old local assignment.
- Recreated anime with the same AniSearch ID can rediscover prior OP assets through the new library endpoint.
- Reuse attach writes provenance back onto the local segment row (`library_*` fields) so the editor can distinguish reused assets.

## Notes / Gaps

- The first runtime migration check was inconsistent: migration `52` showed as applied, but the `segment_library_*` tables were missing until `0052_segment_library_identity.up.sql` was applied directly against Postgres. This needs a follow-up audit of migration bookkeeping/runtime paths.
- Two live fixes were required during verification:
  - avoid `conn busy` in delete mirroring by buffering rows before nested upserts
  - explicitly detach assignment rows before `DELETE FROM anime` instead of relying only on FK `SET NULL`

## Final Status

- Functional Phase-27 flow: verified.
- Operational migration bookkeeping: follow-up still needed.
