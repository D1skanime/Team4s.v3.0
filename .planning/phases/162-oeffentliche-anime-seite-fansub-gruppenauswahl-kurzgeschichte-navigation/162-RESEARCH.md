# Phase 162: Öffentliche Anime-Seite: Fansub-Gruppenauswahl, Kurzgeschichte und Navigation - Research

**Researched:** 2026-09-17
**Domain:** Next.js 16 App Router Client-URL-Zustand + Go/Postgres additive Query-Erweiterung (kein neues externes Package)
**Confidence:** HIGH

## Summary

Diese Phase ist ein reiner Umbau bestehender Frontend-Komponenten (`FansubVersionBrowser.tsx`,
`ActiveFansubStory.tsx`, `page.tsx`) plus eine additive Backend-Query-Erweiterung
(`ListAnimeFansubs`) — **kein einziges neues npm/Go-Package** wird benötigt. Der technisch
kniffligste Punkt (D-03/D-04: URL-Zustand ohne Server-Refetch, aber SSR-deterministische
Erstauswahl) hat eine von Next.js 16 offiziell dokumentierte Lösung: `window.history.pushState`/
`replaceState` direkt aufrufen (nicht `router.push`/`router.replace`). Seit Next.js 14.1 sind
diese nativen History-API-Aufrufe in den App-Router integriert und synchronisieren
`useSearchParams()`/`usePathname()`, ohne einen Server-Component-Refetch auszulösen — anders als
`router.push`/`router.replace`, die auf einer bereits dynamischen Route (diese Seite liest schon
heute `searchParams.grid_query`/`from`) bei jeder Navigation einen frischen RSC-Fetch erzwingen
würden, weil dynamische Routen einen Router-Cache-`staleTime` von 0 haben. `frontend/src/app/suche/
useDebouncedSearch.ts` ist bewusst KEIN Vorbild für den Mechanismus (es nutzt `router.replace`),
weil `/suche` clientseitig gerendert wird (`SearchResults` liest `useSearchParams()` selbst) und
keine Server-Component-Props aus `searchParams` bezieht — die Anime-Detailseite dagegen ist eine
async Server Component, die `searchParams` bereits für die Erstauswahl braucht (D-04).

Backend: `ListAnimeFansubs` bekommt einen additiven `LEFT JOIN LATERAL`-Zweig auf
`fansub_group_notes` (dieselbe Filterung wie `listPublicFansubStories`, `LIMIT 1`) — eine einzige
Query, kein N+1. Die Feldergänzung (`story_preview`) muss additiv in `FansubGroupSummary` (Go
Model, TS-Typ, OpenAPI-Schema) eingetragen werden; dieses Schema wird an mehreren weiteren Stellen
wiederverwendet (Release-Versionen, Projekt-Resolution) — dort bleibt das Feld einfach leer
(`omitempty`), da nur `ListAnimeFansubs` es befüllt.

Ein wichtiger Live-Datenbefund verändert die Ausgangslage aus `160-LIVE-UAT-BEFUNDE.md`/162-CONTEXT
D-14: Der aktuelle Datenbestand (siehe „Read-only Datenbestands-Inventar" unten) zeigt bereits
**eine echte Coop-Version** (Release 60, Anime 4 „Naruto", Gruppen AnimeOwnage + Project Messiah)
und **fünf gepflegte öffentliche Geschichten** — der Auftraggeber hat die Testdaten offenbar
bereits teilweise angelegt, BEVOR diese Recherche lief. Es gibt jedoch aktuell **keine Gruppe ohne
Logo** mehr (alle 7 `anime_fansub_groups`-Zeilen haben `logo_url` gesetzt) — Testfall K („Gruppe
ohne Logo") hat damit aktuell keine reale Live-Entsprechung und bleibt auf automatisierte
Komponenten-Fixtures angewiesen, bis der Auftraggeber eine logolose Gruppe anlegt oder ein
bestehendes Logo entfernt.

**Primary recommendation:** URL-Aktualisierung ausschließlich über `window.history.pushState`
(Klick, neuer Verlaufseintrag) mit einem `popstate`-Listener fürs Zurück/Vor lesen — niemals
`next/navigation`'s `router.push`/`replace` für den Fansub-Parameter. Backend: eine LATERAL-Join-
Erweiterung in `ListAnimeFansubs`, additives `story_preview`-Feld, serverseitige
Rune-sichere Kürzung (kein Byte-Cut wegen Umlauten). Chips als `Button`-Primitive mit
`aria-pressed` (kein neues Chip-Primitive, siehe UI-SPEC Punkt 1).

## Architekturebenen-Verantwortungskarte

| Fähigkeit | Primäre Ebene | Sekundäre Ebene | Begründung |
|-----------|---------------|-----------------|------------|
| Erstauswahl (SSR-deterministisch, D-04) | Frontend-Server (SSR, `page.tsx` liest `searchParams.fansub`) | — | Kein Hydration-Flackern; Next.js liest `searchParams` server-seitig vor dem ersten Paint |
| Chip-Klick / Auswahlwechsel | Browser/Client (`FansubVersionBrowser.tsx`, `window.history.pushState`) | — | Muss ohne Server-Roundtrip erfolgen (D-03); reine Client-State-Aktualisierung |
| Zurück/Vor-Wiederherstellung | Browser/Client (`popstate`-Listener) | — | Native Browser-Historie, kein Next-Router-Soft-Nav für diesen Parameter |
| Folgen-/Versionsfilterung nach Gruppe | Browser/Client (`getSummaryVersion`/`groupMatchedVersions`, bereits vorhanden) | — | Bereits geladene Episodendaten, reine Client-Filterung, kein Request |
| Kurzgeschichte-Text (erste veröffentlichte Story) | API/Backend (`ListAnimeFansubs` LATERAL-Join) | Datenbank (`fansub_group_notes`) | Muss gebündelt mit der Gruppenliste kommen (kein N+1, D-13 Performance) |
| Navigationsziele (Gruppenprofil/Projekt) | API/Backend liefert Slugs; Browser/Client baut die Links | — | `buildPublicFansubProjectPath` ist reine Client-URL-Konstruktion aus bereits geladenen Slugs |
| Contract-Erweiterung (`story_preview`) | API/Backend (Go-Model + OpenAPI) | Frontend (TS-Typ) | Additive Vertragsänderung, muss synchron in allen drei Schichten stehen (CLAUDE.md QUAL-01-Muster) |

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Die URL ist die **einzige** Quelle des Gruppenkontexts. localStorage-Persistenz
  (`anime:<id>:fansub-filter`) und der `storage`-Event-Multitab-Sync aus Phase 159 D-02 werden
  **entfernt** (ersetzt, nicht parallel).
- **D-02:** URL-Parameter `?fansub=<fansub_group.slug>` (Slug, nicht ID). Nur bei 2+ Gruppen
  geschrieben. Ungültiger/entfernter/umbenannter Slug → „Alle" (kein Fehler, keine Umleitung
  nötig). Bei genau einer Gruppe wird der Parameter ignoriert und die Gruppe ist aktiv. „Alle" =
  Parameter entfernt. Andere Query-Parameter (`from`, `grid_query`) bleiben beim Wechsel erhalten.
- **D-03:** Chip-Klick erzeugt einen **neuen Historieneintrag (push)**, ohne Scroll-Sprung
  (`scroll: false`). Browser Zurück/Vor stellt die jeweils vorherige Auswahl wieder her. Ein
  Gruppenwechsel erzeugt weiterhin **keine** neuen fachlichen Datenrequests — Umsetzung so, dass
  der Server-Render der Seite nicht erneut alle Daten lädt.
- **D-04:** SSR-Determinismus: Die Initialauswahl ergibt sich aus Gruppenliste +
  `searchParams.fansub` bereits serverseitig (kein Hydration-Flackern von „Alle" auf die Gruppe).
- **D-05:** Quelle ist die **erste** öffentliche, veröffentlichte Geschichte der Gruppe aus
  `fansub_group_notes` (dieselbe Filterung/Sortierung wie `listPublicFansubStories`:
  `visibility='public'`, `status='published'`, `deleted_at IS NULL`, `ORDER BY sort_order, id`).
  Angezeigt wird nur **`body_text`** (reiner Text) — kein HTML, kein `RichTextRenderer`, kein
  Editor-Code auf der Anime-Seite; der Geschichtstitel wird nicht gezeigt. Ist `body_text` leer,
  gilt die Gruppe als „ohne Geschichte" (§7).
- **D-06:** Darstellung per CSS `line-clamp: 3`. Serverseitig darf der Vorschautext auf eine
  sinnvolle Obergrenze gekürzt werden, damit nicht komplette lange Geschichten im Payload landen
  (Grenze: Planner/Research).
- **D-07:** Die bisherige Faktenzeile („gegründet … • Land • Status", `buildFansubStoryPreview`)
  und der Platzhalter „Keine Historie hinterlegt." **entfallen** auf der Anime-Seite. Ob
  `buildFansubFactSummary` anderswo noch genutzt wird, prüft Research; ungenutzter Code wird nur
  entfernt, wenn er ausschließlich hierfür existierte.
- **D-08:** „Mehr lesen →" verlinkt auf `/fansubs/<slug>#geschichte` (Anker existiert in
  `FansubStorySection`). Nur gerendert, wenn eine Geschichte vorhanden ist.
- **D-09:** Die Gruppenwahl **filtert weiter** die Folgen-Versionen wie heute (`getSummaryVersion`
  / `groupMatchedVersions`). „Alle" = kein Gruppenfilter. Eine Coop-Version erscheint bei jeder
  beteiligten Gruppe (bestehende `release_version_groups`/`fansub_groups[]`-Semantik).
- **D-10:** Position: unter der Überschrift „Episoden (N)", vor der Folgenliste. Reihenfolge:
  Überschrift → „Fansub-Gruppe"-Label + Chips → gruppenspezifischer Bereich → Folgen.
- **D-11:** Chip-Reihenfolge = bestehende fachliche Reihenfolge des Endpunkts `ListAnimeFansubs`
  (`ORDER BY afg.is_primary DESC, fg.name ASC`); „Alle" steht vorn. Keine neue Sortierung.
- **D-12:** „Zur Fansub-Gruppe" → `/fansubs/<slug>`. „Zum Projekt" →
  `buildPublicFansubProjectPath(groupSlug, animeSlug)`
  (`/fansubs/<slug>/fansubprojekt/<animeSlug>`). **Fehlt ein kanonischer Pretty-Pfad
  (Gruppen- oder Anime-Slug leer), wird „Zum Projekt" nicht gerendert** — kein Fallback auf die
  technische Route `/anime/<id>/group/<groupId>`. Beide Ziele sind echte `<Link>`-Elemente,
  getrennt von den Chips.
- **D-13:** Entfernt/ersetzt werden: grauer Chip-Link `fansubRow` in `page.tsx`, verlinkter
  Story-Titel in `ActiveFansubStory`, Umschalt-Buttons in `FansubVersionBrowser`, CTA
  „Gruppenbereich" (inkl. `aria-label="Zum Gruppenbereich"`). Der Gruppenname im
  gruppenspezifischen Bereich ist **Überschrift ohne Link**. Keine alte und neue Lösung parallel.
- **D-14:** Coop: keine eigene Entität, kein Coop-Chip; Gruppen kommen aus
  `anime_fansub_groups`. Testdaten (Coop-Release-Version, Logo, Geschichten) legt **der
  Auftraggeber selbst** an; Agenten ändern keine produktiven Daten.

### Claude's Discretion

- Konkreter Mechanismus der URL-Aktualisierung (`router.push` mit `scroll:false` vs.
  `history.pushState` + `useSearchParams`-Sync), solange D-03 (kein Daten-Refetch, Back/Forward
  korrekt) belegt ist. **→ Research-Ergebnis unten: `history.pushState`/`popstate`, nicht
  `router.push`.**
- Additive Contract-Erweiterung für den Story-Vorschautext: Feldname und Ort (z. B.
  `story_preview` am `FansubGroupSummary` von `GET /api/v1/anime/{id}/fansubs`), per **einer**
  gebündelten Abfrage (LATERAL/DISTINCT ON), kein N+1, Go-Model + OpenAPI + TS-Typ synchron.
- Chip-Komponente: `@/components/ui` hat kein Chip-Primitive (nur `Badge`); Chips müssen trotzdem
  auf globalen Primitives/Tokens basieren. Native `<button>` im Feature-Code ist verboten —
  UI-SPEC hat dies bereits entschieden: `Button`-Primitive mit `aria-pressed`.
- Semantik der Chip-Gruppe (Toggle-Buttons mit `aria-pressed` in `role="group"` vs. Radio-Gruppe)
  — UI-SPEC hat bereits entschieden: `role="group"` + `aria-pressed`-Toggles, keine Radios.
- Logo 20 px über die vorhandene `logo_url`/`resolveLogoUrl`-Quelle; Chip-Name mit
  `text-overflow: ellipsis`/max-width gegen Overflow.
- Verhalten des Bereichs, wenn `getGroupedEpisodes` fehlschlägt (Fallback-Liste in `page.tsx`):
  Chips/Gruppenbereich dürfen dort ebenfalls erscheinen oder entfallen — konsistent und ohne tote
  Filter.

### Deferred Ideas (OUT OF SCOPE)

- Coop-Kennzeichnung in der Versionszeile (Badge „Coop" / alle Gruppenlogos statt nur des ersten)
  — eigener Backlog-Punkt (Befund 3 aus 160).
- Persönliche Merkfunktion der zuletzt gewählten Gruppe (bewusst entfernt durch D-01).
- Vorbekannter Fehler `fansub_groups.group_type` in `search_fansub.go` (160 deferred-items) —
  nicht Teil dieser Phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

Aus `162-USER-REQUEST.md` §1–§17 und `162-CONTEXT.md` D-01–D-14 abgeleitete REQ-ID-Liste. Jede ID
bildet auf genau einen Auftrags-§-Abschnitt bzw. eine D-Entscheidung ab, damit Planner und
Coverage-Gate eine 1:1-Zuordnung haben. Testfall-Buchstaben (A–L) aus §16 sind in der Spalte
„Testfall" vermerkt, wo zutreffend.

| ID | Beschreibung (§/D-Quelle) | Research Support | Testfall |
|----|---------------------------|-------------------|----------|
| REQ-162-01 | 0 Gruppen: kein Gruppenbereich, kein Platzhalter (§1, D-Rahmen) | `page.tsx` rendert den Block nur bei `animeFansubsResponse.data.length > 0`, bereits vorhandenes Muster | A |
| REQ-162-02 | Genau 1 Gruppe: kein „Alle"-Chip, Gruppe automatisch aktiv (§1) | `fansubOptions.length === 1` → `activeFansubGroupID` fix, kein Chip-Rendering für „Alle" | B, C |
| REQ-162-03 | 2+ Gruppen: „Alle" als Default, „Alle" nur ab 2 Gruppen sichtbar (§1) | `fansubOptions.length >= 2` steuert Sichtbarkeit des „Alle"-Chips; Default = `null` (kein Parameter) | D |
| REQ-162-04 | Filter-Chips: Logo 20px wenn vorhanden, reiner Text sonst, kein Dummy-Icon (§2) | `resolveLogoUrl` bereits vorhanden; `<Image width={20} height={20}>` | J, K |
| REQ-162-05 | Aktiver Zustand nicht nur über Farbe: Hintergrund+Rahmen+Fontgewicht+Fokusring (§2, UI-SPEC Color §) | 3 gleichzeitige Signale, UI-SPEC bereits spezifiziert | L (Sichtprüfung) |
| REQ-162-06 | Responsive: Wrap statt Pflicht-Scrollleiste, keine Layout-Sprengung (§2) | `flex-wrap: wrap` ersetzt heutiges `overflow-x: auto` in `.filterRow` | L |
| REQ-162-07 | Chips sind reine Auswahl, keine Navigation (§3) | Chip = `Button` mit `onClick`, kein `href` | — |
| REQ-162-08 | „Alle": alle gruppenspezifischen Elemente vollständig ausgeblendet, nicht disabled (§4) | `activeFansubGroupID === null` → gesamter Block `return null` | D |
| REQ-162-09 | Konkrete Gruppe: Name, ~3 Zeilen Geschichte, „Mehr lesen →", 2 Navigationsziele (§5) | Neuer gruppenspezifischer Bereich ersetzt `ActiveFansubStory` | B, E, F |
| REQ-162-10 | Geschichte: bestehende `fansub_group_notes`-Quelle, `body_text`, `line-clamp:3`, „Mehr lesen →" zu `/fansubs/<slug>#geschichte` (§6, D-05, D-06, D-08) | LATERAL-Join in `ListAnimeFansubs`, additiv `story_preview` | B, E, F |
| REQ-162-11 | Gruppe ohne Geschichte: kein Platzhaltertext, nur Name + 2 Navigationsziele (§7) | `story_preview` leer/null → Geschichte-Absatz + „Mehr lesen" entfallen komplett | C |
| REQ-162-12 | Navigation: „Zur Fansub-Gruppe" (`/fansubs/<slug>`), „Zum Projekt" (`buildPublicFansubProjectPath`), echte Routen/Slugs aus Code ermitteln (§8, D-12) | Bereits vorhandene Helper, D-12 verbietet Fallback-Route bei fehlendem Slug | B, E, F |
| REQ-162-13 | Begriff „Gruppenbereich" nicht weiterverwenden; explizite Beschriftungen (§9, D-13) | Alle vier Altstellen identifiziert (siehe „Code Examples") | — |
| REQ-162-14 | Coop: keine künstliche Gruppe/Filter, bestehende Mehrgruppen-Zuordnung (§10, D-14) | `anime_fansub_groups`/`release_version_groups` bereits ausreichend; reale Coop-Daten jetzt vorhanden (Release 60) | I |
| REQ-162-15 | URL-Zustand: `?fansub=<slug>`, Regeln für fehlenden/gültigen/ungültigen Parameter, Back/Forward (§11, D-02, D-03, D-04) | `window.history.pushState` + `popstate`-Listener, siehe „Architecture Patterns" | G, H |
| REQ-162-16 | Sortierung: bestehende fachliche Reihenfolge nicht überschreiben (§12, D-11) | `ORDER BY afg.is_primary DESC, fg.name ASC` bleibt unverändert | — |
| REQ-162-17 | Datenfluss/Performance: kein N+1, kein Einzelrequest pro Gruppe, kein volles Profil laden, additive kleinste Contract-Erweiterung (§13) | Eine LATERAL-Join-Query, kein zusätzlicher Request beim Chip-Wechsel | — |
| REQ-162-18 | Accessibility: Tastatur, sichtbarer Fokus, Active State nicht nur Farbe, Accessible Names, echte Links, Chips/Links semantisch getrennt (§14) | UI-SPEC „Zusätzliche Interaktions-/A11y-Vorgaben" bereits spezifiziert | L |
| REQ-162-19 | Entfernen redundanter Alt-UI: `fansubRow`, Story-Titel-Link, Umschalt-Buttons, „Gruppenbereich"-CTA (§15, D-13) | Alle vier Fundstellen mit Zeilennummern dokumentiert | — |
| REQ-162-20 | Tests A–L automatisiert abgedeckt (§16) | Bestehende Testdateien identifiziert, Umbau-Umfang dokumentiert | A–L |
| REQ-162-21 | Browser-Verifikation Desktop/Mobile über alle Datenkonstellationen (§17) | Read-only-DB-Inventar unten liefert reale Anime-IDs für jede Konstellation außer „Gruppe ohne Logo" | — |
</phase_requirements>

## Standard Stack

Keine neuen externen Packages. Alle benötigten Bausteine sind bereits im Repository vorhanden:

### Core (bereits vorhanden, keine neue Installation)

| Baustein | Ort | Zweck |
|----------|-----|-------|
| `next/navigation` (`useSearchParams`, `usePathname`) | `frontend/src/app/anime/[id]/page.tsx`, neue Client-Komponente | Lesen des `fansub`-Parameters, Synchronisation mit `window.history.pushState` |
| `window.history.pushState`/`replaceState` (native Browser-API) | neu, in `FansubVersionBrowser.tsx` bzw. einem neuen Hook | URL-Update ohne Server-Refetch (Next.js 16 offiziell dokumentiertes Pattern) |
| `@/components/ui` `Button` | `frontend/src/components/ui/Button.tsx` | Chip-Toggle (`variant="ghost"`, `aria-pressed`) und Navigationsziele (`variant="secondary"`, `href`) |
| `pgx/v5` `LEFT JOIN LATERAL` | `backend/internal/repository/fansub_repository.go` | Gebündelte Story-Vorschau ohne N+1 |

### Alternativen erwogen

| Statt | Könnte man auch | Tradeoff |
|-------|------------------|----------|
| `window.history.pushState` | `next/navigation` `router.push(url, {scroll:false})` | `router.push` löst auf dieser bereits dynamischen Route (liest `searchParams`) bei jeder Navigation einen frischen RSC-Fetch aus (Router-Cache `staleTime=0` für dynamische Segmente) — verletzt D-03 |
| LATERAL-Join in `ListAnimeFansubs` | Zweiter Request `GET /fansubs/{slug}` pro Gruppe im Client | N+1, verletzt §13/D-Performance-Vorgabe explizit |
| Neues `Chip`-Primitive in `@/components/ui` | `Button`-Primitive mit `aria-pressed` + lokalem CSS | UI-SPEC hat sich bereits für die zweite Option entschieden („closest analog", 4 bestehende Repo-Stellen) |

**Installation:** keine (keine `npm install`/`go get` nötig).

**Version verification:** `next` ist laut `frontend/package.json` auf `^16.1.6` gepinnt; die
offizielle Next.js-Doku (abgerufen 2026-09-17, Seiten-Metadaten `version: 16.3.5`) bestätigt das
History-API-Pattern für die aktuell installierte Major-Version. `pgx/v5` ist bereits Projekt-Standard
(`backend/go.mod`), keine Versionsänderung nötig.

## Package Legitimacy Audit

**Nicht zutreffend** — diese Phase installiert keine externen Packages (weder `npm install` noch
`go get`). Alle verwendeten Bausteine (`window.history` native Browser-API, `next/navigation`,
`@/components/ui`, `pgx/v5`) sind bereits im Projekt vorhanden bzw. Web-Plattform-Standard.

## Architecture Patterns

### System-Datenfluss

```
Erster Seitenaufruf (SSR)
  GET /anime/123?fansub=bloody-shadow
        │
        ▼
  page.tsx (Server Component)
    ├─ await searchParams  ──────────────► liest "fansub" (D-04)
    ├─ Promise.allSettled([
    │     getAnimeFansubs(id),        ───► ListAnimeFansubs (1 Query, LATERAL-Join story_preview)
    │     getGroupedEpisodes(id),
    │     getAnimeComments(id),
    │     getAnimeRelations(id),
    │   ])
    └─ rendert FansubVersionBrowser mit initialActiveSlug=searchParams.fansub
        │
        ▼
  FansubVersionBrowser (Client Component, 'use client')
    ├─ State: selectedSlug (initial aus Props, NICHT aus useSearchParams beim Mount neu berechnet)
    ├─ Ableitung: activeFansubGroupID = validate(selectedSlug, fansubOptions) → Fallback "Alle"
    ├─ Chip-Klick
    │     └─ setSelectedSlug(neuerSlug)
    │     └─ window.history.pushState(null, '', buildURL(neuerSlug, aktuelleSonstigenParams))
    │           (KEIN router.push → KEIN Server-Refetch, D-03)
    ├─ popstate-Listener (Back/Forward)
    │     └─ liest window.location.search direkt (nicht useSearchParams(), s. Pitfall unten)
    │     └─ setSelectedSlug(geparster Wert)
    └─ rendert:
          Chips (role="group" aria-label="Fansub-Gruppe")
          → gruppenspezifischer Bereich (Name, story_preview mit line-clamp:3, Mehr-lesen, 2 Links)
             ODER null bei "Alle"
          → Folgenliste (bestehende getSummaryVersion/groupMatchedVersions-Filterung, unverändert)
```

### Empfohlene Projektstruktur (Delta zu heute)

```
frontend/src/components/fansubs/
├── FansubVersionBrowser.tsx        # bleibt Zustandsbesitzer; verliert localStorage-Effekt,
│                                    #   gewinnt history.pushState/popstate-Mechanik
├── FansubGroupPicker.tsx           # NEU (optional, empfohlen): Chips + role="group",
│                                    #   Extraktion aus FansubVersionBrowser wegen 450-Zeilen-Kappe
├── FansubGroupContext.tsx          # NEU: ersetzt ActiveFansubStory — Name, story_preview,
│                                    #   Mehr-lesen, 2 Navigationsziele; ODER null bei "Alle"
├── ActiveFansubStory.tsx           # ENTFÄLLT (Inhalt geht in FansubGroupContext.tsx auf)
└── FansubVersionBrowser.module.css # verliert .filterChip/.filterRow-Overflow, .groupButton;
                                     #   neue Klassen für Chips/Bereich (ggf. eigenes .module.css
                                     #   für FansubGroupContext, um Datei-/CSS-Länge zu begrenzen)

backend/internal/repository/fansub_repository.go
└── ListAnimeFansubs()               # additiver LEFT JOIN LATERAL-Zweig auf fansub_group_notes

backend/internal/models/fansub.go
└── FansubGroupSummary               # additives Feld StoryPreview *string `json:"story_preview,omitempty"`

frontend/src/types/fansub.ts
└── FansubGroupSummary               # additives Feld story_preview?: string | null

shared/contracts/openapi.yaml
└── FansubGroupSummary-Schema (Zeile ~14132)  # additive Property story_preview
```

### Pattern 1: URL-Update ohne Server-Refetch (Native History API)

**Was:** `window.history.pushState`/`replaceState` statt `next/navigation`'s `router.push`/
`replace`, wenn eine bereits dynamische Server-Component-Seite (liest `searchParams`) ihren
Query-String ändern soll, ohne dass der Server erneut gerendert wird.

**Wann verwenden:** Immer wenn (a) die Ziel-Route bereits `searchParams` serverseitig liest
(macht die Route "dynamic", Router-Cache-`staleTime=0`) UND (b) der Parameterwechsel rein
client-seitig entschieden werden kann, weil alle nötigen Daten schon geladen sind (hier: alle
Gruppen/Story-Previews/Episodenversionen liegen bereits im Client-State).

**Beleg (offizielle Next.js-Doku, Next.js 16.3.5, abgerufen 2026-09-17):**
```tsx
// Source: https://nextjs.org/docs/app/getting-started/linking-and-navigating
// Abschnitt "Native History API" — window.history.pushState
'use client'
import { useSearchParams } from 'next/navigation'

export default function SortProducts() {
  const searchParams = useSearchParams()
  function updateSorting(sortOrder: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', sortOrder)
    window.history.pushState(null, '', `?${params.toString()}`)
  }
  // ...
}
```
> „`pushState` and `replaceState` calls integrate into the Next.js Router, allowing you to sync
> with `usePathname` and `useSearchParams`." — dieselbe Doku-Seite bestätigt zusätzlich für
> `replaceState`: „Use it to replace the current entry on the browser's history stack. The user
> is not able to navigate back to the previous state." — exakt die Semantik, die D-03 für den
> Chip-Klick fordert (push = neuer Eintrag) im Gegensatz zu einem reinen Ersatz.

**Für diese Phase konkret:**
```tsx
// frontend/src/components/fansubs/FansubVersionBrowser.tsx (Skizze, kein Copy-Paste-Endstand)
function pushFansubParam(pathname: string, currentParams: URLSearchParams, slug: string | null) {
  const params = new URLSearchParams(currentParams.toString()) // erhält from/grid_query (D-02)
  if (slug) params.set('fansub', slug)
  else params.delete('fansub')
  const query = params.toString()
  window.history.pushState(null, '', `${pathname}${query ? `?${query}` : ''}`)
}
```

**Wichtiger Unterschied zu `useDebouncedSearch.ts`:** Jenes Pattern (`router.replace(...,
{scroll:false})`) funktioniert dort, weil `/suche` **keine** Server-Component-Props aus
`searchParams` liest — die gesamte Ergebnislogik läuft client-seitig in `SearchResults` über
`useSearchParams()`. Auf `/anime/[id]` dagegen liest die async Server Component `searchParams`
für die SSR-Erstauswahl (D-04); ein `router.push`/`replace` auf dieser Route würde laut
Next.js-Routing-Modell ("Dynamic Rendering" + Router-Cache `staleTime=0` für Routen mit
`searchParams`) bei jedem Klick einen echten RSC-Fetch auslösen und alle vier
`Promise.allSettled`-Aufrufe (`getAnimeFansubs`, `getGroupedEpisodes`, `getAnimeComments`,
`getAnimeRelations`) erneut ausführen — das verletzt D-03 direkt.

### Pattern 2: Zurück/Vor über `popstate`, nicht über `useSearchParams()`-Reaktivität

**Was:** Ein manueller `popstate`-Event-Listener liest `window.location.search` und aktualisiert
den lokalen Auswahl-State. `useSearchParams()` NICHT als alleinige Quelle für den aktiven Chip
verwenden.

**Warum:** Die offizielle Doku bestätigt Sync mit `useSearchParams()` für den **auslösenden**
Client (der selbst `pushState` aufruft), macht aber keine Garantie, dass ein *fremder*
`popstate` (Browser-Zurück-Taste) zuverlässig ein Re-Render aller Konsumenten der
`useSearchParams()`-Instanz auf dieser bereits-dynamischen Route auslöst, ohne dass der App
Router seinerseits einen Soft-Nav-Fetch für die Server-Component-Segmente durchführt (das
Verhalten von `popstate` auf dynamischen Routen ist in der Doku nicht explizit für den
Kombinationsfall "manuelles pushState + späteres natives popstate" spezifiziert — daher hier
**MEDIUM statt HIGH Confidence** für den Rückwärtsfall, s. Assumptions Log A1). Ein eigener
`popstate`-Listener, der direkt `window.location.search` parst und den State synchron setzt,
umgeht diese Unsicherheit vollständig und ist deshalb die robustere, empfohlene Umsetzung:

```tsx
useEffect(() => {
  function handlePopState() {
    const params = new URLSearchParams(window.location.search)
    setSelectedSlug(params.get('fansub'))
  }
  window.addEventListener('popstate', handlePopState)
  return () => window.removeEventListener('popstate', handlePopState)
}, [])
```

### Pattern 3: Additive LATERAL-Join für Story-Vorschau (kein N+1)

**Heutige Query (`ListAnimeFansubs`, `backend/internal/repository/fansub_repository.go:1286-1294`):**
```go
// Source: backend/internal/repository/fansub_repository.go
rows, err := r.db.Query(ctx, `
    SELECT
        afg.anime_id, afg.fansub_group_id, afg.is_primary, afg.notes, afg.created_at,
        fg.id, fg.slug, fg.name, fg.logo_url, fg.founded_year, fg.dissolved_year, fg.country, fg.status
    FROM anime_fansub_groups afg
    JOIN fansub_groups fg ON fg.id = afg.fansub_group_id
    WHERE afg.anime_id = $1
    ORDER BY afg.is_primary DESC, fg.name ASC
`, animeID)
```

**Heutige Story-Filterung (`listPublicFansubStories`, Zeile 397-406, zu übernehmende Semantik):**
```go
// Source: backend/internal/repository/fansub_repository.go
SELECT id, title, body_html, body_text, COALESCE(updated_at, created_at)::text
FROM fansub_group_notes
WHERE fansub_group_id = $1
  AND visibility = 'public'
  AND status = 'published'
  AND deleted_at IS NULL
ORDER BY sort_order ASC, id ASC
```

**Vorgeschlagene additive Erweiterung (eine Query, kein N+1):**
```sql
SELECT
    afg.anime_id, afg.fansub_group_id, afg.is_primary, afg.notes, afg.created_at,
    fg.id, fg.slug, fg.name, fg.logo_url, fg.founded_year, fg.dissolved_year, fg.country, fg.status,
    story.body_text
FROM anime_fansub_groups afg
JOIN fansub_groups fg ON fg.id = afg.fansub_group_id
LEFT JOIN LATERAL (
    SELECT n.body_text
    FROM fansub_group_notes n
    WHERE n.fansub_group_id = fg.id
      AND n.visibility = 'public'
      AND n.status = 'published'
      AND n.deleted_at IS NULL
    ORDER BY n.sort_order ASC, n.id ASC
    LIMIT 1
) story ON true
WHERE afg.anime_id = $1
ORDER BY afg.is_primary DESC, fg.name ASC
```

`story.body_text` wird per `pgx` in ein `*string` gescannt (NULL bei fehlender Story) und nach
Rune-sicherer Kürzung (siehe Pitfall unten) in `models.FansubGroupSummary.StoryPreview` gesetzt.
Diese Erweiterung betrifft ausschließlich `ListAnimeFansubs`; `listPublicFansubStories` (Profil-
Vollladung) bleibt unverändert — beide Funktionen filtern jetzt identisch, aber unabhängig
(keine Code-Dopplung nötig, da unterschiedliche Rückgabeform: Liste vs. Einzelwert).

## Don't Hand-Roll

| Problem | Nicht selbst bauen | Stattdessen | Warum |
|---------|---------------------|--------------|-------|
| URL-Query-String bauen/parsen | Manuelles String-Concat mit `&`/`=`-Escaping | `URLSearchParams` (Web-Standard, bereits in `useDebouncedSearch.ts` und `page.tsx` `buildFilterHref` verwendet) | Encoding-Bugs, Edge Cases bei Sonderzeichen in Slugs |
| Shallow-Routing / URL-ohne-Refetch | Eigene History-Wrapper-Bibliothek oder Next-Router-Hacks (`router.push` mit Tricks) | `window.history.pushState`/`replaceState` (nativ, von Next.js 16 offiziell unterstützt) | Genau für diesen Zweck vorgesehene, dokumentierte Plattform-API |
| Chip-Toggle-Komponente | Neues Chip-Primitive im globalen `@/components/ui`-System | `Button`-Primitive mit `variant="ghost"` + `aria-pressed` (4 bestehende Repo-Vorbilder) | UI-SPEC hat dies bereits entschieden; ein Einweg-Primitive für eine einzelne Verwendungsstelle wäre Overkill |
| Rich-Text-Rendering der Kurzgeschichte | `RichTextRenderer`/HTML-Sanitizing auf der Anime-Seite einführen | Nur `body_text` (Plain Text) verwenden — laut D-05 explizit vorgeschrieben | Vermeidet Editor-Code-Abhängigkeit auf einer öffentlichen Übersichtsseite (§6) |

**Key insight:** Jede scheinbare "Hilfsbibliothek" für dieses Phasenproblem (Query-Param-State,
Shallow-Routing) ist bereits durch Web-Plattform-APIs bzw. bestehende Repo-Primitives abgedeckt.
Das Risiko liegt nicht im Fehlen einer Bibliothek, sondern im Verwechseln zweier ähnlich
aussehender Next.js-Mechanismen (`router.push` vs. `history.pushState`), die für diese konkrete
Route unterschiedliches Netzwerkverhalten haben.

## Common Pitfalls

### Pitfall 1: `router.push`/`router.replace` für den Fansub-Parameter verwenden
**Was schiefgeht:** Jeder Chip-Klick löst einen echten RSC-Fetch aus, der `getAnimeFansubs`,
`getGroupedEpisodes`, `getAnimeComments` und `getAnimeRelations` erneut aufruft — sichtbar als
Netzwerk-Request im DevTools-Panel bei jedem Klick.
**Warum es passiert:** `/anime/[id]/page.tsx` liest bereits heute `searchParams.grid_query`/`from`
und ist dadurch eine dynamisch gerenderte Route; der App-Router-Client-Cache für dynamische
Segmente hat `staleTime: 0`, jede `next/navigation`-Navigation (auch reiner Such-Parameter-
Wechsel auf derselben Route) fragt daher den Server neu an.
**Wie vermeiden:** Ausschließlich `window.history.pushState`/`replaceState` für den
`fansub`-Parameter verwenden (Pattern 1 oben).
**Warnzeichen:** Ein neuer Netzwerk-Request in den Browser-DevTools bei jedem Chip-Klick; ein
Flackern/Neuladen sichtbarer Seitenbereiche (Kommentare, Relationen) beim Gruppenwechsel.

### Pitfall 2: Byte-Kürzung statt Rune-Kürzung bei `story_preview`
**Was schiefgeht:** Eine naive `body_text[:500]`-Kürzung in Go schneidet UTF-8-Mehrbyte-Zeichen
(Umlaute ä/ö/ü, „…", Anführungszeichen „“) mitten im Byte entzwei → korrupter/ungültiger UTF-8-
String im JSON-Response, im schlimmsten Fall ein `500`-Fehler beim JSON-Encoding oder sichtbare
Ersatzzeichen (`�`) im Frontend.
**Warum es passiert:** Deutsche Texte in `fansub_group_notes.body_text` enthalten garantiert
Umlaute (CLAUDE.md-Pflicht für UI-Text; auch Story-Texte sind deutschsprachig).
**Wie vermeiden:** In Go über `[]rune(bodyText)` kürzen (oder eine vorhandene rune-sichere
Utility, falls im Projekt vorhanden — Grep ergab: **keine existiert**, muss neu geschrieben
werden), nicht über Byte-Slicing.
**Warnzeichen:** Fehlerhafte Zeichen am Ende gekürzter Vorschautexte in Tests mit Umlaut-Fixtures.

### Pitfall 3: `story_preview` versehentlich auch in anderen `FansubGroupSummary`-Konsumenten erwarten
**Was schiefgeht:** `FansubGroupSummary` wird auch für `PublicEpisodeVersion.fansub_groups[]`,
`FansubProjectResolution` u. a. verwendet (siehe `openapi.yaml` Zeilen 14514, 15286, 15414, 15626,
16523). Wird das Feld dort fälschlich als „immer vorhanden" angenommen, entstehen leere/kaputte
UI-Zustände in Komponenten, die das Feld gar nicht füllen.
**Warum es passiert:** Ein gemeinsames Schema für mehrere Endpunkte — additive Felder sind pro
Konsument optional, nicht global garantiert.
**Wie vermeiden:** `story_preview` in OpenAPI/Go/TS als **optional** (`omitempty`/`?:`) markieren
und im Frontend ausschließlich dort konsumieren, wo es tatsächlich befüllt wird
(`AnimeFansubRelation.fansub_group.story_preview` aus `GET /anime/{id}/fansubs`).
**Warnzeichen:** `story_preview: undefined` in Versionszeilen-Kontexten wird fälschlich als „keine
Geschichte" statt „hier nicht geladen" interpretiert.

### Pitfall 4: Vorhandene, aber bereits stale Datenannahmen aus `162-CONTEXT.md`/`160-LIVE-UAT-BEFUNDE.md` unreflektiert übernehmen
**Was schiefgeht:** D-14 und die 160-Befunde gehen von „Anime 2 = 3 Gruppen ohne Logo, 0
Coop-Versionen" aus. Das **Live-Read-only-Inventar dieser Recherche (2026-09-17, siehe unten)
zeigt das Gegenteil**: alle 7 Gruppen-Relationen haben mittlerweile ein Logo, und es existiert
bereits eine echte Coop-Version (Release 60, Naruto). Wer die Browser-Verifikationsmatrix (§17)
ungeprüft nach den alten CONTEXT-Angaben plant, plant Testfälle gegen nicht mehr existierende
Datenlücken.
**Wie vermeiden:** Die Tabelle „Read-only Datenbestands-Inventar" unten als aktuelle Quelle für
die Browser-Verifikationsplanung verwenden, nicht die älteren Dokumente.
**Warnzeichen:** Ein geplanter Testschritt „Logo fehlt bei Anime 2" findet in der Live-Umgebung
ein Logo vor.

## Code Examples

### Fundstellen der zu entfernenden Alt-UI (D-13/§15, mit Zeilennummern zum Recherchezeitpunkt)

```
frontend/src/app/anime/[id]/page.tsx:253-268
  {animeFansubsResponse && animeFansubsResponse.data.length > 0 && (
    <div className={styles.fansubRow}>
      {animeFansubsResponse.data.map((relation) =>
        relation.fansub_group ? (
          <Link key={relation.fansub_group.id} href={`/fansubs/${relation.fansub_group.slug}`}
                prefetch={false} className={styles.fansubChip}>
            {relation.fansub_group.name}
          </Link>
        ) : null,
      )}
    </div>
  )}
→ vollständig entfernen (grauer Chip-Link, D-13 Punkt 1).

frontend/src/components/fansubs/ActiveFansubStory.tsx:22-28
  <h3 className={styles.title}>
    <Link href={`/fansubs/${activeGroup.slug}`} prefetch={false}>{activeGroup.name}</Link>
  </h3>
→ Story-Titel-Link entfällt; Gruppenname wird Überschrift OHNE Link (D-13 Punkt 4).

frontend/src/components/fansubs/FansubVersionBrowser.tsx:244-260 (Umschalt-Buttons, bleiben
  strukturell als Chips, aber Semantik/Styling ändert sich vollständig — kein reiner Löschpunkt)

frontend/src/components/fansubs/FansubVersionBrowser.tsx:262-272
  {activeFansubGroupID !== null ? (
    <div className={styles.groupCtaRow}>
      <Link href={groupProjectHref} className={styles.groupButton} aria-label="Zum Gruppenbereich">
        Gruppenbereich
      </Link>
    </div>
  ) : null}
→ CTA „Gruppenbereich" vollständig ersetzen durch zwei getrennte Links „Zur Fansub-Gruppe"/
  „Zum Projekt" (D-13 Punkt 2, D-12).
```

### Dead Prop bereits vorhanden — sicher entfernbar

`FansubVersionBrowserProps.onActiveFansubChange` (Zeile 25) wird an **keiner** Aufrufstelle im
gesamten Frontend übergeben (`grep -rn "onActiveFansubChange"` liefert nur die Definition und die
interne Nutzung in `FansubVersionBrowser.tsx` selbst). `FansubVersionBrowser` hat außerdem nur
**einen einzigen Konsumenten** im gesamten Repo (`frontend/src/app/anime/[id]/page.tsx`) — die
Komponente kann ohne Rücksicht auf andere Aufrufer umgebaut werden.

### `buildPublicFansubProjectPath` — bestehender Slug-Fallback (D-12 Referenz)

```ts
// Source: frontend/src/lib/fansubProjectRoutes.ts:3-5
export function buildPublicFansubProjectPath(fansubSlug: string, animeSlug: string): string {
  return `/fansubs/${encodeURIComponent(fansubSlug.trim())}/fansubprojekt/${encodeURIComponent(animeSlug.trim())}`
}
```
Diese Funktion macht **keinen** Leerstring-Check selbst — der Aufrufer (`FansubVersionBrowser.tsx`
Zeile 142-144 heute) prüft `animeSlug?.trim() && activeGroup?.slug?.trim()` VOR dem Aufruf und
fällt aktuell auf `/anime/${animeID}/group/${activeFansubGroupID}` zurück. Laut D-12 entfällt
dieser Fallback für „Zum Projekt" ersatzlos — bei leerem Slug wird der Link gar nicht gerendert,
nicht auf die technische Route umgeleitet. `buildPublicFansubProjectHref` in derselben Datei
(Zeilen 22-35) hat exakt diesen Fallback-Mechanismus für einen ANDEREN Konsumenten (Release-Kontext)
— dieser bleibt unangetastet, nur die Verwendungsstelle in `FansubVersionBrowser.tsx` ändert sich.

### Bestehendes Chip-Toggle-Vorbild (UI-SPEC „closest analog")

```tsx
// Source: frontend/src/app/admin/fansubs/[id]/edit/AnimeReleasesFilterBar.tsx:17-25
<Button
  variant="ghost"
  size="sm"
  aria-pressed={activeFilter === 'all'}
  onClick={() => onFilterChange('all')}
  className={activeFilter === 'all' ? styles.filterChipActive : undefined}
>
  Alle
</Button>
```

## State of the Art

| Alter Ansatz | Aktueller Ansatz | Wann geändert | Auswirkung |
|--------------|-------------------|----------------|------------|
| `localStorage`-Persistenz pro Anime (`anime:<id>:fansub-filter`) + `storage`-Event-Multitab-Sync | URL (`?fansub=<slug>`) als einzige Quelle | Diese Phase (D-01), löst Phase-159-D-02-Ansatz ab | Kein Multitab-Sync-Code mehr nötig; Auswahl teilbar per Link statt gerätegebunden |
| `router.push`/`replace` für Query-Param-Änderungen auf Next.js-App-Router-Seiten | `window.history.pushState`/`replaceState` für Änderungen, die keinen neuen Server-Render brauchen | Seit Next.js 14.1 (Feb. 2024) offiziell dokumentiert, weiterhin aktuell in 16.x | Client-Filterwechsel ohne Netzwerk-Roundtrip auf bereits-dynamischen Routen |
| CTA „Gruppenbereich" (ein Link, uneindeutiges Ziel) | Zwei getrennte, eindeutig beschriftete Links „Zur Fansub-Gruppe"/„Zum Projekt" | Diese Phase (D-12/D-13) | Behebt den vom Auftraggeber in Befund 2 (160-LIVE-UAT-BEFUNDE.md) explizit benannten Verwirrungspunkt |

**Deprecated/veraltet in dieser Phase:**
- `buildFansubFactSummary`/`buildFansubStoryPreview` (`frontend/src/lib/fansub-summary.ts`) für
  die Anime-Seite: Die Faktenzeile („gegründet … • Land • Status") entfällt hier laut D-07. Ob
  diese Funktionen anderswo noch verwendet werden, muss vor dem Löschen geprüft werden (siehe
  Open Questions).

## Read-only Datenbestands-Inventar (2026-09-17, ausschließlich SELECT, keine Schreiboperation)

Ausgeführt gegen den laufenden Container `team4sv30-db` (`docker compose exec -T team4sv30-db
psql -U team4s -d team4s_v2 -c "..."`). Dient der Vorplanung der Browser-Verifikationsmatrix aus
§17 — ersetzt die älteren, jetzt teilweise veralteten Angaben aus `162-CONTEXT.md` D-14 und
`160-LIVE-UAT-BEFUNDE.md` Befund 3.

**Query 1 — Gruppen pro Anime, mit Logo-Status:**
```sql
SELECT a.id AS anime_id, a.slug, a.title,
       fg.id AS group_id, fg.slug AS group_slug, fg.name AS group_name,
       fg.logo_url, afg.is_primary
FROM anime_fansub_groups afg
JOIN anime a ON a.id = afg.anime_id
JOIN fansub_groups fg ON fg.id = afg.fansub_group_id
ORDER BY a.id, afg.is_primary DESC, fg.name;
```

| anime_id | slug | group_id | group_slug | group_name | logo | Konstellation |
|---|---|---|---|---|---|---|
| 1 | buddy-complex | 1 | new-subs | New-Subs | ✓ | **1 Gruppe, Logo, KEINE Story** → Testfall C |
| 2 | 11eyes | 24, 25, 26 | bloody-shadow, flamehaze-subs, strawhat-subs | Bloody-Shadow, FlameHaze-subs, Strawhat Subs | ✓✓✓ | **3 Gruppen, alle Logo+Story** → Testfälle D, E, F, G, H, J |
| 3 | 11eyes-pink-phantasmagoria | 26 | strawhat-subs | Strawhat Subs | ✓ | **1 Gruppe, Logo, MIT Story** → Testfall B |
| 4 | naruto | 29, 30 | animeownage, project-messiah | AnimeOwnage, Project Messiah | ✓✓ | **2 Gruppen, echte Coop-Version (s. Query 2)** → Testfall I |

**Query 2 — Coop-Release-Versionen (2+ Gruppen an derselben Version):**
```sql
SELECT rvg.release_version_id, COUNT(*) AS group_count, array_agg(fg.name ORDER BY fg.name) AS groups
FROM release_version_groups rvg
JOIN fansub_groups fg ON fg.id = rvg.fansub_group_id
GROUP BY rvg.release_version_id HAVING COUNT(*) > 1;
```
→ **1 reale Coop-Version gefunden:** `release_version_id = 60`, Gruppen `{AnimeOwnage,
"Project Messiah"}`, Anime 4 (Naruto). Diese existiert bereits — anders als in D-14 dokumentiert
(„Testdaten legt der Auftraggeber selbst an" bezog sich vermutlich auf den Stand vor dieser
Anlage). Für die Browser-Verifikation von Testfall I (§16) und den Coop-Fällen aus §17 kann diese
reale Version verwendet werden, sobald der Auftraggeber sie freigibt — die Recherche selbst hat
sie nur gelesen, nicht angelegt oder verändert.

**Query 3 — Öffentliche Fansub-Geschichten (`fansub_group_notes`):**
```sql
SELECT fansub_group_id, id, title, visibility, status, deleted_at IS NOT NULL AS deleted,
       length(body_text) AS body_len, sort_order
FROM fansub_group_notes ORDER BY fansub_group_id, sort_order, id;
```

| fansub_group_id | Gruppe | Story vorhanden | body_text-Länge | Titel |
|---|---|---|---|---|
| 24 | Bloody-Shadow | ja | 1213 | „Bloody-Shadow" |
| 25 | FlameHaze-subs | ja | 1426 | *(leer — Titel wird laut D-05 ohnehin nicht angezeigt)* |
| 26 | Strawhat Subs | ja | 1576 | „Strawhat Subs" |
| 29 | AnimeOwnage | ja | 2210 | „AnimeOwnage" |
| 30 | Project Messiah | ja | 1205 | „Project Messiah" |
| **1 (New-Subs)** | New-Subs | **nein** (keine Zeile) | — | — |

**Konsequenz für §17 Browser-Verifikationsmatrix (Vorschlag, keine Nutzerentscheidung):**

| §17-Anforderung | Reale Abdeckung heute | Anime/Gruppe |
|---|---|---|
| 1 Gruppe | ✓ (2 Varianten: mit/ohne Story) | Anime 3 (mit Story), Anime 1 (ohne Story) |
| 2+ Gruppen | ✓ | Anime 2 (3 Gruppen), Anime 4 (2 Gruppen) |
| Gruppe mit Logo | ✓ | alle 7 Relationen |
| **Gruppe ohne Logo** | **✗ — aktuell keine vorhanden** | — |
| Gruppe mit Geschichte | ✓ | 5 von 6 Gruppen |
| Gruppe ohne Geschichte | ✓ | New-Subs (Anime 1) |
| Coop-Konstellation | ✓ | Anime 4, Release 60 |

Der einzige echte Datenlücken-Punkt ist **„Gruppe ohne Logo"** — dafür gibt es aktuell keine
Live-Entsprechung. Das automatisierte Frontend (Vitest-Fixtures) deckt diesen Fall unabhängig von
echten Daten ab; für die menschliche Browser-Verifikation muss entweder der Auftraggeber ein Logo
von einer bestehenden Gruppe entfernen/eine neue Gruppe ohne Logo anlegen, oder dieser Teilpunkt
bleibt bis dahin ein dokumentierter offener Punkt (kein Blocker für die Implementierung selbst).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Ein `popstate`-Event nach vorherigem `window.history.pushState` löst auf dieser bereits-dynamischen Route KEINEN zusätzlichen Next.js-App-Router-RSC-Fetch aus, wenn die Anwendung selbst keinen `router`-Aufruf tätigt. Die offizielle Doku bestätigt den Sync-Mechanismus nur für den auslösenden Client, nicht explizit das Verhalten bei nativer Browser-Zurück-Navigation auf einer zuvor per `pushState` (nicht per Next-Router) erzeugten History-Eintrag. | Architecture Patterns, Pattern 2 | Falls doch ein Server-Refetch bei Back/Forward passiert, verletzt das D-03 nur für den Zurück/Vor-Pfad (nicht für Chip-Klicks); Gegenmaßnahme: Component-Test mit `popstate`-Simulation + Spy auf `getAnimeFansubs`/`getGroupedEpisodes`, der 0 Aufrufe erwartet — Executor sollte dies als Wave-0-Testfall aufnehmen, um den echten Next.js-16-Laufzeit-Effekt zu verifizieren, statt sich allein auf Dokulektüre zu verlassen |
| A2 | Eine serverseitige Kürzungsgrenze von ~500 Zeichen (Runes) für `story_preview` ist für `line-clamp: 3` bei typischen Chip-Breiten (§2: „lange Gruppennamen dürfen das Layout nicht sprengen", UI-SPEC Story-Vorschautext 14px/1.5 Zeilenhöhe) großzügig genug, ohne unnötig viel Payload zu senden. D-06 überlässt die exakte Grenze explizit dem Research/Planner, es gibt keine Vorgabe des Auftraggebers. | Architecture Patterns, Pattern 3 | Zu knapp: `line-clamp:3` zeigt sichtbar unvollständigen letzten Satz vor „Mehr lesen" (unkritisch, da „Mehr lesen" ohnehin folgt); zu großzügig: unnötiger Payload bei sehr langen Geschichten (max. beobachtet: 2210 Zeichen ungekürzt) |

## Open Questions (RESOLVED)

1. **Wird `buildFansubFactSummary` (`frontend/src/lib/fansub-summary.ts`) noch von anderem Code
   als `ActiveFansubStory`/`buildFansubStoryPreview` verwendet?**
   - **RESOLVED:** Ja. `grep -rn "buildFansubFactSummary\|buildFansubStoryPreview" frontend/src`
     (nachträglich während der Plan-Verifikation ausgeführt) zeigt aktive Konsumenten außerhalb der
     Anime-Seite: `frontend/src/app/admin/anime/utils/episode-helpers.ts` →
     `AnimeContextFansubs.tsx`, `frontend/src/app/admin/fansubs/[id]/edit/ReadinessTab.tsx`,
     `frontend/src/components/fansubs/FansubProfileTabs.tsx`,
     `frontend/src/components/fansubs/FansubHeroSection.tsx`. D-07 erlaubt Löschung nur, „wenn er
     ausschließlich hierfür existierte" — das trifft nicht zu. `buildFansubFactSummary`/
     `buildFansubStoryPreview` und `frontend/src/lib/fansub-summary.ts` bleiben unverändert
     bestehen; nur der Import/Aufruf in der neuen `FansubGroupContext.tsx` (Ersatz für
     `ActiveFansubStory.tsx`) entfällt — dies ist bereits in `162-02-PLAN.md` Acceptance Criteria
     erzwungen (`grep -c "buildFansubStoryPreview\|buildFansubFactSummary"
     frontend/src/components/fansubs/FansubGroupContext.tsx` == 0), ohne die Quelldatei selbst
     anzufassen.

2. **Wie soll die 450-Zeilen-Kappe für `FansubVersionBrowser.tsx` eingehalten werden, wenn sowohl
   die neue History-API-Logik als auch die bestehende Pagination-/Versions-Logik in derselben
   Datei bleiben?**
   - **RESOLVED:** `162-02-PLAN.md` extrahiert `FansubGroupPicker.tsx` (Chips) und
     `FansubGroupContext.tsx` (Name/Story/Navigation, ersetzt `ActiveFansubStory.tsx`) als eigene
     Dateien; `162-03-PLAN.md` baut `FansubVersionBrowser.tsx` auf `window.history`-Sync um, ohne
     die Chip-/Kontext-Darstellung selbst zu enthalten. Hält jede Datei klein und testbar,
     entspricht dem bestehenden Repo-Muster (viele kleine, funktionsnah benannte Dateien laut
     CLAUDE.md „Feature files are narrow and descriptive").

3. **Soll die vorhandene, in dieser Phase entdeckte OpenAPI-Lücke bei `FansubGroupSummary`
   (fehlende `founded_year`/`dissolved_year`/`country`/`status`-Properties im Schema, obwohl Go-
   Model und TS-Typ sie bereits haben) im selben Zug mitkorrigiert werden?**
   - **RESOLVED:** Nein, nicht beheben. `162-01-PLAN.md` ergänzt ausschließlich additiv
     `story_preview`; die bestehende Drift ist unabhängig von dieser Phase entstanden und ihre
     Behebung würde den engen Auftrags-Scope verlassen (Arbeitsweise-Punkt 9 im Auftrag verbietet
     unrelated Refactorings). Bleibt ein eigenständiger, im Abschlussbericht zu erwähnender Befund.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Next.js (App Router, `next/navigation`) | Frontend, gesamte Phase | ✓ | `^16.1.6` (package.json), Doku geprüft gegen 16.3.5 | — |
| `window.history` (Browser-API) | URL-Mechanismus (D-03) | ✓ (Web-Plattform-Standard, kein Server-Dependency) | — | — |
| PostgreSQL (`team4sv30-db`) | Backend-Query-Erweiterung | ✓ (Container „Up 2 weeks (healthy)") | — | — |
| Docker Compose Stack (`team4sv30-frontend`/`-backend`) | Build/Restart nach Änderungen | ✓ (beide Container laufen) | — | — |
| Vitest 3 + `jest-axe`/`axe-core` (bereits im `package.json`) | Frontend-Tests inkl. A11y-Assertions | ✓ (`frontend/vitest.config.ts` lädt `src/test/axeSetup.ts`) | vitest `^3.2.4`, axe-core `^4.13.0`, jest-axe `^11.0.0` | — |

**Fehlende Abhängigkeiten mit/ohne Fallback:** keine — alle benötigten Werkzeuge sind bereits
vorhanden und laufen.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework (Frontend) | Vitest 3.2.4, `@testing-library/react`, jsdom-Environment |
| Framework (Backend) | Go `testing` + `testify`, teils real-Postgres via `pgxpool` (env-DSN-gated) |
| Config file (Frontend) | `frontend/vitest.config.ts` |
| Quick run command (Frontend, gezielt) | `docker compose exec -T team4sv30-frontend npx vitest run src/components/fansubs src/app/anime` |
| Full suite command (Frontend) | `docker compose exec -T team4sv30-frontend npx vitest run` |
| Quick run command (Backend, gezielt) | Go-Container: `go test ./internal/repository/... -run Fansub` |
| Full suite command (Backend) | Go-Container: `go test ./...` |

### Wichtiger Teststil-Hinweis (CLAUDE.md, verbindlich)

`backend/internal/repository/fansub_repository_test.go` besteht **vollständig** aus
Quelltext-String-Matching (`os.ReadFile("fansub_repository.go")` + `strings.Contains`), inkl.
eines bereits vorhandenen Tests `TestListAnimeFansubs_SummaryIncludesFansubStoryFacts`, der exakt
die heutigen `ListAnimeFansubs`-SQL-Fragmente pinnt. Das ist laut CLAUDE.md-Teststil-Regel
**explizit verbotenes Altmuster** („Der bestehende Bestand … ist Altlast, die künftig behoben
werden soll — kein Vorbild zum Weiterkopieren"). **Für die neue `story_preview`-Logik darf dieses
Muster NICHT fortgeführt werden.** Stattdessen: ein echter Postgres-Integrationstest nach dem in
`backend/internal/repository/anime_relations_admin_postgres_test.go` etablierten, aktuelleren
Muster (env-DSN `TEAM4S_*_TEST_DSN`, Datenbanknamens-Regex-Guard gegen versehentliches Laufen
gegen `team4s_v2`, `pgxpool.NewWithConfig`, Fixture-Seed/Cleanup via `t.Cleanup`), der die
LATERAL-Join-Query tatsächlich ausführt und die zurückgegebenen `story_preview`-Werte gegen
eingefügte Test-Notizen prüft (inkl. Kürzungs- und Rune-Sicherheits-Fall). Der bestehende
`TestListAnimeFansubs_SummaryIncludesFansubStoryFacts`-Test darf unverändert bleiben (pinnt
weiterhin die unveränderten Spalten), muss aber NICHT als Vorlage für den neuen Story-Preview-Teil
dienen.

### Phase Requirements → Test Map (Auszug, vollständige Zuordnung in Wave-Planung)

| Req ID | Verhalten | Testtyp | Automatisierter Befehl | Datei vorhanden? |
|--------|-----------|---------|-------------------------|-------------------|
| REQ-162-02/03 | 0/1/2+-Gruppen-Logik, „Alle" nur ab 2 | Component (RTL) | `npx vitest run src/components/fansubs/FansubVersionBrowser.test.tsx` | ✅ (muss umgebaut werden) |
| REQ-162-15 | URL-Parameter setzen/lesen, Back/Forward, ungültiger Slug | Component (RTL) mit `window.history`-Spy + simuliertem `popstate` | neue Tests in `FansubVersionBrowser.test.tsx` (oder extrahierter Datei) | ❌ Wave 0 (neue Assertions) |
| REQ-162-10/11 | Story-Vorschau/kein Platzhalter | Component (RTL) | ersetzt bisherige `ActiveFansubStory.test.tsx`-Fälle | ✅ Datei vorhanden, Inhalt muss ersetzt werden |
| REQ-162-17 (Backend) | LATERAL-Join liefert korrekte `story_preview`, kein N+1 | Go Postgres-Integrationstest (echte Ausführung) | Go-Container: `go test ./internal/repository/... -run ListAnimeFansubs` | ❌ Wave 0 (neuer, real ausgeführter Test — NICHT das bestehende String-Match-Pattern) |
| REQ-162-18 | Accessibility (Fokus, `aria-pressed`, `role="group"`) | Component (RTL) + `jest-axe` (bereits projektweit verdrahtet) | `npx vitest run` (nutzt `axeSetup.ts` automatisch) | ✅ Infrastruktur vorhanden |

### Sampling Rate
- **Pro Task-Commit:** gezielte `vitest run`/`go test`-Befehle auf betroffene Dateien
- **Pro Wave-Merge:** volle Frontend- und Backend-Suite
- **Phasen-Gate:** volle Suite grün vor `/gsd:verify-work`

### Wave-0-Lücken
- [ ] Neuer Go-Postgres-Integrationstest für die `ListAnimeFansubs`-LATERAL-Join-Erweiterung
      (env-DSN-gated, nach Vorbild `anime_relations_admin_postgres_test.go`) — deckt REQ-162-10,
      REQ-162-17
- [ ] Neue Component-Tests für `window.history.pushState`/`popstate`-Verhalten (Spy auf
      `window.history.pushState`, simuliertes `PopStateEvent`, Assertion „kein neuer
      `getAnimeFansubs`/`getGroupedEpisodes`-Aufruf bei Auswahlwechsel") — deckt REQ-162-15, D-03
- [ ] Vollständiger Rewrite von `FansubVersionBrowser.test.tsx` (localStorage-Tests entfernen,
      URL-Tests ergänzen) und `ActiveFansubStory.test.tsx` (Komponente entfällt/wird ersetzt)

## Security Domain

### Anwendbare ASVS-Kategorien

| ASVS-Kategorie | Zutreffend | Standard-Kontrolle |
|-----------------|------------|----------------------|
| V2 Authentication | nein | Öffentliche Lesesicht, keine Authentifizierung betroffen |
| V3 Session Management | nein | Keine Session-Änderung |
| V4 Access Control | nein | Keine neue geschützte Route; `GET /api/v1/anime/{id}/fansubs` bleibt öffentlich wie heute |
| V5 Input Validation | ja | `fansub`-Query-Parameter (Slug) MUSS serverseitig/clientseitig gegen die tatsächliche `fansubOptions`-Liste validiert werden (D-02: ungültiger Slug → „Alle", kein Fehler) — bereits etabliertes Muster in `FansubVersionBrowser.tsx` (`validIDs.includes(...)`), nur von Zahl-ID auf Slug-Vergleich umzustellen |
| V6 Cryptography | nein | Keine kryptografische Operation |

### Bekannte Bedrohungsmuster für diesen Stack

| Muster | STRIDE | Standard-Gegenmaßnahme |
|--------|--------|--------------------------|
| Reflektierter XSS über `?fansub=<script>`-artigen Query-Wert | Tampering/Information Disclosure | Der Slug wird NIE ungeprüft in HTML/URL eingebettet — nur zum Vergleich gegen die geladene `fansubOptions`-Liste verwendet (Allowlist-Vergleich, kein Rendering des Rohwerts). React escaped ohnehin automatisch bei Text-Rendering. Kein `dangerouslySetInnerHTML` in dieser Phase (D-05 verbietet HTML-Rendering der Story explizit). |
| SQL-Injection über den additiven LATERAL-Join | Tampering | Bestehendes `pgx`-Parameter-Binding-Muster (`$1` für `animeID`) unverändert; die neue LATERAL-Subquery verwendet ausschließlich Spaltenreferenzen (`fg.id`), keine neuen Nutzereingaben in der SQL-Struktur |
| Open Redirect über `groupProjectHref`/Navigationsziele | Tampering | Beide Ziele werden ausschließlich aus serverseitig geladenen, bereits vertrauenswürdigen Slugs gebaut (`buildPublicFansubProjectPath`), nie aus dem `fansub`-Query-Parameter direkt als Redirect-Ziel übernommen |

## Sources

### Primary (HIGH confidence)
- [Next.js Docs — Linking and Navigating, Abschnitt „Native History API"](https://nextjs.org/docs/app/getting-started/linking-and-navigating) — Next.js 16.3.5 (abgerufen 2026-09-17), bestätigt `window.history.pushState`/`replaceState`-Integration mit `usePathname`/`useSearchParams` und das Fehlen eines Server-Roundtrips, im Gegensatz zu clientseitigen Übergängen via `<Link>`/`router.push`
- Direktes Lesen der betroffenen Quelldateien: `frontend/src/app/anime/[id]/page.tsx`,
  `frontend/src/components/fansubs/FansubVersionBrowser.tsx`,
  `frontend/src/components/fansubs/ActiveFansubStory.tsx`,
  `frontend/src/lib/fansub-summary.ts`, `frontend/src/lib/fansubProjectRoutes.ts`,
  `frontend/src/types/fansub.ts`, `frontend/src/app/suche/useDebouncedSearch.ts`,
  `frontend/src/components/fansubs/FansubStorySection.tsx`,
  `backend/internal/repository/fansub_repository.go`,
  `backend/internal/handlers/fansub_group_anime.go`,
  `backend/internal/models/fansub.go`, `shared/contracts/openapi.yaml`,
  `frontend/eslint.config.mjs`, bestehende Testdateien (`FansubVersionBrowser.test.tsx`,
  `ActiveFansubStory.test.tsx`, `page.test.tsx`, `fansub_repository_test.go`,
  `anime_relations_admin_postgres_test.go`)
- Read-only SQL-Queries gegen `team4sv30-db` (`psql -U team4s -d team4s_v2`, ausschließlich
  `SELECT`), ausgeführt 2026-09-17

### Secondary (MEDIUM confidence)
- WebSearch „Next.js history.pushState searchParams app router update URL without server fetch"
  (2026-09-17) — bestätigte die Existenz des Patterns vor dem direkten Doku-Abruf, als
  Kreuzverifikation genutzt

### Tertiary (LOW confidence)
- keine — alle sicherheitsrelevanten/technischen Kernaussagen wurden gegen die offizielle Next.js-
  Dokumentation oder direkt gegen den Quellcode/die Live-Datenbank verifiziert

## Metadata

**Confidence breakdown:**
- Standard-Stack: HIGH — keine neuen Packages, alle Bausteine bereits im Projekt bzw. offiziell
  dokumentierte Web-/Next.js-Plattform-APIs
- Architektur (URL-Mechanismus D-03/D-04): HIGH für den Chip-Klick-Pfad (offizielle Next.js-16-Doku
  exakt für diesen Anwendungsfall), MEDIUM für den Zurück/Vor-`popstate`-Pfad (siehe Assumptions
  Log A1) — empfohlene Gegenmaßnahme: dedizierter Component-Test in Wave 0, der das reale Next.js-
  16-Laufzeitverhalten verifiziert, bevor der Planner sich vollständig darauf verlässt
- Backend-Query-Erweiterung: HIGH — direkt aus bestehendem, funktionierendem Code
  (`listPublicFansubStories`) abgeleitet, dieselbe Filterlogik, nur als LATERAL-Join gebündelt
- Pitfalls: HIGH — aus direkter Codeanalyse und Live-DB-Abfrage abgeleitet, nicht aus Training
  geraten
- Datenbestand für Browser-Verifikation: HIGH — Live-`SELECT`-Ergebnisse vom Recherchezeitpunkt

**Research date:** 2026-09-17
**Valid until:** ca. 2026-10-17 (30 Tage) für die Code-/Architektur-Aussagen; der
Datenbestands-Teil (Read-only-Inventar) ist nur bis zur nächsten Datenänderung durch den
Auftraggeber gültig — vor der eigentlichen Browser-Verifikation in §17 erneut per `SELECT`
prüfen, ob sich die Konstellationen (insb. „Gruppe ohne Logo") geändert haben
