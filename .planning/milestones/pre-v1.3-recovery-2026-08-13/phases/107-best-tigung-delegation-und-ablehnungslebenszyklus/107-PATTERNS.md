# Phase 107: Prüf- und Delegationsfundament - Pattern Map

**Mapped:** 2026-07-23
**Files classified:** 23 likely new or modified files
**Primary analog set:** 5 (`permissions`/`AuthzRepository`, Phase-106 PointService/repositories, Phase-106 migration/test support, anime proposal locking/conditional update, service-owned narrow interfaces)
**Scope:** Backend and PostgreSQL foundation only. No handler, server wiring, shared HTTP contract, frontend, release/media/anime adapter, queue, cleanup job, assignment, claim, or reservation.

## File Classification

| New/Modified File | Change | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|---|
| `database/migrations/0134_review_foundation.up.sql` | new; number must be rechecked immediately before creation | migration | batch / append-only journal | `0131_member_point_foundation.up.sql`, `0132_member_point_foundation_review_hardening.up.sql`, `0119_release_version_segments_manage_capability.up.sql` | composed exact patterns |
| `database/migrations/0134_review_foundation.down.sql` | new | migration | batch / fail-closed rollback | `0131_member_point_foundation.down.sql`, Phase-106 migration safety tests | role-match; Phase 107 needs stricter data preconditions |
| `backend/internal/migrations/phase107_review_foundation_test.go` | new | test | batch / disposable PostgreSQL | `phase106_member_points_test.go` | exact |
| `backend/internal/testsupport/phase106_postgres.go` | modify: extract the existing private safety machinery without weakening it | utility | database lifecycle | same file, lines 18-107 | exact source |
| `backend/internal/testsupport/phase106_postgres_test.go` | modify only if generic helper extraction changes private names | test | database lifecycle | same file, lines 10-63 | exact source |
| `backend/internal/testsupport/phase107_postgres.go` | new thin wrapper | utility | database lifecycle | `phase106_postgres.go` | exact wrapper pattern |
| `backend/internal/permissions/permissions.go` | modify | service / policy | request-response authorization | same file plus `authz_permissions.go` | exact |
| `backend/internal/permissions/permissions_test.go` | modify | test | request-response authorization | same file, lines 39-100 and 154-170 | exact |
| `backend/internal/permissions/capability_registry_test.go` | modify/add Phase-107 cases | test | batch / source-contract | same file plus `backend/internal/repository/capability_join_test.go` and `permissions_test.go` | role-match |
| `backend/internal/repository/authz.go` | modify from pool-only to tx-capable query interface and `WithDB` | repository | request-response / CRUD | `point_rules_repository.go`, `point_ledger_repository.go` | exact structural match |
| `backend/internal/repository/authz_permissions.go` | modify: direct typed grant lookup inside the permission engine | repository | request-response | `ListActorGroupRoles` and `LoadRoleCapabilities` in the same file | exact |
| `backend/internal/repository/authz_permissions_test.go` | modify/add dedicated Phase-107 DB-backed repository cases | test | PostgreSQL authorization / read boundary | same file plus `capability_join_test.go` | exact |
| `backend/internal/repository/review_delegation_repository.go` | new | repository | CRUD / event-driven audit | `authz_capability_mutations.go`; membership validation query in `member_claims_role_activation_repository.go` | composed role-match |
| `backend/internal/repository/review_delegation_repository_test.go` | new | test | CRUD / PostgreSQL locking | `point_ledger_repository_test.go`, `authz_permissions_test.go` | role-match |
| `backend/internal/repository/review_decision_repository.go` | new | repository | append-only event / request-response | `point_ledger_repository.go` plus proposal conditional update | composed exact patterns |
| `backend/internal/repository/review_decision_repository_test.go` | new | test | concurrent request-response | `point_ledger_repository_test.go` | exact concurrency pattern |
| `backend/internal/repository/review_audit_repository.go` | new | repository | append-only event / CRUD reason scrub | `audit_logs.go` for `DBTX`; point-ledger migration/repository for immutability | composed role-match |
| `backend/internal/repository/review_audit_repository_test.go` | new | test | append-only event / CRUD reason scrub | `phase106_member_points_test.go` | role-match |
| `backend/internal/repository/review_credit_repository.go` | new | repository | concurrent source-global idempotency | proposal advisory lock plus `point_ledger_repository.go` | composed role-match |
| `backend/internal/repository/review_credit_repository_test.go` | new | test | concurrent request-response | `point_ledger_repository_test.go`, lines 170-264 | exact test shape |
| `backend/internal/services/review_service.go` | new | service / provider / adapter registry | transactional request-response | `point_service.go`; narrow store interfaces in `release_version_media_cleanup.go` | composed exact patterns |
| `backend/internal/services/review_service_test.go` | new | test | request-response / transaction / adapter fake | `point_service_credit_test.go` | exact test mechanics |
| `backend/internal/services/review_service_boundary_test.go` | new | test | batch / source-boundary | `point_service_boundary_test.go` | exact |
| `backend/internal/repository/errors.go` | modify only for repository-owned stable sentinels | utility | error mapping | same file | exact |

`backend/internal/repository/audit_logs.go` is an analog, not an expected implementation target. Its `DBTX` interface is reusable as currently shaped for `Exec`/`QueryRow`. Do not extend that global interface with `Query` if doing so forces unrelated fake databases to change; define a focused tx-capable authz query interface in `authz.go` instead.

## Path Status Audit

Every path in all six plans was checked against the current worktree. Existing `read_first` analogs resolve on disk. The only absent paths are intentional outputs owned by an earlier/current plan (`phase107_*`, `review_*`, migration `0134_*`, and plan SUMMARYs), so their dependent plans reference them only after the corresponding `depends_on` edge.

Corrected real analogs:

- capability catalog tests: `backend/internal/permissions/capability_registry_test.go` and `backend/internal/repository/capability_join_test.go`;
- membership schema: `database/migrations/0073_fansub_group_app_memberships.up.sql`;
- verified claims schema: `database/migrations/0081_historical_members_identity.up.sql`;
- Membership→Member anchor: `database/migrations/0104_members_backfill_and_fansub_group_members_member_id.up.sql`;
- authz test analog: `backend/internal/repository/authz_permissions_test.go`.

## Pattern Assignments

### `database/migrations/0134_review_foundation.up.sql`

**Analogs:** `database/migrations/0131_member_point_foundation.up.sql`, `0132_member_point_foundation_review_hardening.up.sql`, `0119_release_version_segments_manage_capability.up.sql`

**Additive capability seed** (`0119...up.sql`, lines 4-15):

```sql
INSERT INTO action_definitions (code, label_de, category, sort_order) VALUES
    ('release_version.segments.manage', 'OP/ED-Segmente verwalten', 'release', 85)
ON CONFLICT (code) DO UPDATE SET
    label_de = EXCLUDED.label_de,
    category = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order;

INSERT INTO role_capabilities (role_code, action_code) VALUES
    ('fansub_lead', 'release_version.segments.manage')
ON CONFLICT DO NOTHING;
```

Copy the additive catalog shape for three distinct review actions, provisionally:

- `review.text.decide`
- `review.image.decide`
- `review.contribution.decide`

Seed them for `fansub_lead`; do not add `platform_admin` to `role_capabilities`, because it remains the permission engine's global bypass. Direct delegated actions belong to `fansub_group_member_review_capabilities(fansub_group_member_id, action_code)`, not a new role and not boolean columns.

**Append-only table and trigger pattern** (`0131...up.sql`, lines 24-55 and 110-158):

```sql
CREATE TABLE point_ledger_entries (
    id BIGSERIAL PRIMARY KEY,
    ...
    idempotency_key TEXT NOT NULL,
    UNIQUE (idempotency_key)
);

CREATE FUNCTION guard_point_ledger_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'point ledger is append-only';
    END IF;
    ...
    RAISE EXCEPTION 'point ledger is append-only';
END;
$$;

CREATE TRIGGER point_ledger_guard_mutation
BEFORE UPDATE OR DELETE ON point_ledger_entries
FOR EACH ROW EXECUTE FUNCTION guard_point_ledger_mutation();
```

Use the same database-enforced pattern for `review_decisions`, `review_audit_events`, **and `review_credit_slots`**, with an additional statement trigger that rejects `TRUNCATE` as in `0132...up.sql` lines 23-33. All three tables reject UPDATE, DELETE, and TRUNCATE in live PostgreSQL tests. The decision arbiter is a unique constraint on `(source_type, source_key, source_revision)`. A structured `rejection_category` is Unicode-nonblank exactly for Reject; Confirm has no rejection category. Structured snapshot columns must not use `ON DELETE CASCADE`; active delegation rows may cascade with their `fansub_group_members` owner.

`review_reason_texts` is deliberately different: typed `reason_kind IN ('reject','override')`, reject `UPDATE` and `TRUNCATE`, but allow `DELETE` so later privacy retention can scrub only one text purpose. The immutable parent audit row stores `has_reason`, never the reason body. Every Reject needs a structured category and nonblank Reject reason; a platform Self-Review override independently needs a nonblank Override reason.

`review_credit_slots` must have `UNIQUE (source_type, source_key, credit_slot)`, `credit_slot IN ('reject','confirm')`, reviewer member and `point_ledger_entry_id`. It is append-only after Insert and has no production Update/Delete API. This is the source-global guard that Phase-106's beneficiary-scoped idempotency key does not provide.

Reuse `phase106_trim_unicode_whitespace(TEXT)` from `0133_member_point_whitespace_hardening.up.sql` lines 3-12 and 68-88 for canonical-token and meaningful-reason checks. Do not create a second whitespace function.

The `review.decision` version-1 point rule seed must fail closed: if `(rule_code, rule_version)` already exists with a category/value other than `platform_contribution`/`1`, raise and abort. Do not silently `DO UPDATE` an immutable rule.

### `database/migrations/0134_review_foundation.down.sql`

**Analog:** `0131_member_point_foundation.down.sql`, lines 1-14, for reverse dependency order only.

Phase 107 needs a stronger contract than the old unconditional drop:

1. In one transaction, fail before any drop if a decision, audit event, reason, direct grant, credit slot, or `point_ledger_entries` row referencing the seeded review rule exists.
2. Only the empty-foundation path may drop every mutation trigger/function, including the `review_credit_slots` UPDATE/DELETE/TRUNCATE guard, before dropping child tables and then parents.
3. Delete exactly the three Phase-107 actions and their role capabilities.
4. Delete only the exact `review.decision` version-1 seed, temporarily disabling `point_rules_immutable` inside the same transaction and restoring it before commit.
5. Never use `DROP ... CASCADE` to erase history.

### `backend/internal/migrations/phase107_review_foundation_test.go`

**Analog:** `phase106_member_points_test.go`, lines 18-120, 256-277, and 409-460.

Copy these test layers:

```go
func TestPhase106MigrationLiveUpDownUp(t *testing.T) {
    pool := testsupport.OpenPhase106Postgres(t)
    testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase106UpFile))
    testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase106DownFile))
    testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase106UpFile))
}
```

Also copy the normalized source-contract helpers (`readPhase106Migration`, `normalizePhase106SQL`, `requireSQLContains`, `requireOrder`, lines 434-468) and the real mutation rejection style (`assertExecRejected`, used at lines 256-277).

Phase-107 assertions must prove:

- all five tables and three typed actions exist;
- no table/column contains assignment/reservation/claim vocabulary;
- decision unique and credit-slot unique constraints are independent;
- decision/audit/credit-slot reject `UPDATE`, `DELETE`, and `TRUNCATE`;
- reason rejects `UPDATE`/`TRUNCATE` but permits `DELETE`;
- Reject requires structured category plus nonblank Reject reason; platform Self-Review override requires its own nonblank reason;
- reads create zero audit rows;
- populated Down fails without partial schema/seed damage;
- empty Up → Down → Up works;
- the ledger table referenced is exactly `point_ledger_entries`.

### `backend/internal/testsupport/phase106_postgres.go`, `phase106_postgres_test.go`, and new `phase107_postgres.go`

**Analog:** `phase106_postgres.go`, lines 18-107 and 110-173.

Preserve the full safety chain:

```go
const phase106DSNEnv = "TEAM4S_PHASE106_TEST_DSN"

func OpenPhase106Postgres(t *testing.T) *pgxpool.Pool {
    dsn := os.Getenv(phase106DSNEnv)
    if strings.TrimSpace(dsn) == "" {
        t.Skipf("%s is not set; skipping PostgreSQL integration test", phase106DSNEnv)
    }
    ...
    if runtimeDatabase != databaseName { ... }
    schema := newPhase106SchemaName(t)
    ...
    scopedConfig.AfterConnect = func(ctx context.Context, conn *pgx.Conn) error {
        _, err := conn.Exec(ctx, "SET search_path TO "+pgx.Identifier{schema}.Sanitize())
        return err
    }
    ...
    t.Cleanup(cleanup)
    ...
    if len(schemas) != 1 || schemas[0] != schema || containsString(schemas, "public") { ... }
}
```

Extract a private parameterized helper for dedicated env name, allowed database regexp, schema prefix/regexp, and prerequisite callback. Keep `OpenPhase106Postgres` behavior and tests unchanged. `OpenPhase107Postgres` must be a thin wrapper with a dedicated opt-in env and Phase-107-safe database/schema names. Never consult `DATABASE_URL`; `phase106_postgres_test.go` lines 10-19 is the explicit regression pattern.

Do not copy the guard into a second implementation.

### `backend/internal/permissions/permissions.go`

**Analogs:** same file, lines 18-47, 81-107, 187-216, 236-247, 305-333, 520-589.

Add three typed `Action` constants, add them to `RoleFansubLead` in the fallback matrix, and add them to `allKnownActions`. The existing startup consistency check is the required fail-closed catalog seam:

```go
for _, a := range allKnownActions {
    if !seenActions[a] && !slices.Contains(standaloneActions, a) {
        return fmt.Errorf("permission cache: Action %q fehlt ...", a)
    }
}
```

Keep the existing actor/base checks and global platform bypass (`permissions.go`, lines 520-546). Extend resolution so direct review grants are another action source inside `permissions.Service`, after active actor/group context resolution and before final insufficient-role denial. Do not add handler-side `if canReview`.

The direct-grant lookup must be tx-bound when called by `ReviewService`; this is why `AuthzRepository.WithDB(tx)` is required.

### `backend/internal/permissions/permissions_test.go`, `backend/internal/permissions/capability_registry_test.go`, and `backend/internal/repository/capability_join_test.go`

**Analogs:** `permissions_test.go`, lines 39-100 and 154-170; `capability_join_test.go`, lines 20-75.

Use existing resolver stubs unchanged and table-driven cases to prove:

- fansub lead receives all three review actions;
- a direct text grant does not imply image/contribution review;
- active same-group direct grant allows the exact action;
- disabled user or inactive membership denies;
- no membership and cross-group grant deny;
- platform admin bypass allows all three without needing a member identity;
- direct grantee cannot grant/revoke because delegation mutation still requires `fansub_group.members.manage` or platform admin;
- `LoadCache` sees every new action and `platform_admin` still has no role-capability row.
- the established `permissions.Resolver` interface is unchanged, so current handler/test stubs compile without a Phase-107 method.

Do not make source-inspection alone the authorization proof; keep it only for catalog/boundary checks. Behavioral permission tests should call `permissions.Service`.

### `backend/internal/repository/authz.go` and `authz_permissions.go`

**Current limitation:** `authz.go`, lines 11-17, stores `*pgxpool.Pool`.

**Target analog:** Phase-106 repository binding (`point_rules_repository.go`, lines 23-29):

```go
type PointRulesRepository struct{ db DBTX }

func NewPointRulesRepository(db DBTX) *PointRulesRepository {
    return &PointRulesRepository{db: db}
}

func (r *PointRulesRepository) WithDB(db DBTX) *PointRulesRepository {
    return NewPointRulesRepository(db)
}
```

Introduce a focused `AuthzDBTX` that covers the actual `Exec`, `Query`, and `QueryRow` calls, accept it in `NewAuthzRepository`, and add `WithDB`. Both `*pgxpool.Pool` and `pgx.Tx` satisfy it. Do not widen the shared PointService `repository.DBTX` just to accommodate authz list queries. Do not add a method to the established `permissions.Resolver`; define a separate `permissions.ReviewContextResolver`, `ReviewAuthorizationResult{Result, MembershipID, MemberID}`, and `CanReviewForFansubGroup`. `CanForFansubGroup` delegates only the three Review-Actions to the focused method and returns the embedded base Result, keeping existing callers source-compatible.

The active membership resolution analog is `authz_permissions.go`, lines 161-191:

```sql
SELECT fgr.role
FROM fansub_group_members fgm
JOIN fansub_group_member_roles fgr ON fgr.fansub_group_member_id = fgm.id
WHERE fgm.app_user_id = $1
  AND fgm.fansub_group_id = $2
  AND fgm.status = 'active'
```

Review context lookup via `ResolveActorReviewGrantContext` must require `app_users.status='active'`, a positive `fgm.member_id`, and a verified `member_claims` row matching both `fgm.app_user_id` and `fgm.member_id`. It returns the Membership Member even without a Direct-Grant so a Fansub-Lead and a delegate share the same permission/credit attribution path. Separately, `ResolveVerifiedActorMemberIDs` reads all positive verified Member IDs for an App-User directly from `member_claims`, with no `fansub_group_members` join; ReviewService calls it for every actor including platform admins before Self-Review evaluation. A close partial identity analog is `member_claims_role_activation_repository.go`, lines 60-71. Do not use its fail-open/logging behavior; review authorization and identity resolution fail closed.

### `backend/internal/repository/authz_permissions_test.go`

Plan 107-03 owns this existing file. Add dedicated DB-backed top-level cases named `TestPhase107AuthzRepositoryReviewCapabilityResolutionFromDatabase`, `TestPhase107AuthzRepositoryVerifiedActorMemberIdentityWithoutMembership`, `TestPhase107AuthzRepositoryVerifiedActorMemberIdentityForPlatformAdmin`, `TestPhase107AuthzRepositoryDirectGrantScope`, and `TestPhase107AuthzRepositoryPermissionReadsCreateNoAudit`. Do not reuse the permission-unit `DirectGrant` names from the other task. Test discovery must enumerate these exact names before execution so an absent case fails the gate.

### `backend/internal/repository/review_delegation_repository.go`

**Analogs:** `authz_capability_mutations.go`, lines 165-203; membership locks in existing member repositories.

Copy the idempotent repository mutation shape:

```go
INSERT INTO role_capabilities (role_code, action_code)
VALUES ($1, $2)
ON CONFLICT DO NOTHING
```

but target `(fansub_group_member_id, action_code)`. Grant and revoke must first lock the exact `fansub_group_members` row `FOR UPDATE` and return its group/app-user/member/status snapshot. The service uses that snapshot to enforce same-group delegation, active app user, active membership, verified matching claim, valid typed review action, and non-delegation by delegated reviewers.

Grant/revoke repository methods take a caller-owned `repository.DBTX`; they do not begin or commit. Both return `changed` from `RowsAffected`. Audit is mandatory in the service's same transaction only when `changed=true`; repeated Grant and Revoke-missing are idempotent No-ops and must not create audit events.

### `backend/internal/repository/review_decision_repository.go`

**Analog:** `point_ledger_repository.go`, lines 82-113.

Copy `INSERT ... ON CONFLICT DO NOTHING RETURNING`, require a structured Unicode-nonblank `rejection_category` exactly for Reject, and map every empty return to a single stable `ErrReviewAlreadyDecided`:

```sql
INSERT INTO review_decisions (...)
VALUES (...)
ON CONFLICT (source_type, source_key, source_revision) DO NOTHING
RETURNING ...;
```

Unlike `PointLedgerRepository.InsertAward`, do not load and return an existing same-actor decision as a successful retry. Product semantics are first-decision-wins: every loser, including the same reviewer, receives the stable conflict and executes no adapter mutation, audit commit, reason commit, or point call.

The domain adapter's conditional mutation should copy only the atomic predicate from `anime_contributions_proposal_repository.go`, lines 207-245:

```sql
UPDATE ...
SET ...
WHERE id = $1 AND status = 'proposed'
```

`RowsAffected()==0` must become `ErrReviewTargetNotPending`/conflict, not the legacy path's `ErrNotFound`. Do not wire or modify `anime_contributions` in this phase.

### `backend/internal/repository/review_audit_repository.go`

**Analogs:** `audit_logs.go`, lines 26-37 and 39-80; Phase-106 append-only schema.

Reuse the caller-supplied `DBTX` constructor shape, but do not copy generic JSON payloads or the nil-repository success behavior:

```go
type AuditLogRepository struct { db DBTX }

func NewAuditLogRepository(db DBTX) *AuditLogRepository {
    return &AuditLogRepository{db: db}
}
```

The new repository writes typed structured columns to `review_audit_events`; free text is accepted only by a separate reason method with typed `reject|override` purpose that inserts into `review_reason_texts`. A missing repository/DB is validation failure, not silent success. Event codes should be typed constants. Phase 107 writes foundation events only:

- `delegation.granted`
- `delegation.revoked`
- `review.confirmed`
- `review.rejected`
- `review.override`
- `review_credit.awarded`
- `review_credit.reversed`

Reserve later source lifecycle codes if the migration catalog requires them, but do not emit them in Phase 107.

### `backend/internal/repository/review_credit_repository.go`

**Analogs:** advisory lock in `anime_contributions_proposal_merge_repository.go`, lines 19-40; PointService idempotency in `point_service.go`, lines 90-108.

Copy the lock distribution pattern:

```go
SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))
```

The lock token is derived internally from canonical `source_type`, stable `source_key`, and credit slot. Under the same transaction:

1. acquire the source+slot advisory lock;
2. recheck `review_credit_slots`;
3. if absent, let the service call `PointService.CreditInTx`;
4. insert the slot linked to the returned `point_ledger_entries.id`;
5. retain the unique constraint as the final database arbiter.

Hash collisions may serialize extra work but cannot define identity; full text columns plus the unique constraint do.

The repository exposes no Update/Delete method for credit slots. The migration guard independently rejects direct SQL UPDATE, DELETE, and TRUNCATE; its Down migration removes that guard before dropping the empty table.

The Phase-106 key is explicitly insufficient by itself:

```go
return "v1|" + string(cmd.Source.RewardKind) + "|" + cmd.Source.Type + "|" +
    cmd.Source.Key + "|beneficiary:" + strconv.FormatInt(cmd.MemberID, 10) +
    "|slot:" + cmd.Source.Slot
```

Different reviewer members produce different PointService keys, so the source-global slot must be won before calling PointService.

### `backend/internal/services/review_service.go`

**Analogs:** transaction ownership and `CreditInTx` in `point_service.go`, lines 43-87; narrow service interface in `release_version_media_cleanup.go`, lines 24-55.

Use a small starter interface and own exactly one transaction per mutation:

```go
type PointTxStarter interface {
    Begin(context.Context) (pgx.Tx, error)
}

tx, err := s.starter.Begin(ctx)
...
entry, err := s.CreditInTx(ctx, tx, cmd)
if err != nil {
    _ = tx.Rollback(ctx)
    return nil, err
}
if err = tx.Commit(ctx); err != nil {
    _ = tx.Rollback(ctx)
    return nil, fmt.Errorf("... commit: %w", err)
}
```

Define narrow adapter types in this file:

```go
type ReviewTargetRef struct {
    SourceType string
    StableKey  string
}

type ReviewTargetAdapter interface {
    LoadForDecision(context.Context, repository.DBTX, ReviewTargetRef) (ReviewTarget, error)
    ApplyDecision(context.Context, repository.DBTX, ReviewTarget, ReviewDecision) error
}
```

Register adapters by a constructor-owned `map[string]ReviewTargetAdapter`; reject unknown source types. The caller supplies only an opaque target ref and decision intent. Adapter/auth/service resolve group, revision, submitter app user, beneficiary member, reviewer member, timestamps, rule, point value, and idempotency components server-side. `SubmitterAppUserID` and `BeneficiaryMemberID` are mandatory positive adapter-owned attribution for every decision. Missing, zero, negative, synthetic, or invalid attribution fails with `ErrReviewTargetAttributionInvalid` before Decision, adapter mutation, audit/reason, slot, or PointService. The platform-admin bypass never converts absent target attribution into an override.

Decision order inside one transaction:

1. select registered adapter and load target;
2. validate positive trusted SubmitterAppUserID and BeneficiaryMemberID attribution fail-closed;
3. bind `AuthzRepository.WithDB(tx)` and resolve all verified actor Member IDs directly from `member_claims`, without a Membership join, for every actor including platform admins;
4. evaluate the exact typed capability via `CanReviewForFansubGroup`; every non-platform review action uses the separate `ReviewContextResolver` once for Membership/Member/direct actions and returns the Credit Member in `ReviewAuthorizationResult`, while the established `permissions.Resolver` remains unchanged;
5. compare actor App-User against submitter and every verified actor Member against beneficiary;
6. validate every Reject's structured category plus Unicode-nonblank Reject reason, and independently validate platform Self-Override flag plus Unicode-nonblank Override reason;
7. insert immutable decision arbiter including structured rejection category;
8. apply exactly-one conditional domain mutation;
9. insert mandatory structured audit and separate reason rows by `reject|override` purpose;
10. for a normal non-platform reviewer with the server-resolved Membership Member, win the source-global credit slot and call `PointService.CreditInTx`;
11. commit.

Platform-admin branches always skip review-credit slot creation and the reviewer PointService call, even when that admin happens to have a member claim. This skip does not prohibit a future trusted adapter from crediting the submitter's domain work in the same transaction.

Call `PointService.CreditInTx` with internally fixed `RuleRef{Code:"review.decision", Version:1}`, `RewardKindReview`, source type `review_decision`, stable source key, and slot `reject` or `confirm`. The service API must not accept a raw idempotency key, rule ref, point value, group ID, reviewer member ID, or submitter identity.

Stable sentinels should support `errors.Is`:

- `ErrReviewAlreadyDecided`
- `ErrReviewSelfReviewForbidden`
- `ErrReviewOverrideReasonRequired`
- `ErrReviewTargetAttributionInvalid`
- `ErrReviewCapabilityDenied`
- `ErrReviewTargetNotFound`
- `ErrReviewTargetNotPending`

Repository-wide generic sentinels belong in `repository/errors.go` only when repository methods own them. Review orchestration errors should remain in `services` so Phase 107.1 can map them once without handler copies.

### `backend/internal/services/review_service_test.go`

**Analog:** `point_service_credit_test.go`, lines 17-59, 101-195, and 197-245.

Copy the fake DB/tx/starter mechanics and explicit commit/rollback counters. Add fake registered adapters and a fake point-credit seam with call count and captured command. Test:

- exact typed permission and group binding;
- regular self-review denied by matching app user or any membership-independent verified member;
- platform admin without Member may decide, but a verified Member match still requires explicit override plus Unicode-nonblank reason;
- Reject always requires structured category plus Unicode-nonblank Reject reason; Confirm rejects those fields;
- platform review/override remains point-free even with a member;
- adapter/audit/PointService failure rolls back all writes;
- unknown/unregistered adapter fails before mutation;
- caller cannot influence group/member/rule/value/key;
- reject and confirm use the same fixed rule/value;
- later domain work credit is not globally suppressed merely because actor is platform admin.

For PointService integration, copy the real caller-transaction proof at `point_service_credit_test.go` lines 197-245: write a marker and award in one tx, prove rollback removes both, then prove commit preserves both.

### Repository and service concurrency tests

**Analog:** `point_ledger_repository_test.go`, lines 170-200 and 202-264.

Use the existing barrier shape:

```go
start := make(chan struct{})
var ready sync.WaitGroup
ready.Add(2)
for range 2 {
    go func() {
        ready.Done()
        <-start
        // perform operation
    }()
}
ready.Wait()
close(start)
```

Required real PostgreSQL scenarios:

- confirm vs reject of the same source+revision: exactly one commit and one stable conflict;
- loser leaves no committed decision side effects, reason, audit, slot, or ledger award;
- repeated rejects across revisions and different reviewers: one reject slot/award total;
- reject → resubmit revision → confirm: one reject and one confirm slot/award;
- two different stable keys in the same release-like context remain independent;
- grant/revoke and a direct-grant decision lock the same membership row and obey transaction order;
- repeated grant and revoke-missing leave the delegation audit count unchanged;
- PointService/audit/adapter failure after tentative decision insert rolls everything back.

Do not accept skips for the phase concurrency gate once the dedicated PostgreSQL test target is provisioned.

### `backend/internal/services/review_service_boundary_test.go`

**Exact analog:** `backend/internal/services/point_service_boundary_test.go`, lines 10-23.

Scan only Phase-107 production artifacts and reject:

- `net/http`, `internal/handlers`, `backend/cmd/server`;
- `frontend`, `shared/contracts`;
- release/media/anime repositories or concrete source adapter names;
- `review_assignments`, `assigned_to`, `claimed_by`, `reserved_until`;
- queue/list-open ownership or cleanup/retention implementation;
- badge/profile/ranking wiring;
- direct `INSERT INTO point_ledger_entries`;
- obsolete names such as `point_ledger`, `points_ledger`, or `member_points`;
- caller idempotency-key fields/parameters.

The positive ledger reference is `point_ledger_entries`, and production review credits reach it only through `PointService.CreditInTx`.

## Shared Patterns

### Transaction ownership

`ReviewService` owns the transaction. Authz, delegation, decision, adapter mutation, audit, reason, source-global slot, and PointService all receive that exact `pgx.Tx`. No repository in the mutation path begins or commits independently.

### Authorization

`permissions.Service` remains the only authority. Group role actions and direct member review grants are combined there. Platform admin is the existing global bypass; delegated action possession is never permission to delegate.

### Identity and self-review

Compare both identity sources:

```text
actor.AppUserID == target.SubmitterAppUserID
OR
ANY(ResolveVerifiedActorMemberIDs(actor.AppUserID)) == target.BeneficiaryMemberID
```

The verified-claim lookup is tx-bound and membership-independent for every actor. Every normal review, whether Fansub-Lead or direct delegate, additionally needs complete active Membership attribution for permission and credit. Every target must provide positive trusted submitter App-User and beneficiary Member attribution so both self-review comparisons are enforceable. Platform admin may lack an actor Member only when that complete target attribution exists and the verified lookup proves no match; missing target attribution rejects and is never silently overridden. Any verified Member match still requires explicit override and a separate nonblank reason.

### Error handling

Wrap errors with operation context and `%w`, following `repository/errors.go` and PointService. Tests use `errors.Is`; later HTTP mapping is out of scope.

### Immutable structured history, removable free text

Decision and audit parents are database-immutable. Reject category is structured; Reject and Override reason bodies exist only in separate removable children keyed by purpose. Never copy reason text into structured JSON, logs, ledger reversal reason, or a decision row.

### Source-global credit cap

The source+slot lock and `review_credit_slots` unique constraint decide whether a reviewer award may be attempted. The committed slot is DB-append-only (UPDATE/DELETE/TRUNCATE rejected). `PointService.CreditInTx` remains the only award writer and supplies the rule snapshot and beneficiary-scoped idempotency key.

## Forbidden Non-Patterns

| Forbidden | Why | Use instead |
|---|---|---|
| `review_assignments`, reservation, claim, takeover, `assigned_to`, `claimed_by`, `reserved_until` | Contradicts open work and first-decision-wins | immutable decision unique plus stable loser conflict |
| Handler, route, server, OpenAPI, frontend, review queue, or UI work | Phase 107 has no concrete consumer | Phase 107.1 |
| Release-note, release-media, anime-contribution, upload, cleanup, or publication adapter wiring | Crosses the foundation boundary and risks wrong ownership | fake adapter contract only |
| One generic `review.decide` action | Loses text/image/contribution separation | three typed actions |
| Media-style boolean permission table or handler-side special check | Bypasses the canonical permission engine | action-code grants inside `permissions.Service` |
| Delegated reviewer granting/revoking review rights | Violates non-transitive delegation | `members.manage` or platform admin required |
| Current `ContributionReviewHandler` as implementation base | Wrong capability, no self-review guard, best-effort audit, premature anime binding | only copy conditional-update mechanics |
| `_ = audit.Write(...)`, audit after commit, or nullable audit dependency | Allows mutation without audit | mandatory same-tx typed audit |
| Reason text in decision/audit JSON or logs | Prevents targeted privacy scrub | `review_reason_texts` child |
| Direct ledger inserts or a review-specific ledger | Duplicates Phase 106 and loses rule snapshots/idempotency | `PointService.CreditInTx` and `point_ledger_entries` |
| PointService key as the only global credit guard | Key includes reviewer member | source-global `review_credit_slots` first |
| Caller-supplied rule, point value, group/member identity, or idempotency key | Enables scope/reward spoofing | server-resolved adapter/auth context and fixed rule |
| Returning an existing same-reviewer decision as success | Re-executes product semantics after first completion | `ErrReviewAlreadyDecided` for every loser |
| In-memory mutex or SELECT-before-INSERT | Not safe across processes | PostgreSQL advisory lock plus unique constraints |
| Generic content/status table | Swallows domain ownership | registered narrow adapters |
| `point_ledger`, `points_ledger`, `member_points` | Obsolete/nonexistent naming | `point_ledger_entries` |
| Editing historical migrations 0131-0133 | Violates migration rules | additive next migration after chain recheck |

## No Exact Analog Found

| File/Concern | Reason | Compose From |
|---|---|---|
| `review_service.go` registered `ReviewTargetAdapter` map | No current domain-neutral transactional adapter registry | narrow service interface + PointService tx ownership |
| `review_reason_texts` scrub boundary | Generic `audit_logs` stores JSON and is not immutable | Phase-106 immutable triggers + dedicated child delete policy |
| source-global review credit slots | Phase-106 idempotency is beneficiary-scoped | proposal advisory lock + unique slot + PointService |
| first-decision-wins immutable review journal | Existing anime update is domain-specific and maps zero rows incorrectly | point-ledger conflict insert + conditional update |

## Planner Read-First Set

Every Phase-107 implementation plan should include the relevant subset of:

- `AGENTS.md`
- `107-CONTEXT.md`
- `107-RESEARCH.md`
- `docs/engineering/implementation-contract.md`
- `backend/internal/permissions/permissions.go`
- `backend/internal/repository/authz.go`
- `backend/internal/repository/authz_permissions.go`
- `backend/internal/permissions/capability_registry_test.go`
- `backend/internal/repository/capability_join_test.go`
- `backend/internal/services/point_service.go`
- `backend/internal/repository/point_ledger_repository.go`
- `backend/internal/testsupport/phase106_postgres.go`
- `backend/internal/migrations/phase106_member_points_test.go`
- `database/migrations/0131_member_point_foundation.up.sql`
- `database/migrations/0132_member_point_foundation_review_hardening.up.sql`
- `database/migrations/0073_fansub_group_app_memberships.up.sql`
- `database/migrations/0081_historical_members_identity.up.sql`
- `database/migrations/0104_members_backfill_and_fansub_group_members_member_id.up.sql`
- `backend/internal/repository/anime_contributions_proposal_merge_repository.go` only for advisory-lock mechanics
- `backend/internal/repository/anime_contributions_proposal_repository.go` only for conditional-update mechanics

## Metadata

**Search scope:** `database/migrations`, `backend/internal/migrations`, `backend/internal/testsupport`, `backend/internal/permissions`, `backend/internal/repository`, `backend/internal/services`
**Migration audit:** highest tracked migration is `0133_member_point_whitespace_hardening`; no modified or untracked migration was reported at mapping time. `0134` remains provisional until rechecked immediately before implementation.
**Pattern extraction date:** 2026-07-23
**Boundary conclusion:** Phase 107 can be implemented entirely within migrations, test support, permissions, repositories, and services.
