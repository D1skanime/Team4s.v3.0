# Durable Decisions

## 2026-06-22: Phase 71 permission bridge is bridge-not-merge

Credit attribution is not a permission source. A confirmed credit, historical credit, or
`anime_contributions` row may describe attribution, but it must not directly grant
application rights.

The approved product model is an optional permission bridge: when a credit is created
for a linked app user, a future UI may suggest a separate permission grant. That grant
must be explicit, confirmed, revocable, and owned by the central permission engine.

Phase 71 documents this model only. It does not implement grant UI, backend grant
creation, schema changes, or permission-engine behavior.

Future implementation must use the central permission engine and must not infer rights
directly from `anime_contributions`, release credits, or historical credits.
