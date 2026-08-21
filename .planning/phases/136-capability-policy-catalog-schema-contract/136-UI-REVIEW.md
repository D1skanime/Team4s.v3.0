# Phase 136 — UI Review

**Audited:** 2026-08-21
**Scope:** final UI gap closure, Plans 136-21 through 136-31
**Baseline:** abstract six-pillar standards plus `AGENTS.md`, `docs/frontend/ui-system.md`, `docs/agent-guidelines-ui.md`, and locked `136-UAT.md` evidence (no phase UI-SPEC exists)
**Screenshots:** no new authenticated screenshots retained by this audit; the running port-3000 UI was detected and CLI capture was attempted, and the locked UAT screenshots/observations at 390×844, 768×1024, and 1440×900 were reviewed

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | German labels are generally specific and correct, but the notes editor still collapses contextual failures under the generic title `Fehler`. |
| 2. Visuals | 3/4 | The exact role palette and hierarchy are coherent, while Standard-Team remains an ad-hoc raw table beside otherwise standardized UI. |
| 3. Color | 4/4 | One bounded 15-key seam drives every audited role surface and deterministic tests prove text, boundary, and focus contrast. |
| 4. Typography | 3/4 | Hierarchy largely inherits global primitives, but local `0.88rem` text and inline `fontWeight: 600` bypass the documented token/component system. |
| 5. Spacing | 2/4 | Standard-Team and the contributor workspace use multiple arbitrary inline/off-scale values instead of the declared 4/8-based spacing scale. |
| 6. Experience Design | 2/4 | Progressive disclosure and scoped states are strong, but DefaultCrew removal failures are silently swallowed and tab semantics/isolated error UAT remain incomplete. |

**Overall: 17/24**

---

## Top 3 Priority Fixes

1. **Expose Standard-Team removal failures** — a failed destructive action currently looks successful or unexplained to the user — replace the empty `catch` with a scoped `ErrorState`/status message, retain the row, and offer retry.
2. **Move Standard-Team onto global table/state primitives and spacing tokens** — the raw table and inline styles weaken responsive predictability and visual consistency — use `Table`, its responsive wrapper/empty pattern, CSS-module classes, and `--space-*` tokens.
3. **Complete keyboard-correct tab behavior and isolatable catalog-error UAT** — ARIA roles alone do not establish the full tabs interaction contract, and the one-context failure has no live proof — use the global `Tabs` primitive (or implement roving focus, Arrow/Home/End behavior, `tabpanel`, and label relationships), then add an injectable per-context failure seam for live verification.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

- **WARNING:** `ReleaseVersionNotesTab` renders the title `Fehler` for every notes failure, leaving the description to carry all context (`frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.tsx:413`). Use a task-specific title such as `Notizen konnten nicht geladen werden` or `Notiz konnte nicht gespeichert werden` according to the operation.
- PASS: the corrected role copy is canonical and user-facing: `Typesetting` and `Karaoke-FX` are kept separate, raw `typesetter` is excluded, and the member picker explains zero-right roles (`FansubAppMemberEditorPanel.tsx:201`).
- PASS: empty/loading/action copy is concrete on Meine Projekte, contributor workspace, Standard-Team, and notes surfaces; German umlauts are correct in the inspected production strings.

### Pillar 2: Visuals (3/4)

- **WARNING:** Standard-Team uses a page-local native table with inline presentation (`DefaultCrewManager.tsx:151-184`) despite the global `Table`/`TableEmptyState` contract. This makes the section visually less cohesive than the adjacent Card/SectionHeader/Badge surfaces and leaves responsive behavior implicit.
- **WARNING:** all 15 role treatments share fixed dark text and border and distinguish roles mainly through a 14% tint plus a 3px accent strip (`globals.css:288-297`). This is accessible and labels prevent color-only meaning, but visually adjacent low-saturation roles can be subtle; retain labels and verify dense multi-role rows at high zoom before increasing density.
- PASS: progressive disclosure is present in project cards and release notes, and the workspace uses `PageHeader`, `Card`, `Tabs`, and `AdjacentNavigation` rather than inventing a parallel visual language.

### Pillar 3: Color (4/4)

- PASS: `ROLE_COLOR_KEYS` contains exactly 15 bounded values and unknown/malformed input falls back to neutral (`frontend/src/lib/roleCatalog.ts:3-30,49-57`).
- PASS: one color-key-to-token seam owns the treatments; no role-code selector determines presentation (`frontend/src/styles/globals.css:270-300`). The four audited consumers emit `data-color-key` through the same adapter.
- PASS: the deterministic suite resolves the actual stylesheet and enforces text/background ≥4.5:1 and border/background plus focus/background ≥3:1 for every treatment (`frontend/src/lib/roleCatalog.accessibility.test.ts:37-57`). Locked UAT confirms Wine Typesetting, Mustard Karaoke-FX, and Steel Blue Encoding on active surfaces.

### Pillar 4: Typography (3/4)

- **WARNING:** the contributor workspace introduces `font-size: 0.88rem` twice (`workspace.module.css:21,52`) rather than a declared typography token, and Standard-Team hardcodes `fontWeight: 600` (`DefaultCrewManager.tsx:154-155`). Consolidate these through the existing global text/table primitives or semantic typography tokens.
- PASS: PageHeader/SectionHeader hierarchy and global Button/Badge typography are reused, and inspected role labels remain legible rather than being replaced by icons or color alone.

### Pillar 5: Spacing (2/4)

- **WARNING:** Standard-Team contains repeated arbitrary inline values `0.35rem 0.5rem`, `0.5rem`, `1rem`, and `0.35rem` (`DefaultCrewManager.tsx:134-170,187,228`). Several values are outside or obscure the declared `--space-1` through `--space-9` scale and cannot respond through a component-owned stylesheet.
- **WARNING:** the new workspace uses off-scale `18px` gaps/padding and `10px` gaps (`workspace.module.css:3,12,34`) while the documented scale is 4/8/12/16/24/32/48/64/80 (`globals.css:117-125`). Normalize to tokens and document the minimum geometry for the narrow transition.
- PASS: the workspace has `min-width: 0`, wraps breadcrumbs/actions, and locked UAT reports no horizontal overflow at 390×844, 768×1024, and desktop.

### Pillar 6: Experience Design (2/4)

- **WARNING:** failed Standard-Team removal is swallowed without any feedback (`DefaultCrewManager.tsx:103-113`). This is a direct interaction-quality defect on a destructive action and prevents users from knowing whether the crew assignment remains authoritative.
- **WARNING:** the member editor declares `tablist`/`tab` and `aria-controls`, but panels are plain sections without `role="tabpanel"`/`aria-labelledby`, tabs have no roving `tabIndex`, and no Arrow/Home/End behavior is implemented (`FansubAppMemberEditorPanel.tsx:126-169`). The notes segmented tabs likewise expose tab roles without associated tabpanels (`ReleaseVersionNotesTab.tsx:417-448`). Reuse global `Tabs` to close the semantic and keyboard gap.
- **WARNING:** locked UAT remains `partial`: seven tests pass and the isolated catalog-context failure test is blocked because stopping the whole backend also removes prerequisites (`136-UAT.md:45-60`). Automated provider tests are valuable but do not constitute live interaction evidence for this failure mode.
- PASS: loading, empty, permission-denied, and navigation-error states are scoped to their owning surfaces; workspace tabs are capability-gated; Founder/Co-Leader controls are progressively disclosed; refresh-session behavior is covered by focused tests.
- PASS: Plans 136-21–31 did not modify or route new work through the excluded legacy `/anime/[id]/group/[groupId]/releases` surface. Existing repository references predate and remain outside this review scope.

---

## Registry Safety

Skipped: `components.json` is absent, so shadcn/third-party registry auditing does not apply.

## Evidence and Limitations

- Locked UAT: 7 pass, 0 fail, 1 blocked; role presentation approved with visible keyboard focus at 390×844, 768×1024, and desktop/1440×900.
- Automated evidence reviewed: 15-treatment contrast suite, focused role consumer suites, capability/access tests, and source exclusion gates recorded in 136-30/31 summaries and 136-VERIFICATION.md.
- New capture limitation: the frontend answered HTTP 200, but the available containerized Playwright command did not retain authenticated product-route captures in the git-safe host directory. Scores therefore use source plus the locked live evidence and do not claim a fresh visual comparison.

## Files Audited

- `.planning/phases/136-capability-policy-catalog-schema-contract/136-{21..31}-{PLAN,SUMMARY}.md`
- `.planning/phases/136-capability-policy-catalog-schema-contract/136-{CONTEXT,UAT,VALIDATION,VERIFICATION}.md`
- `frontend/src/lib/roleCatalog.ts`
- `frontend/src/lib/roleCatalog.accessibility.test.ts`
- `frontend/src/styles/globals.css`
- `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberEditorPanel.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/DefaultCrewManager.tsx`
- `frontend/src/components/contributions/AnimeGroupCard.tsx`
- `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.tsx`
- `frontend/src/app/me/releases/[versionId]/workspace/page.tsx`
- `frontend/src/app/me/releases/[versionId]/workspace/workspace.module.css`
- `frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.ts`
- `frontend/src/components/groups/GroupHistorySection.tsx`
