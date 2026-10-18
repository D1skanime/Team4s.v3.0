package services

import (
	"sort"
	"strings"
)

// FieldTakeoverAction (quick-261018-l5r Task 2) ist das Ergebnis der Entscheidung, was mit EINEM
// Übernahme-Feld beim additiven AniSearch-Link passieren soll -- siehe ResolveFieldTakeover.
type FieldTakeoverAction string

const (
	// FieldTakeoverKeep: der bestehende Wert bleibt unangetastet (manuell gepflegt oder AniSearch
	// liefert nichts).
	FieldTakeoverKeep FieldTakeoverAction = "keep"
	// FieldTakeoverFill: das Feld war leer und wird mit dem AniSearch-Wert befüllt.
	FieldTakeoverFill FieldTakeoverAction = "fill"
	// FieldTakeoverReplace: der bestehende Wert stammte erkennbar von Jellyfin und wird durch den
	// autoritativeren AniSearch-Wert ersetzt.
	FieldTakeoverReplace FieldTakeoverAction = "replace"
)

// FieldTakeoverResult ist die Entscheidung für ein einzelnes Feld inklusive einer für Audit-Log
// und Admin-UI lesbaren Begründung.
type FieldTakeoverResult struct {
	Action FieldTakeoverAction
	Reason string
}

// ResolveFieldTakeover entscheidet, was mit EINEM Übernahme-Feld geschehen soll (siehe PLAN.md
// <the_rule>). currentValue ist der bestehende Anime-Wert, bereits vom Aufrufer in eine
// vergleichbare kanonische Form normalisiert (getrimmt, für Skalare kleingeschrieben, für
// Listenfelder ein sortierter/deduplizierter/kleingeschriebener Schlüssel --
// NormalizeScalarForComparison/NormalizeListForComparison). jellyfinValue ist nil, wenn für dieses
// Feld KEIN Jellyfin-Vergleichswert existiert (kein Jellyfin-Link am Anime, der Live-Lookup ist
// fehlgeschlagen, oder das Feld hat grundsätzlich kein Jellyfin-Äquivalent) -- niemals ein
// Leerstring-Sentinel, damit "kein Vergleich möglich" von "Jellyfin-Wert ist zufällig leer"
// unterscheidbar bleibt. aniSearchHasValue ist false, wenn AniSearch für dieses Feld überhaupt
// keinen Wert liefert (unabhängig vom aktuellen Zustand gibt es dann nichts zu übernehmen).
func ResolveFieldTakeover(currentValue string, jellyfinValue *string, aniSearchHasValue bool) FieldTakeoverResult {
	if !aniSearchHasValue {
		return FieldTakeoverResult{Action: FieldTakeoverKeep, Reason: "AniSearch liefert keinen Wert für dieses Feld"}
	}
	if currentValue == "" {
		return FieldTakeoverResult{Action: FieldTakeoverFill, Reason: "Feld war leer"}
	}
	if jellyfinValue != nil && currentValue == *jellyfinValue {
		return FieldTakeoverResult{Action: FieldTakeoverReplace, Reason: "Stammte von Jellyfin"}
	}
	if jellyfinValue == nil {
		return FieldTakeoverResult{Action: FieldTakeoverKeep, Reason: "Kein Jellyfin-Vergleichswert verfügbar, Feld bleibt geschützt"}
	}
	return FieldTakeoverResult{Action: FieldTakeoverKeep, Reason: "Weicht von Jellyfin ab, gilt als manuell gepflegt"}
}

// NormalizeScalarForComparison bringt einen Skalarwert (Jahr-als-String, Beschreibung, Titel ...)
// in eine vergleichbare kanonische Form: getrimmt, kleingeschrieben. Deutscher Text braucht hier
// kein volles Unicode-Casefolding, strings.ToLower reicht für die Domäne dieses Features.
func NormalizeScalarForComparison(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

// aniSearchFieldTakeoverListSeparator trennt Elemente im kanonischen Listen-Schlüssel.
// "\x1f" (ASCII Unit Separator) statt "|", weil "|" in einem echten Genre-/Tag-Namen vorkommen
// könnte und dann fälschlich zwei Elemente zu einem verschmelzen würde (dieselbe
// Pipe-Kollisions-Erkenntnis, die bereits für das Frontend-Pendant fansubGroupsValueKey
// dokumentiert ist).
const aniSearchFieldTakeoverListSeparator = "\x1f"

// NormalizeListForComparison bringt eine Genre-/Tag-Liste in einen ordnungsunabhängigen
// kanonischen Vergleichs-Schlüssel: pro Element getrimmt+kleingeschrieben, Leer-Elemente
// entfernt, dedupliziert, sortiert, mit einem Trennzeichen verbunden, das in keinem echten
// Genre-/Tag-Namen vorkommen kann.
func NormalizeListForComparison(values []string) string {
	seen := make(map[string]struct{}, len(values))
	normalized := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.ToLower(strings.TrimSpace(value))
		if trimmed == "" {
			continue
		}
		if _, exists := seen[trimmed]; exists {
			continue
		}
		seen[trimmed] = struct{}{}
		normalized = append(normalized, trimmed)
	}

	sort.Strings(normalized)
	return strings.Join(normalized, aniSearchFieldTakeoverListSeparator)
}

// ResolveAniSearchTypeTakeoverValue ermittelt, ob AniSearch für das "type"-Feld überhaupt einen
// nutzbaren Wert liefert, und mappt ihn -- falls ja -- über die bestehende, bereits etablierte
// mapAniSearchFormatToAnimeType-Funktion (anime_create_enrichment.go) auf den Team4s-Typ-Wert.
// hasValue=false bedeutet: AniSearch hat kein Format geliefert, der fallback-Wert "tv" von
// mapAniSearchFormatToAnimeType darf dann NICHT fälschlich als "AniSearch sagt tv" interpretiert
// werden.
func ResolveAniSearchTypeTakeoverValue(format *string) (value string, hasValue bool) {
	if format == nil || strings.TrimSpace(*format) == "" {
		return "", false
	}
	return mapAniSearchFormatToAnimeType(format), true
}
