# Phase 78: Leader Workspace – Review & Pflege - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Der kanonische Leader/Admin-Workspace `/admin/fansubs/[id]/edit` erhält die
**Review-/Auflösungs- und Pflege-Aktionen**, die Phase 77 bewusst als read-only
Zähler aufgeschoben hat — **capability-gated**, **auf bestehenden Seams**, **ohne
zweiten Workspace** und **ohne Parallel-Queue**:

1. **Offene Claims** und **offene Contributions** werden im Workspace getrennt
   dargestellt und können capability-gated **bestätigt/abgelehnt** werden
   (Claim- und Contribution-Review bleiben **getrennte Flows**).
2. **Historische Member** und **externe Mitwirkende** sind pflegbar, **ohne sie
   mit App-Mitgliedern zu vermischen** (Entscheidung 3: eine Contribution macht
   niemanden zum Gruppenmitglied).
3. **Medienprüfung** (Sichtbarkeit/Reviewstatus/Owner-Korrektheit) ist möglich
   und schreibt in die **korrekten Owner-Tabellen** (Ownership-Matrix, Lock G).
4. **Registrierte-User-Vorschläge aus Phase 76** erscheinen als Review-Eingang
   im **richtigen Gruppenkontext**.
5. **Keine Duplizierung** der Review-/Adminlogik in `/admin/my-groups/[id]`
   (Lock F); **keine generische „Request"-Vermischung** (Lock H); **alle
   Mutationen auditiert** (Lock I/K).

**Explizit NICHT in Phase 78:**
- Kein neuer zweiter Workspace, keine Parallel-Queue, kein generisches
  „Request"-Sammelmodell (Locks F/H).
- Kein neues Claim-/Contribution-/Medien-Modell; alles über bestehende Seams
  (`ClaimManagementPanel`, `ReviewQueue`, `AnimeContributionModal`,
  Member-Tabs, Medien-Tab/Release-Drawer).
- Kein Owner-Typ-Umhängen von Medien als Default (nur Sichtbarkeit/Reviewstatus;
  Owner-Korrektheit wird geflaggt, nicht umgehängt) — siehe D-07.
- Kein neuer Publish-/Sichtbarkeits-Toggle (Readiness bleibt Leitfaden, Phase 77
  D-05) und keine Rechteableitung aus Contributions (Lock I).
- Kein neuer Upload-Transport / keine neue Medienwelt (das ist **Phase 79**).

**Abhängigkeit:** Depends on Phase 72 (Projektionen/Status-Fundament: Sichtbarkeit
+ Review als zwei Achsen, Contribution-Status) und Phase 76 (registrierte-User-
Vorschläge speisen die Review-Eingänge). Phase 78 ist die **Review/Pflege-Hälfte**
von AP 5; Phase 77 (Preview/Readiness) ist die andere Hälfte und liefert die
Readiness-Sprungmarken, deren Ziele Phase 78 aktionierbar macht.

</domain>

<decisions>
## Implementation Decisions

### Review-Anordnung & Struktur
- **D-01:** **Bestehende Domänen-Tabs erweitern (Reuse), KEIN neuer Review-Tab.**
  Offene Claims im `claims`-Tab (`ClaimManagementPanel`), offene Contributions im
  Contribution-Review-Seam, Medienprüfung an der jeweiligen Owner-Fläche. Kein
  gebündelter „Posteingang"/Review-Überblick-Tab. Begründung: maximaler Reuse,
  klar getrennte Flows, konsistent mit Phase 77 und Lock H (keine Parallel-Queue).
- **D-02:** **Externe Mitwirkende = nur Review (bestätigen/ablehnen)** über die
  bestehenden **Contribution-Seams** (`AnimeContributionModal`/`ReviewQueue`),
  **nicht** über die Member-Tabs (`mitglieder`/`rollen`). Detail-Korrektur
  (Rolle/Notiz) bleibt im bestehenden Anime-Contribution-Modal. Strikte Trennung
  Mitglied vs. Mitwirkender (Entscheidung 3) — externe Mitwirkende werden nie als
  Gruppenmitglied dargestellt.

### Phase-76-User-Vorschläge (Review-Eingang)
- **D-03:** **Routing nach Typ in den zuständigen Domänen-Tab**, KEIN generischer
  Sammel-Eingang: Medien-Vorschlag → `media`/Owner-Fläche, Story-Vorschlag →
  `notes`, Contribution-Vorschlag → Contribution-Review, Fehlermeldung → passende
  Domänenstelle. Erfüllt Lock H (keine generische „Request"-Vermischung) und passt
  zu D-01 (Tabs erweitern).
- **D-04:** **Eingang strikt auf die aktuell geöffnete Gruppe gescoped** und
  capability-gated wie die übrigen Review-Aktionen (D-08). Es erscheinen nur
  Vorschläge, deren Zielkontext zur Gruppe gehört → klares mentales Modell
  „meine Gruppe" (SC4). Die genaue Scope-Ableitung (nur Gruppe vs. Gruppe +
  zugeordnete Anime/Releases) richtet sich nach dem tatsächlichen Ziel-/Owner-Feld
  der Phase-76-Vorschläge → Planner unter D-04-Prinzip.

### Medienprüfung
- **D-05:** **Aktionsumfang = Sichtbarkeit + Reviewstatus setzen** (intern / in
  Prüfung / öffentlich / abgelehnt / archiviert / entfernt), schreibend in die
  **korrekte Owner-Tabelle** entlang der Phase-72-Achsen. **Owner-Korrektheit wird
  nur sichtbar gemacht/geflaggt, NICHT umgehängt** (kein Owner-Typ-Wechsel als
  Default — das berührt die Ownership-Matrix direkt und gehört zu Phase 79).
- **D-06:** **Medienprüfung an der jeweiligen Owner-Fläche**, KEIN zentraler
  Medienprüf-Tab: Gruppenmedien im `media`-Tab, Release-Version-Medien im
  Release-Drawer, Theme-Assets im Theme-Bereich. Garantiert, dass jede Aktion in
  die richtige Owner-Tabelle schreibt (Lock G), konsistent mit D-01.

### Offen-Sicht & Readiness-Kopplung
- **D-07:** **„Offen zuerst" + „nur offene"-Filter-Toggle** in den erweiterten
  Review-Listen. Offene Posten werden vorsortiert/oben gruppiert; erledigte
  bleiben einsehbar (Historie/Audit). Klarer „was ist zu tun"-Fokus ohne
  Informationsverlust.

### Capability-Gating
- **D-08:** Zugang zu allen Review-/Auflösungs-/Pflege-Aktionen wird **aus den
  bestehenden `FansubGroupCapabilities` abgeleitet** (analog `canUseMainTab`),
  **kein neues Contract-Feld** (Lock K ohne OpenAPI-Änderung wo möglich).
  Gruppenmitgliedschaft allein genügt nicht (SC5 / Decision F). Pro Aktion ggf.
  feinere Capability (z. B. Claim-Review vs. Contribution-Review vs. Medien-Review)
  — Planner unter Lock K.

### Audit
- **D-09:** **Alle Mutationen auditiert** mit Akteur-Attribution (Lock I/K, SC5).
  Reuse bestehender Audit-Seams je Domäne; kein Bypass.

### Claude's Discretion
- **Contribution-Review-Ort:** Der genaue kanonische Ort der offenen-Contributions-
  Review (bestehende `<ReviewQueue>` im `vorschlaege`-Tab ausbauen vs. dedizierte
  „Offene Contributions"-Review-Fläche) — Planner, **solange getrennt von Claims
  (SC1) und nicht im Anime-Modal vergraben**. `AnimeContributionsTab.tsx` wurde
  gelöscht; Researcher prüft den aktuellen Seam-Stand zuerst.
- **Readiness-Sprungmarken-Tiefe:** Ob ein Klick auf einen Phase-77-Readiness-Zähler
  nur den Ziel-Tab öffnet (wie Phase 77 D-04 angelegt) oder zusätzlich per Deep-Link
  den „offen"-Filter/Scroll setzt — Planner, **solange die bestehende
  `MainTab`/`?tab=`-Navigation genutzt und nicht dupliziert wird**.
- Exakte Tab-Beschriftung/Filter-UI/Empty-States/Toast-Texte, CSS-Modul-Struktur,
  Capability-Feinauflösung pro Aktion — Planner/Executor, solange D-01..D-09 und
  die v1.2-Locks (F/H/G/I/K) eingehalten werden.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Meilenstein-Entscheidungen (LOCKED — gelten für alle v1.2-Phasen)
- `.planning/milestones/v1.2-DISCUSSION.md` — verbindliche Entscheidungen A–K,
  insb. **Entscheidung 7 (Fansub Leader Workspace, Review-Teil)**,
  **Entscheidung 3 (Mitglieder vs. Mitwirkende)**, **Entscheidung 10 (Claims/
  Requests/Contributions strikt getrennt)**, Locks **F, G, H, I, K**, Media-
  Ownership-Matrix (Decision 8/G), Nicht-Ziele. **MUST read.**

### Schwester-/Vorgänger-/Zuliefer-Phasen
- `.planning/phases/77-leader-workspace-public-preview-readiness/77-CONTEXT.md` —
  Schwester-Hälfte (Preview/Readiness). Phase 77 zeigt offene Posten **read-only**
  als Zähler mit Sprungmarken (D-04/D-06); Phase 78 macht deren Ziel
  **aktionierbar**. Kein Publish-Gate (77 D-05), Capability-Gating-Muster (77 D-08).
- `.planning/phases/72-dom-nen-projektionen-status-fundament/72-CONTEXT.md` —
  Sichtbarkeit + Review als zwei Achsen, Contribution-Status, Read-Projektionen,
  die „offen vs. erledigt" und die Medien-Status-/Sichtbarkeitsfelder definieren.
- ROADMAP Phase 76 (`.planning/ROADMAP.md` §"### Phase 76") — erzeugt die
  registrierte-User-Vorschläge (Fehler/Story/Medien/Contribution melden) mit
  Submitter/Zielkontext/Typ/Status/Audit, die Phase 78 als Eingang konsumiert.

### Systeminventar / Ownership / Runtime-Authority
- `docs/architecture/current-system-inventory.md` — Routen/API/DB/Ownership-Karte,
  Media-Ownership-Matrix, Duplication Traps.
- `docs/architecture/db-runtime-authority-map.md` — keine Read-Umstellung ohne
  Authority-Entscheid.
- `docs/architecture/db-schema-fansub-domain.md` — Domänenregeln Fansub/Release,
  Member-/Contribution-/Claim-Tabellen.

### Contracts (Lock K — Pflicht vor Endpoint-/DTO-Änderungen)
- `shared/contracts/openapi.yaml` — Umbrella-Contract.
- `shared/contracts/admin-content.yaml` — admin-content-Projektionen
  (Contribution-/Review-/Medien-Status), falls betroffen.
- `docs/api/api-contracts.md` — Contract-Regeln.
- `frontend/src/lib/api.ts` — zentraler API-Client/Typen (kein ad-hoc-Fetch,
  Lock K) — `listAnimeContributions`, Claim-/Member-/Medien-Helfer.

### Bestehende Workspace-Seams (Reuse statt Neubau)
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` — `MAIN_TABS`,
  `canUseMainTab`/`visibleMainTabs`/`resolveMainTabForAccess`, `?tab=`-Routing,
  `getFansubGroupCapabilities`, `openAnimeContributions`. Hier docken die
  erweiterten Review-Aktionen + Gating an (Datei ist ~3,8k Zeilen → neue Flächen
  als eigene Komponentendateien, 450-Zeilen-Limit beachten).
- `frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx` (+ `.module.css`,
  `.test.tsx`) — Claim-Review-Seam (`claims`-Tab).
- `frontend/src/components/contributions/ReviewQueue.tsx` — Contribution-Proposal-
  Review (`vorschlaege`-Tab).
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx` (+ `.module.css`) —
  Contribution-Detail-Pflege pro Anime (Reuse für externe Mitwirkende, D-02).
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx`,
  `MemberRolesTab.tsx` — historische Member/Rollen (`mitglieder`/`rollen`-Tabs;
  NICHT mit Mitwirkenden vermischen).
- `frontend/src/types/fansub.ts` (`FansubGroupCapabilities`, ab ~Zeile 163) —
  Capability-Felder für die Gating-Ableitung (D-08).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`MAIN_TABS` + Capability-Gating** in `page.tsx`: `canUseMainTab`,
  `visibleMainTabs`, `resolveMainTabForAccess` — die erweiterten Review-Aktionen
  reihen sich in die bestehenden Tabs ein und leiten ihr Gating aus
  `FansubGroupCapabilities` ab (D-01, D-08). Heute: `claims` gated über
  `can_view_invitations`/`can_create_invitation`/`can_cancel_invitation`;
  `vorschlaege` über `can_manage_members`; `media` über `can_edit_group`.
- **`ClaimManagementPanel`** (`claims`-Tab): vorhandener Claim-Review-Seam —
  bestätigen/ablehnen + „offen"-Sicht (D-07) erweitern, nicht neu bauen.
- **`<ReviewQueue fansubId={…} />`** im `vorschlaege`-Tab: vorhandener
  Contribution-Proposal-Review-Seam — Kandidat für offene-Contributions-Review
  (Planner-Ermessen, Claude's Discretion).
- **`AnimeContributionModal`** + `openAnimeContributions`/`refreshAnimeContributions`
  (aus Releases-Tab geöffnet): Detail-Pflege für Contributions/externe Mitwirkende
  (D-02). `AnimeContributionsTab.tsx` wurde **gelöscht** → Seam-Stand zuerst prüfen.
- **`GroupMembersTab` / `MemberRolesTab`**: historische Member/Rollen-Pflege —
  strikt getrennt von Mitwirkenden-Review halten.
- **Phase-72-Projektionen** (Sichtbarkeit + Review-Achse): definieren „offen vs.
  erledigt" (D-07) und die Medien-Status-/Sichtbarkeitswerte (D-05).

### Established Patterns
- `?tab=`-Routing über `MainTab`/`parseMainTab` — Readiness-Sprungmarken nutzen
  dieses bestehende Muster (ggf. + Filter-Param für Deep-Link, Claude's Discretion).
- Capability-Ableitung statt direkter Rollen-/Mitgliedschaftsprüfung
  (`canUseMainTab`-Stil) — konsistent für D-08; Gruppenmitgliedschaft ≠ Adminrecht.
- Lock K / Contract-zuerst: OpenAPI + admin-content + DTO + Repo + `api.ts`-Typen
  gemeinsam; kein ad-hoc-Fetch, keine Token-/Cookie-Direktzugriffe.
- Media-Ownership-Matrix (Lock G): jede Medien-Mutation schreibt in die
  kanonische Owner-Tabelle der jeweiligen Fläche (D-06).
- 450-Zeilen-Limit (Modularity-Constraint): `page.tsx` ist bereits weit darüber
  (~3,8k Zeilen) — neue Review-Flächen als eigene Komponentendateien.

### Integration Points
- Erweiterte Claim-/Contribution-Review → bestehende Seams (`ClaimManagementPanel`,
  `ReviewQueue`, Contribution-Proposal-APIs) read+mutate; keine neuen Parallel-
  Endpunkte (Lock H/K).
- Medienprüfung → Sichtbarkeit/Reviewstatus-Update-Seams je Owner-Fläche
  (`media`-Tab → `fansub_group_media`; Release-Drawer → `release_version_media`;
  Theme → `release_theme_assets`), Lock G.
- Phase-76-Vorschläge → typgerechtes Routing in Domänen-Tabs (D-03), gescoped auf
  Gruppe (D-04); konsumiert den in Phase 76 erzeugten Vorschlags-/Proposal-Seam.
- Phase-77-Readiness-Zähler → Sprungmarken landen auf den jetzt aktionierbaren
  offenen Listen (D-07; Deep-Link-Tiefe Planner-Ermessen).

</code_context>

<specifics>
## Specific Ideas

- Mentales Modell: Phase 77 sagt „hier ist etwas offen" (read-only Zähler),
  Phase 78 liefert „… und hier löst du es" (capability-gated Aktion) — an
  **derselben** Domänen-Fläche, ohne zweite Queue.
- Trennschärfe als Leitplanke (Entscheidung 3 + Lock H): **Claim** (App-User ↔
  hist. Member-Profil) ≠ **Contribution** (Mitwirkung an Projekt/Release) ≠
  **Member-Request** ≠ **App-/Gruppenmitglied** ≠ **externer Mitwirkender**. Die
  UI darf vereinfachen, die Domäne nie vermischen.
- „Offen zuerst" + Toggle (D-07): der Leader soll beim Öffnen eines Review-Tabs
  sofort die offenen Posten sehen, erledigte bleiben für Audit/Historie sichtbar.

</specifics>

<deferred>
## Deferred Ideas

- **Owner-Typ-Umhängen / Re-Kategorisierung von Medien:** bewusst aus Phase 78
  herausgehalten (D-05). Erzwingung von Owner-Typ/-ID/Kategorie über alle
  Upload-/Zuweisungs-Surfaces ist **Phase 79**.
- **Zentrale gruppenübergreifende Medienprüf-Ansicht:** verworfen zugunsten
  „an der jeweiligen Owner-Fläche" (D-06). Eine globale Übersicht gehört eher
  in `/admin/users` / Phase 80.
- **Generischer Review-Posteingang/Überblick-Tab:** verworfen zugunsten „Tabs
  erweitern" (D-01). Falls je gewünscht, eigene spätere Phase — darf Lock H
  (keine Parallel-Queue) nicht verletzen.

### Reviewed Todos (not folded)
Folgende offene Todos matchten Phase 78 nur per generischem Keyword
(app/admin/fansubs/edit, area: ui), gehören aber thematisch zu anderen Tracks
(UI-Konsolidierung / Credits / Member-Profil) und wurden NICHT gefaltet —
konsistent mit der Phase-77-Bewertung:
- `2026-06-03-contribution-dropdown-auf-globale-ui-primitives-umstellen.md` —
  Contribution-UI auf globale `components/ui`-Primitives → UI-Konsolidierungs-Track.
- `2026-06-03-credits-ui-konsolidierung-und-permission-bruecke.md` — Credits-UI in
  „Anime & Veröffentlichungen" konsolidieren + Permission-Brücke → Credits-Track.
- `2026-06-03-member-profil-ui-und-params-bug.md` — Member-Profil UI + params-Bug
  → Member-Profil-Track.
- `2026-05-28-profile-hub-content-activity-redesign.md` — Profile-Hub Redesign →
  Member-Profil-Track.

</deferred>

---

*Phase: 78-leader-workspace-review-pflege*
*Context gathered: 2026-06-05*
