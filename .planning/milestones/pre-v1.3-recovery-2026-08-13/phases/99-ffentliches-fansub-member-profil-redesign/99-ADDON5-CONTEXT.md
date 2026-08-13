# Phase 99 – Add-on 5: Öffentliche Fansub-Profilseite /fansubs/[slug] vervollständigen & polieren – Context

**Gathered:** 2026-07-08
**Status:** Ready for planning
**Source:** Nutzer-Live-UAT von `/fansubs/c-subs` (Screenshots + Feedback) + read-only Codebase-Analyse
**Scope note:** Folge-Scope zu Add-on 4, wird als zusätzliche Pläne `99-15+` an Phase 99 angehängt. ID-Namespace `AO5-*` (getrennt von D-01..D-20 und AO4-01..AO4-25). Decision-Coverage-Gate: `AO5-*` in `must_haves.truths` zitieren.

<domain>
## Phase Boundary

Die öffentliche Fansub-Profilseite `/fansubs/[slug]` (`frontend/src/app/fansubs/[slug]/page.tsx`) funktioniert, ist aber unvollständig und optisch grob: zwei vorhandene Datenquellen werden gar nicht angezeigt (Community-Links, Gruppen-Medien), die Reihenfolge passt nicht, und befüllte Sektionen sind ungepflegt (riesige unstimmige Kacheln, große nicht kürzbare Texte).

**Bewusst NUR diese eine Seite** (`/fansubs/[slug]`). KEINE Änderung an der Anime-Gruppenseite `/anime/[id]/group/[groupId]` oder der Member-Profilseite.

Add-on 4 hatte Medien-/Externe-Mitwirkende-Layout auf Gruppenseiten explizit ausgeklammert („nur Leer-Fall-Bereinigung"); Add-on 5 holt das gezielt für `/fansubs/[slug]` nach.
</domain>

<decisions>
## Implementation Decisions (locked)

### Backend / Public-DTO

- **AO5-01 (Community-Links im Public-Profil):** `fansub_group_links` (`link_type` CHECK: `website`,`discord`,`twitter`,`github`,`irc`; `name` nullable; `url`) über das bestehende `ListGroupLinks` (`backend/internal/repository/fansub_repository.go:610`) in das Public-Profil laden. Neues Feld `CommunityLinks []FansubGroupLink` in `models.PublicFansubProfileResponse` (`backend/internal/models/fansub.go:64-71`) ergänzen und in `GetPublicProfileBySlug` (`fansub_repository.go:244-282`) befüllen. OpenAPI (`shared/contracts/`) + TS-Typ `PublicFansubProfile` (`frontend/src/types/fansub.ts:180-186`) konsistent. Go-Struct/TS `FansubGroupLink` existieren bereits (`models/fansub.go:144-151`, `fansub.ts:12-19`).

- **AO5-02 (Medien-Felder im Public-DTO + Soft-Delete-Bugfix):** `PublicFansubMediaItem` (`models/fansub.go:104-111`, TS `fansub.ts:171-178`) um `title`, `description`, `category` erweitern. Im Public-Query `listPublicFansubMedia` (`fansub_repository.go:388-446`) zusätzlich `fgm.title`, `fgm.description`, `fgm.category` selektieren (`:390-396`) und im Scan (`:424-433`) mappen. **Bugfix:** WHERE (`:404-410`) um `AND fgm.deleted_at IS NULL` ergänzen (soft-gelöschte, ehemals public/approved Medien dürfen nicht mehr erscheinen). Bestehende Filter beibehalten: `ma.status='ready' AND visibilities.name='public' AND review_statuses.code='approved'` + Logo/Banner-Ausschluss. `media_type` bleibt aus `media_types.name`; der **Typ-Tag** kommt neu aus `category`.

### Frontend `/fansubs/[slug]`

- **AO5-03 (Reihenfolge):** Neue Sektions-Reihenfolge in `page.tsx`: **Hero → Geschichte → Laufende Projekte → Team → Erfolge → Medien**. (Kehrt die AO4-06-Reihenfolge bewusst um — vom Nutzer so entschieden.) `emptyAreaLabels`/`buildEmptyAreaLabels` (`page.tsx:39-62`) entsprechend anpassen: „Medien" nur dann als Leer-Hinweis, wenn wirklich keine öffentlichen Medien vorhanden sind (sonst wird die neue Medien-Sektion gerendert); „Mehr" nur, wenn weder website_url noch Community-Links vorhanden.

- **AO5-04 (Geschichte mit Clamp/Einklappen):** Die lange Gruppen-Geschichte (`FansubStorySection`) erhält eine kürzbare Darstellung (Clamp mit „Mehr anzeigen"/„Weniger anzeigen"-Umschalter), damit der Text nicht die halbe Seite einnimmt. Muster analog zum vorhandenen Member-Profil-Story-Clamp (Phase-99-Kern). Über `@/components/ui`-Primitives.

- **AO5-05 (Community-Links-Sektion):** Neue Sektion, die die `community_links` (AO5-01) als kompakte, extern verlinkte Chips/Buttons je `link_type` mit deutschem Label (Discord, IRC, Webseite, Twitter/X, GitHub) und optionalem `name` rendert. Nur `@/components/ui`-Primitives. Nur rendern, wenn Links vorhanden.

- **AO5-06 (Medien-Sektion):** Neue Sektion am Seitenende: Grid aus den `media` (AO5-02) mit Thumbnail, **Titel**, **Beschreibung** und **Typ-Tag** (deutsches Label aus `category`). `loading="lazy"` + Skeleton/Platzhalter mit fester Aspect-Ratio (kein Layout-Sprung) + `srcset`/`sizes`. Nur `@/components/ui`-Primitives, nur Team4s-Tokens. Nur rendern, wenn Medien vorhanden. Kein Infinite Scroll nötig (Add-on-4-Regel: Infinite Scroll nur an den 3 definierten Stellen) — hier vollständige, aber überschaubare Liste; falls sehr viele, „Mehr anzeigen"-Umschalter statt Infinite Scroll.

- **AO5-07 (Visuelle Politur befüllter Sektionen):** Konsistente Kachelgrößen und Abstände über alle Sektionen (Projekte, Team, Erfolge, Medien) — keine riesigen unstimmigen Kacheln. Textgrößen im bestehenden Team4s-Tokensystem, keine überdimensionierten Blöcke. KEINE neuen CSS-Klassen mit Ad-hoc-Farbwerten außerhalb des Tokensystems.

- **AO5-08 (Deutsche Enum-Labels):** Zentrale Label-Maps (Frontend):
  - `category` → Label: `gallery`=Galerie, `history_screenshot`=Historische Screenshots, `old_website`=Alte Website, `forum`=Forum, `irc_chat`=IRC-Chat, `event_meeting`=Event / Treffen, `artwork_fanart`=Artwork / Fanart, `other`=Sonstiges.
  - `link_type` → Label: `website`=Webseite, `discord`=Discord, `irc`=IRC, `twitter`=Twitter/X, `github`=GitHub.

### Claude's Discretion
- Genaue Chip-/Grid-Gestaltung, Clamp-Zeilenzahl, Skeleton-Markup, Icon-Wahl je link_type (nur lucide-react + @/components/ui), ob AO5-06 „Mehr anzeigen" ab N Medien greift, Aufteilung großer Komponenten zur Einhaltung des 450-Zeilen-Limits.
</decisions>

<canonical_refs>
## Canonical References

### Backend
- `backend/internal/repository/fansub_repository.go` — `GetPublicProfileBySlug:244`, `listPublicFansubMedia:388` (SELECT :390, WHERE :404, Scan :424), `ListGroupLinks:610`, `scanFansubGroupLink:1334`
- `backend/internal/models/fansub.go` — `PublicFansubProfileResponse:64`, `PublicFansubMediaItem:104`, `FansubGroupLink:144`, `LinkType`-Enum :16
- `backend/internal/handlers/fansub_groups.go` — `GetFansubPublicProfileBySlug:212`
- `backend/cmd/server/main.go:395` — Public-Profil-Route
- DB: `database/migrations/0044_...up.sql:111` (fansub_group_links), `0109_fansub_group_media_management.up.sql:3` (title/description/category/deleted_at), category-CHECK `:23-32`

### Frontend
- `frontend/src/app/fansubs/[slug]/page.tsx` — Reihenfolge :125-161, `buildEmptyAreaLabels:39`, `hasStoryContent:33`
- `frontend/src/components/fansubs/FansubStorySection.tsx` — Geschichte (Clamp-Ziel)
- `frontend/src/components/fansubs/FansubHeroSection.tsx`, `FansubProjectsSection.tsx`, `FansubTeamSection.tsx`, `FansubHistorySection.tsx`
- `frontend/src/types/fansub.ts` — `PublicFansubMediaItem:171`, `PublicFansubProfile:180`, `FansubGroupLink:12`
- `frontend/src/lib/api.ts` — `getPublicFansubProfileBySlug`
- Member-Profil-Story-Clamp als Muster: `frontend/src/components/profile/MemberStorySection.tsx`
- Design-System: `@/components/ui` (Pflicht), Showcase `/dev/ui-system`
</canonical_refs>

<scope_fence>
## Scope Fence

**Erlaubt / Pflicht:**
- Nur `/fansubs/[slug]` + zugehöriger Public-DTO-Pfad.
- `@/components/ui`-Primitives für jede UI; ≤450 Zeilen; korrekte deutsche Umlaute; nur Team4s-Tokens (keine Ad-hoc-Farben).
- Medien-Bilder: `loading="lazy"` + Skeleton + `srcset`/`sizes`.

**Ausgeschlossen:**
- KEINE Änderung an `/anime/[id]/group/[groupId]` oder der Member-Profilseite.
- KEINE Datenmodell-Änderung außer additiven DTO-Feldern + dem `deleted_at`-Filter-Bugfix (AO5-02); keine Migration.
- Kein Infinite Scroll auf `/fansubs/[slug]` (Add-on-4-Regel: nur an den 3 definierten Stellen).
- Keine neuen Farbwerte/CSS-Klassen außerhalb des Tokensystems.
</scope_fence>

<success_criteria>
## Success Criteria (Akzeptanz)

- Community-Links (Discord/IRC/Webseite/…) aus dem Fansub-Edit werden öffentlich auf `/fansubs/[slug]` angezeigt. [AO5-01/AO5-05]
- Gruppen-Medien werden öffentlich mit Thumbnail, Titel, Beschreibung und Typ-Tag angezeigt (nur public/approved/nicht-gelöscht). [AO5-02/AO5-06]
- Soft-gelöschte Medien erscheinen nicht mehr im Public-Profil. [AO5-02]
- Reihenfolge: Hero → Geschichte → Laufende Projekte → Team → Erfolge → Medien. [AO5-03]
- Lange Gruppen-Geschichte ist einklappbar/kürzbar. [AO5-04]
- Kachelgrößen/Abstände konsistent, keine überdimensionierten Texte; alles im Team4s-Tokensystem. [AO5-07]
- Lazy Loading + Skeleton + srcset für Medien-Bilder, kein Layout-Sprung. [AO5-06]
- Keine technische Fehlermeldung, keine nativen HTML-Formular-Elemente statt @/components/ui.
</success_criteria>

---

*Phase: 99 – Add-on 5 (angehängt)*
*Context gathered: 2026-07-08 (Nutzer-Live-UAT + read-only Analyse)*
