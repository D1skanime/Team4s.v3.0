# Phase 121: Rollen-Badges visuell und funktional perfektionieren - Research

**Researched:** 2026-08-10
**Domain:** Responsive Rollen-Badge-Präsentation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

## Implementation Decisions

### Fachliche Wahrheit
- **D-01:** Credit-Zählung, `release_role_credit_lifecycles`, Backend, API, Datenbank, Badge-Codes, Rollen-Schwellen und earned/locked-Logik bleiben unverändert.
- **D-02:** Die feste Rangfolge und Schwellen bleiben `Einstieg=1`, `Bronze=12`, `Silber=108`, `Gold=320`, `Platin=510`; der echte Credit-Count bleibt auch oberhalb 510 sichtbar.
- **D-03:** Phase 121 unterstützt exakt die 11 bestehenden Rollen-Badge-Familien. `fansub_lead`, `techadmin` und `gfxler` werden weder ergänzt noch per Alias auf andere Familien aggregiert.

### Carousel und Komponentenverantwortung
- **D-04:** Das bestehende Rollen-`FocalCarousel` bleibt erhalten, einschließlich Prev/Next, direkter Nachbarwahl, Swipe/Drag, Keyboard, Home/End, Reduced Motion, stabiler aktiver Karte, bestehender 210-ms-Nachbaranimation und „Alle anzeigen“, sofern vorhanden.
- **D-05:** Die generische Carousel-Engine wird nicht neu entworfen. Badge-spezifische Darstellung und Logik bleiben in `frontend/src/components/profile`; Shared-Dateien werden nur geändert, wenn ein belegter Consumer-Fix nicht ausreicht.
- **D-06:** Vor neuer Komponente, Hook oder Hilfslogik werden vorhandene lokale und globale Äquivalente gesucht und erweitert. Eine lokale `RoleRankTrack`-Verantwortung ist zulässig, ein generisches Achievement-Framework nicht.

### Rollenkarte und visuelle Hierarchie
- **D-07:** Die Rollenkarte besteht logisch aus Rollenidentität, stabilem Hero-Artwork-Slot, Fortschrittsblock und Rank-Track. Rollenname, Rang und Mitwirkungszahl bleiben getrennt und unmittelbar verständlich; technische Badge-Codes werden nicht prominent gezeigt.
- **D-08:** Das aktuelle Rollenbadge ist der visuelle Mittelpunkt, nutzt `object-fit: contain`, springt bei Rangwechseln nicht im Layout und verwendet weiterhin die bestehende Artwork-Auflösung.
- **D-09:** Inaktive Nachbarrollen bleiben sichtbar und direkt auswählbar, konkurrieren aber durch reduzierte Typografie, Artwork-Größe, Details oder Opazität weniger mit der aktiven Karte. Keine remount-verursachende komplett andere DOM-Struktur für aktiv/inaktiv.
- **D-10:** Die Expanded-/„Alle anzeigen“-Ansicht bleibt funktionsfähig und darf kompakter als die aktive Carousel-Karte sein, ohne sämtliche Hero-Details duplizieren zu müssen.

### Fortschritt und Rank-Track
- **D-11:** Der Fortschrittsblock zeigt aktuellen Rang, echten Count, nächste Stufe und Restwert; bei Platin wird „Höchste Stufe erreicht“ ohne erfundenes Ziel angezeigt.
- **D-12:** Der Rank-Track zeigt genau fünf geordnete Stationen: Einstieg, Bronze, Silber, Gold, Platin. Jede Station ist semantisch `erreicht`, `aktuell` oder `gesperrt`; der aktuelle Rang wird nicht nur über Farbe, sondern zusätzlich über Marker/Ring, „Aktuell“ und `aria-current` oder gleichwertige Semantik ausgezeichnet.
- **D-13:** Der Rank-Track ist primär informativ und führt keine zweite Carousel-/Scroll-Engine, Wheel-Navigation, Momentumlogik, Settle-Timer oder unnötige Mess-/Observer-Logik ein. Gesperrte Stufen erhalten keine neue Produktinteraktion.
- **D-14:** Eine Progressbar darf nur bestehen bleiben, wenn sie zusätzliche, fachlich korrekte Information zur aktuellen Strecke vermittelt. Bei Platin ist sie vollständig; der reale Count bleibt sichtbar. Bestehende Segmentlogik wird nicht unnötig verändert.

### Responsive Komposition
- **D-15:** Desktop nutzt die verfügbare Profilbreite bis ungefähr 1360/1480 px durch bessere Proportionen, Rhythmus und Hierarchie; die aktive Karte darf nicht wie eine schmale Mobile-Karte wirken, Nachbarn bleiben weniger dominant sichtbar.
- **D-16:** Mobile nutzt denselben Daten- und Komponentenbaum, funktioniert ohne Seitenoverflow bei 390 px, zeigt vollständig sichtbares Artwork, einen lesbaren kompakten Track und ausreichend große Touch-Ziele; keine separate Mobile-Domainlogik oder zweite Rollenkomponente.
- **D-17:** Tablet wird bewusst bei 768 und 1024 px ausgelegt. Container Queries sind erlaubt, wenn die tatsächliche Carousel-Item-Breite relevanter als der Viewport ist.

### Artwork und Sonderfälle
- **D-18:** Die vorhandene Motiv-plus-Rank-Frame-Auflösung sowie `role_entry_<role>.png` bleiben für alle fünf Ränge erhalten. Der bekannte Timing-Sonderfall mit vollständigen `role_volume_timer_{bronze,silver,gold,platinum}.png` darf im Hero nicht regressieren.
- **D-19:** Der neue Rank-Track soll nicht von vollständigen Timing-Mini-Artworks abhängen; keine Asset-Migration wird erzwungen und bestehende uncommittete Assets werden nicht überschrieben.

### Accessibility, Performance und Qualität
- **D-20:** Carousel und Rank-Track bleiben per Tastatur und Screenreader verständlich; Fokuszustände sind sichtbar, Zustände werden nicht rein farblich unterschieden, Reduced Motion bleibt wirksam und eine rein informative Track-Darstellung erzeugt keine künstlichen Buttons.
- **D-21:** Die Umsetzung bleibt CSS-basiert und zustandsarm: keine neuen Scroll-/Wheel-Listener, Animation Queues, Timer, unnötigen ResizeObserver oder DOM-Messungen.
- **D-22:** Deutsche UI-Texte verwenden korrekte Umlaute. Lade-, Fehler- und responsive Zustände folgen dem bestehenden UI-System und den Projektregeln.

### Tests und Abnahme
- **D-23:** Automatisierte Verträge decken alle 11 Rollenfamilien, Ausschluss fremder Rollen, Unterstrich-Rollencodes, alle fünf Schwellen, Track-Reihenfolge/-Zustände, echten Count/Nächstes Ziel/Platin, alle Artwork-Ränge einschließlich Timing sowie Carousel-Regressionen ab.
- **D-24:** Shared-Regression umfasst die bestehenden `FocalCarousel`-Tests und `FansubProjectsGrid`. Responsive UAT deckt 390, 768, 1024 und 1440 px ab.
- **D-25:** Live-UAT prüft mindestens Übersetzung, Timing, Encoding, Typesetting, Projektleitung und Administration auf Hero-Größe, Track-Lesbarkeit, Nachbarwirkung, aktive Dominanz, Kartenhöhe, Umbrüche, transparente Asset-Ränder, Overflow und Layoutsprünge.
- **D-26:** Der Abschlussbericht folgt der in `121-PRD.md` festgelegten 14-teiligen Markdown-Struktur und beantwortet ausdrücklich die fünf dort genannten Qualitätsfragen.

### Scope-Ausschlüsse
- **D-27:** Anime-Projekte, Punkte, Beiträge, Mitgliedschaft, Special-Badge-Grid, Profil-Editor, History-Event-Badges, Backend, API, Datenbank, Rollenmodell, Credit-Lifecycle und Schwellenwerte werden nicht geändert. Außerhalb des Scopes gefundene Probleme werden nur dokumentiert.
- **D-28:** Der vorhandene schmutzige Arbeitsbaum wird respektiert: vor Ausführung Diff prüfen, nichts zurücksetzen, keine fremden uncommitteten Assets überschreiben und ausschließlich auf dem aktuellen Stand aufbauen.

### the agent's Discretion
- Exakte interne Aufteilung von `MemberBadgeChain` und einer optionalen lokalen `RoleRankTrack`-Komponente.
- Präzise CSS-Werte, Breakpoints oder Container-Query-Grenzen innerhalb der gelockten 390/768/1024/1440-Verträge.
- Ob eine bestehende Progressbar nach belegter Informationsprüfung erhalten, vereinfacht oder entfernt wird.
- Ob bereits verdiente frühere Track-Stufen rein informativ bleiben oder mit bereits vorhandener Vorschausemantik ohne Zusatzkomplexität auswählbar sind.


## Deferred Ideas

- Umbau weiterer Badge-Sektionen oder Entwicklung eines universellen Achievement-Frameworks.
- Neue Badge-Familien oder Aliasaggregation für `fansub_lead`, `techadmin` oder `gfxler`.
- Backend-, API-, Datenbank-, Credit- oder Schwellenänderungen.
- Asset-Migration und generischer Carousel-Neuentwurf.

</user_constraints>

## Summary

Phase 121 ist ein schmaler Consumer-Umbau: `MemberBadgeChain` besitzt Rollenfilterung, echten Count, f?nf Stufen, Artwork-Resolver, Fortschrittsberechnung und `FocalCarousel`. Backend, DTOs, Datenbank, Pakete und neue Carousel-Engine sind unn?tig. [VERIFIED: MemberBadgeChain.tsx; memberBadgeLabels.ts]

Der Mini-Artwork-Strip `.roleProgression` sollte durch einen informativen F?nf-Stationen-Track ersetzt werden, abgeleitet aus `row.items`, `currentIndex` und kanonischen Schwellen, aber ohne Bilder, Buttons, Listener, Timer, Observer oder Messung. Der Hero-Resolver bleibt unver?ndert; das sch?tzt Timing. [VERIFIED: Code; D-12/D-13/D-18/D-19]

`FocalCarousel.renderItem(item,state)` liefert bereits `active` und `expanded`. Diese Seam soll Nachbardichte und Expanded-Darstellung steuern, ohne lokalen Index oder anderen DOM-Baum. Der uncommittete Shared-Diff mit direkter Nachbarwahl, stabilem Aktivziel, 210-ms-Nachbaranimation und transformbasierter Dominanz ist Baseline. [VERIFIED: git diff]

**Primary recommendation:** Drei Slices: Track-Daten/rote Tests; responsive Consumer-Komposition; Shared-Regression und Live-UAT bei 390/768/1024/1440 px. [VERIFIED: D-23?D-25]

## Architectural Responsibility Map

| Capability | Tier | Rationale |
|---|---|---|
| Rollenfilter/Rang/Fortschritt | Browser/Client | `MemberBadgeChain` pr?sentiert ?ffentliche Daten. [VERIFIED: Code] |
| Count/earned Wahrheit | API/Backend | Bleibt unver?ndert; Frontend konsumiert `current_count`. [VERIFIED: D-01] |
| Navigation/Fokus/Expanded/Motion | globale Browser-UI | Geh?rt `FocalCarousel`. [VERIFIED: Code] |
| Hero/Track | Profil-Domain | Rollenlogik bleibt in `components/profile`. [VERIFIED: D-05] |

## Project Constraints (from AGENTS.md)

- Nur `/home/d1sk/team4s` via SSH; Status, Diffs und Compose vor ?nderungen pr?fen. [VERIFIED: AGENTS.md]
- Fremde ?nderungen/Assets nie zur?cksetzen oder ?berschreiben. [VERIFIED: AGENTS.md; git status]
- Existing-seam-first; keine parallele Carousel-, Badge-, Resolver- oder Bildlogik. [VERIFIED: implementation-contract.md]
- Globale UI fachlogikfrei; Rollenlogik in `components/profile`. [VERIFIED: ui-system.md]
- Echte deutsche Umlaute, kleine Diffs, keine breite Formatierung. [VERIFIED: AGENTS.md]
- Live-UAT ?ber sichtbare Memberroute; Tests, Typecheck, Lint, Build wenn machbar und `git diff --check`. [VERIFIED: AGENTS.md]

## Standard Stack

React/TypeScript, CSS Modules/Tokens, das projektinterne `FocalCarousel`, `ResponsiveImage` und Vitest/Testing Library sind vollst?ndig ausreichend; keine Installation. Shared bleibt zun?chst read-only. [VERIFIED: repo; D-05]

## Existing Seams to Reuse

| Seam | Vertrag | Folge |
|---|---|---|
| `resolveRoleProgressPresentation` | Rang, Ziel, Rest, echter Count, geklemmte ARIA-Werte. [VERIFIED: tests] | Keine zweite Rangrechnung. |
| `ROLE_VOLUME_TIER_THRESHOLDS` | 12/108/320/510. [VERIFIED] | Nie duplizieren. |
| `resolveBadgeArtwork` | Entry, Rollen, direkte Timing-Dateien. [VERIFIED] | Hero unver?ndert. |
| `resolveLayeredRoleArtwork` | 11 Familien, Motiv+Frame. [VERIFIED] | Nicht neu mappen. |
| `renderItem(row,state)` | active/expanded/Position. [VERIFIED] | Kein lokaler Index. |
| Expanded Mode | gleiche Items, Fokus-R?ckgabe. [VERIFIED] | Kompakte CSS-Variante. |
| feste Slots | 320/280/248 px, Dominanz via Scale. [VERIFIED: CSS/Diff] | Keine Gr??enanimation. |

## Supported Roles and Artwork

Exakt: `translator`, `timer`, `encoder`, `typesetter`, `quality_checker`, `project_lead`, `editor`, `raw_provider`, `designer`, `admin`, `other`. F?r alle existieren Entry, Motiv und vier Frames; Unterstrichcodes werden suffixbasiert geparst. [VERIFIED: Assets; Tests]

Timing nutzt f?r Bronze?Platin im Hero direkte `role_volume_timer_{tier}.png`, obwohl Motiv/Frames existieren; der alte Mini-Strip bevorzugt `frameSrc`. Ein bildfreier Track entkoppelt dies ohne Migration. [VERIFIED: Resolver/Assets]

`fansub_lead`, `techadmin`, `gfxler` bleiben ausgeschlossen; allgemeine Rollenoptionen autorisieren keine Aliase. [VERIFIED: D-03]

## Architecture Patterns

```text
PublicMemberBadge[] -> MemberBadgeChain
 -> Resolver + positiver earned Count + 11er-Whitelist
 -> f?nf Stufen -> FocalCarousel(active/expanded)
 -> gleiche Role Card: unver?nderter Hero + Rang/Count/Ziel + CSS-Track
```

[VERIFIED: Code]

- **Eine Stage-Quelle:** Name, Threshold, reached/current/locked aus Katalog, `currentIndex` und Resolver. Lokale `RoleRankTrack` darf nur pr?sentieren. [VERIFIED: D-06]
- **Gleicher DOM-Baum:** active/expanded als Attribute/Klassen; keine anderen Keys, Ersatzmarkups oder eigene Indexlogik. [VERIFIED: D-09/D-10]
- **Semantische Liste:** f?nf listitems; aktuell mit `aria-current="step"` oder gleichwertig, Ring/Marker und sichtbarem `Aktuell`; gesperrt explizit, ohne Buttons/Tabstops. [VERIFIED: D-12/D-20]
- **Stabile Geometrie:** Hero fest, contain, Dominanz via Transform/Filter; keine rangabh?ngige Kartenh?he. [VERIFIED: D-08]

## Don't Hand-Roll

Keine neue Schwellentabelle, Rollenmap, Active-Index-Seam, Expanded-Ansicht, Track-Messlogik oder Image-Seam. Bestehende Resolver, `renderItem`-State, Expanded Mode, CSS/Container Queries und `ResponsiveImage` verwenden. [VERIFIED: D-05/D-06/D-13/D-21]

## Common Pitfalls

1. Timing regressiert: Track bildfrei, Hero unver?ndert, direkte Timing-Sources testen. [VERIFIED: D-18]
2. Aktuell nur per Farbe: ARIA, sichtbares Label, st?rkerer Marker. [VERIFIED: D-12/D-20]
3. Nachbarn remounten: gleicher Baum plus State-Klassen w?hrend 210 ms. [VERIFIED: D-09]
4. Expanded zeigt elf volle Heroes: `expanded` f?r kompakte Variante. [VERIFIED: D-10]
5. Falsche Progress-Skala: Gesamtwert bis n?chste Gesamtschwelle, nicht Segmentfortschritt. [VERIFIED: Phase 118 D-02]
6. Dirty-Tree-Konflikt: Shared-Dateien und Timing-/Contribution-Assets sind uncommittet. [VERIFIED: git status]
7. 390-px-Overflow: kein Trackscroll; kurze Stufennamen, kompakte Schwellen, Container Query. [VERIFIED: D-16/D-17]

## Current Dirty-Tree Baseline

Uncommittet ge?ndert: `MemberBadgeChain.module.css/.test.tsx`, `FocalCarousel.tsx/.module.css/.test.tsx`, Contribution-Artworks und vier Timing-Artworks. Shared nutzt sofortiges Aktivziel, 210-ms-rAF nur bei Nachbarn, direkte Nachbarwahl, Reduced-Motion-Sofortnavigation und 88%-Mobile-Peek. Planer m?ssen diese Dateien in `read_first` nennen und gegen den aktuellen Arbeitsbaum planen. [VERIFIED: git status/diff; D-28]

## Planning Slices

### 121-01 ? Pr?sentationsvertrag und rote Tests
- 11 Familien; Ausschluss fansub_lead/techadmin/gfxler/foreign; Unterstrichcodes; 1/12/108/320/510/>510. [VERIFIED: D-23]
- F?nf Stationen, Reihenfolge, reached/current/locked, ARIA, keine Tabstops. [VERIFIED: D-12/D-20]

### 121-02 ? Rollenkarte und responsive Komposition
- Mini-Artwork-Strip durch Track ersetzen; `renderItem`-State f?r active/inactive/expanded; Shared read-only. [VERIFIED: D-05]
- Hero, ResponsiveImage, Slots, Count/Progress bewahren; CSS/Container Queries f?r vier Viewports. [VERIFIED: D-08/D-15?D-18]

### 121-03 ? Regression und Live-UAT
- Labels-, Chain-, FocalCarousel-, FansubProjectsGrid-Tests; Typecheck, Lint, Build wenn machbar, diff-check. [VERIFIED: D-24; AGENTS.md]
- Live sechs vorgeschriebene Rollen, vier Viewports, Expanded, Reduced Motion; PRD-Abschlussbericht. [VERIFIED: D-25/D-26]

## Validation Architecture

**Focused:** `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/memberBadgeLabels.test.ts src/components/profile/MemberBadgeChain.test.tsx src/components/ui/FocalCarousel.test.tsx src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx` [VERIFIED: paths]

**Wave 0 gaps:** Fixture aller 11 Rollen; Ausschl?sse; Track-A11y/No-Tabstop; Artwork-R?nge/Timing-Sources; Expanded/Fokus-R?ckgabe; Live-UAT-Checkliste und Screenshots. [VERIFIED: D-03/D-10/D-20/D-23?D-25]

## Environment Availability

Canonical Repo und alle Compose-Services einschlie?lich healthy PostgreSQL sind verf?gbar; Browser-Tunnel ist als `127.0.0.1:3300` dokumentiert. [VERIFIED: SSH; compose ps; AGENTS.md]

## Security Domain

Keine Auth/Session/Crypto-?nderung. Access-Control-relevant ist earned-only: niemals Rollen aus vollem Katalog offenlegen. Count wird >=0 und ARIA/Progress auf Maximalschwelle geklemmt. CSS-only Track vermeidet Listener-Jank; Single-Source-Thresholds verhindern Fachdrift. [VERIFIED: Scope/Code]

## Assumptions Log

| # | Claim | Risk |
|---|---|---|
| A1 | Reduzierte Nachbardetails bleiben screenreaderverst?ndlich. | A11y-Test/UAT. |
| A2 | Stufennamen+Schwellen passen bei 390 px. | Geometrie anpassen. |
| A3 | Progressbar hat neben Track Zusatznutzen. | Nach UAT vereinfachen. |

## Open Questions

1. Progressbar zun?chst unver?ndert gekoppelt behalten; nach UAT entfernen, wenn redundant. [ASSUMED]
2. Fr?here Stufen informativ lassen; Vorschau w?rde neue Zust?nde/Timing-Fragen erzeugen. [VERIFIED: Code] [ASSUMED]
3. Shared nur bei reproduziertem Consumer-unl?sbarem Defekt ?ndern. [VERIFIED: D-05]

## Sources

### Primary (HIGH)
121 PRD/CONTEXT; Phase 118/119/120 CONTEXT, UI-SPEC, RESEARCH, Pl?ne/Summaries; relevante Source/CSS/Tests; AGENTS und Projektdocs; git status/diff, Assets und Compose. [VERIFIED: direkte Inspektion]

### Secondary (MEDIUM)
Keine externen Quellen n?tig; Phase ist codebase-/entscheidungsgebunden. [VERIFIED: Scope]

## Metadata

Stack/Architektur/Resolver/Dirty-Tree/A11y: HIGH; exakte visuelle Dichte: MEDIUM bis Live-UAT. [VERIFIED] [ASSUMED]

**Research date:** 2026-08-10  
**Valid until:** 2026-08-17 wegen bewegter uncommittierter Badge-/Carousel-Baseline. [VERIFIED] [ASSUMED]

