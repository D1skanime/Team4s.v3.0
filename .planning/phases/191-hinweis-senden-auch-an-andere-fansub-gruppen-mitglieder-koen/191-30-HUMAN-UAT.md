# Plan 191-30 Task 1 — D-23 echter API-Gegencheck + D-24 echte Löschung mit Vorher-/Nachher-Snapshot

**Datum:** 2026-10-24
**Ausgeführt von:** Executor-Agent (Plan 191-30, Task 1), gegen den live laufenden Dev-Stack.

## Schritt -1 — Voraussetzung: Pläne 191-25/26/27/28/29/31 abgeschlossen

```
ls .planning/phases/191-hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen/191-{25,26,27,28,29,31}-SUMMARY.md
```
→ alle sechs `SUMMARY.md`-Dateien existieren (bestätigt vor dem Rebuild).

## Schritt 0 — Container neu gebaut/neu gestartet, Gesundheit bestätigt

Startzeit: `2026-10-24T01:54:33Z`

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
team4sv30-backend    Up 19 seconds   0.0.0.0:18092->8092/tcp
team4sv30-frontend   Up 16 seconds   0.0.0.0:3000->3000/tcp
```

Health-Checks:
```
curl -s http://192.168.235.196:18092/health
→ {"status":"ok"}
curl -s -o /dev/null -w "%{http_code}" http://192.168.235.196:3000/
→ 200
```

Beide Container sind nach dem Rebuild/Restart gesund und laufen mit dem Code-Stand nach
191-25..191-29/191-31.

## Schritt 0b — Baseline-Snapshot `fansub_group_hints` (VOR D-23-Check und D-24-Löschung)

```sql
SELECT id, sender_app_user_id, target_fansub_group_id, related_anime_id, note, status, created_at
FROM fansub_group_hints ORDER BY id;
```

| id | sender_app_user_id | target_fansub_group_id | related_anime_id | note | status | created_at |
|---|---|---|---|---|---|---|
| 1 | 5 | 26 | 2 | "D-16-Vorabpruefung Plan 191-19: Timer-Mitarbeit bei 11eyes nachzutragen (realer API-Test, kein Testdaten-Insert)." | open | 2026-10-23 21:18:16.046573+00 |
| 2 | 3 | 26 | 2 | "Rolle: Timing — UAT-Check: Timing bei 11eyes fehlt." | open | 2026-10-23 21:31:16.348516+00 |
| 3 | 3 | 24 | 2 | "Rolle: Timing — UAT-Check Fehler melden: Timing bei 11eyes." | open | 2026-10-23 21:32:17.342414+00 |
| 4 | 5 | 29 | 2 | "Rolle: Timing — Zeitraum: 2015–2017 — D-20-Test: Pruefung Zeitraum-Fragment Plan 191-24." | open | 2026-10-23 22:59:31.428304+00 |
| 5 | 3 | 32 | 7 | "Rolle: Encoding — Zeitraum: ab 2023 — UAT-Check Erfolgsansicht" | open | 2026-10-23 23:12:24.382082+00 |

Nur 5 Zeilen vorhanden (IDs 1-5), konsistent mit `191-24-HUMAN-UAT.md`/`191-25-SUMMARY.md`.

## Schritt 1 — D-23 Negativfall: ungültige (Zielgruppe, Projekt)-Kombination

**Vorab-Prüfung gegen `anime_fansub_groups` (Gruppe 29 „AnimeOwnage" hat KEINE Zeile für
anime_id=2 „11eyes"):**

```sql
SELECT fansub_group_id, anime_id FROM anime_fansub_groups WHERE fansub_group_id = 29;
→ nur (29, 4) — kein (29, 2)
```

Dies ist exakt die Konstellation des ursprünglichen D-23-Bugs (frühere Hinweis-ID 4 verknüpfte
Gruppe 29 mit Anime 2, obwohl diese Zuordnung nie existierte).

**Echter Login** als `jeahn45@team4s.de` (app_user_id=5, verifiziertes Mitgliedsprofil, bestätigte
Mitwirkung bei New-Subs/Buddy Complex, laut `191-19-HUMAN-UAT.md` weiterhin zutreffend):

```bash
curl -s -X POST "http://192.168.235.196:18081/realms/team4s/protocol/openid-connect/token" \
  -d "client_id=team4s-frontend" -d "grant_type=password" \
  -d "username=jeahn45" -d "password=123"
```
→ HTTP 200, echtes Keycloak-Access-Token.

```bash
curl -s "http://192.168.235.196:18092/api/v1/me" -H "Authorization: Bearer $TOKEN_JEAHN"
→ {"data":{"app_user_id":5,"display_name":"Jeahn45","email":"jeahn45@team4s.de", ...}}
```

**Negativer POST — Gruppe 29 (AnimeOwnage) + Anime 2 (11eyes):**

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "http://192.168.235.196:18092/api/v1/me/fansub-group-hints" \
  -H "Authorization: Bearer $TOKEN_JEAHN" -H "Content-Type: application/json" \
  -d '{"target_fansub_group_id": 29, "related_anime_id": 2, "note": "D-28-Gegencheck Plan 191-30: ungültige Gruppe-Projekt-Kombination, muss abgelehnt werden."}'
```

**Ergebnis:**
```json
{"error":{"message":"Anime-Fansub-Zuordnung nicht gefunden"}}
HTTP_STATUS:404
```

→ **BESTANDEN.** Der Server lehnt die Kombination mit `404` und der deutschen Fehlermeldung
„Anime-Fansub-Zuordnung nicht gefunden" ab, exakt wie `191-25-SUMMARY.md`/D-23 es vorsehen.
Kein Hinweis wurde erzeugt (kein `data`-Feld, keine neue Zeile).

## Schritt 2 — D-23 Positivfall: gültige (Zielgruppe, Projekt)-Kombination

**Vorab-Prüfung gegen `anime_fansub_groups` (Gruppe 25 „FlameHaze-subs" HAT eine Zeile für
anime_id=2 „11eyes"):**

```sql
SELECT fansub_group_id, anime_id FROM anime_fansub_groups WHERE fansub_group_id = 25;
→ (25, 2) — existiert
```

**Positiver POST — Gruppe 25 (FlameHaze-subs) + Anime 2 (11eyes), derselbe Sender/Token:**

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "http://192.168.235.196:18092/api/v1/me/fansub-group-hints" \
  -H "Authorization: Bearer $TOKEN_JEAHN" -H "Content-Type: application/json" \
  -d '{"target_fansub_group_id": 25, "related_anime_id": 2, "note": "D-28-Gegencheck Plan 191-30: gültige Gruppe-Projekt-Kombination, muss angenommen werden."}'
```

**Ergebnis:**
```json
{
  "data": {
    "id": 6,
    "sender_app_user_id": 5,
    "sender_display_name": "Jeahn45",
    "target_fansub_group_id": 25,
    "target_fansub_group_name": "FlameHaze-subs",
    "related_anime_id": 2,
    "related_anime_title": "11eyes",
    "note": "D-28-Gegencheck Plan 191-30: gültige Gruppe-Projekt-Kombination, muss angenommen werden.",
    "status": "open",
    "decided_by": null,
    "decided_at": null,
    "decision_note": null,
    "created_at": "2026-10-24T01:55:40.775286Z",
    "sender_own_group_name": "New-Subs"
  }
}
HTTP_STATUS:201
```

→ **BESTANDEN.** Die gültige Kombination wird mit `201` angenommen; der neue Hinweis erhält die
`id=6`.

**D-23-Gesamtergebnis: BESTANDEN** — die ungültige Kombination wird real abgelehnt (404), die
gültige Kombination wird real angenommen (201), beide über echte API-Aufrufe gegen den frisch
gebauten Live-Dev-Backend, nicht nur über Unit-Tests.

## Schritt 3 — D-24: Echte SQL-Löschung der Testdaten-IDs 1 und 4

```sql
DELETE FROM fansub_group_hints WHERE id IN (1, 4);
```
→ `DELETE 2`

**Re-Query nach der Löschung:**

```sql
SELECT id, sender_app_user_id, target_fansub_group_id, related_anime_id, note, status, created_at
FROM fansub_group_hints WHERE id IN (1,2,3,4,5,6) ORDER BY id;
```

| id | sender_app_user_id | target_fansub_group_id | related_anime_id | note | status | created_at |
|---|---|---|---|---|---|---|
| 2 | 3 | 26 | 2 | "Rolle: Timing — UAT-Check: Timing bei 11eyes fehlt." | open | 2026-10-23 21:31:16.348516+00 |
| 3 | 3 | 24 | 2 | "Rolle: Timing — UAT-Check Fehler melden: Timing bei 11eyes." | open | 2026-10-23 21:32:17.342414+00 |
| 5 | 3 | 32 | 7 | "Rolle: Encoding — Zeitraum: ab 2023 — UAT-Check Erfolgsansicht" | open | 2026-10-23 23:12:24.382082+00 |
| 6 | 5 | 25 | 2 | "D-28-Gegencheck Plan 191-30: gültige Gruppe-Projekt-Kombination, muss angenommen werden." | open | 2026-10-24 01:55:40.775286+00 |

IDs 1 und 4 sind weg; IDs 2, 3, 5 sind — Feld für Feld verglichen mit dem Schritt-0b-Baseline —
byte-identisch unverändert (sender, Zielgruppe, Projekt, Notiztext, Status, Erstellzeitpunkt).
ID 6 ist die in Schritt 2 neu erzeugte Zeile und war laut Plan-Vorgabe ausdrücklich NICHT Teil
der Löschung.

## Schritt 4 — Vorher-/Nachher-Tabelle (final)

| id | present-before | present-after |
|---|---|---|
| 1 | ja | **nein — gelöscht** |
| 2 | ja | ja (unverändert) |
| 3 | ja | ja (unverändert) |
| 4 | ja | **nein — gelöscht** |
| 5 | ja | ja (unverändert) |
| 6 | nein (existierte noch nicht) | ja (neu erzeugt in Schritt 2) |

## Zusammenfassung — exakte Konten/Gruppen/IDs

| Rolle | Konto | app_user_id | Verwendung |
|---|---|---|---|
| Absender (D-23 Negativ + Positiv) | `jeahn45@team4s.de` | 5 | POST negativ (29,2) → 404; POST positiv (25,2) → 201, neue id=6 |

| Fall | Zielgruppe | Projekt | Erwartung | Ergebnis |
|---|---|---|---|---|
| Negativ | 29 AnimeOwnage | 2 11eyes | 404 "Anime-Fansub-Zuordnung nicht gefunden" | BESTANDEN |
| Positiv | 25 FlameHaze-subs | 2 11eyes | 201, neuer Hinweis | BESTANDEN (id=6) |

**Gesamtergebnis: D-23 über zwei echte API-Aufrufe (Ablehnung + Annahme) bestätigt. D-24s
Löschung der IDs 1 und 4 ist real über SQL ausgeführt und mit Vorher-/Nachher-Snapshot
dokumentiert; IDs 2, 3, 5 sind nachweislich unverändert.**
