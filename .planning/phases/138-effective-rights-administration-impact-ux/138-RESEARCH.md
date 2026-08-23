# Phase 138: Effective-Rights Administration & Impact UX - Research

**Researched:** 2026-08-23
**Domain:** Admin UX on top of an existing Go/Gin permission resolver (Phase 136/137) + Next.js App Router admin area
**Confidence:** HIGH for backend contract/schema facts (read directly from source + live dev DB `team4s_v2`); MEDIUM for UI-composition recommendations (some are inferred from existing patterns, not yet built); LOW/flagged explicitly where CONTEXT.md's illustrative examples diverge from real code.

## Summary

Phase 138 sits on a genuinely solid Phase 136/137 foundation: the central resolver
(`permissions.ResolveGroupRights`), the group-scoped override mutation service
(`services.EffectiveRightsService.MutateOverride`), and a full HTTP projection
(`AdminEffectiveRightsHandler`) already exist, are wired into `main.go`, and are covered by
passing tests. Critically, the **entire wire-level contract Phase 138 needs for capability
inspection, override mutation and even the impact-preview shape was already locked in Phase
136/137**: `EffectiveRightState`, `CapabilityOverrideMutationResult`,
`CapabilityOverrideImpactPreview`/`CapabilityOverrideImpactItem` all exist as Go structs, OpenAPI
schemas (`shared/contracts/admin-capabilities.yaml`, `openapi.yaml`) **and** TypeScript types
(`frontend/src/types/admin-capability.ts`) today. What is genuinely missing is (1) an HTTP route +
backend logic that *produces* `CapabilityOverrideImpactPreview` (the DTO is a locked, unused
stub — zero references outside contract/type files), (2) any frontend consumption at all of the
three Phase-137 effective-rights endpoints (`frontend/src/lib/api.ts` has no
`getEffectiveRights`/`mutateCapabilityOverride`/`listOverrideHistory` functions today), and (3) a
cross-group "who holds role X" query (no such endpoint or repository method exists; the schema
supports it trivially via the already-indexed `fansub_group_member_roles.role` column).

Two structurally different "activation" realities exist and must not be conflated: **role→capability
matrix mutations** (`AdminCapabilityHandler.GrantCapability`/`RevokeCapability`) write to Postgres
and then synchronously reload a **process-wide in-memory cache** (`permissions.loadedCache`,
protected by a `sync.RWMutex`) before the HTTP response returns — there is no genuinely async
"wird aktiviert" window today, only a synchronous success/fail. **Per-user capability overrides**
(`EffectiveRightsService.MutateOverride`) go through no cache at all — `ResolveGroupRights` loads
overrides live from Postgres on every call — so they are always immediately "active" the instant
the transaction commits. D-21's four-state activation vocabulary (`persisted/wird
aktiviert/aktiv/fehlgeschlagen`) can therefore only be built *honestly* by reporting these two
paths differently, not by inventing a shared async status machine neither path actually has.

The real capability catalog (queried live) has **7 categories**: `gruppe`, `gruppenmedien`,
`gruppenseite`, `projekt`, `rechteverwaltung`, `release`, `review` — none of these are "Claims" or
"Beiträge" (CONTEXT.md's example list was explicitly illustrative; the real registry has no
capability category for either domain). The existing `frontend/src/app/admin/role-capabilities/`
split-view (`RoleCapabilityClient` + `RoleMasterList` + `RoleCapabilityDetail`, Drawer-based on
mobile) **already implements the D-08 target shape** (compact master list left, categorized
capability-matrix detail right) — it is not the "big role cards" CONTEXT.md's §4 describes; that
characterization appears stale relative to current code and is flagged explicitly below rather
than silently accepted. `UserGroupRightsTab.tsx` (the UADM-01 canonical target) is confirmed
read-only today and is backed by a **different, older, heuristic** endpoint
(`GET /admin/users/:userId/group-rights`, two hand-picked booleans) than the real Phase-137
effective-rights endpoint — it needs to be re-pointed at
`GET /admin/fansubs/:id/app-members/:appUserId/effective-rights` and made editable, not rebuilt
from scratch.

**Primary recommendation:** Treat Phase 138 as three additive backend extensions (impact-preview
endpoint(s), role-holder-with-group-context query, a minimal release-version-label field) plus a
frontend build-out that mostly *consumes an already-locked contract* rather than inventing new
shapes — and correct the two CONTEXT.md staleness points (role-capabilities UI already
split-view; capability categories are not Gruppe/Projekt/Release/Review/Medien/Claims/Beiträge)
before planning task breakdown.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Effective-rights inspection (what can user X do, why) | API / Backend (`permissions.ResolveGroupRights`, `AdminEffectiveRightsHandler.GetEffectiveRights`) | Frontend Server (SSR shell only) | Resolver is the single source of truth (D14); frontend is a pure explainer of resolver output. |
| Personal override mutation (allow/deny/remove) | API / Backend (`services.EffectiveRightsService.MutateOverride`) | — | Transactional, atomic with immutable history; must never be reimplemented client-side. |
| Role→capability matrix mutation | API / Backend (`AdminCapabilityHandler.Grant/RevokeCapability`) + process-local cache (`permissions.loadedCache`) | — | Synchronous DB write + synchronous in-process cache reload; single backend container in this deployment (`docker-compose.yml`), so no cross-replica staleness today. |
| Impact preview (role/capability change, role assign/revoke, claim decision) | API / Backend (new: batch `ResolveGroupRights` over affected role holders) | Browser (Modal/Dialog rendering only) | D-20 forbids a second engine; preview must call the same resolver per affected user, batched. |
| Role holder listing (who has role X, in which group) | API / Backend (new repository query on `fansub_group_member_roles` + `fansub_group_members` + `app_users`) | — | No such query exists yet; needed for D-07/D-19/D-22 impact enumeration. |
| Claims decision (verify/reject/activate) | API / Backend (`MemberClaimsHandler`, `member_claims` + `member_claim_invitations` tables) | — | Verify and "activate as member" are two separate, non-atomic admin actions today (see R-06). |
| Änderungen / Audit translation | API / Backend (`audit_logs` table + `AuditLogRepository`) | Frontend (fachliche Übersetzung, no backend text generation beyond `reason_code`) | No filtered list endpoint exists yet over `audit_logs`; only a per-user embedded query exists. |
| Admin navigation / IA (D-01..D-10, D-32) | Frontend Server (Next.js App Router route segments under `frontend/src/app/admin/`) | Browser (client components, responsive stacking) | Pure presentation/navigation; no server-authoritative decisions live here. |
| Global UI primitives (Modal, Drawer, Table, Accordion, Switch, Tabs) | Browser (`frontend/src/components/ui/`) | — | Design-system layer; D-35 mandates exclusive use, no local rebuilds. |

## Standard Stack

No new external packages are required for Phase 138. Every relevant dependency (Gin, pgx/v5,
Next.js 16 App Router, React 18.3.1, Vitest 3) is already in use and pinned in
`backend/go.mod`/`frontend/package.json`; this phase is additive backend logic + new admin
routes/components on the existing stack.

### Package Legitimacy Audit

Not applicable — Phase 138 installs no new packages. `## Package Legitimacy Audit` is intentionally
omitted per the template's "required whenever this phase installs external packages" condition.

## Project Constraints (from CLAUDE.md)

- Work exclusively on `team4s-linux` (`/home/d1sk/team4s`), Docker Compose runtime; never Windows/WSL for execution.
- Production files ≤ 450 lines (`admin_effective_rights_handler.go` is already 612 lines and flagged as a pre-existing WARNING in `137-VERIFICATION.md` — new Phase-138 handler logic should go in a **new** file, e.g. `admin_capability_impact_handler.go`, not grow the existing one further).
- German UI text must use correct umlauts (ä/ö/ü/Ä/Ö/Ü/ß) everywhere in JSX text nodes, labels, errors, aria-labels, toasts; Go response strings too. No ASCII substitutes.
- Every user-facing UI element must use `@/components/ui` primitives; native `<select>/<input>/<textarea>/<button>` are forbidden even for "local consistency" reasons. Reference: `/dev/ui-system`.
- GSD workflow enforcement: no direct file edits outside `/gsd:execute-phase` etc.
- Contract chain discipline: any new/changed wire shape must flow OpenAPI (`shared/contracts/`) → Go DTO → `frontend/src/types/` → `frontend/src/lib/api.ts` — matches D-35 verbatim.
- `AI-HANDOFF.md` governs any cross-agent (Codex/OpenCode) handoff artifacts if this phase's execution is later handed to a different agent.
- All planning/execution happens directly on `main` (`workflow.use_worktrees=false`); no phase worktrees/branches.

<user_constraints>
## User Constraints (from CONTEXT.md)

138-CONTEXT.md is the authoritative, externally-conducted discuss/context result for this phase
(D-01 through D-35, locked). It is reproduced here only as a pointer, not copied in full, because
it is long (700+ lines) and already lives at
`.planning/phases/138-effective-rights-administration-impact-ux/138-CONTEXT.md`. The planner MUST
read that file directly; this research does not restate every decision, only the ones with direct
technical implications (cited inline by D-ID throughout this document).

### Locked Decisions (D-01 through D-35) — summary pointers only, see 138-CONTEXT.md for full text
- D-01/D-02/D-03: fixed top nav (`Benutzer | Gruppen | Rollen | Capabilities | Claims | Änderungen`), mandatory bidirectional navigation, new user-detail sub-nav (`Übersicht | Rollen & Rechte | Beiträge | Claims | Streaming | Änderungen`).
- D-04/D-05: user list/overview must NOT show raw effective-rights/override counts as headline metrics.
- D-06/D-07/D-08: group view tabs (`Benutzer | Rollen | Claims | Änderungen`); role view answers "who holds this role" first; Capabilities main view is a split-view (role list left, capability matrix right), replacing "today's big role cards" — **research flags this premise as stale, see Common Pitfalls**.
- D-09/D-10/D-34: exactly one user-in-group rights editor, exactly one role-capability editor, no redundant rights maintenance.
- D-11 through D-17/D-13b: full relevant capability catalog per group context with state (allowed/not-allowed/personally-denied/personally-allowed/non-deniable), compact default + progressive detail, no parallel frontend permission logic (D14 — binding), business-language actions instead of raw Allow/Deny switches, guided revoke flow (CAP-08) explaining all granting sources first, non-deniable capabilities clearly marked, capability history inline.
- D-18 through D-22: no immediate switch-save; Impact Preview as a modal over the matrix (CAP-09) with counts (holders/lose/gain/keep-via-other-role/keep-via-personal-override) + expandable detail table; impact computed via the EXISTING resolver, no second engine (D-20 — binding, explicitly allows a "gezielte Vertragserweiterung" if a preview API is missing); persisted ≠ active (CAP-10), UI must track `gespeichert → wird aktiviert → aktiv` / `fehlgeschlagen` derived from the REAL backend contract (R-05); impact preview also required before role assign/revoke on a user.
- D-23/D-24: Claims in main nav + user/group context, decision flow shows resulting rights impact.
- D-25 through D-27: "Änderungen" (not "Audit") as the nav term; before/after shown only where honestly reconstructable from real audit data (R-07); Aktivität vs Änderungen kept conceptually separate; context-scoped history views.
- D-28/D-29/D-30/D-31/D-32/D-33: area-specific filters (not global search); only the `release_version_id` display-bug fix in scope for Beiträge (no Phase-139 pull-forward); Streaming stays an IA placeholder only (`UserStreamingGrantsTab` must not regress); no new deletion architecture; responsive stacking (desktop split-view, tablet/mobile list→detail/drawer); German business terminology (`Recht entziehen`, `Recht zusätzlich erlauben`, `Abweichung entfernen`, `Rolle zuweisen`, `Rolle entfernen`, `Benutzer deaktivieren`, `Benutzer reaktivieren`).
- D-35: global UI primitives + design tokens mandatory, ≤450-line files, correct umlauts, full contract chain for any extension — all binding, matches CLAUDE.md.

### Claude's Discretion
- Exact visual handling of very large capability sets (virtualization vs. sections vs. filter) — open per CONTEXT.md §6.
- Exact scope/filtering split of "Aktivität" vs "Änderungen" in the user context — open per CONTEXT.md §6.
- Exact limits/pagination of the impact detail table — open, explicitly deferred to R-04 findings (see below: recommend a hard cap + pagination, since role-holder counts are unbounded in principle).
- Concrete future streaming functionality — explicitly NOT this phase.

### Deferred Ideas (OUT OF SCOPE)
- Full contribution/media projection redesign (server-side grouping, range-collapse, filter/count/pagination coherence) → Phase 139 (UADM-02…UADM-08). Phase 138 touches ONLY the `release_version_id` display bug, nothing else in that surface.
- Review-delegation management UI → Phase 140.
- Review-queue work → Phase 141.
- Any change to Phase 136/137 precedence semantics, including the documented D01 exception ("Contribution Roles are override-blind", see `137-CONTEXT.md`) and the non-deniable IdP platform-admin bypass — these are explicitly locked and out of scope for Phase 138.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAP-08 | Ein geführter Entzugs-Flow zeigt alle Quellen eines Rechts und empfiehlt den gezielten Benutzer-Deny, bevor breitere Rollen- oder Matrixänderungen angeboten werden. | `EffectiveRightState.granting_roles[]`/`specialized_grants[]`/`decisive_source` (already shipped, R-01) give the frontend everything needed to enumerate sources before recommending a scoped deny; `MutateOverride` with `Kind=OverrideMutationSetDeny` is the target action (R-01). No new backend work needed for the enumeration step itself — only new frontend guided-flow UI. |
| CAP-09 | Vor einer Rolle-zu-Capability-Änderung sieht der Admin betroffene Rolleninhaber und die tatsächliche effektive Änderung, einschließlich Benutzer ohne Änderung wegen weiterer Quellen. | Requires the new impact-preview endpoint (R-04): batch `ResolveGroupRights` before/after over every role holder (needs the new role-holder query, R-03) for the affected action_code. `CapabilityOverrideImpactPreview`/`CapabilityOverrideImpactItem` DTOs already locked (R-01) — only the producing endpoint is missing. |
| CAP-10 | Nach einer Rollenmatrix-Mutation unterscheidet die Oberfläche zwischen persistiert, im Permission-Cache aktiviert, ausstehend und fehlgeschlagen; sie meldet keinen falschen Enderfolg. | R-05: `AdminCapabilityHandler.GrantCapability`/`RevokeCapability` already do a synchronous DB write + synchronous `permissions.Service.ReloadCache` before responding, with a fail-safe (reload failure only logged, old cache stays valid, mutation is NOT rolled back). The honest status vocabulary must reflect this: success = `persistiert` AND `aktiv` together (no real "wird aktiviert" window exists); a logged reload failure = `persistiert` but the frontend cannot currently detect it from the response (see Common Pitfalls — minimal contract extension needed). |
| UADM-01 | Die vorhandene Gruppenrechte-Ansicht im Benutzer-Detail ist die kanonische Oberfläche für Inspektion und Änderung effektiver Gruppenrechte. | R-09: `UserGroupRightsTab.tsx` exists today, is read-only, and calls the OLD heuristic endpoint `GET /admin/users/:userId/group-rights` (`AdminUsersRepository.GetUserGroupRights`), not the Phase-137 `GetEffectiveRights` endpoint. This is the exact component to evolve, per D-09: re-point its data source at `GET /admin/fansubs/:id/app-members/:appUserId/effective-rights` (per selected group) and wire the existing `MutateOverride`/`ListOverrideHistory` endpoints for editing. |
</phase_requirements>

## Standard Stack — N/A (see above)

## Architecture Patterns

### System Architecture Diagram

```text
Admin Browser (Next.js client components under frontend/src/app/admin/)
        │
        │  fetch via frontend/src/lib/api.ts (needs 3 new functions, R-09)
        ▼
Gin router (backend/cmd/server/admin_routes.go, registerAdminRoutes)
        │
        ├─ requirePlatformAdminIdentity() ─────► AdminCapabilityHandler (role→capability matrix, global-role-only)
        │                                              │
        │                                              ▼
        │                                        AuthzRepository.ListCapabilityMatrix /
        │                                        GrantRoleCapability / RevokeRoleCapability
        │                                              │
        │                                              ▼
        │                                        permissions.Service.ReloadCache
        │                                        (synchronous, process-wide loadedCache)
        │
        └─ permissionActorFromContext() + CanForFansubGroup(user_group_capability_override.manage)
                     │                     (group-scoped: platform_admin OR delegated fansub_lead)
                     ▼
           AdminEffectiveRightsHandler (GetEffectiveRights / MutateOverride / ListOverrideHistory)
                     │
                     ▼
           permissions.Service.ResolveGroupRights(actor, fansubGroupID)
                     │  batch-loads (D03): roles, active-membership, user overrides, specialized grants
                     │  evaluates precedence in memory (D01), no per-capability SQL
                     ▼
           GroupRightsResolution { Rights: map[Action]CapabilityRightState }
                     │
        ┌────────────┼─────────────────────┐
        ▼            ▼                     ▼
  Can() (runtime  Inspection projection   MutateOverride (services.EffectiveRightsService)
  enforcement,    → EffectiveRightState   → BEGIN, lock membership, validate policy,
  e.g. CanFor-    DTO, one per action     upsert/delete override, append immutable
  FansubGroup)                            history, COMMIT (atomic, D06)
                                                │
                                                ▼
                                    user_group_capability_overrides +
                                    user_group_capability_override_history
                                    (append-only, DB trigger enforced)

MISSING (Phase 138 must add, R-04):
  New impact-preview endpoint(s) that call ResolveGroupRights once PER AFFECTED ROLE HOLDER
  (before/after the hypothetical mutation), producing CapabilityOverrideImpactPreview — the DTO
  shape is already locked in Go/OpenAPI/TS, only the producing handler+repository query is absent.

MISSING (Phase 138 must add, R-03):
  A role-holder query joining fansub_group_member_roles (indexed on `role`) →
  fansub_group_members → fansub_groups → app_users, returning (app_user, group, status) for one
  role_code — needed to enumerate "who is affected" before the impact preview can even run.
```

### Recommended Project Structure (additive, not a rewrite)

```text
backend/internal/handlers/
├── admin_effective_rights_handler.go        # EXISTING, 612 lines — do not grow further (450-line rule)
├── admin_capability_handler.go               # EXISTING — Grant/RevokeCapability stay here
├── admin_capability_impact_handler.go        # NEW — impact preview for role→capability changes (CAP-09)
├── admin_role_assignment_impact_handler.go   # NEW — impact preview for role assign/revoke on a user (D-22), OR fold into an existing role-assignment handler if one is found to exist (verify at plan time — not located in this research pass)
├── admin_changes_handler.go                  # NEW — filtered "Änderungen" list over audit_logs (D-25/D-28)
├── admin_role_holders_handler.go             # NEW — "who holds role X, which group" (D-07/R-03)
backend/internal/repository/
├── authz_capability_mutations.go             # EXISTING — ListCapabilityMatrix etc., add role-holder query here or a sibling file
├── audit_logs.go                             # EXISTING — Write-only; add filtered List method (new file recommended, ≤450 lines discipline)
frontend/src/lib/api.ts
├── (add) getEffectiveRights, mutateCapabilityOverride, listOverrideHistory   # ZERO exist today (R-09)
├── (add) getRoleCapabilityImpactPreview, getRoleAssignmentImpactPreview
├── (add) listChanges (filtered audit)
├── (add) listRoleHolders
frontend/src/app/admin/
├── role-capabilities/          # EXISTING split-view — extend with Impact Preview modal (D-19), NOT a rewrite
├── users/tabs/UserGroupRightsTab.tsx   # EXISTING read-only — re-point at effective-rights endpoint, add edit actions (UADM-01)
├── changes/                    # NEW top-level nav area ("Änderungen", D-01/D-25)
├── claims/                     # NEW top-level nav area, OR verify at plan time whether an existing claims page already exists under a different path
```

### Pattern 1: Split-view master/detail with responsive Drawer fallback (already established)

**What:** Desktop shows a compact clickable list on the left and a detail panel on the right;
below ~760px the detail becomes a `Drawer` with `variant="responsiveSheet"`.
**When to use:** Any D-08/D-32-style split view Phase 138 introduces (Capabilities matrix, and by
extension a similarly-shaped Rollen/Benutzer split view if the planner chooses that layout).
**Example (existing, not hypothetical):**
```tsx
// Source: frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx (lines 1-90 read directly)
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(max-width: 759px)')
    const onChange = () => setIsMobile(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  return isMobile
}
// Desktop: RoleMasterList (left) + RoleCapabilityDetail (right) side by side.
// Mobile: RoleMasterList full-width, RoleCapabilityDetail rendered inside <Drawer variant="responsiveSheet">.
```
This pattern should be reused/generalized for any new D-06/D-07/D-08-shaped split views rather than
rebuilt — it is already `@/components/ui`-compliant (`Drawer`, `Card`, `Button`, `Badge`).

### Pattern 2: Transactional mutation with atomic immutable history (established, Phase 137)

**What:** `Begin → defer Rollback → authorize → validate → lock → mutate → append history → Commit`.
**When to use:** Any new Phase-138 mutation that must be atomic with an audit trail (e.g. if a
future role-assignment mutation needs the same guarantee).
**Example:**
```go
// Source: backend/internal/services/effective_rights_service.go, MutateOverride (read directly, lines 168-287)
tx, err := s.starter.Begin(ctx)
defer func() { _ = tx.Rollback(ctx) }()
// ... authorize via permissions.NewService(authz).CanForFansubGroup(...) ...
// ... lock target membership, validate policy ...
// ... apply mutation, append history (failure here rolls back the mutation too) ...
if err := tx.Commit(ctx); err != nil { /* ... */ }
```

### Pattern 3: Group-wide batch resolution, never per-capability SQL (D03/D09, binding)

**What:** `ResolveGroupRights(actor, fansubGroupID)` loads membership/roles/overrides/specialized
grants in at most one round trip per category and evaluates every known action in memory.
**When to use:** The impact-preview endpoint (R-04) MUST reuse this exact primitive per affected
user — call it once per role holder (before state = current resolution, after state = same
resolution recomputed with the hypothetical role_capabilities row added/removed in memory, NOT
persisted). Do **not** write a second precedence evaluator for preview purposes; the pure function
`evaluateGroupRights(actor, fansubGroupID, sources, actions)` in `effective_rights.go` is already
side-effect-free and DB-agnostic — the impact preview can call it directly with a synthetically
modified `groupRightsSources.Roles` (add/remove the hypothetical action's granting role) instead of
whatever `roleAllows()` currently returns, which is exactly how a true "what would change" diff
without a second engine should be built.

### Anti-Patterns to Avoid
- **Second permission engine for impact preview:** do not hand-roll "if role X had capability Y, who would gain it" logic against raw SQL/role tables — reuse `evaluateGroupRights`/`ResolveGroupRights` per D-20 (binding).
- **Treating role-capability cache reload and per-user override mutation as the same activation state machine:** they are architecturally different (process cache vs. no cache at all) — conflating them will produce a dishonest or confusing status for one of the two paths (see R-05).
- **Rebuilding the role-capabilities split-view from scratch:** it already matches D-08's target shape; only the Impact Preview modal and possibly the stale `CATEGORY_ORDER`/`CATEGORY_LABEL_MAP` (missing `gruppenmedien`/`gruppenseite`/`rechteverwaltung`/`review`) need extension.
- **Assuming `VerifyClaim` grants rights:** it only flips `claim_status` to `verified`; group membership/role effects require the separate `ActivateClaimedMember` action (see R-06). An impact preview attached to "Claim genehmigen" must be honest about which of the two steps it is previewing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Effective-rights precedence for impact preview | A second "what would happen if" evaluator | `permissions.evaluateGroupRights` (pure, already unit-tested against fixtures in `effective_rights_test.go`) fed with a synthetically modified role set | D-20 is binding: no second engine. The function is already side-effect-free and exported at package level for exactly this kind of reuse. |
| Role holder enumeration | Ad-hoc query duplicated per handler | One shared repository method (new) joining `fansub_group_member_roles` (indexed on `role`) → `fansub_group_members` → `fansub_groups` → `app_users` | Needed by at least three surfaces (D-07 role view, CAP-09 impact preview, D-22 role-assignment impact) — a single well-tested query prevents drift. |
| Audit event translation to German business language | Per-component ad-hoc string templates scattered across tabs | A single translation table/function keyed on `event_type` (mirroring `capabilityCategories.ts`'s existing `categoryDisplayLabel` pattern) | `audit_logs.event_type` values are stable strings (`effective_rights.override.mutated`, `role_capability.granted`, `member_claim.verified`, …) — centralizing translation avoids the D-26 "Aktivität vs Änderungen" concepts drifting apart across screens. |
| Toast/inline "activation in progress" UX | A bespoke polling/spinner per screen | Reuse the D-19 modal-stays-open pattern already specified; if a shared async indicator is needed, note there is currently NO Toast/Snackbar primitive in `@/components/ui` (see R-10) — would need to be added to the global system first, not built locally, if the planner decides one is needed. |

**Key insight:** Nearly everything Phase 138 needs to inspect/explain already exists as a locked,
tested, real backend primitive from Phase 136/137. The genuine net-new backend work is narrow:
one impact-preview computation path (reusing existing precedence logic), one role-holder query,
one filtered audit-list endpoint, and one small additive field for the release-version display fix.
The much larger share of Phase 138's real effort is frontend: building the IA, wiring the
currently-unconsumed contract, and building the guided-flow/impact-preview UX on top of it.

## Common Pitfalls

### Pitfall 1: Assuming CONTEXT.md's "big role cards" premise is still true
**What goes wrong:** Planning a full rewrite of `frontend/src/app/admin/role-capabilities/` when the
actual code (`RoleCapabilityClient.tsx`, `RoleMasterList.tsx`, `RoleCapabilityDetail.tsx`, all read
directly in this research pass) already implements a compact master-list + categorized-accordion
detail split view with a mobile Drawer fallback — the exact shape D-08 describes as the target.
**Why it happens:** CONTEXT.md's §4 "Bekannte bestehende Oberflächen" is a discussion-time research
entry point, not a verified inventory (its own header says so: "Rechercheeinstieg, keine
abschliessende Bestandsaufnahme").
**How to avoid:** Treat D-08 as still binding (its target state is correct), but scope the actual
Phase-138 work here as "add the Impact Preview modal + fix stale category list", not "replace the
whole surface". This is a genuine contradiction between the discussion document and the real code,
flagged explicitly per the research mandate rather than silently resolved.
**Warning signs:** A plan wave that recreates `RoleMasterList`/`RoleCapabilityDetail` from scratch
is very likely unnecessary scope creep.

### Pitfall 2: Inventing capability categories not present in the registry
**What goes wrong:** Building UI sections for "Medien", "Claims", "Beiträge" as top-level capability
categories (CONTEXT.md D-12's illustrative example list) when the real `action_definitions.category`
values (queried live against `team4s_v2`) are exactly: `gruppe` (14), `gruppenmedien` (3),
`gruppenseite` (4), `projekt` (1), `rechteverwaltung` (1), `release` (9), `review` (3) — 35 actions
total, 7 categories. Note also that `fansub_group_media.view` and `fansub_group_media.delete` are
themselves categorized `gruppe`, not `gruppenmedien` — a pre-existing minor inconsistency in the
real data that must be reproduced as-is, not "fixed" silently by Phase 138 (out of scope; D-12
explicitly says group "nach den realen fachlichen Kategorien der Registry").
**Why it happens:** CONTEXT.md explicitly labels its category list "Beispiele nur als Struktur" —
easy to misread as prescriptive.
**How to avoid:** Any UI grouping/labeling work must read `action_definitions.category` (via the
existing `ListCapabilityMatrix`/`AllActions` projection) as the sole source of truth. The existing
`frontend/src/app/admin/role-capabilities/capabilityCategories.ts` `CATEGORY_LABEL_MAP` only has
`gruppe`/`projekt`/`release` mapped — `gruppenmedien`/`gruppenseite`/`rechteverwaltung`/`review`
fall through to the generic `capitalizeFirst` fallback today (functionally fine for these four,
since capitalized German nouns read correctly, but worth an explicit, deliberate label decision
rather than an accidental fallback).
**Warning signs:** Any hardcoded category list in a new component that doesn't match the 7 above.

### Pitfall 3: Conflating the two activation-status realities (CAP-10)
**What goes wrong:** Building a single "persisted → activating → active → failed" polling UI that
assumes an async window exists for both role-capability mutations and personal overrides.
**Why it happens:** D-21's prose describes one generic state machine; the real backend has two
different mechanisms (see Architecture Patterns / Architectural Responsibility Map above).
**How to avoid:** For role-capability mutations (`GrantCapability`/`RevokeCapability`), the
`ReloadCache` call is synchronous and completes (or fails, logged) before the HTTP response —
**today's response body carries no signal of a reload failure** (the handler only logs it, per
lines 168-170/243-245 of `admin_capability_handler.go`: `if err := h.permissionSvc.ReloadCache(...); err != nil { log.Printf(...) }` with no field set on the JSON response). A minimal, honest CAP-10
fix requires **adding a boolean/status field to the Grant/Revoke response** (contract-chain
extension per D-35) so the frontend can distinguish `persistiert+aktiv` from `persistiert, aber
Cache-Reload fehlgeschlagen` — without this extension, CAP-10 cannot honestly be satisfied for this
mutation path, only for the override-mutation path (which is genuinely always "active" per R-05).
For per-user overrides, `EffectiveRightsService.MutateOverride` already returns
`ActivationStatus: "active"` unconditionally on success (there is no cache to reload) — the
existing `AdminEffectiveRightsHandler.MutateOverride`'s best-effort post-commit enrichment can
degrade this to `"pending"` only if the *response-enrichment* re-resolve fails (GAP-01 behavior,
already implemented) — a `"failed"` value is never produced by this path today; a truly failed
mutation returns a 4xx/5xx before any `ActivationStatus` is constructed at all.
**Warning signs:** Any plan task that proposes a shared polling/websocket mechanism for both
mutation types without first confirming (at execution time, against real code) whether the
role-capability path actually needs one — the current synchronous-reload behavior may make polling
entirely unnecessary if the tiny response-field extension above is added instead.

### Pitfall 4: Assuming claim approval automatically changes effective rights (D-24)
**What goes wrong:** Building an Impact-Preview step on `VerifyClaim` (`POST
/admin/fansubs/:id/member-claims/:claimId/verify`) that computes an effective-rights diff, when
`VerifyClaim` only flips `member_claims.claim_status` from `pending` to `verified` — it creates NO
group membership, role, or override row (confirmed by reading `member_claims_handler.go` lines
136-159 and the repository call it makes). The action that actually changes group state is the
separate `ActivateClaimedMember` (`POST .../member-claims/activate` — verify exact route at plan
time) — and even that only establishes historical-member linkage; whether it grants any
`fansub_group_member_roles` row requires checking `AdminUsersRepository`/`MemberClaimsRepository`'s
`ActivateClaimedMember` implementation at plan/execution time (not fully traced in this research
pass — flagged as an Open Question below).
**Why it happens:** The discussion document's mental model ("Genehmigen erzeugt eine
Gruppenmitgliedschaft") describes the intended end-to-end user journey, not the current two-step
technical reality.
**How to avoid:** D-24's impact preview must be attached to whichever of the two actions
(`VerifyClaim` or `ActivateClaimedMember`) actually mutates rights-relevant state — confirm which
by reading `ActivateClaimedMember`'s repository implementation during planning, and if neither
currently grants a role/membership automatically, the "impact" to preview may correctly be "no
effective-rights change" for `VerifyClaim`, with the real impact preview belonging on
`ActivateClaimedMember` and/or on a subsequent manual "Rolle zuweisen" step.
**Warning signs:** A plan that shows an effective-rights diff on the `VerifyClaim` action without
first re-confirming its actual side effects against `member_claims_activate_repository.go`.

### Pitfall 5: Trusting the `137-CONTEXT.md`/GAP-06 exception is renegotiable
**What goes wrong:** A guided-revoke or impact-preview flow that implies a personal `user_deny`
always fully removes a capability, when Contribution Roles are a documented, intentional exception
(`137-CONTEXT.md`'s "D01 exception", `permissions.go`'s `CanForReleaseVersion()` Contribution-Role
fallback) — a stored `user_deny` does NOT block a Contribution-Role-granted capability on release
versions.
**Why it happens:** D-16's guided-revoke example only discusses group-scoped role/override
precedence, not this narrower, separately-decided exception.
**How to avoid:** If Phase 138's guided-revoke flow (CAP-08) ever surfaces a
`review.contribution.decide`-class or other Contribution-Role-bearing action, the explanation text
must account for the possibility that a scoped user-deny will not fully revoke access if a
Contribution Role still applies — do not silently assume D-16's general narrative covers this case.
**Warning signs:** A capability whose `granting_roles` includes a Contribution-context-only role
(e.g. `encoder`, `translator`, `timer`) being treated identically to a group-context role in the
guided-revoke explanation.

### Pitfall 6: PlatformAdminGate still unmounts children on token refresh (live, unpatched)
**What goes wrong:** Any long-lived Phase-138 client state (an open Impact Preview dialog tracking
`persistiert → wird aktiviert → aktiv`, a partially-filled guided-revoke flow, an in-progress
capability-override edit) can be silently discarded mid-interaction.
**Why it happens:** `frontend/src/components/auth/PlatformAdminGate.tsx` (confirmed still present
today via direct read: `if (isLoading || !isClientInitialized) { return <Loading/> }`) unmounts
`children` on every token-refresh re-validation, not just the first load — documented as Finding #5
in `.planning/notes/live-uat-ux-findings.md`, dated 2026-08-17, still unfixed as of this research
pass (2026-08-23).
**Why it matters for Phase 138 specifically:** this phase is explicitly building UX with longer-lived
in-flight state (activation-status tracking dialogs stay open per D-21) than most existing admin
screens — this pre-existing bug's blast radius grows with Phase 138's own feature set.
**How to avoid:** This is explicitly out of Phase 138's product scope (D-31 forbids "neue
Architektur" scope creep in an unrelated area, and this bug predates and is independent of Phase
138's decisions) — but the planner should be aware of it and may reasonably choose to flag it for a
human decision on whether a minimal defensive fix (or at minimum: a Phase-138 UAT check that
exercises "leave an Impact Preview dialog open across a token refresh") belongs in this phase's
scope. Not silently ignoring it is the safer choice; silently fixing it would be scope creep beyond
what CONTEXT.md authorized.
**Warning signs:** UAT failures where an in-progress override edit or open impact-preview dialog
"randomly" resets during a longer testing session.

## Code Examples

### Effective-rights inspection (already shipped, R-01)
```go
// Source: backend/internal/handlers/admin_effective_rights_handler.go (read directly, lines 186-218)
// GET /admin/fansubs/:id/app-members/:appUserId/effective-rights
func (h *AdminEffectiveRightsHandler) GetEffectiveRights(c *gin.Context) {
	// ... authorizeManagement checks CanForFansubGroup(ActionUserGroupCapabilityOverrideManage) ...
	resolution, err := h.permissionSvc.ResolveGroupRights(c.Request.Context(), *targetActor, fansubGroupID)
	// ... one ResolveGroupRights call, never a per-capability loop (D09) ...
	c.JSON(http.StatusOK, gin.H{"data": effectiveRightStatesFromResolution(resolution)})
}
```

### Override mutation request/response shape (already shipped, R-01) — exact JSON the frontend must send/consume
```go
// Source: backend/internal/handlers/capability_policy_contract.go (read directly, lines 145-160)
type CapabilityOverrideMutationRequest struct {
	GroupID      int64                     `json:"group_id"`
	TargetUserID int64                     `json:"target_user_id"`
	ActionCode   string                    `json:"action_code"`
	Effect       *CapabilityOverrideEffect `json:"effect"`          // nil => REMOVE (D06)
	Reason       *CapabilityOverrideReason `json:"reason,omitempty"`
}
type CapabilityOverrideMutationResult struct {
	Status           CapabilityMutationStatus   `json:"status"`      // "changed" | "no_op"
	Changed          bool                       `json:"changed"`
	Before           *CapabilityOverrideState   `json:"before"`
	After            *CapabilityOverrideState   `json:"after"`
	EffectiveRight   EffectiveRightState        `json:"effective_right"`
	ActivationStatus CapabilityActivationStatus `json:"activation_status"`
}
```

### Impact-preview DTO already locked, zero producers (R-04) — this IS the target contract, do not redefine it
```go
// Source: backend/internal/handlers/capability_policy_contract.go (read directly, lines 122-131)
// grep across backend/, frontend/, shared/ confirms these types are referenced ONLY in contract
// parity tests and the OpenAPI/TS type files today — no handler, no route, no repository query
// produces this shape yet.
type CapabilityOverrideImpactItem struct {
	TargetUserID int64               `json:"target_user_id"`
	Before       EffectiveRightState `json:"before"`
	After        EffectiveRightState `json:"after"`
}
type CapabilityOverrideImpactPreview struct {
	AffectedUserCount int                            `json:"affected_user_count"`
	Items             []CapabilityOverrideImpactItem `json:"items"`
}
```

### Reusable pure precedence evaluator for impact preview (R-04, no second engine)
```go
// Source: backend/internal/permissions/effective_rights.go (read directly, lines 254-336)
// evaluateGroupRights never issues I/O — feed it the CURRENT sources for the "before" state,
// and the same sources with one role's grant added/removed in memory for the "after" state.
func evaluateGroupRights(actor Actor, fansubGroupID int64, sources groupRightsSources, actions []Action) *GroupRightsResolution
```

### Real category/registry query (R-02) — run live against `team4s_v2`, not assumed
```sql
-- Executed via: docker compose exec team4sv30-db psql -U team4s -d team4s_v2
SELECT category, COUNT(*) FROM action_definitions GROUP BY category ORDER BY category;
--      category     | count
-- ------------------+-------
--  gruppe           |    14
--  gruppenmedien    |     3
--  gruppenseite     |     4
--  projekt          |     1
--  rechteverwaltung |     1
--  release          |     9
--  review           |     3
```

### The `release_version_id` display bug's real fix locus (R-08, D-29)
```tsx
// Source: frontend/src/app/admin/users/tabs/UserContributionsTab.tsx line 80 (read directly)
<Badge variant="info">Version {item.release_version_id}</Badge>
```
```go
// Source: backend/internal/repository/admin_users_tab_repository.go, ListUserContributions
// (read directly, lines 181-204) — ac.release_version_id is release_versions.id (an internal PK),
// NOT release_versions.version (the real "v1"/"v2" business label). The query currently selects
// ONLY release_versions.id, never joins release_versions.version or the episode number
// (fansub_releases.episode_id -> episodes.episode_number). Minimal fix: extend the SELECT to
// JOIN release_versions ON release_versions.id = ac.release_version_id, JOIN fansub_releases ON
// fansub_releases.id = release_versions.release_id, JOIN episodes ON episodes.id =
// fansub_releases.episode_id, and add both fields to AdminContributionItem (Go model +
// admin-users.ts type + the tab component's render) — additive, no schema migration needed.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Per-user rights displayed as two hand-picked booleans (`can_edit_content`, `can_view_members`) via `GetUserGroupRights` | Full provenance-capable per-action resolution via `ResolveGroupRights`/`GetEffectiveRights` | Phase 137 (2026-08-21) | `UserGroupRightsTab.tsx` still uses the OLD approach — Phase 138's UADM-01 work is exactly closing this gap. |
| Immediate PUT/DELETE on any rights switch (no preview, no activation tracking) | Not yet built — this is what CAP-09/CAP-10/D-18 through D-21 require | N/A — Phase 138's job | The `GrantCapability`/`RevokeCapability` handlers still do immediate-mutate-and-respond today; this is the exact pattern D-18 says is "not ausreichend". |
| Single `typesetter` role covering both Typesetting and Karaoke/FX (live-uat-ux-findings.md Finding #19, dated 2026-08-18) | A dedicated `karaoke_fx` role now exists in `role_definitions` (confirmed live: `code=karaoke_fx, label_de='Karaoke-FX', sort_order=45`) | Some time between 2026-08-18 and this research pass (2026-08-23) — exact phase not traced | Finding #19 from the UX-findings backlog is already resolved; do not re-plan it as part of Phase 138. |

**Deprecated/outdated:**
- `GetUserGroupRights`'s heuristic booleans should be considered superseded by `ResolveGroupRights`, but the endpoint itself is still live and used elsewhere (`AdminUsersRepository.GetUserGroupRights`) — verify at plan time whether anything besides `UserGroupRightsTab` still depends on it before deciding whether to deprecate the route itself or just stop using it in this one tab.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | The exact route for `ActivateClaimedMember` and whether it grants a `fansub_group_member_roles` row automatically was not fully traced in this research pass (only the handler call site was read, not the full repository implementation). | Common Pitfalls #4, phase_requirements CAP-08/D-24 | If it DOES silently grant a role, D-24's impact preview requirement applies to it directly and a plan that treats it as "no rights impact" would under-deliver CAP-related honesty guarantees. Verify `member_claims_activate_repository.go` at plan/execution time before finalizing task scope. |
| A2 | No route registration for a role-assignment (assign/revoke a group role to/from a specific user) handler was located during this pass — D-22 assumes such an action exists to attach an impact preview to. It likely lives under `fansub_group_member_roles`-adjacent handlers (`fansub_hist_group_member_roles_handler.go` or a not-yet-located "current roles" mutation handler) but was not traced end-to-end. | Architecture Patterns / Recommended Project Structure | If no such mutation endpoint exists yet at all (only historical-role endpoints do), D-22's scope may be larger than assumed — the planner must locate or confirm-absent the live role-assignment mutation path before committing wave scope. |
| A3 | Single backend container deployment (`docker-compose.yml`, confirmed via `docker compose ps` showing one `team4sv30-backend`) means the process-local `permissions.loadedCache` has no cross-replica staleness concern today. | Architectural Responsibility Map, Pitfall 3 | If the deployment topology changes to multiple backend replicas in the future, the "synchronous reload = immediately consistent" assumption breaks — out of scope for Phase 138 to solve, but worth a one-line caveat if CAP-10's UI language is meant to be forward-compatible. |

## Open Questions

1. **Does `ActivateClaimedMember` grant rights-relevant state automatically?**
   - What we know: `VerifyClaim` definitely does not (traced directly). `ActivateClaimedMember` is a separate handler call (`member_claims_handler.go` line 186) whose repository implementation (`member_claims_activate_repository.go`) was not read line-by-line in this pass.
   - What's unclear: whether it creates a `fansub_group_members`/`fansub_group_member_roles` row, and if so, whether that should be the true attachment point for D-24's impact preview.
   - Recommendation: read `member_claims_activate_repository.go` fully during planning before writing the D-24 task; this is a fast, bounded check.

2. **Where does role assignment/removal on an existing group member currently live (for D-22)?**
   - What we know: `fansub_group_member_roles` is a real table with a `created_by_app_user_id` column implying some mutation path exists; `fansub_hist_group_member_roles_handler.go` exists but its name suggests historical-role editing, not necessarily current/active role assignment.
   - What's unclear: the exact handler/route for "assign role X to app-user Y in group Z" (current, not historical) that D-22's impact preview must attach to.
   - Recommendation: grep `fansub_group_member_roles` INSERT/DELETE statements across handlers during planning to pin the exact route before scoping D-22's tasks.

3. **What is the intended `action_code` semantics for a role-capability impact preview's "before" state — matrix-wide or single-action?**
   - What we know: `CapabilityOverrideImpactPreview` is a flat list of `{target_user_id, before, after}` where `before`/`after` are each a single `EffectiveRightState` (i.e., scoped to one action_code at a time, matching the override-mutation shape it was originally designed alongside in Phase 136).
   - What's unclear: whether Grant/RevokeCapability's impact preview should reuse this exact one-action-at-a-time shape (natural fit, since a single Grant/Revoke call is also always exactly one `action_code`) or needs a wrapper for multi-action batch previews — current UI as specified (D-19) only ever previews one capability toggle at a time, so the existing DTO likely needs zero shape changes, only a producing endpoint.
   - Recommendation: confirm during planning that D-19's UI never batches multiple capability toggles into one preview request; if it doesn't, the existing DTO is sufficient as-is.

## Environment Availability

Not applicable as a blocking concern — this phase has no new external tool/service dependencies.
For completeness:

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL (`team4sv30-db`) | All backend queries | ✓ (confirmed live, `docker compose ps`) | 16 (per `backend/Dockerfile`/compose) | — |
| Go 1.25 toolchain (in-container) | Backend build/test | ✓ (existing container) | 1.25 (`backend/go.mod`) | — |
| Node/npm (in-container) | Frontend build/test | ✓ (existing container) | Per `frontend/package.json` | — |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Backend framework | Go `testing` + `testify` (`github.com/stretchr/testify`), run via `docker compose exec team4sv30-backend go test ./...` |
| Frontend framework | Vitest 3 (`frontend/package.json` `"test": "vitest run"`) |
| Config file | `frontend/vitest.config.ts` (existing, path alias `@` configured there) |
| Quick run command (backend) | `docker compose exec team4sv30-backend go test ./internal/handlers/... ./internal/services/... ./internal/permissions/... -run 'EffectiveRights\|Capability\|Claim' -count=1` |
| Quick run command (frontend) | `docker compose exec team4sv30-frontend npm test -- --run "src/app/admin/users/tabs/UserGroupRightsTab.test.tsx" "src/app/admin/role-capabilities/*.test.tsx"` |
| Full suite command (backend) | `docker compose exec team4sv30-backend go test ./... -count=1` |
| Full suite command (frontend) | `docker compose exec team4sv30-frontend npm test -- --run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|--------------|
| CAP-08 | Guided revoke shows all granting sources before recommending a scoped deny | unit (frontend component) | `npm test -- --run "UserGroupRightsTab"` (extend existing) | ✅ existing file, ❌ new assertions needed |
| CAP-08 | Backend enumerates granting_roles/specialized_grants correctly for a multi-source capability | unit (backend, already covered) | `go test ./internal/permissions/... -run TestEvaluateGroupRights` | ✅ `effective_rights_test.go` already covers this shape |
| CAP-09 | New impact-preview endpoint returns correct before/after per affected user, batched, no N+1 | integration (backend, new) | `go test ./internal/handlers/... -run TestAdminCapabilityImpactPreview` | ❌ Wave 0 — new handler + new test file |
| CAP-09 | Impact preview modal renders counts + expandable table | unit (frontend, new) | `npm test -- --run "RoleCapabilityImpactPreview"` | ❌ Wave 0 — new component + test |
| CAP-10 | Grant/RevokeCapability response distinguishes cache-reload success/failure | unit (backend, extend existing) | `go test ./internal/handlers/... -run TestAdminCapabilityHandler` | ✅ `admin_capability_handler_test.go` exists, ❌ new assertions for the extended response field |
| UADM-01 | `UserGroupRightsTab` consumes `GetEffectiveRights`, not the old heuristic endpoint | unit (frontend, rewrite existing) | `npm test -- --run "UserGroupRightsTab"` | ✅ `UserGroupRightsTab.test.tsx` exists, needs substantial rewrite (data source changes) |
| — (role holders) | New role-holder query returns correct (app_user, group) pairs, group-scoped correctly, no cross-group leakage | unit (backend, new) | `go test ./internal/repository/... -run TestListRoleHolders` | ❌ Wave 0 — new repository method + test |
| D-29 | Contribution tab shows correct episode + real version label, not `release_versions.id` | unit (frontend, extend existing) + unit (backend, extend existing) | `npm test -- --run "UserContributionsTab"`; `go test ./internal/repository/... -run TestListUserContributions` | ✅ both existing files, ❌ new assertions for the new fields |

### Sampling Rate
- **Per task commit:** the relevant quick-run command from the table above (backend or frontend, whichever the task touched).
- **Per wave merge:** both quick-run commands together.
- **Phase gate:** full backend + frontend suites green before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `backend/internal/handlers/admin_capability_impact_handler_test.go` — covers CAP-09
- [ ] `backend/internal/repository/*_role_holders_test.go` (new file, name TBD at plan time) — covers the role-holder query
- [ ] `frontend/src/app/admin/role-capabilities/*ImpactPreview*.test.tsx` (new component + test) — covers CAP-09 UI
- [ ] Framework install: none — Vitest 3 and Go testing/testify are already installed and configured.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | Indirect | Delegated to Keycloak/JWT (`middleware.CommentAuthIdentityFromContext`) — out of Phase 138's scope, do not touch. |
| V3 Session Management | Yes (risk, not a feature to build) | `PlatformAdminGate.tsx`'s unmount-on-refresh behavior (Pitfall 6) is a session-handling risk for Phase 138's longer-lived dialogs; document, do not silently fix beyond scope. |
| V4 Access Control | Yes — central | Two established, correct patterns to reuse verbatim: `requirePlatformAdminIdentity()` (global platform-admin-only surfaces: role→capability matrix, `/admin/fansub-group-roles`) and `permissionActorFromContext()` + `CanForFansubGroup(ActionUserGroupCapabilityOverrideManage, ...)` (group-scoped, delegable to a `fansub_lead` holding the dedicated management capability — D07/137-CONTEXT.md). Any NEW Phase-138 endpoint (impact preview, role holders, changes list) must pick the correct one of these two patterns based on whether it is a global or group-scoped operation, and must never invent a third. |
| V5 Input Validation | Yes | `CapabilityOverrideReason.Validate()` (category enum + conditional required text for `other`) and `overrideMutationKindFromRequest` (exhaustive switch, rejects unknown `effect` values) are the established validation patterns — reuse this shape for any new mutation DTOs. |
| V6 Cryptography | Minor | `member_claim_invitations.token_hash` (64-char hash column) is the only crypto-adjacent artifact in this phase's domain — Phase 138 does not need to touch it, only display invitation status. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation (already established, reuse) |
|---------|--------|------------------------------------------------------|
| BOLA/IDOR via manipulated `fansub_group_id`/`target_user_id` | Tampering / Information Disclosure | `AdminEffectiveRightsHandler.MutateOverride`'s explicit body-vs-path mismatch check (`req.GroupID != fansubGroupID \|\| req.TargetUserID != targetAppUserID` → 422 + audit) and `LockTargetMembership`'s scoped, no-cross-group-disclosure lookup (`repository.ErrNotFound` on any foreign/mismatched pair, never a different error). Any new Phase-138 endpoint accepting a group ID + user ID pair in the body MUST repeat this exact pattern. |
| Privilege escalation via self-override | Elevation of Privilege | Already handled by design: `MutateOverride` authorizes via the actor's OWN `CanForFansubGroup(ActionUserGroupCapabilityOverrideManage, ...)` result for the target group, not a hardcoded role check — self-modification is allowed only if the actor legitimately holds the management capability (D07, tested). No new mitigation needed; do not weaken this by adding a "convenience" self-edit bypass. |
| Cross-group enumeration via the new role-holder query (R-03, not yet built) | Information Disclosure | The new role-holder endpoint MUST be scoped the same way as existing group-scoped endpoints — either platform-admin-only (matching `AdminGroupRolesHandler`'s pattern, if it is meant to answer "who holds role X across ALL groups") or per-group-authorized (if scoped to one group at a time). This is a genuine new design decision for the planner: decide explicitly which authorization pattern applies before building it, since it is new surface area with no existing precedent handler to copy verbatim. |
| Non-deniable/override-blind bypass confusion (Contribution Roles) | Tampering (of user expectations, not data) | Already correctly enforced in `CanForReleaseVersion()` per the documented D01 exception — Phase 138 must only EXPLAIN this in guided-revoke UI text (Pitfall 5), never attempt to "fix" the enforcement behavior itself (explicitly out of scope, locked by 137-CONTEXT.md). |

## Sources

### Primary (HIGH confidence — read directly from the real codebase / live DB in this session)
- `backend/internal/handlers/admin_effective_rights_handler.go` (full read)
- `backend/internal/repository/authz_user_overrides.go` (full read)
- `backend/internal/handlers/admin_capability_handler.go` (full read)
- `backend/internal/handlers/capability_policy_contract.go` (full read)
- `backend/internal/permissions/effective_rights.go` (full read)
- `backend/internal/permissions/permissions.go` (partial read, lines 1-479, 856-874)
- `backend/internal/services/effective_rights_service.go` (full read)
- `backend/internal/repository/authz_capability_mutations.go` (full read)
- `backend/internal/handlers/role_catalog_handler.go`, `admin_group_roles_handler.go` (full reads)
- `backend/internal/handlers/member_claims_handler.go` (partial read, lines 117-238)
- `backend/internal/repository/admin_users_tab_repository.go` (partial read, lines 65-326)
- `backend/internal/handlers/fansub_group_members.go`, `backend/internal/repository/fansub_repository.go` (`ListMembers`) (partial reads)
- `backend/internal/repository/audit_logs.go` (full read)
- `backend/internal/handlers/platform_admin_authz.go`, `permission_authz.go` (full reads)
- `backend/cmd/server/main.go` (handler wiring, lines ~500-545), `backend/cmd/server/admin_routes.go` (route registration, grepped)
- `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx` (full read)
- `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx`, `RoleMasterList.tsx`, `RoleCapabilityDetail.tsx`, `capabilityCategories.ts` (reads)
- `frontend/src/types/admin-capability.ts`, `frontend/src/types/admin-users.ts` (grepped for exported shapes)
- `frontend/src/lib/api.ts` (grepped for existing/missing functions)
- `frontend/src/components/auth/PlatformAdminGate.tsx` (grepped, confirmed unfixed)
- Live Postgres queries against `team4s_v2` via `docker compose exec team4sv30-db psql`: `action_definitions`, `role_definitions`, `role_capabilities`, `member_claims`, `member_claim_invitations`, `audit_logs`, `release_versions`, `fansub_releases`, `fansub_group_member_roles` (schema + live data)
- `.planning/phases/138-effective-rights-administration-impact-ux/138-CONTEXT.md` (full read)
- `.planning/phases/137-central-effective-rights-resolver-overrides/137-CONTEXT.md`, `137-VERIFICATION.md`, `137-UAT.md` (full reads)
- `.planning/REQUIREMENTS.md` (grepped for CAP-08/09/10, UADM-01)
- `.planning/notes/live-uat-ux-findings.md` (full read, Findings #5, #19, #25-#30 most relevant)
- `.planning/config.json` (full read — `nyquist_validation: true`, no `security_enforcement` key present → treated as enabled)
- `CLAUDE.md` (project root, full content shown in system context)

### Secondary (MEDIUM confidence)
- None used — all findings for this phase were verifiable directly against source code or the live dev database; no WebSearch/Context7 lookups were needed since this is a pure brownfield-code research task with no external library questions.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: N/A (no new packages)
- Architecture: HIGH — all claims traced to specific files/line ranges read directly, or live SQL queries against the actual dev database.
- Pitfalls: HIGH for pitfalls 1-4 (directly verified against code); MEDIUM for pitfall 6 (verified the bug still exists in code, but did not reproduce it live in-browser this session — relying on the prior documented finding plus a fresh code read confirming the same conditional is still present).

**Research date:** 2026-08-23
**Valid until:** ~14 days (fast-moving area — Phase 137 gap-closure work landed commits as recently as 2026-08-22; re-verify live DB state and route registrations if planning is delayed past early September 2026).
