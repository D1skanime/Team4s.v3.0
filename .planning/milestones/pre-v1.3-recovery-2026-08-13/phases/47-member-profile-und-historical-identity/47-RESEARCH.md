# Phase 47: Member Profile & Historical Identity - Research

**Researched:** 2026-05-13
**Domain:** Team4s historical member identity, app-user/profile separation, media-backed avatars, read-only archival credits
**Confidence:** Medium; there are strong visible historical member/profile seams, but the newer app-user/current-user runtime seam is still not clearly exposed in the current branch

---

## Existing Team4s Seams

### 1. The visible schema already has a historical `members` profile shape

Current migrations visibly define:
- `members`
- `group_members`
- `avatar_media_id`

This is important because it suggests Team4s already had a member-profile concept in the historical/archive domain.

Implication:
- Phase 47 should inspect whether that seam can be reused or bridged rather than inventing a second profile table blindly

### 2. `member_group_stories` is a strong reuse candidate for the personal fansub story

The codebase already contains:
- `member_group_stories`
- TipTap upgrades for that table
- repository code for working with those stories

Implication:
- the personal “member story” should reuse this seam if it can be made to fit the MVP profile UX
- Phase 47 should avoid inventing another unrelated rich-text table for the same concept unless the existing one is structurally incompatible

### 3. Historical credits already exist, but they are archive data, not permissions

Visible archival seams include:
- `release_member_roles`
- `member_anime_notes`
- `member_episode_notes`

Implication:
- these are good candidates for read-only profile context
- they must stay explicitly separate from any app-permission model introduced in Phases 44-46

### 4. Avatar/media infrastructure already exists

The repo already has:
- `media_assets`
- `media_files`
- upload service patterns
- media type support including `avatar`

Implication:
- Phase 47 should reuse the existing media architecture for avatar upload
- do not create a one-off profile image storage path

### 5. The visible admin surface still anchors “member” work inside fansub admin pages

The visible fansub admin pages currently expose:
- `Members verwalten` links from fansub list/create/edit surfaces
- a dedicated `/admin/fansubs/[id]/members` page

Implication:
- Phase 47 should deliberately separate:
  - group membership administration
  - personal profile administration
- the fansub edit page should stop implying that group-member management is personal profile editing

### 6. The runtime app-user/profile seam still needs validation before implementation

Even though the planning chain expects:
- `app_users`
- CurrentUser from Keycloak
- app-user-based group membership

the currently open branch still does not clearly show those runtime seams.

Implication:
- Phase 47 must start with a hard seam-validation pass
- if the execution branch still lacks the app-user/current-user seam, the profile phase cannot safely complete

---

## Architecture Recommendation

### Recommendation 1: Separate Keycloak account data from Team4s historical identity data at the contract level

The profile response and update contract should make this separation obvious:
- email: read-only
- keycloak subject: read-only
- password/MFA: out of scope
- fansub name, display name, bio, story, active time, visibility: editable in Team4s

This reduces future confusion and keeps the UI honest.

### Recommendation 2: Prefer extending an existing member/profile table over creating a brand-new profile table

Because visible schema already includes `members` with `avatar_media_id`, the first design question should be:
- can the profile MVP live on that seam?

If yes:
- extend it minimally for missing fields like visibility or active dates

If no:
- document exactly why
- add only the smallest bridge or profile table needed

### Recommendation 3: Use one profile read model that merges multiple archival sources

The profile page likely needs a composed read model:
- identity/profile fields
- group memberships and roles
- member story
- historical credits

This does not mean one table.
It means one backend DTO built from existing sources.

### Recommendation 4: Treat historical credits as read-only enrichment

The phase brief allows those sections to be prepared or partially shown.

Good MVP compromise:
- return a read-only list if repository joins are already straightforward
- otherwise add a placeholder section plus documented follow-up

Avoid:
- building a large new contributor-credit authoring system inside this phase

### Recommendation 5: Avatar upload should reuse existing upload/media policy end-to-end

Use the current media/upload seams for:
- type validation
- file-size limits
- media asset creation
- variant/file handling

The profile should only store a reference such as `avatar_media_asset_id`.

### Recommendation 6: Capabilities for own profile can stay intentionally small

The phase brief allows auth-only semantics for own profile, but capability fields can still be useful.

Reasonable MVP set:
- `canViewOwnProfile`
- `canEditOwnProfile`
- `canUploadOwnAvatar`
- `canOpenKeycloakAccount`
- `canViewMemberships`
- `canViewHistoricalCredits`

For admin-viewing of others:
- `canViewProfile`
- `canEditProfile`

### Recommendation 7: The fansub edit page should shift from “edit member” to “view profile”

Where a group/member relation is shown inside a fansub-admin context, it should expose:
- role(s) in this group
- status
- maybe active period
- link to the member profile

Not:
- direct personal-profile editing inline in the group page

---

## Recommended Backend Surface

### Core own-profile endpoints

- `GET /api/me/profile`
- `PUT /api/me/profile`
- `POST /api/me/profile/avatar`

### Optional admin profile endpoints

- `GET /api/admin/profiles/:id`
- `PUT /api/admin/profiles/:id`

Only if the execution branch already has a clean app-user/profile identifier seam for that.

### Read-only enrichment

- memberships and roles from the canonical group-membership source
- historical credit aggregation from existing archive tables where practical

---

## Error and Status Semantics

Recommended behavior:
- `401` when unauthenticated
- `403` when authenticated but trying to edit a profile not allowed by the current seam
- `404` when an admin-target profile does not exist
- `409` only for true business conflicts if they arise
- `422` or `400` for invalid profile payloads or unsupported avatar input, depending on project convention

Important:
- attempts to change email or keycloak subject through Team4s should be rejected clearly, not silently ignored

---

## Testing Recommendation

Backend tests should cover at least:
- authenticated user can read own profile
- authenticated user can update own profile
- user cannot update another profile
- disabled user cannot update profile
- email cannot be changed through Team4s
- keycloak subject cannot be changed through Team4s
- avatar upload works for own profile
- invalid avatar file types are rejected
- memberships are present in profile output
- historical credits do not grant app rights
- `platform_admin` can read/edit another profile if that path is implemented

Frontend tests should cover:
- own profile page loads and saves profile data
- Keycloak account button respects configuration
- profile edit controls are not exposed through the fansub edit page anymore
- avatar flow and error handling are scoped and understandable

---

## Risks

### Biggest modeling risk: confusion between `app_users`, `users`, and `members`

If the implementation guesses the wrong owner table:
- profile data may attach to the wrong identity seam
- group membership and profile identity may drift apart

Mitigation:
- hard pre-analysis gate
- explicit reuse decision documented in the final implementation report

### Biggest archive risk: mixing profile story with group-scoped story incorrectly

If `member_group_stories` is reused naively:
- profile story may become group-specific when the intended UX is personal/global

Mitigation:
- inspect whether one story per member or one per member-group fits the MVP
- if not, add the smallest compatible extension instead of pretending the semantics already match

### Biggest UX risk: still editing personal identity from the wrong page

If the fansub edit page keeps acting like a profile editor:
- boundaries between group admin and personal identity stay muddy

Mitigation:
- move profile editing to a dedicated route
- leave only contextual profile links in group-admin surfaces

---

## Recommended Plan Shape

1. Pre-analysis and profile data model decision
2. Backend own-profile, avatar, memberships, and optional admin profile endpoints
3. Thin frontend profile page and fansub-edit cleanup
4. Tests, docs, verification, and Phase-48 handoff
