package repository

import (
	"regexp"
	"strconv"
	"strings"
)

// GAP-24, 165-UAT.md, Auftraggeber-Entscheidung 2026-09-23: einzige
// Go-Implementierung der Platzhalter-/Einteiler-Erkennung, aufgerufen von
// episode_import_repository_apply.go (Import-Zeit). public_release_name.go
// kann dieselbe Regex-Logik nicht direkt wiederverwenden (Go-`regexp` vs.
// Postgres-`~*`, zwei verschiedene Regex-Engines) -- episodeTitlePlaceholderSQL/
// einteilerEpisodeSQL dort sind eine bewusst duplizierte, aber fallidentische
// Postgres-Fassung mit Querverweis-Kommentar zurück auf diese Datei.

// placeholderEpisodeTitlePattern erkennt eine der vier Präfixformen
// "episode"/"folge"/"ep"/"ep." (case-insensitiv), gefolgt von optionalem
// Leerraum und optional führenden Nullen vor einer Nummer, verankert an
// Anfang UND Ende des (getrimmten) Strings. Die Nummer-Gruppe ist optional --
// leer für die bloße Form ohne Nummer ("Episode", "Folge", "Ep.").
var placeholderEpisodeTitlePattern = regexp.MustCompile(`(?i)^(?:episode|folge|ep\.?)\s*0*([0-9]*)$`)

// isPlaceholderEpisodeTitle meldet, ob title ein AniSearch-Platzhaltertitel
// wie "Episode 1"/"Folge 01"/"Ep. 1"/"Episode" (ohne Nummer) ist -- case-
// insensitiv, mit/ohne führende Nullen, mit/ohne Punkt, mit/ohne Leerzeichen.
// Trägt die Platzhalterform eine Nummer, muss sie exakt episodeNumber
// entsprechen, sonst ist es kein Treffer (z. B. "Episode 2" bei
// episodeNumber=1). Ein echter Titel wie "Parody Mode" oder "Episode of the
// Sun" matched das Pattern nicht und liefert false.
func isPlaceholderEpisodeTitle(title string, episodeNumber int32) bool {
	trimmed := strings.TrimSpace(title)
	if trimmed == "" {
		return false
	}
	matches := placeholderEpisodeTitlePattern.FindStringSubmatch(trimmed)
	if matches == nil {
		return false
	}
	numberGroup := matches[1]
	if numberGroup == "" {
		return true
	}
	parsed, err := strconv.Atoi(numberGroup)
	if err != nil {
		return false
	}
	return int32(parsed) == episodeNumber
}

// isEinteilerAnimeType meldet, ob ein Anime vom übergebenen Typ mit der
// übergebenen kanonischen Episodenmenge ein "Einteiler" im Sinne der
// Auftraggeber-Entscheidung 2026-09-23 ist: "film" ist immer ein Einteiler
// (unabhängig von totalEpisodeCount); "ova"/"ona"/"special"/"bonus" sind es
// nur, wenn die kanonische Episodenmenge genau 1 Episode umfasst; "tv" und
// jeder unbekannte/leere animeType-Wert sind es nie.
func isEinteilerAnimeType(animeType string, totalEpisodeCount int) bool {
	switch animeType {
	case "film":
		return true
	case "ova", "ona", "special", "bonus":
		return totalEpisodeCount == 1
	default:
		return false
	}
}
