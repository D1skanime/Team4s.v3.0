---
phase: 148-rollenfarben-wieder-an-den-katalog-anschlie-en
verified: 2026-09-05T19:15:00Z
status: gaps_found
score: 7/9 ROADMAP success criteria verified
overrides_applied: 0
gaps:
  - truth: "SC1 — Kein CSS-Modul weist sich mehr eine Farbe aus einem --role-accent-<code>-Token zu, und kein Selektor wählt eine Farbe anhand eines Rollen-Codes."
    status: failed
    reason: "FansubEdit.module.css still contains ~10 [class] selectors (.fansubEditRoleLead, .fansubEditRoleProjectLead, .fansubEditRoleEditor, .fansubEditRoleTranslator, .fansubEditRoleTimer, .fansubEditRoleTypesetter, .fansubEditRoleQuality, .fansubEditRoleEncoder, .fansubEditRoleDefault, plus .fansubEditRoleBadge/.fansubEditRoleOption's own --role-accent-base self-assignment) that self-assign --role-accent from --role-accent-<code>/-base tokens, and these classes are chosen role-code-keyed via a live getRoleClassName()/roleClassMap pattern in two actively-rendered sibling components."
    artifacts:
      - path: "frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css"
        issue: "Lines 551-627 assign --role-accent: var(--role-accent-<code>) for 9 role-specific classes plus a base/default class; none of these tokens are defined anywhere in the repo (confirmed via grep for their :root/base declarations)."
      - path: "frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.tsx"
        issue: "Lines 60-71 define a local getRoleClassName()/roleClassMap keyed on role_code that selects the dead FansubEdit.module.css classes above; rendered at line 226 in the historical-members list."
      - path: "frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberAddModal.tsx"
        issue: "Lines 76-87 define an identical local getRoleClassName()/roleClassMap; used at lines 253 and 313 in the role-option list of the add-member modal."
    missing:
      - "Migrate GroupMembersHistTable.tsx and FansubAppMemberAddModal.tsx off their local getRoleClassName()/roleClassMap onto the same presentationForRole()/data-color-key/ROLE_CATALOG_CHIP_CLASS seam Plan 148-04 already applied to FansubAppMembersOverview.tsx, OR formally amend ROADMAP Phase 148 scope to explicitly exclude these two files (the way LayeredBadgeArtwork/badge-thresholds/carousel are excluded), with a documented rationale."
  - truth: "SC2 — Keine Referenz auf die nicht existierenden Tokens --role-accent-base, --role-accent-default oder --role-accent-<code> bleibt im Repo übrig — nachweisbar per Suche. LayeredBadgeArtwork.module.css behält seine eigene, bewusst gesetzte --role-accent-Farbe."
    status: failed
    reason: "grep -rln -- '--role-accent-' frontend/src returns frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css in addition to the excluded LayeredBadgeArtwork.module.css (the only other hit, MemberCurrentProjectsSection.test.tsx, is a benign false positive — the string appears only inside a negative-assertion regex literal, not as a live CSS reference). This directly contradicts the blanket, repo-wide claim of SC2 as literally written."
    artifacts:
      - path: "frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css"
        issue: "Contains live references to --role-accent-base, --role-accent-fansub-lead, --role-accent-project-lead, --role-accent-editor, --role-accent-translator, --role-accent-timer, --role-accent-typesetter, --role-accent-quality-checker, --role-accent-encoder — none defined anywhere in the repo."
    missing:
      - "Same fix as SC1's gap — this is the same root cause (Plan 148-04 closed only the one getRoleClassName() instance named by ROADMAP Success Criterion 4 and one specific self-assignment rule in the same CSS file, but left two sibling components using the identical broken pattern untouched)."
deferred: []
human_verification: []
---

# Phase 148: Rollenfarben wieder an den Katalog anschließen — Verification Report

**Phase Goal:** Die Rollenfarbe kommt app-weit wieder sichtbar an — aus genau einer Quelle: `role_definitions.color_key` über den in Phase 136-30 gebauten `data-color-key`-Seam. Die beim damaligen Umbau zurückgebliebenen toten Token-Referenzen, Hex-in-`data-role-code`-Attribute und Kategorie-Klassenmaps sind entfernt, und `data-role-code` trägt überall ausschließlich den stabilen Rollen-Code.

**Verified:** 2026-09-05T19:15:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

**Important note on completion state:** ROADMAP.md and STATE.md already mark Phase 148 as complete (commit `82a15008`) at the time of this verification. This report finds that two of the phase's own nine ROADMAP Success Criteria (SC1, SC2) are not actually met, contradicting that "complete" marking. The plan's own final execution artifact, `148-07-SUMMARY.md`, already discovered and honestly documented this exact gap and explicitly deferred the accept/fix decision to this verification step — this report performs that requested independent verdict and confirms the gap is real, not a false positive.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria, verbatim from `.planning/ROADMAP.md` § "Phase 148")

| # | Truth (paraphrased, see ROADMAP for verbatim German text) | Status | Evidence |
|---|---|---|---|
| 1 | Exactly one CSS derivation point for role color; no CSS module self-assigns `--role-accent` from a `--role-accent-<code>` token; no selector chooses color by role code | ✗ FAILED | `frontend/src/styles/globals.css:288-293` has the single, correct `[data-color-key]{--role-accent:...}` derivation — but `frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css:551-627` still contains 10 role-code-named classes self-assigning `--role-accent` from dead `--role-accent-<code>` tokens, live-consumed by `GroupMembersHistTable.tsx:60-71,226` and `FansubAppMemberAddModal.tsx:76-88,253,313`, both actively rendered on `/admin/fansubs/{id}/edit`. |
| 2 | No reference to the nonexistent tokens `--role-accent-base/-default/-<code>` remains repo-wide, except `LayeredBadgeArtwork.module.css`'s own intentional value | ✗ FAILED | `grep -rln -- "--role-accent-" frontend/src` returns 2 files beyond the excluded one: `FansubEdit.module.css` (real, live match — see SC1) and `MemberCurrentProjectsSection.test.tsx` (confirmed benign false positive: the string appears only inside `expect(...).not.toMatch(/--role-accent-/)`, a negative-assertion regex literal, not a live CSS reference). `LayeredBadgeArtwork.module.css`'s own `--role-accent: #17a7a5` confirmed untouched (`git log d86c2a3f..HEAD -- .../LayeredBadgeArtwork.module.css` = no commits). |
| 3 | `data-role-code` carries only the stable role code, never a hex/category name; `categoryForRole()` removed; six consumers set code for semantics, `data-color-key` for color | ✓ VERIFIED | `grep -rn "categoryForRole" frontend/src` = empty. All `data-role-code={...}` sites (`ProjectMemberHero.tsx:68`, `ProjectMemberReleaseCard.tsx:48`, `MemberCurrentProjectsSection.tsx:193,230`, `ContributionCard.tsx:80`, `me/projects/.../page.tsx:271`, `PublicNoteCard.tsx:84`, `MemberBadgeChain.tsx:737`) read `role.code`/`roleCode`, none read `.color_key`. `roleCatalog.ts`'s `presentationForRole()` returns `{colorKey, iconKey}` separately from the caller's own `role.code` usage. |
| 4 | `getRoleClassName()` and its category-class map removed from `FansubAppMembersOverview.tsx`; badges there use the same seam as everywhere else | ✓ VERIFIED (as literally scoped to this one file) | `grep -n "getRoleClassName" ".../FansubAppMembersOverview.tsx"` = empty; the file's three role-badge sites use `data-color-key={presentationForRole(roles, role).colorKey}` (lines 220, 312, 368). Note: two *sibling* components in the same admin area (`GroupMembersHistTable.tsx`, `FansubAppMemberAddModal.tsx`) still define their own, differently-scoped `getRoleClassName()` — SC4 names `FansubAppMembersOverview.tsx` specifically and is met for that file, but this is the same underlying pattern that causes SC1/SC2 to fail. |
| 5 | `presentationForRole()` decouples icon/color: unknown `icon_key` → neutral icon but valid `color_key` preserved; unknown `color_key` still falls back to neutral | ✓ VERIFIED | `frontend/src/lib/roleCatalog.ts:47-52` (`presentationForRole`) confirmed to only null out `iconKey`, never `colorKey`, on an unknown icon. `roleCatalog.test.ts:47-63` explicitly tests all five named leadership roles (`fansub_lead`, `founder`, `co_leader`, `techadmin`, `gfxler`) with `icon_key:'other'` and asserts their real hex still resolves; `roleCatalog.test.ts:44` and `:36-37` separately assert an unknown `color_key`/unknown role still falls back to `neutral`. Test run confirmed green (`5/5` in `roleCatalog.test.ts`). |
| 6 | Public note card gets `role_color_key` end-to-end (all 3 query sites, OpenAPI, both TS types, backend test on real query result) with no extra client fetch | ✓ VERIFIED | Backend: `COALESCE(rd.color_key, '') AS role_color_key` present at all 3 sites (`release_detail_public_repository.go:466`, `release_detail_public_repository_helpers.go:402`, `project_member_public_repository.go:251`). `shared/contracts/openapi.yaml` has `role_color_key` on both schemas (2 occurrences). `frontend/src/types/{releaseDetail,projectMember}.ts` both carry `role_color_key: string`. `public_note_role_code_integration_test.go:126-144` is a real Postgres-backed test proving the value at all 3 sites and its independence from a `label_de` change. `go build ./...` and `go vet ./...` both exit 0 (independently re-run). |
| 7 | Frontend tests prove, for ≥1 surface per seam type, both `data-role-code`/`data-color-key` correctness, and that a `color_key` change changes color while a `label_de` change does not | ✓ VERIFIED | DTO-passthrough seam: `PublicNoteCard.test.tsx:158-181` isolates the variable exactly — `roleColorKey` fixed + `roleLabel` changed → `data-color-key` unchanged; `roleColorKey` varied (lines 111-117) → `data-color-key` changes accordingly. Catalog-lookup seam: `MemberCurrentProjectsSection.test.tsx:115-137` renders roles whose local `label_de` is deliberately stale/wrong and shows the rendered label/color both come from the catalog rows (`data-role-code`/`data-color-key` correctly resolved per catalog `color_key`, independent of the input's own label); `roleCatalog.test.ts` confirms `presentationForRole()` never reads `label_de` at all. Independently re-ran all four relevant test files: 53/53 pass. |
| 8 | Backend/frontend/contract tests green, zero new failures vs. baseline; live UAT (`getComputedStyle`, not visual) confirms rendered role color on release-detail note card and project-member page | ✓ VERIFIED | Full frontend suite independently re-run: 290 files / 2226 tests passed, 1 skipped, 0 failures — matches `148-07-SUMMARY.md`'s claim exactly. Backend `go build`/`go vet` independently re-run, both exit 0. `TestPublicNoteRoleCode`'s code and assertions independently read and confirmed sound (skips cleanly without a DSN; the assertions are real Postgres-backed at the source, not self-reads). Live UAT itself (`148-07-PLAN.md` Task 2, `checkpoint:human-verify`) was already run and explicitly approved by the human verifier during phase execution, with concrete measured `getComputedStyle` hex values recorded in `148-07-SUMMARY.md` that match the exact `[data-color-key]` selectors independently confirmed present in `globals.css` — not re-run live by this verifier, but the underlying static evidence and the already-completed human sign-off together support this criterion. |
| 9 | HC-09 audit table corrected: no production reference (not "zero references repo-wide"); counting-method error named | ✓ VERIFIED | `.planning/audits/2026-09-05-hardcoding-drift-audit.md:358-407` — HC-09 section now states "Vier Konstanten haben keine Produktionsreferenz" (not the false "null Referenzen im gesamten Repo" claim), with an addendum explaining the qualified-`permissions.X`-grep counting gap and citing `git show 79bbdff9` as the Phase-147 remediation evidence. `grep -n "null Referenzen im gesamten Repo"` on the audit file returns empty. |

**Score:** 7/9 ROADMAP success criteria verified. SC1 and SC2 FAILED — both from the same, single root cause.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `frontend/src/styles/globals.css` | Single `[data-color-key]` → `--role-accent` derivation | ✓ VERIFIED | Lines 271-306; correct single-source derivation with neutral default and `.role-catalog-chip` helper class. |
| `frontend/src/lib/roleCatalog.ts` | `categoryForRole()` removed; `presentationForRole()` decouples icon/color; `boundedColorKey()` exported | ✓ VERIFIED | Confirmed by direct read; `categoryForRole` absent repo-wide. |
| `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersOverview.tsx` | `getRoleClassName()`/colorClassMap removed | ✓ VERIFIED | Uses `presentationForRole(...).colorKey` at 3 sites. |
| `frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css` | Zero `--role-accent-<code>` self-assignments (per SC1/SC2) | ✗ STUB (partial cleanup) | The one specific rule Plan 148-04 targeted (`.fansubEditMemberRoleToggle`) was cleaned; 10 other role-specific classes in the same file (lines 551-627) still self-assign from dead tokens. |
| `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.tsx` | (not explicitly named by any plan, but structurally required by SC1/SC2's blanket wording) | ⚠️ ORPHANED from the seam | Live-rendered, uses the dead-token classes above via its own `getRoleClassName()`. |
| `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberAddModal.tsx` | Same | ⚠️ ORPHANED from the seam | Live-rendered, identical local `getRoleClassName()`/roleClassMap pattern. |
| `frontend/src/components/profile/RoleBadgeCard.module.css` + `MemberBadgeChain.tsx` | Dead per-code selectors removed; `data-color-key` wired | ✓ VERIFIED | 12 dead `[data-role-code]` selectors removed; `MemberBadgeChain.tsx:737-738` carries both attributes. |
| Backend `release_detail_public_repository{,_helpers}.go`, `project_member_public_repository.go` | `role_color_key` at all 3 query sites | ✓ VERIFIED | Confirmed via direct read; `go build`/`go vet` green. |
| `shared/contracts/openapi.yaml`, `frontend/src/types/{releaseDetail,projectMember}.ts` | `role_color_key` field | ✓ VERIFIED | Present in all three. |
| `.planning/audits/2026-09-05-hardcoding-drift-audit.md` | HC-09 correction | ✓ VERIFIED | Confirmed corrected text and addendum. |
| `frontend/src/components/profile/LayeredBadgeArtwork.module.css` | Untouched, own hardcoded `--role-accent` | ✓ VERIFIED | No commits since `d86c2a3f`; value `#17a7a5` intact. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `globals.css` `[data-color-key]` rule | `--role-chip-accent` seam (Phase 136-30) | CSS custom-property fallback chain | ✓ WIRED | `--role-accent: var(--role-chip-accent, #596176)` reads the pre-existing, working catalog-hex seam. |
| `presentationForRole()` consumers (7 sites) | `data-role-code`/`data-color-key` DOM attributes | Direct prop/attribute assignment | ✓ WIRED | Confirmed across `ProjectMemberHero`, `ProjectMemberReleaseCard`, `MemberCurrentProjectsSection` (×2), `ContributionCard`, `me/projects/.../page.tsx`, `MemberBadgeChain`. |
| Public note DTOs (`role_color_key`) | `PublicNoteCard`'s `data-color-key` | `boundedColorKey()` normalization (commit `3c93769b`) | ✓ WIRED | Confirmed: raw uppercase DB value → `boundedColorKey()` → lowercase, bounded, `'other'`→`'neutral'`. This was a real defect caught only by live UAT, since fixed. |
| `GroupMembersHistTable.tsx`/`FansubAppMemberAddModal.tsx` `getRoleClassName()` | `FansubEdit.module.css`'s dead `.fansubEditRole*` classes | CSS Modules class lookup | ✗ NOT WIRED to any real color | The classes resolve to declared CSS rules, but those rules reference undefined custom properties — the chain is technically "wired" (imports work, classes apply) but semantically dead: `var(--role-accent-<code>)` with no fallback and no definition resolves to nothing, same failure mode the Ausgangsbefund described for the 10 originally-identified dead modules. |

### Requirements Coverage

Phase 148 declares `requirements: []` in every plan's frontmatter, consistent with the ROADMAP's explicit note: `Requirements: TBD (Restbefunde aus Phase 147 ... kein v1.4-Requirement-Mapping)`. `grep -n "148" .planning/REQUIREMENTS.md` returns no hits — no Phase 148 entries exist in REQUIREMENTS.md, and no plan claims an orphaned ID. This is consistent, not an oversight.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css` | 551-627 | Dead `var(--role-accent-<code>)` reference (undefined custom property) | 🛑 Blocker | Directly falsifies ROADMAP SC1/SC2; the classes silently render neutral/inherited color for two live admin surfaces, reproducing the exact regression this phase exists to fix. |
| — | — | No `TBD`/`FIXME`/`XXX` debt markers found in any phase-148-modified file | — | Clean |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| `categoryForRole()` fully removed | `grep -rn "categoryForRole" frontend/src` | empty | ✓ PASS |
| `getRoleClassName` removed from the one SC4-named file | `grep -n "getRoleClassName" FansubAppMembersOverview.tsx` | empty | ✓ PASS |
| Repo-wide dead-token grep (SC2's literal acceptance test) | `grep -rln -- "--role-accent-" frontend/src` | `FansubEdit.module.css`, `MemberCurrentProjectsSection.test.tsx` (false positive) | ✗ FAIL |
| Frontend test suite, full run | `npx vitest run` (in container) | 290 files / 2226 tests passed, 1 skipped, 0 failed | ✓ PASS |
| Backend build/vet | `go build ./...` / `go vet ./...` (in container) | both exit 0 | ✓ PASS |
| Targeted test files (PublicNoteCard, roleCatalog, roleCatalog.accessibility, MemberCurrentProjectsSection) | `npx vitest run <4 files>` | 53/53 passed | ✓ PASS |

### Human Verification Required

None required by this verification. The one item that would normally route here (live-rendered, role-dependent color via `getComputedStyle` on `:3000`) was already executed and explicitly approved as a `checkpoint:human-verify` gate during phase execution (`148-07-PLAN.md` Task 2, sign-off recorded in `148-07-SUMMARY.md` with concrete measured hex values). This verifier independently confirmed the static code paths that produced those measurements are correct and present in the current tree, so no further human re-test is requested for that specific check.

### Gaps Summary

Phase 148 substantively achieves its stated goal for 7 of 9 ROADMAP Success Criteria, verified independently against the current codebase (build/test runs, direct file reads, targeted greps) rather than trusting the SUMMARY narratives. The `presentationForRole()`/`categoryForRole()` decoupling (SC3, SC5), the `FansubAppMembersOverview`/`RoleBadgeCard`/`MemberBadgeChain` seam wiring (SC4, and the artifact behind SC1's derivation point), the public-note `role_color_key` end-to-end pipeline (SC6), the dual-seam-type test coverage (SC7), the green regression suite plus already-approved live UAT (SC8), and the HC-09 audit correction (SC9) are all real and correctly implemented — not stubs, not orphaned wiring.

However, SC1 and SC2 — both blanket, repo-wide claims with only `LayeredBadgeArtwork.module.css` explicitly excluded — are FAILED. Independent verification confirms `FansubEdit.module.css` still defines ~10 CSS classes that self-assign `--role-accent` from `--role-accent-<code>` tokens that are undefined anywhere in the repository, and that these classes are not dead code: `GroupMembersHistTable.tsx` and `FansubAppMemberAddModal.tsx` each maintain their own local, role-code-keyed `getRoleClassName()` that actively selects these exact classes, and both components are imported and rendered on the live admin fansub-edit page (via `GroupMembersTab.tsx`, `FansubAppMembersSection.tsx`, and `ClaimManagementPanel.tsx`, all reachable from `/admin/fansubs/{id}/edit`). This is precisely the same failure pattern (dead token → invalid-at-computed-value-time → color falls to `currentColor`/transparent) that the phase's own Ausgangsbefund named for the ten originally-identified modules — just in two sibling components Plan 148-04 did not touch.

This gap was self-discovered and honestly documented by the phase's own final plan (`148-07-SUMMARY.md`), which explicitly declined to silently absorb it into "phase done" and instead deferred the accept/fix decision to this verification step. This verifier's independent grep/trace confirms the finding is accurate, not a false alarm, and that it is a **must-have failure**, not a scope-note-eligible exclusion — no ROADMAP text excludes these two files the way badge thresholds/artwork/carousel/Live-UAT out-of-scope items are excluded.

**Recommended path to closure:** a small gap-closure plan that migrates `GroupMembersHistTable.tsx` and `FansubAppMemberAddModal.tsx` off their local `getRoleClassName()`/`roleClassMap` onto the same `presentationForRole()`/`data-color-key`/`ROLE_CATALOG_CHIP_CLASS` seam Plan 148-04 already applied to `FansubAppMembersOverview.tsx` — the precedent and pattern already exist in this same phase's own commits (`c767ed17`). Alternatively, if the two files are judged genuinely out of scope, ROADMAP Phase 148 SC1/SC2 text should be formally amended with an explicit carve-out matching the style already used for `LayeredBadgeArtwork.module.css`, and the phase's "complete" marking in ROADMAP.md/STATE.md would then be consistent.

---
*Verified: 2026-09-05T19:15:00Z*
*Verifier: Claude (gsd-verifier)*
