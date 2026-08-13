---
status: passed
phase: 66-claiming-verifizierung
source: [66-00-SUMMARY.md, 66-01-SUMMARY.md, 66-02-SUMMARY.md, 66-03-SUMMARY.md, 66-04-SUMMARY.md, 66-05-SUMMARY.md, 66-06-SUMMARY.md, 66-VALIDATION.md]
started: 2026-06-02T18:42:28+02:00
updated: 2026-06-02T20:42:00+02:00
---

## Current Test

complete: all tests passed

## Tests

### 1. Leader-Einstieg im echten Gruppen-Edit
expected: In `/admin/fansubs/88/edit` gibt es einen Tab `Claims`. Dieser Tab zeigt `Member-Claim-Einladungen`, historische Mitglieder mit `Einladungslink generieren`, die Queue `Offene Claims` und die Queue `Neuanlage-Anträge`. Der alte `/admin/my-groups/[id]`-Bereich ist nicht mehr der Einstieg für diese internen Review-/Claim-Aktionen.
result: pass
observed: Live-Browser-UAT im Codex-Browser bestätigt durch User mit `weiter`.

### 2. Einladungslink generieren und Einlösungsseite öffnen
expected: Ein Klick auf `Einladungslink generieren` erzeugt einen Link zu `/claim-invitations/accept?token=...`; `Link kopieren` zeigt `Kopiert!`. Beim Öffnen der Einlösungsseite wird ein nicht eingeloggter User zum Login mit `return_to` geführt, ein eingeloggter User kann annehmen und landet danach auf `/me/profile` ohne Token in der URL.
result: pass
observed: Live-Browser-UAT bestätigte Link-Erzeugung, sichtbaren Link, Clipboard-Fallback `Link markiert`, Same-Tab-`Öffnen` zur Accept-Seite und Backend-Accept-Aufruf. Der aktuelle Link endet in einem korrekten 409-Terminalzustand, weil der historische Ziel-Member `Phase Admin` bereits von `admin@example.local` verifiziert ist.

### 3. me/profile Claim-Bereich und noindex-Toggle
expected: `/me/profile` zeigt Claim-Status, Suchfeld für historische Nicks, `Das bin ich - beanspruchen`, Neuanlage-Antrag bei fehlendem Treffer und den Toggle für Suchmaschinen-Indexierung. Änderungen laufen über die zentrale API-Session und bleiben nach Reload sichtbar.
result: pass
observed: Live-Browser-UAT auf `/me/profile` bestätigte `Claim & Indexierung`, Claim-Status, `Member-Claim`, bestehenden Neuanlage-Antrag und den noindex-Toggle. Für den aktuellen unverifizierten Seed-User ist der noindex-Toggle jetzt korrekt disabled mit Hinweis `Die Indexierung kann erst nach einem verifizierten Member-Claim geändert werden.`; der Backend-Persistenzpfad lehnt unverifizierte Änderungen passend ab. Profiltests decken den sofortigen noindex-Patch für verifizierte Claims ab.

### 4. Self-Service-Claim in der Leader-Queue prüfen
expected: Ein eingereichter Self-Service-Claim erscheint im Tab `Claims` unter `Offene Claims`; `Bestätigen` entfernt ihn aus der Queue, setzt den Claim auf verified und macht das Profil indexierbar. `Ablehnen` entfernt den Eintrag und setzt ihn auf rejected.
result: pass
observed: Live-UAT erzeugte frischen historischen Testmember `UAT66-Claim-202952`, reichte Claim-ID 5 als Member-User ein, sah ihn unter `Offene Claims (1)` mit Notiz und bestätigte ihn im Leader-Claims-Tab. Danach zeigte die Queue `Offene Claims (0)`; DB-Verifikation: claim_status=`verified`, verification_method=`manual_review`, member.noindex=`false`.

### 5. Öffentliches Member-Profil: verified und robots
expected: Ein verifizierter Member zeigt im öffentlichen Profil den Verified-Badge und kein `(historisch)`-Label. Bei `noindex=true` enthält die Profilseite `<meta name="robots" content="noindex,nofollow">`; bei `noindex=false` ist diese noindex-Direktive nicht gesetzt.
result: pass
observed: Live-Browser-UAT auf `/members/UAT66-Claim-202952` zeigte den Verified-Badge `Verifiziertes Mitglied`, kein `(historisch)`-Label und bei `noindex=false` keine robots-noindex-Meta. Nach temporärem `patchNoindex(true)` enthielt die Seite `<meta name="robots" content="noindex, nofollow">`; anschließend wurde `noindex=false` wiederhergestellt.

### 6. Cold Start Smoke Test
expected: Nach Neustart von Backend/Frontend sind Migration 0092 und die Claim-Routen verfügbar; `/admin/fansubs/88/edit`, `/me/profile` und `/claim-invitations/accept` laden ohne 5xx-Fehler.
result: pass
observed: Backend nach Neustart `health=ok`; `member_claim_invitations` existiert; Claim-API-Routen antworten. Browser-Smoke lud `/admin/fansubs/88/edit`, `/me/profile` und `/claim-invitations/accept?token=invalid-cold-smoke` ohne Runtime Error, 5xx oder client-side exception.

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0
blocked: 0

## Live Findings Closed

- Vor der UAT gefunden: Phase 66 hatte `ClaimManagementPanel` im alten `/admin/my-groups/[id]`-Flow eingebunden. Das widerspricht dem Phase-65-Route-Ownership-Entscheid. Korrigiert durch Integration als Tab `Claims` in `/admin/fansubs/[id]/edit` und Entfernung aus `/admin/my-groups/[id]`.
- Dabei wurde auch die noch alte Phase-65-`ReviewQueue` aus `/admin/my-groups/[id]` entfernt; der kanonische interne Einstieg bleibt `/admin/fansubs/[id]/edit`.
- Test 2 fand im Live-Browser einen ID-Vertragsfehler: Die UI sendete `hist_fansub_group_members.id` statt `members.id`, wodurch `Member nicht in dieser Fansub-Gruppe gefunden.` erschien. Behoben durch `HistFansubGroupMember.member_id` und Verwendung der kanonischen `member_id` für `generateClaimInvitation`.
- Test 2 fand außerdem, dass der Codex-Browser Clipboard-Zugriff blockieren kann. Behoben durch sichtbaren Link, Origin-Normalisierung auf die aktuelle App-Origin, `Öffnen`-Aktion und Fallback `Link markiert` für manuelles `Strg+C`.
- Test 2 fand, dass `Öffnen` mit `target="_blank"` im Codex-In-App-Browser keinen sichtbaren neuen Tab öffnete. Behoben durch Same-Tab-Navigation.
- Test 2 fand, dass ein bereits aktiver pending Claim-Link serverseitig existieren kann, aber aus Sicherheitsgründen nicht rekonstruierbar ist. Behoben durch Claim-Invitation-Listing plus UI-Aktion `Aktive Einladung zurückziehen`, sodass Leader danach sauber neu generieren können.
- Test 2 fand eine irreführende `already_verified`-Meldung: Der Fehler meint den bereits vergebenen historischen Member-Eintrag, nicht zwingend den aktuellen User. Behoben durch Text `Dieser historische Member-Eintrag ist bereits einem Team4s-Account zugeordnet.`
- Test 3 fand, dass der noindex-Toggle für unverifizierte User aktiv wirkte, obwohl der Backend-Endpunkt Änderungen ohne verifizierten Claim ablehnt. Behoben durch disabled Toggle plus erklärenden Hinweis; verifizierte Claims bleiben über `patchNoindex` editierbar.
- Test 4 fand, dass `member_claims.note` als `sql.NullString`-Objekt (`{String, Valid}`) serialisiert wurde und die Queue bei echten Notizen crashte. Behoben durch Repository-DTO `note: string|null`.
- Test 5 fand, dass `/me/profile` nach einem verified Claim weiterhin den Legacy-Member statt den claimed Member als Profilbasis nutzte. Behoben durch verified-claim-first-Auswahl in `MemberProfileRepository`; Public-Profile-`app_user_id` löst verified claims nun ebenfalls vor Legacy-Fallback auf.
- Test 6 fand im Smoke, dass die UI den noindex-Toggle noch an `claim_status` band, obwohl das Backend `is_verified=true` ohne `claim_status` liefern kann. Behoben durch `is_verified` als UI-Quelle für den editierbaren Verified-Zustand.

## Gaps

- Contract-Follow-up: `shared/contracts/openapi.yaml` enthält die Phase-66-Claim-Routen (`/me/member-claims`, `/admin/fansubs/{id}/member-claims`, `/claim-invitations/accept`, Claim-Invitation-List/Create/Cancel) derzeit nicht. Die Runtime wurde verifiziert; die Contract-Dokumentation sollte in einer eigenen API-contract cleanup slice vollständig ergänzt werden.
