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
