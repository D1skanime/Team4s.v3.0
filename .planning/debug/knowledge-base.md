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

## release-review-metadata-409 — Bestaetigtes Release-Medium faellt nach Metadaten-Edit zurueck in die Pruefliste, Bestaetigen liefert 409
- **Date:** 2026-10-13
- **Error patterns:** 409, bereits von einer anderen Person entschieden, release_version_media_review_lifecycle, review_state pending, source_revision, SubmitMedia, idempotency mismatch, point award, credit release review contribution, ErrReviewAlreadyDecided, ErrConflict, Metadaten-Edit, Resubmit
- **Root cause:** Zwei sich verstaerkende Bugs. (1) `PatchReleaseVersionMedia` rief bei JEDEM Metadaten-Edit (Titel/Caption/Kategorie/Preview-Flag) durch den Uploader `SubmitMedia` auf wie bei einem echten Resubmit -- setzte `review_state` unconditional auf `pending` zurueck und erhoehte `source_revision`, obwohl keine Datei geaendert wurde (nur der Nicht-Uploader-Zweig war bereits re-review-frei). (2) `creditReleaseReviewContribution` (einmalige Mitwirkungs-Punktegutschrift) war nicht ueber Revisionen hinweg idempotent -- der Idempotency-Key enthielt keine Revision, aber ein strikter EffectiveAt-Vergleich im Retry-Fallback von `InsertAward` schlug bei einem spaeteren, legitimen zweiten Confirm faelschlich als Konflikt an. Zusaetzlich buendelte `writeDecisionError` echten Fremd-Entscheid, veraltete Revision und sonstigen Konflikt in eine einzige irrefuehrende 409-Meldung.
- **Fix:** `BumpMediaRevisionForMetadataEdit` (ersetzt `CheckMediaRevisionConflict`) erhoeht `source_revision` optimistisch ohne `review_state`/`decided_at` anzufassen, jetzt einheitlich fuer Uploader UND Nicht-Uploader bei reinen Metadaten-Edits. Neue `HasAward`/`HasBeenCredited`-Pruefung VOR der Gutschrift macht `creditReleaseReviewContribution` idempotent unabhaengig von EffectiveAt. `writeDecisionError` in drei Faelle aufgeteilt: REVIEW_ALREADY_DECIDED (echter Fremd-Entscheid), REVIEW_STALE_REVISION (veraltete Revision), REVIEW_CONFLICT (sonstiger Konflikt). Bewusst NICHT auf `release_version_notes` uebertragen -- dort ist jeder Edit inhaltlich ein Resubmit (kein Bug). Bestandskorrektur: 1 betroffene Zeile (release_version_media_id=1) in `release_version_media_review_lifecycle` von `pending`/`decided_at=NULL` auf `confirmed`/urspruengliches `decided_at` zurueckgesetzt, `source_revision` unveraendert gelassen.
- **Files changed:** backend/internal/handlers/admin_content_release_version_media_patch.go, backend/internal/handlers/admin_content_release_version_media_test.go, backend/internal/handlers/admin_content_release_version_media_patch_review_test.go, backend/internal/handlers/release_review_handler.go, backend/internal/handlers/release_review_handler_decide.go, backend/internal/repository/release_review_lifecycle_revision_guard.go, backend/internal/repository/point_ledger_repository.go, backend/internal/services/point_service.go, backend/internal/services/release_review_decision.go
---

