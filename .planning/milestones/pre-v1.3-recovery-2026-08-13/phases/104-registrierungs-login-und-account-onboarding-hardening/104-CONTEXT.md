# Phase 104: Registrierungs-, Login- und Account-Onboarding-Hardening - Context

**Gathered:** 2026-07-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 104 repariert den sichtbaren Team4s-Registrierungs-, Login-, Logout- und Account-Onboarding-Flow einschließlich Keycloak-Account-Console, Auth-Hydration und unmittelbar verbundener Navigation. Ein registrierter Account bleibt fachlich ein normaler `app_user`; Fansub-Member, Gruppenmitgliedschaften, Contributions und Projekte entstehen ausschließlich über ihre bestehenden verifizierten Domänen-Seams.

Nicht Teil dieser Phase sind allgemeine Public-Copy-Bereinigung, C-Subs-Demodaten sowie Produktionshärtungen, die der lokale Testbetrieb noch nicht tragen soll.

</domain>

<decisions>
## Implementation Decisions

### Registrierungsabschluss
- **D-01:** Nach erfolgreicher Registrierung wird der Nutzer automatisch angemeldet; ein zweiter manueller Login ist nicht erforderlich.
- **D-02:** Das Ziel nach erfolgreicher Authentifizierung und geladenem Team4s-Account ist `/me/profile` beziehungsweise die sichtbare Oberfläche „Mein Account“.
- **D-03:** Die Erfolgsbestätigung lautet neutral: „Dein Team4s-Konto wurde erstellt. Du bist jetzt angemeldet.“ Sie setzt keine Fansub-Tätigkeit und keine bestätigte E-Mail voraus.
- **D-04:** Die Bestätigung wird einmalig auf „Mein Account“ angezeigt und bleibt sichtbar, bis der Nutzer sie schließt oder die Seite verlässt. Sie darf nicht allein durch einen manipulierbaren Query-Parameter ausgelöst werden.

### Normaler Account und freiwillige Fansub-Verknüpfung
- **D-05:** Ein normaler registrierter Nutzer muss Team4s ohne Fansub-Member-Eintrag sinnvoll verwenden können. Nicht jeder Team4s-Nutzer ist oder war Fansubber.
- **D-06:** Ein Account ohne verifizierten Member sieht öffentliche Bereiche und „Mein Account“, aber keinen Menüpunkt „Meine Projekte“.
- **D-07:** Auf „Mein Account“ gibt es unter den Accountdaten einen eigenen, unaufdringlichen Abschnitt „Warst du als Fansubber aktiv?“. Historische Suche und Neuantrag bleiben freiwillige Zusatzmöglichkeiten.
- **D-08:** Ein direkter Aufruf von `/me/contributions` durch einen angemeldeten Nutzer ohne projektberechtigten Member-Kontext zeigt keine technische Fehlerseite. Der Nutzer wird zu „Mein Account“ zurückgeleitet.
- **D-09:** „Meine Projekte“ erscheint erst, wenn der Account mit einem verifizierten Member verbunden ist und dieser Member mindestens eine echte Projekt-/Contribution-Zuordnung besitzt. Ein verifizierter Member ohne Projektzuordnung sieht den Menüpunkt ebenfalls nicht.
- **D-10:** Registrierung erzeugt ausschließlich den `app_user`. Sie vergibt keine automatische Team4s-DB-Rolle `user`, erzeugt keinen Member, keine Gruppenmitgliedschaft, keine Contribution und kein Projekt.

### Lokaler Keycloak-Testbetrieb
- **D-11:** Phase 104 führt noch keine strengere Passwort-Policy ein. Das Testpasswort `123` muss im lokalen Entwicklungsbetrieb weiterhin zulässig sein.
- **D-12:** Phase 104 aktiviert noch keinen Brute-Force-/Lockout-Schutz. Die spätere Produktionshärtung wird als eigener Folgeauftrag dokumentiert.
- **D-13:** `directAccessGrantsEnabled` bleibt für die vorhandenen lokalen Testskripte aktiviert und wird als lokale Testkonfiguration dokumentiert.
- **D-14:** Eine E-Mail-Bestätigung ist im aktuellen lokalen Testbetrieb nicht erforderlich. Phase 104 darf keine E-Mail-Verifikation behaupten oder erzwingen.
- **D-15:** Die ungenutzte Keycloak-Realm-Rolle `user` darf nicht als Team4s-Mitgliedschaft oder Projektberechtigung interpretiert werden. Ob sie technisch entfernt oder als lokale IdP-Rolle belassen wird, ist Implementierungsdetail, solange keine automatische Abbildung in `app_user_global_roles` entsteht und die UI sie nicht als Fansub-Mitglied darstellt.

### Accountverwaltung und Auth-Fehlerzustände
- **D-16:** E-Mail, Name und Passwort werden weiterhin über die Keycloak Account Console in einem neuen Tab verwaltet. Der reproduzierte HTTP-403-Fehler muss in der versionierten Keycloak-/Client-/Realm-Konfiguration behoben werden; kein Team4s-UI-Workaround.
- **D-17:** In der Team4s-Navigation bleibt nur „Mein Account“. Die doppelte Navigation „Account & Sicherheit“ wird entfernt; der Link zur Keycloak Account Console bleibt innerhalb von „Mein Account“.
- **D-18:** Während Login-Rückleitung, Session-Initialisierung, Refresh und Account-/Profil-Laden erscheint ein einheitlicher neutraler Ladezustand. Loginformular und fertige Accountnavigation dürfen nicht widersprüchlich gleichzeitig erscheinen.
- **D-19:** Ist die Auth-Session gültig, aber Team4s-Accountdaten können nicht geladen werden, erscheint eine deutsche Fehleransicht mit „Erneut versuchen“ und „Abmelden“. Es darf kein falscher „Anmelden“-Aufruf erscheinen.
- **D-20:** Fehlender oder abgelaufener Access-Token bei gültigem Refresh-Token bleibt eine aktive Session und läuft ausschließlich durch den zentralen Auth/API-Refresh-Seam.

### Formulare, Sprache und mobile Navigation
- **D-21:** Registrierung, Login, Passwort-Reset und Account Console sollen deutsch und als Team4s gebrandet erscheinen; „Team4s Local“ und englische Standardtexte sind keine Nutzeroberfläche.
- **D-22:** Feldbezogene Registrierungsfehler müssen nach Korrektur des jeweiligen Felds verschwinden oder durch den aktuellen Fehler ersetzt werden. Fehler anderer Felder dürfen nicht global unterdrückt werden.
- **D-23:** Die sichtbaren Team4s-CTAs „Anmelden“ und „Registrieren“ verwenden den bestehenden globalen `@/components/ui`-Button-Seam.
- **D-24:** Mobile Drawer-Navigation und Logout reagieren beim ersten Tap deterministisch, schließen das Drawer und zeigen einen passenden Lade-/Logoutzustand.

### the agent's Discretion
- Exakte Komponentenaufteilung, Name und Speicherort des einmaligen serverbestätigten Registrierungsmarkers sowie die minimale Keycloak-26-kompatible Theme-Datei sind technische Entscheidungen, sofern alle obigen Verhaltensentscheidungen und vorhandenen Auth-/Contract-Seams eingehalten werden.
- Die konkrete Darstellung des neutralen Ladezustands darf vorhandene Team4s-Loading-/Skeleton-Komponenten wiederverwenden.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Projekt- und Domänengrenzen
- `AGENTS.md` — verbindliche Team4s-Arbeits-, Auth-, UI-, Contract- und Domänenregeln.
- `docs/engineering/implementation-contract.md` — Search-first und Reuse-Gates.
- `docs/frontend/auth-api-client.md` — zentraler Browser-Auth/API-/Refresh-Seam.
- `docs/api/api-contracts.md` — OpenAPI-, DTO- und API-Änderungsworkflow.
- `docs/architecture/db-schema-fansub-domain.md` — Trennung von Account, Member, Gruppe, Contribution und Projekt.

### UI und Account
- `docs/frontend/ui-system.md` — globale UI-Primitives und semantische Komponenten.
- `docs/agent-guidelines-ui.md` — lokale UI- und Responsive-Regeln.
- `docs/operations/keycloak-auth-foundation-phase43.md` — Keycloak-/Team4s-Auth-Foundation und Betriebsannahmen.

### Verträge und Planung
- `shared/contracts/auth.yaml` — Auth-Verträge.
- `shared/contracts/contributions.yaml` — Member-/Contribution-Zustände.
- `shared/contracts/openapi.yaml` — kanonischer Cross-Surface-Vertrag.
- `.planning/phases/104-registrierungs-login-und-account-onboarding-hardening/104-RESEARCH.md` — Code-/UAT-Befunde; bei Konflikt haben die Entscheidungen in diesem CONTEXT Vorrang.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/lib/keycloakAuth.ts` — bestehender Authorization-Code-/PKCE-Seam für Login und direkten Registrierungsstart.
- `frontend/src/lib/api.ts` und `frontend/src/lib/useAuthSession.ts` — zentrale Session-, Refresh-, 401-Retry- und tokenfreie UI-Seams.
- `frontend/src/components/layout/AppShell.tsx` und `AppShellClientWrapper.tsx` — Navigation, Drawer und Auth-/Profilprojektion.
- `frontend/src/app/me/profile/components/MemberClaimSection.tsx` und `ClaimStatusCard.tsx` — vorhandene freiwillige Member-Suche/Claim-Flows.
- `frontend/src/components/ui` — globale Button-, Loading-, Error- und Card-Primitives.

### Established Patterns
- Keycloak besitzt Login, Registrierung, Session und externe Accountdaten; Team4s besitzt `app_users`, globale App-Rollen und Fansub-Domänendaten.
- Geschützte UI gate't auf `hasAccessToken || hasRefreshToken` und überlässt Refresh dem zentralen API-Client.
- Fehlender Member-Kontext ist ein erwartbarer Eligibility-/Onboarding-Zustand, kein Beweis für eine abgelaufene Anmeldung.
- Vertragsänderungen werden gleichzeitig in Backend, Shared OpenAPI, Frontend-Typen/API-Helfern und Tests umgesetzt.

### Integration Points
- `frontend/src/app/login/page.tsx` für getrennte sichtbare Login-/Registrierungs-CTAs und Callback.
- `frontend/src/app/me/profile/page.tsx` für neutralen Account-Zustand, einmalige Bestätigung und freiwilligen Fansub-Abschnitt.
- `frontend/src/app/me/contributions/page.tsx` für Redirect/Gating bei fehlender echter Projektzuordnung.
- `backend/internal/repository/app_auth_repository.go` und `backend/internal/handlers/app_profile.go` für Accountprojektion ohne automatische Domänenrechte.
- `infra/keycloak/realm-team4s.json`, Keycloak-Theme, Compose und Bootstrap-Dokumentation für deutsche UI und Account-Console-403.

</code_context>

<specifics>
## Specific Ideas

- Der gesamte Live-UAT beginnt auf `http://127.0.0.1:3000/` und nutzt sichtbare UI. Nur der absichtliche Test des geschützten Direktaufrufs darf `/me/contributions` über die Adresszeile öffnen.
- Der Testaccount darf lokal weiterhin `123` als Passwort verwenden.
- Der Account-only-Zustand soll normal und vollständig wirken, nicht wie ein unfertiges Fansub-Profil.

</specifics>

<deferred>
## Deferred Ideas

- Produktionsreife Passwort-Policy und sichtbare Passwortanforderungen.
- Brute-Force-/Lockout-Schutz sowie produktionsspezifische Deaktivierung von Direct Grants.
- Verpflichtende E-Mail-Verifikation, Enforcement von `pending` und Eindeutigkeit von `app_users.email` einschließlich Bestandsdaten-Audit und reversibler Migration.
- Allgemeine Public-Copy-Bereinigung (`P0 MVP`, `Episodes`, `Views`) und C-Subs-Demo-/Historieninhalte.

### Reviewed Todos (not folded)
- Profil-Hub-, Contribution-Primitive-, Credits-, Member-Profil-, Medien- und Admin-Fansub-Todos wurden geprüft, liegen aber außerhalb des Phase-104-Auth-/Onboarding-Schnitts.

</deferred>

---

*Phase: 104-registrierungs-login-und-account-onboarding-hardening*
*Context gathered: 2026-07-17*
