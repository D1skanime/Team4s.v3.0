package repository

import "strings"

// CanonicalSegmentType ist die EINZIGE kanonische Segmenttyp-Ableitung fuer
// Phase 156 (P156-10/P156-15). Sie ersetzt die SQL-`CASE ... LIKE`-Heuristik,
// die zuvor in attachReleaseTimelineSegments (Projektseite,
// group_repository_cursor.go) dupliziert war, und die parallele
// Frontend-Typwelt in ThemeTimeline.tsx (Release-Seite). Sowohl
// attachReleaseTimelineSegments (dieser Plan, 156-06) als auch
// loadReleaseSegments (Plan 156-07) konsumieren diese Funktion -- sobald beide
// Konsumenten-Plaene gelandet sind, darf keine SQL-LIKE-Klassifikation und
// keine Frontend-Typwelt mehr parallel existieren.
//
// Die Praezedenz (OP vor INSERT vor ED vor KARA vor dem UPPER(themeTypeName)-
// Fallback) stellt sicher, dass zusammengesetzte Insert-Namen wie
// "Insert-Lied" nicht wegen des Teilstrings "ed" als ED klassifiziert werden.
func CanonicalSegmentType(themeTypeName string) string {
	lower := strings.ToLower(themeTypeName)
	switch {
	case strings.Contains(lower, "op") || strings.Contains(lower, "opening"):
		return "OP"
	case strings.Contains(lower, "insert"):
		return "INSERT"
	case strings.Contains(lower, "ed") || strings.Contains(lower, "ending") || strings.Contains(lower, "outro"):
		return "ED"
	case strings.Contains(lower, "kara"):
		return "KARA"
	default:
		return strings.ToUpper(themeTypeName)
	}
}

// CanonicalSegmentTypeFromKuerzel is the kuerzel-driven segment type classifier added by
// the 2026-10-07 D-01 backend follow-up (Live-UAT checkpoint fix on 176-02): theme_types.kuerzel
// (OP/ED/IN/OUT, Migration 0179) is now the single source of truth for every live theme_types
// row, replacing CanonicalSegmentType's substring-guessing at all its call sites. A present
// kuerzel wins and maps to the SAME public vocabulary the old name-guessing already produced
// for OP/ED (unchanged) and IN (mapped to "INSERT", the pre-existing public contract value --
// NOT the raw "IN" kuerzel, to avoid an unrelated public-contract break) -- except OUT, which is
// the actual bug fix: Outro now gets its own "OUT" value instead of colliding with ED (the old
// name-guess treated "outro" as a substring match for "ed"). A missing/unseeded kuerzel (test
// fixtures that only set theme_types.name, or any future row inserted before a kuerzel
// backfill) falls back to the legacy name-guessing above, so pre-existing behavior and tests
// for those rows stay unchanged.
func CanonicalSegmentTypeFromKuerzel(kuerzel, themeTypeName string) string {
	switch strings.ToUpper(strings.TrimSpace(kuerzel)) {
	case "OP":
		return "OP"
	case "ED":
		return "ED"
	case "IN":
		return "INSERT"
	case "OUT":
		return "OUT"
	}
	return CanonicalSegmentType(themeTypeName)
}
