# Phase 93: Projektrollen-Sichtbarkeit & Hinweis-Formular - Context

**Gathered:** 2026-06-29
**Status:** Blocked before UI execution
**Source:** GSD-Auftrag attachment and reference prototype `C:/Users/admin/Downloads/team4s-meine-projekte-rollen-hinweis-vorschlag.html`

<domain>
## Phase Boundary

This phase targets the member-facing `/me/contributions` surface:

- The "Bestätigte Projektrollen" anime card should expand with a separate chevron control, not by replacing the entry-count button text with "Schließen".
- The expanded role area should show each confirmed role as its own row, with "Für das gesamte Projekt" for anime-wide contributions.
- Role visibility should use a Team4s-styled segmented control ("Profil" / "Intern") instead of a native browser dropdown.
- The hint text under the visibility control must be factually correct.
- The "Hinweis senden" form should keep group selection scoped to the member's own verified groups, visually de-emphasize the unavailable release-version option, and show a group/project breadcrumb once both are selected.

No release-version-specific hint flow is in scope.
</domain>

<decisions>
## Implementation Decisions

### D-01 Teil A ordering
- Teil A must run before any UI implementation.
- If either gray-area check differs from the expected behavior, implementation stops and product discussion with Christof is required.

### D-02 Group scoping result
- Verified expected behavior: `ProposalForm` receives `ownGroups` from `/api/v1/me/memberships` via `getMyMemberships()`.
- The dropdown value is `fansub_group_member_id`; submit derives `fansub_group_id` from the selected membership row.
- Backend membership listing reads `hist_fansub_group_members` for the resolved verified member.
- Backend submit ownership checks `fansub_group_member_id` belongs to the submitting member and to the submitted `fansub_group_id`.
- Result: only the member's own verified groups are selectable and accepted.

### D-03 Visibility result
- Expected behavior not confirmed.
- The member visibility mutation updates only `anime_contributions.is_public_on_member_profile`.
- Public member role timeline reads public anime contributions by `ac.is_public_on_member_profile = true` and includes `ac.note AS notes`, so the role plus contribution note are controlled together.
- Release-version media and project media are not controlled by this flag. Public release media uses `release_version_media` joined through `media_assets`, gated by `media_assets.status = 'ready'`, `visibilities.name = 'public'`, and `review_statuses.code = 'approved'`.
- Result: a help text claiming "Rolle sowie deine Notizen und Bilder..." would overstate current behavior.

### D-04 Stop condition
- Product code was not changed because Teil A Punkt 2 failed the expected behavior.
- Next action is a product decision: either narrow the UI copy to role + contribution note only, or define/implement a real shared visibility contract for project media.
</decisions>

<canonical_refs>
## Canonical References

### Project Rules
- `AGENTS.md` - Team4s domain, UI, auth/API, and validation rules.
- `docs/engineering/implementation-contract.md` - reuse and contract gates.
- `docs/frontend/ui-system.md` - global UI components and variants.
- `docs/agent-guidelines-ui.md` - semantic UI control mapping.
- `docs/api/api-contracts.md` - API/DTO/contract discipline.
- `docs/frontend/auth-api-client.md` - protected browser API boundary.
- `docs/architecture/db-schema-fansub-domain.md` - fansub/release/media ownership rules.

### Existing Implementation Seams
- `frontend/src/app/me/contributions/page.tsx` - page data loading and auth session gating.
- `frontend/src/components/contributions/MyContributionsSection.tsx` - confirmed contribution section.
- `frontend/src/components/contributions/AnimeGroupCard.tsx` - grouped anime/project-role card.
- `frontend/src/components/contributions/VisibilityDropdown.tsx` - current native visibility select.
- `frontend/src/components/contributions/ProposalForm.tsx` - Hinweis form.
- `frontend/src/components/contributions/contributions.module.css` - existing local styles.
- `frontend/src/components/ui` - reusable Team4s UI primitives.
- `frontend/src/lib/api.ts` - `getMyAnimeContributions`, `getMyMemberships`, `patchAnimeContributionVisibility`, `createContributionProposal`.
- `frontend/src/types/contributions.ts` - member contribution DTOs.
- `backend/internal/handlers/contribution_proposals_me_handler.go` - membership listing and proposal submission ownership checks.
- `backend/internal/handlers/contributions_me_handler.go` - visibility mutation.
- `backend/internal/repository/anime_contributions_public_repository.go` - public member role timeline and notes visibility.
- `backend/internal/repository/group_release_media_repository.go` - public release-version media visibility gates.
- `backend/internal/repository/member_profile_repository.go` - recent media projection.
</canonical_refs>

<specifics>
## Reference Prototype Notes

The supplied HTML prototype shows the intended UI direction:

- Anime card keeps "Projekt öffnen" separate from a square chevron disclosure.
- Role chips remain visible while expanded details show one row per role.
- Visibility control is segmented ("Profil" / "Intern").
- "Bestimmte Folge" is smaller and marked "Bald verfügbar".
- Breadcrumb trail appears after group and anime are selected.
</specifics>

<deferred>
## Deferred Ideas

- UI implementation requirements 1-7 are deferred until the visibility wording/product behavior is decided.
- No release-version-specific hint option is implemented in this phase.
</deferred>

---

*Phase: 93-projektrollen-sichtbarkeit-hinweis-formular*
*Context gathered: 2026-06-29 via Auftrag verification*
