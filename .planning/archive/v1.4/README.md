# v1.4 Milestone Archive Snapshot

Non-destructive snapshot taken at v1.4 milestone close (2026-10-17), tag `v1.4`.

This is a **copy**, not a move — the active `.planning/` tree was deliberately left fully intact:
`ROADMAP.md`, `REQUIREMENTS.md`, `PROJECT.md`, and `STATE.md` all remain live and unmodified in
place, continue to carry Phase 186 and all future roadmap entries, and keep their full commit
history. Nothing was deleted, collapsed, or reset. No new milestone was started at this close —
by explicit decision, work continues in additive phases (`/gsd-phase add`) until something large
enough to justify a new milestone comes up.

## Contents

- `ROADMAP.md` — the full roadmap as it stood at milestone close, including the original v1.4
  phase details (136-144) and every additive phase appended afterward through Phase 185.
- `REQUIREMENTS.md` — the 41 originally-scoped v1.4 requirements (all checked complete), plus the
  "Additive scope" sections appended per later phase (most later phases carry Decision-Coverage
  via their own `*-CONTEXT.md` instead of a `REQUIREMENTS.md` mapping).
- `PROJECT.md` — project state/decisions as of milestone close.
- `STATE.md` — session state at close time.
- `v1.4-MILESTONE-AUDIT.md` — the audit produced 2026-09-01, `status: passed`, covering only the
  **original** 9-phase scope (136-144, 41/41 requirements). The milestone was extended additively
  far beyond that scope under the same `v1.4`/"Coverage" label through Phase 185 afterward; this
  close did not re-run a full audit across all 49 phases. Each phase carries its own phase-level
  verification record (see `ROADMAP.md`/`STATE.md` for the complete list).

## Why a copy instead of the standard archive-and-collapse flow

The standard `/gsd:complete-milestone` workflow deletes `REQUIREMENTS.md` and collapses
`ROADMAP.md`'s phase details to a one-line summary, then offers to start a new milestone. All of
that was explicitly declined for this milestone close, same as for `v1.3`: keep the active
planning tree fully intact and inspectable, and keep working in additive phases on `main` rather
than opening a new milestone cycle.
