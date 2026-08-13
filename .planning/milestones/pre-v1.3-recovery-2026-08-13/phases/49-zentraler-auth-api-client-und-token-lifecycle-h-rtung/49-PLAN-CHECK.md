# Phase 49 Plan Check

**Phase:** 49 - Zentraler Auth-/API-Client und Token-Lifecycle-Haertung
**Requirement:** AUTH-API-CLIENT-01
**Plans checked:** 49-01 through 49-04
**Verdict:** PASS_WITH_NOTES
**Checked:** 2026-05-20
**Re-check focus:** Final re-check after 49-02 Task 1 revision

## Final Verdict

Phase 49 is clear to execute. The previous blocker about 49-02 Task 1 adding failing tests is resolved.

49-02 Task 1 now requires characterization tests that pass against the current implementation, explicitly says not to add intentionally failing assertions, and moves missing lifecycle expectations into Tasks 2 and 3. Its automated verification is therefore compatible with an `auto` task contract.

## Required Re-checks

| Check | Status | Evidence |
|---|---|---|
| Previous BLOCK: 49-02 Task 1 failing tests | PASS | 49-02 Task 1 is now `Capture lifecycle characterization and upload-retry eligibility evidence`; action says "Add or update only characterization tests that pass against the current implementation" and "Do not add intentionally failing assertions in this auto task." |
| Plan structure | PASS | `gsd-sdk query verify.plan-structure` returns `valid: true`, no errors, no warnings, and 3 complete tasks for 49-01, 49-02, 49-03, and 49-04. |
| Research questions resolved | PASS | `49-RESEARCH.md` contains `## Open Questions (RESOLVED)` and records resolved SSR-boundary and expiry-metadata decisions. |
| Upload retry duplicate-persistence safety | PASS | 49-02 Task 1 requires endpoint-specific persistence-order/idempotency evidence; 49-02/49-03 require no automatic upload retry and a re-auth error where safety is not proven; 49-04 records final endpoint evidence. |
| Phase 48 readiness checkpoint | PASS | 49-01 Task 1 requires `git status`, roadmap/state/summary evidence, concrete baseline features, and a stop condition if Phase 48 is not actually ready. |
| 49-03 split rule | PASS | 49-03 Task 1 stops and splits if inventory finds normal frontend token ownership beyond listed paths or if migration would touch more than 10 files total. |

## Dimension Notes

- Requirement coverage: PASS. `AUTH-API-CLIENT-01` appears in all four plans and maps to inventory, central client hardening, caller/upload migration, and final regression/docs.
- Task completeness: PASS. All `auto` tasks have files, action, verify, and done fields; 49-02 Task 1 verify is no longer designed to fail.
- Dependency correctness: PASS. Waves are linear and valid: 49-01 -> 49-02 -> 49-03 -> 49-04.
- Key links planned: PASS. Inventory feeds central hardening and caller migration; upload retry evidence feeds final verification.
- Context compliance: PASS. D-01 through D-09 are represented; deferred streaming redesign, backend permission changes, Keycloak role authorization, and broad visual redesign are excluded.
- Architectural tier compliance: PASS. Browser central client owns normal token lifecycle; backend remains permission authority; streaming remains a server-side boundary.
- Nyquist compliance: SKIPPED. `49-RESEARCH.md` has no `Validation Architecture` section, so the VALIDATION.md gate is not applicable.
- AGENTS.md compliance: PASS. Plans avoid migrations/schema changes, preserve release/group media ownership, keep streaming out of scope, and include relevant typecheck/lint/test/diff checks.
- Research resolution: PASS. Open questions are marked resolved.

## Notes

### 1. 49-03 remains at the file-budget warning threshold

**Severity:** WARNING
**Dimension:** scope_sanity
**Plan:** 49-03

49-03 lists 10 modified files, which is the warning threshold. The plan includes the correct stop-and-split rule, so this is not a blocker. Executors must honor the split rule if inventory expands.

### 2. Pattern references rely on `49-PATTERNS.md`

**Severity:** WARNING
**Dimension:** pattern_compliance
**Plans:** 49-02, 49-03, 49-04

The plans require reading `49-PATTERNS.md` and follow its shared patterns, but several task actions do not repeat every analog file inline. This is acceptable for execution because the pattern map is explicit and in context; executors should read it before editing.

## Structured Issues

```yaml
issues:
  - plan: "49-03"
    dimension: "scope_sanity"
    severity: "warning"
    description: "Plan 49-03 lists 10 modified files, which is at the warning threshold."
    fix_hint: "Honor the existing split rule if inventory expands beyond listed files or more than 10 touched files."
  - plan: "49-02,49-03,49-04"
    dimension: "pattern_compliance"
    severity: "warning"
    description: "Task actions depend on 49-PATTERNS.md instead of naming every analog file inline."
    fix_hint: "Executor should read 49-PATTERNS.md before editing high-risk files such as api.ts, useAuthSession.ts, MediaUpload.tsx, and fansub/anime caller files."
```

## Recommendation

**PASS_WITH_NOTES** - execute Phase 49. No blockers remain. The notes are execution discipline items, not reasons to return to planning.
