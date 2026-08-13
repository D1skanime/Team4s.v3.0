# Phase 121: Rollen-Badges visuell und funktional perfektionieren - Context

**Gathered:** 2026-08-10
**Status:** Ready for planning
**Source:** PRD Express Path (`121-PRD.md`)

<domain>
## Phase Boundary

Phase 121 perfektioniert ausschließlich die Rollen-Badge-Sektion des öffentlichen Memberprofils. Das bestehende Rollen-`FocalCarousel`, die fachliche Credit-/Ranglogik und die zentrale Artwork-Auflösung bleiben erhalten. Die aktive Rollenkarte erhält eine stärkere Hero-Hierarchie, exakte Fortschrittsinformation und einen kompakten semantischen Fünf-Stufen-Rank-Track. Backend, API, Datenbank, Rollenmodell, Schwellenwerte und alle anderen Badge-/Profilsektionen bleiben außerhalb des Scopes.

</domain>

<decisions>
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase source and inherited contracts
- `.planning/phases/121-rollen-badges-visuell-und-funktional-perfektionieren/121-PRD.md` — Vollständige Nutzer-Spezifikation, Scope, Akzeptanzkriterien und Abschlussbericht.
- `.planning/phases/118-rollenfortschritt-als-eigene-card-je-tats-chlich-ausge-bter-/118-CONTEXT.md` — Fachliche Rollenfortschritts- und Carousel-Entscheidungen.
- `.planning/phases/118-rollenfortschritt-als-eigene-card-je-tats-chlich-ausge-bter-/118-UI-SPEC.md` — Bestehender Rollen-Card-/Carousel-Designvertrag.
- `.planning/phases/119-sammlungskarten-f-r-fortschritt-punkte-beitr-ge-mitgliedscha/119-CONTEXT.md` — Sammlungskarten- und Badge-Familienverträge.
- `.planning/phases/120-ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo/120-CONTEXT.md` — Geerbte öffentliche Profilkomposition, Performance- und Overlap-Regeln.

### Implementation contracts
- `AGENTS.md` — Kanonische Umgebung, Wiederverwendung, UI-, Test- und Dirty-Tree-Regeln.
- `docs/engineering/implementation-contract.md` — Existing-seam-first und Anti-Duplizierungsvertrag.
- `docs/frontend/ui-system.md` — Globale UI-Komponenten und semantische Controls.
- `docs/agent-guidelines-ui.md` — Lokale responsive und visuelle UI-Leitlinien.

### Primary implementation analogs
- `frontend/src/components/profile/MemberBadgeChain.tsx` — Bestehender Rollen-/Badge-Consumer und Artwork-Auflösung.
- `frontend/src/components/profile/MemberBadgeChain.module.css` — Bestehende Rollen-Card-, Track- und responsive Styles.
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` — Rollen-, Artwork-, Progress- und Carousel-Verträge.
- `frontend/src/components/profile/memberBadgeLabels.ts` — Kanonische Rollen-/Badge-Labels und Schwellenpräsentation.
- `frontend/src/components/profile/memberBadgeLabels.test.ts` — Label-, Resolver- und Schwellentests.
- `frontend/src/components/ui/FocalCarousel.tsx` — Bestehende generische Carousel-Engine; Änderung nur bei belegter Notwendigkeit.
- `frontend/src/components/ui/FocalCarousel.test.tsx` — Shared-Interaktions- und Accessibility-Regressionen.
- `frontend/src/components/ui/ResponsiveImage.tsx` — Bestehende responsive Artwork-Seam.

</canonical_refs>

<specifics>
## Specific Ideas

- Zielbild: große aktive Rollenkarte mit Rollenname, dominantem aktuellem Badge, Rang, echtem Count, kompaktem Fünf-Stufen-Track und verständlicher Restangabe.
- Beispiel Gold: `Gold`, `356 Mitwirkungen`, `Noch 154 Mitwirkungen bis Platin`, Track mit Gold als „Aktuell“.
- Beispiel Platin: `Platin`, `687 Mitwirkungen`, `Höchste Stufe erreicht`.
- Nachbarn bleiben als Carousel-Orientierung sichtbar, enthalten aber weniger konkurrierende Information.
- Mobile darf Stufenlabels sinnvoll komprimieren, ohne semantische Namen für assistive Technologien zu verlieren.

</specifics>

<deferred>
## Deferred Ideas

- Umbau weiterer Badge-Sektionen oder Entwicklung eines universellen Achievement-Frameworks.
- Neue Badge-Familien oder Aliasaggregation für `fansub_lead`, `techadmin` oder `gfxler`.
- Backend-, API-, Datenbank-, Credit- oder Schwellenänderungen.
- Asset-Migration und generischer Carousel-Neuentwurf.

</deferred>

---

*Phase: 121-rollen-badges-visuell-und-funktional-perfektionieren*
*Context gathered: 2026-08-10 via PRD Express Path*
