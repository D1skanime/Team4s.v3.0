---
phase: 147-rollen-registry-letzte-parallelkataloge-aufl-sen
verified: 2026-09-05T15:53:56Z
status: passed
score: 8/8 roadmap success criteria verified
overrides_applied: 0
human_verification: []
---

# Phase 147: Rollen-Registry — letzte Parallelkataloge auflösen Verification Report

**Phase Goal:** Eine neue Gruppenrolle muss künftig nur noch an der autoritativen Rollenquelle (`role_definitions`) ergänzt werden; die verbliebenen Frontend- und Go-Parallelregistries für Rollen sind verschwunden, und der globale App-Rollen-Satz hat genau eine importierbare Go-Quelle.

**Verified:** 2026-09-05
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

This verification checks the CURRENT tip of `main` (commit `268543eb`), which includes the
post-147-02 review-fix commit `d0830c64`, not just the state immediately after each individual
plan. All code inspection, build/test execution, and live HTTP/SSR checks below were performed
independently in this session against the live Docker Compose stack on `team4s-linux` — not
inferred from SUMMARY.md text.

### Observable Truths (ROADMAP.md Success Criteria 1–8)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `PublicNoteCard`'s role color derives from stable `role_code`, not the display label; `ROLE_CODE_BY_LABEL`/`roleColorCode` are gone with no new fallback catalog | ✓ VERIFIED | `frontend/src/lib/roleColors.ts` confirmed absent (`test -f` fails). `grep -rn "roleColorCode\|ROLE_CODE_BY_LABEL" frontend/src` returns zero hits. `PublicNoteCard.tsx:78`: `data-role-code={roleCode || 'other'}` — reads directly from the `roleCode` prop, no label-derived lookup. |
| 2 | `role_code` is cleanly threaded DB→Frontend for both note surfaces (struct, JSON field, contract, TS type); a backend test proves the field on a real result, not by source search | ✓ VERIFIED | `release_detail_public_repository.go:64,464,491` (struct field + SELECT `COALESCE(rd.code,'') AS role_code` + Scan), `release_detail_public_repository_helpers.go:401,424` (2nd query site), `project_member_public_repository.go:50,249,272` (struct + SELECT + Scan) — all present. `shared/contracts/openapi.yaml:14915` (`PublicReleaseNote`) and `:15163` (`ProjectMemberNote`) both document `role_code`. `frontend/src/types/releaseDetail.ts`/`projectMember.ts` both carry `role_code: string`. Independently re-ran `TestPublicNoteRoleCode` against a fresh ephemeral Postgres DB (`team4s_phase117_test_verify147` on `team4sv30-db`, dropped after use) — both sub-tests PASS, including the `label_de`-change-does-not-affect-`role_code` sub-test. `TestReleaseDetailPublicSegments` (pre-existing analog) still passes against the extended stub schema. |
| 3 | A frontend regression test proves `fansub_lead`, `founder`, `co_leader`, `techadmin`, `gfxler`, `karaoke_fx`, `editor`, `typesetter` each get their own `data-role-code`, and a `roleLabel` change alone does not change it | ✓ VERIFIED | `PublicNoteCard.test.tsx` re-run live: 13/13 tests pass, including the `it.each` block over all 8 named codes and the `rerender`-based label-independence test. |
| 4 | `ROLE_LABELS`/`roleLabelForCode` removed from `useGroupMembersTab.ts`; `roleSummary` resolves via `labelForRole(historyRoleOptions, code)` | ✓ VERIFIED | `grep` confirms `ROLE_LABELS`/`roleLabelForCode` absent from the file; `labelForRole(historyRoleOptions, role.role_code)` present at line 256; `GroupMembersTab.tsx` declares `historyRoleOptions` (line 82) before the `useGroupMembersTab(...)` call (line 105) and passes it in. Re-ran `useGroupMembersTab.test.ts` live: 6/6 pass, including the `renderHook`-driven proof (no direct call to a removed function). |
| 5 | `models.AppGlobalRoles` is the single exported source of the 3 global App-Rollen; all 4 consumers derive from it, no string-literal duplicates remain; German error text with correct umlauts | ✓ VERIFIED | `app_auth.go` exports `var AppGlobalRoles = []string{...}`. `admin_capability_handler.go`: `globalAppRoleCodes = models.AppGlobalRoles`. `admin_users_handler.go`: `validGlobalRoles = buildRoleSet(models.AppGlobalRoles)`. `admin_users_repository.go`: `AssignableRoles: slices.Clone(models.AppGlobalRoles)` (review-fix commit `d0830c64` added the defensive clone). `admin_users_mutations_handler.go`: both error sites use `strings.Join(models.AppGlobalRoles, ", ")`; text reads `"Ungültige Rolle. Erlaubte Werte: ..."` with correct umlauts. `grep` for the literal `"platform_admin", "content_admin", "user"` across all four consumer files returns zero hits. Re-ran the targeted handler test suite live (`AdminUsers|AdminCapability|GlobalRole` patterns): all PASS. |
| 6 | A source-contract test proves `models.AppGlobalRoles` matches migration `0072`'s CHECK constraint; no runtime DB query introduced for the role set | ✓ VERIFIED | `phase147_app_global_roles_source_contract_test.go` binds specifically to the `chk_app_user_global_roles_role` constraint name (post-review-fix hardening, requires exactly 1 match) and asserts `require.ElementsMatch`/`NotEmpty` (not a hardcoded 3-value expectation, so a future 4th role won't spuriously fail it). Re-ran `TestPhase147AppGlobalRolesSourceContract` live — PASS. `models.AppGlobalRoles` remains a compile-time Go slice; no `SELECT`/DB call was added anywhere in its definition or derivation path. |
| 7 | `RoleTranslator`/`RoleTypesetter`/`RoleTechadmin`/`RoleGfxler` removed from `permissions.go`; remaining block has a clarifying non-authoritative comment; other constants unchanged | ✓ VERIFIED | `grep -n` in `permissions.go` finds these 4 identifiers only at lines 164/175, both inside the fully commented-out `/* Historical bootstrap grants ... */` block (98–200) — confirmed by reading the surrounding lines directly. The live `const` block (lines 65–77) carries the required clarifying comment ("Dieser Block ist KEINE autoritative Rollenliste... Katalog... role_definitions...") and all 9 other constants (`RolePlatformAdmin`, `RoleFansubLead`, `RoleProjectLead`, `RoleTimer`, `RoleEditor`, `RoleEncoder`, `RoleRawProvider`, `RoleQualityChecker`, `RoleDesigner`) are present and untouched. The 4 affected test files use raw string literals (`"translator"`, `"typesetter"`, `"techadmin"`, `"gfxler"`) — confirmed via grep, zero remaining constant references. Re-ran `go test ./internal/permissions/... -v` live — all tests PASS. |
| 8 | Backend/frontend/contract tests run green; a live UAT on `:3000` confirms unchanged note rendering with the new `role_code` path | ✓ VERIFIED | Independently re-executed (not trusted from SUMMARY): `go build ./...` clean; `go vet ./...` clean; targeted test suites (permissions, models, handlers, migrations, real-Postgres repository test) all PASS; full `go test ./...` shows exactly 51 pre-existing failures, all confirmed to be `TEAM4S_PHASE117/128/134`-DSN-gated tests unrelated to any phase-147-touched file (spot-checked `TestArchiveRoleFilter` — fails only with "DSN is required", a pre-existing environmental condition, not a phase-147 regression). Frontend: `npx tsc --noEmit` clean, `npx eslint` on touched files clean, full `npx vitest run` — 290/291 files pass (1 skipped, matching SUMMARY exactly), 2199/2203 tests pass. Live HTTP check (this verifier, independent of the SUMMARY's own UAT): `GET /api/v1/anime/1/group/1/releases/27/notes` on the live backend (`127.0.0.1:18092`) returns `"role_code":"timer"`/`"role_code":"encoder"` alongside `role_label`. Live SSR check: `GET http://192.168.235.196:3000/anime/1/group/1/releases/46` renders `data-role-code="typesetter"` in the HTML — both independently reproduced, matching the SUMMARY's UAT findings exactly. |

**Score:** 8/8 truths verified.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/internal/repository/release_detail_public_repository.go` | `RoleCode` field + SELECT/Scan in cursor query | ✓ VERIFIED | Lines 64, 464, 491 |
| `backend/internal/repository/release_detail_public_repository_helpers.go` | `RoleCode` SELECT/Scan in `loadNotes` | ✓ VERIFIED | Lines 401, 424 |
| `backend/internal/repository/project_member_public_repository.go` | `RoleCode` field + SELECT/Scan in `ListNotes` | ✓ VERIFIED | Lines 50, 249, 272 |
| `backend/internal/repository/public_note_role_code_integration_test.go` | real-DB proof for both note types | ✓ VERIFIED | `TestPublicNoteRoleCode` re-run live, PASS |
| `shared/contracts/openapi.yaml` | `role_code` on both schemas, non-required | ✓ VERIFIED | Lines 14915, 15163; `required:` arrays unchanged |
| `frontend/src/components/public/PublicNoteCard.tsx` | `roleCode` prop drives `data-role-code` | ✓ VERIFIED | Line 78 |
| `frontend/src/lib/roleColors.ts` | deleted, no consumers | ✓ VERIFIED | File absent; zero references repo-wide |
| `frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts` | `historyRoleOptions` option + `labelForRole`-driven `roleSummary` | ✓ VERIFIED | Lines 145, 148, 256, 260 |
| `backend/internal/models/app_auth.go` | exported `AppGlobalRoles`; `KeycloakManagedGlobalRoles` documented as independent | ✓ VERIFIED | Confirmed NOT an alias post-review-fix (deliberate, documented divergent-authority design) |
| `backend/internal/migrations/phase147_app_global_roles_source_contract_test.go` | DB CHECK ↔ Go agreement proof | ✓ VERIFIED | Binds to `chk_app_user_global_roles_role` by name, `ElementsMatch`/`NotEmpty` |
| `backend/internal/permissions/permissions.go` | 4 constants removed + clarifying comment | ✓ VERIFIED | Confirmed only inert `/* */`-block occurrences remain |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `ReleaseNotesList.tsx` | `PublicNoteCard.tsx` | `roleCode={note.role_code}` | ✓ WIRED | Confirmed present; fixture literals in its test file now use real codes (`timer`/`translator`/`karaoke_fx`/`editor`), not display labels — post-review-fix correction verified |
| `ProjectMemberNoteCard.tsx` | `PublicNoteCard.tsx` | `roleCode={note.role_code}` | ✓ WIRED | Confirmed present |
| `useGroupMembersTab.ts` | `roleCatalog.ts` | `labelForRole(historyRoleOptions, role.role_code)` | ✓ WIRED | Confirmed at line 256, driven by real hook state, not a hardcoded map |
| `admin_capability_handler.go`, `admin_users_handler.go`, `admin_users_repository.go`, `admin_users_mutations_handler.go` | `models.AppGlobalRoles` | direct reference / `strings.Join` | ✓ WIRED | All 4 confirmed; zero literal duplicates remain |

### Data-Flow Trace (Level 4)

`role_code` traced end-to-end: Postgres `role_definitions.code` → `COALESCE(rd.code,'')` in each SQL SELECT → Go struct field → JSON response → this verifier's own live `curl` against the running backend confirms real, non-empty, per-role values (`timer`, `encoder`, `typesetter`) — not a static/empty fallback. SSR HTML independently confirmed to carry the real value (`data-role-code="typesetter"`), proving the data flows through the full stack into rendered output, not just through unit-test mocks.

### Requirements Coverage

Phase 147 declares `Requirements: TBD (Nacharbeit aus .planning/audits/2026-09-05-hardcoding-drift-audit.md, Findings HC-01, HC-02, HC-03, HC-09; kein v1.4-Requirement-Mapping)`. `grep -n "147\|HC-01\|HC-02\|HC-03\|HC-09" .planning/REQUIREMENTS.md` returns zero matches — this is expected, not a gap: HC-01/HC-02/HC-03/HC-09 are audit-finding IDs, not v1.4 milestone requirement IDs, and REQUIREMENTS.md's traceability table only tracks the 41 v1.4-mapped requirements (confirmed via ROADMAP.md's "v1.4 Coverage" table, which does not list Phase 147). This mirrors Phase 146's identical situation (also audit-Nacharbeit, also absent from REQUIREMENTS.md, confirmed passed in `146-VERIFICATION.md`). All four finding IDs (HC-01, HC-02, HC-03, HC-09) are individually addressed by Plans 147-01/147-02 (HC-01), 147-03 (HC-02), 147-04 (HC-03), and 147-05 (HC-09), each with `requirements: [HC-xx]` in its own PLAN frontmatter and its own must_haves independently verified above.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| All 23 files touched across Plans 147-01 through 147-05 | — | none found | — | `grep -n -E "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER"` across every touched file returns zero matches. |
| `release_detail_public_repository.go` (509 lines), `release_detail_public_repository_helpers.go` (451 lines), `useGroupMembersTab.ts` (485 lines) | — | pre-existing >450-line modularity debt | ℹ️ Info | Explicitly documented as pre-existing debt in `147-CONTEXT.md` (measured before this phase started); Plan 147-01's additions were ~2-4 lines each, Plan 147-03 had a net line *reduction* (512→485). Not worsened by this phase; splitting is out of scope per CONTEXT.md's explicit decision. |

No new debt markers introduced anywhere in the phase's diff.

### Behavioral Spot-Checks / Real Execution (this verification pass)

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Backend builds clean | `docker exec team4sv30-backend go build ./...` | exit 0 | ✓ PASS |
| Backend vets clean | `docker exec team4sv30-backend go vet ./...` | exit 0 | ✓ PASS |
| Admin-users/capability/global-role handler tests | `go test ./internal/handlers/... -run "AdminUsers|AdminCapability|GlobalRole" -v` | all PASS | ✓ PASS |
| Source-contract test (HC-03) | `go test ./internal/migrations/... -run TestPhase147AppGlobalRolesSourceContract -v` | PASS | ✓ PASS |
| Permissions package full suite (HC-09) | `go test ./internal/permissions/... -v` | all PASS | ✓ PASS |
| Real-Postgres role_code proof (HC-01 backend), fresh ephemeral DB created/dropped by this verifier | `TEAM4S_PHASE117_TEST_DSN=... go test ./internal/repository/... -run "TestPublicNoteRoleCode\|TestReleaseDetailPublicSegments" -v` | both PASS | ✓ PASS |
| Full backend suite regression scan | `go test ./...` | 51 pre-existing DSN-gated failures, 0 new | ✓ PASS (no regression) |
| Frontend typecheck | `npx tsc --noEmit` (in container) | exit 0 | ✓ PASS |
| Frontend lint on touched files | `npx eslint <7 touched files>` | 0 findings | ✓ PASS |
| PublicNoteCard regression test (HC-01 frontend) | `npx vitest run src/components/public/PublicNoteCard.test.tsx` | 13/13 PASS | ✓ PASS |
| useGroupMembersTab regression test (HC-02) | `npx vitest run "useGroupMembersTab.test.ts"` | 6/6 PASS | ✓ PASS |
| ReleaseNotesList / ProjectMemberNotesSection regression | `npx vitest run <2 files>` | 11/11 PASS | ✓ PASS |
| Full frontend suite | `npx vitest run` | 290/291 files, 2199/2203 tests pass (1 skip, 3 todo — matches SUMMARY exactly) | ✓ PASS |
| Live API check (independent of SUMMARY) | `curl http://127.0.0.1:18092/api/v1/anime/1/group/1/releases/27/notes` | `role_code` present alongside `role_label` for real notes | ✓ PASS |
| Live SSR check (independent of SUMMARY) | `curl http://192.168.235.196:3000/anime/1/group/1/releases/46` | `data-role-code="typesetter"` present in rendered HTML | ✓ PASS |

### Probe Execution

Not applicable — this phase has no `scripts/*/tests/probe-*.sh` probes; verification relied on the plan-declared automated test suites and this verifier's own live re-execution, both covered above.

### Human Verification Required

None. Plan 147-06's Task 2 (live UAT) was a checkpoint:human-verify performed externally by the
user before this verification session and is documented as "approved" in `147-06-SUMMARY.md`. This
verifier additionally re-confirmed the same underlying facts independently and live in this session
(API response, SSR HTML) rather than relying on the SUMMARY's narrative alone — both checks
reproduced identically. No outstanding visual/behavioral judgment call remains open.

### Verifier Note: Self-Inflicted Environment Hiccup (Fully Resolved)

During this verification, an attempt to clear the frontend's `.next` dev-cache (`rm -rf .next`,
intended only to rule out a stale generated-types false positive in `tsc --noEmit`) partially
succeeded while the dev server held the directory open, briefly breaking the running dev server's
webpack chunk manifest and causing transient 500s on `/anime/.../releases/...` routes. This was
**caused by this verification session's own exploratory command, not by any phase-147 code
change.** It was immediately diagnosed (via `docker compose logs`) and fully resolved by
`docker compose restart team4sv30-frontend`; the live SSR check was then re-run successfully and
confirmed no application-code defect. `git status --short` was clean both before and after this
incident — no source files were affected.

### Gaps Summary

None. All 8 ROADMAP.md success criteria are independently re-verified against the current tip of
`main` (including the post-147-02 review-fix commit `d0830c64`), not inferred from SUMMARY.md
claims: every parallel role registry named in the phase goal (`roleColors.ts`'s label→code map,
`useGroupMembersTab.ts`'s `ROLE_LABELS`, the four independent `platform_admin`/`content_admin`/
`user` literal copies, and the four unreferenced `permissions.go` constants) is confirmed removed
or converged onto the single authoritative source, backed by live-re-executed automated tests
(backend real-Postgres, frontend Vitest) and by this verifier's own independent live HTTP/SSR
checks against the running Docker Compose stack — not just the SUMMARY's own narration of the same
checks. The phase goal — a new group role only needs to be added at `role_definitions`, with zero
remaining parallel registries and exactly one importable Go source for the global App-Rollen set —
is achieved.

---

_Verified: 2026-09-05_
_Verifier: Claude (gsd-verifier)_
