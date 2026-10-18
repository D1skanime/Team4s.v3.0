package services

import (
	"strconv"

	"github.com/nssteinbrenner/anitogo"
)

// ReleaseFilenameParseResult ist das projekteigene Ergebnis einer
// Dateinamen-Analyse. anitogo-Typen (anitogo.Elements etc.) überschreiten
// diese Grenze absichtlich nie -- so bleibt ein späterer Parser-Wechsel (z. B.
// zu einem anderen Drittanbieter oder einer Eigenimplementierung) ein reiner
// Austausch der konkreten Implementierung ohne Call-Site-Umbau.
type ReleaseFilenameParseResult struct {
	EpisodeNumber *int32
	// EpisodeNumberEnd ist nur gesetzt, wenn der Dateiname eine Multi-Episode-
	// Range kodiert (z. B. "01-02", "01~02") -- anitogo liefert dafür BEIDE
	// Grenzen in elements.EpisodeNumber (Index 0 = Start, letzter Index =
	// Ende). Bei einer einzelnen Episode bleibt das Feld nil.
	EpisodeNumberEnd *int32
	Checksum         string
}

// ReleaseFilenameParser ist die Schnittstelle für die Episodennummer-/
// Checksum-Erkennung aus Release-Dateinamen. Eine austauschbare
// Implementierung (aktuell anitogo-basiert) wird hinter dieser Schnittstelle
// verborgen, mirror des bestehenden Mailer/SMTPMailer-Musters in mailer.go:
// Aufrufer kennen nur ParseFilename, nie die konkrete Drittanbieter-API.
type ReleaseFilenameParser interface {
	ParseFilename(fileName string) (ReleaseFilenameParseResult, bool)
}

// AnitogoReleaseFilenameParser ist der aktuelle anitogo-gestützte
// ReleaseFilenameParser.
//
// Lizenzhinweis (MPL-2.0): github.com/nssteinbrenner/anitogo steht unter der
// Mozilla Public License 2.0 (dateibasiertes Copyleft). Es wird unverändert
// als Abhängigkeit genutzt, was dem eigenen Projektcode keine Pflichten
// auferlegt -- MPL-2.0 verlangt nur, dass Änderungen an den MPL-Dateien
// selbst (falls es sie gäbe) unter derselben Lizenz offengelegt werden.
// Team4s ist ein rein internes, nicht verteiltes Admin-Tool, daher ist die
// praktische Relevanz gering. Dieser Hinweis dokumentiert die Abhängigkeit,
// da im Repo kein projektweites NOTICE/THIRD-PARTY-Verzeichnis existiert.
type AnitogoReleaseFilenameParser struct{}

// NewAnitogoReleaseFilenameParser erstellt einen AnitogoReleaseFilenameParser.
func NewAnitogoReleaseFilenameParser() *AnitogoReleaseFilenameParser {
	return &AnitogoReleaseFilenameParser{}
}

var _ ReleaseFilenameParser = (*AnitogoReleaseFilenameParser)(nil)

// ParseFilename analysiert einen Release-Dateinamen über anitogo und liefert
// die Episodennummer sowie eine ggf. erkannte Checksum (CRC-Tag). Eine
// Checksum landet niemals im EpisodeNumber-Feld -- das ist exakt der Bug
// (Finding #15), den dieser Parser ersetzt.
func (p *AnitogoReleaseFilenameParser) ParseFilename(fileName string) (ReleaseFilenameParseResult, bool) {
	elements := anitogo.Parse(fileName, anitogo.DefaultOptions)
	if elements == nil || len(elements.EpisodeNumber) == 0 {
		return ReleaseFilenameParseResult{}, false
	}
	episode, err := strconv.Atoi(elements.EpisodeNumber[0])
	if err != nil || episode <= 0 {
		return ReleaseFilenameParseResult{}, false
	}
	episodeValue := int32(episode)
	result := ReleaseFilenameParseResult{
		EpisodeNumber: &episodeValue,
		Checksum:      elements.FileChecksum,
	}
	if len(elements.EpisodeNumber) > 1 {
		if rangeEnd, err := strconv.Atoi(elements.EpisodeNumber[len(elements.EpisodeNumber)-1]); err == nil && int32(rangeEnd) > episodeValue {
			rangeEndValue := int32(rangeEnd)
			result.EpisodeNumberEnd = &rangeEndValue
		}
	}
	return result, true
}
