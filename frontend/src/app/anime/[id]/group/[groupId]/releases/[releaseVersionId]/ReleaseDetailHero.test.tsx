// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ReleaseDetailHero } from './ReleaseDetailHero'
import { ReleaseTechnicalDetails } from './ReleaseTechnicalDetails'

afterEach(cleanup)
const base = { animeID:9, groupID:2, episode_number:'7', episode_title:'Schnee', title:'Winter-Release', version:'2', groups:[{id:2,slug:'c',name:'C-Subs',logo_url:null},{id:3,slug:'d',name:'Honto',logo_url:null}], release_date:'2026-01-02', duration_seconds:1440, resolution:'1080p', container:'MKV', video_codec:'AV1', audio_codec:'AAC', audio_language:'Japanisch', subtitle_tracks:[{language:'Deutsch',label:'Vollständig',format:'ASS',forced:false,default:true},{language:'Deutsch',label:'Signs & Songs',format:'ASS',forced:true,default:false}], preview_image:null, next:{release_version_id:88,episode_number:'8',episode_title:null,version:'2',group_id:2}, images_count:0, notes_count:2, contributors_count:3, animeLogoFallbackUrl:null }

describe('ReleaseDetailHero', () => {
  it('renders an independent text-only identity without preview or logo', () => {
    render(<ReleaseDetailHero {...base} />)
    expect(screen.getByText('Winter-Release').closest('[data-release-hero="independent"]')).toBeTruthy()
    expect(document.querySelector('img')).toBeNull()
  })

  it('uses the Anime logo only as the presentation fallback', () => {
    render(<ReleaseDetailHero {...base} animeLogoFallbackUrl="/anime-logo.png" />)
    expect(screen.getByAltText('Anime-Logo zu Winter-Release').getAttribute('src')).toBe('/anime-logo.png')
  })

  it('always prefers the selected public release preview over the Anime logo', () => {
    render(<ReleaseDetailHero {...base} animeLogoFallbackUrl="/anime-logo.png" preview_image={{id:1,category:'screenshot',thumbnail_url:'/preview.jpg',original_url:null,caption:'Preview',author_name:'Mia',is_preview_candidate:true}} />)
    expect(screen.getByAltText('Preview').getAttribute('src')).toBe('/preview.jpg')
    expect(screen.queryByAltText('Anime-Logo zu Winter-Release')).toBeNull()
  })

  it('keeps technical facts out of the hero', () => {
    render(<ReleaseDetailHero {...base} />)
    expect(screen.getByText('Schnee')).toBeTruthy()
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

    expect(screen.getByText('Fansub-Coop: C-Subs × Honto')).toBeTruthy()
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

    expect(screen.getByText('Fansubgruppe: C-Subs')).toBeTruthy()
    const nextRelease = screen.getByRole('link', { name: /Nächster Release/ })
    expect(nextRelease.getAttribute('href')).toBe('/fansubs/c-subs/fansubprojekt/winter/releases/88')
  })
})
