---
phase: 03-jellyfin-assisted-intake
plan: 05
subsystem: jellyfin-title-seeding
tags: [react, go, gin, vitest, go-test, jellyfin]
requires:
  - phase: 03-04
    provides: explicit-save Jellyfin draft flow
provides:
  - folder-name title seed in the intake preview contract
  - title hydration from Jellyfin folder name
  - regression guards against deferred upload UI leaking into Phase 3
affects: [admin-anime-create, jellyfin-intake-contract]
tech-stack:
  added: []
  patterns: [folder-name-derived draft title, editable post-hydration title, preview-only contract extension]
key-files:
  modified:
    - backend/internal/models/admin_jellyfin_intake.go
    - backend/internal/handlers/jellyfin_intake_helpers.go
    - backend/internal/handlers/jellyfin_intake_preview_test.go
    - frontend/src/types/admin.ts
    - frontend/src/app/admin/anime/hooks/useManualAnimeDraft.ts
    - frontend/src/app/admin/anime/create/page.test.tsx
key-decisions:
  - "The initial draft title is seeded from the Jellyfin folder name instead of the display title."
  - "The seeded title remains fully editable after hydration."
  - "Deferred per-asset upload and anime-ID naming UI stay out of Phase 3."
requirements-completed: [JFIN-04, JFIN-05]
duration: 12 min
completed: 2026-03-31
---

# Phase 03 Plan 05: Folder-Name Title Seeding Summary

**Jellyfin draft hydration now seeds the editable title from the folder name, which matches the clarified Phase 03 decision.**

## Accomplishments

- Extended the backend intake preview contract with `folder_name_title_seed`.
- Derived the seed from the terminal Jellyfin folder segment instead of forcing the UI to infer from display title.
- Updated frontend draft hydration to initialize the title from the folder seed while preserving manual edits afterward.
- Added regression checks that Phase 3 still does not show deferred upload or anime-ID naming copy.

## Verification

- `cd backend && go test ./internal/handlers -run "Test.*Jellyfin.*IntakePreview" -count=1`
- `cd frontend && npm test -- src/app/admin/anime/create/page.test.tsx`

## Next Readiness

- The hydrated draft now starts from the correct title source, so later source-aware phases can layer on provenance without reinterpreting the initial draft title.
