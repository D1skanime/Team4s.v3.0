# Fachaufgabe 5: Mitglieder einladen / Claims / Mitgliedsanfragen

**Quelle:** 174-FOLLOWUPS.md F-17 → 175-CONTEXT.md D-02 #5. Prüft, ob die in Phase 135 (D-09)
vorgenommene Konsolidierung auf einen gemeinsamen `InviteAcceptFlow` vollständig ist, und erfasst
alle Einlade-/Claim-/Mitgliedsanfrage-Flächen vollständig nach D-03 (a)-(f).
**Methode:** Alle sechs UI-Flächen gelesen (beide Accept-Seiten, Admin-Verwaltung in
`GroupMembersHistTable.tsx`/`FansubAppMembersSection.tsx`, Self-Service-Formular in
`MemberClaimSection.tsx`, das als "nicht gemountet" dokumentierte `ClaimManagementPanel.tsx`),
dazu die zugehörigen Backend-Handler, Repositories und Migrationen. Rechte-Vergleiche (d) wurden
am aktuellen Code nachvollzogen, nicht aus Dokumenten übernommen.

Spalten gemäß D-03: (a) UI-Fläche, (b)/(c) Frontend-API/Backend-Handler, (d) Rechte-Aktion
Anzeige vs. Durchsetzung, (e) Datenhaltung, (f) beobachtbares Verhalten.

---

## Übersicht: 6 UI-Flächen für Einladen/Claim/Anfrage

| # | UI-Fläche | Datei:Zeile | Zweck |
|---|---|---|---|
| 1 | App-Member-Invite-Accept-Seite | `frontend/src/app/invitations/accept/page.tsx:33-63` | Fansub-Gruppen-Einladung per E-Mail annehmen |
| 2 | Claim-Invite-Accept-Seite | `frontend/src/app/claim-invitations/accept/page.tsx:28-53` | Historischen Member-Eintrag per Admin-generiertem Link verknüpfen |
| 3 | Claim-Generieren/Verify/Reject/Activate in `HistoricalMemberCard` | `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.tsx:135-345` | Admin-Verwaltung der Claim-Einladungen + eingehender Claims je historischem Mitglied |
| 4 | Fansub-Gruppen-Einladung erstellen/stornieren | `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx:331-360`, Button in `FansubAppMemberAddModal.tsx:321` | Admin lädt neue App-Mitglieder per E-Mail ein |
| 5 | Mitgliedsanfrage/Claim-Self-Service-Formular | `frontend/src/app/me/profile/components/MemberClaimSection.tsx:22-167` | Eingeloggter User sucht historischen Nick selbst oder beantragt Neuanlage |
| 6 | `ClaimManagementPanel.tsx` (dokumentiert nicht gemountet) | `frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx:81-89,320-436` | Parallele Implementierung derselben Claim-/Request-/Invite-Link-Verwaltung wie #3, laut Code-Kommentar absichtlich unmounted beibehalten (135-RESEARCH.md Open Question 2) |

Beide Accept-Seiten (#1, #2) teilen sich dieselbe `InviteAcceptFlow`-Komponente
(`frontend/src/components/auth/InviteAcceptFlow.tsx`) — **D-04: legitim zusammengeführt**, exakt
die in Phase 135 (D-09) dokumentierte Konsolidierung. Beide Seiten unterscheiden sich nur in
Titel/Text/Fehler-Mapping/`onAccept`-Callback, keine duplizierte Accept-Logik mehr.

---

## (a)-(c) Je Einlade-/Claim-/Anfrage-Weg: UI → Frontend-API → Backend-Handler

| Weg | UI (a) | Frontend-API (b) | Backend-Handler (c) |
|---|---|---|---|
| App-Member-Invite erstellen | `FansubAppMembersSection.tsx:331` `handleCreateInvitation` | `createFansubGroupInvitation` (`lib/api/admin/fansub-members.ts:217`) | `POST /admin/fansubs/:id/invitations` → `AppAuthHandler.CreateFansubGroupInvitation` (`app_auth_invitations.go:65`) |
| App-Member-Invite stornieren | `FansubAppMembersSection.tsx:348` `handleCancelInvitation` | `cancelFansubGroupInvitation` (`fansub-members.ts:250`) | `POST /admin/fansubs/:id/invitations/:invitationId/cancel` → `AppAuthHandler.CancelFansubGroupInvitation` (`app_auth_invitations.go:251`) |
| App-Member-Invite annehmen | `InviteAcceptFlow.tsx` via `invitations/accept/page.tsx:49` | `acceptFansubInvitation` (`fansub-members.ts:281`) | `POST /invitations/accept` → `AppAuthHandler.AcceptFansubInvitation` (`app_auth_invitations.go:310`) |
| Claim-Invite generieren | `GroupMembersHistTable.tsx:302` `onGenerateInvitation` | `generateClaimInvitation` (`fansub-members.ts:345`) | `POST /admin/fansubs/:id/group-members/:memberId/claim-invitations` → `MemberClaimInvitationsHandler.CreateClaimInvitation` (`member_claim_invitations_handler.go:92`) |
| Claim-Invite stornieren | `GroupMembersHistTable.tsx:335` `onCancelInvitation` | `cancelClaimInvitation` (`fansub-members.ts:413`) | `POST .../claim-invitations/:invitationId/cancel` → `MemberClaimInvitationsHandler.CancelClaimInvitation` (`member_claim_invitations_handler.go:173`) |
| Claim-Invite annehmen | `InviteAcceptFlow.tsx` via `claim-invitations/accept/page.tsx:38` | `acceptClaimInvitation` (`fansub-members.ts:315`) | `POST /claim-invitations/accept` → `MemberClaimInvitationsHandler.AcceptClaimInvitation` (`member_claim_invitations_handler.go:144`) |
| Self-Service-Claim einreichen | `MemberClaimSection.tsx:142` `handleSubmitClaim` | `submitMemberClaim` | `POST /me/member-claims` → `MemberClaimsHandler.SubmitClaim` (`member_claims_handler.go:62`) |
| Claim bestätigen/ablehnen (Admin) | `GroupMembersHistTable.tsx:251,259` `onVerifyClaim`/`onRejectClaim` | `verifyMemberClaim`/`rejectMemberClaim` (`fansub-members.ts:474,503`) | `POST .../member-claims/:claimId/verify`\|`/reject` → `MemberClaimsHandler.VerifyClaim`/`RejectClaim` (`member_claims_handler.go:136,161`) |
| Als aktives Mitglied übernehmen | `GroupMembersHistTable.tsx:285` `onActivateMember` | `activateClaimedMember` | `POST /admin/fansubs/:id/historical-members/:memberId/activate` → `MemberClaimsHandler.ActivateClaimedMember` (`member_claims_handler.go:186`) |
| Neuanlage-Antrag einreichen | `MemberClaimSection.tsx:158` `handleSubmitRequest` | `submitMemberRequest` | `POST /me/member-requests` → `MemberRequestsHandler.SubmitRequest` (`member_requests_handler.go:40`) |
| Neuanlage-Antrag bestätigen/ablehnen (Admin) | `GroupMemberRequestsTable.tsx:89,98` | `approveMemberRequest`/`rejectMemberRequest` (`fansub-members.ts:562,593`) | `POST /admin/member-requests/:requestId/approve`\|`/reject` → `MemberRequestsHandler.ApproveRequest`/`RejectRequest` (`member_requests_handler.go:82,118`) |

---

## (d) Rechte: Anzeige vs. Durchsetzung — Phase-135-Konsolidierung geprüft, zwei neue Befunde

### 1. Konsolidierung der zwei Invite-Typen (Phase 135, D-09): bestätigt vollständig

Grep auf weitere `*accept*`/`*invite*`-Routen außerhalb der beiden bekannten Pfade
(`invitations/accept`, `claim-invitations/accept`) ergab **keine** dritte Parallel-Implementierung.
Beide Accept-Seiten rendern ausschließlich `InviteAcceptFlow`; keine eigene Login/Submit-Logik
mehr vorhanden. **D-04: legitim getrennt (zwei fachlich verschiedene Invite-Typen), gemeinsame
Basis vollständig umgesetzt.**

### 2. Rechte-Konsistenz App-Member-Invite: konsistent, aber Anzeige-Gate ist eine andere Granularität

- **Anzeige (Erstellen/Stornieren):** `can_create_invitation`/`can_cancel_invitation` aus
  `ActionFansubGroupInvitationsCreate`/`...Cancel` (`app_auth_capabilities.go:126,131`).
- **Durchsetzung:** `CreateFansubGroupInvitation`/`CancelFansubGroupInvitation` prüfen exakt
  dieselben Actions (`app_auth_invitations.go:81,272`). **Konsistent.**
- **Annehmen:** Anzeige = Button erscheint sobald `hasAccessToken` wahr ist (keine
  Capability-Prüfung, siehe `InviteAcceptFlow.tsx:119`); Durchsetzung = `CanAcceptInvitation(actor)`
  — eine **standalone Action ohne Rollen-Lookup** (`permissions.go:271,603-614`), die lediglich
  prüft, dass der App-User existiert und nicht `disabled` ist. Das ist **legitim getrennt**: die
  eigentliche Berechtigung ("gehört dieser Token-Owner zu dieser E-Mail/diesem Member") wird nicht
  rollenbasiert, sondern token-basiert im Repository (`fansub_group_invitations_repository.go:249`
  `Accept`) entschieden — ein Capability-Gate vorab wäre hier fachlich falsch.

### 3. NEUER Befund — Claim-Invite-Accept prüft KEINEN `disabled`-Status (Asymmetrie zur Schwester-Flow)

`AcceptClaimInvitation` (`member_claim_invitations_handler.go:144`) nutzt nur `requireMeIdentity`
(`contributions_me_handler.go:90`) — das prüft ausschließlich, ob ein Auth-Token vorhanden ist,
**nicht** `actor.Status == "disabled"`. Die strukturell parallele `AcceptFansubInvitation`
(App-Member-Invite) nutzt dagegen `CanAcceptInvitation(actor)`, die genau diesen Status-Check
durchführt (`permissions.go:606-608`). Beide Accept-Flows teilen sich dieselbe UI-Komponente
(`InviteAcceptFlow`) und wirken für den Nutzer identisch — serverseitig divergiert die
Durchsetzung aber: ein deaktivierter App-User **kann** eine Claim-Invite annehmen (und sich damit
einen historischen Member-Eintrag verknüpfen + `members.profile_visibility='public'` setzen,
siehe `member_claim_invitations_repository.go:240-248`), aber **keine** Fansub-Gruppen-Invite
annehmen. **D-04: Duplikat-Risiko durch unabhängige Parallel-Implementierung derselben
Vorbedingung** (zwei Accept-Handler, die denselben "ist der Account nutzbar"-Check hätten teilen
sollen, es aber nicht tun) — Schweregrad niedrig (deaktivierte Accounts sind eine Rand-Situation),
aber ein klarer Fall für die künftige Zusammenführungsphase (D-06): EIN gemeinsamer
Accept-Entry-Point sollte EINE Vorbedingungsprüfung haben.

### 4. NEUER Befund — Memorial-Guard zweimal unabhängig implementiert (wortgleicher Fehlercode)

Zwei unabhängige Repository-Dateien prüfen denselben Fachregel-Fall ("Gedenkprofile können nicht
beansprucht werden") mit identischem Fehlercode `memorial_not_claimable` und identischem
Audit-Event-Namen `member_claim.memorial_blocked`, aber **ohne gemeinsame Helper-Funktion**:

- Self-Service-Pfad: `MemberClaimsRepository.SubmitClaim` — `member_claims_submit_repository.go:48-69`
- Invite-Link-Pfad: `MemberClaimInvitationRepository.AcceptInvitation` — `member_claim_invitations_repository.go:187-215`

Beide Blöcke sind nahezu wortgleich (gleiche deutsche Fehlermeldung, gleicher Audit-Payload-Aufbau).
**D-04: Duplikat** — zwei Implementierungen derselben Geschäftsregel, die bei einer künftigen
Änderung (z. B. neuer Gedenkprofil-Zustand) unabhängig gepflegt werden müssten und leicht
auseinanderlaufen können. Kandidat für eine gemeinsame `checkMemberClaimable(memberID)`-Helper-
Funktion in einer Zusammenführungsphase.

### 5. Claim-Verwaltung (Verify/Reject/Activate/Invite-CRUD) — konsistent über alle Pfade

Alle fünf Admin-Aktionen (`ListClaimInvitations`, `CreateClaimInvitation`, `CancelClaimInvitation`,
`VerifyClaim`, `RejectClaim`, `ActivateClaimedMember`) prüfen durchgehend dieselbe Action
`permissions.ActionFansubGroupHistoricalMembersLink` über `requireFansubPermission`
(`member_claims_handler.go:209-236`) bzw. direkt `CanForFansubGroup` in
`member_claim_invitations_handler.go`. Die Anzeige-Seite (`FansubAppMembersSection.tsx:192`
`canLinkHistoricalMembers = capabilities?.can_link_historical_members`) liest exakt dieselbe
Action (`app_auth_capabilities.go:101`, `CanLinkHistoricalMembers`). **Konsistent — keine
Abweichung.**

### 6. Mitgliedsanfragen (Neuanlage) — bewusst anderes, globales Rechte-Modell

`MemberRequestsHandler.ApproveRequest`/`RejectRequest`/`ListRequests` nutzen
`requirePlatformAdmin` (`member_requests_handler.go:143-153`, hartes `actor.IsPlatformAdmin`),
**nicht** den gruppen-skopierten `CanForFansubGroup`-Resolver, den alle anderen Flächen dieser
Fachaufgabe nutzen. Fachlich nachvollziehbar (eine Neuanlage ist nicht an eine Gruppe gebunden —
`member_requests_handler.go` erzeugt global neue `members`-Zeilen), aber es bedeutet: ein
Fansub-Lead mit `can_link_historical_members=true` kann Claims verknüpfen, aber **keine**
Neuanlage-Anträge bearbeiten — nur ein Platform-Admin kann das. **D-04: legitim getrennt**
(unterschiedlicher fachlicher Scope: gruppen-gebunden vs. global), aber als Rechte-Modell-Bruch
innerhalb derselben UI (`ClaimManagementPanel.tsx` zeigt beide Tabellen nebeneinander, ohne
erkennbare Rechte-Differenzierung) dokumentiert.

### 7. Entdeckt: `member_claims`-Tabelle wird für ZWEI fachlich verschiedene Zwecke wiederverwendet

Sowohl "Claim" (Verknüpfung mit existierendem historischem Mitglied) als auch "Mitgliedsanfrage"
(Antrag auf Neuanlage eines Members ohne historischen Eintrag) schreiben in dieselbe
`member_claims`-Tabelle (Migration 0081), unterschieden einzig durch `member_id IS NULL`
(`member_requests_repository.go:35-54` vs. `member_claims_submit_repository.go:71-80`). Zwei
unabhängige Repository/Handler-Paare (`MemberClaimsHandler`+`MemberClaimsRepository` vs.
`MemberRequestsHandler`+`MemberRequestsRepository`) implementieren CRUD gegen dieselbe Tabelle,
mit unterschiedlichen Rechte-Modellen (#6). **D-04: Variante mit Duplikat-Risiko** — die
Daten-Wiederverwendung selbst ist sinnvoll (ein Claim, der scheitert, kann fachlich als
"Antrag" weiterleben), aber zwei getrennte Go-Repositories ohne gemeinsame Abstraktion über
derselben Tabelle sind ein Pflege-Risiko (z. B. hat nur `SubmitClaim` den Memorial-Guard, siehe
Befund 4; `SubmitRequest` braucht ihn nicht, weil `member_id IS NULL` — aber das ist nicht
offensichtlich aus dem Code ersichtlich).

---

## (e) Datenhaltung

| Zweck | Tabelle | Migration |
|---|---|---|
| App-Member-Invite (E-Mail-basiert) | `fansub_group_invitations` | `0076_fansub_group_invitations.up.sql` |
| Claim-Invite (Admin-Link für historisches Mitglied) | `member_claim_invitations` | `0092_member_claim_invitations.up.sql` |
| Claim-Verknüpfung + Neuanlage-Antrag (geteilte Tabelle, siehe Befund 7) | `member_claims` | `0081_historical_members_identity.up.sql` |

---

## (f) Beobachtbares Verhalten — Unterschiede zwischen den Invite-/Claim-Pfaden

| Aspekt | App-Member-Invite | Claim-Invite (Admin-Link) | Self-Service-Claim |
|---|---|---|---|
| **Review-Schritt nach Annahme** | Keiner — Annahme erzeugt sofort eine aktive `fansub_group_app_members`-Mitgliedschaft | **Keiner** — `AcceptInvitation` schreibt direkt `claim_status='verified'`, kein Admin-Review (`member_claim_invitations_repository.go:217-236`) | **Admin-Review erforderlich** — `SubmitClaim` erzeugt `claim_status='pending'`, muss über `VerifyClaim`/`RejectClaim` entschieden werden |
| **Grund für Auto-Verify beim Link** | n/a | Admin hat den Link selbst für genau dieses Mitglied generiert — Vorab-Autorisierung ersetzt Nach-Review | n/a — Nutzer sucht selbst, kein Vorab-Kontext, daher Review nötig |
| **E-Mail-Versand** | Ja, mit Rollen-Suffix + 7-Tage-Ablauf-Hinweis (`app_auth_invitations.go:120-221`) | Nein — Link wird im Admin-UI angezeigt/kopiert, kein Mailer-Aufruf | n/a |
| **Sichtbarkeits-Nebeneffekt** | Keiner | `members.noindex=false`, `profile_visibility='public'` wird gesetzt (`member_claim_invitations_repository.go:240-248`) | Keiner bis zur Admin-Bestätigung |

**D-04-Einordnung:** Der fehlende Review-Schritt beim Invite-Link ist **legitime Variante**
(Admin autorisiert vorab durch Linkerzeugung), kein Rechte-Fehler — aber Befund 3 (fehlender
`disabled`-Check) zeigt, dass diese Variante eine eigene, unvollständig geprüfte
Sicherheitsannahme hat.

---

## Zusammenfassung (reproduzierbar per `scripts/count-05-mitglieder-einladen-claims.sh`)

- **UI-Flächen: 6** (2 Accept-Seiten, Admin-Claim-Verwaltung, Invite-Erstellung, Self-Service-Formular, 1 dokumentiert-unmounted Duplikat)
- **Geprüfte Rechte-Vergleichspunkte: 7** (App-Invite Create/Cancel/Accept, Claim-Verwaltung, Mitgliedsanfrage, Accept-Asymmetrie, Memorial-Guard-Duplikat)
- **Phase-135-Konsolidierung: vollständig** (0 neue Parallel-Accept-Implementierungen gefunden)
- **Neue Befunde: 2** (Accept-Disabled-Check-Asymmetrie; Memorial-Guard zweimal implementiert)
- **Datenhaltung: 3 Tabellen**, davon 1 für zwei fachlich verschiedene Zwecke wiederverwendet (`member_claims`)
