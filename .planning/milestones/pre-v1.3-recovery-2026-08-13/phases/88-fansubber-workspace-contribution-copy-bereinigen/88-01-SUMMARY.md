---
phase: 88
plan: "01"
subsystem: frontend-member-surfaces
tags: [member-ui, copy, auth-refresh, contributions, groups]
dependency_graph:
  requires:
    - "Phase 85 contribution UI cleanup"
    - "docs/frontend/auth-api-client.md"
  provides:
    - "Humanized project/hint copy for /me/contributions and AppShell navigation"
    - "Refresh-session-safe gating for /admin/my-groups and /admin/my-groups/[id]"
    - "Release workspace links preserved on /me/releases/[versionId]/workspace"
  affects:
    - "88-02: profile copy/auth cleanup"
    - "88-03: release workspace copy and UAT"
tech_stack:
  added: []
  patterns:
    - "Protected member UI gates on hasAccessToken || hasRefreshToken"
    - "Runtime copy uses project/group/hint language while leaving internal DTO names intact"
key_files:
  created:
    - .planning/phases/88-fansubber-workspace-contribution-copy-bereinigen/88-01-SUMMARY.md
  modified:
    - frontend/src/components/layout/AppShell.tsx
    - frontend/src/components/layout/AppShell.test.tsx
    - frontend/src/app/me/contributions/page.tsx
    - frontend/src/components/contributions/ReportModal.tsx
    - frontend/src/components/contributions/ReportModal.test.tsx
    - frontend/src/components/contributions/ProposalForm.tsx
    - frontend/src/components/contributions/ProposalForm.test.tsx
    - frontend/src/components/contributions/MyContributionsSection.tsx
    - frontend/src/components/contributions/MyProposalsSection.tsx
    - frontend/src/components/contributions/VisibilityDropdown.tsx
    - frontend/src/components/contributions/ReportFormFehler.tsx
    - frontend/src/components/contributions/ReportFormStory.tsx
    - frontend/src/components/contributions/reportTargets.ts
    - frontend/src/components/contributions/reportTargets.test.ts
    - frontend/src/app/admin/my-groups/page.tsx
    - frontend/src/app/admin/my-groups/page.test.tsx
    - frontend/src/app/admin/my-groups/[id]/page.tsx
    - frontend/src/app/admin/my-groups/[id]/page.test.tsx
decisions:
  - "Phase 88 changes runtime copy only; TypeScript DTO/component names such as MeAnimeContribution remain unchanged."
  - "Phase 87 overlap is limited to frontend/src/lib/api.ts in later plan 88-02; 88-01 does not touch role-capability files or Phase-87 capability logic."
  - "The broad plan grep for Contribution is treated as an internal-code false positive; a runtime-string grep is used for the user-facing copy gate."
requirements-completed:
  - D-01
  - D-02
  - D-03
  - D-04
  - D-05
  - D-06
  - D-07
  - D-08
  - D-09
  - D-10
  - D-12
  - D-13
  - D-14
  - D-15
metrics:
  duration: "in-session"
  completed: "2026-06-18"
  tasks: 4
  files: 19
---

# Phase 88 Plan 01 Summary: Member Copy/Auth Normalisierung

**One-liner:** `/me/contributions`, AppShell und `Meine Gruppen` sprechen jetzt von Projekten/Hinweisen statt von Claims/Prueffaellen, und `Meine Gruppen` akzeptiert eine gueltige Refresh-Session als aktive Browser-Session.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Runtime-Copy fuer Projekt-/Hinweis-Sprache normalisiert | not committed (dirty workspace) | AppShell.tsx, page.tsx, ReportModal.tsx, ProposalForm.tsx |
| 2 | Phase-85 Contribution-Schutz beibehalten | not committed (dirty workspace) | ReportModal.tsx, ProposalForm.tsx, reportTargets.ts |
| 3 | `Meine Gruppen` Refresh-Session-Gate + Copy bereinigt | not committed (dirty workspace) | admin/my-groups page + tests |
| 4 | Focused verification | not committed (dirty workspace) | this summary |

## Verification Results

| Check | Status |
|-------|--------|
| `npm test -- --run ...` contribution, AppShell, my-groups tests | PASS, 9 files / 42 tests |
| Runtime-copy grep for `Prueffall`, `Beitragspruefung`, `Meine Beitraege`, `Contribution #`, `Beitrag / Contribution`, `beansprucht`, old my-groups copy | PASS, no runtime matches |
| `npx eslint ... --quiet` for touched files | PASS |
| `npm run typecheck` | PASS |
| `git diff --check` | PASS, CRLF warnings only |

## Phase 87 Interaction

No Phase-87 role-capability implementation files were changed. Phase 87 plan 03 still owns:

- `frontend/src/app/admin/role-capabilities/*`
- `frontend/src/app/admin/page.tsx`
- role-capability helper additions in `frontend/src/lib/api.ts`

Plan 88-01 only touched member-facing contribution and group surfaces. The shared `frontend/src/lib/api.ts` overlap is deferred to 88-02 and must avoid role-capability helpers.

## Deviations from Plan

**[Scope clarification] Broad grep false positive** - The plan's broad grep for `Contribution` also matches internal TypeScript names and imports. Those names are intentionally left unchanged per the plan's instruction not to rename backend DTOs, TypeScript type names, or tests just to avoid internal terms. Runtime-visible problematic strings were checked separately and are clean.

**Total deviations:** 1 documented clarification. **Impact:** No user-facing copy regression.

## Self-Check: PASSED

Plan 88-01 is complete and ready for Plan 88-02.
