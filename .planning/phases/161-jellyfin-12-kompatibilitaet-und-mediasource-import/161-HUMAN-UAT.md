---
phase: 161-jellyfin-12-kompatibilitaet-und-mediasource-import
status: complete
updated: 2026-09-16T14:00:00Z
source: [161-VERIFICATION.md, 161-VALIDATION.md]
---

# Phase 161 — Human-UAT

## Abgenommen: Release 27 / Buddy Complex, Folge 1

Der Auftraggeber hat den gerade besprochenen Release-27-UAT-Fall am 15.09.2026 ausdrücklich mit **„uat abgenommen“** bestätigt. Gesprächsbezug: technische Angaben und deren öffentliche Anzeige für `/fansubs/new-subs/fansubprojekt/buddy-complex/releases/27`; der aktuelle Nutzerkontext lag bei `/admin/episode-versions/27/edit?tab=dateien`.

Die unmittelbar vor der Nutzerabnahme lesend geprüfte öffentliche API lieferte HTTP 200 und:

| Merkmal | Wert |
| --- | --- |
| Container | mkv |
| Video-Codec | h264 |
| Audio-Codec / Sprache | ac3 / ja |
| Untertitelspur | de, Format ass, default true, forced false |
| Untertiteltyp | softsub |

**Ergebnis: passed — Nutzerabnahme für den besprochenen Release-27-Fall.** Die Abnahme ist eine Rückmeldung des Nutzers. Sie enthält keine separate Auflistung ausgeführter Scan-, Speicher- oder Wiedergabeschritte; solche Aktionen werden daher nicht als vom Agenten beobachtete Ausführung oder neuer technischer Nachweis eingetragen. Der Agent hatte ausschließlich die vorhandene öffentliche Antwort gelesen und den Ablauf erklärt.

## Bestätigt: Karaoke-Wiedergabe bei Release 27

Am 15.09.2026 meldet der Auftraggeber **„karako spielt ab“**, im Kontext `/admin/episode-versions/27/edit?tab=segmente`.

**Ergebnis: passed — Karaoke-/Segmentwiedergabe funktioniert laut Nutzerprüfung für diesen Release-27-Fall.** Dies ergänzt die vorherige Metadatenabnahme. Die Meldung bestätigt keine gesonderte Kaltstartbedingung, keinen Library-Rescan und keinen Wechsel zwischen mehreren Sources; diese Prüfungen bleiben separat.

## Abgenommen 16.09.2026: verbleibende Live-Prüfungen

Der Auftraggeber hat am 16.09.2026 die zuvor offenen Punkte — Import/Relink (inkl. Sourceauswahl bei mehreren
Sources), Stabilität nach Library-Rescan und Kaltstart-Untertitelabruf — ausdrücklich mit **„approved“** abgenommen.

**Ergebnis: Phase 161 Human-UAT vollständig abgenommen.** Die Abnahme ist eine Nutzerentscheidung; der Agent hat
dafür keine eigenen Importe, Relinks, Rescans oder Kaltstartprüfungen ausgeführt.

## Zuvor separat offen (am 16.09.2026 abgenommen)

- Nachweis des echten Import-/Relink-Ablaufs einschließlich korrekter Sourceauswahl, insbesondere bei mehreren Sources wie 11eyes. Der Release-27-Metadatenbefund beweist allein keinen zuvor ausgeführten Import oder Relink.
- Stabilität der Sourcezuordnung nach einem tatsächlichen Jellyfin-Library-Rescan.
- Gezielter erster/kalter Untertitelabruf: Die nun bestätigte Karaoke-Wiedergabe ist ein erfolgreicher Livefall, aber kein gesonderter Kaltstartnachweis für den zuvor beobachteten Timeout.

Phase 161 bleibt technisch abgeschlossen und im GSD-Status human_needed, jetzt mit teilweiser menschlicher Abnahme. Die vorhandenen Abnahmen 156/157 und der Kapitel-Auswahl bleiben bestehen; Anime-UAT 158/159 und die gesonderten Contributor-/Zoom-/Navigationsgrenzen werden nicht verändert.

## Dokumentationsprüfung

Nur GSD-Dokumente geändert. `git diff --check` bestanden; keine Codeprüfungen erneut nötig. Kein Anwendungsspeichern, Scan, Import, Rescan oder Push durch diese Dokumentationshandlung.
