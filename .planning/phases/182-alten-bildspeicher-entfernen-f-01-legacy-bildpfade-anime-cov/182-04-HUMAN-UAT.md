---
status: pending
phase: 182-alten-bildspeicher-entfernen-f-01-legacy-bildpfade-anime-cov
source: [182-04-PLAN.md Task 2]
started: 2026-10-14T23:59:00Z
updated: 2026-10-14T23:59:00Z
---

## Current Test

### 1. D-04 — Vorher/Nachher-Vergleich der 5 Referenz-URLs

**Hinweis vor Beginn:** Bitte zuerst bestätigen (oder sicherstellen), dass die Merkliste unter
Punkt 5 bereits mindestens ein Jellyfin-stämmiges Anime enthält — sonst ist der
Vorher/Nachher-Vergleich dort leer bzw. aussagelos.

**Korrektur gegenüber dem ursprünglichen Plantext:** Der Plan nannte für Punkt 5 fälschlich die
URL `http://127.0.0.1:3300/me/watchlist` (liefert 404). Die korrekte URL ist
`http://127.0.0.1:3300/watchlist` (ohne `/me`-Präfix) — unten bereits korrigiert.

Über den SSH-Tunnel unter `http://127.0.0.1:3300` bitte jede der 5 URLs öffnen und mit dem
Zustand vor Phase 182 vergleichen (aus Erinnerung/Notizen oder einem Vorher-Screenshot, falls
vorhanden):

1. `http://127.0.0.1:3300/anime` — öffentliche Anime-Liste, kein Letter-Filter.
   expected: identisch zu vorher (diese Route war schon vor dieser Phase V2-bewusst).
2. `http://127.0.0.1:3300/anime/3` — Detailseite „11eyes: Pink Phantasmagoria" (eines der 3
   Anime mit vorbestehendem lokalem Cover).
   expected: Cover pixel-identisch zu vorher.
3. `http://127.0.0.1:3300/anime/1` — Detailseite „Buddy Complex" (Jellyfin-Anime, hatte schon
   vor dieser Phase ein Cover über den V2-bewussten Detailpfad).
   expected: identisch zu vorher, keine Änderung.
4. `http://127.0.0.1:3300/fansubs` → ein Fansub-Profil mit Projekt-Übersicht öffnen, die ein
   Jellyfin-stämmiges Anime ohne vorheriges lokales Cover enthält.
   expected (beabsichtigter D-01-Effekt, KEINE Regression): dieses Projekt zeigt jetzt
   erstmals ein Cover, wo vorher der leere Cover-Platzhalter stand.
5. `http://127.0.0.1:3300/watchlist` (eingeloggt, mit mindestens einem Jellyfin-stämmigen
   Anime auf der Merkliste).
   expected (beabsichtigter D-01-Effekt, am deutlichsten sichtbare Änderung in dieser Phase):
   dieser Merklisten-Eintrag zeigt jetzt erstmals ein Cover, wo vorher keines stand.

Zusätzlich auf allen 5 Seiten prüfen: keine Browser-Konsolenfehler, insbesondere keine
`next/image`-Remote-Pattern-/E426-Fehler.

result: [AUSSTEHEND — wartet auf Nutzerprüfung]

## Tests

[siehe "Current Test" oben — noch nicht durchgeführt]

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps

[noch nicht ermittelt — Test steht aus]

## Resume-Signal

Bitte "approved" tippen, wenn alle 5 URLs den Erwartungen entsprechen (Punkte 1-3 unverändert,
Punkte 4-5 zeigen die beabsichtigte neue Cover-Anzeige), oder genau beschreiben, welche
URL/welches Verhalten falsch aussieht.

**Dieses Dokument darf NICHT von einem Agenten als "approved" markiert werden — nur eine
explizite Nutzerfreigabe darf den `status`-Frontmatter-Wert auf `resolved` setzen.**
