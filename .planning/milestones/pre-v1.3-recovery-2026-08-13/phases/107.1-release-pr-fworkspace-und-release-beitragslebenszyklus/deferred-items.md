# Deferred Items

## Plan 107.1-02

- The release-version browser client and shared API schemas still expose legacy caller-owned group, visibility, and review-status fields. The backend now ignores those upload fields and omits them from note/PATCH request DTOs, so they cannot cross the trust boundary, but Plans 107.1-06/07 must align `frontend/src/lib/api.ts`, `frontend/src/types/releaseVersionNotes.ts`, `frontend/src/types/releaseVersionMedia.ts`, `shared/contracts/openapi.yaml`, and `shared/contracts/admin-content.yaml` with lifecycle revisions and server-owned review state. This remains outside the backend adapter/lifecycle scope because the required status/rejection read model is delivered by the later queue/workspace plans.

## Plan 107.1-06

- The full frontend suite currently has pre-existing failures outside the release-review workspace: five SSR portal assertions in `ReportModal.test.tsx`, one empty-state copy assertion in `MemberContributionFilters.test.tsx`, one retained crop-spy assertion in `app/me/profile/page.test.tsx`, and one Pascal-/camel-case response mapping assertion in `api.releaseVersionNotes.test.ts`. The 48 focused release-review and group-edit tests, typecheck, lint, and production build pass; these unrelated failures were not changed in this plan.
