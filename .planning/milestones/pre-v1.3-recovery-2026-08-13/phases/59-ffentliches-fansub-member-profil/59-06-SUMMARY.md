---
phase: 59-ffentliches-fansub-member-profil
plan: 06
subsystem: profile-openapi-contract
tags: [openapi, contract, public-profile]

requires:
  - phase: 59-04
    provides: GET /api/v1/members/{slug}
  - phase: 59-05
    provides: POST /api/v1/me/profile/background
provides:
  - OpenAPI path for GET /api/v1/members/{slug}
  - OpenAPI path for POST /api/v1/me/profile/background
  - Public member profile envelope and hidden-profile schemas
affects: [phase-59-public-member-profile, api-contracts]

key-files:
  modified:
    - shared/contracts/openapi.yaml
  created:
    - .planning/phases/59-ffentliches-fansub-member-profil/59-06-SUMMARY.md

requirements-completed: [D-04, D-05, D-06, D-07, D-08]
completed: 2026-05-29
---

# Phase 59 Plan 06: OpenAPI Contract Summary

Documented the Phase 59 public member profile and background upload contracts.

## Accomplishments

- Added `GET /api/v1/members/{slug}` with optional bearer auth and anonymous fallback.
- Documented the `200` response as either `PublicMemberProfileEnvelope` or `MemberProfileHidden`.
- Added `POST /api/v1/me/profile/background` with multipart upload request and authenticated responses.
- Added `PublicMemberProfileData`, `PublicMemberProfileEnvelope`, `MemberProfileHidden`, `PublicMemberProfileAvatar`, `MemberProfileBackgroundImage`, and `UploadOwnProfileBackgroundRequest`.
- Added `background_image` to the own-profile `MemberProfile` schema.
- Added `logo_url` to `MemberProfileMembership` so public member profile cards can render existing fansub group logos.

## Deviations

- The background upload schema documents `background`, `cropped_file`, and legacy `file`. The backend was extended to accept `background` as an alias so the contract and runtime agree.
- Verification found the new background-upload 403 example used an ASCII umlaut replacement; it now documents `dürfen`.
- YAML parser packages were not available locally (`yaml`, `js-yaml`, and PyYAML missing), so validation used structural grep, no-public-field scans, and `git diff --check` instead of a full OpenAPI parser.

## Checks

- `rg "/api/v1/members/{slug}|/api/v1/me/profile/background|PublicMemberProfileEnvelope|MemberProfileHidden|PublicMemberProfileData|UploadOwnProfileBackgroundRequest|background_image" shared/contracts/openapi.yaml` found the expected paths and schemas.
- Public profile schema scan found no `display_name`, `email`, `keycloak_subject`, or `account` fields.
- `cd backend && go build ./...` passed after adding the `background` upload-field alias.
- `git diff --check` on touched Phase 59 files passed with CRLF warnings only.
