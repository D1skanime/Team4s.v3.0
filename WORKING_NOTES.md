# WORKING_NOTES

## Current Workflow Phase
- Phase 48 contributor dashboard is implemented and verified.
- Phase 48A UI system foundation remains the visual contract for future slices.
- Phase 49 exists and is the next auth/API-client hardening phase.

## Useful Facts To Keep
- Real Keycloak UAT accounts used for Phase 48:
  - `phase43-member` / lead context for `AnimeOwnage` group `88`
  - `tomoni.member.auto.20260518152444` / contributor context for `Tomoni` group `96`
- Foreign group access checks:
  - lead user denied on `96`
  - contributor user denied on `88`
- Phase 48 screenshots live under `.tmp-playwright-uat/phase48/`.
- Important Phase 48 docs:
  - `.planning/phases/48-meine-gruppen-und-contributor-dashboard/48-SUMMARY.md`
  - `.planning/phases/48-meine-gruppen-und-contributor-dashboard/48-UAT.md`
  - `.planning/phases/48-meine-gruppen-und-contributor-dashboard/48-VALIDATION.md`
  - `.planning/phases/48-meine-gruppen-und-contributor-dashboard/48-REVIEW.md`
  - `.planning/phases/48-meine-gruppen-und-contributor-dashboard/48-UI-REVIEW.md`
- Current local commit to push:
  - `04a5f588 fix(49): proxy docker live api requests through frontend`
- Current branch already tracks `origin/codex/ui-system-closeout-2026-05-21`.

## Verification Memory
- Phase 48 targeted backend and frontend checks passed in the previous verification pass.
- Phase 48 real browser UAT passed after fixing the group-detail id fallback for Next client params.
- Phase 48 UI review scored `21/24 PASS`.
- `curl -I http://127.0.0.1:3002/admin/my-groups/88` returned `200` after the frontend rebuild in the previous session.
