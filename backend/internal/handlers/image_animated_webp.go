package handlers

import (
	"fmt"

	"team4s.v3/backend/internal/services"
)

// animatedWebPMessage ist die Antwort fuer animierte WebP-Dateien beim Kara-Vorschaubild
// (asset_type=segment_preview). D-20 (Nutzervorgabe 2026-10-02): diese Ablehnung gilt NUR noch
// fuer segment_preview -- alle anderen Bildpfade (Release-Galerie, Fansub-/Gruppenmedien,
// Avatare, Profil-Bilder) akzeptieren animierte WebP und erzeugen eine animierte "display"-
// Variante via vipsthumbnail (D-21, services.GenerateAnimatedDisplayViaVips).
const animatedWebPMessage = "Animierte WebP-Dateien werden für Kara-Vorschaubilder nicht unterstützt. Bitte JPG, PNG oder ein nicht animiertes WebP hochladen."

// isAnimatedWebP erkennt animierte WebP-Dateien am Dateikopf. Duenner Wrapper um die zentrale
// services.IsAnimatedWebPData-Implementierung (geteilt mit der Display-/Thumb-Erzeugung).
func isAnimatedWebP(head []byte) bool {
	return services.IsAnimatedWebPData(head)
}

// rvmFileRejection prueft den Dateityp fuer Release-Medien (Upload und Ersetzen). Animierte WebP
// werden seit D-20 NICHT mehr abgelehnt: Release-Version-Media kennt keinen asset_type=
// segment_preview (das Kara-Vorschaubild laeuft ausschliesslich ueber den globalen Uploader,
// media_upload.go), die Ablehnung galt hier also schon immer ueber die eigentliche
// Zielgruppe (Kara) hinaus. rejected=false bedeutet: Datei ist erlaubt.
func rvmFileRejection(mimeType string, data []byte) (message string, code string, rejected bool) {
	_ = data
	if !rvmAllowedMIMETypes[mimeType] {
		return fmt.Sprintf("nicht erlaubter dateityp: %s", mimeType), "INVALID_MIME_TYPE", true
	}
	return "", "", false
}
