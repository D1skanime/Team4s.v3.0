---
quick_task: 260718-vei
phase: quick-260718-vei
plan: 01
type: execute
wave: 1
depends_on: []
status: planned
autonomous: true
scope: Responsive Releasebereich der öffentlichen Fansub-Projektseite
canonical_routes:
  - /anime/[id]/group/[groupId]
  - /fansubs/[slug]/fansubprojekt/[animeSlug]
requirements:
  - LR-01
  - LR-02
  - LR-03
  - LR-04
  - LR-05
  - LR-06
  - LR-07
  - LR-08
  - LR-09
  - LR-10
files_modified:
  - frontend/src/components/fansubs/PublicReleaseBlock.tsx
  - frontend/src/components/fansubs/PublicReleaseBlock.module.css
  - frontend/src/components/fansubs/__tests__/PublicReleaseBlock.test.tsx
  - frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.test.tsx
  - frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.tsx
  - frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.rows.tsx
  - frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.module.css
  - frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.test.tsx
  - .planning/quick/260718-vei-responsive-releasebereich-der-ffentliche/260718-vei-SUMMARY.md
must_haves:
  truths:
    - Besucher erkennen zuerst das neueste Release und danach den Bereich "Alle Releases".
    - Das Featured-Release bleibt auf allen Viewports eine Card mit einem normalen 16:9-Inhaltsbild, lesbarer Metadatenhierarchie und direkt erreichbaren Aktionen.
    - Auf Mobile sind Folge, Titel, Version, Statistiken, Release-CTA und Kara-Aktionen ohne horizontale Enge oder verdeckte Texte nutzbar.
    - Jede Listenzeile zeigt "Ansicht" direkt; Kara-Zahl und Disclosure werden ohne redundanten Ein-Aktions-Dropdown zusammengeführt.
    - Tablet-Portrait verwendet eine Spalte, Tablet-Landscape eine kontrollierte Bild-/Inhaltsteilung und Desktop eine dichte, nicht bilddominierte Darstellung.
  artifacts:
    - path: frontend/src/components/fansubs/PublicReleaseBlock.tsx
      provides: Featured-Release-Hierarchie, CTA-Reihenfolge und Kara-Links
    - path: frontend/src/components/fansubs/PublicReleaseBlock.module.css
      provides: container-responsive Featured-Card, Bildverhältnis und Preview-Regeln
    - path: frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.rows.tsx
      provides: direkte Listenaktionen und kombinierte Kara-Disclosure
    - path: frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.module.css
      provides: kompakte Mobile-/Desktop-Zeilen
    - path: frontend/src/components/fansubs/__tests__/PublicReleaseBlock.test.tsx
      provides: fokussierte Featured-Release-Regressionen
    - path: frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.test.tsx
      provides: fokussierte Listen-/Kara-Regressionen
  key_links:
    - from: frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.tsx
      to: frontend/src/components/fansubs/PublicReleaseBlock.tsx
      via: unveränderte PublicReleaseBlock-Seam für latestRelease
      pattern: PublicReleaseBlock.*latestRelease
    - from: frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.tsx
      to: frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.rows.tsx
      via: bestehende DesktopReleaseRow/MobileDirectReleaseRow/MobileKaraReleaseRow-Zweige
      pattern: DesktopReleaseRow|MobileDirectReleaseRow|MobileKaraReleaseRow
    - from: frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.rows.tsx
      to: frontend/src/lib/fansubProjectRoutes.ts
      via: bestehender buildFansubReleaseHref für Ansicht und Kara-Deep-Links
      pattern: buildFansubReleaseHref
---

# Quick Task 260718-vei: Responsiver Releasebereich der öffentlichen Fansub-Projektseite

## Ziel

Der vorhandene Releasebereich wird innerhalb seiner etablierten Seams visuell und responsiv gehärtet: `PublicReleaseBlock` bleibt die Featured-Release-Komponente, `OlderReleasesList` bleibt die inkrementelle Release-Liste. Mobile, Tablet und Desktop erhalten eine klare Abschnittshierarchie, lesbare Metadaten, kompakte Zeilen, saubere Bildvorschauen und eindeutige Kara-/Release-Aktionen. Es gibt keine Änderung an API-Verträgen, Datenabfragen, Authentifizierung, Rechten oder Release-/Medien-Ownership.

## Gelockte Anforderungen

- **LR-01:** Das Releasebild bleibt ein Inhaltsbild innerhalb der Card und wird kein Banner.
- **LR-02:** Der erste generische Header samt technischer Beschreibung wird durch eine nutzerorientierte Neueste-Release-Hierarchie ersetzt; der zweite Header heißt exakt „Alle Releases“.
- **LR-03:** Mobile Featured-Card: Bild, Eyebrow/Folge/Version, vollbreiter Episodentitel, lesbare Statistiken, vertikale Kara-Aktionen, vollbreiter Release-CTA vor längeren Team-Auszügen und kompakte Team-Vorschauen.
- **LR-04:** Mobile Liste: „Ansicht“ bleibt direkt sichtbar, Zeilen bleiben kompakt, Kara-Zahl und Disclosure-Text werden soweit möglich zusammengeführt; kein Ein-Aktions-Dropdown.
- **LR-05:** Tablet-Portrait bleibt bis zu etwa 900 px Containerbreite einspaltig; Tablet-Landscape nutzt eine kontrollierte ungefähr 40/60-Aufteilung.
- **LR-06:** Desktop nutzt ein weniger dominantes Inhaltsbild mit festem Seitenverhältnis und einen dichteren Body; kein gestrecktes nahezu quadratisches Bild.
- **LR-07:** Preview-Thumbnails tragen höchstens kurze Kategorie-/Badge-Information, nie lange Beschreibungen; zu kleine Previews werden auf Tablet/Mobile ausgeblendet oder vereinfacht.
- **LR-08:** Bestehende globale `Button`-, `Card`-, `Badge`-, `SectionHeader`- und `Accordion`-Primitives sowie die `PublicReleaseBlock`-Seam bleiben erhalten.
- **LR-09:** Kara-Segmente wirken anklickbar und behalten ihre vorhandenen Hrefs/Rechtepfade; keine neue Auth-, Token- oder Permission-Logik.
- **LR-10:** Korrekte deutsche Umlaute, fokussierte Komponententests, Typecheck/Lint soweit ausführbar, `git diff --check` und Live-UAT bei 390, 768, 1024 und 1440 px.

## Read First

- `.planning/STATE.md`
- `AGENTS.md`
- `docs/engineering/implementation-contract.md`
- `docs/frontend/ui-system.md`
- `docs/agent-guidelines-ui.md`
- `frontend/src/components/fansubs/PublicReleaseBlock.tsx`
- `frontend/src/components/fansubs/PublicReleaseBlock.module.css`
- `frontend/src/components/fansubs/__tests__/PublicReleaseBlock.test.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.test.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.helpers.ts`
- `frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.rows.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.module.css`
- `frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.test.tsx`
- `frontend/src/components/ui/Button.tsx`
- `frontend/src/components/ui/Accordion.tsx`
- `frontend/src/components/ui/SectionHeader.tsx`

## Plan

### Task 1 — Featured-Release-Hierarchie und responsives Card-Layout umsetzen

**Dateien:**

- `frontend/src/components/fansubs/PublicReleaseBlock.tsx`
- `frontend/src/components/fansubs/PublicReleaseBlock.module.css`
- `frontend/src/components/fansubs/__tests__/PublicReleaseBlock.test.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.test.tsx`

**Umsetzung:**

1. In `PublicReleaseBlock` die nutzerorientierte Abschnittshierarchie gemäß **LR-02** herstellen: Standardtitel auf „Neuestes Release“ setzen und die technische Standardbeschreibung entfernen, sodass `SectionHeader` keine interne Funktionsbeschreibung mehr ausgibt. `FeaturedRelease` behält darunter `releaseEyebrow`, `releaseTitle`, `releaseVersionLine` und `releaseContextLine`; die vorhandenen `PublicReleasePreview`-Felder und die `PublicReleaseBlock`-Props bleiben unverändert.
2. In `FeaturedRelease` die Mobile-Lesereihenfolge gemäß **LR-03** strukturell absichern: `featuredImageFrame`, Eyebrow/Folge/Version/Episodentitel, `ReleaseStats`, `Timeline`, danach der vorhandene `Button` „Vollständiges Release ansehen“, erst anschließend `previewGrid`, `noteGrid` und `contributorRow`. Dem CTA eine lokale Klasse `featuredCta` geben; keine zweite Button-Implementierung anlegen. Lange `noteExcerpt`-Inhalte in kompakten Ansichten per Line-Clamp begrenzen, ohne den vollständigen Text oder die Datenform zu verändern.
3. `Timeline` gemäß **LR-09** mit einem sichtbaren `Play`-Hinweis für die vertikalen Mobile-Segmentaktionen ergänzen. Der vorhandene `<a href={segment.href}>`, seine Segmentfarbe, das Aria-Label und der Rechtepfad bleiben unverändert; der neue Icon-Selektor wird auf Desktop ausgeblendet und nur in der vertikalen Komposition sichtbar. Keine Session-, Login-, Token- oder Permission-Abfrage hinzufügen.
4. In `PublicReleaseBlock.module.css` gemäß **LR-01**, **LR-05** und **LR-06** das Bild als normales 16:9-Inhaltsbild behandeln: `featuredImageFrame` erhält ein festes `aspect-ratio: 16 / 9`, `min-height: 0` und `align-self: start`; `featuredImage` bleibt `object-fit: cover`. Die breite `featuredGrid`-Aufteilung bleibt kontrolliert ungefähr 40/60. Bei `@container (max-width: 900px)` wird `featuredGrid` einspaltig; damit ist Tablet-Portrait nicht in die enge Zweispaltenansicht gezwungen. Keine absolute Bannerpositionierung und keine Hero-Ausdehnung über die Card einführen.
5. Im vorhandenen kompakten Container-Block die Titelhierarchie lesbar umbauen: `releaseTitle` (Folgenlabel) und `releaseContextLine` (Episodentitel) spannen jeweils die volle Zeile, `releaseVersionLine` bleibt als klar zugeordnete Versionsmetadaten lesbar, `releaseStatRow` darf mit deutlichen Abständen umbrechen, mobile Trenner werden ausgeblendet und `featuredCta` nimmt die volle Breite ein. Die explizite `layout="mobile"`-Variante muss dieselben Regeln erhalten, ohne eine zweite CSS-Komposition zu duplizieren.
6. Preview-Regeln gemäß **LR-07** konsolidieren: `previewGrid` bleibt ab 900 px Container-/Viewportbreite abwärts ausgeblendet; `previewLabel` ist ein einzeiliges, ellipsiertes Badge. Keine Notizbeschreibung, kein Autoren-Auszug und kein frei fließender Langtext darf auf `previewTile`/`previewImage` positioniert werden.
7. `PublicReleaseBlock.test.tsx` fokussiert erweitern: „Neuestes Release“ ist der Abschnittsheader, die technische Altbeschreibung fehlt, der Release-CTA steht im DOM vor dem Notiz-Auszug, Kara-Links behalten ihre Hrefs und die CSS-Quelle enthält 16:9-Inhaltsbild, einspaltige 900-px-Regel, ausgeblendete kleine Previews sowie den vollbreiten Mobile-CTA. `ReleasesSection.test.tsx` auf die neue Headerhierarchie aktualisieren und weiterhin Featured-Release plus bestehende „Alle Releases ansehen“-Seitenaktion beweisen.

**Automatisierte Verifikation:**

- `cd frontend && npx vitest run "src/components/fansubs/__tests__/PublicReleaseBlock.test.tsx" "src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.test.tsx"`

**Akzeptanz:**

- Die Featured-Card erfüllt **LR-01**, **LR-02**, **LR-03**, **LR-05**, **LR-06**, **LR-07**, **LR-08** und **LR-09** ohne Prop-, DTO- oder API-Änderung.
- Das Bild ist bei 1024/1440 px sichtbar ein 16:9-Inhaltsbild innerhalb der Card; bei 768 px ist die Card einspaltig.
- Bei 390 px stehen Release-CTA und Kara-Aktionen vollbreit beziehungsweise vertikal vor den kompakten Team-Auszügen.
- Die fokussierten Tests sind grün.

### Task 2 — „Alle Releases“ und kompakte direkte Listenaktionen schärfen

**Dateien:**

- `frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.rows.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.module.css`
- `frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.test.tsx`

**Umsetzung:**

1. In `OlderReleasesList` den `SectionHeader`-Titel exakt auf „Alle Releases“ ändern (**LR-02**). Cursor-Laden, Sortierung, Loading-/Error-State, `INITIAL_LIMIT`, `PAGE_LIMIT` und die abschließende globale Aktion „Weitere Releases laden“ bleiben unverändert.
2. In `OlderReleasesList.rows.tsx` die mobile Kara-Redundanz gemäß **LR-04** entfernen: `MobileReleaseHeader` rendert keinen separaten Kara-`Badge` mehr; `MobileKaraReleaseRow` formuliert den `Accordion`-Titel aus der realen Segmentzahl als „1 Kara anzeigen“ beziehungsweise „N Karas anzeigen“. Der `Button` „Ansicht“ bleibt unmittelbar vor dem Accordion, immer sichtbar und mit `styles.mobileDirectAction` vollbreit. `MobileDirectReleaseRow` bleibt eine direkte Zeile ohne Accordion oder Ein-Aktions-Menü.
3. Die vorhandenen Kara-Segmentlinks in `KaraGroup` mit `Play`, Segmenttitel, optionaler Version und `ChevronRight` beibehalten (**LR-09**). Sie bleiben echte Links aus `buildKaraHref(detailHref, segment.id)`; keine neue Dropdown-Komponente, kein nativer Ersatzbutton und keine Rechteprüfung im Frontend ergänzen.
4. `OlderReleasesList.module.css` gemäß **LR-03** und **LR-04** verdichten: Mobile-Zeilen erhalten kompakte, konsistente Innenabstände; `rowTitleLine` lässt den Episodentitel in einer eigenen vollbreiten Zeile lesen; Metadaten und Counts umbrechen ohne horizontales Scrollen; `mobileDirectAction` bleibt volle Breite. Accordion-Inhalt und `segmentPill` bleiben klare Touch-Ziele mit vorhandenem Fokus-Ring. Desktop-`row`/`rowHeader` bleiben dicht und der Timeline-Zweig bleibt erhalten.
5. `OlderReleasesList.test.tsx` an die kombinierten Disclosure-Namen anpassen und fokussiert beweisen: „Alle Releases“ erscheint; eine Kara-Zeile zeigt „Ansicht“ vor jedem Klick und genau „N Karas anzeigen“ ohne separaten „N Karas“-Badge; eine Zeile ohne Kara zeigt „Ansicht“ und kein Accordion; nach dem Öffnen behalten die Kara-Links den erwarteten Deep-Link; der Desktop-Zweig zeigt weiterhin direkte Timeline-Segmente und kein Mobile-Accordion.

**Automatisierte Verifikation:**

- `cd frontend && npx vitest run "src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.test.tsx"`

**Akzeptanz:**

- Die Liste erfüllt **LR-02**, **LR-04**, **LR-08** und **LR-09** ohne Änderung an API-Client, Cursorvertrag oder Routing-Helfer.
- Bei 390/768 px ist jede „Ansicht“-Aktion direkt sichtbar und keine Zeile verwendet ein Ein-Aktions-Dropdown.
- Kara-Anzahl und Disclosure sind in einem verständlichen Text kombiniert; Segmentlinks bleiben unverändert funktionsfähig.
- Die fokussierten Tests sind grün.

### Task 3 — Gesamtchecks, Diff-Review und Live-Responsive-UAT abschließen

**Dateien:**

- `.planning/quick/260718-vei-responsive-releasebereich-der-ffentliche/260718-vei-SUMMARY.md` (neu, durch Executor)

**Umsetzung:**

1. Beide fokussierten Testgruppen gemeinsam ausführen, danach `npm run typecheck`, `npm run lint` und `git diff --check`. Falls Typecheck oder Lint an einem nachweislich vorbestehenden, nicht berührten Fehler scheitert, den vollständigen Befehl und den fremden Fehler in der Summary dokumentieren; Fehler in den geänderten Dateien werden behoben.
2. Den Diff gegen **LR-01** bis **LR-10** selbst prüfen: ausschließlich die gelisteten UI-/Testdateien und die Summary ändern; keine API-, DTO-, Backend-, Migration-, Auth-, Permission- oder Media-Ownership-Datei; keine neue globale Primitive, Rohfarbenwelt, ad-hoc Navigation oder Parallel-Seam; alle sichtbaren deutschen Texte mit korrekten Umlauten.
3. Das Frontend im bestehenden Projekt-Setup starten beziehungsweise den vorhandenen Dev-Container neu laden. Im Codex-In-App-Browser über den sichtbaren Projekteinstieg `http://127.0.0.1:3000/fansubs/c-subs/fansubprojekt/vipers-creed` in den Releasebereich navigieren; falls dieser Seed nicht vorhanden ist, den vorhandenen sichtbaren Fansub-Projektlink verwenden und die tatsächlich getestete URL protokollieren. Die UAT muss live erfolgen und darf nicht allein durch Headless-/Komponententests ersetzt werden.
4. Exakt diese Viewports prüfen und Screens/Ergebnisse in der Summary festhalten:
   - **390 px:** Bild innerhalb der Card; Eyebrow/Folge/Version und vollbreiter Episodentitel; lesbare Counts; vertikale anklickbare Karas; vollbreiter „Vollständiges Release ansehen“-CTA vor Notizen/Fansubber-Vorschau; kleine Preview-Tiles nicht sichtbar; „Ansicht“ in jeder Listenzeile direkt sichtbar; kein horizontales Scrollen.
   - **768 px:** Featured-Card einspaltig; keine gequetschte Bild-/Text-Teilung; kleine Preview-Tiles ausgeblendet; direkte Listenaktionen und Kara-Disclosure vollständig lesbar.
   - **1024 px:** kontrollierte ungefähr 40/60-Featured-Aufteilung, 16:9-Inhaltsbild ohne Streckung, dichter Body, Liste und Kara-Timeline ohne Überlagerung.
   - **1440 px:** Bild bleibt gegenüber dem Inhalt zurückhaltend und 16:9; Abschnittshierarchie „Neuestes Release“ → „Alle Releases“ ist eindeutig; Metadaten, Preview-Badges und Aktionen bleiben kompakt und ausgerichtet.
5. In mindestens einer Release-Zeile „Ansicht“, einen Kara-Link und den Featured-CTA anklicken beziehungsweise deren Ziel im Browser prüfen. Bestätigen, dass die bestehenden Zielrouten/Rechteantworten erhalten bleiben und kein neuer Login-/Auth-Zweig sichtbar wurde. UAT-Abweichungen innerhalb dieses Scopes vor Abschluss korrigieren und die vier Viewports erneut prüfen.

**Automatisierte Verifikation:**

- `cd frontend && npx vitest run "src/components/fansubs/__tests__/PublicReleaseBlock.test.tsx" "src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.test.tsx" "src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.test.tsx"`
- `cd frontend && npm run typecheck`
- `cd frontend && npm run lint`
- `git diff --check`

**Akzeptanz:**

- **LR-10** ist vollständig ausgeführt: fokussierte Tests, Typecheck/Lint soweit lokal ausführbar, `git diff --check` und echte Browser-UAT bei 390/768/1024/1440 px.
- Alle vier Viewports sind live bestanden; andernfalls bleibt der Quick Task offen und die konkrete Abweichung steht in der Summary.
- Die Summary listet geänderte Abschnitte, Dateien, Befehle, UAT-Ergebnisse, verbleibende Risiken und ausschließlich fremde vorbestehende Probleme separat auf.

## Threat Model

### Trust Boundaries

| Boundary | Beschreibung |
|---|---|
| Public-Release-Daten → React-UI | Titel, Labels, Auszüge, Bild-URLs und Segment-Hrefs stammen aus vorhandenen öffentlichen DTOs und werden im Browser dargestellt. |
| Öffentliche UI-Aktion → bestehende Release-/Kara-Route | „Ansicht“, Featured-CTA und Kara-Links wechseln auf bereits vorhandene, serverseitig kontrollierte Routen. |

### STRIDE Threat Register

| Threat ID | Kategorie | Komponente | Disposition | Mitigation im Plan |
|---|---|---|---|---|
| T-VEI-01 | Tampering / Information Disclosure | `PublicReleaseBlock.tsx`, `OlderReleasesList.rows.tsx` | mitigate | Bestehende typisierte Werte normal durch React rendern; kein `dangerouslySetInnerHTML`, kein clientseitig erfundener Zielpfad und keine zusätzlichen DTO-Felder. |
| T-VEI-02 | Elevation of Privilege | Kara-/Release-Aktionen | mitigate | Vorhandene `segment.href`, `buildFansubReleaseHref` und `buildKaraHref` unverändert verwenden; keine Auth-/Permission-Logik in diese visuelle Aufgabe ziehen; Live-UAT prüft die bestehenden Rechteantworten. |
| T-VEI-03 | Denial of Service / Layout Degradation | lange Titel, Badge-Labels und Notiz-Auszüge | mitigate | Wrapping, Ellipsis und Line-Clamp begrenzen Layout-Überlauf; vier feste Viewports werden auf horizontales Scrollen und Textüberlagerungen geprüft. |

## Multi-Source Coverage Audit

| SOURCE | ID | Feature/Requirement | Task | Status | Notes |
|---|---|---|---|---|---|
| GOAL | — | Responsiver öffentlicher Releasebereich auf Mobile, Tablet und Desktop | 1-3 | COVERED | Featured-Card, Liste, Tests und Live-UAT bilden den vollständigen Quick-Scope ab. |
| REQ | — | Keine ROADMAP-Requirement-IDs; Quick Task nutzt die freigegebenen Review-Anforderungen LR-01 bis LR-10 | — | N/A | Kein fehlendes Roadmap-Requirement im Quick-Kontext. |
| RESEARCH | — | Kein Research-Artefakt; Research-Phase ist für diesen Quick Task ausgeschlossen | — | N/A | Bestehende Code-/UI-Seams sind direkt verifiziert. |
| CONTEXT | LR-01 | Bild bleibt Inhaltsbild, kein Banner | 1, 3 | COVERED | 16:9 innerhalb `featuredCard`, Live-UAT. |
| CONTEXT | LR-02 | Nutzerorientierte Headerhierarchie, „Alle Releases“ | 1, 2, 3 | COVERED | Komponenten- und Browserprüfung. |
| CONTEXT | LR-03 | Mobile Featured-Reihenfolge und kompakte Vorschauen | 1, 2, 3 | COVERED | JSX-Reihenfolge, CSS und 390-px-UAT. |
| CONTEXT | LR-04 | Direkte Mobile-Ansicht und kombinierte Kara-Disclosure | 2, 3 | COVERED | Strukturtests und 390/768-px-UAT. |
| CONTEXT | LR-05 | Einspaltiges Tablet-Portrait, kontrolliertes Landscape | 1, 3 | COVERED | 900-px-Containerregel und 768/1024-px-UAT. |
| CONTEXT | LR-06 | Weniger dominantes Desktop-Inhaltsbild | 1, 3 | COVERED | 16:9/40-60-Regel und 1024/1440-px-UAT. |
| CONTEXT | LR-07 | Keine Langtexte auf Thumbnails; kleine Previews ausblenden | 1, 3 | COVERED | Badge-only-Markup, Ellipsis, 900-px-Ausblendung. |
| CONTEXT | LR-08 | Globale Primitives und PublicReleaseBlock-Seam erhalten | 1-3 | COVERED | Diff-Gate verbietet Parallel-Seams. |
| CONTEXT | LR-09 | Kara-Aktionen und bestehende Rechtepfade erhalten | 1-3 | COVERED | Href-Tests, Threat Model und Klick-UAT. |
| CONTEXT | LR-10 | Umlaute, Checks und vier Live-Viewports | 1-3 | COVERED | Fokussierte Tests plus Abschluss-Task. |

## Nicht Teil dieses Quick Tasks

- Keine Änderung an Backend, API-Verträgen, DTOs, Cursor-Abfragen, Sortierung, Authentifizierung, Tokens, Permissions oder Release-/Medien-Ownership.
- Keine neue globale UI-Komponente, kein neues Dropdown und keine parallele Release-/Kara-Seam.
- Kein Redesign der öffentlichen Release-Detailseite oder anderer Fansub-Projektsektionen.
- Kein Umbau der vorhandenen inkrementellen Ladefunktion oder der Pretty-Route.

## Output

Nach Abschluss `.planning/quick/260718-vei-responsive-releasebereich-der-ffentliche/260718-vei-SUMMARY.md` erstellen.
