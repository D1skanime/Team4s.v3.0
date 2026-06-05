# Phase 79: Medien-Ownership in UI durchsetzen - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Über **alle bestehenden Upload-/Zuweisungs-Surfaces** wird die LOCKED
Media-Ownership-Matrix (Entscheidung 8 / Lock G) in der UI **erzwungen**: Ein
Upload ist eine *fachliche Entscheidung* mit **Owner-Typ, Owner-ID,
Medienkategorie, Sichtbarkeit und Reviewstatus** — sichtbar gemacht und vor dem
Speichern verpflichtet. **Kein neuer Upload-Transport, keine neue Medienwelt,
keine Parallelmodelle** (Lock A): die fachliche Pflichtfeld-Schicht wird einmal
gebaut und die bestehenden Surfaces werden darauf gehoben, auf dem bereits
vorhandenen `authorizedUploadXhr`-Transport.

**Die 5 kanonischen Owner-Surfaces (Matrix, LOCKED):**

| # | Surface | UI/Komponente | Kanonische DB-Tabelle(n) |
|---|---|---|---|
| 1 | Fansub Branding/Group Media (Logo/Banner) | `MediaUpload.tsx` (`/admin/fansubs/[id]/edit`) | `fansub_group_media`, `fansub_groups.logo_id/banner_id`, `media_assets`, `media_files` |
| 2 | Anime Assets (Cover/Banner/Logo/Background/Video) | `AnimeJellyfinAssetUploadControls.tsx`, `createAssetUploadPlan.ts` | Anime-Slot-Spalten, `anime_background_assets`, `media_assets`, `media_files` |
| 3 | Release Theme Assets (OP/ED) | `ReleaseThemeAssetsSection.tsx` (Release-Drawer/Theme) | `release_theme_assets`, `themes`, `theme_segments`, `media_assets`, `media_files` |
| 4 | Release-Version Process Media (Screenshots/Karaoke/Outtakes) | `ReleaseVersionMediaSection.tsx`, `useReleaseVersionMedia.ts` | `release_version_media`, `media_assets`, `media_files` |
| 5 | Member Media (Avatar/Profil-Hintergrund/Story-Bilder) | `MemberAvatarCard.tsx`, `ProfileBackgroundCard.tsx` (`/me/profile`) | `members`, `media_assets.owner_member_id`, `media_files` |

**Explizit NICHT in Phase 79:**
- Kein neuer Upload-Transport / keine Umgehung von `authorizedUploadXhr` (Lock G).
- Kein zentrales `media_assets.owner_type`-Feld — Owner wird **pro Junction-Kontext
  komponiert** (Vorentscheidung [72-03], unverändert).
- Kein neues Quer-/Parallel-Kategoriemodell; kein zweiter Sichtbarkeits-/Status-
  Mechanismus neben Phase 72 (`visibilities` + `review_statuses`).
- Kein Owner-Typ-Umhängen/Re-Kategorisieren als eigener Review-Flow (das setzt auf
  Phase-78-Flagging auf; Phase 79 sorgt dafür, dass owner-lose/falsch eingeordnete
  Medien gar nicht erst entstehen).
- Keine Edit/Delete-Lifecycle-Verwaltung eigener Uploads (separater Contributor-
  Workspace-Slice, siehe Deferred).

**Abhängigkeit:** Phase 72 (Status-/Sichtbarkeits-Fundament: `visibility_id` +
`review_status_id` auf `media_assets`; Owner pro Junction), Phase 77/78 (Review-/
Readiness-Flächen, die den freigebenden Gegenpart bilden).

</domain>

<decisions>
## Implementation Decisions

### Sichtbarkeit & Status-Modell
- **D-01:** **Ein einzelnes „Status"-Dropdown mit 6 fachlichen Werten** in der UI:
  *intern / in Prüfung / öffentlich / abgelehnt / archiviert / entfernt*. Die UI
  abstrahiert die beiden gespeicherten Phase-72-Achsen (`visibilities` +
  `review_statuses`) zu **einem** bedienbaren Feld. Volle Zwei-Achsen-Darstellung
  wurde bewusst verworfen (zu viel UI).
- **D-02:** **Festes Mapping** der 6 Labels auf die zwei DB-Achsen (Hinweis: 5 der
  6 Labels sind faktisch Reviewstatus-Werte, nur *intern* vs. *öffentlich* ist die
  Sichtbarkeits-Achse):
  - `öffentlich` → `visibility=public` + `review_status=approved`
  - `intern` → `visibility=private` (nicht-öffentlich) + `review_status=approved`
  - `in Prüfung` → `review_status=in_review` + nicht-öffentliche Sichtbarkeit
  - `abgelehnt` → `review_status=rejected` + nicht-öffentlich
  - `archiviert` → `review_status=archived` + nicht-öffentlich
  - `entfernt` → `review_status=removed` + nicht-öffentlich

  Die exakte Mapping-Tabelle/Feldform ist im Planner zu fixieren; alle 6 Zustände
  müssen abbildbar bleiben und die Phase-72-Achsen kanonisch beschrieben werden.
- **D-03:** **Sicherer Default für jeden neuen Upload = „in Prüfung" + nicht-
  öffentlich.** Capability-Träger (Leader/Admin) dürfen im selben Flow direkt
  freigeben. Erfüllt SC2 strukturell (ohne aufgelösten Owner-Kontext wird nichts
  öffentlich). Ausnahme für Branding-Slots siehe D-09.
- **D-04:** **Freigeben/Öffentlich-Setzen bleibt primär der Phase-78-Review-Fläche
  vorbehalten.** Der Upload-Flow erzwingt die Pflichtfelder mit sicherem Default;
  die reguläre Öffentlich-Freigabe geschieht im Review. (Berechtigte dürfen laut
  D-03 abkürzen — der kanonische Freigabe-Ort bleibt aber der Review.)

### Owner-Kontext
- **D-05:** **Owner-Typ + Owner-ID als read-only Hinweis-Chip/Banner** im Upload-
  Bereich (z. B. „Upload für: Gruppe «X» · Owner-Typ: Gruppe"). Der Owner folgt
  **fix aus der Fläche** ([72-03]); er ist nie eine freie Auswahl, wird nur
  bestätigt sichtbar gemacht.
- **D-06:** **Upload hart blockieren, wenn Owner-Typ/-ID nicht auflösbar ist**
  (verständliche Fehlermeldung, kein technischer Fehler). Owner-lose Medien
  entstehen gar nicht erst (SC1/SC2).

### Konsistenz / gemeinsame Schicht
- **D-07:** **Eine gemeinsame, wiederverwendbare Pflichtfeld-/Owner-Kontext-
  Komponente**, die alle Upload-Surfaces einbinden (Owner-Hinweis + Kategorie +
  Status + optionale Beschreibung/Rechtehinweis). Ein Ort für die Matrix-Regeln,
  weniger Drift (SC5). Je Surface nur Owner-Typ + Kategorie-Vokabular konfiguriert.
  Aufsetzend auf dem **bestehenden** `authorizedUploadXhr`-Transport (kein neuer
  Transport).

### Medienkategorie
- **D-08:** **Bestehendes Vokabular je Surface beibehalten, nur pflichtig +
  sichtbar machen** — kein neues Quer-Modell (Lock A):
  - `release_version_media`: `screenshot / typesetting_karaoke / fun_outtake / other`
  - Fansub Branding: `kind` = `logo / banner`
  - Theme: `theme_type` (opening/ending/insert)
  - Member: Slot (Avatar/Hintergrund/Story-Bild)
  Bei **Slot-Surfaces ist der Slot die Kategorie** (read-only angezeigt, kein
  Dropdown). Ein echtes Kategorie-**Dropdown** erscheint nur, wo es echte
  Mehrfach-Kategorien gibt (`release_version_media`).

### Durchsetzungstiefe je Surface
- **D-09:** **Zweiklassiges Modell** — Ownership wird überall erzwungen, die
  sichtbare Formular-Last variiert:
  - **Identity-/Branding-Slots** (Avatar, Profil-Hintergrund, Gruppen-Logo,
    Gruppen-Banner): Owner + Kategorie implizit/read-only, schlanker Flow,
    Beschreibung/Rechtehinweis optional. **Status-Sonderregel:** durch
    Eigentümer/Berechtigte hochgeladen ⇒ **sofort sichtbar/freigegeben** (kein
    „in Prüfung"-Zwischenschritt), da diese Medien per Definition die öffentliche
    Identität sind. SC2 bleibt gewahrt, weil der Owner-Kontext zwingend aufgelöst
    ist (D-06).
  - **Prozessmedien** (`release_version_media`, etwaige Galerien): **volles
    Pflichtfeld-Formular** (Kategorie-Dropdown, Status mit Default „in Prüfung"
    laut D-03, Beschreibung, optional Rechtehinweis).

### Claude's Discretion
- Exakte Mapping-Tabelle/Feldform für D-01/D-02 (ein Dropdown vs. interne
  Repräsentation), solange alle 6 Zustände abbildbar sind und SC2 gilt.
- Ob es zu Phase 79 überhaupt neue Spalten/Migrationen braucht oder ob das
  Bestehende ausreicht (`media_assets.visibility_id/review_status_id` aus Phase 72,
  `release_version_media.category`, `fansub_group_media.kind`, `theme_type`,
  `media_assets.owner_member_id`) — Researcher/Planner ermittelt; Default-Erwartung
  ist **schema-leicht** (Lock A, kein neues Medienmodell).
- CSS-Modul-Struktur, exakte Label-/Toast-/Empty-State-Texte, Capability-Fein-
  auflösung pro Surface, genaue Platzierung des Owner-Chips — Planner/Executor,
  solange D-01..D-09 und die v1.2-Locks (A/G/I/K) eingehalten werden.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Meilenstein-Entscheidungen (LOCKED — gelten für alle v1.2-Phasen)
- `.planning/milestones/v1.2-DISCUSSION.md` — verbindliche Entscheidungen A–K,
  insb. **Entscheidung 8 (Medien-Ownership, Matrix verbindlich)** mit Pflichtfeld-
  Liste und Nicht-Zielen, **Lock G** (Ownership-Matrix), **Lock I** (Rechte scoped,
  keine pauschalen Medienrechte), **Lock K** (Contract/API-Disziplin),
  **Lock A** (keine Parallelmodelle / kein neues Medienmodell). **MUST read.**

### Status-/Sichtbarkeits-Fundament (Phase 72) — Owner & Achsen
- `.planning/phases/72-dom-nen-projektionen-status-fundament/72-CONTEXT.md` —
  Sichtbarkeit + Review als **zwei Achsen**; **Owner pro Junction-Kontext
  komponiert, kein zentrales `media_assets.owner_type`** ([72-03]).
- `database/migrations/0097_v12_status_foundation.up.sql` — `visibility_id` +
  `review_status_id` auf `media_assets` (und `anime_contributions`); Lookup-Tabelle
  `review_statuses` (`in_review/approved/rejected/archived/removed`, dt. Labels).
- `database/migrations/0037_add_release_decomposition_tables.up.sql` §`visibilities`
  — Lookup-Werte: `public/registered/fansubber/staff/private`.
- `database/migrations/0090_member_story_images.up.sql` — `media_assets.owner_member_id`.
- `database/migrations/0059*` — `release_version_media` (Spalte `category`,
  `caption`, `is_preview_candidate`, `uploaded_by_user_id`).

### Review-/Pflege-Gegenpart (Phase 78)
- `.planning/phases/78-leader-workspace-review-pflege/78-CONTEXT.md` — **D-05/D-06**:
  Medienprüfung an der jeweiligen Owner-Fläche; Owner-Korrektheit wird *geflaggt,
  nicht umgehängt* (das Erzwingen beim Upload ist Phase 79). Sichtbarkeit/Review
  als Aktionsumfang.

### Systeminventar / Ownership / Runtime-Authority
- `docs/architecture/current-system-inventory.md` — Routen/API/DB/Ownership-Karte,
  Media-Ownership-Matrix, Duplication Traps.
- `docs/architecture/db-runtime-authority-map.md` — keine Read-Umstellung ohne
  Authority-Entscheid.
- `docs/architecture/db-schema-fansub-domain.md` — Domänenregeln Fansub/Release/Media.

### Contracts (Lock K — Pflicht vor Endpoint-/DTO-Änderungen)
- `shared/contracts/openapi.yaml` — Umbrella-Contract.
- `shared/contracts/admin-content.yaml` — admin-content-Projektionen (Medien-/
  Status-Felder), falls betroffen.
- `docs/api/api-contracts.md` — Contract-Regeln.
- `frontend/src/lib/api.ts` — zentraler API-Client/Transport; **kein ad-hoc-Fetch**.

### Upload-Transport & bestehende Surfaces (Reuse statt Neubau)
- `frontend/src/lib/api.ts` — `authorizedUploadXhr` (≈Z. 2173, geteilter Transport);
  Helfer: `uploadFansubMedia` (≈2256), `uploadAdminAnimeMedia` (≈4093,
  `/api/v1/admin/upload`), `uploadAdminReleaseThemeAsset` (≈4305),
  `uploadReleaseVersionMedia` (≈6074), `uploadOwnProfileStoryImage` (≈8112);
  `patchReleaseVersionMediaItem` (≈6090), `deleteFansubMedia` (≈2268).
- `frontend/src/components/admin/MediaUpload.tsx` (Surface 1, nur Logo/Banner).
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx`,
  `frontend/src/app/admin/anime/create/createAssetUploadPlan.ts` (Surface 2).
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeAssetsSection.tsx` (Surface 3).
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx`
  + `useReleaseVersionMedia.ts` (Surface 4).
- `frontend/src/app/me/profile/components/MemberAvatarCard.tsx`,
  `ProfileBackgroundCard.tsx` (Surface 5).

### Design-System (Pflicht)
- `frontend/src/components/ui/` — globale Primitives (`Select`, `FormField`,
  `Modal`, `Input`, `Textarea`, `Button`, `Card`, `Drawer` …) sind **Pflicht**
  (CLAUDE.md). Showcase: Route `/dev/ui-system`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`authorizedUploadXhr`** (`api.ts` ≈Z. 2173): geteilter Upload-Transport
  (Auth/401-Retry/Progress). **Wird wiederverwendet** — kein neuer Transport (D-07,
  Lock G). 6 Helfer setzen heute schon darauf auf.
- **Phase-72-Schema**: `media_assets.visibility_id` + `review_status_id` existieren
  bereits → tragen Sichtbarkeit/Reviewstatus zentral; jede Junction erbt darüber
  (D-01/D-02). `review_statuses`-Lookup geseedet; `visibilities`-Lookup vorhanden.
- **`release_version_media.category`** existiert bereits (typisiertes Enum) →
  Prozessmedien-Kategorie ist schon da (D-08).
- **`media_assets.owner_member_id`** (Migration 0090) → Member-Owner-Scope (Surface 5).
- **Globale UI-Primitives** (`@/components/ui`): `Select`/`FormField`/`Modal`/
  `Input`/`Textarea` für die gemeinsame Pflichtfeld-Komponente (D-07).

### Established Patterns
- **Owner pro Junction komponiert, kein zentrales `owner_type`-Feld** ([72-03]) →
  Owner-Chip wird aus der Fläche abgeleitet, nicht aus einer Spalte (D-05).
- **Sichtbarkeit = zwei Achsen** (Phase 72) → die 6-Werte-UI mappt auf beide (D-02).
- **Ein Transport, mehrere fachliche Wrapper**: heute hat jede Surface ihr eigenes
  Formular/Helper; Phase 79 vereinheitlicht die *fachliche* Schicht (D-07), nicht
  den Transport.
- **Lock K / Contract-zuerst**: OpenAPI + admin-content + DTO + Repo + `api.ts`
  gemeinsam; kein ad-hoc-Fetch, keine Token-Direktzugriffe.
- **450-Zeilen-Limit** (Modularity): neue Pflichtfeld-Komponente als eigene
  Datei(en); `MediaUpload.tsx` (540 Z.) und große Pages ggf. splitten beim Heben.
- **Deutsche Umlaute** in allen user-facing Strings (CLAUDE.md).

### Integration Points
- Gemeinsame Pflichtfeld-Komponente → in alle 5 Surfaces einbinden; jede liefert
  Owner-Typ/Owner-ID (aus Kontext) + Kategorie-Vokabular + Default-Status-Politik
  (D-03/D-09) hinein.
- Status-Persistenz → über `media_assets.visibility_id/review_status_id` (Phase 72)
  je Owner-Tabelle; Mapping D-02. Kategorie → je bestehender Surface-Spalte (D-08).
- Freigabe/Öffentlich → reguläre Phase-78-Review-Flächen (D-04); Branding-Slots
  Sofort-Sichtbarkeit (D-09).
- Blockier-Logik bei fehlendem Owner-Kontext → vor `authorizedUploadXhr`-Aufruf
  in der gemeinsamen Komponente (D-06).

</code_context>

<specifics>
## Specific Ideas

- Mentales Modell „ein Motor, mehrere Armaturenbretter": derselbe geteilte
  Transport (`authorizedUploadXhr`) unten, heute aber je Surface ein eigenes
  Formular oben — Phase 79 zieht die fachliche Owner-/Status-Schicht in **ein**
  gemeinsames Armaturenbrett.
- „Sichtbarkeit" ist bewusst **eine** bedienbare Auswahl mit 6 fachlichen Labels,
  obwohl darunter zwei DB-Achsen liegen — UX-Vereinfachung über ehrliches
  Datenmodell, ohne das Datenmodell zu verbiegen.
- Branding ist Identität: Avatar/Logo/Banner durch Berechtigte sind sofort die
  öffentliche Identität — kein Review-Umweg, aber Owner-Kontext zwingend.

</specifics>

<deferred>
## Deferred Ideas

- **Edit/Delete-Lifecycle eigener scoped Uploads** (Contributor-Workspace): eigener
  späterer Slice — Phase 79 erzwingt Ownership *beim Anlegen*, nicht das spätere
  Bearbeiten/Löschen.
- **Zentrale gruppenübergreifende Medien-/Owner-Übersicht**: gehört nach
  `/admin/users` / Phase 80 (Lock I), nicht in die Upload-Surfaces.
- **Owner-Typ-Umhängen/Re-Kategorisieren als Review-Aktion**: bleibt Flagging
  (Phase 78 D-05); ein echter Re-Owner-Flow wäre eine eigene spätere Phase.

### Reviewed Todos (not folded)
Folgende Todos matchten Phase 79 nur per generischem UI-Keyword bzw. sind
benachbart, gehören aber zu anderen Tracks und wurden NICHT gefaltet:
- `2026-05-28-contributor-owned-media-note-edit-delete.md` — Edit/Delete eigener
  scoped Uploads/Notes → Contributor-Workspace-Lifecycle (siehe Deferred oben),
  nicht Upload-Erzwingung.
- `2026-05-28-profile-hub-content-activity-redesign.md` — Profile-Hub Redesign →
  Member-Profil-Track.
- `2026-06-03-contribution-dropdown-auf-globale-ui-primitives-umstellen.md` →
  UI-Konsolidierungs-Track.
- `2026-06-03-credits-ui-konsolidierung-und-permission-bruecke.md` → Credits-Track.
- `2026-06-03-member-profil-ui-und-params-bug.md` → Member-Profil-Track.

</deferred>

---

*Phase: 79-medien-ownership-in-ui-durchsetzen*
*Context gathered: 2026-06-05*
