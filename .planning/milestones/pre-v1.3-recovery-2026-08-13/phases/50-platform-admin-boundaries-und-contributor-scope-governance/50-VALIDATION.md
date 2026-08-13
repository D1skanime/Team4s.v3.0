# Phase 50 Validation

## Nyquist Checks

- Goal backward check: non-platform users should not reach global admin management surfaces.
  - Covered by platform gate wrappers and gated child components.
- Goal backward check: contributors should work only inside scoped group/release contexts.
  - Covered by `/manage/groups`, contributor detail capability checks, and release-version permission checks.
- Goal backward check: UI hiding must not be the only boundary.
  - Covered by backend permission checks for canonical fansub edits, notes, media, and sanitized editor context.
- Goal backward check: Media and Notizen remain available for eligible contributors.
  - Covered by release-version capabilities and tab filtering.
- Goal backward check: disabled anime rows must not leak through public endpoints.
  - Covered by admin-only anime routes for authenticated reads and identity checks around `include_disabled`.

## Verification Commands

- `cd backend && go test ./cmd/server ./internal/handlers ./internal/permissions ./internal/repository`
- `cd frontend && npm run typecheck`
- `cd frontend && npm test -- --run src/app/admin/my-groups/page.test.tsx src/app/admin/my-groups/[id]/page.test.tsx src/app/admin/episode-versions/[versionId]/edit/page.test.tsx`
- Targeted `git diff --check` over Phase-50 touched files.

## Open Validation Item

- Human UAT should confirm with a Keycloak fansub member/lead account that `/manage/groups` opens, `/admin/fansubs` is blocked, and `/admin/episode-versions/:id/edit?tab=media` shows only Media/Assets and Notizen/Beiträge.
