# Phase 135: Einladungs- und Onboarding-Flow fuer eingeladene Fansub-Mitglieder - Context

**Gathered:** 2026-08-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 135 macht den Einladungs-/Onboarding-Flow fuer eingeladene Fansub-Mitglieder
end-to-end nutzbar. Heute funktioniert der Flow nur fuer Nutzer, die Team4s bereits
kennen UND ein Konto haben; ein kalt eingeladener Fansubber (typischer Fall: Gruppen-
Admin laedt 10 Leute ein) landet in einer Sackgasse -- das ist der Blocker, der beim
Live-UAT nach dem Team4s-Reset (2026-08-17) gefunden wurde.

Quelle der Scope-Definition: .planning/notes/live-uat-ux-findings.md, Findings #6-#10.

**Im Scope:** die fuenf zusammenhaengenden Invite/Onboarding-Findings (#6-#10).
**NICHT im Scope:** neues Auth-System, KC-Realm-Umbau ueber registrationAllowed hinaus,
das Rollen-/Rechte-Rework (eigene geplante Phase), Mail-Infra-Umbau (Mailpit bleibt).

## Bestandsfakten (aus Code -- nicht neu bauen)
- Claim-Invite-Backend existiert: backend member_claim_invitations_handler.go
  (generateClaimInvitation) + Frontend-Hook useGroupMembersClaimActions.ts. Nur die
  UI-Verdrahtung in der HistoricalMemberCard fehlt.
- App-Invite-Flow existiert: backend app_auth.go + Mailer, Frontend /invitations/accept.
  Die Accept-Seite setzt ein bestehendes Konto voraus.
- role_definitions.assignable ist die Filterquelle fuer den Rollen-Picker.
- platform_admin wird jetzt ueber Keycloak (IdP-Rolle -> JIT-Sync) definiert, nicht mehr Env.
- Dev-Mail laeuft auf Mailpit :8025 (SMTP per Compose-Default an).
</domain>

<decisions>
## Implementation Decisions

### D-01 Cold-Invite-Registrierungspfad (Finding #10, BLOCKER)
Die Accept-Seite (frontend/src/app/invitations/accept/page.tsx) bietet fuer nicht
eingeloggte Nutzer BEIDE Wege: Anmelden UND Registrieren. Die Einladung wird durch-
gereicht (returnTo=/invitations/accept?token=..., E-Mail aus dem Invite vorbefuellt
fuer den email_match); nach erfolgreichem Login/Registrierung folgt Auto-Accept +
Bestaetigungs-UI. Kein Nutzer landet mehr in einer Sackgasse.

### D-02 Keycloak Self-Registration verifizieren/aktivieren (Finding #10)
Sicherstellen, dass der Registrieren-Pfad technisch traegt: KC registrationAllowed in
infra/keycloak/realm-team4s.json bzw. ein invite-scoped Register-Flow. Entscheidung
dokumentieren, ob Self-Registration global aktiviert wird oder ein dedizierter
Register-auf-Einladung-Pfad noetig ist.

### D-03 Kontext-reiche Einladungs-Mail (Finding #10)
Das Einladungs-Mail-Template (backend services/mailer.go + app_auth.go) traegt Kontext:
wer laedt ein, welche Gruppe/Rolle, ein Satz "Team4s ist...", was Annehmen bewirkt,
klarer CTA. Deutsche Umlaute korrekt (CLAUDE.md-Regel). Ersetzt die spam-artige Blindmail.

### D-04 Accept-Seite: returnTo + endnutzerfreundlicher Text (Findings #8, #9)
returnTo wird an /login mitgegeben -> Auto-Redirect zurueck zur Einladungs-URL +
Auto-Accept nach Login. Der Accept-Text ist endnutzerfreundlich ("Bitte melde dich an,
um die Einladung anzunehmen.") -- keine Keycloak-/Architektur-Interna im UI.

### D-05 Claim-Button fuer historische Mitglieder verdrahten (Finding #6)
HistoricalMemberCard in frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.tsx
rendert den Claim-Generieren-Button + Invite-Link-Anzeige (gated auf canCreateClaimInvitation),
verdrahtet an den vorhandenen Hook useGroupMembersClaimActions.ts. Kein Backend-Neubau.

### D-06 Rollen-Picker auf assignable=true filtern (Finding #7)
Der Rollen-Picker im Einladungs-/Mitglied-hinzufuegen-Dialog zeigt nur assignable=true
Gruppenrollen. Nicht-zuweisbare Credit-/Contribution-Rollen (z.B. Administration) und
platform_admin (KC-JIT) werden ausgeblendet. Quelle: role_definitions.assignable.

### D-07 Globale UI-Primitives Pflicht
Alle UI-Aenderungen (Accept-Seite, Dialoge, Buttons, Rollen-Picker) nutzen die globalen
Primitives aus @/components/ui (Button, FormField, Input, Select ...); kein handgebautes
Markup fuer vorhandene Primitiv-Typen. Team4s Design-Tokens verwenden.
</decisions>

<constraints>
## Constraints
- Brownfield: bestehende Backend-/Frontend-/KC-Flaechen verbessern, nicht ersetzen.
- Umlaut-Regel fuer alle user-facing Strings (Mail-Text, UI-Text, Buttons, aria-labels).
- Globale UI-Primitives Pflicht (@/components/ui) + Team4s Design-Tokens (Light-Theme).
- Verifikation live auf :3000 mit echten Daten UND Mailpit :8025 (Code-Level reicht nicht;
  Gap-Fixes brauchen Live-UAT). Frontend-Tests/typecheck/eslint im Container.
</constraints>

---

## Locked Decisions (2026-08-17, nach Research/Pattern-Mapping, vom Nutzer bestaetigt)

### D-08 Registrierung ist invite-scoped (praezisiert D-01/D-02)
KC-Self-Registration ist zwar global aktiv (`registrationAllowed: true`), aber der
Register-Pfad fuer Einladungen wird AN DEN INVITE-TOKEN GEBUNDEN: E-Mail auf die
eingeladene Adresse vorbefuellt/gelockt, kein offenes Registrierungstor ueber den
Invite-Flow. Ziel: garantierter E-Mail-Match zwischen Invite und neuem Konto, keine
Uebernahme fremder Invites. Falls KC das nicht sauber invite-scoped kann, Team4s
vermittelt (Token -> vorbefuellte/gevalidierte E-Mail).

### D-09 EIN gemeinsamer Onboarding-/Accept-Flow fuer beide Invite-Typen
App-Member-Invite (#10, /invitations/accept) UND Historical-Claim-Invite (#6,
/claim-invitations/accept) teilen dieselbe Accept-Seite mit Anmelden + Registrieren.
Auch ein Claim-Nutzer ohne Konto kommt durch denselben invite-scoped Register-Pfad.
D-05 (Claim-Button in HistoricalMemberCard) bleibt bestehen, aber der Claim-Accept-Weg
nutzt denselben gemeinsamen Onboarding-Flow statt eines separaten Sackgassen-Pfads.

---

## Content-Spec (locked 2026-08-17, vom Nutzer bestaetigt — AUTORITATIV fuer 135-03 + 135-05)

Kontext: Der Accept-Endpunkt erzwingt bereits einen E-Mail-Match (repository:
`normalizedEmail != normalizedActorEmail` -> Ablehnung). Ein kalt eingeladener User MUSS
sich also mit der eingeladenen E-Mail anmelden/registrieren. Verfuegbare Invite-Daten:
Gruppe (GetGroupByID), Rolle(n) (InvitedRoleCodes -> role_definitions Label), Einlader
(CreatedByAppUserID -> App-User-Name), Ablaufdatum. Der User hat NULL Vorwissen -> er muss
sauber gefuehrt werden.

### D-10 Mail-Inhalt (praezisiert D-03): sauberer HTML-Text + CTA-Button, KEIN Branding
Felder, die die Mail nennen MUSS:
- Einlader-Name (Fallback: "Ein Admin von {Gruppe}", wenn kein Name aufloesbar).
- Gruppenname + zugewiesene Rolle.
- Ein Satz "Was ist Team4s".
- Was Annehmen bewirkt (wird Mitglied; kein Konto -> beim Annehmen direkt anlegbar).
- ENTSCHEIDENDER Hinweis: genau diese E-Mail-Adresse ({email}) verwenden (wegen E-Mail-Match).
- CTA-Button "Einladung annehmen".
- Ablaufdatum ("... gueltig bis {Datum}").
- Entwarnungs-Footer ("nicht erwartet? -> ignorieren").
- **Encoding-Bug fixen:** aktuell "gueltig" -> "gÃ¼ltig" (Doppel-UTF-8). Korrekte Umlaute/UTF-8
  im Mail-Body sicherstellen (CLAUDE.md-Umlaut-Regel).
Design: strukturierte HTML-Mail mit echtem Button, robust ueber Mail-Clients; KEIN Logo/
Farb-Branding (eigene spaetere Runde).

### D-11 Accept-Seiten-Inhalt (praezisiert D-04/D-09): kein Keycloak-Jargon, @/components/ui
- Titel: Einladung zu "{Gruppe}". Kontextzeile: "{Einlader} hat dich als {Rolle} in die
  Fansub-Gruppe {Gruppe} eingeladen."
- Zustaende:
  - Nicht eingeloggt / kein Konto: zwei CTAs -- "Konto erstellen und beitreten" (primaer,
    E-Mail vorbefuellt) + "Ich habe schon ein Konto - Anmelden".
  - Eingeloggt, E-Mail passt: Button "Als {meine E-Mail} annehmen".
  - Eingeloggt, E-Mail passt NICHT: freundlicher Hinweis (Einladung ist fuer {invited email},
    du bist als {current email} angemeldet -> mit eingeladener Adresse anmelden).
  - Abgelaufen / schon Mitglied / ungueltiger Link: je eine menschliche Meldung, kein 404/Code.
- Keine Keycloak-/Architektur-Interna im Text ("Keycloak bleibt fuer Login..." raus).

### D-12 Register-Prefill gesperrt (praezisiert D-08)
Im invite-scoped Register-Pfad ist die E-Mail auf die eingeladene Adresse vorbefuellt UND
nicht editierbar (gesperrt), damit der spaetere E-Mail-Match nicht scheitern kann. Falls KC
die E-Mail im Register-Screen nicht hart sperren kann, mindestens vorbefuellt + klarer Hinweis
+ Team4s-seitige Validierung vor dem Accept.

---

## D-13 Keycloak-Register-Seite: E-Mail gesperrt + Invite-Kontext (locked 2026-08-17, Plan 135-08)

Der "Registrieren"-Pfad landet auf Keycloaks `/registrations`-Seite im Custom-Theme "team4s"
(loginTheme:"team4s"; verifyEmail ist AUS -> keine Bestaetigungs-Wall). Das Theme hat heute KEINE
`.ftl`-Overrides (nur messages/resources/theme.properties), nutzt also KCs Standard-Register-
Formular. Deshalb neuer Plan 135-08:
- E-Mail auf dem KC-Register-Formular vorbefuellt UND read-only (setzt D-12 technisch um -- das
  ist eine Theme-Template-Aenderung, nicht Next.js/Backend).
- Generischer Invite-Onboarding-Kontext-Text auf der KC-Seite (dynamischer Gruppenname NUR falls
  technisch theme-erreichbar; sonst generisch, Limitation dokumentieren).
- Offene Registrierung (ohne Invite-Kontext) bleibt unveraendert funktionsfaehig.
- Sicherheits-Hinweis: Das Sperren ist UX, kein Security-Control; autoritativ bleibt der beim
  Annehmen erzwungene server-seitige email_match. login_hint prefillt das KC-Register-Formular
  NICHT automatisch wie das Login-Formular -> Task 1 in 135-08 klaert den echten Mechanismus an
  der laufenden KC-Instanz, bevor implementiert wird.

## D-14 Keycloak ist autoritativ fuer den Fansubname (locked 2026-08-18, vom Nutzer bestaetigt; Plan 135-09)

Die KC-Registrierung erfasst einen **Fansubname** als primaeres Identitaetsfeld; Vor-/Nachname sind
**optional (freiwillig)**. Keycloak haelt den Fansubname autoritativ, der OIDC-Token traegt ihn, und
der JIT-Sync seedet/aktualisiert daraus Team4s `members.nickname`/`fansub_name`. Der Fansubname ist
editierbar (KC ist Master; Team4s spiegelt bzw. schreibt konsistent in EINE Richtung -- in Task 1
festlegen). Ziel-Verhalten: Nutzer identifizieren sich ueber den Fansubname statt ueber Vor-/Nachname
(vgl. Login-Verwirrung "D1sk" vs. E-Mail). Der genaue KC-26-Mechanismus (Fansubname-als-username fuer
Login-mit-Fansubname VS. eigenes Attribut + E-Mail-Login) wird in 135-09 Task 1 an der laufenden KC
geklaert, bevor implementiert wird. Kontext: KC v26, Realm team4s, loginWithEmailAllowed=True,
registrationEmailAsUsername=False, verifyEmail=False.

**D-14 Praezisierung (2026-08-18, Nutzer):** Login MUSS mit E-Mail UND Fansubname moeglich sein. -> Der Fansubname wird der **KC-username** (Login-mit-Fansubname), `loginWithEmailAllowed` bleibt AN (Login-mit-E-Mail). Task 1 in 135-09 klaert dann nur noch die Constraints des Username-Ansatzes (unique, erlaubter Zeichensatz, editUsername=ON fuer spaeteres Aendern), nicht mehr das Ob.

## D-15 Case-preserved Fansubname (Anzeige) — Username bleibt klein (2026-08-18, Plan 135-10)
KC normalisiert username klein. Der original geschriebene Fansubname wird als eigenes KC-Attribut (fansubName) gefuehrt und fuer die ANZEIGE genutzt (account_display_name/members.nickname = Original-Case); username bleibt klein fuer case-insensitives Login. Ableitung username=lowercase(fansubName) -> Task 1 (KC-26).

## D-16 Historisch-Mitglied Selbst-Claim Approval rendern (Finding #25, Plan 135-10)
Backend/Routen (admin_routes.go:225-227)/Permission/Daten funktionieren. GroupMembersHistTable.tsx bekommt pendingClaimsByMember/onVerifyClaim/onRejectClaim, rendert sie aber nie. Fix: Approval-UI (Bestaetigen/Ablehnen) in der HistoricalMemberCard rendern. Kein Backend-/Routen-Fix noetig (mein #25-Erst-Diagnose war falsch).
