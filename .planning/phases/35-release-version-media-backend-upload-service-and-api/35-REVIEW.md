---
phase: 35-release-version-media-backend-upload-service-and-api
reviewed: 2026-05-08
depth: standard
status: findings
reviewer: codex
---

# Phase 35 Code Review

## Summary

Phase 35 now builds and its scoped automated tests pass, but two source-level issues remain that should be fixed before calling the backend slice fully hardened.

## Findings

### Warning

1. `PATCH` interprets invalid `caption` types as "delete the caption" instead of rejecting the request.
   - File: [backend/internal/handlers/admin_content_release_version_media.go](/C:/Users/admin/Documents/Team4s/backend/internal/handlers/admin_content_release_version_media.go)
   - Evidence: `parseOptionalCaptionField(...)` returns `(*string=nil, set=true)` for any non-string value.
   - Impact: A malformed client body such as `{"caption":123}` or `{"caption":{}}` will silently null out persisted text instead of returning a validation error.
   - Recommendation: Reject non-string, non-null `caption` values with HTTP 400/422 and a dedicated validation error.

### Info

2. The original client filename is still not persisted as technical metadata.
   - Files:
     - [backend/internal/handlers/admin_content_release_version_media.go](/C:/Users/admin/Documents/Team4s/backend/internal/handlers/admin_content_release_version_media.go)
     - [backend/internal/repository/release_version_media_repository.go](/C:/Users/admin/Documents/Team4s/backend/internal/repository/release_version_media_repository.go)
   - Evidence: The handler captures `clientName` only for the response, while persisted media records are written with generated names like `original.png` / `original.gif`.
   - Impact: One of the requested audit/metadata fields remains unavailable for operator forensics and future moderation tooling.
   - Recommendation: Persist the client-provided original filename in the chosen canonical metadata location once the team locks where that field should live.

## Checks Run

- `cd backend && go build ./...`
- `cd backend && go test ./internal/handlers/... ./internal/repository/... ./cmd/server/...`

## Verdict

The phase is close and substantially healthier than the earlier implementation, but it still has one real request-validation bug and one remaining metadata gap.
