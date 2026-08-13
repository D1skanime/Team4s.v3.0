# Phase 73: Public Fansub Page `/fansubs/[slug]` erweitern - Context

**Gathered:** 2026-06-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Die **bestehende** öffentliche Fansub-Seite `/fansubs/[slug]` wird kuratiert
erweitert (KEINE neue Route), sodass Besucher die Gruppe „als Geschichte"
verstehen. Reine **Read-/Anzeige-Phase** über bestehende API-Seams und die in
Phase 72 definierten Lese-Projektionen (Mitglied/Mitwirkender/historisch-Trennung,
Media-Ownership).

Geliefert wird eine **einspaltige, kuratierte Erzählseite** in fester Reihenfolge:
**Hero → Kurzgeschichte (Story) → Highlights → Projekte → Mitglieder → externe
Mitwirkende → Medien (nach Ownership) → Timeline → Deep-Dive-Verlinkung**.

**Explizit NICHT in Phase 73 (read-only):**
- Keine Schreib-/Pflege-Flows (Beiträge erfassen, Medien bereitstellen, Story
  bearbeiten, Highlights kuratieren) — diese leben in Phase 77/78/79.
- Keine Public-Preview-/Readiness-Pflege für Leader → Phase 77 (Decision 7).
- Keine neue Route, keine ad-hoc-Fetches, keine Token-/Cookie-Direktzugriffe (Lock K).
- Keine Gruppenmitgliedschaft aus Contributions ableiten; keine Vermischung
  historischer Mitglieder mit App-Mitgliedern (Decision 3).

**Abhängigkeit:** Phase 72 (Domänen-Projektionen & Status-Fundament) ist geplant,
aber zum Diskussionszeitpunkt **noch nicht ausgeführt**. Die konsumierten
Projektions-DTOs entstehen dort. Phase 73 baut darauf auf (`Depends on: Phase 72`).

</domain>

<decisions>
## Implementation Decisions

### Layout-Paradigma (Decision 2 Reihenfolge LOCKED)
- **D-01:** **Kuratierte vertikale Scroll-Seite** statt der bisherigen reinen
  Tab-Struktur. Die bestehenden `FansubProfileTabs`-Inhalte werden zu
  Seiten-Abschnitten umgebaut/wiederverwendet (kein Wegwerfen der Logik, aber
  Darstellung als Erzählung statt Reiter).
- **D-02:** **Verbindliche Abschnitts-Reihenfolge** (Decision 2):
  Hero → **Kurzgeschichte/Story (zuerst, direkt nach Hero)** → Highlights →
  Projekte → Team & Mitglieder → externe Mitwirkende → Medien → Timeline → Deep-Dive.
  (Korrektur ggü. erstem Mockup: Story kommt VOR Highlights.)
- **D-03:** **Einspaltige Erzählung** — zentrierte Lesespalte mit max. Lesebreite,
  alle Abschnitte untereinander. KEIN Zwei-Spalten-Desktop-Split (das im ersten
  Mockup gezeigte Zwei-Spalten-Layout war ein Generator-Artefakt, nicht gewollt).
  Innerhalb einzelner Abschnitte (Projekte, Medien, aktive Mitglieder) sind
  Raster/mehrere Spalten erlaubt.
- **D-04:** **Sektions-Navigation:** Desktop = klebende Sektions-Nav mit Ankern
  (Story · Highlights · Projekte · Team · Mitwirkende · Medien …). Mobil =
  klebende, **horizontal scrollbare Chip-Leiste** mit denselben Sprungmarken.
- **D-05:** **Highlights automatisch abgeleitet** aus vorhandenen Daten (z. B.
  Anzahl Projekte/Releases, aktive Jahre, längste aktive Mitglieder) — KEIN neues
  Pflege-/Kurations-Feld, kein Schreib-Flow in Phase 73.
- **D-06:** **Responsiv / mobile-first:** auf Mobil stapeln alle Abschnitte in
  derselben Reihenfolge einspaltig; mehrspaltige Abschnitte (Medien-3-Bereiche,
  Projekt-Raster) fallen auf eine Spalte zusammen.

### Mitglieder vs. Mitwirkende (Decision 3 LOCKED)
- **D-07:** **Zwei klar getrennte Abschnitte** mit deutlichem Trenner:
  „Team & Mitglieder" (Quelle: `fansub_group_members`/`fansub_group_member_roles`
  + `hist_fansub_group_members`/`hist_group_member_roles`) und ein **eigener,
  abgesetzter Block** „Externe Mitwirkende" (Quelle: `anime_contributions`/
  `anime_contribution_roles`/`release_member_roles`). Eine Contribution erscheint
  NIE im Team-Block.
- **D-08:** **Untergruppen im Team-Block:** Aktiv (prominent, farbige
  Avatar-Karten) / Ehemalig / **Historische Nennungen (gedämpft)** / **Gedenken**
  (würdevoller Sonderblock, keine Aktivität/keine Mengen-Badges — Anzeige hier,
  Memorial-Verhalten kommt in Phase 74).
- **D-09:** **Historische/unbestätigte Nennungen abschwächen** (Decision 3:
  dürfen nicht so stark wirken wie bestätigte Mitgliedschaften): eigener,
  optisch gedämpfter Unterbereich (grau, kleiner, flacher, ohne Avatar) mit Badge
  **„unbestätigt"**.
- **D-10:** **Verlinkung historischer Mitglieder:** geclaimt → Link auf
  `/members/[slug]`; ungeclaimt → nur Name/Nennung (keine Profilseite, kein Link).
  Klarstellung: Historische Mitglieder existieren als Datensatz BEVOR ein Claim
  erfolgt (Leader-angelegt); der Claim ist ein separater, späterer Schritt.

### Medien nach Ownership (Decision 8/G LOCKED)
- **D-11:** **Drei getrennte, fest beschriftete Medien-Bereiche** ohne Vermischung
  der Quell-Tabellen: **„Gruppenmedien"** (`fansub_group_media` / `media_assets` /
  `media_files` / `fansub_groups.logo_id`/`banner_id`), **„Release-Einblicke"**
  (Release-Version-Medien-Kontext) und **„Team & Erinnerungen"**
  (Member-/Erinnerungsmedien, `media_assets.owner_member_id`). Auf Mobil
  untereinander statt nebeneinander.
- **D-12:** Medien-/Personen-Anzeige respektiert die Phase-72-Projektionsfelder
  (Owner-Typ/-ID, Kategorie, Sichtbarkeit, Reviewstatus) — nur sichtbare/
  freigegebene/öffentliche Inhalte werden öffentlich gezeigt.

### Projekte / Deep-Dive (Decision D)
- **D-13:** **Projektkarten verlinken auf `/anime/[id]/group/[groupId]`** als
  Deep-Dive (Phase 75-Surface).

### Leader-Preview & Empty States
- **D-14:** **Public-Preview / Readiness-Pflege NICHT in Phase 73** → erst Phase 77
  (Leader Workspace, Decision 7). Phase 73 bleibt reine öffentliche Read-Seite.
- **D-15:** **Empty States = Platzhalter anzeigen:** Abschnitt bleibt sichtbar mit
  dezentem Hinweis (z. B. „Noch keine Medien hinterlegt"). Konsistente Struktur;
  Sektions-Nav-Anker bleiben dadurch stabil.

### Claude's Discretion
- Konkrete Komponenten-Aufteilung (Refactor von `FansubProfileTabs` in
  Section-Komponenten vs. neue Section-Komponenten), CSS-Module-Struktur,
  Sticky-Nav-/Chip-Implementierung, konkrete Highlights-Kennzahlen-Auswahl,
  exakte Schwellwerte/Sortierung — Planner/Executor, solange D-01..D-15 und die
  v1.2-Locks eingehalten werden.
- Ob neue Public-API-Felder/Projektionen aus Phase 72 direkt konsumiert werden
  oder bestehende Helper (`getFansubBySlug`, `getFansubMembers`,
  `getFansubContributions`) erweitert werden — Planner-Entscheid unter Lock K
  (Contract-zuerst).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Meilenstein-Entscheidungen (LOCKED — gelten für alle v1.2-Phasen)
- `.planning/milestones/v1.2-DISCUSSION.md` — verbindliche Entscheidungen A–K;
  insb. **Entscheidung 2** (Public Fansub Page, Reihenfolge, Reuse, Datenherkunft,
  Pflicht-Labels), **Entscheidung 3** (Mitglieder vs. Mitwirkende), **Entscheidung 8/G**
  (Media-Ownership-Matrix), **Entscheidung 14/K** (Contract-Disziplin),
  **Entscheidung 7** (Leader-Preview/Readiness → Phase 77). **MUST read.**

### Fundament-Phase (Quelle der konsumierten Projektionen/DTOs)
- `.planning/phases/72-dom-nen-projektionen-status-fundament/72-CONTEXT.md` —
  Domänen-Projektionen (Mitglied/Mitwirkender/historisch), Status-/Sichtbarkeits-/
  Review-Felder, Media-Ownership-Projektion (D-01..D-06 dort).
- `.planning/phases/72-dom-nen-projektionen-status-fundament/72-RESEARCH.md` /
  `72-0X-PLAN.md` — konkrete DTO-/Endpoint-/Feldnamen, sobald ausgeführt.

### Systeminventar / Ownership / Runtime-Authority
- `docs/architecture/current-system-inventory.md` — Routen/API/DB/Ownership-Karte,
  „Media Ownership Matrix", „Core Ownership Rules", Duplication Traps.
- `docs/architecture/db-runtime-authority-map.md` — keine Read-Umstellung
  öffentlicher Anime-Reads ohne Authority-Entscheid.
- `docs/architecture/db-schema-fansub-domain.md` — Domänenregeln Fansub/Release.

### Contracts (Lock K — Pflicht vor Endpoint-/DTO-/Typ-Änderungen)
- `shared/contracts/openapi.yaml` — Umbrella-Contract.
- `shared/contracts/admin-content.yaml` — falls admin-content-Projektionen betroffen.
- `docs/api/api-contracts.md` — Contract-Regeln.
- `frontend/src/lib/api.ts` — zentraler API-Client/Typen (kein ad-hoc-Fetch).

### Bestehende Seite & Reuse-Komponenten
- `frontend/src/app/fansubs/[slug]/page.tsx` — bestehende Public-Fansub-Seite
  (Server Component, lädt group/members/projects/leader_timeline).
- `frontend/src/components/fansubs/FansubProfileTabs.tsx` (+ `.module.css`) —
  bestehende Tab-Inhalte → Umbau zu Erzähl-Abschnitten.
- `frontend/src/components/fansubs/GroupLeaderTimeline.tsx` (+ `.module.css`) —
  Timeline-Abschnitt.
- `frontend/src/components/groups/CollapsibleStory.tsx` — Story-Darstellung (Reuse).
- `frontend/src/lib/fansub-summary.ts` (`buildFansubFactSummary`) — Hero-Kurzfakten.
- Globales Design-System `@/components/ui` (Button, Card, Tabs, … — Pflicht laut CLAUDE.md).

### Datenquellen (Decision 2 — sauber halten)
- Gruppenbasis: `fansub_groups` (+ `logo_id`/`banner_id`).
- App-Mitgliedschaft: `fansub_group_members`, `fansub_group_member_roles`.
- Historische Mitglieder: `hist_fansub_group_members`, `hist_group_member_roles`.
- Mitwirkende: `anime_contributions`, `anime_contribution_roles`, `release_member_roles`.
- Gruppenmedien: `fansub_group_media`, `media_assets`, `media_files`.
- Member-Medien: `media_assets.owner_member_id`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FansubProfileTabs` (Tabs Übersicht/Mitglieder/Projekte/Archiv/Erinnerungen) →
  Inhalte/Logik in Section-Komponenten der Scroll-Seite überführen (D-01).
- `GroupLeaderTimeline` → Timeline-Abschnitt direkt nutzbar.
- `CollapsibleStory` (`components/groups/`) → Story-Abschnitt.
- Bestehende API-Helper in `frontend/src/lib/api.ts`: `getFansubBySlug`,
  `getFansubMembers`, `getFansubContributions` (liefert u. a. `leader_timeline`),
  `getAnimeList` (Projekte je `fansub_id`).
- `buildFansubFactSummary` für Hero-Kurzbeschreibung.

### Established Patterns
- Public-Seite als **Server Component** mit serverseitigem Daten-Fetch über
  `lib/api.ts` (kein ad-hoc-Fetch im Browser, Lock K).
- Envelope-Konvention `{"data": ...}` der API.
- Globales UI-Primitives-Gebot (`@/components/ui`) — native `<select>/<input>/…`
  vermeiden (CLAUDE.md).
- Korrekte deutsche Umlaute in allen user-facing Strings (CLAUDE.md).
- Produktionsdateien ≤ 450 Zeilen → Seite in Section-Komponenten splitten.

### Integration Points
- Konsum der Phase-72-Lese-Projektionen (Mitglied/Mitwirkender/historisch-Trennung,
  Media-Ownership, Status/Sichtbarkeit/Review) — Quelle der getrennten Mengen.
- Projektkarten → Deep-Dive-Route `/anime/[id]/group/[groupId]` (Phase 75).
- Member-Verlinkung → `/members/[slug]` (Phase 74) bei geclaimten historischen
  Mitgliedern.

</code_context>

<specifics>
## Specific Ideas

- **Mockup-Referenz:** Während der Diskussion wurde ein gerendertes HTML/Bild-Mockup
  erzeugt, das die gewünschte Struktur bestätigt (Sticky-Nav, Hero, Highlights-Kacheln,
  Projekt-Raster, „Team & Mitglieder" mit Aktiv/Ehemalig/**gedämpften** historischen
  Nennungen + Badge „unbestätigt"/Gedenken, separater „Externe Mitwirkende"-Block,
  drei Medien-Bereiche). **Zwei Korrekturen** ggü. dem Mockup: (1) **Story kommt zuerst**
  (vor Highlights, D-02); (2) **einspaltig**, kein Desktop-Zwei-Spalten-Split (D-03).
- Pflicht-Labels (Decision 2): „Gruppenmedien", „Projektbilder", „Release-Einblicke",
  „Team & Erinnerungen", „externe Mitwirkende", „historische Nennungen".

</specifics>

<deferred>
## Deferred Ideas

- **Schreib-Flows im Kontext (historischer) Mitglieder** — Leader erfasst Beiträge
  (`anime_contributions`) / stellt Medien bereit. Bewusst NICHT in Phase 73 (read-only).
  → **Contribution-Pflege/Review: Phase 78**; **Member-Medien-Upload/Ownership-
  Durchsetzung: Phase 79**. (Anlass: Nutzerfrage während Diskussion.)
- **Public Preview + Public-Readiness-Check** für Leader → **Phase 77** (Decision 7, D-14).
- **Memorial-Setter + Claim-Sperre + Memorial-Profilverhalten** → **Phase 74** (Decision 12/J).
- **Korrektur-melden / Vorschlags-Flows** (registrierte User) → Phasen 74/76 (Decision 4/6).

### Reviewed Todos (not folded)
- `2026-06-03-contribution-dropdown-auf-globale-ui-primitives-umstellen.md` —
  betrifft **Admin**-Contribution-UI (Phase 67-Folgearbeit), nicht die Public-Seite.
- `2026-06-03-credits-ui-konsolidierung-und-permission-bruecke.md` — Admin
  Credits-UI-Konsolidierung, anderer Surface.
- `2026-06-03-member-profil-ui-und-params-bug.md` — Public **Member**-Profil →
  gehört zu **Phase 74**, nicht 73.

</deferred>

---

*Phase: 73-public-fansub-page-fansubs-slug-erweitern*
*Context gathered: 2026-06-04*
</content>
</invoke>
