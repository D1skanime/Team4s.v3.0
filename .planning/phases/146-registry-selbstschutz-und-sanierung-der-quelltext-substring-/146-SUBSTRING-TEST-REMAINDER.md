# Phase 146 — Criterion 8: Named Substring-Test Remainder

Measured 2026-09-04 (Plan 146-13, after Plans 146-04 through 146-12 landed), reproducible via
`python3 .planning/notes/measure-substring-tests.py` against `backend/`.

## Headline numbers

- **53** files originally measured (roadmap baseline, 2026-09-04 pre-remediation).
- **45** files still contain at least one `os.ReadFile(...".go")` call after remediation.
- **20** files are the frozen `SecurityRelevantTestFiles` set (D-08). Of those, **11** still
  contain an `os.ReadFile(...".go")` call — all 11 re-read directly during this plan and
  confirmed to contain ONLY the CLAUDE.md Teststil exception-1 sanctioned absence check
  (`hist_group_member_roles_whitelist_test.go`, `member_archive_repository_test.go`,
  `fansub_test.go`, `member_claims_repository_claim_activation_test.go`,
  `point_ledger_repository_test.go`, `role_catalog_repository_test.go`,
  `member_point_totals_repository_test.go`, `release_crew_service_test.go`,
  `admin_content_anime_project_notes_test.go`, `review_delegation_repository_test.go`,
  `release_review_submission_test.go`) — never a presence-style claim standing in for
  behavior. The other 9 (`release_version_media_repository_test.go`,
  `admin_content_release_version_media_test.go`, `admin_content_fansub_notes_test.go`,
  `admin_content_release_theme_assets_test.go`,
  `admin_content_release_version_media_replace_test.go`, `role_definitions_context_test.go`,
  `role_catalog_router_integration_test.go`, `dashboard_me_handler_test.go`,
  `public_member_access_matrix_test.go`) were fully remediated to zero remaining
  `os.ReadFile(...".go")` calls by Plans 146-04 through 146-12. **Criterion 5/6 is closed:
  zero security-relevant presence violations remain.**
- **34** files remain, none of them security-relevant per the D-08 filter rule. This is the
  named remainder below. **34 <= 36 satisfies Criterion 6.**

## Why these 34 remain (Criterion 8)

All 34 files below are **non-security-relevant per the D-08 filter rule** — none of their
relative path or first-4KB content matches the locked keyword filter
(`permission|authz|capability|role_capabilit|preview|403|forbidden|effective_right|
whitelist|delegation|role_catalog|reserved`, case-insensitive). Phase 146's Criteria 5/6
explicitly scoped remediation to the 20 security-relevant files only (D-08); these 34 are
Criterion 8's deliberately-deferred debt, not a silent gap. Each still uses
`os.ReadFile` to read its own (or a sibling) `.go` production source file and assert
something about that source text — the majority via a presence-style
`strings.Contains`/`assert.Contains`/`require.Contains`/negated-`!strings.Contains` claim (the
anti-pattern CLAUDE.md's Teststil-Regel forbids), a minority via a pure absence check or a
structural (non-substring) metric that the guard's detector does not flag but which is kept
in the same frozen list for simplicity and future retrofit tracking.

Grouped by area, each file named explicitly (no glob/"etc." shorthand):

### Repository-layer tests (23 files) — production SQL claimed present via source read, never executed against real Postgres
- internal/repository/member_profile_repository_test.go — asserts SQL/struct fragments of `member_profile_repository.go` and `../models/member_profile.go` are present via `os.ReadFile` + `strings.Contains`, never calling the repository against a real database.
- internal/repository/release_version_notes_repository_test.go — asserts SQL fragments (contributor-context guard, review-lifecycle join, role-catalog join) are present in `release_version_notes_repository.go`'s source text.
- internal/repository/anime_project_notes_repository_test.go — asserts SQL fragments and a sibling migration file's SQL text are present via source read.
- internal/repository/fansub_repository_test.go — asserts SQL fragments (alias joins, visibility filters, delete cascade) are present in `fansub_repository.go`'s source text.
- internal/repository/media_repository_path_test.go — asserts SQL join/ordering fragments are present in `media_repository.go`'s source text.
- internal/repository/admin_users_repository_test.go — asserts SQL fragments across `admin_users_contributions_query.go` and `admin_users_tab_repository.go` are present via source read.
- internal/repository/app_auth_repository_test.go — asserts presence and absence of SQL statement fragments in `app_auth_repository.go`'s source text.
- internal/repository/group_repository_test.go — asserts SQL fragments (visibility filter, contributor stats) are present in `group_repository.go`'s source text.
- internal/repository/group_themes_repository_test.go — asserts SQL join fragments and struct tag fragments are present in `group_themes_repository.go`'s source text.
- internal/repository/fansub_notes_repository_test.go — asserts method-signature fragments are present in `fansub_group_notes_repository.go` and `member_group_stories_repository.go`'s source text.
- internal/repository/episode_version_repository_read_helpers_test.go — asserts SQL/field fragments are present in `episode_version_repository_read_helpers.go`'s source text.
- internal/repository/admin_content_theme_asset_locks_test.go — asserts SQL fragments are present in `admin_content_anime_themes.go`'s source text.
- internal/repository/anime_contributions_member_project_repository_test.go — asserts SQL ordering fragments are present in `anime_contributions_member_project_repository.go`'s source text.
- internal/repository/episode_import_repository_test.go — asserts SQL fragments are present across three sibling repository-helper source files.
- internal/repository/member_claims_repository_test.go — asserts SQL fragments and JSON field names are present in `member_claims_repository.go`'s source text.
- internal/repository/admin_users_tab_repository_test.go — asserts SQL fragments are present across `admin_users_contributions_query.go` and `../models/admin_users.go`'s source text.
- internal/repository/anime_contributions_display_avatar_test.go — asserts SQL avatar-join fragments are present in `anime_contributions_repository.go`'s source text.
- internal/repository/anime_contributions_member_anchor_test.go — asserts SQL anchor-join fragments are present across three sibling repository source files.
- internal/repository/episode_import_repository_release_helpers_test.go — asserts source fragments/order are present in `episode_import_repository_release_helpers.go`'s source text.
- internal/repository/episode_version_repository_test.go — asserts source fragments (crew seeder plumbing, commit ordering) are present in `episode_version_repository.go`'s source text.
- internal/repository/episode_version_repository_write_helpers_test.go — asserts source fragments across three sibling write-helper source files.
- internal/repository/release_detail_cursor_test.go — asserts SQL join fragments are present in `group_repository_cursor.go`'s source text.
- internal/repository/group_contributors_repository_test.go — asserts SQL join/filter fragments are present across `group_release_media_repository.go`, `group_themes_repository.go`, and `group_contributors_repository.go`'s source text.
- internal/repository/review_credit_repository_test.go — asserts presence of `PG_ADVISORY_XACT_LOCK`/`HASSLOT` alongside a sanctioned absence check in `review_credit_repository.go`'s source text.

### Handler-layer tests (7 files) — HTTP behavior claimed present via source read, never executed via httptest
- internal/handlers/admin_content_release_version_notes_test.go — asserts guard/copy fragments are present in `admin_content_release_version_notes.go`'s source text, never issuing a real HTTP request.
- internal/handlers/contributions_me_member_anchor_test.go — asserts SQL anchor fragments are present in `contributions_me_handler.go`'s source text.
- internal/handlers/fansub_media_upload_thumbnail_test.go — asserts thumbnail-generation call fragments are present in `fansub_media_upload.go`'s source text.
- internal/handlers/group_contributors_handler_test.go — asserts fragments are present in `group_contributors_handler.go`'s source text.
- internal/handlers/project_member_public_handler_test.go — asserts route/constructor fragments are present across `project_member_public_handler.go` and `../../cmd/server/main.go`'s source text.
- internal/handlers/media_upload_test.go — reads `media_upload.go` only to assert a line-count budget (`<= 450` lines); not a substring-behavior claim, kept in the list defensively since it still reads `.go` source per the D-08 measurement methodology.
- internal/handlers/member_media_upload_defaults_test.go — reads `member_media_upload.go` to assert (via `assert.False(strings.Contains(...))`, a pure absence check) that a specific `PostForm` call is absent; kept in the list defensively for the same reason as above.

### Cross-cutting / integration tests (3 files)
- cmd/server/phase108_runtime_wiring_test.go — asserts wiring fragments are present across `main.go` and `admin_routes.go`'s source text.
- internal/services/release_version_media_cleanup_test.go — asserts a handler-call fragment is present in `../handlers/admin_content_release_version_media.go`'s source text alongside real-behavior assertions in the rest of the file.
- internal/repository/anime_coverage_repository_test.go — asserts SQL fragments are present in `anime_coverage_repository.go`'s source text.

All 34 files above remain accepted, named debt (T-146-20, threat register `accept`
disposition) — a future phase may retrofit them to real `httptest`/real-Postgres execution
following the same pattern established by Plans 146-04 through 146-12, but doing so is out of
Phase 146's scope.

## Carried-forward open item (not a silent gap)

`HistGroupMemberRolesRepository.RoleCodeExistsForContext`'s sibling
`IsHistoricalMemberRoleCode` (`internal/repository/hist_group_member_roles_repository.go`) was
**not** expanded into Criterion 3's scope — D-04 locked Criterion 3 to exactly 4 named
queries (`ListGroupHistoryRoleDefinitions` plus the three already covered by
`membership_baseline_registry_test.go`), and `IsHistoricalMemberRoleCode` was not one of
them. Per `145-REVIEW.md` WR-01's broader recommendation, this is flagged here explicitly as
a carried-forward item for a future phase to evaluate, not a silently-lost finding.

## Sign-off

- Measured 2026-09-04, Plan 146-13, after Plans 146-04 through 146-12 landed.
- 34 of 53 files remain reading `.go` source for a test assertion; target was <= 36 (Criterion
  6) — satisfied.
- Zero of the 20 `SecurityRelevantTestFiles` remain among the 34 (Criterion 6's second
  clause) — satisfied; proven automatically by
  `TestSecurityRelevantFilesNeverInLegacyExceptionList` in
  `backend/internal/testquality/source_substring_guard_test.go`.
- A `go test`-executed, frozen, shrink-only ratchet guard
  (`TestNoNewSourceSubstringTests`) prevents any new file outside this list from
  reintroducing the pattern (Criterion 7) — satisfied.
