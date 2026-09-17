# Phase 162: Öffentliche Anime-Seite: Fansub-Gruppenauswahl, Kurzgeschichte und Navigation - Context

**Gathered:** 2026-09-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Auf `/anime/[id]` wird der Fansub-Bereich unter „Episoden (N)“ durch **eine** eindeutige Struktur ersetzt:
Filter-Chips (Auswahl des Fansub-Kontexts, „Alle“ nur bei 2+ Gruppen, im URL-Zustand teilbar) → bei konkreter
Gruppe ein gruppenspezifischer Bereich (Name, 3-Zeilen-Kurzgeschichte aus der bestehenden öffentlichen
Fansub-Geschichte, „Mehr lesen →“, „Zur Fansub-Gruppe“, „Zum Projekt“) → die bestehende Folgen-/Versionsliste.
Alle heutigen redundanten Gruppen-Elemente entfallen. Der vollständige Auftrag steht in `162-USER-REQUEST.md`
(§1–§17) und ist verbindlich; die Entscheidungen unten lösen dessen offene Prüfpunkte auf und haben bei
Widerspruch Vorrang.

Nicht in Scope: Coop-Kennzeichnung in der Versionszeile, neue Coop-Entität, Datenänderungen durch Agenten.

</domain>

<decisions>
## Implementation Decisions

### Auswahlzustand, URL und Historie
- **D-01:** Die URL ist die **einzige** Quelle des Gruppenkontexts. Die localStorage-Persistenz (`anime:<id>:fansub-filter`) und der `storage`-Event-Multitab-Sync aus Phase 159 D-02 werden **entfernt** (ersetzt, nicht parallel). Folge im Alltag: Wer eine Anime-Seite mit 2+ Gruppen ohne Parameter öffnet, sieht immer „Alle“ — die zuletzt gewählte Gruppe wird nicht mehr erinnert.
- **D-02:** URL-Parameter `?fansub=<fansub_group.slug>` (Slug, nicht ID). Nur bei 2+ Gruppen geschrieben. Ungültiger/entfernter/umbenannter Slug → „Alle“ (kein Fehler, keine Umleitung nötig; Parameter darf beim nächsten Chip-Klick überschrieben werden). Bei genau einer Gruppe wird der Parameter ignoriert und die Gruppe ist aktiv. „Alle“ = Parameter entfernt. Andere Query-Parameter (`from`, `grid_query`) bleiben beim Wechsel erhalten.
- **D-03:** Chip-Klick erzeugt einen **neuen Historieneintrag (push)**, ohne Scroll-Sprung (`scroll: false`). Browser Zurück/Vor stellt die jeweils vorherige Auswahl wieder her. Ein Gruppenwechsel erzeugt weiterhin **keine** neuen fachlichen Datenrequests (Phase 159 D-02 bleibt in diesem Punkt gültig) — Umsetzung so, dass der Server-Render der Seite nicht erneut alle Daten lädt (z. B. clientseitige URL-Aktualisierung ohne RSC-Neuladen; der konkrete Mechanismus ist Research-Aufgabe und muss belegt werden).
- **D-04:** SSR-Determinismus: Die Initialauswahl ergibt sich aus Gruppenliste + `searchParams.fansub` bereits serverseitig (kein Hydration-Flackern von „Alle“ auf die Gruppe).

### Kurzgeschichte
- **D-05:** Quelle ist die **erste** öffentliche, veröffentlichte Geschichte der Gruppe aus `fansub_group_notes` (dieselbe Filterung/Sortierung wie `listPublicFansubStories`: `visibility='public'`, `status='published'`, `deleted_at IS NULL`, `ORDER BY sort_order, id`). Angezeigt wird nur **`body_text`** (reiner Text) — kein HTML, kein `RichTextRenderer`, kein Editor-Code auf der Anime-Seite; der Geschichtstitel wird nicht gezeigt. Ist `body_text` leer, gilt die Gruppe als „ohne Geschichte“ (§7).
- **D-06:** Darstellung per CSS `line-clamp: 3`. Serverseitig darf der Vorschautext auf eine sinnvolle Obergrenze gekürzt werden, damit nicht komplette lange Geschichten im Payload landen (Grenze: Planner/Research).
- **D-07:** Die bisherige Faktenzeile („gegründet … • Land • Status“, `buildFansubStoryPreview`) und der Platzhalter „Keine Historie hinterlegt.“ **entfallen** auf der Anime-Seite. Ob `buildFansubFactSummary` anderswo noch genutzt wird, prüft Research; ungenutzter Code wird nur entfernt, wenn er ausschließlich hierfür existierte.
- **D-08:** „Mehr lesen →“ verlinkt auf `/fansubs/<slug>#geschichte` (Anker existiert in `FansubStorySection`). Nur gerendert, wenn eine Geschichte vorhanden ist.

### Chips, Episodenliste und Navigation
- **D-09:** Die Gruppenwahl **filtert weiter** die Folgen-Versionen wie heute (`getSummaryVersion` / `groupMatchedVersions`). „Alle“ = kein Gruppenfilter (Standardversion als Zusammenfassung, alle Versionen sichtbar). Eine Coop-Version erscheint bei jeder beteiligten Gruppe (bestehende `release_version_groups`/`fansub_groups[]`-Semantik).
- **D-10:** Position: unter der Überschrift „Episoden (N)“, vor der Folgenliste. Reihenfolge: Überschrift → „Fansub-Gruppe“-Label + Chips → gruppenspezifischer Bereich → Folgen. Ersetzt am selben Ort den grauen `fansubRow`-Chip und den heutigen Umschalter.
- **D-11:** Chip-Reihenfolge = bestehende fachliche Reihenfolge des Endpunkts `ListAnimeFansubs` (`ORDER BY afg.is_primary DESC, fg.name ASC`); „Alle“ steht vorn. Keine neue Sortierung.
- **D-12:** „Zur Fansub-Gruppe“ → `/fansubs/<slug>`. „Zum Projekt“ → `buildPublicFansubProjectPath(groupSlug, animeSlug)` (`/fansubs/<slug>/fansubprojekt/<animeSlug>`). **Fehlt ein kanonischer Pretty-Pfad (Gruppen- oder Anime-Slug leer), wird „Zum Projekt“ nicht gerendert** — kein Fallback auf die technische Route `/anime/<id>/group/<groupId>`. (Heutiger Bestand: alle 3 Anime haben Slugs → praktisch immer sichtbar.) Beide Ziele sind echte `<Link>`-Elemente, getrennt von den Chips.
- **D-13:** Entfernt/ersetzt werden: grauer Chip-Link `fansubRow` in `page.tsx`, verlinkter Story-Titel in `ActiveFansubStory`, Umschalt-Buttons in `FansubVersionBrowser`, CTA „Gruppenbereich“ (inkl. `aria-label="Zum Gruppenbereich"`). Der Gruppenname im gruppenspezifischen Bereich ist **Überschrift ohne Link**. Keine alte und neue Lösung parallel.

### Coop und Testdaten
- **D-14:** Coop: keine eigene Entität, kein Coop-Chip; Gruppen kommen aus `anime_fansub_groups`. Testdaten (Coop-Release-Version, Logo, Geschichten) legt **der Auftraggeber selbst** an; Agenten ändern keine produktiven Daten. Automatische Tests decken A–L mit Fixtures ab; die Browser-Verifikation der Coop-/Logo-/Geschichte-Fälle wartet auf die Daten des Auftraggebers (vorhandener Bestand: Anime 1 = 1 Gruppe mit Logo, Anime 2 = 3 Gruppen ohne Logo, Anime 3 = 1 Gruppe, 0 Coop-Versionen).

### Claude's Discretion
- Konkreter Mechanismus der URL-Aktualisierung (Next.js `router.push` mit `scroll:false` vs. `history.pushState` + `useSearchParams`-Sync), solange D-03 (kein Daten-Refetch, Back/Forward korrekt) belegt ist.
- Additive Contract-Erweiterung für den Story-Vorschautext: Feldname und Ort (z. B. `story_preview` am `FansubGroupSummary` von `GET /api/v1/anime/{id}/fansubs`), per **einer** gebündelten Abfrage (LATERAL/DISTINCT ON), kein N+1, Go-Model + OpenAPI + TS-Typ synchron.
- Chip-Komponente: `@/components/ui` hat kein Chip-Primitive (nur `Badge`); Chips müssen trotzdem auf globalen Primitives/Tokens basieren (z. B. `Button`-Primitive mit `aria-pressed` oder begründete Primitive-Erweiterung). Native `<button>` im Feature-Code ist verboten — UI-SPEC/Planner entscheiden, ob ein Chip-Variant ins Primitive gehört.
- Semantik der Chip-Gruppe (Toggle-Buttons mit `aria-pressed` in `role="group"` mit Label „Fansub-Gruppe“ vs. Radio-Gruppe), solange Tastatur, Fokus und Accessible Names §14 erfüllen.
- Logo 20 px über die vorhandene `logo_url`/`resolveLogoUrl`-Quelle; Chip-Name mit `text-overflow: ellipsis`/max-width gegen Overflow.
- Verhalten des Bereichs, wenn `getGroupedEpisodes` fehlschlägt (Fallback-Liste in `page.tsx`): Chips/Gruppenbereich dürfen dort ebenfalls erscheinen oder entfallen — konsistent und ohne tote Filter.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auftrag und Vorgeschichte
- `.planning/phases/162-oeffentliche-anime-seite-fansub-gruppenauswahl-kurzgeschichte-navigation/162-USER-REQUEST.md` — vollständiger Auftrag §1–§17 inkl. Testfälle A–L, Browser-Matrix, Abschlussbericht-Pflichtpunkte
- `.planning/phases/160-oeffentliche-anime-detailseite-nachschaerfen-tags-anzeigen-g/160-LIVE-UAT-BEFUNDE.md` — Befunde 2–4 (vier Gruppennamen-Stellen, Coop-Datenmodell, Ist-Umschaltung)
- `.planning/phases/159-public-anime-detail-konsolidierung/159-CONTEXT.md` — D-02 (gemeinsamer Gruppenzustand; localStorage-Teil wird durch D-01 hier abgelöst, „kein Refetch bei Wechsel“ bleibt)
- `.planning/phases/158-public-anime-detail-reparatur/158-CONTEXT.md` — P158-07 kanonischer Pretty-Link aus autoritativen Slugs

### Projektregeln
- `CLAUDE.md` — globale UI-Primitives Pflicht, echte Umlaute, ≤450 Zeilen pro Produktionsdatei
- `frontend/eslint.config.mjs` — `no-restricted-syntax` für native Form-Elemente

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/lib/fansubProjectRoutes.ts` — `buildPublicFansubProjectPath` (Projektziel)
- `frontend/src/components/fansubs/FansubVersionBrowser.tsx` — heutiger Zustandsbesitzer (Auswahl, Filterlogik `getSummaryVersion`, `resolveLogoUrl`, Load-more); wird umgebaut, nicht dupliziert
- `frontend/src/components/fansubs/ActiveFansubStory.tsx` (+ `.module.css`) — wird zum gruppenspezifischen Bereich umgebaut oder ersetzt
- `frontend/src/lib/fansub-summary.ts` — `buildFansubStoryGroups` (N+1-freie Gruppenliste aus der Relation); Faktenzeilen-Helfer entfallen für diese Seite
- `frontend/src/app/suche/useDebouncedSearch.ts` — bestehendes Query-Param-Pattern (`useSearchParams` + `router.replace`, URL = Source of Truth)
- `frontend/src/components/fansubs/FansubStorySection.tsx` — Anker `id="geschichte"`, Story-Datenform `PublicFansubStory {title, body_html, body_text}`

### Established Patterns
- Gruppenliste: `GET /api/v1/anime/{id}/fansubs` → `backend/internal/repository/fansub_repository.go` `ListAnimeFansubs` (Order `is_primary DESC, name ASC`), liefert `FansubGroupSummary {id, slug, name, logo_url, founded_year, dissolved_year, country, status}` — **kein** Geschichtstext → additive Erweiterung nötig.
- Geschichten: `fansub_repository.go` `listPublicFansubStories` (pro Gruppe, nur im Profil-Load) — Filter/Sortierung für D-05 übernehmen, aber gebündelt für alle Gruppen des Anime.
- Coop: `release_version_groups` mit mehreren Gruppen; Versionen tragen `fansub_groups[]`.

### Integration Points
- `frontend/src/app/anime/[id]/page.tsx` (324 Zeilen) — `searchParams` um `fansub` erweitern, `fansubRow` entfernen, Props an den Browser
- `frontend/src/types/fansub.ts`, `backend/internal/models/fansub.go`, `shared/contracts/openapi.yaml` — additive Contract-Änderung
- Tests: `FansubVersionBrowser.test.tsx`, `frontend/src/app/anime/[id]/page.test.tsx`, `fansub_repository_test.go`

</code_context>

<specifics>
## Specific Ideas

- Layout-Skizzen aus §1/§5 des Auftrags sind die Zielbilder (Label „Fansub-Gruppe“, Chips, darunter Name → 3 Zeilen → „Mehr lesen →“ → [Zur Fansub-Gruppe] [Zum Projekt]).
- Aktiver Chip: Hintergrund + Rahmen über vorhandene Tokens, kein Primary-CTA-Stil; Wrap statt Scrollleiste.
- Beschriftungen exakt: „Fansub-Gruppe“, „Alle“, „Mehr lesen →“, „Zur Fansub-Gruppe“, „Zum Projekt“.

</specifics>

<deferred>
## Deferred Ideas

- Coop-Kennzeichnung in der Versionszeile (Badge „Coop“ / alle Gruppenlogos statt nur des ersten) — eigener Backlog-Punkt (Befund 3 aus 160).
- Persönliche Merkfunktion der zuletzt gewählten Gruppe (bewusst entfernt durch D-01).
- Vorbekannter Fehler `fansub_groups.group_type` in `search_fansub.go` (160 deferred-items) — nicht Teil dieser Phase.

</deferred>

---

*Phase: 162-oeffentliche-anime-seite-fansub-gruppenauswahl-kurzgeschichte-navigation*
*Context gathered: 2026-09-17*
