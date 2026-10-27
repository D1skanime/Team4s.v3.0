# Team4s E2E-Testanmeldung (Playwright)

Rollenbasierte End-to-End-Tests gegen den echten Login-Pfad, damit auch autonome KI-Aufträge
ohne manuelle Passworteingabe prüfen können, ob Berechtigungen im Frontend und Backend wirklich
greifen.

## Voraussetzungen

Der laufende lokale Docker-Dev-Stack (`docker compose up`) sowie `jq`, `openssl` und `curl` auf
dem ausführenden Host. `scripts/e2e.sh` prüft diese drei Kommandozeilenwerkzeuge selbst und
bricht mit einer klaren Fehlermeldung ab, falls eines fehlt.

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
2. `npm run typecheck:e2e` im `frontend/`-Verzeichnis — prüft `playwright.config.ts` und
   `frontend/e2e/**` separat vom normalen Next.js-Typecheck (siehe `tsconfig.e2e.json`), damit ein
   kaputter Typ als klare Fehlermeldung auffällt statt als verwirrender Playwright-Laufzeitfehler.
3. `npx playwright test` im `frontend/`-Verzeichnis — meldet jede Rolle über das echte,
   Keycloak-gehostete Login-Formular an (`frontend/e2e/auth.setup.ts`) und führt danach die
   vier Rollen-Specs aus.

Das Skript läuft gegen den laufenden lokalen Docker-Dev-Stack. Backend- und Keycloak-Basis-URL
(`E2E_API_BASE`/`E2E_KC_BASE`) leitet `scripts/e2e/_env-defaults.sh` automatisch aus den
tatsächlichen `BACKEND_PORT`/`KEYCLOAK_PORT` der lokalen `.env` ab (derselben Datei, die
`docker compose` selbst beim Start liest) — fällt kein Wert dort, greifen die reinen
`docker-compose.yml`-Standardports `8092`/`8081`. Die Frontend-Basis-URL ist weiterhin per
`E2E_BASE_URL` überschreibbar (Standard `http://127.0.0.1:3000`).

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

- `bash scripts/e2e/reset-fixtures.sh` — setzt sowohl die DB-Fixture als auch die 5
  Keycloak-Testkonten tatsächlich zurück:
  1. Löscht gezielt genau die beiden in `scripts/e2e/fixtures.manifest.json` referenzierten
     DB-Zeilen (den historischen Eintrag und die Fansub-Gruppe selbst) per direktem, auf exakte
     IDs beschränktem SQL-`DELETE` in FK-sicherer Kind-vor-Eltern-Reihenfolge — **nie** ein
     `TRUNCATE`, **nie** ein schemaweiter Reset, genau im selben Muster wie
     `scripts/reset-member-profile-fixture.sh`. Live-Mitgliedschaften und ihre Rollen verschwinden
     dabei automatisch per `ON DELETE CASCADE`. Die Admin-HTTP-API bietet dafür bewusst keinen
     Hard-Delete (`DELETE /fansubs/:id` lehnt mit 409 ab, solange Live-Mitgliedschaften bestehen —
     verifiziert über eine vollständige Durchsicht aller registrierten Routen: keine `DELETE` für
     `app-members`/`app_users`, kein Self-Service-Leave-Endpunkt), deshalb der direkte, aber eng
     ID-begrenzte SQL-Zugriff.
  2. Löscht die 5 Keycloak-Konten (eigene `kcadm`-Admin-Session, unabhängig von `e2e-admin`s
     eigenem Passwort) und entfernt `~/.config/team4s-e2e.env`, sodass der nächste
     `provision.sh`-Lauf eine komplett frische Fixture samt frischer Passwörter anlegt.

  Vor jeder Keycloak-Mutation (Passwort/Rolle/Löschung) prüfen sowohl `provision-keycloak-users.sh`
  als auch `reset-fixtures.sh` die exakt erwartete `@team4s.test`-E-Mail des per Username
  gefundenen Kontos — ein Nicht-E2E-Konto mit zufällig demselben Username (z. B. ein reales
  `e2e-admin@team4s.de`) wird dadurch **nie** verändert oder gelöscht; bei Abweichung bricht das
  jeweilige Skript ohne jede Mutation an diesem Konto ab.

  Fehlen sowohl Manifest als auch Secrets-Datei, ist das kein Fehler, sondern bedeutet "nichts
  zurückzusetzen".
- `bash scripts/e2e/provision.sh` — stellt die Fixtures danach (oder bei Bedarf jederzeit)
  erneut idempotent sicher, egal ob frisch oder bereits vorhanden. Schreibt das Fixture-Manifest
  synchron und unmittelbar nach einer erfolgreichen Gruppenerstellung (noch ohne Mitgliederdaten)
  und erst am Ende vollständig — zwischen einer erfolgreichen Gruppenerstellung und dem
  Schreibvorgang liegt dadurch kein Await/Event-Loop-Schritt mehr, in dem ein Prozess-Abbruch
  (Netzwerkfehler, Kill, falsches Passwort für eine spätere Rolle) ein manifestloses Teilergebnis
  hinterlassen könnte. Ein so abgebrochener erster Versuch ist beim nächsten Aufruf sauber
  fortsetzbar, ohne Duplikate oder Fehler. Prüft bei einer Slug-Kollision (Gruppe `e2e-gruppe-a`
  existiert bereits) trotzdem, ob das lokale Manifest exakt dieselbe `fansub_group_id` ausweist —
  fehlt das Manifest komplett oder zeigt es auf eine andere ID, bricht das Skript **vor jeder
  Mutation** ab, statt eine möglicherweise fremde Gruppe stillschweigend zu übernehmen.
- `bash scripts/e2e.sh` — kompletter, erneut idempotenter Durchlauf von Provisionierung bis
  Testlauf (ruft `reset-fixtures.sh` nicht auf).
