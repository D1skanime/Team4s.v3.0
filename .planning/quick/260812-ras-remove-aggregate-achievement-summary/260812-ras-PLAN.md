---
phase: quick-260812-ras
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [frontend/src/components/profile/MemberBadgeChain.tsx, frontend/src/components/profile/MemberBadgeChain.module.css, frontend/src/components/profile/MemberBadgeChain.test.tsx]
autonomous: false
requirements: [260812-ras-remove-aggregate, 260812-ras-preserve-families, 260812-ras-responsive-uat]
must_haves:
  truths:
    - "Das öffentliche Memberprofil zeigt weder `Allgemeine Auszeichnungen` noch eine allgemeine Freischaltungsanzahl oder deren aggregierten Fortschrittsbalken."
    - "Rollenfortschritt beginnt direkt mit der separaten Anzahl tatsächlich ausgeübter Fansubrollen."
    - "Alle individuellen Achievement-Familien und -Stufen, der Rollen-Carousel sowie Profil-Hero-Badges wie Verifiziert bleiben erhalten."
    - "Achievement-Berechnungen und Resolver für die Familienausgabe sowie Beiträge, Punkte, Mitgliedschaft, Backend, API und DB bleiben unverändert."
    - "Die responsive Profilabnahme bleibt blockierend offen, bis der Benutzer sie explizit freigibt."
  artifacts:
    - {path: frontend/src/components/profile/MemberBadgeChain.tsx, provides: "BadgeChain ohne allgemeine Aggregat-Zusammenfassung"}
    - {path: frontend/src/components/profile/MemberBadgeChain.module.css, provides: "kein ausschließlich vom entfernten Aggregat genutztes Styling"}
    - {path: frontend/src/components/profile/MemberBadgeChain.test.tsx, provides: "Abwesenheits- und Erhaltungsvertrag für Summary, Familien und Rollenanzahl"}
  key_links:
    - {from: frontend/src/components/profile/MemberBadgeChain.tsx, to: frontend/src/components/profile/MemberBadgeChain.test.tsx, via: "DOM- und SSR-Vertrag"}
    - {from: frontend/src/components/profile/MemberBadgeChain.tsx, to: frontend/src/components/profile/memberBadgeFamilies.ts, via: "bestehende Familienauflösung bleibt konsumiert"}
    - {from: .planning/quick/260812-rps-public-member-profile-responsive-stabilisieren/260812-rps-PLAN.md, to: "responsive Human-UAT", via: "gemeinsame Evidenz ohne Fremdabschluss"}
---

<objective>
Entferne die komplette irreführende allgemeine Aggregat-Zusammenfassung oberhalb des Rollenfortschritts aus `MemberBadgeChain`.

Purpose: Die Zahl allgemeiner Freischaltungen ist fachlich nicht mit den zwei ausgeübten Rollen vergleichbar und verdoppelt Informationen, die in den einzelnen Achievement-Familien verständlicher dargestellt werden.
Output: Kleine, TDD-gesicherte DOM/CSS-Bereinigung mit unveränderten Familien, Rollen, Profil-Badges und Datenverträgen sowie blockierender responsiver Live-UAT.
</objective>

<context>
<read_first>
@AGENTS.md
@docs/engineering/implementation-contract.md
@docs/frontend/ui-system.md
@docs/agent-guidelines-ui.md
@.planning/quick/260812-acs-count-only-achievement-summary/260812-acs-PLAN.md
@.planning/quick/260812-rps-public-member-profile-responsive-stabilisieren/260812-rps-PLAN.md
@frontend/src/app/members/[slug]/page.tsx
@frontend/src/components/profile/MemberProfileHero.tsx
@frontend/src/components/profile/MemberBadgeChain.tsx
@frontend/src/components/profile/MemberBadgeChain.module.css
@frontend/src/components/profile/MemberBadgeChain.test.tsx
@frontend/src/components/profile/memberBadgeFamilies.ts
@frontend/src/components/profile/memberBadgeLabels.ts
</read_first>
<interfaces>`MemberBadgeChain` berechnet weiterhin `generalCatalog`, `roleCatalog`, Gruppen und `resolveMemberBadgeFamilies(...)` für die nachgelagerte Darstellung. Nur der erste `.progressBlock` mit `generalAchievementSummary` und `progressPercent` ist Aggregate-UI. Die Rollenanzahl wird separat aus `earnedRoleCodes.size` direkt unter `Rollenfortschritt` gerendert.</interfaces>
<scope_boundary>Entfernen: Überschrift `Allgemeine Auszeichnungen`, count-only Text wie `4 Auszeichnungen freigeschaltet`, aggregierter Track sowie ausschließlich dafür bestehende Variablen, DOM und unbenutztes CSS. Erhalten: sämtliche Familien-/Stufen-Karten, Rollen-Carousel und Rollenanzahl, Beiträge, Punkte, Mitgliedschaft, besondere/Verifiziert-Badges im Profil-Hero, Katalog-Merge, Resolver, Daten und Reihenfolgen. Keine Änderungen an Backend, API, DTO, DB, Assets oder Profil-Hero.</scope_boundary>
<coordination>Dieser Quick supersediert ausschließlich das sichtbare Summary-Ziel von `260812-acs`; ACS weder SUMMARY/STATE/Planstatus geben noch als abgeschlossen melden. `260812-rps` ebenfalls nicht verändern oder finalisieren. Deren responsive Endabnahme bleibt offen und darf Evidenz dieses Quicks referenzieren.</coordination>
<dirty_tree_contract>Der gemeinsame Baum ist dirty, insbesondere `MemberBadgeChain.test.tsx`. Vor jeder Bearbeitung `git status --short`, Working- und Cached-Diff sowie Blob-IDs/SHA-256 aller drei Scope-Dateien nach `evidence/incoming/` sichern. Danach einen exakten Before-Patch aufnehmen; unbekannte Überlappung stoppt die Ausführung. Nur `apply_patch` und hunk-genaues Staging (`git diff --cached` gegen Incoming-Beleg prüfen), niemals `git add .`, `git add -A`, Ganzdatei-Staging oder breite Formatierung. Nach jeder Änderung exakten After-Patch sichern.</dirty_tree_contract>
</context>

<tasks>
<task type="auto" tdd="true">
<name>Task 1: RED - Abwesenheit des Aggregats und Erhalt der fachlichen Bereiche festschreiben</name>
<files>frontend/src/components/profile/MemberBadgeChain.test.tsx</files>
<behavior>
- DOM und SSR enthalten weder `Allgemeine Auszeichnungen` noch `N Auszeichnung(en) freigeschaltet`.
- Der allgemeine Summary-Progressbar/Track besitzt keine zugängliche oder sichtbare Repräsentation mehr.
- `Rollenfortschritt` und `2 ausgeübte Fansubrollen` bleiben sichtbar; Rollen zählen weiterhin distinkte tatsächlich ausgeübte Rollen.
- Repräsentative Familien für Beiträge, Fortschritt/Punkte und Mitgliedschaft samt Stufen bleiben gerendert.
- Ein Profil-Hero-Vertrag bestätigt separat, dass `Verifiziert` nicht aus dem Hero entfernt wird.
</behavior>
<action>Incoming-Hunks unverändert bewahren. Den bestehenden count-only-Summary-Test in einen gezielten Negativvertrag umwandeln und mit `renderToStaticMarkup` auch SSR abdecken. Vorhandene Rollen-/Familien-Fixtures verwenden; keinen Snapshot ergänzen. Falls der Hero-Erhalt bereits in einer bestehenden fokussierten Hero-Suite bewiesen ist, diese Suite in der Verifikation ausführen statt ihren Test zu duplizieren. RED-Ausgabe unter `evidence/RED.txt` sichern; sie muss ausschließlich wegen der noch vorhandenen Aggregat-UI fehlschlagen. Nur den neuen Test-Hunk nach Cached-Diff-Audit atomar committen.</action>
<verify><automated>cd /home/d1sk/team4s &amp;&amp; test -s .planning/quick/260812-ras-remove-aggregate-achievement-summary/evidence/RED.txt &amp;&amp; grep -E "FAIL|failed|AssertionError" .planning/quick/260812-ras-remove-aggregate-achievement-summary/evidence/RED.txt &amp;&amp; git diff --cached --check</automated></verify>
<done>Ein fokussierter RED-Vertrag beweist die gewünschte Abwesenheit und schützt Rollenanzahl, Familienausgabe und Hero-Badge; fremde Dirty-Hunks sind nicht absorbiert.</done>
</task>

<task type="auto" tdd="true">
<name>Task 2: GREEN - Aggregate-DOM und ausschließlich zugehörigen Code entfernen</name>
<files>frontend/src/components/profile/MemberBadgeChain.tsx, frontend/src/components/profile/MemberBadgeChain.module.css, frontend/src/components/profile/MemberBadgeChain.test.tsx</files>
<action>Den obersten `.progressBlock` vollständig entfernen, einschließlich `Allgemeine Auszeichnungen`, `generalAchievementSummary`, `progressPercent` und aggregiertem Track. `earnedCount` nur entfernen, wenn danach ohne Familien-/Resolver-Nutzung; `generalCatalog`, `mergedCatalog`, `roleCatalog`, `buildMemberBadgeGroups` und `resolveMemberBadgeFamilies` ausdrücklich erhalten. In CSS nur Selektoren oder Deklarationen löschen, deren Nutzungssuche beweist, dass sie ausschließlich dem entfernten Aggregat dient; `.progressMeta` bleibt bestehen, weil die Rollenanzahl sie nutzt. Keine fachlichen Schwellen, Counts, Kataloge, Familien, Carousel- oder Hero-Ausgabe ändern. Nach dem exakten After-Patch fokussierte Tests, Typecheck, scoped Lint und Diffchecks ausführen und nur beabsichtigte Hunks atomar committen.</action>
<verify><automated>cd /home/d1sk/team4s &amp;&amp; docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/MemberBadgeChain.test.tsx src/components/profile/MemberProfileHero.test.tsx 'src/app/members/[slug]/page.test.tsx' &amp;&amp; docker compose exec -T team4sv30-frontend npm run typecheck &amp;&amp; docker compose exec -T team4sv30-frontend npm run lint -- --file src/components/profile/MemberBadgeChain.tsx --file src/components/profile/MemberBadgeChain.test.tsx &amp;&amp; git diff --check &amp;&amp; git diff --cached --check</automated></verify>
<done>Die Aggregat-Zusammenfassung und ihr exklusiver toter Code fehlen; Rollenfortschritt beginnt mit der separaten Rollenanzahl; Familien, Hero-Badges und Datenmechanik bleiben testbar erhalten.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
<name>Task 3: Gemeinsame responsive Public-Profile-UAT freigeben</name>
<files>none</files>
<what-built>Das öffentliche Memberprofil ohne allgemeine Aggregat-Zusammenfassung, zusammen mit dem aktuellen Stand der offenen Responsive-Quick.</what-built>
<action>Die reale öffentliche Memberseite im geteilten Codex-Browser unter `http://127.0.0.1:3300` bei 390x844, 768x1024, 1024x768, 1440x900 und 1920x1080 unskaliert prüfen. Full-Page-Screenshots und `documentElement.scrollWidth/clientWidth` in `evidence/uat/MANIFEST.md` dokumentieren. Vor SUMMARY/STATE bis zur expliziten Freigabe stoppen; weder ACS noch RPS mutieren oder schließen.</action>
<how-to-verify>
1. Oben fehlen Überschrift, Freischaltungsanzahl und Aggregat-Balken vollständig; es bleibt keine auffällige Leerstelle.
2. `Rollenfortschritt` beginnt direkt mit der korrekten Anzahl ausgeübter Fansubrollen; Rollenkarte, Pfeile, Swipe/Pointer und Tastatur funktionieren.
3. Alle individuellen Familien/Stufen für Beiträge, Projekte/Fortschritt, Punkte und Mitgliedschaft bleiben sichtbar und bedienbar.
4. Profil-Hero-Badges wie `Verifiziert` bleiben unverändert sichtbar.
5. Alle fünf Viewports haben keinen horizontalen Overflow, kein Clipping, keine Überlappung und keine unlesbaren Umbrüche.
</how-to-verify>
<verify><automated>cd /home/d1sk/team4s &amp;&amp; docker compose ps team4sv30-frontend &amp;&amp; test -s .planning/quick/260812-ras-remove-aggregate-achievement-summary/evidence/uat/MANIFEST.md &amp;&amp; grep -E "390x844|768x1024|1024x768|1440x900|1920x1080" .planning/quick/260812-ras-remove-aggregate-achievement-summary/evidence/uat/MANIFEST.md &amp;&amp; git diff --check</automated></verify>
<done>Der Benutzer genehmigt alle fünf Größen und Interaktionen explizit. Ohne Freigabe bleibt dieser Quick offen; ACS und RPS bleiben unabhängig offen.</done>
<resume-signal>Antworte exakt `approved`, um ausschließlich `260812-ras` zu finalisieren, oder nenne Viewport und Defekt.</resume-signal>
</task>
</tasks>

<threat_model>
| Threat | Disposition | Mitigation |
|---|---|---|
| Familien-/Resolver-Daten werden mit dem Summary entfernt | mitigate | Nur Aggregat-Variablen/DOM entfernen; repräsentative Familien- und SSR-Tests. |
| Rollenanzahl oder Carousel regressiert | mitigate | Separate Rollenverträge und Live-Interaktion bleiben Pflicht. |
| Hero-Badge `Verifiziert` verschwindet | mitigate | Hero-Suite plus Live-UAT; Hero-Dateien außer Scope. |
| ACS/RPS werden fälschlich abgeschlossen | mitigate | Keine fremden SUMMARY-/STATE-/Planwrites; Approval gilt nur RAS. |
| Dirty Work wird in Commits aufgenommen | mitigate | Before/After-Patches, Blob/Hash-Belege und ausschließlich Hunk-Staging. |
| Responsive Leerstelle/Overflow bleibt | mitigate | Blockierende Live-UAT an fünf Viewports. |
</threat_model>

<verification>RED-first DOM/SSR-Vertrag; fokussierte BadgeChain-, Hero- und Page-Suites; Typecheck; scoped Lint; Working/Cached-Diffchecks; fünf Viewports und Interaktionen; explizite Freigabe.</verification>
<success_criteria>Kein allgemeines Aggregat in DOM, Accessibility oder SSR; Rollenanzahl und alle individuellen Familien/Stages bleiben; Hero, API und Daten unverändert; keine fremden Dirty-Hunks; responsive UAT genehmigt.</success_criteria>
<source_audit>
GOAL komplette allgemeine Aggregat-Zusammenfassung entfernen | Tasks 1-2 | COVERED
REQ Rollenfortschritt beginnt direkt mit separater distinkter Rollenanzahl | Tasks 1-3 | COVERED
REQ Familien, Stufen, Hero-Verifiziert, Carousel, Beiträge, Punkte, Mitgliedschaft erhalten | Tasks 1-3 | COVERED
REQ Berechnungen/Resolver für Downstream, Backend/API/DB erhalten | Task 2 scope and tests | COVERED
REQ obsolete aggregate-only DOM/CSS/tests entfernen | Tasks 1-2 | COVERED
REQ ACS nur sichtbar supersedieren, ACS/RPS nicht finalisieren | Coordination, Task 3 | COVERED
REQ dirty shared repo Before/After und Hunk-Staging | Context, Tasks 1-2 | COVERED
REQ TDD, Checks, blockierender responsiver Checkpoint | Tasks 1-3 | COVERED
RESEARCH | EXCLUDED - Level 0, bestehende React/Vitest/CSS-Seams
CONTEXT deferred ideas | EXCLUDED - none
</source_audit>
<output>Erst nach Task-3-Freigabe `260812-ras-SUMMARY.md` erstellen und ausschließlich RAS in STATE finalisieren. ACS und RPS bleiben über ihre eigenen Resume-Pfade offen.</output>
