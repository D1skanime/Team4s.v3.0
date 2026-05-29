# Phase 59: Öffentliches Fansub-Member-Profil - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 59 liefert die öffentlich zugängliche Profilseite für Fansub-Member unter `/members/[slug]`. Die Route ist von allen Plattform-Stellen aus verlinkbar (Medien-Uploads, Beiträge, Fansub-Mitgliederlisten, Direktaufruf). Phase 58 hat `isPublicView`-Komponenten vorbereitet — Phase 59 aktiviert sie auf einer neuen Route.

Diese Phase liefert:
- Route `/members/[slug]` als neue Next.js App-Router-Seite
- Neuer Backend-Endpoint `GET /api/v1/members/[slug]` mit Sichtbarkeitsprüfung
- Öffentliches Profil zeigt: Fansub-Name, Avatar, Bio, Member-Story (HTML), Aktivzeitraum, Fansub-Gruppen-Section, RecentMediaSection, RecentContributionsSection
- Fansub-Gruppen-Section: Gruppenlogo + Name + Gruppenrollen des Members, verlinkt auf `/fansubs/[slug]`
- Sichtbarkeitslogik: `public` → alles sichtbar; `members_only` → nur für eingeloggte Members; anonym + members_only → leere Seite mit Hinweis „Profil nicht öffentlich"
- Globalisierung von `MemberProfileHero`, `RecentMediaSection`, `RecentContributionsSection` nach `frontend/src/components/profile/`

Diese Phase liefert nicht:
- Keine Links aus Medien/Beiträgen/Fansub-Mitgliederlisten zur neuen Route (Folge-Phase)
- Keine SEO/Meta-Tag-Optimierung für öffentliche Profilseiten
- Keine Bearbeitungs-Funktionen auf `/members/[slug]`
- Keine Änderungen am `/me/profile`-Endpoint oder Datenbankschema der Profile

</domain>

<decisions>
## Implementation Decisions

### Route & URL-Struktur

- **D-01:** Die öffentliche Profilroute ist `/members/[slug]`. Der Slug wird aus dem `fansub_name` normalisiert (lowercase, Sonderzeichen entfernt). Bei Konflikten oder nicht eindeutigem Slug-Lookup: Fallback auf `member_id`.
- **D-02:** Phase 59 liefert nur die Profilseite selbst. Links aus Medien-Uploads, Beiträgen und Fansub-Mitgliederlisten werden in einer Folge-Phase hinzugefügt.
- **D-03:** URL-Parameter heißt `[slug]` — Backend löst zuerst via normalisiertem `fansub_name` auf, dann via `id`-Fallback.

### Sichtbarkeit & Zugangskontrolle

- **D-04:** Sichtbarkeitsprüfung liegt im Backend. `GET /api/v1/members/[slug]` gibt je nach Auth-Status unterschiedliche Daten zurück.
- **D-05:** `profile_visibility = 'public'` → alle Daten sichtbar (anonym + eingeloggt).
- **D-06:** `profile_visibility = 'members_only'` + anonymer Besucher → Backend gibt HTTP 200 mit `{"visible": false, "reason": "members_only"}` zurück. Frontend zeigt leere Seite mit Text „Dieses Profil ist nicht öffentlich zugänglich."
- **D-07:** `profile_visibility = 'members_only'` + eingeloggter Member → Backend gibt vollständige Profildaten zurück (eingeloggte Members dürfen members_only-Profile sehen).
- **D-08:** Keycloak-Daten (display_name, E-Mail, keycloak_subject) erscheinen auf der öffentlichen Seite **nicht**. Nur `fansub_name` wird als Anzeigename verwendet.

### Dargestellte Inhalte (public-Profil)

- **D-09:** Öffentliches Profil zeigt: `fansub_name` (nicht `display_name`), Avatar, `bio`, `member_story_html` (TipTap-gerenderter Rich Text), `active_from_date`/`active_until_date` als Jahresangabe, Fansub-Gruppen mit Gruppenrollen, RecentMediaSection, RecentContributionsSection.
- **D-10:** Fansub-Gruppen-Section auf dem öffentlichen Profil: Eine eigene Section (Card-Block) zeigt alle Gruppen des Members mit Gruppenlogo, Gruppenname und den **festen Gruppenrollen** des Members (z.B. „Translator, Timer bei Doki"). Klick auf eine Gruppe navigiert zu `/fansubs/[slug]` der Gruppe.
- **D-11:** Gruppenrollen in der Fansub-Gruppen-Section sind die Rollen aus `release_member_roles` oder der Gruppenrolle — **nicht** die release-versionsspezifischen Rollen. Die werden klar getrennt von `RecentContributionsSection` (Release-Versionrollen) gehalten.
- **D-12:** `RecentMediaSection` und `RecentContributionsSection` werden mit `isPublicView={true}` eingebunden — dieselben Komponenten wie auf `/me/profile`, aber ohne Edit-Aktionen.

### Komponenten-Globalisierung

- **D-13:** `MemberProfileHero`, `RecentMediaSection` und `RecentContributionsSection` werden in Phase 59 von `frontend/src/app/me/profile/components/` nach `frontend/src/components/profile/` verschoben.
- **D-14:** `/me/profile` importiert dieselben Komponenten nach der Verschiebung aus `@/components/profile/`. Kein Verhalten ändert sich — nur Import-Pfade.
- **D-15:** `/members/[slug]` verwendet dieselben globalisierten Komponenten mit `isPublicView={true}`.
- **D-16:** `AccountSecurityCard`, `ProfileBasicsForm`, `VisibilityCard`, `MemberAvatarCard`, `ProfileStoryCard` bleiben in `/me/profile/components/` — diese haben keinen `isPublicView`-Kontext und werden nie auf der öffentlichen Seite verwendet.

### Deutsche UI-Texte

- **D-17:** Alle neuen user-facing Strings verwenden korrekte Umlaute. „Dieses Profil ist nicht öffentlich zugänglich." — kein ASCII-Ersatz.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Projektregeln und Contracts
- `AGENTS.md` — Projektregeln, Umlaut-Pflicht.
- `docs/engineering/implementation-contract.md` — Search-first, Reuse, Contract-Disziplin.
- `docs/api/api-contracts.md` — OpenAPI/Backend/Frontend Contract-Workflow.
- `docs/frontend/auth-api-client.md` — Auth-Seam, token-free UI boundary, authorizedFetch vs. unauthenticated fetch.

### Profil-Seite (Basis für Phase 59)
- `frontend/src/app/me/profile/page.tsx` — bestehende Profilseite; Layout-Referenz für `/members/[slug]`.
- `frontend/src/app/me/profile/components/MemberProfileHero.tsx` — wird globalisiert nach `frontend/src/components/profile/`.
- `frontend/src/types/profile.ts` — aktuelle Profile-DTOs; neues `PublicMemberProfile`-DTO für `/api/v1/members/[slug]`.
- `frontend/src/lib/api.ts` — bestehende `getOwnProfile`; neuer `getMemberProfile(slug)`-Helper hier hinzufügen.
- `shared/contracts/openapi.yaml` — Neuer GET `/api/v1/members/{slug}` Endpoint muss hier dokumentiert werden.

### Backend
- `backend/internal/handlers/app_profile.go` — Referenz-Pattern für Member-Profil-Handler; neuer Handler für `GET /api/v1/members/{slug}`.
- `backend/internal/repository/member_profile_repository.go` — Profil-Aggregat; `GetPublicMemberProfile(slug)`-Methode hinzufügen.
- `backend/internal/models/member_profile.go` — Backend-Profil-DTO; neues `PublicMemberProfileResponse`-Modell.

### Fansub-Public-Seite (Referenz für verlinktes Ziel)
- `frontend/src/app/fansubs/[slug]/page.tsx` — bestehende öffentliche Fansub-Seite; verlinktes Ziel aus Gruppen-Section.

### Phase-58-Kontext (Basis-Entscheidungen)
- `.planning/phases/58-profil-hub-content-membership-cards-activity-preparation/58-CONTEXT.md` — isPublicView-Entscheidungen, Datenbasis für RecentMedia/Contributions.
- `.planning/phases/53-rollenuebergreifendes-mein-profil-als-member-identity-hub/53-CONTEXT.md` — Sichtbarkeits-Semantik (D-12/D-13), Datenhoheitsgrenzen.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/app/me/profile/components/MemberProfileHero.tsx` — wird globalisiert; enthält Avatar, Name, Bio, Aktivzeitraum-Anzeige.
- `frontend/src/app/me/profile/components/RecentMediaSection.tsx` (Phase 58) — `isPublicView`-Prop bereits eingebaut.
- `frontend/src/app/me/profile/components/RecentContributionsSection.tsx` (Phase 58) — `isPublicView`-Prop bereits eingebaut.
- `frontend/src/app/fansubs/[slug]/page.tsx` — Muster für slug-basierte öffentliche Seite (Server Component, async loadData-Pattern).
- `frontend/src/components/ui/` — Card, Badge, EmptyState, SectionHeader: direkt für neue Sections verwendbar.

### Established Patterns
- Öffentliche Seiten (z.B. `/fansubs/[slug]`) sind Next.js Server Components ohne Auth-Seam.
- Eingeloggte Requests laufen über `authorizedFetch` im zentralen API-Client; anonyme über standard `fetch`.
- Backend-Handler folgen dem Gin-Pattern in `backend/internal/handlers/` mit expliziten Repository-Aufrufen.

### Integration Points
- `frontend/src/app/members/[slug]/page.tsx` — neue Datei (analog zu `fansubs/[slug]/page.tsx`).
- `backend/cmd/server/main.go` — neuer Handler-Aufruf für `GET /api/v1/members/:slug`.
- `shared/contracts/openapi.yaml` — neuer Endpoint + `PublicMemberProfileResponse`-Schema.
- Import-Pfade in `/me/profile/page.tsx` nach Globalisierung der Komponenten aktualisieren.

</code_context>

<specifics>
## Specific Ideas

- **Slug-Auflösung:** Backend sucht zuerst via normalisiertem `fansub_name` (z.B. „CoolTranslator" → „cooltranslator"); bei Treffer eindeutig → Profil laden. Bei Nicht-Treffer oder Mehrdeutigkeit: Fallback auf `members.id`-Lookup wenn Slug vollständig numerisch.
- **Fansub-Gruppen-Section:** Gruppenlogo (Fallback: `Users`-Icon aus lucide-react, wie im Drawer aus Phase 58), Gruppenname als Link zu `/fansubs/[group_slug]`, Gruppenrollen des Members als Badge-Liste.
- **members_only-Fallback-UI:** Leere Seite mit MemberProfileHero (zeigt nur `fansub_name` und Avatar ohne sensible Daten) + Text „Dieses Profil ist nicht öffentlich zugänglich." — kein 404.

</specifics>

<deferred>
## Deferred Ideas

- Links aus Medien-Uploads, Beiträgen und Fansub-Mitgliederlisten zu `/members/[slug]` — Folge-Phase wenn Inhalte stabiler sind.
- SEO-Metadaten (`<title>`, `og:image`) für öffentliche Profilseiten.
- Paginierter Contributions-Endpunkt mit Filterung.
- Anzeige aller Beiträge statt nur 3 (Detail-Seite/Modal).

</deferred>

---

*Phase: 59-ffentliches-fansub-member-profil*
*Context gathered: 2026-05-29*
