# Phase 58: Profil-Hub Content, Membership Cards & Activity Preparation - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 58 verwandelt `/me/profile` von einer strukturell korrekten aber inhaltlich leeren Hub-Seite in eine echte Member-Identitätsseite. Die Phasen 53–57 haben Grundlage, Shell, Route, Auth-Seam und Datumsfelder geliefert — Phase 58 füllt den Hub mit relevantem Inhalt und bereinigt admin-intern formulierte Empty States und Erklärungstexte.

Diese Phase liefert:
- Entfernung des `MembershipsSection`-Blocks von `/me/profile`
- Neue „Meine letzten Medien"-Sektion (3 neueste `release_version_media`-Uploads des Members)
- Neue „Meine letzten Beiträge"-Sektion (3 neueste `release_member_roles`-Einträge des Members)
- Drawer-Erweiterung „Meine Gruppen": Logo + Name pro Gruppe mit Direktlink zum geschützten Gruppenbereich
- Sichtbarkeitslogik in neuen Sections als Vorbereitung für Phase 59
- Bereinigung aller internen Admin-Erklärungstexte durch ehrliche leere Zustände ohne technischen Kontext

Diese Phase liefert nicht:
- Keine neue `/me/groups`-Route
- Keine neue öffentliche Member-Profilroute (Phase 59)
- Kein Ausbau der historischen Credits zu einer paginierten Detail-Ansicht
- Keine Änderungen an Backend-Endpoints, die nicht direkt für obige Sections nötig sind
- Keine Änderungen an Phase-57-Datumsfeldern, Avatar, Story-TipTap oder Account-Sicherheit

</domain>

<decisions>
## Implementation Decisions

### Membership Section — Entfernung und Umzug in Drawer

- **D-01:** `MembershipsSection` wird aus `/me/profile` vollständig entfernt. Auf der Profilseite selbst gibt es keinen Mitgliedschafts-Block mehr.
- **D-02:** Die Gruppen-Navigationsinformation wandert in den globalen App-Drawer unter „Mein Bereich". Dort erscheint ein Abschnitt „Meine Gruppen" mit Logo + Gruppenname pro Gruppe. Ein Klick navigiert direkt in den geschützten Gruppenbereich (Edit-/Contributor-Bereich), nicht auf eine öffentliche Gruppenpage.
- **D-03:** Eine separate `/me/groups`-Route wird in Phase 58 **nicht** angelegt. Der Drawer reicht aus, weil Member selten in mehr als 3 Gruppen aktiv sind.

### Neue Section: Meine letzten Medien

- **D-04:** Die neue Section „Meine letzten Medien" ersetzt den bisherigen MembershipsSection-Slot auf der Profilseite.
- **D-05:** Datenbasis: 3 neueste Einträge aus `release_version_media` gefiltert auf `uploaded_by_user_id = aktueller Member`. Sortierung nach `created_at DESC`.
- **D-06:** Jede Media-Kachel zeigt: Thumbnail, Kategorie (screenshot / typesetting_karaoke / etc.) und Releasename/Kontext.
- **D-07:** Empty State: „Noch keine Medien hochgeladen." — kein technischer Kontext, keine Contract-Referenz.

### Neue Section: Meine letzten Beiträge

- **D-08:** Die neue Section „Meine letzten Beiträge" ersetzt den bisherigen ContributionsSection-Slot (der bisher historische Credits als abstrakte Aggregate zeigte).
- **D-09:** Datenbasis: 3 neueste `release_member_roles`-Einträge des Members, verknüpft mit Anime-Titel, Gruppenname und Rollenbezeichnung (Translator, Timer, Typesetter …).
- **D-10:** Jede Beitrags-Kachel zeigt: Anime-Titel (idealerweise mit Cover-Thumbnail), Gruppenname, Rolle des Members.
- **D-11:** Empty State: „Noch keine Beiträge." — kein technischer Kontext.

### Admin-Copy bereinigen

- **D-12:** Alle internen Erklärungstexte werden entfernt. Dazu gehören Strings wie:
  - „Detailzeilen sind erst mit einem eigenen Beitrags-Contract geplant."
  - „Der aktuelle Profil-Contract gibt diese Daten nicht frei."
  - „Historischer Credit, keine Berechtigung."
  - „Phase 53 zeigt nur echte Aggregate."
- **D-13:** Ersatz ist ausnahmslos ehrlicher leerer Zustand ohne technischen Kontext. Beispiele: „Noch keine Medien hochgeladen." / „Noch keine Beiträge."
- **D-14:** Capability-Gates (`can_view_memberships`, `can_view_historical_credits`) bleiben im Code, aber der Fehlertext für fehlende Capabilities wird ebenfalls in einen einfachen ehrlichen Empty State umformuliert.

### Sichtbarkeitslogik für Phase 59

- **D-15:** Neue Sections („Meine letzten Medien" und „Meine letzten Beiträge") implementieren die Sichtbarkeits-Prüfung (`is_public`-Check) von Beginn an, damit Phase 59 (öffentliches Member-Profil) dieselbe Logik ohne Refactor verwenden kann.
- **D-16:** Die Prüfung soll komponentenseitig als klare Prop oder Kontext-Flag modelliert sein, nicht als versteckter Seiteneffekt.

### Deutsche UI-Texte

- **D-17:** Alle neuen oder geänderten user-facing Strings verwenden korrekte Umlaute (ä, ö, ü, Ä, Ö, Ü, ß). ASCII-Ersetzungen sind verboten.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Projektregeln und Contracts
- `AGENTS.md` — Projektregeln, Umlaut-Pflicht, Validierungserwartungen.
- `docs/engineering/implementation-contract.md` — Search-first, Reuse, Contract-Disziplin.
- `docs/api/api-contracts.md` — OpenAPI/Backend/Frontend Contract-Workflow.
- `docs/frontend/auth-api-client.md` — Auth-Seam, token-free UI boundary.
- `docs/frontend/ui-system.md` — GDS-Komponenten, Card, Badge, EmptyState, Button.

### Profil-Route und Datenquellen
- `frontend/src/app/me/profile/page.tsx` — bestehende Profilseite, Layout und Section-Struktur.
- `frontend/src/app/me/profile/components/MembershipsSection.tsx` — wird entfernt.
- `frontend/src/app/me/profile/components/ContributionsSection.tsx` — wird ersetzt.
- `frontend/src/app/me/profile/components/MemberProfileHero.tsx` — bleibt, aber Gruppen-Chips ggf. prüfen.
- `frontend/src/types/profile.ts` — aktuelle Profile-DTOs; neue Sections brauchen ggf. neue Felder.
- `frontend/src/lib/api.ts` — `getOwnProfile`, `updateOwnProfile`; neue Sections brauchen ggf. neue API-Helfer.
- `shared/contracts/openapi.yaml` — muss für neue Sections erweitert werden wenn eigene Endpunkte entstehen.
- `backend/internal/handlers/app_profile.go` — GET/PUT /api/v1/me/profile; prüfen ob neue Aggregat-Felder hier ergänzt werden.
- `backend/internal/repository/member_profile_repository.go` — Profil-Aggregat; neue Felder für Media/Beiträge prüfen.
- `backend/internal/models/member_profile.go` — Backend-Profil-DTO.

### App-Drawer / Shell
- `frontend/src/components/navigation/` — bestehende Drawer/Shell-Komponenten für die „Meine Gruppen"-Erweiterung.

### Release-Version-Media (Datenbasis für Meine letzten Medien)
- `frontend/src/types/` — vorhandene ReleaseVersionMedia-Typen.
- `backend/internal/handlers/admin_content_release_version_media.go` — bestehende Media-Handler als Referenz.
- `backend/internal/repository/` — MediaRepository mit `release_version_media`-Queries.

### Release-Member-Roles (Datenbasis für Meine letzten Beiträge)
- `docs/architecture/db-schema-fansub-domain.md` — Fansub/Release/Rollen-Domain-Grenzen.
- `backend/internal/repository/` — vorhandene release_member_roles-Queries suchen und als Reuse-Basis nutzen.

### Vorherige Phasen-Kontext
- `.planning/phases/53-rollenuebergreifendes-mein-profil-als-member-identity-hub/53-CONTEXT.md` — ursprüngliche Hub-Architekturentscheidungen.
- `.planning/phases/57-profil-aktivzeitraum-als-jahrbegrenzte-datumsfelder/57-CONTEXT.md` — Datumsfelder, Auth-Seam-Regeln.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/components/ui` — Card, Badge, EmptyState, Button, LoadingState: direkt verwendbar für neue Sections.
- `frontend/src/app/me/profile/components/MemberProfileHero.tsx` — bestehende Hero-Struktur; prüfen ob Gruppen-Chips dort noch erscheinen oder nur im Drawer.
- `frontend/src/app/me/profile/page.module.css` — bestehende Styles, section-spezifische Classes können ergänzt werden.
- `backend/internal/repository/member_profile_repository.go` — könnte das Profil-Aggregat um die neuen Media/Beitrags-Felder erweitern.

### Established Patterns
- Profil-Sections sind bereits als eigene Komponenten-Dateien unter `frontend/src/app/me/profile/components/` strukturiert — neuen Sections folgen diesem Muster.
- API-Helfer laufen über `authorizedFetch` im zentralen API-Client; keine page-lokalen fetch-Calls.
- Backend-Aggregat-Lesen über `GET /api/v1/me/profile`; Erweiterung dieses Aggregats ist der bevorzugte Weg, wenn keine zu teuren JOINs entstehen.

### Integration Points
- `frontend/src/app/me/profile/page.tsx`: MembershipsSection entfernen, neue Sections einhängen.
- Globaler Drawer: Abschnitt „Meine Gruppen" mit Gruppen aus `profile.memberships`.
- `shared/contracts/openapi.yaml`: Neue Aggregat-Felder dokumentieren falls API erweitert wird.
- Neue Backend-Queries für `release_version_media` (by `uploaded_by_user_id`) und `release_member_roles` (by member) im Repository.

</code_context>

<specifics>
## Specific Ideas

- **Drawer „Meine Gruppen"**: Abschnitt-Titel „Meine Gruppen" + darunter pro Gruppe: Logo (Bild oder Fallback-Icon) + Gruppenname, klickbar → geschützter Gruppen-Edit-Bereich. Kein zusätzlicher Button auf der Profilseite selbst.
- **Meine letzten Medien**: 3 Kacheln; jede zeigt Thumbnail aus `release_version_media`, Kategorie-Label, Releasekontext. Empty State: „Noch keine Medien hochgeladen."
- **Meine letzten Beiträge**: 3 Kacheln; Anime-Titel + ggf. Cover, Gruppenname, Rolle des Members. Empty State: „Noch keine Beiträge."
- **Sichtbarkeitslogik**: Phase-59-taugliche `isPublicView: boolean`-Prop oder entsprechender Kontext, damit dieselben Komponenten für die öffentliche Member-Seite wiederverwendet werden können.

</specifics>

<deferred>
## Deferred Ideas

- Separate `/me/groups`-Route mit vollständiger Gruppenübersicht — erst wenn der Drawer nicht mehr reicht.
- Paginierter Contributions-Detail-Endpunkt mit Filterung — Phase 59 oder eigene Phase.
- Vollständige Public-Member-Page `/members/[slug]` — Phase 59.
- Entfernen der alten `active_from_year`/`active_until_year`-Spalten nach Runtime-Beweis — Folge-Phase.
- Avatar-Remove-Contract — explizit deferred (kein produktiver Remove-Button ohne DELETE-Contract).

</deferred>

---

*Phase: 58-profil-hub-content-membership-cards-activity-preparation*
*Context gathered: 2026-05-29*
