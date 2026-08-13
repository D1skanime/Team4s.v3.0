# Pre-v1.3 GSD Recovery Archive

Created on 2026-08-13 before starting milestone v1.3 Public Member Profile Hardening.

## Why this archive exists

The active GSD metadata had drifted across several historical planning cycles:

- `STATE.md` identified milestone v1.0 while execution had reached Phase 127.
- `MILESTONES.md` still listed v1.1 Asset Lifecycle Hardening as incomplete.
- `v1.2-DISCUSSION.md` and Git history show that v1.2 Public Experience, Historie & Scoped Rights was already used for Phases 72-80.
- `validate health` reported a degraded state and phase/roadmap mismatches that cannot be repaired automatically.

This is therefore a recovery archive, not a claim that the mixed historical phase set forms one completed or verified milestone.

## Preserved material

- `phases/`: all 123 phase directories that were present before the switch.
- `planning-root/`: snapshots of the active PROJECT, STATE, ROADMAP, REQUIREMENTS, MILESTONES, DECISIONS, RETROSPECTIVE, and config files where present.
- Tracked and untracked files inside the phase directories were moved together.

The `.planning/quick/` and `.planning/debug/` trees were not cleared by the milestone switch and remain at their original paths.

## Safety boundaries

- No application source changes were reverted or overwritten.
- No database contents, media files, Docker volumes, or runtime configuration were changed.
- Existing v1.2 discussion material remains preserved separately under `.planning/milestones/`.
