package models

// EpisodeMetadataSourceManual kennzeichnet einen vom Admin gesetzten Wert.
// Ein normaler Reimport überschreibt solche Werte nicht.
const EpisodeMetadataSourceManual = "manual"

// EpisodeMetadataSourceImport kennzeichnet einen beim Episoden-Import
// automatisch abgeleiteten Wert (z.B. episode_type_id aus anime.type,
// GAP-12). Unterscheidet sich bewusst von EpisodeMetadataSourceManual, damit
// ein späterer Reimport ihn weiterhin überschreiben darf.
const EpisodeMetadataSourceImport = "import"

// EpisodeFillerTypeNames sind die gültigen Canon/Filler-Einstufungen
// (Lookup episode_filler_types).
var EpisodeFillerTypeNames = []string{"unknown", "canon", "filler", "mixed", "recap"}

// EpisodeTypeNames sind die gültigen technischen Episodentypen
// (Lookup episode_types). "recap" existiert hier und bei den Filler-Typen
// bewusst getrennt; es gibt keine Kopplung zwischen beiden Dimensionen.
var EpisodeTypeNames = []string{
	"episode", "special", "ova", "ona", "movie",
	"recap", "preview", "prologue", "epilogue", "bonus",
}

// EpisodeClassification ist die episode-eigene Einstufung. Sie existiert genau
// einmal pro Episode und gilt für alle Release-Versionen dieser Episode.
type EpisodeClassification struct {
	EpisodeID         int64   `json:"episode_id"`
	EpisodeNumber     string  `json:"episode_number"`
	FillerType        *string `json:"filler_type"`
	FillerTypeSource  *string `json:"filler_type_source"`
	EpisodeType       *string `json:"episode_type"`
	EpisodeTypeSource *string `json:"episode_type_source"`
}

// IsValidEpisodeFillerType prüft einen Canon/Filler-Wert exakt gegen die Allowlist.
func IsValidEpisodeFillerType(name string) bool {
	return containsExact(EpisodeFillerTypeNames, name)
}

// IsValidEpisodeType prüft einen Episodentyp exakt gegen die Allowlist.
func IsValidEpisodeType(name string) bool {
	return containsExact(EpisodeTypeNames, name)
}

func containsExact(values []string, candidate string) bool {
	for _, value := range values {
		if value == candidate {
			return true
		}
	}
	return false
}
