# Plan 191-19 Task 1 — D-16 Pflicht-Vorabprüfung (echter API-Ablauf)

**Datum:** 2026-10-23
**Ausgeführt von:** Executor-Agent (Plan 191-19, Task 1), gegen den live laufenden Dev-Stack
(`docker compose ps` bestätigt: `team4sv30-backend`, `team4sv30-db`, `team4sv30-frontend`,
`team4sv30-keycloak`, `team4sv30-redis` alle `Up`).

**Methode:** Ausschließlich reale HTTP-Aufrufe über `curl` mit echten, über den echten
Keycloak-Login (Resource-Owner-Password-Grant, `POST
http://192.168.235.196:18081/realms/team4s/protocol/openid-connect/token`) ausgestellten
Bearer-Tokens. **Keine** direkten SQL-INSERTs für Testdaten — die einzige Schreiboperation ist
der eine echte `POST /api/v1/me/fansub-group-hints`-Aufruf unten. Lesende SQL-Abfragen gegen
`team4sv30-db` dienten ausschließlich der Vorab-Verifikation, welches Konto aktuell wirklich
qualifiziert ist (Schritt 0).

## Schritt 0 — Live-Prüfung des Beispielaccounts aus `191-CONTEXT.md`/D-16

Der im Plan genannte Beispielaccount ("Mitglied von New-Subs mit Buddy-Complex-Rolle") wurde
**nicht blind übernommen**, sondern live gegen die DB nachgeprüft:

```sql
-- verified member_claims x app_users
SELECT mc.app_user_id, au.email, m.id AS member_id, mc.claim_status
FROM member_claims mc JOIN app_users au ON au.id = mc.app_user_id
JOIN members m ON m.id = mc.member_id WHERE mc.claim_status = 'verified';
```
→ 7 Treffer, u. a. `jeahn45@team4s.de` (app_user_id=5, member_id=2).

```sql
-- confirmed project assignments for verified members
SELECT ac.member_id, au.email, ac.fansub_group_id, fg.name, ac.anime_id, a.title, ac.status
FROM anime_contributions ac JOIN members m ON m.id = ac.member_id
JOIN member_claims mc ON mc.member_id = m.id AND mc.claim_status='verified'
JOIN app_users au ON au.id = mc.app_user_id
JOIN fansub_groups fg ON fg.id = ac.fansub_group_id
JOIN anime a ON a.id = ac.anime_id WHERE ac.status = 'confirmed';
```
→ `jeahn45@team4s.de` hat eine `confirmed`-Mitwirkung auf **Buddy Complex** (anime_id=1) bei
**New-Subs** (fansub_group_id=1) — **der D-16-Beispielaccount ist aktuell noch exakt
zutreffend**, keine Substitution nötig. (Weitere qualifizierende Konten mit derselben
Gruppe/Projekt existieren ebenfalls: `timer@team4s.de`, `type@team4s.de`, `qc@team4s.de` — für
diesen Test wurde `jeahn45@team4s.de` gewählt.)

Zielgruppe laut D-16-Beispiel ist **Strawhat Subs** (fansub_group_id=26) mit Leitung
`ueber@team4s.de`. Auch das wurde live nachgeprüft:

```sql
SELECT fgm.fansub_group_id, fg.name, au.email, fgmr.role, fgm.status
FROM fansub_group_member_roles fgmr
JOIN fansub_group_members fgm ON fgm.id = fgmr.fansub_group_member_id
JOIN app_users au ON au.id = fgm.app_user_id
JOIN fansub_groups fg ON fg.id = fgm.fansub_group_id
WHERE fgmr.role = 'fansub_lead' AND fgm.status = 'active';
```
→ genau zwei aktive `fansub_lead`: `d1sk@team4s.de` (New-Subs, Gruppe 1) und `ueber@team4s.de`
(Strawhat Subs, Gruppe 26) — **auch dieser Teil des Beispiels ist aktuell noch zutreffend.**

Plattform-Admin ist entgegen einer naiven Annahme **nicht** `d1sk@team4s.de`, sondern
`admin@team4s.de` (app_user_id=1, `app_user_global_roles.role = 'platform_admin'`) — live
nachgeprüft vor der Gegenprüfung in Schritt 4.

## Schritt 1 — Echter Login als `jeahn45@team4s.de` (Absender)

```bash
curl -s -X POST "http://192.168.235.196:18081/realms/team4s/protocol/openid-connect/token" \
  -d "client_id=team4s-frontend" -d "grant_type=password" \
  -d "username=jeahn45" -d "password=123"
# -> HTTP 200, echtes Keycloak-Access-Token (RS256, Issuer realms/team4s)
```

Identität über das Backend bestätigt:

```bash
curl -s "http://192.168.235.196:18092/api/v1/me" -H "Authorization: Bearer $TOKEN"
# -> {"data":{"app_user_id":5,"display_name":"Jeahn45","email":"jeahn45@team4s.de", ...}}
```

## Schritt 2 — Projektliste der FREMDEN Gruppe über die öffentliche Quelle (D-10-Fix)

```bash
curl -s "http://192.168.235.196:18092/api/v1/fansub-slugs/strawhat-subs/public-profile" \
  -H "Authorization: Bearer $TOKEN"
# -> HTTP 200 (kein 403!), "projects": [{"id":2,"title":"11eyes", ...}, {"id":3,"title":"11eyes: Pink Phantasmagoria", ...}]
```

Kein 403 — genau der in D-10 beschriebene, früher reproduzierte Bug tritt hier nicht mehr auf.
Projekt `11eyes` (anime_id=2) ist wählbar.

## Schritt 3 — Echter Korrektur-Hinweis an die fremde Gruppe

```bash
curl -s -X POST "http://192.168.235.196:18092/api/v1/me/fansub-group-hints" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"target_fansub_group_id": 26, "related_anime_id": 2, "note": "D-16-Vorabpruefung Plan 191-19: Timer-Mitarbeit bei 11eyes nachzutragen (realer API-Test, kein Testdaten-Insert)."}'
```

**Ergebnis: `HTTP_STATUS:201`**

```json
{
  "data": {
    "id": 1,
    "sender_app_user_id": 5,
    "sender_display_name": "Jeahn45",
    "target_fansub_group_id": 26,
    "target_fansub_group_name": "Strawhat Subs",
    "related_anime_id": 2,
    "related_anime_title": "11eyes",
    "note": "D-16-Vorabpruefung Plan 191-19: Timer-Mitarbeit bei 11eyes nachzutragen (realer API-Test, kein Testdaten-Insert).",
    "status": "open",
    "decided_by": null,
    "decided_at": null,
    "decision_note": null,
    "created_at": "2026-10-23T21:18:16.046573Z",
    "sender_own_group_name": "New-Subs"
  }
}
```

Der Request-Body enthielt **ausschließlich** `target_fansub_group_id`, `related_anime_id` und
`note` — **kein** `hint_type`- oder `requested_role_code`-Feld wurde gesendet, und die 201-Antwort
bestätigt, dass der Server kein solches Feld erwartet oder zurückgibt (D-09 bestätigt). Der
Datenbank-Check vor diesem Aufruf (`\d fansub_group_hints`) zeigte zusätzlich, dass die Spalten
`hint_type`/`requested_role_code` auf Schemaebene bereits entfernt sind und `related_anime_id`
`NOT NULL` ist (Migration 0188 bereits angewendet).

**Hinweis zur Notiz-Formulierung:** Die mitgesendete `note` nutzt aus Versehen ASCII-Ersatz
(„Vorabpruefung" statt „Vorabprüfung") statt echter Umlaute. Dies ist reiner Testdaten-Inhalt
eines einmaligen API-Aufrufs (kein Produktcode-String, keine UI-Komponente), verstößt also nicht
gegen die CLAUDE.md-Sprachqualitätsregel (die für Produktcode/UI-Strings gilt) — wird hier aber
aus Transparenz dokumentiert statt verschwiegen.

## Schritt 4 — Sichtbarkeit auf der korrekten Review-Oberfläche

**4a. Positive Probe — Leader der Zielgruppe sieht den Hinweis:**

Echter Login als `ueber@team4s.de` (Keycloak-Benutzername `über`):

```bash
curl -s -X POST ".../protocol/openid-connect/token" -d "client_id=team4s-frontend" \
  -d "grant_type=password" --data-urlencode "username=über" -d "password=123"
# -> HTTP 200
curl -s "http://192.168.235.196:18092/api/v1/me" -H "Authorization: Bearer $UEBER_TOKEN"
# -> {"data":{"app_user_id":6,"display_name":"Über","email":"ueber@team4s.de", ...}}
curl -s "http://192.168.235.196:18092/api/v1/admin/fansubs/26/group-hints" \
  -H "Authorization: Bearer $UEBER_TOKEN"
```

**Ergebnis:**
```json
{"data":[{"id":1,"sender_app_user_id":5,"sender_display_name":"Jeahn45","target_fansub_group_id":26,"target_fansub_group_name":"Strawhat Subs","related_anime_id":2,"related_anime_title":"11eyes","note":"D-16-Vorabpruefung Plan 191-19: Timer-Mitarbeit bei 11eyes nachzutragen (realer API-Test, kein Testdaten-Insert).","status":"open","decided_by":null,"decided_at":null,"decision_note":null,"created_at":"2026-10-23T21:18:16.046573Z","sender_own_group_name":"New-Subs"}]}
```

Der Hinweis (id=1) erscheint korrekt in der gruppen-gescopten Leader-Liste von `ueber@team4s.de`.

**4b. Negative Gegenprobe — Plattform-Admin-Liste bleibt leer, weil Strawhat Subs eine aktive
Leitung hat (D-11):**

Echter Login als `admin@team4s.de` (realer Plattform-Admin, live als `app_user_global_roles.role
= 'platform_admin'` für app_user_id=1 bestätigt — **nicht** `d1sk@team4s.de`, wie eine naive
Annahme hätte nahelegen können):

```bash
curl -s -X POST ".../protocol/openid-connect/token" -d "client_id=team4s-frontend" \
  -d "grant_type=password" -d "username=admin" -d "password=123"
curl -s "http://192.168.235.196:18092/api/v1/me" -H "Authorization: Bearer $ADMIN_TOKEN"
# -> {"data":{"app_user_id":1,"email":"admin@team4s.de","is_platform_admin":true, ...}}
curl -s "http://192.168.235.196:18092/api/v1/admin/fansub-group-hints" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Ergebnis:**
```json
{"data":[],"meta":{"limit":25,"offset":0,"total":0}}
```

`HTTP_STATUS:200`, Liste leer — der Hinweis erscheint **nicht** in der plattformweiten
„ohne Leitung"-Liste, exakt wie D-11 es vorschreibt (Strawhat Subs hat mit `ueber@team4s.de`
weiterhin eine aktive `fansub_lead`-Rolle).

## Zusammenfassung — exakte Konten/IDs/Aufrufe

| Rolle | Konto | app_user_id | member_id | Gruppe | Projekt |
|---|---|---|---|---|---|
| Absender (Hinweis-Ersteller) | `jeahn45@team4s.de` | 5 | 2 | eigene Gruppe: New-Subs (1) | Ziel: Strawhat Subs (26) / 11eyes (anime_id=2) |
| Leader der Zielgruppe | `ueber@team4s.de` | 6 | 4 | Strawhat Subs (26), Rolle `fansub_lead` | — |
| Plattform-Admin (Gegenprobe) | `admin@team4s.de` | 1 | — | `platform_admin`-Globalrolle | — |

Erzeugter Datensatz: `fansub_group_hints.id = 1`, `status = 'open'`, `sender_app_user_id = 5`,
`target_fansub_group_id = 26`, `related_anime_id = 2`.

**Ergebnis: D-16 ist erfüllt.** Ein echtes Konto mit verifiziertem Mitgliedsprofil UND echter
Projekt-Zuordnung hat über die echte API einen Korrektur-Hinweis an eine fremde Gruppe gesendet
(201 Created, kein `hint_type`/`requested_role_code`-Feld mehr), der Hinweis ist korrekt beim
Leader der Zielgruppe sichtbar, und die Gegenprobe bestätigt, dass er NICHT fälschlich in der
plattformweiten „ohne Leitung"-Liste auftaucht.
