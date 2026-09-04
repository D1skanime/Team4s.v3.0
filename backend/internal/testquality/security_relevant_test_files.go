// Package testquality holds Phase 146's frozen definitions and scanners used to remediate and
// then guard against source-substring "false assurance" test patterns across the backend.
package testquality

// SecurityRelevantTestFiles is the FROZEN definition of "security-relevant" for Phase 146
// Criteria 5/6/7 (D-08). It was measured 2026-09-04 via
// .planning/notes/measure-substring-tests.py's name+header-keyword filter
// (`permission|authz|capability|role_capabilit|preview|403|forbidden|effective_right|
// whitelist|delegation|role_catalog|reserved`, case-insensitive, matched against the relative
// path or the first 4KB of file content) — chosen because it is reproducible via the committed
// measurement script and cross-checks the roadmap's own 53-file/302-function totals exactly.
//
// This list itself does not shrink or grow — it defines Phase 146's scope, not remediation
// progress. What shrinks over the course of Block 2 (Plans 146-04 through 146-12) is the
// separate ratchet exception list in Plan 146-13's guard file
// (backend/internal/testquality/source_substring_guard_test.go), which enumerates only the
// still-unremediated subset of this frozen 20-file list.
//
// Presence-vs-absence violation rule (identical to the rule Plan 146-13's Criterion-7 guard
// enforces, D-09): within these 20 files, a test FUNCTION is a "violation" subject to
// Criterion 5 remediation only if it uses os.ReadFile on a .go file to assert PRESENCE of a
// pattern (via strings.Contains/assert.Contains/require.Contains without negation) as a
// stand-in for behavior. Pure ABSENCE checks (NotContains, assert.False(strings.Contains(...)))
// and files that are themselves the object under test (SQL migrations) remain compliant per
// CLAUDE.md's own stated Teststil exceptions (D-10) — they require no code change, and do not
// count as "reading .go source" for Criterion 6's count once verified to contain no
// PRESENCE-style os.ReadFile assertion.
var SecurityRelevantTestFiles = []string{
	"internal/repository/release_version_media_repository_test.go",
	"internal/handlers/admin_content_release_version_media_test.go",
	"internal/handlers/admin_content_fansub_notes_test.go",
	"internal/handlers/admin_content_release_theme_assets_test.go",
	"internal/handlers/admin_content_release_version_media_replace_test.go",
	"internal/repository/hist_group_member_roles_whitelist_test.go",
	"internal/repository/member_archive_repository_test.go",
	"internal/handlers/fansub_test.go",
	"internal/repository/member_claims_repository_claim_activation_test.go",
	"internal/repository/role_definitions_context_test.go",
	"internal/handlers/role_catalog_router_integration_test.go",
	"internal/repository/point_ledger_repository_test.go",
	"internal/repository/role_catalog_repository_test.go",
	"internal/services/release_crew_service_test.go",
	"internal/handlers/admin_content_anime_project_notes_test.go",
	"internal/handlers/dashboard_me_handler_test.go",
	"internal/handlers/public_member_access_matrix_test.go",
	"internal/repository/member_point_totals_repository_test.go",
	"internal/repository/review_delegation_repository_test.go",
	"internal/services/release_review_submission_test.go",
}
