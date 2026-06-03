# Phase 71: UI-Politur Fansub-Contributions und Member-Profil auf globales Design-System - Context

**Gathered:** 2026-06-03
**Status:** Ready for planning
**Source:** Live-UAT-Befunde (2026-06-03, 3 Todos) + Discuss-Phase (12 Entscheidungen)

<domain>
## Phase Boundary

Diese Phase bringt bestehende Contribution- und Member-Profil-Flaechen durchgaengig
auf das globale Design-System (`@/components/ui`) und trennt Anzeige- sauber von
Bearbeiten-Kontext. Sie buendelt drei beim Live-UAT (2026-06-03) erfasste UI-Befunde.

**In Scope:**
- Release-Version-Dropdown im `AnimeContributionModal` auf `Select` + `FormField` umstellen
  (zwei native `<select>`, Zeilen 349/365); `ReleaseVersionBreakdown` an globale Tokens angleichen.
- Credits-Anzeige in "Anime & Veroeffentlichungen" konsolidieren, "Anime-Beitraege"-Tab aufloesen,
  durchgaengig "Mitwirkende" benennen.
- Permission-Bruecke als Produktentscheidung klaeren + dokumentieren (KEINE Implementierung).
- Member-Profil: params-Korrektheitsbug fixen, Badge-Verwaltung in Edit-Kontext verschieben,
  Rollen-Timeline-Styling fixen, Medienbild-Aspect-Ratio korrigieren.
- Erfolgs-Badges visuell aufwerten (Icon + Farbe pro festem badge_code, Frontend-Mapping).
- UI-Politur-Flaechen von nativen Elementen auf globale Primitives migrieren.

**Out of Scope:**
- Neue Datenmodelle/Backends (ausser kleinen Korrektheits-Fixes).
- Implementierung der Permission-Bruecke (nur Entscheidung dokumentieren).
- Custom-Badge-Artwork-Upload (SVG/PNG) + Badge-Verwaltungs-Oberflaeche (-> aufgeschobene Idee).
- Projektweite Migration ALLER ~17 nativen Altfaelle ausserhalb der Phase-71-Flaechen.
- Anhebung des ESLint-Guards von `warn` auf `error` (bleibt `warn`).
</domain>

<decisions>
## Implementation Decisions

### Permission-Bruecke (SC2-B) — nur dokumentieren
- **D-01:** Phase 71 KLAERT und DOKUMENTIERT die Permission-Bruecke nur; es wird keine
  Grant-UI und kein Backend gebaut (SC2 verlangt woertlich "als Produktentscheidung
  geklaert und dokumentiert").
- **D-02:** Dokumentiertes Modell ("Bruecke statt Vermischung"): Beim Anlegen eines
  Credits mit Rolle schlaegt die UI OPTIONAL vor, dem verknuepften App-User die passende
  Permission zu geben — aber als **separaten, explizit bestaetigten, jederzeit
  widerrufbaren Grant** in der Permission-Engine. Credit bleibt reine Attribution.
  Baut auf Phase-69-Entscheidung auf: Credit != Permission (`roleMatrix`/`CanForFansubGroup`).
  Diese Entscheidung gehoert verbindlich nach `.planning/DECISIONS.md` und CONTEXT.

### Credits-IA & Benennung (SC2-A)
- **D-03:** Der separate Tab "anime-beitraege" ("Anime-Beitraege") wird AUFGELOEST.
  Mitwirkende werden in "Anime & Veroeffentlichungen" (Tab-Key `releases`) integriert,
  dort wo Versionen/Episoden bereits ordentliches UI haben.
- **D-04:** Platzierung: Mitwirkende primaer ANIME-WEIT anzeigen/pflegen; versions-spezifische
  Credits als optionale Praezisierung neben der jeweiligen Release-Version (folgt Phase-67-D-10
  "global zuerst -> Version spaeter"). Kein Datenmodell-Umbau.
- **D-05:** Editier-Einstieg: Jede Anime-Zeile/-Karte in "Anime & Veroeffentlichungen" bekommt
  eine "Mitwirkende"-Aktion, die das BESTEHENDE `AnimeContributionModal` oeffnet (Modal bleibt,
  nur der Einstiegspunkt wandert aus dem aufgeloesten Tab).
- **D-06:** Umbenennung "Beitraege" -> "Mitwirkende" UEBERALL konsistent: Admin-Edit,
  oeffentliche Anime-Seite, oeffentliche Gruppen-/Member-Profile, alle Zaehler/Labels.
- **D-07:** Alter Tab-Key `anime-beitraege` wird ERSATZLOS entfernt (kein Redirect);
  Default/Fallback faellt auf "Anime & Veroeffentlichungen". Admin-internes Tool,
  Deeplinks unkritisch.

### Mitwirkende-Anzeige (oeffentlich)
- **D-08:** Sortierung: nach Rolle gruppiert, Lead-/wichtigste Rollen zuerst
  (z. B. project_lead/editor), innerhalb gleicher Rolle alphabetisch nach Name.
- **D-09:** Empty-State: Hat ein Anime (noch) keine Mitwirkenden, wird die Sektion auf der
  oeffentlichen Anime-Seite GANZ AUSGEBLENDET (kein Leer-Placeholder).

### Anzeige- vs. Bearbeiten-Trennung (SC3/SC4)
- **D-10:** Badge-Verwaltung ("Ausblenden"/Sichtbarkeit) wandert in den bestehenden
  Edit-Bereich `/me/profile`. Die oeffentliche Profilseite (`members/[slug]`) zeigt Badges
  nur an — kein "Ausblenden"-Link mehr inline. `MemberBadgeChips` verliert die Owner-Mutations-
  Controls auf der Anzeigeseite.
- **D-11:** `/admin/my-groups` ist bereits anzeige-orientiert (globale Button/Badge/Card,
  nur Navigations-/Refresh-Aktionen, Hinweis "Credits geben keine Rechte") — hier kein Umbau,
  nur Verifikation der Anzeige-/Bearbeiten-Trennung.

### Erfolgs-Badge-Optik (SC3)
- **D-12:** Jedem festen, abgeleiteten badge_code (`founding_member`, `historical_leader`,
  `long_term_member`, `first_contribution`, `verified`) wird ein `lucide-react`-Symbol +
  Farb-Variante zugeordnet (reines Frontend-Mapping), gerendert ueber den globalen `Badge`-
  Primitiv. Kein Datenmodell, keine Upload-Funktion. Badges bleiben engine-abgeleitet.

### Migrations-Umfang & ESLint-Guard (SC4)
- **D-13:** Migration nativer `<select>`/`<input>`/`<textarea>` auf `@/components/ui` ist
  auf die Phase-71-Flaechen begrenzt (AnimeContributionModal-Dropdown, ReleaseVersionBreakdown,
  Member-Profil-Chips/Timeline). Die uebrigen ~17 Altfaelle bleiben fuer eine eigene
  Aufraeum-Phase.
- **D-14:** Der ESLint `no-restricted-syntax`-Guard bleibt auf `warn` (Anhebung auf `error`
  erst nach vollstaendiger Migration in einer Folgephase — sonst rote Builds durch
  unmigrierte Bestandsflaechen).

### Korrektheits-Fixes (Implementierung durch Planner)
- **D-15:** `params`-Korrektheitsbug fixen (`React.use(params)` bzw. `await params`), sodass
  keine "param property was accessed directly with `params.id`"-Errors mehr auftreten.
  *Research-Hinweis:* Der Server-Component `members/[slug]/page.tsx` awaitet `params` bereits
  korrekt — die Sync-Access-Errors stammen aus einem anderen `[id]`-Kontext; exakte Fundstelle
  muss der Researcher lokalisieren.
- **D-16:** Medienbild (`RecentMediaSection.tsx:38`, nacktes `<img>` ohne width/height):
  feste Ratio mit `object-fit: cover` und beide Dimensionen setzen -> keine Verzerrung, keine
  "width or height modified, but not the other"-Warnung; Bild-URL/absolute-URL pruefen.
- **D-17:** Rollen-Timeline-Sektion (`MemberRoleTimeline.tsx`): Kontrast/Styling an
  `/dev/ui-system` angleichen, losen "-" entfernen; bei fehlenden Rollen Sektion ganz ausblenden.

### Claude's Discretion
- Konkrete Modal-vs-Drawer-Innengestaltung, Spacing/Token-Details der Primitive-Migration und
  die genaue Icon-Auswahl pro badge_code liegen im Ermessen von Researcher/Planner, solange
  `@/components/ui` und `/dev/ui-system` als Referenz gelten.

### Folded Todos
Alle drei Phase-71-Quell-Todos wurden in den Scope gefaltet:
- **Contribution-UI auf globale components/ui-Primitives umstellen** (Phase-67-Folgearbeit):
  AnimeContributionModal-Dropdown + ReleaseVersionBreakdown auf Primitives. -> D-13, SC1.
- **Credits-UI-Konsolidierung + Permission-Bruecke (Design)**: Tab-Aufloesung, Benennung,
  Permission-Bruecke-Entscheidung. -> D-01..D-07, SC2.
- **Member-Profil-Seite — UI-Politur + params.id-Korrektheitsbug**: params-Fix, Badge-Chips,
  Timeline, Medienbild. -> D-10, D-15, D-16, D-17, SC3.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & Phasen-Entscheidungen
- `.planning/ROADMAP.md` (Phase 71) — Goal + Success Criteria P71-SC1..SC4.
- `.planning/phases/69-fansub-contributions-contract-und-permission-haertung/69-CONTEXT.md` —
  Permission-Modell (Credit != Permission; `CanForFansubGroup`/`roleMatrix`), Member-Create-Flow.
- `.planning/DECISIONS.md` — Zielort fuer die dokumentierte Permission-Bruecke-Entscheidung (D-01/D-02);
  Phase-67-D-10 "global zuerst -> Version spaeter" als Bezug fuer D-04.

### Globales Design-System (Pflicht)
- `frontend/src/components/ui/index.ts` — Barrel der globalen Primitives (Button, Card, Modal,
  Select, FormField, Input, Textarea, Tabs, Drawer, Table, Badge, ...).
- `frontend/src/app/dev/ui-system/page.tsx` — Showcase/Referenz fuer Token- und Primitive-Nutzung.
- `frontend/eslint.config.mjs` (§ uiPrimitiveGuard, `no-restricted-syntax`, aktuell `warn`) —
  Guard gegen native `<select>/<input>/<textarea>`; ~17 Altfaelle dokumentiert.
- `CLAUDE.md` (Abschnitte "Frontend-UI (globales Design-System)" + "Sprachqualitaet") —
  Primitive-Pflicht + Umlaut-Regel fuer user-facing DE-Strings.

### Contribution-/Credits-Flaechen
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx` — native `<select>`
  (Zeilen 349/365) -> Select+FormField; bleibt das Editier-Modal (D-05).
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionsTab.tsx` — aufzuloesender Tab-Inhalt.
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` (MAIN_TABS, Zeilen 185-196) — Tab-Liste:
  `anime-beitraege` entfernen, Inhalt nach `releases` integrieren.
- `frontend/src/components/anime/ReleaseVersionBreakdown.tsx` — an globale Tokens angleichen.

### Member-Profil
- `frontend/src/app/members/[slug]/page.tsx` — oeffentliche Anzeige (Server-Component, awaitet `params`).
- `frontend/src/app/me/profile/page.tsx` — Edit-Kontext, Zielort der Badge-Verwaltung (D-10).
- `frontend/src/components/profile/MemberBadgeChips.tsx` — Owner-"Ausblenden" entfernen (D-10);
  Icon+Farbe pro badge_code (D-12).
- `frontend/src/components/profile/MemberRoleTimeline.tsx` — Styling/Empty-State-Fix (D-17).
- `frontend/src/components/profile/RecentMediaSection.tsx` (Zeile 38) — Medienbild-Aspect-Ratio (D-16).

### Badges (Backend, nur lesend relevant)
- `backend/internal/services/badge_service.go` — abgeleitete Badge-Codes/Engine
  (founding_member, historical_leader, long_term_member, first_contribution, verified).
- `frontend/src/types/contributions.ts` (`MemberBadge`, Zeilen 168-178) — Badge-Shape (badge_code,
  badge_category, visibility); kein Grafik-Feld -> bestaetigt D-12 (Frontend-Mapping).

### Display-only Surface (nur Verifikation)
- `frontend/src/app/admin/my-groups/page.tsx` — bereits konform (D-11).
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `@/components/ui` (20 Primitives): `Select` + `FormField` ersetzen das native Dropdown;
  `Badge` traegt Icon+Farbe; `Modal`/`Drawer`, `Card`, `Tabs`, `Table` fuer die Konsolidierung.
  Das globale UI wird bereits in 33 Dateien importiert (inkl. Geschwister-Tabs im selben Ordner).
- `AnimeContributionModal` importiert bereits `{ Button, Modal }` aus `@/components/ui` — nur das
  Dropdown ist nativ; Wiederverwendung des Modals als Editier-Einstieg (D-05) ist minimal-invasiv.
- `FANSUB_GROUP_ROLE_OPTIONS` / Role-Konstanten in `frontend/src/types/fansub.ts` (seed-konform,
  vgl. Phase 69 F8) fuer konsistente Rollen-Auswahl.

### Established Patterns
- Tab-Struktur ueber `MAIN_TABS` in `edit/page.tsx` (Key+Label-Paare) — Aufloesen = Eintrag
  entfernen + Inhalt in `releases`-Tab verschieben.
- Badge-Chips rendern derzeit reinen Text via `BADGE_LABELS`-Map in `MemberBadgeChips.tsx:10` —
  Erweiterung um Icon/Farbe per badge_code-Map ist dasselbe Muster.
- ESLint `uiPrimitiveGuard` definiert die verbindliche Primitive-Pflicht maschinell (warn).

### Integration Points
- Oeffentliche Anime-Seite konsumiert Mitwirkende -> Sortierung (D-08) + Empty-State (D-09) dort.
- `/me/profile` muss Badge-Sichtbarkeits-Mutation (`patchMyBadgeVisibility`) aufnehmen, die heute
  in `MemberBadgeChips` auf der Anzeigeseite sitzt.
- Benennung "Mitwirkende" (D-06) beruehrt mehrere Flaechen — Researcher muss alle Vorkommen
  von "Beitraege"/"Beitrag" (Labels, Zaehler) projektweit ermitteln.
</code_context>

<specifics>
## Specific Ideas

- "Beitraege" ist ein schwaches Wort -> "Mitwirkende" (passt zu oeffentlich "X Mitwirkende").
- Badge-Chips sollen grafisch erkennbar werden (Symbol pro Erfolg), nicht nur Text.
- Anzeige soll "clean" bleiben; Verwaltungsaktionen gehoeren konsequent in den Bearbeiten-Kontext
  (gleiches Muster wie bei den Gruppen-Meilensteinen aus Phase 68).
- Referenz fuer alle visuellen Angleichungen: `/dev/ui-system`.
</specifics>

<deferred>
## Deferred Ideas

- **Custom-Badge-Artwork-Upload + Badge-Verwaltungs-Oberflaeche** — eigene SVG/PNG je Badge
  hochladen und verwalten. Erfordert neues Datenmodell (Badge-Asset-Storage), Upload-Handling
  und Admin-CRUD; widerspricht dem aktuell rein abgeleiteten Badge-Modell. -> eigene Roadmap-Phase.
- **Projektweite Migration aller ~17 nativen Altfaelle** + Anhebung des ESLint-Guards von
  `warn` auf `error` -> dedizierte Aufraeum-Phase (D-13/D-14).
- **Implementierung der Permission-Bruecke** (Grant-Vorschlag-UI + Permission-Engine-Grant) —
  in Phase 71 nur als Entscheidung dokumentiert (D-01/D-02), Umsetzung in eigener Phase.
</deferred>

---

*Phase: 71-ui-politur-fansub-contributions-und-member-profil-auf-global*
*Context gathered: 2026-06-03*
