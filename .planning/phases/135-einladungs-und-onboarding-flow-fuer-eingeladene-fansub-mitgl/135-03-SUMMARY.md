---
phase: 135-einladungs-und-onboarding-flow-fuer-eingeladene-fansub-mitgl
plan: 03
subsystem: backend
tags: [go, gin, mail, handlers, invitations, testing]

# Dependency graph
requires: []
provides:
  - "AppAuthHandler.fansubRepo (fansubGroupNameStore) threaded via NewAppAuthHandler's final constructor parameter"
  - "CreateFansubGroupInvitation mail body with real group name, inviter display name, role(s), explanatory sentence, and expiry date (D-03)"
  - "Mail CTA link carrying &email=<url-escaped invitee email> for D-08's mediated Keycloak login_hint prefill fallback, consumed by Plan 135-05"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Narrow single-method lookup interface (fansubGroupNameStore) satisfied verbatim by an existing concrete repository type, mirroring the file's existing fansubGroupAppMemberStore/fansubGroupInvitationStore narrow-interface convention"

key-files:
  created: []
  modified:
    - backend/internal/handlers/app_auth.go
    - backend/cmd/server/main.go
    - backend/internal/handlers/app_auth_test.go

key-decisions:
  - "Content-Spec Addendum (locked, AUTORITATIV) superseded the plan body's literal fmt.Sprintf() subject/body wording where the two disagreed; the addendum's fuller German copy (explanatory sentence, email-match instruction, expiry date, ignore-if-unexpected line) was implemented as the actual mail text, while the plan body's mechanical instructions (interface shape, constructor wiring, fallback semantics, no-new-repo-method/no-new-route constraint) were followed exactly."
  - "{Rolle} in the content-spec template is rendered as the raw comma-joined InvitedRoleCodes rather than a role_definitions label lookup, since the objective explicitly scopes this plan to threading only GetGroupByID with no new repository method; a full role-code-to-label resolution was out of scope."
  - "Inviter name reuses identity.DisplayName (the acting admin from the current request) rather than a separate CreatedByAppUserID lookup, since CreatedByAppUserID is set to identity.AppUserID by this same handler a few lines above -- they are the same person, so no extra lookup is needed."
  - "Only the two mojibake instances inside the mail block being rewritten (the old 'gÃ¼ltig' occurrences) were fixed, per the addendum's explicit 'Encoding-Bug beheben' instruction; the eight pre-existing unrelated mojibake instances elsewhere in app_auth.go were left untouched, matching the plan's out-of-scope note."
  - "Container source sync is not live (docker-compose.override.yml only wires develop.watch, no backend bind mount, and no watch process was running); confirmed via mtime comparison (container copy was ~17 days stale) and resolved by docker compose cp-ing cmd/, internal/, go.mod, and go.sum into team4sv30-backend before every build/vet/test run, per Plan 135-02's precedent and this plan's known_pitfall."

requirements-completed: [D-03, D-01, D-08]

# Metrics
duration: 25min
completed: 2026-08-17
---

# Phase 135 Plan 03: Context-rich invitation mail + email-hint accept link Summary

**`CreateFansubGroupInvitation`'s mail now names the real fansub group and inviting admin instead of the old blind "Du wurdest zu einer Fansub-Gruppe eingeladen" text, and its accept link carries the invitee's own email as a non-authoritative `&email=` hint for the frontend's future Keycloak `login_hint` prefill.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-08-17T13:10:00Z
- **Completed:** 2026-08-17T13:35:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added a narrow `fansubGroupNameStore` interface (`GetGroupByID(ctx, id) (*models.FansubGroup, error)`) to `app_auth.go`, satisfied verbatim by the already-constructed `*repository.FansubRepository`; `AppAuthHandler` gained a `fansubRepo` field and `NewAppAuthHandler` gained a final `fansubRepo *repository.FansubRepository` parameter, wired in `main.go` from the existing `fansubRepo` variable (no second repository instance constructed).
- `CreateFansubGroupInvitation`'s mail block now resolves `groupName` via `h.fansubRepo.GetGroupByID` (falling back to "deiner Fansub-Gruppe" on any nil-repo or lookup-error path, never blocking invitation creation) and `inviterName` from `identity.DisplayName` (falling back to "Die Gruppenleitung").
- Rewrote `Subject`/`BodyText`/`BodyHTML` per the phase's locked Content-Spec Addendum: names the inviter and group, states what Team4s is, explains that accepting grants membership and a Keycloak account can be created inline, instructs the invitee to use exactly the invited email address, links the CTA, states the 7-day validity with a localized (`TT.MM.JJJJ`) expiry date, and closes with an ignore-if-unexpected line. Also fixed the two pre-existing "gÃ¼ltig" mojibake occurrences that lived inside the rewritten block (unrelated mojibake elsewhere in the file was left untouched).
- The mail CTA link (`mailURL`) appends `&email=` + `url.QueryEscape(created.Invitation.Email)` to the existing absolute `inviteURL` -- D-08's mediated fallback; server-side match enforcement in `FansubGroupInvitationRepository.Accept()` is unchanged.
- Added `fansubRepoStub` (implementing `fansubGroupNameStore`) plus two new tests: `TestCreateFansubGroupInvitationMailContainsGroupContextAndEmailHint` (asserts the mail body contains the real group name, inviter name, the Team4s explanatory sentence, and the URL-escaped email hint) and `TestCreateFansubGroupInvitationMailFallsBackWithoutFansubRepo` (asserts a nil `fansubRepo`, matching every other pre-existing test in the file, still succeeds with 201 and the generic fallback phrase instead of panicking).

## Task Commits

1. **Task 1: Thread fansubRepo into AppAuthHandler; compose context-rich mail + email-hint link** - `97128f9e` (feat)
2. **Task 2: Extend backend tests to prove the mail context and email hint** - `c10ee029` (test)

## Files Created/Modified
- `backend/internal/handlers/app_auth.go` - new `fansubGroupNameStore` interface, `fansubRepo` field + constructor param, `net/url` import, and the full rewritten mail-composition block inside `CreateFansubGroupInvitation`.
- `backend/cmd/server/main.go` - `NewAppAuthHandler(...)` call now passes the already-constructed `fansubRepo` as its final argument.
- `backend/internal/handlers/app_auth_test.go` - new `fansubRepoStub`, `net/url` import, and two new `TestCreateFansubGroupInvitation*` cases proving the enriched context and the nil-fansubRepo fallback.

## Decisions Made
- Followed the phase plan's locked Content-Spec Addendum (marked AUTORITATIV) for the exact mail wording where it differed from the plan body's illustrative `fmt.Sprintf` snippets; the plan body's mechanical constraints (interface shape, no new repository method, no new route, fail-open lookup) were followed exactly as written.
- Rendered `{Rolle}` as the raw comma-joined `InvitedRoleCodes` rather than adding a `role_definitions` label-lookup path, keeping this plan's repository surface exactly as scoped (`GetGroupByID` only).
- Reused `identity.DisplayName` for the inviter name instead of a separate `CreatedByAppUserID` lookup, since they are provably the same person in this handler.
- Confirmed (again, per Plan 135-02's precedent) that the `team4sv30-backend` container is not live-synced from the host; used `docker compose cp` for `cmd/`, `internal/`, `go.mod`, `go.sum` before every build/vet/test invocation.

## Deviations from Plan
- Mail copy follows the Content-Spec Addendum's fuller German template rather than the plan body's shorter illustrative `fmt.Sprintf` example; this is a wording-only deviation, not a scope deviation -- the addendum is part of the same plan file and is explicitly marked as the authoritative content source, and it does not touch any of the plan's structural/interface acceptance criteria (which all still pass verbatim).

## Issues Encountered
- Container source was confirmed stale again before trusting `go build`/`go vet`/`go test` output (mtime diff of ~17 days between host and container copies of `app_auth.go`); resolved via `docker compose cp` of the full `cmd/` and `internal/` trees plus `go.mod`/`go.sum` before each verification run, consistent with Plan 135-02's documented workaround and this plan's stated known_pitfall.

## User Setup Required

None - no external service configuration required. `SMTP_ENABLED=false` (noop mailer) remains the local default; the new mail body is unit-tested via the existing `mailerStub` capture pattern, not sent through Mailpit.

## Next Phase Readiness
D-03 and D-08 (mediated email-hint fallback) are closed for the backend invitation-creation path. Plan 135-05 (frontend accept flow) can now read the invite link's `email` query parameter and pass it to Keycloak's `login_hint` without needing any new backend endpoint. No blockers for the next plan in Phase 135.

---
*Phase: 135-einladungs-und-onboarding-flow-fuer-eingeladene-fansub-mitgl*
*Completed: 2026-08-17*
