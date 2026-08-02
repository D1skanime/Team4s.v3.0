---
phase: 118
slug: rollenfortschritt-als-eigene-card-je-tats-chlich-ausge-bter-
status: draft
shadcn_initialized: false
preset: none
created: 2026-08-02
sources: 118-CONTEXT.md, 118-RESEARCH.md, Sketch 001 A, Sketch 002 A, existing Team4s UI system
---

# Phase 118 — UI Design Contract

> Verbindlicher visueller und interaktiver Vertrag für Rollenfortschritts-Cards und das globale Focal-Carousel im öffentlichen Memberprofil. D-01 bis D-23 sowie Sketch 001/002 Variante A sind gesperrte Entscheidungen.

## Design System

| Eigenschaft | Vertrag |
|---|---|
| Tool | Projektinternes Team4s-UI-System; kein shadcn, keine neue UI-/Carousel-Abhängigkeit |
| Komponenten | Bestehende `Card`, `Button`, `Badge` und globale `FocalCarousel`-Seam |
| Icons | `lucide-react`; `ChevronLeft`, `ChevronRight`, `Lock` |
| Font | `var(--font-sans)`: Inter, Segoe UI, system-ui, sans-serif |
| Styling | CSS Modules plus globale Tokens aus `globals.css`; keine lokalen Hexwerte außer bereits etablierten Artwork-/Rollenpaletten |
| Zuständigkeit | `FocalCarousel` besitzt Eingabe, Physik, Snap, Fokus, Zähler und Geometrie. `MemberBadgeChain` besitzt Rollenfilterung, Medailleninhalt, Fortschrittscopy, Card-Maße und Glow. |

`components.json` fehlt, aber ein produktives projektspezifisches Designsystem ist vorhanden. Eine shadcn-Initialisierung ist für diese Erweiterungsphase nicht zulässig, weil sie einen parallelen Designsystem-Pfad eröffnen würde.

## Visuelle Hierarchie und Rollen-Card

Jede tatsächlich ausgeübte Rolle mit mindestens einer öffentlich verdienten Rollen-Auszeichnung erzeugt genau eine Card. Andere Rollen werden nicht gerendert. Die Card-Reihenfolge folgt der bestehenden stabilen Rollenreihenfolge; sie darf nicht vom aktuellen Rang abhängen.

Card-Aufbau von oben nach unten:

1. Rollenlabel als Eyebrow, z. B. `Übersetzer`, 12 px/700, 1.2, 0.04 em Versalsperrung.
2. Große höchste erreichte Medaille, mittig, mit rollenspezifischem subtilen radialen Glow; keine dekorative Fremdgrafik.
3. Rang-Chip exakt `{Stufe} · {Schwelle}+`, z. B. `Gold · 320+`; beim Einstieg `Einstieg · 1+`.
4. Fortschrittsleiste und Statuscopy.
5. Fünferreihe in fester Reihenfolge `Einstieg`, `Bronze`, `Silber`, `Gold`, `Platin`.

Die Card nutzt `var(--surface-card)`, `var(--border-subtle)`/bestehende Card-Border, `var(--radius-lg)` und `var(--shadow-sm)`. Aktive Cards dürfen bis `var(--shadow-md)` plus rollenspezifischen Artwork-Glow erhalten. Keine Card bekommt eine vollflächige Rollenfarbe; Farbe dient nur Glow, Fortschrittsfüllung, Rang-Chip und Medaillenakzent.

### Maße

| Viewport | Rollen-Card/Fenster | große Medaille | Fünferreihe | vertikale Innenabstände |
|---|---|---|---|---|
| Desktop ≥1100 px | aktive Card `min(60%, 720px)`, sichtbare schmale Nachbarn beidseitig | 300–328 px | fünf gleiche Spalten, je Artwork 64–76 px | 24 oder 32 px |
| Tablet 521–1099 px | aktive Card 72–76%, zwei schmale Randkarten | 260–292 px | fünf gleiche Spalten, je 54–68 px | 24 px |
| Mobile ≤520 px | aktive Card 86–90%, kleiner Anschnitt der nächsten Card; am Start darf nur die nächste, am Ende nur die vorherige sichtbar sein | 240–260 px, Ziel 248 px | fünf gleiche Spalten ohne inneren Scroll, je 42–52 px | 16 px |

Erlaubte Abweichung: innerhalb der angegebenen Bereiche, sofern die Desktop-/Tablet-/Mobile-Wirkung aus D-08/D-13 erhalten bleibt. Die Card darf auf Mobile wachsen; Inhalt darf nicht abgeschnitten werden.

## Medaillensammlung

- Alle fünf echten Badge-Bilder bleiben immer gleichzeitig sichtbar. Keine Ersatzpunkte, Platzhalter oder horizontale Unter-Navigation.
- Erreichte Medaillen: volle Farbe und Deckkraft. Zukünftige Medaillen: `opacity: 0.38–0.48`, Sättigung `0–35%`, kleiner Lock-Indikator und Textzustand `Gesperrt` für Screenreader.
- Die aktuelle Medaille wird in der Reihe wiederholt und mit einem kompakten `Aktuell`-Chip markiert. Markierung darf die Reihe nicht verschieben.
- Jede Miniatur trägt sichtbares Stufenlabel. Die Fünferreihe ist semantisch eine Liste, aber rein informativ: keine Buttons, Links oder `tabIndex`-Werte.
- Die große Medaille besitzt einen beschreibenden Alttext wie `Goldmedaille für Übersetzer`; dekorative Layer wie Nebel, Rahmen oder Glow sind `aria-hidden` bzw. leere Alttexte.
- Der Einstiegszustand zeigt Einstieg groß, nur Einstieg farbig, Bronze bis Platin gesperrt.
- Platin zeigt alle fünf farbig, Platin groß und `Aktuell`; die Reihe bleibt vollständig erhalten.

## Fortschrittsvertrag

Fortschritt wird pro Rolle aus der exakten Netto-Anzahl bestätigter Mitwirkungen berechnet. Schwellen: Einstieg 1, Bronze 12, Silber 108, Gold 320, Platin 510. Bei exakt 12/108/320/510 wechselt die aktuelle Stufe und das nächste Ziel im selben Render. Bei Storno wird unmittelbar zurückgestuft; bei 0 verschwindet die gesamte Rollen-Card.

| Zustand | Leiste | sichtbare Copy |
|---|---|---|
| Zwischen Stufen | `count / nextThreshold * 100`, auf 0–100% geklemmt | `{count} von {nextThreshold} Mitwirkungen · Noch {remaining} bis {nextTier}` |
| Einstieg, Beispiel | 5/12 | `5 von 12 Mitwirkungen · Noch 7 bis Bronze` |
| Platin | 100% | `510 Mitwirkungen · Höchste Stufe erreicht` bzw. bei höherem Wert der echte Wert |

Die Leiste ist 8 px hoch, pillenförmig, mit ruhigem Rollenakzent. Sie besitzt `role="progressbar"`, `aria-valuemin="0"`, echten aktuellen Wert und nächstes Schwellenmaximum; im Platinzustand `aria-valuemax="510"` und auf 510 geklemmten `aria-valuenow`, während die sichtbare Copy den echten Wert nennt. Auf Mobile dürfen aktueller Stand und Restmenge in zwei Zeilen umbrechen; keine Ellipse oder Kürzung.

## Globaler Focal-Carousel-Vertrag

### Struktur und API-Grenze

- Eine fokussierbare Region pro Carousel (`tabIndex=0`, `role="region"`, `aria-roledescription="Karussell"`, eindeutiges `aria-label`).
- Optionaler generischer Zähler-Slot/Formatter in `FocalCarousel`; bei Rollen aktiv als `{position} von {total} Rollen`, bei bestehenden Verbrauchern standardmäßig aus.
- Generic Item-State ergänzt kontinuierliche Nähe/Progression als normalisierte Zahl 0–1 oder äquivalente CSS-Variable. Domainlabels und Card-Markup dürfen nicht in die globale Komponente wandern.
- Das bestehende Grid/„Alle anzeigen“ bleibt kompatibel, falls genutzt. Phase 118 zeigt Rollen primär im Carousel und führt keinen zweiten Rollen-Layoutmodus ein.

### Pointer, Touch und Klick

- Primärtaste oder Touch startet direkten Drag. Nach 4 px Bewegung wird Drag aktiv, Text-/Bildselektion verhindert und ein nachfolgender Klick genau einmal unterdrückt.
- Der Track folgt dem Pointer 1:1. Item-Skalierung und Opazität werden während der Bewegung aus der Distanz zur Trackmitte kontinuierlich interpoliert.
- Zielbereich: aktive Card `scale(1)`, entfernte Randkarte `scale(0.86–0.90)`; Opazität 1 zu 0.55–0.68; Sättigung 1 zu 0.70–0.82. Keine binäre Umschaltung während der Bewegung.
- Pointer-Capture, Animation und Listener werden bei Pointer-Cancel, neuem Input, Items-Änderung und Unmount sauber beendet.

### Momentum und Snap

- Geschwindigkeit aus mindestens den letzten 80–120 ms Eingabe sampeln. Ein schneller Release darf mehrere Cards projizieren, bleibt aber auf den Scrollbereich begrenzt.
- Zulässige Tuningrange: Projektion 180–320 ms, exponentielle Dämpfung 0.90–0.96 je 60-Hz-Frame, Snap 180–280 ms. Es gibt nur einen rAF-basierten Bewegungsbesitzer; keine konkurrierenden Timer-/native-smooth-scroll-Abschlüsse.
- Langsamer Drag rastet auf die geometrisch nächste Card ein. Neuer Pointer-, Wheel- oder Tastaturinput unterbricht laufende Bewegung sofort.
- Snapziele ausschließlich aus untransformierten Layoutmaßen berechnen: `offsetLeft + offsetWidth / 2 - clientWidth / 2`, geklemmt auf `0..scrollWidth-clientWidth`. `getBoundingClientRect().width` ist für Ziel- oder Spacer-Geometrie verboten.
- Symmetrische Endspacer richten sich nach der unskalierten Basisbreite. Erste und letzte Card müssen bei jedem Breakpoint vollständig zentrierbar sein.

### Mausrad/Trackpad

- Im Carousel wird der dominante Betrag aus `deltaX`/`deltaY` horizontal angewendet; ein nicht-passiver nativer Wheel-Listener erlaubt bedingtes `preventDefault()`.
- Wheel wird nur konsumiert, wenn in Delta-Richtung noch horizontale Bewegung möglich ist. Am Anfang bei negativem Delta und am Ende bei positivem Delta bleibt das Event ungebremst, damit die Seite vertikal weiterläuft.
- Kleine Trackpad-Deltas folgen direkt; Wheel-Serien teilen sich denselben Settle-/Momentum-Pfad und starten keine parallelen Animationen.

### Tastatur und Controls

- Das Carousel ist genau eine Tastaturstation. `ArrowLeft`/`ArrowRight` aktivieren und zentrieren exakt eine vorherige/nächste Card; Home/End dürfen zusätzlich erste/letzte Card zentrieren.
- Vor-/Zurück-Pfeile sind globale `Button`-Primitives, mindestens 44×44 px Touchziel, mit `Vorherige Rolle`/`Nächste Rolle`; am jeweiligen Ende `disabled`.
- Der Zähler steht optisch zwischen bzw. nahe den Pfeilen und wird bei Positionsänderung nicht als aufdringliche Live-Region angesagt. Die aktive Card trägt `aria-current="true"` und `Rolle N von M`.
- Medaillen, Rang-Chip, Leiste und Lock-Symbole erzeugen keine Tabstopps.

### Reduced Motion

Bei `prefers-reduced-motion: reduce` gelten: keine Momentum-Projektion über mehrere Cards, keine kontinuierliche Scale-/Glow-Animation, keine langen Transitions. Direkte Bewegung bleibt nutzbar; Release/Pfeil/Taste rastet in höchstens 80–120 ms oder sofort auf die nächste Card. Inhalt, Zähler, Endpunktzentrierung und Tastaturverhalten bleiben identisch.

## Spacing Scale

| Token | Wert | Nutzung |
|---|---:|---|
| `--space-1` | 4 px | Lock-/Text-Mikroabstand |
| `--space-2` | 8 px | Chip- und Fortschrittsabstand |
| `--space-3` | 16 px | Mobile-Card-Padding und kompakte Card-Gruppen |
| `--space-4` | 24 px | Desktop-/Tablet-Card-Padding, Abschnittsabstand |
| `--space-5` | 32 px | große Card-Gruppen |
| `--space-6` | 48 px | größere Profilabschnitte |
| `--space-7` | 64 px | Seitenabschnitt |

Der Carousel-Gap beträgt 16 px; die Medaillenreihe nutzt 8 px Gap. Alle Abstände, Gaps und Paddings dieser Phase verwenden ausschließlich 4, 8, 16, 24, 32, 48 oder 64 px. Die 44 px bleiben ausschließlich als Mindestmaß für Control-/Touchziele zulässig und sind kein Spacingwert.

## Typography

Genau vier Größen und zwei Gewichte: 400 und 700. Bestehende 800er Werte in der betroffenen Rollen-UI werden auf 700 vereinheitlicht.

| Rolle | Größe | Gewicht | Zeilenhöhe |
|---|---:|---:|---:|
| Detail/Chip | 12 px | 700 | 1.2 |
| Body/Fortschritt | 14 px | 400 oder 700 | 1.5 |
| Rollenüberschrift | 20 px | 700 | 1.2 |
| Abschnittstitel | 28 px | 700 | 1.2 |

## Color

| Anteil | Token | Nutzung |
|---|---|---|
| Dominant 60% | `--surface-canvas` / `--surface-card-muted` | Profilhintergrund, Trackfreiraum |
| Secondary 30% | `--surface-card`, `--border-subtle`, `--text-body`, `--text-soft` | Cards, Reihen, Labels, gesperrte Zustände |
| Accent 10% | bestehende `--role-accent-*`, `--color-primary` | ausschließlich aktive Rollen-Glow, Fortschrittsfüllung, aktueller Rang-Chip, Fokusrahmen |
| Destructive | nicht verwendet | Phase enthält keine destruktive Aktion |

Farbe allein kennzeichnet keinen Zustand: `Aktuell`, Lock-Symbol/`Gesperrt`, Text und Opazität ergänzen sie. Textkontrast mindestens WCAG AA; informative Texte 4.5:1, große Artwork-Schrift 3:1.

## Copywriting Contract

| Element | verbindliche Copy |
|---|---|
| Abschnitt | `Rollenfortschritt` |
| Zähler | `{position} von {total} Rollen` |
| aktueller Rang | `{Stufe} · {Schwelle}+` |
| aktuelle Miniatur | `Aktuell` |
| nächste Stufe | `{count} von {threshold} Mitwirkungen · Noch {remaining} bis {Stufe}` |
| höchste Stufe | `{count} Mitwirkungen · Höchste Stufe erreicht` |
| Pfeile | `Vorherige Rolle`, `Nächste Rolle` |
| Leerer Zustand | keiner innerhalb der Rollenfläche; bei null Rollen wird der gesamte Abschnitt nicht gerendert |
| Ladezustand | bestehender profilseitiger Ladezustand; kein Card-Skeleton in dieser Phase |
| Fehlerzustand | `Rollenfortschritt konnte nicht geladen werden.` mit Aktion `Erneut versuchen`; nutzt den bestehenden profilseitig begrenzten `ErrorState`-/Retry-Seam und führt keinen parallelen Fehlerzustand ein. Keine fachlich falsche Null-/Lock-Card als Fallback |
| CTA/destruktiv | keine; Anzeige ist read-only |

Alle sichtbaren deutschen Texte verwenden korrekte Umlaute.

## Responsive und Überlauf

- Breakpoints: Mobile ≤520 px, Tablet 521–1099 px, Desktop ≥1100 px, passend zur bestehenden Carousel-CSS.
- Die Fünferreihe besitzt `grid-template-columns: repeat(5, minmax(0, 1fr))`, `min-width: 0` und keinen eigenen `overflow-x`.
- Card-Inhalt und Fortschrittscopy dürfen vertikal wachsen. Labels bleiben vollständig lesbar; bei langen Rollenlabels ist Umbruch vor Verkleinerung unter 12 px zu bevorzugen.
- Pfeile dürfen auf Mobile kompakt am Rand stehen, müssen aber 44×44 px bleiben und dürfen den sichtbaren Card-Anschnitt nicht verdecken.
- Bei genau einer Rolle wird sie zentriert, Pfeile sind deaktiviert/visuell zurückgenommen und der Zähler lautet `1 von 1 Rolle` (Singular).

## Zustandsmatrix

| Datenzustand | Sichtbare Ausgabe |
|---|---|
| 0 bestätigte Mitwirkungen | keine Card; bei keiner anderen Rolle kein Rollenabschnitt |
| 1–11 | Einstieg groß/aktuell; Bronze nächstes Ziel; vier Stufen gesperrt |
| 12 / 108 / 320 | neue Stufe sofort groß/aktuell; nächsthöhere Schwelle ist Fortschrittsmaximum |
| 510+ | Platin groß/aktuell; alle fünf farbig; volle Leiste und Höchststufen-Copy |
| Storno unter Schwelle | im selben Datenrefresh niedrigere große Medaille, neu gesperrte Stufen und neues Ziel |
| mehrere Rollen | unabhängige Cards und Werte im gemeinsamen Carousel; keine Gesamtleiste |
| fehlendes Artwork | bestehender rollenbezogener Fallback, gleiche Abmessung; kein gebrochenes Bild |

## Visual Verification Matrix

| Viewport/Modus | Datenfixture | Muss geprüft werden |
|---|---|---|
| 1440×900 Desktop | 3+ Rollen, mittlere Card aktiv | aktive Card + zwei deutliche Nachbarn; 300–328 px Hero; fünf Medaillen; Zähler; kein Clipping |
| 1024×768 Tablet | 3+ Rollen | schmalere Randkarten beidseitig; Pfeile erreichbar; Fortschritt ein-/zweizeilig ohne Überlagerung |
| 390×844 Mobile | 2+ Rollen | 240–260 px Hero; fast volle Card + kleiner Folgeanschnitt; fünf Medaillen ohne inneren Scroll |
| alle drei | erste und letzte Card | beide exakt vollständig zentriert; keine transformierte Breite in Snap-Geometrie |
| Desktop Trackpad/Maus | 4+ Rollen | kontinuierliche Interpolation, vertikales Wheel im Track, Seiten-Scroll an Enden |
| Touch | 4+ Rollen | direkter Drag, schneller Mehrkarten-Schwung, weiches nächstes Snap, kein versehentlicher Klick |
| Keyboard | 3+ Rollen | genau ein Carousel-Tabstopp; Pfeiltasten zentrieren; keine fünf Medaillen-Tabstopps |
| Reduced Motion | 3+ Rollen | kein langer Schwung/Scaling; kurzer oder sofortiger Snap; gleicher Inhalt |
| Schwellen | 0,1,11,12,107,108,319,320,509,510 | korrekte Sichtbarkeit, Rang-, Rest- und Höchststufencopy |

## Live In-App Browser UAT

Die Abnahme erfolgt über die für Nutzer sichtbare Profilnavigation im Codex-internen Browser auf `http://127.0.0.1:3300`, anschließend auf der real erreichten Route `/members/{slug}`; eine versteckte Direkt-URL allein genügt nicht.

1. Ein öffentliches Profil mit mehreren Rollen über die sichtbare App-Navigation öffnen und bestätigen, dass `Rollenfortschritt` auffindbar ist.
2. Desktop, Tablet und Mobile aus der Matrix prüfen; Screenshots der aktiven mittleren Card sowie beider Endpunkte festhalten.
3. Pointer-Drag, Touch-Swipe, Trackpad, vertikales Mausrad, Pfeilbuttons und Tastatur einzeln prüfen.
4. Langsame Bewegung auf stufenlose Größen-/Opazitätsänderung und schneller Drag auf kontrollierten Mehrkarten-Schwung prüfen.
5. Am ersten/letzten Element gegen die Seite weiterscrollen; das Carousel darf die Seite nicht festhalten.
6. Reduced Motion im Browser/OS aktivieren und kurze ruhige Einrastung ohne Momentum bestätigen.
7. Mit Fixtures für Einstieg, exakte Schwellen, Platin, Rückstufung und null Mitwirkungen die Zustandsmatrix prüfen.
8. Bestehenden `FansubProjectsGrid` als zweiten `FocalCarousel`-Verbraucher live/regressiv prüfen.

Headless-/Komponententests unterstützen diese Abnahme, ersetzen aber nicht den geteilten In-App-Browser-Flow.

## Registry Safety

| Registry | Blocks | Safety Gate |
|---|---|---|
| shadcn official | keine | nicht anwendbar; shadcn nicht initialisiert |
| Drittanbieter | keine | keine Registry-Nutzung zulässig |

## Nicht-Ziele und Inventargrenze

- Keine neuen Schwellen, Datenquellen, Endpunkte, Tabellen oder historische Ranghaltung.
- Keine lokale Carousel-Logik in `MemberBadgeChain` oder neue Bibliothek.
- Vor Implementierung werden `FocalCarousel`, `MemberBadgeChain`, `FansubProjectsGrid` sowie lokale `scroll-snap`/`scrollIntoView`-Vorkommen inventarisiert.
- `AnimeRelations` bleibt dokumentierter späterer Migrationskandidat; Abschnittsnavigation, DatePicker, Scroll-Restoration, Crop-/Reorder-Drag werden bewusst nicht migriert.
- Bestehende nicht-Rollen-Auszeichnungen werden visuell nicht neu gestaltet.

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
