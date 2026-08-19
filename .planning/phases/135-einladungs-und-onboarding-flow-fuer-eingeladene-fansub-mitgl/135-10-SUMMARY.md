---
phase: 135-einladungs-und-onboarding-flow-fuer-eingeladene-fansub-mitgl
plan: 10
subsystem: identity
tags: [keycloak, case-preservation, member-claims, ui-system]

requires:
  - phase: 135-09
    provides: Keycloak registration rebuilt around Fansubname as the KC username
provides:
  - Case-preserved Fansubname (fansubName KC attribute) displayed everywhere, while KC username/login stays lowercase
  - Self-claim approval fully rendered and functional in HistoricalMemberCard, with leader feedback, auto-refresh, claim-note visibility, and a UI-system-only confirm flow
affects: []

tech-stack:
  added: []
  patterns:
    - "Case-preserved display identity: a dedicated KC user-profile attribute (fansubName) separate from the lowercase-normalized username, hidden-field + client-side JS derivation in register.ftl"
    - "Generic pendingConfirm state + single Modal instance replacing multiple native window.confirm() call sites (mirrors the existing deleteTarget/Modal pattern in GroupMemberFormModals.tsx)"

key-files:
  created: []
  modified:
    - infra/keycloak/team4s-users-profile.json
    - infra/keycloak/realm-team4s.json
    - infra/keycloak/themes/team4s/login/register.ftl
    - backend/internal/auth/oidc.go
    - backend/internal/middleware/current_user_auth.go
    - backend/internal/repository/fansub_group_app_members_repository.go
    - backend/internal/repository/hist_group_members_repository.go
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersClaimActions.ts
    - frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css

key-decisions:
  - "Case-preservation mechanism (Task 1, pre-confirmed by user before this plan's execution): a new case-preserved fansubName KC user-profile attribute is the visible register-form identity field; username becomes a hidden field client-side-derived as lowercase(fansubName); KC additionally lowercases usernames server-side (empirically verified). OIDC mapper carries fansubName into the token; backend prefers it for display, falling back to preferred_username/name/email for pre-existing tokens."
  - "Task 4 (self-claim approval render) was already implemented in a prior, non-GSD session (commit ca189d99) before this plan dispatched -- sanity-checked against the plan's acceptance criteria (renders pendingClaimsByMember + onVerifyClaim/onRejectClaim, gated on canManageClaims) instead of re-implementing."
  - "5 deviations surfaced during live UAT (Task 5), all fixed in-session before phase close: (1) two backend list queries preferred lowercase preferred_username over case-preserved display_name/nickname for their display alias -- reordered, plus one stale historical nickname row backfilled; (2) claim-verify and member-activate gave no user-visible feedback and the activate action never refreshed the sibling active-app-members list owned by a different component -- added success messages and a cross-component refresh callback; (3) all 5 window.confirm() call sites in the claim-actions hook violated the @/components/ui-only UI rule -- replaced with a generic pendingConfirm state rendered through one Modal instance, mirroring the existing GroupMemberFormModals.tsx delete-confirm pattern; (4) the claimant's optional note was captured and delivered by the API but never rendered on the leader's approval card -- added; (5) the claim card's copy/layout got a mobile-first redesign per direct user UX feedback during the same live-UAT session (commit 0982dc93)."
  - "Commits 069b2f6b/514ec1fd/88e0d62f/1403ccd0 (hide active members from the historical list; surface active group membership + verified historical roles on the public profile; redesign the linked-account activation card) landed in the same working session immediately after this plan's Task 5 confirmation, addressing a newly logged, separate finding (#28 in live-uat-ux-findings.md). They are NOT part of 135-10's D-15/D-16 scope and are recorded here only as an adjacent follow-up, not as this plan's delivered work."

patterns-established:
  - "Case-preserved-identity-over-KC-normalized-login: any future display-name query must prefer app_users.display_name / member nickname over preferred_username, which Keycloak always lowercases."

requirements-completed: [D-15, D-16]

duration: ~2h45m (across live-UAT checkpoints; 2026-08-19T09:51Z - 2026-08-19T12:33Z)
completed: 2026-08-19
---

# Phase 135 Plan 10: Case-Preserved Fansubname + Self-Claim Approval Render Summary

**Fansubname now displays with its original casing everywhere (KC login stays lowercase); group leaders can see, approve/reject, and act on historical-member self-claims through the app's own Modal/feedback system instead of a silent, native-confirm-driven flow.**

## Performance

- **Duration:** ~2h45m across this session's live-UAT checkpoints (KC investigation pre-confirmed by user; execution 2026-08-19T09:51Z – 12:33Z)
- **Completed:** 2026-08-19T12:57:23Z
- **Tasks:** 5 (2 checkpoint:human-verify, 3 auto — Task 4 sanity-checked only, not re-implemented)
- **Files modified:** 13 across backend, Keycloak infra, and frontend

## Accomplishments
- **D-15 Case-preserved Fansubname:** new `fansubName` Keycloak user-profile attribute (case-preserved) is the visible register-form identity field; `username` is a hidden field client-side-derived as `lowercase(fansubName)`. A new `profile`-scope OIDC mapper carries `fansubName` into the token. Backend (`current_user_auth.go`) now prefers this claim for `account_display_name`. Two backend list queries that had been silently preferring the lowercase `preferred_username` over the case-preserved source were found during live UAT and fixed. Existing accounts (d1sk, extro, and the stale `members.id=1` nickname row) backfilled to their correct case.
- **D-16 Self-claim approval:** the pending-claim render itself pre-existed this plan (`ca189d99`); this plan closed every remaining gap found during live UAT — a clearer approval label, visible claimant note, success feedback + cross-list auto-refresh on both "Bestätigen" and "Als aktives Mitglied übernehmen", replacement of 5 native `window.confirm()` calls with the app's own `Modal`, and a mobile-first redesign of the claim card per direct user feedback.

## Task Commits

Each fix was committed atomically as it was found and verified live:

1. **Task 2 (D-15, KC attribute + register.ftl field)** - `0839c795` (feat)
2. **Task 3 (D-15, backend reads fansubName claim first)** - `b981b2fb` (feat)
3. **Deviation: case-preserved query ordering in 2 list repositories + data-hygiene backfill** - `38a103b8` (fix)
4. **Deviation: claim-approval success feedback + cross-list refresh** - `86effe3b` (fix)
5. **Deviation: window.confirm() → UI-system Modal + claim-note render** - `dccf3a28` (fix)
6. **Deviation: claim-card mobile-first redesign (direct user UX request)** - `0982dc93` (fix)

**Plan metadata:** (this commit)

## Files Created/Modified
- `infra/keycloak/team4s-users-profile.json` / `realm-team4s.json` / `themes/team4s/login/register.ftl` - case-preserved `fansubName` attribute, hidden-username derivation, token mapper
- `backend/internal/auth/oidc.go` / `internal/middleware/current_user_auth.go` - reads and prioritizes the `fansubName` claim for display identity
- `backend/internal/repository/fansub_group_app_members_repository.go` / `hist_group_members_repository.go` - fixed display-name COALESCE ordering (case-preserved source before `preferred_username`)
- `frontend/.../GroupMembersHistTable.tsx` / `GroupMembersTab.tsx` / `useGroupMembersClaimActions.ts` / `useGroupMembersTab.ts` / `FansubAppMembersSection.tsx` / `FansubEdit.module.css` - claim-approval UX: clearer label, note display, success feedback, cross-list refresh, Modal-based confirmations, mobile-first card redesign

## Decisions Made
See `key-decisions` in frontmatter — mechanism confirmation, Task 4 already-implemented sanity-check, and the 5 live-UAT deviations are documented there with full rationale.

## Deviations from Plan

### Auto-fixed Issues (all found and fixed during Task 5 live UAT)

**1. [Rule 1 - Bug] Case-preserved display name lost to lowercase preferred_username in 2 list queries**
- **Found during:** Task 5 (live UAT) — user diagnosed the exact root cause and query lines
- **Issue:** `fansub_group_app_members_repository.go`'s `ListByFansubGroup` and `hist_group_members_repository.go`'s `app_username`/`confirmed_by_display_name` COALESCE chains preferred `preferred_username` (always lowercase) over `display_name`/nickname
- **Fix:** Reordered all 6 affected COALESCE expressions; backfilled one stale lowercase `members.nickname` row (id=1, "d1sk" → "D1sk"); audited all other `preferred_username` consumers in the repository layer and confirmed no further instances
- **Files modified:** `backend/internal/repository/fansub_group_app_members_repository.go`, `hist_group_members_repository.go`
- **Verification:** Live API checks (`GET /admin/fansubs/1/app-members`, `GET /admin/fansubs/1/group-members`) plus full `go test ./internal/repository/...` re-run (only pre-existing DSN-dependent failures)
- **Committed in:** `38a103b8`

**2. [Rule 2 - Missing Critical] No feedback or cross-list refresh on claim-verify / member-activate**
- **Found during:** Task 5 (live UAT)
- **Issue:** Both actions succeeded server-side but gave no visible confirmation; activating a member never refreshed the sibling active-app-members list (owned by a different component's own fetch)
- **Fix:** Added a `claimActionSuccess` flash message (reusing the existing `successBox` pattern) and an `onActiveAppMembersChanged` callback threaded from the claim-actions hook up to `FansubAppMembersSection`'s own `loadSection()`
- **Files modified:** `useGroupMembersClaimActions.ts`, `useGroupMembersTab.ts`, `GroupMembersTab.tsx`, `FansubAppMembersSection.tsx`
- **Verification:** Live browser UAT — no manual reload needed
- **Committed in:** `86effe3b`

**3. [Rule 1 - Bug] Native window.confirm() violates the @/components/ui-only design-system rule**
- **Found during:** Task 5 (live UAT) — user saw the raw browser dialog with the host IP in its chrome
- **Issue:** 5 call sites in `useGroupMembersClaimActions.ts` used `window.confirm()`
- **Fix:** Generic `pendingConfirm` state + one `Modal` instance in `GroupMembersTab.tsx`, mirroring the existing `deleteTarget`/`Modal` pattern in `GroupMemberFormModals.tsx`
- **Files modified:** `useGroupMembersClaimActions.ts`, `GroupMembersTab.tsx`
- **Verification:** Live UAT confirmed no native dialogs remain
- **Committed in:** `dccf3a28`

**4. [Rule 2 - Missing Critical] Claim note captured but never shown to the approving leader**
- **Found during:** Task 5 (live UAT)
- **Issue:** `MemberClaimRow.note` was delivered by the API but not rendered
- **Fix:** Added a "Nachricht: ..." line under the pending-claim actions when non-empty
- **Files modified:** `GroupMembersHistTable.tsx`
- **Verification:** Live UAT confirmed with a note-bearing test claim
- **Committed in:** `dccf3a28`

**5. [Rule 1 - UX] Claim-card copy/layout redesign per direct user feedback**
- **Found during:** Task 5 (live UAT)
- **Issue:** User requested a shorter label, quoted note styling, and a mobile-first layout while reviewing the above fixes live
- **Fix:** Redesigned the claim card (label, quoted note presentation, responsive layout)
- **Files modified:** `GroupMembersHistTable.tsx`, `FansubEdit.module.css`
- **Verification:** Live UAT
- **Committed in:** `0982dc93`

---

**Total deviations:** 5 auto-fixed (2 bugs, 2 missing-critical, 1 direct UX request), all found and resolved during this plan's own live-UAT checkpoint, all necessary to satisfy the plan's own `must_haves.truths`.
**Impact on plan:** No scope creep beyond D-15/D-16 — every fix directly closes a gap in this plan's own stated truths (case-preserved display, functional/visible claim approval).

## Issues Encountered
- `docker compose watch` was not running for the backend service, so `docker compose exec` builds/tests during Task 3 initially ran against stale, pre-edit container code (image is baked via `Dockerfile.dev`'s `COPY . .`, synced only by Compose Watch). Started `docker compose watch team4sv30-backend` mid-plan to restore live source sync for the remainder of the session; this is host/environment state, not a code change, and needs to stay running for any future backend edits in this environment.

## User Setup Required

None - no external service configuration required. (Note: `docker compose watch` should be running whenever backend Go source is edited in this environment — see Issues Encountered.)

## Next Phase Readiness

**Phase 135 is complete** — both previously outstanding plans (135-07, 135-10) are now done; all 10 plans have summaries. D-01 through D-16 are implemented and live-verified per `135-CONTEXT.md`.

Related but explicitly out-of-scope follow-up work landed in the same session immediately after this plan's Task 5 confirmation, addressing a newly logged finding (**#28** in `.planning/notes/live-uat-ux-findings.md`: hide active members from the historical list, surface active group membership + verified historical roles on the public profile, redesign the linked-account activation card) — commits `069b2f6b`, `514ec1fd`, `88e0d62f`, `1403ccd0`. These are not part of 135-10's D-15/D-16 scope and are not counted as this plan's delivered work; they may warrant their own future phase/plan.

---
*Phase: 135-einladungs-und-onboarding-flow-fuer-eingeladene-fansub-mitgl*
*Completed: 2026-08-19*
