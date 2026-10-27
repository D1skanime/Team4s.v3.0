# Team4s E2E-Testanmeldung (Playwright)

Rollenbasierte End-to-End-Tests gegen den echten Login-Pfad, damit auch autonome KI-Aufträge
ohne manuelle Passworteingabe prüfen können, ob Berechtigungen im Frontend und Backend wirklich
greifen.

## Einstiegspunkt

```bash
bash scripts/e2e.sh
```

Das ist der einzige Befehl, den ein Agent oder eine CI-Pipeline braucht. Er führt in dieser
Reihenfolge aus und bricht bei jedem Fehler mit einem Exit-Code ungleich 0 ab (auch wenn am Ende
0 Tests gelaufen sind):

1. `scripts/e2e/provision.sh` — legt idempotent die 5 Keycloak-Testkonten an und stellt die
   DB-Fixtures für "E2E Gruppe A" sicher (siehe unten). Ein erneuter Lauf erkennt bereits
   vorhandene Konten/Mitgliedschaften und überspringt sie, statt Duplikate zu erzeugen.
2. `npx playwright test` im `frontend/`-Verzeichnis — meldet jede Rolle über das echte,
   Keycloak-gehostete Login-Formular an (`frontend/e2e/auth.setup.ts`) und führt danach die
   vier Rollen-Specs aus.

Das Skript läuft gegen den laufenden lokalen Docker-Dev-Stack (Frontend auf
`http://127.0.0.1:3000`, Backend auf `http://127.0.0.1:18092`, Keycloak auf
`http://127.0.0.1:18081` — per `E2E_BASE_URL`/`E2E_API_BASE`/`E2E_KC_BASE` überschreibbar).

## Die 5 Testrollen

Alle Konten liegen unter der Dev-only-Domäne `@team4s.test` und sind strikt von den echten
`*@team4s.de`-Konten (Passwort `123`) getrennt — letztere werden von keinem E2E-Skript je
angefasst.

| Konto | Realm-Rolle | Live-Mitgliedschaft in "E2E Gruppe A" | Geprüft durch |
|---|---|---|---|
| `e2e-admin@team4s.test` | `platform_admin` | — | sieht die Admin-Benutzerliste |
| `e2e-leader@team4s.test` | `user` | `fansub_lead` | sieht "Eingehende Hinweise" + "Offene Vorschläge" im Tab "Fansub Members" |
| `e2e-deputy@team4s.test` | `user` | `fansub_lead` (zweite Leitung — siehe Hinweis unten) | provisioniert, noch ohne eigene Spec |
| `e2e-member@team4s.test` | `user` | einfaches Mitglied (historisch verlinkt, keine Live-Rolle) | kein Button + 403 bei der geschützten Bearbeitung |
| `e2e-user@team4s.test` | `user` | keine | erreicht `/admin/users` nicht |

**Hinweis zu "Stellvertretung":** Das Live-Berechtigungsmodell kennt nur eine Leitungsrolle
(`fansub_lead`). Es gibt keine separate Stellvertretungsrolle in der Datenbank. `e2e-deputy`
ist deshalb als zweite Leitung derselben Gruppe modelliert — siehe Begründung im
`DECISIONS.md`-Eintrag "E2E-Testanmeldung".

## Passwörter

Die Skripte erzeugen bzw. lesen Passwörter ausschließlich aus `~/.config/team4s-e2e.env`
(Rechte `0600`, außerhalb des Repos, nie committed). Fehlt ein Eintrag, wird beim nächsten Lauf
ein neues, zufälliges Passwort generiert und dort gespeichert — danach bleibt es stabil, bis die
Datei gelöscht wird. Passwörter erscheinen nie in Shell-Ausgaben, Logs, Commits oder
Playwright-Reports.

## Reset

- `bash scripts/e2e/reset-fixtures.sh` — entfernt ausschließlich die eine Fansub-Gruppe, die im
  Manifest `scripts/e2e/fixtures.manifest.json` als von der Provisionierung erzeugt ausgewiesen
  ist (über den bestehenden Endpunkt `DELETE /fansubs/:id`, FK-Kaskaden erledigen den Rest). Kein
  `TRUNCATE`, kein DB-Reset — alles andere in `team4s_v2` bleibt unangetastet. Ein fehlendes
  Manifest ist kein Fehler, sondern bedeutet "nichts zurückzusetzen".
- `bash scripts/e2e/provision.sh` — stellt die Fixtures danach (oder bei Bedarf jederzeit)
  erneut idempotent sicher.
- `bash scripts/e2e.sh` — kompletter, erneut idempotenter Durchlauf von Provisionierung bis
  Testlauf.

Die Keycloak-Testkonten selbst werden von `reset-fixtures.sh` nie gelöscht — nur ihre
Gruppenzugehörigkeit wird zurückgesetzt.
