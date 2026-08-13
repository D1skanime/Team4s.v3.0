# Phase 59 Deferred Items

## Public profile media deep links

**Problem**

The public member profile shows `recent_media` thumbnails, but there is no stable public target route yet for a visitor who clicks one of those media items. A fake link would be misleading and could silently drift from the later domain contract.

**Deferred target**

Add real media-card links once a public release/anime/fansub context route exists. The link target should come from the backend contract, not from frontend URL guessing.

Likely contract shape:

- `recent_media[].target_url` or structured target fields
- media target context: `anime_id`, `fansub_group_id`, `release_id` and/or `release_version_id`
- public thumbnail/title/date/type fields suitable for a visitor-facing activity/media card

**Relevant files**

- `frontend/src/components/profile/RecentMediaSection.tsx`
- `frontend/src/types/profile.ts`
- `backend/internal/repository/member_profile_repository.go`
- `shared/contracts/openapi.yaml`

**Non-goal for current polish**

Do not add dummy links or disabled buttons to public profile media cards.
