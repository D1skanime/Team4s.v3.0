---
phase: 03-jellyfin-assisted-intake
plan: 07
subsystem: jellyfin-candidate-review
tags: [react, nextjs, vitest, css-modules, jellyfin]
requires:
  - phase: 03-02
    provides: typed intake hook and API seam
provides:
  - rich Jellyfin candidate review cards
  - preview media evidence tiles
  - compact-to-card review flow
affects: [admin-anime-create, jellyfin-intake-ui]
tech-stack:
  added: []
  patterns: [compact-first chooser, explicit manual selection, 4px Jellyfin-only spacing]
key-files:
  modified:
    - frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateCard.tsx
    - frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateCard.test.tsx
    - frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateCard.module.css
    - frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateReview.tsx
    - frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateReview.module.css
key-decisions:
  - "Candidate review stays card-based and evidence-dense instead of collapsing into a plain list or table."
  - "Poster, banner, logo, and background previews stay visible before draft hydration."
  - "Candidate cards do not contain asset deselection controls; selection stays manual."
requirements-completed: [JFIN-01, JFIN-02, JFIN-06]
duration: 10 min
completed: 2026-03-31
---

# Phase 03 Plan 07: Candidate Review UI Summary

**The Jellyfin intake flow now has the missing rich-review surface between compact search and draft hydration.**

## Accomplishments

- Locked candidate-card coverage for Jellyfin ID, path, parent or library context, previews, and visible type-hint reasons.
- Implemented the card-based review UI with stable preview tiles for poster, banner, logo, and background evidence.
- Kept selection explicit and operator-led, with visible confidence treatment and no candidate-level asset toggles.

## Verification

- `cd frontend && npm test -- src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateCard.test.tsx`

## Next Readiness

- The shared create page can now rely on a complete compact-to-review handoff before loading a Jellyfin-backed draft.
