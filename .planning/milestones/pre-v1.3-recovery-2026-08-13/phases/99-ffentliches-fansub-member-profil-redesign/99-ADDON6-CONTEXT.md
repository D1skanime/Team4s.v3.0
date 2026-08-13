# Phase 99 – Add-on 6: Design-Polish & Skalierung der öffentlichen Fansub-Profilseite /fansubs/[slug] – Context

**Gathered:** 2026-07-09
**Status:** Ready for planning
**Source:** Nutzer-Design-Review (Mockups iterativ abgestimmt) + read-only Codebase-Analyse
**Scope note:** Folge-Scope zu Add-on 4/5, als zusätzliche Pläne `99-19+` an Phase 99 angehängt. ID-Namespace `AO6-*` (getrennt von D-01..D-20, AO4-*, AO5-*). Decision-Coverage-Gate: `AO6-*` in `must_haves.truths` zitieren.

<domain>
## Phase Boundary

Die öffentliche Fansub-Profilseite `/fansubs/[slug]` (`frontend/src/app/fansubs/[slug]/page.tsx`) ist funktional vollständig (Add-on 5), aber optisch grob und in mehreren Fällen nicht skaliert: leere Riesen-Kacheln, Doppel-Header, keine Bilder in Projekt-/Mitglieder-Karten, Community-Chips uneinheitlich, keine Medien-Lightbox, mehrere Geschichts-Blöcke werden verschluckt. Add-on 6 macht die Seite gestalterisch fertig und skalierbar (20 Mitglieder, 30 Projekte, 40 Medien).

**Bewusst NUR `/fansubs/[slug]`.** KEINE Änderung an `/anime/[id]/group/[groupId]`, Release-Detailseite oder Member-Profilseite. Keine eigene Unteransichts-Seite für Projekte/Medien — alles inline.

**Sektions-Reihenfolge (aus AO5-03 beibehalten):** Hero → Geschichte(n) → Projekte → Team → Meilensteine → Community → Medien.
</domain>

<decisions>
## Implementation Decisions (locked)

### Backend / Public-DTO (additiv, KEINE Migration)

- **AO6-01 (Anime-Banner für Projekt-Karten):** `PublicFansubProject` (`backend/internal/models/fansub.go`, TS `frontend/src/types/fansub.ts:152`) um ein Banner-URL-Feld erweitern. Quelle: `anime.banner_resolved_url` (aufgelöste URL für `provider`=Jellyfin **und** `manual`=Upload, `database/migrations/0039_add_anime_asset_slots.up.sql:2-5`). Im Query `listPublicFansubProjects` (`backend/internal/repository/fansub_repository.go:318-333`) zusätzlich `a.banner_resolved_url` selektieren (bei Bedarf via `banner_asset_id`→media_files auflösen). Fallback auf `cover_image` (Poster), wenn kein Banner. OpenAPI + TS konsistent.

- **AO6-02 (Medien-Reihenfolge Admin→öffentlich, Fix):** `listPublicFansubMedia` (`fansub_repository.go:395-422`) sortiert aktuell nach `ma.created_at ASC, ma.id ASC` und ignoriert das Admin-`fgm.sort_order`. Ändern zu `ORDER BY fgm.sort_order ASC, ma.created_at ASC, ma.id ASC`, damit die im Admin gesetzte Reihenfolge öffentlich übernommen wird. (`fansub_group_media.sort_order` existiert, `0109_...up.sql`.)

- **AO6-03 (Mehrere Geschichts-Blöcke):** `fansub_group_notes` ist mehrzeilig (`title`, `body_html`, `sort_order`, `visibility`, `status`, `0061_fansub_group_notes.up.sql:1`). `getPublicFansubStory` (`fansub_repository.go:291-308`) holt aber nur EINEN Block (`ORDER BY sort_order ASC ... LIMIT 1`) → weitere veröffentlichte Blöcke werden verschluckt. Umbau: `story` (einzeln) → `stories[]` (ALLE mit `visibility='public' AND status='published' AND deleted_at IS NULL`, `ORDER BY sort_order ASC, id ASC`). DTO (`PublicFansubProfileResponse.story` → `stories`), Handler, OpenAPI, TS-Typ (`PublicFansubProfile`) anpassen. ALLE Konsumenten von `profile.story`/`hasStoryContent` in `page.tsx` migrieren (`hasStoryContent` → prüft, ob mindestens ein Block Inhalt hat; `buildEmptyAreaLabels` „Geschichte" nur wenn `stories` leer).

### Frontend `/fansubs/[slug]` (Variante B, @/components/ui, nur Team4s-Tokens, ≤450 Zeilen)

- **AO6-04 (Variante B + entdoppelte Header):** Dichtes, ruhiges Layout. Pro Sektion EIN klarer Header (kein Eyebrow+Titel-Doppel wie „Laufende Projekte / Laufend" oder „Geschichte / Die Geschichte…"). Konsistente Kachelgrößen/Abstände, Textgrößen im Tokensystem.

- **AO6-05 (Mehrere Geschichts-Blöcke gerendert):** `stories[]` (AO6-03) als gestapelte Blöcke rendern, jeder mit eigenem **Titel** + eigenem **Clamp** („Mehr anzeigen"/„Weniger anzeigen"). Reihenfolge nach `sort_order`.

- **AO6-06 (Projekte: Banner + Lazy-Karussell):** **Laufende** Projekte oben als volle Banner-Karte(n) (16:9, Titel-Leiste-Overlay + Status-Pill). **Abgeschlossen/Archiviert** als **horizontales Karussell** (smooth `scroll-snap-type:x`, Pfeil-Buttons links/rechts + **Tastaturbedienung/A11y**) mit **Skeleton-Platzhaltern** während des Ladens und einer **„X weitere anzeigen"-Endkachel**, die restliche Karten **inline** aus dem bereits geladenen Datensatz einblendet (KEIN Auto-Infinite-Scroll, KEINE eigene Seite). Banner: `loading="lazy"` + `srcset`/`sizes`; Fallback Poster/Platzhalter. Bestehende Status-Gruppierung (`FansubProjectsSection`, ongoing/completed/archived) nutzen.

- **AO6-07 (Team: zweispaltig + klickbar + Einklappen):** Mitglieder als **zweispaltige** dichte Liste (2 Spalten Desktop, 1 Spalte Mobil via `auto-fit`). Aktive Mitglieder mit öffentlichem Profil **verlinken** zu `/members/[slug]` — Verlinkung **optisch klar erkennbar** (Akzent-Name + Chevron, Hover). Der Link-Code existiert bereits (`FansubTeamActiveGroup.tsx:12-22`, `member_slug`); nicht-öffentliche Mitglieder bleiben neutral (nicht klickbar). Historische Liste ab ca. 8–10 Einträgen **eingeklappt** mit „X weitere anzeigen".

- **AO6-08 (Historische Mitglieder: Rolle + Zeitraum):** Bei historischen Mitgliedern zusätzlich zur Rolle den **Zeitraum** anzeigen: „von–bis" aus `joined_year`/`left_year` (`DomainProjectionHistoricalRow`, `frontend/src/types/domain-projection.ts:27`), „seit JJJJ" wenn kein Enddatum. „unbestätigt"-Badge beibehalten. `FansubTeamHistoricalGroup.tsx:24-26` rendert aktuell nur die Rolle → Zeitraum ergänzen.

- **AO6-09 (Meilensteine farblich abheben):** Die Historie-/Erfolge-Einträge (`FansubHistorySection`) farblich absetzen (Akzent-Block/linke Kante) — nur bestehende Team4s-Tokens, keine Ad-hoc-Farben.

- **AO6-10 (Community-Links als einheitliche Chips):** Icon + Name in EINEM klickbaren Chip je link_type (aus Add-on 5 vorhandene `FansubCommunityLinksSection` verfeinern, falls nötig). Externe Links `rel="noreferrer noopener"`.

- **AO6-11 (Medien: gekappte Vorschau + Snippet):** Vorschau auf **5 Thumbnails** begrenzen, letzte Kachel als **Überlauf-Kachel „+X weitere"**; zusätzlich **„Alle N anzeigen"**-Button, der das Grid **inline batchweise** erweitert (kein Auto-Scroll). Pro Medium: Thumbnail, **Titel**, **Typ-Tag** (deutsches Label aus `category`, Add-on-5-Label-Map), plus **2-Zeilen-Beschreibungs-Snippet** (`line-clamp: 2` aus `description`). `loading="lazy"` + Skeleton (feste Aspect-Ratio) + `srcset`/`sizes`.

- **AO6-12 (Bild-Lightbox):** Klick auf ein Medien-Thumbnail öffnet eine **Lightbox** (Client-Komponente): **Originalbild** groß (`original_url`), **Weiter/Zurück** durch **alle** Medien der Gruppe (nicht nur die Vorschau), **voller** Titel + Beschreibung, Positions-Zähler („n / N"). Tastatur: `Esc` schließt, `←/→` navigiert; A11y: Fokus-Falle, `role="dialog"`/`aria-modal`, Fokus-Rückgabe. Keine Migration/Backend nötig (Felder im DTO vorhanden).

### Claude's Discretion
- Genaue Karussell-Mechanik (IntersectionObserver für Lazy/Skeleton, Scroll-Buttons-Scrollweite), Anzahl initial gezeigter Karussell-Karten, Clamp-Zeilenzahl der Geschichte, Batch-Größe „Mehr anzeigen", exakte Token-Zuordnung der Meilenstein-Akzentfarbe, Komponenten-Split zur Einhaltung des 450-Zeilen-Limits.
</decisions>

<canonical_refs>
## Canonical References

### Backend
- `backend/internal/repository/fansub_repository.go` — `GetPublicProfileBySlug:244`, `getPublicFansubStory:291` (→ stories), `listPublicFansubProjects:318` (+banner), `listPublicFansubMedia:395` (ORDER BY sort_order)
- `backend/internal/models/fansub.go` — `PublicFansubProfileResponse` (story→stories), `PublicFansubProject` (+banner), `PublicFansubStory`, `PublicFansubMediaItem`
- DB: `0039_add_anime_asset_slots.up.sql:2` (banner_resolved_url), `0109_fansub_group_media_management.up.sql` (sort_order), `0061_fansub_group_notes.up.sql` (multi-notes)
- `shared/contracts/openapi.yaml` — Public-Profil-Schemas

### Frontend
- `frontend/src/app/fansubs/[slug]/page.tsx` — Komposition :125, `hasStoryContent:33`, `buildEmptyAreaLabels:39`
- `frontend/src/components/fansubs/FansubProjectsSection.tsx` (Banner-Karussell), `FansubStorySection.tsx` (Clamp, mehrere Blöcke), `FansubTeamSection.tsx` / `FansubTeamActiveGroup.tsx:12` / `FansubTeamHistoricalGroup.tsx:24` (2-spaltig, klickbar, Zeitraum), `FansubHistorySection.tsx` (Meilensteine), `FansubCommunityLinksSection.tsx` (Chips), `FansubMediaSection.tsx` / `FansubGroupMediaBlock.tsx` (Vorschau 5 + Snippet + Lightbox-Trigger)
- `frontend/src/lib/fansub-labels.ts` — category/link_type-Label-Maps (Add-on 5)
- `frontend/src/types/fansub.ts` — `PublicFansubProject:152`, `PublicFansubMediaItem:171`, `PublicFansubProfile:180`
- `frontend/src/types/domain-projection.ts:27` — historische Felder (joined_year/left_year/role_labels/member_slug)
- Design-System: `@/components/ui`, Showcase `/dev/ui-system`
</canonical_refs>

<scope_fence>
## Scope Fence

**Erlaubt / Pflicht:** nur `/fansubs/[slug]` + zugehöriger Public-DTO-Pfad; `@/components/ui`-Primitives; ≤450 Zeilen (splitten); korrekte deutsche Umlaute; nur Team4s-Tokens; Bilder `loading="lazy"` + Skeleton + `srcset`/`sizes`; Karussell/Vorschau mit manueller „Mehr anzeigen"-Enthüllung.

**Ausgeschlossen:** KEINE Änderung an anderen Seiten (Anime-Gruppenseite, Release-Detail, Member-Profil); KEINE eigene Unteransichts-Seite für Projekte/Medien; KEINE Datenmodell-Änderung außer additiven DTO-Feldern (AO6-01) + Query-Anpassungen (AO6-02/03); keine Migration; KEIN Auto-Infinite-Scroll auf dieser Seite; keine neuen Farbwerte außerhalb des Tokensystems.
</scope_fence>

<success_criteria>
## Success Criteria (Akzeptanz)

- Projekt-Karten zeigen den **Anime-Banner** (Fallback Poster); bei vielen Projekten Lazy-Karussell mit „weitere anzeigen", keine eigene Seite. [AO6-01/AO6-06]
- Im Admin gesetzte **Medien-Reihenfolge** wird öffentlich übernommen. [AO6-02]
- **Mehrere** veröffentlichte Geschichts-Blöcke werden alle angezeigt (Titel + Clamp), keiner verschluckt. [AO6-03/AO6-05]
- **Aktive** Mitglieder mit öffentlichem Profil sind erkennbar **klickbar** → `/members/[slug]`; Liste zweispaltig, historische einklappbar. [AO6-07]
- **Historische** Mitglieder zeigen **Rolle + Zeitraum**. [AO6-08]
- **Meilensteine** heben sich farblich ab. [AO6-09]
- **Medien**: Vorschau auf 5 begrenzt + „+X weitere"/„Alle anzeigen", Titel + Typ-Tag + 2-Zeilen-Beschreibung; **Lightbox** öffnet Original mit Weiter/Zurück durch alle + vollem Text. [AO6-11/AO6-12]
- Keine überdimensionierten leeren Kacheln, keine Doppel-Header; alles Team4s-Tokens + @/components/ui. [AO6-04]
</success_criteria>

---

*Phase: 99 – Add-on 6 (angehängt)*
*Context gathered: 2026-07-09 (Nutzer-Design-Review + read-only Analyse)*
