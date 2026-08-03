---
phase: 119
slug: sammlungskarten-f-r-fortschritt-punkte-beitr-ge-mitgliedscha
status: approved
shadcn_initialized: false
preset: none
created: 2026-08-03
reviewed_at: 2026-08-03
sources: 119-CONTEXT.md, 118-UI-SPEC.md, existing Team4s UI system
---

# Phase 119 — UI Design Contract

> Verbindlicher Vertrag für die übrigen Auszeichnungskategorien im öffentlichen Memberprofil. D-01 bis D-16 sind gesperrt; Phase 118 ist die visuelle und interaktive Referenz.

## Design System

| Eigenschaft | Vertrag |
|---|---|
| Tool | Projektinternes Team4s-UI-System; kein shadcn, keine neue Badge-/Carousel-Abhängigkeit |
| Preset | nicht anwendbar |
| Komponenten | Bestehende `Card`, `Button`, `Badge`, `SectionHeader`, `FocalCarousel` |
| Icons | `lucide-react`: `ChevronLeft`, `ChevronRight`, `Lock` |
| Font | `var(--font-sans)`: Inter, Segoe UI, system-ui, sans-serif |
| Styling | CSS Modules und globale Tokens; vorhandene Badge-Paletten |
| Ownership | `FocalCarousel` besitzt Scroll, Drag, Snap, Fokus, Pfeile, Zähler und Raster. `MemberBadgeChain` besitzt Familien, Hero, Auswahl und Fortschritt. `memberBadgeLabels.ts` bleibt kanonisch für Präsentation und Schwellen. |

`components.json` fehlt, aber das produktive Team4s-System ist vorhanden. shadcn wird nicht initialisiert, da dies einen parallelen Designpfad eröffnen würde.

## Informationsarchitektur

Kategorien erscheinen exakt: `Rollen`, `Fortschritt`, `Punkte-Meilensteine`, `Beiträge`, `Mitgliedschaft`, `Besondere Auszeichnungen`.

| Kategorie | Sammlungskarten |
|---|---|
| Fortschritt | eine Familie: Erste Mitwirkung, 10, 25, 50 Anime-Projekte |
| Punkte-Meilensteine | eine erweiterbare Familie aller Punktestufen |
| Beiträge | drei Familien: Mitgetragene Projekte, Chronikpflege, Bildarchivpflege; je Bronze/Silber/Gold |
| Mitgliedschaft | eine Familie: Gründungsmitglied, 5, 7, 10 Jahre |
| Besondere Auszeichnungen | eine einstufige Karte je erhaltener Ehrung |

Jeder Badge-Code gehört genau einer Familie. Neue Stufen werden nach Schwelle einsortiert; kein Badge erscheint kategorienübergreifend doppelt. `Gründungsmitglied` ist Startstufe der Mitgliedschaft, keine zusätzliche Ehrung.

## Sammlungskarte und Zustände

Eine Familie ist die große Karte, nicht eine Medaille. Aufbau: Familien-Eyebrow, großes Hauptmotiv, Rang/Stufe, bei laufenden Serien Fortschrittsleiste und Zielcopy, horizontale Leiste aller Stufen.

Initial zeigt das Hero die höchste erreichte Stufe. Ist nichts erreicht, erscheint die erste entsättigt und gesperrt als Ziel. Alle erreichten Stufen bleiben farbig; nur die höchste trägt `Aktuell`. Erreichte Miniaturen sind Buttons: Klick, Enter oder Leertaste zeigt die Stufe groß und markiert sie `Ausgewählt`; der echte Rang bleibt `Aktuell`. Auswahl ändert weder URL noch Daten und wird bei Familienwechsel/Datenrefresh zurückgesetzt. Zukünftige Stufen sind entsättigt, tragen Schloss/`Gesperrt` und sind keine Tabstopps.

Besondere Ehrungen sind abgeschlossene einstufige Karten ohne Schloss, Leiste oder Ziel. Nicht erhaltene Ehrungen werden nie gezeigt; ohne Ehrung fehlt der gesamte Bereich. Artworks kommen aus dem Katalog; fehlende Bilder nutzen den bestehenden Icon-Fallback bei stabiler Geometrie.

## Fortschrittsvertrag

- 8-px-Leiste mit exaktem Wert, nächster Schwelle und Restmenge.
- `current / nextThreshold * 100`, auf 0–100 % geklemmt; kein zurückgesetzter Teilfortschritt.
- Exakte Schwelle aktualisiert Hero, `Aktuell` und Ziel im selben Render.
- Abgeschlossen: 100 % und `Höchste Stufe erreicht`.
- Einheit: Anime-Projekte, Punkte, Beiträge oder Jahre Mitgliedschaft; korrekter Singular.
- `role="progressbar"` mit echten ARIA-Werten; sichtbare Copy nennt den ungekürzten Wert.

## Carousel und Inline-Raster

- Jede Kategorie verwendet ausschließlich `FocalCarousel`; keine lokale Scroll-/Snap-/Indexlogik.
- Mehrere Familien: Phase-118-Carousel mit physischer Zentrierung, Drag/Touch, Wheel, Tastatur, Endpunkten und Reduced Motion.
- Genau eine Familie: zentrierte Einzelkarte ohne Pfeile, Punkte oder `1 von 1`-Zähler.
- Zähler: `{position} von {total} Sammlungen`.
- `Alle Auszeichnungen in {Kategorie} anzeigen` öffnet das bestehende Inline-Raster im Abschnitt, nie Modal/Drawer.
- Raster bleiben unabhängig offen. Jeder Toggle hat eigenes `aria-expanded`/`aria-controls`; `Weniger anzeigen` schließt nur sein Raster und erhält Fokus-Rückgabe.
- Raster zeigt Badges in Familienreihenfolge, keine duplizierten Sammlungskarten.

## Responsive Vertrag

| Viewport | Karte | Hero | Stufenleiste |
|---|---|---|---|
| Desktop ≥1100 px | `min(60%, 720px)`; Einzelkarte max. 720 px | 280–328 px | vollständig oder intern scrollbar |
| Tablet 521–1099 px | 72–76 %; Einzelkarte max. 680 px | 240–280 px | intern scrollbar |
| Mobile ≤520 px | 86–90 %; Einzelkarte volle Breite | 204–248 px | einzeilig horizontal scrollbar |

Lange Stufenleisten nutzen `overflow-x:auto` und `scroll-snap-type:x proximity`. Beim Mount, Familien- und Schwellenwechsel wird `Aktuell` nur innerhalb der Stufenleiste zentriert (`inline:center, block:nearest`); Reduced Motion ohne Smooth. Touchziele mindestens 44×44 px. Profilbreite bleibt 1480 px; keine 920-px-Kappung, kein Seiten-Overflow. Copy darf umbrechen, nie ellipsieren.

## Spacing Scale

| Token | Wert | Nutzung |
|---|---:|---|
| `--space-1` | 4 px | Status-Mikroabstand |
| `--space-2` | 8 px | Stufen, Chip, Progress |
| `--space-3` | 16 px | Mobile-Padding, Carousel-Gap |
| `--space-4` | 24 px | Card-/Familienabstand |
| `--space-5` | 32 px | Desktop-Card-Padding |
| `--space-6` | 48 px | Kategorieabstand |
| `--space-7` | 64 px | große Profilabschnitte |

Nur 4, 8, 16, 24, 32, 48, 64 px. Ausnahme: 44 px Mindest-Touchziel.

## Typography

Genau vier Größen und zwei Gewichte (400, 700); keine neuen 800er Werte.

| Rolle | Größe | Gewicht | Zeilenhöhe |
|---|---:|---:|---:|
| Detail/Chip/Eyebrow | 12 px | 700 | 1.2 |
| Body/Fortschritt | 14 px | 400/700 | 1.5 |
| Familienüberschrift | 20 px | 700 | 1.2 |
| Kategorie-/Abschnittstitel | 28 px | 700 | 1.2 |

## Color

| Anteil | Token | Nutzung |
|---|---|---|
| Dominant 60 % | `--surface-canvas`, `--surface-card-muted` | Hintergrund, Freiraum, Tracks |
| Secondary 30 % | `--surface-card`, `--border-subtle`, Texttokens | Karten, Labels, gesperrte Stufen |
| Accent 10 % | Badge-Palette, `--color-primary` | ausschließlich Hero-Glow, Progress, `Aktuell`/`Ausgewählt`, Fokus |
| Destructive | nicht verwendet | keine destruktive Aktion |

Keine vollflächig bunte Familienkarte. Farbe ist nie alleiniger Zustandsträger. Textkontrast mindestens WCAG AA.

## Copywriting Contract

| Element | Copy |
|---|---|
| Status | `Aktuell`, `Ausgewählt`, `Gesperrt` |
| laufend | `{Wert} von {Ziel} {Einheit} · Noch {Rest} bis {Stufe}` |
| abgeschlossen | `{Wert} {Einheit} · Höchste Stufe erreicht` |
| Zähler/Pfeile | `{position} von {total} Sammlungen`; `Vorherige Sammlung`; `Nächste Sammlung` |
| Raster | `Alle Auszeichnungen in {Kategorie} anzeigen`; `Weniger anzeigen` |
| Empty | leere Kategorien werden vollständig ausgeblendet |
| Error | `Auszeichnungen konnten nicht geladen werden.` + `Erneut versuchen` |
| Primary CTA | keine; read-only |
| Destruktiv | keine |

Alle deutschen UI-Texte verwenden korrekte Umlaute.

## Accessibility und Bewegung

Erreichte Stufenbuttons heißen z. B. `Silber auswählen` und nutzen ausgewählt `aria-pressed="true"`. `Aktuell`/`Ausgewählt` sind sichtbar und im Accessible Name. Locks sind dekorativ, wenn `Gesperrt` im Namen steht. Hero hat beschreibenden Alttext; Glow/Rahmen sind `aria-hidden`. Fokus bleibt bei Auswahl auf der Miniatur. Reduced Motion deaktiviert Scale-/Glow-Transitions, Momentum und Smooth-Auto-Scroll, nicht Funktion oder Inhalt.

## Zustands- und Verifikationsmatrix

| Zustand/Modus | Muss sichtbar sein |
|---|---|
| nichts erreicht | erste Stufe groß, entsättigt/gesperrt; Ziel zum Einstieg |
| Stufen erreicht | höchste groß/`Aktuell`; alle erreichten farbig |
| ältere Stufe gewählt | Hero/`Ausgewählt`; echter Rang bleibt `Aktuell` |
| höchste Stufe | volle Leiste und Abschlusscopy |
| 0/1/mehrere Ehrungen | Bereich fehlt / Einzelkarte / Carousel; nie Fortschritt |
| 1440×900 | Reihenfolge, Nachbarkarten, 1480-px-Shell, kein Overflow |
| 1024×768 | lange Punkteserie; nur interne Stufen-Scrollspur |
| 390×844 | 86–90-%-Karte, 204–248-px-Hero, 44-px-Buttons, kein Clipping |
| zwei Raster offen | unabhängig offen; Badge je Kategorie genau einmal |
| Keyboard/Reduced Motion | Navigation, Fokus-Rückgabe, keine lange Bewegung |

## Live In-App Browser UAT

Über sichtbare Navigation auf `http://127.0.0.1:3300` zum echten `/members/{slug}` gehen. Desktop/Tablet/Mobile prüfen; durch alle drei Beitragsfamilien inklusive Endpunkte navigieren; ältere Stufe per Pointer/Tastatur wählen; lange mobile Stufenleiste und Auto-Zentrierung prüfen; zwei Raster parallel öffnen; Profile mit 0/1/mehreren Ehrungen prüfen; Reduced Motion wiederholen. Rollenbereich und `FansubProjectsGrid` regressiv prüfen. Headless-Tests ersetzen diesen Flow nicht.

## Registry Safety

| Registry | Blocks | Safety Gate |
|---|---|---|
| shadcn official | keine | nicht anwendbar; nicht initialisiert |
| Drittanbieter | keine | keine Registry-Nutzung zulässig |

## Nicht-Ziele

Keine neuen Badges, Schwellen, Punkte, Buchungs-, Freischalt-, Persistenz- oder API-Regeln. Kein API-Fan-out. Keine lokale Carousel-Implementierung. Keine Karte je Medaille außer erhaltenen einstufigen Ehrungen. Keine nicht erhaltenen Ehrungen oder Badge-Duplikate. Kein Redesign außerhalb der Auszeichnungssektion. Bestehende `MemberBadgeChain`, CSS, `FocalCarousel` und `memberBadgeLabels.ts` werden erweitert; keine parallele Badge-Chain.

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
