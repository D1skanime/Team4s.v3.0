# Phase 137: Central Effective-Rights Resolver & Overrides - Pattern Map (Gap Closure)

**Mapped:** 2026-08-21
**Run type:** GAP CLOSURE (not a fresh phase) — GAP-01 through GAP-06 per `137-UAT.md`
**Files analyzed:** 5 (4 modified + 2 contract files counted once each)
**Analogs found:** 6 / 6 — for a gap-closure run the "closest analog" for every gap IS the
file itself. No external analog search was needed; this document instead pins the exact
current code the planner must edit, with line numbers, so plans can be written without
re-deriving context from scratch.

This document intentionally does **not** decide GAP-06's fachliche question (contribution
role vs. user_deny precedence) — 137-UAT.md requires the planner/executor to read
137-CONTEXT.md D01 and existing tests first and choose Fall A/B/C. What follows is the exact
current runtime behavior and exact current test coverage so that decision can be made
correctly.

---

## File Classification

| Gap | File | Role | Data Flow | Current State (self-is-analog) |
|-----|------|------|-----------|-------------------------------|
| GAP-01, GAP-02 | `backend/internal/handlers/admin_effective_rights_handler.go` | handler | request-response | `MutateOverride` (lines 207-305) + `writeMutationError` (lines 340-372) |
| GAP-03 | `shared/contracts/admin-capabilities.yaml` | config (OpenAPI contract) | request-response | 2 GET path items missing `400` (lines 259-313, 381-436) |
| GAP-03 | `shared/contracts/openapi.yaml` | config (OpenAPI contract) | request-response | 2 GET path items missing `400` (lines 4165-4219, 4286-4341) |
| GAP-04 | `backend/internal/permissions/effective_rights.go` | service/domain (permissions engine) | request-response | stale file-level doc comment, lines 22-38 |
| GAP-05 | `backend/internal/services/effective_rights_service.go` | service | CRUD (transactional mutation) | misaligned `var (...)` block, lines 80-87 |
| GAP-06 | `backend/internal/permissions/permissions.go` | service/domain (permissions engine) | request-response | `CanForReleaseVersion` (lines 568-641) + `canForReleaseVersionGroupRole` (lines 643-678) |

---

## Pattern Assignments

### GAP-01 + GAP-02: `backend/internal/handlers/admin_effective_rights_handler.go`

**This file is its own analog.** No search elsewhere is meaningful — the fix is local to
`MutateOverride`'s post-commit sequencing and `writeMutationError`'s audit coverage.

**Full current `MutateOverride` handler (lines 207-305):**

```go
// MutateOverride applies exactly one D06 SET ALLOW / SET DENY / REMOVE
// operation for one target user's group-scoped capability override, entirely
// delegated to EffectiveRightsService.MutateOverride.
// PUT /admin/fansubs/:id/app-members/:appUserId/capability-overrides
func (h *AdminEffectiveRightsHandler) MutateOverride(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}

	fansubGroupID, targetAppUserID, ok := h.parseGroupAndTarget(c)
	if !ok {
		return
	}

	var req CapabilityOverrideMutationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		badRequest(c, "ungültiger request body")
		return
	}

	// D08: the path parameters are the authorization-bearing scope; a
	// manipulated body group_id/target_user_id must never silently override
	// them or reach the domain mutation.
	if req.GroupID != fansubGroupID || req.TargetUserID != targetAppUserID {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"message": "group_id/target_user_id im Body stimmen nicht mit dem Pfad überein"},
		})
		return
	}
	if strings.TrimSpace(req.ActionCode) == "" {
		badRequest(c, "action_code ist erforderlich")
		return
	}

	kind, ok := overrideMutationKindFromRequest(req.Effect)
	if !ok {
		badRequest(c, "ungültiger effect-Wert")
		return
	}

	reasonCategory, reasonText := "", ""
	if req.Reason != nil {
		reasonCategory = string(req.Reason.Category)
		if req.Reason.Text != nil {
			reasonText = *req.Reason.Text
		}
	}

	result, err := h.mutationSvc.MutateOverride(c.Request.Context(), services.EffectiveRightsOverrideMutationCommand{
		Actor:           actor,
		TargetAppUserID: targetAppUserID,
		FansubGroupID:   fansubGroupID,
		ActionCode:      permissions.Action(req.ActionCode),
		Kind:            kind,
		ReasonCategory:  reasonCategory,
		ReasonText:      reasonText,
	})
	if err != nil {
		h.writeMutationError(c, identity, fansubGroupID, targetAppUserID, permissions.Action(req.ActionCode), err)
		return
	}

	// <-- GAP-01: mutationSvc.MutateOverride above has ALREADY COMMITTED
	// (including the immutable history row) by this point. Everything below
	// this line is pure post-commit enrichment/response-building, yet a
	// failure in either resolveTargetActor or ResolveGroupRights currently
	// returns 404/500 to the caller for an operation that already succeeded.
	targetActor, ok := h.resolveTargetActor(c, targetAppUserID, fansubGroupID)
	if !ok {
		return
	}
	resolution, err := h.permissionSvc.ResolveGroupRights(c.Request.Context(), *targetActor, fansubGroupID)
	if err != nil {
		log.Printf("effective rights mutate: resolve error (group=%d, target=%d): %v", fansubGroupID, targetAppUserID, err)
		internalError(c, "interner serverfehler")
		return
	}
	effectiveRight := effectiveRightStateFromCapabilityState(resolution.Can(permissions.Action(req.ActionCode)))
	now := time.Now().UTC().Format(time.RFC3339)

	response := CapabilityOverrideMutationResult{
		Status:  mutationStatus(result.Changed),
		Changed: result.Changed,
		Before: capabilityOverrideStateFromMutationSide(
			fansubGroupID, targetAppUserID, req.ActionCode, result.BeforeEffect, req.Reason, actor.AppUserID, now,
		),
		After: capabilityOverrideStateFromMutationSide(
			fansubGroupID, targetAppUserID, req.ActionCode, result.AfterEffect, req.Reason, actor.AppUserID, now,
		),
		EffectiveRight:   effectiveRight,
		ActivationStatus: CapabilityActivationStatusActive,
	}

	// <-- GAP-02: this is the ONLY place the generic admin audit log is
	// written for a successful mutation, and it only executes if the two
	// post-commit reads above both succeeded.
	_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "effective_rights.override.mutated",
		ScopeType:      permissions.ScopeTypeGroup,
		ScopeID:        &fansubGroupID,
		TargetType:     "user_group_capability_override",
		TargetID:       &targetAppUserID,
		Action:         req.ActionCode,
		Outcome:        "allowed",
		Payload:        map[string]any{"action_code": req.ActionCode, "kind": string(kind), "changed": result.Changed},
	})

	c.JSON(http.StatusOK, gin.H{"data": response})
}
```

**Everything the result carries already, without any post-commit resolve/read** (this is
the data GAP-01's fix can use to build a response and write the audit entry immediately
after `mutationSvc.MutateOverride` returns, before attempting any enrichment):

```go
// services/effective_rights_service.go:106-111
type EffectiveRightsOverrideMutationResult struct {
	Changed          bool
	BeforeEffect     *string
	AfterEffect      *string
	ActivationStatus EffectiveRightsActivationStatus
}
```

**Full current `writeMutationError` (lines 340-372) — GAP-02's error-path audit gap:**

```go
func (h *AdminEffectiveRightsHandler) writeMutationError(
	c *gin.Context, identity middleware.AuthIdentity, fansubGroupID int64, targetAppUserID int64,
	action permissions.Action, err error,
) {
	switch {
	case errors.Is(err, services.ErrEffectiveRightsCapabilityDenied):
		auditPermissionDenied(
			c, h.auditLogRepo, identity, "effective_rights.override.denied", &fansubGroupID,
			"user_group_capability_override", &targetAppUserID, action,
			permissions.Result{Allowed: false, ReasonCode: permissions.ReasonInsufficientRole},
		)
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "keine berechtigung für diese aktion"}})
	case errors.Is(err, services.ErrEffectiveRightsTargetNotActiveMember):
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"message": "zielmitglied hat keine aktive mitgliedschaft in dieser gruppe"},
		})
	case errors.Is(err, services.ErrEffectiveRightsActionUnknown):
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{"message": "unbekannter action_code"}})
	case errors.Is(err, services.ErrEffectiveRightsActionNotOverridable):
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"message": "diese capability kann nicht individuell überschrieben werden"},
		})
	case errors.Is(err, services.ErrEffectiveRightsReasonRequired):
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"message": "ein grund ist für diese änderung erforderlich"},
		})
	case errors.Is(err, services.ErrEffectiveRightsMutationInvalid):
		badRequest(c, "ungültige mutation")
	default:
		log.Printf("effective rights mutate: service error (group=%d, target=%d): %v", fansubGroupID, targetAppUserID, err)
		internalError(c, "interner serverfehler")
	}
}
```

Only the first `case` (`ErrEffectiveRightsCapabilityDenied`) calls `auditPermissionDenied`.
The other four mapped error branches (`ErrEffectiveRightsTargetNotActiveMember`,
`ErrEffectiveRightsActionUnknown`, `ErrEffectiveRightsActionNotOverridable`,
`ErrEffectiveRightsReasonRequired`) write no audit entry.

**Existing shared audit helper to reuse/extend (`permission_authz.go:68-108`)** — this is
the project's established "best effort, ignore the write error" pattern already used by
~30 handler files (`_ = h.auditLogRepo.Write(...)`, e.g. `admin_capability_handler.go:173`,
`admin_users_mutations_handler.go:40`, `app_auth.go:522` etc.) — GAP-02's "best effort"
requirement should follow this exact existing convention, not invent a new one:

```go
func auditPermissionDenied(
	ctx *gin.Context,
	auditRepo auditLogWriter,
	identity middleware.AuthIdentity,
	eventType string,
	scopeID *int64,
	targetType string,
	targetID *int64,
	action permissions.Action,
	result permissions.Result,
) {
	if auditRepo == nil {
		return
	}

	var actorAppUserID *int64
	if identity.AppUserID > 0 {
		actorAppUserID = &identity.AppUserID
	}
	var actorLegacyUserID *int64
	if identity.UserID > 0 {
		actorLegacyUserID = &identity.UserID
	}
	reasonCode := result.ReasonCode
	_ = auditRepo.Write(ctx.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID:    actorAppUserID,
		ActorLegacyUserID: actorLegacyUserID,
		EventType:         eventType,
		ScopeType:         permissions.ScopeTypeGroup,
		ScopeID:           scopeID,
		TargetType:        targetType,
		TargetID:          targetID,
		Action:            string(action),
		Outcome:           "denied",
		ReasonCode:        &reasonCode,
		Payload: map[string]any{
			"matched_role":  result.MatchedRole,
			"matched_scope": result.MatchedScope,
		},
	})
}
```

The `repository.AuditLogEntry` struct (`repository/audit_logs.go:12-24`) all audit-log call
sites populate:

```go
type AuditLogEntry struct {
	ActorAppUserID    *int64
	ActorLegacyUserID *int64
	EventType         string
	ScopeType         string
	ScopeID           *int64
	TargetType        string
	TargetID          *int64
	Action            string
	Outcome           string
	ReasonCode        *string
	Payload           map[string]any
}
```

The `auditLogWriter` interface this handler already depends on
(`backend/internal/handlers/app_auth.go:73-75`):

```go
type auditLogWriter interface {
	Write(ctx context.Context, entry repository.AuditLogEntry) error
}
```

**`EffectiveRightsService.MutateOverride`'s commit boundary** (the point past which any
failure is post-commit, `backend/internal/services/effective_rights_service.go:279-287`) —
needed so the handler-side fix in GAP-01 knows precisely what has already durably happened
by the time it receives `result, err := h.mutationSvc.MutateOverride(...)`:

```go
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("mutate override commit: %w", err)
	}

	return &EffectiveRightsOverrideMutationResult{
		Changed: true, BeforeEffect: before, AfterEffect: after,
		ActivationStatus: EffectiveRightsActivationStatusActive,
	}, nil
```

i.e. `h.mutationSvc.MutateOverride` returning `(result, nil)` means the transaction —
override row + immutable `user_group_capability_override_history` row — is **already
committed**. Any error from that point in the handler onward (`resolveTargetActor`,
`ResolveGroupRights`) is enrichment-only and must not be surfaced as a write failure.

---

### GAP-03: `shared/contracts/admin-capabilities.yaml` and `shared/contracts/openapi.yaml`

**Handler behavior that must be documented** — `parseGroupAndTarget`
(`backend/internal/handlers/admin_effective_rights_handler.go:94-108`), called by
`GetEffectiveRights` and `ListOverrideHistory` (not `MutateOverride`, which parses the
same params but is already documented with `400`):

```go
func (h *AdminEffectiveRightsHandler) parseGroupAndTarget(c *gin.Context) (int64, int64, bool) {
	fansubGroupID, err := parseFansubID(c.Param("id"))
	if err != nil {
		badRequest(c, "ungültige fansub id")
		return 0, 0, false
	}
	targetAppUserID, err := strconv.ParseInt(c.Param("appUserId"), 10, 64)
	if err != nil || targetAppUserID <= 0 {
		badRequest(c, "ungültige app_user_id")
		return 0, 0, false
	}
	return fansubGroupID, targetAppUserID, true
}
```

**Two GET endpoints missing `400` (must add to BOTH files):**

1. `GET /api/v1/admin/fansubs/{id}/app-members/{appUserId}/effective-rights`
   - `admin-capabilities.yaml`: path item at line 259; `responses:` block at lines 283-311
     (currently `200, 401, 403, 404, 500` — no `400`).
   - `openapi.yaml`: path item at line 4165; `responses:` block at lines 4189-4218
     (currently `200, 401, 403, 404, 500` — no `400`).
2. `GET /api/v1/admin/fansubs/{id}/app-members/{appUserId}/capability-overrides/history`
   - `admin-capabilities.yaml`: path item at line 381; `responses:` block at lines 405-435
     (currently `200, 401, 403, 500` — no `400`).
   - `openapi.yaml`: path item at line 4286; `responses:` block at lines 4310-4340
     (currently `200, 401, 403, 500` — no `400`).

**Exact analog `400` block already used for the same "malformed path ID" case elsewhere in
`admin-capabilities.yaml`** (lines 39-43, `GET /api/v1/admin/fansubs/{id}/capabilities`) —
copy this shape verbatim (adjusting the description to also mention `appUserId` where
relevant) into the two GET endpoints above, ordered before `401` to match existing status
ordering conventions in this file:

```yaml
        "400":
          description: Ungültige Fansubgruppen-ID
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
```

**Existing `400` block already present on the sibling `PUT .../capability-overrides`
endpoint in `admin-capabilities.yaml`** (lines 352-357) — same file, same resource family,
use as the description-wording analog for the two GET endpoints (adapt wording to "path
parameter" rather than "request body"):

```yaml
        "400":
          description: Ungültiger Request-Body
          content:
            application/json:
              schema: { $ref: "#/components/schemas/ErrorResponse" }
```

`openapi.yaml` uses the same `$ref: "#/components/schemas/ErrorResponse"` schema and the
same English-description convention as its neighboring `401`/`403` blocks already shown
above (e.g. `"401": description: Authentication required`) — mirror that phrasing style,
e.g. `"400": description: Invalid path parameter (id or appUserId)`.

**Constraint from GAP-03:** no other endpoints/response codes may be touched; both contract
files must end up consistent with each other (this repo already runs
`phase136_contract_parity_test.go` / `admin_capability_contract_test.go` to compare them —
rerun those after editing).

---

### GAP-04: `backend/internal/permissions/effective_rights.go` (stale comment, lines 22-38)

**Current (stale) file-level doc comment block:**

```go
// Known production-wiring gap (documented rather than silently worked around): the
// concrete resolver backing production Service instances (*repository.AuthzRepository) does
// not yet implement the two new optional interfaces this file introduces
// (GroupRightsMembershipResolver, GroupRightsOverridesResolver) -- adding those methods
// requires editing a repository-package file, which is outside this plan's declared
// files_modified. Until a later plan wires them, ResolveGroupRights degrades to the
// pre-Phase-137 role-only shape (see the fallback comment inside ResolveGroupRights) with
// zero regression for existing role-based checks, but real per-user override enforcement is
// not yet live end-to-end. Review Delegation has no such gap: ReviewContextResolver already
// exists and AuthzRepository already implements it, so the specialized-grant seam
// (review_grant_provider.go) is fully wired in production today.
//
// The Go DTO consumed by the admin HTTP layer (backend/internal/handlers/
// capability_policy_contract.go's EffectiveRightState) also has not been extended to this
// additive shape yet -- 137-02-SUMMARY.md already flags that gap for whichever later plan
// wires an HTTP projection of this resolution.
```

**Ground truth that makes this stale** — `backend/internal/repository/authz_permissions.go`
already implements both optional interfaces, with compile-time assertions
(lines 386-391):

```go
// optionalen ResolveGroupRights-Interfaces (Plan 137-05, schließt die in
// 137-04-SUMMARY.md dokumentierte Known-Gap-Lücke).
var (
	_ permissions.GroupRightsMembershipResolver = (*AuthzRepository)(nil)
	_ permissions.GroupRightsOverridesResolver  = (*AuthzRepository)(nil)
)
```

with the two concrete methods at `authz_permissions.go:325` (`ResolveActorGroupMembership`)
and `authz_permissions.go:361` (`ResolveActorUserOverrides`). Also, the DTO gap the second
paragraph describes is closed — `frontend/src/types/admin-capability.ts` and both contract
files (`shared/contracts/admin-capabilities.yaml`/`openapi.yaml`) already carry
`EffectiveRightState`'s extended provenance fields, confirmed by 137-VERIFICATION.md.

**Fix shape (GAP-04 explicitly forbids any runtime change — comment-only):** replace both
paragraphs with a short note that the gap was closed in Plan 137-05
(`authz_permissions.go`'s `ResolveActorGroupMembership`/`ResolveActorUserOverrides`, proven
by `TestPhase137AuthzRepositoryImplementsGroupRightsOptionalInterfaces`), and that the DTO
extension shipped in Plan 137-02. This is WR-01 from `137-REVIEW.md`.

---

### GAP-05: `backend/internal/services/effective_rights_service.go` (gofmt, lines 80-87)

**Current misaligned block:**

```go
var (
	ErrEffectiveRightsMutationInvalid      = errors.New("effective rights mutation invalid")
	ErrEffectiveRightsCapabilityDenied     = errors.New("effective rights capability denied")
	ErrEffectiveRightsActionUnknown        = errors.New("effective rights action unknown")
	ErrEffectiveRightsActionNotOverridable = errors.New("effective rights action not overridable")
	ErrEffectiveRightsTargetNotActiveMember = errors.New("effective rights target not active member")
	ErrEffectiveRightsReasonRequired       = errors.New("effective rights reason required")
)
```

`ErrEffectiveRightsTargetNotActiveMember` (the longest identifier) breaks alignment instead
of the whole block re-aligning to it, which is what `gofmt` produces. Mechanical fix:
`gofmt -w backend/internal/services/effective_rights_service.go` (or any other Go file the
gap plans touch). UAT explicitly forbids unrelated cosmetic changes — do not run `gofmt`
across unrelated files/packages.

---

### GAP-06: `backend/internal/permissions/permissions.go` — `CanForReleaseVersion` (DECISION REQUIRED input, not a prescribed fix)

**Full current `CanForReleaseVersion` (lines 568-641):**

```go
func (s *Service) CanForReleaseVersion(ctx context.Context, actor Actor, action Action, releaseVersionID int64) (Result, error) {
	// Schritt 0: Basis-Checks (analog canForContext).
	if s == nil || s.resolver == nil {
		return denied(ReasonUnauthorized, "permission service nicht verfügbar"), nil
	}
	if actor.AppUserID <= 0 {
		return denied(ReasonUnauthorized, "aktueller app-user fehlt"), nil
	}
	if strings.TrimSpace(actor.Status) == "disabled" {
		return denied(ReasonDisabledUser, "deaktivierter benutzer"), nil
	}
	if actor.IsPlatformAdmin {
		return Result{
			Allowed:      true,
			ReasonCode:   ReasonPlatformAdmin,
			Reason:       "platform_admin darf diese aktion ausführen",
			MatchedRole:  RolePlatformAdmin,
			MatchedScope: ScopeTypeGroup,
		}, nil
	}

	// Schritt 1: Ressource auflösen.
	resourceCtx, err := s.resolver.ResolveReleaseVersion(ctx, releaseVersionID)
	if err != nil {
		return Result{}, err
	}
	if resourceCtx == nil || len(resourceCtx.FansubGroupIDs) == 0 {
		return denied(ReasonResourceNotFound, "ressource nicht gefunden"), nil
	}

	// Schritt 2: Aktive Gruppenrollen pruefen. Release-Versionen koennen mehrere
	// Fansub-Gruppen haben; eine passende Rolle in irgendeiner Gruppe reicht.
	groupRoleResult, hasGroupMembership, err := s.canForReleaseVersionGroupRole(ctx, actor, action, resourceCtx)
	if err != nil {
		return Result{}, err
	}
	if groupRoleResult.Allowed {
		return groupRoleResult, nil
	}

	// Schritt 3: Contribution-Check (D-01..D-04).
	// Gibt versions-spezifische role_codes zurück; Fallback auf anime-weite wenn keine Override existiert.
	// Contribution roles stay their own, override-blind domain per the plan's minimal-edit
	// scope -- they can still grant access even when the group-role step above was denied by
	// a stored user_deny.
	roleCodes, err := s.resolver.ListActorContributionRolesForVersion(ctx, actor.AppUserID, releaseVersionID)
	if err != nil {
		return Result{}, err
	}
	for _, code := range roleCodes {
		if roleAllows(code, action) {
			return Result{
				Allowed:      true,
				ReasonCode:   ReasonAllowed,
				Reason:       "berechtigung über contribution-rolle bestätigt",
				MatchedRole:  code,
				MatchedScope: ScopeTypeGroup,
			}, nil
		}
	}
	if len(roleCodes) > 0 {
		return denied(ReasonInsufficientRole, "contribution vorhanden, aber rolle reicht nicht aus"), nil
	}
	// A stored user_deny is a more specific, more transparent denial reason than the generic
	// insufficient_role fallback below -- surface it once neither the group-role step nor the
	// contribution fallback granted access.
	if groupRoleResult.ReasonCode == ReasonCodeUserDeny {
		return groupRoleResult, nil
	}
	if hasGroupMembership {
		return denied(ReasonInsufficientRole, "gruppenmitgliedschaft vorhanden, aber rolle reicht nicht aus"), nil
	}
	return denied(ReasonNoMembership, "keine contribution für diese release-version"), nil
}
```

**Full current `canForReleaseVersionGroupRole` (lines 643-678)** — the step that already IS
override-aware (Step 2, routes through `ResolveGroupRights`):

```go
// canForReleaseVersionGroupRole is CanForReleaseVersion's step 2 (the shared
// group-context path): it now derives its decision from ResolveGroupRights
// instead of a raw role loop, so a stored user allow/deny for the resolved
// group changes the result here exactly as it does for CanForFansubGroup
// (137-RESEARCH.md Pattern 1). Step 3 (contribution-role fallback) remains a
// separate, unchanged domain per the plan's minimal-edit scope. When no group
// grants access, the returned Result carries the most specific denial reason
// found (a decisive user_deny over the generic zero-value) so the caller can
// distinguish "explicitly denied" from "simply never granted".
func (s *Service) canForReleaseVersionGroupRole(ctx context.Context, actor Actor, action Action, resourceCtx *Context) (Result, bool, error) {
	hasGroupMembership := false
	var deniedByUserOverride *CapabilityRightState
	var deniedGroupID int64
	for _, fansubGroupID := range resourceCtx.FansubGroupIDs {
		groupRights, err := s.ResolveGroupRights(ctx, actor, fansubGroupID)
		if err != nil {
			return Result{}, false, err
		}
		if groupRights.ActiveMembership {
			hasGroupMembership = true
		}
		state := groupRights.Can(action)
		if state.Allowed {
			return resultFromCapabilityState(state, fansubGroupID), true, nil
		}
		if state.DecisiveSource == ProvenanceUserDeny && deniedByUserOverride == nil {
			captured := state
			deniedByUserOverride = &captured
			deniedGroupID = fansubGroupID
		}
	}
	if deniedByUserOverride != nil {
		return resultFromCapabilityState(*deniedByUserOverride, deniedGroupID), hasGroupMembership, nil
	}
	return Result{}, hasGroupMembership, nil
}
```

**The exact scenario GAP-06 describes, confirmed reproducible from this code:** if Step 2
(`canForReleaseVersionGroupRole`) returns `Allowed: false, ReasonCode: ReasonCodeUserDeny`
(a stored `user_deny` beat a role grant via `ResolveGroupRights`), Step 3 still runs
unconditionally and can independently `return Allowed: true` if any `roleCodes` entry
satisfies `roleAllows(code, action)` — the `user_deny` from Step 2 is never consulted by
Step 3. The `groupRoleResult.ReasonCode == ReasonCodeUserDeny` check (lines 634-636) only
fires **after** Step 3 has already failed to grant.

**137-CONTEXT.md D01 wording relevant to this decision** (already-read in full above; not
reproduced fully here) — the precedence list states:

> 4. **User DENY override** — Effective result: `DENY`. Overrides normal group-scoped grant
> sources. Also overrides a specialized Review Delegation grant.

D01 explicitly calls out that user-deny overrides "role-based grant" (item 6) and
"specialized grant" (item 7, with Review Delegation as the named example), but the D01 list
and the rest of 137-CONTEXT.md **never mention "contribution role"** as a source category at
all — Contribution Roles are a `CanForReleaseVersion`-local Step-3 concept, not one of the
`GroupRightsResolution`'s batch-loaded source categories (membership, role grants, user
overrides, specialized grants). Section 2, rule 9 of CONTEXT.md only says "Review delegation
remains a specialized membership seam and is not migrated into generic user overrides" —
again no mention of contribution roles.

**Provenance of the current "override-blind by design" framing** — this is a Plan-137-05
authored, not a CONTEXT.md-authored, decision (`137-05-SUMMARY.md:111`):

> Applied identically to `CanForReleaseVersion`'s three-step flow (surfaced only after the
> independent contribution-role step also fails to grant, matching the plan's minimal-edit
> scope of leaving contribution roles as their own domain).

**Existing regression test that documents but does NOT exercise the actual conflict**
(`backend/internal/permissions/effective_rights_integration_test.go:203-225`) — note its own
doc comment already flags the fallback as unchanged/separate, but the fake resolver's
`contributionRoles` field is left empty (`nil`) in this test, so it never actually proves
what happens when Step 3 *would* grant:

```go
// TestIntegrationCanForReleaseVersionGroupRoleStepUserDenyOverridesRoleGrant
// proves CanForReleaseVersion's group-role step (step 2, the shared
// group-context path) becomes override-aware, even though its contribution-role
// fallback (step 3) remains its own, separate, unchanged domain per the
// plan's minimal-edit scope.
func TestIntegrationCanForReleaseVersionGroupRoleStepUserDenyOverridesRoleGrant(t *testing.T) {
	resolver := &integrationFakeResolver{
		fansubGroupID:    integrationTestGroupID,
		roles:            []string{RoleFansubLead},
		activeMembership: true,
		overrides: []UserCapabilityOverride{
			{ActionCode: ActionFansubGroupMediaUpload, Effect: "deny"},
		},
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "active"}

	result, err := service.CanForReleaseVersion(context.Background(), actor, ActionFansubGroupMediaUpload, 900)
	require.NoError(t, err)

	assert.False(t, result.Allowed, "CanForReleaseVersion's group-role step must honor a stored user_deny")
	assert.Equal(t, ReasonCodeUserDeny, result.ReasonCode)
}
```

**`integrationFakeResolver`'s `contributionRoles` field and its wiring** (needed to write
the actual GAP-06-proving regression test in either Fall A or Fall B —
`effective_rights_integration_test.go:22-64`):

```go
type integrationFakeResolver struct {
	fansubGroupID     int64
	roles             []string
	activeMembership  bool
	overrides         []UserCapabilityOverride
	reviewContext     *ReviewGrantContext
	ownerAppUserID    *int64
	contributionRoles []string
}
// ...
func (f *integrationFakeResolver) ListActorContributionRolesForVersion(context.Context, int64, int64) ([]string, error) {
	return f.contributionRoles, nil
}
```

**`roleAllows` helper** used by Step 3 (declared/used elsewhere in `permissions.go`; not the
subject of GAP-06 itself but needed context for how a contribution role code maps to
`action` — grep `func roleAllows` in `permissions.go`/`permissions_capability.go`-family
files if the plan needs to inspect it further).

**GAP-06 disposition guidance already embedded in 137-UAT.md (reproduced for planner
convenience, not altered here):**
- **Fall A** (context clearly requires user_deny to beat contribution roles too): change
  Step 3 to also check `groupRoleResult.ReasonCode == ReasonCodeUserDeny` (or equivalent)
  *before* evaluating `roleCodes`, add a regression test using `contributionRoles` populated
  in `integrationFakeResolver` proving `user_deny` now wins even when a contribution role
  would otherwise grant.
- **Fall B** (contribution roles are confirmed intentionally override-blind): make no
  runtime change; add the missing regression test that explicitly proves and documents
  today's actual behavior (contribution role still grants despite a group-level user_deny),
  referencing this design choice explicitly in a code comment near lines 609-612.
- **Fall C** (docs contradict / genuinely ambiguous, which is the most defensible reading of
  D01 given it never mentions contribution roles as a resolver source at all): make no
  runtime change, and the phase's final report must state `DECISION REQUIRED — Contribution
  Role vs User Deny` per 137-UAT.md's explicit instruction.

---

## Shared Patterns

### Best-effort audit-log write (applies to GAP-02)
**Source:** `backend/internal/handlers/permission_authz.go:68-108` (`auditPermissionDenied`)
and the `_ = h.auditLogRepo.Write(...)` convention used at ~30 call sites across the handlers
package (e.g. `admin_capability_handler.go:173`, `admin_users_mutations_handler.go:40`).
**Apply to:** any new/extended audit-write call sites added to `MutateOverride` /
`writeMutationError` for GAP-02. The existing convention is: ignore the write's own error
(`_ = ...`), never let an audit-log failure block or alter the primary response, and always
populate `ActorAppUserID`, `EventType`, `ScopeType`/`ScopeID`, `TargetType`/`TargetID`,
`Action`, `Outcome`.

### `errors.Is`-based typed sentinel error mapping (applies to GAP-01/GAP-02 handler changes)
**Source:** `admin_effective_rights_handler.go:340-372` (`writeMutationError`) and the
sentinel `var (...)` block it switches over in `effective_rights_service.go:80-87`.
**Apply to:** any additional error-path branching GAP-01/GAP-02 introduces — keep using
`errors.Is(err, services.ErrXxx)` against the existing sentinel errors rather than string
matching or new error types.

### OpenAPI response-block shape (applies to GAP-03)
**Source:** `shared/contracts/admin-capabilities.yaml:39-43` (`400` on
`GET .../capabilities`) and `:352-357` (`400` on `PUT .../capability-overrides`, same
resource family as the two endpoints GAP-03 touches).
**Apply to:** both new `400` blocks in both contract files; keep the `$ref:
"#/components/schemas/ErrorResponse"` schema reference and each file's existing
description-language convention (German in `admin-capabilities.yaml`, English in
`openapi.yaml`).

---

## No Analog Found

None — every gap's fix location is fully identified above with exact current code. This is
expected for a gap-closure run: the "analog" is the pre-existing gap-adjacent code in the
same file, not an unrelated file elsewhere in the codebase.

## Metadata

**Analog search scope:** `backend/internal/handlers/admin_effective_rights_handler.go`,
`backend/internal/handlers/permission_authz.go`, `backend/internal/handlers/app_auth.go`,
`backend/internal/services/effective_rights_service.go`,
`backend/internal/permissions/effective_rights.go`,
`backend/internal/permissions/permissions.go`,
`backend/internal/permissions/effective_rights_integration_test.go`,
`backend/internal/repository/authz_permissions.go`, `backend/internal/repository/audit_logs.go`,
`shared/contracts/admin-capabilities.yaml`, `shared/contracts/openapi.yaml`.
**Files scanned:** 11 read directly (plus grep sweeps across `backend/internal/handlers/*.go`
for the audit-write convention and `backend/internal/permissions/*_test.go` for existing
contribution-role test coverage).
**Pattern extraction date:** 2026-08-21
