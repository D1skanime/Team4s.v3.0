# Phase 55: Sichere TipTap-Persistenz fuer Profilgeschichte - Context

**Gathered:** 2026-05-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 55 behebt den Datenverlust in der eigenen Profilgeschichte auf `/me/profile`: Der sichtbare TipTap-Editor darf nicht mehr H1-H3, Farben, Tabellen oder andere Editor-Inhalte erlauben und diese beim Speichern zu Plain Text verlieren.

Diese Phase liefert:
- echte TipTap-Persistenz fuer die eigene Profilgeschichte
- backendseitige Validierung, HTML-Sanitizing und Plaintext-Extraktion ueber den vorhandenen Phase-41-`TipTapService`
- OpenAPI-, Backend-DTO-, Frontend-DTO- und `frontend/src/lib/api.ts`-Abgleich fuer den Profil-Story-Contract
- kontrollierte DB-Migration fuer TipTap-Felder auf `members`
- sichere Behandlung bestehender Testdaten, ohne aufwendige Produktionsdaten-Migration
- einen Profil-Story-Lesemodus nach dem Speichern, der den Text wie die spaetere Public-Darstellung rendert
- einen expliziten `Bearbeiten`-Button, der den Editor nur im Bearbeitungsmodus zeigt

Diese Phase liefert nicht:
- keine Public-Member-Page
- keine Profil-Hub-Aktivitaets-/Medien-Neugestaltung
- keinen globalen Cropper-Umbau
- keine Contributor-eigenen Edit-/Delete-Flows fuer Medien oder Notizen
- keine neue TipTap-/Sanitizing-/Renderer-Parallelstruktur

</domain>

<decisions>
## Implementation Decisions

### Rich-Text-Datenhoheit
- **D-01:** Die Profilgeschichte muss alles persistieren, was der bestehende sichtbare TipTap-Editor aktuell anbietet. H1-H3, Textfarben, Tabellen und weitere bestehende Editor-Funktionen duerfen nach Save und Reload nicht verschwinden.
- **D-02:** TipTap JSON ist die fachliche Quelle der Profilgeschichte. Plain Text darf nur abgeleiteter Zusatz fuer Suche, Vorschau, Kompatibilitaet oder Fallback sein.
- **D-03:** Clientseitig geliefertes HTML wird nicht als Wahrheit akzeptiert. HTML wird serverseitig aus TipTap JSON erzeugt und sanitisiert.
- **D-04:** Phase 55 nutzt den vorhandenen Phase-41-Stack: `TipTapService`, `RichTextEditor`, `RichTextRenderer`, `body_json`-/`body_html`-/`body_text`-Pattern. Kein zweiter TipTap-Service, kein zweiter Renderer, kein paralleles Sanitizing.

### API- und DTO-Vertrag
- **D-05:** `member_story` kann als Plain-Text-/Kompatibilitaetsfeld erhalten bleiben, aber der neue Vertrag muss Rich-Text-Felder enthalten, die den vollen Editorzustand tragen.
- **D-06:** Der genaue Feldname ist Planungs-/Implementierungsdetail, solange der Vertrag eindeutig ist und `shared/contracts/openapi.yaml`, Backend-Modelle, `frontend/src/types/profile.ts` und `frontend/src/lib/api.ts` zusammenpassen.
- **D-07:** `GET /api/v1/me/profile` muss die Profilgeschichte fuer Bearbeitung als TipTap JSON und fuer Anzeige als serverseitig sanitisiertes HTML liefern.
- **D-08:** `PUT /api/v1/me/profile` muss TipTap JSON fuer die Profilgeschichte akzeptieren, validieren, serverseitig rendern, Plain Text extrahieren und persistieren.
- **D-09:** UI-Code darf keine undokumentierten Antwortfelder oder lokalen Save-Fallbacks fuer die Profilgeschichte erfinden.

### Migration und Testdaten
- **D-10:** Das Projekt ist noch in der Testphase; vor Produktivgang wird die DB geloescht. Deshalb braucht Phase 55 keine schwere Produktionsdaten-Migrationsstrategie.
- **D-11:** Trotzdem muss die Migration sauber und reversibel sein, neue Felder append-only ergaenzen und aktuelle Testdaten kontrolliert behandeln.
- **D-12:** Bestehende Plain-Text-Profilgeschichten sollen mindestens in ein minimales TipTap-Dokument ueberfuehrt oder beim ersten Laden/Speichern ohne Datenverlust behandelt werden. Der Planner darf die einfachste robuste Variante waehlen.
- **D-13:** Vor neuen Migrationen muessen aktuelle Migrationsnummern und untracked Migrationen geprueft werden.

### Editor- und Lesemodus
- **D-14:** Nach erfolgreichem Speichern soll die Profilgeschichte nicht weiter dauerhaft als Editor erscheinen.
- **D-15:** Standardzustand ist ein Lesemodus mit gerendertem Rich Text, der der spaeteren Public-Profil-Darstellung entspricht.
- **D-16:** Editor-Toolbar, Tabs und Bearbeitungscontrols erscheinen nur im expliziten Bearbeitungsmodus.
- **D-17:** Der Einstieg in den Bearbeitungsmodus erfolgt ueber einen klaren `Bearbeiten`-Button.
- **D-18:** Nach Save kehrt der Bereich in den Lesemodus zurueck und zeigt den gespeicherten Zustand.
- **D-19:** Der falsche sichtbare Hinweis, dass die Geschichte weiter als Plain Text gespeichert wird, muss entfernt werden.
- **D-20:** Diese Phase soll keine breite Profil-Hub-UX-Neugestaltung machen. Nur Story-Card-Verhalten und Story-spezifische Texte gehoeren in den Scope.

### Sanitizing und Funktionsumfang
- **D-21:** Ziel ist der volle aktuelle Editorumfang. Wenn der Editor ein Feature zeigt, muss es backendseitig erlaubt, persistiert und sicher gerendert werden.
- **D-22:** Falls Research zeigt, dass ein sichtbares Editor-Feature backendseitig nicht sicher unterstuetzt werden kann, muss Planung dies explizit als Contract-Gap markieren und die UI/Backend-Abweichung beseitigen. Das bevorzugte Ziel bleibt: bestehenden sichtbaren Umfang sichern, nicht willkuerlich reduzieren.
- **D-23:** Profilgeschichten nutzen die bestehende Phase-41-Longform-Allowlist als Ausgangspunkt, inklusive Tabellen, Headings und Farb-Tokens.
- **D-24:** Keine freie HTML-Eingabe, keine unsicheren externen Medien, keine ungeprueften Style-Attribute und keine unsanitized Ausgabe.

### Auth, Dirty State und Save-Verhalten
- **D-25:** Geschuetzte Profilansicht und Speichern muessen weiter funktionieren, wenn das Access Token fehlt oder abgelaufen ist, aber eine Refresh-Session vorhanden ist.
- **D-26:** UI-Code bleibt tokenfrei und laeuft fuer normale API-Aufrufe ueber die zentrale API-Seam in `frontend/src/lib/api.ts`.
- **D-27:** Keycloak-Return-Refresh darf eine ungespeicherte Profilgeschichte nicht ueberschreiben.
- **D-28:** Dirty-State muss Rich-Text-Aenderungen korrekt erkennen und nach erfolgreichem Save zuruecksetzen.

### Todo-Folding und Folgephasen
- **D-29:** Der Cropper-Todo wird nicht in Phase 55 gefaltet. Er soll als Phase-56-Kandidat fuer den globalen Cropper-Library-Ersatz bleiben.
- **D-30:** Profil-Hub-Aktivitaetsredesign und Contributor-eigene Edit-/Delete-Flows werden nicht in Phase 55 gefaltet.

### the agent's Discretion
- Der Planner darf entscheiden, ob die Rich-Text-Felder als flache Felder (`member_story_json`, `member_story_html`, `member_story_text`) oder als klar dokumentiertes Objekt modelliert werden, solange Contract, DTOs, Backend und Frontend konsistent sind.
- Der Planner darf entscheiden, ob bestehender Plain Text per DB-Backfill, Runtime-Fallback oder kombinierter kleiner Strategie in TipTap ueberfuehrt wird, solange kein Datenverlust entsteht und die Loesung fuer die Testphasenrealitaet angemessen schlank bleibt.
- Der Planner darf die genaue UI-Komponentenaufteilung fuer Lesemodus/Bearbeitungsmodus bestimmen, solange `RichTextEditor` und `RichTextRenderer` wiederverwendet werden.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Workflow and Scope
- `AGENTS.md` - Projektregeln, GSD-Workflow, API-/UI-/Validierungsanforderungen und Stop Conditions.
- `.planning/ROADMAP.md` - Phase-55-Ziel, Requirements und Success Criteria.
- `.planning/REQUIREMENTS.md` - `MEMBER-PROFILE-STORY-RICH-TEXT-01`.
- `.planning/STATE.md` - Aktueller Projektzustand, Roadmap Evolution und Phase-54/55-Kontext.
- `.planning/phases/53-rollenuebergreifendes-mein-profil-als-member-identity-hub/53-CONTEXT.md` - Profil-Hub-Entscheidungen, Rich-Text-Defer und Datenhoheit.
- `.planning/phases/41-globalen-tiptap-rich-text-editor-einfuehren/41-CONTEXT.md` - TipTap-Primärformat, Allowlist, Sanitizing, Editor/Renderer und Migrationstrategie.
- `.planning/phases/49-zentraler-auth-api-client-und-token-lifecycle-h-rtung/49-CONTEXT.md` - zentrale Auth/API-Seam und tokenfreie UI-Regeln.

### Contracts and Architecture
- `docs/engineering/implementation-contract.md` - Search-first, Reuse- und Duplikationsregeln.
- `docs/api/api-contracts.md` - OpenAPI-/DTO-/Frontend-Helper-/Backend-Contract-Abgleich.
- `docs/frontend/auth-api-client.md` - zentrale Auth/API-Client-Grenze und Refresh-Session-Verhalten.
- `shared/contracts/openapi.yaml` - kanonischer Profil-API-Vertrag.
- `docs/frontend/ui-system.md` - UI-Komponenten- und Control-Mapping-Regeln.
- `docs/agent-guidelines-ui.md` - lokale UI-Regeln.

### Existing Runtime Seams
- `frontend/src/app/me/profile/page.tsx` - aktuelle Profilseite, lokale Plain-Text-Konvertierung, Dirty-State und Save-Flow.
- `frontend/src/app/me/profile/components/ProfileStoryCard.tsx` - aktueller Story-Editor und falscher Plain-Text-Hinweis.
- `frontend/src/app/me/profile/components/profileFormTypes.ts` - aktueller `memberStory: unknown`-Form-State.
- `frontend/src/app/me/profile/page.test.tsx` - bestehende Profil-Regressionen fuer Save, Dirty-State und Auth-Session.
- `frontend/src/types/profile.ts` - Profil-DTOs und Update-Payload.
- `frontend/src/lib/api.ts` - `getOwnProfile`, `updateOwnProfile`, zentrale API-/Auth-Helfer.
- `frontend/src/components/editor/RichTextEditor.tsx` - vorhandener globaler TipTap-Editor.
- `frontend/src/components/editor/RichTextRenderer.tsx` - vorhandener sicherer HTML-Renderer.
- `backend/internal/handlers/app_profile.go` - Profil-Read/Update-Handler.
- `backend/internal/models/member_profile.go` - Backend-Profil-DTOs.
- `backend/internal/repository/member_profile_repository.go` - Profil-Aggregat und `members`-Persistenz.
- `backend/internal/services/tiptap_service.go` - vorhandene TipTap-Validierung, HTML-Rendering, Sanitizing und Text-Extraktion.
- `backend/internal/handlers/admin_content_member_stories.go` - bestehende TipTap-Save-Analogie fuer Member-Stories.
- `backend/internal/repository/member_group_stories_repository.go` - bestehendes `body_json`/`body_html`/`body_text`-Persistenzmuster.
- `database/migrations/0077_member_profiles_mvp.up.sql` - aktuelle Profilfelder auf `members`.
- `database/migrations/0068_member_group_stories_tiptap.up.sql` - TipTap-Migrationsmuster fuer Member-Stories.
- `database/migrations/0070_release_version_notes_tiptap.up.sql` - TipTap-Migrationsmuster fuer Release-Version-Notizen.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/internal/services/tiptap_service.go`: muss fuer Profilgeschichte wiederverwendet werden, um JSON zu validieren, HTML zu rendern/sanitizen und Plain Text zu extrahieren.
- `frontend/src/components/editor/RichTextEditor.tsx`: bestehender Editor bleibt die Eingabe-Komponente.
- `frontend/src/components/editor/RichTextRenderer.tsx`: bestehender Renderer soll den Lesemodus/public-nahen Preview-State anzeigen.
- `frontend/src/lib/api.ts`: bestehende Profil-API-Helfer bleiben die Browser-Transport-Seam; kein ad hoc `fetch`.
- `backend/internal/handlers/admin_content_member_stories.go`: gute Analogie fuer TipTap-Request-Verarbeitung.
- `backend/internal/repository/member_group_stories_repository.go`: gute Analogie fuer JSON/HTML/Text-Persistenzfelder.

### Established Patterns
- Backend-Handler besitzen HTTP-Request-/Response-Validierung, Repositories besitzen SQL.
- Shared OpenAPI und Frontend-DTOs muessen mit Runtime-Verhalten zusammen bewegt werden.
- Normale geschuetzte Browser-API-Aufrufe laufen ueber zentrale Auth/API-Helfer und duerfen nicht auf Access-Token allein gaten.
- Migrations liegen unter `database/migrations/` und werden append-only angelegt.

### Integration Points
- `GET /api/v1/me/profile` muss Rich-Text-Anzeige- und Bearbeitungsdaten liefern.
- `PUT /api/v1/me/profile` muss Rich-Text speichern und abgeleitete Felder erzeugen.
- `/me/profile` muss Story-Card-State in Lesemodus/Bearbeitungsmodus aufteilen.
- Tests muessen Profil-Save, Reload, Rich-Text-Erhalt, Sanitizing-Rejects, Dirty-State und Refresh-Session-Verhalten absichern.

</code_context>

<specifics>
## Specific Ideas

- User-Beobachtung: Im Editor koennen aktuell H1-H3, Farben und Tabellen erstellt werden; nach dem Speichern ist alles weg. Das ist der zentrale Bug.
- Gewuenschtes Verhalten: Nach dem Speichern ist ein gespeicherter Zustand sichtbar. Der User kann nicht sofort weiter im Editor tippen, sondern startet Bearbeitung ueber `Bearbeiten`.
- Lesemodus soll den Text so darstellen, wie er spaeter auch im Public-Profil erscheinen wuerde: gerenderter Rich Text, keine Editor-Tabs, keine Toolbar.
- Bearbeitungsmodus zeigt den Editor und seine Controls nur solange aktiv bearbeitet wird.
- Die DB ist noch Test-/Entwicklungsdatenbestand; eine schlanke Migration reicht, aber technische Korrektheit und Reversibilitaet bleiben Pflicht.

</specifics>

<deferred>
## Deferred Ideas

- Globaler Cropper-Library-Ersatz fuer Avatar- und Fansub-Gruppen-Medienflows wird als Phase 56 behandelt.
- Profil-Hub-Aktivitaets-/Content-Redesign bleibt eigener Folge-Slice.
- Contributor-eigene Medien/Notizen nachtraeglich editieren/loeschen bleibt eigener Contributor-Workspace-Slice.
- Public-Member-Page bleibt ausserhalb von Phase 55; Phase 55 darf aber die Anzeige so vorbereiten, dass spaeter derselbe Renderer genutzt werden kann.

### Reviewed Todos (not folded)
- `2026-05-28-global-cropper-library-replacement.md` - explizit als Phase-56-Kandidat deferred.
- `2026-05-28-profile-hub-content-activity-redesign.md` - ausserhalb von Phase 55; nur der Story-spezifische Plain-Text-Hinweis ist in Phase 55 relevant.
- `2026-05-28-contributor-owned-media-note-edit-delete.md` - ausserhalb des Profil-Story-Contracts.

</deferred>

---

*Phase: 55-sichere-tiptap-persistenz-fuer-profilgeschichte*
*Context gathered: 2026-05-28*
