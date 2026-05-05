# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## logo-upload-png-to-jpg-transparency-loss — PNG-Logos werden beim Upload als JPG gespeichert, Transparenz geht verloren
- **Date:** 2026-05-05
- **Error patterns:** PNG, JPG, transparency, logo upload, imaging.Save, hardcoded extension, alpha channel, format conversion
- **Root cause:** In `backend/internal/handlers/media_upload_image.go` waren `originalPath` und `thumbPath` auf `"original.jpg"` / `"thumb.jpg"` hardcoded. Die `imaging`-Bibliothek inferiert das Ausgabeformat aus der Dateiendung — deshalb wurde jedes Bild (auch PNG) als JPEG gespeichert. PNG-Transparenz (Alphakanal) ging bei der JPEG-Konvertierung verloren.
- **Fix:** Hilfsfunktion `imageExtFromMime()` eingeführt; Dateinamen dynamisch aus `mimeType` abgeleitet (`original.png`/`thumb.png` für PNG, `original.webp`/`thumb.webp` für WebP, `original.jpg`/`thumb.jpg` für JPEG). `imaging.Save()` inferiert das Ausgabeformat aus der Dateiendung — PNG-Transparenz bleibt damit erhalten.
- **Files changed:** backend/internal/handlers/media_upload_image.go
---

