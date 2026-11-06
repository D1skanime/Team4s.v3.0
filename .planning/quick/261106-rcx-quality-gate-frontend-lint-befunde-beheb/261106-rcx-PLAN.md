---
phase: quick-rcx
plan: 01
type: execute
wave: 1
depends_on: []
requirements: []
autonomous: true
files_modified:
  - frontend/capture-responsive.cjs (geloescht, ersetzt durch frontend/capture-responsive.mjs)
  - frontend/capture-responsive.mjs (neu)
  - frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx
  - frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts
  - frontend/src/app/anime/[id]/group/[groupId]/releases/ReleasesFilterBar.tsx
must_haves:
  truths:
    - "npx eslint auf den vier betroffenen Dateien zeigt keine der vier urspruenglichen Befunde mehr (@typescript-eslint/no-require-imports, react-hooks/preserve-manual-memoization, no-restricted-syntax) und keine neuen Fehler."
    - "npx tsc --noEmit bleibt fehlerfrei."
    - "capture-responsive.mjs verhaelt sich zur Laufzeit identisch zum alten .cjs-Skript (gleiche URL, gleiche Viewport-Groessen, gleiche Screenshot-Pfade, gleiche Konsolenausgabe)."
    - "storyContext, das EpisodeVersionEditorPage an ReleaseVersionMediaSection durchreicht, hat ueber Renders mit unveraenderten segmentAnimeId/segmentGroupId/segmentVersion eine stabile Objekt-Identitaet (useMemo), damit useReleaseVersionMedias fetcher nicht bei jedem Render neu feuert."
    - "Die Freitextsuche in ReleasesFilterBar.tsx nutzt die globale Input-Primitive statt eines nativen input-Elements, bei identischem Verhalten (Wert, onChange, Placeholder, aria-label, Styling)."
  artifacts:
    - path: "frontend/capture-responsive.mjs"
      provides: "ESM-Version des Playwright-Screenshot-Debug-Skripts, ersetzt die alte CommonJS-Datei"
    - path: "frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx"
      provides: "memoisiertes storyContext-Objekt (useMemo ueber segmentAnimeId/segmentGroupId/segmentVersion)"
      contains: "useMemo"
    - path: "frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts"
      provides: "fetcher-Abhaengigkeitsarray auf [storyContext, versionId] angepasst, passend zur jetzt stabilen storyContext-Referenz"
      contains: "[storyContext, versionId]"
    - path: "frontend/src/app/anime/[id]/group/[groupId]/releases/ReleasesFilterBar.tsx"
      provides: "Suchfeld ueber die globale Input-Primitive statt natives input-Element"
      contains: "Input"
  key_links:
    - from: "frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx"
      to: "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx"
      via: "storyContext-Prop, jetzt per useMemo stabil referenziert statt Inline-Objektliteral"
      pattern: "const storyContext = useMemo"
    - from: "frontend/src/app/anime/[id]/group/[groupId]/releases/ReleasesFilterBar.tsx"
      to: "frontend/src/components/ui/Input.tsx"
      via: "Import aus @/components/ui statt natives input-Element"
      pattern: "import { Input } from '@/components/ui'"
---

<objective>
Behebt die vier konkreten ESLint-Befunde, die den automatisierten Quality-Gate-Lauf
(frontend-lint-Schritt) mit rc=1 haben scheitern lassen:

1. frontend/capture-responsive.cjs -- @typescript-eslint/no-require-imports (2 Fehler)
2. useReleaseVersionMedia.ts -- react-hooks/preserve-manual-memoization (1 Fehler)
3. ReleasesFilterBar.tsx -- no-restricted-syntax (1 Fehler, natives input-Element)

Alle drei Root-Causes wurden bereits analysiert (siehe Hintergrund-Abschnitt des Auftrags) und
werden hier 1:1 umgesetzt, ohne erneute Recherche.

Purpose: Quality-Gate wieder gruen bekommen, ohne irgendeine Befund-Ursache nur zu unterdruecken
(ESLint-Disable-Kommentar) statt echt zu beheben -- Finding 2 behebt zusaetzlich einen latenten,
echten Perf-Footgun (fetcher feuerte bei jedem Render von EpisodeVersionEditorPage neu), Finding 3
schliesst eine echte, nicht per Altlast-Liste gedeckte Design-System-Verletzung.
Output: capture-responsive.mjs (ESM-Ersatz fuer die geloeschte .cjs-Datei), memoisiertes
storyContext in EpisodeVersionEditorPage.tsx plus passend angepasstes Abhaengigkeitsarray in
useReleaseVersionMedia.ts, ReleasesFilterBar.tsx auf die globale Input-Primitive umgestellt.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@AGENTS.md

<note>
Dies ist Runde 1 von 3 einer Quality-Gate-Befund-Behebung. KEINE neuen Tests schreiben, KEINE
Testsuiten laufen lassen (npx vitest run, npm test o.ae.) -- die verbindliche Projektregel
(REIHENFOLGE, siehe CLAUDE.md/AGENTS.md) verbietet neue Tests vor der menschlichen Live-Abnahme.
Verifikation fuer diesen Auftrag ist ausschliesslich npx tsc --noEmit (gesamtes Projekt) und
npx eslint auf genau den vier betroffenen Dateien -- nichts weiter. Keine Testdatei anfassen,
keine bestehende Testdatei ausfuehren.

Alle drei Befunde sind bereits vollstaendig diagnostiziert (siehe Tasks unten) -- keine erneute
Ursachenforschung, direkt umsetzen.

Dateigroessen bereits geprueft (alle unter dem 450-Zeilen-Limit aus CLAUDE.md "Uebergrosse
Dateien beim Anfassen aufteilen" -- EpisodeVersionEditorPage.tsx 422 Zeilen, useReleaseVersionMedia.ts
365 Zeilen, ReleasesFilterBar.tsx 86 Zeilen): kein Datei-Split in diesem Auftrag noetig.

docs/FRONTEND_ARCHITEKTUR.md braucht fuer Task 3 KEINE Aktualisierung -- reiner mechanischer
Tausch natives Element gegen bereits dokumentierte, bestehende Primitive, kein neuer Baustein,
keine neue Prop, kein neues Muster. Nicht danach suchen, es gibt dort nichts zu aendern.
</note>
</context>

<interfaces>
Bestehendes ESM-Vorbild fuer Task 1 (frontend/tmp-manual-login-check.mjs, lintet bereits sauber):
import { chromium } from 'playwright' am Dateianfang, dann direkter Modul-Code mit Top-Level-await
(const browser = await chromium.launch(); ... await browser.close()), kein IIFE-Wrapper, kein
require(). Exakte Datei: frontend/tmp-manual-login-check.mjs.

Zielprimitive fuer Task 3 (frontend/src/components/ui/Input.tsx): export interface InputProps
extends InputHTMLAttributes<HTMLInputElement> { invalid?: boolean }; export const Input =
forwardRef<HTMLInputElement, InputProps>(...) reicht alle Standard-Input-Props durch
({...props}) und merged ein uebergebenes className per classNames(styles.control, ...,
className) -- eigenes className bleibt also wirksam neben der Basis-Klasse. Barrel-Export:
import { Input } from '@/components/ui' (frontend/src/components/ui/index.ts).
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: capture-responsive.cjs zu ESM (.mjs) konvertieren</name>
  <files>frontend/capture-responsive.cjs, frontend/capture-responsive.mjs</files>
  <action>
    Root Cause: frontend/capture-responsive.cjs ist ein verwaistes Playwright-Debug-Skript (macht
    Screenshots von /members/sheppert bei 5 Viewport-Breiten nach /tmp/), versehentlich im
    Projekt-Root committet, in CommonJS geschrieben (require('playwright'), require('fs')) und
    verstoesst dadurch gegen @typescript-eslint/no-require-imports (2 Fehler). Es wird von keinem
    package.json-Skript, keinem Test und keiner anderen Datei referenziert. Das etablierte
    Projektmuster fuer genau diese Art Ad-hoc-Playwright-Tooling ist eine ESM-.mjs-Datei mit
    import (siehe frontend/tmp-manual-login-check.mjs, lintet bereits sauber, nutzt
    import { chromium } from 'playwright' plus Top-Level-await, kein IIFE).

    Erzeuge frontend/capture-responsive.mjs mit identischem Laufzeitverhalten zum Original:
    - import { chromium } from 'playwright' statt require('playwright').
    - Den fs-Import ersatzlos weglassen (ungenutzt im Original -- tilgt nebenbei eine
      vorbestehende no-unused-vars-Warnung, nicht Pflicht-Scope, aber kostenlos mit erledigt).
    - Den sizes-Array (die fuenf Eintraege '390'/390/844 bis '1920'/1920/1080) unveraendert
      uebernehmen.
    - Die CommonJS-IIFE (das (async () => { ... })().catch(...)-Konstrukt) durch Top-Level-await-
      Code ersetzen, exakt nach dem Muster von tmp-manual-login-check.mjs: kein Wrapper, die
      for-Schleife direkt auf Modulebene. Fehlerbehandlung: da Top-Level-await in Node ESM bei
      einer unbehandelten Exception im Modul selbst bereits mit Exit-Code ungleich 0 abbricht, ist
      der vormalige .catch(error => { console.error(error); process.exit(1) })-Zweig funktional
      dadurch abgedeckt -- kein zusaetzlicher try/catch-Wrapper noetig (gleiches Fehlerverhalten:
      Stacktrace auf stderr, Nicht-Null-Exit-Code).
    - Browser-Start (chromium.launch({ headless: true })), die verschachtelte Schleife ueber
      sizes und die beiden Headings (Beitraege/Mitgliedschaft), die page.goto(...)-URL
      (http://172.17.0.1:3000/members/sheppert), alle waitForTimeout-Werte, die
      Screenshot-Pfade (/tmp/sheppert-locked-${key}-${label}.png), der page.evaluate(...)-Audit
      und der console.log(label, JSON.stringify(audit))-Aufruf bleiben identisch zum Original --
      nur die Modul-Syntax aendert sich, kein Verhaltensunterschied.

    Entferne danach frontend/capture-responsive.cjs so, dass Git die Umbenennung erkennt (per
    git mv frontend/capture-responsive.cjs frontend/capture-responsive.mjs und anschliessendem
    Edit der neuen Datei, ODER explizitem git rm + git add beider Dateien im selben Commit) --
    kein unzusammenhaengendes Delete+Add.
  </action>
  <verify>
    <automated>test -f frontend/capture-responsive.mjs && test ! -f frontend/capture-responsive.cjs && cd frontend && docker compose exec team4sv30-frontend npx eslint capture-responsive.mjs</automated>
  </verify>
  <done>
    frontend/capture-responsive.mjs existiert mit identischer Laufzeit-Logik (gleiche URL, gleiche
    Viewport-Groessen, gleiche Screenshot-Pfade, gleiche Konsolenausgabe) als Top-Level-await-ESM-
    Datei; frontend/capture-responsive.cjs existiert nicht mehr; npx eslint auf der neuen Datei
    meldet keinen @typescript-eslint/no-require-imports-Fehler mehr.
  </done>
</task>

<task type="auto">
  <name>Task 2: storyContext stabil memoisieren (EpisodeVersionEditorPage.tsx) und fetcher-Abhaengigkeiten passend anpassen (useReleaseVersionMedia.ts)</name>
  <files>
    frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx,
    frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts
  </files>
  <action>
    Root Cause: useReleaseVersionMedia.ts's fetcher-useCallback (Zeile 249-265) liest
    storyContext?.animeId/storyContext?.groupId/storyContext?.version per Optional Chaining und
    listet genau diese drei Felder plus versionId als Hand-Abhaengigkeitsarray (Zeile 265:
    "}, [storyContext?.animeId, storyContext?.groupId, storyContext?.version, versionId])"). React
    Compilers statische Analyse (hier rein als ESLint-Readiness-Check wirksam -- kein
    babel-plugin-react-compiler ist in next.config.mjs tatsaechlich verdrahtet, also ein reiner
    Lint-Zeit-Befund, kein aktuell abgeschaltetes Laufzeit-Optimierungsziel) kann Optional-Chain-
    Lesezugriffe nicht ueber das Basisobjekt hinaus verfeinern und leitet deshalb das GESAMTE
    storyContext-Objekt als Abhaengigkeit ab statt der drei Einzelfelder. Weil die abgeleitete
    Abhaengigkeit (storyContext) grobkoerniger ist als das handgeschriebene Array, meldet die Regel
    react-hooks/preserve-manual-memoization einen Mismatch.

    Das Abhaengigkeitsarray NICHT isoliert auf [storyContext, versionId] verbreitern, ohne die
    Aufruferseite zu fixen: der einzige reale Aufrufer -- EpisodeVersionEditorPage.tsx Zeile 379
    -- uebergibt storyContext als neues Inline-Objektliteral ({ animeId: segmentAnimeId, groupId:
    segmentGroupId, version: segmentVersion }) bei JEDEM Render, unabhaengig davon, ob sich die
    drei Primitiv-Felder tatsaechlich geaendert haben. Eine blosse Verbreiterung wuerde fetcher bei
    jedem Render eine neue Identitaet geben, was ueber useCancellableSlugState's internes
    Effekt-Abhaengigkeitsarray (frontend/src/hooks/useCancellableSlugState.ts Zeile 85:
    "}, [requestKey, enabled, fetcher])") zu Abbruch-und-Neu-Fetch bei jedem einzelnen Render
    fuehren wuerde -- eine echte Regression, kein reiner Lint-Nitpick.

    Der korrekte Fix setzt an BEIDEN Enden an:

    (a) In EpisodeVersionEditorPage.tsx: direkt nach der Berechnung von segmentVersion (aktuell
    Zeile 136-137, vor neighborNav Zeile 138) ein neues
    "const storyContext = useMemo(() => ({ animeId: segmentAnimeId, groupId: segmentGroupId, version: segmentVersion }), [segmentAnimeId, segmentGroupId, segmentVersion])"
    einfuegen (useMemo ist in dieser Datei bereits importiert, Zeile 5:
    "import { useEffect, useMemo, useState } from \"react\";"). Am ReleaseVersionMediaSection-
    Aufruf (aktuell Zeile 379) das Inline-Objektliteral
    "storyContext={{ animeId: segmentAnimeId, groupId: segmentGroupId, version: segmentVersion }}"
    durch "storyContext={storyContext}" ersetzen. Dadurch bleibt die Objektreferenz ueber Renders
    mit unveraenderten segmentAnimeId/segmentGroupId/segmentVersion stabil.

    (b) In useReleaseVersionMedia.ts: jetzt, da die Aufruferseite eine stabile storyContext-Referenz
    garantiert, das fetcher-useCallback-Abhaengigkeitsarray (Zeile 265) von
    "[storyContext?.animeId, storyContext?.groupId, storyContext?.version, versionId]" zu
    "[storyContext, versionId]" aendern (exakt passend zur Granularitaet der Compiler-Ableitung).
    Der Callback-Koerper (Zeile 250-264, liest weiterhin storyContext?.animeId, storyContext.groupId,
    storyContext.version) bleibt unveraendert -- nur das Abhaengigkeitsarray in Zeile 265 aendert sich.

    Beide Edits zusammen beheben sowohl den Lint-Befund als auch den zugrunde liegenden, bislang
    latenten Perf-Footgun (Abbruch-und-Neu-Fetch bei jedem Render) -- keine blosse Unterdrueckung.

    Kein Test anfassen: useReleaseVersionMedia.test.ts referenziert storyContext-Identitaet nicht
    und braucht keine Aenderung (bereits geprueft).
  </action>
  <verify>
    <automated>cd frontend && docker compose exec team4sv30-frontend npx eslint "src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx" "src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts" && docker compose exec team4sv30-frontend npx tsc --noEmit</automated>
  </verify>
  <done>
    EpisodeVersionEditorPage.tsx hat ein per useMemo stabilisiertes storyContext und reicht es als
    storyContext={storyContext} an ReleaseVersionMediaSection durch; useReleaseVersionMedia.ts's
    fetcher-Abhaengigkeitsarray ist [storyContext, versionId]; npx eslint meldet fuer beide Dateien
    keinen react-hooks/preserve-manual-memoization-Fehler mehr; npx tsc --noEmit ist fehlerfrei.
  </done>
</task>

<task type="auto">
  <name>Task 3: natives input-Element in ReleasesFilterBar.tsx durch die globale Input-Primitive ersetzen</name>
  <files>frontend/src/app/anime/[id]/group/[groupId]/releases/ReleasesFilterBar.tsx</files>
  <action>
    Root Cause: ein natives input type="text" (aktuell Zeile 69, className={styles.searchInput})
    verstoesst gegen die repo-weite Pflichtregel aus CLAUDE.md "Frontend-UI (globales
    Design-System)" -- natives input ist ueberall verboten, wo @/components/ui's Input existiert,
    durchgesetzt per no-restricted-syntax in frontend/eslint.config.mjs. Diese Datei steht NICHT
    auf der eingefrorenen LEGACY_NO_RESTRICTED_SYNTAX_FILES-Ratchet-Ausnahmeliste (nur die
    Nachbardatei .../releases/page.tsx ist dort gelistet, nicht ReleasesFilterBar.tsx selbst) --
    ein echter, nicht gegrandfatherter Verstoss, kein Altlast-Fall.

    Fix: ersetze das native input durch Input aus @/components/ui (Barrel-Export aus
    frontend/src/components/ui/index.ts). Uebernimm dabei alle bestehenden Props unveraendert:
    type="text", value={searchTerm}, onChange={(e) => onSearchChange(e.target.value)},
    placeholder="Suche...", aria-label="Suche nach Releases". Reiche das bestehende lokale Styling
    unveraendert per className={styles.searchInput} weiter -- Input.tsx (frontend/src/components/ui/Input.tsx)
    merged ein uebergebenes className bereits per classNames(styles.control, ..., className) ueber
    seine eigene Basis-Klasse, dasselbe etablierte Muster wie bei anderen custom-gestylten
    Input-Verwendungen im Projekt (z. B. src/app/me/profile/components/MemberClaimSection.tsx).
    Keine CSS-Aenderung noetig; page.module.css's bestehende .searchInput/.searchContainer/
    .clearButton-Regeln bleiben unveraendert. Ergaenze am Dateikopf
    "import { Input } from '@/components/ui'".

    docs/FRONTEND_ARCHITEKTUR.md NICHT anfassen -- reiner mechanischer Tausch gegen eine bereits
    dokumentierte, bestehende Primitive ohne neuen Baustein/neue Prop/neues Muster (siehe Hinweis
    im <context>-Block oben).
  </action>
  <verify>
    <automated>cd frontend && docker compose exec team4sv30-frontend npx eslint "src/app/anime/[id]/group/[groupId]/releases/ReleasesFilterBar.tsx" && docker compose exec team4sv30-frontend npx tsc --noEmit</automated>
  </verify>
  <done>
    ReleasesFilterBar.tsx importiert Input aus @/components/ui und nutzt es statt eines nativen
    input-Elements fuer die Freitextsuche, mit identischem Verhalten (Wert, onChange, Placeholder,
    aria-label) und identischem Styling (className={styles.searchInput}); npx eslint meldet keinen
    no-restricted-syntax-Fehler mehr fuer diese Datei; npx tsc --noEmit ist fehlerfrei.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| keine neue Grenze | Alle drei Fixes sind mechanische Umbauten bestehenden, bereits vertrauten Codes (ESM-Konvertierung eines Dev-Debug-Skripts, Memoisierung eines bereits lokal berechneten Objekts, Austausch eines nativen Elements gegen die bereits katalogisierte Input-Primitive). Keine neue Eingabequelle, keine neue Netzwerkgrenze, kein neuer externer Aufruf.

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-261106rcx-01 | Tampering | ReleasesFilterBar.tsx Suchfeld | accept | Reiner UI-Primitive-Tausch, identisches Wert-/onChange-Verhalten wie vorher -- kein neues Eingabeverhalten, kein neuer Validierungspfad. |
| T-261106rcx-02 | Information Disclosure | frontend/capture-responsive.mjs | accept | Bleibt ein lokales, nicht in Produktionsbuilds eingebundenes Dev-Debug-Skript; Zielseite (/members/sheppert) und Verhalten unveraendert zum bisherigen .cjs-Original. |
| T-261106rcx-SC | Tampering | npm/pip/cargo installs | accept | Dieser Auftrag installiert keine neuen Pakete -- reine Datei-Edits an bereits vorhandenem Code. |
</threat_model>

<verification>
Nach Abschluss aller drei Tasks:
- cd frontend && docker compose exec team4sv30-frontend npx eslint capture-responsive.mjs "src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx" "src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts" "src/app/anime/[id]/group/[groupId]/releases/ReleasesFilterBar.tsx" -- keine der vier urspruenglichen Befunde, keine neuen Fehler.
- docker compose exec team4sv30-frontend npx tsc --noEmit -- fehlerfrei.
- frontend/capture-responsive.cjs existiert nicht mehr; frontend/capture-responsive.mjs existiert.
- KEINE Testsuite wurde ausgefuehrt und keine Testdatei wurde angefasst (REIHENFOLGE-Regel, siehe CLAUDE.md/AGENTS.md).
</verification>

<success_criteria>
- Der automatisierte Quality-Gate-Lauf (frontend-lint-Schritt) zeigt fuer alle vier urspruenglich gemeldeten Fundstellen keinen Fehler mehr.
- Kein Befund wurde durch einen ESLint-Disable-Kommentar unterdrueckt -- alle drei Root Causes sind echt behoben (inkl. des in Finding 2 aufgedeckten latenten Perf-Footguns).
- Keine neue Testdatei, kein Testlauf in diesem Auftrag (Runde 1 von 3 der Quality-Gate-Behebung).
</success_criteria>

<output>
Erzeuge .planning/quick/261106-rcx-quality-gate-frontend-lint-befunde-beheb/261106-rcx-SUMMARY.md
nach Abschluss aller Tasks (Standard-GSD-Executor-Output).
</output>
