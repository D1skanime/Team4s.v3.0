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
