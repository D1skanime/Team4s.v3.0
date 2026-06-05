# Phase 75: Anime-Gruppen-Deep-Dive `/anime/[id]/group/[groupId]` - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Die **bestehende** öffentliche Route `/anime/[id]/group/[groupId]` (Hero +
Projektgeschichte + `GroupAssetShowcase` + `/releases`-Subpage) wird **gestärkt**,
sodass Besucher den gruppenspezifischen Anime-**Projektkontext** als Erzählung
verstehen: Projektstory, beteiligte Member/Mitwirkende, Releases/Versionen,
OP/ED/Middle (Themes/Segmente), Release-Version-Medien, Rückverlinkung zu Gruppe
& Anime. **Keine neue Route.**

Reine **öffentliche Read-/Anzeige-Phase** über bestehende (ggf. erweiterte)
öffentliche API-Seams. Konsumiert die Phase-72-Lese-Projektionen
(Mitglied/Mitwirkender-Trennung, Media-Ownership, Sichtbarkeit/Reviewstatus) und
spiegelt das Erzähl-Paradigma der Phase 73 (`/fansubs/[slug]`).

**Explizit NICHT in Phase 75 (read-only — bestätigt):**
- Keine Schreib-/Pflege-/Upload-Flows (Story/Medien/Contributions pflegen) →
  Phasen 77/78/79.
- Keine neue Route, keine ad-hoc-Fetches, keine Token-/Cookie-Direktzugriffe (Lock K).
- **Keine gruppenspezifische Projektstory/-daten auf die neutrale Anime-Ebene
  schreiben** (Entscheidung 9). Fansub-Kontext nur über `anime_fansub_groups`,
  `fansub_releases`, `release_versions`, `release_version_groups`.
- Keine Umstellung öffentlicher Anime-Reads auf andere Tabellen ohne
  Runtime-Authority-Entscheid.
- Keine Vermischung von App-Mitgliedern und externen Mitwirkenden (Decision 3).

</domain>

<decisions>
## Implementation Decisions

### Seitenstruktur / Layout
- **D-01:** **Narrative, einspaltige Scroll-Seite** (analog Phase 73 für
  `/fansubs/[slug]`). Die Hauptseite wird zur kuratierten Erzählung umgebaut;
  bestehende Hero-/Showcase-Logik wandert in Abschnitte (kein Wegwerfen der
  Logik). Keine neue Route.
- **D-02:** **Verbindliche Abschnittsreihenfolge:**
  Hero → **Projektstory** → **Mitwirkende & beteiligte Member** →
  **Releases/Versionen** → **OP/ED/Middle (Themes)** → **Release-Version-Medien**
  → Deep-Links/Rückverlinkung. (Bewusst: Menschen **vor** Releases — wer das
  Projekt gemacht hat, bevor was.)
- **D-03:** **Kuratierte Releases-Vorschau auf der Hauptseite + bestehende
  `/releases`-Subpage als volle Liste.** Die Subpage (Filter OP/ED/Karaoke,
  Suche, Pagination) bleibt erhalten; die Hauptseite zeigt nur Highlights mit Link.
- **D-04:** **Sektions-Navigation:** Desktop = klebende Anker-Nav
  (Story · Mitwirkende · Releases · OP/ED/Middle · Medien); Mobil = klebende,
  horizontal scrollbare Chip-Leiste mit denselben Sprungmarken (wie Phase 73 D-04).
- **D-05:** **Empty States = Abschnitt sichtbar mit dezentem Platzhalter**
  (z. B. „Noch keine Mitwirkenden hinterlegt") — stabile Struktur/Anker
  (wie Phase 73 D-15).

### Mitwirkende & beteiligte Member
- **D-06:** **Projektspezifische Personenmenge** — nur wer an **diesem Anime für
  diese Gruppe** mitwirkte. Quellen: `release_member_roles` (je `release_version`)
  + `anime_contributions`/`anime_contribution_roles`, gescoped auf Anime+Gruppe.
  KEIN voller Gruppen-Roster (das lebt auf `/fansubs/[slug]`).
- **D-07:** **Zwei getrennte Blöcke** (Decision 3 LOCKED): „Team-Beteiligte"
  (App-Member-Rollen an den Releases) und ein abgesetzter Block „Externe
  Mitwirkende" (`anime_contributions`). Eine Contribution erscheint NIE im
  Team-Block.
- **D-08:** **Rollen aggregiert je Person übers Projekt** (Rollen über alle
  Releases/Versionen zusammengefasst, z. B. „Timer, Typesetter"). Pro-Version-
  Aufschlüsselung gehört eher in die `/releases`-Tiefe.
- **D-09:** **Verlinkung:** geclaimt → `/members/[slug]` (Phase 74); ungeclaimt →
  nur Name/Nennung, kein Link (wie Phase 73 D-10).

### Releases, Versionen & OP/ED/Middle
- **D-10:** **Kuratierte Releases-Highlights** auf der Hauptseite (neueste/
  wichtigste Releases als wenige Karten) + Link zur vollen `/releases`-Liste.
- **D-11:** **Mehrere Release-Versionen je Release sichtbar machen**, wo Daten es
  hergeben (Label/Hinweis, z. B. v1/v2, TV/BD). Spiegelt die Datenrealität über
  `release_versions`/`release_version_groups`.
- **D-12:** **Dedizierter Themes-Abschnitt** für OP/ED/Middle: Themes der Gruppe
  gruppiert nach Typ (OP/ED/Middle), mit Theme-Infos (Titel/Typ, Segment-/
  Timing-Bezug). Reuse theme/segment-APIs.
- **D-13:** **Themes-Abschnitt MIT visuellen Asset-Einblicken** — öffentliche
  Theme-/Segment-Assets (`release_theme_assets`) zeigen, **sofern sichtbar/
  freigegeben** (Ownership/Visibility nach Decision 8/G + Phase-72-Projektion).
  Read-only, keine Player-/Timing-Editoren.

### Release-Version-Medien
- **D-14:** **Eigener „Release-Einblicke"-Abschnitt**, der die öffentlichen
  `release_version_media` dieser Gruppe/dieses Anime gebündelt als Galerie zeigt
  (klar beschriftet wie Phase 73 D-11). Quelle: `getReleaseVersionMedia`.
- **D-15:** **Sichtbarkeit strikt:** nur öffentlich+freigegebene Medien
  (Phase-72-Projektion, Decision 8/G). Bei keinen sichtbaren Medien bleibt der
  Abschnitt mit dezentem Platzhalter erhalten (konsistent zu D-05) — **nicht**
  ausblenden.

### Claude's Discretion
- Konkrete Komponenten-Aufteilung (Refactor der bestehenden `page.tsx` in
  Section-Komponenten vs. neue Section-Komponenten), CSS-Module-Struktur,
  Sticky-Nav-/Chip-Implementierung, exakte Anzahl/Sortierung der Releases-
  Highlights, Aggregations-/Sortier-Schwellwerte — Planner/Executor, solange
  D-01..D-15 und die v1.2-Locks eingehalten werden.
- Ob bestehende öffentliche Helper (`getGroupDetail`, `getGroupReleases`,
  `getGroupAssets`, `getReleaseVersionMedia`, theme/segment-APIs) erweitert oder
  neue Projektions-Felder/-Endpoints aus Phase 72 konsumiert werden — Planner-
  Entscheid unter Lock K (Contract-zuerst). **Hinweis:** Für die projekt-
  spezifischen Mitwirkenden/Member existiert auf dieser Route noch **kein**
  öffentlicher Read-Seam — Researcher/Planner müssen die Datenherkunft
  (release_member_roles/anime_contributions scoped auf Anime+Gruppe) und einen
  Contract-konformen Seam klären.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Meilenstein-Entscheidungen (LOCKED — gelten für alle v1.2-Phasen)
- `.planning/milestones/v1.2-DISCUSSION.md` — insb. **Entscheidung 9** (Anime im
  Gruppenkontext: Deep-Dive, neutrale Anime-Ebene, Reuse, erlaubte/verbotene
  Datenquellen), **Entscheidung 3/Decision H** (Member vs. Mitwirkende getrennt),
  **Entscheidung 8/G** (Media-Ownership-Matrix), **Entscheidung 14/K**
  (Contract-Disziplin), Decision A (kein Greenfield). **MUST read.**

### Schwester-/Fundament-Phasen (gleiche Paradigmen/Projektionen)
- `.planning/phases/73-public-fansub-page-fansubs-slug-erweitern/73-CONTEXT.md` —
  Erzähl-Paradigma, Sektions-Nav (D-04), Empty-State (D-15), Member-vs-
  Mitwirkende-Trennung (D-07..D-10), Medien-Bereiche (D-11). Phase 73 verlinkt
  via D-13 explizit auf diese Deep-Dive-Route.
- `.planning/phases/72-dom-nen-projektionen-status-fundament/72-CONTEXT.md` (+
  `72-RESEARCH.md`/`72-0X-PLAN.md` sobald ausgeführt) — Domänen-Projektionen
  (Mitglied/Mitwirkender/historisch), Sichtbarkeits-/Reviewstatus-Felder,
  Media-Ownership-Projektion. Quelle der konsumierten DTOs.
- `.planning/phases/74-public-member-profile-members-slug-memorial/74-CONTEXT.md` —
  `/members/[slug]`-Verlinkungsziel geclaimter Personen (D-09).

### Systeminventar / Ownership / Runtime-Authority
- `docs/architecture/current-system-inventory.md` — Routen/API/DB/Ownership-Karte,
  „Media Ownership Matrix", „Core Ownership Rules", Duplication Traps.
- `docs/architecture/db-runtime-authority-map.md` — keine Read-Umstellung
  öffentlicher Anime-Reads ohne Authority-Entscheid (Neutralitäts-Regel).
- `docs/architecture/db-schema-fansub-domain.md` — Domänenregeln Fansub/Release/
  Version (`anime_fansub_groups`, `fansub_releases`, `release_versions`,
  `release_version_groups`, `release_version_media`, `release_member_roles`).

### Contracts (Lock K — Pflicht vor Endpoint-/DTO-/Typ-Änderungen)
- `shared/contracts/openapi.yaml` — Umbrella-Contract.
- `shared/contracts/admin-content.yaml` — falls admin-content-Projektionen betroffen.
- `docs/api/api-contracts.md` — Contract-Regeln.
- `frontend/src/lib/api.ts` — zentraler API-Client/Typen (kein ad-hoc-Fetch).

### Bestehende Seite & Reuse-Komponenten
- `frontend/src/app/anime/[id]/group/[groupId]/page.tsx` — bestehende
  Deep-Dive-Hauptseite (Server Component) → Umbau zu Section-Erzählung (D-01).
- `frontend/src/app/anime/[id]/group/[groupId]/GroupAssetShowcase.tsx` —
  visuelle Episoden-Assets (Reuse).
- `frontend/src/app/anime/[id]/group/[groupId]/releases/page.tsx` — volle
  Releases-Liste (bleibt als Tiefe, D-03).
- `frontend/src/components/groups/CollapsibleStory.tsx` — Story-Darstellung (Reuse).
- `frontend/src/components/groups/GroupEdgeNavigation.tsx` +
  `frontend/src/lib/groupNavigation.ts` — Gruppen-Edge-Navigation (Reuse).
- `frontend/src/components/navigation/Breadcrumbs.tsx` — Breadcrumbs (Reuse).
- Globales Design-System `@/components/ui` (Pflicht laut CLAUDE.md).

### Datenquellen (Entscheidung 9 — sauber & neutral halten)
- Gruppen-/Anime-Bindung: `anime_fansub_groups`, `fansub_releases`,
  `release_versions`, `release_version_groups`.
- Mitwirkende (extern): `anime_contributions`, `anime_contribution_roles`.
- Beteiligte App-Member: `release_member_roles` (je `release_version`).
- Themes/Segmente: `themes`, `theme_segments`, `release_theme_assets`.
- Release-Version-Medien: `release_version_media`, `media_assets`, `media_files`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Bestehende öffentliche API-Helper in `frontend/src/lib/api.ts`:
  `getGroupDetail`, `getGroupReleases`, `getGroupAssets`, `getReleaseAssets`,
  `getReleaseVersionMedia`, `getAnimeSegments`, `getAnimeByID`, `getAnimeFansubs`.
- `GroupAssetShowcase`, `CollapsibleStory`, `GroupEdgeNavigation`,
  `Breadcrumbs`, `Pagination` als direkt wiederverwendbare Bausteine.
- `buildGroupNavigationGroups` (`lib/groupNavigation.ts`) für Edge-Navigation.
- `GroupDetail` (`types/group.ts`) liefert heute: `fansub`-Summary, `story`,
  `period`, `stats {member_count, episode_count}` — Basis für Hero/Story.

### Established Patterns
- Öffentliche Seite als **Server Component** mit serverseitigem Fetch über
  `lib/api.ts` (kein ad-hoc-Fetch, Lock K). Envelope-Konvention `{"data": ...}`.
- Globales UI-Primitives-Gebot (`@/components/ui`); native `<select>/<input>/…`
  vermeiden (CLAUDE.md). **Achtung:** Die bestehende `/releases`-Subpage nutzt
  noch native `<input type="text">` — bei Anfassen auf Primitives migrieren.
- Korrekte deutsche Umlaute in allen user-facing Strings (CLAUDE.md).
- Produktionsdateien ≤ 450 Zeilen → Hauptseite in Section-Komponenten splitten
  (bestehende `page.tsx` ist bereits ~290 Zeilen reine Hero-Logik).

### Integration Points
- Konsum der Phase-72-Lese-Projektionen (Member/Mitwirkender-Trennung,
  Media-Ownership, Sichtbarkeit/Reviewstatus) — Quelle der getrennten Mengen
  und der Sichtbarkeits-Gates.
- Member-Verlinkung → `/members/[slug]` (Phase 74) bei geclaimten Personen.
- Rückverlinkung → `/fansubs/[slug]` (Gruppe) und `/anime/[id]` (Anime).
- **Lücke:** Kein bestehender öffentlicher Read-Seam für projektspezifische
  Mitwirkende/Member auf dieser Route — Researcher/Planner müssen Datenherkunft
  + Contract-konformen Seam klären (Lock K).

</code_context>

<specifics>
## Specific Ideas

- **Schwester-Seite als Referenz:** Diese Deep-Dive ist das Decision-13-Ziel der
  Phase-73-Projektkarten. Look & Feel, Sektions-Nav, Empty-States und die
  Member-vs-Mitwirkende-Trennung sollen mit `/fansubs/[slug]` konsistent wirken.
- **Bewusste Abweichung vom Phase-73-Order:** Menschen-Abschnitt kommt **vor**
  Releases (D-02) — auf der anime-spezifischen Deep-Dive steht „Wer hat dieses
  Projekt gemacht" vor „Was wurde released".
- **OP/ED/Middle als Kern des „Stärkens":** dedizierter Themes-Abschnitt mit
  visuellen Asset-Einblicken (D-12/D-13) hebt die Karaoke-/Timing-/Theme-Arbeit
  der Gruppe hervor — heute nur als Badges sichtbar.

</specifics>

<deferred>
## Deferred Ideas

- **Schreib-/Pflege-/Upload-Flows** (Projektstory pflegen, Release-Version-Medien
  bereitstellen, Contributions erfassen/prüfen) — bewusst NICHT in Phase 75
  (read-only). → Phasen 77 (Preview/Readiness) / 78 (Review/Pflege) / 79
  (Medien-Ownership-Durchsetzung).
- **Vollständige Release-Liste in die Hauptseite holen / `/releases`-Subpage
  auflösen** — verworfen zugunsten kuratierter Vorschau + Subpage (D-03). Falls
  später gewünscht, eigener Folge-Schritt.
- **Pro-Release-Version-Rollenaufschlüsselung** (wer was in welcher Version) —
  nicht auf der kuratierten Hauptseite (D-08); ggf. in `/releases`-Tiefe.
- **Migration der nativen `<input>`-Elemente der `/releases`-Subpage auf
  `@/components/ui`** — nur anfassen, falls die Subpage in diesem Phase ohnehin
  berührt wird; sonst eigener UI-Politur-Schritt.

</deferred>

---

*Phase: 75-anime-gruppen-deep-dive-anime-id-group-groupid*
*Context gathered: 2026-06-05*
