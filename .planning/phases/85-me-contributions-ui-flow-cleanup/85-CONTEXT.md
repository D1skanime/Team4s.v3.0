# Phase 85: `/me/contributions` UI-/Flow-Cleanup - Context

**Gathered:** 2026-06-15
**Status:** Ready for planning
**Source:** Review synthesis from `/me/contributions` UI/architecture review on 2026-06-15.

<domain>
## Phase Boundary

`/me/contributions` is already functionally wired as the signed-in member's contribution dashboard. This phase tightens the surface so it feels like a Team4s-native member workspace instead of a phase/UAT accumulation surface:

- keep the existing contribution backend contracts and ownership model;
- improve desktop/mobile usability of the page and modal flows;
- remove Claim as a prominent action from the contribution proposal UI while preserving Claim as the verified-member identity precondition;
- reduce Phase/UAT/Lock commentary in runtime UI code to durable domain comments only;
- align persisted controls with the global UI system.

**In Scope:**
- `/me/contributions` page structure and header/CTA polish.
- `ContributionInbox`, `ContributionSummary`, `MyContributionsSection`, `MyProposalsSection`, `ContributionCard`, `VisibilityDropdown`, `ReportModal`, `ProposalForm`, `RejectReasonModal` only where needed for this cleanup.
- Global `Modal` accessibility hardening if required by contribution modals.
- Tests for contribution flows, modal accessibility behavior, and AppShell reachability.
- Contract/read-only checks to prove no Claim mutation or new Contribution API contract is introduced.

**Out of Scope:**
- New database tables or migrations.
- New contribution status semantics.
- New Claim-management UX.
- Reworking admin leader review queues.
- Building the deferred release-version proposal flow. This phase may make the disabled/deferred state honest, but does not implement release-version contribution submission.
- Visual redesign of the wider AppShell or public profile pages.

</domain>

<decisions>
## Implementation Decisions

### Product Scope
- **D-01:** `/me/contributions` is a contribution/member-workspace surface, not a global report center. The primary path should be "Mitwirkung vorschlagen" / contribution correction; generic suggestions may remain reachable only if the UI makes them secondary and does not obscure the contribution task.
- **D-02:** Claim remains a separate identity/account flow. A verified member claim may be required before a user can submit contributions, but Claim actions must not be presented as a peer choice inside the contribution proposal/report type picker. Link to `/me/profile` or the existing Claim route only from an empty/blocked identity state if needed.
- **D-03:** No UI or code in this phase may call Claim APIs from contribution components. Existing Claim-management components remain under their current owner routes.

### Team4s Domain Rules
- **D-04:** The existing contribution data model stays canonical: `anime_contributions`, `anime_contribution_roles`, `hist_fansub_group_members`, `fansub_group_members`, `members`, and existing `/api/v1/me/*contribution*` helpers. Do not add parallel contribution tables, request DTOs, or ad hoc protected `fetch`.
- **D-05:** Release-version-scoped contribution proposals remain blocked until there is a real release-version selector and backend contract. The UI should not invite users into a dead selectable path; use a disabled option, explicit "Noch nicht verfuegbar" state, or contextual link to existing release workspace instead.
- **D-06:** Do not attach release-version work as anime-wide contribution data. If `release_version_id` is absent, the proposal is anime/project-wide by definition.

### UI/UX
- **D-07:** The page header must use the global UI system (`PageHeader` or equivalent CSS class using global tokens), with mobile-safe wrapping and a full-width primary CTA on small screens.
- **D-08:** Contribution modals must be keyboard-accessible: Escape closes, focus is trapped while open, initial focus is predictable, and focus returns to the opener on close. Prefer improving the global `Modal` once instead of patching individual modals.
- **D-09:** Year fields in `ProposalForm` must use the existing constrained year control from `@/components/ui` if present, not raw `type="number"` inputs.
- **D-10:** Hard-coded colors and inline layout styles in contribution components should be moved to CSS modules or global token usage where touched. Do not do a broad visual redesign.
- **D-11:** Mobile suitability means: no horizontal scroll at 375px, action rows wrap cleanly, modal body/footer remain usable on small screens, and long filter-chip rows stay readable.

### Code Hygiene
- **D-12:** Remove or compress phase/UAT/Lock comments in touched runtime UI files when they do not explain a durable domain invariant. Tests/contracts may keep explicit regression names.
- **D-13:** Keep German UI text with correct umlauts in user-facing strings.
- **D-14:** Existing tests should be extended rather than replaced. Keep changes scoped to `/me/contributions`, shared `Modal`, and directly reused UI primitives.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Rules
- `AGENTS.md` - Team4s domain, auth, UI, validation, and output rules.
- `docs/engineering/implementation-contract.md` - reuse/search-first and no parallel seams.
- `docs/frontend/ui-system.md` - global UI primitives and token rules.
- `docs/agent-guidelines-ui.md` - persisted field semantic controls and UI implementation rules.
- `docs/frontend/auth-api-client.md` - protected browser UI must use central auth/API client.
- `docs/api/api-contracts.md` - contract alignment for any endpoint/helper/DTO changes.
- `docs/architecture/db-schema-fansub-domain.md` - contribution, claim, release, and media ownership rules.

### Existing Contribution Surface
- `frontend/src/app/me/contributions/page.tsx` - page composition, auth gate, data load, filtering, overlays.
- `frontend/src/components/layout/AppShell.tsx` - "Meine Beiträge" navigation and mobile drawer focus pattern.
- `frontend/src/components/contributions/ContributionInbox.tsx` - open contribution actions.
- `frontend/src/components/contributions/ContributionSummary.tsx` - filter chips.
- `frontend/src/components/contributions/MyContributionsSection.tsx` - confirmed contributions.
- `frontend/src/components/contributions/MyProposalsSection.tsx` - own proposals, self-publish surface.
- `frontend/src/components/contributions/ContributionCard.tsx` - repeated contribution item.
- `frontend/src/components/contributions/VisibilityDropdown.tsx` - profile visibility mutation UI.
- `frontend/src/components/contributions/ReportModal.tsx` - suggestion type picker and sub-form routing.
- `frontend/src/components/contributions/ProposalForm.tsx` - member contribution proposal flow.
- `frontend/src/components/contributions/RejectReasonModal.tsx` - reject-with-reason flow.
- `frontend/src/components/contributions/contributions.module.css` - local contribution layout.

### Global UI Reuse
- `frontend/src/components/ui/Modal.tsx` - global modal shell to harden.
- `frontend/src/components/ui/Drawer.tsx` - compare overlay/focus behavior where useful.
- `frontend/src/components/ui/Button.tsx`, `PageHeader.tsx`, `SectionHeader.tsx`, `FormField.tsx`, `Select.tsx`, `Input.tsx`, `YearPicker.tsx` if present - reuse before adding local controls.
- `frontend/src/components/media/crop/mediaCropA11y.ts` - existing `getFocusableElements` helper reused by AppShell drawer.

### Frontend API/DTO Contracts
- `frontend/src/lib/api.ts` - `getMyAnimeContributions`, `patchAnimeContributionVisibility`, `confirmAnimeContribution`, `rejectAnimeContributionWithReason`, `submitSuggestion`, `createContributionProposal`, `selfPublishContribution`, `getMyMemberships`.
- `frontend/src/types/contributions.ts` - `MeAnimeContribution`, `ProposalFormData`, `MembershipEntry`, suggestion DTOs.
- `shared/contracts/openapi.yaml` - `/api/v1/me/contribution-proposals`, `/api/v1/me/anime-contributions/{id}/reject`, `/api/v1/me/suggestions`; especially Lock H text: suggestions do not write `anime_contributions` or `member_claims`.
- `shared/contracts/contributions.yaml` - focused contribution proposal/review contract.

### Backend Verification References
- `backend/internal/handlers/contributions_me_handler.go` - verified-member resolution, ownership checks, visibility/confirm/reject handlers.
- `backend/internal/handlers/contribution_proposals_me_handler.go` - proposal security chain and release-version participation guard.
- `backend/internal/handlers/contribution_review_handler.go` - leader review path, not a `/me` UI owner.
- `backend/internal/repository/anime_contributions_proposal_repository.go` - proposal persistence/self-publish behavior.
- `backend/internal/repository/anime_contributions_reject_repository.go` - member rejection reason persistence.

### Existing Tests To Extend
- `frontend/src/components/contributions/ContributionCard.test.tsx`
- `frontend/src/components/contributions/ContributionInbox.test.tsx`
- `frontend/src/components/contributions/ContributionSummary.test.tsx`
- `frontend/src/components/contributions/ProposalForm.test.tsx`
- `frontend/src/components/contributions/ReportModal.test.tsx`
- `frontend/src/components/contributions/reportTargets.test.ts`
- `frontend/src/components/layout/AppShell.test.tsx`

</canonical_refs>

<code_context>
## Existing Code Insights

- `page.tsx` already gates on `hasAccessToken || hasRefreshToken` and uses central API helpers. Preserve this boundary.
- `getMyMemberships()` failure currently degrades to an empty `ownGroups` list. This is acceptable if the UI explains the blocked proposal action clearly.
- Contribution filtering is client-side from the loaded array; this phase should not add a second server query for filters.
- `ReportModal` currently exposes five choices, including Claim. This is the main product-fit problem, not a data ownership bug.
- `ProposalForm` already blocks release-version proposals before submission. This is domain-safe but UX-rough because the option is selectable.
- Global `Modal` has role/overlay/close button but lacks the focus behavior already implemented in `AppShell` for the navigation drawer.
- Relevant contribution tests are green at baseline; lint has unrelated existing failures outside this surface.

</code_context>

<specifics>
## Specific Ideas

- Convert the top of `/me/contributions` to `PageHeader` with actions:
  - primary: "Mitwirkung vorschlagen";
  - secondary, if kept: "Fehler melden" or "Vorschlag/Meldung" as a quieter action.
- Remove "Profil beanspruchen" from `SUGGESTION_TYPES` in `ReportModal`; use a blocked state near "Mitwirkung vorschlagen" when `ownGroups.length === 0`, pointing to the existing profile/claim route only as account setup.
- In `ProposalForm`, render "Bestimmte Folgen / Release-Version" as disabled/unavailable copy, not an active selectable button that disables submit after selection.
- Reuse `YearPicker` for "Von Jahr" and "Bis Jahr"; if the global component API does not support this exact form yet, add the smallest compatible wrapper rather than raw number inputs.
- Add modal a11y tests at the global `Modal` level instead of duplicating per contribution modal.
- Keep one plan. This is a single cleanup slice, not a backend feature phase.

</specifics>

<deferred>
## Deferred Ideas

- Real release-version contribution proposal flow with concrete `release_version_id` selector.
- Dedicated global suggestion center outside `/me/contributions`.
- Claim-management UX improvements under `/me/profile` or group member management.
- Wider AppShell redesign.

</deferred>

---

*Phase: 85-me-contributions-ui-flow-cleanup*
*Context gathered: 2026-06-15*
