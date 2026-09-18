/**
 * TEMPORÄRER, NICHT-PRODUKTIVER DEBUG-AID (Phase 164 Plan 07, Task 3 — T-164-12).
 *
 * Zweck: die einzigen zwei Performance-Gates aus 164-USER-REQUEST.md §47, die eine echte
 * Browser-/GPU-Messung erfordern und nicht per Unit-/Integrationstest belegbar sind:
 *   - Gate 6 (DOM waechst nicht unbegrenzt) — Chrome DevTools › Elements, DOM-Node-Count.
 *   - Gate 11 (Mobile bleibt performant) — Chrome DevTools › Performance/Layers,
 *     Mobile-Viewport-Emulation, mehrere gleichzeitig aufgeklappte Episoden, Scrollen.
 *
 * Diese Route ruft NIEMALS ein Backend/eine Datenbank auf — alle Episoden-/Release-Daten
 * unten sind rein clientseitig (bzw. hier: statisch im Modul) generiert. `pagination.has_more`
 * ist bewusst `false`: das verhindert strukturell, dass `useWindowedEpisodePages` (Windowing-
 * Hook aus Plan 164-05) jemals einen echten `getGroupedEpisodes`-Fetch ausloest, selbst wenn
 * ueber den unteren/oberen Sentinel gescrollt wird — es gibt schlicht keine "naechste Page"
 * anzufordern. Damit ist "zero backend requests" strukturell garantiert, nicht nur beabsichtigt.
 * Konsequenz: die Grossdatensatz-Messung erfolgt gegen EINE grosse, bereits vollstaendig
 * geladene Page (64 Episoden) statt gegen mehrere nachgeladene Pages — fuer Gate 6/11 (DOM-
 * Node-Count und GPU-/Blur-Kosten bei vielen gleichzeitig gerenderten/aufgeklappten Karten)
 * ist das exakt das, was gemessen werden soll; die Windowing-Eviction selbst ist bereits
 * durch useWindowedEpisodePages.test.ts / FansubVersionBrowser.windowing.test.tsx automatisiert
 * bewiesen (siehe docs/audits/164-performance-gates.md, Gate 6/7).
 *
 * Diese Route darf niemals in die oeffentliche Routen-Struktur (/anime/[id] o.ae.) verlinkt
 * werden. Nach der manuellen Messung entscheidet der/die Entwickler:in (Task 3, Schritt 4),
 * ob die Route geloescht oder als dauerhafter Debug-Aid behalten wird.
 */

import { Badge, Card, PageHeader, SectionHeader } from '@/components/ui'
import { FansubVersionBrowser } from '@/components/fansubs/FansubVersionBrowser'
import type { PublicEpisodeVersion, PublicGroupedEpisode } from '@/types/episodeVersion'
import type { FansubGroupSummary } from '@/types/fansub'

// Gleiche Variantenbeschreibung wie Plan 164-03s Backend-Fixture (episode_version_public_scale_fixture_test.go):
// alle 5 filler_type-Werte, mehrere episode_type-Werte, Coop, Bilder/Notizen/Karaoke gemischt,
// mit/ohne Logo, mit/ohne Datum — hier rein clientseitig nachgebildet, keine Uebernahme von Go-Code.
const FILLER_TYPES = ['canon', 'filler', 'mixed', 'recap', 'unknown'] as const
const EPISODE_TYPES = ['episode', 'special', 'ova', 'movie'] as const
// Gleiche Anzeigenamen wie Migration 0169 (164-10, GAP-11) -- rein clientseitig
// nachgebildet, damit dieser Mock keinen Backend-Request braucht.
const FILLER_TYPE_LABELS: Record<(typeof FILLER_TYPES)[number], string> = {
  canon: 'Haupthandlung',
  filler: 'Zusatzfolge',
  mixed: 'Teilweise Zusatzfolge',
  recap: 'Rückblick',
  unknown: 'Unbekannt',
}
const EPISODE_TYPE_LABELS: Record<(typeof EPISODE_TYPES)[number], string> = {
  episode: 'Episode',
  special: 'Special',
  ova: 'OVA',
  movie: 'Movie',
}
const VIDEO_QUALITIES: Array<string | null> = ['1080p', '720p', null]
const CONTAINERS: Array<string | null> = ['mkv', 'mp4', null]
const VIDEO_CODECS: Array<string | null> = ['x264', 'x265', null]
const SUBTITLE_TYPES: Array<'softsub' | 'hardsub'> = ['softsub', 'hardsub']

const GROUP_WITH_LOGO: FansubGroupSummary = {
  id: 9101,
  slug: 'preview-logo-group',
  name: 'PreviewSubs',
  logo_url: '/groups/ownage.png',
}
const GROUP_NO_LOGO: FansubGroupSummary = {
  id: 9102,
  slug: 'preview-no-logo-group',
  name: 'NoLogoFansubs',
  logo_url: null,
}

const MOCK_ANIME_ID = 999001
const MOCK_EPISODE_COUNT = 64

function buildMockVersion(seed: number, isCoop: boolean): PublicEpisodeVersion {
  const variantId = 500000 + seed
  const releaseDate = seed % 3 === 0
    ? null
    : new Date(Date.UTC(2010 + (seed % 12), seed % 12, 1 + (seed % 27))).toISOString().slice(0, 10)
  return {
    id: variantId,
    variant_id: variantId,
    release_version_id: 400000 + seed,
    anime_id: MOCK_ANIME_ID,
    episode_number: seed,
    title: seed % 5 === 0 ? null : `Vorschau-Release ${seed}`,
    release_name: `Vorschau-Release ${seed} · (PreviewSubs) · v1`,
    release_version: seed % 4 === 0 ? `v${1 + (seed % 3)}` : null,
    video_quality: VIDEO_QUALITIES[seed % VIDEO_QUALITIES.length],
    subtitle_type: SUBTITLE_TYPES[seed % SUBTITLE_TYPES.length],
    release_date: releaseDate,
    fansub_groups: isCoop
      ? [GROUP_WITH_LOGO, GROUP_NO_LOGO]
      : seed % 2 === 0
        ? [GROUP_WITH_LOGO]
        : [GROUP_NO_LOGO],
    container: CONTAINERS[seed % CONTAINERS.length],
    video_codec: VIDEO_CODECS[seed % VIDEO_CODECS.length],
    has_images: seed % 2 === 0,
    has_notes: seed % 3 === 0,
    has_karaoke: seed % 5 === 0,
  }
}

function buildMockEpisode(index: number): PublicGroupedEpisode {
  const episodeNumber = index + 1
  const episodeId = 900000 + episodeNumber
  const isCoopEpisode = index % 9 === 0
  const hasSecondVersion = index % 7 === 0
  const versions: PublicEpisodeVersion[] = [buildMockVersion(episodeNumber, isCoopEpisode)]
  if (hasSecondVersion) versions.push(buildMockVersion(episodeNumber + 1000, false))
  const fillerType = FILLER_TYPES[index % FILLER_TYPES.length]
  const episodeType = EPISODE_TYPES[index % EPISODE_TYPES.length]
  return {
    episode_id: episodeId,
    episode_number: episodeNumber,
    episode_title: index % 6 === 0 ? null : `Vorschau-Episode ${episodeNumber}`,
    default_version_id: versions[0].variant_id,
    version_count: versions.length,
    versions,
    filler_type: fillerType,
    filler_type_label: FILLER_TYPE_LABELS[fillerType],
    episode_type: episodeType,
    episode_type_label: EPISODE_TYPE_LABELS[episodeType],
  }
}

const MOCK_EPISODES: PublicGroupedEpisode[] = Array.from(
  { length: MOCK_EPISODE_COUNT },
  (_, index) => buildMockEpisode(index),
)

export default function EpisodeWindowingPreviewPage() {
  return (
    <main style={{ padding: '32px 16px 64px', maxWidth: 960, margin: '0 auto' }}>
      <PageHeader
        eyebrow="Interne Dev-Route (temporär)"
        title="Episode-Windowing-Vorschau — großer Datensatz"
        description={`Temporärer, nicht-produktiver Debug-Aid für Phase 164 Plan 07 (Gate 6 / Gate 11): rendert ${MOCK_EPISODE_COUNT} rein clientseitig generierte Mock-Episoden über die echte FansubVersionBrowser-Komponente, ohne jemals einen Backend-Request auszulösen. Nach der manuellen DOM-Node- und Mobile-Performance-Messung entscheidet der/die Entwickler:in, ob diese Route gelöscht oder als dauerhafte Debug-Route beibehalten wird.`}
        breadcrumbs={(
          <ol style={{ display: 'flex', gap: 8, listStyle: 'none', padding: 0, margin: 0 }}>
            <li><Badge variant="muted">/dev</Badge></li>
            <li><Badge variant="warning">episode-windowing-preview</Badge></li>
          </ol>
        )}
      />
      <Card
        variant="section"
        title="Zweck &amp; Grenzen dieser Seite"
        description="Ausschließlich für die manuelle Chrome-DevTools-Messung aus 164-07-PLAN.md Task 3 (DOM-Node-Zählung, Mobile-Viewport-Performance-/Layers-Profil)."
      >
        <ul>
          <li>Kein Datenbankzugriff, kein Fetch, keine Netzwerkanfrage — alle Episoden-/Release-Daten sind statisch im Modul definiert.</li>
          <li>{MOCK_EPISODE_COUNT} Episoden, Klassifikations-/Typ-Mischung, Coop-Versionen, Logo/kein Logo, Datum/kein Datum, Bilder/Notizen/Karaoke gemischt (gleiche Variantenbeschreibung wie Plan 164-03s Backend-Fixture).</li>
          <li><code>pagination.has_more: false</code> auf der einzigen Mock-Seite — verhindert strukturell jeden Forward-/Backward-Request der Windowing-Hook (siehe Codekommentar oben im Quelltext).</li>
          <li>Nicht in die produktive Routen-Struktur der Anime-Seite verlinkt; nur unter <code>/dev/episode-windowing-preview</code> erreichbar.</li>
        </ul>
      </Card>
      <SectionHeader
        title="Gerenderte Vorschau"
        description="Identische Komponente wie auf /anime/[id] — FansubVersionBrowser mit Mock-Daten statt SSR-Fetch."
      />
      <FansubVersionBrowser
        animeID={MOCK_ANIME_ID}
        fansubs={[]}
        episodes={MOCK_EPISODES}
        pagination={{ has_more: false, next_cursor: null, row_limit: MOCK_EPISODE_COUNT }}
        episodeCount={MOCK_EPISODE_COUNT}
      />
    </main>
  )
}
