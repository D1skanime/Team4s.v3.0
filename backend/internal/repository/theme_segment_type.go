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
// Die Praezedenz (OP vor ED vor INSERT vor KARA vor dem UPPER(themeTypeName)-
// Fallback) ist ein 1:1-Port der ersetzten SQL-CASE-Anweisung -- identische
// Substring-Semantik, identische Top-nach-unten-Auswertungsreihenfolge.
func CanonicalSegmentType(themeTypeName string) string {
	lower := strings.ToLower(themeTypeName)
	switch {
	case strings.Contains(lower, "op") || strings.Contains(lower, "opening"):
		return "OP"
	case strings.Contains(lower, "ed") || strings.Contains(lower, "ending") || strings.Contains(lower, "outro"):
		return "ED"
	case strings.Contains(lower, "insert"):
		return "INSERT"
	case strings.Contains(lower, "kara"):
		return "KARA"
	default:
		return strings.ToUpper(themeTypeName)
	}
}
