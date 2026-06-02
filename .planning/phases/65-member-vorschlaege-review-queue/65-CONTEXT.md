# Phase 65: Member-Vorschläge und Review-Queue (Post-MVP) - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning
**Source:** Moderierte Produktdiskussion (Member-Vorschläge & Review-Queue, 2026-06-02)
**Depends on:** Phase 64 (Member-Dashboard & Public Pages)

<domain>
## Phase Boundary

Drei zusammenhängende Fähigkeiten auf Basis des bestehenden `anime_contributions`-Modells:

1. **Member-Vorschläge:** Ein verifizierter Member (über `member_claims`) schlägt eigene Contributions vor. Der Vorschlag erhält Status `proposed`. Eingabe über die in Phase 64 bewusst leer gelassene Sektion „Eigene Vorschläge" im Dashboard `me/contributions`.
2. **Review-Queue (Leader):** Leader (und Admins) sehen pro Gruppe eine Queue der `proposed`-Einträge und können bestätigen oder ablehnen.
3. **90-Tage-Timeout:** Bleibt ein Vorschlag 90 Tage ohne Leader-Reaktion, kann der Member ihn selbst als unverified (`(historisch)`) öffentlich schalten.

**Nicht in dieser Phase:** Claiming/Verifizierung historischer Nicks (Phase 66), Episode-/Release-Credits (Phase 67), vollständige Badge-Engine + Archiv-Suche (Phase 68), E-Mail-Benachrichtigungen.

</domain>

<decisions>
## Implementation Decisions

### Vorschlags-Umfang
- **D-01:** Ein Member darf Contributions nur für **eigene Gruppen** vorschlagen — also Gruppen, in denen er bereits eine (historische) Mitgliedschaft hat (`hist_fansub_group_members`, verknüpft über seine verifizierte `member_claims`-Identität). Kein Vorschlagen für fremde oder neue Gruppen.
- **D-02:** Pflichtangaben: **Anime + mindestens eine Rolle**. Zusätzlich ein **prominentes Freitext-Notizfeld** für Kontext (z. B. „war 2005 Co-Editor"). `started_year`/`ended_year` optional.
- **D-03:** Ein Member schlägt **nur die eigene Beteiligung** vor (geknüpft an seine `member_claims`-Identität). Keine Vorschläge für Dritte.

### Rollen-Auswahl
- **D-04:** Auswahl aus dem **vollen Rollenkatalog** (`role_definitions`), Mehrfachauswahl erlaubt, **mindestens eine Rolle Pflicht**. Zielmodell: `anime_contribution_roles` (CASCADE, UNIQUE pro contribution+role).

### Duplikat-Behandlung
- **D-05:** Ein Vorschlag, der eine bereits existierende Contribution dupliziert, wird **hart blockiert**. Duplikatkriterium: gleiche Kombination aus Member-Identität (`fansub_group_member_id`) + `anime_id` + `fansub_group_id`. Bei Treffer: aussagekräftiger Fehler, kein Insert.

### Review-Queue (Leader)
- **D-06:** Die Queue lebt **pro Gruppe** im bestehenden Leader-Bereich (`frontend/src/app/manage/groups/[id]`). Leader sieht nur `proposed`-Einträge seiner Gruppe(n).
- **D-07:** **Ablehnen → Status `disputed`** (Eintrag bleibt intern erhalten, nicht öffentlich — konsistent mit Phase-64-Logik). Kein Hard-Delete (Observability-/Audit-Constraint).
- **D-08:** Ablehngrund ist **optional**; falls angegeben, ist er für den Member im Dashboard sichtbar. → Benötigt ein neues Feld für den Ablehngrund (z. B. `review_note` / `rejection_reason`) — exakte Spalte klärt Research/Planung.
- **D-09:** Review-Berechtigung: **Gruppen-Leader UND Plattform-Admins** (Admins als Fallback/Moderation).

### Sichtbarkeit nach Bestätigung
- **D-10:** Bei **Bestätigung** (Status → `confirmed`) werden **beide** Sichtbarkeitsflags automatisch gesetzt: `is_public_on_anime_page = true` UND `is_public_on_member_profile = true`. `confirmed_by` = App-User-ID des bestätigenden Leaders/Admins, `confirmed_at = NOW()`.

### 90-Tage-Timeout
- **D-11:** Bleibt ein Vorschlag 90 Tage ohne Reaktion, darf der **Member ihn selbst öffentlich schalten** — als **unverified** mit `(historisch)`-Soft-Label (Phase-64-Kennzeichnung). Kein automatisches Eskalieren an Moderation.
- **D-12:** Die 90-Tage-Grenze wird **on-read** berechnet (`created_at + 90 Tage`) — kein Hintergrundjob in V1. Die Selbst-Schalt-Option erscheint im Dashboard erst nach Ablauf.
- **D-13:** Beim Einreichen erhält der Member einen **Hinweis auf die 90-Tage-Regel** im Formular (Erwartungsmanagement).

### Audit-Attribution
- **D-14:** Beim Einreichen: `created_by` = App-User-ID des Members. Bei Leader-Bestätigung: `confirmed_by` = Leader/Admin (siehe D-10).
- **D-15:** Schaltet der Member nach 90 Tagen selbst öffentlich, wird `confirmed_by` = **App-User-ID des Members** gesetzt (Audit-Spur, wer geschaltet hat), der Eintrag bleibt aber **unverified** markiert. → Offene Modellierungsfrage für Research: Wie wird „selbst-geschaltet/unverified" von einer echten Leader-Bestätigung unterschieden (z. B. anhand der Rolle des `confirmed_by`-Users oder eines dedizierten Flags)? Status bei Selbst-Schaltung NICHT zwingend `confirmed`.

### Member-Dashboard-UX
- **D-16:** Eingabe über ein **Inline-/Modal-Formular** in der „Eigene Vorschläge"-Sektion auf `me/contributions` (Button „+ Beitrag vorschlagen"). Kein Seitenwechsel.
- **D-17:** Darstellung der eigenen Vorschläge **nach Status gruppiert**: „In Prüfung" (`proposed`), „Bestätigt" (`confirmed`), „Abgelehnt" (`disputed`) — analog zur Phase-64-Gruppierung im Dashboard.
- **D-18:** Benachrichtigung über Entscheidungen erfolgt in V1 **nur in-app** (Status beim nächsten Dashboard-Besuch). Kein E-Mail-Versand, obwohl SMTP/Mailpit seit Phase 60 existiert.

### Sprache
- **D-19:** Alle user-facing Strings auf Deutsch mit korrekten Umlauten (Projektkonvention).

### Claude's Discretion
- Exaktes Schema-Detail für den optionalen Ablehngrund (neue Spalte vs. wiederverwendbares Feld).
- Mechanismus zur Unterscheidung „unverified selbst-geschaltet" vs. „leader-confirmed" (D-15).
- Ob neue API-Endpunkte (POST `/api/v1/me/contribution-proposals`, Review-PATCH-Routen) im bestehenden `contributions_me_handler.go` / `fansub_anime_contributions_handler.go` ergänzt oder in neue Handler ausgelagert werden (450-Zeilen-Limit beachten).
- Genaue Komponenten-/Dateistruktur der neuen UI-Abschnitte (analog Phase 64).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MÜSSEN diese Dateien lesen, bevor sie planen oder implementieren.**

### Datenmodell (Basis für alle Vorschläge/Review-Aktionen)
- `database/migrations/0086_anime_contributions.up.sql` — `anime_contributions`, Status-Check inkl. `proposed`/`confirmed`/`disputed`, Sichtbarkeitsflags, `created_by`/`confirmed_by`
- `database/migrations/0087_anime_contribution_roles_and_badges.up.sql` — `anime_contribution_roles` (Rollenzuordnung), `member_badges`
- `database/migrations/0081_historical_members_identity.up.sql` — `member_claims` (verifizierte App-User↔Member-Verknüpfung)
- `database/migrations/0082_historical_fansub_group_members.up.sql` — `hist_fansub_group_members` (Member↔Gruppen-Identität, NOT-NULL-FK der Contribution)
- `database/migrations/0065_seed_contributor_roles_kernrollen.up.sql` — Rollen-Seed (`role_definitions`)

### Backend-Muster (wiederverwenden, nicht neu erfinden)
- `backend/internal/handlers/contributions_me_handler.go` — Me-Handler, `resolveVerifiedMemberID()`, Ownership-Checks, PATCH-Visibility-Muster
- `backend/internal/handlers/fansub_anime_contributions_handler.go` — Leader/Admin-CRUD auf Contributions inkl. Status-Update (confirm/reject-Basis)
- `backend/internal/repository/anime_contributions_repository.go` — Repository-Muster (`ListByMemberID` u. a.)
- `backend/cmd/server/main.go` (≈ Z. 329–358) — Routen-Registrierung & Handler-Verdrahtung

### Frontend (Erweiterung, nicht Ersatz)
- `frontend/src/app/me/contributions/` — Member-Dashboard, „Eigene Vorschläge"-Sektion (Phase 64 ließ sie leer)
- `frontend/src/app/manage/groups/` — Leader-Bereich → Review-Queue pro Gruppe
- `frontend/src/lib/api.ts` — zentrale API-Aufrufe (neue Proposal-/Review-Calls hier ergänzen)

### Vorheriger Kontext / Konventionen
- `.planning/phases/64-fansub-contributions-member-dashboard-public-pages/64-CONTEXT.md` — `(historisch)`-Label, Dashboard-Gruppierung, Sichtbarkeits-Steuerung, Ablehn-bleibt-intern-Logik
- `shared/contracts/openapi.yaml` — API-Vertrag (neue Endpunkte ergänzen)
- `CLAUDE.md` — max 450 Zeilen pro Produktionsdatei, korrekte Umlaute, GSD-Workflow

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `resolveVerifiedMemberID(appUserID)` in `contributions_me_handler.go`: ermittelt die `member_id` über verifizierten `member_claims`-Eintrag — Basis für „nur eigene Gruppen" (D-01) und „nur für sich selbst" (D-03).
- Ownership-Check-Muster (JOIN über `hist_fansub_group_members.member_id`) im selben Handler — wiederverwendbar für Proposal-Ownership.
- PATCH-Visibility-Endpunkte als Vorlage für neue Proposal-/Review-Mutationen.

### Established Patterns
- `anime_contributions.status` deckt den vollen Lebenszyklus bereits ab (`draft`→`proposed`→`confirmed`/`disputed`/`hidden`) — keine Schema-Erweiterung am Status nötig, nur ggf. ein Feld für den optionalen Ablehngrund (D-08).
- Handler/Repository/Routen werden explizit in `main.go` verdrahtet (kein DI-Container).
- Gin-Handler geben deutsche Fehlermeldungen als `{"error":{"message":...}}` zurück.

### Integration Points
- Neuer Endpunkt **POST `/api/v1/me/contribution-proposals`** (P65-SC1) — auth-geschützt, nutzt `resolveVerifiedMemberID`.
- Review-Aktionen (confirm/reject) als Leader/Admin-Routen — entweder im bestehenden `fansub_anime_contributions_handler.go` oder neuem Review-Handler.
- Frontend: „Eigene Vorschläge"-Sektion (`me/contributions`) + Review-Queue (`manage/groups/[id]`).

</code_context>

<specifics>
## Specific Ideas

### Dashboard-Sektion „Eigene Vorschläge" (Status-gruppiert)
```
Eigene Vorschläge

[+ Beitrag vorschlagen]   ← Inline-/Modal-Formular
   Hinweis: Reagiert kein Leader binnen 90 Tagen,
   kannst du den Vorschlag selbst (historisch) öffentlich schalten.

In Prüfung (N)        → proposed
Bestätigt (N)         → confirmed
Abgelehnt (N)         → disputed (+ optionaler Ablehngrund vom Leader)
```

### Review-Queue (pro Gruppe, Leader/Admin)
```
Offene Vorschläge (N)
  → Karte: Member, Anime, Rollen-Chips, Notiz, eingereicht am ...
  → [Bestätigen]  [Ablehnen (Grund optional)]
```
Bestätigen → beide Sichtbarkeitsflags an (D-10). Ablehnen → `disputed` (D-07).

### 90-Tage-Selbstschaltung
Erscheint im Dashboard nur, wenn `created_at + 90 Tage` überschritten und Status noch `proposed`. Schaltet als unverified mit `(historisch)`-Label.

</specifics>

<deferred>
## Deferred Ideas

- E-Mail-Benachrichtigung an Member/Leader (SMTP existiert seit Phase 60) — bewusst aus V1 ausgeklammert (D-18), Kandidat für spätere Phase.
- Automatisches Eskalieren abgelaufener Vorschläge an eine Moderations-Queue — verworfen zugunsten Member-Selbstschaltung (D-11).
- Geplanter Hintergrundjob für Timeout-Verarbeitung — verworfen zugunsten On-Read (D-12).

### Reviewed Todos (not folded)
- `2026-05-28-profile-hub-content-activity-redesign.md` (UI-Redesign Profil-Hub) — tangential zur Vorschlags-/Review-Logik; gehört in eine eigene UI-Phase.
- `2026-05-28-contributor-owned-media-note-edit-delete.md` (Contributor-eigene Medien/Notizen bearbeiten/löschen) — eigenes Feature, nicht Teil von Vorschlägen/Review-Queue.

</deferred>

---

*Phase: 65-member-vorschlaege-review-queue*
*Context gathered: 2026-06-02 aus moderierter Produktdiskussion*
