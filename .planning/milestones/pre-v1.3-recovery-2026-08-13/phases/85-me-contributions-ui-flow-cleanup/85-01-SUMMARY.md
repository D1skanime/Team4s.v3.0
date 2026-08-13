# Phase 85 Plan 01 Summary: `/me/contributions` UI-/Flow-Cleanup

**Status:** implemented
**Date:** 2026-06-17

## Changed Runtime Behavior

- The shared `Modal` now closes on Escape, traps Tab/Shift+Tab inside the panel, sets predictable initial focus, and returns focus to the opener on close.
- `/me/contributions` now uses the global `PageHeader` and CSS module layout instead of inline page/header styles.
- The primary CTA is now contribution-specific: `Mitwirkung vorschlagen`.
- `ReportModal` no longer exposes `Profil beanspruchen` / Claim as a peer option and no contribution component imports Claim API helpers.
- `ProposalForm` uses `YearPicker` for optional `Von Jahr` / `Bis Jahr` fields.
- Release-version-specific contribution work is shown as unavailable instead of selectable, and no `release_version_id` is emitted by the form.
- Users without a verified group membership now see a visible blocked-state explanation instead of only a disabled button.
- Touched contribution styles were moved into `contributions.module.css` with token-based panels, modal footer layouts, action grids, year fields, and dropdown status styles.

## Files Changed

- `frontend/src/components/ui/Modal.tsx`
- `frontend/src/components/ui/Modal.test.tsx`
- `frontend/src/app/me/contributions/page.tsx`
- `frontend/src/components/contributions/ReportModal.tsx`
- `frontend/src/components/contributions/ReportModal.test.tsx`
- `frontend/src/components/contributions/ProposalForm.tsx`
- `frontend/src/components/contributions/ProposalForm.test.tsx`
- `frontend/src/components/contributions/MyProposalsSection.tsx`
- `frontend/src/components/contributions/VisibilityDropdown.tsx`
- `frontend/src/components/contributions/contributions.module.css`

## Contract And Domain Notes

- No backend endpoint, DTO, OpenAPI contract, database schema, or Claim workflow was changed.
- Contribution UI still uses existing `frontend/src/lib/api.ts` helpers.
- `ReportModal` previously exposed Claim only as a link branch; it did not call Claim APIs. That branch is now removed from the contribution modal.
- Release-version-specific contribution proposals remain deferred until a real release-version selector and backend contract exist.

## Verification

- `rg -n 'claim|Claim|member_claim|verifyMemberClaim|rejectMemberClaim|listPendingMemberClaims' frontend/src/components/contributions frontend/src/app/me/contributions -S --glob '!*.test.tsx' --glob '!*.test.ts'`
  - Result: no runtime matches.
- `rg -n 'type="number"|release_version_id|Phase 76|D-0|Lock H' frontend/src/components/contributions/ProposalForm.tsx frontend/src/components/contributions/ReportModal.tsx frontend/src/app/me/contributions/page.tsx frontend/src/components/contributions/contributions.module.css -S`
  - Result: no matches.
- `cd frontend && npm test -- --run src/components/ui/Modal.test.tsx src/components/contributions/ContributionCard.test.tsx src/components/contributions/ContributionInbox.test.tsx src/components/contributions/ContributionSummary.test.tsx src/components/contributions/ProposalForm.test.tsx src/components/contributions/ReportModal.test.tsx src/components/contributions/reportTargets.test.ts src/components/layout/AppShell.test.tsx`
  - Result: passed, 8 files / 40 tests.
- `cd frontend && npm run typecheck`
  - Result: passed.
- `cd frontend && npx eslint src/app/me/contributions/page.tsx src/components/ui/Modal.tsx src/components/ui/Modal.test.tsx src/components/contributions/ReportModal.tsx src/components/contributions/ReportModal.test.tsx src/components/contributions/ProposalForm.tsx src/components/contributions/ProposalForm.test.tsx src/components/contributions/MyProposalsSection.tsx src/components/contributions/VisibilityDropdown.tsx --quiet`
  - Result: passed.
- `cd frontend && npm run lint -- --quiet`
  - Result: failed on unrelated existing files:
    - `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx:708`
    - `frontend/src/app/dev/ui-system/page.tsx:188`
    - `frontend/src/app/me/profile/components/ClaimStatusCard.tsx:64`
    - `frontend/tmp-live-full-flow*.js`
- `git diff --check`
  - Result: passed; only line-ending warnings for touched files were printed.

## Live Check

- Local Next server was reachable on `127.0.0.1:3000`.
- Playwright's bundled browser binary was missing, so the check was run with local Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`.
- Login as `platform-admin` succeeded, but `/me/contributions` returned the expected protected error state because that account has no verified member account attached: `kein verifizierter Member-Account verknüpft`.
- The reachable state had no horizontal overflow at desktop width or 375px mobile width and did not display Claim.

## Remaining Risks

- Full happy-path visual UAT for the dashboard still needs a logged-in account with a verified member/group membership.
- Existing unrelated lint failures remain outside the Phase 85 scope.
