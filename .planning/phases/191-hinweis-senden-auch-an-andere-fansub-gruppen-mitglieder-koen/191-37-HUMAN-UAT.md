# Plan 191-37 Task 1 — D-36 echter API-Gegencheck (Release-Doppel-Hinweis-Schutz) + D-35 echte Löschung mit Vorher-/Nachher-Snapshot

**Datum:** 2026-10-24
**Ausgeführt von:** Executor-Agent (Plan 191-37, Task 1), gegen den live laufenden Dev-Stack.

## Schritt -1 — Voraussetzung: Pläne 191-32 bis 191-36 abgeschlossen

```
ls .planning/phases/191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen/191-{32,33,34,35,36}-SUMMARY.md
```
→ alle fünf `SUMMARY.md`-Dateien existieren (bestätigt vor dem Rebuild).

## Schritt 0 — Container neu gebaut/neu gestartet, Gesundheit bestätigt

Startzeit: `2026-10-24T12:41:03Z`

```
docker compose up -d --build team4sv30-backend
```
→ `Image team4s-team4sv30-backend Built`, `Container team4sv30-backend Recreated`, `Started`.

```
docker restart team4sv30-frontend
```
→ Container neu gestartet.

`docker compose ps team4sv30-backend team4sv30-frontend` nach Wartezeit:
```
team4sv30-backend    Up 11 seconds   0.0.0.0:18092->8092/tcp
team4sv30-frontend   Up 8 seconds    0.0.0.0:3000->3000/tcp
```

Health-Checks (mit Retry bis `200`):
```
curl -s http://192.168.235.196:18092/health
→ {"status":"ok"}
curl -s -o /dev/null -w "%{http_code}" http://192.168.235.196:3000/
→ 200
```

Beide Container sind nach dem Rebuild/Restart gesund und laufen mit dem Code-Stand nach
191-32..191-36.

## Schritt 0b — Baseline-Snapshot `fansub_group_hints` (VOR dem D-36-Check und der D-35-Löschung)

```sql
SELECT id, sender_app_user_id, target_fansub_group_id, related_anime_id, related_release_version_id, note, status, created_at
FROM fansub_group_hints ORDER BY id;
```

| id | sender_app_user_id | target_fansub_group_id | related_anime_id | related_release_version_id | note | status | created_at |
|---|---|---|---|---|---|---|---|
| 2 | 3 | 26 | 2 | NULL | "Rolle: Timing — UAT-Check: Timing bei 11eyes fehlt." | open | 2026-10-23 21:31:16.348516+00 |
| 3 | 3 | 24 | 2 | NULL | "Rolle: Timing — UAT-Check Fehler melden: Timing bei 11eyes." | open | 2026-10-23 21:32:17.342414+00 |
| 5 | 3 | 32 | 7 | NULL | "Rolle: Encoding — Zeitraum: ab 2023 — UAT-Check Erfolgsansicht" | open | 2026-10-23 23:12:24.382082+00 |
| 6 | 5 | 25 | 2 | NULL | "D-28-Gegencheck Plan 191-30: gültige Gruppe-Projekt-Kombination, muss angenommen werden." | open | 2026-10-24 01:55:40.775286+00 |

Nur 4 Zeilen vorhanden (IDs 2,3,5,6), konsistent mit `191-30-HUMAN-UAT.md`'s dokumentiertem
Endzustand (IDs 1 und 4 wurden dort bereits per D-24 gelöscht). ID 6 ist laut `191-CONTEXT.md`
(sechste Runde, D-35) das aktuelle Löschziel dieser Runde.

## Schritt 0c — Kandidaten-Releases ermittelt (für die sechs Prüffälle unten)

Gegen `anime_fansub_groups`/`release_versions`/`release_version_groups`/`episodes` real abgefragt:

- Zielprojekt: Anime 2 ("11eyes"), Zielgruppe für A/B/D: Gruppe 25 ("FlameHaze-subs") — Gruppe 25
  nimmt an Anime 2 teil (`anime_fansub_groups`-Zeile vorhanden).
- **Release A** = `release_version_id 51` (Episode 1, Gruppe 25, Titel "Rote Nacht
  (FlameHaze-subs) Version 1").
- **Release B** = `release_version_id 172` (Episode 10, Gruppe 25, Titel "Das Erwachen der Hexe
  (FlameHaze-subs) Version 1") — anderes Release desselben Projekts/derselben Gruppe.
- **Release C** = `release_version_id 27` — gehört zu Anime 1 ("Buddy Complex"), NICHT zu Anime 2.
- **Release D** = `release_version_id 50` (Episode 1, Anime 2, aber NUR Gruppe 24
  "Bloody-Shadow" nimmt an diesem Release teil — Gruppe 25 nimmt an Release 50 NICHT teil,
  bestätigt per Direktabfrage von `release_version_groups`).
- Zusatzgruppe für Schritt 4 (da Gruppe 25 + Anime 2 ohne Release bereits durch die bestehende
  Zeile ID 6 belegt war): Gruppe 24 ("Bloody-Shadow") + Anime 2 — gültige Kombination laut
  `anime_fansub_groups`.

## Schritt 1 — POST Hinweis MIT Release A (project=Anime 2, group=25, release=51)

**Konto:** `jeahn45@team4s.de` (app_user_id=5, verifiziertes Mitgliedsprofil, Mitwirkung bei
New-Subs; bereits in `191-30-HUMAN-UAT.md` als funktionierendes Testkonto bestätigt).

```bash
curl -s -X POST "http://192.168.235.196:18081/realms/team4s/protocol/openid-connect/token" \
  -d "client_id=team4s-frontend" -d "grant_type=password" \
  -d "username=jeahn45" -d "password=123"
```
→ HTTP 200, echtes Keycloak-Access-Token. `GET /api/v1/me` bestätigt `app_user_id=5`.

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "http://192.168.235.196:18092/api/v1/me/fansub-group-hints" \
  -H "Authorization: Bearer $TOKEN_JEAHN" -H "Content-Type: application/json" \
  -d '{"target_fansub_group_id": 25, "related_anime_id": 2, "related_release_version_id": 51, "note": "D-36-Vorabpruefung Plan 191-37 Schritt 1: Release A (Episode 1, FlameHaze-subs)."}'
```

**Ergebnis:**
```json
{"data":{"id":8,"target_fansub_group_id":25,"related_anime_id":2,"related_anime_title":"11eyes",
"related_release_version_id":51,"related_release_label":"Rote Nacht (FlameHaze-subs) Version 1",
"status":"open", ...}}
HTTP_STATUS:201
```

→ **BESTANDEN.** Neuer Hinweis `id=8`, HTTP 201.

## Schritt 2 — POST Hinweis MIT Release B (dasselbe Projekt/dieselbe Gruppe, ANDERES Release)

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "http://192.168.235.196:18092/api/v1/me/fansub-group-hints" \
  -H "Authorization: Bearer $TOKEN_JEAHN" -H "Content-Type: application/json" \
  -d '{"target_fansub_group_id": 25, "related_anime_id": 2, "related_release_version_id": 172, "note": "D-36-Vorabpruefung Plan 191-37 Schritt 2: Release B (Episode 10, FlameHaze-subs), muss neben Release A koexistieren."}'
```

**Ergebnis:**
```json
{"data":{"id":9,"target_fansub_group_id":25,"related_anime_id":2,"related_anime_title":"11eyes",
"related_release_version_id":172,"related_release_label":"Das Erwachen der Hexe (FlameHaze-subs) Version 1",
"status":"open", ...}}
HTTP_STATUS:201
```

→ **BESTANDEN — D-32's Fix bewiesen.** Zwei offene Hinweise zu zwei verschiedenen Releases
desselben Projekts derselben Gruppe koexistieren (`id=8` und `id=9`), kein fälschlicher 409.

## Schritt 3 — POST Hinweis erneut zu Release A (identisch zu Schritt 1) → erwartet 409, release-spezifische Meldung

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "http://192.168.235.196:18092/api/v1/me/fansub-group-hints" \
  -H "Authorization: Bearer $TOKEN_JEAHN" -H "Content-Type: application/json" \
  -d '{"target_fansub_group_id": 25, "related_anime_id": 2, "related_release_version_id": 51, "note": "D-36-Vorabpruefung Plan 191-37 Schritt 3: zweiter Hinweis zu Release A, muss 409 ergeben."}'
```

**Ergebnis:**
```json
{"error":{"message":"Du hast zu diesem Release bereits einen offenen Hinweis. Sieh dir deine eingereichten Hinweise an."}}
HTTP_STATUS:409
```

→ **BESTANDEN.** Exakt die release-spezifische D-33-Meldung, kein stiller Erfolg, kein
Duplikat erzeugt.

## Schritt 4 — Hinweis OHNE Release (ganzes Projekt), zweimal

**Hinweis zur Methodik:** Die ursprünglich geplante Kombination (Gruppe 25, Anime 2, kein
Release) war durch die bereits bestehende Zeile `id=6` ("D-28-Gegencheck Plan 191-30") belegt —
der erste Versuch ergab dadurch sofort `409`, bevor überhaupt ein neuer Hinweis angelegt werden
konnte. Das ist korrektes, erwünschtes Verhalten (die Zeile existierte real), beweist aber nicht
den 201→409-Übergang. Für einen echten, unverfälschten Nachweis des 201→409-Übergangs wurde
dieselbe Prüfung mit einer tatsächlich freien Kombination wiederholt: Gruppe 24 ("Bloody-Shadow")
statt 25, weiterhin Anime 2 (gültige Kombination laut `anime_fansub_groups`).

**4a — erster ganzer-Projekt-Hinweis (Gruppe 24, Anime 2, kein Release):**
```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "http://192.168.235.196:18092/api/v1/me/fansub-group-hints" \
  -H "Authorization: Bearer $TOKEN_JEAHN" -H "Content-Type: application/json" \
  -d '{"target_fansub_group_id": 24, "related_anime_id": 2, "note": "D-36-Vorabpruefung Plan 191-37 Schritt 4a: Hinweis zum ganzen Projekt (kein Release), Gruppe Bloody-Shadow."}'
```
**Ergebnis:**
```json
{"data":{"id":13,"target_fansub_group_id":24,"target_fansub_group_name":"Bloody-Shadow",
"related_anime_id":2,"related_anime_title":"11eyes","related_release_version_id":null,
"related_release_label":null,"status":"open", ...}}
HTTP_STATUS:201
```

**4b — derselbe ganzer-Projekt-Hinweis erneut:**
```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "http://192.168.235.196:18092/api/v1/me/fansub-group-hints" \
  -H "Authorization: Bearer $TOKEN_JEAHN" -H "Content-Type: application/json" \
  -d '{"target_fansub_group_id": 24, "related_anime_id": 2, "note": "D-36-Vorabpruefung Plan 191-37 Schritt 4b: zweiter ganzer-Projekt-Hinweis, muss 409 ergeben."}'
```
**Ergebnis:**
```json
{"error":{"message":"Du hast zu diesem Projekt bereits einen offenen Hinweis. Sieh dir deine eingereichten Hinweise an."}}
HTTP_STATUS:409
```

→ **BESTANDEN.** Neuer Hinweis `id=13` (201), danach korrekt projektspezifisches 409 mit der
D-33-Meldung "...zu diesem Projekt...". Zusätzlich bestätigt die ursprüngliche, gegen `id=6`
kollidierende Anfrage (Gruppe 25/Anime 2/kein Release), dass die alte D-24/D-28-Testzeile selbst
bereits exakt diese Projekt-Konfliktregel korrekt auslöst.

## Schritt 5 — POST Hinweis mit Release C (gehört zu ANDEREM Anime)

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "http://192.168.235.196:18092/api/v1/me/fansub-group-hints" \
  -H "Authorization: Bearer $TOKEN_JEAHN" -H "Content-Type: application/json" \
  -d '{"target_fansub_group_id": 25, "related_anime_id": 2, "related_release_version_id": 27, "note": "D-36-Vorabpruefung Plan 191-37 Schritt 5: Release gehoert zu falschem Anime, muss 404 ergeben."}'
```

**Ergebnis:**
```json
{"error":{"message":"Release-Fansub-Zuordnung nicht gefunden"}}
HTTP_STATUS:404
```

→ **BESTANDEN.** `release_version_id=27` gehört zu Anime 1 ("Buddy Complex"), nicht zu dem im
Request angegebenen `related_anime_id=2` — die serverseitige D-31-Validierung lehnt korrekt mit
404 und der deutschen Meldung ab, kein Hinweis wurde erzeugt.

## Schritt 6 — POST Hinweis mit Release D (korrektes Anime, Zielgruppe nimmt NICHT teil)

**Hinweis zur Methodik — Tageslimit:** Nach den bisherigen sechs Aufrufen mit `jeahn45` (Schritte
1-3, 4a-Originalversuch, 4b-Originalversuch, 4a-korrigiert, 4b-korrigiert, Schritt 5 — insgesamt 8
Aufrufe in dieser Sitzung, zusätzlich 2 Aufrufe desselben Kontos aus `191-30-HUMAN-UAT.md` am
selben Kalendertag) griff beim ersten Versuch von Schritt 6 das bestehende, bereits aus Ist-Zustand
4/D-04 bekannte Tageslimit (`FansubGroupHintDailyLimitMiddleware`, 10 Anfragen/24h,
`backend/cmd/server/wiring_catalog.go:131`):
```json
{"error":{"message":"zu viele anfragen, bitte spaeter erneut versuchen"}}
HTTP_STATUS:429
```
Dies ist korrektes, erwartetes Rate-Limit-Verhalten (D-04), kein Bug. Um Schritt 6 trotzdem real
(nicht simuliert) abzuschließen, wurde ein zweites, ebenfalls verifiziertes Mitgliedskonto
verwendet: `timer@team4s.de` (app_user_id=3), dessen Tageslimit zu diesem Zeitpunkt noch nicht
ausgeschöpft war.

```bash
curl -s -X POST "http://192.168.235.196:18081/realms/team4s/protocol/openid-connect/token" \
  -d "client_id=team4s-frontend" -d "grant_type=password" \
  -d "username=timer" -d "password=123"
```
→ HTTP 200. `GET /api/v1/me` bestätigt `app_user_id=3`.

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "http://192.168.235.196:18092/api/v1/me/fansub-group-hints" \
  -H "Authorization: Bearer $TOKEN_TIMER" -H "Content-Type: application/json" \
  -d '{"target_fansub_group_id": 25, "related_anime_id": 2, "related_release_version_id": 50, "note": "D-36-Vorabpruefung Plan 191-37 Schritt 6: Release korrektes Anime, aber Zielgruppe nimmt nicht teil, muss 404 ergeben."}'
```

**Ergebnis:**
```json
{"error":{"message":"Release-Fansub-Zuordnung nicht gefunden"}}
HTTP_STATUS:404
```

→ **BESTANDEN.** `release_version_id=50` gehört zu Anime 2 (korrektes Anime), aber die im
Request angegebene Zielgruppe 25 ("FlameHaze-subs") nimmt an Release 50 laut
`release_version_groups` nicht teil (nur Gruppe 24 "Bloody-Shadow" tut es) — die Validierung
lehnt korrekt mit 404 und derselben Meldungsfamilie ab.

## D-36-Gesamtergebnis: ALLE SECHS FÄLLE BESTANDEN

| Schritt | Fall | Konto | Erwartung | Ergebnis |
|---|---|---|---|---|
| 1 | Release A (anderes Release desselben Projekts) | jeahn45 (5) | 201 | **201**, id=8 |
| 2 | Release B (zweites Release desselben Projekts) | jeahn45 (5) | 201 (Koexistenz, D-32) | **201**, id=9 |
| 3 | Release A erneut | jeahn45 (5) | 409 release-spezifisch | **409** "...zu diesem Release..." |
| 4a | Ganzes Projekt (Gruppe 24) | jeahn45 (5) | 201 | **201**, id=13 |
| 4b | Ganzes Projekt erneut | jeahn45 (5) | 409 projekt-spezifisch | **409** "...zu diesem Projekt..." |
| 5 | Release C (falsches Anime) | jeahn45 (5) | 404 | **404** "Release-Fansub-Zuordnung nicht gefunden" |
| 6 | Release D (Zielgruppe nimmt nicht teil) | timer (3) | 404 | **404** "Release-Fansub-Zuordnung nicht gefunden" |

## Schritt 7 — D-35-Löschung: echtes SQL `DELETE FROM fansub_group_hints WHERE id = 6`

**Vorher (Schritt 0b oben erneut referenziert, plus alle in dieser Runde neu erzeugten IDs
8, 9, 13):**

```sql
SELECT id, sender_app_user_id, target_fansub_group_id, related_anime_id, related_release_version_id, status, created_at
FROM fansub_group_hints WHERE id IN (2,3,5,6,8,9,13) ORDER BY id;
```

| id | sender | group | anime | release | status |
|---|---|---|---|---|---|
| 2 | 3 | 26 | 2 | NULL | open |
| 3 | 3 | 24 | 2 | NULL | open |
| 5 | 3 | 32 | 7 | NULL | open |
| 6 | 5 | 25 | 2 | NULL | open |
| 8 | 5 | 25 | 2 | 51 | open |
| 9 | 5 | 25 | 2 | 172 | open |
| 13 | 5 | 24 | 2 | NULL | open |

**Löschung:**
```sql
DELETE FROM fansub_group_hints WHERE id = 6;
```
→ `DELETE 1`

**Nachher:**

```sql
SELECT id, sender_app_user_id, target_fansub_group_id, related_anime_id, related_release_version_id, status, created_at
FROM fansub_group_hints WHERE id IN (2,3,5,6,8,9,13) ORDER BY id;
```

| id | sender | group | anime | release | status |
|---|---|---|---|---|---|
| 2 | 3 | 26 | 2 | NULL | open |
| 3 | 3 | 24 | 2 | NULL | open |
| 5 | 3 | 32 | 7 | NULL | open |
| 8 | 5 | 25 | 2 | 51 | open |
| 9 | 5 | 25 | 2 | 172 | open |
| 13 | 5 | 24 | 2 | NULL | open |

ID 6 ist weg; IDs 2, 3, 5 sind — Feld für Feld mit dem Schritt-0b-Baseline verglichen —
byte-identisch unverändert (Sender, Zielgruppe, Projekt, Status, Erstellzeitpunkt). Die drei in
dieser Runde selbst erzeugten Hinweise (8, 9, 13) wurden NICHT gelöscht — D-35s Löschung betrifft
ausschließlich ID 6.

## Schritt 8 — Finale Vorher-/Nachher-Tabelle

| id | present-before | present-after |
|---|---|---|
| 2 | ja | ja (unverändert) |
| 3 | ja | ja (unverändert) |
| 5 | ja | ja (unverändert) |
| 6 | ja | **nein — gelöscht (D-35)** |
| 8 | nein (existierte noch nicht) | ja (neu erzeugt in Schritt 1, D-36-Pre-Check) |
| 9 | nein (existierte noch nicht) | ja (neu erzeugt in Schritt 2, D-36-Pre-Check) |
| 13 | nein (existierte noch nicht) | ja (neu erzeugt in Schritt 4a, D-36-Pre-Check) |

## Zusammenfassung — exakte Konten/Gruppen/Projekte/Releases/IDs

| Rolle | Konto | app_user_id | Verwendung |
|---|---|---|---|
| Absender (Schritte 1-5) | `jeahn45@team4s.de` | 5 | Release A/B-Koexistenz, Release-409, Projekt-201/409, Release-falsches-Anime-404 |
| Absender (Schritt 6, wegen Tageslimit bei jeahn45) | `timer@team4s.de` | 3 | Release-korrektes-Anime-aber-Zielgruppe-fehlt-404 |

| Projekt | Anime-ID | Release A | Release B | Release C (falsches Anime) | Release D (Zielgruppe fehlt) |
|---|---|---|---|---|---|
| 11eyes | 2 | 51 (Ep. 1, Gruppe 25) | 172 (Ep. 10, Gruppe 25) | 27 (Anime 1, Buddy Complex) | 50 (Ep. 1, Anime 2, nur Gruppe 24) |

**Gesamtergebnis: D-29/D-31/D-32/D-33 über sechs echte API-Aufrufe vollständig bestätigt. D-35s
Löschung von Hinweis-ID 6 ist real über SQL ausgeführt und mit Vorher-/Nachher-Snapshot
dokumentiert; IDs 2, 3, 5 sind nachweislich unverändert; die in dieser Runde selbst erzeugten
Testzeilen (8, 9, 13) sind absichtlich NICHT gelöscht.**
