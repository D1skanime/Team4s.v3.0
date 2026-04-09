# Phase 11: AniSearch Edit Enrichment And Relation Persistence - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md.

**Date:** 2026-04-08
**Phase:** 11-anisearch-edit-enrichment-and-relation-persistence
**Areas discussed:** phase split, edit-route AniSearch scope, relation persistence, UI guardrails, documentation expectations, AniSearch reuse

---

## Scope Split

**User direction:** AniSearch should move out of the new Phase 10 and become its own follow-up phase.

**Captured outcome:**
- AniSearch edit enrichment and relation persistence moved to Phase 11.
- Phase 10 was narrowed to create tags and metadata refactor.

---

## AniSearch Follow-up

**User direction:** Existing AniSearch work should still be reused, but it belongs after the create tags cleanup.

**Captured outcome:**
- Reuse the existing AniSearch crawler and enrichment service stack.
- Keep scope focused on edit-route enrichment and relation persistence.

---

## UI Guardrails

**User direction:** Contract must not be forgotten, and page code should not exceed 700 lines.

**Captured outcome:**
- Planning must include a UI contract for the edit AniSearch placement and state behavior.
- Page-level files should stay under 700 lines by extracting components, hooks, and helpers where needed.

---

## Documentation Expectations

**User direction:** Future code should be documented so sections and functions explain what they are for.

**Captured outcome:**
- Major code sections should get short purpose comments.
- Non-obvious helper functions should explain their role or intended use.
- Comments should stay concise and purposeful.

---

## AniSearch Reuse

**Assumption confirmed by code review:** Existing AniSearch crawler and enrichment code should be reused rather than rebuilt.

**Evidence carried into context:**
- `backend/internal/services/anisearch_client.go`
- `backend/internal/services/anime_create_enrichment.go`
- `backend/internal/handlers/admin_content_handler.go`

---

## Deferred Ideas

- Generalized metadata token framework beyond existing admin metadata patterns
- Public AniSearch browsing or search UX
- Additional taxonomy work beyond relation persistence
