# Phase 114: Öffentliche Fansub-Gruppen-Übersicht - Context

**Gathered:** 2026-07-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 114 belebt den bislang deaktivierten Navigationseintrag **„Fansub-Gruppen"** mit einer
öffentlichen **Übersichts-/Landing-Seite unter `/fansubs`**: ein Gruppen-Directory, das alle
Fansub-Gruppen listet und je Zeile auf die bereits vorhandene Detailseite `/fansubs/[slug]`
verlinkt.

Bewusst schlank (Nutzerprinzip „klein bleiben, Idee für Idee"): reines Directory + Einstieg.
**Keine** gruppenbezogene Punkte-/Rangliste (bleibt deferred), **keine** Suche/Filter über die
einfache Liste hinaus, kein Backend-Umbau — die Daten und die Detailseite existieren bereits.

</domain>

<decisions>
## Implementation Decisions

### D-01 Einstieg / Navigation
- Der deaktivierte AppShell-Eintrag **„Fansub-Gruppen" (`badge: 'bald'`, `disabled: true`)** wird
  aktiviert und zeigt auf **`/fansubs`** — sichtbar anonym UND eingeloggt (analog „Anime
  entdecken" / „Rangliste").

### D-02 Übersichtsseite
- Neue Index-Seite **`/fansubs` (`page.tsx`)** — bisher existieren dort nur `[slug]`/`[fansubSlug]`-
  Detailrouten, kein Landing.
- Ein **Gruppen-Directory**: alle Gruppen mit Name/Logo und den schon berechneten Kennzahlen
  **Anime-Projekte, Release-Versionen, Mitglieder** (dieselben, die die Detailseite oben zeigt).
- **Jede Zeile verlinkt auf `/fansubs/[slug]`** (bestehende Detailseite).

### D-03 Datenquelle
- Vorhandene **`getFansubList()`** (`GET /api/v1/fansubs`) — kein neuer Endpunkt. Falls einzelne
  Kennzahlen (z. B. `release_versions_count`, Projekt-/Mitgliederzahl) im Listen-Payload noch
  fehlen, ist die kleinstmögliche additive Ergänzung erlaubt; kein Umbau der Gruppen-Domäne.

### D-04 UI
- **Globales UI-System Pflicht** (`@/components/ui`: `Table`/`Card`/`PageHeader` …). Kein
  Eigen-Markup für Primitiv-Typen. Responsiv + barrierefrei.

### Claude's Discretion / offen — kurz zu bestätigen
- **Default-Sortierung:** Vorschlag **nach Release-Versionen absteigend** (Aktivität zuerst, wie
  fansub.de), Gruppenname als Tie-Break. Alternative: alphabetisch. → bitte bestätigen.
- **Darstellung:** Tabelle vs. Karten-Grid — im Rahmen des globalen UI-Systems, Bau-Detail.
- Ob aktive/ruhende Gruppen getrennt gruppiert werden (wie fansub.de) — vorerst **nein** (eine
  Liste), sofern nicht anders gewünscht.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md` — Phase-114-Grenze.
- `./CLAUDE.md` — globales UI-System Pflicht, Umlaute in user-facing Strings, 450-Zeilen-Limit,
  Frontend-Konventionen; UI-Showcase `/dev/ui-system`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/lib/api.ts` — `getFansubList()` (`GET /api/v1/fansubs`), Listing bereits vorhanden.
- `frontend/src/app/fansubs/[slug]/page.tsx` — Detailseite; zeigt bereits „Anime-Projekte",
  „Release-Versionen" (`group.release_versions_count`), „Mitglieder" (`countVisibleTeamMembers`).
- `frontend/src/components/layout/AppShell.tsx` — Nav; „Fansub-Gruppen" ist der deaktivierte
  Eintrag (Zeile ~189), der aktiviert werden muss.
- `@/components/ui` — globale Primitives (Table/Card/PageHeader …).

### Integration Points
- Neue Datei `frontend/src/app/fansubs/page.tsx` als Index; verlinkt auf die bestehende
  `[slug]`-Detailroute. Nav-Eintrag in AppShell aktivieren.

</code_context>

<specifics>
## Specific Ideas

- Vorbild fansub.de-Gruppenliste: Name, Aktivität, Release-Anzahl, sortierbar. Team4s hat die
  Detailseiten schon — es fehlt nur der Einstieg/das Directory.
- Analogie zum roten Faden: Member-Rangliste (109/110) hat den Member-Einstieg gebracht; 114
  bringt das Gegenstück auf Gruppen-Ebene.

</specifics>

<deferred>
## Deferred Ideas

- **Gruppenbezogene Punkte-/Ranglisten** (aggregierte Gruppenleistung) — bleibt deferred, bis
  eigens gewünscht (knüpft an die in Phase 109 zurückgestellten Gruppen-Ranglisten an).
- **Öffentliche Suche** und **Public Dashboard** — die beiden anderen deaktivierten Nav-Einträge,
  jeweils eigene spätere Phasen.
- Aktiv/ruhend/inaktiv-Gruppierung und Sortier-/Filter-Steuerung über die Default-Sortierung hinaus.

</deferred>

---

*Phase: 114-oeffentliche-fansub-gruppen-uebersicht*
*Context gathered: 2026-07-28*
