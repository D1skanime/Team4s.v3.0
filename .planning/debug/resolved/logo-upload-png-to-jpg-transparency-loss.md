---
status: resolved
trigger: "PNG-Logos werden beim Upload und beim Crawl-Import als JPG gespeichert. Transparenz geht verloren."
created: 2026-05-05T00:00:00Z
updated: 2026-05-05T00:00:00Z
---

## Current Focus

hypothesis: In media_upload_image.go sind die Ausgabepfade hardcoded auf "original.jpg" und "thumb.jpg". imaging.Save() inferiert das Format aus der Dateiendung — also wird immer JPEG gespeichert, unabhängig vom Quellformat. PNG-Transparenz geht dabei verloren.
test: Zeilennummern 36-37 und 57-58 in media_upload_image.go bestätigen hardcodierte ".jpg"-Dateinamen.
expecting: Bestätigung durch direkten Code-Beweis.
next_action: Fix implementieren — Format aus mimeType ableiten, Dateinamen dynamisch setzen.

## Symptoms

expected: PNG-Logos (mit oder ohne Transparenz) werden im Originalformat gespeichert. Alphakanal bleibt erhalten. Kein Format-Downgrade auf JPG.
actual: PNG-Dateien werden beim Upload und beim Crawl-Import als JPG gespeichert. Transparenter Hintergrund wird verloren — er wird durch Weiß oder Schwarz ersetzt.
errors: Kein expliziter Fehler — das Problem ist stilles Fehlverhalten (falsche Konvertierung ohne Fehlermeldung).
reproduction: Logo-Upload im Admin-Bereich mit einer PNG-Datei die einen transparenten Hintergrund hat. Oder Anime-Crawl von einer zulässigen Webseite die ein PNG-Logo liefert.
started: Unklar, vermutlich immer so gewesen.

## Eliminated

- hypothesis: media_service.go konvertiert Format falsch
  evidence: media_service.go speichert Rohdaten (os.WriteFile mit data []byte) und leitet die Dateiendung korrekt aus extensionFromMime() ab. Kein Konvertierungsproblem dort.
  timestamp: 2026-05-05T00:00:00Z

## Evidence

- timestamp: 2026-05-05T00:00:00Z
  checked: backend/internal/handlers/media_upload_image.go Zeilen 36-37
  found: originalPath := filepath.Join(storagePath, "original.jpg") — hardcoded .jpg
  implication: imaging.Save() inferiert Format aus Dateiendung → immer JPEG, nie PNG

- timestamp: 2026-05-05T00:00:00Z
  checked: backend/internal/handlers/media_upload_image.go Zeilen 57-58
  found: thumbPath := filepath.Join(storagePath, "thumb.jpg") — hardcoded .jpg
  implication: Thumbnail ebenfalls immer JPEG

- timestamp: 2026-05-05T00:00:00Z
  checked: media_upload_image.go Zeile 27-47
  found: Format-Variable aus image.Decode() wird nur für GIF-Sonderfall genutzt (Animated GIF), für alle anderen Formate (PNG, WebP, JPEG) → immer "original.jpg"
  implication: PNG-Transparenz wird beim imaging.Save() in JPEG konvertiert und dadurch vernichtet

- timestamp: 2026-05-05T00:00:00Z
  checked: media_upload.go validateFile() — mimeType wird korrekt erkannt und als Parameter an processImage() übergeben
  found: mimeType ist korrekt (z.B. "image/png") — wird aber in processImage() nicht für den Ausgabepfad genutzt
  implication: Die Information ist vorhanden, wird aber verworfen

- timestamp: 2026-05-05T00:00:00Z
  checked: Crawl-Pfad (anisearch, jellyfin)
  found: Kein separater Crawl-Download-Pfad gefunden der SaveUpload aufruft — Logo-URLs werden als externe Referenzen zurückgegeben. Der Upload-Handler ist der einzige Einstiegspunkt für persistierte Bilddaten.
  implication: Der Fix in processImage() deckt den Upload-Pfad ab. Für Crawl-Logo-Import ist kein separater Pfad vorhanden.

## Resolution

root_cause: In backend/internal/handlers/media_upload_image.go sind originalPath und thumbPath auf "original.jpg" / "thumb.jpg" hardcoded. Die imaging-Bibliothek inferiert das Ausgabeformat aus der Dateiendung — deshalb wird jedes Bild (auch PNG) als JPEG gespeichert. PNG-Transparenz (Alphakanal) geht bei der JPEG-Konvertierung verloren.

fix: imageExtFromMime() Hilfsfunktion eingeführt. ext aus mimeType abgeleitet. originalFilename und thumbFilename dynamisch gesetzt ("original.png"/"thumb.png" für PNG, "original.webp"/"thumb.webp" für WebP, "original.jpg"/"thumb.jpg" für JPEG). imaging.Save() inferiert das Ausgabeformat aus der Dateiendung — PNG-Transparenz bleibt damit erhalten.

verification: go build ./internal/handlers/... kompiliert ohne Fehler. Deployment auf Docker bestätigt — PNG-Logos werden jetzt korrekt als PNG gespeichert (human verified 2026-05-05).
files_changed: [backend/internal/handlers/media_upload_image.go]
