# DECISIONS

## 2026-02-27

### Decision
Close out the Admin Anime page rebuild as completed work and move the next focus to Anime page design improvements.

### Context
The Admin Anime page now covers episode and version editing, Jellyfin sync matching, and direct group assignment. The main remaining value is UX polish, not baseline functionality.

### Options Considered
- Keep the rebuild marked as in progress until design polish is done
- Mark the rebuild as done and track design polish as the next separate priority

### Why This Won
Separating shipped functionality from follow-up polish keeps project status honest and makes the next task smaller and clearer.

### Consequences
- Day-start context will point directly at UX work instead of re-opening the same implementation milestone
- Handler modularization and playback hardening remain active but are no longer the immediate first task

### Decision
Redesign `/admin/anime/[id]/versions` in place as a visual-only admin refresh, then defer component decomposition to follow-up work.

### Context
The route was functional but visually outdated and structurally dense. The immediate need was a clearer professional admin UI, not new behavior or a route move.

### Options Considered
- Split the route into smaller components before changing the UI
- Refresh the existing route in place first, then split it afterward

### Why This Won
It ships the visible UX improvement immediately while keeping the behavioral surface area stable. The structural cleanup remains isolated and easier to verify afterward.

### Consequences
- The new UI is live in the existing route without contract or feature churn
- The page file remains oversized and should be decomposed next to align with frontend rules
