---
phase: 69-fansub-contributions-contract-und-permission-haertung
plan: 04
status: complete
completed_at: 2026-06-03
commits:
  - c3fcb67a
  - eeb615ae
  - 0b3227f4
provides:
  - frontend-envelope-data-contract
  - member-roles-member-id-query
  - seed-valid-role-selection
---

# Phase 69 Plan 04: Frontend Contract Alignment Summary

**One-liner:** Admin-Fansub-Contribution-Frontend auf das Backend-Envelope `{data: ...}`, required `member_id` im Rollen-Request und seed-konforme Rollencodes umgestellt.

## Implementiert

- `frontend/src/types/fansub.ts`
  - `HistFansubGroupMemberListResponse`, `HistGroupMemberRoleListResponse` und `AnimeContributionListResponse` verwenden `data`.
  - Single-Response-Typen verwenden ebenfalls `data`.
  - `FANSUB_GROUP_ROLE_OPTIONS` enthaelt seed-konforme Rollencodes inkl. `quality_checker`.

- `frontend/src/lib/api.ts`
  - `listMemberRoles(fansubId, memberId)` ruft `/api/v1/admin/fansubs/:id/member-roles?member_id=N` auf.
  - Rollen-Responses werden ueber `data` normalisiert.

- `frontend/src/app/admin/fansubs/[id]/edit/*`
  - `GroupMembersTab`, `MemberRolesTab` und `AnimeContributionsTab` lesen `response.data`.
  - `AnimeContributionModal` nutzt feste anime-contribution Rollencodes statt Freitext.

## Verifikation

- Code-Inspection bestaetigt `.data`-Konsum in den drei Tabs.
- Code-Inspection bestaetigt `member_id` Query in `listMemberRoles`.
- Commits `c3fcb67a`, `eeb615ae`, `0b3227f4` enthalten die geplanten Frontend-Aenderungen.

## Offene Punkte

Keine fuer Plan 04. Plan 05 dokumentiert die zugehoerigen API-Contracts.
