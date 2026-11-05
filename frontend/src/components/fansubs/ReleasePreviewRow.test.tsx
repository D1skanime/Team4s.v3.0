// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { PublicEpisodeVersion } from '@/types/episodeVersion'

import { ReleasePreviewRow } from './ReleasePreviewRow'

/**
 * Baut eine `PublicEpisodeVersion`-Minimalfixtur passend zu den drei mandatierten
 * `ReleasePreviewRow.stories.tsx`-Varianten ("Mit allen Extras", "Koop", "Ohne Logo") nach --
 * lokal nachgebaut statt aus der Story-Datei importiert, da `ReleasePreviewRow.stories.tsx`s
 * `buildVersion()` nicht exportiert wird.
 */
function buildVersion(overrides: Partial<PublicEpisodeVersion> = {}): PublicEpisodeVersion {
  return {
    id: 1,
    variant_id: 1,
    release_version_id: 1,
    anime_id: 1,
    episode_number: 1,
    title: null,
    release_version: 'v1',
    video_quality: '1080p',
    subtitle_type: 'softsub',
    release_date: '2024-01-07',
    fansub_groups: [{ id: 1, slug: 'demo-fansub-gruppe', name: 'Demo Fansub-Gruppe' }],
    container: 'mkv',
    video_codec: 'h264',
    has_images: false,
    has_notes: false,
    has_karaoke: false,
    release_name: 'Demo Fansub-Gruppe v1',
    ...overrides,
  }
}

/*
 * Diese Tests prüfen die Spaltenausrichtung zwischen Gruppenname/Release-Name und
 * den drei Datenzeilen (Technik/Extras/Datum) rein strukturell -- jsdom berechnet kein echtes
 * Pixel-Layout (`getBoundingClientRect()` liefert hier immer Nullen), daher ist "teilt denselben
 * Eltern-Knoten" (identisches `parentElement`) der korrekte, tatsächlich ausführbare Ersatz für
 * "beginnt an derselben horizontalen Position". Es wird bewusst NICHT auf interne CSS-Modul-
 * Klassennamen geprüft (in manchen Testkonfigurationen opake Hashes), sondern ausschliesslich
 * auf DOM-Verschachtelung und Elementanzahl.
 */
describe('ReleasePreviewRow -- Spaltenausrichtung', () => {
  it('"Mit allen Extras": Gruppenname und alle drei Datenzeilen teilen denselben Stack-Elternknoten', () => {
    const version = buildVersion({ has_images: true, has_notes: true, has_karaoke: true })
    render(<ReleasePreviewRow version={version} animeID={1} />)

    // `{ selector: 'p' }` ist nötig, da Avatar sein eigenes `label` zusätzlich unsichtbar
    // (VisuallyHidden) für Screenreader wiederholt -- ohne Einschränkung fände `getByText`
    // zwei Treffer mit identischem Text (Avatar-Beschriftung + Gruppenname-Absatz).
    const groupName = screen.getByText('Demo Fansub-Gruppe', { selector: 'p' })
    const techLine = screen.getByText('1080p · mkv · h264 · Softsub')
    // RTL normalisiert mehrfache Leerzeichen standardmäßig zu einem einzigen -- die
    // tatsächlich gerenderten drei Leerzeichen zwischen den Extras-Einträgen bleiben im DOM
    // selbst erhalten, nur der Textabgleich hier vereinfacht sie.
    const extrasLine = screen.getByText('📷 Bilder 📝 Notizen ♪ Karaoke')
    const dateLine = screen.getByText('Fansub-Release vom 07.01.2024')

    expect(groupName.parentElement).not.toBeNull()
    expect(techLine.parentElement).toBe(groupName.parentElement)
    expect(extrasLine.parentElement).toBe(groupName.parentElement)
    expect(dateLine.parentElement).toBe(groupName.parentElement)
  })

  it('"Koop": zwei Avatare rendern, Datenzeilen bleiben trotz breiterer Avatar-Gruppe im selben Stack wie der Gruppenname', () => {
    const version = buildVersion({
      fansub_groups: [
        { id: 1, slug: 'demo-fansub-gruppe', name: 'Demo Fansub-Gruppe' },
        { id: 2, slug: 'zweite-gruppe', name: 'Zweite Gruppe' },
      ],
    })
    const { container } = render(<ReleasePreviewRow version={version} animeID={1} />)

    // Cluster(wrap=false) passt die Avatar-Spaltenbreite der tatsächlichen Kinderzahl an --
    // hier müssen es GENAU zwei Avatar-Elemente sein (eines pro Gruppe), kein fest verdrahtetes
    // Einzel-Avatar-Mass.
    const avatarElements = container.querySelectorAll('span[title]')
    expect(avatarElements).toHaveLength(2)

    // Der Gruppenname-Absatz enthält wegen des COOP-Zusatzes ein verschachteltes <span> --
    // techLine/dateLine haben keine Kind-Elemente und sind deshalb der eindeutige, nicht
    // mehrdeutige Ankerpunkt für den gemeinsamen Stack-Elternknoten.
    const techLine = screen.getByText('1080p · mkv · h264 · Softsub')
    const dateLine = screen.getByText('Fansub-Release vom 07.01.2024')
    const textStack = techLine.parentElement

    expect(dateLine.parentElement).toBe(textStack)
    expect(textStack?.textContent).toContain('Demo Fansub-Gruppe × Zweite Gruppe')
    expect(textStack?.textContent).toContain('COOP')
  })

  it('"Ohne Logo": Avatar rendert als Initialen-Fallback neben demselben Text-Stack wie der Gruppenname', () => {
    const version = buildVersion({
      fansub_groups: [{ id: 1, slug: 'demo-fansub-gruppe', name: 'Demo Fansub-Gruppe' }],
    })
    render(<ReleasePreviewRow version={version} animeID={1} />)

    // Avatar ohne logo_url zeigt die Initialen "DF" statt eines Bildes -- das ist NICHT der
    // Null-Avatar-Zweig (fansub_groups.length === 1), sondern der "kein eigenes Logo"-Fall.
    const avatarFallback = screen.getByTitle('Demo Fansub-Gruppe')
    expect(avatarFallback.querySelector('img')).toBeNull()
    expect(avatarFallback.textContent).toContain('DF')

    const groupName = screen.getByText('Demo Fansub-Gruppe', { selector: 'p' })
    const dateLine = screen.getByText('Fansub-Release vom 07.01.2024')
    expect(dateLine.parentElement).toBe(groupName.parentElement)
  })

  it('Null-Gruppen-Fall: keine umschliessende Avatar-Spalte reserviert eine leere Lücke um den Text-Stack', () => {
    const version = buildVersion({ fansub_groups: [] })
    const { container } = render(<ReleasePreviewRow version={version} animeID={1} />)

    // Ohne Gruppen gibt es keinen Avatar und keinen umschliessenden Cluster -- der Text-Stack
    // ist dann das EINZIGE Kind seines direkten Elternelements (kein Avatar-Spalten-Geschwister
    // mehr vorhanden, das weiterhin ein `gap` reservieren würde).
    expect(container.querySelectorAll('span[title]')).toHaveLength(0)

    const groupName = screen.getByText('Unbekannt')
    const stackElement = groupName.parentElement
    expect(stackElement).not.toBeNull()
    expect(stackElement?.parentElement?.children).toHaveLength(1)
  })
})

/*
 * Der dezente Rand "auf dunkler Fläche" des Gruppenlogos kommt aus Avatars eigenem
 * `bordered`-Prop statt aus einer lokalen `.logo { border: ... }`-Deklaration in
 * ReleasePreviewRow.module.css.
 */
describe('ReleasePreviewRow -- Avatar-Rand über bordered-Prop statt lokaler CSS', () => {
  it('rendert jedes Gruppenlogo-Avatar mit der avatarBordered-Modifikatorklasse', () => {
    const version = buildVersion({
      fansub_groups: [
        { id: 1, slug: 'demo-fansub-gruppe', name: 'Demo Fansub-Gruppe', logo_url: '/covers/placeholder.jpg' },
      ],
    })
    const { container } = render(<ReleasePreviewRow version={version} animeID={1} />)

    const avatarRoot = container.querySelector('span[title]')
    expect(avatarRoot).not.toBeNull()
    expect(avatarRoot?.className).toMatch(/avatarBordered/)
  })

  it('ReleasePreviewRow.module.css deklariert keine eigene .logo-Rand-Regel mehr', () => {
    const css = readFileSync(join(process.cwd(), 'src/components/fansubs/ReleasePreviewRow.module.css'), 'utf8')
    expect(css).not.toMatch(/\.logo\s*\{/)
    expect(css).not.toMatch(/border\s*:/)
  })
})
