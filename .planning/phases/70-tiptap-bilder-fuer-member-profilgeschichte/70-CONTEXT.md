# Phase 70: TipTap-Bilder fuer Member-Profilgeschichte - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Member koennen in ihrer eigenen Fansub-Profilgeschichte auf `/me/profile` ein oder mehrere Bilder in den TipTap-Text einfuegen. Bilder werden nicht als Base64 oder externe URLs gespeichert, sondern ueber den bestehenden member-eigenen Team4s-Media-/Upload-Flow persistiert und im TipTap-Dokument per Media-Asset-Referenz (`media_asset_id`) eingebettet.

Diese Phase liefert:
- einen neuen, sicheren Image-Node im bestehenden Phase-41-TipTap-Stack (Editor-Extension, Backend-Allowlist, HTML-Renderer, Sanitizing)
- ein opt-in Bild-Einfuegen nur fuer die Profilgeschichte-Instanz des geteilten `RichTextEditor`
- member-eigenen Story-Bild-Upload ueber einen erweiterten Profil-Upload-Pfad
- In-Editor-Resize (per Ziehgriff) und Block-Ausrichtung (links/Mitte/rechts)
- **Cleanup-on-Save**: beim Speichern werden nicht mehr referenzierte Story-Bilder physisch aus Dateispeicher und DB entfernt
- korrekte, sanitisierte Bilddarstellung im `/me/profile`-Lesemodus UND im oeffentlichen Member-Profil (Phase 59)

Diese Phase liefert nicht:
- keinen zweiten TipTap-Service, Renderer oder Sanitizer (Phase-41-Stack wird wiederverwendet)
- kein Bild-Feature fuer andere Editor-Flaechen (Admin-Notizen, Fansub-Notizen bleiben unveraendert)
- keinen Alt-/Caption-Text (bewusst weggelassen — siehe D-05, Abweichung von ROADMAP-SC1)
- keine Profil-Hub-Aktivitaets-/Medien-Neugestaltung, keinen Cropper-Umbau

> **WICHTIG — ROADMAP-Abweichungen, die der Planner/gsd-phase anpassen muss:**
> - **SC1-Gap:** ROADMAP-Success-Criterion 1 nennt "optionalem Alt-/Caption-Text". Der User hat Alt/Caption bewusst gestrichen. Dies ist ein Contract-Gap; SC1 sollte angepasst oder der Gap explizit dokumentiert werden.
> - **SC5-Override:** ROADMAP-Success-Criterion 5 stellt physisches Cleanup als "bewusst separat geplant oder dokumentiert" dar. Der User hat entschieden, **Cleanup-on-Save in Phase 70 hineinzuziehen** (D-13). SC5 muss entsprechend angepasst werden (raus aus "deferred").

</domain>

<decisions>
## Implementation Decisions

### Bild-Referenz & Datenvertrag
- **D-01:** Der TipTap-Image-Node speichert ausschliesslich eine stabile `media_asset_id` als fachliche Wahrheit. Die `/media`-URL wird serverseitig beim HTML-Rendering aufgeloest — niemals als "Wahrheit" im body_json (konsistent mit Phase-55 D-03: Client-HTML ist nie Wahrheit).
- **D-02:** Der Node traegt zusaetzlich Layout-Attribute: Bildbreite (siehe D-09) und Block-Ausrichtung (siehe D-10). **Kein** Alt-Text und **keine** Caption (siehe D-05).
- **D-03:** Beim Speichern von body_json prueft das Backend fuer jede referenzierte `media_asset_id`: (a) Existenz, (b) Eigentuemer-Bindung an den speichernden Member. Fremde Asset-IDs werden abgelehnt (IDOR-/Fremd-Einbettungsschutz).
- **D-04:** Fehlt ein referenziertes Asset zum HTML-Render-Zeitpunkt (geloescht/nicht aufloesbar), wird der Image-Node still uebersprungen — kein kaputtes Bild, kein Fehler, der Rest der Geschichte rendert normal.
- **D-05:** Alt-Text und Caption werden in Phase 70 **nicht** umgesetzt. Bewusste Reduktion gegenueber ROADMAP-SC1. Folge: kein Alt-Text fuer Barrierefreiheit. Als Contract-Gap zu markieren.

### Upload-Flow & Speicher-Seam
- **D-06:** Der Bild-Upload passiert **gesammelt beim Profil-Save** (Batch), nicht sofort bei Dateiauswahl. Nur tatsaechlich im finalen body_json referenzierte Bilder werden hochgeladen.
- **D-07:** Im Editor wird das Bild vor dem Save ueber eine lokale Browser-Object-URL (`URL.createObjectURL`) als Vorschau dargestellt. Der Node haelt solange einen temporaeren Marker; beim Save laedt der Client hoch, ersetzt den Marker durch die echte `media_asset_id`, dann wird body_json persistiert.
- **D-08:** Story-Bilder laufen ueber einen erweiterten **member-eigenen** Profil-Upload (analog `UploadOwnProfileAvatar`), Speicherung unter `/media/profile/{memberID}/story/{mediaID}`. Member-Ownership ist dadurch natuerlich gegeben (passt zur Eigentuemer-Pruefung D-03), kein Admin-Recht noetig. Jedes Story-Bild bekommt eine Zeile in der bestehenden `media_assets`-Tabelle mit Member-Owner-Bindung; die `media_asset_id` im Node referenziert genau diese Zeile.

### Editor- & Reader-UX
- **D-09:** Einfuegen ueber ein Bild-Icon in der TipTap-Toolbar → Dateiauswahl → Bild wird an der Cursor-Position eingefuegt. Direkt im Editor per Ziehgriff verkleiner-/vergroesserbar und repositionierbar. Die per Drag eingestellte Breite wird **relativ in % der Textbereichsbreite** im Node gespeichert (skaliert responsiv und im Public-Profil; robust gegen feste Pixelwerte).
- **D-10:** Bilder sind **Block-Level** (kein Textumfluss/float) und innerhalb der Spalte links, zentriert oder rechts ausrichtbar. Ausrichtung als Node-Attribut gespeichert.
- **D-11:** Das Bild-Feature wird per Prop/Flag **nur fuer die Profilgeschichte-Instanz** des `RichTextEditor` aktiviert (opt-in). Andere Editor-Flaechen bleiben unveraendert. Der geteilte Editor wird **nicht** geforkt (SC3 — kein paralleler TipTap-Sonderweg).
- **D-12:** Der `/me/profile`-Lesemodus rendert das Bild wie die spaetere Public-Darstellung (durch Phase 55 bereits gesetzt: Lesemodus = public-aehnliches Rendering aus serverseitigem body_html).

### Asset-Lifecycle / Cleanup-on-Save (Override von SC5)
- **D-13:** Wenn der Member seine Geschichte bearbeitet, ein Bild loescht und **speichert**, wird das Bild **sofort sauber entfernt** — aus dem Dateispeicher (`/media/...`) UND aus der DB (`media_assets`-Zeile). Mechanik: Backend vergleicht beim Save die zuvor persistierten Bild-Referenzen mit den neuen (Referenz-Diff); jedes Asset, das nicht mehr referenziert wird, wird Datei + DB-Zeile geloescht. Sicher, weil Story-Bilder member-eigen und einmalig genutzt sind. **Dies ueberschreibt ROADMAP-SC5.**
- **D-14:** Ein Bild, das eingefuegt, aber **vor** dem Save wieder entfernt wird, verursacht keinen Orphan — durch den deferred-Upload (D-06) wird es nie hochgeladen, es entsteht weder Datei noch `media_assets`-Zeile.

### Public-Profil-Integration
- **D-15:** Phase 70 stellt sicher und verifiziert, dass die Story-Bilder auch im oeffentlichen Member-Profil (Phase 59) korrekt und sanitisiert erscheinen. Da Public dasselbe serverseitige body_html nutzt, sollte das weitgehend automatisch greifen; Phase 70 prueft es explizit.

### Validierung & Sicherheit
- **D-16:** Erlaubte Formate: JPG, PNG, WebP. **Kein GIF** (kein animiertes/ablenkendes Bild im Profil). Anlehnung an bestehende Avatar-/Media-MIME-Validierung.
- **D-17:** Maximale Dateigroesse pro Bild: **10 MB**.
- **D-18:** **Keine** harte Obergrenze fuer die Anzahl Bilder pro Geschichte (nur Format/Dateigroesse begrenzen). Hinweis fuer Planner: gegen bestehende TipTap-Dokumentgroessen-/Node-Validierung abgleichen, dass sehr grosse body_json nicht unbeabsichtigt erlaubt werden.
- **D-19:** Hochgeladene Story-Bilder werden serverseitig auf eine sinnvolle Maximalbreite herunterskaliert/optimiert (govips, wie Release-Version-Media) und durchlaufen das bestehende Upload-Sicherheits-Hardening (EXIF-Strip, Dekompressions-Bomb-Schutz aus Quick-Task 260510-t7j) **zwingend**.
- **D-20:** Die erweiterte Phase-41-bluemonday-Policy und der HTML-Renderer-Walker erlauben fuer `<img>` nur: das serverseitig aus der `media_asset_id` erzeugte `src`, die Breite in `%`, und eine kontrollierte Ausrichtungs-Klasse (z.B. `align-left`/`-center`/`-right`). Alles andere (`style`, `on*`, externe URLs, freie Klassen) wird verworfen.

### Test- & UAT-Schwerpunkte (vom User priorisiert)
- **D-21:** Round-Trip Save/Reload: Bild einfuegen, %-Breite/Ausrichtung setzen, speichern, neu laden — Bild, Breite und Ausrichtung bleiben exakt erhalten.
- **D-22:** Cleanup-on-Save: Bild entfernen + speichern → Datei im `/media`-Store UND `media_assets`-Zeile sind danach physisch weg; verbleibende Bilder unberuehrt.
- **D-23:** Sicherheit/IDOR + Sanitizing: fremde `media_asset_id` beim Save abgelehnt; manipuliertes Client-HTML/fremde `src`/`<script>` werden serverseitig verworfen; nur erlaubte `<img>`-Struktur ueberlebt.
- **D-24:** Public-Darstellung: gespeicherte Story-Bilder erscheinen korrekt und sanitisiert im oeffentlichen Member-Profil (Phase 59).

### Claude's Discretion
- Exakter Mechanismus der opt-in-Aktivierung (Prop/Flag/Extension-Konfiguration) fuer den geteilten Editor — solange das Feature nur in der Profilgeschichte erscheint und der Editor nicht geforkt wird.
- Konkrete Maximalbreite fuer die serverseitige Optimierung und das exakte 10-MB-Hardening-Detail (aus bestehender Validierung uebernehmen).
- Genaues DB-/Migrationsdetail der Member-Owner-Bindung auf `media_assets` (append-only, sauber/reversibel; bestehende Migrationsnummern und untracked Migrationen vor neuer Migration pruefen — analog Phase-55 D-13).
- Ob fuer "keine harte Bildanzahl-Grenze" dennoch eine grosszuegige technische Schutzgrenze gegen Missbrauch gesetzt wird.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Workflow & Scope
- `AGENTS.md` — Projektregeln, GSD-Workflow, API-/UI-/Validierungsanforderungen, Umlaut-Regel, Stop Conditions.
- `CLAUDE.md` — Constraints (Brownfield, 450-Zeilen-Limit, member-eigene Datenhoheit, UX-Aufmerksamkeit, Umlaut-Sprachqualitaet).
- `.planning/ROADMAP.md` — Phase-70-Ziel und Success Criteria. **Achtung:** SC1 (Alt/Caption) und SC5 (Cleanup) muessen gemaess D-05/D-13 angepasst werden.
- `.planning/STATE.md` — Projektzustand, Roadmap Evolution, Phase-55/59-Kontext.

### TipTap-Stack & Vorgaengerphasen
- `.planning/phases/55-sichere-tiptap-persistenz-fuer-profilgeschichte/55-CONTEXT.md` — sichere TipTap-Persistenz der Profilgeschichte, Lese-/Bearbeitungsmodus, body_json/html/text-Pattern, Datenhoheit, Migrations-/Testdaten-Regeln (D-10..D-13).
- `.planning/phases/41-globalen-tiptap-rich-text-editor-einfuehren/41-CONTEXT.md` — TipTap-Primaerformat, Node-/Mark-Allowlist, Sanitizing (bluemonday Custom Policy), Editor/Renderer, Color-Tokens, Migrationsstrategie.
- `.planning/phases/59-ffentliches-fansub-member-profil/59-CONTEXT.md` — oeffentliches Member-Profil; Ziel-Surface fuer die Bilddarstellung (D-15).
- `.planning/phases/53-rollenuebergreifendes-mein-profil-als-member-identity-hub/53-CONTEXT.md` — Profil-Hub-Datenhoheit und Rich-Text-Defer-Historie.
- `.planning/phases/49-zentraler-auth-api-client-und-token-lifecycle-h-rtung/49-CONTEXT.md` — zentrale Auth/API-Seam und tokenfreie UI-Regeln.

### Contracts & Architektur
- `shared/contracts/openapi.yaml` — kanonischer Profil-API-Vertrag (Profil-Read/Update + neuer Story-Bild-Upload-Endpunkt).
- `docs/engineering/implementation-contract.md` — Search-first, Reuse- und Duplikationsregeln.
- `docs/api/api-contracts.md` — OpenAPI-/DTO-/Frontend-Helper-/Backend-Contract-Abgleich.
- `docs/frontend/auth-api-client.md` — zentrale Auth/API-Client-Grenze und Refresh-Session-Verhalten.
- `docs/frontend/ui-system.md` + `docs/agent-guidelines-ui.md` — UI-Komponenten-/Control-Mapping- und lokale UI-Regeln.

### Bestehende Runtime-Seams (Bild-/Upload-/Media-relevant)
- `backend/internal/services/tiptap_service.go` — TipTap-Validierung, Node-/Mark-Allowlist, rekursiver JSON→HTML-Walker, Sanitizing, Text-Extraktion. **Hier muss der Image-Node ergaenzt werden.**
- `backend/internal/services/media_service.go` — zentrale Speicher-/MIME-Validierungs-/Dimensionslogik (`SaveUpload`, `detectMimeType`, `validateMimeForKind`, `decodeImageDimensions`, govips-Umfeld).
- `backend/internal/handlers/app_profile.go` — Profil-Read/Update-Handler und `UploadOwnProfileAvatar` (Vorlage fuer den member-eigenen Story-Bild-Upload, Pfad `/media/profile/{memberID}/...`).
- `backend/internal/models/member_profile.go` — Backend-Profil-DTOs (inkl. Avatar-Upload-Inputs als Analogie).
- `backend/internal/repository/member_profile_repository.go` — Profil-Aggregat und `members`-Persistenz.
- `frontend/src/components/editor/RichTextEditor.tsx` — geteilter TipTap-Editor + Toolbar. **Bild-Icon/Image-Extension opt-in hier ergaenzen (D-11).**
- `frontend/src/components/editor/RichTextRenderer.tsx` — sicherer HTML-Renderer fuer Lese-/Public-Ausgabe.
- `frontend/src/components/editor/ColorTokenExtension.ts` — Muster fuer eine eigene TipTap-Extension.
- `frontend/src/app/me/profile/page.tsx` + `components/ProfileStoryCard.tsx` + `components/profileFormTypes.ts` — Profil-Story-Editor, Dirty-State, Save-Flow (deferred Upload beim Save, D-06/D-07 hier verdrahten).
- `frontend/src/types/profile.ts` — Profil-DTOs/Update-Payload.
- `frontend/src/lib/api.ts` — zentrale API-/Auth-Seam, bestehende Upload-Helfer (`authorizedUploadXhr`, FormData-Muster), `getOwnProfile`/`updateOwnProfile`.

### Asset-/Upload-Vorbilder (Wiederverwendung)
- Release-Version-Media-Service (Phase 35/govips) als Vorbild fuer serverseitige Optimierung/Thumbnails und die `media_assets`-Nutzung (D-19, D-08).
- Quick-Task `260510-t7j` (Upload-Security-Hardening: EXIF-Strip, Dekompressions-Bomb-Schutz, `/media`-Security-Header) — **zwingend** anzuwenden (D-19).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RichTextEditor` / `RichTextRenderer` (Phase 41): geteilte Editor-/Renderer-Komponenten — Bild-Feature opt-in einhaengen, nicht forken.
- `ColorTokenExtension.ts`: Muster, wie eine eigene TipTap-Extension im Projekt strukturiert ist (Vorlage fuer die Image-Extension).
- `UploadOwnProfileAvatar` (`app_profile.go`): vollstaendiges Vorbild fuer member-eigenen Upload inkl. Pfadbildung `/media/profile/{memberID}/...`, MIME-Detection und Verzeichniserstellung.
- `media_service.go`: zentrale `SaveUpload`/MIME-/Dimensions-Logik; govips-Optimierung aus dem Release-Version-Media-Pfad.
- `authorizedUploadXhr` in `api.ts`: bestehender Upload-mit-Progress-/Refresh-Retry-Mechanismus fuer FormData-Uploads.

### Established Patterns
- TipTap-Datenhoheit (Phase 41/55): body_json = Wahrheit; body_html serverseitig erzeugt + sanitisiert; body_text abgeleitet. Image-Node folgt demselben Muster.
- Backend rekursiver JSON→HTML-Walker mit expliziter Node-`case`-Allowlist (`tiptap_service.go`) — Image-Node als neuer `case` + bluemonday-Policy-Erweiterung.
- Member-eigene Uploads sind ownership-gebunden ueber `/media/profile/{memberID}/...` und `media_assets`-Owner-Bindung.
- Append-only, saubere/reversible Migrationen; vor neuer Migration aktuelle/untracked Migrationsnummern pruefen (Phase-55 D-13).

### Integration Points
- TipTap-Service-Allowlist + Renderer (Backend) — neuer Image-Node-Case und Sanitizing.
- `RichTextEditor`-Toolbar (Frontend) — opt-in Bild-Icon + Image-Extension + Resize/Align-NodeView.
- Profil-Save-Flow (`page.tsx`/`api.ts`) — deferred Batch-Upload beim Save, Marker→ID-Tausch, Referenz-Diff fuer Cleanup-on-Save.
- Neuer Backend-Upload-Endpunkt fuer Story-Bilder + `media_assets`-Owner-Persistenz + Cleanup-on-Save-Logik beim Profil-Update.
- Oeffentliches Member-Profil (Phase 59) — Verifikation der Bilddarstellung aus demselben body_html.

</code_context>

<specifics>
## Specific Ideas

- Der User beschrieb die Einfuege-UX woertlich: Bild-Icon im TipTap-Editor → Bild auswaehlen → an der Cursor-/Textstelle eingefuegt → dort verkleinern/groesser ziehen oder an eine andere Stelle ziehen.
- Der User besteht auf **sofortigem, sauberem physischem Cleanup beim Save** (Datei + DB), nicht auf spaeterem Defer — explizite Abweichung von ROADMAP-SC5.

</specifics>

<deferred>
## Deferred Ideas

- **Alt-/Caption-Text fuer Story-Bilder:** vom User fuer Phase 70 bewusst gestrichen. Kandidat fuer eine spaetere Barrierefreiheits-/Rich-Media-Erweiterung.
- **Textumfluss (float) um Bilder:** als zu komplex/riskant verworfen; Block-Ausrichtung reicht fuer Phase 70.
- **Animierte GIFs in der Profilgeschichte:** ausgeschlossen.

### Reviewed Todos (not folded)
- `2026-05-28-profile-hub-content-activity-redesign.md` (Profile hub content activity redesign, score 0.9) — betrifft Profil-Hub-Inhalts-/Aktivitaetsredesign, nicht das Bild-Einfuegen; bleibt eigenes Vorhaben.
- `2026-05-28-contributor-owned-media-note-edit-delete.md` (Contributor owned media/note edit-delete, score 0.6) — Contributor-eigene Edit-/Delete-Flows fuer Medien/Notizen; ausserhalb der member-eigenen Profilgeschichte.

</deferred>

---

*Phase: 70-tiptap-bilder-fuer-member-profilgeschichte*
*Context gathered: 2026-06-02*
