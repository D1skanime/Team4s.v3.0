# Phase 03 Validation

Phase: `03-jellyfin-assisted-intake`  
Status: planned  
Validation source: `03-RESEARCH.md` Validation Architecture.

## Objective

Prove that Phase 3 delivers a preview-only Jellyfin-assisted intake flow on top of the shared create surface:
- Jellyfin-assisted create starts from the shared draft and never auto-creates a Team4s anime
- admins can search or browse Jellyfin candidates with enough evidence to choose the correct source
- candidate selection hydrates a rich, editable draft before save
- type hints stay visible and advisory only
- asset deselection happens only after draft handoff, not on candidate cards

## Plan-To-Validation Map

| Plan | Requirement IDs | What must be proven | Automated command |
|------|------------------|---------------------|-------------------|
| `03-01` | `JFIN-01`, `JFIN-02`, `JFIN-04`, `JFIN-05`, `JFIN-06` | Backend search returns compact-ranked candidates with title, Jellyfin ID, full path, parent/library context, evidence previews, and advisory type reasoning; preview endpoint returns draft-only metadata and asset-slot payloads without persistence | `cd backend && go test ./internal/handlers -run "Test.*Jellyfin.*(Search|IntakePreview)" -count=1` |
| `03-02` | `JFIN-01`, `JFIN-02`, `JFIN-06` | Frontend compact-first chooser enforces title gating, shows rich candidate review cards, keeps path evidence visible, and shows type hints/reasons without candidate-level asset toggles | `cd frontend && npm test -- src/app/admin/anime/hooks/useJellyfinIntake.test.ts src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateCard.test.tsx` |

## Required Test Files

These files must exist by the end of execution because the plans rely on them as Nyquist coverage:

- `backend/internal/handlers/jellyfin_intake_preview_test.go`
- `backend/internal/handlers/jellyfin_search_test.go`
- `frontend/src/app/admin/anime/hooks/useJellyfinIntake.test.ts`
- `frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateCard.test.tsx`
- `frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinDraftAssets.test.tsx`
- `frontend/src/app/admin/anime/utils/jellyfin-intake-type-hint.test.ts`

## Wave Checks

### Wave 1

Run after `03-01` completes:

```bash
cd backend && go test ./internal/handlers -run "Test.*Jellyfin.*(Search|IntakePreview)" -count=1
```

Pass conditions:
- search tests assert title-anchored ranking and manual-choice preservation
- candidate evidence includes Jellyfin ID, full path, parent/library context, and poster/banner/logo/background preview references
- preview tests assert draft-only metadata hydration and explicit empty-slot payloads
- type hints include one or more human-readable reasoning strings

### Wave 2

Run after `03-02` completes:

```bash
cd frontend && npm test -- src/app/admin/anime/hooks/useJellyfinIntake.test.ts src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateCard.test.tsx
```

Pass conditions:
- title gating keeps Jellyfin search disabled until the anime-name field is meaningful
- compact chooser opens rich candidate review rather than auto-prefilling immediately
- candidate cards keep full path, Jellyfin ID, and parent/library context visible
- no asset-deselection controls appear on candidate cards
- confidence treatment and type-hint reasoning are visible without taking selection control away from the admin

## Phase Gate

Run before marking Phase 3 complete:

```bash
cd frontend && npm test -- src/app/admin/anime/hooks/useJellyfinIntake.test.ts src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateCard.test.tsx src/app/admin/anime/components/JellyfinIntake/JellyfinDraftAssets.test.tsx src/app/admin/anime/utils/jellyfin-intake-type-hint.test.ts src/app/admin/anime/create/page.test.tsx
cd backend && go test ./internal/handlers -run "Test.*Jellyfin.*(Search|IntakePreview)" -count=1
```

Manual smoke checks:
1. Enter a partial anime name in `/admin/anime/create` and confirm `Jellyfin Sync` stays disabled until the title is meaningful.
2. Trigger Jellyfin intake and confirm the first selection surface stays compact and anchored to the title area.
3. Open a candidate review and confirm poster, banner, logo, and background evidence are visible together with title, Jellyfin ID, full path, and parent/library context.
4. Select a candidate and confirm the shared draft opens immediately prefilled without creating a Team4s anime record.
5. In the draft, confirm imported assets can be removed there rather than from the candidate card.
6. Confirm the suggested type shows a visible explanation and remains editable.

## Out Of Scope Guardrails

Validation for this phase must not require:
- real AniSearch data import
- persistence before explicit create save
- full provenance badges or fill-only resync logic
- non-cover manual upload parity
- relation CRUD

If any test or manual check needs those behaviors, it belongs to a later phase and should be removed from Phase 3 validation.
