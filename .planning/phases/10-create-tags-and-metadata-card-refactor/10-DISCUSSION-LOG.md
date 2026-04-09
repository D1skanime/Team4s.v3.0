# Phase 10: Create Tags And Metadata Card Refactor - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md.

**Date:** 2026-04-08
**Phase:** 10-create-tags-and-metadata-card-refactor
**Areas discussed:** create tags scope, normalized tag schema, create-page UI contract, code size guardrails, documentation expectations

---

## Scope Split

**User direction:** AniSearch should move out of this phase and into a later follow-up phase.

**Captured outcome:**
- Phase 10 now covers create tags and metadata card refactor only.
- AniSearch edit enrichment and relation persistence moved to Phase 11.

---

## Create Tags

**User direction:** Tags should be available on create analogously to genres, including DB schema and UI behavior.

**Captured outcome:**
- Create a normalized `tags` + `anime_tags` schema analogous to `genres` + `anime_genres`.
- Persist tags authoritatively.
- Show tags in a dedicated card on the create page with both manual entry and suggestion-based filling.

---

## UI Guardrails

**User direction:** Contract must not be forgotten, and page code should not exceed 700 lines.

**Captured outcome:**
- Planning must include a UI contract for the create tags card.
- Page-level files should stay under 700 lines by extracting components, hooks, and helpers where needed.

---

## Documentation Expectations

**User direction:** Future code should be documented so sections and functions explain what they are for.

**Captured outcome:**
- Major code sections should get short purpose comments.
- Non-obvious helper functions should explain their role or intended use.
- Comments should stay concise and purposeful.

---

## Deferred Ideas

- AniSearch edit enrichment and relation persistence
- Generalized metadata token framework beyond genres and tags
- Public tag browsing and filtering
