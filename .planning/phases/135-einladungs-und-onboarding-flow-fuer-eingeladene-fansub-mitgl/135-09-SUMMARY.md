# Plan 135-09 — Keycloak-Registrierung auf Fansubname (D-14) — SUMMARY (teilweise)

**Datum:** 2026-08-18
**Status:** Kern live umgesetzt + verifiziert; ZWEI offene Punkte entdeckt (siehe unten).

## Umgesetzt & LIVE-verifiziert
- **KC-User-Profile (Realm team4s, KC 26):** `username`-Attribut = Pflicht-**Fansubname**
  (displayName `${fansubName}`), gelockerter Zeichensatz-Pattern `^[\p{L}\p{N} ._-]+$`;
  `firstName`/`lastName` **optional** (required entfernt). `email` bleibt Pflicht.
- **`editUsernameAllowed=true`** gesetzt (KC 26: das Feld heisst `editUsernameAllowed`, NICHT
  `editUsername` -> alter Realm-Flag existiert nicht mehr). Fansubname ist damit editierbar
  (KC-Account-Console; KC bleibt Master, Team4s liest via Token).
- **D1sk-Migration:** KC-username von `d1sk@team4s.de` auf `d1sk` gesetzt.
- **Dual-Login verifiziert (direct grant):** `D1sk / 123` -> OK UND `d1sk@team4s.de / 123` -> OK.
  Damit ist der Login-Bug behoben (Login mit Fansubname UND E-Mail).
- **Theme-Messages:** `fansubName` + `invalidFansubNameMessage` in messages_de.properties.
- **Persistenz:** `infra/keycloak/realm-team4s.json` (editUsernameAllowed) +
  `infra/keycloak/team4s-users-profile.json` (User-Profile-Config; via
  `PUT /admin/realms/team4s/users/profile` reproduzierbar). Backup unter /tmp/kc135-09-backup/.

## OFFEN / entdeckte Wechselwirkungen (nicht fertig)
1. **[GELOEST 2026-08-18] 135-08 <-> 135-09 Konflikt:** Der 135-08-Invite-Flow prefillt die eingeladene
   **E-Mail ins `username`-Feld** (login_hint -> username; deshalb bekam D1sk urspruenglich
   username=email). Unter 135-09 ist `username` = **Fansubname** -> eingeladene Nutzer wuerden
   sonst die E-Mail als Fansubname bekommen. Muss geaendert werden: bei Invite-Registrierung die
   E-Mail ins **email**-Feld prefillen (nicht username), Fansubname bleibt Nutzer-Eingabe. GELOEST in register.ftl: invitedEmail wird aus username ODER email abgeleitet; das username(Fansubname)-Feld wird bei Invite EMPTY gerendert (E-Mail nur im gesperrten email-Feld). Live gegen /registrations verifiziert: username value="", email value=<invite> readonly, Label Fansubname.
2. **[GELOEST 2026-08-18] Task 4 JIT/DisplayName:** identity/`claims.DisplayName` (aktuell wohl aus `name` = First+Last,
   jetzt optional/leer) muss aus dem **Fansubnamen** (preferred_username = username) gespeist werden
   -> members.nickname/fansub_name seeden. Token-Claim/JIT pruefen + ggf. Mapper ergaenzen.
3. **Task 3 Live-Verify:** Register-Formular auf :3300 muss "Fansubname" (nicht `${fansubName}`) +
   First/Last optional zeigen -- visuell bestaetigen.

## Naechste Schritte
Punkt 1 (E-Mail-ins-username-Konflikt) zuerst loesen -- sonst bricht die Invite-Registrierung.
Dann Task 4 (JIT) + Task 3 Live-Verify + 135-07 (finaler Gate/UAT, haengt hinter 135-09).


## Update 2026-08-18: Punkt 2 geloest + Task 5 offen
- current_user_auth.go: DisplayName-Ableitung auf **preferred_username (Fansubname) zuerst** umgestellt (name/email nur Fallback). Backend neu gebaut; verifiziert: D1sk account_display_name=\ (Fansubname) statt \. Member-Profil fansub_name (\) bleibt separat editierbar -- bewusst NICHT aus KC ueberschrieben (kein Clobbern des reicheren Profilnamens; account-Identitaet = KC-Fansubname reicht fuer D-14).
- **Damit 135-09 code-komplett + live-verifiziert** (Login dual, Register-Form korrekt, Anzeigename=Fansubname). OFFEN nur noch **Task 5** (Nutzer-Live-UAT: einen NEUEN Member per Registrierung mit Fansubname end-to-end anlegen).
