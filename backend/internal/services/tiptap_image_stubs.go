package services

// Dieses File enthaelt vorlaeufige Stubs fuer die Phase-70-Implementierung.
// RenderHTMLWithResolver und NewTipTapSanitizerPolicy werden in Plan 70-03 vollstaendig implementiert.
// Die Stubs existieren damit Wave-0-Tests kompilieren und als FAIL (nicht build-Fehler) ausfuehren.

import "github.com/microcosm-cc/bluemonday"

// RenderHTMLWithResolver ist ein Stub fuer den in Plan 70-03 implementierten Renderer
// mit Asset-URL-Resolver. Bis zur Implementierung liefert er dasselbe Ergebnis wie RenderHTML
// (kein image-Node-Support), damit Wave-0-Tests rot sind.
//
// TODO(plan-70-03): vollstaendig implementieren: image-Nodes per resolver aufloesen,
// <img src="..." style="width:N%" class="story-img-align-NNN"> erzeugen.
func (s *TipTapService) RenderHTMLWithResolver(input string, resolver func(int64) (string, bool)) (string, error) {
	// Stub: ignoriert resolver, delegate an RenderHTML — image-Nodes werden nicht gerendert
	return s.RenderHTML(input)
}

// NewTipTapSanitizerPolicy gibt die interne bluemonday-Policy zurueck (exportiert fuer Tests).
// In Plan 70-03 wird diese Policy um img-Erlaubnis erweitert.
func NewTipTapSanitizerPolicy() *bluemonday.Policy {
	return newTipTapSanitizerPolicy()
}
