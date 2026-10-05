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
