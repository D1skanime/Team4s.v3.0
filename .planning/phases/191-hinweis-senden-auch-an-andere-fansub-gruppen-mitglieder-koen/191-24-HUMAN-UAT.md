# Plan 191-24 Task 1 — D-22 erschöpfende Vorabprüfung (echte API/UI, keine Stichprobe)

**Datum:** 2026-10-23
**Ausgeführt von:** Executor-Agent (Plan 191-24, Task 1), gegen den live laufenden Dev-Stack
(`docker compose ps` bestätigt: `team4sv30-backend`, `team4sv30-db`, `team4sv30-frontend`,
`team4sv30-keycloak`, `team4sv30-redis` alle `Up`).

**Methode:** Reale HTTP-Aufrufe über `curl` mit echten, über den echten Keycloak-Login
(Resource-Owner-Password-Grant, `POST http://192.168.235.196:18081/realms/team4s/protocol/
openid-connect/token`) ausgestellten Bearer-Tokens gegen `http://192.168.235.196:18092`, ergänzt
um direkte lesende SQL-Abfragen gegen `team4sv30-db` (Baseline-Snapshot, vollständige
Leitungs-Enumeration) und die bereits bestehenden, tatsächlich ausgeführten Komponenten-/
Logiktests (kein `os.ReadFile`+`strings.Contains`-Muster). Browser-UI-Automation stand in dieser
Umgebung nicht zur Verfügung — für D-17/D-19 wird deshalb explizit die Methode "Quelltext-
Verifikation + echte, tatsächlich ausgeführte Komponententests (React Testing Library, nicht nur
Unit-Tests der reinen Logik)" verwendet, bei D-18/D-20/D-22 reale HTTP-Aufrufe.

**Lehre aus der letzten Runde, befolgt:** Die Enumeration der leitungslosen Gruppen unten ist die
VOLLSTÄNDIGE Live-Abfrage aller 17 Fansub-Gruppen, nicht eine Stichprobe — Gruppe 24
(Bloody-Shadow) ist explizit enthalten.

## Schritt 0 — Baseline-Snapshot `fansub_group_hints` IDs 1, 2, 3 (VOR der Prüfung)

```sql
SELECT * FROM fansub_group_hints WHERE id IN (1,2,3) ORDER BY id;
```

| id | sender_app_user_id | target_fansub_group_id | related_anime_id | note | status | created_at |
|---|---|---|---|---|---|---|
| 1 | 5 | 26 | 2 | "D-16-Vorabpruefung Plan 191-19: Timer-Mitarbeit bei 11eyes nachzutragen (realer API-Test, kein Testdaten-Insert)." | open | 2026-10-23 21:18:16.046573+00 |
| 2 | 3 | 26 | 2 | "Rolle: Timing — UAT-Check: Timing bei 11eyes fehlt." | open | 2026-10-23 21:31:16.348516+00 |
| 3 | 3 | 24 | 2 | "Rolle: Timing — UAT-Check Fehler melden: Timing bei 11eyes." | open | 2026-10-23 21:32:17.342414+00 |

Diese drei Zeilen sind die Live-Testdaten des Nutzers aus den beiden vorherigen UAT-Runden
(191-19, zweite Runde) und dürfen durch diesen Schritt nicht verändert werden.

## Schritt 1 — D-17: Erfolgsansicht bleibt sichtbar (beide Einstiege)

**Methode:** Quelltext-Verifikation (`ProposalForm.tsx:304-362`, `ReportHintEntryPoint.tsx:111-129`,
`MyProposalsSection.tsx:72-178`) + tatsächliche Ausführung der zugehörigen React-Testing-Library-
Komponententests (nicht nur reine Logiktests; echtes Rendern + echte `act()`-Callback-Auslösung).

Live ausgeführt:
```
npx vitest run src/components/contributions/ReportHintEntryPoint.test.tsx \
  src/components/contributions/MyProposalsSection.test.tsx \
  src/components/contributions/ProposalForm.test.tsx \
  src/components/contributions/ProposalForm.steps.test.tsx \
  src/components/contributions/ProposalForm.useSubmit.test.ts
```
→ **5 Dateien, 65 Tests, alle PASS.**

Konkret ausgeführte, D-17-relevante Fälle:
- `ReportHintEntryPoint.test.tsx` — "onSuccess ist ein No-op — das Formular bleibt nach einem
  erfolgreichen Submit gemountet (D-17)": ruft `onSuccess()` echt auf und prüft, dass
  `ProposalForm` weiterhin gemountet bleibt; erst `onClose()` unmountet es. PASS.
- `MyProposalsSection.test.tsx` — "onSuccess ist ein No-op — onReload wird NICHT aufgerufen" UND
  "onClose schliesst das Formular UND ruft onReload genau einmal auf": ruft beide Callbacks echt
  auf und prüft `onReload`-Aufrufzähler via `vi.fn()`. PASS für beide.

**Quelltext-Bestätigung (Einstieg `/me/contributions`):** `MyProposalsSection.tsx:172-181` übergibt
`onSuccess={() => {}}` (No-op) und `onClose={handleFormClose}`; `handleFormClose` (Zeilen 78-81)
ist die einzige Stelle, die `onReload()` auslöst — ausschließlich bei einem aktiven Klick auf
"Fertig" im Modal-Footer (`ProposalForm.tsx:306-309`, `resetAndClose` → `onClose()`).

**Quelltext-Bestätigung (Einstieg "Fehler melden" auf öffentlicher Projekt-/Release-Seite):**
`ReportHintEntryPoint.tsx:111-126` übergibt ebenfalls `onSuccess={() => {}}` und
`onClose={() => setIsOpen(false)}` — identisches Muster, zweiter unabhängiger Aufrufer, dieselbe
Korrektur.

**Ergebnis D-17: BESTANDEN** für beide Einstiege (`/me/contributions` und "Fehler melden").

## Schritt 2 — D-18: Eigene Fremd-Hinweise sichtbar (echter API-Call als echter Absender)

**Methode:** Echte Logins + echte `GET /api/v1/me/fansub-group-hints`-Aufrufe als zwei
verschiedene reale Absender, inklusive direkter IDOR-Gegenprobe.

Login `jeahn45@team4s.de` (app_user_id=5, Absender von Hinweis id=1):
```
curl -s "http://192.168.235.196:18092/api/v1/me/fansub-group-hints" -H "Authorization: Bearer $TOKEN_JEAHN"
→ {"data":[{"id":1,"sender_app_user_id":5, ... "target_fansub_group_name":"Strawhat Subs", ...}]}
```
Ergebnis: **genau 1 Treffer, id=1**, kein Fremd-Datensatz enthalten.

Login `timer@team4s.de` (app_user_id=3, Absender der Hinweise id=2 UND id=3):
```
curl -s "http://192.168.235.196:18092/api/v1/me/fansub-group-hints" -H "Authorization: Bearer $TOKEN_TIMER"
→ {"data":[{"id":2,"sender_app_user_id":3, "target_fansub_group_name":"Strawhat Subs", ...},
            {"id":3,"sender_app_user_id":3, "target_fansub_group_name":"Bloody-Shadow", ...}]}
```
Ergebnis: **genau 2 Treffer, ids=2,3**, keiner von `jeahn45`s Hinweis id=1.

**IDOR-Gegenprobe bestanden:** `jeahn45` sieht NIE `timer`s Hinweise (ids 2,3) und umgekehrt
sieht `timer` NIE `jeahn45`s Hinweis (id 1) — jeder Absender sieht ausschließlich seine eigenen,
unabhängig von der Zielgruppe (eigene UND fremde Gruppe enthalten).

**Ergebnis D-18: BESTANDEN.**

## Schritt 3 — D-19: 90-Tage-Text nur bei eigener Gruppe (beide groupScope-Fälle einzeln)

**Methode:** Quelltext-Verifikation (`ProposalForm.steps.tsx:378-382`, `ProposalForm.tsx:436`
`showYearAndInfoPanel` — mittlerweile direkt als `groupScope`-Prop an `Step3NoteRange`
durchgereicht statt eines Booleans) + echte Ausführung der zugehörigen Komponententests
(`ProposalForm.steps.test.tsx`, Teil der oben ausgeführten 65 grünen Tests).

**Fall `groupScope === 'own'`:**
```tsx
groupScope === 'own'
  ? 'Keine Reaktion nach 90 Tagen: Vorschlag kann selbst öffentlich geschaltet werden.'
  : ...
```
→ zeigt den 90-Tage-Text.

**Fall `groupScope === 'foreign'`:**
```tsx
: 'Der Hinweis geht an die Leitung der Zielgruppe — oder, falls diese aktuell keine Leitung hat,
   an den Plattform-Admin. Es passiert nichts automatisch.'
```
→ zeigt die neue Routing-Formulierung statt des 90-Tage-Texts.

Von-/Bis-Jahr-Felder (`ProposalForm.steps.tsx:350-371`) sind unconditioned (kein `groupScope`-Gate)
— für BEIDE Fälle sichtbar, wie D-19/D-20 es fordern.

**Ergebnis D-19: BESTANDEN** für beide groupScope-Fälle einzeln geprüft.

## Schritt 4 — D-20: Zeitraum landet in der Notiz (echter Request mit Jahresangabe, zurückgelesen)

**Methode:** Echter `POST /api/v1/me/fansub-group-hints`-Aufruf mit einer Notiz, die exakt dem
von `buildHintSubmitPayload`/`buildYearContext` (`ProposalForm.useSubmit.ts:80-101`) erzeugten
Format entspricht (`Rolle: {label} — Zeitraum: {von}–{bis} — {Freitext}`), gefolgt von einem
echten Rücklese-Aufruf über den Admin-Review-Endpunkt.

Sender: `jeahn45@team4s.de` (app_user_id=5). Zielgruppe: **AnimeOwnage (fansub_group_id=29,
fremde Gruppe, keine aktive Leitung)**. Projekt: 11eyes (anime_id=2).

```
curl -s -X POST ".../api/v1/me/fansub-group-hints" -H "Authorization: Bearer $TOKEN_JEAHN" \
  -d '{"target_fansub_group_id": 29, "related_anime_id": 2,
      "note": "Rolle: Timing — Zeitraum: 2015–2017 — D-20-Test: Pruefung Zeitraum-Fragment Plan 191-24."}'
→ HTTP 201, {"data":{"id":4, ... "note":"Rolle: Timing — Zeitraum: 2015–2017 — D-20-Test: ...", "status":"open", ...}}
```

Rückgelesen über den echten Review-Endpunkt (Plattform-Admin, da Gruppe 29 keine aktive Leitung
hat — siehe Schritt 5):
```
curl -s "http://192.168.235.196:18092/api/v1/admin/fansub-group-hints" -H "Authorization: Bearer $TOKEN_ADMIN"
→ enthält id=4 mit identischem note-Feld: "Rolle: Timing — Zeitraum: 2015–2017 — D-20-Test: ..."
```

Das Notiz-Feld enthält nach dem Rundlauf durch Insert → Datenbank → Lese-Join unverändert das
dokumentierte Fragment `Zeitraum: 2015–2017` (inkl. korrektem En-Dash `–`), byte-identisch zum
gesendeten Wert — kein Truncation-, Escaping- oder Encoding-Verlust.

**Ergebnis D-20: BESTANDEN.**

## Schritt 5 — D-21: Kommentare tatsächlich umformuliert (grep auf alte Phrasen)

```
grep -rn "D-10 (Live-UAT-Bugfix)\|Anfrage.*Mitgliedschaft\|requested_role_code\|hint_type" \
  backend/cmd/server/main.go frontend/src/components/contributions/
```
→ **0 Treffer** in `main.go` und in Produktcode-Dateien unter `contributions/` (der einzige
verbliebene Treffer ist ein Test-Datei-Kommentar in `ProposalForm.test.tsx:296`, außerhalb des
von D-21 explizit benannten Scopes `main.go:647-649`/`:670-673`, `ProposalForm.useSubmit.ts:28`,
`ProposalForm.tsx:162`).

Live gelesen (`backend/cmd/server/main.go:647-686`): die D-09/D-11-Kommentare beschreiben jetzt
den tatsächlichen aktuellen Stand ("Es findet in diesem Pfad KEINE Rollenvalidierung statt (D-09
hat die fruehere Mitgliedschaftsanfrage... vollstaendig gestrichen)", "Plattform-weite
Entscheidungsflaeche... deren Zielgruppe aktuell KEINE aktive Leitung (Rolle fansub_lead) hat
(D-11)") statt des gestrichenen Mitgliedschaftsanfrage-Konzepts.

`ProposalForm.useSubmit.ts:1-16` (Datei-Kopf-Kommentar) erklärt die fachliche Regel (zwei
unterschiedliche Backend-Tabellen je Gruppen-Zugehörigkeit) als Haupterklärung, nicht mehr "D-10
Live-UAT-Bugfix" als alleinige Begründung. `ProposalForm.tsx:162-167` erklärt ebenfalls zuerst die
fachliche Regel (keine Mitgliedschaft bei Fremdgruppe → öffentliche Quelle statt 403), "(D-10)" nur
als Zusatzverweis am Ende des Satzes.

**Ergebnis D-21: BESTANDEN.**

## Schritt 6 — D-22 Kernlehre: VOLLSTÄNDIGE Enumeration aller Gruppen ohne aktive Leitung

**Vollständige Live-Abfrage ALLER 17 Fansub-Gruppen gegen aktive `fansub_lead`-Rollen:**
```sql
SELECT fgm.fansub_group_id, fg.name, au.email
FROM fansub_group_member_roles fgmr
JOIN fansub_group_members fgm ON fgm.id = fgmr.fansub_group_member_id
JOIN app_users au ON au.id = fgm.app_user_id
JOIN fansub_groups fg ON fg.id = fgm.fansub_group_id
WHERE fgmr.role = 'fansub_lead' AND fgm.status = 'active'
ORDER BY fgm.fansub_group_id;
```
→ **genau 2 Treffer:** Gruppe 1 (New-Subs, `d1sk@team4s.de`), Gruppe 26 (Strawhat Subs,
`ueber@team4s.de`).

Alle 17 Fansub-Gruppen laut `SELECT id, name FROM fansub_groups`:
1 New-Subs, 24 Bloody-Shadow, 25 FlameHaze-subs, 26 Strawhat Subs, 29 AnimeOwnage,
30 Project Messiah, 32 Generation: Anime Xtreme, 33 Shayo-Subs, 34 Dragon-Subs,
35 Red-Panda Fansubs, 36 Shiroi-Fansubs, 61 Lunatic-Studio, 112 LS-SUBS, 113 Morai-Subs,
114 LazySubs, 115 MelonSubs, 138 TaiyoSubs.

**Die VOLLSTÄNDIGE Liste der Gruppen OHNE aktive Leitung (15 von 17, alle einzeln geprüft) —
explizit mit Gruppe 24 enthalten:**

| Gruppe-ID | Name | Hat Hinweise? | Ergebnis |
|---|---|---|---|
| **24** | **Bloody-Shadow** | **Ja — id=3 (sender timer@team4s.de)** | **Erscheint korrekt in `GET /admin/fansub-group-hints` (bestätigt Schritt 7), NICHT in einer (nicht existierenden) Leader-Liste — der einzig gesehene Fehler der letzten Runde ist hiermit erneut und vollständig korrigiert bestätigt.** |
| 25 | FlameHaze-subs | Nein | Kein Hinweis vorhanden, nichts weiter zu prüfen. |
| 29 | AnimeOwnage | Ja — id=4 (sender jeahn45@team4s.de, dieser Plan, Schritt 4) | Erscheint korrekt in `GET /admin/fansub-group-hints` (bestätigt Schritt 7). |
| 30 | Project Messiah | Nein | Kein Hinweis vorhanden, nichts weiter zu prüfen. |
| 32 | Generation: Anime Xtreme | Nein | Kein Hinweis vorhanden, nichts weiter zu prüfen. |
| 33 | Shayo-Subs | Nein | Kein Hinweis vorhanden, nichts weiter zu prüfen. |
| 34 | Dragon-Subs | Nein | Kein Hinweis vorhanden, nichts weiter zu prüfen. |
| 35 | Red-Panda Fansubs | Nein | Kein Hinweis vorhanden, nichts weiter zu prüfen. |
| 36 | Shiroi-Fansubs | Nein | Kein Hinweis vorhanden, nichts weiter zu prüfen. |
| 61 | Lunatic-Studio | Nein | Kein Hinweis vorhanden, nichts weiter zu prüfen. |
| 112 | LS-SUBS | Nein | Kein Hinweis vorhanden, nichts weiter zu prüfen. |
| 113 | Morai-Subs | Nein | Kein Hinweis vorhanden, nichts weiter zu prüfen. |
| 114 | LazySubs | Nein | Kein Hinweis vorhanden, nichts weiter zu prüfen. |
| 115 | MelonSubs | Nein | Kein Hinweis vorhanden, nichts weiter zu prüfen. |
| 138 | TaiyoSubs | Nein | Kein Hinweis vorhanden, nichts weiter zu prüfen. |

Diese Tabelle deckt **alle 15** leitungslosen Gruppen individuell ab (jede Zeile einzeln anhand der
vollständigen `fansub_group_hints`-Tabelle geprüft, nicht gegen eine Teilmenge), nicht nur die
beiden, die tatsächlich Hinweise haben.

## Schritt 7 — Echte Gegenprobe: Admin-Liste vs. Leader-Liste pro Zielgruppe

**Admin-Liste (`GET /admin/fansub-group-hints`, Plattform-Admin `admin@team4s.de`,
app_user_id=1, `is_platform_admin: true`):**
```
→ {"data":[
    {"id":4, "target_fansub_group_id":29, "target_fansub_group_name":"AnimeOwnage", "note": "...Zeitraum: 2015–2017..."},
    {"id":3, "target_fansub_group_id":24, "target_fansub_group_name":"Bloody-Shadow", ...}
  ], "meta":{"total":2}}
```
→ **genau 2 Treffer, ids=3,4** — exakt die beiden Hinweise an Gruppen ohne aktive Leitung (24 und
29), keine Hinweise an Gruppen MIT aktiver Leitung (26) darunter.

**Leader-Liste für Gruppe 26 (`GET /admin/fansubs/26/group-hints`, Leader `ueber@team4s.de`,
app_user_id=6):**
```
→ {"data":[{"id":1, "target_fansub_group_id":26, ...}, {"id":2, "target_fansub_group_id":26, ...}]}
```
→ **genau 2 Treffer, ids=1,2** — exakt die beiden Hinweise an Strawhat Subs (hat aktive Leitung),
korrekt NICHT in der Admin-Liste.

**Negative Gegenprobe (gruppen-gescopter Pfad für eine leitungslose Gruppe, kein Leader
vorhanden):** `timer@team4s.de` (weder Admin noch Mitglied/Leitung von Gruppe 24) ruft
`GET /admin/fansubs/24/group-hints` auf:
```
→ HTTP 403 {"error":{"message":"keine berechtigte gruppenmitgliedschaft gefunden","reason_code":"no_membership"}}
```
→ Für eine leitungslose Gruppe existiert strukturell keine erreichbare Leader-Entscheidungsfläche
für einen normalen Nutzer — bestätigt, dass Hinweis id=3 (Gruppe 24) ausschließlich über die
Plattform-Admin-Liste entscheidbar ist, exakt wie D-11 es vorschreibt.

**Positive Admin-Bypass-Kontrolle (derselbe gruppen-gescopte Pfad, aber als Plattform-Admin):**
```
GET /admin/fansubs/24/group-hints als admin@team4s.de → HTTP 200, enthält id=3
```
→ bestätigt zusätzlich, dass der Plattform-Admin (wie von D-01/`CanForFansubGroup` vorgesehen)
auch über den gruppen-gescopten Pfad Zugriff hat — kein Widerspruch zu D-11, nur eine zweite,
redundante Zugriffsmöglichkeit für dieselbe Rolle.

## Schritt 8 — Baseline-vs-Final-Vergleich `fansub_group_hints` IDs 1, 2, 3 (NACH der Prüfung)

```sql
SELECT * FROM fansub_group_hints WHERE id IN (1,2,3) ORDER BY id;
```

| id | sender_app_user_id | target_fansub_group_id | related_anime_id | note | status | created_at |
|---|---|---|---|---|---|---|
| 1 | 5 | 26 | 2 | "D-16-Vorabpruefung Plan 191-19: Timer-Mitarbeit bei 11eyes nachzutragen (realer API-Test, kein Testdaten-Insert)." | open | 2026-10-23 21:18:16.046573+00 |
| 2 | 3 | 26 | 2 | "Rolle: Timing — UAT-Check: Timing bei 11eyes fehlt." | open | 2026-10-23 21:31:16.348516+00 |
| 3 | 3 | 24 | 2 | "Rolle: Timing — UAT-Check Fehler melden: Timing bei 11eyes." | open | 2026-10-23 21:32:17.342414+00 |

**Vergleich zur Schritt-0-Baseline: IDENTISCH** — jedes Feld jeder der drei Zeilen (sender,
Zielgruppe, Projekt, Notiztext, Status, Erstellzeitpunkt) ist byte-identisch zum Vorher-Snapshot.
Dies wird hier explizit festgestellt, nicht nur implizit angenommen: kein Task in diesem Plan oder
seinen Abhängigkeiten hat eine direkte SQL-Mutation gegen `fansub_group_hints` ausgeführt — die
einzige neue Schreiboperation war der eine echte `POST /api/v1/me/fansub-group-hints`-Aufruf aus
Schritt 4, der eine NEUE Zeile (id=4) erzeugte, ohne IDs 1-3 zu berühren.

## Zusammenfassung — exakte Konten/Gruppen/IDs

| Rolle | Konto | app_user_id | Gruppe (eigen) |
|---|---|---|---|
| Absender 1 | `jeahn45@team4s.de` | 5 | New-Subs (1) |
| Absender 2 | `timer@team4s.de` | 3 | New-Subs (1) |
| Leader Strawhat Subs (26, hat aktive Leitung) | `ueber@team4s.de` | 6 | Strawhat Subs (26) |
| Plattform-Admin | `admin@team4s.de` | 1 | — |

Neu erzeugter Datensatz in diesem Plan: `fansub_group_hints.id = 4` (Sender 5, Zielgruppe 29
AnimeOwnage, Status `open`, Notiz mit `Zeitraum: 2015–2017`-Fragment).

**Gesamtergebnis: D-17 bis D-21 jeweils einzeln BESTANDEN; D-22s Kernlehre (vollständige, nicht
stichprobenhafte Enumeration aller 15 leitungslosen Gruppen inkl. Gruppe 24) ist erfüllt; die
Live-Testdaten-IDs 1, 2, 3 sind nachweislich unverändert.**
