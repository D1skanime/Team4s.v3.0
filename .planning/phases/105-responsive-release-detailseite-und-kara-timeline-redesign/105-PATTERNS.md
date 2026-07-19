# Phase 105: Responsive Release-Detailseite und Kara-Timeline-Redesign - Pattern Map

**Mapped:** 2026-07-19
**Files analyzed:** 21 neue/geänderte Dateien
**Analogs found:** 21 / 21

## File Classification

| Neue/geänderte Datei | Rolle | Datenfluss | Nächster Analoganker | Qualität |
|---|---|---|---|---|
| `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/releaseDetailPageData.tsx` | component / SSR composer | request-response | bestehender `ReleaseDetailPageContent` in derselben Datei | exakt; Seam erweitern |
| `.../releaseDetailPageData.composition.test.tsx` | test | request-response / transform | `frontend/src/app/members/[slug]/page.test.tsx` | exakt für DOM-Reihenfolge |
| `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/releases/[releaseVersionId]/page.test.tsx` | test | request-response | bestehender Test in derselben Datei | exakt; Fixture erweitern |
| `.../ReleaseDetailHero.tsx` | component | transform / event-driven | bestehender Hero plus `Accordion` | exakt; Darstellung neu schneiden |
| `.../ReleaseDetailHero.test.tsx` | test | event-driven | bestehender Test in derselben Datei | exakt; Erwartungen korrigieren |
| `.../page.module.css` | config / styles | transform | bestehende Public-Page-Shell in derselben Datei | exakt; Timeline-Regeln herauslösen |
| `.../ThemeTimeline.tsx` | component | streaming / event-driven | `PublicReleaseBlock.tsx` plus bestehender `ThemeTimeline`-Stream-Seam | exakt kombiniert |
| `.../ThemeTimeline.module.css` | config / styles | transform | `PublicReleaseBlock.module.css` | role/data-flow match |
| `.../ThemeTimeline.test.tsx` | test | streaming / event-driven | bestehender Test plus `ReleaseEpisodePlayer.test.tsx` | exakt kombiniert |
| `.../ReleaseGallery.tsx` | component | file-I/O / request-response | bestehender Gallery-Lightbox-/Cursor-Seam | exakt; Gruppierungszweig entfernen |
| `.../ReleaseGallery.module.css` | config / styles | transform | bestehendes Gallery-Grid | exakt; Breakpoints erweitern |
| `.../ReleaseGallery.test.tsx` | test | file-I/O / request-response | bestehender Test in derselben Datei | exakt; Multi-Group-Fall ergänzen |
| `.../ReleaseNotesList.tsx` | component | request-response / transform | bestehender Notes-Cursor-/Renderer-Seam | exakt; Rollenaggregation ergänzen |
| `.../ReleaseNotesList.module.css` | config / styles | transform | bestehendes Notes-Rollenraster | exakt; Expanded-Modifikator ergänzen |
| `.../ReleaseNotesList.test.tsx` | test | request-response / event-driven | bestehender Test in derselben Datei | exakt; Expansion/Cursor ergänzen |
| `.../ContributorsRow.tsx` | component | transform | bestehende release-spezifische Projektion | exakt; Aggregation vor Rendern |
| `.../ContributorsRow.test.tsx` | test | transform | bestehender Test in derselben Datei | exakt; Deduplizierung ergänzen |
| `.../ReleaseEpisodePlayer.tsx` | component | streaming / request-response | bestehender Auth-/Access-/Cleanup-Seam | exakt; nur sichtbare Hülle ändern |
| `.../ReleaseEpisodePlayer.test.tsx` | test | streaming / request-response | bestehender Test in derselben Datei | exakt; Sektion ergänzen |
| `.../ReleaseNavigation.tsx` | component | transform / request-response | `AdjacentNavigation.tsx` | exakt |
| `.../ReleaseNavigation.test.tsx` | test | transform | bestehender Test in derselben Datei | exakt; Variante/Edges ergänzen |

`.../` bezeichnet in dieser Tabelle ausschließlich das Verzeichnis `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/`.

## Pattern Assignments

### `releaseDetailPageData.tsx` und neuer `releaseDetailPageData.composition.test.tsx`

**Analog:** bestehender `ReleaseDetailPageContent`; für die Reihenfolgeprüfung `frontend/src/app/members/[slug]/page.test.tsx`.

**SSR-Read-/Fehler-Seam beibehalten** (`releaseDetailPageData.tsx`, Zeilen 45–70):

```tsx
export async function ReleaseDetailPageContent({ animeID, groupID, releaseVersionID, canonicalProjectPath, initialKaraSegmentID, autoplayInitialKara }: ReleaseDetailPageContext) {
  // ... parallele Anime-/Gruppen-/Backdrop-Reads ...
  try {
    detail = await getGroupReleaseDetail(animeID, groupID, releaseVersionID)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return notFound()
    return <main className={styles.page}>...</main>
  }
```

Keine neuen Loader, DTOs oder API-Aufrufe anlegen. Nur den bestehenden Renderbaum aus Zeilen 81–97 wirklich umordnen: Hero → Timeline → Gallery → Notes → Contributors → EpisodePlayer → Navigation. Nicht über CSS-`order` lösen. `ContributorsRow` top-level importieren; `releaseAnchors` nicht wieder komponieren.

**DOM-Reihenfolge testen** (`frontend/src/app/members/[slug]/page.test.tsx`, Zeilen 180–194):

```tsx
const orderedSections = [
  screen.getByRole('heading', { name: '...' }),
  screen.getByRole('heading', { name: '...' }),
]

for (let index = 1; index < orderedSections.length; index += 1) {
  const previous = orderedSections[index - 1]
  const next = orderedSections[index]
  expect(previous.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
}
```

Der neue Kompositionstest mockt die Datenreads und Kindkomponenten mit stabilen Headings/Test-IDs, prüft die gelockte Reihenfolge, das Fehlen der Sprungnavigation und die lokale Leerauslassung. Für SSR-Leerfälle kann zusätzlich das vorhandene Muster aus `ReleasesSection.test.tsx`, Zeilen 35–40 (`renderToStaticMarkup(...); expect(markup).toBe('')`) übernommen werden.

### Pretty-Route-Testfixture

**Analog:** `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/releases/[releaseVersionId]/page.test.tsx` selbst.

Der bestehende Modulmock in Zeilen 9–11 muss neben `ReleaseDetailPageContent` auch `parseReleaseDetailSearchParams` exportieren. Das aktuelle Ownership-Muster bleibt unverändert (`page.test.tsx`, Zeilen 16–24): Slugs werden auf `animeID`, `groupID`, echte `releaseVersionID` und `canonicalProjectPath` aufgelöst; Mismatch führt vor dem Detailrender zu `notFound`. Ergänzt wird nur, dass `kara`/`autoplay` an den kanonischen Composer weitergereicht werden.

### `ThemeTimeline.tsx` und `ThemeTimeline.module.css`

**Analogs:** `PublicReleaseBlock.tsx/.module.css` für Geometrie, Typfarben, Außenlabels und mobile Liste; bestehender `ThemeTimeline.tsx` für Stream-URL und Cleanup; globale UI-Primitives für sichtbare Controls.

**Imports/Primitives** (`PublicReleaseBlock.tsx`, Zeilen 3–9):

```tsx
import { Eye, FileText, Image as ImageIcon, Play, Users } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Badge, Button, Card, EmptyState, SectionHeader } from '@/components/ui'
```

Für `ThemeTimeline` nur `Play`, `Badge`, `Button`, `Card`, `SectionHeader` übernehmen. Kein lokaler nativer `.timelinePlay`-Button und kein globales Kara-Domain-Primitive.

**Proportionale Geometrie und Randalignment** (`PublicReleaseBlock.tsx`, Zeilen 69–110):

```tsx
function segmentStyle(segment: PublicReleaseTimelineSegment): CSSProperties {
  return {
    '--segment-left': `${segment.leftPercent}%`,
    '--segment-width': `${segment.widthPercent}%`,
  } as CSSProperties
}

function segmentLabelAlignment(segment: PublicReleaseTimelineSegment): 'start' | 'center' | 'end' {
  if (segment.leftPercent < 20) return 'start'
  if (segment.leftPercent + segment.widthPercent > 80) return 'end'
  return 'center'
}
```

Diese CSS-Variablen-/Alignment-Sprache kopieren, aber die Zielwerte aus Start/Ende/Episodendauer exakt berechnen. Das aktuelle `Math.max(2, width)` aus `ThemeTimeline.tsx`, Zeile 72, darf nicht übernommen werden. Sichtbarer Balken und mindestens 44×44 px große transparente Hit-Zone sind getrennte Elemente. Für Außenlabel-Kollisionen bleibt der kleine Zwei-Lane-Allocator lokal in `ThemeTimeline.tsx`.

**Timeline-/Mobile-Struktur** (`PublicReleaseBlock.tsx`, Zeilen 157–181; CSS Zeilen 320–379 und 629–676):

```tsx
<div className={styles.timeline}>
  <h4 className={styles.timelineMobileTitle}>Karas</h4>
  <div className={styles.timelineTrack}>
    {release.timelineSegments.map(segment => (
      <a className={segmentClassName(segment)} style={segmentStyle(segment)}>
        <span className={styles.timelineSegmentLabel} data-alignment={segmentLabelAlignment(segment)}>
          {segment.label}
        </span>
      </a>
    ))}
  </div>
</div>
```

```css
.timelineTrack { position: relative; overflow: visible; }
.timelineSegment { position: absolute; left: var(--segment-left); width: var(--segment-width); min-width: 0; }

/* vorhandenes Mobile-Muster */
.timelineSegment {
  display: grid;
  grid-template-columns: 4px auto minmax(0, 1fr) auto;
  width: 100%;
}
```

Nur Sprache/Struktur kopieren. Nicht kopieren: die 820-px-Containergrenze, Links statt lokaler Auswahl, Scale-Y-Hover und die 42-px-Mobile-Höhe. Phase 105 verlangt CSS-Breakpoints `≤639`, `640–900`, `901–1199`, `≥1200`, mobile CTA mindestens 48 px und keine horizontale Mobile-Spur.

**Typfarben** (`PublicReleaseBlock.module.css`, Zeilen 422–462): OP `#15955a`, ED `#1685bf`, IN `#8442c7`, Other `#536688` sind der Ausgangspunkt. Middle `#C98A12` und Kara `#993556` gemäß UI-SPEC ergänzen; Typ immer zusätzlich als Text zeigen.

**Streamwechsel/Cleanup bewahren und zentralisieren** (`ThemeTimeline.tsx`, Zeilen 42–61):

```tsx
videoRef.current?.pause()
videoRef.current?.removeAttribute('src')
videoRef.current?.load()

const player = videoRef.current
if (player) {
  player.pause()
  player.removeAttribute('src')
  player.load()
}
```

Diese Duplikation in einen lokalen `stopCurrentStream`-Seam ziehen und ihn vor Wechsel, bei Sessionverlust und beim Unmount verwenden. Die Stream-URL bleibt exakt `/api/segments/${theme_segment_id}/stream?release_version_id=${releaseVersionID}` (`ThemeTimeline.tsx`, Zeilen 107–118). Keine freien Bounds oder neue Grantlogik.

**Auswahl-/Auth-Trennung:** `selectedSegmentID` darf öffentlich/deep-linkbar sein; `streamSegmentID` entsteht nur bei `isClientInitialized && (hasAccessToken || hasRefreshToken)` und `readiness === 'ready'`. Gast: Informationen, keine CTA, kein Logintext, kein unavailable-Diagnosetext. Aktive Session + unavailable: statisches `Noch nicht abspielbar`.

### Globale UI-Primitives (read-only Reuse)

Diese Dateien sind Analogquellen, nicht Edit-Scope.

**Button-Seam** (`Button.tsx`, Zeilen 11–18 und 51–71):

```tsx
type CommonButtonProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: ReactNode
}

const classes = classNames(
  styles.button,
  variant === 'primary' && styles.buttonPrimary,
  fullWidth && styles.buttonBlock,
)
```

Kara-CTA: `<Button fullWidth leftIcon={<Play ... />}>Kara abspielen</Button>`. Notes-Expansion und Gallery-Bildfläche: `variant="ghost"`. Vollfolge: `variant="secondary"`.

**Card/Badge/SectionHeader** (`Card.tsx`, Zeilen 33–50; `Badge.tsx`, Zeilen 12–28; `SectionHeader.tsx`, Zeilen 14–23):

```tsx
<section className={classNames(styles.card, variant === 'flat' && styles.cardFlat, className)}>
  {children}
</section>
```

Segment-, Note- und Contributor-Innenkarten nutzen `Card variant="flat"`; Hero-Innenfläche `nestedFlat`; Kategorien/Typen nutzen `Badge`; alle Hauptsektionen nutzen `SectionHeader`. Domain-Typfarbe bleibt eine lokale Modifier-Klasse und keine neue globale Badge-Variante.

**Accordion-A11y** (`Accordion.tsx`, Zeilen 60–94):

```tsx
<button
  type="button"
  aria-expanded={isOpen}
  aria-controls={panelId}
  onClick={() => toggle(item.id)}
>
  ...
</button>
{isOpen ? <div id={panelId} role="region" aria-labelledby={headerId}>{item.children}</div> : null}
```

Hero-Details bleiben auf diesem Seam; keinen eigenen Disclosure-State/ARIA-Nachbau erstellen.

### `ReleaseGallery.tsx`, CSS und Test

**Analog:** dieselbe Komponente; sie besitzt bereits den korrekten Release-Version-Cursor, Dedupe, Originalbild-Adapter und Lightbox.

**Dedupe/Lightbox beibehalten** (`ReleaseGallery.tsx`, Zeilen 25–44):

```tsx
function mergeImages(previous: PublicReleaseImage[], incoming: PublicReleaseImage[]): PublicReleaseImage[] {
  const seen = new Set<number>()
  return [...previous, ...incoming].filter(item => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

function toLightboxItem(image: PublicReleaseImage): PublicImageLightboxItem {
  return { original_url: image.original_url ?? image.thumbnail_url, ... }
}
```

**Cursor-/lokaler Fehler-Seam beibehalten** (`ReleaseGallery.tsx`, Zeilen 63–90): `getGroupReleaseImages(animeID, groupID, releaseVersionID, { category, cursor, limit: 50 })`, Kategorie-Cursor vollständig lesen, mit `mergeImages` mergen, Fehler lokal setzen, `finally` Loading beenden. Die ganze Bildfläche bleibt globaler Ghost-Button und öffnet `FansubMediaLightbox` (Zeilen 93–120).

Entfernen: `groups.length`-abhängige `buckets`/`groupList`-Darstellung (Zeilen 57–60, 114–118). `groups` darf höchstens Gruppennamen-Metadaten auflösen; alle Bilder stehen in genau einem `styles.grid`.

**CSS-Seam:** Aus `ReleaseGallery.module.css`, Zeilen 1–17, `minmax(0, 1fr)`, `min-width: 0`, `imageButton` und lokales Metadaten-Wrapping erhalten. Spalten auf 2 (`≤900`), 3 (`901–1199`), 4 (`≥1200`) ändern; Mobile bleibt 2. Testmuster aus `ReleaseGallery.test.tsx`, Zeilen 38–62 und 76–92, weiterverwenden: Grid-Kinder zählen, Cursoraufrufe prüfen, Original-URL in der Lightbox prüfen. Neuer Fall: nichtleere `groups` ergeben weiterhin genau `release-image-grid` und kein Herkunftskapitel.

### `ReleaseNotesList.tsx`, CSS und Test

**Analog:** dieselbe Komponente; Cursor/Dedupe, UTC-Datum und `RichTextRenderer` bleiben Eigentümer ihrer Logik.

**Datumsseam** (`ReleaseNotesList.tsx`, Zeilen 15–18):

```tsx
const date = new Date(value)
return Number.isNaN(date.getTime())
  ? value
  : date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
```

**Cursor-/Dedupe-Seam** (`ReleaseNotesList.tsx`, Zeilen 53–61):

```tsx
const page = await getGroupReleaseNotes(animeID, groupID, releaseVersionID, { cursor: cursor ?? undefined, limit: 20 })
setItems(previous => {
  const seen = new Set(previous.map(note => note.id))
  return [...previous, ...page.items.filter(note => !seen.has(note.id))]
})
setCursor(page.next_cursor)
setHasMore(page.has_more)
```

Immer nach `role_label || 'Weitere Beiträge'` bucketen; `groups.length` darf die Primärachse nicht mehr umschalten. Karten-Metadaten dürfen Herkunftsgruppe zeigen. `RichTextRenderer` in Zeile 75 bleibt der einzige HTML-Renderer.

Expansion als `Set<number>` (`expandedNoteIDs`) nach stabiler Note-ID führen. Pro Karte globaler Ghost-Button `Weiterlesen`/`Weniger anzeigen`; Nachladen darf das Set nicht ersetzen. CSS ergänzt zur bestehenden 6-Zeilen-Clamp-Klasse eine Expanded-Klasse, `max-width: 68ch` und 1/1/2-Rollenraster.

Testmuster: `ReleaseNotesList.test.tsx`, Zeilen 21–26 prüft Rollenblöcke im Grid; Zeilen 28–57 sichert UTC-/Hydration-Stabilität. Ergänzen: nichtleere `groups` bleiben Rollenbuckets; nur die geklickte Note klappt auf; Zustand bleibt nach Cursor-Merge erhalten; lokaler Fehler lässt bestehende Inhalte stehen.

### `ContributorsRow.tsx` und Test

**Analog:** dieselbe Komponente für Release-Version-Projektion, Leer-Omission und Avatarfallback.

**Beibehalten** (`ContributorsRow.tsx`, Zeilen 7–14):

```tsx
if (!contributors.length) return null
<SectionHeader title="An diesem Release beteiligt" ... />
{person.avatar_url
  ? <Image ... />
  : <span aria-hidden="true">{person.name.charAt(0).toUpperCase()}</span>}
```

**Nicht kopieren:** Karte pro `(member_id, role_label)` und `groups`-abhängige Untersektionen (Zeilen 11–24). Vor dem Rendern stabil nach `(fansub_group_id, member_id)` aggregieren, doppelte Rollen entfernen und alle Rollen einer Person in einer flachen Karte zeigen. Keine Projekt-/Gruppenmitglieder nachladen oder als Fallback verwenden.

Der bestehende Test (`ContributorsRow.test.tsx`, Zeilen 1–3) bleibt Basis für „nur gelieferte Contributors“ und `[] → null`; ergänzen: doppelte Person/Rolle erscheint einmal, dieselbe Person mit zwei Rollen erscheint als eine Karte mit beiden Rollen. CSS in `page.module.css`: Mobile 1 Spalte, Tablet 2, Desktop `repeat(auto-fit, minmax(220px, 1fr))`.

### `ReleaseDetailHero.tsx`, `page.module.css` und Hero-Test

**Analogs:** bestehender Hero für Preview→Logo→text-only-Fallback; globaler `Accordion` für Sekundärdetails.

**Format-/Fallback-Seams beibehalten** (`ReleaseDetailHero.tsx`, Zeilen 21–53): `formatDate`, `formatDuration`, `subtitleSummary`, `image?.thumbnail_url ?? image?.original_url ?? animeLogoFallbackUrl`, `isLogoFallback` und Gruppenzeile.

Primärfakten `Version`, `Veröffentlicht`, `Dauer`, `Auflösung` aus dem Accordion heraus in den sofort sichtbaren Hero setzen. Nur Video-Codec, Untertiteltyp und Spuren bleiben unter `Details`. `ContributorsRow`, `showContributors` und `releaseAnchors` aus Zeilen 55–89 entfernen. Stats bleiben nicht-interaktive Metadaten.

**Page-Shell-Seam** (`page.module.css`, Zeilen 1–38): zentrierte `.page`, globale `--public-page-max-width`/`--public-page-gutter`, fließender Grid-Abstand und lokale Sektionflächen beibehalten. Auf den UI-SPEC-Vertrag 16px Mobile-Gutter sowie 1360/1480px Public-Maxbreite ausrichten. Alle Timeline-Klassen ab Zeile 211 in `ThemeTimeline.module.css` verschieben; `page.module.css` behält Page, Hero, Contributors, Episode und lokale Navigation.

**Test:** bestehende Fallback-Tests in `ReleaseDetailHero.test.tsx`, Zeilen 10–24, unverändert erhalten. Den Test aus Zeilen 27–35 korrigieren: Version/Datum/Dauer/Auflösung vor Öffnen sichtbar; Video-Codec/Spuren erst nach Öffnen; Beteiligte nie im Hero.

### `ReleaseEpisodePlayer.tsx` und Test

**Analog:** derselbe zentrale Auth-/Access-/Modal-/Cleanup-Seam.

**Auth/Access beibehalten** (`ReleaseEpisodePlayer.tsx`, Zeilen 9–25):

```tsx
const session = useAuthSession()
const hasSession = session.hasAccessToken || session.hasRefreshToken

useEffect(() => {
  if (!session.isClientInitialized || !hasSession) return
  let cancelled = false
  void getReleasePlaybackAccess(releaseVersionID)
    .then(access => {
      if (!cancelled) setAvailable(access.can_play && access.stream_ready)
    })
  return () => { cancelled = true }
}, [hasSession, releaseVersionID, session.isClientInitialized])
```

**Cleanup beibehalten** (Zeilen 27–37): bei Close `pause()`, `removeAttribute('src')`, `load()`, dann lokalen Zustand schließen. Keine Rollenprüfung, kein Tokenread, kein neuer Fetch. Nur den positiven Erfolgsfall in eine sekundäre Sektion mit `SectionHeader title="Vollständige Episode"` und bestehendem `Button variant="secondary"` komponieren.

Testpattern (`ReleaseEpisodePlayer.test.tsx`, Zeilen 20–52): denied/unready unsichtbar, Refresh-only aktiv, Close räumt Video auf, uninitialisiert/Gast ruft Access nicht auf, Access-Fehler bleibt lokal. Ergänzen: Heading erscheint ausschließlich gemeinsam mit der erlaubten Aktion.

### `ReleaseNavigation.tsx` und Test

**Analog:** `AdjacentNavigation.tsx`; Href-Auflösung bleibt `buildFansubReleaseHref`.

**Domain-Mapping beibehalten** (`ReleaseNavigation.tsx`, Zeilen 5–15):

```tsx
return {
  href: buildFansubReleaseHref({ animeID, groupID, releaseVersionID: target.release_version_id, canonicalProjectPath }),
  label: `Episode ${target.episode_number} · Version ${target.version}`,
  ariaLabel: `${direction === 'previous' ? 'Vorheriger' : 'Nächster'} Release: ...`,
}
```

**Globaler Nav-Seam** (`AdjacentNavigation.tsx`, Zeilen 21–39):

```tsx
export function AdjacentNavigation({
  previous,
  next,
  variant = 'inline',
  className,
}: AdjacentNavigationProps) {
  if (!previous && !next) return null
  return <nav className={classNames(styles.adjacentNav, styles.adjacentNavInline, className)} ...>
```

`variant="inline"` explizit setzen und über `className` eine lokale Klasse aus `page.module.css` geben. Die globale Implementierung bleibt unverändert. Der globale Mobile-Seam nutzt derzeit zwei Spalten und 44px (`ui.module.css`, Zeilen 1464–1539 und 1806–1834); lokal bei `≤639px` auf eine Spalte und mindestens 48px Zielhöhe überschreiben. Keine absolute/floating Position.

Tests aus `ReleaseNavigation.test.tsx`, Zeilen 8–18, für gruppentreue Pretty-Hrefs, technische Fallback-Hrefs und fehlende Kante erhalten. Ergänzen: beide Kanten, keine Kante → kein `nav`, und explizite Inline-/lokale Klassenübergabe.

## Shared Patterns

### Authentifizierung und Berechtigungen

**Quelle:** `ReleaseEpisodePlayer.tsx`, Zeilen 9–25; `docs/frontend/auth-api-client.md`.
**Anwenden auf:** `ThemeTimeline`, `ReleaseEpisodePlayer`, zugehörige Tests.

- Aktive Session ist `hasAccessToken || hasRefreshToken` nach Client-Initialisierung.
- Komponenten lesen keine Cookies/Tokens, bauen keine Bearer-Header und rufen keinen Keycloak-Refresh auf.
- Segmentstream bleibt am bestehenden Segment-Relay; Vollfolge bleibt an `getReleasePlaybackAccess` und Release-Relay.

### Lokale Fehler-/Loadingzustände

**Quellen:** `ReleaseGallery.tsx`, Zeilen 63–90; `ReleaseNotesList.tsx`, Zeilen 53–61; `ReleaseEpisodePlayer.tsx`, Zeilen 18–37.
**Anwenden auf:** Timeline, Gallery, Notes, EpisodePlayer.

Jede Sektion hält eigenen Loading-/Fehlerzustand. Bereits geladene Gallery-/Note-Inhalte bleiben bei Nachladefehler sichtbar. Öffentliche Copy verwendet die UI-SPEC-Texte mit korrekten Umlauten; keine Grant-/Renderdiagnosen anzeigen.

### Leerauslassung

**Quellen:** `ThemeTimeline.tsx`, Zeile 48; `ReleaseGallery.tsx`, Zeile 53; `ReleaseNotesList.tsx`, Zeile 44; `ContributorsRow.tsx`, Zeile 8; `AdjacentNavigation.tsx`, Zeilen 28–30.
**Anwenden auf:** alle optionalen Abschnitte.

Leere Daten ergeben `null`, nicht Heading, EmptyState, Trennlinie oder reservierten Abstand. Die Vollfolge wird ebenfalls vollständig ausgelassen, wenn Session, Recht oder Streambereitschaft fehlen.

### Responsive CSS

**Quellen:** `PublicReleaseBlock.module.css`, `ReleaseGallery.module.css`, `page.module.css`, UI-SPEC.
**Anwenden auf:** Page, Timeline, Gallery, Notes, Contributors, Navigation.

- CSS entscheidet Layoutform; kein JavaScript-Viewport-Switch für Timeline/Spalten.
- Grid-Kinder erhalten `min-width: 0`; Spalten verwenden `minmax(0, 1fr)`.
- Breakpoints: `≤639`, `640–900`, `901–1199`, `≥1200`.
- `prefers-reduced-motion: reduce` entfernt Auswahltransition/Smooth-Scroll.
- Kein globales `overflow-x: clip` als Fix; Fokus und Außenlabels müssen sichtbar bleiben.

### Teststil

**Quellen:** bestehende Release-Tests und `frontend/src/app/members/[slug]/page.test.tsx`, Zeilen 176–207.
**Anwenden auf:** alle Wave-0-/Komponententests.

RTL nach Rolle/zugänglichem Namen verwenden; DOM-Reihenfolge mit `compareDocumentPosition`; Streams mit `HTMLMediaElement.pause/load`-Spies; Cursor/Dedupe über API-Spies; CSS-Geometrie nicht mit jsdom vortäuschen. Reale Breakpoints bleiben Live-UAT bei 390/768/1024/1440 px.

## Read-only Comparison Seams

| Datei | Verwendung | Nicht ändern, weil |
|---|---|---|
| `frontend/src/components/fansubs/PublicReleaseBlock.tsx` | Timeline-Geometrie, Typen, `Karas`-Mobile-Sprache | Projektseiten-Links/Compact-Layout sind ein anderer Surface-Vertrag |
| `frontend/src/components/fansubs/PublicReleaseBlock.module.css` | Typfarben, Grundspur, Außenlabel, vertikale Segmentstruktur | 820-px-Containergrenze und aktuelle Interaktionsgrößen passen nicht zur Detailseite |
| `frontend/src/components/ui/Button.tsx` | Play-/Expand-/Load-more-Aktionen | bestehende Props decken den Bedarf ab |
| `frontend/src/components/ui/Card.tsx` | `flat`/`nestedFlat` | keine neue Variante nötig |
| `frontend/src/components/ui/Badge.tsx` | Typ-/Kategoriekennzeichnung | Kara-Farbe bleibt lokaler Modifier |
| `frontend/src/components/ui/SectionHeader.tsx` | Abschnittsüberschriften | bestehender Seam reicht |
| `frontend/src/components/ui/Accordion.tsx` | Hero-Details | bestehende ARIA-/State-Semantik reicht |
| `frontend/src/components/ui/AdjacentNavigation.tsx` | vorheriger/nächster Release | lokale `className`-Anpassung vermeidet globale Regressionen |
| `frontend/src/components/ui/ui.module.css` | Fokus-, Button-, Card-, Nav-Baseline | Phase 105 braucht keine globale Token-/Primitive-Änderung |

## No Analog Found

Keine Datei ohne belastbaren Analoganker. Die neue `ThemeTimeline.module.css` übernimmt bewusst nur die passenden Teile aus `PublicReleaseBlock.module.css` und dem bisherigen Timeline-Block in `page.module.css`; die neue Kompositionsprüfung übernimmt das etablierte DOM-Reihenfolgemuster der Member-Page.

## Metadata

**Analog search scope:** `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]`, Pretty-Route, `frontend/src/components/fansubs`, `frontend/src/components/ui`, vorhandene SSR-/Kompositionstests

**Starke Analoggruppen:** 5 (`bestehende Release-Seams`, `PublicReleaseBlock`, `globale UI-Primitives`, `AdjacentNavigation`, `bestehende RTL/SSR-Tests`)

**Pattern extraction date:** 2026-07-19
**Source edits:** keine; ausschließlich dieses Planungsartefakt wurde erstellt
