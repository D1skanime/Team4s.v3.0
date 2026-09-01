---
phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz
reviewed: 2026-09-01T23:45:00Z
depth: standard
files_reviewed: 49
files_reviewed_list:
  - backend/cmd/server/main.go
  - backend/internal/handlers/admin_content_anime_project_timeline_test.go
  - backend/internal/handlers/app_auth_capabilities.go
  - backend/internal/handlers/app_auth.go
  - backend/internal/handlers/app_auth_group_member_roles.go
  - backend/internal/handlers/app_auth_group_members.go
  - backend/internal/handlers/app_auth_invitations.go
  - backend/internal/handlers/contribution_proposals_me_test.go
  - backend/internal/handlers/dashboard_me_handler.go
  - backend/internal/handlers/dashboard_me_handler_test.go
  - backend/internal/migrations/phase143_role_capability_defaults_reset_test.go
  - backend/internal/repository/anime_contributions_member_anchor_test.go
  - backend/internal/repository/anime_contributions_member_project_repository.go
  - backend/internal/repository/anime_contributions_member_project_repository_has_own_notes_test.go
  - backend/internal/repository/anime_contributions_proposal_member_repository.go
  - backend/internal/repository/anime_contributions_proposal_repository.go
  - backend/internal/repository/anime_contributions_proposal_repository_test.go
  - backend/internal/repository/anime_fansub_project_timeline_repository_test.go
  - backend/internal/repository/member_claims_queries_repository.go
  - backend/internal/repository/member_claims_repository.go
  - backend/internal/repository/member_claims_repository_test.go
  - backend/internal/repository/member_claims_submit_repository.go
  - backend/internal/repository/member_profile_dashboard_repository.go
  - backend/internal/repository/member_profile_projects_release_versions_repository.go
  - backend/internal/repository/member_profile_projects_repository.go
  - backend/internal/repository/release_review_query_own_note_revisions.go
  - backend/internal/repository/release_review_query_repository.go
  - backend/internal/repository/release_review_query_scan_helpers.go
  - backend/internal/services/release_metadata_credit_service_test.go
  - database/migrations/0159_role_capability_defaults_reset.down.sql
  - database/migrations/0159_role_capability_defaults_reset.up.sql
  - frontend/eslint.config.mjs
  - frontend/next.config.mjs
  - frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx
  - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMetadataFields.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectTimelineSection.module.css
  - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectTimelineSection.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.ts
  - frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts
  - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.test.tsx
  - frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx
  - frontend/src/app/me/dashboard/components/AttentionSection.module.css
  - frontend/src/app/me/dashboard/components/AttentionSection.test.tsx
  - frontend/src/app/me/dashboard/components/AttentionSection.tsx
  - frontend/src/app/me/dashboard/components/CategoryProgressTable.test.tsx
  - frontend/src/app/me/dashboard/components/DashboardMetrics.test.tsx
  - frontend/src/app/me/dashboard/page.tsx
  - frontend/src/app/members/[slug]/page.test.tsx
  - frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx
  - frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx
  - frontend/src/app/me/releases/[versionId]/workspace/page.tsx
  - frontend/src/app/me/releases/[versionId]/workspace/workspaceHelpers.ts
  - frontend/src/app/me/releases/[versionId]/workspace/workspace.module.css
  - frontend/src/components/contributions/ContributionCard.tsx
  - frontend/src/components/fansubs/projectMember/ProjectMemberHero.tsx
  - frontend/src/components/fansubs/projectMember/ProjectMemberReleaseCard.tsx
  - frontend/src/components/profile/MemberBadgeChain.test.tsx
  - frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx
  - frontend/src/components/profile/MemberCurrentProjectsSection.tsx
  - frontend/src/components/profile/MembershipsSection.test.tsx
  - frontend/src/lib/api.dashboard.test.ts
  - frontend/src/lib/api.no-token-boundary.test.ts
  - frontend/src/lib/roleCatalog.ts
  - frontend/src/lib/roleColors.ts
  - frontend/src/types/dashboard.ts
  - frontend/src/types/__tests__/v12-projection-contract.test.ts
  - .planning/todos/pending/2026-09-01-no-restricted-syntax-legacy-datei-migration.md
  - shared/contracts/openapi.yaml
findings:
  critical: 2
  warning: 4
  info: 1
  total: 7
status: issues_found
---

# Phase 143: Code Review Report

**Reviewed:** 2026-09-01T23:45:00Z
**Depth:** standard
**Files Reviewed:** 49 (plus supporting cross-checks)
**Status:** issues_found

## Summary

Phase 143 splits several oversized handler/repository files under the 450-line cap, adds a
backend+frontend dashboard lane for rejected own release notes, fixes the `has_own_notes`
exclusion for rejected notes, reworks the role-capability defaults-reset migration for
idempotency, retrofits two frontend files onto design-system primitives, and ratchets an
ESLint rule to `error` with a frozen exemption list.

Mechanically, the work is solid: `go build ./...` and `go vet ./...` succeed against the
actual repository source, all reviewed files are under the 450-line cap and gofmt-clean, the
ESLint ratchet list was independently re-measured (`--rule '{"no-restricted-syntax":"error"}'`)
and matches exactly the 67 frozen files claimed in the code comment and companion backlog
item, and the new `has_own_notes`/dashboard-lane logic is internally consistent between
backend SQL, Go DTOs, the OpenAPI contract, and the TypeScript types/tests.

Two Critical issues remain, however: an unescaped-HTML injection into outbound invitation
emails (present in a file this phase relocated but did not fix), and a role-capability reset
migration that unconditionally wipes and cannot distinguish admin-configured drift from the
approved baseline catalog. Several lower-severity issues (broken UTF‑8 in copied-forward
German strings, a documented-but-unfixed point-crediting bug, a vacuous test assertion, and
a small dead-code import shim) round out the findings below.

## Critical Issues

### CR-01: Unescaped HTML injection into outbound fansub-group invitation emails

**File:** `backend/internal/handlers/app_auth_invitations.go:173-187`
**Issue:** `CreateFansubGroupInvitation` builds the invitation email's `bodyHTML` with
`fmt.Sprintf`, embedding `inviterName` (`identity.DisplayName`, the *inviter's own*,
freely user-editable profile display name via `PUT /me/profile`) and `groupName` (the
fansub group's `Name`, editable by any actor with `can_edit_group`) directly into raw HTML
tags (`<p>`, `<strong>`) with no HTML-escaping:

```go
bodyHTML := fmt.Sprintf(
    `<p>%s hat dich eingeladen, der Fansub-Gruppe <strong>"%s"</strong> auf Team4s beizutreten%s.</p>`+
    ...
    inviterName, groupName, roleSuffixHTML,
    groupName,
    created.Invitation.Email,
    mailURL,
    expiresLabel,
    groupName,
)
```

The recipient (`created.Invitation.Email`) is itself validated/normalized via
`net/mail.ParseAddress` in `fansub_group_invitations_repository.go` (safe), but
`inviterName`/`groupName` are not sanitized anywhere in the profile/group-update paths
(no `bluemonday` or tag-stripping is applied to `display_name`/group `name`). Any
authenticated user who can create an invitation (fansub lead / co-leader) can set their own
display name (or, with edit rights, the group name) to arbitrary HTML/markup — e.g. a fake
"Login" button/link overlaying the real `mailURL`, or content designed to make the email
look like it comes from a different sender — and have that payload delivered, unescaped,
inside an HTML email to a third party (the invitee) who never agreed to trust that actor.
This is a stored HTML-injection / phishing vector reaching users outside the authenticated
app boundary.

This code was not newly written by Phase 143 — it was mechanically relocated out of the
former monolithic `app_auth.go` (confirmed via `git show 1cdba33b^:...app_auth.go` — the
same unescaped `fmt.Sprintf` existed pre-split) — but it is present, unmodified, in a file
this phase's own diff touches and ships, so it belongs in this review.

**Fix:**
```go
import "html"

bodyHTML := fmt.Sprintf(
    `<p>%s hat dich eingeladen, ...`,
    html.EscapeString(inviterName), html.EscapeString(groupName), roleSuffixHTML,
    html.EscapeString(groupName),
    created.Invitation.Email, // already a validated bare address
    mailURL,                  // already a builder-controlled URL, not free text
    expiresLabel,
    html.EscapeString(groupName),
)
```
(`roleSuffixHTML` is built from `permissions.IsKnownFansubGroupRole`-validated role codes
joined server-side, so it does not need the same treatment, but should be double-checked.)

### CR-02: Migration 0159 unconditionally wipes `role_capabilities`, discarding any admin-configured drift

**File:** `database/migrations/0159_role_capability_defaults_reset.up.sql:13-249`
**Issue:** The migration's `up.sql` runs an unqualified `DELETE FROM role_capabilities;`
before re-inserting a fixed 232-tuple baseline catalog via `INSERT ... ON CONFLICT DO
NOTHING`. This makes the *reinsert* idempotent (the stated goal, fixing migration 0154's
non-idempotent version), but it does not make the *reset* itself safe: if a platform admin
has used the Capability-Matrix CRUD UI (Phase 87, `AdminCapabilityHandler`) to grant or
revoke any `role_capabilities` row that deviates from this exact 232-row baseline at any
point between migration 0154 and 0159 being applied to a given environment, that
customization is silently and irreversibly deleted the moment 0159 runs on that
environment — with no warning, no backup, and no way to distinguish "baseline drift I
should preserve" from "stale row I should discard." Because migrations are append-only in
this project (per `CLAUDE.md`) and are expected to run against real, already-provisioned
databases (not just fresh ones — this is exactly the "genuinely empty database" vs.
"existing" distinction the migration's own new test cares about), this is a real data-loss
risk on any environment where 0154 already ran and capabilities were subsequently
hand-tuned.

**Fix:** Either (a) make the migration additive-only (`INSERT ... ON CONFLICT DO NOTHING`
without the preceding `DELETE`, matching the down-migration's scoped-delete pattern already
used for reversibility), or (b) add a pre-flight check that fails loudly (rather than
silently discarding) if `role_capabilities` contains rows outside the approved 232-tuple set
at migration time, so an operator can review before the reset proceeds.

## Warnings

### WR-01: Broken UTF-8 ("mojibake") in German user-facing error strings, carried unfixed into new split files

**File:** `backend/internal/handlers/app_auth_group_member_roles.go:56,150,156,167,173,243,249,260,266`, `backend/internal/handlers/app_auth_group_members.go:39,69`, `backend/internal/handlers/app_auth_invitations.go:46,82,215,273`
**Issue:** Strings such as `"Mitgliederberechtigung konnte nicht geprÃ¼ft werden."` and
`"ungÃ¼ltige fansub-id"` are double-encoded UTF-8 (`ü` stored as `Ã¼`), directly violating
this repository's mandatory `CLAUDE.md` Sprachqualität rule, which explicitly requires
correct umlauts in "Go-Response-Strings" and forbids ASCII/mojibake substitutions. These
strings pre-date Phase 143 (confirmed via `git show 1cdba33b^:...app_auth.go`), but this
phase's own stated remediation goal was to split `app_auth.go` into clean, reviewable
files — the mechanical split copied the corruption forward into brand-new files without
correcting it, so every one of these admin-facing error messages still renders garbled text
in the UI/logs today. `app_auth_capabilities.go` (also a 143-01 split output) already
contains the *correctly* encoded equivalents at lines 118, 173 ("Berechtigung für den
Projektzeitraum konnte nicht geprüft werden.", "...Textprüfung..."), showing the
correct fix is already known/used elsewhere in this same phase's own output — it just
wasn't applied consistently to the sibling files.
**Fix:** Re-save the affected literals as proper UTF-8 (`geprüft`, `ungültige`, `prüfe`).

### WR-02: `GetOwnDashboard`'s success-path response omits `PendingGroupMediaReviews` initialization

**File:** `backend/internal/repository/member_profile_dashboard_repository.go:253-265`
**Issue:** The `OwnDashboardData` literal returned by `GetOwnDashboard` explicitly
initializes `PendingClaims`, `PendingReleaseReviews`, and `PendingOwnNoteRevisions` to empty
slices, but omits `PendingGroupMediaReviews` — leaving it `nil` at that point. Production
behavior is currently masked because `dashboard_me_handler.go`'s
`attachPendingGroupMediaReviewAttention` always runs afterward and unconditionally
overwrites it with `make([]repository.OwnDashboardPendingGroupMediaReview, 0, ...)` — but
only as long as both `h.reviewQueryRepo` and `h.permissionSvc` are non-nil (guaranteed today
by `main.go`'s `.WithClaimAttention(...).WithReviewQueryRepo(...)` chain). If that wiring
ever changes (e.g. a future refactor constructs `DashboardMeHandler` without
`WithReviewQueryRepo`), the field silently reverts to serializing as JSON `null` instead of
`[]`, breaking the "never null" array contract the OpenAPI schema and every sibling field
promise, and that every other `pending_*` field in this exact struct already defends
against.
**Fix:** Add `PendingGroupMediaReviews: []OwnDashboardPendingGroupMediaReview{},` to the
struct literal for defense in depth, consistent with the other three `pending_*` fields.

### WR-03: Documented-but-unfixed wrong-release-version point-crediting bug ships as-is

**File:** `backend/internal/services/release_metadata_credit_service_test.go:19-67` (bug lives in `backend/internal/services/release_metadata_credit_service.go:43-51`)
**Issue:** The new test `TestReleaseMetadataCreditServiceAwardIfCompleted/AmbiguousIDCollisionCreditsTheWrongReleaseVersion`
proves, against a real Postgres fixture, that `AwardIfCompleted`'s lookup query
(`WHERE rv.id = $1 OR rev.id = $1 ORDER BY rv.id LIMIT 1`) is genuinely ambiguous: when a
`release_variants.id` numerically collides with an unrelated `release_versions.id`, the
service silently credits and point-awards the **wrong** release version's metadata-complete
milestone to the member, rather than the one the caller actually intended. The test's own
comment states this is deliberately not fixed by this phase and only "documents the resolved
(surprising) behavior." This is a genuine data-integrity bug (misattributed
point-ledger/badge credit) that the phase's own validation explicitly acknowledges and still
ships unresolved. Flagging so it is not lost track of outside `143-10-SUMMARY.md`.
**Fix:** Disambiguate the lookup — e.g. query `release_versions` by `rev.id = $1` first, and
only fall back to resolving via `release_variants.id = $1` if no release_versions row
matches, instead of a single `OR`-joined, arbitrarily-ordered query.

### WR-04: Vacuous test assertion — asserts absence of a string the component never renders (encoding mismatch)

**File:** `frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx:417`
**Issue:** In the test `"shows only segments for non-platform users with segment
capability"`, one assertion reads:
```ts
expect(
  screen.queryByRole("button", { name: "Notizen / BeitrÃ¤ge" }),
).toBeNull();
```
The literal contains mojibake (`BeitrÃ¤ge` instead of `Beiträge`). The real
`EpisodeVersionEditorPage` component only ever renders the correctly-encoded label
`"Notizen / Beiträge"` (as every other assertion in this same file, e.g. lines 367, 443,
correctly spells it). Because `queryByRole` returns `null` for a name that never exists
verbatim in the DOM, this specific assertion is true unconditionally — it would pass even if
the capability-gating bug it's meant to catch (showing the Notes tab to a user without notes
capability) were reintroduced, giving false confidence in that regression guard. Predates
Phase 143 (introduced in commit `3c3dfff0`) but was touched/left in place by this phase's own
`73587955` "fix stale test drift" commit to this exact file without being corrected.
**Fix:** Change the literal to `"Notizen / Beiträge"`.

## Info

### IN-01: Dead "keep this import alive" hack instead of removing the unused import

**File:** `backend/internal/handlers/contribution_proposals_me_test.go:683`
**Issue:** `var _ = errors.New // Sicherstellt dass errors-Paket importiert bleibt` exists
solely to prevent Go from complaining about an otherwise-unused `errors` import — the
package has no other use in this file. This is a maintenance smell: a future reader has to
puzzle out why an unused-looking `errors.New` reference exists, and any real future usage of
`errors` in this file makes the line redundant without an obvious prompt to remove it.
**Fix:** Remove both the `"errors"` import and this line, since neither is otherwise needed.

---

_Reviewed: 2026-09-01T23:45:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
