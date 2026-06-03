package services

// Dieses File war Platzhalter fuer Wave-0-Stubs (Plan 70-01).
// RenderHTMLWithResolver und NewTipTapSanitizerPolicy sind seit Plan 70-03
// vollstaendig in tiptap_service.go implementiert.

import "github.com/microcosm-cc/bluemonday"

// NewTipTapSanitizerPolicy gibt die interne bluemonday-Policy zurueck (exportiert fuer Tests).
// Die Policy enthaelt seit Plan 70-03 volle img-Unterstuetzung mit src/style/class-Regex.
func NewTipTapSanitizerPolicy() *bluemonday.Policy {
	return newTipTapSanitizerPolicy()
}
