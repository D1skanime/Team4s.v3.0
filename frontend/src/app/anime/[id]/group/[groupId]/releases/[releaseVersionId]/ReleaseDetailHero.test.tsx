// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ReleaseDetailHero } from './ReleaseDetailHero'
import { ReleaseTechnicalDetails } from './ReleaseTechnicalDetails'

// D-12/191-18: ReportHintEntryPoint hat eigene, dedizierte Tests
// (ReportHintEntryPoint.test.tsx) inklusive seines RoleCatalogProvider-Bedarfs -- hier wird
// es gemockt, damit diese Hero-Layout-Tests nicht zusaetzlich einen Provider aufziehen
// muessen, der fuer diese Assertions irrelevant ist. Der Mock rendert weiterhin nichts
// Sichtbares (bestehende Layout-Assertions bleiben unberuehrt), zeichnet aber (D-30, Plan
// 191-35) die empfangenen Props auf, damit der Bugfix -- echter animeTitle statt
// Episode-/Release-Titel, plus relatedReleaseVersionId/-Label -- tatsaechlich geprueft wird.
const reportHintEntryPointMock = vi.hoisted(() => vi.fn())
vi.mock('@/components/contributions/ReportHintEntryPoint', () => ({
  ReportHintEntryPoint: (props: Record<string, unknown>) => {
    reportHintEntryPointMock(props)
    return null
  },
}))

afterEach(() => {
  cleanup()
  reportHintEntryPointMock.mockClear()
})
const base = { animeID:9, groupID:2, release_version_id:152, episode_number:'7', episode_title:'Schnee', title:'Winter-Release', version:'2', groups:[{id:2,slug:'c',name:'C-Subs',logo_url:null},{id:3,slug:'d',name:'Honto',logo_url:null}], release_date:'2026-01-02', duration_seconds:1440, resolution:'1080p', container:'MKV', video_codec:'AV1', audio_codec:'AAC', audio_language:'Japanisch', subtitle_tracks:[{language:'Deutsch',label:'Vollständig',format:'ASS',forced:false,default:true},{language:'Deutsch',label:'Signs & Songs',format:'ASS',forced:true,default:false}], preview_image:null, previous:null, next:{release_version_id:88,episode_number:'8',episode_title:null,version:'2',group_id:2}, images_count:0, notes_count:2, contributors_count:3, animeLogoFallbackUrl:null, animeTitle:'Vipers Creed' }

describe('ReleaseDetailHero', () => {
  it('renders an independent text-only identity without preview or logo', () => {
    render(<ReleaseDetailHero {...base} />)
    expect(screen.getAllByText('Winter-Release').some((node) => node.closest('[data-release-hero="independent"]'))).toBe(true)
    expect(document.querySelector('img')).toBeNull()
  })

  it('uses the Anime logo only as the presentation fallback', () => {
    render(<ReleaseDetailHero {...base} animeLogoFallbackUrl="/anime-logo.png" />)
    expect(screen.getByAltText('Anime-Logo zu Winter-Release').getAttribute('src')).toBe('/anime-logo.png')
  })

  it('always prefers the selected public release preview over the Anime logo', () => {
    render(<ReleaseDetailHero {...base} animeLogoFallbackUrl="/anime-logo.png" preview_image={{id:1,category:'screenshot',thumbnail_url:'/preview.jpg',original_url:null,caption:'Preview',author_name:'Mia',is_preview_candidate:true,is_highlight:false,highlight_order:null}} />)
    expect(screen.getByAltText('Preview').getAttribute('src')).toBe('/preview.jpg')
    expect(screen.queryByAltText('Anime-Logo zu Winter-Release')).toBeNull()
  })

  it('keeps technical facts out of the hero', () => {
    render(<ReleaseDetailHero {...base} />)
    expect(screen.getAllByText('Schnee')).toHaveLength(2)
    expect(screen.queryByText('Version')).toBeNull()
    expect(screen.queryByText('Dauer')).toBeNull()
    expect(screen.queryByText('Codec')).toBeNull()
    expect(screen.queryByText('24:00 Min.')).toBeNull()
    expect(screen.queryByText('AV1')).toBeNull()
    expect(screen.queryByText('Fansub-Release vom')).toBeNull()
    expect(screen.queryByText('Auflösung')).toBeNull()
    expect(screen.queryByText('2. Januar 2026')).toBeNull()
    expect(screen.queryByText('Video-Codec')).toBeNull()
    expect(screen.queryByText('0 Bilder')).toBeNull()
    expect(screen.queryByText('2 Texte')).toBeNull()
    expect(screen.queryByText('3 Fansubber')).toBeNull()
    expect(document.querySelector('#beteiligte')).toBeNull()
    expect(document.querySelector('[data-release-technical-details]')).toBeNull()
  })

  it('formats Jellyfin codec identifiers for the public hero', () => {
    render(<ReleaseTechnicalDetails {...base} video_codec="h264" audio_codec="aac" />)

    expect(screen.getByText('H.264')).toBeTruthy()
    expect(screen.getAllByText('H.264')).toHaveLength(1)
    expect(screen.getByText('AAC')).toBeTruthy()
  })

  it('labels a collaboration semantically and keeps unknown technical values honest', () => {
    const props = {...base, container: null, video_codec: null, audio_codec: '', audio_language: null, subtitle_tracks: [], subtitle_type: null}
    render(<><ReleaseDetailHero {...props} /><ReleaseTechnicalDetails {...props} /></>)

    expect(screen.getAllByText('Fansub-Coop: C-Subs × Honto')).toHaveLength(2)
    expect(screen.getAllByText('Nicht hinterlegt')).toHaveLength(5)
    expect(screen.getByText('Japanisch')).toBeTruthy()
  })

  it.each([null, '', '   ', 'und', ' UND '])('defaults unknown audio %j to Japanisch without changing the DTO', (language) => {
    const props = { ...base, audio_language: language, subtitle_tracks: [] }
    const before = JSON.stringify(props)
    render(<ReleaseTechnicalDetails {...props} />)

    expect(screen.getByText('Audio-Sprache').nextElementSibling?.textContent).toBe('Japanisch')
    expect(screen.getByText('Untertitelspuren').nextElementSibling?.textContent).toBe('Nicht hinterlegt')
    expect(JSON.stringify(props)).toBe(before)
  })

  it.each(['de', 'Deutsch', 'ja', 'Japanisch'])('keeps known audio %s ahead of the fallback', (language) => {
    render(<ReleaseTechnicalDetails {...base} audio_language={language} />)
    expect(screen.getByText('Audio-Sprache').nextElementSibling?.textContent).toBe(language)
  })

  it('preserves an unknown-language subtitle and its codec without inventing Japanese subtitle metadata', () => {
    const props = {
      ...base,
      audio_language: null,
      subtitle_tracks: [{ language: null, label: 'Untertitel', format: 'ASS', forced: true, default: false }],
    }
    const before = JSON.stringify(props)
    render(<ReleaseTechnicalDetails {...props} />)

    expect(screen.getByText('Untertitelspuren').nextElementSibling?.textContent).toBe('Spur 1: Untertitel · ASS')
    expect(screen.getAllByText('Japanisch')).toHaveLength(1)
    expect(JSON.stringify(props)).toBe(before)
  })

  it('labels a single owner as Fansubgruppe and reuses canonical next-release navigation below details', () => {
    render(<ReleaseDetailHero {...base} groups={[base.groups[0]]} canonicalProjectPath="/fansubs/c-subs/fansubprojekt/winter" />)

    expect(screen.getAllByText('Fansubgruppe: C-Subs')).toHaveLength(2)
    const nextRelease = screen.getByRole('link', { name: /Nächster Release/ })
    expect(nextRelease.getAttribute('href')).toBe('/fansubs/c-subs/fansubprojekt/winter/releases/88')
  })

  // D-30 (Plan 191-35): ReleaseDetailHero gab ReportHintEntryPoint bisher faelschlich den
  // Episode-/Release-Titel als animeTitle -- der echte Projekttitel wurde zwar schon von
  // releaseDetailPageData.tsx geladen, aber nie durchgereicht. Zusaetzlich muss die konkrete
  // Release vorausgewaehlt werden.
  describe('ReportHintEntryPoint-Kontext (D-30)', () => {
    it('reicht den echten Projekttitel durch, nicht den Episode-/Release-Titel', () => {
      render(<ReleaseDetailHero {...base} groups={[base.groups[0]]} />)

      expect(reportHintEntryPointMock).toHaveBeenCalledWith(
        expect.objectContaining({ animeTitle: 'Vipers Creed' }),
      )
    })

    it('faellt auf episode_title/title zurueck, wenn animeTitle null ist (Metadaten-Ladefehler der Seite)', () => {
      render(<ReleaseDetailHero {...base} groups={[base.groups[0]]} animeTitle={null} />)

      expect(reportHintEntryPointMock).toHaveBeenCalledWith(
        expect.objectContaining({ animeTitle: 'Schnee' }),
      )
    })

    it('reicht release_version_id und ein lesbares Label mit Versionsanhang durch', () => {
      render(<ReleaseDetailHero {...base} groups={[base.groups[0]]} release_version_id={152} episode_number="12" episode_title="Schnee" version="2" />)

      expect(reportHintEntryPointMock).toHaveBeenCalledWith(
        expect.objectContaining({
          relatedReleaseVersionId: 152,
          relatedReleaseLabel: 'Episode 12 — Schnee · 2',
        }),
      )
    })

    it('laesst den Versionsanhang ohne dangling " · " weg, wenn version leer ist', () => {
      render(<ReleaseDetailHero {...base} groups={[base.groups[0]]} episode_number="12" episode_title="Schnee" version="" />)

      expect(reportHintEntryPointMock).toHaveBeenCalledWith(
        expect.objectContaining({ relatedReleaseLabel: 'Episode 12 — Schnee' }),
      )
    })
  })
})
