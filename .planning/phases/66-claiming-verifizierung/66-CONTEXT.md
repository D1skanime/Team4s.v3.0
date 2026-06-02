# Phase 66: Claiming und Verifizierung (Post-MVP) - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning
**Source:** Moderierte Produktdiskussion (Claiming & Verifizierung, 2026-06-02)
**Depends on:** Phase 65 (Member-Vorschläge & Review-Queue)

<domain>
## Phase Boundary

Verknüpfung echter App-User mit historischen Member-Einträgen über einen Claim-/Verifizierungs-Workflow auf Basis der bestehenden `member_claims`-Tabelle (Migration 0081):

1. **Claiming (zwei Richtungen):** App-User beansprucht selbst einen historischen Member-Eintrag (Self-Service, P66-SC1) UND Leader lädt jemanden per Einladungslink ein (P66-SC2). Beide enden in `member_claims`.
2. **Verifizierung:** Leader/Admins bestätigen Self-Service-Claims; Einladungslinks setzen den Claim beim Einlösen auf `verified`.
3. **Sichtbarkeit/Privacy:** `noindex`-Steuerung pro Member-Profil (`me/profile`) und sichtbarer `verified`-Status im öffentlichen Profil (P66-SC3).

**Wichtig:** Ein verifizierter Claim ist die bereits in Phase 65 genutzte Voraussetzung, um Contributions vorzuschlagen (`resolveVerifiedMemberID`). Diese Phase liefert den Flow, der diese Verknüpfung herstellt.

**Nicht in dieser Phase:** Episode-/Release-Credits (Phase 67), Badge-Engine + Archiv-Suche (Phase 68).

</domain>

<decisions>
## Implementation Decisions

### Claim-Flows & Auffinden
- **D-01:** Beide Richtungen werden unterstützt: **Self-Service-Claim** (App-User reicht ein, P66-SC1) **und Leader-Einladung** (Einladungslink, P66-SC2). Beide münden in `member_claims`.
- **D-02:** Beim Self-Service findet der App-User den historischen Eintrag über eine **Suche nach Nick** (im Profil-/Claim-Bereich) und beansprucht den Treffer.
- **D-03:** Findet der App-User keinen passenden Eintrag, kann er die **Neuanlage eines historischen Eintrags beantragen**. Der Antrag geht in eine **Leader/Admin-Queue** zur Prüfung. (Neuer kleiner Workflow — Scope-Erweiterung gegenüber reinem Claiming.)

### Einladungslink-Mechanik
- **D-04:** Token wird in einer **neuen Tabelle `member_claim_invitations`** gespeichert, modelliert nach `fansub_group_invitations` (Migration 0076): `token_hash` (SHA-256, 64 Zeichen), `expires_at`, `status` (`pending`/`accepted`/`cancelled`/`expired`), Bezug zum historischen Member-Eintrag und zum erstellenden Leader.
- **D-05:** Einladungslinks sind **7 Tage** gültig (`expires_at = NOW() + 7 Tage`).
- **D-06:** Versand: Der Leader generiert den Link und **teilt ihn manuell** (z. B. Discord). Kein automatischer E-Mail-Versand in V1 (historische Kontakte laufen oft außerhalb).
- **D-07:** Einlösung über einen **Account-Flow (Keycloak)**: Klick auf den Link führt den Empfänger durch Registrierung und verknüpft danach automatisch seinen App-User mit dem historischen Member (`claim_status = verified`). **Fall „Empfänger hat bereits einen Account" muss abgefangen werden** → Login statt Registrierung, danach gleiche Verknüpfung.

### Verifizierung & Konflikte
- **D-08:** Self-Service-Claims werden von **Gruppen-Leader ODER Plattform-Admins** bestätigt (Claim-Queue), konsistent mit dem Review-Recht aus Phase 65.
- **D-09:** Bei mehreren Claims auf denselben historischen Member bleiben **alle `pending`-Claims sichtbar; Leader/Admin wählt manuell** den richtigen aus. **Invariante:** pro historischem Member darf es **nur einen `verified`-Claim** geben — sobald einer verifiziert ist, werden weitere offene Claims darauf blockiert/abgelehnt.
- **D-10:** `verification_method`-Werte: **`invite_link`** (per Leader-Einladungslink eingelöst) und **`manual_review`** (Self-Service-Claim manuell bestätigt).

### noindex & verified-Anzeige
- **D-11:** Steuerung über einen **Toggle in `me/profile`** („Mein Profil von Suchmaschinen indexieren lassen") → PATCH auf `member_profiles.noindex`.
- **D-12:** Default-Verhalten: **Beim Verifizieren wird das Profil indexierbar** (`noindex = false` setzen). Der Member kann es jederzeit wieder verstecken (`noindex = true`). (Hinweis: Schema-Default in 0081 ist `noindex = true` — der Verify-Flow überschreibt das bewusst.)
- **D-13:** `verified`-Status wird als **Häkchen-Badge neben dem Member-Namen** im öffentlichen Profil dargestellt. Für verifizierte Einträge entfällt das `(historisch)`-Label aus Phase 64.
- **D-14:** `noindex` wirkt in V1 **nur auf das robots-Meta-Tag** (`noindex,nofollow`) der Profilseite. Sitemap-Ausschluss ist späterem Ausbau vorbehalten.

### Sprache
- **D-15:** Alle user-facing Strings auf Deutsch mit korrekten Umlauten (Projektkonvention).

### Claude's Discretion
- Genaues Schema von `member_claim_invitations` (Spalten, Constraints, Indizes) — analog 0076.
- Wie der Account-Flow technisch an Keycloak andockt (Redirect mit Token-Parameter, Callback-Verknüpfung) und wie der „bereits eingeloggt"-Fall erkannt wird.
- Wo die Claim-Queue und die Neuanlage-Antrags-Queue im Frontend leben (vermutlich `manage/groups/[id]` bzw. Admin-Bereich).
- Ob die Nick-Suche einen neuen Endpunkt braucht oder eine bestehende Member-Suche wiederverwendet.
- Aufteilung in neue Handler/Repos unter dem 450-Zeilen-Limit.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MÜSSEN diese Dateien lesen, bevor sie planen oder implementieren.**

### Claiming-Datenmodell (Basis)
- `database/migrations/0081_historical_members_identity.up.sql` — `member_claims` (pending/verified/rejected, `verified_by`, `verification_method`, UNIQUE(member_id, app_user_id)) UND `member_profiles.noindex` (Default true)
- `database/migrations/0082_historical_fansub_group_members.up.sql` — `hist_fansub_group_members` (historische Member↔Gruppe)
- `database/migrations/0077_member_profiles_mvp.up.sql` — `member_profiles`-Basis

### Einladungslink-Vorbild (Token-Muster wiederverwenden)
- `database/migrations/0076_fansub_group_invitations.up.sql` — `token_hash` (SHA-256, 64), `expires_at`, `status`-Lifecycle, eindeutige Token-/Pending-Indizes
- `backend/internal/repository/fansub_group_invitations_repository.go` — Repository-Muster für Token-Erzeugung/-Einlösung
- `backend/internal/handlers/app_auth.go` — bestehender Auth-/Einlösungs-Flow (Keycloak-Anbindung)

### Backend-Muster (Claim nutzt verified-Status)
- `backend/internal/handlers/contributions_me_handler.go` — `resolveVerifiedMemberID()` (verified Claim = Voraussetzung; zeigt wie member_claims gelesen wird)
- `backend/cmd/server/main.go` — Routen-/Handler-Verdrahtung

### Frontend (Erweiterung)
- `frontend/src/app/me/profile/` — Profil-Einstellungen → noindex-Toggle, Claim-Status
- `frontend/src/app/members/` — öffentliches Member-Profil → verified-Badge, robots-Meta-Tag, Claim-Button
- `frontend/src/app/manage/groups/` — Leader-Bereich → Einladungslink generieren, Claim-Queue
- `frontend/src/app/invitations/` — bestehende Einlade-Einlösung (Vorbild/Wiederverwendung)
- `frontend/src/lib/api.ts` — zentrale API-Aufrufe

### Vorheriger Kontext / Konventionen
- `.planning/phases/65-member-vorschlaege-review-queue/65-CONTEXT.md` — Review-Recht (Leader+Admins), verified-Claim als Voraussetzung
- `.planning/phases/64-fansub-contributions-member-dashboard-public-pages/64-CONTEXT.md` — `(historisch)`-Label (entfällt bei verified)
- `shared/contracts/openapi.yaml` — API-Vertrag (neue Endpunkte ergänzen)
- `CLAUDE.md` — max 450 Zeilen, korrekte Umlaute, GSD-Workflow

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `fansub_group_invitations` (Tabelle 0076 + Repository): vollständiges Token-Link-Muster (SHA-256-`token_hash`, `expires_at`, Status-Lifecycle, eindeutige Indizes) — direkte Vorlage für `member_claim_invitations`.
- `member_claims` existiert bereits mit allen benötigten Spalten (`claim_status`, `verified_by`, `verification_method`, `verified_at`) — **kein neues Claim-Schema nötig**, nur Handler/Repo + Einladungstabelle.
- `app_auth.go` + Keycloak-Anbindung: Basis für den Account-/Einlösungs-Flow (D-07).
- `member_profiles.noindex` existiert (0081) — P66-SC3 braucht nur PATCH-Endpunkt + Toggle + robots-Meta-Tag.

### Established Patterns
- Token-Einladungen werden gehasht gespeichert (nie Klartext-Token in DB), mit eindeutigem Index auf `token_hash`.
- Handler/Repo/Routen explizit in `main.go` verdrahtet (kein DI-Container); deutsche Fehler als `{"error":{"message":...}}`.

### Integration Points
- Neuer Endpunkt für Self-Service-Claim (App-User reicht ein) + Nick-Suche.
- Leader-Endpunkte: Einladungslink erzeugen, Claim-Queue bestätigen/ablehnen, Neuanlage-Anträge prüfen.
- Einlösungs-Endpunkt: Token validieren → Keycloak-Account-Flow → `member_claims.claim_status = verified`, `noindex = false`.
- Öffentliches Profil: verified-Badge, robots-Meta-Tag aus `member_profiles.noindex`.

</code_context>

<specifics>
## Specific Ideas

### Self-Service-Claim
```
Profil-/Claim-Bereich
  → Nick-Suche: "Welcher historische Eintrag bist du?"
  → Treffer → [Das bin ich beanspruchen]  (claim_status=pending)
  → Kein Treffer → [Neuen Eintrag beantragen]  (→ Leader/Admin-Queue)
```

### Leader-Einladung
```
manage/groups/[id] → historischer Member-Eintrag
  → [Einladungslink generieren]  (7 Tage gültig)
  → Link anzeigen/kopieren → Leader teilt manuell
Empfänger klickt → Keycloak (Registrierung ODER Login) → automatisch verified (invite_link)
```

### Claim-Queue (Leader/Admin)
```
Offene Claims (N)
  → Karte: App-User, beanspruchter Nick, Notiz, eingereicht am ...
  → [Bestätigen → verified (manual_review)]  [Ablehnen → rejected]
  (mehrere pending pro Member sichtbar; nur 1 verified erlaubt)
```

### Öffentliches Profil
```
[Nick ✓ verifiziert]        ← Häkchen-Badge (ersetzt (historisch) bei verified)
robots: noindex,nofollow    ← nur wenn member_profiles.noindex = true
```

### me/profile Toggle
```
☑ Mein Profil von Suchmaschinen indexieren lassen   (noindex = false)
```

</specifics>

<deferred>
## Deferred Ideas

- E-Mail-Versand des Einladungslinks (SMTP seit Phase 60) — V1 nutzt manuelles Teilen (D-06).
- Sitemap-Ausschluss bei `noindex` — V1 nur robots-Meta-Tag (D-14).
- Automatische Account-Erstellung ohne Keycloak-Standardflow — nicht nötig, bestehender Flow wird genutzt.

### Reviewed Todos (not folded)
- `2026-05-28-profile-hub-content-activity-redesign.md` — UI-Redesign, eigene Phase.
- `2026-05-28-contributor-owned-media-note-edit-delete.md` — eigenes Feature, nicht Teil von Claiming/Verifizierung.

</deferred>

---

*Phase: 66-claiming-verifizierung*
*Context gathered: 2026-06-02 aus moderierter Produktdiskussion*
