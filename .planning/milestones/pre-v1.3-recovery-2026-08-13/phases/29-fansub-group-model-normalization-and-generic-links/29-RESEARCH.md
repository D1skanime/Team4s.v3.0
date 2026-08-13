# Phase 29 Research: Fansub Group Model Normalization And Generic Links

## Objective

Plan Phase 29 so fansub administration moves onto one canonical group profile model, generic `fansub_group_links` become the long-term link seam, collaboration membership becomes explicitly manageable, and legacy duplicate fields gain a safe cleanup boundary.

## Current Code/DB Reality

### Database reality

The local DB currently exposes these relevant fansub tables:

- `fansub_groups`
- `fansub_group_aliases`
- `fansub_members`
- `fansub_collaboration_members`
- `fansub_group_links`
- `fansub_group_media`

The key column split inside `fansub_groups` is:

- profile fields: `slug`, `name`, `description`, `history`, `status`, `group_type`, `country`
- year fields: `founded_year`, `dissolved_year`
- media fields: `logo_id`, `banner_id`, `logo_url`, `banner_url`
- fixed link columns: `website_url`, `discord_url`, `irc_url`
- compatibility/legacy-looking extras: `closed_year`, `history_description`

The DB already contains the generic link model the product wants:

- table: `fansub_group_links`
- columns: `group_id`, `link_type`, `name`, `url`, `created_at`
- check constraint values: `website`, `discord`, `twitter`, `github`, `irc`

It also still contains one obvious reconcile leftover:

- `fansub_group_aliases` has both `fansub_group_id` and `group_id`

### Backend reality

`backend/internal/repository/fansub_repository.go` still reads and writes fansub groups through fixed columns:

- `website_url`
- `discord_url`
- `irc_url`
- plus the profile/media fields

There is currently no generic repository CRUD for `fansub_group_links`.

`backend/internal/handlers/fansub_requests.go` also only defines fixed link request fields:

- `WebsiteURL`
- `DiscordURL`
- `IrcURL`

`backend/cmd/server/admin_routes.go` registers:

- create/update/delete fansubs
- alias CRUD
- member CRUD
- merge preview/merge

but no generic fansub-link CRUD routes.

### Collaboration reality

The collaboration-member backend is more mature than the normal fansub UI suggests:

- `backend/internal/handlers/fansub_collaborations.go`
  - `ListCollaborationMembers`
  - `AddCollaborationMember`
  - `RemoveCollaborationMember`
- `backend/internal/repository/fansub_repository.go`
  - `ListCollaborationMembers`
  - `AddCollaborationMember`
  - `RemoveCollaborationMember`

Important product fact:

- collaboration persistence already exists
- explicit collaboration-member administration is still mostly missing from the admin edit surface

### Frontend reality

`frontend/src/types/fansub.ts` still models the fixed link fields directly on `FansubGroup` and on create/patch request payloads:

- `website_url`
- `discord_url`
- `irc_url`

No generic `links` collection exists yet in the frontend type contract.

`frontend/src/app/admin/fansubs/create/page.tsx` currently renders fixed inputs for:

- Website URL
- Discord URL
- IRC URL

`frontend/src/app/admin/fansubs/[id]/edit/page.tsx` does the same and maps those fixed values into the form state and patch payload.

That edit page already has:

- alias management
- media upload
- group type handling
- a stable multi-section structure

So the likely UI work is extension/replacement inside an existing page shell, not a fresh screen.

### API helper reality

`frontend/src/lib/api.ts` already contains:

- standard fansub CRUD helpers
- alias CRUD helpers
- collaboration-member helpers

but it does not yet contain generic fansub-link CRUD helpers.

This means the next seam is straightforward:

- add typed fansub-link helper functions
- wire them into the existing fansub create/edit pages

## Key Findings

### 1. The target link model already exists physically

This is the most important finding.
The project does not need a new schema concept for links.
It needs the API/frontend to start treating `fansub_group_links` as authoritative.

Planning implication:

- Phase 29 should promote the existing table
- not invent a third link storage layer

### 2. The CRUD contract is still fixed-column-first

Both backend and frontend currently treat three fixed link fields as the main product contract.

Planning implication:

- the first plan must change DTOs/routes/repository seams before the frontend can be considered truly migrated
- keeping old fields readable is fine, but keeping them as the only write path defeats the phase

### 3. Collaboration administration is a UI gap more than a data gap

The backend collaboration operations already exist.
What is missing is an explicit admin editing surface that makes them normal, visible, and trustworthy.

Planning implication:

- do not spend Phase 29 rediscovering collaboration data modeling
- spend it exposing and stabilizing collaboration-member admin in the edit flow

### 4. Cleanup must be boundary-first, not "drop-first"

The active code still reads fixed link columns and legacy-looking fansub fields.
That makes immediate hard deletion risky.

Planning implication:

- Phase 29 should first establish:
  - canonical write paths
  - compatibility read behavior
  - documented "transitional only" fields
- only then should cleanup migrations drop anything truly unused

## Recommended Canonical Shape

### Canonical fansub group core

Treat these as the long-term product-facing group profile:

- `slug`
- `name`
- `description`
- `history`
- `status`
- `group_type`
- `country`
- `founded_year`
- `dissolved_year`
- `logo_id`
- `banner_id`
- readable media URLs as response convenience only

### Canonical related collections

- aliases: `fansub_group_aliases`
- members: `fansub_members`
- collaboration members: `fansub_collaboration_members`
- community links: `fansub_group_links`

### Compatibility-only fields / cleanup targets

- `closed_year`
- `history_description`
- `fansub_group_aliases.group_id`
- fixed link columns as the long-term write contract

## Recommended Plan Shape

### Slice 1: backend + schema contract

Files that matter immediately:

- `backend/internal/models/fansub.go`
- `backend/internal/handlers/fansub_requests.go`
- `backend/internal/handlers/fansub_groups.go`
- `backend/internal/repository/fansub_repository.go`
- `backend/cmd/server/admin_routes.go`
- `frontend/src/types/fansub.ts`

Expected work:

- add generic link DTOs
- add repository CRUD for `fansub_group_links`
- register link endpoints
- keep compatibility projection for existing fixed fields if needed

### Slice 2: create/edit admin UX

Files that matter immediately:

- `frontend/src/lib/api.ts`
- `frontend/src/app/admin/fansubs/create/page.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css`

Expected work:

- replace fixed Website/Discord/IRC inputs with generic link rows
- support `website`, `discord`, `twitter`, `github`, `irc`
- add explicit collaboration-member section on the edit page

### Slice 3: cleanup boundary + verification

Files that matter immediately:

- `database/migrations/*`
- `backend/internal/repository/fansub_repository_test.go`
- repo handoff docs

Expected work:

- codify which fields remain compatibility-only
- drop only truly unused duplicate references if verified safe
- document the boundary clearly for the next slice

## Validation Architecture

### Automated checks needed

- `cd backend && go test ./internal/handlers ./internal/repository -count=1`
- `cd frontend && npm.cmd run build`
- `cd frontend && npx tsc --noEmit`

### Manual checks needed

- create one fansub with generic links including `github` or `twitter`
- edit an existing fansub and confirm generic links round-trip
- open a collaboration fansub and add/remove member groups explicitly
- confirm the ordinary `/admin/fansubs` list still behaves like a real-group list, not a mixed-all-entities dump

## Common Pitfalls

- building a second generic-link abstraction instead of using `fansub_group_links`
- dropping fixed columns before frontend/API callers are off them
- letting collaboration UI leak into the ordinary group-management flow without explicit boundaries
- accidentally making `history_description` or `closed_year` part of new business logic
- treating `logo_url` / `banner_url` as authoritative instead of `logo_id` / `banner_id`

## Don’t Hand-Roll

- do not invent a new JSON blob field for links
- do not create separate one-off `twitter_url` / `github_url` columns
- do not re-model collaborations as free-text tags
- do not hard-drop duplicate fansub fields before compatibility reads are proven unnecessary

## Code References

- `backend/cmd/server/admin_routes.go`
- `backend/internal/models/fansub.go`
- `backend/internal/handlers/fansub_requests.go`
- `backend/internal/handlers/fansub_groups.go`
- `backend/internal/handlers/fansub_collaborations.go`
- `backend/internal/repository/fansub_repository.go`
- `frontend/src/types/fansub.ts`
- `frontend/src/lib/api.ts`
- `frontend/src/app/admin/fansubs/create/page.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx`

## Bottom Line

Phase 29 is primarily a contract-consolidation and admin-surface normalization phase.

The real work is:

- moving links onto the already-existing generic DB model
- exposing collaboration-member administration where the product actually needs it
- freezing one canonical fansub profile contract
- and preventing transitional duplicate columns from remaining accidental product truth

If the phase starts with UI field reshuffling before the backend route/repository seam is explicit, it will preserve drift instead of resolving it.
