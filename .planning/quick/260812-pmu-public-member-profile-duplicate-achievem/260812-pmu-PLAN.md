---
phase: quick-260812-pmu
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/components/profile/MemberBadgeChain.tsx
  - frontend/src/components/profile/MemberBadgeChain.module.css
  - frontend/src/components/profile/MemberBadgeChain.test.tsx
  - frontend/src/app/members/[slug]/page.test.tsx
autonomous: false
requirements: [260812-pmu-heading-hierarchy, 260812-pmu-visual-uat]
must_haves:
  truths:
    - "Jede Achievement-Sektion besitzt genau eine klare H2-Überschrift; identische innere Überschriften für Punkte-Meilensteine und Mitgliedschaft erscheinen nicht erneut."
    - "Bedeutungstragende Untergliederungen bleiben erhalten: Anime-Projekte, ausgeübte Rollen, Beitragsfamilien, Mitgliedsdauer und Besondere Mitgliedschaft."
    - "Die DOM-Reihenfolge und Überschriftenebenen bilden H1 → H2 → echte H3-Unterbereiche ohne Sprung auf H4 ab."
    - "SSR, Live-Regionen, Progressbars, Tracks, Preview-Auswahl, Carousel-Interaktionen, cardless Flächen und responsive Geometrie bleiben unverändert funktionsfähig."
    - "Sheppert ist bei 390x844, 768x1024, 1024x768, 1440x900 und 1920x1080 ohne Overflow, Clipping oder neue Leerräume visuell freigegeben."
  artifacts:
    - {path: "frontend/src/components/profile/MemberBadgeChain.tsx", provides: "bereinigte semantische Achievement-Überschriftenhierarchie"}
    - {path: "frontend/src/components/profile/MemberBadgeChain.test.tsx", provides: "exakte Heading-Anzahl, Reihenfolge, Ebenen sowie SSR-/Interaktionsschutz"}
    - {path: "frontend/src/app/members/[slug]/page.test.tsx", provides: "vollständiger öffentlicher Seiten-Outline-Vertrag"}
  key_links:
    - {from: "frontend/src/components/profile/MemberBadgeChain.tsx", to: "SectionHeader", via: "äußere H2-Sektionsbesitzer für jede Badge-Gruppe"}
    - {from: "frontend/src/components/profile/MemberBadgeChain.tsx", to: "aria-live/progressbar/list semantics", via: "unveränderte Stage-Inhalte unter bereinigten Überschriften"}
    - {from: "frontend/src/app/members/[slug]/page.tsx", to: "MemberBadgeChain", via: "bestehendes SSR-Rendering"}
---

<objective>
Entferne die letzten redundanten inneren Überschriften aus den Achievement-Stages des öffentlichen Memberprofils und stelle eine klare, zugängliche Gliederung her.

Purpose: Der visuelle Schluss-Schliff reduziert doppelte Titel, ohne fachlich hilfreiche Unterüberschriften oder bestehende Stage-Semantik zu verlieren.
Output: TDD-gesicherte Heading-Hierarchie, kleinste gezielte TSX/CSS-Anpassung und blockierende Live-Abnahme der Sheppert-Seite.
</objective>

<execution_context>
@C:/Users/admin/.codex/get-shit-done/workflows/execute-plan.md
@C:/Users/admin/.codex/get-shit-done/templates/summary.md
</execution_context>

<context>
<read_first>
- AGENTS.md
- docs/engineering/implementation-contract.md
- docs/frontend/ui-system.md
- docs/agent-guidelines-ui.md
- frontend/src/app/members/[slug]/page.tsx
- frontend/src/app/members/[slug]/page.test.tsx
- frontend/src/components/profile/MemberBadgeChain.tsx
- frontend/src/components/profile/MemberBadgeChain.module.css
- frontend/src/components/profile/MemberBadgeChain.test.tsx
- frontend/src/components/ui/SectionHeader.tsx
- .planning/quick/260812-kr1-ffentliche-profilseite-gro-e-wei-e-innen/260812-kr1-PLAN.md
- .planning/quick/260812-jtp-public-member-profile-vertical-spacing-r/260812-jtp-PLAN.md
- .planning/quick/260812-rps-public-member-profile-responsive-stabilisieren/260812-rps-PLAN.md
- .planning/quick/260812-acs-count-only-achievement-summary/260812-acs-PLAN.md
- .planning/quick/260812-ras-remove-aggregate-achievement-summary/260812-ras-SUMMARY.md
</read_first>

<interfaces>
`MemberBadgeChain` erzeugt je Gruppe bereits einen `SectionHeader` als H2. `PointsAchievementStage` wiederholt `Punkte-Meilensteine` aktuell als H3. `MembershipStage` wiederholt `Mitgliedschaft` als H3 und ordnet `Mitgliedsdauer`/Preview derzeit als H4 darunter ein. `AnimeProjectAchievementStage` verwendet `Anime-Projekte` als sinnvolle Unterüberschrift unter H2 `Fortschritt`; Rollen-Cards und Beitragsfamilien verwenden echte H3-Unterteilungen.

Die kleinste Änderung entfernt nur die zwei identischen inneren H3. Danach werden echte Membership-Unterbereiche von H4 auf H3 angehoben, damit kein Level übersprungen wird. Accessible Names von Listen, Progressbars, Live-Regionen und Controls bleiben wortgleich.
</interfaces>

<scope_boundary>Keine Copy-, Daten-, Backend-, API-, DTO-, DB-, Asset-, Badge-, Schwellenwert-, Carousel-, Track-, Preview-, Live-Region-, SSR- oder Responsive-Neugestaltung. Keine Entfernung von `Anime-Projekte`, Rollennamen, `Mitgetragene Projekte`, `Chronikpflege`, `Bildarchivpflege`, `Mitgliedsdauer` oder `Besondere Mitgliedschaft`. CSS nur für direkt verwaiste Titelregeln beziehungsweise titelbedingte lokale Abstände; keine globale Spacing-Arbeit.</scope_boundary>

<dirty_tree_contract>Der Shared Tree ist stark dirty. Vor jeder Bearbeitung HEAD, Status, Working/Cached-Patches, Blob-IDs und SHA-256 der vier Scope-Dateien unter `evidence/incoming/` sichern. Bei Hunk-Überlappung fail closed. Nur gezielte Patches und exaktes Hunk-Staging; niemals Ganzdatei-Formatierung, `git add .`, `git add -A` oder fremde Staging-Änderungen.</dirty_tree_contract>

<coordination>KR1, JTP, RPS und ACS bleiben eigenständige offene Quicks. Weder deren PLAN/SUMMARY/STATE/Evidenz noch deren Status ändern oder finalisieren. PMU darf ihren aktuellen implementierten UI-Stand prüfen, aber eine PMU-Freigabe schließt ausschließlich PMU.</coordination>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: RED – exakte Seiten- und Stage-Outline festschreiben</name>
  <files>frontend/src/components/profile/MemberBadgeChain.test.tsx, frontend/src/app/members/[slug]/page.test.tsx</files>
  <behavior>
    - Die H2-Reihenfolge der Seite bleibt Profil und Mitgliedschaft, Fansub-Projekte, Rollenfortschritt, Fortschritt, Punkte-Meilensteine, Beiträge, Mitgliedschaft, Besondere Auszeichnungen, Beiträge.
    - In der Punkte-Gruppe existiert genau eine Überschrift `Punkte-Meilensteine`, die äußere H2; die Stage besitzt keine gleichnamige H3.
    - In der Mitgliedschafts-Gruppe existiert genau eine Überschrift `Mitgliedschaft`, die äußere H2; `Mitgliedsdauer` und aktive `Besondere Mitgliedschaft` sind H3, nicht H4.
    - `Anime-Projekte`, jede sichtbare Rolle und jede Beitragsfamilie bleiben H3-Unterbereiche in unveränderter DOM-Reihenfolge.
    - DOM und `renderToStaticMarkup` erfüllen denselben Count-/Order-Vertrag; aria-labels, aria-live, Progressbars, Listen und Controls bleiben auffindbar.
  </behavior>
  <action>Zuerst Dirty-Tree-Evidenz erfassen. Ergänze einen `Quick 260812-pmu` Testblock mit exakten Counts und `within()`-Abgrenzung je `data-badge-group`; passe den vollständigen Page-Outline-Test nur an echte H3/H4-Ebenen an. Beweise äußeren H2-Besitz, verbleibende Untergliederungen, keine Ebenensprünge und SSR-Parität. Erfasse RED in `evidence/RED.txt`. Bestehende KR1/JTP/RPS/ACS-Assertions nicht abschwächen oder pauschal umschreiben.</action>
  <verify><automated>cd /home/d1sk/team4s &amp;&amp; test -s .planning/quick/260812-pmu-public-member-profile-duplicate-achievem/evidence/RED.txt &amp;&amp; grep -E "FAIL|failed|AssertionError" .planning/quick/260812-pmu-public-member-profile-duplicate-achievem/evidence/RED.txt &amp;&amp; git diff --check &amp;&amp; git diff --cached --check</automated></verify>
  <done>Neue Tests scheitern ausschließlich an den zwei redundanten Titeln beziehungsweise den folgenden Membership-H4-Ebenen; bestehende Semantik bleibt unter Vertrag.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: GREEN – redundante Stage-Titel entfernen und echte Unterbereiche anheben</name>
  <files>frontend/src/components/profile/MemberBadgeChain.tsx, frontend/src/components/profile/MemberBadgeChain.module.css, frontend/src/components/profile/MemberBadgeChain.test.tsx, frontend/src/app/members/[slug]/page.test.tsx</files>
  <action>Entferne aus `PointsAchievementStage` ausschließlich das gleichnamige H3 `Punkte-Meilensteine`. Entferne aus `MembershipStage` ausschließlich das gleichnamige H3 `Mitgliedschaft`; ändere `membershipHeroTitle` für `Mitgliedsdauer` beziehungsweise aktive `Besondere Mitgliedschaft` von H4 auf H3. Behalte `Anime-Projekte`, Rollenbezeichnungen und Contribution-Familientitel als H3. Lösche/passe nur direkt verwaiste Titel-CSS-Regeln oder titelbedingte lokale Abstände an, wenn Test oder DOM-Geometrie dies verlangt; cardless Stage-Flächen, Tracks und responsive Regeln bleiben sonst hunk-stabil. Ändere keine aria-labels, Live-Regionen, Progresswerte, State, Handler oder Carousel-Seams. Führe SSR-/DOM-Vertrag und bestehende Interaktionssuiten aus und stage nur PMU-Hunks.</action>
  <verify><automated>cd /home/d1sk/team4s &amp;&amp; docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/MemberBadgeChain.test.tsx 'src/app/members/[slug]/page.test.tsx' &amp;&amp; docker compose exec -T team4sv30-frontend npm run typecheck &amp;&amp; docker compose exec -T team4sv30-frontend npm run lint -- --file src/components/profile/MemberBadgeChain.tsx --file 'src/app/members/[slug]/page.test.tsx' &amp;&amp; git diff --check &amp;&amp; git diff --cached --check</automated></verify>
  <done>Nur redundante Punkte-/Mitgliedschaftstitel fehlen; Outline, echte Untertitel und zugängliche/interaktive Stage-Verträge bleiben erhalten; Checks sind grün.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Letzten visuellen Schliff auf Sheppert freigeben</name>
  <files>none</files>
  <what-built>Die Achievement-Sektionen besitzen je einen klaren äußeren Titel und nur fachlich sinnvolle innere Unterüberschriften.</what-built>
  <action>Verwende den geteilten Codex-In-App-Browser und die reale Sheppert-Seite unter `http://127.0.0.1:3300`. Falls nötig nur den Frontend-Service neu bauen/force-recreate. Erzeuge unskalierte Achievement-Screenshots bei exakt 390x844, 768x1024, 1024x768, 1440x900 und 1920x1080 unter `evidence/uat/`; `MANIFEST.md` erfasst URL, Commit/Worktree-Stand, Viewport, Screenshot, `scrollWidth/clientWidth`, Heading-Outline und PASS/FAIL. Headless darf unterstützen, ersetzt aber nicht Live-UAT. Keine Evidenz anderer Quicks überschreiben oder als deren Freigabe deklarieren.</action>
  <how-to-verify>
1. `Punkte-Meilensteine` und `Mitgliedschaft` erscheinen jeweils genau einmal als Abschnittstitel.
2. `Anime-Projekte`, Rollennamen, `Mitgetragene Projekte`, `Chronikpflege`, `Bildarchivpflege`, `Mitgliedsdauer` und gegebenenfalls `Besondere Mitgliedschaft` bleiben sichtbar und verständlich.
3. Keine ungewollten Lücken; Artwork, Status, Werte, Progressbars und Tracks bleiben ausgerichtet.
4. Earned-, Locked- und Preview-Zustände funktionieren; Preview aktualisiert die polite Live-Region ohne autoritative Werte zu ändern.
5. Carousel-Pfeile, Tastatur und Pointer/Swipe bleiben funktionsfähig.
6. Alle Viewports: kein horizontaler Overflow, Clipping, Überlappen oder abgeschnittener deutscher Titel.
7. Browser-Outline: ein H1, klare H2 und nur echte H3; kein H2→H4-Sprung in Mitgliedschaft.
8. Nur PMU-Hunks dürfen staged/finalisiert werden; KR1/JTP/RPS/ACS bleiben offen.
  </how-to-verify>
  <verify><automated>cd /home/d1sk/team4s &amp;&amp; docker compose ps team4sv30-frontend &amp;&amp; test -s .planning/quick/260812-pmu-public-member-profile-duplicate-achievem/evidence/uat/MANIFEST.md &amp;&amp; for size in 390x844 768x1024 1024x768 1440x900 1920x1080; do test -f ".planning/quick/260812-pmu-public-member-profile-duplicate-achievem/evidence/uat/achievement-headings-${size}.png" || exit 1; grep -E "${size}.*(overflow|scrollWidth).*PASS.*heading.*PASS" .planning/quick/260812-pmu-public-member-profile-duplicate-achievem/evidence/uat/MANIFEST.md || exit 1; done &amp;&amp; git diff --check &amp;&amp; git diff --cached --check</automated></verify>
  <done>Der Nutzer genehmigt Aufbau und Outline an allen fünf Größen ausdrücklich; sonst geht konkretes Feedback an Task 2.</done>
  <resume-signal>Stoppe und warte auf exakt alleinstehendes `approved`. Vorher keine SUMMARY, STATE-Aktualisierung und keinen Abschlusscommit erstellen.</resume-signal>
</task>

</tasks>

<threat_model>
| Threat ID | Kategorie | Komponente | Disposition | Mitigation |
|---|---|---|---|---|
| T-pmu-01 | T | Dirty Shared Tree | mitigate | Incoming Patches/Blobs/Hashes, fail-closed Overlap, exaktes PMU-Staging. |
| T-pmu-02 | T | Semantische Outline | mitigate | Exakte DOM-/SSR-Counts, Gruppenabgrenzung, H2→H3 ohne H4-Sprung. |
| T-pmu-03 | D | Stage-Navigation/Status | mitigate | Progressbar-, Listen-, Live-Region- und Preview-Tests bleiben aktiv. |
| T-pmu-04 | D | Responsive Geometrie | mitigate | Keine Layout-Neugestaltung; fünf Live-Viewports mit Overflow-/Clipping-Messung. |
| T-pmu-05 | R | Visuelle Freigabe | mitigate | Blockierendes exaktes `approved` vor Summary, State und Finalisierung. |
| T-pmu-06 | I/E | Public/API/Backend | accept | Lokale Präsentationsänderung ohne Daten-, Auth-, API-, Backend- oder DB-Berührung. |
| T-pmu-07 | T/R | Fremde Quick-Status | mitigate | KR1/JTP/RPS/ACS nur koordinieren, niemals mutieren oder abschließen. |
</threat_model>

<verification>RED-first Heading-Count/-Order/-Level in Component, Seite und SSR; bestehende Interaktions-/Accessibility-Suite; Typecheck; scoped Lint; Diffchecks; fünf Live-Sheppert-Screenshots mit Outline-/Overflow-Manifest; blockierende Nutzerfreigabe.</verification>

<success_criteria>
- Punkte-Meilensteine und Mitgliedschaft besitzen jeweils genau einen sichtbaren Abschnittstitel.
- Anime-Projekte, Rollen, Beitragsfamilien, Mitgliedsdauer und Besondere Mitgliedschaft bleiben erhalten.
- Heading-Hierarchie ist H1 → H2 → H3 ohne redundante Titel oder H4-Sprung.
- SSR, Live-Regionen, Progressbars, Tracks, Earned/Locked/Preview, Carousel-Eingaben, cardless Flächen und responsive Layout bleiben funktionsfähig.
- Alle fünf Zielgrößen sind ohne neue Leerräume, Overflow, Clipping oder Überlappung.
- Keine Copy-/Daten-/Backend-/API-/DB-/Asset-/Carousel- oder breitere Spacing-Änderung.
- Nur PMU-Hunks werden finalisiert; KR1/JTP/RPS/ACS bleiben offen.
- Exaktes alleinstehendes `approved` liegt vor Abschluss vor.
</success_criteria>

<source_audit>
SOURCE | ID | Feature/Requirement | Task | Status | Notes
GOAL | none | Redundante innere Achievement-Titel entfernen | 1-3 | COVERED | TDD, kleinste Implementierung, Live-Freigabe
REQ | pmu-01 | Äußere H2 besitzen Punkte und Mitgliedschaft jeweils einmal | 1-3 | COVERED | Counts und Gruppenabgrenzung
REQ | pmu-02 | Nützliche Untertitel/Domain-Semantik bewahren | 1-3 | COVERED | Anime, Rollen, Beiträge, Mitgliedsdauer
REQ | pmu-03 | H1/H2/H3 ohne Sprung | 1-3 | COVERED | DOM, SSR, Browser-Outline
REQ | pmu-04 | SSR, Live-Regionen, Tracks, Interaktionen, responsive unverändert | 1-3 | COVERED | Regressionen plus UAT
REQ | pmu-05 | Keine Copy/Data/API/DB/Assets/Carousel-Änderung | 1-2 | COVERED | Scope Boundary
REQ | pmu-06 | Dirty Hunk Isolation, offene Quicks nicht finalisieren | 1-3 | COVERED | Evidence, fail closed, Coordination
REQ | pmu-07 | Live Sheppert Screenshots und blockierende Freigabe | 3 | COVERED | Fünf Größen und approved
RESEARCH | existing seams | SectionHeader und Stages reichen aus | 1-2 | COVERED | Level 0, keine Dependency
CONTEXT | excluded | Breiteres Spacing, Daten/API/DB/Assets/Carousel, fremde Quick-Abschlüsse | none | EXCLUDED | Nicht implementieren
</source_audit>

<output>Erst nach exakt alleinstehendem `approved` `260812-pmu-SUMMARY.md` erstellen, nur PMU in `.planning/STATE.md` ergänzen und ausschließlich PMU-Hunks/Artefakte committen. Bis dahin am Checkpoint stoppen.</output>
