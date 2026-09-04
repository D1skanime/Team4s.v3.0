package testquality

import (
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"sort"
	"strings"
	"testing"
)

// LegacyAllowedSubstringTestFiles is the FROZEN, shrink-only ratchet exception list for
// Phase 146 Criterion 7 (D-09), modeled on frontend/eslint.config.mjs's
// LEGACY_NO_RESTRICTED_SYNTAX_FILES.
//
// Re-measured 2026-09-04 (Plan 146-13, AFTER Plans 146-04 through 146-12 landed) via
// .planning/notes/measure-substring-tests.py against backend/ — the same reproducible
// methodology that established SecurityRelevantTestFiles' 20-file baseline (see
// security_relevant_test_files.go). The script's own "reads .go source" detection
// (os.ReadFile with a literal ".go"-suffixed path argument, direct or via filepath.Join)
// found 45 files total; 11 of those are members of the frozen SecurityRelevantTestFiles
// list (all 11 confirmed, by direct re-read during Plan 146-13, to contain ONLY the
// CLAUDE.md Teststil exception-1 sanctioned absence check — "an identifier must never
// appear" — never a presence-style claim standing in for behavior; the other 9 of the 20
// were fully remediated to zero remaining os.ReadFile(".go") calls). The 34 files below are
// the exact remainder: every non-security-relevant test file the script still finds reading
// a .go source file for some assertion. This is Criterion 8's documented, named debt — see
// 146-SUBSTRING-TEST-REMAINDER.md in this phase's directory for the per-file/per-group
// reason. 34 <= 36 satisfies Criterion 6.
//
// This is a FROZEN EXPLICIT FILE LIST, not a glob — a directory glob would silently exempt
// tomorrow's new files in the same packages, defeating the ratchet. RATCHET — this list may
// only SHRINK, never grow. An entry is deleted only when that file is retrofitted to real
// behavior execution (httptest/real-Postgres, per CLAUDE.md's Teststil-Regel). Nothing is
// ever added silently — a genuine new need is a reviewed decision, not a silent edit.
var LegacyAllowedSubstringTestFiles = []string{
	"cmd/server/phase108_runtime_wiring_test.go",
	"internal/handlers/admin_content_release_version_notes_test.go",
	"internal/handlers/contributions_me_member_anchor_test.go",
	"internal/handlers/fansub_media_upload_thumbnail_test.go",
	"internal/handlers/group_contributors_handler_test.go",
	"internal/handlers/media_upload_test.go",
	"internal/handlers/member_media_upload_defaults_test.go",
	"internal/handlers/project_member_public_handler_test.go",
	"internal/repository/admin_content_theme_asset_locks_test.go",
	"internal/repository/admin_users_repository_test.go",
	"internal/repository/admin_users_tab_repository_test.go",
	"internal/repository/anime_contributions_display_avatar_test.go",
	"internal/repository/anime_contributions_member_anchor_test.go",
	"internal/repository/anime_contributions_member_project_repository_test.go",
	"internal/repository/anime_coverage_repository_test.go",
	"internal/repository/anime_project_notes_repository_test.go",
	"internal/repository/app_auth_repository_test.go",
	"internal/repository/episode_import_repository_release_helpers_test.go",
	"internal/repository/episode_import_repository_test.go",
	"internal/repository/episode_version_repository_read_helpers_test.go",
	"internal/repository/episode_version_repository_test.go",
	"internal/repository/episode_version_repository_write_helpers_test.go",
	"internal/repository/fansub_notes_repository_test.go",
	"internal/repository/fansub_repository_test.go",
	"internal/repository/group_contributors_repository_test.go",
	"internal/repository/group_repository_test.go",
	"internal/repository/group_themes_repository_test.go",
	"internal/repository/media_repository_path_test.go",
	"internal/repository/member_claims_repository_test.go",
	"internal/repository/member_profile_repository_test.go",
	"internal/repository/release_detail_cursor_test.go",
	"internal/repository/release_version_notes_repository_test.go",
	"internal/repository/review_credit_repository_test.go",
	"internal/services/release_version_media_cleanup_test.go",
}

// TestSecurityRelevantFilesNeverInLegacyExceptionList proves the two frozen lists this
// package defines are disjoint: Criterion 7's ratchet exception list must never contain any
// of Criterion 5/6's 20 locked security-relevant files. This is the single automated proof
// that the phase's remediation work (Plans 146-04 through 146-12) actually shrank the
// security-relevant set to zero remaining substring-proof violations, rather than merely
// being exempted from the guard.
func TestSecurityRelevantFilesNeverInLegacyExceptionList(t *testing.T) {
	allowed := make(map[string]bool, len(LegacyAllowedSubstringTestFiles))
	for _, f := range LegacyAllowedSubstringTestFiles {
		allowed[f] = true
	}
	for _, f := range SecurityRelevantTestFiles {
		if allowed[f] {
			t.Errorf("security-relevant file %q must never appear in LegacyAllowedSubstringTestFiles — it is Phase 146's locked remediation target, not accepted debt", f)
		}
	}
}

// TestNoNewSourceSubstringTests is the Criterion 7 ratchet guard: it walks every
// backend/**/*_test.go file and fails if any file OUTSIDE LegacyAllowedSubstringTestFiles
// uses os.ReadFile to read a .go source file and then asserts, via
// strings.Contains/assert.Contains/require.Contains/assert.True(strings.Contains(...)) —
// WITHOUT negation — that a pattern is PRESENT, as a stand-in for actually executing the
// code (the anti-pattern CLAUDE.md's Teststil-Regel forbids). Pure ABSENCE checks (an
// identifier must never appear — NotContains, assert.False(strings.Contains(...)), or a
// negation-guarded Contains used only to detect and reject a forbidden fragment) remain
// permitted anywhere per CLAUDE.md's own Teststil exception 1 and are not flagged.
//
// This is a go-test-executed scanner (not a lint rule or CI job — this repo has neither, per
// RESEARCH.md) using a regex-based detector mirroring
// .planning/notes/measure-substring-tests.py's proven, reproducible os.ReadFile(...".go")
// detection, extended with lightweight per-function variable-provenance tracing (which
// literal-string variable is derived from the ReadFile call) so that unrelated
// Contains-on-real-behavioral-data assertions elsewhere in the same file are not
// misclassified as source-substring violations.
//
// SCOPE NOTE (146-REVIEW WR-01): this guard only detects the os.ReadFile(...".go") variant of
// the anti-pattern. It does NOT detect the closely related, equally forbidden
// self-referential-literal variant found by CR-01 in
// backend/internal/repository/member_archive_repository_test.go (fixed in the same review-fix
// pass this comment was added in): a test that never touches the real source file at all,
// instead hardcoding a "known fragment" string literal *inline in the test* and then asserting
// strings.Contains/assert.Contains/require.Contains against that self-authored literal —
// proving only that the test file is internally consistent with itself, never that the
// production code actually matches. Because this variant never calls os.ReadFile,
// reSourceReadCall never matches and this function returns false for it unconditionally.
// TestNoNewSelfReferentialLiteralAssertions below is a second, independent ratchet guard added
// specifically to catch that variant — see its doc comment for detection scope and known
// blind spots.
func TestNoNewSourceSubstringTests(t *testing.T) {
	allowed := make(map[string]bool, len(LegacyAllowedSubstringTestFiles))
	for _, f := range LegacyAllowedSubstringTestFiles {
		allowed[f] = true
	}

	root := backendRoot(t)

	var violations []string
	err := filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		if !strings.HasSuffix(path, "_test.go") {
			return nil
		}
		content, readErr := os.ReadFile(path)
		if readErr != nil {
			return readErr
		}
		if !hasPresenceStyleSourceSubstringAssertion(string(content)) {
			return nil
		}
		rel, relErr := filepath.Rel(root, path)
		if relErr != nil {
			return relErr
		}
		rel = filepath.ToSlash(rel)
		if !allowed[rel] {
			violations = append(violations, rel)
		}
		return nil
	})
	if err != nil {
		t.Fatalf("walking %s: %v", root, err)
	}

	if len(violations) > 0 {
		sort.Strings(violations)
		t.Errorf("new source-substring test file(s) found outside the frozen LegacyAllowedSubstringTestFiles ratchet list — these files use os.ReadFile on a .go source file to assert PRESENCE of a pattern as a stand-in for behavior, which CLAUDE.md's Teststil-Regel forbids (see also security_relevant_test_files.go and 146-SUBSTRING-TEST-REMAINDER.md). Replace the substring assertion with a real call (httptest for handlers, real Postgres via testsupport.OpenPhase*Postgres for repositories), or — if a genuine new absence-only need requires reading source (CLAUDE.md exception 1) — this scanner should not have flagged it; re-check for an accidental unnegated Contains alongside a negated one in the same file:\n  %s", strings.Join(violations, "\n  "))
	}
}

// LegacyAllowedSelfReferentialLiteralAssertionFiles is the FROZEN, shrink-only ratchet
// exception list for TestNoNewSelfReferentialLiteralAssertions (146-REVIEW WR-01), mirroring
// LegacyAllowedSubstringTestFiles' contract: this list may only SHRINK, never grow, and an
// entry is deleted only when that file is retrofitted to real behavior execution. It starts
// empty because, as of the 146-REVIEW fix pass that added this guard, CR-01's fix removed the
// only known instance of this anti-pattern in the repository and this guard found zero other
// occurrences when run against the full backend/ corpus.
var LegacyAllowedSelfReferentialLiteralAssertionFiles = []string{}

// TestNoNewSelfReferentialLiteralAssertions is a second, independent Criterion-7-style ratchet
// guard added in response to 146-REVIEW's WR-01 finding: TestNoNewSourceSubstringTests above
// only detects the os.ReadFile(...".go") variant of the "false assurance" anti-pattern and
// cannot detect CR-01's variant, where a test never touches the real source file at all and
// instead hardcodes a "known fragment" string literal *inline in the test*, then asserts
// Contains against that self-authored literal — proving only that the test file agrees with
// itself, never that production code matches.
//
// Detection heuristic: within each test function, a variable is "literal-derived" if every
// assignment to it reduces — via a textual fixed point, after removing recognized string/
// backtick literals and other already-known literal-derived variables — to nothing but
// whitespace and "+" concatenation operators (so `x := "a" + "b"`, `y := x + "c"`, and
// `[]string{"a", "b"}` slice literals are literal-derived, but anything touching a function
// call, an unrecognized identifier, or real behavioral data is not). A `for _, v := range
// someLiteralSlice` loop variable inherits literal-derived status from the slice it ranges
// over. The guard then flags any strings.Contains(haystack, needle) or
// (assert|require).Contains(t, haystack, needle) call — WITH OR WITHOUT negation, unlike
// TestNoNewSourceSubstringTests — where both haystack and needle are literal-derived (or the
// needle is itself a raw string/backtick literal). Negation is not exempted here because,
// unlike a negated ReadFile-sourced absence check (which can legitimately prove something is
// absent from real source, per CLAUDE.md exception 1), a negated comparison between two
// self-authored literals proves nothing about production code either way.
//
// Known blind spots (documented rather than silently assumed complete): this regex-based
// heuristic is line-oriented and does not reliably trace multi-line backtick literal
// assignments (a literal whose opening backtick and content span multiple source lines), nor
// does it trace haystack/needle values passed through intermediate function calls, struct
// fields, or map lookups. It is a ratchet against the exact shape of anti-pattern CR-01 found,
// not a general-purpose static prover.
func TestNoNewSelfReferentialLiteralAssertions(t *testing.T) {
	allowed := make(map[string]bool, len(LegacyAllowedSelfReferentialLiteralAssertionFiles))
	for _, f := range LegacyAllowedSelfReferentialLiteralAssertionFiles {
		allowed[f] = true
	}

	root := backendRoot(t)

	var violations []string
	err := filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		if !strings.HasSuffix(path, "_test.go") {
			return nil
		}
		content, readErr := os.ReadFile(path)
		if readErr != nil {
			return readErr
		}
		if !hasSelfReferentialLiteralAssertion(string(content)) {
			return nil
		}
		rel, relErr := filepath.Rel(root, path)
		if relErr != nil {
			return relErr
		}
		rel = filepath.ToSlash(rel)
		if !allowed[rel] {
			violations = append(violations, rel)
		}
		return nil
	})
	if err != nil {
		t.Fatalf("walking %s: %v", root, err)
	}

	if len(violations) > 0 {
		sort.Strings(violations)
		t.Errorf("new self-referential-literal test file(s) found outside the frozen LegacyAllowedSelfReferentialLiteralAssertionFiles ratchet list — these files assert strings.Contains/assert.Contains/require.Contains where both the haystack and needle are string literals hand-authored inside the test function itself (146-REVIEW CR-01/WR-01's anti-pattern), never executing the production code under test, which CLAUDE.md's Teststil-Regel forbids. Replace the assertion with a real call (httptest for handlers, real Postgres via testsupport.OpenPhase*Postgres for repositories):\n  %s", strings.Join(violations, "\n  "))
	}
}

// backendRoot resolves the backend/ module root regardless of the working directory the
// test binary is invoked from (go test always runs with cwd = the package directory, but
// runtime.Caller is used here for robustness against non-standard invocations).
func backendRoot(t *testing.T) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("source_substring_guard_test.go: could not resolve runtime.Caller(0)")
	}
	// file = <backendRoot>/internal/testquality/source_substring_guard_test.go
	root := filepath.Clean(filepath.Join(filepath.Dir(file), "..", ".."))
	if _, err := os.Stat(filepath.Join(root, "go.mod")); err != nil {
		t.Fatalf("resolved backend root %q does not contain go.mod: %v", root, err)
	}
	return root
}

// reSourceReadCall matches os.ReadFile(...) calls whose argument is a string literal ending
// in ".go" (direct or wrapped in filepath.Join(...)) — the exact pattern
// measure-substring-tests.py uses to define "reads .go source" (D-08's reproducible
// baseline).
var reSourceReadCall = regexp.MustCompile(`os\.ReadFile\(\s*"[^"]+\.go"|os\.ReadFile\(\s*filepath\.Join\([^)]*\.go"`)

// reFuncSplit splits a file's source into per-function chunks so variable provenance can be
// traced within a single function body rather than across the whole file (avoiding
// misclassifying an unrelated Contains-on-real-data assertion elsewhere in the file as a
// source-substring violation).
var reFuncSplit = regexp.MustCompile(`(?m)^func `)

// reReadFileAssign captures the byte-slice variable name assigned directly from
// os.ReadFile(...), e.g. `content, err := os.ReadFile("x.go")`.
var reReadFileAssign = regexp.MustCompile(`(?m)^\s*(\w+)\s*,\s*\w+\s*:?=\s*os\.ReadFile\(`)

// reGenericAssign captures any `name := expression` assignment so derived variables (e.g.
// `source := string(content)`, `src := strings.ToLower(string(srcBytes))`) can be traced
// back to a ReadFile-sourced variable via simple textual containment.
var reGenericAssign = regexp.MustCompile(`(?m)^\s*(\w+)\s*:=\s*(.+)$`)

// reRangeAssign captures `for _, name := range expression` loop variables so files that loop
// over a slice of source-derived strings are still traced correctly.
var reRangeAssign = regexp.MustCompile(`(?m)for\s+\w+\s*,\s*(\w+)\s*:=\s*range\s+(.+)$`)

var reNotContainsCall = regexp.MustCompile(`NotContains\(`)
var reAssertFalseContains = regexp.MustCompile(`assert\.False\(\s*t\s*,\s*strings\.Contains\(`)

// hasPresenceStyleSourceSubstringAssertion implements the detection rule documented on
// TestNoNewSourceSubstringTests above.
func hasPresenceStyleSourceSubstringAssertion(content string) bool {
	if !reSourceReadCall.MatchString(content) {
		return false
	}
	for _, fn := range splitIntoFunctions(content) {
		if !reSourceReadCall.MatchString(fn) {
			continue
		}
		sourceVars := traceSourceDerivedVars(fn)
		if len(sourceVars) == 0 {
			continue
		}
		var quoted []string
		for v := range sourceVars {
			quoted = append(quoted, regexp.QuoteMeta(v))
		}
		varAlt := strings.Join(quoted, "|")
		reDirectContains := regexp.MustCompile(`(?:assert|require)\.Contains\(\s*t\s*,\s*(?:` + varAlt + `)\b`)
		reAssertTrueContains := regexp.MustCompile(`assert\.True\(\s*t\s*,\s*strings\.Contains\(\s*(?:` + varAlt + `)\b`)
		reNegatedContains := regexp.MustCompile(`!\s*strings\.Contains\(\s*(?:` + varAlt + `)\b`)

		for _, line := range strings.Split(fn, "\n") {
			trimmed := strings.TrimSpace(line)
			if reNotContainsCall.MatchString(trimmed) || reAssertFalseContains.MatchString(trimmed) {
				continue
			}
			if reDirectContains.MatchString(trimmed) || reAssertTrueContains.MatchString(trimmed) || reNegatedContains.MatchString(trimmed) {
				return true
			}
		}
	}
	return false
}

func splitIntoFunctions(content string) []string {
	idxs := reFuncSplit.FindAllStringIndex(content, -1)
	if len(idxs) == 0 {
		return []string{content}
	}
	funcs := make([]string, 0, len(idxs))
	for i, idx := range idxs {
		start := idx[0]
		end := len(content)
		if i+1 < len(idxs) {
			end = idxs[i+1][0]
		}
		funcs = append(funcs, content[start:end])
	}
	return funcs
}

func traceSourceDerivedVars(fn string) map[string]bool {
	vars := map[string]bool{}
	for _, m := range reReadFileAssign.FindAllStringSubmatch(fn, -1) {
		vars[m[1]] = true
	}
	if len(vars) == 0 {
		return vars
	}
	changed := true
	for changed {
		changed = false
		for _, m := range reGenericAssign.FindAllStringSubmatch(fn, -1) {
			lhs, rhs := m[1], m[2]
			if vars[lhs] {
				continue
			}
			for v := range vars {
				if regexp.MustCompile(`\b` + regexp.QuoteMeta(v) + `\b`).MatchString(rhs) {
					vars[lhs] = true
					changed = true
					break
				}
			}
		}
		for _, m := range reRangeAssign.FindAllStringSubmatch(fn, -1) {
			lhs, rhs := m[1], m[2]
			if vars[lhs] {
				continue
			}
			for v := range vars {
				if strings.Contains(rhs, v) {
					vars[lhs] = true
					changed = true
					break
				}
			}
		}
	}
	return vars
}

// reAnyStringLiteral matches a complete double-quoted Go string literal (with escapes) or a
// single-line backtick raw-string literal. Used by isPureLiteralOrKnownVarsExpr to strip
// literal content out of an expression before checking whether anything non-literal remains.
var reAnyStringLiteral = regexp.MustCompile("\"(?:[^\"\\\\]|\\\\.)*\"|`[^`\n]*`")

// reStringSliceLiteral matches a `[]string{ ... }` slice literal (single line or spanning
// multiple lines) so its elements can be checked independently for literal-only content.
var reStringSliceLiteral = regexp.MustCompile(`(?s)^\[\]string\s*\{(.*)\}$`)

// rePlusOrSpaceOnly matches a residual expression, after literals and known literal-derived
// identifiers have been stripped out, that contains nothing but whitespace and "+"
// concatenation operators — i.e. nothing that could be a function call or foreign identifier.
var rePlusOrSpaceOnly = regexp.MustCompile(`^[\s+]*$`)

// isPureLiteralOrKnownVarsExpr reports whether expr is built entirely out of string/backtick
// literals, "+" concatenation, and identifiers already known to be literal-derived (via
// literalVars) — e.g. `"a" + "b"`, a bare backtick literal, `x + "c"` where x is already
// literal-derived, or a `[]string{"a", "b"}` slice literal whose elements are all literals.
// Any function call, unrecognized identifier, or other operator makes this return false.
func isPureLiteralOrKnownVarsExpr(expr string, literalVars map[string]bool) bool {
	trimmed := strings.TrimSpace(expr)
	if m := reStringSliceLiteral.FindStringSubmatch(trimmed); m != nil {
		inner := reAnyStringLiteral.ReplaceAllString(m[1], "")
		inner = strings.ReplaceAll(inner, ",", "")
		return rePlusOrSpaceOnly.MatchString(inner)
	}
	stripped := reAnyStringLiteral.ReplaceAllString(trimmed, "")
	for v := range literalVars {
		stripped = regexp.MustCompile(`\b`+regexp.QuoteMeta(v)+`\b`).ReplaceAllString(stripped, "")
	}
	return rePlusOrSpaceOnly.MatchString(stripped)
}

// traceLiteralDerivedVars finds every variable within a single function body whose value is,
// via a textual fixed point, composed entirely of string/backtick literals and other
// literal-derived variables (see isPureLiteralOrKnownVarsExpr), including range-loop variables
// that iterate over a literal-derived slice. Mirrors traceSourceDerivedVars's fixed-point
// shape but is rooted in literal origin instead of an os.ReadFile call.
func traceLiteralDerivedVars(fn string) map[string]bool {
	vars := map[string]bool{}
	changed := true
	for changed {
		changed = false
		for _, m := range reGenericAssign.FindAllStringSubmatch(fn, -1) {
			lhs, rhs := m[1], m[2]
			if vars[lhs] {
				continue
			}
			if isPureLiteralOrKnownVarsExpr(rhs, vars) {
				vars[lhs] = true
				changed = true
			}
		}
		for _, m := range reRangeAssign.FindAllStringSubmatch(fn, -1) {
			lhs, rhs := m[1], m[2]
			if vars[lhs] {
				continue
			}
			for v := range vars {
				if regexp.MustCompile(`\b`+regexp.QuoteMeta(v)+`\b`).MatchString(rhs) {
					vars[lhs] = true
					changed = true
					break
				}
			}
		}
	}
	return vars
}

// reStringsContainsCall matches strings.Contains(haystack, needle) where both arguments are
// bare identifiers.
var reStringsContainsCall = regexp.MustCompile(`strings\.Contains\(\s*(\w+)\s*,\s*(\w+)\s*\)`)

// reStringsContainsLiteralNeedle matches strings.Contains(haystack, "literal"/`literal`) where
// the needle is a raw literal rather than an identifier.
var reStringsContainsLiteralNeedle = regexp.MustCompile("strings\\.Contains\\(\\s*(\\w+)\\s*,\\s*(\"(?:[^\"\\\\]|\\\\.)*\"|`[^`\n]*`)\\s*\\)")

// reAssertRequireContainsCall matches (assert|require).Contains(t, haystack, needle) where both
// the container and element arguments are bare identifiers.
var reAssertRequireContainsCall = regexp.MustCompile(`(?:assert|require)\.Contains\(\s*t\s*,\s*(\w+)\s*,\s*(\w+)\s*\)`)

// reAssertRequireContainsLiteralNeedle matches (assert|require).Contains(t, haystack,
// "literal"/`literal`) where the element argument is a raw literal rather than an identifier.
var reAssertRequireContainsLiteralNeedle = regexp.MustCompile("(?:assert|require)\\.Contains\\(\\s*t\\s*,\\s*(\\w+)\\s*,\\s*(\"(?:[^\"\\\\]|\\\\.)*\"|`[^`\n]*`)\\s*\\)")

// hasSelfReferentialLiteralAssertion implements the detection rule documented on
// TestNoNewSelfReferentialLiteralAssertions above.
func hasSelfReferentialLiteralAssertion(content string) bool {
	for _, fn := range splitIntoFunctions(content) {
		literalVars := traceLiteralDerivedVars(fn)
		if len(literalVars) == 0 {
			continue
		}
		for _, m := range reStringsContainsCall.FindAllStringSubmatch(fn, -1) {
			if literalVars[m[1]] && literalVars[m[2]] {
				return true
			}
		}
		for _, m := range reAssertRequireContainsCall.FindAllStringSubmatch(fn, -1) {
			if literalVars[m[1]] && literalVars[m[2]] {
				return true
			}
		}
		for _, m := range reStringsContainsLiteralNeedle.FindAllStringSubmatch(fn, -1) {
			if literalVars[m[1]] {
				return true
			}
		}
		for _, m := range reAssertRequireContainsLiteralNeedle.FindAllStringSubmatch(fn, -1) {
			if literalVars[m[1]] {
				return true
			}
		}
	}
	return false
}
