---
phase: 93-projektrollen-sichtbarkeit-hinweis-formular
plan: 93-01
subsystem: frontend
tags: [contributions, ui, member]
key-files:
  modified:
    - frontend/src/components/contributions/AnimeGroupCard.tsx
    - frontend/src/components/contributions/VisibilityDropdown.tsx
    - frontend/src/components/contributions/ProposalForm.tsx
    - frontend/src/components/contributions/contributions.module.css
    - frontend/src/components/contributions/ProposalForm.test.tsx
    - frontend/src/components/contributions/ReportModal.tsx
    - frontend/src/components/contributions/ReportModal.test.tsx
  created:
    - frontend/src/components/contributions/AnimeGroupCard.test.tsx
    - frontend/src/components/contributions/VisibilityDropdown.test.tsx
metrics:
  tests: 14
---

# Plan 93-01 Summary

## What Changed

- Replaced the "Einträge" / "Schließen" text-switch disclosure on `AnimeGroupCard` with an icon-only chevron button.
- Rendered anime-wide roles as separate expanded rows, so Encoding and Timing appear independently.
- Replaced the native visibility select with a segmented `Profil` / `Intern` control that still uses the existing `patchAnimeContributionVisibility` helper.
- Add-on 2 temporarily tightened the Hinweis form, but is now superseded by Add-on 3.
- Add-on 3 rebuilds `ProposalForm` as a 3-step bottom-sheet assistant with custom group/project selects, single-role chips, a 280-character note counter, and an in-assistant success view.

## Deviations

- Requirement 4 help text was intentionally omitted under Option 3, because the current backend does not make role, notes, and images public/private together.
- No API, backend, media, or contract behavior changed.
- Add-on 3 intentionally removes the project-vs-release-version scope choice until release-version hints are available.
- The project-role/offene-Aktionen block was not changed by Add-on 3.

## Verification

- `npm --prefix frontend test -- AnimeGroupCard ProposalForm VisibilityDropdown`
- `npm --prefix frontend test -- src/components/contributions/ProposalForm.test.tsx`
- `npm --prefix frontend test -- src/components/contributions/ReportModal.test.tsx`
- `npm --prefix frontend run typecheck`
- `npm --prefix frontend run lint` (existing unrelated warnings only)
- `npm --prefix frontend run build`
- `docker compose build team4sv30-frontend`
- `docker compose up -d team4sv30-frontend`
- HTTP 200 from `http://127.0.0.1:3000/me/contributions`

## Self-Check

PASSED - UI scope implemented without changing ownership, auth, media, or proposal contracts.
