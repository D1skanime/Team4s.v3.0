---
created: 2026-05-28T14:12:09+02:00
title: Contributor owned media and note edit delete
area: contributor-workspace
files:
  - frontend/src/app/manage/groups
  - frontend/src/app/admin/episode-versions/[versionId]/edit
  - backend/internal/handlers
  - backend/internal/repository
---

## Problem

Phase 50 live UAT confirmed that scoped uploads and notes can be saved and remain visible after reload for a normal member/fansub user. The user also found a follow-up UX gap: own uploads cannot be deleted later, and authored text cannot be edited later from the scoped contributor context.

## Desired Outcome

Plan a later contributor-workspace slice that lets users edit/delete their own scoped uploads and edit their own scoped texts/notes where the backend capability model permits it. The implementation must keep group/release ownership strict and must not expose global admin actions to contributors.
