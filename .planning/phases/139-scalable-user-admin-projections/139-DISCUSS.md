---
phase: 139-scalable-user-admin-projections
type: discuss
status: approved
---

# Phase 139 — Approved GSD Discussion Decisions

## D01 — Scope
Only Phase-139 roadmap work. No adjacent admin redesign.

## D02 — Contribution hierarchy
`Anime → Projekt/Fansubgruppe → Projektstandard → Release-/Episodenkontext`.

## D03 — Project standard
Project standard is always directly visible in each project block.

## D04 — Real override semantics
A release-specific row is highlighted as an override only when it semantically differs from the project standard.
`release_version_id != NULL` alone is insufficient.

## D05 — Snapshot semantics
`inherited` follows project standard.
`independent` must be compared with project standard before being called an override.

## D06 — Range behavior
Only standard-equivalent consecutive contexts are collapsed into ranges.
Real deviations remain individually visible.

## D07 — Range ordering
Use episode domain ordering (`sort_index` / canonical fallback), never database IDs.

## D08 — Contribution pagination
One page item = complete Anime+Project block.
Never split a project across pages.

## D09 — Contribution count
Count = number of filtered projected project blocks.

## D10 — Contribution filters
Server-side:
- Anime
- project/group
- role/type
- only deviations
- time range

## D11 — Media hierarchy
`Anime → Projekt/Fansubgruppe → Release/Episode → Medien`.

## D12 — Media pagination
One page item = one Release-/Episode context block.
A project may span many pages; one release/episode block may not.

## D13 — Media count
Count = number of filtered projected release/episode blocks.

## D14 — Media filters
Server-side:
- Anime
- project/group
- Release/Episode
- media type
- time range

## D15 — Media UI purpose
Informational/read-only user history, not another media editor.

## D16 — Media action
One clear canonical action per release/episode block: `Release-Medien öffnen`.

## D17 — Media preview
Use small lazy-loaded previews; do not load originals for list display.

## D18 — Technical storage details
Do not expose deep storage/path/derivative diagnostics in this Phase-139 Team4s view.
Those are reserved for a later Metabase/reporting phase idea.

## D19 — Fake scope badge
Remove/not carry forward the current `Berechtigung aktiv/fehlt` badge derived from `owner_context`.

## D20 — UADM-07
Contributions and media clearly explain that they are informational and link to canonical action surfaces where applicable.

## D21 — Rights scope
Touch the Phase-138 rights tab only for UADM-06 scalability. No semantic/UX redesign of Effective Rights.

## D22 — Rights request fan-out
Do not fetch effective rights for every group membership on initial load. Use bounded group selection and load only the selected group's rights.

## D23 — No client regrouping
Grouping/range collapse happens server-side before pagination.

## D24 — Pagination coherence
Filters, count and items must refer to the exact same server-side projected dataset.

## D25 — QUAL-06
Query-count gates and high-volume pagination-drift tests are mandatory.

## D26 — Responsive
No page-level horizontal overflow; use desktop-first layout with narrow graceful degradation and keyboard-safe filters/pagination.

## D27 — Metabase follow-up
Deep technical media/storage analysis is a separate future idea, not Phase 139.
