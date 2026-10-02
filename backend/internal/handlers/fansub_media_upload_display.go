package handlers

// Diese Datei haelt die Fansub-Display-Varianten-Verdrahtung getrennt von
// fansub_media_upload.go (bereits ueber 450 Zeilen, CLAUDE.md-Limit) -- analog zum
// 173-02/173-03-Muster (admin_content_release_version_media_display.go /
// admin_content_release_version_media_replace_display.go).
//
// Die eigentliche Erzeugung der "display"-Variante passiert bereits einmalig in
// services.MediaService.SaveUpload (Phase 173 Review-Korrektur: EINE gemeinsame
// Erzeugungs-/Kodierlogik fuer alle statischen Schreibpfade). Fuer Fansub-Logo/Banner UND
// Fansub-Gruppenmedien (beide rufen SaveUpload auf) reicht es daher, die von SaveUpload bereits
// erzeugte(n) Variante(n) in media_files zu persistieren -- kein zweiter generateRVMDisplay-
// Aufruf, keine zweite Resize/Encode-Implementierung.

import (
	"context"

	"team4s.v3/backend/internal/services"
)

// firstFansubDisplayVariant liefert die erste "display"-Variante aus einem SaveUpload-Ergebnis
// (es gibt pro Upload hoechstens eine), oder nil, wenn keine erzeugt wurde (z. B. SVG-Logo).
func firstFansubDisplayVariant(variants []services.MediaVariantSaveResult) *services.MediaVariantSaveResult {
	for i := range variants {
		if variants[i].Variant == "display" {
			return &variants[i]
		}
	}
	return nil
}

// persistFansubMediaDisplayVariants inserted media_files-Zeilen fuer jede von SaveUpload
// erzeugte Variante (aktuell hoechstens "display") zu einem bereits angelegten Fansub-
// Logo/Banner-Asset. Wird fuer SVG-Logos (keine Variante) als No-Op durchlaufen.
func (h *FansubHandler) persistFansubMediaDisplayVariants(ctx context.Context, mediaAssetID int64, variants []services.MediaVariantSaveResult) error {
	reqCtx := ctx
	for _, variant := range variants {
		if variant.Variant == "" {
			continue
		}
		if err := h.mediaRepo.InsertMediaFile(reqCtx, mediaAssetID, variant.Variant, variant.StoragePath, variant.SizeBytes); err != nil {
			return err
		}
	}
	return nil
}
