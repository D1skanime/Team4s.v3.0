# Phase 57: Profil-Aktivzeitraum als jahrbegrenzte Datumsfelder - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning
**Source:** User request via `$day-start` then `$gsd-plan-phase`

<domain>
## Phase Boundary

The `/me/profile` activity period currently uses year-shaped fields:

- DB: `members.active_from_year INTEGER`, `members.active_until_year INTEGER`, `members.is_currently_active BOOLEAN`
- Backend/API: `active_from_year`, `active_until_year`, `is_currently_active`
- Frontend UI: `ProfileBasicsForm` renders numeric inputs labelled `Aktiv seit` and `Aktiv bis`

The requested change is narrow:

- Replace the persisted profile activity period with date-backed fields in the DB.
- Keep the user-facing control limited to year precision for "von wann bis wann aktiv in der Fansub-Szene".
- Keep `/me/profile` protected UI behavior, Keycloak account refresh, profile story, avatar upload, memberships, and credits unchanged.

</domain>

<decisions>
## Implementation Decisions

### D-01 Date Persistence
- `members` needs real `DATE` columns for the own-profile activity period. The plan should prefer additive `active_from_date` and `active_until_date` columns over editing historical migrations.

### D-02 Year-Only Semantics
- Users choose years only. Runtime may normalize selected years to `YYYY-01-01` in `DATE` columns, but month/day are not user-editable profile data in this slice.

### D-03 Backward Compatibility
- Existing integer years must be backfilled into the new date columns. Old `active_from_year` and `active_until_year` may stay temporarily as compatibility/deprecated fields if dropping them would create destructive migration risk.

### D-04 Contract Alignment
- Backend models, handler request parsing, repository SQL, OpenAPI, frontend DTOs, and `/me/profile` request payloads must move together. UI code must not infer undocumented date fields from ad hoc fetch responses.

### D-05 Auth Boundary
- `/me/profile` must continue gating on `hasAccessToken || hasRefreshToken` and use `getOwnProfile`/`updateOwnProfile` through the central API client. No direct token reads, no local bearer construction.

### D-06 German UI Text
- New or changed user-facing German strings must use proper umlauts.

### Out of Scope
- Public profile redesign.
- Membership period fields (`joined_year`, `left_year`).
- Account data / Keycloak fields.
- Avatar/cropper/media upload flows.
- Profile story TipTap persistence.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Rules
- `AGENTS.md` - project hard rules, UI text umlauts, validation expectations.
- `docs/engineering/implementation-contract.md` - search-first and contract-alignment rules.
- `docs/api/api-contracts.md` - OpenAPI/backend/frontend contract workflow.
- `docs/frontend/auth-api-client.md` - protected browser UI and central API boundary.
- `docs/frontend/ui-system.md` - global form and control primitives.
- `docs/agent-guidelines-ui.md` - persisted field to semantic control mapping.

### Existing Profile Contract
- `database/migrations/0077_member_profiles_mvp.up.sql` - current active year columns and constraints.
- `database/migrations/0078_member_profile_story_tiptap.up.sql` - latest profile migration number.
- `backend/internal/models/member_profile.go` - current profile DTO and update input.
- `backend/internal/handlers/app_profile.go` - `GET/PUT /api/v1/me/profile` handler.
- `backend/internal/repository/member_profile_repository.go` - source of profile reads/writes.
- `shared/contracts/openapi.yaml` - canonical cross-surface profile contract.
- `frontend/src/types/profile.ts` - frontend profile DTO.
- `frontend/src/lib/api.ts` - `getOwnProfile` and `updateOwnProfile` helpers.
- `frontend/src/app/me/profile/page.tsx` - own-profile form state and save flow.
- `frontend/src/app/me/profile/components/ProfileBasicsForm.tsx` - current activity-period controls.
- `frontend/src/app/me/profile/page.test.tsx` - focused profile UI/auth/dirty-state tests.

</canonical_refs>

<specifics>
## Specific Requirements

- Add new date-backed profile activity fields, likely `active_from_date` and `active_until_date`.
- Backfill `active_from_year=2016` to `active_from_date='2016-01-01'` and equivalent for `active_until_year`.
- Enforce `active_until_date >= active_from_date` when both are present.
- Enforce or validate year-only normalized dates so the DB/API does not quietly accept arbitrary month/day values.
- Frontend should display only the year and send normalized date values.
- When `is_currently_active=true`, `active_until_date` should be sent as `null` and the UI should disable the "Aktiv bis" year selector.

</specifics>

<deferred>
## Deferred Ideas

- Dropping old `active_from_year` / `active_until_year` after runtime migration is proven.
- Month/year or exact-date activity periods.
- Public profile rendering of activity ranges.
- Membership-level active periods.

</deferred>

---

*Phase: 57-profil-aktivzeitraum-als-jahrbegrenzte-datumsfelder*
*Context gathered: 2026-05-29*
