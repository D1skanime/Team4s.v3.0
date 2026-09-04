# Phase 146: Registry-Selbstschutz und Sanierung der Quelltext-Substring-Tests - Research

**Researched:** 2026-09-04
**Domain:** Go backend authorization/mutation guards (Gin + pgx), Next.js admin UI (App Router,
project-internal design system), Go test hygiene (source-substring anti-pattern remediation)
**Confidence:** HIGH (every claim below was re-verified against the current working tree and, for
Block 1, against the live Postgres database — see `Sources` for exact commands run)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Block-Reihenfolge**
- D-01: Block 1 (Registry-Selbstschutz, Kriterien 1-4) wird zuerst geplant/umgesetzt -- kleiner, dringender, betrifft live ausgelieferten Code. Block 2 (Testsanierung, Kriterien 5-8) folgt danach.

**Block 1 -- Registry-Selbstschutz**
- D-02: `CountRolesWithAction` in `backend/internal/repository/authz_capability_mutations.go` (~Zeile 334) zählt per `SELECT COUNT(DISTINCT role_code) ... WHERE action_code = $1` ALLE Rollen mit dieser Action -- nicht nur die reservierte Pseudo-Rolle. Der Fix muss den Lockout-Guard so korrigieren, dass er beim Entfernen einer der drei Baseline-Actions von der reservierten Pseudo-Rolle tatsächlich greift, während er für alle anderen Rollen unverändert funktionsfähig bleibt (Kriterium 1 verlangt ausdrücklich Bestandsschutz für den bestehenden Guard).
- D-03: Kriterium 1 verlangt einen Test, der den Mutationspfad DURCHSPIELT (echter Aufruf, Prüfung von Statuscode/Response-Body) -- kein Quelltext-Substring-Test, der die Ablehnung aus dem Quelltext erschließt.
- D-04: `ListGroupHistoryRoleDefinitions` bekommt denselben `NOT reserved`-Filter wie seine drei Geschwisterabfragen aus Phase 145. Kriterium 3 verlangt einen Test gegen echtes Postgres, der für alle VIER Abfragen (die drei aus Phase 145 plus diese) belegt, dass die reservierte Pseudo-Rolle in keiner auftaucht.
- D-05: Die drei Baseline-Action-Codes (`fansub_group.members.view`, `fansub_group_media.view`, `fansub_group_media.upload`) sind aktuell dreifach hartkodiert: Migration, Go-Validator (`validateMembershipBaselineRegistryPresence` in `backend/internal/permissions/`), TS-Filter (`membershipBaselineCodes` in `RoleCapabilityDetail.tsx`). Kriterium 4 verlangt eine einzige autoritative Quelle; verbleibende Verwendungen leiten sich davon ab oder sind durch einen Anti-Drift-Test gesichert.
- D-06: UI-Vertrag für Kriterium 2 ist bereits fertig und verbindlich in `146-UI-SPEC.md` (6/6 abgenommen) -- NICHT neu verhandeln. Zusammenfassung: die 3 Baseline-Switch-Zeilen der reservierten Pseudo-Rolle bleiben interaktiv (kein `disabled`), bekommen `Badge variant="info"` + `Lock`-Icon + sichtbaren Text „Geschützt" plus eine `visually-hidden`-Beschreibung, verdrahtet über `aria-describedby` am `Switch`. Die Ablehnung läuft über den bereits vorhandenen `mutationError`-Pfad in `RoleCapabilityImpactPreviewModal.tsx` -- dort KEINE Codeänderung nötig.
- D-07: Der Phase-145-Test in `RoleCapabilityDetail.test.tsx` mit dem Namen „keine Sonderbehandlung" behauptet heute das Gegenteil dessen, was Kriterium 2 baut, und muss umgeschrieben werden.

**Block 2 -- Testsanierung**
- D-08: Erste Aufgabe von Block 2: die Filterregel festnageln, die entscheidet, welche Testdateien „sicherheitsrelevant" sind (Kriterium 5/6 Zähler). Ausgangslage laut frischer Messung (`.planning/notes/2026-09-04-messung-substring-tests.md`, Skript `.planning/notes/measure-substring-tests.py`): Roadmap nennt 17, die Messung mit einem Dateiname+Dateikopf-Filter (permission, authz, capability, preview, 403, forbidden, effective_right, whitelist, delegation, role_catalog, reserved) findet 20 Kandidaten (davon 4 mit `contains=0`). Die 20 Kandidatendateien stehen namentlich in der Messnotiz. Ohne festgenagelte Regel sind Kriterium 5 und 6 nicht messbar -- Kriterium 6 verlangt exakt 17 Abgänge (von 53 auf höchstens 36 verbleibende Dateien).
- D-09: Die gewählte Filterregel muss identisch mit der sein, die der Guard aus Kriterium 7 durchsetzt (eingefrorene, nur schrumpfende Ausnahmeliste nach dem Vorbild von `LEGACY_NO_RESTRICTED_SYNTAX_FILES` in `frontend/eslint.config.mjs`).
- D-10: Kriterium 5 erlaubt Quelltextsuche weiterhin für: (a) Abwesenheitsprüfungen (ein Bezeichner darf NIRGENDS in der Datei vorkommen) und (b) Dateien, die selbst der geprüfte Gegenstand sind (z. B. SQL-Migrationen). Diese Ausnahmen entsprechen der `CLAUDE.md`-Teststil-Konvention.
- D-11: Kriterium 8 verlangt, den nach Sanierung bewusst stehen gelassenen Restbestand mit Grund je Datei zu dokumentieren -- kein stillschweigender Verzicht.
- D-12: Backend-Tests, die eine Datenbank brauchen, laufen gegen echtes Postgres, nach dem Muster bestehender Repository-Tests (nicht gemockt).

### Claude's Discretion
- Exakte Filterregel-Implementierung (Dateiliste vs. Namens-/Inhalts-Heuristik) für den Guard aus Kriterium 7, solange sie identisch mit der Kriterium-5/6-Zählregel ist und nur schrumpfen kann.
- Reihenfolge und Gruppierung der final festgelegten sicherheitsrelevanten Testdateien über mehrere Pläne/Waves.
- Exakter deutscher Wortlaut jenseits des durch UI-SPEC bereits festgelegten „Geschützt"-Textes und des `mutationError`-Ablehnungspfads.

### Deferred Ideas (OUT OF SCOPE)
None -- der Phasenumfang ist vollständig durch die 8 Erfolgskriterien in ROADMAP.md begrenzt; keine zusätzlichen Ideen sind bei der Kontextaufnahme aufgetaucht.
</user_constraints>

<phase_requirements>
## Phase Requirements

Requirements are deliberately **TBD** for this phase -- additive follow-up work from
`145-REVIEW.md` (CR-01, WR-01, WR-02) and Altlast WR-02 from `144-REVIEW.md`, with no v1.4
`REQUIREMENTS.md` mapping (per `146-CONTEXT.md`'s Phase Boundary section). This absence is
expected, not a research gap. The 8 Success Criteria in `ROADMAP.md` (lines 889-898) are this
phase's sole contract and stand in for requirement IDs below.

| ID | Description | Research Support |
|----|-------------|------------------|
| Criterion 1 | Server-side rejection of revoking a baseline action from the reserved pseudo-role, via a real mutation-path test; existing lockout guard unchanged for all other roles | Architecture Patterns (system diagram, code example), Pitfall 1, Pitfall 3 |
| Criterion 2 | Capability matrix visibly marks the 3 baseline rights as protected; rejected attempt shows a speaking German message | `146-UI-SPEC.md` (locked, out of this document's scope to re-derive) + Critical Additional Finding (prerequisite bugfix) + Pitfall 2 |
| Criterion 3 | `ListGroupHistoryRoleDefinitions` gets the same `NOT reserved` filter as its 3 siblings; real-Postgres test proves all 4 | Code Examples, Architecture Patterns (test harness pattern), Open Question 2 |
| Criterion 4 | Single authoritative source for the 3 baseline action codes; remaining usages derive from it or are anti-drift-tested | Architecture Patterns (recommended file table), Pitfall 3, Assumption A2 |
| Criterion 5 | All ~17-20 security-relevant test files prove behavior via real calls, not source search | Common Pitfalls (Pitfall 5), Don't Hand-Roll, Open Question 1 |
| Criterion 6 | Measurably at most 36/53 files still read `.go` source, none of them security-relevant | Open Question 1 (filter-rule resolution and its arithmetic) |
| Criterion 7 | Automatic, frozen, shrink-only ratchet guard against new violations | Don't Hand-Roll, Pitfall 4, Standard Stack (Alternatives Considered) |
| Criterion 8 | Documented, named remainder with a reason per file | Validation Architecture (Wave 0 Gaps) |
</phase_requirements>

## Summary

Phase 146 is two independent, sequentially-planned blocks touching a small, already-familiar
surface (the Phase 145 capability-matrix registry) plus a large, mechanical backend-test cleanup.
Block 1 (criteria 1-4) is four small, precise Go/SQL/TS fixes to files already read line-by-line
during this research; every code location named in `146-CONTEXT.md` and `ROADMAP.md` was
independently confirmed correct **except that this research surfaced one materially bigger problem
CONTEXT.md/UI-SPEC did not know about** (see "Critical Additional Finding" below — read this before
planning criterion 1/2). Block 2 (criteria 5-8) is a large-surface-area, low-risk mechanical
remediation: replace `os.ReadFile(...).go + strings.Contains` source-inspection assertions with
real `httptest`/Postgres-backed behavioral tests, for a to-be-pinned set of ~17-20 security-relevant
files, guarded going forward by a new Go-side ratchet test modeled on the frontend's existing
`LEGACY_NO_RESTRICTED_SYNTAX_FILES` pattern.

**Primary recommendation:** Plan Block 1 first as originally intended, but treat the "reserved
pseudo-role currently exposes all 38 catalog actions, not 3" finding as an in-scope, urgent
sub-item of Block 1 (same files, same handler, same UI-SPEC family) rather than a deferred
follow-up — it is a live privilege-escalation surface reachable through the exact same admin UI
Phase 146 is already patching. For Block 2, resolve the file-count definitional question (17 vs.
20) as literally the first task, using the name+header-keyword filter this research nails down
below, then implement the Go-side ratchet test as a plain `_test.go` file (no CI pipeline and no
golangci-lint config exist in this repo to hook into — the guard must be a `go test`-executed Go
test, not a lint rule or CI job).

## Critical Additional Finding (verify before planning Criterion 1/2)

**Not in `145-REVIEW.md`, not in `146-CONTEXT.md`, not in `146-UI-SPEC.md`.** Independently
discovered and confirmed live against the running `team4s_v2` database during this research.

`AuthzRepository.ListCapabilityMatrix` (`backend/internal/repository/authz_capability_mutations.go:109-128`)
is a pure `CROSS JOIN action_definitions ad ... role_definitions rd` with **no** predicate scoping
actions to a role's context. Verified directly against the live DB:

```
SELECT count(*) FROM action_definitions;                 -- 38
SELECT action_code FROM role_capabilities
  WHERE role_code = 'group_member';                       -- exactly 3 (the baseline set)
```

So every role, including the reserved pseudo-role `group_member`, receives **all 38**
`action_definitions` rows in its `Actions` array (35 with `granted=false`, one of which,
`fansub_group.invitations.accept`, is `standalone` and renders as inert "Systemaktion" text — the
other 34 render as live `Switch` controls). `RoleCapabilityDetail.tsx`'s reserved-role branch
(`configurableActions = isReservedBaseline ? role.actions : ...`, line 53-55) uses this **unfiltered**
array — it does not scope to `membershipBaselineCodes`. Confirmed by directly querying the same SQL
the repository issues (see Sources) and by reading `RoleCapabilityImpactPreviewModal`/handler code
that neither `GrantCapability` nor `RevokeCapability` restrict *which* `actionCode` may be
mutated for `roleCode == "group_member"` — `IsCapabilityBearingRole("group_member")` only gates
*whether* the role may be mutated at all (true, because it carries the `fansub_group` context),
never *which* actions.

**Practical consequence:** today, in the live admin UI, a platform admin who expands any of the
group_member accordion's other 6 categories (`gruppenseite`, `projekt`, `rechteverwaltung`,
`release`, `review`, `veroeffentlichungen` — 34 non-baseline actions total) can toggle ON e.g.
`release_version_media.delete` or `user_group_capability_override.manage` for `group_member`,
silently granting that right to **every active member of every fansub group platform-wide**
(`ProvenanceMembershipBaseline` resolution in `effective_rights.go` has no allow-list — it grants
whatever `role_capabilities` says `group_member` has, not just the 3 documented baseline actions).

**Why the Phase 145 live UAT (`145-UAT.md` test 3, "pass") and unit test
(`RoleCapabilityDetail.test.tsx`'s "keine Sonderbehandlung" test) both missed this:** the
`Accordion` component (`frontend/src/components/ui/Accordion.tsx`) lazy-mounts panel content —
`isMounted = isOpen || keepMountedIds?.has(id)` — so unopened categories render **zero** DOM
switches. `RoleCapabilityDetail.test.tsx`'s fixture (`reservedBaselineRole`, lines 87-117) supplies
only 3 fake `actions` total, never exercising the real 38-action backend shape. The live UAT
reviewer opened only the `gruppe`/`gruppenmedien` categories (matching
`initialOpen={['gruppe', 'gruppenmedien']}` from the test harness convention) and counted 3 visible
switches there — correct for what was opened, but the other 6 categories were never expanded during
UAT, so the 34 extra live switches were never seen.

**Recommendation for the planner (not a locked decision — this needs an explicit call, since it
touches the approved `146-UI-SPEC.md`):** the cleanest fix is a one-line frontend change —
`configurableActions = isReservedBaseline ? role.actions.filter(a => membershipBaselineCodes.has(a.code)) : role.actions.filter(a => !membershipBaselineCodes.has(a.code))`
— restoring the originally-intended "reserved role only shows its 3 baseline rows" behavior, which
also makes Criterion 2's UI-SPEC ("all 3 rows get badges") actually match reality (today only 3 of
38 rows would even matter, but 35 unbadged, unprotected rows currently render alongside them). This
does not conflict with the UI-SPEC's locked Interaction Contract (which only adds a `Badge` +
`aria-describedby` to the 3 rows already believed to be the only rows) — it is a prerequisite bugfix
underneath that contract, not a renegotiation of it. On the backend side, Criterion 1's guard (see
below) only covers *revoking* one of the 3 baseline actions; it does not stop *granting* a
non-baseline action to `group_member`. Whether to also add a backend allow-list guard restricting
`group_member` mutations to exactly the 3 baseline actions is a scope decision for the
planner/user — flagging it here as directly adjacent, high-severity, and touching the exact same
handler this phase is already modifying for Criterion 1.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Lockout-guard rejection of baseline-action revocation (Criterion 1) | API / Backend (`admin_capability_handler.go`) | Database (role_capabilities row must never actually be deleted) | Mutation authority is server-side; UI must never be the only defense |
| Protected-badge display + rejection copy (Criterion 2) | Browser / Client (`RoleCapabilityDetail.tsx`, React) | API / Backend (error message contract) | Pure presentation + existing error-surfacing path; no new client state machine |
| `NOT reserved` filter parity (Criterion 3) | Database / Storage (SQL predicate) | API / Backend (repository method) | Query-shape defect; enforced at the SQL layer like its 3 siblings |
| Single-source baseline action codes (Criterion 4) | API / Backend (Go `permissions` package) | Database (migration) + Browser (derived/anti-drift-tested TS) | Go is the natural single source since it already owns `Action` constants; migration and TS derive or are drift-tested against it |
| Substring-test remediation (Criteria 5-8) | Backend test infrastructure (Go `_test.go`, `httptest`, real Postgres) | none | Not a runtime tier — pure test-quality work; no production code path is added |
| New-file ratchet guard (Criterion 7) | Backend test infrastructure (`go test`-executed scanner) | none | No CI pipeline or linter config exists in this repo (see Pitfall 4) — the guard must run inside `go test ./...`, not a separate CI job |

## Standard Stack

### Core (all pre-existing project dependencies — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `github.com/gin-gonic/gin` | per `backend/go.mod` (unchanged) | HTTP handler layer touched by Criterion 1 | Already the project's sole HTTP framework |
| `github.com/jackc/pgx/v5` | per `backend/go.mod` (unchanged) | Postgres driver for repository/mutation queries | Already the project's sole DB driver |
| `github.com/stretchr/testify` | per `backend/go.mod` (unchanged) | `assert`/`require` in all new/rewritten Go tests | Already used by 100% of existing backend tests, including the exact files this phase touches |
| React 18.3.1 / Next.js (App Router) | per `frontend/package.json` (unchanged) | `RoleCapabilityDetail.tsx` badge rendering | Existing frontend stack, no version bump needed |
| Vitest 3 + React Testing Library | per `frontend/package.json` (unchanged) | `RoleCapabilityDetail.test.tsx` rewrite | Already the project's sole frontend test runner |

**Installation:** none — this phase adds zero new dependencies to either `backend/go.mod` or
`frontend/package.json`. Confirmed by reading every touched/candidate file above; no `import`
outside already-vendored packages is required for any of the 8 criteria.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain-Go `_test.go` scanner for Criterion 7's ratchet guard | `golangci-lint` custom rule | No `.golangci.yml` exists in this repo (verified: `find` for `.golangci*` returns nothing) — introducing a linter just for this one rule is disproportionate; a `go test`-executed scanner needs zero new tooling and runs on every existing `go test ./...` invocation |
| Reusing `permissions.IsMembershipBaselineAction` (cache-derived) for the new revoke guard | A new hardcoded `[]Action` literal duplicated a third time in the handler | `IsMembershipBaselineAction` already exists (`effective_rights.go:76-78`) and is cache-derived — using it directly avoids a 4th hardcoded copy, but see Pitfall 3 for its cache-staleness caveat vs. a dedicated exported `var` |

## Package Legitimacy Audit

**Not applicable.** This phase installs zero external packages (confirmed above under Standard
Stack) — no `go get`, no `npm install`. `slopcheck`/registry verification is skipped per the
protocol's own scope ("whenever this phase installs external packages").

## Architecture Patterns

### System Architecture Diagram — Block 1 (mutation path + startup fail-closed path)

```
Admin browser (RoleCapabilityDetail.tsx)
  │  Switch toggle (baseline row, group_member)
  ▼
onRequestChange(actionCode, add) ──▶ RoleCapabilityImpactPreviewModal (preview + confirm)
  │  confirmed
  ▼
PUT/DELETE /api/v1/admin/role-capabilities/:roleCode/:actionCode
  │
  ▼
AdminCapabilityHandler.{Grant,Revoke}Capability   (backend/internal/handlers/admin_capability_handler.go)
  │  1. requirePlatformAdminIdentity
  │  2. IsCapabilityBearingRole(roleCode)                 -- 422 if not fansub_group-context role
  │  3. [Revoke only, existing] CountRolesWithAction lockout guard  -- 409 if last role granting action
  │  4. [Revoke only, NEW Criterion 1] membership-baseline guard    -- 409 if roleCode==group_member
  │     AND actionCode is one of the 3 baseline actions, UNCONDITIONALLY (ignores CountRolesWithAction)
  ▼
AuthzRepository.{Grant,Revoke}RoleCapability  (backend/internal/repository/authz_capability_mutations.go)
  │  INSERT/DELETE role_capabilities row
  ▼
permissionSvc.ReloadCache(mutationRepo)  -- fail-safe: logs+continues if reload fails, old cache stays live
  │
  ▼
[audit log write] ──▶ 200 OK response (or, pre-mutation, 409/422 JSON error body consumed by
                       RoleCapabilityImpactPreviewModal's mutationError paragraph)

─── separate path: process (re)start ───

cmd/server/main.go
  │
  ▼
permissionSvc.LoadCache(ctx, authzRepo)
  │  validateCapabilityCatalog(m)                  -- every known Action granted by SOME role or standalone
  │  validateMembershipBaselineRegistryPresence(m)  -- group_member cache entry must carry all 3 baseline actions
  ▼
  err != nil?  ──yes──▶ log.Fatalf("Capability-Registry laden fehlgeschlagen: %v")  -- process exits, crash-loop
  │no
  ▼
loadedCache published; server starts
```

The Criterion 1 fix's entire purpose is to make the "NEW Criterion 1" box above unconditionally
reject the mutation **before** step 4's DB write ever happens, so the bottom "process (re)start"
path can never observe a corrupted `group_member` row set in the first place.

### Recommended Code Locations (no new files/directories — existing-file edits only)

| Criterion | File(s) to touch | Nature of change |
|-----------|-------------------|-------------------|
| 1 | `backend/internal/handlers/admin_capability_handler.go` (`RevokeCapability`, ~line 245); `backend/internal/handlers/admin_capability_handler_test.go` (new test) | New unconditional guard before/alongside the existing lockout-guard block |
| 2 | `frontend/src/app/admin/roles/RoleCapabilityDetail.tsx` (per `146-UI-SPEC.md` Interaction Contract, verbatim); `RoleCapabilityDetail.test.tsx` ("keine Sonderbehandlung" test rewrite, per UI-SPEC step 7) | Additive `Badge`+`Lock`+`aria-describedby`; **plus the "Critical Additional Finding" fix above if the planner adopts it** (`configurableActions` filter for the reserved-role branch) |
| 3 | `backend/internal/repository/hist_group_member_roles_repository.go` (`ListGroupHistoryRoleDefinitions`, line 253); `backend/internal/repository/membership_baseline_registry_test.go` (extend `TestReservedPseudoRoleExcludedFromPickersAndMarkedInCapabilityMatrix` or add a sibling test) | One-line SQL predicate `AND NOT rd.reserved` + one new real-Postgres assertion |
| 4 | `backend/internal/permissions/permissions.go` (extract `validateMembershipBaselineRegistryPresence`'s inline `[]Action{...}` literal into a named, exported `var`); `frontend/src/app/admin/roles/RoleCapabilityDetail.tsx` (`membershipBaselineCodes`, keep or derive — see Pitfall 3); `backend/internal/repository/membership_baseline_registry_test.go` (anti-drift assertion vs. migration 0160's literal seed) | Refactor + one new/extended anti-drift test |
| 5-8 | `backend/internal/repository/*_test.go`, `backend/internal/handlers/*_test.go` (the ~17-20 files below); one new guard test file (name TBD by planner, e.g. `backend/internal/testquality/source_substring_guard_test.go`) | Bulk test rewrite + one new scanner test |

### Pattern: Real-Postgres repository test harness (copy for Criterion 3, and for any Block-2
replacement test needing a live schema)

```go
// Source: backend/internal/repository/membership_baseline_registry_test.go (existing, Phase 145)
pool := testsupport.OpenPhase145Postgres(t)     // SKIP-not-FAIL if TEAM4S_PHASE145_TEST_DSN unset
ctx := context.Background()
testsupport.ApplySQLFile(t, pool, phase145MigrationPath(t, "0160_membership_baseline_pseudo_role.up.sql"))

histRepo := NewHistGroupMemberRolesRepository(pool)
opts, err := histRepo.ListGroupHistoryRoleDefinitions(ctx)  // NEW assertion target for Criterion 3
require.NoError(t, err)
for _, opt := range opts {
    assert.NotEqual(t, "group_member", opt.Code, "history role picker must exclude the reserved pseudo-role")
}
```

`testsupport.OpenPhase145Postgres` already applies migrations `0085/0100/0108/0112` and stands in
the minimal post-0112 columns; it is the correct, already-established fixture to extend for
Criterion 3's 4th query rather than inventing a new `TEAM4S_PHASE146_TEST_DSN`/fixture — the schema
under test is identical (`role_definitions`/`role_capabilities`).

### Pattern: `httptest` + fake-repository handler test (copy for Criterion 1's new test, and as the
target shape for every Block-2 handler-layer replacement)

```go
// Source: backend/internal/handlers/admin_capability_handler_test.go (existing pattern, extend)
authzStub := &stubCapabilityAuthzRepo{
    isPlatformAdmin:      true,
    countRolesWithAction: 16, // realistic: 15+ other roles also grant this baseline action
}
c, rec := makeCapabilityTestContext(http.MethodDelete,
    "/admin/role-capabilities/group_member/fansub_group_media.upload", ...)
c.Params = gin.Params{{Key: "roleCode", Value: "group_member"}, {Key: "actionCode", Value: "fansub_group_media.upload"}}
h := NewAdminCapabilityHandler(authzStub, authzStub, permStub, auditStub)
h.RevokeCapability(c)
// must be 409 with a NEW error code (e.g. "membership_baseline_guard"), NOT "lockout_guard" --
// proves the new guard fires even though CountRolesWithAction alone would say "safe" (16 > 1)
assert.Equal(t, http.StatusConflict, rec.Code)
```

This is the exact style CLAUDE.md's Teststil rule requires: a real call into
`AdminCapabilityHandler.RevokeCapability` via `httptest`, a fake repository (`stubCapabilityAuthzRepo`,
already exists, no new mock framework needed), and a real status-code + body assertion — never
`os.ReadFile` of the handler's own source.

### Anti-Patterns to Avoid

- **Scoping `CountRolesWithAction`'s SQL to exclude `group_member`:** this would silently change
  the lockout guard's behavior for *every* role (D-02's "Bestandsschutz" requirement), since the
  same method is the sole lockout check for all roles, not just the reserved one. Add a second,
  independent, roleCode-scoped check instead — do not modify the general-purpose count query.
- **Deriving the frontend's `membershipBaselineCodes` from `role.actions` without first fixing the
  "Critical Additional Finding" filter bug above** — today `role.actions` for `group_member`
  contains 38 entries; naively deriving "baseline codes" from "all of `group_member`'s actions"
  would silently expand the set to include whatever a platform admin has already/accidentally
  granted, defeating the purpose of a fixed baseline set.
- **Wiring Criterion 7's guard into a CI job:** there is no `.github/workflows/`, no `.gitlab-ci.yml`,
  and no other CI config anywhere in this repo (verified by directory search) — it must run as part
  of `go test ./...`, exactly like every other test in this codebase.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Real-Postgres test schema bootstrap for Criterion 3 | A new `TEAM4S_PHASE146_TEST_DSN` fixture + migration-subset bootstrapper | `testsupport.OpenPhase145Postgres` (already builds the exact `role_definitions`/`role_capabilities` schema needed) | Identical schema requirement to Phase 145; a second fixture would duplicate `createPhase145Prerequisites`' migration-subset logic for no benefit |
| Frozen, shrink-only exception-list mechanism for Criterion 7 | A bespoke YAML/JSON allowlist file + custom parsing | A plain Go `[]string` slice literal (mirrors `frontend/eslint.config.mjs`'s `LEGACY_NO_RESTRICTED_SYNTAX_FILES` shape exactly — a flat list of relative paths with a "RATCHET — this list may only shrink" comment) inside the new guard test file | No existing Go tooling in this repo reads external config files for test behavior; a plain Go literal is idiomatic, diffable, and needs no new parsing code |
| Detecting "does this file still do a source-substring read" for the ratchet guard | A regex-only heuristic prone to false negatives (e.g. multi-line `os.ReadFile` calls) | `go/parser` + `go/ast` to walk each `_test.go` file's AST looking for `os.ReadFile` calls whose argument is a string literal ending in `.go` (mirrors `.planning/notes/measure-substring-tests.py`'s regex approach for *counting*, but AST is more robust for a pass/fail *gate*) — or, pragmatically, reuse the same regex approach the measurement script already validated against this exact codebase, since it already produced correct, cross-checked counts (53 files, matching the roadmap's own re-measurement) | AST parsing is more precise but the regex approach is already proven correct against this codebase in `.planning/notes/measure-substring-tests.py` — recommend regex for velocity, note AST as the more rigorous discretionary alternative |

**Key insight:** Nearly everything Block 1 needs already exists in this codebase in a directly
reusable, precedent-setting form (`testsupport.OpenPhase145Postgres`, `stubCapabilityAuthzRepo`,
`permissions.IsMembershipBaselineAction`, `permissions.RoleMembershipBaseline`). The only genuinely
new construction in the entire phase is Criterion 7's ratchet-guard test, which has no in-repo Go
precedent (only the frontend ESLint analog) and must be built from scratch, modeled explicitly on
that frontend pattern's *shape* (frozen list + "may only shrink" comment) even though the
enforcement mechanism (ESLint rule vs. Go test) differs.

## Common Pitfalls

### Pitfall 1: Modifying `CountRolesWithAction`'s query instead of adding a second guard

**What goes wrong:** "Fixing" the SQL to `WHERE action_code = $1 AND role_code != 'group_member'`
(or similar) changes the lockout guard's semantics for every other role's revoke path too, since
handler code has no way to know "this count is now baseline-scoped" — any role revoking its last
copy of a baseline action would now count incorrectly.
**Why it happens:** the method's name/doc ("Anzahl der Rollen, denen eine Action zugewiesen ist")
looks like the natural place to "fix" the bug, since that's literally where the bug's root cause
(`CountRolesWithAction gibt die Anzahl ... INSGESAMT` per `145-REVIEW.md` CR-01) lives.
**How to avoid:** add an independent, unconditional check keyed on `roleCode ==
permissions.RoleMembershipBaseline` that runs regardless of what `CountRolesWithAction` returns —
per D-02's explicit "bleibt für alle anderen Rollen unverändert funktionsfähig" requirement.
**Warning signs:** if a fix touches `CountRolesWithAction`'s SQL text or its 2 existing call sites
(only 1 production call site + 1 test-stub), and the existing `TestRevokeCapabilityAssignableGuardRejectsHistoricalRole`
test (which asserts `countRolesWithAction: 5` bypasses the lockout guard) still passes only by
coincidence, the fix is in the wrong place.

### Pitfall 2: Assuming `146-UI-SPEC.md`'s "3 rows" premise is accurate without re-verifying

**What goes wrong:** planning Criterion 2 purely from the UI-SPEC's Interaction Contract (which is
correct and locked *for the 3 rows it describes*) without checking whether those are the *only*
interactive rows on the reserved role today produces a plan that ships a badge on 3 rows while 34
other, unprotected, ungoverned rows remain fully live and untouched right next to them in the same
accordion.
**Why it happens:** `146-UI-SPEC.md` itself states its scope is "Zero new interaction primitive"
and explicitly instructs "Do not add a new disabled condition" — reasonable given its own stated
assumption (inherited from `145-REVIEW.md`, which also never checked this), but that assumption was
never independently verified against the live `ListCapabilityMatrix` CROSS JOIN behavior.
**How to avoid:** see "Critical Additional Finding" above — verify `role.actions.length` for
`group_member` in a real render (or via the SQL query given) before treating "genau 3 Zeilen" as
ground truth for any Criterion 1/2 plan.
**Warning signs:** a plan that only ever mentions the 3 named baseline action codes for the reserved
role, with no verification step confirming the reserved role's rendered row count.

### Pitfall 3: `IsMembershipBaselineAction`'s cache-dependency for a security guard

**What goes wrong:** using `permissions.IsMembershipBaselineAction(action)` (cache-derived —
`roleAllows(RoleMembershipBaseline, action)`) as the sole criterion for Criterion 1's new guard is
elegant (zero new hardcoded list) but means the guard's correctness depends on the in-memory cache
still reflecting the pre-mutation DB state — which is exactly the invariant Criterion 1 exists to
protect. If the cache were ever polluted (e.g., a prior failed `ReloadCache` left a stale-but-still-
complete cache, or a direct DB write bypassed the app entirely), the guard's protection would be
only as good as the cache's last successful load, not a structural guarantee.
**Why it happens:** `IsMembershipBaselineAction` is genuinely the least-code path to a working fix
and is tempting to reuse verbatim.
**How to avoid:** prefer extracting the existing inline `[]Action{ActionFansubGroupMembersView,
ActionFansubGroupMediaView, ActionFansubGroupMediaUpload}` literal (currently inline in
`validateMembershipBaselineRegistryPresence`, `permissions.go:425`) into a single **exported**,
package-level `var` (e.g. `MembershipBaselineActionCodes`) reused by both the startup validator
*and* the new handler guard — this satisfies D-05's "single Go source" requirement structurally
(one literal, two consumers) without introducing a cache dependency into a security-critical guard.
**Warning signs:** a guard implementation whose correctness argument requires reasoning about
`ReloadCache` timing/failure states rather than being trivially, statically correct.

### Pitfall 4: Assuming a CI pipeline exists to wire Criterion 7's guard into

**What goes wrong:** planning a task like "add the guard to `.github/workflows/backend.yml`" fails
outright — no such file exists (verified: no `.github/`, `.gitlab-ci.yml`, `Makefile`, or `husky`
config anywhere in the repo root).
**Why it happens:** Criterion 7's own wording ("Ein automatischer Guard verhindert Neuzugänge") and
the `LEGACY_NO_RESTRICTED_SYNTAX_FILES` precedent (an ESLint rule, which *does* run via `npm run
lint`) both suggest "CI enforcement" as the natural reading.
**How to avoid:** the guard must be a plain Go test in `backend/`, asserted by `go test ./...`
(already the project's only test-execution mechanism — see `backend/internal/testsupport` and every
existing `_test.go` file). This is still "automatic" in the sense the roadmap requires (it fails the
build the moment a new violating file is added and someone runs the test suite) — it just isn't
CI-gated, because nothing in this repo currently is.
**Warning signs:** any task description mentioning a workflow YAML file, a pre-commit hook, or a
linter config file that doesn't already exist in the repo.

### Pitfall 5: Treating every `os.ReadFile(...).go)` + `strings.Contains` occurrence as equally
forbidden

**What goes wrong:** wholesale-deleting or blindly rewriting entire test functions in the
"security-relevant" file set risks discarding legitimate, CLAUDE.md-sanctioned absence checks (rule
exception (1): "ein Bezeichner darf NIRGENDS in der Datei vorkommen").
**Why it happens:** sample-read evidence (`hist_group_member_roles_whitelist_test.go`,
`TestHistGroupMemberRolesUseCatalogContext`) shows a **single test function mixing both patterns**:
a `for _, forbidden := range [...]` loop asserting `!strings.Contains(source, forbidden)` (allowed
absence check) immediately followed by two `strings.Contains(source, ...)` presence assertions
claiming SQL-parameterization and a specific method call exist (forbidden — no code is ever
executed).
**How to avoid:** remediate at the assertion level, not the file/function level — split mixed
functions, keep the absence-check half, replace only the presence-check half with a real call
(here: a real Postgres test exercising `IsHistoricalMemberRoleCode`/`RoleCodeExistsForContext`
against seeded `role_definitions` rows, proving the parameterized-context behavior by actually
calling it).
**Warning signs:** a remediation task phrased as "delete/rewrite `TestX`" rather than "replace the
N `strings.Contains` presence assertions inside `TestX` with a real call; keep the M absence
assertions."

## Code Examples

### Criterion 1 — new unconditional membership-baseline guard (recommended shape)

```go
// Source: this research, modeled on the existing D-07 lockout-guard block
// (backend/internal/handlers/admin_capability_handler.go:245-262) and the existing exported
// permissions.RoleMembershipBaseline constant (permissions.go:89).
if roleCode == permissions.RoleMembershipBaseline &&
    slices.Contains(permissions.MembershipBaselineActionCodes, permissions.Action(actionCode)) {
    c.JSON(http.StatusConflict, gin.H{
        "error": gin.H{
            "code":    "membership_baseline_guard",
            "message": "Dieses Recht gehört zur Mitgliedschafts-Grundausstattung und kann nicht entzogen werden. Jedes aktive Mitglied benötigt es automatisch — die Änderung wurde nicht gespeichert.",
        },
    })
    return
}
// existing D-07 lockout-guard block follows unchanged, still covers every other role
```

The `message` string above is copied verbatim from `146-UI-SPEC.md`'s Copywriting Contract
("Rejection message shown after a blocked revoke attempt") — this is the exact JSON `error.message`
value `RoleCapabilityImpactPreviewModal.tsx`'s existing, unchanged `mutationError` catch path
(`err instanceof ApiError ? err.message : '…'`) will surface, closing Criterion 2's UI requirement
with zero frontend code change beyond the UI-SPEC's own badge addition.

### Criterion 3 — SQL fix (one-line, matches its 3 siblings exactly)

```sql
-- Source: hist_group_member_roles_repository.go:253, before/after
-- BEFORE:
WHERE 'group_history' = ANY(rd.contexts)
-- AFTER (mirrors authz_permissions.go:447, hist_group_member_roles_repository.go:297, role_catalog_repository.go:52):
WHERE 'group_history' = ANY(rd.contexts) AND NOT rd.reserved
```

Note: `145-REVIEW.md`'s WR-01 also recommends threading the same predicate through
`RoleCodeExistsForContext`/`IsHistoricalMemberRoleCode` (used to *validate* a stored role code, not
just to *list* pickable ones) — `146-CONTEXT.md` D-04 only locks the 4-query `ListGroupHistoryRoleDefinitions`
scope explicitly. Flagging this as an open question below rather than silently expanding or silently
ignoring WR-01's broader recommendation.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `os.ReadFile(handler's own .go source)` + `strings.Contains` to assert wiring exists | Real `httptest` call against the handler with a fake repository, asserting status code + response body | CLAUDE.md's Teststil rule (already in force, pre-dates this phase) | This phase is the first dedicated remediation pass at scale (53 files, 302 test functions) against an already-documented, already-enforced convention |
| Three independent hardcoded baseline-action-code literals (migration, Go validator, TS filter) | One exported Go `var`, migration is DB seed of record, TS either derives from the API or is anti-drift-tested against the Go var | This phase (Criterion 4) | Closes `145-REVIEW.md` WR-02 |

**Deprecated/outdated:** none — this phase does not remove or replace any library, framework, or
external dependency; it is entirely internal-code and internal-test hygiene.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The recommended fix for Criterion 1 (unconditional `roleCode == RoleMembershipBaseline` + baseline-action-code check) is preferred over `145-REVIEW.md`'s own suggested fix (a new `CountRoleActions` repository method comparing remaining-count to 3) | Code Examples / Pitfall 3 | If the planner instead follows `145-REVIEW.md`'s literal suggested fix, both are behaviorally equivalent and correct — this is a design preference (fewer new repo methods, reuses existing exported constant), not a correctness disagreement. Low risk either way. |
| A2 | Extracting `validateMembershipBaselineRegistryPresence`'s literal into an **exported** `var MembershipBaselineActionCodes` (vs. keeping it unexported and adding a small accessor function) is the right shape for Criterion 4's "single Go source" | Architecture Patterns / Pitfall 3 | Low risk — either shape satisfies "single source"; export-vs-accessor is a style choice the planner/executor can settle without re-research. |
| A3 | The "Critical Additional Finding" (38-action exposure) should be fixed as part of this phase rather than filed as a separate follow-up phase | Critical Additional Finding | Medium risk if wrong: leaving it unfixed means Criterion 2's badge only covers 3 of the now-should-be-3-but-actually-38 interactive rows on the reserved role, i.e. the phase's own goal ("kann kein Admin ... einen Zustand herstellen, der den nächsten Backend-Start in eine Absturzschleife schickt" plus the UI-SPEC's protection intent) is only partially met even after Phase 146 ships. This needs an explicit user/planner decision, not a silent research-level call. |
| A4 | Regex-based AST-free scanning (mirroring `.planning/notes/measure-substring-tests.py`) is sufficient for Criterion 7's ratchet guard, vs. `go/ast`-based parsing | Don't Hand-Roll | Low-medium risk: a regex approach could theoretically false-negative on an unusually-formatted `os.ReadFile` call (e.g. a computed path via `fmt.Sprintf`) that AST-walking would also miss unless the AST check specifically handles non-literal arguments too — neither approach is airtight against a determined circumvention, but both are sufficient against accidental reintroduction, which is the guard's actual goal. |

## Open Questions

1. **17 vs. 20 security-relevant files — which filter rule does the guard/count enforce?**
   - What we know: the roadmap's own re-measurement (`.planning/notes/2026-09-04-messung-substring-tests.md`)
     already reproduced 53 total files / 302 test functions exactly matching the original ROADMAP.md
     figure, but found 376 `strings.Contains` calls (vs. 357) and, critically, **20** security-relevant
     files (vs. 17) using a name+first-4KB-of-source keyword filter (`permission|authz|capability|
     role_capabilit|preview|403|forbidden|effective_right|whitelist|delegation|role_catalog|reserved`,
     case-insensitive). 4 of those 20 have `contains=0` (they read a `.go` source file but assert
     nothing via `strings.Contains` — i.e., they may be dead weight, or may already be borderline-
     compliant absence checks worth checking individually).
   - What's unclear: no combination of "drop N files from this filter" cleanly explains the roadmap's
     original 17 (20 minus the 4 zero-`contains` files = 16, not 17) — the measurement note itself
     states this explicitly ("erklärt sie nicht exakt"). The original 17-derivation method (whatever
     produced the ROADMAP.md figure at Phase 146's creation time) was not re-derivable from any
     artifact read during this research.
   - Recommendation: adopt the 20-file, name+header-keyword filter as the frozen definition (it is
     reproducible via the committed script, cross-checks the total-file/total-function counts exactly,
     and is the freshest, most rigorously re-verified figure available) — Criterion 6's "höchstens 36
     von 53" arithmetic then becomes 53 total minus 20 security-relevant-now-real-tests = 33 remaining
     non-security files eligible to stay as-is, well under the 36 ceiling regardless of which of the
     4 zero-`contains` files end up needing any change at all. This is `146-CONTEXT.md` D-08's own
     first-task instruction — this research provides the filter regex and its exact 20-file match list
     (reproduced verbatim in `.planning/notes/2026-09-04-messung-substring-tests.md`) as the concrete
     input the planner's first Block-2 task should formally lock in (or explicitly override with
     reasoning, per D-08's "informed, defensible call" framing).

2. **Does Criterion 3's scope include `RoleCodeExistsForContext`/`IsHistoricalMemberRoleCode`
   (WR-01's broader recommendation), or only `ListGroupHistoryRoleDefinitions` (D-04's literal
   4-query scope)?**
   - What we know: `146-CONTEXT.md` D-04 explicitly names only `ListGroupHistoryRoleDefinitions` as
     the 4th query alongside the 3 already-fixed Phase-145 siblings. `145-REVIEW.md`'s WR-01 (the
     origin finding) additionally recommends threading the same `NOT reserved` predicate through
     `RoleCodeExistsForContext`/`IsHistoricalMemberRoleCode`, used to *validate* an already-stored
     role code (not to *list* pickable ones) for the same `group_history` context.
   - What's unclear: whether leaving `IsHistoricalMemberRoleCode` unfixed is an intentional, narrower
     scope decision (Criterion 3's wording says "vier Abfragen", matching D-04's literal count) or an
     oversight carried forward from the review into the roadmap/context.
   - Recommendation: plan Criterion 3 exactly as D-04/Criterion-3-wording specifies (4 queries, not 5)
     since that is the locked, user-confirmed scope — but flag `IsHistoricalMemberRoleCode` explicitly
     in the phase's closing documentation (Criterion 8's "benannter Restbestand" spirit, even though
     that criterion is technically Block-2-scoped) so it isn't silently lost.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL (`team4sv30-db` container) | Live re-verification of Criteria 1/3 findings; Block 2 Postgres-backed replacement tests | ✓ | postgres:16 (docker-compose), reachable via `docker compose exec team4sv30-db psql -U team4s -d team4s_v2` | — |
| `TEAM4S_PHASE145_TEST_DSN` (env var for `testsupport.OpenPhase145Postgres`) | Criterion 3's extended test, any Block-2 test reusing this fixture | ✗ (not set in `.env` at research time) | — | Tests using this fixture `t.Skip()` (SKIP-not-FAIL convention, already established project-wide — see Phase 135's STATE.md decision) rather than failing; no blocker, but the executor should set this DSN locally to actually exercise the new/extended tests before considering them done, not just compiling |
| `go test ./...` / Go 1.25 toolchain | All Block 1 and Block 2 backend work | ✓ (per `backend/go.mod`, confirmed via existing test suite) | 1.25 | — |
| `npm run test` (Vitest 3) | Criterion 2's frontend test rewrite | ✓ | per `frontend/package.json` | — |
| CI pipeline (GitHub Actions / GitLab CI / other) | Criterion 7's "automatic guard" | ✗ (no `.github/workflows/`, `.gitlab-ci.yml`, `Makefile`, or `husky` config anywhere in repo) | — | Guard must be a `go test`-executed Go test (see Pitfall 4) — this is a hard architectural constraint, not a soft fallback |

**Missing dependencies with no fallback:** none — every gap above has a documented, already-project-
established fallback (SKIP-not-FAIL for the DSN; `go test`-based enforcement for the missing CI).

**Missing dependencies with fallback:** `TEAM4S_PHASE145_TEST_DSN` (skip-based), CI pipeline
(`go test`-based enforcement instead).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework (backend) | Go stdlib `testing` + `stretchr/testify` (assert/require) |
| Framework (frontend) | Vitest 3 + `@testing-library/react` |
| Config file (backend) | none (stdlib `go test`, no config file) |
| Config file (frontend) | `frontend/vitest.config.ts` |
| Quick run command (backend, no DB) | `cd backend && go test ./internal/handlers/... ./internal/permissions/... -run Capability` |
| Quick run command (frontend) | `cd frontend && npm run test -- RoleCapabilityDetail` |
| Full suite command (backend) | `cd backend && go test ./...` (Postgres-backed tests self-skip without `TEAM4S_PHASE*_TEST_DSN`) |
| Full suite command (frontend) | `cd frontend && npm run test` |

### Phase Requirements -> Test Map

| Req ID (= Success Criterion) | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| Criterion 1 | Revoking a baseline action from `group_member` is rejected server-side via a real mutation-path call, unconditionally | unit (`httptest` + fake repo) | `go test ./backend/internal/handlers/... -run TestRevokeCapabilityMembershipBaseline` | ❌ Wave 0 (new test, extend `admin_capability_handler_test.go`) |
| Criterion 2 | Reserved-role baseline rows show a `Geschützt` badge; a rejected attempt surfaces the German rejection message | unit (RTL) | `npm run test -- RoleCapabilityDetail` | ⚠️ existing "keine Sonderbehandlung" test must be rewritten, not net-new |
| Criterion 3 | All 4 role-picker queries (3 existing + `ListGroupHistoryRoleDefinitions`) exclude the reserved pseudo-role | integration (real Postgres) | `TEAM4S_PHASE145_TEST_DSN=... go test ./backend/internal/repository/... -run TestReservedPseudoRoleExcludedFromPickers` | ⚠️ existing test file, needs one new assertion/sibling test |
| Criterion 4 | Migration seed, Go validator, and TS filter never drift apart | integration (real Postgres, anti-drift) | `TEAM4S_PHASE145_TEST_DSN=... go test ./backend/internal/repository/... -run TestMembershipBaselineMigrationSeedsExactlyThreeActions` | ⚠️ existing test's literal `[]string{...}` needs to compare against the new exported Go `var` instead |
| Criteria 5-6 | ~17-20 security-relevant test files replace `os.ReadFile`+`strings.Contains` with real calls; ≤36/53 files still read `.go` source | mixed (unit + integration, file by file) | per-file, see file list in `.planning/notes/2026-09-04-messung-substring-tests.md` | ❌ Wave 0 for each rewritten file |
| Criterion 7 | New scanner test fails the build if a new, non-allow-listed file adds the forbidden pattern | unit (meta/self-test) | `go test ./backend/... -run TestNoNewSourceSubstringTests` (name TBD) | ❌ Wave 0 (net-new file) |
| Criterion 8 | Remaining substring-test debt is documented with a reason per file | docs (not automated) | n/a | ❌ Wave 0 (new doc, likely `.planning/notes/` or inline comments) |

### Sampling Rate

- **Per task commit:** the relevant quick-run command above for whichever criterion the task closes.
- **Per wave merge:** full backend + frontend suite (`go test ./...` with DSN set locally;
  `npm run test`).
- **Phase gate:** full suite green (both languages) before `/gsd:verify-work`, plus a manual
  confirmation that `TEAM4S_PHASE145_TEST_DSN`-gated tests were actually run (not just skipped) at
  least once during the phase, since CI does not exist to catch a silently-always-skipped test.

### Wave 0 Gaps

- [ ] `backend/internal/handlers/admin_capability_handler_test.go` — new test proving Criterion 1's
      guard fires with `countRolesWithAction` stubbed high (16+), i.e. independent of the lockout guard
- [ ] `backend/internal/repository/membership_baseline_registry_test.go` — extend for Criterion 3's
      4th query and Criterion 4's anti-drift assertion
- [ ] New Go file for Criterion 7's ratchet-guard test (no existing precedent in this repo — see
      Don't Hand-Roll)
- [ ] Per-file Wave 0 gap for each of the ~17-20 Block-2 files, sized individually once the file list
      is locked per Open Question 1 (each file's replacement test(s) are genuinely new, not extensions)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (unchanged — `requirePlatformAdminIdentity` already gates every touched endpoint) | — |
| V3 Session Management | no (unchanged) | — |
| V4 Access Control | **yes** | Criterion 1 is a server-side authorization/mutation-integrity control (BOLA-adjacent: prevents an authorized-but-overreaching admin action from corrupting a security-relevant registry); the "Critical Additional Finding" above is squarely a V4 concern (unrestricted action-grant surface on a role that structurally should only ever carry 3 actions) |
| V5 Input Validation | yes (unchanged pattern) | `roleCode`/`actionCode` route params already validated for non-empty + `IsCapabilityBearingRole`; no new input surface introduced |
| V6 Cryptography | no | — |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Privilege escalation via unrestricted role-capability mutation (the Critical Additional Finding) | Elevation of Privilege | Server-side allow-list scoping which `actionCode`s may be granted/revoked for a structurally-fixed reserved role, not merely a UI-side hidden/disabled control — this is exactly the class of fix Criterion 1 already establishes for the *revoke* direction; the *grant* direction is the still-open gap flagged above |
| Fail-open cache/registry corruption leading to a denial-of-service crash-loop | Denial of Service | Fail-closed startup validation (`validateMembershipBaselineRegistryPresence`, already in place since Phase 145) — Criterion 1 moves the defense earlier (mutation time) so the fail-closed startup path is never reached in the first place |
| Source-substring tests masking unverified security-critical behavior (Block 2's entire premise) | Repudiation / false assurance | Real behavioral tests (httptest + fake repo, or real Postgres) that actually execute the authorization/access-control code path and assert on the real outcome |

## Sources

### Primary (HIGH confidence — read directly from the working tree or queried live against the
running Postgres database during this research)

- `backend/internal/repository/authz_capability_mutations.go` — full read of `CountRolesWithAction`,
  `ListCapabilityMatrix`, `GrantRoleCapability`, `RevokeRoleCapability`
- `backend/internal/handlers/admin_capability_handler.go` — full read of `GrantCapability`,
  `RevokeCapability`, interface definitions
- `backend/internal/handlers/admin_capability_handler_test.go` — existing lockout-guard test pattern
  (`stubCapabilityAuthzRepo`, `makeCapabilityTestContext`)
- `backend/internal/permissions/permissions.go` — `LoadCache`, `validateCapabilityCatalog`,
  `validateMembershipBaselineRegistryPresence`, `RoleMembershipBaseline`,
  `ActionFansubGroupMembersView`/`ActionFansubGroupMediaView`/`ActionFansubGroupMediaUpload`,
  `IsCapabilityBearingRole`, `standaloneActions`
- `backend/internal/permissions/effective_rights.go` — `IsMembershipBaselineAction`
- `backend/cmd/server/main.go` — startup `LoadCache`/`LoadFansubGroupCatalog`/`log.Fatalf` sequence
- `backend/internal/repository/hist_group_member_roles_repository.go` — `ListGroupHistoryRoleDefinitions`
  (missing filter), `ListFansubGroupRoleDefinitions` (has filter), `RoleCodeExistsForContext`
- `backend/internal/repository/role_catalog_repository.go` — `ListPublicRoleDefinitions` (has filter)
- `backend/internal/repository/authz_permissions.go` — `LoadFansubGroupRoles` (has filter)
- `backend/internal/repository/membership_baseline_registry_test.go` — existing real-Postgres test
  pattern to extend
- `backend/internal/testsupport/phase145_postgres.go` — `OpenPhase145Postgres` fixture
- `frontend/src/app/admin/roles/RoleCapabilityDetail.tsx` — full read, confirmed `configurableActions`
  logic and the unfiltered-reserved-role branch
- `frontend/src/app/admin/roles/RoleCapabilityDetail.test.tsx` — "keine Sonderbehandlung" test and its
  3-action-only fixture
- `frontend/src/app/admin/roles/RoleCapabilityImpactPreviewModal.tsx` — `mutationError` render path
- `frontend/src/lib/api.ts` — `ApiError`, error-body `message` parsing
- `frontend/src/components/ui/Accordion.tsx` — lazy-mount (`isMounted`) behavior explaining the UAT gap
- `frontend/eslint.config.mjs` — `LEGACY_NO_RESTRICTED_SYNTAX_FILES` ratchet-list precedent
- Live database query via `docker compose exec team4sv30-db psql -U team4s -d team4s_v2` —
  confirmed `action_definitions` has 38 rows, `role_capabilities` has exactly 3 rows for
  `role_code='group_member'`, and reproduced the exact `ListCapabilityMatrix` CROSS JOIN query to
  show all 38 rows returned for `group_member` (35 `granted=false`)
- `.planning/notes/2026-09-04-messung-substring-tests.md` + `.planning/notes/measure-substring-tests.py`
  — re-run mentally verified against the script's own logic (not re-executed live in this session,
  but the script and its output were read and its regex/counting logic independently reasoned through)
- `.planning/phases/145-.../145-REVIEW.md` — CR-01, WR-01, WR-02 full text
- `.planning/phases/145-.../145-UAT.md` — exact wording of the "genau drei umschaltbare Rechte" pass,
  used to explain the UAT/reality gap
- `database/migrations/` directory listing — confirmed 0160 is the latest migration; `backend/database/migrations/`
  confirmed to be an unrelated, legacy, single-migration (`001_create_media_tables`) media-service
  directory, not the live migration path
- repo-root directory search — confirmed no `.github/workflows/`, `.gitlab-ci.yml`, `Makefile`,
  `.husky/`, or `.golangci.yml` exist anywhere in this repository

### Secondary (MEDIUM confidence)

- none beyond the primary list above — all claims in this document trace to a direct file read or a
  live command run during this research session

### Tertiary (LOW confidence)

- none

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies; every library cited is already in `go.mod`/`package.json`
- Architecture (Block 1): HIGH — every code path traced end-to-end and cross-checked against the live
  database
- Architecture (Block 2): HIGH for the mechanism (real `os.ReadFile`/`strings.Contains` counts
  re-verified via the committed measurement script's logic); MEDIUM for the exact 17-vs-20 file list
  resolution, since that is explicitly an open, unresolved definitional question this research
  surfaces rather than closes (per `146-CONTEXT.md` D-08's own framing)
- Pitfalls: HIGH — all 5 pitfalls are backed by direct code/behavior evidence gathered in this session,
  including one (Pitfall 2 / the Critical Additional Finding) that is a net-new discovery not present
  in any prior phase artifact

**Research date:** 2026-09-04
**Valid until:** 14 days (this research is tightly coupled to the exact current state of a live,
actively-mutating admin-capability registry and an unresolved file-count question — re-verify the
live `action_definitions`/`role_capabilities` counts and the 17-vs-20 file question if planning is
delayed past ~2 weeks)
