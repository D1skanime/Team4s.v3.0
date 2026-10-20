---
phase: 188-ux-abgleich-rest-korrektheits-und-robustheitsfixes-vor-neuen
reviewed: 2026-10-20T08:33:35Z
depth: standard
files_reviewed: 35
files_reviewed_list:
  - backend/internal/repository/member_profile_contribution_badges_repository.go
  - backend/internal/repository/member_profile_contribution_badges_repository_test.go
  - backend/internal/testsupport/phase188_postgres.go
  - backend/internal/repository/app_auth_repository_postgres_test.go
  - backend/internal/repository/app_auth_repository_resubject.go
  - backend/internal/models/app_auth.go
  - backend/internal/middleware/current_user_auth.go
  - backend/internal/repository/app_auth_repository.go
  - backend/cmd/report-orphaned-app-users/report.go
  - backend/cmd/report-orphaned-app-users/report_test.go
  - backend/cmd/report-orphaned-app-users/main.go
  - frontend/src/lib/images/publicImagePatterns.test.ts
  - frontend/src/lib/images/publicImagePatterns.d.mts
  - frontend/src/lib/images/publicImagePatterns.mjs
  - backend/internal/permissions/permissions_types.go
  - backend/internal/permissions/permissions_cache.go
  - backend/internal/permissions/permissions_release.go
  - backend/internal/permissions/permissions_anime_project.go
  - backend/internal/permissions/permissions_anime_project_test.go
  - backend/internal/repository/authz_resolve.go
  - backend/internal/repository/authz_roles.go
  - backend/internal/repository/authz_anime_project.go
  - backend/internal/repository/authz_anime_project_postgres_test.go
  - backend/internal/testsupport/phase188_permissions_postgres.go
  - database/migrations/0185_anime_project_timeline_fansub_lead.up.sql
  - database/migrations/0185_anime_project_timeline_fansub_lead.down.sql
  - backend/internal/migrations/phase188_project_timeline_fansub_lead_test.go
  - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectReleaseCard.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectTimelineSection.test.tsx
  - backend/internal/permissions/permissions.go
  - backend/internal/repository/authz_permissions.go
  - backend/internal/repository/authz_permissions_test.go
  - backend/internal/handlers/admin_content_anime_project_timeline.go
  - backend/internal/handlers/admin_content_anime_project_timeline_test.go
  - backend/internal/handlers/app_auth_capabilities.go
  - backend/internal/handlers/app_auth_test.go
  - shared/contracts/openapi.yaml
  - frontend/src/app/admin/fansubs/[id]/edit/AnimeReleasesCockpit.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectTimelineSection.tsx
  - frontend/src/lib/api/admin/fansub-members.ts
  - frontend/src/app/admin/roles/RoleCapabilityDetail.membershipBaselineDrift.test.ts
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 188: Code Review Report

**Reviewed:** 2026-10-20T08:33:35Z
**Depth:** standard
**Files Reviewed:** 35 (plus cross-referenced non-listed call targets: `permissions.go`-split siblings, `effective_rights.go`, `admin_content_anime_project_notes.go`, migration 0157)
**Status:** issues_found

## Summary

Phase 188 bundles five independent, additive fix plans: (1) the "vollständig mitgetragen"
badge-denominator fix (#18/D-04..D-06), (2) the gated e-mail re-subjecting security fix for
orphaned `app_users` rows (#27/D-07), (3) a read-only hygiene report CLI (#27/D-08), (4) a
fail-fast fix for malformed `NEXT_PUBLIC_API_URL` (#35.1/D-09), and (5) the anime-project
timeline permission bugfix (`CanForAnimeProject`, D-10..D-14).

All four security-sensitive focus areas named in the review brief were traced end-to-end and
hold up under adversarial reading:

- **D-07 (Re-Subjecting gate):** `shouldResubjectByEmail(emailVerified, emailMatchFound)` is a
  pure AND-gate; `EnsureAppUserForIdentity` only enters the e-mail-match branch at all when
  `identity.EmailVerified == true`, and the subject-match path (today's primary identity key)
  is checked first and unconditionally wins. No code path reuses an existing `app_users` row by
  e-mail when the token's e-mail is unverified. Both the positive and negative cases are proven
  against a real Postgres transaction with the production `UNIQUE(keycloak_subject)`/status
  CHECK constraints (not a mock). No bypass found.
- **D-12/D-13 (`CanForAnimeProject`):** the new project-role fallback is scoped by
  `anime_id = $1 AND fansub_group_id = $2 AND status = 'confirmed' AND fgm.app_user_id = $3 AND
  fgm.status = 'active'` — no NULL-status bypass, no cross-anime or cross-group leak (both
  explicitly covered by dedicated negative tests). `roleAllows()` resolves purely through the
  DB-loaded `role_capabilities` cache; `grep` confirms no hardcoded role-name comparisons in the
  touched handler/service/frontend production code (migrations, tests, and the pre-existing
  capability-matrix catalog are the documented exceptions).
- **D-08 (hygiene script):** `report.go`/`main.go` contain only `SELECT` statements; this is
  structurally proven by `TestReportPackageNeverMutatesData`, which is an allowed
  absence-check under the project's teststil rules.
- **D-09 (fail-fast):** `new URL()` is now wrapped in try/catch and re-throws a German,
  variable-naming error; the empty/whitespace short-circuit is unchanged, preserving
  byte-identical success-path behavior.

No Critical/BLOCKER findings. Two Warnings and two Info items below are quality/maintainability
defects, none of which weaken the security guarantees above.

## Warnings

### WR-01: Stale doc comment left behind by the D-14 file split misattributes `ListActorContributionRolesForVersion`'s documentation to `LoadRoleCapabilities`

**File:** `backend/internal/repository/authz_permissions.go:209-219`
**Issue:** Commit `62fe21202` (Task 1, D-14 "reiner Umbau") split `authz_permissions.go` into
`authz_resolve.go` / `authz_roles.go` / `authz_permissions.go`. The function
`ListActorContributionRolesForVersion` itself correctly moved to `authz_roles.go`, but its
13-line doc comment (`// ListActorContributionRolesForVersion gibt die role_codes zurück...
Auflösungsreihenfolge (D-02): ... Gibt leere Liste zurück wenn keine Contribution existiert
(→ D-04: kein Recht).`) was left behind in `authz_permissions.go`, directly above the unrelated
`LoadRoleCapabilities` function, which it does not describe at all. `LoadRoleCapabilities` now
has essentially two overlapping, contradictory doc comments (the orphaned
`ListActorContributionRolesForVersion` block, immediately followed by its own one-line
"LoadRoleCapabilities lädt..." comment). This is confusing for any future reader trying to
understand either function from its file and actively misleading about what
`LoadRoleCapabilities` does. Meanwhile `ListActorContributionRolesForVersion` in
`authz_roles.go` now has no doc comment of its own at all (compare
`backend/internal/repository/authz_roles.go:113`, which starts the function immediately after
an unrelated compile-time assertion comment for `LoadFansubGroupRoles`/`LoadCapabilityRoles`).
**Fix:**
```go
// authz_permissions.go: delete the orphaned comment block, keep only the LoadRoleCapabilities doc.

// LoadRoleCapabilities lädt die vollständige Rolle→Action-Matrix aus role_capabilities.
// Implementiert das permissions.CacheLoader-Interface für den Startup-Load (D-04, D-06).
func (r *AuthzRepository) LoadRoleCapabilities(ctx context.Context) (map[string][]permissions.Action, error) {
    ...
}

// authz_roles.go: move the original ListActorContributionRolesForVersion doc comment here, above the function.

// ListActorContributionRolesForVersion gibt die role_codes zurück, die dem Actor
// für eine Release-Version zustehen.
// Auflösungsreihenfolge (D-02):
//  1. versions-spezifische anime_contributions (release_version_id = versionID)
//  2. Fallback: anime-weite Contributions (release_version_id IS NULL, anime_id aus Episode ermittelt)
// Gibt leere Liste zurück wenn keine Contribution existiert (→ D-04: kein Recht).
func (r *AuthzRepository) ListActorContributionRolesForVersion(ctx context.Context, appUserID int64, releaseVersionID int64) ([]string, error) {
    ...
}
```

### WR-02: `report-orphaned-app-users` ships a hardcoded Keycloak DB password as a connection-string default

**File:** `backend/cmd/report-orphaned-app-users/main.go:26`
**Issue:** `getEnv("KEYCLOAK_DATABASE_URL", "postgres://keycloak:keycloak_dev_password@keycloak-db:5432/keycloak?sslmode=disable")`
embeds a cleartext password directly in Go source. This matches the existing repo convention
(`docker-compose.yml:33,56` default to the identical `keycloak_dev_password` string, and
`migrate-preview-backfill`/`migrate-display-backfill` already default `DATABASE_URL` to
`postgres:postgres` the same way), so this is not a regression unique to this phase, and the
value is a documented local-dev default that is fully overridable via `KEYCLOAK_DATABASE_URL`.
It is flagged here because this is a brand-new file introduced by this phase and the pattern
is nonetheless a credential-matching-password-literal that a secret scanner will flag on every
future scan of this file; worth a tracked follow-up to source dev defaults from the compose
environment rather than duplicating the literal into a fourth Go file.
**Fix:** Either drop the default entirely and require `KEYCLOAK_DATABASE_URL` to be set (fail
fast, consistent with D-09's fail-fast philosophy elsewhere in this same phase), or factor the
shared dev-default DSN construction into one helper in `backend/internal/config` that all four
`cmd/` tools import, so the literal exists exactly once in the codebase.

## Info

### IN-01: `CanForAnimeProject`'s project-role fallback is evaluated before — and therefore can override — a decisive `user_deny` for the same group/action

**File:** `backend/internal/permissions/permissions_anime_project.go:62-91`
**Issue:** The order of checks is: (1) group-wide `groupRights.Can(action)` → return if allowed;
(2) confirmed project-role fallback via `AnimeProjectContributionResolver` → return if any role
grants; (3) only then check whether step 1's `state.DecisiveSource == ProvenanceUserDeny`. This
means an admin who explicitly revoked a user's group-level grant for
`anime_fansub_project.timeline.update` via a personal deny-override can still have that revoke
silently bypassed if the same user also holds a confirmed `anime_contribution_roles` project
role that grants the action. This is not a newly introduced oversight — it exactly mirrors the
already-shipped, user-decided precedent in `CanForReleaseVersion`
(`permissions_release.go:44-53`, `permissions_release.go:70-84`), which documents this exact
trade-off as "Fall B... a contribution role can still independently grant access even after
Step 2 was denied by a stored user_deny" and locks it with a dedicated regression test. Flagging
only as Info because it is consistent, intentional, previously-reviewed architecture being
correctly extended to a new call site (D-13's explicit mandate to mirror `CanForReleaseVersion`),
not a defect introduced by this phase. Worth noting explicitly in case a future reviewer assumes
it is accidental.
**Fix:** No change required for this phase. If the precedence is ever revisited, it should be
revisited for both `CanForReleaseVersion` and `CanForAnimeProject` together, not just one.

### IN-02: Frontend project-capability fetch failure silently falls back to the group-wide prop, which can transiently show an editable form the backend will reject

**File:** `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectTimelineSection.tsx:69-84,106`
**Issue:** `effectiveCanEdit = projectCanEdit ?? canEdit` — if the project-specific
`getFansubGroupCapabilities(fansubId, undefined, { animeId })` call throws (network hiccup,
transient 5xx), `projectCanEdit` stays `null` and the UI falls back to the coarser,
group-wide `canEdit` prop. For a user who has a granting group role but was explicitly denied
project-specific access (or vice versa — has no group grant but genuinely does have the
confirmed project role, and the fetch fails), the date fields can render as enabled/disabled
inconsistently with what the real backend write path will actually allow (`requireAnimeProjectTimelineWriteAccess`
enforces the authoritative check server-side regardless, so this is a UX inconsistency, not a
security gap — the save button is correctly rejected by the backend on inconsistency). This is a
deliberate, documented trade-off in the plan summary ("Fehlertoleranz..., Fallback auf `canEdit`
bei Netzwerkfehler") to avoid network errors on this secondary fetch blocking the primary,
already-working timeline display — reasonable given the backend is still the source of truth,
but worth noting the resulting UX edge case (a Save click that then 403s) for a future polish
pass.
**Fix:** Optional follow-up: surface the fetch failure with a short retry affordance, or show a
neutral/loading disabled state instead of falling back to a potentially-wrong `canEdit`, so a
403 is never reachable via a seemingly-enabled form.

---

_Reviewed: 2026-10-20T08:33:35Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
