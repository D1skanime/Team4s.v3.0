# Phase 53: Rollenübergreifendes Mein Profil als Member Identity Hub - Context

**Gathered:** 2026-05-27
**Status:** Ready for replanning

<domain>
## Phase Boundary

Phase 53 macht die bestehende eigene Profilseite zu einem modernen, rollenübergreifenden Member Identity Hub unter `/me/profile`.

Diese Phase liefert:
- eine rollenneutrale eigene Profilroute für alle eingeloggten User
- eine klare Trennung zwischen Keycloak-Accountdaten und Team4s-Profil-/Fansub-Daten
- echte Datenquellen für Profil, Avatar, Sichtbarkeit, Mitgliedschaften, Rollen und Beiträge
- eine GDS-basierte Oberfläche in Richtung der gelieferten Designreferenz
- ehrliche Empty States statt Mockdaten oder erfundener Felder
- sichere Planung für Avatar, Rich Text, Sichtbarkeit, Dirty State, Mobile und Accessibility

Diese Phase liefert nicht:
- keine vollständige Public-Member-Page
- keine neue umfassende Berechtigungslogik
- keine vollständige Gruppen-, Rollen- oder Beitragsverwaltung
- keine lokale Bearbeitung von E-Mail, Passwort, MFA oder Keycloak-Identität
- keine Berechtigungen aus historischen Credits
- keine page-spezifische Sidebar/App-Shell oder CSS-Sonderwelt

</domain>

<decisions>
## Implementation Decisions

### Route und Rollen-Neutralität
- **D-01:** `/me/profile` ist die Zielroute für alle eingeloggten User.
- **D-02:** `/admin/profile` bleibt nur Übergang: Redirect oder interner Re-Export, aber keine eigene Admin-Profilwelt.
- **D-03:** Neue Komponenten und sichtbare Texte werden rollenneutral benannt, z. B. `MyProfilePage`, `MemberProfileHero`, `MemberAvatarCard`, `AccountSecurityCard`.
- **D-04:** Normale Member dürfen im UI nicht das Gefühl bekommen, in einer Admin-Maske zu arbeiten.

### Datenhoheit und Sicherheitsgrenzen
- **D-05:** Keycloak besitzt Login, E-Mail, Passwort, MFA, technische Account-Sicherheit und technische Identität.
- **D-06:** Team4s besitzt Fansub-Name, Anzeigename, Avatar, Kurzbeschreibung, Fansub-Geschichte, Aktivitätszeitraum, Profil-Sichtbarkeit, Gruppen, Rollen und Beiträge im Team4s-Kontext.
- **D-07:** Frontend-Code darf keine Tokens lesen und keine Keycloak-Helfer direkt aufrufen. Rückkehr-Refresh läuft über `refreshActiveAuthSession()` und danach `getOwnProfile()`.
- **D-08:** Accountdaten bleiben read-only und dürfen nicht in Public-taugliche Komponenten geraten.

### API- und Contract-Pflicht
- **D-09:** OpenAPI für `GET /api/v1/me/profile`, `PUT /api/v1/me/profile` und `POST /api/v1/me/profile/avatar` ist in Phase 53 Pflicht, nicht optional.
- **D-10:** Runtime-Daten, Frontend-DTOs, API-Helfer und `shared/contracts/openapi.yaml` müssen gemeinsam bewegt werden.
- **D-11:** UI-Code darf keine undokumentierten Felder, Statuspfade oder Fallbacks aus ad hoc `fetch`-Antworten ableiten.

### Sichtbarkeit
- **D-12:** Fehlende oder unklare Sichtbarkeit bedeutet nicht öffentlich.
- **D-13:** Aktuell bekannte Runtime-Werte sind `members_only | public`. Eine dritte Option wie `Für Gruppen sichtbar` darf nur mit DB-/Backend-/OpenAPI-/Public-Query-Contract umgesetzt werden.
- **D-14:** Die Referenz zeigt drei Sichtbarkeitsoptionen als Zielrichtung; falls der Contract in Phase 53 nicht erweitert wird, darf die UI nur die real unterstützten Optionen als aktiv nutzbar anzeigen.

### Aktivitätszeitraum
- **D-15:** Der Profil-Aktivitätszeitraum meint den persönlichen allgemeinen Fansub-Aktivitätszeitraum, nicht Gruppenmitgliedschaft oder Projektbeteiligung.
- **D-16:** Aktiv seit/bis darf nicht aus Gruppenmitgliedschaften, historischen Credits oder Release-Rollen abgeleitet werden.
- **D-17:** Wenn Month/Year-Felder fehlen, gibt es nur zwei saubere Wege: reversible Migration plus Contract oder ehrliche year-only UI. Keine freie Texteingabe ohne Validierung.

### Rollen und Beiträge
- **D-18:** Rollenarten bleiben getrennt: Plattformrolle, Gruppenrolle, App-Rolle, historische Credit-Rolle und Release-/Projektrolle.
- **D-19:** Technische Codes werden zentral oder bewusst geteilt auf deutsche Labels gemappt; rohe Codes wie `platform_admin`, `quality_checker` oder `active` dürfen nicht unübersetzt im UI stehen.
- **D-20:** Historische Credits sind Archiv-/Darstellungsdaten und erzeugen niemals App-Berechtigungen.
- **D-21:** Phase 53 zeigt Beiträge zunächst ehrlich als Summary/Aggregate, wenn kein paginierter Detail-Endpunkt existiert. `/me/contributions` und detailreiche Beitragslisten bleiben vorbereitet oder deferred, außer sie werden explizit als eigener Contract umgesetzt.

### Avatar und Media
- **D-22:** Avatar-Upload bleibt serverseitig autoritativ validiert.
- **D-23:** Erlaubt sind JPG, PNG und WEBP; SVG bleibt verboten, solange kein robustes Sanitizing-Konzept existiert.
- **D-24:** Das Profil-Avatar-Limit soll produktnah konkretisiert werden, z. B. 5 MB. Der aktuelle globale Bildpfad nutzt 50 MB und muss geprüft/angepasst werden.
- **D-25:** Avatar-Crop soll bestehende Projekt-Crop-Primitives aus `MediaUpload`, `mediaUploadCropMath.ts` und `mediaUploadA11y.ts` wiederverwenden oder die Abweichung dokumentieren.
- **D-26:** Varianten wie `avatar_256`, `avatar_96` und `avatar_48` werden entweder über bestehende `media_files.variant` umgesetzt oder bewusst als Follow-up markiert. Keine parallele Media-Logik.

### Rich Text
- **D-27:** Die lange Fansub-Geschichte nutzt nur dann echte TipTap-Persistenz, wenn Backend-Validierung, Sanitizing, Speicherform und Contract bereit sind.
- **D-28:** Keine ungeprüfte HTML-Ausgabe; Links, Nodes und Marks brauchen Allowlist-Regeln.
- **D-29:** Wenn Phase 53 die sichere TipTap-Verdrahtung nicht vollständig schafft, bleibt Plain Text ehrlich sichtbar und Rich Persistence wird deferred.

### UI und Designreferenz
- **D-30:** Die gelieferte Referenz ist Zielrichtung, nicht pixelgenaue Vorgabe.
- **D-31:** Zentrale Struktur der Referenz ist bindend als Planungsrichtung: bestehende Shell, Profil-Hero oben, Avatar prominent, Rollen/Gruppen als Chips, Basisdaten links, Avatar/Sichtbarkeit/Account rechts, Mitgliedschaften und Beiträge als eigene Bereiche.
- **D-32:** Keine neue Profile-only Sidebar hardcoden. Bestehende globale App-Shell/Navigation verwenden oder erweitern.
- **D-33:** Bestehende GDS-Komponenten wie `Card`, `Button`, `Badge`, `FormField`, `Input`, `Textarea`, `Select`, `PageHeader`, `SectionHeader`, `LoadingState`, `ErrorState`, `EmptyState`, `Modal` und `Drawer` werden vor page-lokalen Controls genutzt.
- **D-34:** Deutsche UI-Texte verwenden korrekte Umlaute.

### Dirty State, Fehler und Accessibility
- **D-35:** Speichern ist nur aktiv, wenn Team4s-Profilfelder dirty sind.
- **D-36:** Keycloak-Rückkehrrefresh und Avatar-Upload dürfen ungespeicherte Team4s-Profilfelder nicht überschreiben.
- **D-37:** Avatar-Änderung und Profilfeld-Speichern bleiben getrennt oder werden mit einem expliziten kombinierten Save-Contract umgesetzt.
- **D-38:** Partielle Fehler werden nur versprochen, wenn Datenquellen/API wirklich getrennt ladbar sind. Wenn `/me/profile` ein Aggregate bleibt, muss der Fehlerzustand ehrlich zum Aggregate passen.
- **D-39:** Mobile, Tastaturbedienung, sichtbare Fokuszustände, Dialog-Fokusführung, ESC-Schließen und keine Hover-only-Aktionen sind Akzeptanzkriterien.

### Nachdiskussion: 53A-Schnitt und sichtbare Bereiche
- **D-40:** Phase 53A soll ein breiter Hub-Grundbau sein, nicht nur ein minimaler Routen-Slice. Die komplette Zielstruktur mit Hero, Basisdaten, Story, Avatar-Card, Sichtbarkeit, Account & Sicherheit, Mitgliedschaften und Beiträgen soll sichtbar angelegt werden.
- **D-41:** Alle Zielbereiche dürfen in 53A sichtbar sein, aber sie müssen ehrlich begrenzt sein: Empty State, deaktivierte Aktion oder klarer Hinweis, wenn Daten oder Contract fehlen. Keine Fake-Daten, keine erfundenen Felder und keine Links ins Leere.

### Nachdiskussion: Story und TipTap
- **D-42:** `member_story` soll echte TipTap-Persistenz bekommen, aber strikt über den vorhandenen Phase-41-Stack. Vorhandene TipTap-Services, Validierung, Sanitizing, `body_json`/`body_html`/`body_text`-Pattern und `RichTextRenderer` werden wiederverwendet; kein zweiter TipTap-Service, kein neuer Renderer und keine parallele Sanitizing-Logik.
- **D-43:** Bestehende Plain-Text-`member_story`-Daten müssen weiter lesbar bleiben. 53B muss dafür Migration oder Legacy-Fallback vorsehen, bevor der Profil-Story-Pfad echtes TipTap als Standard nutzt.

### Nachdiskussion: Avatar-Crop und Originalbild
- **D-44:** Avatar-Crop soll eine clientseitige Crop-/Zoom-/Positionierungs-UX bekommen, aber die Architektur darf das Originalbild nicht verlieren. Backend-/Media-Contract muss Original plus Crop-Ergebnis oder Original plus Crop-Metadaten so behandeln, dass spätere Varianten und Recrop nicht blockiert werden.

### Nachdiskussion: Globale App-Shell
- **D-45:** Die neue Shell ist global und wiederverwendbar, nicht profil-lokal. `/me/profile` ist der erste Consumer, aber die Shell soll perspektivisch für Dashboard, Verwaltung, Mein Bereich, Einstellungen und weitere App-Flächen nutzbar sein.
- **D-46:** Die Shell wird dual-state-fähig vorbereitet: `authenticated` wird in 53A produktiv genutzt, `anonymous`/Login/Registrieren werden architektonisch nicht verbaut, aber funktional auf später verschoben.
- **D-47:** Die eingeloggte Shell-Navigation soll referenznah sein: Public-Bereich, Dashboard, capability-gated Verwaltung, Mein Bereich mit Mein Profil/Meine Gruppen/Meine Beiträge, Einstellungen und User-Footer.
- **D-48:** 53A migriert nicht die ganze App auf die neue Shell. Nur `/me/profile` nutzt sie als erster Consumer; andere Seiten bleiben vorerst auf bestehender Struktur.
- **D-49:** Noch nicht existierende Shell-Ziele werden nicht als Fake-Routen verlinkt. Sie dürfen sichtbar vorbereitet werden, aber nur deaktiviert oder als Coming soon.
- **D-50:** Mobile-Shell-Härtung kommt in 53B. 53A muss Desktop/Tablet sauber und Mobile nicht kaputt liefern, aber ein finaler Drawer/Burger ist keine 53A-Pflicht.

### Nachdiskussion: Umsetzungstaktik
- **D-51:** Parallelisierung erfolgt nur nach klarer File Ownership. Globale Shell ist ein eigener Block und darf nicht gleichzeitig mit konfliktierenden `/me/profile`-Grundlagen bearbeitet werden; 53B-Backend-/DTO-/OpenAPI-/RichText-/Avatar-Contracts werden seriell oder explizit koordiniert umgesetzt.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Workflow and Requirements
- `AGENTS.md` — Projektregeln, Domain-Regeln, API-/UI-/Validierungsanforderungen.
- `.planning/ROADMAP.md` — Phase-53-Ziel, Architecture Decisions, Known Gaps und Success Criteria.
- `.planning/REQUIREMENTS.md` — `MEMBER-PROFILE-HUB-01`, `MEMBER-PROFILE-01`, Auth-Boundary Requirements.
- `.planning/phases/47-member-profile-und-historical-identity/47-CONTEXT.md` — ursprüngliche Profil-/Historical-Identity-Entscheidungen.
- `.planning/phases/48-meine-gruppen-und-contributor-dashboard/48-CONTEXT.md` — Gruppen-/Contributor-Kontext, Capability-Regeln und Navigation.
- `.planning/phases/52-profile-account-return-refresh-flow/52-CONTEXT.md` — Keycloak-Rückkehrflow, Dirty-Form-Schutz und Auth-Seam.

### Engineering and Contracts
- `docs/engineering/implementation-contract.md` — Search-first, Reuse und Contract-Disziplin.
- `docs/api/api-contracts.md` — OpenAPI-/DTO-/API-Helper-Abgleich.
- `docs/frontend/auth-api-client.md` — zentrale Auth/API-Seam, Token-free UI Boundary.
- `shared/contracts/openapi.yaml` — muss für Profil-API und Avatar-Upload ergänzt/abgeglichen werden.

### UI and Design System
- `docs/frontend/ui-system.md` — GDS-Richtung, globale Komponenten und Profil-/Detailseiten-Muster.
- `docs/agent-guidelines-ui.md` — lokale UI-Regeln, Controls und responsive Erwartungen.
- `docs/frontend/ui-inventory.md` — vorhandene Profile-/Avatar-/RichText-/Card-Patterns und bekannte UI-Duplizierung.
- `C:/Users/admin/Desktop/ChatGPT Image 26. Mai 2026, 18_24_26.png` — externe Screenshot-Referenz; Zielrichtung wird zusätzlich unter Specific Ideas textuell festgehalten.

### Runtime Code and Data Sources
- `frontend/src/app/admin/profile/page.tsx` — aktuelle Profilseite, Keycloak-Link, Dirty-State, Avatar-Upload, RichText-PlainText-Konvertierung.
- `frontend/src/app/admin/profile/page.test.tsx` — bestehende Profil-Regressionstests.
- `frontend/src/app/admin/profile/page.module.css` — aktuelle lokale Profilstyles, die reduziert/gezielt ersetzt werden sollen.
- `frontend/src/app/admin/page.tsx` — aktueller Admin-Startseiten-Link zu `Mein Profil`, muss für `/me/profile` und neue Shell-Entry-Strategie geprüft werden.
- `frontend/src/app/admin/my-groups/page.tsx` — bestehender `Meine Gruppen`-/Profil-Kontext und GDS-Referenz; bekannte Links zu `/admin/profile` müssen beim Shell-/Route-Umbau geprüft werden.
- `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx` — aktueller Hinweis auf persönliche Profilpflege; darf nicht weiter eine Admin-Profilwelt signalisieren.
- `frontend/src/lib/api.ts` — `getOwnProfile`, `updateOwnProfile`, `uploadOwnProfileAvatar`, `refreshActiveAuthSession`.
- `frontend/src/types/profile.ts` — Profil-DTOs und Sichtbarkeitswerte.
- `frontend/src/components/ui` — globale GDS-Komponenten.
- `frontend/src/components/editor/RichTextEditor.tsx` — bestehende TipTap-Editor-Komponente.
- `frontend/src/components/editor/RichTextRenderer.tsx` — bestehender Renderpfad.
- `backend/internal/handlers/admin_content_member_stories.go` — vorhandene TipTap-Verdrahtung für Member-Stories als Reuse-Referenz für Profil-`member_story`.
- `backend/internal/repository/member_group_stories_repository.go` — bestehendes `body_json`/`body_html`/`body_text`-Persistenzmuster für Member-bezogene Rich-Text-Stories.
- `frontend/src/components/admin/MediaUpload.tsx` — bestehende Crop-/Upload-UX als Avatar-Analog.
- `frontend/src/components/admin/mediaUploadCropMath.ts` — wiederverwendbare Crop-Geometrie.
- `frontend/src/components/admin/mediaUploadA11y.ts` — wiederverwendbare Crop-A11y-Helfer.
- `backend/internal/handlers/app_profile.go` — Profil-Read/Update/Avatar-Handler und aktuelle Avatar-Validierung.
- `backend/internal/repository/member_profile_repository.go` — Profil-Aggregat, Memberships, Credits, Avatar-Verknüpfung.
- `backend/internal/models/member_profile.go` — Backend-Profil-DTO und aktuelle `ProfileVisibility`-Konstanten.
- `backend/internal/services/tiptap_service.go` — vorhandene TipTap-Validierung, Sanitizing und HTML/Text-Extraktion.
- `database/migrations/0077_member_profiles_mvp.up.sql` — aktuelle Profilfelder, year-only Aktivitätszeitraum und Sichtbarkeits-Constraint.
- `docs/architecture/db-schema-fansub-domain.md` — Fansub-/Release-/Rollen-/Media-Domain-Grenzen.
- `docs/architecture/fansub-member-management.md` — Member-/Gruppenrollen- und Keycloak-/Team4s-Datenhoheit.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/lib/api.ts`: zentrale Auth/API-Helfer für Profil und Avatar; keine page-lokalen `fetch`-Duplikate.
- `frontend/src/types/profile.ts`: vorhandene DTOs mit `memberships`, `historical_credits`, `profile_visibility`, Account- und Capability-Feldern.
- `frontend/src/components/ui`: globale GDS-Bausteine für Cards, Buttons, Badges, Forms, States, Modal/Drawer.
- `frontend/src/components/editor/RichTextEditor.tsx`: Editor ist vorhanden, aber aktuelle Profilseite speichert noch Plain Text.
- `backend/internal/services/tiptap_service.go`: Backend kann TipTap JSON validieren, HTML sanitizen und Text extrahieren; Profil-API ist noch nicht daran verdrahtet.
- `frontend/src/components/admin/MediaUpload.tsx` plus Crop-Helfer: vorhandene Projekt-Crop-UX für Avatar-Crop wiederverwenden oder extrahieren.

### Established Patterns
- Frontend-API-Aufrufe laufen über `authorizedFetch` und zentrale API-Helfer.
- Backend-Routen werden zentral in `backend/cmd/server/main.go` registriert; Handler validieren HTTP-Verträge, Repositories besitzen SQL.
- Contract-Dateien in `shared/contracts` sind die verbindliche Cross-Surface-Referenz.
- Aktuelle Profilseite schützt Dirty-Form-State nach Keycloak-Return bereits teilweise; Phase 53 muss diesen Schutz beim Recompose erhalten.
- Aktuelle DB speichert Profilaktivität year-only und Sichtbarkeit nur als `members_only | public`.

### Integration Points
- Neue Route `frontend/src/app/me/profile/page.tsx`.
- Übergangsroute `frontend/src/app/admin/profile/page.tsx`.
- Navigation/User-Menü: `Mein Profil` muss für alle eingeloggten User erreichbar sein, Adminpunkte nur nach Berechtigung.
- Backend-Profile-Aggregat: `GET /api/v1/me/profile`.
- Profil-Mutation: `PUT /api/v1/me/profile`.
- Avatar-Mutation: `POST /api/v1/me/profile/avatar`.
- OpenAPI/DTO-Abgleich: `shared/contracts/openapi.yaml`, `frontend/src/types/profile.ts`, `backend/internal/models/member_profile.go`.

</code_context>

<specifics>
## Specific Ideas

### Design Reference Extraction

Die gelieferte Referenz zeigt als Zielrichtung:
- linke App-Shell mit Team4s-Branding, Bereichsgruppen und `Mein Bereich`
- Top-Breadcrumb plus rechts liegende Aktionen `Öffentliches Profil ansehen` und `Profil speichern`
- großer Profil-Hero mit dunklem Banner, prominentem Avatar, Fansub-Name, Handle, Rollen-Chips, Kurzbeschreibung und Schnellinfos
- Desktop-Layout mit breiter linker Hauptspalte und schmalerer rechter Spalte
- linke Spalte: Basisdaten, Meine Fansub-Geschichte, Mitgliedschaften, Meine Beiträge
- rechte Spalte: Profilbild, Profil-Sichtbarkeit, Account & Sicherheit
- Sichtbarkeit als eigene Card mit Radio-Optionen, nicht zusätzlich redundant als ungeklärtes Dropdown
- Avatar-Card mit rundem Bild, Bild-ändern-Aktion und Dateityp-/Limit-Hinweis
- Account & Sicherheit als technische, klar isolierte Keycloak-Card
- Mitgliedschaften als moderne Gruppenkarte mit Logo/Fallback, Status, Rollen-Chips und Actions
- Beiträge mit erklärendem Empty State und späterem `Alle Beiträge anzeigen`

### Control Mapping

- Fansub-Name / Anzeigename: Textfelder mit Labels.
- Kurzbeschreibung: kurzer Text mit Zeichenlimit und Zähler, nicht die lange Rich-Text-Bio.
- Aktiv seit/bis: keine freie Textarea; year-only constrained control oder Month/Year-Contract.
- Aktuell aktiv: Checkbox/Switch; wenn aktiv, `Aktiv bis` deaktivieren.
- Sichtbarkeit: eine semantische Auswahl, bevorzugt Radio-Card, aber nur mit real unterstützten Werten.
- Accountdaten: read-only Text/Status/Badge plus Keycloak-Link.
- Rollen: Chips getrennt nach Rollenart.
- Media: bestehende Avatar-/Upload-/Crop-Seams, keine parallele Uploadlogik.

### Phase Split Preference

Phase 53A soll die robuste Grundlage liefern:
- `/me/profile`
- `/admin/profile` Übergang
- Contract-Dokumentation für bestehende Profil-API
- GDS-Recompose ohne Fake-Daten
- Hero, Basisdaten, Account & Sicherheit, Memberships, Beiträge-Summary
- Rollenlabel-Mapping und Capability-respektierte Darstellung

Phase 53B soll die Härtung liefern:
- Avatar-Crop und serverseitige Profil-Avatar-Validierung
- RichText-Contract oder ehrlicher Deferred-Status
- Sichtbarkeit nur contract-backed
- Aktivitätszeitraum nur contract-backed
- Dirty-State, partielle/aggregate Fehlerlogik, Mobile und Accessibility

### Nachdiskussion 2026-05-27

- 53A soll bewusst breiter werden als ein Minimal-Slice: alle Zielbereiche der Referenz sind sichtbar, auch wenn einzelne Bereiche nur Empty State, deaktivierte Aktion oder Contract-Hinweis zeigen.
- Die globale Shell ist Teil von 53A, aber nicht als profil-lokale Sidebar. Sie wird als wiederverwendbare, dual-state-fähige Shell vorbereitet und in 53A nur von `/me/profile` produktiv konsumiert.
- Die Shell zeigt im eingeloggten Zustand referenznah Public-Bereich, Dashboard, capability-gated Verwaltung, Mein Bereich, Einstellungen und User-Footer. Noch nicht existierende Ziele werden Coming soon/deaktiviert dargestellt.
- Login und Registrieren sollen später in die Shell passen, werden aber in Phase 53 nicht funktional umgesetzt.
- `member_story` soll nicht bei Plain Text stehen bleiben: 53B soll echte TipTap-Persistenz über den vorhandenen Phase-41-Stack anschließen. Die aktuelle Profilseite nutzt zwar den Editor, speichert aber wieder Plain Text.
- Der Profil-Story-Umbau darf keinen zweiten TipTap-Service, Renderer oder Sanitizer erzeugen. Vorhandene `TipTapService`-/`RichTextRenderer`-/`body_json`-/`body_html`-Patterns sind zu übernehmen.
- Avatar-Crop soll clientseitig bedienbar sein, aber das Originalbild darf architektonisch nicht verloren gehen; spätere Varianten und Recrop müssen möglich bleiben.
- Execution läuft parallel nur nach File Ownership. Die globale Shell ist ein eigener Block; 53B-Contract-Arbeiten werden seriell oder explizit koordiniert.

</specifics>

<deferred>
## Deferred Ideas

- Vollständige Public-Member-Page `/members/[slug]`.
- Vollständiger stabiler `member_slug`, falls nicht bereits vorhanden.
- Vollständige `/me/groups`, `/me/contributions`, `/me/account` Routen.
- Login-/Registrieren-Einstiege in der globalen Shell; Phase 53 bereitet die Architektur vor, setzt sie aber nicht funktional um.
- App-weite Migration aller bestehenden Admin-/Contributor-Seiten auf die neue Shell; 53A nutzt die Shell nur für `/me/profile`.
- Finale Mobile-Drawer-/Burger-Härtung der Shell; einfache Nutzbarkeit bleibt nötig, Detailhärtung liegt in 53B.
- Paginierter Contributions-Detail-Endpunkt, falls nicht ausdrücklich in Phase 53 umgesetzt.
- Custom Keycloak Account Console Theme mit `Zurück zu Team4s`.
- Erweiterte Gruppen-/Rollenverwaltung über den Profil-Hub hinaus.

</deferred>

---

*Phase: 53-rollenuebergreifendes-mein-profil-als-member-identity-hub*
*Context gathered: 2026-05-27*
