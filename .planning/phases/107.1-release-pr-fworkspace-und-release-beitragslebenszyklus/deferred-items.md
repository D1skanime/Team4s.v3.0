# Deferred Items

## Plan 107.1-02

- The release-version browser client and shared API schemas still expose legacy caller-owned group, visibility, and review-status fields. The backend now ignores those upload fields and omits them from note/PATCH request DTOs, so they cannot cross the trust boundary, but Plans 107.1-06/07 must align `frontend/src/lib/api.ts`, `frontend/src/types/releaseVersionNotes.ts`, `frontend/src/types/releaseVersionMedia.ts`, `shared/contracts/openapi.yaml`, and `shared/contracts/admin-content.yaml` with lifecycle revisions and server-owned review state. This remains outside the backend adapter/lifecycle scope because the required status/rejection read model is delivered by the later queue/workspace plans.
