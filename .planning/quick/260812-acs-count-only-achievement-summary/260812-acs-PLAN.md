---
phase: quick-260812-acs
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [frontend/src/components/profile/MemberBadgeChain.tsx, frontend/src/components/profile/MemberBadgeChain.test.tsx]
autonomous: false
requirements: [260812-acs-copy, 260812-acs-responsive-uat]
must_haves:
  truths:
    - "Allgemeine Auszeichnungen werden nur als grammatisch korrekte freigeschaltete Anzahl benannt."
    - "Sichtbarer Text, Accessible Name und SSR-Markup verwenden dieselbe Copy ohne Katalog-Nenner."
    - "Berechnung, Fortschrittsbalken, Katalog, Rollenstufen und separater Fansubrollen-Zähler bleiben unverändert."
    - "Das vollständige öffentliche Profil besteht die gemeinsame Abnahme an fünf exakten Viewports."
  artifacts:
    - {path: frontend/src/components/profile/MemberBadgeChain.tsx, provides: "count-only UI- und ARIA-Zusammenfassung"}
    - {path: frontend/src/components/profile/MemberBadgeChain.test.tsx, provides: "Singular-, Plural-, Accessibility-, SSR- und Mechanikschutz"}
  key_links:
    - {from: frontend/src/components/profile/MemberBadgeChain.tsx, to: frontend/src/components/profile/MemberBadgeChain.test.tsx, via: "DOM- und SSR-Verträge"}
    - {from: .planning/quick/260812-rps-public-member-profile-responsive-stabilisieren/260812-rps-PLAN.md, to: "Task 3", via: "gemeinsame UAT ohne Fremd-Quick-Abschluss"}
---

<objective>
Entferne den irreführenden Katalog-Nenner aus der allgemeinen Auszeichnungszusammenfassung und schließe danach die gemeinsame responsive Profilabnahme ab.
Purpose: Nutzer müssen nicht jede Rolle verdienen; nur tatsächlich freigeschaltete allgemeine Auszeichnungen werden zusammengefasst, ausgeübte Fansubrollen bleiben separat.
Output: TDD-gesicherte count-only Copy in UI, Accessibility und SSR sowie blockierende Live-UAT an fünf Viewports.
</objective>

<context>
<read_first>
@AGENTS.md
@docs/engineering/implementation-contract.md
@docs/frontend/ui-system.md
@docs/agent-guidelines-ui.md
@.planning/quick/260812-rps-public-member-profile-responsive-stabilisieren/260812-rps-PLAN.md
@frontend/src/app/members/[slug]/page.tsx
@frontend/src/app/members/[slug]/page.test.tsx
@frontend/src/components/profile/MemberBadgeChain.tsx
@frontend/src/components/profile/MemberBadgeChain.test.tsx
@frontend/src/components/profile/MemberStorySection.tsx
@frontend/src/components/profile/MemberStorySection.test.tsx
@frontend/src/components/profile/MemberCurrentProjectsSection.tsx
@frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx
@frontend/src/components/ui/FocalCarousel.tsx
@frontend/src/components/ui/FocalCarousel.test.tsx
</read_first>
<interfaces>`MemberBadgeChain` leitet `earnedCount`, `generalCatalog`, `progressPercent` und `earnedRoleCodes` ab. Sichtbarer Summary-Text und `.progressBlock`-`aria-label` müssen denselben lokalen String verwenden. `progressPercent` behält `generalCatalog.length`; Fansubrollen bleiben separat.</interfaces>
<scope_boundary>Nur allgemeine Achievement-Copy und fokussierte Tests. Keine Änderung an Earned-Berechnung, Katalog, Prozent/Track, Filterung, Reihenfolge, Familien, Rollenstufen/-copy, Backend, API, DTO, DB, Assets, Carousel oder Layout. CSS nur nach nachgewiesenem Text-fit-Defekt und vorheriger PlanÄnderung.</scope_boundary>
<dirty_tree_contract>Der Baum ist dirty, einschließlich `MemberBadgeChain.test.tsx` und Dateien der offenen Responsive-Quick. Vor Bearbeitung Status, Working/Cached-Diffs sowie Blob-IDs/Hashes beider Scope-Dateien unter `evidence/incoming/` sichern; bei unbekannter Hunk-Überlappung stoppen. Nur `apply_patch` und exaktes Hunk-Staging; niemals `git add .`, `git add -A`, Ganzdatei-Formatierung oder -Staging.</dirty_tree_contract>
<coordination>`260812-rps` liefert den offenen responsiven Seitenzustand für Task 3, bleibt aber eigenständig in progress. Seine SUMMARY, VERIFICATION, STATE-Zeile, Planstatus und Commits nicht erstellen, ändern oder als abgeschlossen melden. Task-3-Approval schließt ausschließlich `260812-acs` ab; gemeinsame Evidenz darf die spätere RPS-Resume referenzieren.</coordination>
</context>

<tasks>
<task type="auto" tdd="true">
<name>Task 1: RED - count-only Singular, Plural, Accessibility und SSR festschreiben</name>
<files>frontend/src/components/profile/MemberBadgeChain.test.tsx</files>
<behavior>
- 1 allgemeine Auszeichnung ergibt sichtbar und zugänglich `1 Auszeichnung freigeschaltet`.
- 0 oder mehrere ergeben `N Auszeichnungen freigeschaltet`, beispielsweise `4 Auszeichnungen freigeschaltet`.
- DOM und `renderToStaticMarkup` enthalten kein `N von M Auszeichnungen freigeschaltet`.
- Rollen bleiben aus dem allgemeinen Zähler ausgeschlossen; `1 ausgeübte Fansubrolle` und `2 ausgeübte Fansubrollen` bleiben separat.
- Track/Prozent verwenden weiterhin `earnedCount / generalCatalog.length`.
</behavior>
<action>Incoming Test-Hunks bewahren. Die obsolete D-01-Erwartung `1 von 1 Auszeichnungen freigeschaltet` durch 0/1/Plural-Verträge ersetzen. Accessible Name und sichtbaren Text prüfen. Mit vorhandenem `renderToStaticMarkup` SSR und Abwesenheit des Nenner-Musters beweisen. Rollen-Exklusion/Fansubrollen-Copy beibehalten. Erwartetes Failing in `evidence/RED.txt` sichern und nur exakte Test-Hunks nach Cached-Diff-Audit committen.</action>
<verify><automated>cd /home/d1sk/team4s &amp;&amp; test -s .planning/quick/260812-acs-count-only-achievement-summary/evidence/RED.txt &amp;&amp; grep -E "FAIL|failed|AssertionError" .planning/quick/260812-acs-count-only-achievement-summary/evidence/RED.txt &amp;&amp; git diff --cached --check</automated></verify>
<done>Tests scheitern nur am alten Nenner; eingehende Dirty-Hunks bleiben erhalten.</done>
</task>

<task type="auto" tdd="true">
<name>Task 2: GREEN - einen korrekt flektierten count-only String wiederverwenden</name>
<files>frontend/src/components/profile/MemberBadgeChain.tsx, frontend/src/components/profile/MemberBadgeChain.test.tsx</files>
<action>Direkt nach `earnedCount` einen lokalen `generalAchievementSummary` ableiten: nur bei 1 `Auszeichnung`, sonst `Auszeichnungen`. Identisch als `.progressBlock`-`aria-label` und sichtbaren Meta-Wert verwenden. `generalCatalog.length` ausschließlich in `progressPercent` belassen; Track, Katalog, Filter und Rollenmechanik unverändert lassen. Keinen Shared Helper für diese lokale Seam. Fokussuiten, Typecheck, scoped ESLint und Diffchecks ausführen; nur beabsichtigte Hunks nach Incoming-Abgleich committen.</action>
<verify><automated>cd /home/d1sk/team4s &amp;&amp; docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/MemberBadgeChain.test.tsx 'src/app/members/[slug]/page.test.tsx' &amp;&amp; docker compose exec -T team4sv30-frontend npm run typecheck &amp;&amp; docker compose exec -T team4sv30-frontend npm run lint -- --file src/components/profile/MemberBadgeChain.tsx --file src/components/profile/MemberBadgeChain.test.tsx &amp;&amp; git diff --check &amp;&amp; git diff --cached --check</automated></verify>
<done>UI, Accessible Name und SSR sind count-only und grammatisch korrekt; Fortschritt/Rollenmechanik bleiben unverändert; Checks sind grün.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
<name>Task 3: Gemeinsame responsive Public-Profile-UAT freigeben</name>
<files>none</files>
<what-built>Count-only Achievement-Copy zusammen mit dem aktuellen implementierten Stand der offenen Responsive-Profilkorrekturen.</what-built>
<action>Nach Tasks 1-2 die reale öffentliche Memberseite im geteilten Codex-Browser unter `http://127.0.0.1:3300` prüfen. Exakte unskalierte Full-Page-Evidenz bei 390x844, 768x1024, 1024x768, 1440x900 und 1920x1080 unter `evidence/uat/` ablegen. `MANIFEST.md`: URL, Viewport, Screenshot, `documentElement.scrollWidth/clientWidth`, Pass/Fail je Punkt. RPS-Evidenz nur mit übereinstimmendem Commit/Viewport referenzieren, sonst neu aufnehmen. Carousel-Pfeile und Swipe/Pointer bei 390/768/1024 sowie Tastatur einmal testen. Vor SUMMARY/STATE bis zur expliziten Freigabe stoppen; RPS nicht mutieren oder schließen.</action>
<how-to-verify>
1. Fansub-Geschichte: mindestens acht lesbare Vorschauzeilen vor `Mehr lesen`, Fade nur unten, kein Clipping.
2. Gruppenzugehörigkeit/Grid/Cards: kein Überlappen, buchstabenweiser Umbruch oder Seitenoverflow.
3. Sichtbare und zugängliche Benennung `Fansub-Projekte`; `Aktuelle Projekte` fehlt dort.
4. Beiträge-Carousel: aktive Karte lesbar, nur beabsichtigtes Peeking, Pfeil-/Swipe-/Pointer-/Tastatursteuerung funktioniert.
5. Summary `N Auszeichnung(en) freigeschaltet` ohne `von 13` oder anderen Katalog-Nenner; korrekter Singular, Fansubrollen separat.
6. Alle fünf Viewports: kein horizontaler Overflow, Clipping, Überlappen oder unlesbarer Text; narrow gestapelt, wide ausgewogen.
</how-to-verify>
<verify><automated>cd /home/d1sk/team4s &amp;&amp; docker compose ps team4sv30-frontend &amp;&amp; test -s .planning/quick/260812-acs-count-only-achievement-summary/evidence/uat/MANIFEST.md &amp;&amp; grep -E "390x844|768x1024|1024x768|1440x900|1920x1080" .planning/quick/260812-acs-count-only-achievement-summary/evidence/uat/MANIFEST.md &amp;&amp; git diff --check</automated></verify>
<done>User genehmigt alle Größen/Interaktionen explizit oder meldet den Defekt an Task 2 bzw. die besitzende Responsive-Quick zurück. Ohne Freigabe bleibt ACS offen.</done>
<resume-signal>Antworte exakt `approved` zur Finalisierung nur von `260812-acs`, oder nenne Viewport und Defekt.</resume-signal>
</task>
</tasks>

<threat_model>
| Threat | Disposition | Mitigation |
|---|---|---|
| Fortschrittsnenner wird funktional geändert | mitigate | `generalCatalog.length` bleibt in `progressPercent`; Mechaniktest. |
| UI/ARIA/SSR driften | mitigate | Ein lokaler String, DOM- und SSR-Tests. |
| Singular/Rollen regressieren | mitigate | 0/1/Plural plus Rollenverträge. |
| RPS wird falsch abgeschlossen | mitigate | Keine Fremd-Artefakt-/Statuswrites; Approval gilt nur ACS. |
| Dirty Work wird absorbiert | mitigate | Patches/Blobs/Hashes, Overlap-Gate, Hunk-Staging. |
| Visuelle Regression bleibt | mitigate | Blockierende Live-UAT an fünf Viewports. |
</threat_model>
<verification>RED-first DOM/ARIA/SSR; unveränderte Progress-/Rollenmechanik; fokussierte Suites; Typecheck; scoped Lint; Diffchecks; fünf-Viewport-Live-UAT; Freigabe.</verification>
<success_criteria>Kein Katalog-Nenner sichtbar/zugänglich; korrekter Singular/Plural; Mechanik unverändert; Seite besteht fünf Größen; keine fremden Dirty-Hunks oder Quick-Statusänderungen.</success_criteria>
<source_audit>
GOAL Nenner entfernen | Tasks 1-2 | COVERED
REQ UI, Accessibility, SSR, Singular/Plural | Tasks 1-2 | COVERED
REQ Mechanik/Katalog/Rollen/API/DB/Layout unverändert | Tasks 1-2 | COVERED
REQ Story, Gruppen, Fansub-Projekte, Carousel, Copy und fünf Größen ohne Overflow/Clipping | Task 3 | COVERED
REQ RPS koordinieren, nicht abschließen | Context, Task 3 | COVERED
RESEARCH | EXCLUDED - Level 0 vorhandene React/SSR/Vitest-Seams
CONTEXT deferred ideas | EXCLUDED - none
</source_audit>
<output>Erst nach Task-3-Freigabe `260812-acs-SUMMARY.md` und nur ACS in STATE finalisieren. RPS bleibt `$gsd-quick resume` vorbehalten.</output>

