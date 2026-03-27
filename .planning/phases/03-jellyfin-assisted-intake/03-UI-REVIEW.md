# Phase 03 - UI Review

**Audited:** 2026-03-27
**Baseline:** `03-UI-SPEC.md`
**Screenshots:** captured (used provided runtime captures)
**Runtime URL:** `http://localhost:3002/admin/anime/create` plus supporting checks on `/admin/anime` and `/admin/anime/3/edit`
**Screenshot Directory:** `C:/Users/admin/Documents/Team4s/.planning/ui-reviews` (`air-create.png`, `air-overview.png`, `air-edit.png`)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 2/4 | Overview and preview guidance improved, but the shipped flow still misses several contract strings and leaves core form labels in English. |
| 2. Visuals | 3/4 | The overview now exposes a real Jellyfin entry and the candidate-review components are structurally strong, but the runtime handoff after save is still visually incomplete. |
| 3. Color | 2/4 | Accent use is disciplined in the Jellyfin cards, but the route and studio shell still rely on widespread hardcoded hex values. |
| 4. Typography | 2/4 | Candidate review follows the spec better than before, while the shared create shell still breaks the contract with mixed sizes, weights, and English field labels. |
| 5. Spacing | 2/4 | The Jellyfin-only modules stay on the 4px grid, but the actual create and edit shells still inherit off-scale shared spacing rules. |
| 6. Experience Design | 2/4 | Review and hydration are now separated and auth is surfaced earlier, but the post-save runtime evidence still does not prove a smooth overview-to-edit continuation for Air. |

**Overall: 13/24**

---

## Top 3 Priority Fixes

1. **Fix the post-save continuity for newly created anime** - operators cannot trust the flow if the new record is not clearly visible in overview and `/admin/anime/3/edit` remains stuck on loading - make the overview confirm the just-created record and ensure the edit route resolves its initial fetch for fresh Jellyfin-assisted records.
2. **Finish the Phase 03 copy contract on the create form** - mixed English/German labels and missing empty/destructive contract text weaken operator confidence during intake - localize the shared field labels and render the exact empty-state and discard-confirmation language from `03-UI-SPEC.md`.
3. **Replace local-dev upload language with operator-safe readiness guidance** - the current cover upload note still reads like an internal workaround instead of a supported step - move auth/upload readiness into a dedicated preflight block near the title actions and remove "lokal" framing from the live workflow.

---

## Detailed Findings

### Pillar 1: Copywriting (2/4)
- Material improvement from the prior 10/24 audit: `/admin/anime` no longer says Jellyfin is "next phase". It now exposes live create-flow entry copy and a `Mit Jellyfin starten` action, which aligns with the current product reality. See `frontend/src/app/admin/anime/page.tsx:85-96`.
- Material improvement in the create flow: the route now explains the explicit sequence "Treffer laden -> Treffer auswaehlen -> Vorschau laden", which addresses the previous review/hydration ambiguity. See `frontend/src/app/admin/anime/create/page.tsx:505-513`.
- The create route still misses the spec empty-state copy. The contract requires `Noch keine Jellyfin-Quelle gewaehlt`, but the shipped message is `Noch keine Jellyfin-Quelle geladen`. See `frontend/src/app/admin/anime/create/page.tsx:523-529`.
- The destructive contract is still incomplete. The button says `Auswahl verwerfen`, but the required confirmation sentence `Diese Jellyfin-Vorschau wird verworfen...` is not rendered as operator-facing copy near that action. See `frontend/src/app/admin/anime/create/page.tsx:613-617`.
- Core form labels remain English in the shared create shell: `Title`, `Type`, `Content Type`, `Year`, `Max Episodes`, `Description`, and `Cover Image`. That still clashes with the German guidance around the Jellyfin flow. See `frontend/src/app/admin/anime/components/ManualCreate/ManualCreateWorkspace.tsx:83-221` and `frontend/src/app/admin/anime/components/CreatePage/AnimeCreateCoverField.tsx:29-37`.
- Candidate action labels are clearer than before, but they still do not fully match the contract verbs `Treffer pruefen`, `Vorschau uebernehmen`, `Anderen Treffer waehlen`. The shipped labels are `Diesen Treffer ansehen` and `Jellyfin-Vorschau laden`. See `frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateCard.tsx:84-92`.

### Pillar 2: Visuals (3/4)
- Clear improvement from the previous audit: the overview now gives Jellyfin its own live section with a dedicated action instead of presenting the feature as unavailable. Runtime evidence: `air-overview.png`; code: `frontend/src/app/admin/anime/page.tsx:84-98`.
- The candidate-review implementation now follows the intended structure well: compact picker plus evidence-dense cards, visible path/library context, confidence badge, and stable preview tiles. See `frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateReview.tsx:24-58` and `frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateCard.tsx:48-93`.
- The title-adjacent source actions are present in the same row of the shared create workspace, which matches the phase entry contract. See `frontend/src/app/admin/anime/components/ManualCreate/ManualCreateWorkspace.tsx:83-95` and `frontend/src/app/admin/anime/create/page.tsx:571-593`.
- The runtime create capture for Air still shows a largely manual-looking shell with the Jellyfin area absent in the captured moment, so the visual centerpiece of the phase is not consistently evident in runtime evidence unless the operator has already searched. Runtime evidence: `air-create.png`.
- The post-save visuals remain weak. The supplied overview capture does not clearly confirm Air as the newly created record even though the runtime claim says Air was created as anime ID 3, and the edit capture is only the loading shell. Runtime evidence: `air-overview.png`, `air-edit.png`.

### Pillar 3: Color (2/4)
- The Jellyfin review cards still use accent color in the right places: selected card border, confidence state, and primary preview CTA. See `frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateCard.module.css:10-12`, `frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateCard.module.css:63-65`, and `frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateCard.module.css:137-147`.
- The broader route styling still does not route color through a cleaner token layer. Hardcoded values like `#ff6a3d`, `#ffffff`, `#f9f9f9`, `#e1e1e6`, and `#dc3545` are spread through both the create shell and overview shell. See `frontend/src/app/admin/anime/AdminStudio.module.css:33-35`, `frontend/src/app/admin/anime/AdminStudio.module.css:197-225`, `frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateCard.module.css:5-7`, and `frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateReview.module.css:19-35`.
- The current runtime does at least avoid accent overuse: the orange focus remains mostly reserved for CTA, selected candidate, and status emphasis, which is closer to the 60/30/10 intent than the prior audit.

### Pillar 4: Typography (2/4)
- The candidate review UI remains the strongest typography area: 20px/600 for titles and 14px metadata with wrapping path context. See `frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateCard.module.css:27-39` and `frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateCard.module.css:73-84`.
- The shared studio shell still violates the spec with extra weights and sizes such as 500, 700, and 13px metadata text. See `frontend/src/app/admin/anime/AdminStudio.module.css:44-58`, `frontend/src/app/admin/anime/AdminStudio.module.css:97-101`, `frontend/src/app/admin/anime/AdminStudio.module.css:141-145`, and `frontend/src/app/admin/anime/AdminStudio.module.css:248-251`.
- The create form still weakens operator clarity by mixing English data-entry labels with German helper and state copy. See `frontend/src/app/admin/anime/components/ManualCreate/ManualCreateWorkspace.tsx:83-221`.
- The type suggestion formatting itself is good and materially improved: `Typ-Vorschlag` plus explicit reasoning and confidence now renders beside the editable type field. See `frontend/src/app/admin/anime/create/page.tsx:594-603` and `frontend/src/app/admin/anime/utils/jellyfin-intake-type-hint.ts:22-43`.

### Pillar 5: Spacing (2/4)
- The Jellyfin-only modules still honor the phase spacing scale cleanly: 24, 16, 12, 8, and 4px dominate the candidate-review components. See `frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateCard.module.css:1-4`, `frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateCard.module.css:22-25`, and `frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateReview.module.css:1-13`.
- The rendered route remains dominated by inherited shell spacing that does not align to the contract, including 12px radii, 20px blocks, and other non-phase-specific layout values. See `frontend/src/app/admin/anime/AdminStudio.module.css:33-37`, `frontend/src/app/admin/anime/AdminStudio.module.css:77-80`, `frontend/src/app/admin/anime/AdminStudio.module.css:175-189`, and `frontend/src/app/admin/anime/AdminStudio.module.css:265-280`.
- The create screenshot for Air still reads as a generic stacked admin form instead of a deliberately tuned intake surface, which reflects that the layout contract is only partially enforced in the actual shell. Runtime evidence: `air-create.png`.

### Pillar 6: Experience Design (2/4)
- Real improvement from the previous audit: review versus hydration is now explicitly separated. Selecting a candidate only opens review state, while loading the preview is a second action that then hydrates the draft. See `frontend/src/app/admin/anime/create/page.tsx:425-451`, `frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateReview.tsx:24-58`, and `frontend/src/app/admin/anime/hooks/internal/useJellyfinIntakeImpl.ts:94-115`.
- Real improvement in auth readiness: the create page now surfaces the auth requirement before submit in a visible warning box, instead of only after failure. See `frontend/src/app/admin/anime/create/page.tsx:498-503`.
- The create route also threads loading state into the source action and review CTA: `Jellyfin laedt...` for search and `Vorschau laedt...` for preview. See `frontend/src/app/admin/anime/create/page.tsx:576-581` and `frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateCard.tsx:90-91`.
- The biggest remaining blocker is runtime continuity after save. The supplied `air-overview.png` does not visibly confirm Air in the list even though the test context says Air became anime ID 3, and `air-edit.png` shows only `Anime-Daten werden geladen...` with no resolved editor or Jellyfin sync context. Runtime evidence: `air-overview.png`, `air-edit.png`; edit shell code: `frontend/src/app/admin/anime/[id]/edit/page.tsx:45-67` and `frontend/src/app/admin/anime/[id]/edit/page.tsx:117-167`.
- Upload readiness is still not operator-safe. The cover control says `Cover hochladen (lokal)` and explains that upload is only for local development, which undermines confidence in a flow that is otherwise presented as live and production-like. See `frontend/src/app/admin/anime/components/CreatePage/AnimeCreateCoverField.tsx:62-68`.
- Accessibility is better than before in one key spot: candidate preview alt text now includes both asset label and candidate title. See `frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateCard.tsx:20-23`.

---

## Files Audited
- `.planning/phases/03-jellyfin-assisted-intake/03-UI-SPEC.md`
- `.planning/phases/03-jellyfin-assisted-intake/03-CONTEXT.md`
- `.planning/phases/03-jellyfin-assisted-intake/03-01-PLAN.md`
- `.planning/phases/03-jellyfin-assisted-intake/03-02-PLAN.md`
- `.planning/phases/03-jellyfin-assisted-intake/03-03-PLAN.md`
- `.planning/phases/03-jellyfin-assisted-intake/03-04-PLAN.md`
- `.planning/phases/03-jellyfin-assisted-intake/03-01-SUMMARY.md`
- `.planning/phases/03-jellyfin-assisted-intake/03-02-SUMMARY.md`
- `.planning/phases/03-jellyfin-assisted-intake/03-03-SUMMARY.md`
- `.planning/phases/03-jellyfin-assisted-intake/03-04-SUMMARY.md`
- `frontend/src/app/admin/anime/create/page.tsx`
- `frontend/src/app/admin/anime/page.tsx`
- `frontend/src/app/admin/anime/[id]/edit/page.tsx`
- `frontend/src/app/admin/anime/components/ManualCreate/ManualCreateWorkspace.tsx`
- `frontend/src/app/admin/anime/components/ManualCreate/JellyfinDraftAssets.tsx`
- `frontend/src/app/admin/anime/components/CreatePage/AnimeCreateCoverField.tsx`
- `frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateReview.tsx`
- `frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateCard.tsx`
- `frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateReview.module.css`
- `frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateCard.module.css`
- `frontend/src/app/admin/anime/hooks/internal/useJellyfinIntakeImpl.ts`
- `frontend/src/app/admin/anime/utils/jellyfin-intake-type-hint.ts`
- `frontend/src/app/admin/anime/AdminStudio.module.css`
- `frontend/src/app/admin/admin.module.css`
- `C:/Users/admin/Documents/Team4s/.planning/ui-reviews/air-create.png`
- `C:/Users/admin/Documents/Team4s/.planning/ui-reviews/air-overview.png`
- `C:/Users/admin/Documents/Team4s/.planning/ui-reviews/air-edit.png`
