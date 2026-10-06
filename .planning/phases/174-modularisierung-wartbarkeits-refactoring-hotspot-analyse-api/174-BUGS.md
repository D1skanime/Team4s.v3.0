# Phase 174 – nachgewiesene Vorbestands-Fehler (D-01-Ausnahmen)

## BUG-174-01: Endlosschleife „Maximum update depth exceeded“ auf /admin/fansubs/create (behoben)

- **Gefunden:** Live-UAT Welle 3, 2026-10-05 (Nutzer), nach erfolgreichem erstem Speichern.
- **Ursache:** `MediaUpload` ruft `onBusyChange(busy)` in einem Effect mit `onBusyChange` als Abhängigkeit. Die Anlegeseite übergab eine Inline-Funktion, deren Updater immer ein neues `mediaBusy`-Objekt liefert → Re-Render → neue Funktion → Effect → … Endlosschleife, sobald nach dem Anlegen der Medienbereich erscheint.
- **Vorbestand:** identischer Code im `page.tsx` vor Phase 174 (Commit 3824b747, Zeilen 987–1014); der Split hat ihn nur 1:1 verschoben. Die Bearbeiten-Seite (`useFansubDetailsForm.ts`) hatte bereits die Absicherung.
- **Fix:** gleicher No-op-Guard wie auf der Bearbeiten-Seite (`current.logo === isBusy ? current : {...}`) in `AdminFansubCreateMediaSection.tsx`.
- **Nebenbefund:** erklärt die 3 endlos hängenden Klick-Tests aus dem ersten 174-09-Versuch (alle legten erst eine Gruppe an).

## Offen (nicht in 174 behoben, Folgephase)
- „Tag hinzugefuegt.“ und weitere ASCII-Umlaute in User-Strings der Anlegeseite (CLAUDE.md-Sprachregel).
- 9 native `<input>`/`<select>` auf der Anlegeseite statt `@/components/ui`-Primitives (lint-Warnungen, verschoben, nicht neu).

## BUG-174-02: Dashboard meldet Gruppenbild-Prüfung ohne Prüfrecht (behoben)

- **Gefunden:** Live-UAT 2026-10-05 (Nutzer, User `timer`): Dashboard zeigt „1 Gruppenbild prüfen in New-Subs“; auf der Medien-Seite ist „Prüfen“ leer und das Bild nicht bearbeitbar.
- **Ursache (vorbestehend seit Plan 143-09):** `attachPendingGroupMediaReviewAttention` filterte mit `review.image.decide`, während der Prüf-Endpunkt (`UpdateFansubMediaReview`, Änderung von `review_status`) und `can_review_group_media` `fansub_group.edit` verlangen. timer hat `review.image.decide` (Projektleitung), aber kein `fansub_group.edit` für New-Subs.
- **Nutzerentscheidung:** Gruppenmedien freigeben darf nur, wer das Recht dazu hat; das Dashboard kündigt nur an, was man auch entscheiden kann (Option 1, keine Rechte-Ausweitung).
- **Fix:** Dashboard-Filter auf `permissions.ActionFansubGroupEdit` umgestellt; bestehender Test aus 143-09, der die alte Entscheidung festschrieb, bewusst umgedreht und um den Positivfall (fansub_lead sieht den Eintrag) erweitert (`TestAttachPendingGroupMediaReviewAttentionRequiresGroupEdit`). Dashboard-Handler-Tests grün.
- **Live wirksam:** erst nach Backend-Rebuild (`docker compose up -d --build team4sv30-backend`), sinnvoll nach Abschluss von Welle 4. Danach Gegenprobe als timer: Eintrag weg; als Plattform-Admin/Gruppenleitung: Eintrag da und Prüfen funktioniert.

## BUG-174-03: Release-Medien-Galerie zeigt nach Löschen/Bearbeiten veralteten Stand (behoben)

- **Gefunden:** Live-UAT Welle 4, 2026-10-06 (Nutzer + Orchestrator als d1sk): „testgz“ in Release-Version 27 gelöscht → Toast „Medium entfernt.“, Server `DELETE …/media/3` 200, DB `deleted_at` gesetzt, Kategorie-Zähler sinkt — die Karte bleibt aber bis zum Neuladen sichtbar.
- **Ursache (vorbestehend seit Phase 171, Kara in der Story):** Die Galerie rendert `storyItems`; `deleteItem`, `patchItem`, `replaceItem` und `setHighlight` in `useReleaseVersionMedia.ts` aktualisieren nur `items`. Uploads waren nicht betroffen (lösen `reload()` aus).
- **Fix:** Hook liefert `storyItems` jetzt aus dem aktuellen `items`-Stand abgeleitet (gelöschte Medien fallen raus, geänderte werden ersetzt; Kara-Einträge unverändert). Zwei Logik-Tests (Löschen, Bearbeiten) auf Hook-Ebene ergänzt; 3 betroffene Testdateien grün (64 Tests).
- **Nebenbeobachtung:** Löschen-Klick im Bearbeiten-Dialog kann ins Leere gehen, solange das Vorschaubild noch lädt (Dialog verschiebt sich) — kein Defekt, nur Layout-Sprung; bei F-Liste als UX-Hinweis.

## BUG-174-04: Leitung kann Titel/Beschreibung fremder Release-Bilder nicht speichern (behoben)

- **Gefunden:** Live-UAT Welle 4, 2026-10-06 (Nutzer als d1sk = Gruppenleitung New-Subs): Titel für Bild 9 (hochgeladen von Qc) ergänzt → „Die Einreicher-Zuordnung ist nicht mehr eindeutig.“ (`PATCH …/media/9` 422), Änderung verworfen.
- **Ursache (vorbestehend seit Phase 107.1, 2026-07-23):** Jede inhaltliche Änderung (nicht nur Vorschau-Flag) reicht das Medium per `SubmitMedia` neu zur Prüfung ein; `SubmitMedia` verlangt, dass der Speichernde der Hochlader ist. Damit konnte niemand außer dem Hochlader Release-Bilder bearbeiten/ersetzen, obwohl `release_version_media.update` (alle) das erlaubt. 174-20 hat die Handler nur byte-identisch verschoben (23/23 Funktionen geprüft).
- **Nutzerentscheidung (Option 1):** Leitung korrigiert ohne neue Prüfung — neu eingereicht wird nur, wenn der Hochlader selbst speichert; Edits durch Berechtigte mit „Bearbeiten (alle)“ behalten den Prüfstatus.
- **Fix:** `isReleaseVersionMediaUploader` (Hochlader-Vergleich über Legacy-User-ID) steuert die Neu-Einreichung in Patch- und Replace-Handler; Unit-Test `TestIsReleaseVersionMediaUploader`. RVM-Handlertests vorher/nachher identisch: 65 grün + 8 vorbestehend rot (db_schema_mismatch der Test-DB, u. a. TestRVMTitlePatchPersistsIndependentMetadata, Reorder-, SoftDelete-, Category-Tests) — nachher zusätzlich der neue Test grün. Die 8 roten Tests sind eine Testumgebungs-Altlast (F-Liste).
- **Folgehinweis:** Für Nicht-Hochlader-Edits greift der Revisions-Konfliktschutz aus `SubmitMedia` nicht; bei Bedarf eigenen Revisions-Check ergänzen (F-Liste).

## BUG-174-05: Fansub-Banner zeigt nach Galerie-Upload ein fremdes Bild (behoben + Daten repariert)

- **Gefunden:** Live-UAT Welle 4, 2026-10-06 (Nutzer): Banner von New-Subs bearbeitet (07:33), öffentliche Seite zeigt danach einen historischen Screenshot.
- **Ursache (Phase-173-Regression):** `MediaService.SaveUpload` → `buildDisplayVariant` schrieb jede Display-Variante als fester Name `display.<ext>` neben das Original. Anime/Release/Profil/Segment haben je Bild einen eigenen Ordner (unkritisch), aber Fansub-Logo, -Banner und -Gruppenmedien teilen sich `media/fansub/<id>/`: der Galerie-Upload um 07:47:18 überschrieb `fansub/1/display.jpg`, auf das auch das Banner zeigte. 7 Assets betroffen (Gruppe 1: Banner 192, Logo 193, Galerie 186/194/195; Gruppe 112: Logo 174, Banner 175).
- **Fix:** Display-Datei heißt jetzt `<original>_display.<ext>` (Backfill-Schema); Ordner mit `original.<ext>` behalten `display.<ext>`. Unit-Test `TestDisplayVariantFileNameIsUniquePerOriginal`; Services-Suite im Backend-Container (mit FFmpeg) grün bis auf bekannte Permission-Cache-Altlast; Fansub-Media-Handlertests grün.
- **Datenreparatur:** Sicherung der 7 `media_files`-Display-Zeilen nach `/home/d1sk/bug17405_media_files_backup.csv`, Zeilen gelöscht, geteilte `display.*`-Dateien entfernt, `migrate-display-backfill` (Dry-Run, dann echt): 7 Display-Varianten korrekt neu erzeugt + 4 `source_original`-Dateien in den Fansub-Namensraum migriert (11/11 ok). Öffentliche API liefert für New-Subs wieder die eigenen Banner-/Logo-Displays.
- **Nachtrag WR-03 (2026-10-06, Nutzerentscheidung Option 2):** Für das **Ersetzen der Datei** gilt abweichend von reinen Metadaten-Edits: Ersetzt ein Nicht-Hochlader mit „Bearbeiten (alle)“ die Datei, geht das Medium zurück auf „in Prüfung“ (`ResubmitMediaKeepingSubmitter`): Einreicher bleibt der ursprüngliche Hochlader, Revision +1, Revisionsschutz aktiv, Audit nennt die handelnde Person. Begründung: Das Ersetzen ändert den geprüften Inhalt; eine Freigabe darf nicht auf eine neue Datei übergehen.
