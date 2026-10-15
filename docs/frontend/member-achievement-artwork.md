# Mitglieder-Erfolgsbadge-Grafiken

Phase 151 konsolidiert die Präsentationsschicht. Die Rollen-Berechtigung bleibt im kanonischen
Rollenkatalog; Badge-Erzeugung, Deduplizierung und Schwellenwerte bleiben im Backend-Badge- und
Repository-Code aus Phase 150. Dieses Dokument definiert keine fachlichen Schwellenwerte.

## Eine Erfolgsrolle hinzufügen

1. Verwende den Rollencode aus dem bestehenden `anime_contribution`-Rollenkatalog. Füge keine
   zweite Frontend-Liste gültiger Fachrollen hinzu und kopiere keine Server-Schwellenwerte.
2. Füge hochauflösende PNGs unter `frontend/public/member-achievement-badges/` hinzu:
   - `role_entry_<code>.png`
   - `role-<code>-motif.png`
   - `rank-frame-<code>-bronze.png`, `rank-frame-<code>-silver.png`,
     `rank-frame-<code>-gold.png`, `rank-frame-<code>-platinum.png`
   Behalte die Quellauflösung und echte Alpha-Transparenz bei. Rahmen-Außenflächen und
   Hohlräume in der Mitte müssen transparent sein; ein dargestelltes Schachbrettmuster ist keine
   Transparenz.
3. Füge `<code>: 'layered'` zu `ROLE_ARTWORK_STRATEGIES` in
   `frontend/src/components/profile/badgeArtwork.ts` hinzu. Dieses Manifest enthält nur
   Präsentationsstrategien. Es enthält keine Labels, Berechtigungsregeln oder Schwellenwerte.
   `timer` ist die bestehende `direct-volume`-Ausnahme und nutzt ihre vier vollständigen
   `role_volume_timer_<tier>.png`-Sprites. Neue Ausnahmen benötigen eine explizite Begründung
   und ein Review.
4. Führe das Live-Katalog-/Datei-Abdeckungs-Gate unten aus und ergänze visuelle
   Fixture-Abdeckung in der verlinkten Dev-Galerie. Prüfe den Entry-Eintrag und alle vier
   zusammengesetzten Stufen, einschließlich des kompakten Stufen-Markers. Aktiviere keine neue
   Rolle allein mit einem plausiblen Dateinamen oder einem Fallback-Icon als Nachweis der
   Abdeckung.

## Abdeckungs-Gate

Ausführen aus `/home/d1sk/team4s` auf `team4s-linux` mit dem bestehenden Compose-Stack:

```sh
docker compose exec -T team4sv30-frontend npx --no-install vitest run src/components/profile/badgeArtwork.test.ts --reporter=dot
```

Der Test ruft den bestehenden `listRoleDefinitions('anime_contribution')`-Helper auf und liest
das tatsächliche öffentliche Artwork-Verzeichnis. Er schlägt fehl bei einer nicht unterstützten
kanonischen Rolle oder einer fehlenden Pflichtdatei. Synthetische Fälle für eine zukünftige Rolle
und eine entfernte Datei belegen beide Fehlerpfade. Eine bewusste Abwesenheit gehört in
`ROLE_ARTWORK_EXCEPTIONS` mit einer Begründung; diese hat aktuell keine Einträge. Eine Ausnahme
zu aktualisieren erfordert eine bewusste Aktualisierung des erwarteten Abdeckungsergebnisses,
nicht das Überspringen des Gates. Der Test benötigt das über die bestehende interne
API-Konfiguration des Frontend-Containers erreichbare Backend. Ein nicht erreichbares Backend ist
eine gescheiterte Voraussetzung, kein bestandenes Abdeckungsergebnis.

## Rendering-Vertrag

`AchievementArtwork` besitzt direktes/geschichtetes Rendering über die bestehende
`ResponsiveImage`-Nahtstelle. Aufrufer übergeben einen Descriptor, einen Badge-Code,
Alternativtext und `hero` oder `stage`; sie übergeben keine Ad-hoc-Maße. Rollenkarten und
Family-Stages richten einen ungepolsterten `achievement-card`-Query-Container ein, sodass die
Query-Breite der tatsächlich gerenderten äußeren Breite der Karte entspricht.

| Äußere Kartenbreite | Hero | Stage-Marker |
|---|---|---|
| Unter 562 px | 192 × 192 px | 64 × 64 px |
| 562–657 px | 216 × 216 px | 80 × 80 px |
| Mindestens 658 px | 240 × 240 px | 80 × 80 px |

Jeder Slot hat einen 8-px-Inset, zentrierte Bilder mit `object-fit: contain` und keine
Grid-/Bild-Mindestmaße. Portraits behalten ihr Quell-Seitenverhältnis. Schmale Karten-Wrapper
und Marker-Spalten müssen Platz für den Slot schaffen; behebe stattdessen Umbruch oder äußere
Abstände, anstatt einzelne Badge-Größen zu überschreiben. Gesperrte, aktive, inaktive und
expandierte Karten verwenden dieselbe Geometrie. Aktive Hervorhebung darf Grafiken nicht
skalieren, Text nicht verstecken, Padding nicht ändern oder Höhensprünge erzeugen.

Der statische Präsentations-Resolver weist unbekannte/prototypenartige Codes zurück. Er
versucht nie einen spekulativen öffentlichen Dateinamen. Bestehende versionierte
Nicht-Rollen-Zuordnungen bleiben explizit; abgelöste Quelldateien bleiben zur Quell-Durchsicht
verfügbar, ohne in den aktiven Resolver zurückzukehren.

## Review im Browser

Öffne `/dev/ui-system/achievements` von `/dev/ui-system` aus. Es verwendet Produktionskomponenten
und explizite serverförmige visuelle Fixtures; die Fixture ist keine Autorität für den
Rollenkatalog oder Schwellenwerte. Der Phase-151-Playwright-Collector erfasst alle Quellen und
zusammengesetzten Badge-Fälle, responsive Geometrie, Karussell-Interaktion/-Performance und
leere manuelle Abnahme-Zeilen. Prüfe die tatsächlichen Screenshots, bevor du subjektive Urteile
eintägst. Genaue Befehle, Matrix und Lücken stehen in
`.planning/phases/151-erfolgsbadge-karussell-konsolidierung/`.

Karaoke FX liefert sechs 1254 × 1254 RGBA-Quellen: Entry, Motiv und die vier Rang-Rahmen. Motiv
und Rahmen setzen sich über dieselbe geschichtete Strategie wie die anderen geschichteten Rollen
zusammen. Erzeugung und die explizit autorisierte Alpha-Extraktion für drei neue Entwürfe sind in
`151-ARTWORK-GENERATION.md` dokumentiert; alle 107 früheren Quelldateien bleiben byteidentisch.

## Containerbreiten-sensitive Bildkandidaten

Seit Phase 153 (RCA-01) verwendet `AchievementArtwork.tsx` kein natives `sizes="auto, ..."` mehr.
Dieser Lazy-Loading-Hinweis verursachte unbegrenztes Wachstum von DOM-Knoten und Event-Listenern
bei SPA-Navigation und wurde entfernt; `sizes` ist jetzt für jedes Bild — lazy oder priority
gleichermaßen — derselbe deterministische, an die CSS-Breakpoints angelehnte String:

- `HERO_SIZES = '(min-width: 658px) 240px, (min-width: 562px) 216px, 192px'`
- `STAGE_SIZES = '(min-width: 562px) 80px, 64px'`

Diese stimmen 1:1 mit den `achievement-card`-Container-Query-Breakpoints in
`AchievementArtwork.module.css` überein, sodass Next.js' Bildoptimierer für den jeweiligen
Breakpoint stets die tatsächlich gerenderte Slot-Breite erhält, keinen gemessenen/automatischen
Wert. Ein Regressions-Stolperdraht in
`frontend/src/components/editor/__tests__/publicImportGraph.test.ts` stellt sicher, dass das
literale `auto, `-Präfix in `AchievementArtwork.tsx` nie wieder auftaucht.

Die Next.js-Kandidatenleiter in `frontend/next.config.mjs` ist unverändert:
`deviceSizes: [640, 1080, 1480, 1920]`, `imageSizes: [64, 96, 128, 160, 192, 256, 512]`. Für die
feste `sizes`-Breite jedes Breakpoints wählt next/image weiterhin den kleinsten
Leiter-Kandidaten, der `sizes × devicePixelRatio` abdeckt; der mobile 192-px-Hero benötigt bei
DPR2 beispielsweise mindestens 384 Quellpixel, und da die Leiter keinen 384er-Eintrag hat, landet
die Auswahl bei 512w — dem kleinsten passenden Kandidaten, kein Sizing-Fehler. Der
64-px-Stufen-Marker benötigt bei DPR2 genau 128 Quellpixel, was exakt dem Leiter-Eintrag `128w`
entspricht. Quell-PNGs bleiben unverändert.
