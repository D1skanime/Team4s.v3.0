# Phase 191: „Hinweis senden“ auch an andere Fansub-Gruppen — Research

**Researched:** 2026-10-23
**Domain:** Go/Gin-Backend-Endpunkt + Next.js-Admin-Formular, additiv zu bestehendem
Beitrags-/Review-Stack
**Confidence:** HIGH (fast ausschließlich Codebase-Verifikation, kein externer Stack-Bedarf)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 — Freigabe je nach Zielrolle:** Geht es um die Leader-Rolle (`fansub_lead`), bestätigt
  der Plattform-Admin. Bei allen anderen Rollen bestätigt der Leader der Zielgruppe (nicht die
  eigene Gruppe des Absenders).
- **D-02 — Gruppenauswahl über bestehende Gruppensuche, gemeinsamer Hook:** Alle Gruppen, über
  die bereits gebaute Gruppensuche (Name + Alias). Aus `useEpisodeVersionEditor.ts:155-187` als
  gemeinsamen Hook (z. B. `useFansubGroupSearch`) herausziehen, im Release-Editor UND im
  Hinweis-Formular nutzen — keine Kopie. Kennzeichnung „Eigene Gruppe“ vs. „Andere Gruppe“.
- **D-03 — Keine automatische Mitgliedschaft:** Der Hinweis ist nur Information. Leader/Admin
  entscheidet selbst über bestehende Wege (Mitglied hinzufügen, Zuweisung). Keine neuen
  Zuweisungs-Flows.
- **D-04 — Spam-Schutz:** (1) Keine Doppel-Hinweise pro Person+Zielgruppe+Thema (serverseitig
  erzwungen, Meldung „Du hast dazu bereits einen offenen Hinweis.“). (2) Tageslimit ca. 10 pro
  Person, bestehende Rate-Limit-Middleware wiederverwenden statt neu bauen. (3) Ablehnen/
  Schließen mit einem Klick, optional mit kurzer Begründung; erledigte Hinweise tauchen nicht
  wieder auf. Stummschalten explizit NICHT in dieser Phase bauen. Keine Captchas oder
  Wartezeiten.
- **D-05 — Keine Punkte/Badges:** Der Hinweis selbst bringt keine Punkte/Badges. Punkte erst bei
  tatsächlicher Zuweisung über bestehende Wege.
- **D-06 — Kein eigenes Recht, zwei Hinweisarten:** (a) Korrektur-Hinweis, (b) Anfrage für
  Mitgliedschaft. Kein neues Capability-Recht.
- **D-07 — Rollenfeld bei Mitgliedschaftsanfrage:** Optionales Rollenfeld, Dropdown aus
  `fansub_group`-Kontext-Rollen, Default „keine bestimmte Rolle“. Plattform-Admin-Freigabe (D-01)
  greift ausschließlich bei explizit gewähltem `fansub_lead`; jede andere Auswahl (inkl.
  `co_leader`) und „keine bestimmte Rolle“ gehen an den Leader der Zielgruppe. Korrektur-Hinweise
  sind von D-01 praktisch nie betroffen.
- **D-08 — Doku-Pflicht im selben Auftrag:** Jede Plan-Aufgabe mit Code-/Verhaltensänderung
  zieht im selben Auftrag nach: fachliche Code-Kommentare (keine reinen Phasen-Verweise),
  `docs/BACKEND_ARCHITEKTUR.md`/`docs/FRONTEND_ARCHITEKTUR.md`-Ergänzung bei neuen/geänderten
  Schichten/Bausteinen (insb. der neue Gruppensuch-Hook), `shared/contracts/`-Ergänzung bei
  neuen/geänderten API-Verträgen, `DECISIONS.md`-Eintrag für D-01 bis D-08. Jeder Plan braucht
  einen expliziten Doku-Task/Doku-Akzeptanzkriterien.
- **Verbindliche Vorgaben (alle Schritte):** Bestehende Komponenten/Flows/
  Permission-Infrastruktur wiederverwenden (keine Parallel-UI/Kopien); keine hartcodierten
  Rollennamen (`permissions.RoleFansubLead`/`RoleProjectLead` statt String-Literale); globale
  UI-Primitives aus `@/components/ui`; Logik-Tests statt Render-/Klick-Simulation; Dateien
  ≤450 Zeilen (Split im selben Auftrag beim Anfassen); deutsche Texte mit echten Umlauten;
  Live-UAT am Ende mit echten Konten, keine direkten INSERTs für Demo-Daten; Quelle-Todo-Datei
  nach Abschluss nach `completed` verschieben statt löschen.

### Claude's Discretion

- Konkreter Tabellenname/Spaltenentwurf der neuen Hinweis-Tabelle (CONTEXT.md verweist auf diese
  Recherche für den Entwurf — siehe `## Architecture Patterns` unten).
- Platzierung des extrahierten `useFansubGroupSearch`-Hooks (zentral vs. feature-colokiert).
- UX-Detail, ob ein neuer Navigationseintrag „Eingehende Hinweise“ auf der Admin-Startseite
  nötig ist, oder ob Integration in bestehende Fansub-Edit-/Claims-Seiten reicht.
- Konkrete Fehlermeldungstexte (deutsch, mit Umlauten) für 409/429-Fälle.

### Deferred Ideas (OUT OF SCOPE)

- Stummschalten einer Person für eine Gruppe (erst bei echtem Missbrauch, nicht in dieser
  Phase).
- Captchas oder Wartezeiten als Spam-Schutz.
- Punkte/Badges für den Hinweis selbst.
- Ein eigenes, neues Capability-Recht für diesen Flow.
- Neue automatische Mitgliedschafts-/Zuweisungs-Flows.
- Erweiterung von `member_claims` um generische Mitgliedschaftsanfragen (strukturell
  eigenständiges, einfacheres Modell statt Erweiterung).
</user_constraints>


## Summary

Phase 191 braucht **keine neue Bibliothek und kein neues Framework** — alles Benötigte
(Gin-Handler, pgx-Repository, Redis-Rate-Limit, React-Hook-Extraktion, `@/components/ui`) ist
bereits im Projekt vorhanden. Der einzige echte Neubau ist eine **neue DB-Tabelle**
(`fansub_group_hints` o. ä.) für den Fremdgruppen-Hinweis, weil `anime_contributions`
strukturell nicht passt (Composite-FK auf `hist_fansub_group_members`, zwingender
Projektbezug, kein Rollenfeld für Mitgliedschaftsanfragen). Für Review/Freigabe, Rate-Limit
und Gruppensuche existieren direkt wiederverwendbare Muster, die 191-CONTEXT.md bereits
datei-/zeilengenau benennt — diese Recherche ergänzt nur die Punkte, die CONTEXT.md offen
ließ: Tabellenentwurf, Doku-Ziel-Abschnitte, Contract-Konvention und Validierungsplan.

**Primary recommendation:** Eine neue, schlanke Tabelle `fansub_group_hints` (Status-Enum,
`hint_type` CHECK, optionales `requested_role_code`, Unique-Constraint für die
Doppel-Hinweis-Sperre) + ein neuer, additiver Handler/Repository-Satz nach dem Muster von
`contribution_review_handler.go`, ein zentraler `useFansubGroupSearch`-Hook unter
`frontend/src/hooks/` (nicht feature-colokiert, weil er zwei Features bedient), eine zweite
`NewCommentRateLimiter`-Instanz mit `AppUserID`-Key, und eine neue `shared/contracts/
fansub-group-hints.yaml` nach dem Muster von `contributions.yaml`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Gruppensuche (Name+Alias, alle Gruppen) | Browser/Client (Hook) | API/Backend (`getFansubList`) | Bestehende Debounce-Suche bleibt Client-State, Backend liefert nur Daten |
| Hinweis erstellen (Korrektur/Mitgliedschaft) | API/Backend | Browser/Client (Formular) | Serverseitige Validierung (Spam-Schutz, Zielrollen-Routing) ist sicherheitskritisch, Formular nur UX |
| Freigabe-Routing (Leader vs. Plattform-Admin) | API/Backend | — | Rollenlogik darf nicht im Client entschieden werden (BOLA-Risiko) |
| Rate-Limit (Tageslimit) | API/Backend (Middleware) | Database/Storage (Redis) | Bestehende Middleware-Schicht, Redis nur Fixed-Window-Zähler |
| Doppel-Hinweis-Sperre | Database/Storage (Constraint) | API/Backend (409-Mapping) | DB-Constraint ist die einzig race-sichere Durchsetzung bei Concurrent-Requests |
| Review/Entscheid-UI (Leader) | Browser/Client | API/Backend | Analog `ContributionsReviewSection.tsx`, reine Darstellung + Aktion |
| Review/Entscheid-UI (Plattform-Admin bei `fansub_lead`) | Browser/Client | API/Backend | Analog `/admin/claims`, platform-weite Liste |

## Standard Stack

Kein neuer Stack-Bedarf. Alle benötigten Bausteine sind bereits produktiv im Repo:

| Baustein | Fundstelle | Verwendung in Phase 191 |
|----------|-----------|--------------------------|
| Gin-Handler-Muster | `backend/internal/handlers/contribution_review_handler.go` | Vorlage für neuen Hinweis-Review-Handler |
| pgx-Repository-Muster | `backend/internal/repository/anime_contributions_proposal_repository.go` | Vorlage für neues `fansub_group_hints`-Repository |
| Redis-Fixed-Window-Limiter | `backend/internal/middleware/comment_rate_limit.go` (`NewCommentRateLimiter`) | Zweite Instanz, Key=AppUserID, Limit=10, Window=24h |
| `PlatformAdminGate` (Frontend) | `frontend/src/components/auth/PlatformAdminGate.tsx`, genutzt in `frontend/src/app/admin/claims/page.tsx` | Schutz der platform-weiten Hinweis-Liste (Leader-Rolle-Fall) |
| `@/components/ui` Primitives | `frontend/src/components/ui/` | Formular (Input, Select, Button, Textarea, Modal) |

**Installation:** keine (keine neuen Packages/Dependencies).

## Package Legitimacy Audit

**Nicht anwendbar.** Diese Phase installiert keine neuen externen Packages — alle Bausteine
sind bestehender Projekt-Code (Go-Stdlib + bereits vorhandene Module `gin`, `pgx`, `go-redis`;
Frontend: bereits vorhandenes React/Next.js). Package Legitimacy Gate entfällt.

## Architecture Patterns

### System Architecture Diagram

```
[Mitglied im Admin-Formular]
        │ (1) Gruppensuche eingeben, 180ms debounce
        ▼
useFansubGroupSearch (neuer zentraler Hook, frontend/src/hooks/)
        │ getFansubList({q, page:1, per_page:10})  — bestehende API
        ▼
GET /api/v1/fansubs?q=...  (unverändert, bestehender Endpoint)
        │ Ergebnis zurück, Kennzeichnung "Eigene Gruppe"/"Andere Gruppe" im Client
        ▼
[Formular: Hinweisart wählen — Korrektur | Mitgliedschaft(+optionale Rolle)]
        │ (2) Absenden
        ▼
POST /api/v1/me/fansub-group-hints  (NEU, additiv)
        │  a) AuthN: existierender Member via member_claims (ResolveVerifiedMemberID)
        │  b) Rate-Limit-Middleware: 10/Tag/AppUserID (Redis Fixed-Window, fail-open)
        │  c) Repository-Insert mit Unique-Constraint (Person+Zielgruppe+Thema)
        │     → 409 bei Verstoß ("bereits offener Hinweis")
        ▼
fansub_group_hints (NEUE Tabelle)
        │
        ├─ Zielrolle = fansub_lead? ──► Ja ──► Plattform-Admin-Liste
        │                                      (GET /api/v1/admin/fansub-group-hints,
        │                                       PlatformAdminGate, Muster /admin/claims)
        │
        └─ Zielrolle ≠ fansub_lead (inkl. Korrektur-Hinweis) ──► Leader der Zielgruppe
                                      (GET /api/v1/admin/fansubs/:id/group-hints,
                                       CanForFansubGroup(ActionFansubGroupMembersManage),
                                       Muster ContributionsReviewSection.tsx)
        │
        ▼
Leader/Admin: Bestätigen (reine Info, keine Mitgliedschaft) | Ablehnen (+ optionale Begründung)
        │
        ▼
fansub_group_hints.status = 'acknowledged' | 'rejected'  — verschwindet aus offener Liste
```

### Empfohlenes Datenmodell (neue Tabelle)

`anime_contributions` passt strukturell nicht (zwingender `anime_id`, Composite-FK auf
`hist_fansub_group_members`, kein Rollenfeld, kein Mitgliedschafts-Use-Case). Empfehlung:
eigenständige, schlanke Tabelle, angelehnt an die Migrations-Konventionen aus
`database/migrations/0086_anime_contributions.up.sql` (expliziter `CHECK`-Status statt
separater Lookup-Tabelle, passend zu Migration 0180, die die frühere
`anime_contributions_review_status`-Lookup-Tabelle bereits wieder entfernt hat — aktuelle
Konvention ist inline `CHECK`, nicht FK auf eine Status-Tabelle):

```sql
-- Migration NNNN: fansub_group_hints — Hinweise an fremde Fansub-Gruppen (Phase 191).
CREATE TABLE IF NOT EXISTS fansub_group_hints (
    id                    BIGSERIAL PRIMARY KEY,
    sender_app_user_id    BIGINT NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    target_fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE RESTRICT,
    hint_type             VARCHAR(20) NOT NULL,       -- 'correction' | 'membership_request'
    -- Thema-Bezug fuer die Doppel-Hinweis-Sperre (D-04(1)): bei 'correction' Pflichtfeld,
    -- bei 'membership_request' NULL (Thema = die Mitgliedschaft selbst, kein Release-Bezug).
    related_anime_id      BIGINT NULL REFERENCES anime(id) ON DELETE RESTRICT,
    related_release_version_id BIGINT NULL REFERENCES release_versions(id) ON DELETE RESTRICT,
    requested_role_code   VARCHAR(50) NULL REFERENCES role_definitions(code) ON DELETE RESTRICT,
    note                  TEXT NULL,
    status                VARCHAR(20) NOT NULL DEFAULT 'open',
    decided_by            BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
    decided_at            TIMESTAMPTZ NULL,
    decision_note         TEXT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_fansub_group_hints_type
        CHECK (hint_type IN ('correction', 'membership_request')),
    CONSTRAINT chk_fansub_group_hints_status
        CHECK (status IN ('open', 'acknowledged', 'rejected')),
    -- D-07: requested_role_code nur bei membership_request sinnvoll befuellt.
    CONSTRAINT chk_fansub_group_hints_role_scope
        CHECK (requested_role_code IS NULL OR hint_type = 'membership_request')
);

-- D-04(1): pro Person+Zielgruppe+Thema maximal EIN offener Hinweis.
-- Partial Unique Index statt Tabellen-Constraint, da nur status='open' zaehlt
-- (abgeschlossene Hinweise duerfen sich wiederholen lassen, z.B. erneuter Korrektur-Hinweis
-- nach Ablehnung).
CREATE UNIQUE INDEX uq_fansub_group_hints_open_topic
    ON fansub_group_hints (
        sender_app_user_id,
        target_fansub_group_id,
        hint_type,
        COALESCE(related_release_version_id, -1),
        COALESCE(requested_role_code, '')
    )
    WHERE status = 'open';

CREATE INDEX idx_fansub_group_hints_target_group_status
    ON fansub_group_hints(target_fansub_group_id, status);
CREATE INDEX idx_fansub_group_hints_role_status
    ON fansub_group_hints(requested_role_code, status)
    WHERE requested_role_code = 'fansub_lead';
```

**Begründung für Partial-Unique-Index statt klassischem `UNIQUE`-Constraint:** `UNIQUE`
behandelt `NULL` in Postgres als verschieden (zwei `NULL`-Zeilen kollidieren nicht) — bei
Mitgliedschaftsanfragen ohne Rollenwunsch (`requested_role_code IS NULL`, D-07 Default) würde
ein klassischer Constraint die Sperre nicht greifen lassen. Der `COALESCE`-Trick im Index
umgeht das `[ASSUMED — Postgres-NULL-Unique-Semantik ist Standardverhalten, aber die konkrete
COALESCE-Formulierung ist hier neu entworfen, nicht aus bestehendem Code übernommen]`.

**Routing-Konsequenz (D-01/D-07) im Handler, nicht in der UI:** Der Handler, der eine neue
Zeile anlegt, muss selbst entscheiden, in welche Liste sie fällt — nicht ein Client-Flag. Ein
einfaches serverseitiges `if requested_role_code == permissions.RoleFansubLead { routeToAdmin }
else { routeToGroupLeader }` auf Leseseite (zwei getrennte GET-Endpunkte mit jeweils eigenem
WHERE) ist ausreichend; kein eigenes `routing_target`-Spaltenfeld nötig, da es sich aus
`requested_role_code` + `hint_type` ableiten lässt (siehe Ist-Zustand 7 in 191-CONTEXT.md:
`fansub_lead` kann bei `correction`-Hinweisen datenmodell-bedingt nie vorkommen).

### Hook-Extraktion (D-02) — Zielort

Laut `docs/FRONTEND_ARCHITEKTUR.md` Abschnitt 12 gilt die Konvention: nur **wirklich
feature-übergreifende** Hooks liegen zentral unter `frontend/src/hooks/` (aktuell 4 Dateien:
`useCancellableSlugState.ts`, `useClampedOverflow.ts`, `useNearViewportActivation.ts`,
`useUploadQueue.ts`); alles andere ist feature-colokiert. Da `useFansubGroupSearch` laut D-02
explizit in **zwei** unabhängigen Features (Release-Editor UND Hinweis-Formular) verwendet
wird, gehört er in `frontend/src/hooks/` — nicht in
`admin/episode-versions/[versionId]/edit/` (wo er heute inline liegt) und nicht neu
feature-colokiert im Hinweis-Formular. Diese Platzierung muss im selben Auftrag in
Abschnitt 12 von `docs/FRONTEND_ARCHITEKTUR.md` nachgezogen werden (D-08-Pflicht).

### Contract-Konvention (shared/contracts/)

`shared/contracts/` folgt einer Ein-Datei-pro-Domäne-Konvention, referenziert im Dach-Vertrag
`openapi.yaml` (siehe `contributions.yaml` für den bestehenden Beitrags-Flow, als direktes
Vorbild für die Struktur: `tags`, `paths`, `components.schemas`, deutsche
`description`-Blöcke mit Fehlerbeispielen). Für den Plattform-Admin-Fall existiert kein
eigenes `claims.yaml` — die `/admin/claims`-Route ist stattdessen in
`admin-capabilities.yaml` mitgeführt. Empfehlung für Phase 191: **eine neue Datei**
`shared/contracts/fansub-group-hints.yaml` nach dem `contributions.yaml`-Muster (eigene
Domäne, eigener Lebenszyklus, nicht in eine der beiden bestehenden Dateien
hineinmischen), plus Eintrag im Dach-`openapi.yaml`.

### Anti-Patterns to Avoid

- **Den bestehenden `MemberBelongsToFansub`-Ownership-Check für normale Beiträge lockern oder
  entfernen:** schützt weiterhin den regulären Eigengruppen-Proposal-Flow (`anime_contributions`)
  — Phase 191 braucht einen komplett neuen, parallelen Pfad (neue Tabelle, neuer Handler), keine
  Änderung an `contribution_proposals_me_handler.go`s Guard.
- **Ein `routing_target`-Enum-Feld zusätzlich zu `requested_role_code` einführen:** redundant,
  da sich das Routing-Ziel bereits aus `hint_type` + `requested_role_code` ableitet (siehe oben).
- **Client-seitiges Routing** (Frontend entscheidet "das geht an den Admin") statt
  serverseitiger Ableitung — Sicherheitsrisiko, da der Client die Entscheidung manipulieren
  könnte.
- **Zweites Rate-Limit-System bauen** statt `NewCommentRateLimiter` wiederzuverwenden — die
  Lua-Fixed-Window-Logik ist bereits generisch parametrisiert (Client, Limit, Window, KeyFn).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tageslimit pro Person | eigenes Redis-Skript/eigene Zähler-Logik | `middleware.NewCommentRateLimiter(redisClient, 10, 24*time.Hour)` mit `AppUserID`-Key | Bestehende, getestete Lua-Fixed-Window-Implementierung, nur Parameter ändern |
| Gruppen-weite Freigabe-Prüfung | eigenen Capability-Check | `permissionSvc.CanForFansubGroup(actor, permissions.ActionFansubGroupMembersManage, groupID)` | Bereits die kanonische Prüfung für gruppen-gescopte Leader-Aktionen |
| Plattform-weite Admin-Liste | eigenen Freiform-Admin-Flow | `PlatformAdminGate` + Muster `ClaimsClient.tsx` | Bereits etabliertes, getestetes Muster für genau diesen Fall |
| Gruppensuche mit Debounce | neue Suchlogik im Hinweis-Formular | extrahierter `useFansubGroupSearch`-Hook (D-02) | Vermeidet Code-Duplikat, hält `useEpisodeVersionEditor.ts` unter 450 Zeilen |

**Key insight:** Jeder einzelne Baustein dieser Phase existiert bereits in einer anderen,
strukturell passenden Form im Projekt — die Aufgabe ist Komposition/Extraktion, nicht Neubau.

## Common Pitfalls

### Pitfall 1: NULL-Semantik bei der Doppel-Hinweis-Sperre
**Was schiefgeht:** Ein klassischer `UNIQUE(sender, target, hint_type, release_version_id,
requested_role_code)`-Constraint lässt bei `NULL`-Werten (Standardfall: Mitgliedschaftsanfrage
ohne Rollenwunsch, Korrektur-Hinweis ohne Release-Bezug) beliebig viele "offene" Duplikate zu,
weil Postgres `NULL <> NULL` wertet.
**Warum:** SQL-Standardverhalten, nicht projektspezifisch.
**Vermeidung:** `COALESCE`-Partial-Unique-Index wie oben skizziert, mit `WHERE status='open'`
(damit abgeschlossene Hinweise die Sperre nicht blockieren).
**Warnsignal:** Ein manueller Test mit zwei identischen Mitgliedschaftsanfragen ohne Rolle,
beide erfolgreich — sofort ein Zeichen für die NULL-Lücke.

### Pitfall 2: Rollenkontext verwechseln (`anime_contribution` vs. `fansub_group`)
**Was schiefgeht:** `requested_role_code` beim Korrektur-Hinweis mit einem Dropdown aus
`anime_contribution`-Kontext-Rollen befüllen, obwohl D-07 das Rollenfeld ausdrücklich nur für
die Mitgliedschaftsanfrage (Kontext `fansub_group`) vorsieht.
**Warum:** Beide Rollenkataloge überlappen sich teilweise (`project_lead` ist in beiden
Kontexten gültig), was die Verwechslung erleichtert.
**Vermeidung:** Dropdown-Optionen serverseitig auf `role_definitions WHERE contexts @>
'{fansub_group}'` einschränken (D-07), niemals eine hartcodierte Liste im Frontend.
**Warnsignal:** `fansub_lead` taucht als wählbare Rolle bei einem Korrektur-Hinweis auf.

### Pitfall 3: Fail-open Rate-Limit ohne DB-Backstop
**Was schiefgeht:** Bei Redis-Ausfall degradiert `comment_rate_limit.go` bewusst fail-open
(Zeilen 120-133) — ohne den DB-Unique-Index als zweite Verteidigungslinie könnte das
Tageslimit während eines Redis-Ausfalls komplett wirkungslos werden UND die
Doppel-Hinweis-Sperre würde ebenfalls nicht greifen, wenn sie fälschlich nur im Anwendungscode
statt als DB-Constraint umgesetzt wird.
**Vermeidung:** Doppel-Hinweis-Sperre als DB-Constraint (siehe oben), Tageslimit als
Redis-Middleware — beide Schutzmechanismen sind bewusst unterschiedlich robust (D-04 akzeptiert
das für das Tageslimit explizit laut 191-CONTEXT.md Ist-Zustand 4).

### Pitfall 4: 450-Zeilen-Limit bei `useEpisodeVersionEditor.ts`
**Was schiefgeht:** Die Hook-Extraktion wird vergessen oder nur halb durchgeführt (Logik
kopiert statt verschoben), wodurch `useEpisodeVersionEditor.ts` über 450 Zeilen wächst, statt
durch die Extraktion zu schrumpfen.
**Vermeidung:** Reiner Umbau-Commit zuerst (Extraktion ohne Verhaltensänderung, beide
Call-Sites nutzen danach den Hook), danach erst die inhaltliche Änderung (Kennzeichnung „Eigene
Gruppe“/„Andere Gruppe“, Nutzung im Hinweis-Formular).

## Code Examples

### Zweite Rate-Limiter-Instanz (Tageslimit)
```go
// Source: backend/internal/middleware/comment_rate_limit.go (NewCommentRateLimiter, Zeile 56)
// main.go: bestehende Instanz als Vorbild
commentCreateLimiter := middleware.NewCommentRateLimiter(redisClient, 5, time.Minute)
// NEU für Phase 191 (D-04(2)):
fansubHintDailyLimiter := middleware.NewCommentRateLimiter(redisClient, 10, 24*time.Hour)
// Key-Funktion muss auf AppUserID statt ClientIP umgestellt werden — bestehende
// CommentCreateRateLimitMiddleware bindet an c.ClientIP(); für Phase 191 wird eine
// äquivalente, aber auf die Identity gebundene Variante benötigt (kein Identity-Zugriff
// vor AuthMiddleware in der aktuellen Factory-Signatur — Reihenfolge in der Middleware-Chain
// prüfen: Auth MUSS vor diesem Limiter laufen).
```

### Gruppen-gescopte Review-Autorisierung (direktes Vorbild)
```go
// Source: backend/internal/handlers/contribution_review_handler.go:79-91
result, err := h.permissionSvc.CanForFansubGroup(
    c.Request.Context(), actor, permissions.ActionFansubGroupMembersManage, fansubID,
)
if err != nil || !result.Allowed {
    c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "keine Berechtigung"}})
    return
}
```

## State of the Art

| Alt | Aktuell | Seit | Auswirkung |
|-----|---------|------|------------|
| `anime_contributions_review_status`-Lookup-Tabelle für Status | Inline `CHECK`-Constraint auf `VARCHAR` | Migration 0180 (2026-10) | Neue Tabelle `fansub_group_hints` sollte ebenfalls inline `CHECK` nutzen, keine neue Lookup-Tabelle |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Der konkrete `COALESCE`-Partial-Unique-Index-Ausdruck für die Doppel-Hinweis-Sperre ist ein neuer Entwurf dieser Recherche, keine Übernahme aus bestehendem Projekt-Code — Postgres-NULL-Unique-Semantik selbst ist Standardverhalten (verifizierbar), die genaue Spaltenkombination ist Designentscheidung | Architecture Patterns → Datenmodell | Planner/Reviewer sollte die Spaltenkombination gegen die finalen Formular-Felder nachprüfen, bevor die Migration geschrieben wird |
| A2 | `fansub_group_hints` als Tabellenname ist ein Vorschlag dieser Recherche, nicht bereits im Code vorgegeben | Architecture Patterns → Datenmodell | Gering — reine Namenskonvention, leicht im Plan anzupassen |
| A3 | Die Platzierung von `useFansubGroupSearch` unter `frontend/src/hooks/` folgt einer Interpretation der dokumentierten Konvention (Abschnitt 12 FRONTEND_ARCHITEKTUR.md), ist aber keine explizit vom Nutzer getroffene Entscheidung | Architecture Patterns → Hook-Extraktion | Gering — Planner kann alternativ feature-colokiert in einem neuen gemeinsamen Ordner platzieren, falls Review das bevorzugt |

**Risikobewertung:** Alle drei Annahmen sind Low-Risk-Designvorschläge, keine
Compliance-/Sicherheits-/Datenrisiken. Der Planner kann sie direkt übernehmen oder im Plan
explizit zur Diskussion stellen.

## Open Questions

1. **Muss die Rate-Limit-Middleware-Factory umgebaut werden, um nach AuthMiddleware auf die
   `Identity`/`AppUserID` zuzugreifen?**
   - Was wir wissen: `CommentCreateRateLimitMiddleware` bindet aktuell an `c.ClientIP()`
     (Zeile 118 in `comment_rate_limit.go`), nicht an eine Identity.
   - Was unklar ist: Ob eine neue Middleware-Variante nötig ist oder ob die bestehende Funktion
     bereits einen Parameter für eine alternative Key-Extraktionsfunktion hat.
   - Empfehlung: Im Plan einen kurzen Lese-Task vorsehen, der `comment_rate_limit.go`
     vollständig liest und entscheidet, ob eine Key-Funktion als Parameter ergänzt wird (additiv,
     kein Verhaltensbruch für den bestehenden Kommentar-Limiter) oder eine zweite,
     identity-gebundene Variante daneben entsteht.

2. **Soll die Admin-Startseite (`admin/page.tsx`) einen neuen Navigationseintrag „Eingehende
   Hinweise“ bekommen, oder reicht die Integration in bestehende Fansub-Edit-/Claims-Seiten?**
   - Was wir wissen: 191-CONTEXT.md Ist-Zustand 2 empfiehlt bereits einen neuen Eintrag für den
     Plattform-Admin-Fall (analog „Benutzer & Rechte“/„Fansubs“).
   - Was unklar ist: Ob der Leader-Fall zusätzlich einen sichtbaren Hinweis-Zähler im
     Gruppen-Edit braucht (z. B. Badge an der Gruppen-Karte) oder ob das reine
     Tab-Erweiterung in `ContributionsReviewSection.tsx`-Analogie genügt.
   - Empfehlung: Planer entscheidet UX-Detail; technisch reicht die bestehende
     `ContributionsReviewSection.tsx`-Analogie als Minimalversion.

## Environment Availability

Übersprungen — reine Code-/Konfigurationsänderung ohne neue externe Abhängigkeiten
(Postgres, Redis, Go, Node.js sind bereits laufende Compose-Services dieses Projekts, keine
neuen Tools nötig).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Backend-Framework | Go `testing` + `testify` (assert/require), httptest gegen Fake-Repository-Stubs |
| Backend-Konfigdatei | `backend/go.mod` (kein separates Test-Config-File) |
| Frontend-Framework | Vitest 3, `frontend/vitest.config.ts` |
| Quick-Run Backend | `go test ./backend/internal/handlers/... ./backend/internal/repository/... -run FansubGroupHint` |
| Quick-Run Frontend | `npm --prefix frontend run test -- useFansubGroupSearch` |
| Full-Suite | `scripts/test-backend.sh` (Backend-Gate), `npm --prefix frontend run test` (Frontend) |

### Phase Requirements → Test Map

Da diese Phase additiv ohne REQUIREMENTS.md-ID läuft, werden die D-01 bis D-08-Entscheidungen
aus 191-CONTEXT.md als Prüfpunkte verwendet:

| Entscheidung | Verhalten | Testart | Automatisierter Befehl | Datei existiert? |
|---|---|---|---|---|
| D-01/D-07 | Hinweis mit `requested_role_code='fansub_lead'` landet in Plattform-Admin-Liste, alles andere beim Gruppen-Leader | unit (Repository-Query-Split) | `go test ./backend/internal/repository/... -run FansubGroupHints` | ❌ Wave 0 |
| D-02 | `useFansubGroupSearch` liefert gleiche Ergebnisse/Verhalten in beiden Call-Sites, inkl. „Eigene Gruppe“/„Andere Gruppe“-Flag | unit (Hook-Logik, kein Render-Snapshot) | `npm --prefix frontend run test -- useFansubGroupSearch` | ❌ Wave 0 |
| D-03 | Bestätigung erzeugt KEINE Mitgliedschafts-Zeile (keine Seiteneffekte in `fansub_group_members`) | integration (httptest + Fake-Repo, prüft dass kein Insert in Mitgliedschaftstabelle erfolgt) | `go test ./backend/internal/handlers/... -run FansubGroupHintConfirm` | ❌ Wave 0 |
| D-04(1) | Zweiter offener Hinweis gleiche Person+Zielgruppe+Thema → 409 | integration (echter Unique-Index gegen Testdatenbank oder Repository-Fehlerweg-Stub) | `go test ./backend/internal/repository/... -run DuplicateHint` | ❌ Wave 0 |
| D-04(2) | 11. Hinweis am selben Tag → 429/Fehlermeldung | unit (Middleware mit Fake-Redis-Client, Muster `TestCommentRateLimiterAllow`) | `go test ./backend/internal/middleware/... -run FansubHintDailyLimit` | ❌ Wave 0 |
| D-04(3) | Ablehnen mit Begründung setzt Status + `decision_note`, Hinweis verschwindet aus offener Liste | integration (httptest, Statuscode + Body prüfen, Muster `TestRejectProposal_Success`) | `go test ./backend/internal/handlers/... -run RejectFansubGroupHint` | ❌ Wave 0 |
| D-07 | Rollendropdown nur `fansub_group`-Kontext-Rollen, Default „keine bestimmte Rolle“ | unit (Repository-Query auf `role_definitions`, keine hartcodierte Liste) | `go test ./backend/internal/repository/... -run RoleCatalogFansubGroupContext` | ✅ (bestehender `role_definitions`-Query-Pfad, nur neue Assertion) |

### Sampling Rate
- **Pro Task-Commit:** jeweiliger Quick-Run (gezielter `-run`-Filter)
- **Pro Wave-Merge:** volle Backend-/Frontend-Suite
- **Phase-Gate:** `scripts/test-backend.sh` GATE GREEN + Frontend-Vollsuite grün vor
  `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/internal/repository/fansub_group_hints_repository_test.go` — Repository-CRUD,
  Unique-Constraint-Verstoß, Role-Context-Filter
- [ ] `backend/internal/handlers/fansub_group_hints_handler_test.go` — Create/List/Confirm/Reject,
  Routing-Split Leader vs. Plattform-Admin, Rate-Limit-Integration
- [ ] `backend/internal/middleware/comment_rate_limit_test.go` — Erweiterung um
  AppUserID-gebundene Key-Variante (falls Open Question 1 zu "neue Variante" führt)
- [ ] `frontend/src/hooks/useFansubGroupSearch.test.ts` (neu, nach Extraktion) — Logik-Test für
  Debounce/Filter/Exclude, kein Render-Snapshot (Teststil-Regel)
- [ ] Frontend-Formular-Test für das Hinweis-Formular (Logik: welche Felder bei welcher
  Hinweisart Pflicht sind, kein Klick-Simulation-Test)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | ja (bestehend) | Keycloak/HMAC-Session über zentralen `middleware.CurrentUserMiddleware`, kein neuer Auth-Pfad |
| V3 Session Management | nein (unverändert) | — |
| V4 Access Control | ja | `CanForFansubGroup` + `PlatformAdminGate`, serverseitiges Routing (siehe Anti-Patterns) |
| V5 Input Validation | ja | `hint_type`/`status`/`requested_role_code` CHECK-Constraints + Handler-Validierung analog `contribution_proposals_me_handler.go` |
| V6 Cryptography | nein | — |

### Known Threat Patterns für diesen Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| BOLA/IDOR: Hinweis für fremden `sender_app_user_id` einreichen | Tampering/Elevation | `sender_app_user_id` NIE aus Request-Body übernehmen, immer aus `identity`/`ResolveVerifiedMemberID` ableiten (wie bestehender Proposal-Handler) |
| Client entscheidet selbst "geht an Admin" | Elevation of Privilege | Serverseitige Ableitung aus `requested_role_code`, kein Client-Flag (siehe Anti-Patterns) |
| Spam/Flood über viele Zielgruppen gleichzeitig | Denial of Service | Tageslimit ist pro Person global (nicht pro Zielgruppe) — bereits in D-04(2) so vorgegeben, verhindert Verteilung über viele Gruppen als Umgehung |
| Race Condition bei Doppel-Hinweis-Check (TOCTOU) | Tampering | DB-Unique-Index statt reinem Anwendungscode-Check (siehe Pitfall 3) |

## Sources

### Primary (HIGH confidence — direkte Code-/Dokumenten-Verifikation in diesem Repo)
- `database/migrations/0086_anime_contributions.up.sql`, `0088_anime_contributions_constraints.up.sql` — Migrations-Konventionen (CHECK statt Lookup-Tabelle, Composite-FK-Muster)
- `database/migrations/0180_drop_anime_contributions_review_status_id.up.sql` (Dateiname, Existenzprüfung) — Beleg für State-of-the-Art-Wechsel weg von Status-Lookup-Tabellen
- `backend/internal/permissions/permissions_types.go` — `RoleFansubLead`, `RoleProjectLead`, `ActionFansubGroupMembersManage`
- `backend/internal/handlers/contribution_review_handler.go` + `contribution_review_handler_test.go` — Review-Flow-Muster, Teststil (httptest + Fake-Repo-Stubs)
- `backend/internal/middleware/comment_rate_limit.go`, `backend/cmd/server/main.go:119,422` — Rate-Limit-Instanziierung
- `frontend/src/app/admin/claims/page.tsx` — `PlatformAdminGate`-Muster
- `docs/BACKEND_ARCHITEKTUR.md` (Abschnitte Rechte/Capabilities, Auth/Keycloak) — Doku-Ziel für D-08
- `docs/FRONTEND_ARCHITEKTUR.md` Abschnitt 12 — Hook-Platzierungs-Konvention
- `shared/contracts/contributions.yaml`, `shared/contracts/admin-capabilities.yaml` — Contract-Konvention
- `.planning/config.json` — `nyquist_validation: true` bestätigt

### Secondary (MEDIUM confidence)
- keine (keine externen Quellen nötig für diese Phase)

### Tertiary (LOW confidence)
- keine

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — kein externer Stack, reine Codebase-Verifikation
- Architektur/Datenmodell: HIGH für Wiederverwendungsmuster, MEDIUM für den konkreten
  Tabellenentwurf (neu entworfen, nicht aus Code übernommen — siehe Assumptions Log)
- Pitfalls: HIGH — direkt aus bestehendem Code/Migrations-Verhalten abgeleitet

**Research date:** 2026-10-23
**Valid until:** 30 Tage (stabiler Brownfield-Stack, keine schnelllebigen externen
Abhängigkeiten)
