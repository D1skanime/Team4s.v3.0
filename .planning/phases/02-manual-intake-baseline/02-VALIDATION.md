# Phase 02 Validation

Phase: `02-manual-intake-baseline`  
Status: planned  
Validation source: `02-RESEARCH.md` Validation Architecture, revised to match the actual Phase 2 plan files.

## Objective

Prove that Phase 2 delivers manual-intake-only behavior on the shared editor surface:
- intake starts from an explicit manual/Jellyfin choice at `/admin/anime`
- manual create stays draft-only until explicit save
- `title + cover` is the minimum create contract on both frontend and backend
- existing cover upload behavior remains usable in both create and edit

## Plan-To-Validation Map

| Plan | Requirement IDs | What must be proven | Automated command |
|------|------------------|---------------------|-------------------|
| `02-01` | `INTK-01` | Intake entry exposes the manual start path and reserved Jellyfin branch; manual copy states the minimum contract | `cd frontend && npm test -- src/app/admin/anime/page.test.tsx src/app/admin/anime/hooks/useManualAnimeDraft.test.ts` |
| `02-02` | `INTK-04`, `INTK-05`, `ASST-04` | Backend create rejects missing `cover_image`, accepts manual-only payloads, and preserves uploaded cover filenames | `cd backend && go test ./internal/handlers -run 'TestValidateAdminAnimeCreateRequest' -count=1` |
| `02-03` | `INTK-02`, `INTK-04`, `ASST-04` | Create route stays preview-before-save, default CTA is `Anime erstellen`, create-side cover upload stays on `/api/admin/upload-cover`, success redirects to `/admin/anime/{id}/edit`, and edit-cover upload seam remains unchanged | `cd frontend && npm test -- src/app/admin/anime/create/page.test.tsx src/app/admin/anime/components/shared/AnimeEditorShell.test.tsx src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.test.ts` |

## Required Test Files

These files must exist by the end of execution because the plans rely on them as Nyquist coverage:

- `frontend/src/app/admin/anime/page.test.tsx`
- `frontend/src/app/admin/anime/hooks/useManualAnimeDraft.test.ts`
- `backend/internal/handlers/admin_content_test.go`
- `frontend/src/app/admin/anime/create/page.test.tsx`
- `frontend/src/app/admin/anime/components/shared/AnimeEditorShell.test.tsx`
- `frontend/src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.test.ts`

## Wave Checks

### Wave 1

Run after `02-01` and `02-02` complete:

```bash
cd frontend && npm test -- src/app/admin/anime/page.test.tsx src/app/admin/anime/hooks/useManualAnimeDraft.test.ts
cd backend && go test ./internal/handlers -run 'TestValidateAdminAnimeCreateRequest' -count=1
```

Pass conditions:
- `/admin/anime` coverage asserts the manual CTA label `Neu manuell`
- manual draft-state coverage asserts `empty`, `incomplete`, and `ready`
- backend validation coverage proves `cover_image` is required and manual-only payloads remain valid

### Wave 2

Run after `02-03` completes:

```bash
cd frontend && npm test -- src/app/admin/anime/create/page.test.tsx src/app/admin/anime/components/shared/AnimeEditorShell.test.tsx src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.test.ts
```

Pass conditions:
- create-route tests assert inline draft preview, `/api/admin/upload-cover`, and redirect to `/admin/anime/{id}/edit`
- create-route tests assert default save CTA copy `Anime erstellen`
- shared shell tests prove create submit is gated by readiness, not only dirty state
- edit-cover mutation tests prove the persisted upload seam remains intact

## Phase Gate

Run before marking Phase 2 complete:

```bash
cd frontend && npm test
cd backend && go test ./internal/handlers ./internal/repository
```

Manual smoke checks:
1. Open `/admin/anime` and confirm the primary intake action is `Neu manuell`.
2. Open `/admin/anime/create` and confirm the save bar starts at `Noch kein manueller Entwurf`.
3. Enter only a title and confirm the save bar moves to `Entwurf unvollstaendig` while the primary CTA remains disabled.
4. Upload a cover through the existing draft upload route and confirm the CTA becomes enabled with `Entwurf bereit zum Anlegen`.
5. Save and confirm the browser lands on `/admin/anime/{id}/edit`.
6. From the edit page, replace the cover again and confirm the persisted edit-cover path still works.

## Out Of Scope Guardrails

Validation for this phase must not require:
- Jellyfin search or preview flows
- provenance badges or per-field ownership UI
- relation CRUD
- non-cover manual asset uploads

If any test or manual check needs those behaviors, it belongs to a later phase and should be removed from Phase 2 validation.
