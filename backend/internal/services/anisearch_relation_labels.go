package services

import "strings"

// aniSearchRelationMapping beschreibt, auf welches Team4s-Relationslabel ein
// aniSearch-Legendenbegriff abgebildet wird. Das Label beschreibt immer das
// Ziel-Anime aus Sicht des aktuell importierten Anime:
//   - Outgoing: die aniSearch-Kante zeigt vom aktuellen Anime zum Ziel.
//   - Incoming: die aniSearch-Kante zeigt vom Ziel zum aktuellen Anime.
//
// Ein leerer Wert bedeutet: diese Richtung wird bewusst nicht importiert.
type aniSearchRelationMapping struct {
	Outgoing string
	Incoming string
}

// aniSearchRelationLabels ist die einzige Stelle, an der aniSearch-Begriffe
// auf die vier Team4s-Relationslabels abgebildet werden. Nicht gelistete
// Begriffe (z. B. "Prequel", "Remake", "Crossover") erzeugen keine Relation.
//
// "Alternative Version" wird fachlich bewusst als "Nebengeschichte" geführt
// (gröbere Team4s-Taxonomie); der DB-Seed "alternative-version" bleibt
// ungenutzt. Das Mapping betrifft ausschließlich Relationen und leitet keine
// Canon-/Filler-Einstufung ab.
var aniSearchRelationLabels = map[string]aniSearchRelationMapping{
	"Sequel":              {Outgoing: "Fortsetzung", Incoming: "Hauptgeschichte"},
	"Nebengeschichte":     {Outgoing: "Nebengeschichte", Incoming: "Hauptgeschichte"},
	"Hauptgeschichte":     {Outgoing: "Hauptgeschichte", Incoming: "Nebengeschichte"},
	"Zusammenfassung":     {Outgoing: "Zusammenfassung"},
	"Alternative Version": {Outgoing: "Nebengeschichte", Incoming: "Nebengeschichte"},
}

// resolveAniSearchRelationLabel liefert das Team4s-Label für einen
// aniSearch-Begriff in der gegebenen Kantenrichtung, oder "" wenn der Begriff
// unbekannt ist bzw. in dieser Richtung nicht importiert wird.
func resolveAniSearchRelationLabel(relationName string, outgoing bool) string {
	mapping, ok := aniSearchRelationLabels[strings.TrimSpace(relationName)]
	if !ok {
		return ""
	}
	if outgoing {
		return mapping.Outgoing
	}
	return mapping.Incoming
}
