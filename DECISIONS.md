# DECISIONS

## 2026-03-26 - Admin Create Redirect Goes Back To Overview

### Decision
After successful anime creation, redirect back to `/admin/anime` instead of immediately sending the user into `/admin/anime/{id}/edit`.

### Context
The user expectation was to confirm that creation actually worked by seeing the new anime in the overview. The previous redirect to edit made that persistence harder to verify.

### Options Considered
- Redirect to edit immediately
- Redirect back to the overview

### Why This Won
The overview is the clearest proof that the anime exists and is queryable. It reduces ambiguity after save and supports a more trustworthy admin workflow.

### Consequences
- `/admin/anime` must show real data, not just entry CTAs
- create success is easier to verify manually
- edit remains available as a second step instead of the forced next step

### Follow-ups Required
- keep the overview useful as more anime are created
- make edit save behavior equally clear

---

## 2026-03-26 - Prefer Local Cover Upload Route For Poster Edit Flow

### Decision
Use the local `/api/admin/upload-cover` route for the current poster edit flow instead of relying on the generic backend `/api/v1/admin/upload` path.

### Context
The generic backend upload path still expects an older `media_assets` shape and failed on the live local schema. The local cover route already worked for create and was the safest path to restore edit poster uploads quickly.

### Options Considered
- patch the generic backend media upload immediately
- reuse the local cover upload route for poster edits

### Why This Won
It unblocked the real user workflow quickly and safely without forcing a rushed redesign of the generic media subsystem.

### Consequences
- poster edits work again locally
- richer asset types still need a later backend/schema reconciliation
- the generic media upload path remains technical debt, not a resolved foundation

### Follow-ups Required
- decide whether to repair or redesign the generic media upload backend before expanding banner/logo/background uploads

---

## 2026-03-26 - Admin Anime Overview Must Render Dynamically

### Decision
Treat `/admin/anime` as runtime-rendered data UI, not a statically frozen page.

### Context
After adding the anime overview list, the page initially baked an error state during build because it tried to resolve live data too early in the container build lifecycle.

### Options Considered
- keep static prerendering and work around stale data
- force runtime rendering for the overview

### Why This Won
The page is operational UI that must reflect live persisted data, especially right after create. Static rendering was the wrong fit.

### Consequences
- overview now reflects live API data on the running stack
- create-to-overview verification works correctly

### Follow-ups Required
- apply the same dynamic-vs-static judgment carefully to future admin operational pages

---

## 2026-03-27 - Post-Create Continuity Must Use Explicit Overview Confirmation

### Decision
After a successful anime create, redirect to `/admin/anime?created={id}#anime-{id}` and show an explicit success confirmation inside the overview.

### Context
The earlier change back to the overview improved observability, but runtime review still showed that a hash jump alone was too subtle. Operators needed a clearer proof that the just-created anime was the item now in focus.

### Options Considered
- keep redirecting to `/admin/anime` with only scroll/highlight behavior
- add an explicit created-state confirmation in the overview

### Why This Won
It makes create success obvious in runtime checks, screenshots, and human review without forcing an edit redirect again.

### Consequences
- create now carries a lightweight `created` query parameter
- the overview doubles as the confirmation surface for successful persistence
- future create-flow tweaks should preserve this explicit continuity signal

### Follow-ups Required
- keep the confirmation pattern in mind for other operational create flows

---

## 2026-03-27 - Local UI Review Should Prefer Live Docker Runtime

### Decision
When localhost is available, local UI review should prefer the live Docker/runtime app and capture screenshots there instead of relying on code-only review.

### Context
The earlier GSD UI-review flow was useful for code audit but weak at catching continuity and presentation issues that only became obvious on the running app.

### Options Considered
- keep UI review code-only by default
- bias the local review workflow toward the running Docker/localhost app when present

### Why This Won
The live stack exposed the real operator-facing problems: create continuity, wording, and the perceived loading-shell issue on edit. Those would have been harder to judge from code alone.

### Consequences
- local runtime screenshots are now part of the review toolkit
- Docker availability matters more for high-confidence UI review
- review artifacts under `.planning/ui-reviews/` are now meaningful handoff evidence

### Follow-ups Required
- keep runtime review inputs current when localhost ports or startup conventions change
